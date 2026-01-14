using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TPV.Application.Interfaces;

namespace TPV.Web.Controllers
{
    [Authorize]
    public class ReportsController : Controller
    {
        private readonly IReportsService _reportsService;

        public ReportsController(IReportsService reportsService)
        {
            _reportsService = reportsService;
        }

        [HttpGet]
        public IActionResult Index()
        {
            return View();
        }

        [HttpGet]
        public async Task<IActionResult> SalesByBranch(DateTime? start, DateTime? end)
        {
            var data = await _reportsService.GetSalesByBranchAsync(start, end);
            ViewBag.Start = start;
            ViewBag.End = end;
            return View(data);
        }

        [HttpGet]
        public async Task<IActionResult> MarginByProduct(DateTime? start, DateTime? end)
        {
            var data = await _reportsService.GetProductMarginsAsync(start, end);
            ViewBag.Start = start;
            ViewBag.End = end;
            return View(data);
        }
    }
}

