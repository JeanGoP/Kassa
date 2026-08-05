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
        private readonly IStockService _stockService;
        private readonly IRepository<UnitOfMeasure> _unitRepository;
        private readonly IRepository<InventoryLocation> _locationRepository;
        private readonly IRepository<InventoryLocationBalance> _locationBalanceRepository;

        public PurchaseService(
            IRepository<Purchase> purchaseRepository,
            IRepository<Stock> stockRepository,
            IRepository<Product> productRepository,
            IRepository<Supplier> supplierRepository,
            IRepository<Branch> branchRepository,
            IUserService userService,
            IStockService stockService,
            IRepository<UnitOfMeasure> unitRepository,
            IRepository<InventoryLocation> locationRepository,
            IRepository<InventoryLocationBalance> locationBalanceRepository)
        {
            _purchaseRepository = purchaseRepository;
            _stockRepository = stockRepository;
            _productRepository = productRepository;
            _supplierRepository = supplierRepository;
            _branchRepository = branchRepository;
            _userService = userService;
            _stockService = stockService;
            _unitRepository = unitRepository;
            _locationRepository = locationRepository;
            _locationBalanceRepository = locationBalanceRepository;
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

            if (dto.Details == null || !dto.Details.Any())
            {
                throw new InvalidOperationException("Debe agregar al menos un articulo a la entrada de mercancia.");
            }

            if (dto.Freight < 0 || dto.FreightTaxRate < 0)
            {
                throw new InvalidOperationException("El flete y su IVA no pueden ser negativos.");
            }

            var receptionLocation = await _locationRepository.GetByIdAsync(dto.InventoryLocationId);
            if (receptionLocation == null || receptionLocation.BranchId != dto.BranchId || !receptionLocation.IsActive)
            {
                throw new InvalidOperationException("Seleccione una ubicación de recepción activa que pertenezca a la bodega de ingreso.");
            }

            var purchase = new Purchase
            {
                SupplierId = dto.SupplierId,
                BranchId = dto.BranchId,
                InventoryLocationId = receptionLocation.Id,
                Date = dto.Date == default ? DateTime.Today : dto.Date,
                SupplierInvoiceDate = dto.SupplierInvoiceDate,
                ReferenceNumber = dto.ReferenceNumber?.Trim() ?? string.Empty,
                Status = "Completed",
                Freight = dto.Freight,
                FreightTaxRate = dto.FreightTaxRate,
                FreightTaxAmount = dto.Freight * (dto.FreightTaxRate / 100),
                AccountingStatus = "Pending",
                CreatedByUserId = userId,
                PurchaseDetails = new List<PurchaseDetail>(),
                IsActive = true
            };

            decimal itemsTaxAmount = 0;
            decimal totalItemsSubTotal = dto.Details.Sum(d => d.Quantity * d.UnitCost);
            var receivedItems = new List<(int ProductId, decimal Quantity, int UnitId, decimal BaseQuantity, decimal PurchaseValue)>();

            foreach (var item in dto.Details)
            {
                if (item.Quantity <= 0)
                {
                    throw new InvalidOperationException("Las cantidades de los articulos deben ser mayores a cero.");
                }

                if (item.UnitCost < 0 || item.TaxRate < 0)
                {
                    throw new InvalidOperationException("El costo y el IVA de los articulos no pueden ser negativos.");
                }

                var product = (await _productRepository.GetAsync(p => p.Id == item.ProductId, null, "UnitConversions")).FirstOrDefault()
                    ?? throw new InvalidOperationException("El producto de la compra no existe.");
                var unitId = item.UnitOfMeasureId ?? product.PurchaseUnitId ?? product.BaseUnitId
                    ?? throw new InvalidOperationException($"El producto '{product.Name}' no tiene unidad de compra configurada.");
                var unit = await _unitRepository.GetByIdAsync(unitId)
                    ?? throw new InvalidOperationException("La unidad de compra no existe.");
                var factor = product.BaseUnitId == unitId ? 1m
                    : product.UnitConversions.FirstOrDefault(c => c.UnitOfMeasureId == unitId)?.FactorToBase ?? 0m;
                if (factor <= 0) throw new InvalidOperationException($"No existe conversión de {unit.Code} a la unidad base de '{product.Name}'.");
                var baseQuantity = item.Quantity * factor;

                var subTotal = item.Quantity * item.UnitCost;
                var taxAmount = subTotal * (item.TaxRate / 100);
                itemsTaxAmount += taxAmount;

                var detail = new PurchaseDetail
                {
                    ProductId = item.ProductId,
                    Quantity = item.Quantity,
                    UnitOfMeasureId = unit.Id,
                    UnitCode = unit.Code,
                    QuantityBase = baseQuantity,
                    UnitCost = item.UnitCost,
                    SubTotal = subTotal,
                    TaxRate = item.TaxRate,
                    TaxAmount = taxAmount,
                    IsActive = true
                };
                purchase.PurchaseDetails.Add(detail);

                decimal newPurchaseValue = item.Quantity * item.UnitCost;

                // Distribute Freight Cost
                if (totalItemsSubTotal > 0 && dto.Freight > 0)
                {
                    var itemShareFactor = subTotal / totalItemsSubTotal;
                    var itemFreightShare = dto.Freight * itemShareFactor;
                    newPurchaseValue += itemFreightShare;
                }

                receivedItems.Add((item.ProductId, item.Quantity, unit.Id, baseQuantity, newPurchaseValue));
            }

            purchase.ItemsSubTotal = totalItemsSubTotal;
            purchase.ItemsTaxAmount = itemsTaxAmount;
            purchase.TotalAmount = totalItemsSubTotal + itemsTaxAmount + purchase.Freight + purchase.FreightTaxAmount;
            var createdPurchase = await _purchaseRepository.AddAsync(purchase);

            foreach (var item in receivedItems)
            {
                var existing = (await _stockRepository.GetAsync(s => s.ProductId == item.ProductId && s.BranchId == dto.BranchId)).FirstOrDefault();
                var currentQuantity = Math.Max(0m, existing?.Quantity ?? 0m);
                var currentValue = currentQuantity * Math.Max(0m, existing?.Cost ?? 0m);
                await _stockService.ApplyMovementAsync(item.ProductId, dto.BranchId, item.Quantity, item.UnitId, true,
                    "COMPRA", "COMPRA", createdPurchase.Id, createdPurchase.ReferenceNumber, null,
                    createdPurchase.InventoryLocationId, userId);
                var updated = (await _stockRepository.GetAsync(s => s.ProductId == item.ProductId && s.BranchId == dto.BranchId, disableTracking: false)).First();
                var totalQuantity = currentQuantity + item.BaseQuantity;
                updated.Cost = totalQuantity > 0 ? (currentValue + item.PurchaseValue) / totalQuantity : 0m;
                await _stockRepository.UpdateAsync(updated);
            }

            return await GetByIdAsync(createdPurchase.Id) ?? new PurchaseDto();
        }

        public async Task<IEnumerable<PurchaseDto>> GetAllAsync(string? search = null)
        {
            var purchases = await _purchaseRepository.GetAsync(
                p => string.IsNullOrEmpty(search) ||
                     p.ReferenceNumber.Contains(search) ||
                     (p.Supplier != null && p.Supplier.Name.Contains(search)),
                query => query.OrderByDescending(p => p.Id),
                "Supplier,Branch,InventoryLocation");
            return purchases.Select(MapToDto);
        }

        public async Task<PurchaseDto?> GetByIdAsync(int id)
        {
            var purchases = await _purchaseRepository.GetAsync(
                p => p.Id == id,
                includeString: "Supplier,Branch,InventoryLocation,PurchaseDetails.Product");
            var purchase = purchases.FirstOrDefault();
            return purchase == null ? null : MapToDto(purchase);
        }

        public async Task<bool> DeleteAsync(int id, string? userId)
        {
            var purchases = await _purchaseRepository.GetAsync(
                p => p.Id == id,
                includeString: "PurchaseDetails,InventoryLocation");

            var purchase = purchases.FirstOrDefault();
            if (purchase == null)
            {
                return false;
            }

            var requiredByProduct = purchase.PurchaseDetails
                .GroupBy(detail => detail.ProductId)
                .Select(group => new
                {
                    ProductId = group.Key,
                    QuantityBase = group.Sum(detail => detail.QuantityBase)
                })
                .ToList();

            foreach (var required in requiredByProduct)
            {
                var balance = (await _locationBalanceRepository.GetAsync(item =>
                    item.ProductId == required.ProductId &&
                    item.InventoryLocationId == purchase.InventoryLocationId)).FirstOrDefault();
                if (balance == null || balance.QuantityBase < required.QuantityBase)
                    throw new InvalidOperationException(
                        $"No se puede anular la entrada porque la ubicación {purchase.InventoryLocation.Code} - {purchase.InventoryLocation.Name} " +
                        "ya no conserva todas las existencias recibidas. Reubique primero las cantidades necesarias hacia esa ubicación.");
            }

            foreach (var detail in purchase.PurchaseDetails)
            {
                await _stockService.ApplyMovementAsync(detail.ProductId, purchase.BranchId, detail.Quantity,
                    detail.UnitOfMeasureId, false, "REVERSO_COMPRA", "COMPRA", purchase.Id,
                    purchase.ReferenceNumber, "Eliminación de entrada de mercancía",
                    purchase.InventoryLocationId, userId);
            }

            await _purchaseRepository.DeleteAsync(purchase);
            return true;
        }

        private PurchaseDto MapToDto(Purchase p)
        {
            var detailDtos = p.PurchaseDetails?.Select(d => new PurchaseDetailDto
            {
                ProductId = d.ProductId,
                ProductName = d.Product?.Name ?? "Unknown",
                Quantity = d.Quantity,
                UnitOfMeasureId = d.UnitOfMeasureId,
                UnitCode = d.UnitCode,
                QuantityBase = d.QuantityBase,
                UnitCost = d.UnitCost,
                SubTotal = d.SubTotal,
                TaxRate = d.TaxRate,
                TaxAmount = d.TaxAmount
            }).ToList() ?? new List<PurchaseDetailDto>();

            var itemsSubTotal = p.ItemsSubTotal != 0 ? p.ItemsSubTotal : detailDtos.Sum(d => d.SubTotal);
            var itemsTaxAmount = p.ItemsTaxAmount != 0 ? p.ItemsTaxAmount : detailDtos.Sum(d => d.TaxAmount);
            var freightTaxAmount = p.FreightTaxAmount != 0 ? p.FreightTaxAmount : p.Freight * (p.FreightTaxRate / 100);

            return new PurchaseDto
            {
                Id = p.Id,
                SupplierName = p.Supplier?.Name ?? "Unknown",
                BranchName = p.Branch?.Name ?? "Unknown",
                InventoryLocationId = p.InventoryLocationId,
                InventoryLocationCode = p.InventoryLocation?.Code ?? string.Empty,
                InventoryLocationName = p.InventoryLocation?.Name ?? string.Empty,
                Date = p.Date,
                SupplierInvoiceDate = p.SupplierInvoiceDate,
                ReferenceNumber = p.ReferenceNumber,
                TotalAmount = p.TotalAmount,
                ItemsSubTotal = itemsSubTotal,
                ItemsTaxAmount = itemsTaxAmount,
                Freight = p.Freight,
                FreightTaxRate = p.FreightTaxRate,
                FreightTaxAmount = freightTaxAmount,
                Status = p.Status,
                AccountingStatus = string.IsNullOrWhiteSpace(p.AccountingStatus) ? "Pending" : p.AccountingStatus,
                AccountingReference = p.AccountingReference,
                AccountingExportedAt = p.AccountingExportedAt,
                Details = detailDtos
            };
        }
    }
}
