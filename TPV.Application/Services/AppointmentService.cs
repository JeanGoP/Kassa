using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using TPV.Application.DTOs;
using TPV.Application.Interfaces;
using TPV.Domain.Entities;
using TPV.Domain.Interfaces;

namespace TPV.Application.Services
{
    public class AppointmentService : IAppointmentService
    {
        private readonly IRepository<AppointmentSchedule> _scheduleRepository;
        private readonly IRepository<AppointmentAvailabilityRule> _ruleRepository;
        private readonly IRepository<Appointment> _appointmentRepository;
        private readonly IRepository<Branch> _branchRepository;
        private readonly IRepository<Tenant> _tenantRepository;
        private readonly ICurrentTenantService _currentTenantService;

        public AppointmentService(
            IRepository<AppointmentSchedule> scheduleRepository,
            IRepository<AppointmentAvailabilityRule> ruleRepository,
            IRepository<Appointment> appointmentRepository,
            IRepository<Branch> branchRepository,
            IRepository<Tenant> tenantRepository,
            ICurrentTenantService currentTenantService)
        {
            _scheduleRepository = scheduleRepository;
            _ruleRepository = ruleRepository;
            _appointmentRepository = appointmentRepository;
            _branchRepository = branchRepository;
            _tenantRepository = tenantRepository;
            _currentTenantService = currentTenantService;
        }

        public async Task<IEnumerable<AppointmentScheduleDto>> GetSchedulesAsync()
        {
            var schedules = await _scheduleRepository.GetAsync(
                predicate: s => s.IsActive,
                orderBy: q => q.OrderBy(s => s.Branch.Name).ThenBy(s => s.Name),
                includeString: "Branch,AvailabilityRules");

            return schedules.Select(MapScheduleToDto);
        }

        public async Task<AppointmentScheduleDto?> GetScheduleByIdAsync(int id)
        {
            var schedule = await GetScheduleEntityAsync(id);
            return schedule == null ? null : MapScheduleToDto(schedule);
        }

        public async Task<AppointmentScheduleDto> CreateScheduleAsync(CreateAppointmentScheduleDto dto)
        {
            var branch = await GetBranchAsync(dto.BranchId);
            var tenantId = ResolveTenantId(branch);
            var slug = await BuildUniqueSlugAsync(dto.PublicSlug, dto.Name, branch.Name);

            var schedule = new AppointmentSchedule
            {
                TenantId = tenantId,
                BranchId = branch.Id,
                Name = CleanRequired(dto.Name, "El nombre de la agenda es obligatorio."),
                PublicSlug = slug,
                CalendarProvider = NormalizeProvider(dto.CalendarProvider),
                ExternalCalendarId = string.IsNullOrWhiteSpace(dto.ExternalCalendarId) ? null : dto.ExternalCalendarId.Trim(),
                SlotDurationMinutes = Clamp(dto.SlotDurationMinutes, 15, 240),
                MaxAppointmentsPerSlot = Clamp(dto.MaxAppointmentsPerSlot, 1, 20),
                AdvanceBookingDays = Clamp(dto.AdvanceBookingDays, 1, 180),
                MinNoticeHours = Clamp(dto.MinNoticeHours, 0, 240),
                TimeZone = string.IsNullOrWhiteSpace(dto.TimeZone) ? "America/Bogota" : dto.TimeZone.Trim(),
                IsPublicBookingEnabled = dto.IsPublicBookingEnabled
            };

            await _scheduleRepository.AddAsync(schedule);

            foreach (var rule in NormalizeRules(dto.AvailabilityRules))
            {
                await _ruleRepository.AddAsync(new AppointmentAvailabilityRule
                {
                    TenantId = tenantId,
                    AppointmentScheduleId = schedule.Id,
                    DayOfWeek = rule.DayOfWeek,
                    StartTime = ParseTime(rule.StartTime),
                    EndTime = ParseTime(rule.EndTime)
                });
            }

            return (await GetScheduleByIdAsync(schedule.Id))!;
        }

