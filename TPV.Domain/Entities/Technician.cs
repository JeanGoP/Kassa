using TPV.Domain.Common;

namespace TPV.Domain.Entities
{
    public class Technician : BaseEntity, IMustHaveTenant
    {
        public int TenantId { get; set; }
        public string Name { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string? Specialty { get; set; }
        public int? BranchId { get; set; }
        public Branch? Branch { get; set; }
    }
}

