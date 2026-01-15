using TPV.Domain.Common;

namespace TPV.Domain.Entities
{
    public class ServiceOrderWork : BaseEntity
    {
        public int ServiceOrderId { get; set; }
        public ServiceOrder ServiceOrder { get; set; }
        public string Description { get; set; }
        public string Technician { get; set; }
        public decimal? EstimatedTimeHours { get; set; }
        public decimal LaborCost { get; set; }
        public string Status { get; set; }
    }
}

