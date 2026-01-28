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

        public ProductService(IRepository<Product> productRepository)
        {
            _productRepository = productRepository;
        }

        public async Task<IEnumerable<ProductDto>> GetAllProductsAsync(int? branchId = null)
        {
            var products = await _productRepository.GetAsync(null, null, "Category,Stocks");
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
                    Price = price,
                    // Cost = p.Cost,
                    ProfitabilityPercentage = p.ProfitabilityPercentage,
                    IvaType = p.IvaType,
                    IvaRate = p.IvaRate,
                    ImpoconsumoRate = p.ImpoconsumoRate,
                    PriceIncludesIva = p.PriceIncludesIva,
                    CategoryId = p.CategoryId,
                    CategoryName = p.Category?.Name,
                    StockQuantity = p.Stocks?.Where(s => !branchId.HasValue || s.BranchId == branchId.Value).Sum(s => s.Quantity) ?? 0
                };
            });
        }

        public async Task<ProductDto> GetProductByIdAsync(int id)
        {
            var products = await _productRepository.GetAsync(p => p.Id == id, null, "Category,Stocks");
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
                Price = p.Price,
                // Cost = p.Cost,
                ProfitabilityPercentage = p.ProfitabilityPercentage,
                IvaType = p.IvaType,
                IvaRate = p.IvaRate,
                ImpoconsumoRate = p.ImpoconsumoRate,
                PriceIncludesIva = p.PriceIncludesIva,
                CategoryId = p.CategoryId,
                CategoryName = p.Category?.Name,
                StockQuantity = p.Stocks?.Sum(s => s.Quantity) ?? 0
            };
        }

        public async Task<ProductDto> CreateProductAsync(ProductDto productDto)
        {
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
                Price = productDto.Price,
                CategoryId = productDto.CategoryId,
                // Cost = productDto.Cost,
                ProfitabilityPercentage = productDto.ProfitabilityPercentage,
                IvaType = productDto.IvaType,
                IvaRate = productDto.IvaRate,
                ImpoconsumoRate = productDto.ImpoconsumoRate,
                PriceIncludesIva = productDto.PriceIncludesIva
            };

            var newProduct = await _productRepository.AddAsync(product);
            productDto.Id = newProduct.Id;
            return productDto;
        }

        public async Task UpdateProductAsync(ProductDto productDto)
        {
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
                product.Price = productDto.Price;
                // product.Cost = productDto.Cost;
                product.ProfitabilityPercentage = productDto.ProfitabilityPercentage;
                product.IvaType = productDto.IvaType;
                product.IvaRate = productDto.IvaRate;
                product.ImpoconsumoRate = productDto.ImpoconsumoRate;
                product.PriceIncludesIva = productDto.PriceIncludesIva;
                product.CategoryId = productDto.CategoryId;
                
                await _productRepository.UpdateAsync(product);
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
    }
}
