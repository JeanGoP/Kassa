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
    public class VehicleCatalogService : IVehicleCatalogService
    {
        private readonly IRepository<Brand> _brandRepository;
        private readonly IRepository<VehicleModel> _modelRepository;
        private readonly ICurrentTenantService _currentTenantService;

        public VehicleCatalogService(
            IRepository<Brand> brandRepository,
            IRepository<VehicleModel> modelRepository,
            ICurrentTenantService currentTenantService)
        {
            _brandRepository = brandRepository;
            _modelRepository = modelRepository;
            _currentTenantService = currentTenantService;
        }

        public async Task<IEnumerable<BrandDto>> GetBrandsAsync(bool includeInactive = false)
        {
            var brands = await _brandRepository.GetAsync(
                predicate: b => includeInactive || b.IsActive,
                orderBy: q => q.OrderBy(b => b.Name));
            return brands.Select(MapBrand);
        }

        public async Task<BrandDto> CreateBrandAsync(SaveBrandDto dto)
        {
            var tenantId = RequireTenant();
            var code = Required(dto.Code, "El codigo de la marca es obligatorio.").ToUpperInvariant();
            var name = Required(dto.Name, "El nombre de la marca es obligatorio.");
            await EnsureUniqueBrandAsync(tenantId, code, name);
            var brand = await _brandRepository.AddAsync(new Brand { TenantId = tenantId, Code = code, Name = name });
            return MapBrand(brand);
        }

        public async Task<BrandDto?> UpdateBrandAsync(int id, SaveBrandDto dto)
        {
            var brand = await _brandRepository.GetByIdAsync(id);
            if (brand == null) return null;
            var code = Required(dto.Code, "El codigo de la marca es obligatorio.").ToUpperInvariant();
            var name = Required(dto.Name, "El nombre de la marca es obligatorio.");
            await EnsureUniqueBrandAsync(brand.TenantId, code, name, id);
            brand.Code = code;
            brand.Name = name;
            brand.IsActive = true;
            brand.UpdatedAt = DateTime.UtcNow;
            await _brandRepository.UpdateAsync(brand);
            return MapBrand(brand);
        }

        public async Task<bool> DeactivateBrandAsync(int id)
        {
            var brand = await _brandRepository.GetByIdAsync(id);
            if (brand == null) return false;
            brand.IsActive = false;
            brand.UpdatedAt = DateTime.UtcNow;
            await _brandRepository.UpdateAsync(brand);
            return true;
        }

        public async Task<IEnumerable<VehicleModelDto>> GetModelsAsync(int? brandId = null, bool includeInactive = false)
        {
            var models = await _modelRepository.GetAsync(
                predicate: m => (!brandId.HasValue || m.BrandId == brandId.Value) && (includeInactive || m.IsActive),
                orderBy: q => q.OrderBy(m => m.Brand.Name).ThenBy(m => m.Name),
                includeString: "Brand");
            return models.Select(MapModel);
        }

        public async Task<VehicleModelDto> CreateModelAsync(SaveVehicleModelDto dto)
        {
            var tenantId = RequireTenant();
            var brand = await ResolveBrandAsync(dto.BrandId, tenantId);
            var code = Required(dto.Code, "El codigo del modelo es obligatorio.").ToUpperInvariant();
            var name = Required(dto.Name, "El nombre del modelo es obligatorio.");
            await EnsureUniqueModelAsync(tenantId, brand.Id, code, name);
            var model = await _modelRepository.AddAsync(new VehicleModel
            {
                TenantId = tenantId,
                BrandId = brand.Id,
                Brand = brand,
                Code = code,
                Name = name
            });
            return MapModel(model);
        }

        public async Task<VehicleModelDto?> UpdateModelAsync(int id, SaveVehicleModelDto dto)
        {
            var model = await _modelRepository.GetByIdAsync(id);
            if (model == null) return null;
            var brand = await ResolveBrandAsync(dto.BrandId, model.TenantId);
            var code = Required(dto.Code, "El codigo del modelo es obligatorio.").ToUpperInvariant();
            var name = Required(dto.Name, "El nombre del modelo es obligatorio.");
            await EnsureUniqueModelAsync(model.TenantId, brand.Id, code, name, id);
            model.BrandId = brand.Id;
            model.Brand = brand;
            model.Code = code;
            model.Name = name;
            model.IsActive = true;
            model.UpdatedAt = DateTime.UtcNow;
            await _modelRepository.UpdateAsync(model);
            return MapModel(model);
        }

        public async Task<bool> DeactivateModelAsync(int id)
        {
            var model = await _modelRepository.GetByIdAsync(id);
            if (model == null) return false;
            model.IsActive = false;
            model.UpdatedAt = DateTime.UtcNow;
            await _modelRepository.UpdateAsync(model);
            return true;
        }

        private int RequireTenant() => _currentTenantService.TenantId
            ?? throw new InvalidOperationException("Debe seleccionar una empresa para gestionar marcas y modelos.");

        private async Task<Brand> ResolveBrandAsync(int brandId, int tenantId)
        {
            var brand = await _brandRepository.GetByIdAsync(brandId);
            if (brand == null || brand.TenantId != tenantId || !brand.IsActive)
                throw new InvalidOperationException("La marca indicada no existe o esta inactiva.");
            return brand;
        }

        private async Task EnsureUniqueBrandAsync(int tenantId, string code, string name, int? currentId = null)
        {
            var duplicate = await _brandRepository.GetAsync(b => b.TenantId == tenantId &&
                (!currentId.HasValue || b.Id != currentId.Value) && (b.Code == code || b.Name == name));
            if (duplicate.Any()) throw new InvalidOperationException("Ya existe una marca con ese codigo o nombre.");
        }

        private async Task EnsureUniqueModelAsync(int tenantId, int brandId, string code, string name, int? currentId = null)
        {
            var duplicate = await _modelRepository.GetAsync(m => m.TenantId == tenantId && m.BrandId == brandId &&
                (!currentId.HasValue || m.Id != currentId.Value) && (m.Code == code || m.Name == name));
            if (duplicate.Any()) throw new InvalidOperationException("Ya existe ese modelo para la marca seleccionada.");
        }

        private static BrandDto MapBrand(Brand brand) => new()
        {
            Id = brand.Id, Code = brand.Code, Name = brand.Name, IsActive = brand.IsActive,
            CreatedAt = brand.CreatedAt, UpdatedAt = brand.UpdatedAt
        };

        private static VehicleModelDto MapModel(VehicleModel model) => new()
        {
            Id = model.Id, BrandId = model.BrandId, BrandCode = model.Brand?.Code ?? string.Empty,
            BrandName = model.Brand?.Name ?? string.Empty, Code = model.Code, Name = model.Name,
            IsActive = model.IsActive, CreatedAt = model.CreatedAt, UpdatedAt = model.UpdatedAt
        };

        private static string Required(string? value, string message) =>
            string.IsNullOrWhiteSpace(value) ? throw new InvalidOperationException(message) : value.Trim();
    }
}
