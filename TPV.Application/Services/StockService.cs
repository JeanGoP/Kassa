using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using TPV.Application.DTOs;
using TPV.Application.Interfaces;
using TPV.Domain.Entities;
using TPV.Domain.Interfaces;

namespace TPV.Application.Services
{
    public class StockService : IStockService
    {
        private static readonly (string Code, string Name, string Symbol, bool AllowsDecimals)[] DefaultUnits =
        {
            ("UND", "UNIDAD", "UND", false),
            ("CAJA", "CAJA", "CAJA", false),
            ("L", "LITRO", "L", true),
            ("ML", "MILILITRO", "ML", true),
            ("KG", "KILOGRAMO", "KG", true),
            ("G", "GRAMO", "G", true),
            ("M", "METRO", "M", true),
            ("H", "HORA", "H", true)
        };

        private readonly IRepository<Stock> _stocks;
        private readonly IRepository<Product> _products;
        private readonly IRepository<UnitOfMeasure> _units;
        private readonly IRepository<ProductUnitConversion> _conversions;
        private readonly IRepository<InventoryLocation> _locations;
        private readonly IRepository<InventoryLocationBalance> _balances;
        private readonly IRepository<InventoryMovement> _movements;
        private readonly IUserService _users;
        private readonly ICurrentTenantService _currentTenant;

        public StockService(
            IRepository<Stock> stocks,
            IRepository<Product> products,
            IRepository<UnitOfMeasure> units,
            IRepository<ProductUnitConversion> conversions,
            IRepository<InventoryLocation> locations,
            IRepository<InventoryLocationBalance> balances,
            IRepository<InventoryMovement> movements,
            IUserService users,
            ICurrentTenantService currentTenant)
        {
            _stocks = stocks;
            _products = products;
            _units = units;
            _conversions = conversions;
            _locations = locations;
            _balances = balances;
            _movements = movements;
            _users = users;
            _currentTenant = currentTenant;
        }

        public async Task<IEnumerable<StockDto>> GetStockByBranchAsync(int branchId, string? userId = null)
        {
            await EnsureBranchAccessAsync(branchId, userId, true);
            var rows = await _stocks.GetAsync(s => s.BranchId == branchId, null, "Product,Product.BaseUnit,Branch");
            return rows.Select(MapStock);
        }

        public async Task<IEnumerable<StockDto>> GetLowStockAlertsAsync(int branchId, string? userId = null)
        {
            await EnsureBranchAccessAsync(branchId, userId, true);
            var rows = await _stocks.GetAsync(s => s.BranchId == branchId && s.Quantity <= s.MinStockLevel, null, "Product,Product.BaseUnit,Branch");
            return rows.Select(MapStock);
        }

        public async Task UpdateStockAsync(int productId, int branchId, decimal quantity, decimal minStockLevel, decimal maxStockLevel, string? userId = null)
        {
            await EnsureBranchAccessAsync(branchId, userId);
            if (quantity < 0 || minStockLevel < 0 || maxStockLevel < 0)
                throw new InvalidOperationException("Las cantidades de inventario no pueden ser negativas.");

            var stock = (await _stocks.GetAsync(s => s.ProductId == productId && s.BranchId == branchId, disableTracking: false)).FirstOrDefault();
            var previous = stock?.Quantity ?? 0m;
            var delta = quantity - previous;
            if (delta < 0)
            {
                var location = await ResolveLocationAsync(branchId, null);
                await EnsureLocationBalanceAsync(productId, location.Id, Math.Abs(delta));
            }
            if (stock == null)
            {
                stock = await _stocks.AddAsync(new Stock { ProductId = productId, BranchId = branchId, Quantity = quantity, MinStockLevel = minStockLevel, MaxStockLevel = maxStockLevel });
            }
            else
            {
                stock.Quantity = quantity;
                stock.MinStockLevel = minStockLevel;
                stock.MaxStockLevel = maxStockLevel;
                await _stocks.UpdateAsync(stock);
            }

            if (delta != 0)
                await RecordBaseMovementAsync(productId, branchId, Math.Abs(delta), delta > 0, "AJUSTE", null, null, null, "Actualización manual de existencia", null, null, userId);
        }

