using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using TPV.Application.Interfaces;
using TPV.Application.DTOs;

namespace TPV.Web.Controllers.Api
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
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
            await _stockService.AdjustStockAsync(request.ProductId, effectiveBranchId, request.Quantity, request.Cost, request.Reason, request.LocationId, userId);
            return Ok();
        }

        [HttpPost("transfer")]
        public async Task<IActionResult> TransferStock([FromBody] TransferStockRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            await _stockService.TransferStockAsync(request.ProductId, request.SourceBranchId, request.TargetBranchId, request.Quantity, request.Notes, request.UnitOfMeasureId, request.SourceLocationId, request.TargetLocationId, userId);
            return Ok();
        }

        [HttpGet("units")]
        public async Task<IActionResult> GetUnits() => Ok(await _stockService.GetUnitsAsync());

        [HttpGet("locations")]
        public async Task<IActionResult> GetLocations([FromQuery] int branchId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Ok(await _stockService.GetLocationsAsync(branchId, userId));
        }

        [HttpPost("locations")]
        public async Task<IActionResult> CreateLocation([FromBody] SaveInventoryLocationDto request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Ok(await _stockService.SaveLocationAsync(null, request, userId));
        }

        [HttpPut("locations/{id:int}")]
        public async Task<IActionResult> UpdateLocation(int id, [FromBody] SaveInventoryLocationDto request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Ok(await _stockService.SaveLocationAsync(id, request, userId));
        }

        [HttpGet("movements")]
        public async Task<IActionResult> GetMovements([FromQuery] int? branchId, [FromQuery] int? productId, [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Ok(await _stockService.GetMovementsAsync(branchId, productId, fromDate, toDate, userId));
        }
    }

    public class UpdateStockRequest
    {
        public int? BranchId { get; set; }
        public decimal Quantity { get; set; }
        public decimal MinStockLevel { get; set; }
        public decimal MaxStockLevel { get; set; }
    }

    public class AdjustStockRequest
    {
        public int ProductId { get; set; }
        public int? BranchId { get; set; }
        public decimal? Quantity { get; set; }
        public decimal? Cost { get; set; }
        public string Reason { get; set; }
        public int? LocationId { get; set; }
    }

    public class TransferStockRequest
    {
        public int ProductId { get; set; }
        public int SourceBranchId { get; set; }
        public int TargetBranchId { get; set; }
        public decimal Quantity { get; set; }
        public string Notes { get; set; }
        public int? UnitOfMeasureId { get; set; }
        public int? SourceLocationId { get; set; }
        public int? TargetLocationId { get; set; }
    }
}
