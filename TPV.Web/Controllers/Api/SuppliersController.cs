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
    public class SuppliersController : ControllerBase
    {
        private readonly ISupplierService _supplierService;

        public SuppliersController(ISupplierService supplierService)
        {
            _supplierService = supplierService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<SupplierDto>>> GetAll()
        {
            return Ok(await _supplierService.GetAllAsync());
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<SupplierDto>> GetById(int id)
        {
            var supplier = await _supplierService.GetByIdAsync(id);
            if (supplier == null) return NotFound();
            return Ok(supplier);
        }

        [HttpPost]
        public async Task<ActionResult<SupplierDto>> Create(CreateSupplierDto dto)
        {
            try
            {
                var created = await _supplierService.CreateAsync(dto);
                return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
            }
            catch (System.Exception ex)
            {
                if (ex.Message.Contains("Ya existe"))
                {
                    return Conflict(new { message = ex.Message });
                }
                return StatusCode(500, new { message = "Error al guardar el proveedor." });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, CreateSupplierDto dto)
        {
            try
            {
                await _supplierService.UpdateAsync(id, dto);
                return NoContent();
            }
            catch (System.Exception ex)
            {
                if (ex.Message.Contains("Ya existe"))
                {
                    return Conflict(new { message = ex.Message });
                }
                return StatusCode(500, new { message = "Error al actualizar el proveedor." });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            await _supplierService.DeleteAsync(id);
            return NoContent();
        }
    }
}
