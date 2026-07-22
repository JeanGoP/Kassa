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

        public async Task<QuotationSearchResultDto> SearchAsync(string searchTerm, string? userId)
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
                "Stocks.Branch");

            var productResults = products.Select(MapProduct).ToList();
            var totalQuantity = productResults.Sum(p => p.TotalQuantity);
            var foundInStock = totalQuantity > 0;

            var history = await _historyRepository.AddAsync(new QuotationSearchHistory
            {
                SearchTerm = normalizedTerm,
                SearchedAt = DateTime.Now,
                MatchedProductName = productResults.FirstOrDefault()?.Name,
                FoundInStock = foundInStock,
                TotalQuantity = totalQuantity,
                UserId = userId
            });

            return new QuotationSearchResultDto
            {
                HistoryId = history.Id,
                SearchTerm = normalizedTerm,
                SearchedAt = history.SearchedAt,
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
                var unitPrice = item.UnitPrice ?? product.Price;
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
                "Details.Product");

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
                "Details");

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
                Price = product.Price,
                TotalQuantity = branches.Sum(b => b.Quantity),
                Branches = branches
            };
        }

        private static QuotationDto MapQuotation(Quotation quotation)
        {
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
                Details = quotation.Details?
                    .OrderBy(d => d.Id)
                    .Select(d => new QuotationDetailDto
                    {
                        Id = d.Id,
                        ProductId = d.ProductId,
                        ProductName = string.IsNullOrWhiteSpace(d.ProductName) ? d.Product?.Name ?? string.Empty : d.ProductName,
                        SKU = string.IsNullOrWhiteSpace(d.SKU) ? d.Product?.SKU ?? string.Empty : d.SKU,
                        Barcode = d.Barcode ?? d.Product?.Barcode,
                        Quantity = d.Quantity,
                        AvailableQuantity = d.AvailableQuantity,
                        UnitPrice = d.UnitPrice,
                        SubTotal = d.SubTotal
                    })
                    .ToList() ?? new List<QuotationDetailDto>()
            };
        }
    }
}