        public async Task AdjustStockAsync(int productId, int branchId, decimal? quantity, decimal? cost, string reason, int? locationId = null, string? userId = null)
        {
            await EnsureBranchAccessAsync(branchId, userId);
            if (!quantity.HasValue && !cost.HasValue)
                throw new InvalidOperationException("Indique una cantidad o un costo.");
            if (quantity < 0 || cost < 0)
                throw new InvalidOperationException("La cantidad y el costo no pueden ser negativos.");

            var stock = (await _stocks.GetAsync(s => s.ProductId == productId && s.BranchId == branchId, disableTracking: false)).FirstOrDefault();
            var previous = stock?.Quantity ?? 0m;
            var delta = quantity.HasValue ? quantity.Value - previous : 0m;
            if (delta < 0)
            {
                var location = await ResolveLocationAsync(branchId, locationId);
                await EnsureLocationBalanceAsync(productId, location.Id, Math.Abs(delta));
            }
            if (stock == null)
            {
                stock = await _stocks.AddAsync(new Stock { ProductId = productId, BranchId = branchId, Quantity = quantity ?? 0m, Cost = cost ?? 0m });
            }
            else
            {
                if (quantity.HasValue) stock.Quantity = quantity.Value;
                if (cost.HasValue) stock.Cost = cost.Value;
                await _stocks.UpdateAsync(stock);
            }

            if (quantity.HasValue)
            {
                if (delta != 0)
                    await RecordBaseMovementAsync(productId, branchId, Math.Abs(delta), delta > 0, "AJUSTE", null, null, null, reason, locationId, null, userId);
            }
        }

        public async Task TransferStockAsync(int productId, int sourceBranchId, int targetBranchId, decimal quantity, string notes, int? unitOfMeasureId = null, int? sourceLocationId = null, int? targetLocationId = null, string? userId = null)
        {
            if (sourceBranchId == targetBranchId && sourceLocationId == targetLocationId)
                throw new InvalidOperationException("El origen y el destino deben ser diferentes.");
            if (quantity <= 0) throw new InvalidOperationException("La cantidad debe ser mayor que cero.");
            await EnsureTransferAccessAsync(sourceBranchId, userId);

            var resolved = await ResolveUnitAsync(productId, unitOfMeasureId, "SALE");
            var baseQuantity = quantity * resolved.Factor;
            var sourceLocation = await ResolveLocationAsync(sourceBranchId, sourceLocationId);
            var targetLocation = await ResolveLocationAsync(targetBranchId, targetLocationId);
            await EnsureLocationBalanceAsync(productId, sourceLocation.Id, baseQuantity);

            if (sourceBranchId == targetBranchId)
            {
                await ChangeLocationBalanceAsync(productId, sourceLocation.Id, -baseQuantity);
                await ChangeLocationBalanceAsync(productId, targetLocation.Id, baseQuantity);
                await _movements.AddAsync(new InventoryMovement
                {
                    ProductId = productId, BranchId = sourceBranchId, InventoryLocationId = sourceLocation.Id,
                    DestinationBranchId = targetBranchId, DestinationLocationId = targetLocation.Id,
                    MovementType = "REUBICACION", Quantity = quantity, UnitOfMeasureId = resolved.Unit.Id,
                    UnitCode = resolved.Unit.Code, FactorToBase = resolved.Factor, BaseQuantity = baseQuantity,
                    DocumentType = "REUBICACION", Reason = Clean(notes), UserId = userId, OccurredAt = DateTime.UtcNow
                });
                return;
            }

            var source = (await _stocks.GetAsync(s => s.ProductId == productId && s.BranchId == sourceBranchId, disableTracking: false)).FirstOrDefault();
            if (source == null || source.Quantity < baseQuantity)
                throw new InvalidOperationException($"Stock insuficiente en la sucursal de origen. Stock actual: {source?.Quantity ?? 0}");

            var target = (await _stocks.GetAsync(s => s.ProductId == productId && s.BranchId == targetBranchId, disableTracking: false)).FirstOrDefault();
            source.Quantity -= baseQuantity;
            await _stocks.UpdateAsync(source);
            if (target == null)
            {
                target = await _stocks.AddAsync(new Stock { ProductId = productId, BranchId = targetBranchId, Quantity = baseQuantity, Cost = source.Cost });
            }
            else
            {
                var totalQuantity = target.Quantity + baseQuantity;
                target.Cost = totalQuantity > 0 ? ((target.Quantity * target.Cost) + (baseQuantity * source.Cost)) / totalQuantity : source.Cost;
                target.Quantity = totalQuantity;
                await _stocks.UpdateAsync(target);
            }

            await ChangeLocationBalanceAsync(productId, sourceLocation.Id, -baseQuantity);
            await ChangeLocationBalanceAsync(productId, targetLocation.Id, baseQuantity);
            await _movements.AddAsync(new InventoryMovement
            {
                ProductId = productId, BranchId = sourceBranchId, InventoryLocationId = sourceLocation.Id,
                DestinationBranchId = targetBranchId, DestinationLocationId = targetLocation.Id,
                MovementType = "TRASLADO", Quantity = quantity, UnitOfMeasureId = resolved.Unit.Id,
                UnitCode = resolved.Unit.Code, FactorToBase = resolved.Factor, BaseQuantity = baseQuantity,
                DocumentType = "TRASLADO", Reason = Clean(notes), UserId = userId, OccurredAt = DateTime.UtcNow
            });
        }

