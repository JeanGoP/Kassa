namespace TPV.Application.DTOs
{
    public class ProductDto
    {
        public int Id { get; set; }
        public string SKU { get; set; } = string.Empty;
        public string? Barcode { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string UnitOfMeasure { get; set; } = "UND";
        public decimal Price { get; set; }
        // public decimal Cost { get; set; } - Removed
        public decimal? ProfitabilityPercentage { get; set; }

    public string IvaType { get; set; } = "Excluido";
        public decimal IvaRate { get; set; }
        public decimal ImpoconsumoRate { get; set; }
        public bool PriceIncludesIva { get; set; }
        public int CategoryId { get; set; }
        public string? CategoryName { get; set; }
        public int StockQuantity { get; set; }
    }
}
