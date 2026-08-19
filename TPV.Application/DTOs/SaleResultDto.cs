using System;
using System.Collections.Generic;

namespace TPV.Application.DTOs
{
    public class SaleResultDto
    {
        public int SaleId { get; set; }
        public string InvoiceNumber { get; set; }
        public DateTime Date { get; set; }
        public int BranchId { get; set; }
        public int? CustomerId { get; set; }
        public string? CustomerName { get; set; }
        public decimal TotalAmount { get; set; }
        public string PaymentMethod { get; set; }
        public decimal AmountReceived { get; set; }
        public decimal CustomerAdvanceApplied { get; set; }
        public decimal CustomerAdvanceCreated { get; set; }
        public decimal ChangeAmount { get; set; }
        public decimal CustomerAdvanceBalance { get; set; }
        public string? Cufe { get; set; }
        public string? QrCode { get; set; }
        public string? ElectronicInvoiceId { get; set; }
        public string? ElectronicInvoicingStatus { get; set; }
        public int? ServiceOrderId { get; set; }
        public List<SaleAdjustmentDto> Adjustments { get; set; } = new();
        public List<SaleItemDto> Items { get; set; } = new();
    }

    public class SaleItemDto
    {
        public int SaleDetailId { get; set; }
        public int ProductId { get; set; }
        public string ProductName { get; set; }
        public string SKU { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal Quantity { get; set; }
        public int? UnitOfMeasureId { get; set; }
        public string UnitCode { get; set; } = "UND";
        public decimal QuantityBase { get; set; }
        public decimal SubTotal { get; set; }
        public decimal TaxRate { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal UnitCost { get; set; }
        public decimal TotalCost { get; set; }
        public int? BrandId { get; set; }
        public string? BrandName { get; set; }
        public string AccountingClassification { get; set; } = "SIN_CLASIFICAR";
        public decimal AdjustedQuantity { get; set; }
    }

    public class CreateSaleAdjustmentDto
    {
        public string DocumentType { get; set; } = "DEVOLUCION";
        public string Reason { get; set; } = string.Empty;
        public List<CreateSaleAdjustmentItemDto> Items { get; set; } = new();
    }

    public class CreateSaleAdjustmentItemDto
    {
        public int SaleDetailId { get; set; }
        public decimal Quantity { get; set; }
    }

    public class SaleAdjustmentDto
    {
        public int Id { get; set; }
        public int SaleId { get; set; }
        public string OriginalInvoiceNumber { get; set; } = string.Empty;
        public string DocumentType { get; set; } = string.Empty;
        public string DocumentNumber { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public string Reason { get; set; } = string.Empty;
        public bool RestocksInventory { get; set; }
        public decimal TotalAmount { get; set; }
        public string Status { get; set; } = string.Empty;
        public List<SaleAdjustmentItemDto> Items { get; set; } = new();
    }

    public class SaleAdjustmentItemDto
    {
        public int SaleDetailId { get; set; }
        public int ProductId { get; set; }
        public string Reference { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public decimal Quantity { get; set; }
        public string UnitCode { get; set; } = "UND";
        public decimal SubTotal { get; set; }
    }
}

