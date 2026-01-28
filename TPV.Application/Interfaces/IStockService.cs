using System.Collections.Generic;
using System.Threading.Tasks;
using TPV.Application.DTOs;

namespace TPV.Application.Interfaces
{
    public interface IStockService
    {
        Task<IEnumerable<StockDto>> GetStockByBranchAsync(int branchId);
        Task<IEnumerable<StockDto>> GetLowStockAlertsAsync(int branchId);
        Task UpdateStockAsync(int productId, int branchId, int quantity, int minStockLevel, int maxStockLevel);
        Task AdjustStockAsync(int productId, int branchId, int? quantity, decimal? cost, string reason);
        Task TransferStockAsync(int productId, int sourceBranchId, int targetBranchId, int quantity, string notes);
    }
}
