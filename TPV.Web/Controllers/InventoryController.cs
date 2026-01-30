using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using System.Security.Claims;
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
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                var stocks = await _stockService.GetStockByBranchAsync(branchId.Value, userId);
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
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                var alerts = await _stockService.GetLowStockAlertsAsync(branchId.Value, userId);
                return View(alerts);
            }
            return View(new List<StockDto>());
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> UpdateStock(int productId, int branchId, int quantity, int minStockLevel, int maxStockLevel)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            await _stockService.UpdateStockAsync(productId, branchId, quantity, minStockLevel, maxStockLevel, userId);
            return RedirectToAction(nameof(Index), new { branchId });
        }
    }
}
