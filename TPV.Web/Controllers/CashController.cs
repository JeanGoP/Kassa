using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using TPV.Application.Interfaces;
using TPV.Domain.Interfaces;
using TPV.Domain.Entities;
using TPV.Infrastructure.Identity;

namespace TPV.Web.Controllers
{
    [Authorize]
    public class CashController : Controller
    {
        private readonly ICashService _cashService;
        private readonly IRepository<Branch> _branchRepository;
        private readonly UserManager<ApplicationUser> _userManager;

        public CashController(ICashService cashService, IRepository<Branch> branchRepository, UserManager<ApplicationUser> userManager)
        {
            _cashService = cashService;
            _branchRepository = branchRepository;
            _userManager = userManager;
        }

        [HttpGet]
        public async Task<IActionResult> Open(int? branchId)
        {
            var branches = await _branchRepository.GetAllAsync();
            if (!branchId.HasValue && branches.Any()) branchId = branches.First().Id;
            ViewBag.Branches = branches;
            ViewBag.BranchId = branchId;
            return View();
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Open(int branchId, decimal openingBalance)
        {
            var user = await _userManager.GetUserAsync(User);
            await _cashService.OpenSessionAsync(branchId, user.Id, openingBalance);
            return RedirectToAction(nameof(Status), new { branchId });
        }

        [HttpGet]
        public async Task<IActionResult> Status(int branchId)
        {
            var user = await _userManager.GetUserAsync(User);
            var session = await _cashService.GetOpenSessionAsync(branchId, user.Id);
            return View(session);
        }

        [HttpGet]
        public IActionResult Close(int sessionId)
        {
            ViewBag.SessionId = sessionId;
            return View();
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Close(int sessionId, decimal closingBalance)
        {
            var result = await _cashService.CloseSessionAsync(sessionId, closingBalance);
            return RedirectToAction(nameof(Status), new { branchId = result.BranchId });
        }
    }
}

