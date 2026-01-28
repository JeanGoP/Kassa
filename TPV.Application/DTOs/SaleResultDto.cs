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
        public string? Cufe { get; set; }
        public string? QrCode { get; set; }
        public List<SaleItemDto> Items { get; set; } = new();
    }

    public class SaleItemDto
    {
        public int ProductId { get; set; }
        public string ProductName { get; set; }
        public string SKU { get; set; }
        public decimal UnitPrice { get; set; }
        public int Quantity { get; set; }
        public decimal SubTotal { get; set; }
        public decimal TaxRate { get; set; }
        public decimal TaxAmount { get; set; }
    }
}

