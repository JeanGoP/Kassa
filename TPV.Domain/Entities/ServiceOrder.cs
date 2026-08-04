using System;
using TPV.Domain.Common;

namespace TPV.Domain.Entities
{
    public class ServiceOrder : BaseEntity, IMustHaveTenant
    {
        public int TenantId { get; set; }
        public int? BranchId { get; set; }
        public Branch? Branch { get; set; }
        public int CustomerId { get; set; }
        public Customer Customer { get; set; }
        public int? VehicleId { get; set; }
        public Vehicle? Vehicle { get; set; }
        public string? ChassisNumber { get; set; }
        public string? EngineNumber { get; set; }
        public string Plate { get; set; }
        public int? BrandId { get; set; }
        public Brand? BrandCatalog { get; set; }
        public int? VehicleModelId { get; set; }
        public VehicleModel? VehicleModel { get; set; }
        public string Brand { get; set; }
        public string Model { get; set; }
        public int Year { get; set; }
        public decimal Mileage { get; set; }
        public int? MaintenanceReviewMileage { get; set; }
        public DateTime IntakeDateTime { get; set; }
        public string FuelLevel { get; set; }
        public string InitialObservations { get; set; }
        public string VisualCondition { get; set; }
        public string? VisualEvidenceImagesJson { get; set; }
        public string? IntakeCustomerSignatureDataUrl { get; set; }
        public string Technician { get; set; }
        public string? WorkshopManager { get; set; }
        public string Status { get; set; }
        public DateTime? ExitDateTime { get; set; }
        public string? DeliveryNotes { get; set; }
        public string? CloseType { get; set; }
        public string? CloseReason { get; set; }
        public string? CustomerSignatureName { get; set; }
        public string? SpecialCloseSupervisorName { get; set; }

        // Invoicing
        public decimal LaborCost { get; set; }
        public Sale Sale { get; set; }
    }
}
