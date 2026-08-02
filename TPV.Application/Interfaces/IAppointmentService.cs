using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TPV.Application.DTOs;

namespace TPV.Application.Interfaces
{
    public interface IAppointmentService
    {
        Task<IEnumerable<AppointmentScheduleDto>> GetSchedulesAsync();
        Task<AppointmentScheduleDto?> GetScheduleByIdAsync(int id);
        Task<AppointmentScheduleDto> CreateScheduleAsync(CreateAppointmentScheduleDto dto);
        Task UpdateScheduleAsync(int id, CreateAppointmentScheduleDto dto);
        Task DeleteScheduleAsync(int id);
        Task<IEnumerable<AppointmentDto>> GetAppointmentsAsync(int? scheduleId, DateTime? from, DateTime? to);
        Task<AppointmentDto> CreateAppointmentAsync(CreateAppointmentDto dto, string? createdByUserId);
        Task UpdateStatusAsync(int id, string status);
        Task<IEnumerable<AppointmentAvailabilityDayDto>> GetAvailabilityAsync(int scheduleId, DateTime from, DateTime to, string? serviceType = null);
        Task<PublicBookingInfoDto?> GetPublicBookingInfoAsync(string slug);
        Task<IEnumerable<AppointmentAvailabilityDayDto>> GetPublicAvailabilityAsync(string slug, DateTime from, DateTime to, string? serviceType = null);
        Task<AppointmentDto> CreatePublicAppointmentAsync(string slug, PublicCreateAppointmentDto dto);
    }
}
