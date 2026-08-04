using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TPV.Application.DTOs;
using TPV.Application.Interfaces;

namespace TPV.Web.Controllers.Api
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class WorkshopManagersController : ControllerBase
    {
        private readonly IWorkshopManagerService _service;

        public WorkshopManagersController(IWorkshopManagerService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<WorkshopManagerDto>>> GetAll([FromQuery] string? search)
        {
            return Ok(await _service.GetAllAsync(search));
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<WorkshopManagerDto>> GetById(int id)
        {
            var manager = await _service.GetByIdAsync(id);
            if (manager == null) return NotFound();
            return Ok(manager);
        }

        [HttpPost]
        public async Task<ActionResult<WorkshopManagerDto>> Create(CreateWorkshopManagerDto dto)
        {
            var created = await _service.CreateAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, CreateWorkshopManagerDto dto)
        {
            await _service.UpdateAsync(id, dto);
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                await _service.DeleteAsync(id);
                return NoContent();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
