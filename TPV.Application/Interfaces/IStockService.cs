using System.Collections.Generic;
using System.Threading.Tasks;
using TPV.Application.DTOs;

namespace TPV.Application.Interfaces
{
    public interface IStockService
    {
        Task<IEnumerable<StockDto>> GetStockByBranchAsync(int branchId, string? userId = null);
        Task<IEnumerable<StockDto>> GetLowStockAlertsAsync(int branchId, string? userId = null);
        Task UpdateStockAsync(int productId, int branchId, int quantity, int minStockLevel, int maxStockLevel, string? userId = null);
        Task AdjustStockAsync(int productId, int branchId, int? quantity, decimal? cost, string reason, string? userId = null);
        Task TransferStockAsync(int productId, int sourceBranchId, int targetBranchId, int quantity, string notes, string? userId = null);
    }
}
