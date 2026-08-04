using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using TPV.Application.DTOs;
using TPV.Application.Interfaces;
using TPV.Domain.Entities;
using TPV.Domain.Interfaces;

namespace TPV.Application.Services
{
    public class VehicleService : IVehicleService
    {
        private readonly IRepository<Vehicle> _vehicleRepository;
        private readonly IRepository<VehicleOwnerHistory> _ownerHistoryRepository;
        private readonly IRepository<ServiceOrder> _serviceOrderRepository;
        private readonly IRepository<PreparationOrder> _preparationOrderRepository;
        private readonly IRepository<Branch> _branchRepository;
        private readonly IRepository<Customer> _customerRepository;
        private readonly IUserService _userService;

        public VehicleService(
            IRepository<Vehicle> vehicleRepository,
            IRepository<VehicleOwnerHistory> ownerHistoryRepository,
            IRepository<ServiceOrder> serviceOrderRepository,
            IRepository<PreparationOrder> preparationOrderRepository,
            IRepository<Branch> branchRepository,
            IRepository<Customer> customerRepository,
            IUserService userService)
        {
            _vehicleRepository = vehicleRepository;
            _ownerHistoryRepository = ownerHistoryRepository;
            _serviceOrderRepository = serviceOrderRepository;
            _preparationOrderRepository = preparationOrderRepository;
            _branchRepository = branchRepository;
            _customerRepository = customerRepository;
            _userService = userService;
        }

        public async Task<IEnumerable<VehicleDto>> GetAllAsync(string? search)
        {
            var cleanSearch = search?.Trim();
            var vehicles = await _vehicleRepository.GetAsync(
                predicate: v => string.IsNullOrEmpty(cleanSearch) ||
                    v.ChassisNumber.Contains(cleanSearch) ||
                    (v.EngineNumber != null && v.EngineNumber.Contains(cleanSearch)) ||
                    (v.Plate != null && v.Plate.Contains(cleanSearch)) ||
                    v.Brand.Contains(cleanSearch) ||
                    v.Model.Contains(cleanSearch),
                orderBy: q => q.OrderBy(v => v.Brand).ThenBy(v => v.Model).ThenBy(v => v.ChassisNumber),
                includeString: "Branch,CurrentOwner");

            return vehicles.Select(MapSummary);
        }

        public async Task<VehicleDto?> GetByIdAsync(int id)
        {
            var vehicles = await _vehicleRepository.GetAsync(
                predicate: v => v.Id == id,
                includeString: "Branch,CurrentOwner");
            var vehicle = vehicles.FirstOrDefault();
            if (vehicle == null) return null;

            var dto = MapSummary(vehicle);
            var owners = await _ownerHistoryRepository.GetAsync(
                predicate: h => h.VehicleId == id,
                orderBy: q => q.OrderByDescending(h => h.OwnedFrom),
                includeString: "Customer");
            dto.OwnerHistory = owners.Select(h => new VehicleOwnerHistoryDto
            {
                Id = h.Id,
                CustomerId = h.CustomerId,
                CustomerIdentification = h.Customer?.TaxId,
                CustomerName = h.Customer == null ? string.Empty : $"{h.Customer.FirstName} {h.Customer.LastName}".Trim(),
                OwnedFrom = h.OwnedFrom,
                OwnedUntil = h.OwnedUntil
            }).ToList();

            var serviceOrders = await _serviceOrderRepository.GetAsync(
                predicate: o => o.VehicleId == id,
                includeString: "Branch");
            var preparationOrders = await _preparationOrderRepository.GetAsync(
                predicate: o => o.VehicleId == id,
                includeString: "Branch");

            dto.ServiceHistory = serviceOrders.Select(o => new VehicleServiceHistoryDto
            {
                Source = "OrdenTaller",
                RecordId = o.Id,
                Number = o.Id.ToString(),
                Date = o.IntakeDateTime,
                Mileage = o.Mileage,
                BranchId = o.BranchId ?? vehicle.BranchId,
                BranchName = o.Branch?.Name ?? vehicle.Branch?.Name,
                Status = o.Status,
                MaintenanceReviewMileage = o.MaintenanceReviewMileage
            }).Concat(preparationOrders.Select(o => new VehicleServiceHistoryDto
            {
                Source = "Alistamiento",
                RecordId = o.Id,
                Number = o.OrderNumber,
                Date = o.RequestedAt,
                Mileage = o.Mileage,
                BranchId = o.BranchId,
                BranchName = o.Branch?.Name,
                Status = o.Status
            })).OrderByDescending(h => h.Date).ToList();

            return dto;
        }

