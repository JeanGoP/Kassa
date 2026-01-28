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

        public async Task AdjustStockAsync(int productId, int branchId, int? quantity, decimal? cost, string reason)
        {
            var stocks = await _stockRepository.GetAsync(s => s.ProductId == productId && s.BranchId == branchId);
            var stock = stocks.FirstOrDefault();

            if (stock == null)
            {
                stock = new Stock
                {
                    ProductId = productId,
                    BranchId = branchId,
                    Quantity = quantity ?? 0,
                    Cost = cost ?? 0,
                    MinStockLevel = 0,
                    MaxStockLevel = 0
                };
                await _stockRepository.AddAsync(stock);
            }
            else
            {
                if (quantity.HasValue) stock.Quantity = quantity.Value;
                if (cost.HasValue) stock.Cost = cost.Value;
                await _stockRepository.UpdateAsync(stock);
            }
        }

        public async Task TransferStockAsync(int productId, int sourceBranchId, int targetBranchId, int quantity, string notes)
        {
            var sourceStocks = await _stockRepository.GetAsync(s => s.ProductId == productId && s.BranchId == sourceBranchId);
            var sourceStock = sourceStocks.FirstOrDefault();

            if (sourceStock == null || sourceStock.Quantity < quantity)
            {
                throw new System.Exception($"Stock insuficiente en la sucursal de origen. Stock actual: {sourceStock?.Quantity ?? 0}");
            }

            var targetStocks = await _stockRepository.GetAsync(s => s.ProductId == productId && s.BranchId == targetBranchId);
            var targetStock = targetStocks.FirstOrDefault();

            // Update source
            sourceStock.Quantity -= quantity;
            await _stockRepository.UpdateAsync(sourceStock);

            // Update target
            if (targetStock == null)
            {
                targetStock = new Stock
                {
                    ProductId = productId,
                    BranchId = targetBranchId,
                    Quantity = quantity,
                    Cost = sourceStock.Cost,
                    MinStockLevel = 0,
                    MaxStockLevel = 0
                };
                await _stockRepository.AddAsync(targetStock);
            }
            else
            {
                // Weighted average cost update on transfer
                var totalValue = (targetStock.Quantity * targetStock.Cost) + (quantity * sourceStock.Cost);
                var totalQty = targetStock.Quantity + quantity;
                
                targetStock.Quantity = totalQty;
                if (totalQty > 0)
                    targetStock.Cost = totalValue / totalQty;
                
                await _stockRepository.UpdateAsync(targetStock);
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
                MaxStockLevel = stock.MaxStockLevel,
                Cost = stock.Cost
            };
        }
    }
}
