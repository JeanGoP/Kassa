using System.Collections.Generic;
using System.Threading.Tasks;
using TPV.Application.DTOs;

namespace TPV.Application.Interfaces
{
    public interface IVehicleCatalogService
    {
        Task<IEnumerable<BrandDto>> GetBrandsAsync(bool includeInactive = false);
        Task<BrandDto> CreateBrandAsync(SaveBrandDto dto);
        Task<BrandDto?> UpdateBrandAsync(int id, SaveBrandDto dto);
        Task<bool> DeactivateBrandAsync(int id);
        Task<IEnumerable<VehicleModelDto>> GetModelsAsync(int? brandId = null, bool includeInactive = false);
        Task<VehicleModelDto> CreateModelAsync(SaveVehicleModelDto dto);
        Task<VehicleModelDto?> UpdateModelAsync(int id, SaveVehicleModelDto dto);
        Task<bool> DeactivateModelAsync(int id);
    }
}
