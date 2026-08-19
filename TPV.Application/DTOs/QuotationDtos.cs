using System;
using System.Collections.Generic;

namespace TPV.Application.DTOs
{
    public class QuotationSearchResultDto
    {
        public int HistoryId { get; set; }
        public string SearchTerm { get; set; } = string.Empty;
        public DateTime SearchedAt { get; set; }
        public bool FoundInStock { get; set; }
        public decimal TotalQuantity { get; set; }
        public List<QuotationProductAvailabilityDto> Products { get; set; } = new();
    }

    public class QuotationProductAvailabilityDto
    {
        public int ProductId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string SKU { get; set; } = string.Empty;
        public string? Barcode { get; set; }
        public decimal Price { get; set; }
        public decimal TotalQuantity { get; set; }
        public List<QuotationBranchAvailabilityDto> Branches { get; set; } = new();
    }

    public class QuotationBranchAvailabilityDto
    {
        public int BranchId { get; set; }
        public string BranchName { get; set; } = string.Empty;
        public decimal Quantity { get; set; }
    }

    public class QuotationSearchHistoryDto
    {
        public int Id { get; set; }
        public DateTime SearchedAt { get; set; }
        public string SearchTerm { get; set; } = string.Empty;
        public string? MatchedProductName { get; set; }
        public bool FoundInStock { get; set; }
        public decimal TotalQuantity { get; set; }
    }

    public class CreateQuotationDto
    {
        public string RequestedByName { get; set; } = string.Empty;
        public string? RequestedByPhone { get; set; }
        public string? RequestedByEmail { get; set; }
        public string? Notes { get; set; }
        public List<CreateQuotationDetailDto> Details { get; set; } = new();
    }

    public class CreateQuotationDetailDto
    {
        public int ProductId { get; set; }
        public int Quantity { get; set; }
        public decimal? UnitPrice { get; set; }
    }

    public class QuotationDto
    {
        public int Id { get; set; }
        public string QuotationNumber { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public string RequestedByName { get; set; } = string.Empty;
        public string? RequestedByPhone { get; set; }
        public string? RequestedByEmail { get; set; }
        public string? Notes { get; set; }
        public decimal TotalAmount { get; set; }
        public int? CustomerId { get; set; }
        public string? CustomerName { get; set; }
        public string Status { get; set; } = "PENDIENTE";
        public decimal InvoicedAmount { get; set; }
        public decimal PendingAmount { get; set; }
        public decimal AdvanceCreated { get; set; }
        public decimal AdvanceApplied { get; set; }
        public List<QuotationDetailDto> Details { get; set; } = new();
        public List<QuotationInvoiceDto> Invoices { get; set; } = new();
    }

    public class QuotationDetailDto
    {
        public int Id { get; set; }
        public int ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public string SKU { get; set; } = string.Empty;
        public string? Barcode { get; set; }
        public int Quantity { get; set; }
        public decimal AvailableQuantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal SubTotal { get; set; }
        public decimal InvoicedQuantity { get; set; }
        public decimal PendingQuantity { get; set; }
    }

    public class QuotationInvoiceDto
    {
        public int SaleId { get; set; }
        public string InvoiceNumber { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal AdvanceCreated { get; set; }
        public decimal AdvanceApplied { get; set; }
    }

    public class QuotationReportFilterDto
    {
        public DateTime? Start { get; set; }
        public DateTime? End { get; set; }
        public string? Search { get; set; }
    }
}
