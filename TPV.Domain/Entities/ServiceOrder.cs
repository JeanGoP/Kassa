using System;
using TPV.Domain.Common;

namespace TPV.Domain.Entities
{
    public class ServiceOrder : BaseEntity
    {
        public int CustomerId { get; set; }
        public Customer Customer { get; set; }
        public string Plate { get; set; }
        public string Brand { get; set; }
        public string Model { get; set; }
        public int Year { get; set; }
        public decimal Mileage { get; set; }
        public DateTime IntakeDateTime { get; set; }
        public string FuelLevel { get; set; }
        public string InitialObservations { get; set; }
        public string VisualCondition { get; set; }
        public string Technician { get; set; }
        public string? WorkshopManager { get; set; }
        public string Status { get; set; } // ABIERTA, etc.
    }
}
