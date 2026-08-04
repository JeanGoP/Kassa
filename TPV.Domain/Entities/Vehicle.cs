using System;
using System.Collections.Generic;
using TPV.Domain.Common;

namespace TPV.Domain.Entities
{
    public class Vehicle : BaseEntity, IMustHaveTenant
    {
        public int TenantId { get; set; }
        public int BranchId { get; set; }
        public Branch Branch { get; set; }
        public string ChassisNumber { get; set; }
        public string? EngineNumber { get; set; }
        public string? Plate { get; set; }
        public string Brand { get; set; }
        public string Model { get; set; }
        public int? Year { get; set; }
        public DateTime? SaleDate { get; set; }
        public int? CurrentOwnerId { get; set; }
        public Customer? CurrentOwner { get; set; }
        public DateTime? OwnerSince { get; set; }
        public decimal? LastKnownMileage { get; set; }
        public ICollection<VehicleOwnerHistory> OwnerHistory { get; set; } = new List<VehicleOwnerHistory>();
        public ICollection<ServiceOrder> ServiceOrders { get; set; } = new List<ServiceOrder>();
        public ICollection<PreparationOrder> PreparationOrders { get; set; } = new List<PreparationOrder>();
    }
}
