using TPV.Domain.Common;

namespace TPV.Domain.Entities
{
    public class ServiceOrderWork : BaseEntity
    {
        public int ServiceOrderId { get; set; }
        public ServiceOrder ServiceOrder { get; set; }
        public int? ProductId { get; set; }
        public Product? Product { get; set; }
        public string Description { get; set; }
        public string Technician { get; set; }
        public decimal? EstimatedTimeHours { get; set; }
        public decimal? ActualTimeHours { get; set; }
        public decimal LaborCost { get; set; }
        public decimal TaxRate { get; set; }
        public string Payer { get; set; } = "CLIENTE";
        public bool AddsToCustomerTotal { get; set; } = true;
        public string ServiceType { get; set; } = "CORRECTIVO";
        public int? MaintenanceReviewMileage { get; set; }
        public string Status { get; set; }
    }
}

