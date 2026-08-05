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
    public class ReportsService : IReportsService
    {
        private readonly IRepository<Sale> _saleRepository;
        private readonly IRepository<SaleDetail> _detailRepository;

        public ReportsService(IRepository<Sale> saleRepository, IRepository<SaleDetail> detailRepository)
        {
            _saleRepository = saleRepository;
            _detailRepository = detailRepository;
        }

        public async Task<IEnumerable<SalesByBranchDto>> GetSalesByBranchAsync(DateTime? start, DateTime? end)
        {
            var sales = await _saleRepository.GetAsync(s =>
                (!start.HasValue || s.Date >= start.Value) &&
                (!end.HasValue || s.Date <= end.Value),
                null, "Branch");

            return sales.GroupBy(s => new { s.BranchId, s.Branch?.Name })
                .Select(group => new SalesByBranchDto
                {
                    BranchId = group.Key.BranchId,
                    BranchName = group.Key.Name,
                    TotalSales = group.Sum(s => s.TotalAmount)
                })
                .OrderByDescending(row => row.TotalSales)
                .ToList();
        }

        public async Task<IEnumerable<ProductMarginDto>> GetProductMarginsAsync(DateTime? start, DateTime? end)
        {
            var details = await _detailRepository.GetAsync(d =>
                (!start.HasValue || d.Sale.Date >= start.Value) &&
                (!end.HasValue || d.Sale.Date <= end.Value),
                null, "Product,Sale");

            return details.GroupBy(d => new { d.ProductId, d.Product.SKU, d.Product.Name })
                .Select(group => new ProductMarginDto
                {
                    ProductId = group.Key.ProductId,
                    SKU = group.Key.SKU,
                    Name = group.Key.Name,
                    QuantitySold = group.Sum(d => d.Quantity),
                    Revenue = group.Sum(d => d.SubTotal),
                    CostTotal = group.Sum(d => d.TotalCost)
                })
                .OrderByDescending(row => row.Margin)
                .ToList();
        }
    }
}
