using System.Collections.Generic;
using TPV.Domain.Common;

namespace TPV.Domain.Entities
{
    public class Product : BaseEntity, IMustHaveTenant
    {
        public int TenantId { get; set; }
        public string SKU { get; set; } // Código de barras o referencia
        public string Name { get; set; }
        public string Description { get; set; }
        public decimal Price { get; set; } // Precio de venta
        public decimal Cost { get; set; }  // Costo para reportes de ganancia
        
        public string IvaType { get; set; } = "Excluido"; // Gravado, Exento, Excluido
        public decimal IvaRate { get; set; }
        public decimal ImpoconsumoRate { get; set; }

        public int CategoryId { get; set; }
        public Category Category { get; set; }

        public ICollection<Stock> Stocks { get; set; }
        public ICollection<SaleDetail> SaleDetails { get; set; }
    }
}
