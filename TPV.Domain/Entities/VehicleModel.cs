using TPV.Domain.Common;

namespace TPV.Domain.Entities
{
    public class VehicleModel : BaseEntity, IMustHaveTenant
    {
        public int TenantId { get; set; }
        public int BrandId { get; set; }
        public Brand Brand { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
    }
}
