using System;
using System.Collections.Generic;
using TPV.Domain.Common;

namespace TPV.Domain.Entities
{
    public class SaleAdjustment : BaseEntity, IMustHaveTenant
    {
        public int TenantId { get; set; }
        public int SaleId { get; set; }
        public Sale Sale { get; set; } = null!;
        public int BranchId { get; set; }
        public Branch Branch { get; set; } = null!;
        public string DocumentType { get; set; } = "DEVOLUCION";
        public string DocumentNumber { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public string Reason { get; set; } = string.Empty;
        public bool RestocksInventory { get; set; }
        public decimal TotalAmount { get; set; }
        public string Status { get; set; } = "APLICADA";
        public string CreatedByUserId { get; set; } = string.Empty;
        public ICollection<SaleAdjustmentDetail> Details { get; set; } = new List<SaleAdjustmentDetail>();
    }
}
