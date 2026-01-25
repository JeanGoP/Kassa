using Microsoft.AspNetCore.Mvc;
using TPV.Application.Interfaces;
using TPV.Application.DTOs;
using System.Security.Claims;
using TPV.Domain.Interfaces;
using TPV.Domain.Entities;

namespace TPV.Web.Controllers.Api
{
    [Route("api/[controller]")]
    [ApiController]
    public class SalesController : ControllerBase
    {
        private readonly ISalesService _salesService;
        private readonly IProductService _productService;
        private readonly IRepository<Branch> _branchRepository;

        public SalesController(ISalesService salesService, IProductService productService, IRepository<Branch> branchRepository)
        {
            _salesService = salesService;
            _productService = productService;
            _branchRepository = branchRepository;
        }

        [HttpGet("products")]
        public async Task<IActionResult> GetProducts(string search = "", int? branchId = null)
        {
            if (!branchId.HasValue || branchId == 0)
            {
                var branches = await _branchRepository.GetAllAsync();
                branchId = branches.FirstOrDefault()?.Id ?? 1;
            }

            // Simplified search - in real app use pagination and proper filtering
            var products = await _productService.GetAllProductsAsync(branchId);
            if (!string.IsNullOrEmpty(search))
            {
                products = products.Where(p => p.Name.Contains(search, StringComparison.OrdinalIgnoreCase) || 
                                             p.SKU.Contains(search, StringComparison.OrdinalIgnoreCase));
            }
            return Ok(products);
        }

        [HttpPost("checkout")]
        public async Task<IActionResult> Checkout([FromBody] SaleCreateDto dto)
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId)) return Unauthorized("User not logged in");

                // Default branch if not set
                if (dto.BranchId == 0) 
                {
                    var branches = await _branchRepository.GetAllAsync();
                    dto.BranchId = branches.FirstOrDefault()?.Id ?? 1;
                }

                var result = await _salesService.CreateSaleAsync(dto, userId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in Checkout: {ex.Message}");
                Console.WriteLine(ex.StackTrace);
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetSale(int id)
        {
            var sale = await _salesService.GetSaleAsync(id);
            if (sale == null) return NotFound();
            return Ok(sale);
        }

        [HttpPost("{id}/emit-invoice")]
        public async Task<IActionResult> EmitInvoice(int id)
        {
            try
            {
                var result = await _salesService.EmitInvoiceAsync(id);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}