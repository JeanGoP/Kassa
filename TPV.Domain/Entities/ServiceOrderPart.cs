using TPV.Domain.Common;

namespace TPV.Domain.Entities
{
    public class ServiceOrderPart : BaseEntity
    {
        public int ServiceOrderId { get; set; }
        public ServiceOrder ServiceOrder { get; set; }
        public int ProductId { get; set; }
        public Product Product { get; set; }
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public string DiscountType { get; set; }
        public decimal DiscountValue { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal SubTotal { get; set; }
    }
}

