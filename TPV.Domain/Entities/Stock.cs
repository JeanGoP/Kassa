using TPV.Domain.Common;

namespace TPV.Domain.Entities
{
    public class Stock : BaseEntity, IMustHaveTenant
    {
        public int TenantId { get; set; }
        public int ProductId { get; set; }
        public Product Product { get; set; }

        public int BranchId { get; set; }
        public Branch Branch { get; set; }

        public int Quantity { get; set; }
        public decimal Cost { get; set; } // Costo promedio ponderado por sucursal
        public int MinStockLevel { get; set; } // Para alertas de reposición
        public int MaxStockLevel { get; set; } // Para evitar sobrestock
    }
}