        public async Task UpdateScheduleAsync(int id, CreateAppointmentScheduleDto dto)
        {
            var schedule = (await _scheduleRepository.GetAsync(
                predicate: s => s.Id == id && s.IsActive,
                includeString: "AvailabilityRules",
                disableTracking: false)).FirstOrDefault();

            if (schedule == null) throw new Exception("Agenda no encontrada.");

            var branch = await GetBranchAsync(dto.BranchId);
            var tenantId = ResolveTenantId(branch);

            schedule.TenantId = tenantId;
            schedule.BranchId = branch.Id;
            schedule.Name = CleanRequired(dto.Name, "El nombre de la agenda es obligatorio.");
            schedule.PublicSlug = await BuildUniqueSlugAsync(dto.PublicSlug, dto.Name, branch.Name, schedule.Id);
            schedule.CalendarProvider = NormalizeProvider(dto.CalendarProvider);
            schedule.ExternalCalendarId = string.IsNullOrWhiteSpace(dto.ExternalCalendarId) ? null : dto.ExternalCalendarId.Trim();
            schedule.SlotDurationMinutes = Clamp(dto.SlotDurationMinutes, 15, 240);
            schedule.MaxAppointmentsPerSlot = Clamp(dto.MaxAppointmentsPerSlot, 1, 20);
            schedule.AdvanceBookingDays = Clamp(dto.AdvanceBookingDays, 1, 180);
            schedule.MinNoticeHours = Clamp(dto.MinNoticeHours, 0, 240);
            schedule.TimeZone = string.IsNullOrWhiteSpace(dto.TimeZone) ? "America/Bogota" : dto.TimeZone.Trim();
            schedule.IsPublicBookingEnabled = dto.IsPublicBookingEnabled;
            schedule.UpdatedAt = DateTime.UtcNow;

            var oldRules = schedule.AvailabilityRules.ToList();
            foreach (var rule in oldRules)
            {
                await _ruleRepository.DeleteAsync(rule);
            }

            await _scheduleRepository.UpdateAsync(schedule);

            foreach (var rule in NormalizeRules(dto.AvailabilityRules))
            {
                await _ruleRepository.AddAsync(new AppointmentAvailabilityRule
                {
                    TenantId = tenantId,
                    AppointmentScheduleId = schedule.Id,
                    DayOfWeek = rule.DayOfWeek,
                    StartTime = ParseTime(rule.StartTime),
                    EndTime = ParseTime(rule.EndTime)
                });
            }
        }

        public async Task DeleteScheduleAsync(int id)
        {
            var schedule = (await _scheduleRepository.GetAsync(
                predicate: s => s.Id == id && s.IsActive,
                disableTracking: false)).FirstOrDefault();

            if (schedule == null) throw new Exception("Agenda no encontrada.");

            schedule.IsActive = false;
            schedule.UpdatedAt = DateTime.UtcNow;
            await _scheduleRepository.UpdateAsync(schedule);
        }

        public async Task<IEnumerable<AppointmentDto>> GetAppointmentsAsync(int? scheduleId, DateTime? from, DateTime? to)
        {
            var start = (from ?? DateTime.Today).Date;
            var end = (to ?? start.AddDays(30)).Date.AddDays(1);

            var appointments = await _appointmentRepository.GetAsync(
                predicate: a => a.IsActive &&
                    (!scheduleId.HasValue || a.AppointmentScheduleId == scheduleId.Value) &&
                    a.StartAt >= start &&
                    a.StartAt < end,
                orderBy: q => q.OrderBy(a => a.StartAt),
                includeString: "AppointmentSchedule,Branch");

            return appointments.Select(MapAppointmentToDto);
        }

        public async Task<AppointmentDto> CreateAppointmentAsync(CreateAppointmentDto dto, string? createdByUserId)
        {
            var schedule = await GetScheduleEntityAsync(dto.AppointmentScheduleId)
                ?? throw new Exception("Agenda no encontrada.");

            var appointment = await BuildAppointmentAsync(
                schedule,
                dto.CustomerName,
                dto.CustomerPhone,
                dto.CustomerEmail,
                dto.ServiceType,
                dto.VehiclePlate,
                dto.VehicleBrand,
                dto.VehicleModel,
                dto.Notes,
                dto.StartAt,
                "Internal",
                "Confirmed",
                createdByUserId);

            await _appointmentRepository.AddAsync(appointment);
            return MapAppointmentToDto((await GetAppointmentEntityAsync(appointment.Id))!);
        }

