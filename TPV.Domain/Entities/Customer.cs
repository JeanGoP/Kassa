using System.Collections.Generic;
using TPV.Domain.Common;

namespace TPV.Domain.Entities
{
    public class Customer : BaseEntity, IMustHaveTenant
    {
        public int TenantId { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? Address { get; set; }
        public string? IdentificationType { get; set; }
        public string? TaxId { get; set; } // DNI, RUT, CUIT

        public string? Department { get; set; }
        public string? City { get; set; }

        public ICollection<Sale> Sales { get; set; }
    }
}
