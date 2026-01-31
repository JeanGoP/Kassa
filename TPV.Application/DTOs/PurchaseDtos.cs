using System;
using System.Collections.Generic;

namespace TPV.Application.DTOs
{
    public class CreatePurchaseDto
    {
        public int SupplierId { get; set; }
        public int BranchId { get; set; }
        public string ReferenceNumber { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public decimal Freight { get; set; }
        public List<CreatePurchaseDetailDto> Details { get; set; } = new();
    }

    public class CreatePurchaseDetailDto
    {
        public int ProductId { get; set; }
        public int Quantity { get; set; }
        public decimal UnitCost { get; set; }
        public decimal TaxRate { get; set; }
    }

    public class PurchaseDto
    {
        public int Id { get; set; }
        public string SupplierName { get; set; } = string.Empty;
        public string BranchName { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public string ReferenceNumber { get; set; } = string.Empty;
        public decimal TotalAmount { get; set; }
        public decimal Freight { get; set; }
        public string Status { get; set; } = string.Empty;
        public List<PurchaseDetailDto> Details { get; set; } = new();
    }

    public class PurchaseDetailDto
    {
        public int ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public decimal UnitCost { get; set; }
        public decimal SubTotal { get; set; }
        public decimal TaxRate { get; set; }
        public decimal TaxAmount { get; set; }
    }
}