        public async Task<VehicleDto> CreateAsync(CreateVehicleDto dto, string userId)
        {
            var branch = await ResolveBranchAsync(dto.BranchId, userId);
            var chassis = NormalizeChassis(dto.ChassisNumber);
            await EnsureUniqueChassisAsync(chassis, branch.TenantId);
            await ValidateCustomerAsync(dto.CurrentOwnerId, branch.TenantId);

            var vehicle = new Vehicle
            {
                TenantId = branch.TenantId,
                BranchId = branch.Id,
                ChassisNumber = chassis,
                EngineNumber = CleanUpper(dto.EngineNumber),
                Plate = CleanUpper(dto.Plate),
                Brand = Required(dto.Brand, "La marca es obligatoria."),
                Model = Required(dto.Model, "El modelo es obligatorio."),
                Year = ValidateYear(dto.Year),
                SaleDate = dto.SaleDate,
                CurrentOwnerId = dto.CurrentOwnerId,
                OwnerSince = dto.CurrentOwnerId.HasValue ? dto.OwnerSince ?? DateTime.Now : null,
                LastKnownMileage = dto.LastKnownMileage
            };

            await _vehicleRepository.AddAsync(vehicle);
            await AddOwnerHistoryAsync(vehicle);
            return (await GetByIdAsync(vehicle.Id))!;
        }

        public async Task<VehicleDto?> UpdateAsync(int id, CreateVehicleDto dto, string userId)
        {
            var vehicle = await _vehicleRepository.GetByIdAsync(id);
            if (vehicle == null) return null;

            var branch = await ResolveBranchAsync(dto.BranchId ?? vehicle.BranchId, userId);
            var chassis = NormalizeChassis(dto.ChassisNumber);
            await EnsureUniqueChassisAsync(chassis, branch.TenantId, id);
            await ValidateCustomerAsync(dto.CurrentOwnerId, branch.TenantId);
            var ownerChanged = vehicle.CurrentOwnerId != dto.CurrentOwnerId;

            vehicle.TenantId = branch.TenantId;
            vehicle.BranchId = branch.Id;
            vehicle.ChassisNumber = chassis;
            vehicle.EngineNumber = CleanUpper(dto.EngineNumber);
            vehicle.Plate = CleanUpper(dto.Plate);
            vehicle.Brand = Required(dto.Brand, "La marca es obligatoria.");
            vehicle.Model = Required(dto.Model, "El modelo es obligatorio.");
            vehicle.Year = ValidateYear(dto.Year);
            vehicle.SaleDate = dto.SaleDate;
            vehicle.CurrentOwnerId = dto.CurrentOwnerId;
            vehicle.OwnerSince = dto.CurrentOwnerId.HasValue ? dto.OwnerSince ?? (ownerChanged ? DateTime.Now : vehicle.OwnerSince) : null;
            vehicle.LastKnownMileage = dto.LastKnownMileage;
            vehicle.UpdatedAt = DateTime.UtcNow;

            if (ownerChanged)
            {
                await CloseCurrentOwnershipAsync(vehicle.Id, vehicle.OwnerSince ?? DateTime.Now);
            }

            await _vehicleRepository.UpdateAsync(vehicle);
            if (ownerChanged) await AddOwnerHistoryAsync(vehicle);
            return await GetByIdAsync(vehicle.Id);
        }