        public async Task ApplyMovementAsync(int productId, int branchId, decimal quantity, int? unitOfMeasureId, bool inbound, string movementType, string? documentType, int? documentId, string? documentNumber, string? reason, int? locationId, string? userId)
        {
            if (quantity <= 0) throw new InvalidOperationException("La cantidad debe ser mayor que cero.");
            var usage = inbound ? "PURCHASE" : "SALE";
            var resolved = await ResolveUnitAsync(productId, unitOfMeasureId, usage);
            var baseQuantity = quantity * resolved.Factor;
            var stock = (await _stocks.GetAsync(s => s.ProductId == productId && s.BranchId == branchId, disableTracking: false)).FirstOrDefault();
            if (!inbound && (stock == null || stock.Quantity < baseQuantity))
                throw new InvalidOperationException($"Stock insuficiente. Disponible: {stock?.Quantity ?? 0}; requerido en unidad base: {baseQuantity}.");

            var location = await ResolveLocationAsync(branchId, locationId);
            if (!inbound) await EnsureLocationBalanceAsync(productId, location.Id, baseQuantity);

            if (stock == null)
                await _stocks.AddAsync(new Stock { ProductId = productId, BranchId = branchId, Quantity = baseQuantity });
            else
            {
                stock.Quantity += inbound ? baseQuantity : -baseQuantity;
                await _stocks.UpdateAsync(stock);
            }

            await ChangeLocationBalanceAsync(productId, location.Id, inbound ? baseQuantity : -baseQuantity);
            await _movements.AddAsync(new InventoryMovement
            {
                ProductId = productId, BranchId = branchId, InventoryLocationId = location.Id,
                MovementType = movementType.Trim().ToUpperInvariant(), Quantity = quantity,
                UnitOfMeasureId = resolved.Unit.Id, UnitCode = resolved.Unit.Code,
                FactorToBase = resolved.Factor, BaseQuantity = baseQuantity,
                DocumentType = Clean(documentType), DocumentId = documentId, DocumentNumber = Clean(documentNumber),
                Reason = Clean(reason), UserId = userId, OccurredAt = DateTime.UtcNow
            });
        }

        public async Task<IEnumerable<UnitOfMeasureDto>> GetUnitsAsync()
        {
            await EnsureDefaultUnitsAsync();
            var units = await _units.GetAsync(u => u.IsActive, q => q.OrderBy(u => u.Name));
            return units.Select(u => new UnitOfMeasureDto { Id = u.Id, Code = u.Code, Name = u.Name, Symbol = u.Symbol, AllowsDecimals = u.AllowsDecimals, IsActive = u.IsActive });
        }

