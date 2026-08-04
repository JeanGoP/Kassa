using TPV.Domain.Common;

namespace TPV.Domain.Entities
{
    public class PreparationOrderItem : BaseEntity, IMustHaveTenant
    {
        public int TenantId { get; set; }
        public int PreparationOrderId { get; set; }
        public PreparationOrder PreparationOrder { get; set; }
        public int? ProductId { get; set; }
        public Product? Product { get; set; }
        public string Reference { get; set; }
        public string Description { get; set; }
        public decimal Quantity { get; set; }
        public string Unit { get; set; }
        public decimal UnitValue { get; set; }
        public decimal TotalValue { get; set; }
        public string? Notes { get; set; }
    }
}
