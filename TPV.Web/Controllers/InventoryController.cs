using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using TPV.Application.DTOs;
using TPV.Application.Interfaces;
using TPV.Domain.Entities;
using TPV.Domain.Interfaces;

namespace TPV.Web.Controllers
{
    [Authorize]
    public class InventoryController : Controller
    {
        private readonly IStockService _stockService;
        private readonly IRepository<Branch> _branchRepository;

        public InventoryController(IStockService stockService, IRepository<Branch> branchRepository)
        {
            _stockService = stockService;
            _branchRepository = branchRepository;
        }

        public async Task<IActionResult> Index(int? branchId)
        {
            var branches = await _branchRepository.GetAllAsync();
            
            // Default to first branch if not specified
            if (!branchId.HasValue && branches.Any())
            {
                branchId = branches.First().Id;
            }

            ViewBag.Branches = new SelectList(branches, "Id", "Name", branchId);
            ViewBag.CurrentBranchId = branchId;

            if (branchId.HasValue)
            {
                var stocks = await _stockService.GetStockByBranchAsync(branchId.Value);
                return View(stocks);
            }
            return View(new List<StockDto>());
        }

        public async Task<IActionResult> Alerts(int? branchId)
        {
            var branches = await _branchRepository.GetAllAsync();
            if (!branchId.HasValue && branches.Any())
            {
                branchId = branches.First().Id;
            }

            ViewBag.Branches = new SelectList(branches, "Id", "Name", branchId);

            if (branchId.HasValue)
            {
                var alerts = await _stockService.GetLowStockAlertsAsync(branchId.Value);
                return View(alerts);
            }
            return View(new List<StockDto>());
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> UpdateStock(int productId, int branchId, int quantity, int minStockLevel, int maxStockLevel)
        {
            await _stockService.UpdateStockAsync(productId, branchId, quantity, minStockLevel, maxStockLevel);
            return RedirectToAction(nameof(Index), new { branchId });
        }
    }
}
