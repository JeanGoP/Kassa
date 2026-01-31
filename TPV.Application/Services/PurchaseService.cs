using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using TPV.Application.DTOs;
using TPV.Domain.Entities;
using TPV.Domain.Interfaces;
using TPV.Application.Interfaces;

namespace TPV.Application.Services
{
    public class PurchaseService : IPurchaseService
    {
        private readonly IRepository<Purchase> _purchaseRepository;
        private readonly IRepository<Stock> _stockRepository;
        private readonly IRepository<Product> _productRepository;
        private readonly IRepository<Supplier> _supplierRepository;
        private readonly IRepository<Branch> _branchRepository;
        private readonly IUserService _userService;

        public PurchaseService(
            IRepository<Purchase> purchaseRepository,
            IRepository<Stock> stockRepository,
            IRepository<Product> productRepository,
            IRepository<Supplier> supplierRepository,
            IRepository<Branch> branchRepository,
            IUserService userService)
        {
            _purchaseRepository = purchaseRepository;
            _stockRepository = stockRepository;
            _productRepository = productRepository;
            _supplierRepository = supplierRepository;
            _branchRepository = branchRepository;
            _userService = userService;
        }

        public async Task<PurchaseDto> CreatePurchaseAsync(CreatePurchaseDto dto, string? userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                throw new UnauthorizedAccessException("Usuario no identificado.");
            }

            if (!await _userService.IsUserInBranchAsync(userId, dto.BranchId))
            {
                throw new UnauthorizedAccessException("El usuario no tiene permiso para realizar compras en esta sucursal.");
            }

            var purchase = new Purchase
            {
                SupplierId = dto.SupplierId,
                BranchId = dto.BranchId,
                Date = dto.Date,
                ReferenceNumber = dto.ReferenceNumber,
                Status = "Completed",
                Freight = dto.Freight,
                PurchaseDetails = new List<PurchaseDetail>(),
                IsActive = true
            };

            decimal totalAmount = 0;
            decimal totalItemsSubTotal = dto.Details.Sum(d => d.Quantity * d.UnitCost);

            foreach (var item in dto.Details)
            {
                var subTotal = item.Quantity * item.UnitCost;
                var taxAmount = subTotal * (item.TaxRate / 100);
                totalAmount += subTotal + taxAmount;

                var detail = new PurchaseDetail
                {
                    ProductId = item.ProductId,
                    Quantity = item.Quantity,
                    UnitCost = item.UnitCost,
                    SubTotal = subTotal,
                    TaxRate = item.TaxRate,
                    TaxAmount = taxAmount,
                    IsActive = true
                };
                purchase.PurchaseDetails.Add(detail);

                // Update Stock and Cost (Weighted Average per Branch)
                var stocks = await _stockRepository.GetAsync(s => s.ProductId == item.ProductId && s.BranchId == dto.BranchId);
                var stock = stocks.FirstOrDefault();
                
                decimal purchaseQuantity = item.Quantity;
                decimal purchaseUnitCost = item.UnitCost;
                decimal newPurchaseValue = purchaseQuantity * purchaseUnitCost;

                // Distribute Freight Cost
                if (totalItemsSubTotal > 0 && dto.Freight > 0)
                {
                    var itemShareFactor = subTotal / totalItemsSubTotal;
                    var itemFreightShare = dto.Freight * itemShareFactor;
                    newPurchaseValue += itemFreightShare;
                }

                if (stock == null)
                {
                    stock = new Stock
                    {
                        ProductId = item.ProductId,
                        BranchId = dto.BranchId,
                        Quantity = item.Quantity,
                        Cost = purchaseQuantity > 0 ? newPurchaseValue / purchaseQuantity : item.UnitCost,
                        IsActive = true
                    };
                    await _stockRepository.AddAsync(stock);
                }
                else
                {
                    decimal currentQuantity = stock.Quantity;
                    decimal currentCost = stock.Cost;
                    decimal currentTotalValue = currentQuantity * currentCost;
                    
                    // Avoid negative quantity logic issues if stock was somehow negative, treat as 0 value for simplicity or handle strictly
                    if (currentQuantity < 0) currentQuantity = 0;
                    if (currentTotalValue < 0) currentTotalValue = 0;

                    decimal newTotalQuantity = currentQuantity + purchaseQuantity;
                    
                    if (newTotalQuantity > 0)
                    {
                        stock.Cost = (currentTotalValue + newPurchaseValue) / newTotalQuantity;
                    }
                    else
                    {
                        stock.Cost = item.UnitCost; // Fallback if net quantity is 0 or less
                    }

                    stock.Quantity += item.Quantity;
                    await _stockRepository.UpdateAsync(stock);
                }

                // Update Product Cost (Optional: Keep global reference as last purchase price or average of all branches? 
                // User said "Cost should not be in Product", but we might need it for fallback. 
                // For now, let's NOT update Product.Cost to respect "Cost should be in Stock".
                // But to avoid confusion, we might want to update it to the latest cost just in case.)
                // Removing Product.Cost update logic as per user request to move logic to Stock.

            }

