using System.Collections.Generic;
using TPV.Domain.Common;

namespace TPV.Domain.Entities
{
    public class Product : BaseEntity, IMustHaveTenant
    {
        public int TenantId { get; set; }
        public string SKU { get; set; } // Código de barras o referencia
        public string? Barcode { get; set; } // Código de barras EAN/UPC adicional
        public string Name { get; set; }
        public string Description { get; set; }
        public string Type { get; set; } = "Producto"; // Producto, Servicio
        public string UnitOfMeasure { get; set; } = "UND"; // Unidad de medida, por defecto UND
        public int? BaseUnitId { get; set; }
        public UnitOfMeasure? BaseUnit { get; set; }
        public int? PurchaseUnitId { get; set; }
        public UnitOfMeasure? PurchaseUnit { get; set; }
        public int? SaleUnitId { get; set; }
        public UnitOfMeasure? SaleUnit { get; set; }
        public bool AllowsFractionalQuantity { get; set; }
        public decimal Price { get; set; } // Precio de venta
        // Cost moved to Stock entity per branch
        public decimal? ProfitabilityPercentage { get; set; } // Porcentaje de rentabilidad opcional

    public string IvaType { get; set; } = "Excluido"; // Gravado, Exento, Excluido
        public decimal IvaRate { get; set; }
        public decimal ImpoconsumoRate { get; set; }

        public bool PriceIncludesIva { get; set; }

        public int? BrandId { get; set; }
        public Brand? Brand { get; set; }

        public string CatalogStatus { get; set; } = "ACTIVO";
        public string OriginType { get; set; } = "NO_CLASIFICADO";
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
        public Category Category { get; set; }

        public ICollection<Stock> Stocks { get; set; }
        public ICollection<SaleDetail> SaleDetails { get; set; }
        public ICollection<ProductUnitConversion> UnitConversions { get; set; } = new List<ProductUnitConversion>();
        public ICollection<ProductApplicability> Applicabilities { get; set; } = new List<ProductApplicability>();
        public ICollection<ProductReferenceRelation> OutgoingReferenceRelations { get; set; } = new List<ProductReferenceRelation>();
        public ICollection<ProductReferenceRelation> IncomingReferenceRelations { get; set; } = new List<ProductReferenceRelation>();
        public ICollection<ProductKitComponent> KitComponents { get; set; } = new List<ProductKitComponent>();
        public ICollection<ProductKitComponent> IncludedInKits { get; set; } = new List<ProductKitComponent>();
    }
}
