using System.Threading.Tasks;

namespace TPV.Application.Interfaces
{
    public interface IUserService
    {
        Task<int?> GetUserBranchIdAsync(string userId);
        Task<bool> IsUserInBranchAsync(string userId, int branchId);
        Task<bool> HasPermissionToTransferAsync(string userId);
        Task<string?> GetUserDisplayNameAsync(string userId);
    }
}
