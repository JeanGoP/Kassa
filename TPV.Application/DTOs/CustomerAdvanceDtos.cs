using System;
using System.Collections.Generic;

namespace TPV.Application.DTOs
{
    public class CustomerAdvanceSummaryDto
    {
        public int CustomerId { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public string? IdentificationType { get; set; }
        public string? TaxId { get; set; }
        public decimal Balance { get; set; }
        public DateTime? LastMovementAt { get; set; }
    }

    public class CustomerAdvanceMovementDto
    {
        public int Id { get; set; }
        public DateTime Date { get; set; }
        public string MovementType { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public decimal SignedAmount { get; set; }
        public decimal BalanceAfter { get; set; }
        public int BranchId { get; set; }
        public string BranchName { get; set; } = string.Empty;
        public int? SaleId { get; set; }
        public string? InvoiceNumber { get; set; }
        public string PaymentMethod { get; set; } = string.Empty;
        public string Reference { get; set; } = string.Empty;
        public string? Notes { get; set; }
    }

    public class CustomerAdvanceAccountDto
    {
        public CustomerAdvanceSummaryDto Customer { get; set; } = new();
        public List<CustomerAdvanceMovementDto> Movements { get; set; } = new();
    }
}