        public async Task UpdateStatusAsync(int id, string status)
        {
            var appointment = (await _appointmentRepository.GetAsync(
                predicate: a => a.Id == id && a.IsActive,
                disableTracking: false)).FirstOrDefault();

            if (appointment == null) throw new Exception("Cita no encontrada.");

            appointment.Status = NormalizeStatus(status);
            appointment.UpdatedAt = DateTime.UtcNow;
            await _appointmentRepository.UpdateAsync(appointment);
        }

        public async Task<IEnumerable<AppointmentAvailabilityDayDto>> GetAvailabilityAsync(int scheduleId, DateTime from, DateTime to)
        {
            var schedule = await GetScheduleEntityAsync(scheduleId)
                ?? throw new Exception("Agenda no encontrada.");

            return await BuildAvailabilityAsync(schedule, from, to);
        }

        public async Task<PublicBookingInfoDto?> GetPublicBookingInfoAsync(string slug)
        {
            var schedule = await FindPublicScheduleAsync(slug);
            if (schedule == null) return null;

            var tenant = await _tenantRepository.GetByIdAsync(schedule.TenantId);
            return new PublicBookingInfoDto
            {
                BusinessName = tenant?.Name ?? schedule.Branch.Name,
                BusinessPhone = tenant?.Phone,
                BusinessEmail = tenant?.Email,
                ScheduleName = schedule.Name,
                BranchName = schedule.Branch.Name,
                BranchAddress = schedule.Branch.Address,
                BranchCity = schedule.Branch.City,
                BranchDepartment = schedule.Branch.Department,
                AdvanceBookingDays = schedule.AdvanceBookingDays,
                SlotDurationMinutes = schedule.SlotDurationMinutes,
                TimeZone = schedule.TimeZone
            };
        }

        public async Task<IEnumerable<AppointmentAvailabilityDayDto>> GetPublicAvailabilityAsync(string slug, DateTime from, DateTime to)
        {
            var schedule = await FindPublicScheduleAsync(slug)
                ?? throw new Exception("Agenda pública no encontrada.");

            return await BuildAvailabilityAsync(schedule, from, to);
        }

        public async Task<AppointmentDto> CreatePublicAppointmentAsync(string slug, PublicCreateAppointmentDto dto)
        {
            var schedule = await FindPublicScheduleAsync(slug)
                ?? throw new Exception("Agenda pública no encontrada.");

            var appointment = await BuildAppointmentAsync(
                schedule,
                dto.CustomerName,
                dto.CustomerPhone,
                dto.CustomerEmail,
                dto.ServiceType,
                dto.VehiclePlate,
                dto.VehicleBrand,
                dto.VehicleModel,
                dto.Notes,
                dto.StartAt,
                "PublicLink",
                "Pending",
                null);

            await _appointmentRepository.AddAsync(appointment);
            return MapAppointmentToDto((await GetAppointmentEntityAsync(appointment.Id))!);
        }

        private async Task<Appointment> BuildAppointmentAsync(
            AppointmentSchedule schedule,
            string customerName,
            string customerPhone,
            string? customerEmail,
            string serviceType,
            string? vehiclePlate,
            string? vehicleBrand,
            string? vehicleModel,
            string? notes,
            DateTime startAt,
            string source,
            string status,
            string? createdByUserId)
        {
            if (startAt == default) throw new Exception("Debes seleccionar fecha y hora.");

            var endAt = startAt.AddMinutes(schedule.SlotDurationMinutes);
            if (!await IsSlotAvailableAsync(schedule, startAt, endAt))
            {
                throw new Exception("El horario seleccionado ya no está disponible.");
            }

            return new Appointment
            {
                TenantId = schedule.TenantId,
                AppointmentScheduleId = schedule.Id,
                BranchId = schedule.BranchId,
                CustomerName = CleanRequired(customerName, "El nombre de la persona es obligatorio."),
                CustomerPhone = CleanRequired(customerPhone, "El teléfono es obligatorio."),
                CustomerEmail = string.IsNullOrWhiteSpace(customerEmail) ? null : customerEmail.Trim(),
                ServiceType = CleanRequired(serviceType, "El tipo de servicio es obligatorio."),
                VehiclePlate = CleanOptional(vehiclePlate)?.ToUpperInvariant(),
                VehicleBrand = CleanOptional(vehicleBrand),
                VehicleModel = CleanOptional(vehicleModel),
                Notes = CleanOptional(notes),
                StartAt = startAt,
                EndAt = endAt,
                Source = source,
                Status = NormalizeStatus(status),
                ConfirmationCode = GenerateConfirmationCode(),
                CreatedByUserId = createdByUserId
            };
        }

