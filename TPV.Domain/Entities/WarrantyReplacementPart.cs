using TPV.Domain.Common;

namespace TPV.Domain.Entities
{
    public class WarrantyReplacementPart : BaseEntity, IMustHaveTenant
    {
        public int TenantId { get; set; }
        public int WarrantyId { get; set; }
        public Warranty Warranty { get; set; }
        public int? ProductId { get; set; }
        public Product? Product { get; set; }
        public string Reference { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public decimal Quantity { get; set; }
        public int? UnitOfMeasureId { get; set; }
        public UnitOfMeasure? UnitOfMeasure { get; set; }
        public decimal QuantityBase { get; set; }
        public string Unit { get; set; } = "UND";
        public decimal UnitValue { get; set; }
        public decimal TotalValue { get; set; }
    }
}
