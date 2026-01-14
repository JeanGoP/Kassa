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
        private readonly IRepository<Product> _productRepository;
        private readonly IRepository<Branch> _branchRepository;

        public ReportsService(IRepository<Sale> saleRepository,
                              IRepository<SaleDetail> detailRepository,
                              IRepository<Product> productRepository,
                              IRepository<Branch> branchRepository)
        {
            _saleRepository = saleRepository;
            _detailRepository = detailRepository;
            _productRepository = productRepository;
            _branchRepository = branchRepository;
        }

        public async Task<IEnumerable<SalesByBranchDto>> GetSalesByBranchAsync(DateTime? start, DateTime? end)
        {
            var sales = await _saleRepository.GetAsync(s =>
                (!start.HasValue || s.Date >= start.Value) &&
                (!end.HasValue || s.Date <= end.Value),
                null, "Branch");

            return sales.GroupBy(s => new { s.BranchId, s.Branch?.Name })
                        .Select(g => new SalesByBranchDto
                        {
                            BranchId = g.Key.BranchId,
                            BranchName = g.Key.Name,
                            TotalSales = g.Sum(x => x.TotalAmount)
                        })
                        .OrderByDescending(r => r.TotalSales)
                        .ToList();
        }

        public async Task<IEnumerable<ProductMarginDto>> GetProductMarginsAsync(DateTime? start, DateTime? end)
        {
            var details = await _detailRepository.GetAsync(d =>
                (!start.HasValue || d.Sale.Date >= start.Value) &&
                (!end.HasValue || d.Sale.Date <= end.Value),
                null, "Product,Sale");

            return details.GroupBy(d => new { d.ProductId, d.Product?.SKU, d.Product?.Name, d.Product?.Cost })
                          .Select(g => new ProductMarginDto
                          {
                              ProductId = g.Key.ProductId,
                              SKU = g.Key.SKU,
                              Name = g.Key.Name,
                              QuantitySold = g.Sum(x => x.Quantity),
                              Revenue = g.Sum(x => x.SubTotal),
                              CostTotal = (g.Key.Cost ?? 0) * g.Sum(x => x.Quantity)
                          })
                          .OrderByDescending(r => r.Margin)
                          .ToList();
        }
    }
}

