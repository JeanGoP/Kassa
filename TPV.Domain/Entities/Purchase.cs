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

        public DateTime Date { get; set; }
        public string ReferenceNumber { get; set; } = string.Empty; // Invoice number
        public decimal TotalAmount { get; set; }
        public string Status { get; set; } = "Completed"; // Completed, Cancelled

        public ICollection<PurchaseDetail> PurchaseDetails { get; set; } = new List<PurchaseDetail>();
    }
}
