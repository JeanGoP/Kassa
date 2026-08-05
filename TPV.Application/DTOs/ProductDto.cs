namespace TPV.Application.DTOs
{
    public class ProductDto
    {
        public int Id { get; set; }
        public string SKU { get; set; } = string.Empty;
        public string? Barcode { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string Type { get; set; } = "Producto";
        public string UnitOfMeasure { get; set; } = "UND";
        public int? BaseUnitId { get; set; }
        public string? BaseUnitCode { get; set; }
        public int? PurchaseUnitId { get; set; }
        public string? PurchaseUnitCode { get; set; }
        public decimal PurchaseFactorToBase { get; set; } = 1m;
        public int? SaleUnitId { get; set; }
        public string? SaleUnitCode { get; set; }
        public decimal SaleFactorToBase { get; set; } = 1m;
        public bool AllowsFractionalQuantity { get; set; }
        public decimal Price { get; set; }
        // public decimal Cost { get; set; } - Removed
        public decimal? ProfitabilityPercentage { get; set; }

    public string IvaType { get; set; } = "Excluido";
        public decimal IvaRate { get; set; }
        public decimal ImpoconsumoRate { get; set; }
        public bool PriceIncludesIva { get; set; }
        public int? BrandId { get; set; }
        public string? BrandName { get; set; }
        public int CategoryId { get; set; }
        public string? CategoryName { get; set; }
        public decimal StockQuantity { get; set; }
    }
}
