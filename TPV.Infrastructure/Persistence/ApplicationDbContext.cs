using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using TPV.Domain.Entities;
using TPV.Infrastructure.Identity;
using TPV.Application.Interfaces;
using TPV.Domain.Common;
using System.Reflection;
using System.Threading;
using System.Threading.Tasks;

namespace TPV.Infrastructure.Persistence
{
    public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
    {
        private readonly ICurrentTenantService _currentTenantService;

        public ApplicationDbContext(
            DbContextOptions<ApplicationDbContext> options,
            ICurrentTenantService currentTenantService)
            : base(options)
        {
            _currentTenantService = currentTenantService;
        }

        public int? CurrentTenantId => _currentTenantService.TenantId;

        public DbSet<Tenant> Tenants { get; set; }
        public DbSet<Product> Products { get; set; }
        public DbSet<Category> Categories { get; set; }
        public DbSet<Branch> Branches { get; set; }
        public DbSet<Stock> Stocks { get; set; }
        public DbSet<Sale> Sales { get; set; }
        public DbSet<SaleDetail> SaleDetails { get; set; }
        public DbSet<CashSession> CashSessions { get; set; }
        public DbSet<Supplier> Suppliers { get; set; }
        public DbSet<Purchase> Purchases { get; set; }
        public DbSet<PurchaseDetail> PurchaseDetails { get; set; }
        public DbSet<Customer> Customers { get; set; }
        public DbSet<ServiceOrder> ServiceOrders { get; set; }
        public DbSet<ServiceOrderWork> ServiceOrderWorks { get; set; }
        public DbSet<ServiceOrderPart> ServiceOrderParts { get; set; }
        public DbSet<Technician> Technicians { get; set; }
        public DbSet<Warranty> Warranties { get; set; }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            // Apply Global Query Filter for Multi-Tenancy
            foreach (var entityType in builder.Model.GetEntityTypes())
            {
                if (typeof(IMustHaveTenant).IsAssignableFrom(entityType.ClrType))
                {
                    var method = typeof(ApplicationDbContext)
                        .GetMethod(nameof(SetGlobalQueryFilter), BindingFlags.NonPublic | BindingFlags.Instance)
                        ?.MakeGenericMethod(entityType.ClrType);
                    method?.Invoke(this, new object[] { builder });
                }
            }

            // Configuraciones adicionales de Fluent API

            // Purchase configuration
            builder.Entity<Purchase>()
                .Property(p => p.TotalAmount)
                .HasColumnType("decimal(18,2)");
            
            builder.Entity<PurchaseDetail>()
                .Property(pd => pd.UnitCost)
                .HasColumnType("decimal(18,2)");
            
            builder.Entity<PurchaseDetail>()
                .Property(pd => pd.SubTotal)
                .HasColumnType("decimal(18,2)");

            // Stock: Clave compuesta o única por Producto + Sucursal
            builder.Entity<Stock>()
                .HasIndex(s => new { s.ProductId, s.BranchId })
                .IsUnique();

            // Unique Index for Customer (TenantId + TaxId)
            builder.Entity<Customer>()
                .HasIndex(c => new { c.TenantId, c.TaxId })
                .IsUnique();

            // Unique Index for Supplier (TenantId + TaxId)
            builder.Entity<Supplier>()
                .HasIndex(s => new { s.TenantId, s.TaxId })
                .IsUnique();

            // Precisiones decimales para dinero (SQL Server requiere esto)
            builder.Entity<Product>()
                .Property(p => p.Price)
                .HasColumnType("decimal(18,2)");

            // builder.Entity<Product>().Property(p => p.Cost).HasColumnType("decimal(18,2)");
            
            builder.Entity<Product>()
                .Property(p => p.IvaRate)
                .HasColumnType("decimal(18,2)");
            
            builder.Entity<Product>()
                .Property(p => p.ImpoconsumoRate)
                .HasColumnType("decimal(18,2)");

            builder.Entity<Sale>()
                .Property(s => s.TotalAmount)
                .HasColumnType("decimal(18,2)");

            builder.Entity<SaleDetail>()
                .Property(sd => sd.UnitPrice)
                .HasColumnType("decimal(18,2)");

            builder.Entity<SaleDetail>()
                .Property(sd => sd.SubTotal)
                .HasColumnType("decimal(18,2)");

            builder.Entity<CashSession>()
                .Property(c => c.OpeningBalance)
                .HasColumnType("decimal(18,2)");
            builder.Entity<CashSession>()
                .Property(c => c.ClosingBalance)
                .HasColumnType("decimal(18,2)");
            builder.Entity<CashSession>()
                .Property(c => c.TotalSystemSales)
                .HasColumnType("decimal(18,2)");
            builder.Entity<CashSession>()
                .Property(c => c.Difference)
                .HasColumnType("decimal(18,2)");

            builder.Entity<ServiceOrder>()
                .Property(so => so.Mileage)
                .HasColumnType("decimal(18,2)");

            builder.Entity<ServiceOrderWork>()
                .Property(w => w.LaborCost)
                .HasColumnType("decimal(18,2)");
            builder.Entity<ServiceOrderWork>()
                .Property(w => w.EstimatedTimeHours)
                .HasColumnType("decimal(9,2)");

            builder.Entity<ServiceOrderPart>()
                .Property(p => p.UnitPrice)
                .HasColumnType("decimal(18,2)");

            builder.Entity<ServiceOrderPart>()
                .Property(p => p.DiscountAmount)
                .HasColumnType("decimal(18,2)");

            builder.Entity<ServiceOrderPart>()
                .Property(p => p.SubTotal)
                .HasColumnType("decimal(18,2)");

            // Relaciones obligatorias
            builder.Entity<Product>()
                .HasOne(p => p.Category)
                .WithMany(c => c.Products)
                .HasForeignKey(p => p.CategoryId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<Sale>()
                .HasOne(s => s.Branch)
                .WithMany(b => b.Sales)
                .HasForeignKey(s => s.BranchId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<Sale>()
                .HasOne(s => s.Customer)
                .WithMany(c => c.Sales)
                .HasForeignKey(s => s.CustomerId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.Entity<ServiceOrder>()
                .Property(so => so.LaborCost)
                .HasColumnType("decimal(18,2)");

            builder.Entity<ServiceOrder>()
                .HasOne(so => so.Sale)
                .WithOne(s => s.ServiceOrder)
                .HasForeignKey<Sale>(s => s.ServiceOrderId)
                .OnDelete(DeleteBehavior.Restrict);

            // Warranty Configuration
            builder.Entity<Warranty>()
                .Property(w => w.StartMileage)
                .HasColumnType("decimal(18,2)");
            builder.Entity<Warranty>()
                .Property(w => w.LimitMileage1)
                .HasColumnType("decimal(18,2)");
            builder.Entity<Warranty>()
                .Property(w => w.LimitMileage2)
                .HasColumnType("decimal(18,2)");
            builder.Entity<Warranty>()
                .Property(w => w.LimitMileage3)
                .HasColumnType("decimal(18,2)");
        }
        private void SetGlobalQueryFilter<T>(ModelBuilder builder) where T : class, IMustHaveTenant
        {
            // If CurrentTenantId is null (Host/SuperAdmin), show all data.
            // Otherwise, filter by the current tenant.
            builder.Entity<T>().HasQueryFilter(e => !CurrentTenantId.HasValue || e.TenantId == CurrentTenantId);
        }

        public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = new CancellationToken())
        {
            foreach (var entry in ChangeTracker.Entries<IMustHaveTenant>())
            {
                if (entry.State == EntityState.Added)
                {
                    if (CurrentTenantId.HasValue)
                    {
                        entry.Entity.TenantId = CurrentTenantId.Value;
                    }
                }
            }
            return base.SaveChangesAsync(cancellationToken);
        }
    }
}
