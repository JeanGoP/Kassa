using System.Collections.Generic;
using System.Linq;
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

        public ServiceOrderService(
            IRepository<ServiceOrder> repository,
            IRepository<Customer> customerRepository,
            IRepository<ServiceOrderWork> workRepository,
            IRepository<ServiceOrderPart> partRepository,
            ISalesService salesService,
            IRepository<Sale> saleRepository,
            IRepository<SaleDetail> saleDetailRepository,
            IRepository<Product> productRepository)
        {
            _repository = repository;
            _customerRepository = customerRepository;
            _workRepository = workRepository;
            _partRepository = partRepository;
            _salesService = salesService;
            _saleRepository = saleRepository;
            _saleDetailRepository = saleDetailRepository;
            _productRepository = productRepository;
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

        public async Task<ServiceOrderDto> CreateAsync(CreateServiceOrderDto dto)
        {
            var entity = new ServiceOrder
            {
                CustomerId = dto.CustomerId,
                Plate = dto.Plate,
                Brand = dto.Brand,
                Model = dto.Model,
                Year = dto.Year,
                Mileage = dto.Mileage,
                IntakeDateTime = dto.IntakeDateTime,
                FuelLevel = dto.FuelLevel,
                InitialObservations = dto.InitialObservations,
                VisualCondition = dto.VisualCondition,
                Technician = string.Empty,
                WorkshopManager = dto.WorkshopManager,
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

            entity.Status = "EN DIAGNOSTICO";
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

            var saleCreate = new SaleCreateDto
            {
                BranchId = 1,
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

            if (entity.Status == "FINALIZADA" || entity.Status == "CANCELADA")
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
                return await _salesService.GetSaleAsync(existingSale.Id);
            }

            // Find Labor Product
            var laborProduct = (await _productRepository.GetAsync(p => p.SKU == "MANO_OBRA" || p.Name == "Mano de Obra")).FirstOrDefault();
            if (laborProduct == null)
            {
                throw new InvalidOperationException("No se encontró el producto 'Mano de Obra' (SKU: MANO_OBRA) en el sistema. Por favor créelo antes de facturar.");
            }

            var parts = await _partRepository.GetAsync(p => p.ServiceOrderId == serviceOrderId);

            // Create Sale
            var sale = new Sale
            {
                BranchId = 1, // Default branch
                CustomerId = serviceOrder.CustomerId,
                Date = DateTime.Now,
                PaymentMethod = dto.PaymentMethod,
                InvoiceNumber = $"F-{DateTime.Now:yyyyMMdd}-{serviceOrder.Id}",
                UserId = userId,
                ServiceOrderId = serviceOrderId
            };

            // Calculate Totals
            decimal partsTotal = parts.Sum(p => p.SubTotal);
            decimal subTotal = partsTotal + dto.LaborCost;
            decimal taxRate = 0.21m; // 21% VAT hardcoded for now
            decimal taxAmount = subTotal * taxRate;
            sale.TotalAmount = subTotal + taxAmount;

            await _saleRepository.AddAsync(sale);

            // Add Sale Details (Parts)
            foreach (var part in parts)
            {
                var detail = new SaleDetail
                {
                    SaleId = sale.Id,
                    ProductId = part.ProductId,
                    Quantity = part.Quantity,
                    UnitPrice = part.UnitPrice,
                    SubTotal = part.SubTotal
                };
                await _saleDetailRepository.AddAsync(detail);
            }

            // Add Sale Detail (Labor)
            var laborDetail = new SaleDetail
            {
                SaleId = sale.Id,
                ProductId = laborProduct.Id,
                Quantity = 1,
                UnitPrice = dto.LaborCost,
                SubTotal = dto.LaborCost
            };
            await _saleDetailRepository.AddAsync(laborDetail);

            // Update Service Order
            serviceOrder.Status = "CERRADA";
            serviceOrder.LaborCost = dto.LaborCost;
            // serviceOrder.Sale = sale; // Not needed, relation is set via ServiceOrderId on Sale
            
            await _repository.UpdateAsync(serviceOrder);

            return await _salesService.GetSaleAsync(sale.Id);
        }

        private ServiceOrderDto MapToDto(ServiceOrder entity, Customer customer = null)
        {
            var customerName = customer != null
                ? $"{customer.FirstName} {customer.LastName}"
                : null;

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
    }
}
