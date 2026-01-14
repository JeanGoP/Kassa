using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using TPV.Application.DTOs;
using TPV.Application.Interfaces;
using TPV.Domain.Entities;
using TPV.Domain.Interfaces;

namespace TPV.Application.Services
{
    public class StockService : IStockService
    {
        private readonly IRepository<Stock> _stockRepository;
        private readonly IRepository<Product> _productRepository;

        public StockService(IRepository<Stock> stockRepository, IRepository<Product> productRepository)
        {
            _stockRepository = stockRepository;
            _productRepository = productRepository;
        }

        public async Task<IEnumerable<StockDto>> GetStockByBranchAsync(int branchId)
        {
            var stocks = await _stockRepository.GetAsync(s => s.BranchId == branchId, null, "Product,Branch");
            return stocks.Select(MapToDto);
        }

        public async Task<IEnumerable<StockDto>> GetLowStockAlertsAsync(int branchId)
        {
            var stocks = await _stockRepository.GetAsync(s => s.BranchId == branchId && s.Quantity <= s.MinStockLevel, null, "Product,Branch");
            return stocks.Select(MapToDto);
        }

        public async Task UpdateStockAsync(int productId, int branchId, int quantity, int minStockLevel, int maxStockLevel)
        {
            var stocks = await _stockRepository.GetAsync(s => s.ProductId == productId && s.BranchId == branchId);
            var stock = stocks.FirstOrDefault();

            if (stock == null)
            {
                stock = new Stock
                {
                    ProductId = productId,
                    BranchId = branchId,
                    Quantity = quantity,
                    MinStockLevel = minStockLevel,
                    MaxStockLevel = maxStockLevel
                };
                await _stockRepository.AddAsync(stock);
            }
            else
            {
                stock.Quantity = quantity;
                stock.MinStockLevel = minStockLevel;
                stock.MaxStockLevel = maxStockLevel;
                await _stockRepository.UpdateAsync(stock);
            }
        }

        private StockDto MapToDto(Stock stock)
        {
            return new StockDto
            {
                Id = stock.Id,
                ProductId = stock.ProductId,
                ProductName = stock.Product?.Name,
                ProductSKU = stock.Product?.SKU,
                BranchId = stock.BranchId,
                BranchName = stock.Branch?.Name,
                Quantity = stock.Quantity,
                MinStockLevel = stock.MinStockLevel,
                MaxStockLevel = stock.MaxStockLevel
            };
        }
    }
}