        public async Task<bool> DeactivateAsync(int id, string userId)
        {
            var vehicle = await _vehicleRepository.GetByIdAsync(id);
            if (vehicle == null) return false;
            if (!await _userService.IsUserInBranchAsync(userId, vehicle.BranchId))
            {
                throw new UnauthorizedAccessException("El usuario no puede desactivar vehiculos de esta sucursal.");
            }

            vehicle.IsActive = false;
            vehicle.UpdatedAt = DateTime.UtcNow;
            await _vehicleRepository.UpdateAsync(vehicle);
            return true;
        }

        public async Task<int> RegisterOperationAsync(RegisterVehicleOperationDto dto)
        {
            var chassis = NormalizeChassis(dto.ChassisNumber);
            var matches = await _vehicleRepository.GetAsync(v => v.TenantId == dto.TenantId && v.ChassisNumber == chassis);
            var vehicle = matches.FirstOrDefault();
            await ValidateCustomerAsync(dto.CustomerId, dto.TenantId);

            if (vehicle == null)
            {
                vehicle = new Vehicle
                {
                    TenantId = dto.TenantId,
                    BranchId = dto.BranchId,
                    ChassisNumber = chassis,
                    EngineNumber = CleanUpper(dto.EngineNumber),
                    Plate = CleanUpper(dto.Plate),
                    Brand = Required(dto.Brand, "La marca es obligatoria."),
                    Model = Required(dto.Model, "El modelo es obligatorio."),
                    Year = ValidateYear(dto.Year),
                    CurrentOwnerId = dto.CustomerId,
                    OwnerSince = dto.CustomerId.HasValue ? dto.OperationDate : null,
                    LastKnownMileage = dto.Mileage
                };
                await _vehicleRepository.AddAsync(vehicle);
                await AddOwnerHistoryAsync(vehicle);
                return vehicle.Id;
            }

            var ownerChanged = dto.CustomerId.HasValue && vehicle.CurrentOwnerId != dto.CustomerId;
            if (ownerChanged)
            {
                await CloseCurrentOwnershipAsync(vehicle.Id, dto.OperationDate);
                vehicle.CurrentOwnerId = dto.CustomerId;
                vehicle.OwnerSince = dto.OperationDate;
            }

            vehicle.BranchId = dto.BranchId;
            vehicle.EngineNumber = CleanUpper(dto.EngineNumber) ?? vehicle.EngineNumber;
            vehicle.Plate = CleanUpper(dto.Plate) ?? vehicle.Plate;
            vehicle.Brand = string.IsNullOrWhiteSpace(dto.Brand) ? vehicle.Brand : dto.Brand.Trim();
            vehicle.Model = string.IsNullOrWhiteSpace(dto.Model) ? vehicle.Model : dto.Model.Trim();
            vehicle.Year = dto.Year ?? vehicle.Year;
            vehicle.LastKnownMileage = dto.Mileage.HasValue
                ? Math.Max(vehicle.LastKnownMileage ?? 0, dto.Mileage.Value)
                : vehicle.LastKnownMileage;
            vehicle.IsActive = true;
            vehicle.UpdatedAt = DateTime.UtcNow;
            await _vehicleRepository.UpdateAsync(vehicle);
            if (ownerChanged) await AddOwnerHistoryAsync(vehicle);
            return vehicle.Id;
        }

        private async Task<Branch> ResolveBranchAsync(int? branchId, string userId)
        {
            var resolvedId = branchId ?? await _userService.GetUserBranchIdAsync(userId);
            if (!resolvedId.HasValue || !await _userService.IsUserInBranchAsync(userId, resolvedId.Value))
            {
                throw new UnauthorizedAccessException("El usuario no tiene permiso para gestionar vehiculos en esta sucursal.");
            }

            return await _branchRepository.GetByIdAsync(resolvedId.Value)
                ?? throw new InvalidOperationException("La sucursal indicada no existe.");
        }

