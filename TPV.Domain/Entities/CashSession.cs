using System;
using TPV.Domain.Common;

namespace TPV.Domain.Entities
{
    public class CashSession : BaseEntity
    {
        public int BranchId { get; set; }
        public Branch Branch { get; set; }

        public string UserId { get; set; }
        // public ApplicationUser User { get; set; } // Avoid direct dependency on Identity in Domain if possible, but usually okay. 
        // Actually, TPV.Domain should not reference Microsoft.AspNetCore.Identity usually.
        // So we keep UserId as string.

        public DateTime OpeningTime { get; set; } = DateTime.UtcNow;
        public DateTime? ClosingTime { get; set; }

        public decimal OpeningBalance { get; set; }
        public decimal ClosingBalance { get; set; } // Cash counted at close
        public decimal TotalSystemSales { get; set; } // Calculated from sales
        public decimal Difference { get; set; } // ClosingBalance - (Opening + Sales)

        public bool IsClosed { get; set; } = false;
    }
}
