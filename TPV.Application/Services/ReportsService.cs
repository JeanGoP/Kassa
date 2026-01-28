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
        private readonly IRepository<Stock> _stockRepository;

        public ReportsService(IRepository<Sale> saleRepository,
                              IRepository<SaleDetail> detailRepository,
                              IRepository<Product> productRepository,
                              IRepository<Branch> branchRepository,
                              IRepository<Stock> stockRepository)
        {
            _saleRepository = saleRepository;
            _detailRepository = detailRepository;
            _productRepository = productRepository;
            _branchRepository = branchRepository;
            _stockRepository = stockRepository;
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

            // Obtener todos los pares ProductId/BranchId necesarios
            var productIds = details.Select(d => d.ProductId).Distinct().ToList();
            var branchIds = details.Select(d => d.Sale.BranchId).Distinct().ToList();

            // Cargar stocks para obtener costos por sucursal
            // Nota: Esto obtiene el costo ACTUAL. Idealmente deberíamos tener histórico de costos en SaleDetail,
            // pero bajo la premisa actual usamos el costo promedio ponderado actual de la sucursal.
            var stocks = await _stockRepository.GetAsync(s => productIds.Contains(s.ProductId) && branchIds.Contains(s.BranchId));
            
            // Crear diccionario (BranchId, ProductId) -> Cost
            var costMap = stocks.ToDictionary(s => (s.BranchId, s.ProductId), s => s.Cost);

            // Calcular costo para cada detalle
            var detailsWithCost = details.Select(d => new 
            {
                Detail = d,
                Cost = costMap.TryGetValue((d.Sale.BranchId, d.ProductId), out var cost) ? cost : 0
            }).ToList();

            return detailsWithCost.GroupBy(x => new { x.Detail.ProductId, x.Detail.Product?.SKU, x.Detail.Product?.Name })
                          .Select(g => new ProductMarginDto
                          {
                              ProductId = g.Key.ProductId,
                              SKU = g.Key.SKU,
                              Name = g.Key.Name,
                              QuantitySold = g.Sum(x => x.Detail.Quantity),
                              Revenue = g.Sum(x => x.Detail.SubTotal),
                              CostTotal = g.Sum(x => x.Cost * x.Detail.Quantity)
                          })
                          .OrderByDescending(r => r.Margin)
                          .ToList();
        }
    }
}

