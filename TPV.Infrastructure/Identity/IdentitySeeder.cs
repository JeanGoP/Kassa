using System.Threading.Tasks;
using System.Linq;
using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using TPV.Infrastructure.Persistence;

using Microsoft.Extensions.Logging;

namespace TPV.Infrastructure.Identity
{
    public static class IdentitySeeder
    {
        public static async Task SeedAsync(UserManager<ApplicationUser> userManager, RoleManager<IdentityRole> roleManager, ApplicationDbContext context, ILogger logger)
        {
            logger.LogInformation("Seeding database...");
            var roles = new[] { "Admin", "Vendedor", "Supervisor" };
            foreach (var roleName in roles)
            {
                if (!await roleManager.RoleExistsAsync(roleName))
                {
                    logger.LogInformation($"Creating role {roleName}...");
                    await roleManager.CreateAsync(new IdentityRole(roleName));
                }
            }

            await SeedRolePermissions(roleManager, logger);

            // Seed default admin user
            var adminEmail = "admin@tpv.com";
            if (await userManager.FindByEmailAsync(adminEmail) == null)
            {
                logger.LogInformation("Creating default admin user...");
                var user = new ApplicationUser
                {
                    UserName = adminEmail,
                    Email = adminEmail,
                    FirstName = "Admin",
                    LastName = "System",
                    EmailConfirmed = true
                };
                var result = await userManager.CreateAsync(user, "Admin123!");
                if (result.Succeeded)
                {
                    await userManager.AddToRoleAsync(user, "Admin");
                }
            }
        }

        private static async Task SeedRolePermissions(RoleManager<IdentityRole> roleManager, ILogger logger)
        {
            var adminRole = await roleManager.FindByNameAsync("Admin");
            if (adminRole != null)
            {
                var adminClaims = await roleManager.GetClaimsAsync(adminRole);
                
                foreach (var permission in Permissions.All)
                {
                    if (!adminClaims.Any(c => c.Type == "permission" && c.Value == permission))
                    {
                        logger.LogInformation($"Adding permission {permission} to Admin role...");
                        await roleManager.AddClaimAsync(adminRole, new Claim("permission", permission));
                    }
                }
            }

            var vendedorRole = await roleManager.FindByNameAsync("Vendedor");
            if (vendedorRole != null)
            {
                var vendedorClaims = await roleManager.GetClaimsAsync(vendedorRole);
                var vendedorPermissions = new[]
                {
                    Permissions.MenusDashboardView,
                    Permissions.MenusPosView,
                    Permissions.MenusInventoryView,
                    Permissions.MenusCashView
                };

                foreach (var permission in vendedorPermissions)
                {
                    if (!vendedorClaims.Any(c => c.Type == "permission" && c.Value == permission))
                    {
                        await roleManager.AddClaimAsync(vendedorRole, new Claim("permission", permission));
                    }
                }
            }

            var supervisorRole = await roleManager.FindByNameAsync("Supervisor");
            if (supervisorRole != null)
            {
                var supervisorClaims = await roleManager.GetClaimsAsync(supervisorRole);
                var supervisorPermissions = new[]
                {
                    Permissions.MenusDashboardView,
                    Permissions.MenusPosView,
                    Permissions.MenusInventoryView,
                    Permissions.MenusCashView,
                    Permissions.MenusReportsView,
                    Permissions.MenusBranchesView,
                    Permissions.MenusPurchasesView
                };

                foreach (var permission in supervisorPermissions)
                {
                    if (!supervisorClaims.Any(c => c.Type == "permission" && c.Value == permission))
                    {
                        await roleManager.AddClaimAsync(supervisorRole, new Claim("permission", permission));
                    }
                }
            }
        }
    }
}
