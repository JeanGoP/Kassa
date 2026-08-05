using System;
using TPV.Domain.Common;

namespace TPV.Domain.Entities
{
    public class WarrantyStatusHistory : BaseEntity, IMustHaveTenant
    {
        public int TenantId { get; set; }
        public int WarrantyId { get; set; }
        public Warranty Warranty { get; set; }
        public string ManufacturerStatus { get; set; } = string.Empty;
        public DateTime ChangedAt { get; set; }
        public string? ChangedByUserId { get; set; }
        public string? ChangedByName { get; set; }
        public string? Notes { get; set; }
    }
}
