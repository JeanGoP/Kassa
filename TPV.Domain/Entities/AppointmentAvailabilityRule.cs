using System;
using TPV.Domain.Common;

namespace TPV.Domain.Entities
{
    public class AppointmentAvailabilityRule : BaseEntity, IMustHaveTenant
    {
        public int TenantId { get; set; }
        public int AppointmentScheduleId { get; set; }
        public AppointmentSchedule AppointmentSchedule { get; set; } = null!;
        public int DayOfWeek { get; set; }
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
    }
}
