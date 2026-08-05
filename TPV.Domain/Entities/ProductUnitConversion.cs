using TPV.Domain.Common;

namespace TPV.Domain.Entities
{
    public class ProductUnitConversion : BaseEntity, IMustHaveTenant
    {
        public int TenantId { get; set; }
        public int ProductId { get; set; }
        public Product Product { get; set; } = null!;
        public int UnitOfMeasureId { get; set; }
        public UnitOfMeasure UnitOfMeasure { get; set; } = null!;
        public string UsageType { get; set; } = "ALTERNATE";
        public decimal FactorToBase { get; set; } = 1m;
    }
}
