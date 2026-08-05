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
        private static readonly string[] OrderTypes = { "GARANTIA", "REVISION_GARANTIA", "MANTENIMIENTO_PROGRAMADO", "REPARACION", "RETORNO", "OTRO" };
        private static readonly string[] Origins = { "TALLER", "GARANTIA", "OTRO" };
        private static readonly string[] Payers = { "CLIENTE", "FABRICA", "INTERNO" };
        private static readonly string[] ServiceTypes = { "PREVENTIVO", "CORRECTIVO", "GARANTIA", "RETRABAJO" };
        private static readonly string[] PartLineTypes = { "REPUESTO", "INSUMO" };
        private readonly IRepository<ServiceOrder> _repository;
        private readonly IRepository<Customer> _customerRepository;
        private readonly IRepository<ServiceOrderWork> _workRepository;
        private readonly IRepository<ServiceOrderPart> _partRepository;
        private readonly IRepository<ServiceOrderStatusHistory> _statusHistoryRepository;
        private readonly ISalesService _salesService;
        private readonly IRepository<Sale> _saleRepository;
        private readonly IRepository<SaleDetail> _saleDetailRepository;
        private readonly IRepository<Product> _productRepository;
        private readonly IRepository<Category> _categoryRepository;
        private readonly IRepository<Branch> _branchRepository;
        private readonly IRepository<Tenant> _tenantRepository;
        private readonly IRepository<Stock> _stockRepository;
        private readonly IUserService _userService;
        private readonly IVehicleService _vehicleService;

        public ServiceOrderService(
            IRepository<ServiceOrder> repository,
            IRepository<Customer> customerRepository,
            IRepository<ServiceOrderWork> workRepository,
            IRepository<ServiceOrderPart> partRepository,
            IRepository<ServiceOrderStatusHistory> statusHistoryRepository,
            ISalesService salesService,
            IRepository<Sale> saleRepository,
            IRepository<SaleDetail> saleDetailRepository,
            IRepository<Product> productRepository,
            IRepository<Category> categoryRepository,
            IRepository<Branch> branchRepository,
            IRepository<Tenant> tenantRepository,
            IRepository<Stock> stockRepository,
            IUserService userService,
            IVehicleService vehicleService)
        {
            _repository = repository;
            _customerRepository = customerRepository;
            _workRepository = workRepository;
            _partRepository = partRepository;
            _statusHistoryRepository = statusHistoryRepository;
            _salesService = salesService;
            _saleRepository = saleRepository;
            _saleDetailRepository = saleDetailRepository;
            _productRepository = productRepository;
            _categoryRepository = categoryRepository;
            _branchRepository = branchRepository;
            _tenantRepository = tenantRepository;
            _stockRepository = stockRepository;
            _userService = userService;
            _vehicleService = vehicleService;
        }

        public async Task<IEnumerable<ServiceOrderDto>> GetAllAsync(string search)
        {
            var orders = await _repository.GetAsync(
                predicate: o =>
                    string.IsNullOrEmpty(search) ||
                    o.Plate.Contains(search) ||
                    (o.ChassisNumber != null && o.ChassisNumber.Contains(search)) ||
                    (o.Technician != null && o.Technician.Contains(search)) ||
                    o.Customer.FirstName.Contains(search) ||
                    o.Customer.LastName.Contains(search),
                orderBy: q => q.OrderByDescending(o => o.IntakeDateTime),
                includeString: "Customer,StatusHistory"
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
            var tenant = await _tenantRepository.GetByIdAsync(branch.TenantId)
                ?? throw new InvalidOperationException("No se encontro la empresa de la sucursal asignada.");
            var receivedByName = await _userService.GetUserDisplayNameAsync(userId);
            var intakeDateTime = dto.IntakeDateTime == default ? DateTime.Now : dto.IntakeDateTime;
            var orderType = ValidateOption(dto.OrderType, OrderTypes, "tipo de orden");
            var origin = ValidateOption(dto.Origin, Origins, "origen de la orden");
            if (dto.PromisedDeliveryDateTime.HasValue && dto.PromisedDeliveryDateTime.Value < intakeDateTime)
                throw new InvalidOperationException("La entrega prometida no puede ser anterior al ingreso.");
            var visualEvidenceImages = NormalizeVisualEvidenceImages(dto.VisualEvidenceImages);
            var intakeSignature = NormalizeDataUrl(dto.IntakeCustomerSignatureDataUrl, "La firma del cliente", 700_000);
            if (string.IsNullOrWhiteSpace(intakeSignature))
            {
                throw new InvalidOperationException("La firma del cliente es obligatoria para registrar el ingreso del vehiculo.");
            }

            var registeredVehicle = await _vehicleService.RegisterOperationAsync(new RegisterVehicleOperationDto
            {
                TenantId = branch.TenantId,
                BranchId = branch.Id,
                CustomerId = dto.CustomerId,
                ChassisNumber = dto.ChassisNumber,
                EngineNumber = dto.EngineNumber,
                Plate = dto.Plate,
                BrandId = dto.BrandId,
                VehicleModelId = dto.VehicleModelId,
                Brand = dto.Brand,
                Model = dto.Model,
                Year = dto.Year,
                Mileage = dto.Mileage,
                OperationDate = intakeDateTime
            });

            var entity = new ServiceOrder
            {
                TenantId = branch.TenantId,
                CompanyName = tenant.Name,
                CompanyNit = tenant.Nit,
                OrderNumber = GenerateOrderNumber(branch.Id, intakeDateTime),
                BranchId = branch.Id,
                CustomerId = dto.CustomerId,
                VehicleId = registeredVehicle.VehicleId,
                ChassisNumber = VehicleService.NormalizeChassis(dto.ChassisNumber),
                EngineNumber = string.IsNullOrWhiteSpace(dto.EngineNumber) ? null : dto.EngineNumber.Trim().ToUpperInvariant(),
                Plate = dto.Plate,
                BrandId = registeredVehicle.BrandId,
                BrandCatalog = null,
                VehicleModelId = registeredVehicle.VehicleModelId,
                VehicleModel = null,
                Brand = registeredVehicle.Brand,
                Model = registeredVehicle.Model,
                Year = dto.Year,
                Mileage = dto.Mileage,
                MaintenanceReviewMileage = dto.MaintenanceReviewMileage,
                IntakeDateTime = intakeDateTime,
                PromisedDeliveryDateTime = dto.PromisedDeliveryDateTime,
                OrderType = orderType,
                Origin = origin,
                ReceivedByUserId = userId,
                ReceivedByName = receivedByName,
                FuelLevel = dto.FuelLevel,
                InitialObservations = dto.InitialObservations,
                VisualCondition = dto.VisualCondition,
                VisualEvidenceImagesJson = JsonSerializer.Serialize(visualEvidenceImages),
                IntakeCustomerSignatureDataUrl = intakeSignature,
                Technician = string.Empty,
                WorkshopManager = workshopManagerName,
                Status = "ABIERTA"
            };

            await _repository.AddAsync(entity);
            await AddStatusHistoryAsync(entity, userId, receivedByName, "Orden creada");

            return await GetByIdAsync(entity.Id);
        }

        public async Task<ServiceOrderDto> GetByIdAsync(int id)
        {
            var entity = (await _repository.GetAsync(
                predicate: o => o.Id == id,
                includeString: "Customer,StatusHistory")).FirstOrDefault();
            if (entity == null) return null;

            return MapToDto(entity, entity.Customer);
        }

        public async Task<ServiceOrderDto> SetDiagnosisAsync(int id, ServiceOrderDiagnosisDto dto, string userId)
        {
            var entity = await _repository.GetByIdAsync(id);
            if (entity == null) return null;

            if (entity.Status == "FINALIZADA" || entity.Status == "CANCELADA" || entity.Status == "CERRADA")
            {
                throw new InvalidOperationException("No se puede modificar el diagnóstico de una orden finalizada o cerrada.");
            }

            var previousStatus = entity.Status;
            entity.Status = "EN DIAGNOSTICO";
            // TODO: Save diagnosis fields if they exist in entity
            
            await _repository.UpdateAsync(entity);
            await RecordStatusChangeAsync(entity, previousStatus, userId, "Diagnostico registrado");

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
                ActualTimeHours = w.ActualTimeHours,
                LaborCost = w.LaborCost,
                Payer = w.Payer,
                AddsToCustomerTotal = w.AddsToCustomerTotal,
                ServiceType = w.ServiceType,
                MaintenanceReviewMileage = w.MaintenanceReviewMileage,
                Status = w.Status
            });
        }

        public async Task<ServiceOrderWorkDto> AddWorkAsync(int serviceOrderId, CreateServiceOrderWorkDto dto)
        {
            var order = await _repository.GetByIdAsync(serviceOrderId);
            if (order == null) return null;
            ValidateLineData(dto.Payer, dto.ServiceType, dto.MaintenanceReviewMileage, dto.EstimatedTimeHours, dto.ActualTimeHours);

            var entity = new ServiceOrderWork
            {
                ServiceOrderId = serviceOrderId,
                ProductId = dto.ProductId,
                Description = dto.Description,
                Technician = dto.Technician,
                EstimatedTimeHours = dto.EstimatedTimeHours,
                ActualTimeHours = dto.ActualTimeHours,
                LaborCost = dto.LaborCost,
                Payer = ValidateOption(dto.Payer, Payers, "pagador"),
                AddsToCustomerTotal = dto.AddsToCustomerTotal,
                ServiceType = ValidateOption(dto.ServiceType, ServiceTypes, "tipo de servicio"),
                MaintenanceReviewMileage = dto.MaintenanceReviewMileage,
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
                ActualTimeHours = entity.ActualTimeHours,
                LaborCost = entity.LaborCost,
                Payer = entity.Payer,
                AddsToCustomerTotal = entity.AddsToCustomerTotal,
                ServiceType = entity.ServiceType,
                MaintenanceReviewMileage = entity.MaintenanceReviewMileage,
                Status = entity.Status
            };
        }

        public async Task<ServiceOrderWorkDto> UpdateWorkAsync(int serviceOrderId, int workId, CreateServiceOrderWorkDto dto)
        {
            var entity = await _workRepository.GetByIdAsync(workId);
            if (entity == null || entity.ServiceOrderId != serviceOrderId) return null;
            ValidateLineData(dto.Payer, dto.ServiceType, dto.MaintenanceReviewMileage, dto.EstimatedTimeHours, dto.ActualTimeHours);

            entity.ProductId = dto.ProductId;
            entity.Description = dto.Description;
            entity.Technician = dto.Technician;
            entity.EstimatedTimeHours = dto.EstimatedTimeHours;
            entity.ActualTimeHours = dto.ActualTimeHours;
            entity.LaborCost = dto.LaborCost;
            entity.Payer = ValidateOption(dto.Payer, Payers, "pagador");
            entity.AddsToCustomerTotal = dto.AddsToCustomerTotal;
            entity.ServiceType = ValidateOption(dto.ServiceType, ServiceTypes, "tipo de servicio");
            entity.MaintenanceReviewMileage = dto.MaintenanceReviewMileage;
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
                ActualTimeHours = entity.ActualTimeHours,
                LaborCost = entity.LaborCost,
                Payer = entity.Payer,
                AddsToCustomerTotal = entity.AddsToCustomerTotal,
                ServiceType = entity.ServiceType,
                MaintenanceReviewMileage = entity.MaintenanceReviewMileage,
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
                ProductId = entity.ProductId,
                Description = entity.Description,
                Technician = entity.Technician,
                EstimatedTimeHours = entity.EstimatedTimeHours,
                ActualTimeHours = entity.ActualTimeHours,
                LaborCost = entity.LaborCost,
                Payer = entity.Payer,
                AddsToCustomerTotal = entity.AddsToCustomerTotal,
                ServiceType = entity.ServiceType,
                MaintenanceReviewMileage = entity.MaintenanceReviewMileage,
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
                UnitOfMeasureId = p.UnitOfMeasureId,
                UnitCode = p.UnitCode,
                QuantityBase = p.QuantityBase,
                LineType = p.LineType,
                Payer = p.Payer,
                AddsToCustomerTotal = p.AddsToCustomerTotal,
                ServiceType = p.ServiceType,
                MaintenanceReviewMileage = p.MaintenanceReviewMileage,
                Technician = p.Technician,
                EstimatedTimeHours = p.EstimatedTimeHours,
                ActualTimeHours = p.ActualTimeHours,
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
            foreach (var item in dto.Items)
            {
                ValidateLineData(item.Payer, item.ServiceType, item.MaintenanceReviewMileage, item.EstimatedTimeHours, item.ActualTimeHours);
                ValidateOption(item.LineType, PartLineTypes, "tipo de linea");
            }

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
                    Quantity = i.Quantity,
                    UnitOfMeasureId = i.UnitOfMeasureId,
                    DiscountType = i.DiscountType,
                    DiscountValue = i.DiscountValue
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
                    UnitOfMeasureId = saleItem.UnitOfMeasureId,
                    UnitCode = saleItem.UnitCode,
                    QuantityBase = saleItem.QuantityBase,
                    LineType = ValidateOption(requestItem.LineType, PartLineTypes, "tipo de linea"),
                    Payer = ValidateOption(requestItem.Payer, Payers, "pagador"),
                    AddsToCustomerTotal = requestItem.AddsToCustomerTotal,
                    ServiceType = ValidateOption(requestItem.ServiceType, ServiceTypes, "tipo de servicio"),
                    MaintenanceReviewMileage = requestItem.MaintenanceReviewMileage,
                    Technician = Clean(requestItem.Technician),
                    EstimatedTimeHours = requestItem.EstimatedTimeHours,
                    ActualTimeHours = requestItem.ActualTimeHours,
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
                UnitOfMeasureId = p.UnitOfMeasureId,
                UnitCode = p.UnitCode,
                QuantityBase = p.QuantityBase,
                LineType = p.LineType,
                Payer = p.Payer,
                AddsToCustomerTotal = p.AddsToCustomerTotal,
                ServiceType = p.ServiceType,
                MaintenanceReviewMileage = p.MaintenanceReviewMileage,
                Technician = p.Technician,
                EstimatedTimeHours = p.EstimatedTimeHours,
                ActualTimeHours = p.ActualTimeHours,
                UnitPrice = p.UnitPrice,
                DiscountType = p.DiscountType,
                DiscountValue = p.DiscountValue,
                DiscountAmount = p.DiscountAmount,
                SubTotal = p.SubTotal
            }).ToList();

            var total = partsDtos.Where(p => p.AddsToCustomerTotal).Sum(p => p.SubTotal);

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

        public async Task<ServiceOrderDto> CloseOrderAsync(int serviceOrderId, CloseServiceOrderDto dto, string userId)
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

            var previousStatus = entity.Status;
            entity.Status = "FINALIZADA";
            entity.ExitDateTime = dto.ExitDateTime;
            entity.DeliveryNotes = dto.DeliveryNotes;
            entity.CloseType = dto.CloseType;
            entity.CloseReason = dto.CloseReason;
            entity.CustomerSignatureName = dto.CustomerSignatureName;
            entity.SpecialCloseSupervisorName = dto.SpecialCloseSupervisorName;

            await _repository.UpdateAsync(entity);
            await RecordStatusChangeAsync(entity, previousStatus, userId, "Orden finalizada");

            var customer = await _customerRepository.GetByIdAsync(entity.CustomerId);

            return MapToDto(entity, customer);
        }

        public async Task<ServiceOrderDto> CancelOrderAsync(int serviceOrderId, CancelServiceOrderDto dto, string userId)
        {
            var entity = await _repository.GetByIdAsync(serviceOrderId);
            if (entity == null) return null;
            if (entity.Status == "CERRADA") throw new InvalidOperationException("Una orden facturada no puede anularse.");
            if (entity.Status == "CANCELADA" || entity.Status == "ANULADA") return await GetByIdAsync(entity.Id);

            var reason = string.IsNullOrWhiteSpace(dto.Reason)
                ? throw new InvalidOperationException("El motivo de anulacion es obligatorio.")
                : dto.Reason.Trim();
            var changedByName = await _userService.GetUserDisplayNameAsync(userId);
            var previousStatus = entity.Status;
            entity.Status = "CANCELADA";
            entity.CancelledAt = DateTime.UtcNow;
            entity.CancellationReason = reason;
            entity.CancelledByUserId = userId;
            entity.CancelledByName = changedByName;
            entity.IsActive = false;
            entity.UpdatedAt = DateTime.UtcNow;
            await _repository.UpdateAsync(entity);
            await AddStatusHistoryAsync(entity, userId, changedByName, $"Anulada desde {previousStatus}: {reason}");
            return await GetByIdAsync(entity.Id);
        }

        public async Task<SaleResultDto> GenerateInvoiceAsync(int serviceOrderId, GenerateInvoiceDto dto, string userId)
        {
            var serviceOrder = await _repository.GetByIdAsync(serviceOrderId);
            if (serviceOrder == null) throw new KeyNotFoundException($"Orden de servicio {serviceOrderId} no encontrada.");
            if (serviceOrder.Status == "CANCELADA" || serviceOrder.Status == "ANULADA")
                throw new InvalidOperationException("Una orden cancelada no puede facturarse.");

            // Check if already invoiced
            var existingSales = await _saleRepository.GetAsync(s => s.ServiceOrderId == serviceOrderId);
            var existingSale = existingSales.FirstOrDefault();
            if (existingSale != null)
            {
                // Ensure status is updated if for some reason it wasn't
                if (serviceOrder.Status != "CERRADA")
                {
                    var previousStatus = serviceOrder.Status;
                    serviceOrder.Status = "CERRADA";
                    await _repository.UpdateAsync(serviceOrder);
                    await RecordStatusChangeAsync(serviceOrder, previousStatus, userId, "Factura existente vinculada");
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
                includeString: "Product.Brand,Product.Category,Product.Category.Parent,Product.Category.Parent.Parent");
            var works = await _workRepository.GetAsync(w => w.ServiceOrderId == serviceOrderId);
            var billableLaborCost = works.Any()
                ? works.Where(w => w.AddsToCustomerTotal).Sum(w => w.LaborCost)
                : dto.LaborCost;

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
                if (!part.AddsToCustomerTotal) continue;
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

                var stock = (await _stockRepository.GetAsync(s => s.ProductId == part.ProductId && s.BranchId == branchId)).FirstOrDefault();
                var totalCost = (stock?.Cost ?? 0m) * part.QuantityBase;
                var detail = new SaleDetail
                {
                    SaleId = sale.Id,
                    ProductId = part.ProductId,
                    Quantity = part.Quantity,
                    UnitOfMeasureId = part.UnitOfMeasureId,
                    UnitCode = part.UnitCode,
                    QuantityBase = part.QuantityBase,
                    UnitPrice = part.UnitPrice,
                    DiscountAmount = part.DiscountAmount,
                    TaxRate = taxRate * 100, // Store as percentage
                    TaxAmount = taxAmount,
                    SubTotal = subTotal,
                    UnitCost = part.Quantity > 0 ? totalCost / part.Quantity : 0m,
                    TotalCost = totalCost,
                    BrandId = part.Product?.BrandId,
                    BrandName = part.Product?.Brand?.Name,
                    AccountingClassification = BuildSaleClassification(part.Product?.Category, part.LineType)
                };
                await _saleDetailRepository.AddAsync(detail);
                totalSaleAmount += subTotal;
            }

            // Add Sale Detail (Labor)
            {
                // Calculate Taxes for Labor
                decimal taxRate = (laborProduct.IvaRate + laborProduct.ImpoconsumoRate) / 100m;
                decimal subTotal = billableLaborCost;
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
                    UnitPrice = billableLaborCost,
                    DiscountAmount = 0,
                    TaxRate = taxRate * 100,
                    TaxAmount = taxAmount,
                    SubTotal = subTotal,
                    UnitCost = 0,
                    TotalCost = 0,
                    AccountingClassification = "TALLER / MANO_DE_OBRA"
                };
                await _saleDetailRepository.AddAsync(laborDetail);
                totalSaleAmount += subTotal;
            }

            // Update Sale Total
            sale.TotalAmount = totalSaleAmount;
            await _saleRepository.UpdateAsync(sale);

            // Update Service Order
            var statusBeforeInvoice = serviceOrder.Status;
            serviceOrder.Status = "CERRADA";
            serviceOrder.LaborCost = billableLaborCost;
            // serviceOrder.Sale = sale; // Not needed, relation is set via ServiceOrderId on Sale
            
            await _repository.UpdateAsync(serviceOrder);
            await RecordStatusChangeAsync(serviceOrder, statusBeforeInvoice, userId, $"Factura {sale.InvoiceNumber} generada");

            return await _salesService.GetSaleAsync(sale.Id);
        }

        private static string BuildSaleClassification(Category? category, string fallback)
        {
            if (category == null) return $"TALLER / {fallback}";
            var names = new Stack<string>();
            var current = category;
            while (current != null)
            {
                names.Push(current.Name.Trim().ToUpperInvariant());
                current = current.Parent;
            }
            return string.Join(" / ", names);
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
                CompanyName = entity.CompanyName,
                CompanyNit = entity.CompanyNit,
                OrderNumber = entity.OrderNumber,
                BranchId = entity.BranchId,
                CustomerId = entity.CustomerId,
                CustomerName = customerName,
                VehicleId = entity.VehicleId,
                BrandId = entity.BrandId,
                VehicleModelId = entity.VehicleModelId,
                ChassisNumber = entity.ChassisNumber ?? string.Empty,
                EngineNumber = entity.EngineNumber,
                Plate = entity.Plate,
                Brand = entity.Brand,
                Model = entity.Model,
                Year = entity.Year,
                Mileage = entity.Mileage,
                MaintenanceReviewMileage = entity.MaintenanceReviewMileage,
                IntakeDateTime = entity.IntakeDateTime,
                PromisedDeliveryDateTime = entity.PromisedDeliveryDateTime,
                OrderType = entity.OrderType,
                Origin = entity.Origin,
                ReceivedByUserId = entity.ReceivedByUserId,
                ReceivedByName = entity.ReceivedByName,
                FuelLevel = entity.FuelLevel,
                InitialObservations = entity.InitialObservations,
                VisualCondition = entity.VisualCondition,
                VisualEvidenceImages = DeserializeVisualEvidenceImages(entity.VisualEvidenceImagesJson),
                IntakeCustomerSignatureDataUrl = entity.IntakeCustomerSignatureDataUrl,
                Technician = entity.Technician,
                WorkshopManager = entity.WorkshopManager,
                Status = entity.Status,
                CancelledAt = entity.CancelledAt,
                CancellationReason = entity.CancellationReason,
                CancelledByUserId = entity.CancelledByUserId,
                CancelledByName = entity.CancelledByName,
                ExitDateTime = entity.ExitDateTime,
                DeliveryNotes = entity.DeliveryNotes,
                CloseType = entity.CloseType,
                CloseReason = entity.CloseReason,
                CustomerSignatureName = entity.CustomerSignatureName,
                StatusHistory = entity.StatusHistory?.OrderBy(h => h.ChangedAt).Select(h => new ServiceOrderStatusHistoryDto
                {
                    Id = h.Id,
                    Status = h.Status,
                    ChangedAt = h.ChangedAt,
                    ChangedByUserId = h.ChangedByUserId,
                    ChangedByName = h.ChangedByName,
                    Notes = h.Notes
                }).ToList() ?? new List<ServiceOrderStatusHistoryDto>()
            };
        }

        private async Task RecordStatusChangeAsync(ServiceOrder order, string previousStatus, string userId, string notes)
        {
            if (string.Equals(previousStatus, order.Status, StringComparison.OrdinalIgnoreCase)) return;
            await AddStatusHistoryAsync(order, userId, await _userService.GetUserDisplayNameAsync(userId), notes);
        }

        private async Task AddStatusHistoryAsync(ServiceOrder order, string? userId, string? userName, string? notes)
        {
            await _statusHistoryRepository.AddAsync(new ServiceOrderStatusHistory
            {
                TenantId = order.TenantId,
                ServiceOrderId = order.Id,
                Status = order.Status,
                ChangedAt = DateTime.UtcNow,
                ChangedByUserId = userId,
                ChangedByName = userName,
                Notes = notes
            });
        }

        private static void ValidateLineData(string payer, string serviceType, int? reviewMileage, decimal? estimatedHours, decimal? actualHours)
        {
            ValidateOption(payer, Payers, "pagador");
            var normalizedServiceType = ValidateOption(serviceType, ServiceTypes, "tipo de servicio");
            if (normalizedServiceType == "PREVENTIVO" && !reviewMileage.HasValue)
                throw new InvalidOperationException("La revision asociada es obligatoria para mantenimiento preventivo.");
            if (reviewMileage.HasValue && reviewMileage.Value <= 0)
                throw new InvalidOperationException("La revision asociada debe ser mayor a cero.");
            if ((estimatedHours.HasValue && estimatedHours.Value < 0) || (actualHours.HasValue && actualHours.Value < 0))
                throw new InvalidOperationException("Los tiempos estimado y real no pueden ser negativos.");
        }

        private static string ValidateOption(string? value, IEnumerable<string> allowed, string fieldName)
        {
            var normalized = string.IsNullOrWhiteSpace(value) ? string.Empty : value.Trim().ToUpperInvariant();
            if (!allowed.Contains(normalized))
                throw new InvalidOperationException($"El {fieldName} no pertenece a la lista permitida.");
            return normalized;
        }

        private static string GenerateOrderNumber(int branchId, DateTime intakeDateTime) =>
            $"OT-{intakeDateTime:yyyyMMddHHmmss}-{branchId}-{Guid.NewGuid().ToString("N")[..6].ToUpperInvariant()}";

        private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

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
