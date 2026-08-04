using System;
using TPV.Domain.Common;

namespace TPV.Domain.Entities
{
    public class VehicleOwnerHistory : BaseEntity, IMustHaveTenant
    {
        public int TenantId { get; set; }
        public int VehicleId { get; set; }
        public Vehicle Vehicle { get; set; }
        public int CustomerId { get; set; }
        public Customer Customer { get; set; }
        public DateTime OwnedFrom { get; set; }
        public DateTime? OwnedUntil { get; set; }
    }
}
