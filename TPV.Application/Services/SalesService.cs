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
        private readonly IRepository<Quotation> _quotationRepository;
        private readonly ICustomerAdvanceService _customerAdvanceService;
        private readonly IApplicationTransaction _transaction;

        public SalesService(
            IRepository<Sale> saleRepository,
            IRepository<SaleDetail> saleDetailRepository,
            IRepository<Product> productRepository,
            IRepository<Stock> stockRepository,
            IElectronicInvoicingService electronicInvoicingService,
            IUserService userService,
            IStockService stockService,
            IRepository<UnitOfMeasure> unitRepository,
            IRepository<SaleAdjustment> adjustmentRepository,
            IRepository<Quotation> quotationRepository,
            ICustomerAdvanceService customerAdvanceService,
            IApplicationTransaction transaction)
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
            _quotationRepository = quotationRepository;
            _customerAdvanceService = customerAdvanceService;
            _transaction = transaction;
        }

        public async Task<SaleResultDto> CreateSaleAsync(SaleCreateDto dto, string userId)
        {
            if (!await _userService.IsUserInBranchAsync(userId, dto.BranchId))
            {
                throw new UnauthorizedAccessException("El usuario no tiene permiso para realizar ventas en esta sucursal.");
            }

            if (dto.Items == null || dto.Items.Count == 0)
                throw new InvalidOperationException("No hay ítems en la venta.");

            Quotation? sourceQuotation = null;
            var invoicedByQuotationDetail = new Dictionary<int, decimal>();
            if (dto.QuotationId.HasValue)
            {
                if (!dto.CustomerId.HasValue)
                    throw new InvalidOperationException("Seleccione el cliente para facturar esta cotización.");
                if (dto.Items.Any(item => !item.QuotationDetailId.HasValue))
                    throw new InvalidOperationException("Todos los artículos deben conservar su línea de cotización de origen.");
                if (dto.Items.GroupBy(item => item.QuotationDetailId).Any(group => group.Count() > 1))
                    throw new InvalidOperationException("Una línea de cotización no puede repetirse en la misma factura.");

                sourceQuotation = (await _quotationRepository.GetAsync(
                    quotation => quotation.Id == dto.QuotationId.Value,
                    null,
                    "Details",
                    false)).FirstOrDefault()
                    ?? throw new InvalidOperationException("La cotización de origen no existe.");

                if (sourceQuotation.CustomerId.HasValue && sourceQuotation.CustomerId != dto.CustomerId)
                    throw new InvalidOperationException("La cotización ya está asociada a otro cliente.");

                var previousDetails = await _saleDetailRepository.GetAsync(
                    detail => detail.Sale.QuotationId == sourceQuotation.Id && detail.QuotationDetailId.HasValue);
                invoicedByQuotationDetail = previousDetails
                    .GroupBy(detail => detail.QuotationDetailId!.Value)
                    .ToDictionary(group => group.Key, group => group.Sum(detail => detail.Quantity));
            }
            else if (dto.Items.Any(item => item.QuotationDetailId.HasValue))
            {
                throw new InvalidOperationException("No se puede indicar una línea cotizada sin la cotización de origen.");
            }

            // Validar stock disponible y obtener precios reales
            var processedItems = new List<(int ProductId, int? QuotationDetailId, decimal Quantity, int UnitId, string UnitCode, decimal BaseQuantity,
                decimal UnitPrice, decimal DiscountAmount, decimal UnitCost, decimal TotalCost, string ProductName,
                decimal IvaRate, string IvaType, bool PriceIncludesIva, int? BrandId, string? BrandName, string Classification)>();

            foreach (var item in dto.Items)
            {
                var product = (await _productRepository.GetAsync(p => p.Id == item.ProductId, null,
                    "UnitConversions,Brand,Category,Category.Parent,Category.Parent.Parent,Category.Parent.Parent.Parent")).FirstOrDefault();
                if (product == null)
                    throw new InvalidOperationException($"Producto con ID {item.ProductId} no encontrado.");
                if (item.Quantity <= 0) throw new InvalidOperationException("La cantidad debe ser mayor que cero.");

                QuotationDetail? quotationDetail = null;
                if (sourceQuotation != null)
                {
                    quotationDetail = sourceQuotation.Details.FirstOrDefault(detail => detail.Id == item.QuotationDetailId)
                        ?? throw new InvalidOperationException("La línea indicada no pertenece a la cotización de origen.");
                    if (quotationDetail.ProductId != item.ProductId)
                        throw new InvalidOperationException("El artículo no coincide con la línea de cotización seleccionada.");

                    var alreadyInvoiced = invoicedByQuotationDetail.GetValueOrDefault(quotationDetail.Id);
                    var pendingQuantity = quotationDetail.Quantity - alreadyInvoiced;
                    if (pendingQuantity <= 0)
                        throw new InvalidOperationException($"'{quotationDetail.ProductName}' ya fue facturado completamente.");
                    if (item.Quantity > pendingQuantity)
                        throw new InvalidOperationException($"Solo quedan {pendingQuantity:N4} unidades pendientes de '{quotationDetail.ProductName}'.");
                }

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

                if (quotationDetail != null)
                    finalPrice = quotationDetail.UnitPrice;

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

                processedItems.Add((item.ProductId, quotationDetail?.Id, item.Quantity, unit.Id, unit.Code, baseQuantity, finalPrice,
                    discountAmount, unitCost, totalCost, product.Name, product.IvaRate, product.IvaType,
                    product.PriceIncludesIva, product.BrandId, product.Brand?.Name, BuildCategoryPath(product.Category)));
            }

            var total = decimal.Round(processedItems.Sum(item =>
            {
                var amounts = CalculateLineAmounts(item.UnitPrice, item.Quantity, item.DiscountAmount,
                    item.IvaType, item.IvaRate, item.PriceIncludesIva);
                return amounts.LineBase + amounts.LineTax;
            }), 2);

            if (dto.AdvanceAmountToApply < 0)
                throw new InvalidOperationException("El anticipo a aplicar no puede ser negativo.");
            if (!dto.CustomerId.HasValue && (dto.AdvanceAmountToApply > 0 || dto.CreateAdvanceFromExcess))
                throw new InvalidOperationException("Seleccione un cliente para registrar o aplicar anticipos.");

            var advanceApplied = decimal.Round(dto.AdvanceAmountToApply, 2);
            if (advanceApplied > total)
                throw new InvalidOperationException("El anticipo aplicado no puede superar el total de la factura.");

            var amountDue = total - advanceApplied;
            var amountReceived = decimal.Round(dto.AmountReceived ?? amountDue, 2);
            if (amountReceived < 0)
                throw new InvalidOperationException("El valor recibido no puede ser negativo.");
            if (amountReceived < amountDue)
                throw new InvalidOperationException($"Faltan {(amountDue - amountReceived):N2} para completar el pago de la factura.");

            var excess = amountReceived - amountDue;
            var advanceCreated = dto.CreateAdvanceFromExcess ? excess : 0m;
            var changeAmount = dto.CreateAdvanceFromExcess ? 0m : excess;

            var saleId = await _transaction.ExecuteAsync(async () =>
            {
                if (dto.CustomerId.HasValue && advanceApplied > 0)
                {
                    var availableBalance = await _customerAdvanceService.GetBalanceAsync(dto.CustomerId.Value);
                    if (advanceApplied > availableBalance)
                        throw new InvalidOperationException($"El cliente solo tiene {availableBalance:N2} disponibles en anticipos.");
                }

                var sale = await _saleRepository.AddAsync(new Sale
                {
                    BranchId = dto.BranchId,
                    CustomerId = dto.CustomerId,
                    Date = DateTime.Now,
                    PaymentMethod = dto.PaymentMethod,
                    InvoiceNumber = $"V-{DateTime.Now:yyyyMMddHHmmssfff}-{dto.BranchId}",
                    UserId = userId,
                    TotalAmount = total,
                    AmountReceived = amountReceived,
                    CustomerAdvanceApplied = advanceApplied,
                    CustomerAdvanceCreated = advanceCreated,
                    ChangeAmount = changeAmount,
                    QuotationId = sourceQuotation?.Id
                });

                foreach (var item in processedItems)
                {
                    var amounts = CalculateLineAmounts(item.UnitPrice, item.Quantity, item.DiscountAmount,
                        item.IvaType, item.IvaRate, item.PriceIncludesIva);
                    await _saleDetailRepository.AddAsync(new SaleDetail
                    {
                        SaleId = sale.Id,
                        ProductId = item.ProductId,
                        QuotationDetailId = item.QuotationDetailId,
                        Quantity = item.Quantity,
                        UnitOfMeasureId = item.UnitId,
                        UnitCode = item.UnitCode,
                        QuantityBase = item.BaseQuantity,
                        UnitPrice = item.UnitPrice,
                        DiscountAmount = item.DiscountAmount,
                        SubTotal = amounts.LineBase + amounts.LineTax,
                        TaxRate = item.IvaRate,
                        TaxAmount = amounts.LineTax,
                        UnitCost = item.UnitCost,
                        TotalCost = item.TotalCost,
                        BrandId = item.BrandId,
                        BrandName = item.BrandName,
                        AccountingClassification = item.Classification
                    });

                    await _stockService.ApplyMovementAsync(item.ProductId, dto.BranchId, item.Quantity, item.UnitId, false,
                        "VENTA", "VENTA", sale.Id, sale.InvoiceNumber, null, null, userId);
                }

                if (dto.CustomerId.HasValue && advanceApplied > 0)
                {
                    await _customerAdvanceService.RegisterApplicationAsync(dto.CustomerId.Value, dto.BranchId, sale.Id,
                        advanceApplied, sale.InvoiceNumber, "Aplicación de anticipo a factura", userId);
                }

                if (dto.CustomerId.HasValue && advanceCreated > 0)
                {
                    await _customerAdvanceService.RegisterCreditAsync(dto.CustomerId.Value, dto.BranchId, sale.Id,
                        advanceCreated, dto.PaymentMethod, sale.InvoiceNumber, "Excedente recibido para entrega pendiente", userId);
                }

                if (sourceQuotation != null && !sourceQuotation.CustomerId.HasValue)
                {
                    sourceQuotation.CustomerId = dto.CustomerId;
                    await _quotationRepository.UpdateAsync(sourceQuotation);
                }

                return sale.Id;
            });

            await TryEmitInvoiceAsync(saleId);
            return await GetSaleAsync(saleId);
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
                "Customer,Quotation,SaleDetails.Product,Adjustments.Details.Product"
            );

            return sales.Select(s => new SaleResultDto
            {
                SaleId = s.Id,
                InvoiceNumber = s.InvoiceNumber,
                Date = s.Date,
                TotalAmount = s.TotalAmount,
                PaymentMethod = s.PaymentMethod,
                AmountReceived = s.AmountReceived ?? s.TotalAmount,
                CustomerAdvanceApplied = s.CustomerAdvanceApplied,
                CustomerAdvanceCreated = s.CustomerAdvanceCreated,
                ChangeAmount = s.ChangeAmount,
                CustomerName = s.Customer != null ? $"{s.Customer.FirstName} {s.Customer.LastName}" : "Cliente General",
                Cufe = s.Cufe,
                QrCode = s.QrCode,
                ElectronicInvoicingStatus = s.ElectronicInvoicingStatus,
                ServiceOrderId = s.ServiceOrderId,
                QuotationId = s.QuotationId,
                QuotationNumber = s.Quotation?.QuotationNumber,
                Items = s.SaleDetails.Select(d => new SaleItemDto
                {
                    SaleDetailId = d.Id,
                    ProductId = d.ProductId,
                    QuotationDetailId = d.QuotationDetailId,
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
            var saleList = await _saleRepository.GetAsync(s => s.Id == saleId, null, "Branch,Customer,Quotation,Adjustments.Details.Product");
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
                AmountReceived = sale.AmountReceived ?? sale.TotalAmount,
                CustomerAdvanceApplied = sale.CustomerAdvanceApplied,
                CustomerAdvanceCreated = sale.CustomerAdvanceCreated,
                ChangeAmount = sale.ChangeAmount,
                CustomerAdvanceBalance = sale.CustomerId.HasValue
                    ? await _customerAdvanceService.GetBalanceAsync(sale.CustomerId.Value)
                    : 0m,
                Cufe = sale.Cufe,
                QrCode = sale.QrCode,
                ElectronicInvoiceId = sale.ElectronicInvoiceId,
                ElectronicInvoicingStatus = sale.ElectronicInvoicingStatus,
                ServiceOrderId = sale.ServiceOrderId,
                QuotationId = sale.QuotationId,
                QuotationNumber = sale.Quotation?.QuotationNumber,
                Adjustments = sale.Adjustments.OrderByDescending(a => a.Date).Select(MapAdjustment).ToList(),
                Items = details.Select(d => new SaleItemDto
                {
                    SaleDetailId = d.Id,
                    ProductId = d.ProductId,
                    QuotationDetailId = d.QuotationDetailId,
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

        private async Task TryEmitInvoiceAsync(int saleId)
        {
            try
            {
                await EmitInvoiceAsync(saleId);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error en facturación electrónica: {ex.Message}");
            }
        }

        private static (decimal LineBase, decimal LineTax) CalculateLineAmounts(
            decimal unitPrice,
            decimal quantity,
            decimal discountAmount,
            string ivaType,
            decimal ivaRate,
            bool priceIncludesIva)
        {
            if (ivaType == "Exento" || ivaType == "Excluido" || ivaRate <= 0)
                return (unitPrice * quantity - discountAmount, 0m);

            if (priceIncludesIva)
            {
                var gross = unitPrice * quantity - discountAmount;
                var lineBase = decimal.Round(gross / (1 + ivaRate / 100m), 2);
                return (lineBase, gross - lineBase);
            }

            var taxableBase = unitPrice * quantity - discountAmount;
            return (taxableBase, decimal.Round(taxableBase * ivaRate / 100m, 2));
        }

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
