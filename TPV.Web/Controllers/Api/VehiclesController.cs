using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using TPV.Application.DTOs;
using TPV.Application.Interfaces;

namespace TPV.Web.Controllers.Api
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class VehiclesController : ControllerBase
    {
        private readonly IVehicleService _service;

        public VehiclesController(IVehicleService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<VehicleDto>>> GetAll([FromQuery] string? search) =>
            Ok(await _service.GetAllAsync(search));

        [HttpGet("{id}")]
        public async Task<ActionResult<VehicleDto>> GetById(int id)
        {
            var vehicle = await _service.GetByIdAsync(id);
            return vehicle == null ? NotFound() : Ok(vehicle);
        }

        [HttpPost]
        public async Task<ActionResult<VehicleDto>> Create(CreateVehicleDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Unauthorized();
            try
            {
                var vehicle = await _service.CreateAsync(dto, userId);
                return CreatedAtAction(nameof(GetById), new { id = vehicle.Id }, vehicle);
            }
            catch (UnauthorizedAccessException ex) { return StatusCode(403, new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<VehicleDto>> Update(int id, CreateVehicleDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Unauthorized();
            try
            {
                var vehicle = await _service.UpdateAsync(id, dto, userId);
                return vehicle == null ? NotFound() : Ok(vehicle);
            }
            catch (UnauthorizedAccessException ex) { return StatusCode(403, new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Deactivate(int id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Unauthorized();
            try
            {
                return await _service.DeactivateAsync(id, userId) ? NoContent() : NotFound();
            }
            catch (UnauthorizedAccessException ex) { return StatusCode(403, new { message = ex.Message }); }
        }
    }
}