        private async Task EnsureUniqueChassisAsync(string chassis, int tenantId, int? currentId = null)
        {
            var matches = await _vehicleRepository.GetAsync(v =>
                v.TenantId == tenantId && v.ChassisNumber == chassis && (!currentId.HasValue || v.Id != currentId.Value));
            if (matches.Any()) throw new InvalidOperationException("Ya existe un vehiculo con este chasis/VIN.");
        }

        private async Task ValidateCustomerAsync(int? customerId, int tenantId)
        {
            if (!customerId.HasValue) return;
            var customer = await _customerRepository.GetByIdAsync(customerId.Value);
            if (customer == null || customer.TenantId != tenantId)
            {
                throw new InvalidOperationException("El propietario no pertenece a la empresa del vehiculo.");
            }
        }

        private async Task CloseCurrentOwnershipAsync(int vehicleId, DateTime ownedUntil)
        {
            var records = await _ownerHistoryRepository.GetAsync(h => h.VehicleId == vehicleId && h.OwnedUntil == null);
            foreach (var record in records)
            {
                record.OwnedUntil = ownedUntil;
                record.UpdatedAt = DateTime.UtcNow;
                await _ownerHistoryRepository.UpdateAsync(record);
            }
        }

        private async Task AddOwnerHistoryAsync(Vehicle vehicle)
        {
            if (!vehicle.CurrentOwnerId.HasValue) return;
            await _ownerHistoryRepository.AddAsync(new VehicleOwnerHistory
            {
                TenantId = vehicle.TenantId,
                VehicleId = vehicle.Id,
                CustomerId = vehicle.CurrentOwnerId.Value,
                OwnedFrom = vehicle.OwnerSince ?? DateTime.Now
            });
        }

        private static VehicleDto MapSummary(Vehicle vehicle) => new()
        {
            Id = vehicle.Id,
            BranchId = vehicle.BranchId,
            BranchName = vehicle.Branch?.Name,
            ChassisNumber = vehicle.ChassisNumber,
            EngineNumber = vehicle.EngineNumber,
            Plate = vehicle.Plate,
            Brand = vehicle.Brand,
            Model = vehicle.Model,
            Year = vehicle.Year,
            SaleDate = vehicle.SaleDate,
            CurrentOwnerId = vehicle.CurrentOwnerId,
            CurrentOwnerName = vehicle.CurrentOwner == null ? null : $"{vehicle.CurrentOwner.FirstName} {vehicle.CurrentOwner.LastName}".Trim(),
            OwnerSince = vehicle.OwnerSince,
            LastKnownMileage = vehicle.LastKnownMileage,
            IsActive = vehicle.IsActive,
            CreatedAt = vehicle.CreatedAt,
            UpdatedAt = vehicle.UpdatedAt
        };

        public static string NormalizeChassis(string? value)
        {
            var chassis = CleanUpper(value) ?? string.Empty;
            if (chassis.Length != 17 || chassis.Any(c => !char.IsLetterOrDigit(c)))
            {
                throw new InvalidOperationException("El chasis/VIN debe tener exactamente 17 caracteres alfanumericos.");
            }
            return chassis;
        }

        private static int? ValidateYear(int? year)
        {
            if (year.HasValue && (year.Value < 1900 || year.Value > DateTime.Now.Year + 2))
            {
                throw new InvalidOperationException("El ano modelo no es valido.");
            }
            return year;
        }

        private static string Required(string? value, string message) =>
            string.IsNullOrWhiteSpace(value) ? throw new InvalidOperationException(message) : value.Trim();

        private static string? CleanUpper(string? value) =>
            string.IsNullOrWhiteSpace(value) ? null : value.Trim().ToUpperInvariant();
    }
}
