using TPV.Domain.Common;

namespace TPV.Domain.Entities
{
    public class ProductApplicability : BaseEntity, IMustHaveTenant
    {
        public int TenantId { get; set; }
        public int ProductId { get; set; }
        public Product Product { get; set; } = null!;
        public int VehicleModelId { get; set; }
        public VehicleModel VehicleModel { get; set; } = null!;
        public string SourceType { get; set; } = "CATALOGO_OFICIAL";
    }
}
