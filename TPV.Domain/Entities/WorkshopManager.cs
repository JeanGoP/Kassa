using TPV.Domain.Common;

namespace TPV.Domain.Entities
{
    public class WorkshopManager : BaseEntity, IMustHaveTenant
    {
        public int TenantId { get; set; }
        public string Name { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string? Notes { get; set; }
    }
}
