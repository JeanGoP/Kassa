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
        public async Task<IActionResult> GetStock([FromQuery] int? branchId)
        {
            var effectiveBranchId = branchId.GetValueOrDefault(1);
            var stock = await _stockService.GetStockByBranchAsync(effectiveBranchId);
            return Ok(stock);
        }

        [HttpGet("alerts")]
        public async Task<IActionResult> GetAlerts([FromQuery] int? branchId)
        {
            var effectiveBranchId = branchId.GetValueOrDefault(1);
            var alerts = await _stockService.GetLowStockAlertsAsync(effectiveBranchId);
            return Ok(alerts);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateStock(int id, [FromBody] UpdateStockRequest request)
        {
            var effectiveBranchId = request.BranchId.GetValueOrDefault(1);
            await _stockService.UpdateStockAsync(id, effectiveBranchId, request.Quantity, request.MinStockLevel, request.MaxStockLevel);
            return Ok();
        }
    }

    public class UpdateStockRequest
    {
        public int? BranchId { get; set; }
        public int Quantity { get; set; }
        public int MinStockLevel { get; set; }
        public int MaxStockLevel { get; set; }
    }
}
