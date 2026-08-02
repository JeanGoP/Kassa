using System;
using TPV.Domain.Common;

namespace TPV.Domain.Entities
{
    public class Appointment : BaseEntity, IMustHaveTenant
    {
        public int TenantId { get; set; }
        public int AppointmentScheduleId { get; set; }
        public AppointmentSchedule AppointmentSchedule { get; set; } = null!;
        public int BranchId { get; set; }
        public Branch Branch { get; set; } = null!;
        public string CustomerName { get; set; } = string.Empty;
        public string CustomerPhone { get; set; } = string.Empty;
        public string? CustomerEmail { get; set; }
        public string ServiceType { get; set; } = string.Empty;
        public string? VehiclePlate { get; set; }
        public string? VehicleBrand { get; set; }
        public string? VehicleModel { get; set; }
        public string? Notes { get; set; }
        public DateTime StartAt { get; set; }
        public DateTime EndAt { get; set; }
        public string Status { get; set; } = "Pending";
        public string Source { get; set; } = "Internal";
        public string ConfirmationCode { get; set; } = string.Empty;
        public string? CreatedByUserId { get; set; }
    }
}