        private async Task EnsureDefaultUnitsAsync()
        {
            var tenantId = _currentTenant.TenantId;
            if (!tenantId.HasValue || tenantId.Value <= 0) return;

            var existingUnits = (await _units.GetAsync(u => u.TenantId == tenantId.Value)).ToList();
            foreach (var definition in DefaultUnits)
            {
                var existingUnit = existingUnits.FirstOrDefault(unit =>
                    string.Equals(unit.Code.Trim(), definition.Code, StringComparison.OrdinalIgnoreCase));
                if (existingUnit != null)
                {
                    if (!existingUnit.IsActive)
                    {
                        existingUnit.IsActive = true;
                        await _units.UpdateAsync(existingUnit);
                    }
                    continue;
                }

                await _units.AddAsync(new UnitOfMeasure
                {
                    TenantId = tenantId.Value,
                    Code = definition.Code,
                    Name = definition.Name,
                    Symbol = definition.Symbol,
                    AllowsDecimals = definition.AllowsDecimals,
                    IsActive = true
                });
            }
        }

        public async Task<IEnumerable<InventoryLocationDto>> GetLocationsAsync(int branchId, string? userId = null)
        {
            await EnsureBranchAccessAsync(branchId, userId, true);
            await ResolveLocationAsync(branchId, null);
            var rows = await _locations.GetAsync(l => l.BranchId == branchId, q => q.OrderByDescending(l => l.IsDefault).ThenBy(l => l.Code), "Branch");
            return rows.Select(MapLocation);
        }

        public async Task<InventoryLocationDto> SaveLocationAsync(int? id, SaveInventoryLocationDto dto, string? userId = null)
        {
            await EnsureBranchAccessAsync(dto.BranchId, userId);
            var code = (dto.Code ?? string.Empty).Trim().ToUpperInvariant();
            var name = (dto.Name ?? string.Empty).Trim().ToUpperInvariant();
            if (string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(name))
                throw new InvalidOperationException("El código y el nombre de la ubicación son obligatorios.");
            var duplicate = await _locations.GetAsync(l => l.BranchId == dto.BranchId && l.Code == code && (!id.HasValue || l.Id != id.Value));
            if (duplicate.Any()) throw new InvalidOperationException("Ya existe una ubicación con ese código en la sucursal.");

            InventoryLocation row;
            if (id.HasValue)
            {
                row = await _locations.GetByIdAsync(id.Value) ?? throw new InvalidOperationException("Ubicación no encontrada.");
                if (row.BranchId != dto.BranchId) throw new InvalidOperationException("No se puede cambiar la sucursal de una ubicación.");
                row.Code = code; row.Name = name; row.Description = Clean(dto.Description); row.IsDefault = dto.IsDefault; row.IsActive = dto.IsActive; row.UpdatedAt = DateTime.UtcNow;
                await _locations.UpdateAsync(row);
            }
            else
            {
                row = await _locations.AddAsync(new InventoryLocation { BranchId = dto.BranchId, Code = code, Name = name, Description = Clean(dto.Description), IsDefault = dto.IsDefault, IsActive = dto.IsActive });
            }

            if (row.IsDefault)
            {
                var others = await _locations.GetAsync(l => l.BranchId == row.BranchId && l.Id != row.Id && l.IsDefault, disableTracking: false);
                foreach (var other in others) { other.IsDefault = false; await _locations.UpdateAsync(other); }
            }
            return MapLocation(row);
        }

