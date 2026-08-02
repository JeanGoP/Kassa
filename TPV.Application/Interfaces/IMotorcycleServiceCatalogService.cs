using System.Collections.Generic;
using System.Threading.Tasks;
using TPV.Application.DTOs;

namespace TPV.Application.Interfaces
{
    public interface IMotorcycleServiceCatalogService
    {
        Task<IEnumerable<MotorcycleServiceDto>> GetAllAsync(string? search = null);
        Task<IEnumerable<MotorcycleServiceDto>> GetPublicByScheduleSlugAsync(string slug, string? search = null);
        Task<MotorcycleServiceDto?> GetByIdAsync(int id);
        Task<MotorcycleServiceDto> CreateAsync(CreateMotorcycleServiceDto dto);
        Task UpdateAsync(int id, CreateMotorcycleServiceDto dto);
        Task DeleteAsync(int id);
    }
}
