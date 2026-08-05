using System;
using System.Collections.Generic;
using TPV.Domain.Common;

namespace TPV.Domain.Entities
{
    public class Purchase : BaseEntity, IMustHaveTenant
    {
        public int TenantId { get; set; }
        public int SupplierId { get; set; }
        public Supplier Supplier { get; set; } = null!;

        public int BranchId { get; set; }
        public Branch Branch { get; set; } = null!;

        public int InventoryLocationId { get; set; }
        public InventoryLocation InventoryLocation { get; set; } = null!;

        public DateTime Date { get; set; }
        public DateTime? SupplierInvoiceDate { get; set; }
        public string ReferenceNumber { get; set; } = string.Empty; // Invoice number
        public decimal TotalAmount { get; set; }
        public decimal ItemsSubTotal { get; set; }
        public decimal ItemsTaxAmount { get; set; }
        public decimal Freight { get; set; }
        public decimal FreightTaxRate { get; set; }
        public decimal FreightTaxAmount { get; set; }
        public string Status { get; set; } = "Completed"; // Completed, Cancelled
        public string AccountingStatus { get; set; } = "Pending"; // Pending, Exported, Error
        public string? AccountingReference { get; set; }
        public DateTime? AccountingExportedAt { get; set; }
        public string? CreatedByUserId { get; set; }

        public ICollection<PurchaseDetail> PurchaseDetails { get; set; } = new List<PurchaseDetail>();
    }
}
