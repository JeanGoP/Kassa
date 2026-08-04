using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using TPV.Application.Interfaces;
using TPV.Application.Services;
using TPV.Application.Settings;

namespace TPV.Application
{
    public static class ApplicationServiceRegistration
    {
        public static IServiceCollection AddApplicationServices(this IServiceCollection services, IConfiguration configuration)
        {
            services.Configure<MatiasSettings>(configuration.GetSection("Matias"));

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
            services.AddScoped<IWorkshopManagerService, WorkshopManagerService>();
            services.AddScoped<IWarrantyService, WarrantyService>();
            services.AddScoped<IWorkshopDashboardService, WorkshopDashboardService>();
            services.AddScoped<ITenantService, TenantService>();
            services.AddScoped<IQuotationService, QuotationService>();
            services.AddScoped<IAppointmentService, AppointmentService>();
            services.AddScoped<IMotorcycleServiceCatalogService, MotorcycleServiceCatalogService>();
            services.AddScoped<IPreparationOrderService, PreparationOrderService>();
            services.AddScoped<IVehicleService, VehicleService>();
            services.AddHttpClient<IElectronicInvoicingService, ElectronicInvoicingService>();
              
            return services;
        }
    }
}
