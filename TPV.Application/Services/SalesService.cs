using System;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;
using TPV.Application.DTOs;
using TPV.Application.Interfaces;
using TPV.Domain.Entities;
using TPV.Domain.Interfaces;

namespace TPV.Application.Services
{
    public class SalesService : ISalesService
    {
        private readonly IRepository<Sale> _saleRepository;
        private readonly IRepository<SaleDetail> _saleDetailRepository;
        private readonly IRepository<Product> _productRepository;
        private readonly IRepository<Stock> _stockRepository;
        private readonly IElectronicInvoicingService _electronicInvoicingService;
        private readonly IUserService _userService;
        private readonly IStockService _stockService;
        private readonly IRepository<UnitOfMeasure> _unitRepository;
        private readonly IRepository<SaleAdjustment> _adjustmentRepository;

        public SalesService(
            IRepository<Sale> saleRepository,
            IRepository<SaleDetail> saleDetailRepository,
            IRepository<Product> productRepository,
            IRepository<Stock> stockRepository,
            IElectronicInvoicingService electronicInvoicingService,
            IUserService userService,
            IStockService stockService,
            IRepository<UnitOfMeasure> unitRepository,
            IRepository<SaleAdjustment> adjustmentRepository)
        {
            _saleRepository = saleRepository;
            _saleDetailRepository = saleDetailRepository;
            _productRepository = productRepository;
            _stockRepository = stockRepository;
            _electronicInvoicingService = electronicInvoicingService;
            _userService = userService;
            _stockService = stockService;
            _unitRepository = unitRepository;
            _adjustmentRepository = adjustmentRepository;
        }

