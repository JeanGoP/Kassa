using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Identity;
using System.Text.Json;
using TPV.Application.DTOs;
using TPV.Application.Interfaces;
using TPV.Domain.Entities;
using TPV.Domain.Interfaces;
using TPV.Infrastructure.Identity;

namespace TPV.Web.Controllers
{
    [Authorize]
    public class SalesController : Controller
    {
        private const string CartSessionKey = "CartItems";
        private readonly ISalesService _salesService;
        private readonly IRepository<Product> _productRepository;
        private readonly IRepository<Branch> _branchRepository;
        private readonly UserManager<ApplicationUser> _userManager;

        public SalesController(
            ISalesService salesService,
            IRepository<Product> productRepository,
            IRepository<Branch> branchRepository,
            UserManager<ApplicationUser> userManager)
        {
            _salesService = salesService;
            _productRepository = productRepository;
            _branchRepository = branchRepository;
            _userManager = userManager;
        }

        [HttpGet]
        public async Task<IActionResult> Cart(int? branchId)
        {
            var branches = await _branchRepository.GetAllAsync();
            if (!branchId.HasValue && branches.Any())
            {
                branchId = branches.First().Id;
            }
            ViewBag.Branches = branches;
            ViewBag.CurrentBranchId = branchId;

            var items = GetCartItems();
            return View(items);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> AddItem(string sku, int quantity, int branchId)
        {
            if (string.IsNullOrWhiteSpace(sku) || quantity <= 0)
                return RedirectToAction(nameof(Cart), new { branchId });

            var products = await _productRepository.GetAsync(p => p.SKU == sku);
            var product = products.FirstOrDefault();
            if (product == null)
            {
                TempData["Error"] = "Producto no encontrado.";
                return RedirectToAction(nameof(Cart), new { branchId });
            }

            var items = GetCartItems();
            var existing = items.FirstOrDefault(i => i.ProductId == product.Id);
            if (existing != null)
            {
                existing.Quantity += quantity;
            }
            else
            {
                items.Add(new SaleItemDto
                {
                    ProductId = product.Id,
                    ProductName = product.Name,
                    SKU = product.SKU,
                    UnitPrice = product.Price,
                    Quantity = quantity
                });
            }
            SaveCartItems(items);
            return RedirectToAction(nameof(Cart), new { branchId });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public IActionResult RemoveItem(int productId, int branchId)
        {
            var items = GetCartItems();
            items = items.Where(i => i.ProductId != productId).ToList();
            SaveCartItems(items);
            return RedirectToAction(nameof(Cart), new { branchId });
        }

        [HttpGet]
        public IActionResult Checkout(int branchId)
        {
            var items = GetCartItems();
            ViewBag.BranchId = branchId;
            ViewBag.Total = items.Sum(i => i.SubTotal);
            return View(items);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Checkout(int branchId, string paymentMethod)
        {
            var items = GetCartItems();
            if (!items.Any())
            {
                TempData["Error"] = "El carrito está vacío.";
                return RedirectToAction(nameof(Cart), new { branchId });
            }

            var user = await _userManager.GetUserAsync(User);
            var dto = new SaleCreateDto
            {
                BranchId = branchId,
                PaymentMethod = paymentMethod,
                Items = items.Select(i => new SaleItemCreateDto 
                { 
                    ProductId = i.ProductId, 
                    Quantity = i.Quantity 
                }).ToList()
            };
            var result = await _salesService.CreateSaleAsync(dto, user.Id);

            // limpiar carrito
            HttpContext.Session.Remove(CartSessionKey);

            return RedirectToAction(nameof(Receipt), new { id = result.SaleId });
        }

        [HttpGet]
        public async Task<IActionResult> Receipt(int id)
        {
            var sale = await _salesService.GetSaleAsync(id);
            return View(sale);
        }

        private List<SaleItemDto> GetCartItems()
        {
            var json = HttpContext.Session.GetString(CartSessionKey);
            if (string.IsNullOrEmpty(json)) return new List<SaleItemDto>();
            return JsonSerializer.Deserialize<List<SaleItemDto>>(json) ?? new List<SaleItemDto>();
        }

        private void SaveCartItems(List<SaleItemDto> items)
        {
            var json = JsonSerializer.Serialize(items);
            HttpContext.Session.SetString(CartSessionKey, json);
        }
    }
}

