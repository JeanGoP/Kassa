using System.Collections.Generic;
using System.Threading.Tasks;
using TPV.Application.DTOs;

namespace TPV.Application.Interfaces
{
    public interface ITechnicianService
    {
        Task<IEnumerable<TechnicianDto>> GetAllAsync(string? search = null);
        Task<TechnicianDto> GetByIdAsync(int id);
        Task<TechnicianDto> CreateAsync(CreateTechnicianDto dto);
        Task UpdateAsync(int id, CreateTechnicianDto dto);
        Task DeleteAsync(int id);
    }
}

