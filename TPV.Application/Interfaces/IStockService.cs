using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TPV.Application.DTOs;

namespace TPV.Application.Interfaces
{
    public interface IStockService
    {
        Task<IEnumerable<StockDto>> GetStockByBranchAsync(int branchId, string? userId = null);
        Task<IEnumerable<StockDto>> GetLowStockAlertsAsync(int branchId, string? userId = null);
        Task UpdateStockAsync(int productId, int branchId, decimal quantity, decimal minStockLevel, decimal maxStockLevel, string? userId = null);
        Task AdjustStockAsync(int productId, int branchId, decimal? quantity, decimal? cost, string reason, int? locationId = null, string? userId = null);
        Task TransferStockAsync(int productId, int sourceBranchId, int targetBranchId, decimal quantity, string notes, int? unitOfMeasureId = null, int? sourceLocationId = null, int? targetLocationId = null, string? userId = null);
        Task ApplyMovementAsync(int productId, int branchId, decimal quantity, int? unitOfMeasureId, bool inbound, string movementType, string? documentType, int? documentId, string? documentNumber, string? reason, int? locationId, string? userId);
        Task<IEnumerable<UnitOfMeasureDto>> GetUnitsAsync();
        Task<IEnumerable<InventoryLocationDto>> GetLocationsAsync(int branchId, string? userId = null);
        Task<InventoryLocationDto> SaveLocationAsync(int? id, SaveInventoryLocationDto dto, string? userId = null);
        Task<IEnumerable<InventoryMovementDto>> GetMovementsAsync(int? branchId, int? productId, DateTime? fromDate, DateTime? toDate, string? userId = null);
    }
}
