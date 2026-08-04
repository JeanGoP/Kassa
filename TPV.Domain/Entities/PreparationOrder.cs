using System;
using System.Collections.Generic;
using TPV.Domain.Common;

namespace TPV.Domain.Entities
{
    public class PreparationOrder : BaseEntity, IMustHaveTenant
    {
        public int TenantId { get; set; }
        public string OrderNumber { get; set; }
        public string? CommercialDocumentReference { get; set; }
        public int BranchId { get; set; }
        public Branch Branch { get; set; }
        public int? CustomerId { get; set; }
        public Customer? Customer { get; set; }
        public int? VehicleId { get; set; }
        public Vehicle? Vehicle { get; set; }
        public string? RequestedByUserId { get; set; }
        public DateTime RequestedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public string Status { get; set; }
        public string ChassisNumber { get; set; }
        public string? EngineNumber { get; set; }
        public string? Plate { get; set; }
        public int? BrandId { get; set; }
        public Brand? BrandCatalog { get; set; }
        public int? VehicleModelId { get; set; }
        public VehicleModel? VehicleModel { get; set; }
        public string Brand { get; set; }
        public string Model { get; set; }
        public int? Year { get; set; }
        public decimal? Mileage { get; set; }
        public string? ExecutedBy { get; set; }
        public string? Findings { get; set; }
        public bool WarrantyOpened { get; set; }
        public int? WarrantyId { get; set; }
        public Warranty? Warranty { get; set; }
        public string? Notes { get; set; }
        public ICollection<PreparationOrderItem> Items { get; set; } = new List<PreparationOrderItem>();
    }
}
