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
        public int? WorkshopManagerId { get; set; }
        public WorkshopManager? WorkshopManager { get; set; }
        public string? Department { get; set; }
        public string? City { get; set; }
        public int? MainBrandId { get; set; }
        public Brand? MainBrand { get; set; }

        // Navigation properties
        public ICollection<Stock> Stocks { get; set; }
        public ICollection<Sale> Sales { get; set; }
        public ICollection<InventoryLocation> InventoryLocations { get; set; } = new List<InventoryLocation>();
    }
}
