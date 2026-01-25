using System;
using TPV.Domain.Common;

namespace TPV.Domain.Entities
{
    public class Warranty : BaseEntity, IMustHaveTenant
    {
        public int TenantId { get; set; }

        public string Plate { get; set; }
        
        public int? CustomerId { get; set; }
        public Customer Customer { get; set; }

        public string Type { get; set; } // Mileage, Time, Mixed, Parts
        public string Description { get; set; }
        
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }

        public decimal StartMileage { get; set; }
        public decimal? LimitMileage1 { get; set; }
        public decimal? LimitMileage2 { get; set; }
        public decimal? LimitMileage3 { get; set; }
        
        public string TermsAndConditions { get; set; }
        public string Status { get; set; } = "Active"; // Active, Expired, Voided
    }
}