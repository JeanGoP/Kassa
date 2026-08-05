using System.Collections.Generic;
using TPV.Domain.Common;

namespace TPV.Domain.Entities
{
    public class Supplier : BaseEntity, IMustHaveTenant
    {
        public int TenantId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? ContactName { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string? Address { get; set; }
        public string? IdentificationType { get; set; }
        public string? TaxId { get; set; }
        public string SupplierType { get; set; } = "TERCERO";
        public int? OfficialBrandId { get; set; }
        public Brand? OfficialBrand { get; set; }
    }
}