        public async Task<SaleResultDto> CreateSaleAsync(SaleCreateDto dto, string userId)
        {
            if (!await _userService.IsUserInBranchAsync(userId, dto.BranchId))
            {
                throw new UnauthorizedAccessException("El usuario no tiene permiso para realizar ventas en esta sucursal.");
            }

            if (dto.Items == null || dto.Items.Count == 0)
                throw new InvalidOperationException("No hay ítems en la venta.");

            // Validar stock disponible y obtener precios reales
            var processedItems = new List<(int ProductId, decimal Quantity, int UnitId, string UnitCode, decimal BaseQuantity,
                decimal UnitPrice, decimal DiscountAmount, decimal UnitCost, decimal TotalCost, string ProductName,
                decimal IvaRate, string IvaType, bool PriceIncludesIva, int? BrandId, string? BrandName, string Classification)>();

            foreach (var item in dto.Items)
            {
                var product = (await _productRepository.GetAsync(p => p.Id == item.ProductId, null,
                    "UnitConversions,Brand,Category,Category.Parent,Category.Parent.Parent,Category.Parent.Parent.Parent")).FirstOrDefault();
                if (product == null)
                    throw new InvalidOperationException($"Producto con ID {item.ProductId} no encontrado.");
                if (item.Quantity <= 0) throw new InvalidOperationException("La cantidad debe ser mayor que cero.");

                var unitId = item.UnitOfMeasureId ?? product.SaleUnitId ?? product.BaseUnitId
                    ?? throw new InvalidOperationException($"El producto '{product.Name}' no tiene unidad de venta configurada.");
                var unit = await _unitRepository.GetByIdAsync(unitId)
                    ?? throw new InvalidOperationException("La unidad de venta no existe.");
                if (!product.AllowsFractionalQuantity && item.Quantity != decimal.Truncate(item.Quantity))
                    throw new InvalidOperationException($"El producto '{product.Name}' no admite cantidades fraccionadas.");
                var factor = product.BaseUnitId == unitId ? 1m
                    : product.UnitConversions.FirstOrDefault(c => c.UnitOfMeasureId == unitId)?.FactorToBase ?? 0m;
                if (factor <= 0) throw new InvalidOperationException($"No existe conversión de {unit.Code} a la unidad base de '{product.Name}'.");
                var baseQuantity = item.Quantity * factor;

                var stockList = await _stockRepository.GetAsync(s => s.ProductId == item.ProductId && s.BranchId == dto.BranchId);
                var stock = stockList.FirstOrDefault();
                
                if (stock == null)
                    throw new InvalidOperationException($"No existe registro de stock para el producto '{product.Name}' en la sucursal {dto.BranchId}.");

                if (stock.Quantity < baseQuantity)
                    throw new InvalidOperationException($"Stock insuficiente para '{product.Name}' en sucursal {dto.BranchId}. Disponible: {stock.Quantity}, Solicitado: {item.Quantity}.");
                
                decimal finalPrice = product.Price;

                // Calculate dynamic price if applicable (Cost > 0 and Profitability > 0)
                if (stock.Cost > 0 && (product.ProfitabilityPercentage ?? 0) > 0)
                {
                    decimal basePrice = stock.Cost * (1 + (product.ProfitabilityPercentage.Value / 100));
                    
                    if (product.PriceIncludesIva && product.IvaRate > 0)
                    {
                        finalPrice = basePrice * (1 + (product.IvaRate / 100));
                    }
                    else
                    {
                        finalPrice = basePrice;
                    }
                    finalPrice = System.Math.Round(finalPrice, 2);
                }

                var discountType = string.IsNullOrWhiteSpace(item.DiscountType) ? "NONE" : item.DiscountType.Trim().ToUpperInvariant();
                if (discountType != "NONE" && discountType != "PERCENT" && discountType != "FIXED")
                    throw new InvalidOperationException("El tipo de descuento no es válido.");
                if (item.DiscountValue < 0) throw new InvalidOperationException("El descuento no puede ser negativo.");
                var listedAmount = finalPrice * item.Quantity;
                var discountAmount = discountType == "PERCENT"
                    ? decimal.Round(listedAmount * Math.Min(item.DiscountValue, 100m) / 100m, 2)
                    : discountType == "FIXED" ? Math.Min(item.DiscountValue, listedAmount) : 0m;
                var unitCost = stock.Cost * factor;
                var totalCost = stock.Cost * baseQuantity;

                processedItems.Add((item.ProductId, item.Quantity, unit.Id, unit.Code, baseQuantity, finalPrice,
                    discountAmount, unitCost, totalCost, product.Name, product.IvaRate, product.IvaType,
                    product.PriceIncludesIva, product.BrandId, product.Brand?.Name, BuildCategoryPath(product.Category)));
            }

            var sale = new Sale
            {
                BranchId = dto.BranchId,
                CustomerId = dto.CustomerId,
                Date = DateTime.Now,
                PaymentMethod = dto.PaymentMethod,
                InvoiceNumber = $"V-{DateTime.Now:yyyyMMddHHmmss}-{dto.BranchId}",
                UserId = userId,
                TotalAmount = 0 // Se recalcula más abajo con IVA discriminado
            };

            sale = await _saleRepository.AddAsync(sale);

            decimal total = 0;

            foreach (var item in processedItems)
            {
                decimal lineBase;
                decimal lineTax;

                if (item.IvaType == "Exento" || item.IvaType == "Excluido" || item.IvaRate <= 0)
                {
                    lineBase = item.UnitPrice * item.Quantity - item.DiscountAmount;
                    lineTax = 0;
                }
                else if (item.PriceIncludesIva)
                {
                    var divisor = 1 + (item.IvaRate / 100m);
                    var gross = item.UnitPrice * item.Quantity - item.DiscountAmount;
                    var baseAmount = decimal.Round(gross / divisor, 2);
                    var taxAmount = gross - baseAmount;
                    lineBase = baseAmount;
                    lineTax = taxAmount;
                }
                else
                {
                    lineBase = item.UnitPrice * item.Quantity - item.DiscountAmount;
                    lineTax = decimal.Round(lineBase * (item.IvaRate / 100m), 2);
                }

                var detail = new SaleDetail
                {
                    SaleId = sale.Id,
                    ProductId = item.ProductId,
                    Quantity = item.Quantity,
                    UnitOfMeasureId = item.UnitId,
                    UnitCode = item.UnitCode,
                    QuantityBase = item.BaseQuantity,
                    UnitPrice = item.UnitPrice, // Usar precio verificado
                    DiscountAmount = item.DiscountAmount,
                    SubTotal = lineBase + lineTax,
                    TaxRate = item.IvaRate,
                    TaxAmount = lineTax,
                    UnitCost = item.UnitCost,
                    TotalCost = item.TotalCost,
                    BrandId = item.BrandId,
                    BrandName = item.BrandName,
                    AccountingClassification = item.Classification
                };
                await _saleDetailRepository.AddAsync(detail);

                total += lineBase + lineTax;

                await _stockService.ApplyMovementAsync(item.ProductId, dto.BranchId, item.Quantity, item.UnitId, false,
                    "VENTA", "VENTA", sale.Id, sale.InvoiceNumber, null, null, userId);
            }

            sale.TotalAmount = total;
            await _saleRepository.UpdateAsync(sale);

            // Facturación Electrónica
            try 
            {
                // Recargar venta completa con relaciones necesarias
                // Nota: Dependiendo de la implementación del repo, "SaleDetails.Product" podría requerir configuración.
                // Si falla, se podría necesitar cargar explícitamente.
                var fullSaleList = await _saleRepository.GetAsync(s => s.Id == sale.Id, null, "Customer,SaleDetails.Product");
                var fullSale = fullSaleList.FirstOrDefault();

                if (fullSale != null)
                {
                    var invoiceResult = await _electronicInvoicingService.GenerateInvoiceAsync(fullSale);
                    if (invoiceResult.Success)
                    {
                        fullSale.Cufe = invoiceResult.Cufe;
                        fullSale.QrCode = invoiceResult.QrCode;
                        fullSale.ElectronicInvoiceId = invoiceResult.ElectronicInvoiceId;
                        fullSale.ElectronicInvoicingStatus = "Sent";
                    }
                    else
                    {
                        fullSale.ElectronicInvoicingStatus = "Error";
                        // Podríamos guardar el mensaje de error si hubiera un campo para ello
                    }
                    await _saleRepository.UpdateAsync(fullSale);
                }
            }
            catch (Exception ex)
            {
                // No detener la venta si falla la facturación, solo loguear (o marcar error)
                Console.WriteLine($"Error en facturación electrónica: {ex.Message}");
            }

            return await GetSaleAsync(sale.Id);
        }

