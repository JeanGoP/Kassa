using System;
using TPV.Domain.Common;

namespace TPV.Domain.Entities
{
    public class ServiceOrderStatusHistory : BaseEntity, IMustHaveTenant
    {
        public int TenantId { get; set; }
        public int ServiceOrderId { get; set; }
        public ServiceOrder ServiceOrder { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime ChangedAt { get; set; }
        public string? ChangedByUserId { get; set; }
        public string? ChangedByName { get; set; }
        public string? Notes { get; set; }
    }
}
