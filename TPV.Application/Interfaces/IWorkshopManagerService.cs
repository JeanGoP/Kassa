using System.Collections.Generic;
using System.Threading.Tasks;
using TPV.Application.DTOs;

namespace TPV.Application.Interfaces
{
    public interface IWorkshopManagerService
    {
        Task<IEnumerable<WorkshopManagerDto>> GetAllAsync(string? search = null);
        Task<WorkshopManagerDto> GetByIdAsync(int id);
        Task<WorkshopManagerDto> CreateAsync(CreateWorkshopManagerDto dto);
        Task UpdateAsync(int id, CreateWorkshopManagerDto dto);
        Task DeleteAsync(int id);
    }
}
