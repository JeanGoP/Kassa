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
            var created = await _service.CreateAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, CreateWarrantyDto dto)
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
