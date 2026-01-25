using System.Collections.Generic;
using System.Threading.Tasks;
using TPV.Application.DTOs;

namespace TPV.Application.Interfaces
{
    public interface ITenantService
    {
        Task<IEnumerable<TenantDto>> GetAllAsync();
        Task<TenantDto> GetByIdAsync(int id);
        Task<TenantDto> CreateAsync(CreateTenantDto dto);
        Task UpdateAsync(int id, CreateTenantDto dto);
        Task DeleteAsync(int id);
    }
}