        public async Task<SaleResultDto> EmitInvoiceAsync(int saleId)
        {
            var fullSaleList = await _saleRepository.GetAsync(s => s.Id == saleId, null, "Customer,SaleDetails.Product");
            var sale = fullSaleList.FirstOrDefault();

            if (sale == null)
                throw new InvalidOperationException("Venta no encontrada.");

            var invoiceResult = await _electronicInvoicingService.GenerateInvoiceAsync(sale);
            
            if (invoiceResult.Success)
            {
                sale.Cufe = invoiceResult.Cufe;
                sale.QrCode = invoiceResult.QrCode;
                sale.ElectronicInvoiceId = invoiceResult.ElectronicInvoiceId;
                sale.ElectronicInvoicingStatus = "Sent";
            }
            else
            {
                sale.ElectronicInvoicingStatus = "Error";
                // Could throw exception if we want the controller to report 500/400, 
                // but returning the object with "Error" status allows the UI to show "Failed".
                // However, the caller might want the error message.
                // For now, let's just update status.
            }

            await _saleRepository.UpdateAsync(sale);

            return await GetSaleAsync(saleId);
        }

        public async Task<IEnumerable<SaleResultDto>> GetSalesAsync(DateTime? fromDate, DateTime? toDate, string? invoiceNumber, string? customerName)
        {
            var sales = await _saleRepository.GetAsync(
                s => (!fromDate.HasValue || s.Date >= fromDate.Value) &&
                     (!toDate.HasValue || s.Date <= toDate.Value) &&
                     (string.IsNullOrEmpty(invoiceNumber) || s.InvoiceNumber.Contains(invoiceNumber)) &&
                     (string.IsNullOrEmpty(customerName) || (s.Customer != null && (s.Customer.FirstName.Contains(customerName) || s.Customer.LastName.Contains(customerName)))),
                q => q.OrderByDescending(s => s.Date),
                "Customer,SaleDetails.Product,Adjustments.Details.Product"
            );

            return sales.Select(s => new SaleResultDto
            {
                SaleId = s.Id,
                InvoiceNumber = s.InvoiceNumber,
                Date = s.Date,
                TotalAmount = s.TotalAmount,
                PaymentMethod = s.PaymentMethod,
                CustomerName = s.Customer != null ? $"{s.Customer.FirstName} {s.Customer.LastName}" : "Cliente General",
                Cufe = s.Cufe,
                QrCode = s.QrCode,
                ElectronicInvoicingStatus = s.ElectronicInvoicingStatus,
                ServiceOrderId = s.ServiceOrderId,
                Items = s.SaleDetails.Select(d => new SaleItemDto
                {
                    SaleDetailId = d.Id,
                    ProductId = d.ProductId,
                    SKU = d.Product?.SKU ?? string.Empty,
                    ProductName = d.Product?.Name ?? "Unknown",
                    Quantity = d.Quantity,
                    UnitOfMeasureId = d.UnitOfMeasureId,
                    UnitCode = d.UnitCode,
                    QuantityBase = d.QuantityBase,
                    UnitPrice = d.UnitPrice,
                    DiscountAmount = d.DiscountAmount,
                    SubTotal = d.SubTotal,
                    TaxRate = d.TaxRate,
                    TaxAmount = d.TaxAmount,
                    UnitCost = d.UnitCost,
                    TotalCost = d.TotalCost,
                    BrandId = d.BrandId,
                    BrandName = d.BrandName,
                    AccountingClassification = d.AccountingClassification,
                    AdjustedQuantity = s.Adjustments.Where(a => a.Status == "APLICADA")
                        .SelectMany(a => a.Details).Where(a => a.SaleDetailId == d.Id).Sum(a => a.Quantity)
                }).ToList(),
                Adjustments = s.Adjustments.OrderByDescending(a => a.Date).Select(MapAdjustment).ToList()
            });
        }

