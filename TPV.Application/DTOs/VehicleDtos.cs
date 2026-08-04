using System;
using System.Collections.Generic;

namespace TPV.Application.DTOs
{
    public class VehicleDto
    {
        public int Id { get; set; }
        public int BranchId { get; set; }
        public string? BranchName { get; set; }
        public string ChassisNumber { get; set; } = string.Empty;
        public string? EngineNumber { get; set; }
        public string? Plate { get; set; }
        public string Brand { get; set; } = string.Empty;
        public string Model { get; set; } = string.Empty;
        public int? Year { get; set; }
        public DateTime? SaleDate { get; set; }
        public int? CurrentOwnerId { get; set; }
        public string? CurrentOwnerName { get; set; }
        public DateTime? OwnerSince { get; set; }
        public decimal? LastKnownMileage { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public List<VehicleOwnerHistoryDto> OwnerHistory { get; set; } = new();
        public List<VehicleServiceHistoryDto> ServiceHistory { get; set; } = new();
    }

    public class CreateVehicleDto
    {
        public int? BranchId { get; set; }
        public string ChassisNumber { get; set; } = string.Empty;
        public string? EngineNumber { get; set; }
        public string? Plate { get; set; }
        public string Brand { get; set; } = string.Empty;
        public string Model { get; set; } = string.Empty;
        public int? Year { get; set; }
        public DateTime? SaleDate { get; set; }
        public int? CurrentOwnerId { get; set; }
        public DateTime? OwnerSince { get; set; }
        public decimal? LastKnownMileage { get; set; }
    }

    public class RegisterVehicleOperationDto
    {
        public int TenantId { get; set; }
        public int BranchId { get; set; }
        public int? CustomerId { get; set; }
        public string ChassisNumber { get; set; } = string.Empty;
        public string? EngineNumber { get; set; }
        public string? Plate { get; set; }
        public string Brand { get; set; } = string.Empty;
        public string Model { get; set; } = string.Empty;
        public int? Year { get; set; }
        public decimal? Mileage { get; set; }
        public DateTime OperationDate { get; set; }
    }

    public class VehicleOwnerHistoryDto
    {
        public int Id { get; set; }
        public int CustomerId { get; set; }
        public string? CustomerIdentification { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public DateTime OwnedFrom { get; set; }
        public DateTime? OwnedUntil { get; set; }
    }

    public class VehicleServiceHistoryDto
    {
        public string Source { get; set; } = string.Empty;
        public int RecordId { get; set; }
        public string Number { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public decimal? Mileage { get; set; }
        public int BranchId { get; set; }
        public string? BranchName { get; set; }
        public string Status { get; set; } = string.Empty;
        public int? MaintenanceReviewMileage { get; set; }
    }
}
