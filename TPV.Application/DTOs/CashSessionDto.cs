using System;

namespace TPV.Application.DTOs
{
    public class CashSessionDto
    {
        public int Id { get; set; }
        public int BranchId { get; set; }
        public string UserId { get; set; }
        public DateTime OpeningTime { get; set; }
        public DateTime? ClosingTime { get; set; }
        public decimal OpeningBalance { get; set; }
        public decimal ClosingBalance { get; set; }
        public decimal TotalSystemSales { get; set; }
        public decimal Difference { get; set; }
        public bool IsClosed { get; set; }
    }
}

