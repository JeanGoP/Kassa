using TPV.Domain.Common;

namespace TPV.Domain.Entities
{
    public class SaleDetail : BaseEntity
    {
        public int SaleId { get; set; }
        public Sale Sale { get; set; }

        public int ProductId { get; set; }
        public Product Product { get; set; }

        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; } // Precio unitario (puede incluir IVA si el producto así se configuró)
        public decimal TaxRate { get; set; } // Porcentaje de IVA aplicado
        public decimal TaxAmount { get; set; } // Monto total de impuestos para esta línea
        public decimal SubTotal { get; set; } // Base + Impuestos (Total línea)
    }
}
