using TPV.Domain.Common;

namespace TPV.Domain.Entities
{
    public class MotorcycleService : BaseEntity, IMustHaveTenant
    {
        public int TenantId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int? EstimatedMinutes { get; set; }
        public int DisplayOrder { get; set; }
    }
}
