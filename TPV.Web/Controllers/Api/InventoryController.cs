using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
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
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var effectiveBranchId = branchId.GetValueOrDefault(1);
            var stock = await _stockService.GetStockByBranchAsync(effectiveBranchId, userId);
            return Ok(stock);
        }

        [HttpGet("alerts")]
        public async Task<IActionResult> GetAlerts([FromQuery] int? branchId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var effectiveBranchId = branchId.GetValueOrDefault(1);
            var alerts = await _stockService.GetLowStockAlertsAsync(effectiveBranchId, userId);
            return Ok(alerts);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateStock(int id, [FromBody] UpdateStockRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var effectiveBranchId = request.BranchId.GetValueOrDefault(1);
            await _stockService.UpdateStockAsync(id, effectiveBranchId, request.Quantity, request.MinStockLevel, request.MaxStockLevel, userId);
            return Ok();
        }

        [HttpPost("adjust")]
        public async Task<IActionResult> AdjustStock([FromBody] AdjustStockRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var effectiveBranchId = request.BranchId.GetValueOrDefault(1);
            await _stockService.AdjustStockAsync(request.ProductId, effectiveBranchId, request.Quantity, request.Cost, request.Reason, userId);
            return Ok();
        }

        [HttpPost("transfer")]
        public async Task<IActionResult> TransferStock([FromBody] TransferStockRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            await _stockService.TransferStockAsync(request.ProductId, request.SourceBranchId, request.TargetBranchId, request.Quantity, request.Notes, userId);
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

    public class AdjustStockRequest
    {
        public int ProductId { get; set; }
        public int? BranchId { get; set; }
        public int? Quantity { get; set; }
        public decimal? Cost { get; set; }
        public string Reason { get; set; }
    }

    public class TransferStockRequest
    {
        public int ProductId { get; set; }
        public int SourceBranchId { get; set; }
        public int TargetBranchId { get; set; }
        public int Quantity { get; set; }
        public string Notes { get; set; }
    }
}
