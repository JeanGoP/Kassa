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
        private readonly IRepository<Product> _productRepository;
        private readonly IRepository<Brand> _brandRepository;
        private readonly IRepository<UnitOfMeasure> _unitRepository;
        private readonly IRepository<ProductUnitConversion> _conversionRepository;
        private readonly ICurrentTenantService _currentTenantService;

        public ProductService(
            IRepository<Product> productRepository,
            IRepository<Brand> brandRepository,
            IRepository<UnitOfMeasure> unitRepository,
            IRepository<ProductUnitConversion> conversionRepository,
            ICurrentTenantService currentTenantService)
        {
            _productRepository = productRepository;
            _brandRepository = brandRepository;
            _unitRepository = unitRepository;
            _conversionRepository = conversionRepository;
            _currentTenantService = currentTenantService;
        }

        public async Task<IEnumerable<ProductDto>> GetAllProductsAsync(int? branchId = null)
        {
            var products = await _productRepository.GetAsync(null, null, "Category,Stocks,Brand,BaseUnit,PurchaseUnit,SaleUnit,UnitConversions");
            // Manual mapping for now (AutoMapper is better but adding dependency adds complexity)
            return products.Select(p => 
            {
                decimal price = p.Price;
                var branchStock = branchId.HasValue ? p.Stocks?.FirstOrDefault(s => s.BranchId == branchId.Value) : null;

                // Calculate price dynamically if branch has cost and product has profitability
                if (branchStock != null && branchStock.Cost > 0 && (p.ProfitabilityPercentage ?? 0) > 0)
                {
                    decimal basePrice = branchStock.Cost * (1 + (p.ProfitabilityPercentage.Value / 100));
                    
                    if (p.PriceIncludesIva && p.IvaRate > 0)
                    {
                        price = basePrice * (1 + (p.IvaRate / 100));
                    }
                    else
                    {
                        price = basePrice;
                    }
                    price = System.Math.Round(price, 2);
                }

                return new ProductDto
                {
                    Id = p.Id,
                    Name = p.Name,
                    SKU = p.SKU,
                    Barcode = p.Barcode,
                    Description = p.Description,
                    Type = p.Type,
                    UnitOfMeasure = p.UnitOfMeasure,
                    BaseUnitId = p.BaseUnitId,
                    BaseUnitCode = p.BaseUnit?.Code,
                    PurchaseUnitId = p.PurchaseUnitId,
                    PurchaseUnitCode = p.PurchaseUnit?.Code,
                    PurchaseFactorToBase = p.UnitConversions?.FirstOrDefault(c => c.UsageType == "PURCHASE")?.FactorToBase ?? 1m,
                    SaleUnitId = p.SaleUnitId,
                    SaleUnitCode = p.SaleUnit?.Code,
                    SaleFactorToBase = p.UnitConversions?.FirstOrDefault(c => c.UsageType == "SALE")?.FactorToBase ?? 1m,
                    AllowsFractionalQuantity = p.AllowsFractionalQuantity,
                    Price = price,
                    // Cost = p.Cost,
                    ProfitabilityPercentage = p.ProfitabilityPercentage,
                    IvaType = p.IvaType,
                    IvaRate = p.IvaRate,
                    ImpoconsumoRate = p.ImpoconsumoRate,
                    PriceIncludesIva = p.PriceIncludesIva,
                    BrandId = p.BrandId,
                    BrandName = p.Brand?.Name,
                    CategoryId = p.CategoryId,
                    CategoryName = p.Category?.Name,
                    StockQuantity = p.Stocks?.Where(s => !branchId.HasValue || s.BranchId == branchId.Value).Sum(s => s.Quantity) ?? 0
                };
            });
        }

        public async Task<ProductDto> GetProductByIdAsync(int id)
        {
            var products = await _productRepository.GetAsync(p => p.Id == id, null, "Category,Stocks,Brand,BaseUnit,PurchaseUnit,SaleUnit,UnitConversions");
            var p = products.FirstOrDefault();
            if (p == null) return null;

            return new ProductDto
            {
                Id = p.Id,
                Name = p.Name,
                SKU = p.SKU,
                Barcode = p.Barcode,
                Description = p.Description,
                Type = p.Type,
                UnitOfMeasure = p.UnitOfMeasure,
                BaseUnitId = p.BaseUnitId,
                BaseUnitCode = p.BaseUnit?.Code,
                PurchaseUnitId = p.PurchaseUnitId,
                PurchaseUnitCode = p.PurchaseUnit?.Code,
                PurchaseFactorToBase = p.UnitConversions?.FirstOrDefault(c => c.UsageType == "PURCHASE")?.FactorToBase ?? 1m,
                SaleUnitId = p.SaleUnitId,
                SaleUnitCode = p.SaleUnit?.Code,
                SaleFactorToBase = p.UnitConversions?.FirstOrDefault(c => c.UsageType == "SALE")?.FactorToBase ?? 1m,
                AllowsFractionalQuantity = p.AllowsFractionalQuantity,
                Price = p.Price,
                // Cost = p.Cost,
                ProfitabilityPercentage = p.ProfitabilityPercentage,
                IvaType = p.IvaType,
                IvaRate = p.IvaRate,
                ImpoconsumoRate = p.ImpoconsumoRate,
                PriceIncludesIva = p.PriceIncludesIva,
                BrandId = p.BrandId,
                BrandName = p.Brand?.Name,
                CategoryId = p.CategoryId,
                CategoryName = p.Category?.Name,
                StockQuantity = p.Stocks?.Sum(s => s.Quantity) ?? 0
            };
        }

        public async Task<ProductDto> CreateProductAsync(ProductDto productDto)
        {
            await ValidateBrandAsync(productDto.BrandId);
            var units = await ValidateUnitsAsync(productDto);
            if (!string.IsNullOrEmpty(productDto.SKU))
            {
                productDto.SKU = productDto.SKU.Trim();
                var existing = await _productRepository.GetAsync(p => p.SKU.Trim() == productDto.SKU);
                if (existing.Any())
                {
                    throw new System.Exception($"Ya existe un producto con el código {productDto.SKU}");
                }
            }

            var product = new Product
            {
                Name = productDto.Name,
                SKU = productDto.SKU,
                Barcode = productDto.Barcode,
                Description = productDto.Description ?? string.Empty,
                Type = productDto.Type ?? "Producto",
                UnitOfMeasure = productDto.UnitOfMeasure ?? "UND",
                BaseUnitId = units.Base.Id,
                PurchaseUnitId = units.Purchase.Id,
                SaleUnitId = units.Sale.Id,
                AllowsFractionalQuantity = productDto.AllowsFractionalQuantity,
                Price = productDto.Price,
                CategoryId = productDto.CategoryId,
                // Cost = productDto.Cost,
                ProfitabilityPercentage = productDto.ProfitabilityPercentage,
                IvaType = productDto.IvaType,
                IvaRate = productDto.IvaRate,
                ImpoconsumoRate = productDto.ImpoconsumoRate,
                PriceIncludesIva = productDto.PriceIncludesIva,
                BrandId = productDto.BrandId
            };

            var newProduct = await _productRepository.AddAsync(product);
            await SaveConversionsAsync(newProduct.Id, productDto, units);
            productDto.Id = newProduct.Id;
            return productDto;
        }

        public async Task UpdateProductAsync(ProductDto productDto)
        {
            await ValidateBrandAsync(productDto.BrandId);
            var units = await ValidateUnitsAsync(productDto);
            var product = await _productRepository.GetByIdAsync(productDto.Id);
            if (product != null)
            {
                if (!string.IsNullOrEmpty(productDto.SKU))
                {
                    productDto.SKU = productDto.SKU.Trim();
                    if (productDto.SKU != product.SKU)
                    {
                        var existing = await _productRepository.GetAsync(p => p.SKU.Trim() == productDto.SKU && p.Id != productDto.Id);
                        if (existing.Any())
                        {
                            throw new System.Exception($"Ya existe otro producto con el código {productDto.SKU}");
                        }
                    }
                }

                product.Name = productDto.Name;
                product.SKU = productDto.SKU;
                product.Barcode = productDto.Barcode;
                product.Description = productDto.Description ?? string.Empty;
                product.Type = productDto.Type;
                product.UnitOfMeasure = productDto.UnitOfMeasure ?? "UND";
                product.BaseUnitId = units.Base.Id;
                product.PurchaseUnitId = units.Purchase.Id;
                product.SaleUnitId = units.Sale.Id;
                product.AllowsFractionalQuantity = productDto.AllowsFractionalQuantity;
                product.Price = productDto.Price;
                // product.Cost = productDto.Cost;
                product.ProfitabilityPercentage = productDto.ProfitabilityPercentage;
                product.IvaType = productDto.IvaType;
                product.IvaRate = productDto.IvaRate;
                product.ImpoconsumoRate = productDto.ImpoconsumoRate;
                product.PriceIncludesIva = productDto.PriceIncludesIva;
                product.CategoryId = productDto.CategoryId;
                product.BrandId = productDto.BrandId;
                
                await _productRepository.UpdateAsync(product);
                await SaveConversionsAsync(product.Id, productDto, units);
            }
        }

        public async Task DeleteProductAsync(int id)
        {
            var product = await _productRepository.GetByIdAsync(id);
            if (product != null)
            {
                await _productRepository.DeleteAsync(product);
            }
        }

        private async Task ValidateBrandAsync(int? brandId)
        {
            if (!brandId.HasValue) return;
            var tenantId = _currentTenantService.TenantId
                ?? throw new System.InvalidOperationException("No se pudo determinar la empresa actual.");
            var brand = await _brandRepository.GetByIdAsync(brandId.Value);
            if (brand == null || brand.TenantId != tenantId || !brand.IsActive)
                throw new System.InvalidOperationException("Seleccione una marca activa de la empresa actual.");
        }

        private async Task<(UnitOfMeasure Base, UnitOfMeasure Purchase, UnitOfMeasure Sale)> ValidateUnitsAsync(ProductDto dto)
        {
            var fallback = (await _unitRepository.GetAsync(u => u.Code == "UND" && u.IsActive)).FirstOrDefault()
                ?? throw new System.InvalidOperationException("No está configurada la unidad UND para la empresa.");
            var baseUnit = dto.BaseUnitId.HasValue ? await _unitRepository.GetByIdAsync(dto.BaseUnitId.Value) : fallback;
            var purchaseUnit = dto.PurchaseUnitId.HasValue ? await _unitRepository.GetByIdAsync(dto.PurchaseUnitId.Value) : baseUnit;
            var saleUnit = dto.SaleUnitId.HasValue ? await _unitRepository.GetByIdAsync(dto.SaleUnitId.Value) : baseUnit;
            if (baseUnit == null || purchaseUnit == null || saleUnit == null || !baseUnit.IsActive || !purchaseUnit.IsActive || !saleUnit.IsActive)
                throw new System.InvalidOperationException("Seleccione unidades de medida activas.");
            if (dto.PurchaseFactorToBase <= 0 || dto.SaleFactorToBase <= 0)
                throw new System.InvalidOperationException("Los factores de conversión deben ser mayores que cero.");
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
    }
}
