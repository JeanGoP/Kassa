using TPV.Domain.Common;

namespace TPV.Domain.Entities
{
    public class ProductKitComponent : BaseEntity, IMustHaveTenant
    {
        public int TenantId { get; set; }
        public int KitProductId { get; set; }
        public Product KitProduct { get; set; } = null!;
        public int ComponentProductId { get; set; }
        public Product ComponentProduct { get; set; } = null!;
        public decimal Quantity { get; set; }
        public int UnitOfMeasureId { get; set; }
        public UnitOfMeasure UnitOfMeasure { get; set; } = null!;
    }
}
