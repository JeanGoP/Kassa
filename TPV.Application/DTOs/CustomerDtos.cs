namespace TPV.Application.DTOs
{
    public class CustomerDto
    {
        public int Id { get; set; }
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? Address { get; set; }
        public string? IdentificationType { get; set; }
        public string? TaxId { get; set; }

        public string FullName => $"{FirstName} {LastName}".Trim();
    }

    public class CreateCustomerDto
    {
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? Address { get; set; }
        public string? IdentificationType { get; set; }
        public string? TaxId { get; set; }
    }
}
