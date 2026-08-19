using System;
using TPV.Domain.Common;

namespace TPV.Domain.Entities
{
    public class CustomerAdvanceMovement : BaseEntity, IMustHaveTenant
    {
        public int TenantId { get; set; }
        public int CustomerId { get; set; }
        public Customer Customer { get; set; } = null!;
        public int BranchId { get; set; }
        public Branch Branch { get; set; } = null!;
        public int? SaleId { get; set; }
        public Sale? Sale { get; set; }
        public DateTime Date { get; set; } = DateTime.UtcNow;
        public string MovementType { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string PaymentMethod { get; set; } = string.Empty;
        public string Reference { get; set; } = string.Empty;
        public string? Notes { get; set; }
        public string? CreatedByUserId { get; set; }
    }
}
