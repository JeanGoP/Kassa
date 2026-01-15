using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using TPV.Domain.Entities;
using TPV.Infrastructure.Identity;

namespace TPV.Infrastructure.Persistence
{
    public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

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

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

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

            // Precisiones decimales para dinero (SQL Server requiere esto)
            builder.Entity<Product>()
                .Property(p => p.Price)
                .HasColumnType("decimal(18,2)");

            builder.Entity<Product>()
                .Property(p => p.Cost)
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
        }
    }
}
