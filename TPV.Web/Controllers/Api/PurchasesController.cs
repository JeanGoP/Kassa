using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Security.Claims;
using TPV.Application.DTOs;
using TPV.Application.Interfaces;

namespace TPV.Web.Controllers.Api
{
    [Route("api/[controller]")]
    [ApiController]
    public class PurchasesController : ControllerBase
    {
        private readonly IPurchaseService _purchaseService;

        public PurchasesController(IPurchaseService purchaseService)
        {
            _purchaseService = purchaseService;
        }

        [HttpPost]
        public async Task<ActionResult<PurchaseDto>> Create(CreatePurchaseDto dto)
        {
            var created = await _purchaseService.CreatePurchaseAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<PurchaseDto>>> GetAll([FromQuery] string? search)
        {
            return Ok(await _purchaseService.GetAllAsync(search));
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<PurchaseDto>> GetById(int id)
        {
            var purchase = await _purchaseService.GetByIdAsync(id);
            if (purchase == null) return NotFound();
            return Ok(purchase);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "Unknown";

            try
            {
                var result = await _purchaseService.DeleteAsync(id, userId);
                if (!result) return NotFound();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error deleting purchase {id}: {ex.Message}");
            }

            return NoContent();
        }
    }
}
