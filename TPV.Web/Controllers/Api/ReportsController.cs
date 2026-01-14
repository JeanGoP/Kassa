using Microsoft.AspNetCore.Mvc;
using TPV.Application.Interfaces;

namespace TPV.Web.Controllers.Api
{
    [Route("api/[controller]")]
    [ApiController]
    public class ReportsController : ControllerBase
    {
        private readonly IReportsService _reportsService;

        public ReportsController(IReportsService reportsService)
        {
            _reportsService = reportsService;
        }

        [HttpGet("sales-by-branch")]
        public async Task<IActionResult> GetSalesByBranch(DateTime? start, DateTime? end)
        {
            var data = await _reportsService.GetSalesByBranchAsync(start ?? DateTime.MinValue, end ?? DateTime.MaxValue);
            return Ok(data);
        }

        [HttpGet("product-margins")]
        public async Task<IActionResult> GetProductMargins(DateTime? start, DateTime? end)
        {
            var data = await _reportsService.GetProductMarginsAsync(start ?? DateTime.MinValue, end ?? DateTime.MaxValue);
            return Ok(data);
        }
    }
}