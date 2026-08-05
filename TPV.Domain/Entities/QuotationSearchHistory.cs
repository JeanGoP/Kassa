using System;
using TPV.Domain.Common;

namespace TPV.Domain.Entities
{
    public class QuotationSearchHistory : BaseEntity, IMustHaveTenant
    {
        public int TenantId { get; set; }
        public DateTime SearchedAt { get; set; } = DateTime.Now;
        public string SearchTerm { get; set; } = string.Empty;
        public string? MatchedProductName { get; set; }
        public bool FoundInStock { get; set; }
        public decimal TotalQuantity { get; set; }
        public string? UserId { get; set; }
    }
}
