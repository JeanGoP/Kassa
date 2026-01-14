using Microsoft.AspNetCore.Mvc;
using TPV.Application.Interfaces;
using TPV.Application.DTOs;

namespace TPV.Web.Controllers.Api
{
    [Route("api/[controller]")]
    [ApiController]
    public class InventoryController : ControllerBase
    {
        private readonly IStockService _stockService;

        public InventoryController(IStockService stockService)
        {
            _stockService = stockService;
        }

        [HttpGet]
        public async Task<IActionResult> GetStock()
        {
            // Defaulting to branch 1
            var stock = await _stockService.GetStockByBranchAsync(1);
            return Ok(stock);
        }

        [HttpGet("alerts")]
        public async Task<IActionResult> GetAlerts()
        {
            // Defaulting to branch 1
            var alerts = await _stockService.GetLowStockAlertsAsync(1);
            return Ok(alerts);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateStock(int id, [FromBody] UpdateStockRequest request)
        {
            // Defaulting to branch 1
            await _stockService.UpdateStockAsync(id, 1, request.Quantity, request.MinStockLevel, request.MaxStockLevel);
            return Ok();
        }
    }

    public class UpdateStockRequest
    {
        public int Quantity { get; set; }
        public int MinStockLevel { get; set; }
        public int MaxStockLevel { get; set; }
    }
}