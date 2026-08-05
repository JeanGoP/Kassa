using TPV.Domain.Common;

namespace TPV.Domain.Entities
{
    public class InventoryLocationBalance : BaseEntity, IMustHaveTenant
    {
        public int TenantId { get; set; }
        public int ProductId { get; set; }
        public Product Product { get; set; } = null!;
        public int InventoryLocationId { get; set; }
        public InventoryLocation InventoryLocation { get; set; } = null!;
        public decimal QuantityBase { get; set; }
    }
}
