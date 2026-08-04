using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;
using TPV.Application.DTOs;
using TPV.Application.Interfaces;

namespace TPV.Web.Controllers.Api
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class VehicleCatalogsController : ControllerBase
    {
        private readonly IVehicleCatalogService _service;
        public VehicleCatalogsController(IVehicleCatalogService service) { _service = service; }

        [HttpGet("brands")]
        public async Task<IActionResult> GetBrands([FromQuery] bool includeInactive = false) => Ok(await _service.GetBrandsAsync(includeInactive));

        [HttpPost("brands")]
        public async Task<IActionResult> CreateBrand(SaveBrandDto dto)
        {
            try { return Ok(await _service.CreateBrandAsync(dto)); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPut("brands/{id}")]
        public async Task<IActionResult> UpdateBrand(int id, SaveBrandDto dto)
        {
            try { var result = await _service.UpdateBrandAsync(id, dto); return result == null ? NotFound() : Ok(result); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpDelete("brands/{id}")]
        public async Task<IActionResult> DeactivateBrand(int id) => await _service.DeactivateBrandAsync(id) ? NoContent() : NotFound();

        [HttpGet("models")]
        public async Task<IActionResult> GetModels([FromQuery] int? brandId, [FromQuery] bool includeInactive = false) => Ok(await _service.GetModelsAsync(brandId, includeInactive));

        [HttpPost("models")]
        public async Task<IActionResult> CreateModel(SaveVehicleModelDto dto)
        {
            try { return Ok(await _service.CreateModelAsync(dto)); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPut("models/{id}")]
        public async Task<IActionResult> UpdateModel(int id, SaveVehicleModelDto dto)
        {
            try { var result = await _service.UpdateModelAsync(id, dto); return result == null ? NotFound() : Ok(result); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpDelete("models/{id}")]
        public async Task<IActionResult> DeactivateModel(int id) => await _service.DeactivateModelAsync(id) ? NoContent() : NotFound();
    }
}
