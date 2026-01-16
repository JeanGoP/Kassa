using System;
using System.Collections.Generic;

namespace TPV.Application.DTOs
{
    public class ServiceOrderDto
    {
        public int Id { get; set; }
        public int CustomerId { get; set; }
        public string CustomerName { get; set; }
        public string Plate { get; set; }
        public string Brand { get; set; }
        public string Model { get; set; }
        public int Year { get; set; }
        public decimal Mileage { get; set; }
        public DateTime IntakeDateTime { get; set; }
        public string FuelLevel { get; set; }
        public string InitialObservations { get; set; }
        public string VisualCondition { get; set; }
        public string Technician { get; set; }
        public string? WorkshopManager { get; set; }
        public string Status { get; set; }
        public DateTime? ExitDateTime { get; set; }
        public string? DeliveryNotes { get; set; }
        public string? CloseType { get; set; }
        public string? CloseReason { get; set; }
        public string? CustomerSignatureName { get; set; }
    }

    public class CreateServiceOrderDto
    {
        public int CustomerId { get; set; }
        public string Plate { get; set; }
        public string Brand { get; set; }
        public string Model { get; set; }
        public int Year { get; set; }
        public decimal Mileage { get; set; }
        public DateTime IntakeDateTime { get; set; }
        public string FuelLevel { get; set; }
        public string InitialObservations { get; set; }
        public string VisualCondition { get; set; }
        public string? WorkshopManager { get; set; }
        public string Status { get; set; }
    }

    public class ServiceOrderDiagnosisDto
    {
        public string ProblemDescription { get; set; }
        public string TechnicalDiagnosis { get; set; }
        public bool? CustomerApproved { get; set; }
        public DateTime? ApprovalDate { get; set; }
    }

    public class ServiceOrderWorkDto
    {
        public int Id { get; set; }
        public int ServiceOrderId { get; set; }
        public string Description { get; set; }
        public string Technician { get; set; }
        public decimal? EstimatedTimeHours { get; set; }
        public decimal LaborCost { get; set; }
        public string Status { get; set; }
    }

    public class CreateServiceOrderWorkDto
    {
        public string Description { get; set; }
        public string Technician { get; set; }
        public decimal? EstimatedTimeHours { get; set; }
        public decimal LaborCost { get; set; }
        public string Status { get; set; }
    }

    public class ServiceOrderWorkStatusDto
    {
        public string Status { get; set; }
    }

    public class CloseServiceOrderDto
    {
        public bool AllServicesCompleted { get; set; }
        public bool MaterialsProcessed { get; set; }
        public bool NoPendingTechnicalNotes { get; set; }
        public string? DeliveryNotes { get; set; }
        public DateTime? ExitDateTime { get; set; }
        public string? CloseType { get; set; }
        public string? CloseReason { get; set; }
        public string? CustomerSignatureName { get; set; }
        public string? SpecialCloseSupervisorName { get; set; }
    }

    public class ServiceOrderPartDto
    {
        public int Id { get; set; }
        public int ServiceOrderId { get; set; }
        public int ProductId { get; set; }
        public string ProductName { get; set; }
        public string SKU { get; set; }
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public string DiscountType { get; set; }
        public decimal DiscountValue { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal SubTotal { get; set; }
    }

    public class CreateServiceOrderPartItemDto
    {
        public int ProductId { get; set; }
        public int Quantity { get; set; }
        public string DiscountType { get; set; }
        public decimal DiscountValue { get; set; }
    }

    public class ConfirmServiceOrderPartsDto
    {
        public List<CreateServiceOrderPartItemDto> Items { get; set; } = new List<CreateServiceOrderPartItemDto>();
    }

    public class ServiceOrderPartsResultDto
    {
        public int ServiceOrderId { get; set; }
        public int SaleId { get; set; }
        public string InvoiceNumber { get; set; }
        public decimal Total { get; set; }
        public List<ServiceOrderPartDto> Parts { get; set; } = new List<ServiceOrderPartDto>();
    }

    public class GenerateInvoiceDto
    {
        public decimal LaborCost { get; set; }
        public string PaymentMethod { get; set; }
    }
}