        private async Task<bool> IsSlotAvailableAsync(AppointmentSchedule schedule, DateTime startAt, DateTime endAt)
        {
            var days = await BuildAvailabilityAsync(schedule, startAt.Date, startAt.Date);
            return days.SelectMany(d => d.Slots).Any(s => s.StartAt == startAt && s.EndAt == endAt && s.AvailableCapacity > 0);
        }

        private async Task<IEnumerable<AppointmentAvailabilityDayDto>> BuildAvailabilityAsync(AppointmentSchedule schedule, DateTime from, DateTime to)
        {
            var nowLimit = DateTime.Now.AddHours(schedule.MinNoticeHours);
            var firstDate = MaxDate(from.Date, DateTime.Today);
            var lastAllowedDate = DateTime.Today.AddDays(schedule.AdvanceBookingDays);
            var lastDate = MinDate(to.Date, lastAllowedDate);

            if (lastDate < firstDate) return Enumerable.Empty<AppointmentAvailabilityDayDto>();

            var appointments = await _appointmentRepository.GetAsync(
                predicate: a => a.IsActive &&
                    a.AppointmentScheduleId == schedule.Id &&
                    (a.Status == "Pending" || a.Status == "Confirmed") &&
                    a.StartAt < lastDate.AddDays(1) &&
                    a.EndAt > firstDate);

            var rules = schedule.AvailabilityRules
                .Where(r => r.IsActive)
                .OrderBy(r => r.StartTime)
                .ToList();

            var days = new List<AppointmentAvailabilityDayDto>();
            var culture = CultureInfo.GetCultureInfo("es-CO");

            for (var date = firstDate; date <= lastDate; date = date.AddDays(1))
            {
                var slots = new List<AppointmentAvailabilitySlotDto>();
                var dayRules = rules.Where(r => r.DayOfWeek == (int)date.DayOfWeek).ToList();

                foreach (var rule in dayRules)
                {
                    var cursor = date.Add(rule.StartTime);
                    var endLimit = date.Add(rule.EndTime);

                    while (cursor.AddMinutes(schedule.SlotDurationMinutes) <= endLimit)
                    {
                        var slotEnd = cursor.AddMinutes(schedule.SlotDurationMinutes);
                        var reservedCount = appointments.Count(a => a.StartAt < slotEnd && a.EndAt > cursor);
                        var available = schedule.MaxAppointmentsPerSlot - reservedCount;

                        if (cursor >= nowLimit && available > 0)
                        {
                            slots.Add(new AppointmentAvailabilitySlotDto
                            {
                                StartAt = cursor,
                                EndAt = slotEnd,
                                Time = cursor.ToString("HH:mm", CultureInfo.InvariantCulture),
                                AvailableCapacity = available
                            });
                        }

                        cursor = cursor.AddMinutes(schedule.SlotDurationMinutes);
                    }
                }

                days.Add(new AppointmentAvailabilityDayDto
                {
                    Date = date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                    Label = culture.TextInfo.ToTitleCase(date.ToString("dddd dd MMM", culture)),
                    Slots = slots.OrderBy(s => s.StartAt).ToList()
                });
            }

            return days;
        }

        private async Task<AppointmentSchedule?> GetScheduleEntityAsync(int id)
        {
            return (await _scheduleRepository.GetAsync(
                predicate: s => s.Id == id && s.IsActive,
                includeString: "Branch,AvailabilityRules")).FirstOrDefault();
        }

