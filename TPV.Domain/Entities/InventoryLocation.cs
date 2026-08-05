using System.Collections.Generic;
using TPV.Domain.Common;

namespace TPV.Domain.Entities
{
    public class InventoryLocation : BaseEntity, IMustHaveTenant
    {
        public int TenantId { get; set; }
        public int BranchId { get; set; }
        public Branch Branch { get; set; } = null!;
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public bool IsDefault { get; set; }
        public ICollection<InventoryLocationBalance> Balances { get; set; } = new List<InventoryLocationBalance>();
    }
}
