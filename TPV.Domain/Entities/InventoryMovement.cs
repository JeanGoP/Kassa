using System;
using TPV.Domain.Common;

namespace TPV.Domain.Entities
{
    public class InventoryMovement : BaseEntity, IMustHaveTenant
    {
        public int TenantId { get; set; }
        public int ProductId { get; set; }
        public Product Product { get; set; } = null!;
        public int BranchId { get; set; }
        public Branch Branch { get; set; } = null!;
        public int? InventoryLocationId { get; set; }
        public InventoryLocation? InventoryLocation { get; set; }
        public int? DestinationBranchId { get; set; }
        public Branch? DestinationBranch { get; set; }
        public int? DestinationLocationId { get; set; }
        public InventoryLocation? DestinationLocation { get; set; }
        public string MovementType { get; set; } = string.Empty;
        public decimal Quantity { get; set; }
        public int UnitOfMeasureId { get; set; }
        public UnitOfMeasure UnitOfMeasure { get; set; } = null!;
        public string UnitCode { get; set; } = "UND";
        public decimal FactorToBase { get; set; } = 1m;
        public decimal BaseQuantity { get; set; }
        public string? DocumentType { get; set; }
        public int? DocumentId { get; set; }
        public string? DocumentNumber { get; set; }
        public string? Reason { get; set; }
        public string? UserId { get; set; }
        public DateTime OccurredAt { get; set; } = DateTime.UtcNow;
    }
}
