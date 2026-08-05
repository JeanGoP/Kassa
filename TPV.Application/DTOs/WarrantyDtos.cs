using System;
using System.Collections.Generic;

namespace TPV.Application.DTOs
{
    public class WarrantyDto
    {
        public int Id { get; set; }
        public string WarrantyNumber { get; set; } = string.Empty;
        public string CompanyName { get; set; } = string.Empty;
        public string? CompanyNit { get; set; }
        public int? BranchId { get; set; }
        public string? BranchName { get; set; }
        public int? BrandId { get; set; }
        public string? BrandName { get; set; }
        public int? VehicleId { get; set; }
        public int? ServiceOrderId { get; set; }
        public string? ServiceOrderNumber { get; set; }
        public int? PreparationOrderId { get; set; }
        public string? PreparationOrderNumber { get; set; }
        public bool IsLegacyRecord { get; set; }
        public string Plate { get; set; } = string.Empty;
        public int? CustomerId { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public decimal StartMileage { get; set; }
        public decimal? LimitMileage1 { get; set; }
        public decimal? LimitMileage2 { get; set; }
        public decimal? LimitMileage3 { get; set; }
        public string TermsAndConditions { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string ClaimType { get; set; } = string.Empty;
        public string DetectionMoment { get; set; } = string.Empty;
        public string? AttributedCause { get; set; }
        public string ChassisNumber { get; set; } = string.Empty;
        public DateTime FailureDate { get; set; }
        public decimal FailureMileage { get; set; }
        public string FailureDescription { get; set; } = string.Empty;
        public string? FailureMode { get; set; }
        public int? CausingPartProductId { get; set; }
        public string CausingPartReference { get; set; } = string.Empty;
        public string CausingPartDescription { get; set; } = string.Empty;
        public decimal RecognizedLaborHours { get; set; }
        public decimal RecognizedLaborValue { get; set; }
        public decimal CustomerEquivalentValue { get; set; }
        public string ManufacturerStatus { get; set; } = string.Empty;
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
        public string? ManufacturerInvoiceNumber { get; set; }
        public DateTime? ManufacturerInvoiceDate { get; set; }
        public decimal? ManufacturerInvoiceTotal { get; set; }
        public DateTime? ManufacturerPaidAt { get; set; }
        public string? ManufacturerPaymentReference { get; set; }
        public List<int> CoveredWarrantyIds { get; set; } = new();
        public List<WarrantyReplacementPartDto> ReplacementParts { get; set; } = new();
        public List<WarrantyStatusHistoryDto> StatusHistory { get; set; } = new();
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime ModifiedAt { get; set; }
    }

    public class CreateWarrantyDto
    {
        public int VehicleId { get; set; }
        public int? ServiceOrderId { get; set; }
        public int? PreparationOrderId { get; set; }
        public string ClaimType { get; set; } = "CORRECTIVA";
        public string DetectionMoment { get; set; } = "RECIBO";
        public string? AttributedCause { get; set; }
        public DateTime FailureDate { get; set; }
        public decimal FailureMileage { get; set; }
        public string FailureDescription { get; set; } = string.Empty;
        public string? FailureMode { get; set; }
        public int? CausingPartProductId { get; set; }
        public string CausingPartReference { get; set; } = string.Empty;
        public string CausingPartDescription { get; set; } = string.Empty;
        public decimal RecognizedLaborHours { get; set; }
        public decimal RecognizedLaborValue { get; set; }
        public decimal CustomerEquivalentValue { get; set; }
        public string ManufacturerStatus { get; set; } = "DETECTADA";
        public string? StatusNotes { get; set; }
        public string? AuthorizationNumber { get; set; }
        public DateTime? AuthorizationDate { get; set; }
        public DateTime? FiledAt { get; set; }
        public decimal ApprovedValue { get; set; }
        public decimal RejectedValue { get; set; }
        public string? RejectionReason { get; set; }
        public decimal RecognizedValue { get; set; }
        public string? VehicleOrPartLot { get; set; }
        public DateTime? ManufacturingDate { get; set; }
        public string? ManufacturerInvoiceNumber { get; set; }
        public DateTime? ManufacturerInvoiceDate { get; set; }
        public decimal? ManufacturerInvoiceTotal { get; set; }
        public DateTime? ManufacturerPaidAt { get; set; }
        public string? ManufacturerPaymentReference { get; set; }
        public List<CreateWarrantyReplacementPartDto> ReplacementParts { get; set; } = new();
    }

    public class WarrantyReplacementPartDto
    {
        public int Id { get; set; }
        public int? ProductId { get; set; }
        public string Reference { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public decimal Quantity { get; set; }
        public string Unit { get; set; } = string.Empty;
        public decimal UnitValue { get; set; }
        public decimal TotalValue { get; set; }
    }

    public class CreateWarrantyReplacementPartDto
    {
        public int? ProductId { get; set; }
        public string Reference { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public decimal Quantity { get; set; }
        public string Unit { get; set; } = "UND";
        public decimal UnitValue { get; set; }
    }

    public class WarrantyStatusHistoryDto
    {
        public int Id { get; set; }
        public string ManufacturerStatus { get; set; } = string.Empty;
        public DateTime ChangedAt { get; set; }
        public string? ChangedByUserId { get; set; }
        public string? ChangedByName { get; set; }
        public string? Notes { get; set; }
    }
}
