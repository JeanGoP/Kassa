using Microsoft.Extensions.DependencyInjection;
using TPV.Application.Interfaces;
using TPV.Application.Services;

namespace TPV.Application
{
    public static class ApplicationServiceRegistration
    {
        public static IServiceCollection AddApplicationServices(this IServiceCollection services)
        {
            services.AddScoped<IProductService, ProductService>();
            services.AddScoped<ISalesService, SalesService>();
             services.AddScoped<IStockService, StockService>();
            services.AddScoped<ICashService, CashService>();
            services.AddScoped<IReportsService, ReportsService>();
            services.AddScoped<ISupplierService, SupplierService>();
            services.AddScoped<IPurchaseService, PurchaseService>();
            services.AddScoped<ICategoryService, CategoryService>();
            services.AddScoped<ICustomerService, CustomerService>();
            services.AddScoped<IServiceOrderService, ServiceOrderService>();
            services.AddScoped<ITechnicianService, TechnicianService>();
            services.AddScoped<IWorkshopDashboardService, WorkshopDashboardService>();
              
            return services;
        }
    }
}