        public async Task<IEnumerable<InventoryMovementDto>> GetMovementsAsync(int? branchId, int? productId, DateTime? fromDate, DateTime? toDate, string? userId = null)
        {
            var effectiveBranchId = branchId;
            if (effectiveBranchId.HasValue)
                await EnsureBranchAccessAsync(effectiveBranchId.Value, userId, true);
            else if (userId != null && !await _users.HasPermissionToTransferAsync(userId))
                effectiveBranchId = await _users.GetUserBranchIdAsync(userId)
                    ?? throw new UnauthorizedAccessException("El usuario no tiene una sucursal asignada.");

            var rows = await _movements.GetAsync(
                m => (!effectiveBranchId.HasValue || m.BranchId == effectiveBranchId.Value) && (!productId.HasValue || m.ProductId == productId.Value)
                     && (!fromDate.HasValue || m.OccurredAt >= fromDate.Value) && (!toDate.HasValue || m.OccurredAt <= toDate.Value),
                q => q.OrderByDescending(m => m.OccurredAt),
                "Product,Branch,InventoryLocation,DestinationBranch,DestinationLocation");
            return rows.Take(500).Select(m => new InventoryMovementDto
            {
                Id = m.Id, ProductId = m.ProductId, ProductName = m.Product?.Name ?? string.Empty, ProductSku = m.Product?.SKU ?? string.Empty,
                BranchId = m.BranchId, BranchName = m.Branch?.Name ?? string.Empty, InventoryLocationId = m.InventoryLocationId,
                LocationName = m.InventoryLocation?.Name, DestinationBranchId = m.DestinationBranchId, DestinationBranchName = m.DestinationBranch?.Name,
                DestinationLocationId = m.DestinationLocationId, DestinationLocationName = m.DestinationLocation?.Name,
                MovementType = m.MovementType, Quantity = m.Quantity, UnitOfMeasureId = m.UnitOfMeasureId, UnitCode = m.UnitCode,
                FactorToBase = m.FactorToBase, BaseQuantity = m.BaseQuantity, DocumentType = m.DocumentType, DocumentId = m.DocumentId,
                DocumentNumber = m.DocumentNumber, Reason = m.Reason, UserId = m.UserId, OccurredAt = m.OccurredAt
            });
        }

        private async Task RecordBaseMovementAsync(int productId, int branchId, decimal baseQuantity, bool inbound, string type, string? documentType, int? documentId, string? documentNumber, string? reason, int? locationId, int? destinationLocationId, string? userId)
        {
            var product = await _products.GetByIdAsync(productId) ?? throw new InvalidOperationException("Producto no encontrado.");
            var resolved = await ResolveUnitAsync(productId, product.BaseUnitId, "BASE");
            var location = await ResolveLocationAsync(branchId, locationId);
            await ChangeLocationBalanceAsync(productId, location.Id, inbound ? baseQuantity : -baseQuantity);
            await _movements.AddAsync(new InventoryMovement
            {
                ProductId = productId, BranchId = branchId, InventoryLocationId = location.Id, DestinationLocationId = destinationLocationId,
                MovementType = type, Quantity = baseQuantity, UnitOfMeasureId = resolved.Unit.Id, UnitCode = resolved.Unit.Code,
                FactorToBase = 1m, BaseQuantity = baseQuantity, DocumentType = documentType, DocumentId = documentId,
                DocumentNumber = documentNumber, Reason = reason, UserId = userId, OccurredAt = DateTime.UtcNow
            });
        }

        private async Task<(UnitOfMeasure Unit, decimal Factor)> ResolveUnitAsync(int productId, int? unitId, string usage)
        {
            var product = await _products.GetByIdAsync(productId) ?? throw new InvalidOperationException("Producto no encontrado.");
            var selectedId = unitId ?? (usage == "PURCHASE" ? product.PurchaseUnitId : usage == "SALE" ? product.SaleUnitId : product.BaseUnitId);
            UnitOfMeasure? unit = selectedId.HasValue ? await _units.GetByIdAsync(selectedId.Value) : null;
            if (unit == null)
                unit = (await _units.GetAsync(u => u.Code == (product.UnitOfMeasure ?? "UND"))).FirstOrDefault()
                    ?? (await _units.GetAsync(u => u.Code == "UND")).FirstOrDefault();
            if (unit == null) throw new InvalidOperationException("No existe una unidad de medida activa para el producto.");

            var factor = 1m;
            if (product.BaseUnitId != unit.Id)
            {
                var conversions = await _conversions.GetAsync(c => c.ProductId == productId && c.UnitOfMeasureId == unit.Id);
                factor = conversions.FirstOrDefault()?.FactorToBase ?? 0m;
                if (factor <= 0) throw new InvalidOperationException($"No existe conversión de {unit.Code} a la unidad base del producto.");
            }
            return (unit, factor);
        }

