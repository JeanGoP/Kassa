using System.Collections.Generic;
using System.Threading.Tasks;
using TPV.Application.DTOs;

namespace TPV.Application.Interfaces
{
    public interface IBranchService
    {
        Task<IEnumerable<BranchDto>> GetAllAsync();
        Task<BranchDto> GetByIdAsync(int id);
        Task<BranchDto> GetCurrentForUserAsync(string userId);
        Task<BranchDto> CreateAsync(CreateBranchDto dto);
        Task UpdateAsync(int id, CreateBranchDto dto);
        Task DeleteAsync(int id);
    }
}
