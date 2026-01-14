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

        public PurchaseService(
            IRepository<Purchase> purchaseRepository,
            IRepository<Stock> stockRepository,
            IRepository<Product> productRepository,
            IRepository<Supplier> supplierRepository,
            IRepository<Branch> branchRepository)
        {
            _purchaseRepository = purchaseRepository;
            _stockRepository = stockRepository;
            _productRepository = productRepository;
            _supplierRepository = supplierRepository;
            _branchRepository = branchRepository;
        }

        public async Task<PurchaseDto> CreatePurchaseAsync(CreatePurchaseDto dto)
        {
            var purchase = new Purchase
            {
                SupplierId = dto.SupplierId,
                BranchId = dto.BranchId,
                Date = dto.Date,
                ReferenceNumber = dto.ReferenceNumber,
                Status = "Completed",
                PurchaseDetails = new List<PurchaseDetail>(),
                IsActive = true
            };

            decimal totalAmount = 0;

            foreach (var item in dto.Details)
            {
                var subTotal = item.Quantity * item.UnitCost;
                totalAmount += subTotal;

                var detail = new PurchaseDetail
                {
                    ProductId = item.ProductId,
                    Quantity = item.Quantity,
                    UnitCost = item.UnitCost,
                    SubTotal = subTotal,
                    IsActive = true
                };
                purchase.PurchaseDetails.Add(detail);

                // Update Stock
                var stocks = await _stockRepository.GetAsync(s => s.ProductId == item.ProductId && s.BranchId == dto.BranchId);
                var stock = stocks.FirstOrDefault();
                if (stock == null)
                {
                    stock = new Stock
                    {
                        ProductId = item.ProductId,
                        BranchId = dto.BranchId,
                        Quantity = item.Quantity,
                        IsActive = true
                    };
                    await _stockRepository.AddAsync(stock);
                }
                else
                {
                    stock.Quantity += item.Quantity;
                    await _stockRepository.UpdateAsync(stock);
                }

                // Update Product Cost (Last Price Strategy)
                var product = await _productRepository.GetByIdAsync(item.ProductId);
                if (product != null)
                {
                    product.Cost = item.UnitCost;
                    await _productRepository.UpdateAsync(product);
                }
            }

            purchase.TotalAmount = totalAmount;
            var createdPurchase = await _purchaseRepository.AddAsync(purchase);

            return await GetByIdAsync(createdPurchase.Id) ?? new PurchaseDto();
        }

        public async Task<IEnumerable<PurchaseDto>> GetAllAsync()
        {
            var purchases = await _purchaseRepository.GetAsync(null, query => query.OrderByDescending(p => p.Date), "Supplier,Branch");
            return purchases.Select(MapToDto);
        }

        public async Task<PurchaseDto?> GetByIdAsync(int id)
        {
            var purchases = await _purchaseRepository.GetAsync(p => p.Id == id, null, "Supplier,Branch,PurchaseDetails.Product");
            var purchase = purchases.FirstOrDefault();
            return purchase == null ? null : MapToDto(purchase);
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
                Status = p.Status,
                Details = p.PurchaseDetails?.Select(d => new PurchaseDetailDto
                {
                    ProductId = d.ProductId,
                    ProductName = d.Product?.Name ?? "Unknown",
                    Quantity = d.Quantity,
                    UnitCost = d.UnitCost,
                    SubTotal = d.SubTotal
                }).ToList() ?? new List<PurchaseDetailDto>()
            };
        }
    }
}