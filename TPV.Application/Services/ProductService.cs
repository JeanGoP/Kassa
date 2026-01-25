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
            return products.Select(p => new ProductDto
            {
                Id = p.Id,
                Name = p.Name,
                SKU = p.SKU,
                Description = p.Description,
                Price = p.Price,
                Cost = p.Cost,
                IvaType = p.IvaType,
                IvaRate = p.IvaRate,
                ImpoconsumoRate = p.ImpoconsumoRate,
                CategoryId = p.CategoryId,
                CategoryName = p.Category?.Name,
                StockQuantity = p.Stocks?.Where(s => !branchId.HasValue || s.BranchId == branchId.Value).Sum(s => s.Quantity) ?? 0
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
                Description = p.Description,
                Price = p.Price,
                Cost = p.Cost,
                IvaType = p.IvaType,
                IvaRate = p.IvaRate,
                ImpoconsumoRate = p.ImpoconsumoRate,
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
                Description = productDto.Description ?? string.Empty,
                Price = productDto.Price,
                CategoryId = productDto.CategoryId,
                Cost = productDto.Cost
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
                product.Description = productDto.Description ?? string.Empty;
                product.Price = productDto.Price;
                product.Cost = productDto.Cost;
                product.IvaType = productDto.IvaType;
                product.IvaRate = productDto.IvaRate;
                product.ImpoconsumoRate = productDto.ImpoconsumoRate;
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
