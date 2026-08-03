using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using TPV.Application.DTOs;
using TPV.Application.Interfaces;
using TPV.Domain.Entities;
using TPV.Domain.Interfaces;

namespace TPV.Application.Services
{
    public class ServiceOrderService : IServiceOrderService
    {
        private readonly IRepository<ServiceOrder> _repository;
        private readonly IRepository<Customer> _customerRepository;
        private readonly IRepository<ServiceOrderWork> _workRepository;
        private readonly IRepository<ServiceOrderPart> _partRepository;
        private readonly ISalesService _salesService;
        private readonly IRepository<Sale> _saleRepository;
        private readonly IRepository<SaleDetail> _saleDetailRepository;
        private readonly IRepository<Product> _productRepository;
        private readonly IRepository<Category> _categoryRepository;
        private readonly IRepository<Branch> _branchRepository;
        private readonly IUserService _userService;

        public ServiceOrderService(
            IRepository<ServiceOrder> repository,
            IRepository<Customer> customerRepository,
            IRepository<ServiceOrderWork> workRepository,
            IRepository<ServiceOrderPart> partRepository,
            ISalesService salesService,
            IRepository<Sale> saleRepository,
            IRepository<SaleDetail> saleDetailRepository,
            IRepository<Product> productRepository,
            IRepository<Category> categoryRepository,
            IRepository<Branch> branchRepository,
            IUserService userService)
        {
            _repository = repository;
            _customerRepository = customerRepository;
            _workRepository = workRepository;
            _partRepository = partRepository;
            _salesService = salesService;
            _saleRepository = saleRepository;
            _saleDetailRepository = saleDetailRepository;
            _productRepository = productRepository;
            _categoryRepository = categoryRepository;
            _branchRepository = branchRepository;
            _userService = userService;
        }

        public async Task<IEnumerable<ServiceOrderDto>> GetAllAsync(string search)
        {
            var orders = await _repository.GetAsync(
                predicate: o =>
                    string.IsNullOrEmpty(search) ||
                    o.Plate.Contains(search) ||
                    (o.Technician != null && o.Technician.Contains(search)) ||
                    o.Customer.FirstName.Contains(search) ||
                    o.Customer.LastName.Contains(search),
                orderBy: q => q.OrderByDescending(o => o.IntakeDateTime),
                includeString: "Customer"
            );

            return orders.Select(o => MapToDto(o));
        }

        public async Task<ServiceOrderDto> CreateAsync(CreateServiceOrderDto dto, string userId)
        {
            var userBranchId = await _userService.GetUserBranchIdAsync(userId);
            if (!userBranchId.HasValue)
            {
                throw new InvalidOperationException("El usuario no tiene una sucursal asignada para registrar ingresos de vehiculo.");
            }

            var branch = (await _branchRepository.GetAsync(
                predicate: b => b.Id == userBranchId.Value,
                includeString: "WorkshopManager"
            )).FirstOrDefault();

            if (branch == null)
            {
                throw new InvalidOperationException("No se encontro la sucursal asignada al usuario.");
            }

            var workshopManagerName = branch.WorkshopManager?.Name ?? branch.ManagerName;
            var visualEvidenceImages = NormalizeVisualEvidenceImages(dto.VisualEvidenceImages);
            var intakeSignature = NormalizeDataUrl(dto.IntakeCustomerSignatureDataUrl, "La firma del cliente", 700_000);
            if (string.IsNullOrWhiteSpace(intakeSignature))
            {
                throw new InvalidOperationException("La firma del cliente es obligatoria para registrar el ingreso del vehiculo.");
            }

            var entity = new ServiceOrder
            {
                CustomerId = dto.CustomerId,
                Plate = dto.Plate,
                Brand = dto.Brand,
                Model = dto.Model,
                Year = dto.Year,
                Mileage = dto.Mileage,
                IntakeDateTime = dto.IntakeDateTime == default ? DateTime.Now : dto.IntakeDateTime,
                FuelLevel = dto.FuelLevel,
                InitialObservations = dto.InitialObservations,
                VisualCondition = dto.VisualCondition,
                VisualEvidenceImagesJson = JsonSerializer.Serialize(visualEvidenceImages),
                IntakeCustomerSignatureDataUrl = intakeSignature,
                Technician = string.Empty,
                WorkshopManager = workshopManagerName,
                Status = dto.Status
            };

            await _repository.AddAsync(entity);

            // Fetch customer name for DTO
            var customer = await _customerRepository.GetByIdAsync(entity.CustomerId);

            return MapToDto(entity, customer);
        }

