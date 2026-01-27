using System.Collections.Generic;
using TPV.Domain.Common;

namespace TPV.Domain.Entities
{
    public class Branch : BaseEntity, IMustHaveTenant
    {
        public int TenantId { get; set; }
        public string Name { get; set; }
        public string Address { get; set; }
        public string Phone { get; set; }
        public string Email { get; set; }
        public string? ManagerName { get; set; }
        public string? Department { get; set; }
        public string? City { get; set; }

        // Navigation properties
        public ICollection<Stock> Stocks { get; set; }
        public ICollection<Sale> Sales { get; set; }
    }
}