        private async Task<AppointmentSchedule?> FindPublicScheduleAsync(string slug)
        {
            var normalizedSlug = NormalizeSlug(slug);
            if (string.IsNullOrWhiteSpace(normalizedSlug)) return null;

            return (await _scheduleRepository.GetAsync(
                predicate: s => s.IsActive && s.IsPublicBookingEnabled && s.PublicSlug == normalizedSlug,
                includeString: "Branch,AvailabilityRules")).FirstOrDefault();
        }

        private async Task<Appointment?> GetAppointmentEntityAsync(int id)
        {
            return (await _appointmentRepository.GetAsync(
                predicate: a => a.Id == id,
                includeString: "AppointmentSchedule,Branch")).FirstOrDefault();
        }

        private async Task<Branch> GetBranchAsync(int branchId)
        {
            var branch = (await _branchRepository.GetAsync(b => b.Id == branchId)).FirstOrDefault();
            return branch ?? throw new Exception("Sucursal no encontrada.");
        }

        private int ResolveTenantId(Branch branch)
        {
            var tenantId = _currentTenantService.TenantId ?? branch.TenantId;
            if (tenantId <= 0) throw new Exception("No se pudo determinar la empresa de la agenda.");
            return tenantId;
        }

        private AppointmentScheduleDto MapScheduleToDto(AppointmentSchedule schedule)
        {
            return new AppointmentScheduleDto
            {
                Id = schedule.Id,
                BranchId = schedule.BranchId,
                BranchName = schedule.Branch?.Name ?? string.Empty,
                Name = schedule.Name,
                PublicSlug = schedule.PublicSlug,
                CalendarProvider = schedule.CalendarProvider,
                ExternalCalendarId = schedule.ExternalCalendarId,
                SlotDurationMinutes = schedule.SlotDurationMinutes,
                MaxAppointmentsPerSlot = schedule.MaxAppointmentsPerSlot,
                AdvanceBookingDays = schedule.AdvanceBookingDays,
                MinNoticeHours = schedule.MinNoticeHours,
                TimeZone = schedule.TimeZone,
                IsPublicBookingEnabled = schedule.IsPublicBookingEnabled,
                PublicBookingPath = $"/reservar/{schedule.PublicSlug}",
                AvailabilityRules = schedule.AvailabilityRules
                    .Where(r => r.IsActive)
                    .OrderBy(r => r.DayOfWeek)
                    .ThenBy(r => r.StartTime)
                    .Select(r => new AppointmentAvailabilityRuleDto
                    {
                        Id = r.Id,
                        DayOfWeek = r.DayOfWeek,
                        StartTime = r.StartTime.ToString(@"hh\:mm", CultureInfo.InvariantCulture),
                        EndTime = r.EndTime.ToString(@"hh\:mm", CultureInfo.InvariantCulture)
                    })
                    .ToList()
            };
        }

        private static AppointmentDto MapAppointmentToDto(Appointment appointment)
        {
            return new AppointmentDto
            {
                Id = appointment.Id,
                AppointmentScheduleId = appointment.AppointmentScheduleId,
                ScheduleName = appointment.AppointmentSchedule?.Name ?? string.Empty,
                BranchId = appointment.BranchId,
                BranchName = appointment.Branch?.Name ?? string.Empty,
                CustomerName = appointment.CustomerName,
                CustomerPhone = appointment.CustomerPhone,
                CustomerEmail = appointment.CustomerEmail,
                ServiceType = appointment.ServiceType,
                VehiclePlate = appointment.VehiclePlate,
                VehicleBrand = appointment.VehicleBrand,
                VehicleModel = appointment.VehicleModel,
                Notes = appointment.Notes,
                StartAt = appointment.StartAt,
                EndAt = appointment.EndAt,
                Status = appointment.Status,
                Source = appointment.Source,
                ConfirmationCode = appointment.ConfirmationCode
            };
        }