        public async Task<ServiceOrderDto> GetByIdAsync(int id)
        {
            var entity = await _repository.GetByIdAsync(id);
            if (entity == null) return null;

            var customer = await _customerRepository.GetByIdAsync(entity.CustomerId);

            return MapToDto(entity, customer);
        }

        public async Task<ServiceOrderDto> SetDiagnosisAsync(int id, ServiceOrderDiagnosisDto dto)
        {
            var entity = await _repository.GetByIdAsync(id);
            if (entity == null) return null;

            if (entity.Status == "FINALIZADA" || entity.Status == "CANCELADA" || entity.Status == "CERRADA")
            {
                throw new InvalidOperationException("No se puede modificar el diagnóstico de una orden finalizada o cerrada.");
            }

            entity.Status = "EN DIAGNOSTICO";
            // TODO: Save diagnosis fields if they exist in entity
            
            await _repository.UpdateAsync(entity);

            var customer = await _customerRepository.GetByIdAsync(entity.CustomerId);

            return MapToDto(entity, customer);
        }

        public async Task<IEnumerable<ServiceOrderWorkDto>> GetWorksByOrderAsync(int serviceOrderId)
        {
            var works = await _workRepository.GetAsync(w => w.ServiceOrderId == serviceOrderId);

            return works.Select(w => new ServiceOrderWorkDto
            {
                Id = w.Id,
                ServiceOrderId = w.ServiceOrderId,
                ProductId = w.ProductId,
                Description = w.Description,
                Technician = w.Technician,
                EstimatedTimeHours = w.EstimatedTimeHours,
                LaborCost = w.LaborCost,
                Status = w.Status
            });
        }

        public async Task<ServiceOrderWorkDto> AddWorkAsync(int serviceOrderId, CreateServiceOrderWorkDto dto)
        {
            var order = await _repository.GetByIdAsync(serviceOrderId);
            if (order == null) return null;

            var entity = new ServiceOrderWork
            {
                ServiceOrderId = serviceOrderId,
                ProductId = dto.ProductId,
                Description = dto.Description,
                Technician = dto.Technician,
                EstimatedTimeHours = dto.EstimatedTimeHours,
                LaborCost = dto.LaborCost,
                Status = dto.Status
            };

            await _workRepository.AddAsync(entity);

            return new ServiceOrderWorkDto
            {
                Id = entity.Id,
                ServiceOrderId = entity.ServiceOrderId,
                ProductId = entity.ProductId,
                Description = entity.Description,
                Technician = entity.Technician,
                EstimatedTimeHours = entity.EstimatedTimeHours,
                LaborCost = entity.LaborCost,
                Status = entity.Status
            };
        }

        public async Task<ServiceOrderWorkDto> UpdateWorkAsync(int serviceOrderId, int workId, CreateServiceOrderWorkDto dto)
        {
            var entity = await _workRepository.GetByIdAsync(workId);
            if (entity == null || entity.ServiceOrderId != serviceOrderId) return null;

            entity.ProductId = dto.ProductId;
            entity.Description = dto.Description;
            entity.Technician = dto.Technician;
            entity.EstimatedTimeHours = dto.EstimatedTimeHours;
            entity.LaborCost = dto.LaborCost;
            entity.Status = dto.Status;

            await _workRepository.UpdateAsync(entity);

            return new ServiceOrderWorkDto
            {
                Id = entity.Id,
                ServiceOrderId = entity.ServiceOrderId,
                ProductId = entity.ProductId,
                Description = entity.Description,
                Technician = entity.Technician,
                EstimatedTimeHours = entity.EstimatedTimeHours,
                LaborCost = entity.LaborCost,
                Status = entity.Status
            };
        }

