using System;
using System.Collections.Generic;

namespace TPV.Application.DTOs
{
    public class AppointmentScheduleDto
    {
        public int Id { get; set; }
        public int BranchId { get; set; }
        public string BranchName { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string PublicSlug { get; set; } = string.Empty;
        public string CalendarProvider { get; set; } = "Internal";
        public string? ExternalCalendarId { get; set; }
        public int SlotDurationMinutes { get; set; }
        public int MaxAppointmentsPerSlot { get; set; }
        public int AdvanceBookingDays { get; set; }
        public int MinNoticeHours { get; set; }
        public string TimeZone { get; set; } = "America/Bogota";
        public bool IsPublicBookingEnabled { get; set; }
        public string PublicBookingPath { get; set; } = string.Empty;
        public List<AppointmentAvailabilityRuleDto> AvailabilityRules { get; set; } = new();
    }

    public class CreateAppointmentScheduleDto
    {
        public int BranchId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? PublicSlug { get; set; }
        public string CalendarProvider { get; set; } = "Internal";
        public string? ExternalCalendarId { get; set; }
        public int SlotDurationMinutes { get; set; } = 60;
        public int MaxAppointmentsPerSlot { get; set; } = 1;
        public int AdvanceBookingDays { get; set; } = 30;
        public int MinNoticeHours { get; set; } = 2;
        public string TimeZone { get; set; } = "America/Bogota";
        public bool IsPublicBookingEnabled { get; set; } = true;
        public List<AppointmentAvailabilityRuleDto> AvailabilityRules { get; set; } = new();
    }

    public class AppointmentAvailabilityRuleDto
    {
        public int Id { get; set; }
        public int DayOfWeek { get; set; }
        public string StartTime { get; set; } = "08:00";
        public string EndTime { get; set; } = "17:00";
    }

    public class AppointmentDto
    {
        public int Id { get; set; }
        public int AppointmentScheduleId { get; set; }
        public string ScheduleName { get; set; } = string.Empty;
        public int BranchId { get; set; }
        public string BranchName { get; set; } = string.Empty;
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
    }

    public class CreateAppointmentDto
    {
        public int AppointmentScheduleId { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public string CustomerPhone { get; set; } = string.Empty;
        public string? CustomerEmail { get; set; }
        public string ServiceType { get; set; } = string.Empty;
        public string? VehiclePlate { get; set; }
        public string? VehicleBrand { get; set; }
        public string? VehicleModel { get; set; }
        public string? Notes { get; set; }
        public DateTime StartAt { get; set; }
    }

    public class PublicCreateAppointmentDto
    {
        public string CustomerName { get; set; } = string.Empty;
        public string CustomerPhone { get; set; } = string.Empty;
        public string? CustomerEmail { get; set; }
        public string ServiceType { get; set; } = string.Empty;
        public string? VehiclePlate { get; set; }
        public string? VehicleBrand { get; set; }
        public string? VehicleModel { get; set; }
        public string? Notes { get; set; }
        public DateTime StartAt { get; set; }
    }

    public class AppointmentStatusDto
    {
        public string Status { get; set; } = "Confirmed";
    }

    public class AppointmentAvailabilityDayDto
    {
        public string Date { get; set; } = string.Empty;
        public string Label { get; set; } = string.Empty;
        public List<AppointmentAvailabilitySlotDto> Slots { get; set; } = new();
    }

    public class AppointmentAvailabilitySlotDto
    {
        public DateTime StartAt { get; set; }
        public DateTime EndAt { get; set; }
        public string Time { get; set; } = string.Empty;
        public int AvailableCapacity { get; set; }
    }

    public class PublicBookingInfoDto
    {
        public string BusinessName { get; set; } = string.Empty;
        public string? BusinessPhone { get; set; }
        public string? BusinessEmail { get; set; }
        public string ScheduleName { get; set; } = string.Empty;
        public string BranchName { get; set; } = string.Empty;
        public string? BranchAddress { get; set; }
        public string? BranchCity { get; set; }
        public string? BranchDepartment { get; set; }
        public int AdvanceBookingDays { get; set; }
        public int SlotDurationMinutes { get; set; }
        public string TimeZone { get; set; } = "America/Bogota";
    }
}
