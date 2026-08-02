using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using TPV.Application.DTOs;
using TPV.Application.Interfaces;
using TPV.Infrastructure.Identity;

namespace TPV.Web.Controllers.Api
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Policy = Permissions.MenusAppointmentsView)]
    public class AppointmentsController : ControllerBase
    {
        private readonly IAppointmentService _appointmentService;

        public AppointmentsController(IAppointmentService appointmentService)
        {
            _appointmentService = appointmentService;
        }

        [HttpGet("schedules")]
        public async Task<ActionResult<IEnumerable<AppointmentScheduleDto>>> GetSchedules()
        {
            return Ok(await _appointmentService.GetSchedulesAsync());
        }

        [HttpGet("schedules/{id}")]
        public async Task<ActionResult<AppointmentScheduleDto>> GetSchedule(int id)
        {
            var schedule = await _appointmentService.GetScheduleByIdAsync(id);
            if (schedule == null) return NotFound();
            return Ok(schedule);
        }

        [HttpPost("schedules")]
        public async Task<ActionResult<AppointmentScheduleDto>> CreateSchedule(CreateAppointmentScheduleDto dto)
        {
            try
            {
                var created = await _appointmentService.CreateScheduleAsync(dto);
                return CreatedAtAction(nameof(GetSchedule), new { id = created.Id }, created);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("schedules/{id}")]
        public async Task<IActionResult> UpdateSchedule(int id, CreateAppointmentScheduleDto dto)
        {
            try
            {
                await _appointmentService.UpdateScheduleAsync(id, dto);
                return NoContent();
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("schedules/{id}")]
        public async Task<IActionResult> DeleteSchedule(int id)
        {
            try
            {
                await _appointmentService.DeleteScheduleAsync(id);
                return NoContent();
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<AppointmentDto>>> GetAppointments([FromQuery] int? scheduleId, [FromQuery] DateTime? from, [FromQuery] DateTime? to)
        {
            return Ok(await _appointmentService.GetAppointmentsAsync(scheduleId, from, to));
        }

        [HttpPost]
        public async Task<ActionResult<AppointmentDto>> CreateAppointment(CreateAppointmentDto dto)
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                var created = await _appointmentService.CreateAppointmentAsync(dto, userId);
                return Ok(created);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPatch("{id}/status")]
        public async Task<IActionResult> UpdateStatus(int id, AppointmentStatusDto dto)
        {
            try
            {
                await _appointmentService.UpdateStatusAsync(id, dto.Status);
                return NoContent();
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("schedules/{id}/availability")]
        public async Task<ActionResult<IEnumerable<AppointmentAvailabilityDayDto>>> GetAvailability(int id, [FromQuery] DateTime? from, [FromQuery] DateTime? to, [FromQuery] string? serviceType)
        {
            try
            {
                var start = from ?? DateTime.Today;
                var end = to ?? start.AddDays(14);
                return Ok(await _appointmentService.GetAvailabilityAsync(id, start, end, serviceType));
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("public/{slug}")]
        [AllowAnonymous]
        public async Task<ActionResult<PublicBookingInfoDto>> GetPublicInfo(string slug)
        {
            var info = await _appointmentService.GetPublicBookingInfoAsync(slug);
            if (info == null) return NotFound();
            return Ok(info);
        }

        [HttpGet("public/{slug}/availability")]
        [AllowAnonymous]
        public async Task<ActionResult<IEnumerable<AppointmentAvailabilityDayDto>>> GetPublicAvailability(string slug, [FromQuery] DateTime? from, [FromQuery] DateTime? to, [FromQuery] string? serviceType)
        {
            try
            {
                var start = from ?? DateTime.Today;
                var end = to ?? start.AddDays(14);
                return Ok(await _appointmentService.GetPublicAvailabilityAsync(slug, start, end, serviceType));
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("public/{slug}/book")]
        [AllowAnonymous]
        public async Task<ActionResult<AppointmentDto>> CreatePublicAppointment(string slug, PublicCreateAppointmentDto dto)
        {
            try
            {
                return Ok(await _appointmentService.CreatePublicAppointmentAsync(slug, dto));
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
