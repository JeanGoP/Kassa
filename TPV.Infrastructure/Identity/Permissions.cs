using System.Collections.Generic;

namespace TPV.Infrastructure.Identity
{
    public static class Permissions
    {
        public const string AdminRolesManage = "Admin.Roles.Manage";
        public const string AdminUsersManage = "Admin.Users.Manage";
        public const string HostTenantsManage = "Host.Tenants.Manage";

        public const string MenusDashboardView = "Menus.Dashboard.View";
        public const string MenusPosView = "Menus.POS.View";
        public const string MenusInventoryView = "Menus.Inventory.View";
        public const string MenusCashView = "Menus.Cash.View";
        public const string MenusReportsView = "Menus.Reports.View";
        public const string MenusBranchesView = "Menus.Branches.View";
        public const string MenusPurchasesView = "Menus.Purchases.View";
        public const string MenusSuppliersView = "Menus.Suppliers.View";
        public const string MenusProductsView = "Menus.Products.View";
        public const string MenusCustomersView = "Menus.Customers.View";
        public const string MenusTechniciansView = "Menus.Technicians.View";
        public const string MenusWorkshopView = "Menus.Workshop.View";
        public const string MenusWarrantiesView = "Menus.Warranties.View";

        public static IReadOnlyCollection<string> All =>
            new[]
            {
                HostTenantsManage,
                AdminRolesManage,
                AdminUsersManage,
                MenusDashboardView,
                MenusPosView,
                MenusInventoryView,
                MenusCashView,
                MenusReportsView,
                MenusBranchesView,
                MenusPurchasesView,
                MenusSuppliersView,
                MenusProductsView,
                MenusCustomersView,
                MenusTechniciansView,
                MenusWorkshopView,
                MenusWarrantiesView
            };
    }
}

