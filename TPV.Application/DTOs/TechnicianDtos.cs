namespace TPV.Application.DTOs
{
    public class TechnicianDto
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string? Specialty { get; set; }
        public int? BranchId { get; set; }
        public string? BranchName { get; set; }
    }

    public class CreateTechnicianDto
    {
        public string Name { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string? Specialty { get; set; }
        public int? BranchId { get; set; }
    }
}

