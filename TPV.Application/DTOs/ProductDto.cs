using System;
using System.Collections.Generic;

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
        public string CatalogStatus { get; set; } = "ACTIVO";
        public string OriginType { get; set; } = "GENERICO";
        public bool IsOfficialCatalog { get; set; }
        public string? Manufacturer { get; set; }
        public string ReferenceType { get; set; } = "SIMPLE";
        public decimal MinimumOrderQuantity { get; set; }
        public decimal OrderMultiple { get; set; }
        public decimal? WeightKg { get; set; }
        public decimal? LengthCm { get; set; }
        public decimal? WidthCm { get; set; }
        public decimal? HeightCm { get; set; }
        public int? LeadTimeDays { get; set; }
        public decimal ReorderPoint { get; set; }
        public decimal MinimumStock { get; set; }
        public decimal MaximumStock { get; set; }
        public int CategoryId { get; set; }
        public string? CategoryName { get; set; }
        public decimal StockQuantity { get; set; }
        public List<ProductApplicabilityDto> Applicabilities { get; set; } = new();
        public List<ProductReferenceRelationDto> ReferenceRelations { get; set; } = new();
        public List<ProductKitComponentDto> KitComponents { get; set; } = new();
    }

    public class ProductApplicabilityDto
    {
        public int VehicleModelId { get; set; }
        public string? BrandName { get; set; }
        public string? ModelCode { get; set; }
        public string? ModelName { get; set; }
        public string SourceType { get; set; } = "CATALOGO_OFICIAL";
    }

    public class ProductReferenceRelationDto
    {
        public int RelatedProductId { get; set; }
        public string? RelatedReference { get; set; }
        public string? RelatedDescription { get; set; }
        public string RelationType { get; set; } = "INTERCAMBIABLE";
        public string SourceType { get; set; } = "CATALOGO_OFICIAL";
        public DateTime? EffectiveFrom { get; set; }
    }

    public class ProductKitComponentDto
    {
        public int ComponentProductId { get; set; }
        public string? ComponentReference { get; set; }
        public string? ComponentDescription { get; set; }
        public decimal Quantity { get; set; }
        public int UnitOfMeasureId { get; set; }
        public string? UnitCode { get; set; }
    }
}
