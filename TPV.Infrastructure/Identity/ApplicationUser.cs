using Microsoft.AspNetCore.Identity;

namespace TPV.Infrastructure.Identity
{
    public class ApplicationUser : IdentityUser
    {
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public int? CurrentBranchId { get; set; } // Sucursal actual de trabajo
        public int? TenantId { get; set; } // Empresa a la que pertenece
        public bool IsActive { get; set; } = true;
    }
}
