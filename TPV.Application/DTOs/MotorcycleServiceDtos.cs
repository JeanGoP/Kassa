namespace TPV.Application.DTOs
{
    public class MotorcycleServiceDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int? EstimatedMinutes { get; set; }
        public decimal Price { get; set; }
        public decimal TaxRate { get; set; }
        public int DisplayOrder { get; set; }
    }

    public class CreateMotorcycleServiceDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int? EstimatedMinutes { get; set; }
        public decimal Price { get; set; }
        public decimal TaxRate { get; set; }
        public int DisplayOrder { get; set; }
    }
}
