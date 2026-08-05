using System.ComponentModel.DataAnnotations;

namespace TPV.Application.DTOs
{
    public class TenantDto
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string? Nit { get; set; }
        public string? Address { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string? LogoUrl { get; set; }
    }

    public class CreateTenantDto
    {
        [Required]
        public string Name { get; set; }
        [Required]
        public string Nit { get; set; } = string.Empty;
        public string? Address { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string? LogoUrl { get; set; }
    }
}