        public async Task<SaleResultDto> GetSaleAsync(int saleId)
        {
            var saleList = await _saleRepository.GetAsync(s => s.Id == saleId, null, "Branch,Customer,Adjustments.Details.Product");
            var sale = saleList.FirstOrDefault();
            if (sale == null) return null;

            var details = await _saleDetailRepository.GetAsync(d => d.SaleId == saleId, null, "Product");
            var result = new SaleResultDto
            {
                SaleId = sale.Id,
                InvoiceNumber = sale.InvoiceNumber,
                Date = sale.Date,
                BranchId = sale.BranchId,
                CustomerId = sale.CustomerId,
                CustomerName = sale.Customer != null ? $"{sale.Customer.FirstName} {sale.Customer.LastName}".Trim() : null,
                TotalAmount = sale.TotalAmount,
                PaymentMethod = sale.PaymentMethod,
                Cufe = sale.Cufe,
                QrCode = sale.QrCode,
                ElectronicInvoiceId = sale.ElectronicInvoiceId,
                ElectronicInvoicingStatus = sale.ElectronicInvoicingStatus,
                ServiceOrderId = sale.ServiceOrderId,
                Adjustments = sale.Adjustments.OrderByDescending(a => a.Date).Select(MapAdjustment).ToList(),
                Items = details.Select(d => new SaleItemDto
                {
                    SaleDetailId = d.Id,
                    ProductId = d.ProductId,
                    ProductName = d.Product?.Name,
                    SKU = d.Product?.SKU,
                    UnitPrice = d.UnitPrice,
                    DiscountAmount = d.DiscountAmount,
                    Quantity = d.Quantity,
                    UnitOfMeasureId = d.UnitOfMeasureId,
                    UnitCode = d.UnitCode,
                    QuantityBase = d.QuantityBase,
                    SubTotal = d.SubTotal,
                    TaxRate = d.TaxRate,
                    TaxAmount = d.TaxAmount,
                    UnitCost = d.UnitCost,
                    TotalCost = d.TotalCost,
                    BrandId = d.BrandId,
                    BrandName = d.BrandName,
                    AccountingClassification = d.AccountingClassification,
                    AdjustedQuantity = sale.Adjustments.Where(a => a.Status == "APLICADA")
                        .SelectMany(a => a.Details).Where(a => a.SaleDetailId == d.Id).Sum(a => a.Quantity)
                }).ToList()
            };

            return result;
        }