        public async Task<ServiceOrderWorkDto> UpdateWorkStatusAsync(int serviceOrderId, int workId, ServiceOrderWorkStatusDto dto)
        {
            var entity = await _workRepository.GetByIdAsync(workId);
            if (entity == null || entity.ServiceOrderId != serviceOrderId) return null;

            entity.Status = dto.Status;
            await _workRepository.UpdateAsync(entity);

            return new ServiceOrderWorkDto
            {
                Id = entity.Id,
                ServiceOrderId = entity.ServiceOrderId,
                Description = entity.Description,
                Technician = entity.Technician,
                EstimatedTimeHours = entity.EstimatedTimeHours,
                LaborCost = entity.LaborCost,
                Status = entity.Status
            };
        }

        public async Task<IEnumerable<ServiceOrderPartDto>> GetPartsByOrderAsync(int serviceOrderId)
        {
            var parts = await _partRepository.GetAsync(p => p.ServiceOrderId == serviceOrderId, includeString: "Product");

            return parts.Select(p => new ServiceOrderPartDto
            {
                Id = p.Id,
                ServiceOrderId = p.ServiceOrderId,
                ProductId = p.ProductId,
                ProductName = p.Product != null ? p.Product.Name : string.Empty,
                SKU = p.Product != null ? p.Product.SKU : string.Empty,
                Quantity = p.Quantity,
                UnitPrice = p.UnitPrice,
                DiscountType = p.DiscountType,
                DiscountValue = p.DiscountValue,
                DiscountAmount = p.DiscountAmount,
                SubTotal = p.SubTotal
            });
        }

        public async Task<ServiceOrderPartsResultDto> ConfirmPartsAsync(int serviceOrderId, ConfirmServiceOrderPartsDto dto, string userId)
        {
            var order = await _repository.GetByIdAsync(serviceOrderId);
            if (order == null) return null;

            if (dto.Items == null || dto.Items.Count == 0) return null;

            // Obtener la sucursal del usuario
            var userBranchId = await _userService.GetUserBranchIdAsync(userId);
            if (!userBranchId.HasValue)
            {
                throw new InvalidOperationException("El usuario no tiene una sucursal asignada para realizar la venta de repuestos.");
            }

            var saleCreate = new SaleCreateDto
            {
                BranchId = userBranchId.Value,
                CustomerId = order.CustomerId,
                PaymentMethod = "ORDEN_SERVICIO",
                Items = dto.Items.Select(i => new SaleItemCreateDto
                {
                    ProductId = i.ProductId,
                    Quantity = i.Quantity
                }).ToList()
            };

            var saleResult = await _salesService.CreateSaleAsync(saleCreate, userId);

            var createdParts = new List<ServiceOrderPart>();

            for (var i = 0; i < saleResult.Items.Count && i < dto.Items.Count; i++)
            {
                var saleItem = saleResult.Items[i];
                var requestItem = dto.Items[i];

                var originalLineTotal = saleItem.UnitPrice * saleItem.Quantity;
                decimal discountAmount;

                if (requestItem.DiscountType == "PERCENT" && requestItem.DiscountValue > 0)
                {
                    discountAmount = decimal.Round(originalLineTotal * requestItem.DiscountValue / 100m, 2);
                }
                else if (requestItem.DiscountType == "FIXED" && requestItem.DiscountValue > 0)
                {
                    discountAmount = requestItem.DiscountValue;
                }
                else
                {
                    discountAmount = 0;
                }

                var finalSubTotal = originalLineTotal - discountAmount;

                var part = new ServiceOrderPart
                {
                    ServiceOrderId = serviceOrderId,
                    ProductId = saleItem.ProductId,
                    Quantity = saleItem.Quantity,
                    UnitPrice = saleItem.UnitPrice,
                    DiscountType = requestItem.DiscountType,
                    DiscountValue = requestItem.DiscountValue,
                    DiscountAmount = discountAmount,
                    SubTotal = finalSubTotal
                };

                await _partRepository.AddAsync(part);
                createdParts.Add(part);
            }

            var partsDtos = createdParts.Select(p => new ServiceOrderPartDto
            {
                Id = p.Id,
                ServiceOrderId = p.ServiceOrderId,
                ProductId = p.ProductId,
                ProductName = string.Empty,
                SKU = string.Empty,
                Quantity = p.Quantity,
                UnitPrice = p.UnitPrice,
                DiscountType = p.DiscountType,
                DiscountValue = p.DiscountValue,
                DiscountAmount = p.DiscountAmount,
                SubTotal = p.SubTotal
            }).ToList();

            var total = partsDtos.Sum(p => p.SubTotal);

            var result = new ServiceOrderPartsResultDto
            {
                ServiceOrderId = serviceOrderId,
                SaleId = saleResult.SaleId,
                InvoiceNumber = saleResult.InvoiceNumber,
                Total = total,
                Parts = partsDtos
            };

            return result;
        }

