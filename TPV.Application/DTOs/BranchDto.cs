namespace TPV.Application.DTOs
{
    public class BranchDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? ManagerName { get; set; }
        public int? WorkshopManagerId { get; set; }
        public string? WorkshopManagerName { get; set; }
        public string? Department { get; set; }
        public string? City { get; set; }
    }

    public class CreateBranchDto
    {
        public string Name { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? ManagerName { get; set; }
        public int? WorkshopManagerId { get; set; }
        public string? Department { get; set; }
        public string? City { get; set; }
    }
}
