using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Collections.Generic;
using System.Threading.Tasks;
using TPV.Application.DTOs;
using TPV.Application.Interfaces;

namespace TPV.Web.Controllers.Api
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class TechniciansController : ControllerBase
    {
        private readonly ITechnicianService _service;

        public TechniciansController(ITechnicianService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<TechnicianDto>>> GetAll([FromQuery] string? search)
        {
            return Ok(await _service.GetAllAsync(search));
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<TechnicianDto>> GetById(int id)
        {
            var technician = await _service.GetByIdAsync(id);
            if (technician == null) return NotFound();
            return Ok(technician);
        }

        [HttpPost]
        public async Task<ActionResult<TechnicianDto>> Create(CreateTechnicianDto dto)
        {
            var created = await _service.CreateAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, CreateTechnicianDto dto)
        {
            await _service.UpdateAsync(id, dto);
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            await _service.DeleteAsync(id);
            return NoContent();
        }
    }
}

