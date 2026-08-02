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
        public DbSet<WorkshopManager> WorkshopManagers { get; set; }
        public DbSet<Warranty> Warranties { get; set; }
        public DbSet<QuotationSearchHistory> QuotationSearchHistories { get; set; }
        public DbSet<Quotation> Quotations { get; set; }
        public DbSet<QuotationDetail> QuotationDetails { get; set; }
        public DbSet<AppointmentSchedule> AppointmentSchedules { get; set; }
        public DbSet<AppointmentAvailabilityRule> AppointmentAvailabilityRules { get; set; }
        public DbSet<Appointment> Appointments { get; set; }

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

            builder.Entity<Purchase>()
                .Property(p => p.Freight)
                .HasColumnType("decimal(18,2)");
            
            builder.Entity<PurchaseDetail>()
                .Property(pd => pd.UnitCost)
                .HasColumnType("decimal(18,2)");
            
            builder.Entity<PurchaseDetail>()
                .Property(pd => pd.SubTotal)
                .HasColumnType("decimal(18,2)");

            builder.Entity<PurchaseDetail>()
                .Property(pd => pd.TaxRate)
                .HasColumnType("decimal(18,2)");

            builder.Entity<PurchaseDetail>()
                .Property(pd => pd.TaxAmount)
                .HasColumnType("decimal(18,2)");

            // Stock: Clave compuesta o única por Producto + Sucursal
            builder.Entity<Stock>()
                .HasIndex(s => new { s.ProductId, s.BranchId })
                .IsUnique();

            builder.Entity<WorkshopManager>()
                .Property(m => m.Name)
                .HasMaxLength(150);

            builder.Entity<WorkshopManager>()
                .Property(m => m.Phone)
                .HasMaxLength(80);

            builder.Entity<WorkshopManager>()
                .Property(m => m.Email)
                .HasMaxLength(200);

            builder.Entity<WorkshopManager>()
                .Property(m => m.Notes)
                .HasMaxLength(500);

            builder.Entity<WorkshopManager>()
                .HasIndex(m => new { m.TenantId, m.Name })
                .IsUnique();

            builder.Entity<Branch>()
                .HasOne(b => b.WorkshopManager)
                .WithMany()
                .HasForeignKey(b => b.WorkshopManagerId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<QuotationSearchHistory>()
                .Property(h => h.SearchTerm)
                .HasMaxLength(450);

            builder.Entity<QuotationSearchHistory>()
                .Property(h => h.UserId)
                .HasMaxLength(450);

            builder.Entity<QuotationSearchHistory>()
                .HasIndex(h => h.SearchTerm);

            builder.Entity<QuotationSearchHistory>()
                .HasIndex(h => new { h.TenantId, h.SearchedAt });

            builder.Entity<Quotation>()
                .Property(q => q.QuotationNumber)
                .HasMaxLength(40);

            builder.Entity<Quotation>()
                .Property(q => q.RequestedByName)
                .HasMaxLength(200);

            builder.Entity<Quotation>()
                .Property(q => q.RequestedByPhone)
                .HasMaxLength(80);

            builder.Entity<Quotation>()
                .Property(q => q.RequestedByEmail)
                .HasMaxLength(200);

            builder.Entity<Quotation>()
                .Property(q => q.TotalAmount)
                .HasColumnType("decimal(18,2)");

            builder.Entity<Quotation>()
                .HasIndex(q => new { q.TenantId, q.Date });

            builder.Entity<Quotation>()
                .HasIndex(q => q.QuotationNumber);

            builder.Entity<Quotation>()
                .HasMany(q => q.Details)
                .WithOne(d => d.Quotation)
                .HasForeignKey(d => d.QuotationId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<QuotationDetail>()
                .Property(d => d.ProductName)
                .HasMaxLength(250);

            builder.Entity<QuotationDetail>()
                .Property(d => d.SKU)
                .HasMaxLength(100);

            builder.Entity<QuotationDetail>()
                .Property(d => d.Barcode)
                .HasMaxLength(100);

            builder.Entity<QuotationDetail>()
                .Property(d => d.UnitPrice)
                .HasColumnType("decimal(18,2)");

            builder.Entity<QuotationDetail>()
                .Property(d => d.SubTotal)
                .HasColumnType("decimal(18,2)");

            builder.Entity<QuotationDetail>()
                .HasOne(d => d.Product)
                .WithMany()
                .HasForeignKey(d => d.ProductId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<AppointmentSchedule>()
                .Property(s => s.Name)
                .HasMaxLength(150);

            builder.Entity<AppointmentSchedule>()
                .Property(s => s.PublicSlug)
                .HasMaxLength(120);

            builder.Entity<AppointmentSchedule>()
                .Property(s => s.CalendarProvider)
                .HasMaxLength(40);

            builder.Entity<AppointmentSchedule>()
                .Property(s => s.ExternalCalendarId)
                .HasMaxLength(300);

            builder.Entity<AppointmentSchedule>()
                .Property(s => s.TimeZone)
                .HasMaxLength(80);

            builder.Entity<AppointmentSchedule>()
                .HasIndex(s => s.PublicSlug)
                .IsUnique();

            builder.Entity<AppointmentSchedule>()
                .HasIndex(s => new { s.TenantId, s.BranchId });

            builder.Entity<AppointmentSchedule>()
                .HasOne(s => s.Branch)
                .WithMany()
                .HasForeignKey(s => s.BranchId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<AppointmentSchedule>()
                .HasMany(s => s.AvailabilityRules)
                .WithOne(r => r.AppointmentSchedule)
                .HasForeignKey(r => r.AppointmentScheduleId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<AppointmentAvailabilityRule>()
                .HasIndex(r => new { r.AppointmentScheduleId, r.DayOfWeek });

            builder.Entity<Appointment>()
                .Property(a => a.CustomerName)
                .HasMaxLength(200);

            builder.Entity<Appointment>()
                .Property(a => a.CustomerPhone)
                .HasMaxLength(80);

            builder.Entity<Appointment>()
                .Property(a => a.CustomerEmail)
                .HasMaxLength(200);

            builder.Entity<Appointment>()
                .Property(a => a.ServiceType)
                .HasMaxLength(160);

            builder.Entity<Appointment>()
                .Property(a => a.VehiclePlate)
                .HasMaxLength(40);

            builder.Entity<Appointment>()
                .Property(a => a.VehicleBrand)
                .HasMaxLength(80);

            builder.Entity<Appointment>()
                .Property(a => a.VehicleModel)
                .HasMaxLength(120);

            builder.Entity<Appointment>()
                .Property(a => a.Notes)
                .HasMaxLength(800);

            builder.Entity<Appointment>()
                .Property(a => a.Status)
                .HasMaxLength(40);

            builder.Entity<Appointment>()
                .Property(a => a.Source)
                .HasMaxLength(40);

            builder.Entity<Appointment>()
                .Property(a => a.ConfirmationCode)
                .HasMaxLength(40);

            builder.Entity<Appointment>()
                .Property(a => a.CreatedByUserId)
                .HasMaxLength(450);

            builder.Entity<Appointment>()
                .HasIndex(a => new { a.AppointmentScheduleId, a.StartAt });

            builder.Entity<Appointment>()
                .HasIndex(a => new { a.TenantId, a.StartAt });

            builder.Entity<Appointment>()
                .HasOne(a => a.AppointmentSchedule)
                .WithMany(s => s.Appointments)
                .HasForeignKey(a => a.AppointmentScheduleId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<Appointment>()
                .HasOne(a => a.Branch)
                .WithMany()
                .HasForeignKey(a => a.BranchId)
                .OnDelete(DeleteBehavior.Restrict);

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

            builder.Entity<Product>()
                .Property(p => p.ProfitabilityPercentage)
                .HasColumnType("decimal(18,2)");

            builder.Entity<Stock>()
                .Property(s => s.Cost)
                .HasColumnType("decimal(18,2)");
            
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

            builder.Entity<SaleDetail>()
                .Property(sd => sd.TaxRate)
                .HasColumnType("decimal(18,2)");

            builder.Entity<SaleDetail>()
                .Property(sd => sd.TaxAmount)
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
                .Property(p => p.DiscountValue)
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
