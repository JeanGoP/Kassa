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

        public SalesService(
            IRepository<Sale> saleRepository,
            IRepository<SaleDetail> saleDetailRepository,
            IRepository<Product> productRepository,
            IRepository<Stock> stockRepository,
            IElectronicInvoicingService electronicInvoicingService)
        {
            _saleRepository = saleRepository;
            _saleDetailRepository = saleDetailRepository;
            _productRepository = productRepository;
            _stockRepository = stockRepository;
            _electronicInvoicingService = electronicInvoicingService;
        }

        public async Task<SaleResultDto> CreateSaleAsync(SaleCreateDto dto, string userId)
        {
            if (dto.Items == null || dto.Items.Count == 0)
                throw new InvalidOperationException("No hay ítems en la venta.");

            // Validar stock disponible y obtener precios reales
            var processedItems = new List<(int ProductId, int Quantity, decimal UnitPrice, string ProductName)>();

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
                
                processedItems.Add((item.ProductId, item.Quantity, product.Price, product.Name));
            }

            var sale = new Sale
            {
                BranchId = dto.BranchId,
                CustomerId = dto.CustomerId,
                Date = DateTime.UtcNow,
                PaymentMethod = dto.PaymentMethod,
                InvoiceNumber = $"V-{DateTime.UtcNow:yyyyMMddHHmmss}-{dto.BranchId}",
                UserId = userId,
                TotalAmount = processedItems.Sum(i => i.Quantity * i.UnitPrice) // Recalcular con precio real
            };

            sale = await _saleRepository.AddAsync(sale);

            foreach (var item in processedItems)
            {
                var detail = new SaleDetail
                {
                    SaleId = sale.Id,
                    ProductId = item.ProductId,
                    Quantity = item.Quantity,
                    UnitPrice = item.UnitPrice, // Usar precio verificado
                    SubTotal = item.UnitPrice * item.Quantity
                };
                await _saleDetailRepository.AddAsync(detail);

                // Descontar del stock
                var stockList = await _stockRepository.GetAsync(s => s.ProductId == item.ProductId && s.BranchId == dto.BranchId);
                var stock = stockList.First();
                stock.Quantity -= item.Quantity;
                await _stockRepository.UpdateAsync(stock);
            }

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
                    Quantity = d.Quantity
                }).ToList()
            };

            return result;
        }
    }
}