            purchase.TotalAmount = totalAmount + dto.Freight;
            var createdPurchase = await _purchaseRepository.AddAsync(purchase);

            return await GetByIdAsync(createdPurchase.Id) ?? new PurchaseDto();
        }

        public async Task<IEnumerable<PurchaseDto>> GetAllAsync(string? search = null)
        {
            var purchases = await _purchaseRepository.GetAsync(
                p => string.IsNullOrEmpty(search) ||
                     p.ReferenceNumber.Contains(search) ||
                     (p.Supplier != null && p.Supplier.Name.Contains(search)),
                query => query.OrderByDescending(p => p.Id),
                "Supplier,Branch");
            return purchases.Select(MapToDto);
        }

        public async Task<PurchaseDto?> GetByIdAsync(int id)
        {
            var purchases = await _purchaseRepository.GetAsync(
                p => p.Id == id,
                null,
                "Supplier,Branch,PurchaseDetails.Product");
            var purchase = purchases.FirstOrDefault();
            return purchase == null ? null : MapToDto(purchase);
        }

        public async Task<bool> DeleteAsync(int id, string userId)
        {
            var purchases = await _purchaseRepository.GetAsync(
                p => p.Id == id,
                null,
                "PurchaseDetails");

            var purchase = purchases.FirstOrDefault();
            if (purchase == null)
            {
                return false;
            }

            try
            {
                foreach (var detail in purchase.PurchaseDetails)
                {
                    var stocks = await _stockRepository.GetAsync(s =>
                        s.ProductId == detail.ProductId &&
                        s.BranchId == purchase.BranchId);

                    var stock = stocks.FirstOrDefault();
                    if (stock == null)
                    {
                        continue;
                    }

                    var newQuantity = stock.Quantity - detail.Quantity;
                    stock.Quantity = newQuantity < 0 ? 0 : newQuantity;
                    await _stockRepository.UpdateAsync(stock);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error ajustando stock al eliminar compra {id}: {ex.Message}");
            }

            await _purchaseRepository.DeleteAsync(purchase);
            return true;
        }

        private PurchaseDto MapToDto(Purchase p)
        {
            return new PurchaseDto
            {
                Id = p.Id,
                SupplierName = p.Supplier?.Name ?? "Unknown",
                BranchName = p.Branch?.Name ?? "Unknown",
                Date = p.Date,
                ReferenceNumber = p.ReferenceNumber,
                TotalAmount = p.TotalAmount,
                Freight = p.Freight,
                Status = p.Status,
                Details = p.PurchaseDetails?.Select(d => new PurchaseDetailDto
                {
                    ProductId = d.ProductId,
                    ProductName = d.Product?.Name ?? "Unknown",
                    Quantity = d.Quantity,
                    UnitCost = d.UnitCost,
                    SubTotal = d.SubTotal,
                    TaxRate = d.TaxRate,
                    TaxAmount = d.TaxAmount
                }).ToList() ?? new List<PurchaseDetailDto>()
            };
        }
    }
}
