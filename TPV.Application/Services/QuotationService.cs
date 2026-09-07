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
    public class QuotationService : IQuotationService
    {
        private readonly IRepository<Product> _productRepository;
        private readonly IRepository<QuotationSearchHistory> _historyRepository;
        private readonly IRepository<Quotation> _quotationRepository;

        public QuotationService(
            IRepository<Product> productRepository,
            IRepository<QuotationSearchHistory> historyRepository,
            IRepository<Quotation> quotationRepository)
        {
            _productRepository = productRepository;
            _historyRepository = historyRepository;
            _quotationRepository = quotationRepository;
        }

        public async Task<QuotationSearchResultDto> SearchAsync(string searchTerm, string? userId, bool recordHistory = true)
        {
            var normalizedTerm = searchTerm?.Trim() ?? string.Empty;
            if (string.IsNullOrWhiteSpace(normalizedTerm))
            {
                throw new InvalidOperationException("Ingrese un producto, SKU o codigo de barras para cotizar.");
            }

            var products = await _productRepository.GetAsync(
                p => p.Name.Contains(normalizedTerm) ||
                     p.SKU.Contains(normalizedTerm) ||
                     (p.Barcode != null && p.Barcode.Contains(normalizedTerm)),
                q => q.OrderBy(p => p.Name),
                "Stocks.Branch",
                take: 50);

            var productResults = products.Select(MapProduct).ToList();
            var totalQuantity = productResults.Sum(p => p.TotalQuantity);
            var foundInStock = totalQuantity > 0;

            var searchedAt = DateTime.Now;
            var historyId = 0;

            if (recordHistory)
            {
                var history = await _historyRepository.AddAsync(new QuotationSearchHistory
                {
                    SearchTerm = normalizedTerm,
                    SearchedAt = searchedAt,
                    MatchedProductName = productResults.FirstOrDefault()?.Name,
                    FoundInStock = foundInStock,
                    TotalQuantity = totalQuantity,
                    UserId = userId
                });

                historyId = history.Id;
                searchedAt = history.SearchedAt;
            }

            return new QuotationSearchResultDto
            {
                HistoryId = historyId,
                SearchTerm = normalizedTerm,
                SearchedAt = searchedAt,
                FoundInStock = foundInStock,
                TotalQuantity = totalQuantity,
                Products = productResults
            };
        }

        public async Task<IEnumerable<QuotationSearchHistoryDto>> GetHistoryAsync(DateTime? date = null)
        {
            var targetDate = (date ?? DateTime.Today).Date;
            var nextDate = targetDate.AddDays(1);

            var history = await _historyRepository.GetAsync(
                h => h.SearchedAt >= targetDate && h.SearchedAt < nextDate,
                q => q.OrderByDescending(h => h.SearchedAt));

            return history.Select(h => new QuotationSearchHistoryDto
            {
                Id = h.Id,
                SearchedAt = h.SearchedAt,
                SearchTerm = h.SearchTerm,
                MatchedProductName = h.MatchedProductName,
                FoundInStock = h.FoundInStock,
                TotalQuantity = h.TotalQuantity
            });
        }

        public async Task<QuotationDto> CreateAsync(CreateQuotationDto dto, string? userId)
        {
            var requestedByName = dto.RequestedByName?.Trim() ?? string.Empty;
            if (string.IsNullOrWhiteSpace(requestedByName))
            {
                throw new InvalidOperationException("Ingrese el nombre de la persona que solicita la cotizacion.");
            }

            if (dto.Details == null || dto.Details.Count == 0)
            {
                throw new InvalidOperationException("Agregue al menos un repuesto o articulo a la cotizacion.");
            }

            var normalizedDetails = dto.Details
                .Where(d => d.ProductId > 0 && d.Quantity > 0)
                .GroupBy(d => d.ProductId)
                .Select(g => new CreateQuotationDetailDto
                {
                    ProductId = g.Key,
                    Quantity = g.Sum(d => d.Quantity),
                    UnitPrice = g.LastOrDefault(d => d.UnitPrice.HasValue)?.UnitPrice
                })
                .ToList();

            if (normalizedDetails.Count == 0)
            {
                throw new InvalidOperationException("Las cantidades de la cotizacion deben ser mayores que cero.");
            }

            var productIds = normalizedDetails.Select(d => d.ProductId).ToList();
            var products = await _productRepository.GetAsync(
                p => productIds.Contains(p.Id),
                null,
                "Stocks.Branch");

            var productsById = products.ToDictionary(p => p.Id);
            var quotation = new Quotation
            {
                QuotationNumber = await GenerateQuotationNumberAsync(),
                Date = DateTime.Now,
                RequestedByName = requestedByName,
                RequestedByPhone = string.IsNullOrWhiteSpace(dto.RequestedByPhone) ? null : dto.RequestedByPhone.Trim(),
                RequestedByEmail = string.IsNullOrWhiteSpace(dto.RequestedByEmail) ? null : dto.RequestedByEmail.Trim(),
                Notes = string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes.Trim(),
                UserId = userId,
                Details = new List<QuotationDetail>()
            };

            foreach (var item in normalizedDetails)
            {
                if (!productsById.TryGetValue(item.ProductId, out var product))
                {
                    throw new InvalidOperationException($"El producto con id {item.ProductId} no existe o no esta disponible.");
                }

                var availableQuantity = product.Stocks?.Where(s => s.Quantity > 0).Sum(s => s.Quantity) ?? 0;
                var unitPrice = item.UnitPrice ?? CalculateQuotationPrice(product);
                var subTotal = item.Quantity * unitPrice;

                quotation.Details.Add(new QuotationDetail
                {
                    ProductId = product.Id,
                    ProductName = product.Name,
                    SKU = product.SKU,
                    Barcode = product.Barcode,
                    Quantity = item.Quantity,
                    AvailableQuantity = availableQuantity,
                    UnitPrice = unitPrice,
                    SubTotal = subTotal
                });

                quotation.TotalAmount += subTotal;
            }

            var created = await _quotationRepository.AddAsync(quotation);
            return await GetByIdAsync(created.Id) ?? MapQuotation(created);
        }

        public async Task<QuotationDto?> GetByIdAsync(int id)
        {
            var quotations = await _quotationRepository.GetAsync(
                q => q.Id == id,
                null,
                "Details.Product,Sales.SaleDetails,Sales.Customer,Customer");

            var quotation = quotations.FirstOrDefault();
            return quotation == null ? null : MapQuotation(quotation);
        }

        public async Task<IEnumerable<QuotationDto>> GetQuotationsAsync(DateTime? start = null, DateTime? end = null, string? search = null)
        {
            var normalizedSearch = search?.Trim() ?? string.Empty;
            var startDate = start?.Date;
            var endDate = end?.Date.AddDays(1);

            var quotations = await _quotationRepository.GetAsync(
                q => (!startDate.HasValue || q.Date >= startDate.Value) &&
                     (!endDate.HasValue || q.Date < endDate.Value) &&
                     (string.IsNullOrEmpty(normalizedSearch) ||
                      q.QuotationNumber.Contains(normalizedSearch) ||
                      q.RequestedByName.Contains(normalizedSearch)),
                q => q.OrderByDescending(item => item.Date),
                "Details.Product,Sales.SaleDetails,Sales.Customer,Customer");

            return quotations.Select(MapQuotation);
        }

        private async Task<string> GenerateQuotationNumberAsync()
        {
            var today = DateTime.Today;
            var tomorrow = today.AddDays(1);
            var todayQuotes = await _quotationRepository.GetAsync(q => q.Date >= today && q.Date < tomorrow);
            return $"COT-{today:yyyyMMdd}-{todayQuotes.Count + 1:0000}";
        }

        private static QuotationProductAvailabilityDto MapProduct(Product product)
        {
            var branches = product.Stocks?
                .Where(s => s.Quantity > 0)
                .OrderBy(s => s.Branch != null ? s.Branch.Name : string.Empty)
                .Select(s => new QuotationBranchAvailabilityDto
                {
                    BranchId = s.BranchId,
                    BranchName = s.Branch?.Name ?? $"Bodega {s.BranchId}",
                    Quantity = s.Quantity
                })
                .ToList() ?? new List<QuotationBranchAvailabilityDto>();

            return new QuotationProductAvailabilityDto
            {
                ProductId = product.Id,
                Name = product.Name,
                SKU = product.SKU,
                Barcode = product.Barcode,
                Price = CalculateQuotationPrice(product),
                TotalQuantity = branches.Sum(b => b.Quantity),
                Branches = branches
            };
        }

        private static decimal CalculateQuotationPrice(Product product)
        {
            var profitability = product.ProfitabilityPercentage ?? 0m;
            if (profitability <= 0) return product.Price;

            var stocksWithCost = product.Stocks?
                .Where(stock => stock.Cost > 0)
                .ToList() ?? new List<Stock>();
            if (stocksWithCost.Count == 0) return product.Price;

            // A multi-warehouse quote must preserve the configured margin regardless of the dispatching branch.
            var availableStocks = stocksWithCost.Where(stock => stock.Quantity > 0).ToList();
            var referenceCost = availableStocks.Count > 0
                ? availableStocks.Max(stock => stock.Cost)
                : stocksWithCost
                    .OrderByDescending(stock => stock.UpdatedAt ?? stock.CreatedAt)
                    .First()
                    .Cost;

            var price = referenceCost * (1 + profitability / 100m);
            if (product.PriceIncludesIva && product.IvaRate > 0)
                price *= 1 + product.IvaRate / 100m;

            return decimal.Round(price, 2);
        }

        private static QuotationDto MapQuotation(Quotation quotation)
        {
            var sales = quotation.Sales?.OrderBy(sale => sale.Date).ToList() ?? new List<Sale>();
            var saleDetails = sales.SelectMany(sale => sale.SaleDetails ?? new List<SaleDetail>()).ToList();
            var details = quotation.Details?
                .OrderBy(detail => detail.Id)
                .Select(detail =>
                {
                    var invoicedQuantity = saleDetails
                        .Where(saleDetail => saleDetail.QuotationDetailId == detail.Id)
                        .Sum(saleDetail => saleDetail.Quantity);
                    var pendingQuantity = Math.Max(0m, detail.Quantity - invoicedQuantity);
                    return new QuotationDetailDto
                    {
                        Id = detail.Id,
                        ProductId = detail.ProductId,
                        ProductName = string.IsNullOrWhiteSpace(detail.ProductName) ? detail.Product?.Name ?? string.Empty : detail.ProductName,
                        SKU = string.IsNullOrWhiteSpace(detail.SKU) ? detail.Product?.SKU ?? string.Empty : detail.SKU,
                        Barcode = detail.Barcode ?? detail.Product?.Barcode,
                        Quantity = detail.Quantity,
                        AvailableQuantity = detail.AvailableQuantity,
                        UnitPrice = detail.UnitPrice,
                        SubTotal = detail.SubTotal,
                        InvoicedQuantity = invoicedQuantity,
                        PendingQuantity = pendingQuantity
                    };
                })
                .ToList() ?? new List<QuotationDetailDto>();

            var invoicedQuantityTotal = details.Sum(detail => detail.InvoicedQuantity);
            var pendingQuantityTotal = details.Sum(detail => detail.PendingQuantity);
            var status = pendingQuantityTotal <= 0 ? "COMPLETADA"
                : invoicedQuantityTotal > 0 ? "PARCIAL"
                : "PENDIENTE";

            return new QuotationDto
            {
                Id = quotation.Id,
                QuotationNumber = quotation.QuotationNumber,
                Date = quotation.Date,
                RequestedByName = quotation.RequestedByName,
                RequestedByPhone = quotation.RequestedByPhone,
                RequestedByEmail = quotation.RequestedByEmail,
                Notes = quotation.Notes,
                TotalAmount = quotation.TotalAmount,
                CustomerId = quotation.CustomerId,
                CustomerName = quotation.Customer != null
                    ? $"{quotation.Customer.FirstName} {quotation.Customer.LastName}".Trim()
                    : null,
                Status = status,
                InvoicedAmount = sales.Sum(sale => sale.TotalAmount),
                PendingAmount = details.Sum(detail => detail.PendingQuantity * detail.UnitPrice),
                AdvanceCreated = sales.Sum(sale => sale.CustomerAdvanceCreated),
                AdvanceApplied = sales.Sum(sale => sale.CustomerAdvanceApplied),
                Details = details,
                Invoices = sales.Select(sale => new QuotationInvoiceDto
                {
                    SaleId = sale.Id,
                    InvoiceNumber = sale.InvoiceNumber,
                    Date = sale.Date,
                    TotalAmount = sale.TotalAmount,
                    AdvanceCreated = sale.CustomerAdvanceCreated,
                    AdvanceApplied = sale.CustomerAdvanceApplied
                }).ToList()
            };
        }
    }
}
