namespace TPV.Application.DTOs
{
    public class CategoryDto
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public bool IsPrimary { get; set; }
        public int Level { get; set; }
        public int? ParentId { get; set; }
        public string ParentName { get; set; }
    }

    public class CreateCategoryDto
    {
        public string Name { get; set; }
        public string Description { get; set; }
        public int? ParentId { get; set; }
        public bool IsPrimary { get; set; }
    }
}
