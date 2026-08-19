using System.Collections.Generic;
using TPV.Domain.Common;

namespace TPV.Domain.Entities
{
    public class SaleDetail : BaseEntity
    {
        public int SaleId { get; set; }
        public Sale Sale { get; set; } = null!;
        public int ProductId { get; set; }
        public Product Product { get; set; } = null!;
        public int? QuotationDetailId { get; set; }
        public QuotationDetail? QuotationDetail { get; set; }
        public decimal Quantity { get; set; }
        public int? UnitOfMeasureId { get; set; }
        public UnitOfMeasure? UnitOfMeasure { get; set; }
        public string UnitCode { get; set; } = "UND";
        public decimal QuantityBase { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal TaxRate { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal UnitCost { get; set; }
        public decimal TotalCost { get; set; }
        public int? BrandId { get; set; }
        public string? BrandName { get; set; }
        public string AccountingClassification { get; set; } = "SIN_CLASIFICAR";
        public decimal SubTotal { get; set; }
        public ICollection<SaleAdjustmentDetail> AdjustmentDetails { get; set; } = new List<SaleAdjustmentDetail>();
    }
}