        public async Task<SaleAdjustmentDto> CreateAdjustmentAsync(int saleId, CreateSaleAdjustmentDto dto, string userId)
        {
            var sale = (await _saleRepository.GetAsync(s => s.Id == saleId, null,
                "SaleDetails.Product,Adjustments.Details.Product")).FirstOrDefault()
                ?? throw new InvalidOperationException("La venta original no existe.");
            if (!await _userService.IsUserInBranchAsync(userId, sale.BranchId))
                throw new UnauthorizedAccessException("El usuario no tiene permiso para ajustar ventas de esta sucursal.");

            var documentType = string.IsNullOrWhiteSpace(dto.DocumentType)
                ? string.Empty
                : dto.DocumentType.Trim().ToUpperInvariant();
            if (documentType != "DEVOLUCION" && documentType != "NOTA_CREDITO")
                throw new InvalidOperationException("El documento debe ser DEVOLUCION o NOTA_CREDITO.");
            var reason = dto.Reason?.Trim() ?? string.Empty;
            if (reason.Length < 5) throw new InvalidOperationException("Indique un motivo de al menos cinco caracteres.");
            if (dto.Items == null || dto.Items.Count == 0)
                throw new InvalidOperationException("Seleccione al menos una línea de la venta original.");
            if (dto.Items.Select(i => i.SaleDetailId).Distinct().Count() != dto.Items.Count)
                throw new InvalidOperationException("No repita líneas dentro del ajuste.");

            var adjustment = new SaleAdjustment
            {
                TenantId = sale.TenantId,
                SaleId = sale.Id,
                BranchId = sale.BranchId,
                DocumentType = documentType,
                DocumentNumber = $"{(documentType == "DEVOLUCION" ? "DEV" : "NC")}-{DateTime.UtcNow:yyyyMMddHHmmssfff}-{sale.Id}",
                Date = DateTime.UtcNow,
                Reason = reason,
                RestocksInventory = documentType == "DEVOLUCION",
                Status = "APLICADA",
                CreatedByUserId = userId
            };

            foreach (var requested in dto.Items)
            {
                var original = sale.SaleDetails.FirstOrDefault(d => d.Id == requested.SaleDetailId)
                    ?? throw new InvalidOperationException("Una línea seleccionada no pertenece a la venta original.");
                if (requested.Quantity <= 0) throw new InvalidOperationException("La cantidad ajustada debe ser mayor que cero.");
                var alreadyAdjusted = sale.Adjustments.Where(a => a.Status == "APLICADA")
                    .SelectMany(a => a.Details).Where(d => d.SaleDetailId == original.Id).Sum(d => d.Quantity);
                if (requested.Quantity > original.Quantity - alreadyAdjusted)
                    throw new InvalidOperationException($"La cantidad de '{original.Product.Name}' supera el saldo ajustable de la factura.");

                var ratio = requested.Quantity / original.Quantity;
                adjustment.Details.Add(new SaleAdjustmentDetail
                {
                    SaleDetailId = original.Id,
                    ProductId = original.ProductId,
                    Quantity = requested.Quantity,
                    UnitOfMeasureId = original.UnitOfMeasureId,
                    UnitCode = original.UnitCode,
                    QuantityBase = decimal.Round(original.QuantityBase * ratio, 4),
                    UnitPrice = original.UnitPrice,
                    DiscountAmount = decimal.Round(original.DiscountAmount * ratio, 2),
                    TaxRate = original.TaxRate,
                    TaxAmount = decimal.Round(original.TaxAmount * ratio, 2),
                    SubTotal = decimal.Round(original.SubTotal * ratio, 2),
                    UnitCost = original.UnitCost,
                    TotalCost = decimal.Round(original.TotalCost * ratio, 2),
                    BrandId = original.BrandId,
                    BrandName = original.BrandName,
                    AccountingClassification = original.AccountingClassification
                });
            }

            adjustment.TotalAmount = adjustment.Details.Sum(d => d.SubTotal);
            var created = await _adjustmentRepository.AddAsync(adjustment);
            var saleToTouch = await _saleRepository.GetByIdAsync(sale.Id);
            if (saleToTouch != null)
            {
                saleToTouch.UpdatedAt = DateTime.UtcNow;
                await _saleRepository.UpdateAsync(saleToTouch);
            }
            if (created.RestocksInventory)
            {
                foreach (var line in created.Details)
                {
                    await _stockService.ApplyMovementAsync(line.ProductId, sale.BranchId, line.Quantity,
                        line.UnitOfMeasureId, true, "DEVOLUCION_VENTA", "DEVOLUCION", created.Id,
                        created.DocumentNumber, created.Reason, null, userId);
                }
            }

            var loaded = (await _adjustmentRepository.GetAsync(a => a.Id == created.Id, null,
                "Sale,Details.Product")).First();
            return MapAdjustment(loaded);
        }

        private static SaleAdjustmentDto MapAdjustment(SaleAdjustment adjustment) => new()
        {
            Id = adjustment.Id,
            SaleId = adjustment.SaleId,
            OriginalInvoiceNumber = adjustment.Sale?.InvoiceNumber ?? string.Empty,
            DocumentType = adjustment.DocumentType,
            DocumentNumber = adjustment.DocumentNumber,
            Date = adjustment.Date,
            Reason = adjustment.Reason,
            RestocksInventory = adjustment.RestocksInventory,
            TotalAmount = adjustment.TotalAmount,
            Status = adjustment.Status,
            Items = adjustment.Details.Select(d => new SaleAdjustmentItemDto
            {
                SaleDetailId = d.SaleDetailId,
                ProductId = d.ProductId,
                Reference = d.Product?.SKU ?? string.Empty,
                Description = d.Product?.Name ?? string.Empty,
                Quantity = d.Quantity,
                UnitCode = d.UnitCode,
                SubTotal = d.SubTotal
            }).ToList()
        };

        private static string BuildCategoryPath(Category? category)
        {
            if (category == null) return "SIN_CLASIFICAR";
            var names = new Stack<string>();
            var current = category;
            while (current != null)
            {
                names.Push(current.Name.Trim().ToUpperInvariant());
                current = current.Parent;
            }
            return string.Join(" / ", names);
        }
    }
}