        public async Task<ServiceOrderDto> CloseOrderAsync(int serviceOrderId, CloseServiceOrderDto dto)
        {
            var entity = await _repository.GetByIdAsync(serviceOrderId);
            if (entity == null) return null;

            if (entity.Status == "FINALIZADA" || entity.Status == "CANCELADA" || entity.Status == "CERRADA")
            {
                return null;
            }

            if (!dto.AllServicesCompleted || !dto.MaterialsProcessed || !dto.NoPendingTechnicalNotes)
            {
                return null;
            }

            if (dto.CloseType == "ESPECIAL" && string.IsNullOrWhiteSpace(dto.SpecialCloseSupervisorName))
            {
                return null;
            }

            entity.Status = "FINALIZADA";
            entity.ExitDateTime = dto.ExitDateTime;
            entity.DeliveryNotes = dto.DeliveryNotes;
            entity.CloseType = dto.CloseType;
            entity.CloseReason = dto.CloseReason;
            entity.CustomerSignatureName = dto.CustomerSignatureName;
            entity.SpecialCloseSupervisorName = dto.SpecialCloseSupervisorName;

            await _repository.UpdateAsync(entity);

            var customer = await _customerRepository.GetByIdAsync(entity.CustomerId);

            return MapToDto(entity, customer);
        }

