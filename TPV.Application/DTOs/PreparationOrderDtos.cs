using System;
using System.Collections.Generic;

namespace TPV.Application.DTOs
{
    public class PreparationOrderDto
    {
        public int Id { get; set; }
        public string OrderNumber { get; set; }
        public string? CommercialDocumentReference { get; set; }
        public int BranchId { get; set; }
        public string? BranchName { get; set; }
        public int? CustomerId { get; set; }
        public string? CustomerName { get; set; }
        public DateTime RequestedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public string Status { get; set; }
        public string ChassisNumber { get; set; }
        public string? EngineNumber { get; set; }
        public string? Plate { get; set; }
        public int? BrandId { get; set; }
        public int? VehicleModelId { get; set; }
        public string Brand { get; set; }
        public string Model { get; set; }
        public int? Year { get; set; }
        public decimal? Mileage { get; set; }
        public string? ExecutedBy { get; set; }
        public string? Findings { get; set; }
        public bool WarrantyOpened { get; set; }
        public int? WarrantyId { get; set; }
        public string? Notes { get; set; }
        public List<PreparationOrderItemDto> Items { get; set; } = new();
    }

    public class CreatePreparationOrderDto
    {
        public string? CommercialDocumentReference { get; set; }
        public int? BranchId { get; set; }
        public int? CustomerId { get; set; }
        public DateTime? RequestedAt { get; set; }
        public string? ChassisNumber { get; set; }
        public string? EngineNumber { get; set; }
        public string? Plate { get; set; }
        public int? BrandId { get; set; }
        public int? VehicleModelId { get; set; }
        public string? Brand { get; set; }
        public string? Model { get; set; }
        public int? Year { get; set; }
        public decimal? Mileage { get; set; }
        public string? ExecutedBy { get; set; }
        public string? Findings { get; set; }
        public bool WarrantyOpened { get; set; }
        public int? WarrantyId { get; set; }
        public string? Notes { get; set; }
        public List<CreatePreparationOrderItemDto> Items { get; set; } = new();
    }

    public class UpdatePreparationOrderDto : CreatePreparationOrderDto
    {
        public string? Status { get; set; }
        public DateTime? CompletedAt { get; set; }
    }

    public class CompletePreparationOrderDto
    {
        public DateTime? CompletedAt { get; set; }
        public string? ExecutedBy { get; set; }
        public string? Findings { get; set; }
        public bool WarrantyOpened { get; set; }
        public int? WarrantyId { get; set; }
        public string? Notes { get; set; }
    }

    public class PreparationOrderItemDto
    {
        public int Id { get; set; }
        public int? ProductId { get; set; }
        public string Reference { get; set; }
        public string Description { get; set; }
        public decimal Quantity { get; set; }
        public string Unit { get; set; }
        public decimal UnitValue { get; set; }
        public decimal TotalValue { get; set; }
        public string? Notes { get; set; }
    }

    public class CreatePreparationOrderItemDto
    {
        public int? ProductId { get; set; }
        public string? Reference { get; set; }
        public string? Description { get; set; }
        public decimal Quantity { get; set; }
        public string? Unit { get; set; }
        public decimal UnitValue { get; set; }
        public string? Notes { get; set; }
    }
}
