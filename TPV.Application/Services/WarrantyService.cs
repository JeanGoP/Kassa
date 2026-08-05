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
    public class WarrantyService : IWarrantyService
    {
        private static readonly string[] ClaimTypes = { "CORRECTIVA", "CERO_KILOMETROS" };
        private static readonly string[] DetectionMoments = { "RECIBO", "ALISTAMIENTO" };

        private readonly IRepository<Warranty> _repository;
        private readonly IRepository<Customer> _customerRepository;
        private readonly IRepository<ServiceOrder> _serviceOrderRepository;
        private readonly IRepository<PreparationOrder> _preparationOrderRepository;
        private readonly IRepository<Vehicle> _vehicleRepository;
        private readonly IRepository<Branch> _branchRepository;
        private readonly IRepository<Tenant> _tenantRepository;
        private readonly IRepository<Brand> _brandRepository;
        private readonly IRepository<Product> _productRepository;
        private readonly IRepository<WarrantyReplacementPart> _replacementPartRepository;
        private readonly IRepository<WarrantyStatusHistory> _statusHistoryRepository;
        private readonly IRepository<WarrantyManufacturerInvoice> _invoiceRepository;
        private readonly IRepository<UnitOfMeasure> _unitRepository;
        private readonly IUserService _userService;

        public WarrantyService(
            IRepository<Warranty> repository,
            IRepository<Customer> customerRepository,
            IRepository<ServiceOrder> serviceOrderRepository,
            IRepository<PreparationOrder> preparationOrderRepository,
            IRepository<Vehicle> vehicleRepository,
            IRepository<Branch> branchRepository,
            IRepository<Tenant> tenantRepository,
            IRepository<Brand> brandRepository,
            IRepository<Product> productRepository,
            IRepository<WarrantyReplacementPart> replacementPartRepository,
            IRepository<WarrantyStatusHistory> statusHistoryRepository,
            IRepository<WarrantyManufacturerInvoice> invoiceRepository,
            IRepository<UnitOfMeasure> unitRepository,
            IUserService userService)
        {
            _repository = repository;
            _customerRepository = customerRepository;
            _serviceOrderRepository = serviceOrderRepository;
            _preparationOrderRepository = preparationOrderRepository;
            _vehicleRepository = vehicleRepository;
            _branchRepository = branchRepository;
            _tenantRepository = tenantRepository;
            _brandRepository = brandRepository;
            _productRepository = productRepository;
            _replacementPartRepository = replacementPartRepository;
            _statusHistoryRepository = statusHistoryRepository;
            _invoiceRepository = invoiceRepository;
            _unitRepository = unitRepository;
            _userService = userService;
        }

        public async Task<IEnumerable<WarrantyDto>> GetAllAsync(string? plate = null)
        {
            var search = Clean(plate);
            var warranties = await _repository.GetAsync(
                predicate: w => search == null || w.Plate.Contains(search) || w.ChassisNumber.Contains(search) || w.WarrantyNumber.Contains(search),
                orderBy: q => q.OrderByDescending(w => w.FailureDate).ThenByDescending(w => w.Id),
                includeString: "Customer,Branch,BrandCatalog,Vehicle,ServiceOrder,ManufacturerInvoice");

            var result = new List<WarrantyDto>();
            foreach (var warranty in warranties) result.Add(await MapToDto(warranty));
            return result;
        }

        public async Task<WarrantyDto> GetByIdAsync(int id)
        {
            var entity = (await _repository.GetAsync(
                predicate: w => w.Id == id,
                includeString: "Customer,Branch,BrandCatalog,Vehicle,ServiceOrder,ManufacturerInvoice")).FirstOrDefault();
            return entity == null ? null : await MapToDto(entity);
        }

        public async Task<WarrantyDto> CreateAsync(CreateWarrantyDto dto, string userId)
        {
            var context = await ValidateAndResolveAsync(dto, userId);
            var invoice = await ResolveInvoiceAsync(dto, context.Tenant.Id);
            var status = dto.ManufacturerStatus.Trim();

            var entity = new Warranty
            {
                TenantId = context.Tenant.Id,
                WarrantyNumber = GenerateWarrantyNumber(context.Branch.Id),
                CompanyName = context.Tenant.Name,
                CompanyNit = context.Tenant.Nit,
                BranchId = context.Branch.Id,
                BranchName = context.Branch.Name,
                BrandId = context.Brand?.Id,
                BrandName = context.Brand?.Name ?? context.Vehicle.Brand,
                VehicleId = context.Vehicle.Id,
                ServiceOrderId = context.ServiceOrder?.Id,
                IsLegacyRecord = false,
                Plate = context.Vehicle.Plate ?? string.Empty,
                CustomerId = context.Vehicle.CurrentOwnerId,
                Type = context.ClaimType,
                Description = dto.FailureDescription.Trim(),
                StartDate = dto.FailureDate,
                StartMileage = dto.FailureMileage,
                TermsAndConditions = string.Empty,
                Status = "Claim",
                ClaimType = context.ClaimType,
                DetectionMoment = context.DetectionMoment,
                AttributedCause = Clean(dto.AttributedCause),
                ChassisNumber = context.Vehicle.ChassisNumber,
                FailureDate = dto.FailureDate,
                FailureMileage = dto.FailureMileage,
                FailureDescription = dto.FailureDescription.Trim(),
                FailureMode = Clean(dto.FailureMode),
                CausingPartProductId = dto.CausingPartProductId,
                CausingPartReference = dto.CausingPartReference.Trim(),
                CausingPartDescription = dto.CausingPartDescription.Trim(),
                RecognizedLaborHours = dto.RecognizedLaborHours,
                RecognizedLaborValue = dto.RecognizedLaborValue,
                CustomerEquivalentValue = dto.CustomerEquivalentValue,
                ManufacturerStatus = status,
                AuthorizationNumber = Clean(dto.AuthorizationNumber),
                AuthorizationDate = dto.AuthorizationDate,
                FiledAt = dto.FiledAt,
                ApprovedValue = dto.ApprovedValue,
                RejectedValue = dto.RejectedValue,
                RejectionReason = Clean(dto.RejectionReason),
                RecognizedValue = dto.RecognizedValue,
                VehicleOrPartLot = Clean(dto.VehicleOrPartLot),
                ManufacturingDate = dto.ManufacturingDate,
                ManufacturerInvoiceId = invoice?.Id,
                IsActive = true
            };

            await _repository.AddAsync(entity);
            await AddStatusHistoryAsync(entity, userId, dto.StatusNotes ?? "Garantia detectada");
            await ReplacePartsAsync(entity, dto.ReplacementParts);
            await LinkPreparationOrderAsync(entity.Id, dto.PreparationOrderId);
            return await GetByIdAsync(entity.Id);
        }

        public async Task<WarrantyDto?> UpdateAsync(int id, CreateWarrantyDto dto, string userId)
        {
            var entity = await _repository.GetByIdAsync(id);
            if (entity == null) return null;

            var context = await ValidateAndResolveAsync(dto, userId, id);
            if (entity.TenantId != context.Tenant.Id)
                throw new UnauthorizedAccessException("La garantia no pertenece a la empresa del usuario.");

            var previousStatus = entity.ManufacturerStatus;
            var invoice = await ResolveInvoiceAsync(dto, entity.TenantId);

            entity.CompanyName = context.Tenant.Name;
            entity.CompanyNit = context.Tenant.Nit;
            entity.BranchId = context.Branch.Id;
            entity.BranchName = context.Branch.Name;
            entity.BrandId = context.Brand?.Id;
            entity.BrandName = context.Brand?.Name ?? context.Vehicle.Brand;
            entity.VehicleId = context.Vehicle.Id;
            entity.ServiceOrderId = context.ServiceOrder?.Id;
            entity.Plate = context.Vehicle.Plate ?? string.Empty;
            entity.CustomerId = context.Vehicle.CurrentOwnerId;
            entity.Type = context.ClaimType;
            entity.Description = dto.FailureDescription.Trim();
            entity.StartDate = dto.FailureDate;
            entity.StartMileage = dto.FailureMileage;
            entity.ClaimType = context.ClaimType;
            entity.DetectionMoment = context.DetectionMoment;
            entity.AttributedCause = Clean(dto.AttributedCause);
            entity.ChassisNumber = context.Vehicle.ChassisNumber;
            entity.FailureDate = dto.FailureDate;
            entity.FailureMileage = dto.FailureMileage;
            entity.FailureDescription = dto.FailureDescription.Trim();
            entity.FailureMode = Clean(dto.FailureMode);
            entity.CausingPartProductId = dto.CausingPartProductId;
            entity.CausingPartReference = dto.CausingPartReference.Trim();
            entity.CausingPartDescription = dto.CausingPartDescription.Trim();
            entity.RecognizedLaborHours = dto.RecognizedLaborHours;
            entity.RecognizedLaborValue = dto.RecognizedLaborValue;
            entity.CustomerEquivalentValue = dto.CustomerEquivalentValue;
            entity.ManufacturerStatus = dto.ManufacturerStatus.Trim();
            entity.AuthorizationNumber = Clean(dto.AuthorizationNumber);
            entity.AuthorizationDate = dto.AuthorizationDate;
            entity.FiledAt = dto.FiledAt;
            entity.ApprovedValue = dto.ApprovedValue;
            entity.RejectedValue = dto.RejectedValue;
            entity.RejectionReason = Clean(dto.RejectionReason);
            entity.RecognizedValue = dto.RecognizedValue;
            entity.VehicleOrPartLot = Clean(dto.VehicleOrPartLot);
            entity.ManufacturingDate = dto.ManufacturingDate;
            entity.ManufacturerInvoiceId = invoice?.Id;
            entity.UpdatedAt = DateTime.UtcNow;

            await _repository.UpdateAsync(entity);
            if (!string.Equals(previousStatus, entity.ManufacturerStatus, StringComparison.Ordinal))
                await AddStatusHistoryAsync(entity, userId, dto.StatusNotes);
            await ReplacePartsAsync(entity, dto.ReplacementParts);
            await LinkPreparationOrderAsync(entity.Id, dto.PreparationOrderId);
            return await GetByIdAsync(entity.Id);
        }

        public async Task DeleteAsync(int id)
        {
            var entity = await _repository.GetByIdAsync(id);
            if (entity == null) return;
            entity.IsActive = false;
            entity.UpdatedAt = DateTime.UtcNow;
            await _repository.UpdateAsync(entity);
        }

        public async Task<IEnumerable<WarrantyDto>> GetActiveWarrantiesByPlateAsync(string plate)
        {
            var candidates = await _repository.GetAsync(w => w.Plate == plate.ToUpper() && w.IsActive && w.Status == "Active");
            var lastOrder = (await _serviceOrderRepository.GetAsync(
                predicate: o => o.Plate == plate.ToUpper(),
                orderBy: q => q.OrderByDescending(o => o.IntakeDateTime))).FirstOrDefault();
            var lastKnownMileage = lastOrder?.Mileage ?? 0;
            var result = new List<WarrantyDto>();

            foreach (var warranty in candidates)
            {
                if (warranty.EndDate.HasValue && warranty.EndDate.Value.Date < DateTime.UtcNow.Date) continue;
                var limits = new[] { warranty.LimitMileage1, warranty.LimitMileage2, warranty.LimitMileage3 }
                    .Where(value => value.HasValue).Select(value => value!.Value).ToList();
                if (limits.Any() && lastKnownMileage > limits.Max()) continue;
                result.Add(await MapToDto(warranty));
            }
            return result;
        }

        private async Task<WarrantyContext> ValidateAndResolveAsync(CreateWarrantyDto dto, string userId, int? currentWarrantyId = null)
        {
            var claimType = NormalizeOption(dto.ClaimType, ClaimTypes, "tipo de garantia");
            var detectionMoment = NormalizeOption(dto.DetectionMoment, DetectionMoments, "momento de deteccion");
            if (dto.VehicleId <= 0) throw new InvalidOperationException("Debe seleccionar el vehiculo de la garantia.");
            if (dto.FailureDate == default) throw new InvalidOperationException("La fecha de la falla es obligatoria.");
            if (dto.FailureMileage < 0) throw new InvalidOperationException("El kilometraje de la falla no puede ser negativo.");
            if (string.IsNullOrWhiteSpace(dto.FailureDescription)) throw new InvalidOperationException("La descripcion de la falla es obligatoria.");
            if (string.IsNullOrWhiteSpace(dto.CausingPartReference) || string.IsNullOrWhiteSpace(dto.CausingPartDescription))
                throw new InvalidOperationException("La referencia y descripcion de la pieza causante son obligatorias.");
            if (string.IsNullOrWhiteSpace(dto.ManufacturerStatus)) throw new InvalidOperationException("El estado definido por el fabricante es obligatorio.");
            if (dto.RecognizedLaborHours < 0 || dto.RecognizedLaborValue < 0 || dto.CustomerEquivalentValue < 0 || dto.ApprovedValue < 0 || dto.RejectedValue < 0 || dto.RecognizedValue < 0)
                throw new InvalidOperationException("Los tiempos y valores de la garantia no pueden ser negativos.");
            if (dto.RejectedValue > 0 && string.IsNullOrWhiteSpace(dto.RejectionReason))
                throw new InvalidOperationException("El motivo de rechazo es obligatorio cuando existe valor rechazado.");
            if (!string.IsNullOrWhiteSpace(dto.AuthorizationNumber) != dto.AuthorizationDate.HasValue)
                throw new InvalidOperationException("La autorizacion requiere numero y fecha.");
            if (!string.IsNullOrWhiteSpace(dto.ManufacturerInvoiceNumber) != dto.ManufacturerInvoiceDate.HasValue)
                throw new InvalidOperationException("La factura al fabricante requiere numero y fecha.");
            if (dto.ManufacturerPaidAt.HasValue && string.IsNullOrWhiteSpace(dto.ManufacturerInvoiceNumber))
                throw new InvalidOperationException("No se puede registrar pago sin factura al fabricante.");
            if (!dto.ServiceOrderId.HasValue && !dto.PreparationOrderId.HasValue)
                throw new InvalidOperationException("La garantia debe asociarse a una orden de taller o de alistamiento.");
            if (detectionMoment == "RECIBO" && !dto.ServiceOrderId.HasValue)
                throw new InvalidOperationException("Una deteccion en recibo requiere una orden de taller.");
            if (detectionMoment == "ALISTAMIENTO" && !dto.PreparationOrderId.HasValue)
                throw new InvalidOperationException("Una deteccion en alistamiento requiere una orden de alistamiento.");

            foreach (var part in dto.ReplacementParts)
            {
                if (part.Quantity <= 0 || part.UnitValue < 0 || string.IsNullOrWhiteSpace(part.Reference) || string.IsNullOrWhiteSpace(part.Description) || string.IsNullOrWhiteSpace(part.Unit))
                    throw new InvalidOperationException("Cada pieza reemplazada requiere referencia, descripcion, cantidad positiva, unidad y valor valido.");
            }

            var vehicle = await _vehicleRepository.GetByIdAsync(dto.VehicleId)
                ?? throw new InvalidOperationException("El vehiculo seleccionado no existe.");
            if (vehicle.ChassisNumber.Length != 17) throw new InvalidOperationException("El VIN/chasis del vehiculo debe tener 17 caracteres.");

            var userBranchId = await _userService.GetUserBranchIdAsync(userId)
                ?? throw new InvalidOperationException("El usuario no tiene una sucursal asignada.");
            var branch = await _branchRepository.GetByIdAsync(userBranchId)
                ?? throw new InvalidOperationException("La sucursal del usuario no existe.");
            if (vehicle.TenantId != branch.TenantId) throw new UnauthorizedAccessException("El vehiculo no pertenece a la empresa del usuario.");
            var tenant = await _tenantRepository.GetByIdAsync(branch.TenantId)
                ?? throw new InvalidOperationException("La empresa de la sucursal no existe.");
            var brand = vehicle.BrandId.HasValue ? await _brandRepository.GetByIdAsync(vehicle.BrandId.Value) : null;

            ServiceOrder? serviceOrder = null;
            if (dto.ServiceOrderId.HasValue)
            {
                serviceOrder = await _serviceOrderRepository.GetByIdAsync(dto.ServiceOrderId.Value)
                    ?? throw new InvalidOperationException("La orden de taller seleccionada no existe.");
                if (serviceOrder.VehicleId != vehicle.Id && !string.Equals(serviceOrder.ChassisNumber, vehicle.ChassisNumber, StringComparison.OrdinalIgnoreCase))
                    throw new InvalidOperationException("La orden de taller no corresponde al vehiculo seleccionado.");
                if (serviceOrder.BranchId.HasValue && serviceOrder.BranchId.Value != branch.Id)
                    throw new UnauthorizedAccessException("La orden de taller no pertenece a la sucursal del usuario.");
            }

            if (dto.PreparationOrderId.HasValue)
            {
                var preparationOrder = await _preparationOrderRepository.GetByIdAsync(dto.PreparationOrderId.Value)
                    ?? throw new InvalidOperationException("La orden de alistamiento seleccionada no existe.");
                if (preparationOrder.VehicleId != vehicle.Id && !string.Equals(preparationOrder.ChassisNumber, vehicle.ChassisNumber, StringComparison.OrdinalIgnoreCase))
                    throw new InvalidOperationException("La orden de alistamiento no corresponde al vehiculo seleccionado.");
                if (preparationOrder.BranchId != branch.Id)
                    throw new UnauthorizedAccessException("La orden de alistamiento no pertenece a la sucursal del usuario.");
                if (preparationOrder.WarrantyId.HasValue && preparationOrder.WarrantyId != currentWarrantyId)
                    throw new InvalidOperationException("La orden de alistamiento ya esta asociada a otra garantia.");
            }

            if (dto.CausingPartProductId.HasValue && await _productRepository.GetByIdAsync(dto.CausingPartProductId.Value) == null)
                throw new InvalidOperationException("La pieza causante seleccionada no existe.");

            return new WarrantyContext(vehicle, branch, tenant, brand, serviceOrder, claimType, detectionMoment);
        }

        private async Task<WarrantyManufacturerInvoice?> ResolveInvoiceAsync(CreateWarrantyDto dto, int tenantId)
        {
            var number = Clean(dto.ManufacturerInvoiceNumber);
            if (number == null) return null;

            var invoice = (await _invoiceRepository.GetAsync(i => i.InvoiceNumber == number)).FirstOrDefault();
            if (invoice == null)
            {
                invoice = new WarrantyManufacturerInvoice
                {
                    TenantId = tenantId,
                    InvoiceNumber = number,
                    InvoiceDate = dto.ManufacturerInvoiceDate!.Value,
                    TotalAmount = dto.ManufacturerInvoiceTotal ?? 0,
                    PaidAt = dto.ManufacturerPaidAt,
                    PaymentReference = Clean(dto.ManufacturerPaymentReference)
                };
                return await _invoiceRepository.AddAsync(invoice);
            }

            invoice.InvoiceDate = dto.ManufacturerInvoiceDate!.Value;
            invoice.TotalAmount = dto.ManufacturerInvoiceTotal ?? invoice.TotalAmount;
            invoice.PaidAt = dto.ManufacturerPaidAt;
            invoice.PaymentReference = Clean(dto.ManufacturerPaymentReference);
            invoice.UpdatedAt = DateTime.UtcNow;
            await _invoiceRepository.UpdateAsync(invoice);
            return invoice;
        }

        private async Task ReplacePartsAsync(Warranty warranty, IEnumerable<CreateWarrantyReplacementPartDto> requestedParts)
        {
            var existing = await _replacementPartRepository.GetAsync(p => p.WarrantyId == warranty.Id && p.IsActive);
            foreach (var part in existing)
            {
                part.IsActive = false;
                part.UpdatedAt = DateTime.UtcNow;
                await _replacementPartRepository.UpdateAsync(part);
            }

            foreach (var item in requestedParts)
            {
                Product? product = null;
                if (item.ProductId.HasValue)
                    product = (await _productRepository.GetAsync(p => p.Id == item.ProductId.Value, null, "UnitConversions")).FirstOrDefault();
                var unit = item.UnitOfMeasureId.HasValue
                    ? await _unitRepository.GetByIdAsync(item.UnitOfMeasureId.Value)
                    : (await _unitRepository.GetAsync(u => u.Code == item.Unit.Trim().ToUpperInvariant())).FirstOrDefault();
                unit ??= (await _unitRepository.GetAsync(u => u.Code == "UND")).FirstOrDefault();
                if (unit == null) throw new InvalidOperationException("No existe una unidad válida para la pieza reemplazada.");
                var factor = product == null || product.BaseUnitId == unit.Id ? 1m
                    : product.UnitConversions.FirstOrDefault(c => c.UnitOfMeasureId == unit.Id)?.FactorToBase ?? 0m;
                if (factor <= 0) throw new InvalidOperationException($"No existe conversión de {unit.Code} a la unidad base.");
                await _replacementPartRepository.AddAsync(new WarrantyReplacementPart
                {
                    TenantId = warranty.TenantId,
                    WarrantyId = warranty.Id,
                    ProductId = item.ProductId,
                    Reference = item.Reference.Trim(),
                    Description = item.Description.Trim(),
                    Quantity = item.Quantity,
                    UnitOfMeasureId = unit.Id,
                    Unit = unit.Code,
                    QuantityBase = item.Quantity * factor,
                    UnitValue = item.UnitValue,
                    TotalValue = decimal.Round(item.Quantity * item.UnitValue, 2)
                });
            }
        }

        private async Task LinkPreparationOrderAsync(int warrantyId, int? preparationOrderId)
        {
            var currentlyLinked = await _preparationOrderRepository.GetAsync(o => o.WarrantyId == warrantyId);
            foreach (var order in currentlyLinked.Where(o => o.Id != preparationOrderId))
            {
                order.WarrantyId = null;
                order.WarrantyOpened = false;
                await _preparationOrderRepository.UpdateAsync(order);
            }

            if (!preparationOrderId.HasValue) return;
            var selected = await _preparationOrderRepository.GetByIdAsync(preparationOrderId.Value);
            if (selected == null) return;
            selected.WarrantyId = warrantyId;
            selected.WarrantyOpened = true;
            await _preparationOrderRepository.UpdateAsync(selected);
        }

        private async Task AddStatusHistoryAsync(Warranty warranty, string userId, string? notes)
        {
            await _statusHistoryRepository.AddAsync(new WarrantyStatusHistory
            {
                TenantId = warranty.TenantId,
                WarrantyId = warranty.Id,
                ManufacturerStatus = warranty.ManufacturerStatus,
                ChangedAt = DateTime.UtcNow,
                ChangedByUserId = userId,
                ChangedByName = await _userService.GetUserDisplayNameAsync(userId),
                Notes = Clean(notes)
            });
        }

        private async Task<WarrantyDto> MapToDto(Warranty entity)
        {
            var customer = entity.CustomerId.HasValue ? entity.Customer ?? await _customerRepository.GetByIdAsync(entity.CustomerId.Value) : null;
            var preparationOrder = (await _preparationOrderRepository.GetAsync(o => o.WarrantyId == entity.Id)).FirstOrDefault();
            var parts = await _replacementPartRepository.GetAsync(p => p.WarrantyId == entity.Id && p.IsActive);
            var history = await _statusHistoryRepository.GetAsync(
                predicate: h => h.WarrantyId == entity.Id,
                orderBy: q => q.OrderBy(h => h.ChangedAt));
            var coveredWarrantyIds = entity.ManufacturerInvoiceId.HasValue
                ? (await _repository.GetAsync(w => w.ManufacturerInvoiceId == entity.ManufacturerInvoiceId)).Select(w => w.Id).ToList()
                : new List<int>();

            return new WarrantyDto
            {
                Id = entity.Id,
                WarrantyNumber = entity.WarrantyNumber,
                CompanyName = entity.CompanyName,
                CompanyNit = entity.CompanyNit,
                BranchId = entity.BranchId,
                BranchName = entity.BranchName ?? entity.Branch?.Name,
                BrandId = entity.BrandId,
                BrandName = entity.BrandName ?? entity.BrandCatalog?.Name,
                VehicleId = entity.VehicleId,
                ServiceOrderId = entity.ServiceOrderId,
                ServiceOrderNumber = entity.ServiceOrder?.OrderNumber,
                PreparationOrderId = preparationOrder?.Id,
                PreparationOrderNumber = preparationOrder?.OrderNumber,
                IsLegacyRecord = entity.IsLegacyRecord,
                Plate = entity.Plate,
                CustomerId = entity.CustomerId,
                CustomerName = customer == null ? string.Empty : $"{customer.FirstName} {customer.LastName}".Trim(),
                Type = entity.Type,
                Description = entity.Description,
                StartDate = entity.StartDate,
                EndDate = entity.EndDate,
                StartMileage = entity.StartMileage,
                LimitMileage1 = entity.LimitMileage1,
                LimitMileage2 = entity.LimitMileage2,
                LimitMileage3 = entity.LimitMileage3,
                TermsAndConditions = entity.TermsAndConditions,
                Status = entity.Status,
                ClaimType = entity.ClaimType,
                DetectionMoment = entity.DetectionMoment,
                AttributedCause = entity.AttributedCause,
                ChassisNumber = entity.ChassisNumber,
                FailureDate = entity.FailureDate,
                FailureMileage = entity.FailureMileage,
                FailureDescription = entity.FailureDescription,
                FailureMode = entity.FailureMode,
                CausingPartProductId = entity.CausingPartProductId,
                CausingPartReference = entity.CausingPartReference,
                CausingPartDescription = entity.CausingPartDescription,
                RecognizedLaborHours = entity.RecognizedLaborHours,
                RecognizedLaborValue = entity.RecognizedLaborValue,
                CustomerEquivalentValue = entity.CustomerEquivalentValue,
                ManufacturerStatus = entity.ManufacturerStatus,
                AuthorizationNumber = entity.AuthorizationNumber,
                AuthorizationDate = entity.AuthorizationDate,
                FiledAt = entity.FiledAt,
                ApprovedValue = entity.ApprovedValue,
                RejectedValue = entity.RejectedValue,
                RejectionReason = entity.RejectionReason,
                RecognizedValue = entity.RecognizedValue,
                VehicleOrPartLot = entity.VehicleOrPartLot,
                ManufacturingDate = entity.ManufacturingDate,
                ManufacturerInvoiceId = entity.ManufacturerInvoiceId,
                ManufacturerInvoiceNumber = entity.ManufacturerInvoice?.InvoiceNumber,
                ManufacturerInvoiceDate = entity.ManufacturerInvoice?.InvoiceDate,
                ManufacturerInvoiceTotal = entity.ManufacturerInvoice?.TotalAmount,
                ManufacturerPaidAt = entity.ManufacturerInvoice?.PaidAt,
                ManufacturerPaymentReference = entity.ManufacturerInvoice?.PaymentReference,
                CoveredWarrantyIds = coveredWarrantyIds,
                ReplacementParts = parts.Select(p => new WarrantyReplacementPartDto
                {
                    Id = p.Id,
                    ProductId = p.ProductId,
                    Reference = p.Reference,
                    Description = p.Description,
                    Quantity = p.Quantity,
                    UnitOfMeasureId = p.UnitOfMeasureId,
                    QuantityBase = p.QuantityBase,
                    Unit = p.Unit,
                    UnitValue = p.UnitValue,
                    TotalValue = p.TotalValue
                }).ToList(),
                StatusHistory = history.Select(h => new WarrantyStatusHistoryDto
                {
                    Id = h.Id,
                    ManufacturerStatus = h.ManufacturerStatus,
                    ChangedAt = h.ChangedAt,
                    ChangedByUserId = h.ChangedByUserId,
                    ChangedByName = h.ChangedByName,
                    Notes = h.Notes
                }).ToList(),
                IsActive = entity.IsActive,
                CreatedAt = entity.CreatedAt,
                ModifiedAt = entity.UpdatedAt ?? entity.CreatedAt
            };
        }

        private static string NormalizeOption(string value, IEnumerable<string> allowed, string field)
        {
            var normalized = value?.Trim().ToUpperInvariant() ?? string.Empty;
            if (!allowed.Contains(normalized)) throw new InvalidOperationException($"El {field} no pertenece a la lista permitida.");
            return normalized;
        }

        private static string GenerateWarrantyNumber(int branchId) =>
            $"GAR-{DateTime.UtcNow:yyyyMMddHHmmss}-{branchId}-{Guid.NewGuid().ToString("N")[..6].ToUpperInvariant()}";

        private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

        private sealed record WarrantyContext(
            Vehicle Vehicle,
            Branch Branch,
            Tenant Tenant,
            Brand? Brand,
            ServiceOrder? ServiceOrder,
            string ClaimType,
            string DetectionMoment);
    }
}