        public async Task<SaleResultDto> GenerateInvoiceAsync(int serviceOrderId, GenerateInvoiceDto dto, string userId)
        {
            var serviceOrder = await _repository.GetByIdAsync(serviceOrderId);
            if (serviceOrder == null) throw new KeyNotFoundException($"Orden de servicio {serviceOrderId} no encontrada.");

            // Check if already invoiced
            var existingSales = await _saleRepository.GetAsync(s => s.ServiceOrderId == serviceOrderId);
            var existingSale = existingSales.FirstOrDefault();
            if (existingSale != null)
            {
                // Ensure status is updated if for some reason it wasn't
                if (serviceOrder.Status != "CERRADA")
                {
                    serviceOrder.Status = "CERRADA";
                    await _repository.UpdateAsync(serviceOrder);
                }
                return await _salesService.GetSaleAsync(existingSale.Id);
            }

            // Find Labor Product
            var laborProduct = (await _productRepository.GetAsync(p => p.SKU == "MANO_OBRA" || p.Name == "Mano de Obra")).FirstOrDefault();
            if (laborProduct == null)
            {
                // Create MANO_OBRA product if not exists
                // 1. Find or create category
                var categories = await _categoryRepository.GetAllAsync();
                var category = categories.FirstOrDefault(c => c.Name.Equals("Servicios", StringComparison.OrdinalIgnoreCase)) 
                            ?? categories.FirstOrDefault();
                
                if (category == null)
                {
                    category = new Category { Name = "Servicios", Description = "Servicios generales", TenantId = serviceOrder.TenantId };
                    await _categoryRepository.AddAsync(category);
                }

                laborProduct = new Product
                {
                    SKU = "MANO_OBRA",
                    Name = "Mano de Obra",
                    Description = "Servicio de mano de obra en taller",
                    Price = 0, // Price is variable
                    CategoryId = category.Id,
                    TenantId = serviceOrder.TenantId,
                    UnitOfMeasure = "UND",
                    IvaType = "Excluido",
                    IvaRate = 0,
                    ImpoconsumoRate = 0,
                    PriceIncludesIva = false
                };
                await _productRepository.AddAsync(laborProduct);
            }

            var parts = await _partRepository.GetAsync(
                predicate: p => p.ServiceOrderId == serviceOrderId,
                includeString: "Product");

            // Find Branch
            var branches = await _branchRepository.GetAsync(b => b.TenantId == serviceOrder.TenantId);
            var branchId = branches.FirstOrDefault()?.Id ?? 1;

            // Create Sale
            var sale = new Sale
            {
                BranchId = branchId,
                TenantId = serviceOrder.TenantId,
                CustomerId = serviceOrder.CustomerId,
                Date = DateTime.Now,
                PaymentMethod = dto.PaymentMethod,
                InvoiceNumber = $"F-{DateTime.Now:yyyyMMdd}-{serviceOrder.Id}",
                UserId = userId,
                ServiceOrderId = serviceOrderId
            };

            await _saleRepository.AddAsync(sale);

            decimal totalSaleAmount = 0;

            // Add Sale Details (Parts)
            foreach (var part in parts)
            {
                // Calculate Taxes for Part
                decimal taxRate = 0;
                decimal taxAmount = 0;
                decimal subTotal = part.SubTotal;

                if (part.Product != null)
                {
                    taxRate = (part.Product.IvaRate + part.Product.ImpoconsumoRate) / 100m;
                    
                    if (part.Product.PriceIncludesIva)
                    {
                        // Back-calculate base
                        decimal baseAmount = subTotal / (1 + taxRate);
                        taxAmount = subTotal - baseAmount;
                        // SubTotal in SaleDetail is typically the total line amount in this system?
                        // Let's check SaleDetail definition. It says "SubTotal // Base + Impuestos (Total línea)" in comments.
                    }
                    else
                    {
                        // Add tax on top
                        taxAmount = subTotal * taxRate;
                        subTotal = subTotal + taxAmount; // Total line
                    }
                }

                var detail = new SaleDetail
                {
                    SaleId = sale.Id,
                    ProductId = part.ProductId,
                    Quantity = part.Quantity,
                    UnitPrice = part.UnitPrice,
                    TaxRate = taxRate * 100, // Store as percentage
                    TaxAmount = taxAmount,
                    SubTotal = subTotal
                };
                await _saleDetailRepository.AddAsync(detail);
                totalSaleAmount += subTotal;
            }

            // Add Sale Detail (Labor)
            {
                // Calculate Taxes for Labor
                decimal taxRate = (laborProduct.IvaRate + laborProduct.ImpoconsumoRate) / 100m;
                decimal subTotal = dto.LaborCost;
                decimal taxAmount = 0;

                if (laborProduct.PriceIncludesIva)
                {
                    decimal baseAmount = subTotal / (1 + taxRate);
                    taxAmount = subTotal - baseAmount;
                }
                else
                {
                    taxAmount = subTotal * taxRate;
                    subTotal = subTotal + taxAmount;
                }

                var laborDetail = new SaleDetail
                {
                    SaleId = sale.Id,
                    ProductId = laborProduct.Id,
                    Quantity = 1,
                    UnitPrice = dto.LaborCost,
                    TaxRate = taxRate * 100,
                    TaxAmount = taxAmount,
                    SubTotal = subTotal
                };
                await _saleDetailRepository.AddAsync(laborDetail);
                totalSaleAmount += subTotal;
            }

            // Update Sale Total
            sale.TotalAmount = totalSaleAmount;
            await _saleRepository.UpdateAsync(sale);

            // Update Service Order
            serviceOrder.Status = "CERRADA";
            serviceOrder.LaborCost = dto.LaborCost;
            // serviceOrder.Sale = sale; // Not needed, relation is set via ServiceOrderId on Sale
            
            await _repository.UpdateAsync(serviceOrder);

            return await _salesService.GetSaleAsync(sale.Id);
        }

