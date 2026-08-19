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
        private static readonly string[] WorkStatuses = { "PENDIENTE", "EN_PROCESO", "REALIZADO", "CANCELADO" };
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
        private readonly IRepository<UnitOfMeasure> _unitRepository;
        private readonly IRepository<Technician> _technicianRepository;
        private readonly IUserService _userService;
        private readonly IVehicleService _vehicleService;
        private readonly IStockService _stockService;
        private readonly IApplicationTransaction _transaction;

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
            IRepository<UnitOfMeasure> unitRepository,
            IRepository<Technician> technicianRepository,
            IUserService userService,
            IVehicleService vehicleService,
            IStockService stockService,
            IApplicationTransaction transaction)
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
            _unitRepository = unitRepository;
            _technicianRepository = technicianRepository;
            _userService = userService;
            _vehicleService = vehicleService;
            _stockService = stockService;
            _transaction = transaction;
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

            if (!dto.TechnicianId.HasValue)
            {
                throw new InvalidOperationException("Debe asignar un tecnico al registrar el ingreso del vehiculo.");
            }

            var technician = (await _technicianRepository.GetAsync(t =>
                t.Id == dto.TechnicianId.Value &&
                t.IsActive &&
                t.TenantId == branch.TenantId &&
                (!t.BranchId.HasValue || t.BranchId == branch.Id))).FirstOrDefault();
            if (technician == null)
            {
                throw new InvalidOperationException("Seleccione un tecnico activo de la sucursal.");
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
                Technician = technician.Name,
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

        public async Task<ServiceOrderWorkspaceDto> GetWorkspaceAsync(int id)
        {
            var order = await GetByIdAsync(id);
            if (order == null) return null;

            var works = (await GetWorksByOrderAsync(id)).ToList();
            var parts = (await GetPartsByOrderAsync(id)).ToList();
            var linkedSale = (await _saleRepository.GetAsync(s => s.ServiceOrderId == id)).FirstOrDefault();
            var invoice = linkedSale == null ? null : await _salesService.GetSaleAsync(linkedSale.Id);
            var billableLabor = works.Where(w => w.AddsToCustomerTotal).Sum(w => w.LaborCost);
            var billableLaborTax = works.Where(w => w.AddsToCustomerTotal)
                .Sum(w => decimal.Round(w.LaborCost * w.TaxRate / 100m, 2));
            var billableParts = parts.Where(p => p.AddsToCustomerTotal).Sum(p => p.SubTotal);
            var closed = order.Status is "FINALIZADA" or "CERRADA" or "CANCELADA" or "ANULADA";
            var allWorksCompleted = works.Count == 0 || works.All(w => w.Status == "REALIZADO");
            var hasDiagnosis = !string.IsNullOrWhiteSpace(order.TechnicalDiagnosis);

            return new ServiceOrderWorkspaceDto
            {
                Order = order,
                Works = works,
                Parts = parts,
                Invoice = invoice,
                BillableLaborTotal = billableLabor,
                BillableLaborTaxTotal = billableLaborTax,
                BillablePartsTotal = billableParts,
                EstimatedCustomerTotal = billableLabor + billableLaborTax + billableParts,
                HasDiagnosis = hasDiagnosis,
                AllWorksCompleted = allWorksCompleted,
                CanEdit = !closed,
                CanClose = !closed && hasDiagnosis && allWorksCompleted,
                CanInvoice = order.Status == "FINALIZADA" && invoice == null
            };
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
            entity.ProblemDescription = Clean(dto.ProblemDescription);
            entity.TechnicalDiagnosis = Clean(dto.TechnicalDiagnosis);
            if (string.IsNullOrWhiteSpace(entity.ProblemDescription) || string.IsNullOrWhiteSpace(entity.TechnicalDiagnosis))
            {
                throw new InvalidOperationException("La descripcion del problema y el diagnostico tecnico son obligatorios.");
            }
            entity.CustomerApprovedDiagnosis = dto.CustomerApproved;
            entity.DiagnosisApprovalDate = dto.CustomerApproved == true
                ? dto.ApprovalDate ?? DateTime.Now
                : dto.ApprovalDate;
            entity.DiagnosedAt = DateTime.UtcNow;
            entity.DiagnosedByUserId = userId;
            entity.DiagnosedByName = await _userService.GetUserDisplayNameAsync(userId);
            
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
                TaxRate = w.TaxRate,
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
            EnsureOrderCanBeEdited(order);
            ValidateLineData(dto.Payer, dto.ServiceType, dto.MaintenanceReviewMileage, dto.EstimatedTimeHours, dto.ActualTimeHours);
            var description = Clean(dto.Description)
                ?? throw new InvalidOperationException("La descripcion del trabajo es obligatoria.");
            var assignedTechnician = Clean(order.Technician)
                ?? throw new InvalidOperationException("La orden debe tener un tecnico asignado desde el ingreso del vehiculo.");
            if (dto.LaborCost < 0) throw new InvalidOperationException("El valor de la mano de obra no puede ser negativo.");
            ValidateTaxRate(dto.TaxRate);

            var entity = new ServiceOrderWork
            {
                ServiceOrderId = serviceOrderId,
                ProductId = dto.ProductId,
                Description = description,
                Technician = assignedTechnician,
                EstimatedTimeHours = dto.EstimatedTimeHours,
                ActualTimeHours = dto.ActualTimeHours,
                LaborCost = dto.LaborCost,
                TaxRate = dto.TaxRate,
                Payer = ValidateOption(dto.Payer, Payers, "pagador"),
                AddsToCustomerTotal = dto.AddsToCustomerTotal,
                ServiceType = ValidateOption(dto.ServiceType, ServiceTypes, "tipo de servicio"),
                MaintenanceReviewMileage = dto.MaintenanceReviewMileage,
                Status = ValidateOption(dto.Status, WorkStatuses, "estado del trabajo")
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
                TaxRate = entity.TaxRate,
                Payer = entity.Payer,
                AddsToCustomerTotal = entity.AddsToCustomerTotal,
                ServiceType = entity.ServiceType,
                MaintenanceReviewMileage = entity.MaintenanceReviewMileage,
                Status = entity.Status
            };
        }

        public async Task<ServiceOrderWorkDto> UpdateWorkAsync(int serviceOrderId, int workId, CreateServiceOrderWorkDto dto)
        {
            var order = await _repository.GetByIdAsync(serviceOrderId);
            if (order == null) return null;
            EnsureOrderCanBeEdited(order);
            var entity = await _workRepository.GetByIdAsync(workId);
            if (entity == null || entity.ServiceOrderId != serviceOrderId) return null;
            ValidateLineData(dto.Payer, dto.ServiceType, dto.MaintenanceReviewMileage, dto.EstimatedTimeHours, dto.ActualTimeHours);
            var description = Clean(dto.Description)
                ?? throw new InvalidOperationException("La descripcion del trabajo es obligatoria.");
            var assignedTechnician = Clean(order.Technician)
                ?? throw new InvalidOperationException("La orden debe tener un tecnico asignado desde el ingreso del vehiculo.");
            if (dto.LaborCost < 0) throw new InvalidOperationException("El valor de la mano de obra no puede ser negativo.");
            ValidateTaxRate(dto.TaxRate);

            entity.ProductId = dto.ProductId;
            entity.Description = description;
            entity.Technician = assignedTechnician;
            entity.EstimatedTimeHours = dto.EstimatedTimeHours;
            entity.ActualTimeHours = dto.ActualTimeHours;
            entity.LaborCost = dto.LaborCost;
            entity.TaxRate = dto.TaxRate;
            entity.Payer = ValidateOption(dto.Payer, Payers, "pagador");
            entity.AddsToCustomerTotal = dto.AddsToCustomerTotal;
            entity.ServiceType = ValidateOption(dto.ServiceType, ServiceTypes, "tipo de servicio");
            entity.MaintenanceReviewMileage = dto.MaintenanceReviewMileage;
            entity.Status = ValidateOption(dto.Status, WorkStatuses, "estado del trabajo");

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
                TaxRate = entity.TaxRate,
                Payer = entity.Payer,
                AddsToCustomerTotal = entity.AddsToCustomerTotal,
                ServiceType = entity.ServiceType,
                MaintenanceReviewMileage = entity.MaintenanceReviewMileage,
                Status = entity.Status
            };
        }

        public async Task<ServiceOrderWorkDto> UpdateWorkStatusAsync(int serviceOrderId, int workId, ServiceOrderWorkStatusDto dto)
        {
            var order = await _repository.GetByIdAsync(serviceOrderId);
            if (order == null) return null;
            EnsureOrderCanBeEdited(order);
            var entity = await _workRepository.GetByIdAsync(workId);
            if (entity == null || entity.ServiceOrderId != serviceOrderId) return null;

            entity.Status = ValidateOption(dto.Status, WorkStatuses, "estado del trabajo");
            if (entity.Status == "REALIZADO")
            {
                entity.ActualTimeHours = dto.ActualTimeHours ?? entity.ActualTimeHours ?? entity.EstimatedTimeHours;
                if (!entity.ActualTimeHours.HasValue || entity.ActualTimeHours.Value <= 0)
                    throw new InvalidOperationException("Registre el tiempo real para finalizar el trabajo.");
            }
            else if (dto.ActualTimeHours.HasValue)
            {
                if (dto.ActualTimeHours.Value < 0)
                    throw new InvalidOperationException("El tiempo real no puede ser negativo.");
                entity.ActualTimeHours = dto.ActualTimeHours;
            }
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
                TaxRate = entity.TaxRate,
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
            if (order.Status is "FINALIZADA" or "CERRADA" or "CANCELADA" or "ANULADA")
                throw new InvalidOperationException("No se pueden registrar consumos en una orden cerrada o anulada.");
            if (!order.BranchId.HasValue)
                throw new InvalidOperationException("La orden no tiene una sucursal asociada.");
            if (!await _userService.IsUserInBranchAsync(userId, order.BranchId.Value))
                throw new UnauthorizedAccessException("El usuario no tiene permiso para consumir inventario de esta sucursal.");
            if (dto.Items == null || dto.Items.Count == 0) return null;
            foreach (var item in dto.Items)
            {
                ValidateLineData(item.Payer, item.ServiceType, item.MaintenanceReviewMileage, item.EstimatedTimeHours, item.ActualTimeHours);
                ValidateOption(item.LineType, PartLineTypes, "tipo de linea");
                if (item.Quantity <= 0) throw new InvalidOperationException("La cantidad debe ser mayor que cero.");
            }

            return await _transaction.ExecuteAsync(async () =>
            {
                var createdParts = new List<(ServiceOrderPart Part, Product Product)>();
                foreach (var requestItem in dto.Items)
                {
                    var product = (await _productRepository.GetAsync(
                        p => p.Id == requestItem.ProductId,
                        includeString: "UnitConversions")).FirstOrDefault()
                        ?? throw new InvalidOperationException($"Producto {requestItem.ProductId} no encontrado.");
                    if (product.TenantId != order.TenantId)
                        throw new InvalidOperationException("El producto no pertenece a la empresa de la orden.");

                    var unitId = requestItem.UnitOfMeasureId ?? product.SaleUnitId ?? product.BaseUnitId
                        ?? throw new InvalidOperationException($"El producto '{product.Name}' no tiene unidad de salida configurada.");
                    var unit = await _unitRepository.GetByIdAsync(unitId)
                        ?? throw new InvalidOperationException("La unidad seleccionada no existe.");
                    var factor = product.BaseUnitId == unitId
                        ? 1m
                        : product.UnitConversions.FirstOrDefault(c => c.UnitOfMeasureId == unitId)?.FactorToBase ?? 0m;
                    if (factor <= 0)
                        throw new InvalidOperationException($"No existe conversion de {unit.Code} a la unidad base de '{product.Name}'.");
                    if (!product.AllowsFractionalQuantity && requestItem.Quantity != decimal.Truncate(requestItem.Quantity))
                        throw new InvalidOperationException($"El producto '{product.Name}' no admite cantidades fraccionadas.");

                    var stock = (await _stockRepository.GetAsync(
                        s => s.ProductId == product.Id && s.BranchId == order.BranchId.Value)).FirstOrDefault();
                    var baseQuantity = requestItem.Quantity * factor;
                    if (stock == null || stock.Quantity < baseQuantity)
                        throw new InvalidOperationException($"Stock insuficiente para '{product.Name}'. Disponible: {stock?.Quantity ?? 0} en unidad base.");

                    var unitPrice = product.Price;
                    if (stock.Cost > 0 && (product.ProfitabilityPercentage ?? 0) > 0)
                    {
                        unitPrice = stock.Cost * factor * (1 + product.ProfitabilityPercentage.Value / 100m);
                        if (product.PriceIncludesIva && product.IvaRate > 0)
                            unitPrice *= 1 + product.IvaRate / 100m;
                        unitPrice = decimal.Round(unitPrice, 2);
                    }

                    var discountType = string.IsNullOrWhiteSpace(requestItem.DiscountType)
                        ? "NONE"
                        : requestItem.DiscountType.Trim().ToUpperInvariant();
                    if (discountType is not ("NONE" or "PERCENT" or "FIXED"))
                        throw new InvalidOperationException("El tipo de descuento no es valido.");
                    var listedAmount = unitPrice * requestItem.Quantity;
                    var discountAmount = discountType == "PERCENT"
                        ? decimal.Round(listedAmount * Math.Min(requestItem.DiscountValue, 100m) / 100m, 2)
                        : discountType == "FIXED" ? Math.Min(requestItem.DiscountValue, listedAmount) : 0m;

                    var part = new ServiceOrderPart
                    {
                        ServiceOrderId = serviceOrderId,
                        ProductId = product.Id,
                        Quantity = requestItem.Quantity,
                        UnitOfMeasureId = unit.Id,
                        UnitCode = unit.Code,
                        QuantityBase = baseQuantity,
                        LineType = ValidateOption(requestItem.LineType, PartLineTypes, "tipo de linea"),
                        Payer = ValidateOption(requestItem.Payer, Payers, "pagador"),
                        AddsToCustomerTotal = requestItem.AddsToCustomerTotal,
                        ServiceType = ValidateOption(requestItem.ServiceType, ServiceTypes, "tipo de servicio"),
                        MaintenanceReviewMileage = requestItem.MaintenanceReviewMileage,
                        Technician = Clean(requestItem.Technician),
                        EstimatedTimeHours = requestItem.EstimatedTimeHours,
                        ActualTimeHours = requestItem.ActualTimeHours,
                        UnitPrice = unitPrice,
                        DiscountType = discountType,
                        DiscountValue = requestItem.DiscountValue,
                        DiscountAmount = discountAmount,
                        SubTotal = listedAmount - discountAmount
                    };

                    await _partRepository.AddAsync(part);
                    await _stockService.ApplyMovementAsync(
                        product.Id,
                        order.BranchId.Value,
                        requestItem.Quantity,
                        unit.Id,
                        false,
                        "CONSUMO_TALLER",
                        "ORDEN_SERVICIO",
                        order.Id,
                        order.OrderNumber,
                        $"Consumo en orden {order.OrderNumber}",
                        null,
                        userId);
                    createdParts.Add((part, product));
                }

                var partsDtos = createdParts.Select(row => new ServiceOrderPartDto
                {
                    Id = row.Part.Id,
                    ServiceOrderId = row.Part.ServiceOrderId,
                    ProductId = row.Part.ProductId,
                    ProductName = row.Product.Name,
                    SKU = row.Product.SKU,
                    Quantity = row.Part.Quantity,
                    UnitOfMeasureId = row.Part.UnitOfMeasureId,
                    UnitCode = row.Part.UnitCode,
                    QuantityBase = row.Part.QuantityBase,
                    LineType = row.Part.LineType,
                    Payer = row.Part.Payer,
                    AddsToCustomerTotal = row.Part.AddsToCustomerTotal,
                    ServiceType = row.Part.ServiceType,
                    MaintenanceReviewMileage = row.Part.MaintenanceReviewMileage,
                    Technician = row.Part.Technician,
                    EstimatedTimeHours = row.Part.EstimatedTimeHours,
                    ActualTimeHours = row.Part.ActualTimeHours,
                    UnitPrice = row.Part.UnitPrice,
                    DiscountType = row.Part.DiscountType,
                    DiscountValue = row.Part.DiscountValue,
                    DiscountAmount = row.Part.DiscountAmount,
                    SubTotal = row.Part.SubTotal
                }).ToList();

                return new ServiceOrderPartsResultDto
                {
                    ServiceOrderId = serviceOrderId,
                    DocumentNumber = order.OrderNumber,
                    Total = partsDtos.Where(p => p.AddsToCustomerTotal).Sum(p => p.SubTotal),
                    Parts = partsDtos
                };
            });
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

            if (string.IsNullOrWhiteSpace(entity.TechnicalDiagnosis))
                throw new InvalidOperationException("Debe registrar el diagnostico antes de finalizar la orden.");
            var pendingWorks = await _workRepository.GetAsync(w => w.ServiceOrderId == serviceOrderId && w.Status != "REALIZADO");
            if (pendingWorks.Any())
                throw new InvalidOperationException("Todos los trabajos deben estar realizados antes del cierre.");

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
            return await _transaction.ExecuteAsync(() => GenerateInvoiceCoreAsync(serviceOrderId, dto, userId));
        }

        private async Task<SaleResultDto> GenerateInvoiceCoreAsync(int serviceOrderId, GenerateInvoiceDto dto, string userId)
        {
            var serviceOrder = await _repository.GetByIdAsync(serviceOrderId);
            if (serviceOrder == null) throw new KeyNotFoundException($"Orden de servicio {serviceOrderId} no encontrada.");
            if (serviceOrder.Status == "CANCELADA" || serviceOrder.Status == "ANULADA")
                throw new InvalidOperationException("Una orden cancelada no puede facturarse.");
            if (serviceOrder.Status != "FINALIZADA" && serviceOrder.Status != "CERRADA")
                throw new InvalidOperationException("La orden debe finalizarse antes de generar la factura.");
            if (!serviceOrder.BranchId.HasValue)
                throw new InvalidOperationException("La orden no tiene una sucursal asociada.");
            if (!await _userService.IsUserInBranchAsync(userId, serviceOrder.BranchId.Value))
                throw new UnauthorizedAccessException("El usuario no tiene permiso para facturar en esta sucursal.");

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
            var laborProduct = (await _productRepository.GetAsync(
                p => p.TenantId == serviceOrder.TenantId && (p.SKU == "MANO_OBRA" || p.Name == "Mano de Obra"))).FirstOrDefault();
            if (laborProduct == null)
            {
                // Create MANO_OBRA product if not exists
                // 1. Find or create category
                var categories = await _categoryRepository.GetAsync(c => c.TenantId == serviceOrder.TenantId);
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
            var billableLaborCost = works.Where(w => w.AddsToCustomerTotal).Sum(w => w.LaborCost);

            var branchId = serviceOrder.BranchId.Value;

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

            // Preserve the configured tax for each service, even when a work order
            // combines services taxed at different rates.
            foreach (var laborGroup in works
                .Where(w => w.AddsToCustomerTotal && w.LaborCost > 0)
                .GroupBy(w => w.TaxRate))
            {
                var laborBase = laborGroup.Sum(w => w.LaborCost);
                var taxRate = laborGroup.Key;
                var taxAmount = decimal.Round(laborBase * taxRate / 100m, 2);
                var laborTotal = laborBase + taxAmount;

                var laborDetail = new SaleDetail
                {
                    SaleId = sale.Id,
                    ProductId = laborProduct.Id,
                    Quantity = 1,
                    UnitPrice = laborBase,
                    DiscountAmount = 0,
                    TaxRate = taxRate,
                    TaxAmount = taxAmount,
                    SubTotal = laborTotal,
                    UnitCost = 0,
                    TotalCost = 0,
                    AccountingClassification = "TALLER / MANO_DE_OBRA"
                };
                await _saleDetailRepository.AddAsync(laborDetail);
                totalSaleAmount += laborTotal;
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
                ProblemDescription = entity.ProblemDescription,
                TechnicalDiagnosis = entity.TechnicalDiagnosis,
                CustomerApprovedDiagnosis = entity.CustomerApprovedDiagnosis,
                DiagnosisApprovalDate = entity.DiagnosisApprovalDate,
                DiagnosedAt = entity.DiagnosedAt,
                DiagnosedByUserId = entity.DiagnosedByUserId,
                DiagnosedByName = entity.DiagnosedByName,
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

        private static void ValidateTaxRate(decimal taxRate)
        {
            if (taxRate < 0 || taxRate > 100)
                throw new InvalidOperationException("El impuesto del servicio debe estar entre 0 y 100.");
        }

        private static void EnsureOrderCanBeEdited(ServiceOrder order)
        {
            if (order.Status is "FINALIZADA" or "CERRADA" or "CANCELADA" or "ANULADA")
                throw new InvalidOperationException("No se puede modificar una orden finalizada, cerrada o anulada.");
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