        private async Task<InventoryLocation> ResolveLocationAsync(int branchId, int? locationId)
        {
            if (locationId.HasValue)
            {
                var selected = await _locations.GetByIdAsync(locationId.Value);
                if (selected == null || selected.BranchId != branchId || !selected.IsActive)
                    throw new InvalidOperationException("La ubicación no pertenece a la sucursal o está inactiva.");
                return selected;
            }
            var existing = (await _locations.GetAsync(l => l.BranchId == branchId && l.IsDefault && l.IsActive)).FirstOrDefault()
                ?? (await _locations.GetAsync(l => l.BranchId == branchId && l.IsActive)).FirstOrDefault();
            return existing ?? await _locations.AddAsync(new InventoryLocation { BranchId = branchId, Code = "GENERAL", Name = "UBICACIÓN GENERAL", IsDefault = true });
        }

        private async Task ChangeLocationBalanceAsync(int productId, int locationId, decimal delta)
        {
            var row = (await _balances.GetAsync(b => b.ProductId == productId && b.InventoryLocationId == locationId, disableTracking: false)).FirstOrDefault();
            if (row == null)
            {
                if (delta < 0) throw new InvalidOperationException("La ubicación no tiene saldo suficiente para realizar la salida.");
                await _balances.AddAsync(new InventoryLocationBalance { ProductId = productId, InventoryLocationId = locationId, QuantityBase = delta });
                return;
            }
            if (row.QuantityBase + delta < 0) throw new InvalidOperationException($"Saldo insuficiente en la ubicación. Disponible: {row.QuantityBase}.");
            row.QuantityBase += delta;
            await _balances.UpdateAsync(row);
        }

        private async Task EnsureLocationBalanceAsync(int productId, int locationId, decimal required)
        {
            var row = (await _balances.GetAsync(b => b.ProductId == productId && b.InventoryLocationId == locationId)).FirstOrDefault();
            if (row == null || row.QuantityBase < required)
                throw new InvalidOperationException($"Saldo insuficiente en la ubicación. Disponible: {row?.QuantityBase ?? 0}; requerido: {required}.");
        }

        private async Task EnsureBranchAccessAsync(int branchId, string? userId, bool allowTransferPermission = false)
        {
            if (userId == null) return;
            if (await _users.IsUserInBranchAsync(userId, branchId)) return;
            if (allowTransferPermission && await _users.HasPermissionToTransferAsync(userId)) return;
            throw new UnauthorizedAccessException("No tiene permiso para operar el inventario de esta sucursal.");
        }

        private async Task EnsureTransferAccessAsync(int sourceBranchId, string? userId)
        {
            if (userId == null) return;
            if (await _users.HasPermissionToTransferAsync(userId) || await _users.IsUserInBranchAsync(userId, sourceBranchId)) return;
            throw new UnauthorizedAccessException("No tiene permiso para realizar el traslado.");
        }

        private static StockDto MapStock(Stock s) => new StockDto
        {
            Id = s.Id, ProductId = s.ProductId, ProductName = s.Product?.Name, ProductSKU = s.Product?.SKU,
            BranchId = s.BranchId, BranchName = s.Branch?.Name, Quantity = s.Quantity, MinStockLevel = s.MinStockLevel,
            MaxStockLevel = s.MaxStockLevel, Cost = s.Cost, BaseUnitId = s.Product?.BaseUnitId,
            BaseUnitCode = s.Product?.BaseUnit?.Code ?? s.Product?.UnitOfMeasure ?? "UND",
            BaseUnitName = s.Product?.BaseUnit?.Name ?? "UNIDAD"
        };

        private static InventoryLocationDto MapLocation(InventoryLocation l) => new InventoryLocationDto
        {
            Id = l.Id, BranchId = l.BranchId, BranchName = l.Branch?.Name ?? string.Empty, Code = l.Code,
            Name = l.Name, Description = l.Description, IsDefault = l.IsDefault, IsActive = l.IsActive
        };

        private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}
