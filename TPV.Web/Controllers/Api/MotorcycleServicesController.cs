using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TPV.Application.DTOs;
using TPV.Application.Interfaces;
using TPV.Infrastructure.Identity;

namespace TPV.Web.Controllers.Api
{
    [Route("api/[controller]")]
    [ApiController]
    public class MotorcycleServicesController : ControllerBase
    {
        private readonly IMotorcycleServiceCatalogService _service;

        public MotorcycleServicesController(IMotorcycleServiceCatalogService service)
        {
            _service = service;
        }

        [HttpGet]
        [Authorize]
        public async Task<ActionResult<IEnumerable<MotorcycleServiceDto>>> GetAll([FromQuery] string? search)
        {
            return Ok(await _service.GetAllAsync(search));
        }

        [HttpGet("public/{slug}")]
        [AllowAnonymous]
        public async Task<ActionResult<IEnumerable<MotorcycleServiceDto>>> GetPublic(string slug, [FromQuery] string? search)
        {
            return Ok(await _service.GetPublicByScheduleSlugAsync(slug, search));
        }

        [HttpGet("{id}")]
        [Authorize(Policy = Permissions.MenusMotorcycleServicesView)]
        public async Task<ActionResult<MotorcycleServiceDto>> GetById(int id)
        {
            var service = await _service.GetByIdAsync(id);
            if (service == null) return NotFound();
            return Ok(service);
        }

        [HttpPost]
        [Authorize(Policy = Permissions.MenusMotorcycleServicesView)]
        public async Task<ActionResult<MotorcycleServiceDto>> Create(CreateMotorcycleServiceDto dto)
        {
            try
            {
                var created = await _service.CreateAsync(dto);
                return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id}")]
        [Authorize(Policy = Permissions.MenusMotorcycleServicesView)]
        public async Task<IActionResult> Update(int id, CreateMotorcycleServiceDto dto)
        {
            try
            {
                await _service.UpdateAsync(id, dto);
                return NoContent();
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        [Authorize(Policy = Permissions.MenusMotorcycleServicesView)]
        public async Task<IActionResult> Delete(int id)
        {
            await _service.DeleteAsync(id);
            return NoContent();
        }
    }
}
