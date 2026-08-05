using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
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
    public class WarrantiesController : ControllerBase
    {
        private readonly IWarrantyService _service;

        public WarrantiesController(IWarrantyService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<WarrantyDto>>> GetAll([FromQuery] string? plate)
        {
            return Ok(await _service.GetAllAsync(plate));
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<WarrantyDto>> GetById(int id)
        {
            var dto = await _service.GetByIdAsync(id);
            if (dto == null) return NotFound();
            return Ok(dto);
        }

        [HttpGet("active/{plate}")]
        public async Task<ActionResult<IEnumerable<WarrantyDto>>> GetActiveByPlate(string plate)
        {
            return Ok(await _service.GetActiveWarrantiesByPlateAsync(plate));
        }

        [HttpPost]
        public async Task<ActionResult<WarrantyDto>> Create(CreateWarrantyDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(userId)) return Unauthorized();
            try
            {
                var created = await _service.CreateAsync(dto, userId);
                return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
            }
            catch (UnauthorizedAccessException ex) { return StatusCode(403, new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<WarrantyDto>> Update(int id, CreateWarrantyDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(userId)) return Unauthorized();
            try
            {
                var updated = await _service.UpdateAsync(id, dto, userId);
                return updated == null ? NotFound() : Ok(updated);
            }
            catch (UnauthorizedAccessException ex) { return StatusCode(403, new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            await _service.DeleteAsync(id);
            return NoContent();
        }
    }
}
