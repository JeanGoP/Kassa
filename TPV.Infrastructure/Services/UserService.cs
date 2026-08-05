using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using TPV.Application.Interfaces;
using TPV.Infrastructure.Identity;

namespace TPV.Infrastructure.Services
{
    public class UserService : IUserService
    {
        private readonly UserManager<ApplicationUser> _userManager;

        public UserService(UserManager<ApplicationUser> userManager)
        {
            _userManager = userManager;
        }

        public async Task<int?> GetUserBranchIdAsync(string userId)
        {
            var user = await _userManager.FindByIdAsync(userId);
            return user?.CurrentBranchId;
        }

        public async Task<bool> IsUserInBranchAsync(string userId, int branchId)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) return false;

            // Allow Admin to access any branch
            var roles = await _userManager.GetRolesAsync(user);
            if (roles.Contains("Admin")) return true;

            return user.CurrentBranchId == branchId;
        }

        public async Task<bool> HasPermissionToTransferAsync(string userId)
        {
             var user = await _userManager.FindByIdAsync(userId);
             if (user == null) return false;
             
             // Allow Admin to transfer
             var roles = await _userManager.GetRolesAsync(user);
             return roles.Contains("Admin") || roles.Contains("Supervisor");
        }

        public async Task<string?> GetUserDisplayNameAsync(string userId)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) return null;
            var fullName = $"{user.FirstName} {user.LastName}".Trim();
            return string.IsNullOrWhiteSpace(fullName) ? user.Email : fullName;
        }
    }
}
