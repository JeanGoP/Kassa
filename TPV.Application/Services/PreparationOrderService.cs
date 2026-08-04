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
    public class PreparationOrderService : IPreparationOrderService
    {
        private readonly IRepository<PreparationOrder> _repository;
        private readonly IRepository<PreparationOrderItem> _itemRepository;
        private readonly IRepository<Branch> _branchRepository;
        private readonly IRepository<Customer> _customerRepository;
        private readonly IRepository<Product> _productRepository;
        private readonly IUserService _userService;

        public PreparationOrderService(
            IRepository<PreparationOrder> repository,
            IRepository<PreparationOrderItem> itemRepository,
            IRepository<Branch> branchRepository,
            IRepository<Customer> customerRepository,
            IRepository<Product> productRepository,
            IUserService userService)
        {
            _repository = repository;
            _itemRepository = itemRepository;
            _branchRepository = branchRepository;
            _customerRepository = customerRepository;
            _productRepository = productRepository;
            _userService = userService;
        }

        public async Task<IEnumerable<PreparationOrderDto>> GetAllAsync(string? search)
        {
            var cleanSearch = search?.Trim();
            var orders = await _repository.GetAsync(
                predicate: o =>
                    string.IsNullOrEmpty(cleanSearch) ||
                    o.OrderNumber.Contains(cleanSearch) ||
                    (o.CommercialDocumentReference != null && o.CommercialDocumentReference.Contains(cleanSearch)) ||
                    o.ChassisNumber.Contains(cleanSearch) ||
                    (o.Plate != null && o.Plate.Contains(cleanSearch)) ||
                    o.Brand.Contains(cleanSearch) ||
                    o.Model.Contains(cleanSearch),
                orderBy: q => q.OrderByDescending(o => o.RequestedAt),
                includeString: "Branch,Customer,Items.Product"
            );

            return orders.Select(MapToDto);
        }

        public async Task<PreparationOrderDto?> GetByIdAsync(int id)
        {
            var orders = await _repository.GetAsync(
                predicate: o => o.Id == id,
                includeString: "Branch,Customer,Items.Product");

            var order = orders.FirstOrDefault();
            return order == null ? null : MapToDto(order);
        }

        public async Task<PreparationOrderDto> CreateAsync(CreatePreparationOrderDto dto, string userId)
        {
            var branch = await ResolveBranchAsync(dto.BranchId, userId);
            await ValidateCustomerAsync(dto.CustomerId, branch.TenantId);
            var requestedAt = dto.RequestedAt ?? DateTime.Now;

            var order = new PreparationOrder
            {
                TenantId = branch.TenantId,
                OrderNumber = GenerateOrderNumber(branch.Id, requestedAt),
                CommercialDocumentReference = Clean(dto.CommercialDocumentReference),
                BranchId = branch.Id,
                CustomerId = dto.CustomerId,
                RequestedByUserId = userId,
                RequestedAt = requestedAt,
                Status = "Solicitada",
                ChassisNumber = Required(dto.ChassisNumber, "El chasis/VIN es obligatorio."),
                EngineNumber = Clean(dto.EngineNumber),
                Plate = Clean(dto.Plate),
                Brand = Required(dto.Brand, "La marca es obligatoria."),
                Model = Required(dto.Model, "El modelo es obligatorio."),
                Year = dto.Year,
                Mileage = dto.Mileage,
                ExecutedBy = Clean(dto.ExecutedBy),
                Findings = Clean(dto.Findings),
                WarrantyOpened = dto.WarrantyOpened,
                WarrantyId = dto.WarrantyId,
                Notes = Clean(dto.Notes),
                Items = await BuildItemsAsync(dto.Items, branch.TenantId)
            };

            await _repository.AddAsync(order);
            return (await GetByIdAsync(order.Id))!;
        }

        public async Task<PreparationOrderDto?> UpdateAsync(int id, UpdatePreparationOrderDto dto, string userId)
        {
            var order = await _repository.GetByIdAsync(id);
            if (order == null)
            {
                return null;
            }

            var branch = await ResolveBranchAsync(dto.BranchId ?? order.BranchId, userId);
            await ValidateCustomerAsync(dto.CustomerId, branch.TenantId);
            order.TenantId = branch.TenantId;
            order.CommercialDocumentReference = Clean(dto.CommercialDocumentReference);
            order.BranchId = branch.Id;
            order.CustomerId = dto.CustomerId;
            order.RequestedAt = dto.RequestedAt ?? order.RequestedAt;
            order.CompletedAt = dto.CompletedAt;
            order.Status = string.IsNullOrWhiteSpace(dto.Status) ? order.Status : dto.Status.Trim();
            order.ChassisNumber = Required(dto.ChassisNumber, "El chasis/VIN es obligatorio.");
            order.EngineNumber = Clean(dto.EngineNumber);
            order.Plate = Clean(dto.Plate);
            order.Brand = Required(dto.Brand, "La marca es obligatoria.");
            order.Model = Required(dto.Model, "El modelo es obligatorio.");
            order.Year = dto.Year;
            order.Mileage = dto.Mileage;
            order.ExecutedBy = Clean(dto.ExecutedBy);
            order.Findings = Clean(dto.Findings);
            order.WarrantyOpened = dto.WarrantyOpened;
            order.WarrantyId = dto.WarrantyId;
            order.Notes = Clean(dto.Notes);
            order.UpdatedAt = DateTime.UtcNow;

            var existingItems = await _itemRepository.GetAsync(i => i.PreparationOrderId == order.Id);
            foreach (var existing in existingItems)
            {
                await _itemRepository.DeleteAsync(existing);
            }

            foreach (var item in await BuildItemsAsync(dto.Items, branch.TenantId))
            {
                item.PreparationOrderId = order.Id;
                await _itemRepository.AddAsync(item);
            }

            await _repository.UpdateAsync(order);
            return await GetByIdAsync(order.Id);
        }

        public async Task<PreparationOrderDto?> CompleteAsync(int id, CompletePreparationOrderDto dto, string userId)
        {
            var order = await _repository.GetByIdAsync(id);
            if (order == null)
            {
                return null;
            }

            if (!await _userService.IsUserInBranchAsync(userId, order.BranchId))
            {
                throw new UnauthorizedAccessException("El usuario no tiene permiso para cerrar alistamientos de esta sucursal.");
            }

            order.Status = "Completada";
            order.CompletedAt = dto.CompletedAt ?? DateTime.Now;
            order.ExecutedBy = Clean(dto.ExecutedBy) ?? order.ExecutedBy;
            order.Findings = Clean(dto.Findings) ?? order.Findings;
            order.WarrantyOpened = dto.WarrantyOpened;
            order.WarrantyId = dto.WarrantyId;
            order.Notes = Clean(dto.Notes) ?? order.Notes;
            order.UpdatedAt = DateTime.UtcNow;

            await _repository.UpdateAsync(order);
            return await GetByIdAsync(order.Id);
        }

        public async Task<bool> DeleteAsync(int id, string userId)
        {
            var order = await _repository.GetByIdAsync(id);
            if (order == null)
            {
                return false;
            }

            if (!await _userService.IsUserInBranchAsync(userId, order.BranchId))
            {
                throw new UnauthorizedAccessException("El usuario no tiene permiso para anular alistamientos de esta sucursal.");
            }

            order.IsActive = false;
            order.Status = "Anulada";
            order.UpdatedAt = DateTime.UtcNow;
            await _repository.UpdateAsync(order);
            return true;
        }

        private async Task<Branch> ResolveBranchAsync(int? requestedBranchId, string userId)
        {
            var userBranchId = await _userService.GetUserBranchIdAsync(userId);
            var branchId = requestedBranchId ?? userBranchId;
            if (!branchId.HasValue)
            {
                throw new InvalidOperationException("El usuario no tiene una sucursal asignada para crear alistamientos.");
            }

            if (!await _userService.IsUserInBranchAsync(userId, branchId.Value))
            {
                throw new UnauthorizedAccessException("El usuario no tiene permiso para operar alistamientos en esta sucursal.");
            }

            var branch = await _branchRepository.GetByIdAsync(branchId.Value);
            if (branch == null)
            {
                throw new InvalidOperationException("La sucursal indicada no existe.");
            }

            return branch;
        }

        private async Task ValidateCustomerAsync(int? customerId, int tenantId)
        {
            if (!customerId.HasValue)
            {
                return;
            }

            var customer = await _customerRepository.GetByIdAsync(customerId.Value);
            if (customer == null || customer.TenantId != tenantId)
            {
                throw new InvalidOperationException("El cliente indicado no pertenece a la empresa del alistamiento.");
            }
        }

        private async Task<List<PreparationOrderItem>> BuildItemsAsync(IEnumerable<CreatePreparationOrderItemDto>? dtoItems, int tenantId)
        {
            var items = new List<PreparationOrderItem>();
            foreach (var dto in dtoItems ?? Enumerable.Empty<CreatePreparationOrderItemDto>())
            {
                if (dto.Quantity <= 0)
                {
                    throw new InvalidOperationException("La cantidad de cada consumo debe ser mayor a cero.");
                }

                Product? product = null;
                if (dto.ProductId.HasValue)
                {
                    product = await _productRepository.GetByIdAsync(dto.ProductId.Value);
                    if (product == null)
                    {
                        throw new InvalidOperationException($"Producto {dto.ProductId.Value} no encontrado.");
                    }

                    if (product.TenantId != tenantId)
                    {
                        throw new InvalidOperationException("El producto indicado no pertenece a la empresa del alistamiento.");
                    }
                }

                var reference = Clean(dto.Reference) ?? product?.SKU ?? string.Empty;
                var description = Clean(dto.Description) ?? product?.Name ?? string.Empty;
                if (string.IsNullOrWhiteSpace(reference) && string.IsNullOrWhiteSpace(description))
                {
                    throw new InvalidOperationException("Cada consumo debe tener producto, referencia o descripcion.");
                }

                var unit = Clean(dto.Unit) ?? product?.UnitOfMeasure ?? "UND";
                var unitValue = dto.UnitValue;

                items.Add(new PreparationOrderItem
                {
                    TenantId = tenantId,
                    ProductId = dto.ProductId,
                    Reference = reference,
                    Description = description,
                    Quantity = dto.Quantity,
                    Unit = unit,
                    UnitValue = unitValue,
                    TotalValue = decimal.Round(dto.Quantity * unitValue, 2),
                    Notes = Clean(dto.Notes)
                });
            }

            return items;
        }

        private static PreparationOrderDto MapToDto(PreparationOrder order)
        {
            return new PreparationOrderDto
            {
                Id = order.Id,
                OrderNumber = order.OrderNumber,
                CommercialDocumentReference = order.CommercialDocumentReference,
                BranchId = order.BranchId,
                BranchName = order.Branch?.Name,
                CustomerId = order.CustomerId,
                CustomerName = order.Customer == null ? null : $"{order.Customer.FirstName} {order.Customer.LastName}".Trim(),
                RequestedAt = order.RequestedAt,
                CompletedAt = order.CompletedAt,
                Status = order.Status,
                ChassisNumber = order.ChassisNumber,
                EngineNumber = order.EngineNumber,
                Plate = order.Plate,
                Brand = order.Brand,
                Model = order.Model,
                Year = order.Year,
                Mileage = order.Mileage,
                ExecutedBy = order.ExecutedBy,
                Findings = order.Findings,
                WarrantyOpened = order.WarrantyOpened,
                WarrantyId = order.WarrantyId,
                Notes = order.Notes,
                Items = order.Items?.Select(i => new PreparationOrderItemDto
                {
                    Id = i.Id,
                    ProductId = i.ProductId,
                    Reference = i.Reference,
                    Description = i.Description,
                    Quantity = i.Quantity,
                    Unit = i.Unit,
                    UnitValue = i.UnitValue,
                    TotalValue = i.TotalValue,
                    Notes = i.Notes
                }).ToList() ?? new List<PreparationOrderItemDto>()
            };
        }

        private static string GenerateOrderNumber(int branchId, DateTime requestedAt)
        {
            var suffix = Guid.NewGuid().ToString("N").Substring(0, 6).ToUpperInvariant();
            return $"AL-{requestedAt:yyyyMMddHHmmss}-{branchId}-{suffix}";
        }

        private static string Required(string? value, string message)
        {
            var clean = Clean(value);
            if (string.IsNullOrWhiteSpace(clean))
            {
                throw new InvalidOperationException(message);
            }

            return clean;
        }

        private static string? Clean(string? value)
        {
            return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
        }
    }
}
