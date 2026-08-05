using System;

namespace TPV.Application.DTOs
{
    public class UnitOfMeasureDto
    {
        public int Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Symbol { get; set; } = string.Empty;
        public bool AllowsDecimals { get; set; }
        public bool IsActive { get; set; }
    }

    public class InventoryLocationDto
    {
        public int Id { get; set; }
        public int BranchId { get; set; }
        public string BranchName { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public bool IsDefault { get; set; }
        public bool IsActive { get; set; }
    }

    public class SaveInventoryLocationDto
    {
        public int BranchId { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public bool IsDefault { get; set; }
        public bool IsActive { get; set; } = true;
    }

    public class InventoryMovementDto
    {
        public int Id { get; set; }
        public int ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public string ProductSku { get; set; } = string.Empty;
        public int BranchId { get; set; }
        public string BranchName { get; set; } = string.Empty;
        public int? InventoryLocationId { get; set; }
        public string? LocationName { get; set; }
        public int? DestinationBranchId { get; set; }
        public string? DestinationBranchName { get; set; }
        public int? DestinationLocationId { get; set; }
        public string? DestinationLocationName { get; set; }
        public string MovementType { get; set; } = string.Empty;
        public decimal Quantity { get; set; }
        public int UnitOfMeasureId { get; set; }
        public string UnitCode { get; set; } = string.Empty;
        public decimal FactorToBase { get; set; }
        public decimal BaseQuantity { get; set; }
        public string? DocumentType { get; set; }
        public int? DocumentId { get; set; }
        public string? DocumentNumber { get; set; }
        public string? Reason { get; set; }
        public string? UserId { get; set; }
        public DateTime OccurredAt { get; set; }
    }
}
