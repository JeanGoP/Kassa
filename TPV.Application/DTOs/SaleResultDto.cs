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
        public List<SaleItemDto> Items { get; set; } = new();
    }
}

