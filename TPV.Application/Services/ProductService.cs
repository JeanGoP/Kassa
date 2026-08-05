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
    public class ProductService : IProductService
    {
        private const string ProductIncludes = "Category,Stocks,Brand,BaseUnit,PurchaseUnit,SaleUnit,UnitConversions," +
            "Applicabilities.VehicleModel.Brand,OutgoingReferenceRelations.RelatedProduct," +
            "IncomingReferenceRelations.Product,KitComponents.ComponentProduct,KitComponents.UnitOfMeasure";

        private static readonly HashSet<string> CatalogStatuses = new(StringComparer.OrdinalIgnoreCase)
            { "ACTIVO", "DESCONTINUADO", "BLOQUEADO" };
        private static readonly HashSet<string> OriginTypes = new(StringComparer.OrdinalIgnoreCase)
            { "ORIGINAL", "HOMOLOGO", "GENERICO", "NO_CLASIFICADO", "NO_APLICA" };
        private static readonly HashSet<string> ReferenceTypes = new(StringComparer.OrdinalIgnoreCase)
            { "SIMPLE", "KIT" };
        private static readonly HashSet<string> SourceTypes = new(StringComparer.OrdinalIgnoreCase)
            { "CATALOGO_OFICIAL", "OTRA_FUENTE" };
        private static readonly HashSet<string> RelationTypes = new(StringComparer.OrdinalIgnoreCase)
            { "INTERCAMBIABLE", "SUSTITUYE_A" };

        private readonly IRepository<Product> _productRepository;
        private readonly IRepository<Category> _categoryRepository;
        private readonly IRepository<Brand> _brandRepository;
        private readonly IRepository<VehicleModel> _modelRepository;
        private readonly IRepository<UnitOfMeasure> _unitRepository;
        private readonly IRepository<ProductUnitConversion> _conversionRepository;
        private readonly IRepository<ProductApplicability> _applicabilityRepository;
        private readonly IRepository<ProductReferenceRelation> _relationRepository;
        private readonly IRepository<ProductKitComponent> _kitComponentRepository;
        private readonly ICurrentTenantService _currentTenantService;

        public ProductService(
            IRepository<Product> productRepository,
            IRepository<Category> categoryRepository,
            IRepository<Brand> brandRepository,
            IRepository<VehicleModel> modelRepository,
            IRepository<UnitOfMeasure> unitRepository,
            IRepository<ProductUnitConversion> conversionRepository,
            IRepository<ProductApplicability> applicabilityRepository,
            IRepository<ProductReferenceRelation> relationRepository,
            IRepository<ProductKitComponent> kitComponentRepository,
            ICurrentTenantService currentTenantService)
        {
            _productRepository = productRepository;
            _categoryRepository = categoryRepository;
            _brandRepository = brandRepository;
            _modelRepository = modelRepository;
            _unitRepository = unitRepository;
            _conversionRepository = conversionRepository;
            _applicabilityRepository = applicabilityRepository;
            _relationRepository = relationRepository;
            _kitComponentRepository = kitComponentRepository;
            _currentTenantService = currentTenantService;
        }

        public async Task<IEnumerable<ProductDto>> GetAllProductsAsync(int? branchId = null)
        {
            var products = await _productRepository.GetAsync(null, null, ProductIncludes);
            return products.Select(product => MapProduct(product, branchId));
        }

        public async Task<ProductDto> GetProductByIdAsync(int id)
        {
            var product = (await _productRepository.GetAsync(p => p.Id == id, null, ProductIncludes)).FirstOrDefault();
            return product == null ? null! : MapProduct(product, null);
        }

        public async Task<ProductDto> CreateProductAsync(ProductDto dto)
        {
            var tenantId = RequireTenant();
            Normalize(dto);
            await ValidateSkuAsync(dto.SKU);
            await ValidateCatalogAsync(dto, tenantId, null);
            var units = await ValidateUnitsAsync(dto, tenantId);

            var product = new Product
            {
                TenantId = tenantId,
                SKU = dto.SKU,
                Barcode = Clean(dto.Barcode),
                Name = Required(dto.Name, "El nombre del artículo es obligatorio."),
                Description = Clean(dto.Description) ?? string.Empty,
                Type = dto.Type,
                UnitOfMeasure = units.Base.Code,
                BaseUnitId = units.Base.Id,
                PurchaseUnitId = units.Purchase.Id,
                SaleUnitId = units.Sale.Id,
                AllowsFractionalQuantity = dto.AllowsFractionalQuantity,
                Price = dto.Price,
                CategoryId = dto.CategoryId,
                ProfitabilityPercentage = dto.ProfitabilityPercentage,
                IvaType = dto.IvaType,
                IvaRate = dto.IvaRate,
                ImpoconsumoRate = dto.ImpoconsumoRate,
                PriceIncludesIva = dto.PriceIncludesIva,
                BrandId = dto.BrandId,
                IsActive = dto.CatalogStatus == "ACTIVO"
            };
            ApplyAdvancedFields(product, dto);

            var created = await _productRepository.AddAsync(product);
            await SaveConversionsAsync(created.Id, dto, units);
            await SyncAdvancedRelationsAsync(created.Id, tenantId, dto);
            return await GetProductByIdAsync(created.Id);
        }

        public async Task UpdateProductAsync(ProductDto dto)
        {
            var tenantId = RequireTenant();
            Normalize(dto);
            var product = await _productRepository.GetByIdAsync(dto.Id)
                ?? throw new InvalidOperationException("El artículo no existe.");
            if (product.TenantId != tenantId) throw new InvalidOperationException("El artículo no pertenece a la empresa actual.");

            await ValidateSkuAsync(dto.SKU, dto.Id);
            await ValidateCatalogAsync(dto, tenantId, dto.Id);
            var units = await ValidateUnitsAsync(dto, tenantId);

            product.SKU = dto.SKU;
            product.Barcode = Clean(dto.Barcode);
            product.Name = Required(dto.Name, "El nombre del artículo es obligatorio.");
            product.Description = Clean(dto.Description) ?? string.Empty;
            product.Type = dto.Type;
            product.UnitOfMeasure = units.Base.Code;
            product.BaseUnitId = units.Base.Id;
            product.PurchaseUnitId = units.Purchase.Id;
            product.SaleUnitId = units.Sale.Id;
            product.AllowsFractionalQuantity = dto.AllowsFractionalQuantity;
            product.Price = dto.Price;
            product.ProfitabilityPercentage = dto.ProfitabilityPercentage;
            product.IvaType = dto.IvaType;
            product.IvaRate = dto.IvaRate;
            product.ImpoconsumoRate = dto.ImpoconsumoRate;
            product.PriceIncludesIva = dto.PriceIncludesIva;
            product.CategoryId = dto.CategoryId;
            product.BrandId = dto.BrandId;
            product.IsActive = dto.CatalogStatus == "ACTIVO";
            product.UpdatedAt = DateTime.UtcNow;
            ApplyAdvancedFields(product, dto);

            await _productRepository.UpdateAsync(product);
            await SaveConversionsAsync(product.Id, dto, units);
            await SyncAdvancedRelationsAsync(product.Id, tenantId, dto);
        }

        public async Task DeleteProductAsync(int id)
        {
            var product = await _productRepository.GetByIdAsync(id);
            if (product == null) return;
            product.CatalogStatus = "DESCONTINUADO";
            product.IsActive = false;
            product.UpdatedAt = DateTime.UtcNow;
            await _productRepository.UpdateAsync(product);
        }

        private async Task ValidateCatalogAsync(ProductDto dto, int tenantId, int? productId)
        {
            if (!CatalogStatuses.Contains(dto.CatalogStatus)) throw new InvalidOperationException("El estado del artículo no es válido.");
            if (!OriginTypes.Contains(dto.OriginType)) throw new InvalidOperationException("El tipo de artículo no es válido.");
            if (!ReferenceTypes.Contains(dto.ReferenceType)) throw new InvalidOperationException("El tipo de referencia debe ser SIMPLE o KIT.");
            if (dto.OriginType == "ORIGINAL" && !dto.BrandId.HasValue)
                throw new InvalidOperationException("Un artículo ORIGINAL debe tener una marca formal.");
            if (dto.IsOfficialCatalog && !dto.BrandId.HasValue)
                throw new InvalidOperationException("Una referencia de lista oficial debe tener una marca formal.");

            await ValidateBrandAsync(dto.BrandId, tenantId);
            var category = await _categoryRepository.GetByIdAsync(dto.CategoryId);
            if (category == null || category.TenantId != tenantId || !category.IsActive)
                throw new InvalidOperationException("Seleccione una categoría activa de la empresa actual.");

            ValidateNonNegative(dto.MinimumOrderQuantity, "La cantidad mínima de pedido");
            ValidateNonNegative(dto.OrderMultiple, "El múltiplo de pedido");
            ValidateNonNegative(dto.ReorderPoint, "El punto de reorden");
            ValidateNonNegative(dto.MinimumStock, "El inventario mínimo");
            ValidateNonNegative(dto.MaximumStock, "El inventario máximo");
            ValidateNullableNonNegative(dto.WeightKg, "El peso");
            ValidateNullableNonNegative(dto.LengthCm, "El largo");
            ValidateNullableNonNegative(dto.WidthCm, "El ancho");
            ValidateNullableNonNegative(dto.HeightCm, "El alto");
            if (dto.LeadTimeDays < 0) throw new InvalidOperationException("El tiempo de reposición no puede ser negativo.");
            if (dto.MaximumStock > 0 && dto.MinimumStock > dto.MaximumStock)
                throw new InvalidOperationException("El inventario mínimo no puede superar el máximo.");
            if (dto.ReorderPoint > 0 && dto.ReorderPoint < dto.MinimumStock)
                throw new InvalidOperationException("El punto de reorden no puede ser inferior al inventario mínimo.");
            if (dto.MaximumStock > 0 && dto.ReorderPoint > dto.MaximumStock)
                throw new InvalidOperationException("El punto de reorden no puede superar el inventario máximo.");

            var applicabilityIds = dto.Applicabilities.Select(a => a.VehicleModelId).ToList();
            if (applicabilityIds.Count != applicabilityIds.Distinct().Count())
                throw new InvalidOperationException("No repita modelos en la aplicabilidad del artículo.");
            foreach (var applicability in dto.Applicabilities)
            {
                ValidateSource(applicability.SourceType);
                var model = await _modelRepository.GetByIdAsync(applicability.VehicleModelId);
                if (model == null || model.TenantId != tenantId || !model.IsActive)
                    throw new InvalidOperationException("La aplicabilidad contiene un modelo inexistente o inactivo.");
            }

            var relationKeys = dto.ReferenceRelations.Select(r => $"{r.RelatedProductId}:{r.RelationType.ToUpperInvariant()}").ToList();
            if (relationKeys.Count != relationKeys.Distinct().Count())
                throw new InvalidOperationException("No repita la misma relación entre referencias.");
            foreach (var relation in dto.ReferenceRelations)
            {
                relation.RelationType = relation.RelationType.Trim().ToUpperInvariant();
                relation.SourceType = relation.SourceType.Trim().ToUpperInvariant();
                if (!RelationTypes.Contains(relation.RelationType)) throw new InvalidOperationException("El tipo de relación entre referencias no es válido.");
                ValidateSource(relation.SourceType);
                if (productId.HasValue && relation.RelatedProductId == productId.Value)
                    throw new InvalidOperationException("Un artículo no puede relacionarse consigo mismo.");
                var related = await _productRepository.GetByIdAsync(relation.RelatedProductId);
                if (related == null || related.TenantId != tenantId)
                    throw new InvalidOperationException("La relación contiene un artículo que no pertenece a la empresa actual.");
                if (relation.RelationType == "SUSTITUYE_A" && !relation.EffectiveFrom.HasValue)
                    throw new InvalidOperationException("Una sustitución debe indicar su fecha de vigencia.");
            }

            var componentIds = dto.KitComponents.Select(c => c.ComponentProductId).ToList();
            if (componentIds.Count != componentIds.Distinct().Count())
                throw new InvalidOperationException("No repita componentes dentro del kit.");
            if (dto.ReferenceType == "SIMPLE" && dto.KitComponents.Count > 0)
                throw new InvalidOperationException("Una referencia SIMPLE no puede tener componentes de kit.");
            if (dto.ReferenceType == "KIT" && dto.KitComponents.Count == 0)
                throw new InvalidOperationException("Una referencia KIT debe incluir al menos un componente.");
            foreach (var component in dto.KitComponents)
            {
                if (component.Quantity <= 0) throw new InvalidOperationException("La cantidad de cada componente del kit debe ser mayor que cero.");
                if (productId.HasValue && component.ComponentProductId == productId.Value)
                    throw new InvalidOperationException("Un kit no puede contenerse a sí mismo.");
                var componentProduct = await _productRepository.GetByIdAsync(component.ComponentProductId);
                if (componentProduct == null || componentProduct.TenantId != tenantId)
                    throw new InvalidOperationException("El kit contiene un artículo que no pertenece a la empresa actual.");
                var unit = await _unitRepository.GetByIdAsync(component.UnitOfMeasureId);
                if (unit == null || unit.TenantId != tenantId || !unit.IsActive)
                    throw new InvalidOperationException("El kit contiene una unidad inexistente o inactiva.");
            }
        }

        private async Task SyncAdvancedRelationsAsync(int productId, int tenantId, ProductDto dto)
        {
            await SyncApplicabilitiesAsync(productId, tenantId, dto.Applicabilities);
            await SyncReferenceRelationsAsync(productId, tenantId, dto.ReferenceRelations);
            await SyncKitComponentsAsync(productId, tenantId, dto.ReferenceType == "KIT" ? dto.KitComponents : new List<ProductKitComponentDto>());
        }

        private async Task SyncApplicabilitiesAsync(int productId, int tenantId, IReadOnlyCollection<ProductApplicabilityDto> desired)
        {
            var existing = (await _applicabilityRepository.GetAsync(a => a.ProductId == productId, disableTracking: false)).ToList();
            var desiredByModel = desired.ToDictionary(a => a.VehicleModelId);
            foreach (var row in existing.Where(row => !desiredByModel.ContainsKey(row.VehicleModelId)).ToList())
                await _applicabilityRepository.DeleteAsync(row);
            foreach (var item in desired)
            {
                var row = existing.FirstOrDefault(a => a.VehicleModelId == item.VehicleModelId);
                if (row == null)
                    await _applicabilityRepository.AddAsync(new ProductApplicability
                    {
                        TenantId = tenantId, ProductId = productId, VehicleModelId = item.VehicleModelId, SourceType = item.SourceType
                    });
                else if (row.SourceType != item.SourceType)
                {
                    row.SourceType = item.SourceType;
                    row.UpdatedAt = DateTime.UtcNow;
                    await _applicabilityRepository.UpdateAsync(row);
                }
            }
        }

        private async Task SyncReferenceRelationsAsync(int productId, int tenantId, IReadOnlyCollection<ProductReferenceRelationDto> desired)
        {
            var desiredEquivalences = desired.Where(r => r.RelationType == "INTERCAMBIABLE").ToDictionary(r => r.RelatedProductId);
            var existingEquivalences = (await _relationRepository.GetAsync(r => r.RelationType == "INTERCAMBIABLE" &&
                (r.ProductId == productId || r.RelatedProductId == productId), disableTracking: false)).ToList();
            foreach (var row in existingEquivalences)
            {
                var otherId = row.ProductId == productId ? row.RelatedProductId : row.ProductId;
                if (!desiredEquivalences.ContainsKey(otherId)) await _relationRepository.DeleteAsync(row);
            }
            foreach (var item in desiredEquivalences.Values)
            {
                var row = existingEquivalences.FirstOrDefault(r =>
                    (r.ProductId == productId && r.RelatedProductId == item.RelatedProductId) ||
                    (r.RelatedProductId == productId && r.ProductId == item.RelatedProductId));
                if (row == null)
                    await _relationRepository.AddAsync(new ProductReferenceRelation
                    {
                        TenantId = tenantId,
                        ProductId = Math.Min(productId, item.RelatedProductId),
                        RelatedProductId = Math.Max(productId, item.RelatedProductId),
                        RelationType = "INTERCAMBIABLE",
                        SourceType = item.SourceType
                    });
                else if (row.SourceType != item.SourceType)
                {
                    row.SourceType = item.SourceType;
                    row.UpdatedAt = DateTime.UtcNow;
                    await _relationRepository.UpdateAsync(row);
                }
            }

            var desiredSubstitutions = desired.Where(r => r.RelationType == "SUSTITUYE_A").ToDictionary(r => r.RelatedProductId);
            var existingSubstitutions = (await _relationRepository.GetAsync(r => r.ProductId == productId && r.RelationType == "SUSTITUYE_A", disableTracking: false)).ToList();
            foreach (var row in existingSubstitutions.Where(row => !desiredSubstitutions.ContainsKey(row.RelatedProductId)).ToList())
                await _relationRepository.DeleteAsync(row);
            foreach (var item in desiredSubstitutions.Values)
            {
                var row = existingSubstitutions.FirstOrDefault(r => r.RelatedProductId == item.RelatedProductId);
                if (row == null)
                    await _relationRepository.AddAsync(new ProductReferenceRelation
                    {
                        TenantId = tenantId, ProductId = productId, RelatedProductId = item.RelatedProductId,
                        RelationType = "SUSTITUYE_A", SourceType = item.SourceType, EffectiveFrom = item.EffectiveFrom
                    });
                else if (row.SourceType != item.SourceType || row.EffectiveFrom != item.EffectiveFrom)
                {
                    row.SourceType = item.SourceType;
                    row.EffectiveFrom = item.EffectiveFrom;
                    row.UpdatedAt = DateTime.UtcNow;
                    await _relationRepository.UpdateAsync(row);
                }
            }
        }

        private async Task SyncKitComponentsAsync(int productId, int tenantId, IReadOnlyCollection<ProductKitComponentDto> desired)
        {
            var existing = (await _kitComponentRepository.GetAsync(c => c.KitProductId == productId, disableTracking: false)).ToList();
            var desiredByProduct = desired.ToDictionary(c => c.ComponentProductId);
            foreach (var row in existing.Where(row => !desiredByProduct.ContainsKey(row.ComponentProductId)).ToList())
                await _kitComponentRepository.DeleteAsync(row);
            foreach (var item in desired)
            {
                var row = existing.FirstOrDefault(c => c.ComponentProductId == item.ComponentProductId);
                if (row == null)
                    await _kitComponentRepository.AddAsync(new ProductKitComponent
                    {
                        TenantId = tenantId, KitProductId = productId, ComponentProductId = item.ComponentProductId,
                        Quantity = item.Quantity, UnitOfMeasureId = item.UnitOfMeasureId
                    });
                else if (row.Quantity != item.Quantity || row.UnitOfMeasureId != item.UnitOfMeasureId)
                {
                    row.Quantity = item.Quantity;
                    row.UnitOfMeasureId = item.UnitOfMeasureId;
                    row.UpdatedAt = DateTime.UtcNow;
                    await _kitComponentRepository.UpdateAsync(row);
                }
            }
        }

        private async Task ValidateSkuAsync(string sku, int? currentId = null)
        {
            var duplicate = await _productRepository.GetAsync(p => p.SKU.Trim() == sku && (!currentId.HasValue || p.Id != currentId.Value));
            if (duplicate.Any()) throw new InvalidOperationException($"Ya existe un artículo con el código {sku}.");
        }

        private async Task ValidateBrandAsync(int? brandId, int tenantId)
        {
            if (!brandId.HasValue) return;
            var brand = await _brandRepository.GetByIdAsync(brandId.Value);
            if (brand == null || brand.TenantId != tenantId || !brand.IsActive)
                throw new InvalidOperationException("Seleccione una marca activa de la empresa actual.");
        }

        private async Task<(UnitOfMeasure Base, UnitOfMeasure Purchase, UnitOfMeasure Sale)> ValidateUnitsAsync(ProductDto dto, int tenantId)
        {
            var fallback = (await _unitRepository.GetAsync(u => u.Code == "UND" && u.IsActive)).FirstOrDefault()
                ?? throw new InvalidOperationException("No está configurada la unidad UND para la empresa.");
            var baseUnit = dto.BaseUnitId.HasValue ? await _unitRepository.GetByIdAsync(dto.BaseUnitId.Value) : fallback;
            var purchaseUnit = dto.PurchaseUnitId.HasValue ? await _unitRepository.GetByIdAsync(dto.PurchaseUnitId.Value) : baseUnit;
            var saleUnit = dto.SaleUnitId.HasValue ? await _unitRepository.GetByIdAsync(dto.SaleUnitId.Value) : baseUnit;
            if (baseUnit == null || purchaseUnit == null || saleUnit == null ||
                baseUnit.TenantId != tenantId || purchaseUnit.TenantId != tenantId || saleUnit.TenantId != tenantId ||
                !baseUnit.IsActive || !purchaseUnit.IsActive || !saleUnit.IsActive)
                throw new InvalidOperationException("Seleccione unidades de medida activas.");
            if (dto.PurchaseFactorToBase <= 0 || dto.SaleFactorToBase <= 0)
                throw new InvalidOperationException("Los factores de conversión deben ser mayores que cero.");
            dto.UnitOfMeasure = baseUnit.Code;
            return (baseUnit, purchaseUnit, saleUnit);
        }

        private async Task SaveConversionsAsync(int productId, ProductDto dto, (UnitOfMeasure Base, UnitOfMeasure Purchase, UnitOfMeasure Sale) units)
        {
            await UpsertConversionAsync(productId, units.Base.Id, "BASE", 1m);
            await UpsertConversionAsync(productId, units.Purchase.Id, "PURCHASE", dto.PurchaseFactorToBase);
            await UpsertConversionAsync(productId, units.Sale.Id, "SALE", dto.SaleFactorToBase);
        }

        private async Task UpsertConversionAsync(int productId, int unitId, string usageType, decimal factor)
        {
            var row = (await _conversionRepository.GetAsync(c => c.ProductId == productId && c.UsageType == usageType, disableTracking: false)).FirstOrDefault();
            if (row == null)
                await _conversionRepository.AddAsync(new ProductUnitConversion { ProductId = productId, UnitOfMeasureId = unitId, UsageType = usageType, FactorToBase = factor });
            else
            {
                row.UnitOfMeasureId = unitId;
                row.FactorToBase = factor;
                await _conversionRepository.UpdateAsync(row);
            }
        }

        private static ProductDto MapProduct(Product product, int? branchId)
        {
            var price = product.Price;
            var branchStock = branchId.HasValue ? product.Stocks?.FirstOrDefault(stock => stock.BranchId == branchId.Value) : null;
            if (branchStock != null && branchStock.Cost > 0 && (product.ProfitabilityPercentage ?? 0) > 0)
            {
                price = branchStock.Cost * (1 + product.ProfitabilityPercentage!.Value / 100);
                if (product.PriceIncludesIva && product.IvaRate > 0) price *= 1 + product.IvaRate / 100;
                price = Math.Round(price, 2);
            }

            var relations = product.OutgoingReferenceRelations
                .Where(relation => relation.RelationType == "INTERCAMBIABLE")
                .Select(relation => MapRelation(relation, relation.RelatedProduct))
                .Concat(product.IncomingReferenceRelations
                    .Where(relation => relation.RelationType == "INTERCAMBIABLE")
                    .Select(relation => MapRelation(relation, relation.Product)))
                .Concat(product.OutgoingReferenceRelations
                    .Where(relation => relation.RelationType == "SUSTITUYE_A")
                    .Select(relation => MapRelation(relation, relation.RelatedProduct)))
                .OrderBy(relation => relation.RelationType)
                .ThenBy(relation => relation.RelatedReference)
                .ToList();

            return new ProductDto
            {
                Id = product.Id,
                SKU = product.SKU,
                Barcode = product.Barcode,
                Name = product.Name,
                Description = product.Description,
                Type = product.Type,
                UnitOfMeasure = product.UnitOfMeasure,
                BaseUnitId = product.BaseUnitId,
                BaseUnitCode = product.BaseUnit?.Code,
                PurchaseUnitId = product.PurchaseUnitId,
                PurchaseUnitCode = product.PurchaseUnit?.Code,
                PurchaseFactorToBase = product.UnitConversions.FirstOrDefault(c => c.UsageType == "PURCHASE")?.FactorToBase ?? 1m,
                SaleUnitId = product.SaleUnitId,
                SaleUnitCode = product.SaleUnit?.Code,
                SaleFactorToBase = product.UnitConversions.FirstOrDefault(c => c.UsageType == "SALE")?.FactorToBase ?? 1m,
                AllowsFractionalQuantity = product.AllowsFractionalQuantity,
                Price = price,
                ProfitabilityPercentage = product.ProfitabilityPercentage,
                IvaType = product.IvaType,
                IvaRate = product.IvaRate,
                ImpoconsumoRate = product.ImpoconsumoRate,
                PriceIncludesIva = product.PriceIncludesIva,
                BrandId = product.BrandId,
                BrandName = product.Brand?.Name,
                CatalogStatus = product.CatalogStatus,
                OriginType = product.OriginType,
                IsOfficialCatalog = product.IsOfficialCatalog,
                Manufacturer = product.Manufacturer,
                ReferenceType = product.ReferenceType,
                MinimumOrderQuantity = product.MinimumOrderQuantity,
                OrderMultiple = product.OrderMultiple,
                WeightKg = product.WeightKg,
                LengthCm = product.LengthCm,
                WidthCm = product.WidthCm,
                HeightCm = product.HeightCm,
                LeadTimeDays = product.LeadTimeDays,
                ReorderPoint = product.ReorderPoint,
                MinimumStock = product.MinimumStock,
                MaximumStock = product.MaximumStock,
                CategoryId = product.CategoryId,
                CategoryName = product.Category?.Name,
                StockQuantity = product.Stocks?.Where(stock => !branchId.HasValue || stock.BranchId == branchId.Value).Sum(stock => stock.Quantity) ?? 0,
                Applicabilities = product.Applicabilities.OrderBy(a => a.VehicleModel.Brand.Name).ThenBy(a => a.VehicleModel.Name).Select(a => new ProductApplicabilityDto
                {
                    VehicleModelId = a.VehicleModelId,
                    BrandName = a.VehicleModel.Brand?.Name,
                    ModelCode = a.VehicleModel.Code,
                    ModelName = a.VehicleModel.Name,
                    SourceType = a.SourceType
                }).ToList(),
                ReferenceRelations = relations,
                KitComponents = product.KitComponents.OrderBy(c => c.ComponentProduct.SKU).Select(c => new ProductKitComponentDto
                {
                    ComponentProductId = c.ComponentProductId,
                    ComponentReference = c.ComponentProduct.SKU,
                    ComponentDescription = c.ComponentProduct.Name,
                    Quantity = c.Quantity,
                    UnitOfMeasureId = c.UnitOfMeasureId,
                    UnitCode = c.UnitOfMeasure.Code
                }).ToList()
            };
        }

        private static ProductReferenceRelationDto MapRelation(ProductReferenceRelation relation, Product related) => new()
        {
            RelatedProductId = related.Id,
            RelatedReference = related.SKU,
            RelatedDescription = related.Name,
            RelationType = relation.RelationType,
            SourceType = relation.SourceType,
            EffectiveFrom = relation.EffectiveFrom
        };

        private static void ApplyAdvancedFields(Product product, ProductDto dto)
        {
            product.CatalogStatus = dto.CatalogStatus;
            product.OriginType = dto.OriginType;
            product.IsOfficialCatalog = dto.IsOfficialCatalog;
            product.Manufacturer = Clean(dto.Manufacturer);
            product.ReferenceType = dto.ReferenceType;
            product.MinimumOrderQuantity = dto.MinimumOrderQuantity;
            product.OrderMultiple = dto.OrderMultiple;
            product.WeightKg = dto.WeightKg;
            product.LengthCm = dto.LengthCm;
            product.WidthCm = dto.WidthCm;
            product.HeightCm = dto.HeightCm;
            product.LeadTimeDays = dto.LeadTimeDays;
            product.ReorderPoint = dto.ReorderPoint;
            product.MinimumStock = dto.MinimumStock;
            product.MaximumStock = dto.MaximumStock;
        }

        private static void Normalize(ProductDto dto)
        {
            dto.SKU = Required(dto.SKU, "La referencia del artículo es obligatoria.").ToUpperInvariant();
            dto.Type = string.IsNullOrWhiteSpace(dto.Type) ? "Producto" : dto.Type.Trim();
            dto.CatalogStatus = Required(dto.CatalogStatus, "El estado del artículo es obligatorio.").ToUpperInvariant();
            dto.OriginType = Required(dto.OriginType, "El tipo de artículo es obligatorio.").ToUpperInvariant();
            dto.ReferenceType = Required(dto.ReferenceType, "El tipo de referencia es obligatorio.").ToUpperInvariant();
            dto.Applicabilities ??= new List<ProductApplicabilityDto>();
            dto.ReferenceRelations ??= new List<ProductReferenceRelationDto>();
            dto.KitComponents ??= new List<ProductKitComponentDto>();
            foreach (var item in dto.Applicabilities) item.SourceType = Required(item.SourceType, "Indique el origen de la aplicabilidad.").ToUpperInvariant();
            foreach (var item in dto.ReferenceRelations)
            {
                item.RelationType = Required(item.RelationType, "Indique el tipo de relación entre referencias.").ToUpperInvariant();
                item.SourceType = Required(item.SourceType, "Indique el origen de la relación entre referencias.").ToUpperInvariant();
            }
        }

        private int RequireTenant() => _currentTenantService.TenantId
            ?? throw new InvalidOperationException("No se pudo determinar la empresa actual.");

        private static void ValidateSource(string sourceType)
        {
            if (!SourceTypes.Contains(sourceType)) throw new InvalidOperationException("El origen debe ser CATÁLOGO OFICIAL u OTRA FUENTE.");
        }

        private static void ValidateNonNegative(decimal value, string field)
        {
            if (value < 0) throw new InvalidOperationException($"{field} no puede ser negativo.");
        }

        private static void ValidateNullableNonNegative(decimal? value, string field)
        {
            if (value < 0) throw new InvalidOperationException($"{field} no puede ser negativo.");
        }

        private static string Required(string? value, string message) =>
            string.IsNullOrWhiteSpace(value) ? throw new InvalidOperationException(message) : value.Trim();

        private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}
