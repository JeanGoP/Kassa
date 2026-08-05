using TPV.Domain.Common;

namespace TPV.Domain.Entities
{
    public class PurchaseDetail : BaseEntity
    {
        public int PurchaseId { get; set; }
        public Purchase Purchase { get; set; } = null!;

        public int ProductId { get; set; }
        public Product Product { get; set; } = null!;

        public decimal Quantity { get; set; }
        public int? UnitOfMeasureId { get; set; }
        public UnitOfMeasure? UnitOfMeasure { get; set; }
        public string UnitCode { get; set; } = "UND";
        public decimal QuantityBase { get; set; }
        public decimal UnitCost { get; set; }
        public decimal SubTotal { get; set; }
        public decimal TaxRate { get; set; }
        public decimal TaxAmount { get; set; }
    }
}
