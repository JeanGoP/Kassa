using System;
using System.Collections.Generic;
using TPV.Domain.Common;

namespace TPV.Domain.Entities
{
    public class Warranty : BaseEntity, IMustHaveTenant
    {
        public int TenantId { get; set; }

        public string WarrantyNumber { get; set; } = string.Empty;
        public string CompanyName { get; set; } = string.Empty;
        public string? CompanyNit { get; set; }
        public int? BranchId { get; set; }
        public Branch? Branch { get; set; }
        public string? BranchName { get; set; }
        public int? BrandId { get; set; }
        public Brand? BrandCatalog { get; set; }
        public string? BrandName { get; set; }
        public int? VehicleId { get; set; }
        public Vehicle? Vehicle { get; set; }
        public int? ServiceOrderId { get; set; }
        public ServiceOrder? ServiceOrder { get; set; }
        public bool IsLegacyRecord { get; set; }

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

        public string ClaimType { get; set; } = "CORRECTIVA";
        public string DetectionMoment { get; set; } = "RECIBO";
        public string? AttributedCause { get; set; }
        public string ChassisNumber { get; set; } = string.Empty;
        public DateTime FailureDate { get; set; }
        public decimal FailureMileage { get; set; }
        public string FailureDescription { get; set; } = string.Empty;
        public string? FailureMode { get; set; }
        public int? CausingPartProductId { get; set; }
        public Product? CausingPartProduct { get; set; }
        public string CausingPartReference { get; set; } = string.Empty;
        public string CausingPartDescription { get; set; } = string.Empty;
        public decimal RecognizedLaborHours { get; set; }
        public decimal RecognizedLaborValue { get; set; }
        public decimal CustomerEquivalentValue { get; set; }
        public string ManufacturerStatus { get; set; } = "DETECTADA";
        public string? AuthorizationNumber { get; set; }
        public DateTime? AuthorizationDate { get; set; }
        public DateTime? FiledAt { get; set; }
        public decimal ApprovedValue { get; set; }
        public decimal RejectedValue { get; set; }
        public string? RejectionReason { get; set; }
        public decimal RecognizedValue { get; set; }
        public string? VehicleOrPartLot { get; set; }
        public DateTime? ManufacturingDate { get; set; }
        public int? ManufacturerInvoiceId { get; set; }
        public WarrantyManufacturerInvoice? ManufacturerInvoice { get; set; }
        public ICollection<WarrantyReplacementPart> ReplacementParts { get; set; } = new List<WarrantyReplacementPart>();
        public ICollection<WarrantyStatusHistory> StatusHistory { get; set; } = new List<WarrantyStatusHistory>();
    }
}
