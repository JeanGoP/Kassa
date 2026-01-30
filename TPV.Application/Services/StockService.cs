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
        private readonly IUserService _userService;

        public StockService(IRepository<Stock> stockRepository, IRepository<Product> productRepository, IUserService userService)
        {
            _stockRepository = stockRepository;
            _productRepository = productRepository;
            _userService = userService;
        }

        public async Task<IEnumerable<StockDto>> GetStockByBranchAsync(int branchId, string? userId = null)
        {
            if (userId != null)
            {
                // Validate if user has access to this branch
                // Exception: If user has Transfer permission, they can view all stocks (needed for transfers)
                bool isAssigned = await _userService.IsUserInBranchAsync(userId, branchId);
                bool canTransfer = await _userService.HasPermissionToTransferAsync(userId);

                if (!isAssigned && !canTransfer)
                {
                    // Instead of throwing, maybe return empty? Or throw unauthorized.
                    // Given the requirement "Validar filtros", throwing seems appropriate if they explicitly requested a branch they don't have access to.
                    throw new System.UnauthorizedAccessException("No tiene permiso para ver el inventario de esta sucursal.");
                }
            }

            var stocks = await _stockRepository.GetAsync(s => s.BranchId == branchId, null, "Product,Branch");
            return stocks.Select(MapToDto);
        }

        public async Task<IEnumerable<StockDto>> GetLowStockAlertsAsync(int branchId, string? userId = null)
        {
            if (userId != null)
            {
                bool isAssigned = await _userService.IsUserInBranchAsync(userId, branchId);
                bool canTransfer = await _userService.HasPermissionToTransferAsync(userId);

                if (!isAssigned && !canTransfer)
                {
                    throw new System.UnauthorizedAccessException("No tiene permiso para ver alertas de inventario de esta sucursal.");
                }
            }

            // Usually triggered by system or authorized user for that branch
            var stocks = await _stockRepository.GetAsync(s => s.BranchId == branchId && s.Quantity <= s.MinStockLevel, null, "Product,Branch");
            return stocks.Select(MapToDto);
        }

        public async Task UpdateStockAsync(int productId, int branchId, int quantity, int minStockLevel, int maxStockLevel, string? userId = null)
        {
            if (userId != null)
            {
                if (!await _userService.IsUserInBranchAsync(userId, branchId))
                {
                     throw new System.UnauthorizedAccessException("No tiene permiso para modificar el inventario de esta sucursal.");
                }
            }

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

        public async Task AdjustStockAsync(int productId, int branchId, int? quantity, decimal? cost, string reason, string? userId = null)
        {
            if (userId != null)
            {
                if (!await _userService.IsUserInBranchAsync(userId, branchId))
                {
                     throw new System.UnauthorizedAccessException("No tiene permiso para ajustar el inventario de esta sucursal.");
                }
            }

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

        public async Task TransferStockAsync(int productId, int sourceBranchId, int targetBranchId, int quantity, string notes, string? userId = null)
        {
            if (userId != null)
            {
                // For transfers, we need to check if user has global transfer permission OR is assigned to source branch.
                // However, usually transfers require higher privileges or access to both.
                // The requirement says: "Implementar lógica de Traslados permitiendo acceso global a bodegas"
                // implying that if you have the permission (checked in Controller/Service), you can access any branch.
                
                bool canTransfer = await _userService.HasPermissionToTransferAsync(userId);
                bool isAssignedToSource = await _userService.IsUserInBranchAsync(userId, sourceBranchId);

                if (!canTransfer && !isAssignedToSource)
                {
                    throw new System.UnauthorizedAccessException("No tiene permiso para realizar traslados desde esta sucursal.");
                }
                
                // Note: We might also want to check target branch access, but often "sending" stock is enough validation.
                // If "Global Access" is required for transfers, maybe we should enforce 'canTransfer' strictly?
                // "permitiendo acceso global a bodegas" -> likely means if I have the role/permission, I can transfer between ANY branch.
                
                if (!canTransfer && isAssignedToSource)
                {
                    // If I am just a branch user, can I transfer OUT? 
                    // Usually yes, but maybe restricted. Let's assume yes for now if they are in source.
                }
            }

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
