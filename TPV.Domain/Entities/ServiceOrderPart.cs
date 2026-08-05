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
        public string LineType { get; set; } = "REPUESTO";
        public string Payer { get; set; } = "CLIENTE";
        public bool AddsToCustomerTotal { get; set; } = true;
        public string ServiceType { get; set; } = "CORRECTIVO";
        public int? MaintenanceReviewMileage { get; set; }
        public string? Technician { get; set; }
        public decimal? EstimatedTimeHours { get; set; }
        public decimal? ActualTimeHours { get; set; }
        public decimal UnitPrice { get; set; }
        public string DiscountType { get; set; }
        public decimal DiscountValue { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal SubTotal { get; set; }
    }
}