        private async Task<string> BuildUniqueSlugAsync(string? requestedSlug, string scheduleName, string branchName, int? currentScheduleId = null)
        {
            var baseSlug = NormalizeSlug(requestedSlug);
            if (string.IsNullOrWhiteSpace(baseSlug))
            {
                baseSlug = NormalizeSlug($"{branchName}-{scheduleName}");
            }
            if (string.IsNullOrWhiteSpace(baseSlug))
            {
                baseSlug = "agenda";
            }

            var slug = baseSlug;
            var counter = 2;

            while ((await _scheduleRepository.GetAsync(s => s.PublicSlug == slug && (!currentScheduleId.HasValue || s.Id != currentScheduleId.Value))).Any())
            {
                slug = $"{baseSlug}-{counter}";
                counter++;
            }

            return slug;
        }

        private static List<AppointmentAvailabilityRuleDto> NormalizeRules(List<AppointmentAvailabilityRuleDto> rules)
        {
            var normalized = rules?.Where(r => r != null).ToList() ?? new List<AppointmentAvailabilityRuleDto>();
            if (!normalized.Any())
            {
                normalized = new List<AppointmentAvailabilityRuleDto>
                {
                    new() { DayOfWeek = 1, StartTime = "08:00", EndTime = "17:00" },
                    new() { DayOfWeek = 2, StartTime = "08:00", EndTime = "17:00" },
                    new() { DayOfWeek = 3, StartTime = "08:00", EndTime = "17:00" },
                    new() { DayOfWeek = 4, StartTime = "08:00", EndTime = "17:00" },
                    new() { DayOfWeek = 5, StartTime = "08:00", EndTime = "17:00" }
                };
            }

            foreach (var rule in normalized)
            {
                if (rule.DayOfWeek < 0 || rule.DayOfWeek > 6)
                {
                    throw new Exception("El día de atención no es válido.");
                }

                var start = ParseTime(rule.StartTime);
                var end = ParseTime(rule.EndTime);
                if (start >= end)
                {
                    throw new Exception("La hora inicial debe ser menor que la hora final.");
                }
            }

            return normalized;
        }

        private static TimeSpan ParseTime(string value)
        {
            if (TimeSpan.TryParse(value, CultureInfo.InvariantCulture, out var result))
            {
                return result;
            }

            throw new Exception("Formato de hora no válido.");
        }

        private static string NormalizeProvider(string provider)
        {
            var value = string.IsNullOrWhiteSpace(provider) ? "Internal" : provider.Trim();
            return value switch
            {
                "Microsoft365" => "Microsoft365",
                "Google" => "Google",
                _ => "Internal"
            };
        }

        private static string NormalizeStatus(string status)
        {
            var value = string.IsNullOrWhiteSpace(status) ? "Pending" : status.Trim();
            return value switch
            {
                "Confirmed" => "Confirmed",
                "Cancelled" => "Cancelled",
                "Completed" => "Completed",
                _ => "Pending"
            };
        }

        private static string CleanRequired(string value, string errorMessage)
        {
            if (string.IsNullOrWhiteSpace(value)) throw new Exception(errorMessage);
            return value.Trim();
        }

        private static string? CleanOptional(string? value)
        {
            return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
        }

        private static int Clamp(int value, int min, int max)
        {
            return Math.Min(Math.Max(value, min), max);
        }

        private static DateTime MaxDate(DateTime first, DateTime second)
        {
            return first >= second ? first : second;
        }

        private static DateTime MinDate(DateTime first, DateTime second)
        {
            return first <= second ? first : second;
        }

        private static string GenerateConfirmationCode()
        {
            return Guid.NewGuid().ToString("N")[..8].ToUpperInvariant();
        }

        private static string NormalizeSlug(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return string.Empty;

            var normalized = value.Trim().ToLowerInvariant().Normalize(NormalizationForm.FormD);
            var builder = new StringBuilder();
            foreach (var character in normalized)
            {
                if (CharUnicodeInfo.GetUnicodeCategory(character) != UnicodeCategory.NonSpacingMark)
                {
                    builder.Append(character);
                }
            }

            var slug = Regex.Replace(builder.ToString().Normalize(NormalizationForm.FormC), @"[^a-z0-9]+", "-");
            return slug.Trim('-');
        }
    }
}
