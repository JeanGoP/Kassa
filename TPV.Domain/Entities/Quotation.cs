using System;
using System.Collections.Generic;
using TPV.Domain.Common;

namespace TPV.Domain.Entities
{
    public class Quotation : BaseEntity, IMustHaveTenant
    {
        public int TenantId { get; set; }
        public string QuotationNumber { get; set; } = string.Empty;
        public DateTime Date { get; set; } = DateTime.Now;
        public string RequestedByName { get; set; } = string.Empty;
        public string? RequestedByPhone { get; set; }
        public string? RequestedByEmail { get; set; }
        public string? Notes { get; set; }
        public decimal TotalAmount { get; set; }
        public string? UserId { get; set; }

        public ICollection<QuotationDetail> Details { get; set; } = new List<QuotationDetail>();
    }
}
