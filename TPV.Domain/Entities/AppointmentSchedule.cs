using System.Collections.Generic;
using TPV.Domain.Common;

namespace TPV.Domain.Entities
{
    public class AppointmentSchedule : BaseEntity, IMustHaveTenant
    {
        public int TenantId { get; set; }
        public int BranchId { get; set; }
        public Branch Branch { get; set; } = null!;
        public string Name { get; set; } = string.Empty;
        public string PublicSlug { get; set; } = string.Empty;
        public string CalendarProvider { get; set; } = "Internal";
        public string? ExternalCalendarId { get; set; }
        public int SlotDurationMinutes { get; set; } = 60;
        public int MaxAppointmentsPerSlot { get; set; } = 1;
        public int AdvanceBookingDays { get; set; } = 30;
        public int MinNoticeHours { get; set; } = 2;
        public string TimeZone { get; set; } = "America/Bogota";
        public bool IsPublicBookingEnabled { get; set; } = true;

        public ICollection<AppointmentAvailabilityRule> AvailabilityRules { get; set; } = new List<AppointmentAvailabilityRule>();
        public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
    }
}