        private ServiceOrderDto MapToDto(ServiceOrder entity, Customer customer = null)
        {
            var sourceCustomer = customer ?? entity.Customer;
            var customerName = sourceCustomer != null
                ? $"{sourceCustomer.FirstName} {sourceCustomer.LastName}".Trim()
                : string.Empty;

            return new ServiceOrderDto
            {
                Id = entity.Id,
                CustomerId = entity.CustomerId,
                CustomerName = customerName,
                Plate = entity.Plate,
                Brand = entity.Brand,
                Model = entity.Model,
                Year = entity.Year,
                Mileage = entity.Mileage,
                IntakeDateTime = entity.IntakeDateTime,
                FuelLevel = entity.FuelLevel,
                InitialObservations = entity.InitialObservations,
                VisualCondition = entity.VisualCondition,
                VisualEvidenceImages = DeserializeVisualEvidenceImages(entity.VisualEvidenceImagesJson),
                IntakeCustomerSignatureDataUrl = entity.IntakeCustomerSignatureDataUrl,
                Technician = entity.Technician,
                WorkshopManager = entity.WorkshopManager,
                Status = entity.Status,
                ExitDateTime = entity.ExitDateTime,
                DeliveryNotes = entity.DeliveryNotes,
                CloseType = entity.CloseType,
                CloseReason = entity.CloseReason,
                CustomerSignatureName = entity.CustomerSignatureName
            };
        }

        private static List<string> NormalizeVisualEvidenceImages(IEnumerable<string> images)
        {
            var normalized = (images ?? Enumerable.Empty<string>())
                .Select(image => NormalizeDataUrl(image, "Cada evidencia fotografica", 1_600_000))
                .Where(image => !string.IsNullOrWhiteSpace(image))
                .Take(6)
                .ToList();

            if ((images?.Count() ?? 0) > 6)
            {
                throw new InvalidOperationException("Solo se permiten hasta 6 evidencias fotograficas por ingreso.");
            }

            return normalized!;
        }

        private static string? NormalizeDataUrl(string? value, string fieldName, int maxLength)
        {
            var cleanValue = string.IsNullOrWhiteSpace(value) ? null : value.Trim();
            if (cleanValue == null)
            {
                return null;
            }

            if (!cleanValue.StartsWith("data:image/", StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException($"{fieldName} debe ser una imagen valida.");
            }

            if (cleanValue.Length > maxLength)
            {
                throw new InvalidOperationException($"{fieldName} supera el tamano permitido.");
            }

            return cleanValue;
        }

        private static List<string> DeserializeVisualEvidenceImages(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return new List<string>();
            }

            try
            {
                return JsonSerializer.Deserialize<List<string>>(value) ?? new List<string>();
            }
            catch (JsonException)
            {
                return new List<string>();
            }
        }
    }
}
