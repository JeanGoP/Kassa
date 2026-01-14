using System.Linq;
using TPV.Domain.Entities;

namespace TPV.Infrastructure.Persistence
{
    public static class DbInitializer
    {
        public static void Initialize(ApplicationDbContext context)
        {
            context.Database.EnsureCreated();

            if (context.Categories.Any())
            {
                return;   // DB has been seeded
            }

            var categories = new Category[]
            {
                new Category{Name="General", Description="Repuestos Generales"},
                new Category{Name="Frenos", Description="Sistemas de frenado"},
                new Category{Name="Motor", Description="Componentes de motor"}
            };
            foreach (Category c in categories)
            {
                context.Categories.Add(c);
            }
            context.SaveChanges();

            var branches = new Branch[]
            {
                new Branch{Name="Sucursal Principal", Address="Calle 1", Phone="555-0000", Email="admin@tpv.com"}
            };
            foreach (Branch b in branches)
            {
                context.Branches.Add(b);
            }
            context.SaveChanges();
        }
    }
}
