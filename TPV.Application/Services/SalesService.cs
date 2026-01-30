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

        public SalesService(
            IRepository<Sale> saleRepository,
            IRepository<SaleDetail> saleDetailRepository,
            IRepository<Product> productRepository,
            IRepository<Stock> stockRepository,
            IElectronicInvoicingService electronicInvoicingService,
            IUserService userService)
        {
            _saleRepository = saleRepository;
            _saleDetailRepository = saleDetailRepository;
            _productRepository = productRepository;
            _stockRepository = stockRepository;
            _electronicInvoicingService = electronicInvoicingService;
            _userService = userService;
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
            var processedItems = new List<(int ProductId, int Quantity, decimal UnitPrice, string ProductName, decimal IvaRate, string IvaType, bool PriceIncludesIva)>();

            foreach (var item in dto.Items)
            {
                var product = await _productRepository.GetByIdAsync(item.ProductId);
                if (product == null)
                    throw new InvalidOperationException($"Producto con ID {item.ProductId} no encontrado.");

                var stockList = await _stockRepository.GetAsync(s => s.ProductId == item.ProductId && s.BranchId == dto.BranchId);
                var stock = stockList.FirstOrDefault();
                
                if (stock == null)
                    throw new InvalidOperationException($"No existe registro de stock para el producto '{product.Name}' en la sucursal {dto.BranchId}.");

                if (stock.Quantity < item.Quantity)
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

                processedItems.Add((item.ProductId, item.Quantity, finalPrice, product.Name, product.IvaRate, product.IvaType, product.PriceIncludesIva));
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
                    lineBase = item.UnitPrice * item.Quantity;
                    lineTax = 0;
                }
                else if (item.PriceIncludesIva)
                {
                    var divisor = 1 + (item.IvaRate / 100m);
                    var gross = item.UnitPrice * item.Quantity;
                    var baseAmount = decimal.Round(gross / divisor, 2);
                    var taxAmount = gross - baseAmount;
                    lineBase = baseAmount;
                    lineTax = taxAmount;
                }
                else
                {
                    lineBase = item.UnitPrice * item.Quantity;
                    lineTax = decimal.Round(lineBase * (item.IvaRate / 100m), 2);
                }

                var detail = new SaleDetail
                {
                    SaleId = sale.Id,
                    ProductId = item.ProductId,
                    Quantity = item.Quantity,
                    UnitPrice = item.UnitPrice, // Usar precio verificado
                    SubTotal = lineBase + lineTax,
                    TaxRate = item.IvaRate,
                    TaxAmount = lineTax
                };
                await _saleDetailRepository.AddAsync(detail);

                total += lineBase + lineTax;

                // Descontar del stock
                var stockList = await _stockRepository.GetAsync(s => s.ProductId == item.ProductId && s.BranchId == dto.BranchId);
                var stock = stockList.First();
                stock.Quantity -= item.Quantity;
                await _stockRepository.UpdateAsync(stock);
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
                "Customer,SaleDetails.Product"
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
                Items = s.SaleDetails.Select(d => new SaleItemDto
                {
                    ProductName = d.Product?.Name ?? "Unknown",
                    Quantity = d.Quantity,
                    UnitPrice = d.UnitPrice,
                    SubTotal = d.SubTotal
                }).ToList()
            });
        }

        public async Task<SaleResultDto> GetSaleAsync(int saleId)
        {
            var saleList = await _saleRepository.GetAsync(s => s.Id == saleId, null, "Branch,Customer");
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
                Items = details.Select(d => new SaleItemDto
                {
                    ProductId = d.ProductId,
                    ProductName = d.Product?.Name,
                    SKU = d.Product?.SKU,
                    UnitPrice = d.UnitPrice,
                    Quantity = d.Quantity,
                    SubTotal = d.SubTotal,
                    TaxRate = d.TaxRate,
                    TaxAmount = d.TaxAmount
                }).ToList()
            };

            return result;
        }
    }
}
