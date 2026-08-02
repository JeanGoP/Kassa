using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TPV.Domain.Common;
using TPV.Domain.Entities;
using TPV.Infrastructure.Persistence;

namespace TPV.Web.Controllers.Api.Integrations
{
    [ApiController]
    [Route("api/integrations/mch")]
    public class MchIntegrationController : ControllerBase
    {
        private const int DefaultPageSize = 100;
        private const int MaxPageSize = 500;
        private const string ApiKeyHeaderName = "X-MCH-API-Key";

        private readonly ApplicationDbContext _dbContext;
        private readonly IConfiguration _configuration;

        public MchIntegrationController(ApplicationDbContext dbContext, IConfiguration configuration)
        {
            _dbContext = dbContext;
            _configuration = configuration;
        }

        [HttpGet("status")]
        public IActionResult GetStatus()
        {
            var denied = ValidateAccess();
            if (denied != null) return denied;

            return Ok(new
            {
                name = "MCH Posventa API",
                mode = "readonly",
                version = "1.0-base",
                generatedAtUtc = DateTime.UtcNow,
                resources = new[]
                {
                    "companies",
                    "branches",
                    "customers",
                    "suppliers",
                    "article-catalog",
                    "inventory",
                    "sales",
                    "purchases",
                    "service-orders",
                    "coverage"
                }
            });
        }

        [HttpGet("coverage")]
        public IActionResult GetCoverage()
        {
            var denied = ValidateAccess();
            if (denied != null) return denied;

            return Ok(new
            {
                generatedAtUtc = DateTime.UtcNow,
                status = "Parcial",
                note = "Primera capa readonly sobre datos existentes. No crea ni modifica informacion.",
                availableNow = new[]
                {
                    "Empresas, sucursales, clientes, proveedores y personal basico",
                    "Catalogo basico de articulos y servicios",
                    "Inventario por sucursal con costo y niveles minimo/maximo",
                    "Ventas, compras y ordenes de taller basicas",
                    "Filtros por empresa, sucursal, marca, fechas y modificado_desde donde aplica",
                    "Paginacion por continuationToken"
                },
                pendingModelWork = new[]
                {
                    "Vehiculo maestro por VIN/chasis y motor",
                    "Historial de propietarios y servicios por chasis",
                    "Marca formal en todos los recursos",
                    "Bodegas/ubicaciones reales y movimientos de inventario",
                    "Cantidades decimales y conversiones de unidades",
                    "Historial de estados y anulaciones completas",
                    "Ordenes de alistamiento",
                    "Garantias de fabricante con trazabilidad completa",
                    "Equivalencias, sustitutos, aplicabilidad por modelo y kits"
                }
            });
        }

        [HttpGet("companies")]
        public async Task<IActionResult> GetCompanies([FromQuery] MchQuery query)
        {
            var denied = ValidateAccess();
            if (denied != null) return denied;

            IQueryable<Tenant> source = _dbContext.Tenants
                .IgnoreQueryFilters()
                .AsNoTracking();

            source = ApplyTenantScope(source);
            source = ApplyModifiedFilter(source, query);

            var projected = source
                .OrderBy(t => t.Id)
                .Select(t => new MchCompanyDto
                {
                    Id = t.Id,
                    Nit = t.Nit,
                    Name = t.Name,
                    Address = t.Address,
                    Phone = t.Phone,
                    Email = t.Email,
                    Status = ToStatus(t.IsActive),
                    CreatedAt = t.CreatedAt,
                    ModifiedAt = t.UpdatedAt ?? t.CreatedAt
                });

            return Ok(await ToPagedResponseAsync(projected, query));
        }

        [HttpGet("branches")]
        public async Task<IActionResult> GetBranches([FromQuery] MchQuery query)
        {
            var denied = ValidateAccess();
            if (denied != null) return denied;

            IQueryable<Branch> source = _dbContext.Branches
                .IgnoreQueryFilters()
                .AsNoTracking();

            source = ApplyTenantScope(source);
            source = ApplyEntityFilters(source, query);
            source = ApplyModifiedFilter(source, query);

            var projected = source
                .OrderBy(b => b.Id)
                .Select(b => new MchBranchDto
                {
                    Id = b.Id,
                    CompanyId = b.TenantId,
                    Name = b.Name,
                    City = b.City,
                    Department = b.Department,
                    Address = b.Address,
                    Phone = b.Phone,
                    Email = b.Email,
                    WorkshopManager = b.WorkshopManager != null ? b.WorkshopManager.Name : b.ManagerName,
                    MainBrand = null,
                    Status = ToStatus(b.IsActive),
                    CreatedAt = b.CreatedAt,
                    ModifiedAt = b.UpdatedAt ?? b.CreatedAt
                });

            return Ok(await ToPagedResponseAsync(projected, query));
        }

        [HttpGet("customers")]
        public async Task<IActionResult> GetCustomers([FromQuery] MchQuery query)
        {
            var denied = ValidateAccess();
            if (denied != null) return denied;

            IQueryable<Customer> source = _dbContext.Customers
                .IgnoreQueryFilters()
                .AsNoTracking();

            source = ApplyTenantScope(source);
            source = ApplyEntityFilters(source, query);
            source = ApplyModifiedFilter(source, query);

            var projected = source
                .OrderBy(c => c.Id)
                .Select(c => new MchThirdPartyDto
                {
                    Id = c.Id,
                    CompanyId = c.TenantId,
                    Type = "Customer",
                    IdentificationType = c.IdentificationType,
                    TaxId = c.TaxId,
                    Name = (c.FirstName + " " + c.LastName).Trim(),
                    ContactName = null,
                    Phone = c.Phone,
                    Email = c.Email,
                    Address = c.Address,
                    City = c.City,
                    Department = c.Department,
                    Status = ToStatus(c.IsActive),
                    CreatedAt = c.CreatedAt,
                    ModifiedAt = c.UpdatedAt ?? c.CreatedAt
                });

            return Ok(await ToPagedResponseAsync(projected, query));
        }

        [HttpGet("suppliers")]
        public async Task<IActionResult> GetSuppliers([FromQuery] MchQuery query)
        {
            var denied = ValidateAccess();
            if (denied != null) return denied;

            IQueryable<Supplier> source = _dbContext.Suppliers
                .IgnoreQueryFilters()
                .AsNoTracking();

            source = ApplyTenantScope(source);
            source = ApplyEntityFilters(source, query);
            source = ApplyModifiedFilter(source, query);

            var projected = source
                .OrderBy(s => s.Id)
                .Select(s => new MchThirdPartyDto
                {
                    Id = s.Id,
                    CompanyId = s.TenantId,
                    Type = "Supplier",
                    IdentificationType = s.IdentificationType,
                    TaxId = s.TaxId,
                    Name = s.Name,
                    ContactName = s.ContactName,
                    Phone = s.Phone,
                    Email = s.Email,
                    Address = s.Address,
                    City = null,
                    Department = null,
                    Status = ToStatus(s.IsActive),
                    CreatedAt = s.CreatedAt,
                    ModifiedAt = s.UpdatedAt ?? s.CreatedAt
                });

            return Ok(await ToPagedResponseAsync(projected, query));
        }

        [HttpGet("article-catalog")]
        public async Task<IActionResult> GetArticleCatalog([FromQuery] MchQuery query)
        {
            var denied = ValidateAccess();
            if (denied != null) return denied;

            IQueryable<Product> source = _dbContext.Products
                .IgnoreQueryFilters()
                .AsNoTracking();

            source = ApplyTenantScope(source);
            source = ApplyEntityFilters(source, query);
            source = ApplyModifiedFilter(source, query);

            var projected = source
                .OrderBy(p => p.Id)
                .Select(p => new MchArticleDto
                {
                    Id = p.Id,
                    CompanyId = p.TenantId,
                    Reference = p.SKU,
                    Barcode = p.Barcode,
                    Description = p.Name,
                    ExtendedDescription = p.Description,
                    Category = p.Category != null ? p.Category.Name : null,
                    CategoryHierarchy = p.Category != null && p.Category.Parent != null
                        ? p.Category.Parent.Name + " / " + p.Category.Name
                        : p.Category != null ? p.Category.Name : null,
                    ArticleType = p.Type,
                    BaseUnit = p.UnitOfMeasure,
                    SalePrice = p.Price,
                    IvaType = p.IvaType,
                    IvaRate = p.IvaRate,
                    PriceIncludesIva = p.PriceIncludesIva,
                    Status = ToStatus(p.IsActive),
                    CreatedAt = p.CreatedAt,
                    ModifiedAt = p.UpdatedAt ?? p.CreatedAt
                });

            return Ok(await ToPagedResponseAsync(projected, query));
        }

        [HttpGet("inventory")]
        public async Task<IActionResult> GetInventory([FromQuery] MchQuery query)
        {
            var denied = ValidateAccess();
            if (denied != null) return denied;

            IQueryable<Stock> source = _dbContext.Stocks
                .IgnoreQueryFilters()
                .AsNoTracking();

            source = ApplyTenantScope(source);
            source = ApplyEntityFilters(source, query);
            source = ApplyModifiedFilter(source, query);

            var projected = source
                .OrderBy(s => s.Id)
                .Select(s => new MchInventoryDto
                {
                    Id = s.Id,
                    CompanyId = s.TenantId,
                    BranchId = s.BranchId,
                    BranchName = s.Branch.Name,
                    Warehouse = s.Branch.Name,
                    Reference = s.Product.SKU,
                    ProductId = s.ProductId,
                    Description = s.Product.Name,
                    Quantity = s.Quantity,
                    Unit = s.Product.UnitOfMeasure,
                    CurrentCost = s.Cost,
                    SalePrice = s.Product.Price,
                    MinimumStock = s.MinStockLevel,
                    MaximumStock = s.MaxStockLevel,
                    ProductStatus = ToStatus(s.Product.IsActive),
                    Status = ToStatus(s.IsActive),
                    CreatedAt = s.CreatedAt,
                    ModifiedAt = s.UpdatedAt ?? s.CreatedAt
                });

            return Ok(await ToPagedResponseAsync(projected, query));
        }

        [HttpGet("sales")]
        public async Task<IActionResult> GetSales([FromQuery] MchQuery query)
        {
            var denied = ValidateAccess();
            if (denied != null) return denied;

            IQueryable<Sale> source = _dbContext.Sales
                .IgnoreQueryFilters()
                .Include(s => s.Customer)
                .Include(s => s.Branch)
                .Include(s => s.SaleDetails)
                    .ThenInclude(d => d.Product)
                .AsNoTracking();

            source = ApplyTenantScope(source);
            source = ApplyEntityFilters(source, query);
            source = ApplyModifiedFilter(source, query);
            source = ApplyDateRange(source, query, s => s.Date);

            var paged = await PageEntitiesAsync(source.OrderBy(s => s.Id), query, sales => sales.Select(s => new MchSaleDto
            {
                Id = s.Id,
                CompanyId = s.TenantId,
                BranchId = s.BranchId,
                BranchName = s.Branch?.Name,
                DocumentType = "Invoice",
                DocumentNumber = s.InvoiceNumber,
                Date = s.Date,
                CustomerId = s.CustomerId,
                CustomerName = s.Customer != null ? $"{s.Customer.FirstName} {s.Customer.LastName}".Trim() : null,
                ServiceOrderId = s.ServiceOrderId,
                PaymentMethod = s.PaymentMethod,
                ElectronicInvoicingStatus = s.ElectronicInvoicingStatus,
                TotalAmount = s.TotalAmount,
                Status = ToStatus(s.IsActive),
                CreatedAt = s.CreatedAt,
                ModifiedAt = s.UpdatedAt ?? s.CreatedAt,
                Lines = s.SaleDetails.Select(d => new MchSaleLineDto
                {
                    Id = d.Id,
                    ProductId = d.ProductId,
                    Reference = d.Product?.SKU,
                    Description = d.Product?.Name,
                    Quantity = d.Quantity,
                    Unit = d.Product?.UnitOfMeasure,
                    UnitPrice = d.UnitPrice,
                    TaxRate = d.TaxRate,
                    TaxAmount = d.TaxAmount,
                    SubTotal = d.SubTotal,
                    Cost = null
                }).ToList()
            }).ToList());

            return Ok(paged);
        }

        [HttpGet("purchases")]
        public async Task<IActionResult> GetPurchases([FromQuery] MchQuery query)
        {
            var denied = ValidateAccess();
            if (denied != null) return denied;

            IQueryable<Purchase> source = _dbContext.Purchases
                .IgnoreQueryFilters()
                .Include(p => p.Supplier)
                .Include(p => p.Branch)
                .Include(p => p.PurchaseDetails)
                    .ThenInclude(d => d.Product)
                .AsNoTracking();

            source = ApplyTenantScope(source);
            source = ApplyEntityFilters(source, query);
            source = ApplyModifiedFilter(source, query);
            source = ApplyDateRange(source, query, p => p.Date);

            var paged = await PageEntitiesAsync(source.OrderBy(p => p.Id), query, purchases => purchases.Select(p => new MchPurchaseDto
            {
                Id = p.Id,
                CompanyId = p.TenantId,
                BranchId = p.BranchId,
                BranchName = p.Branch?.Name,
                SupplierId = p.SupplierId,
                SupplierName = p.Supplier?.Name,
                DocumentType = "Purchase",
                DocumentNumber = p.ReferenceNumber,
                Date = p.Date,
                SupplierInvoiceDate = p.SupplierInvoiceDate,
                ReceptionDate = null,
                ItemsSubTotal = p.ItemsSubTotal,
                ItemsTaxAmount = p.ItemsTaxAmount,
                TotalAmount = p.TotalAmount,
                Freight = p.Freight,
                FreightTaxRate = p.FreightTaxRate,
                FreightTaxAmount = p.FreightTaxAmount,
                Status = p.Status,
                AccountingStatus = p.AccountingStatus,
                AccountingReference = p.AccountingReference,
                AccountingExportedAt = p.AccountingExportedAt,
                CreatedAt = p.CreatedAt,
                ModifiedAt = p.UpdatedAt ?? p.CreatedAt,
                Lines = p.PurchaseDetails.Select(d => new MchPurchaseLineDto
                {
                    Id = d.Id,
                    ProductId = d.ProductId,
                    Reference = d.Product?.SKU,
                    Description = d.Product?.Name,
                    Quantity = d.Quantity,
                    Unit = d.Product?.UnitOfMeasure,
                    UnitCost = d.UnitCost,
                    TaxRate = d.TaxRate,
                    TaxAmount = d.TaxAmount,
                    SubTotal = d.SubTotal
                }).ToList()
            }).ToList());

            return Ok(paged);
        }

        [HttpGet("service-orders")]
        public async Task<IActionResult> GetServiceOrders([FromQuery] MchQuery query)
        {
            var denied = ValidateAccess();
            if (denied != null) return denied;

            IQueryable<ServiceOrder> source = _dbContext.ServiceOrders
                .IgnoreQueryFilters()
                .Include(o => o.Customer)
                .Include(o => o.Sale)
                    .ThenInclude(s => s.Branch)
                .AsNoTracking();

            source = ApplyTenantScope(source);
            source = ApplyEntityFilters(source, query);
            source = ApplyModifiedFilter(source, query);
            source = ApplyDateRange(source, query, o => o.IntakeDateTime);

            if (!string.IsNullOrWhiteSpace(query.Marca))
            {
                source = source.Where(o => o.Brand.Contains(query.Marca));
            }

            if (query.SucursalId.HasValue)
            {
                source = source.Where(o => o.Sale != null && o.Sale.BranchId == query.SucursalId.Value);
            }

            var paged = await PageEntitiesAsync(source.OrderBy(o => o.Id), query, async orders =>
            {
                var orderIds = orders.Select(o => o.Id).ToArray();
                var works = await _dbContext.ServiceOrderWorks
                    .IgnoreQueryFilters()
                    .AsNoTracking()
                    .Where(w => orderIds.Contains(w.ServiceOrderId))
                    .ToListAsync();

                var parts = await _dbContext.ServiceOrderParts
                    .IgnoreQueryFilters()
                    .Include(p => p.Product)
                    .AsNoTracking()
                    .Where(p => orderIds.Contains(p.ServiceOrderId))
                    .ToListAsync();

                return orders.Select(o => new MchServiceOrderDto
                {
                    Id = o.Id,
                    CompanyId = o.TenantId,
                    BranchId = o.Sale?.BranchId,
                    BranchName = o.Sale?.Branch?.Name,
                    Number = o.Id.ToString(),
                    Plate = o.Plate,
                    Brand = o.Brand,
                    Model = o.Model,
                    Year = o.Year,
                    Mileage = o.Mileage,
                    IntakeDateTime = o.IntakeDateTime,
                    ExitDateTime = o.ExitDateTime,
                    CustomerId = o.CustomerId,
                    CustomerName = o.Customer != null ? $"{o.Customer.FirstName} {o.Customer.LastName}".Trim() : null,
                    Technician = o.Technician,
                    WorkshopManager = o.WorkshopManager,
                    Status = o.Status,
                    FuelLevel = o.FuelLevel,
                    InitialObservations = o.InitialObservations,
                    VisualCondition = o.VisualCondition,
                    DeliveryNotes = o.DeliveryNotes,
                    CloseType = o.CloseType,
                    CloseReason = o.CloseReason,
                    LaborCost = o.LaborCost,
                    InvoiceNumber = o.Sale?.InvoiceNumber,
                    InvoiceDate = o.Sale?.Date,
                    CreatedAt = o.CreatedAt,
                    ModifiedAt = o.UpdatedAt ?? o.CreatedAt,
                    Works = works
                        .Where(w => w.ServiceOrderId == o.Id)
                        .Select(w => new MchServiceOrderWorkDto
                        {
                            Id = w.Id,
                            ProductId = w.ProductId,
                            Description = w.Description,
                            Technician = w.Technician,
                            EstimatedTimeHours = w.EstimatedTimeHours,
                            LaborCost = w.LaborCost,
                            Status = w.Status
                        })
                        .ToList(),
                    Parts = parts
                        .Where(p => p.ServiceOrderId == o.Id)
                        .Select(p => new MchServiceOrderPartDto
                        {
                            Id = p.Id,
                            ProductId = p.ProductId,
                            Reference = p.Product?.SKU,
                            Description = p.Product?.Name,
                            Quantity = p.Quantity,
                            Unit = p.Product?.UnitOfMeasure,
                            UnitPrice = p.UnitPrice,
                            DiscountType = p.DiscountType,
                            DiscountValue = p.DiscountValue,
                            DiscountAmount = p.DiscountAmount,
                            SubTotal = p.SubTotal
                        })
                        .ToList()
                }).ToList();
            });

            return Ok(paged);
        }

        private IActionResult? ValidateAccess()
        {
            var enabled = _configuration.GetValue("Integrations:MCH:Enabled", false);
            var expectedApiKey = _configuration["Integrations:MCH:ApiKey"];

            if (!enabled || string.IsNullOrWhiteSpace(expectedApiKey))
            {
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new
                {
                    message = "Integracion MCH no configurada.",
                    requiredConfiguration = "Integrations:MCH:Enabled=true e Integrations:MCH:ApiKey"
                });
            }

            var providedApiKey = Request.Headers[ApiKeyHeaderName].FirstOrDefault();
            if (string.IsNullOrWhiteSpace(providedApiKey) || !SecureEquals(providedApiKey, expectedApiKey))
            {
                return Unauthorized(new { message = "Clave de integracion MCH invalida o ausente." });
            }

            return null;
        }

        private bool SecureEquals(string value, string expected)
        {
            var valueBytes = Encoding.UTF8.GetBytes(value);
            var expectedBytes = Encoding.UTF8.GetBytes(expected);
            return CryptographicOperations.FixedTimeEquals(valueBytes, expectedBytes);
        }

        private IQueryable<Tenant> ApplyTenantScope(IQueryable<Tenant> source)
        {
            var allowedTenantIds = GetAllowedTenantIds();
            return allowedTenantIds.Length == 0
                ? source
                : source.Where(t => allowedTenantIds.Contains(t.Id));
        }

        private IQueryable<T> ApplyTenantScope<T>(IQueryable<T> source) where T : class, IMustHaveTenant
        {
            var allowedTenantIds = GetAllowedTenantIds();
            return allowedTenantIds.Length == 0
                ? source
                : source.Where(e => allowedTenantIds.Contains(e.TenantId));
        }

        private IQueryable<T> ApplyEntityFilters<T>(IQueryable<T> source, MchQuery query) where T : class, IMustHaveTenant
        {
            if (query.EmpresaId.HasValue)
            {
                source = source.Where(e => e.TenantId == query.EmpresaId.Value);
            }

            return source;
        }

        private IQueryable<Stock> ApplyEntityFilters(IQueryable<Stock> source, MchQuery query)
        {
            source = ApplyEntityFilters<Stock>(source, query);

            if (query.SucursalId.HasValue)
            {
                source = source.Where(s => s.BranchId == query.SucursalId.Value);
            }

            return source;
        }

        private IQueryable<Sale> ApplyEntityFilters(IQueryable<Sale> source, MchQuery query)
        {
            source = ApplyEntityFilters<Sale>(source, query);

            if (query.SucursalId.HasValue)
            {
                source = source.Where(s => s.BranchId == query.SucursalId.Value);
            }

            return source;
        }

        private IQueryable<Purchase> ApplyEntityFilters(IQueryable<Purchase> source, MchQuery query)
        {
            source = ApplyEntityFilters<Purchase>(source, query);

            if (query.SucursalId.HasValue)
            {
                source = source.Where(p => p.BranchId == query.SucursalId.Value);
            }

            return source;
        }

        private IQueryable<T> ApplyModifiedFilter<T>(IQueryable<T> source, MchQuery query) where T : BaseEntity
        {
            if (query.ModificadoDesde.HasValue)
            {
                var modifiedSince = query.ModificadoDesde.Value;
                source = source.Where(e => (e.UpdatedAt ?? e.CreatedAt) >= modifiedSince);
            }

            return source;
        }

        private IQueryable<T> ApplyDateRange<T>(IQueryable<T> source, MchQuery query, System.Linq.Expressions.Expression<Func<T, DateTime>> dateSelector)
        {
            if (!query.Desde.HasValue && !query.Hasta.HasValue)
            {
                return source;
            }

            var parameter = dateSelector.Parameters[0];
            var body = dateSelector.Body;
            System.Linq.Expressions.Expression? predicate = null;

            if (query.Desde.HasValue)
            {
                var from = System.Linq.Expressions.Expression.GreaterThanOrEqual(
                    body,
                    System.Linq.Expressions.Expression.Constant(query.Desde.Value));
                predicate = from;
            }

            if (query.Hasta.HasValue)
            {
                var toValue = NormalizeEndDate(query.Hasta.Value);
                var to = System.Linq.Expressions.Expression.LessThanOrEqual(
                    body,
                    System.Linq.Expressions.Expression.Constant(toValue));
                predicate = predicate == null ? to : System.Linq.Expressions.Expression.AndAlso(predicate, to);
            }

            if (predicate == null)
            {
                return source;
            }

            var lambda = System.Linq.Expressions.Expression.Lambda<Func<T, bool>>(predicate, parameter);
            return source.Where(lambda);
        }

        private async Task<MchPagedResponse<T>> ToPagedResponseAsync<T>(IQueryable<T> source, MchQuery query)
        {
            var pageSize = GetPageSize(query);
            var offset = GetOffset(query);
            var totalRecords = await source.CountAsync();
            var data = await source.Skip(offset).Take(pageSize).ToListAsync();

            return new MchPagedResponse<T>
            {
                Data = data,
                TotalRecords = totalRecords,
                PageSize = pageSize,
                NextContinuationToken = offset + data.Count < totalRecords ? (offset + data.Count).ToString() : null,
                GeneratedAtUtc = DateTime.UtcNow
            };
        }

        private async Task<MchPagedResponse<TDto>> PageEntitiesAsync<TEntity, TDto>(
            IQueryable<TEntity> source,
            MchQuery query,
            Func<List<TEntity>, List<TDto>> map)
        {
            return await PageEntitiesAsync(source, query, entities => Task.FromResult(map(entities)));
        }

        private async Task<MchPagedResponse<TDto>> PageEntitiesAsync<TEntity, TDto>(
            IQueryable<TEntity> source,
            MchQuery query,
            Func<List<TEntity>, Task<List<TDto>>> map)
        {
            var pageSize = GetPageSize(query);
            var offset = GetOffset(query);
            var totalRecords = await source.CountAsync();
            var entities = await source.Skip(offset).Take(pageSize).ToListAsync();
            var data = await map(entities);

            return new MchPagedResponse<TDto>
            {
                Data = data,
                TotalRecords = totalRecords,
                PageSize = pageSize,
                NextContinuationToken = offset + data.Count < totalRecords ? (offset + data.Count).ToString() : null,
                GeneratedAtUtc = DateTime.UtcNow
            };
        }

        private int[] GetAllowedTenantIds()
        {
            return _configuration
                .GetSection("Integrations:MCH:AllowedTenantIds")
                .Get<int[]>()?
                .Where(id => id > 0)
                .Distinct()
                .ToArray() ?? Array.Empty<int>();
        }

        private static int GetPageSize(MchQuery query)
        {
            var requested = query.PageSize <= 0 ? DefaultPageSize : query.PageSize;
            return Math.Clamp(requested, 1, MaxPageSize);
        }

        private static int GetOffset(MchQuery query)
        {
            if (!int.TryParse(query.ContinuationToken, out var offset))
            {
                return 0;
            }

            return Math.Max(0, offset);
        }

        private static DateTime NormalizeEndDate(DateTime value)
        {
            return value.TimeOfDay == TimeSpan.Zero ? value.Date.AddDays(1).AddTicks(-1) : value;
        }

        private static string ToStatus(bool isActive)
        {
            return isActive ? "Activo" : "Inactivo";
        }
    }

    public class MchQuery
    {
        public int? EmpresaId { get; set; }
        public int? SucursalId { get; set; }
        public string? Marca { get; set; }
        public DateTime? Desde { get; set; }
        public DateTime? Hasta { get; set; }
        public DateTime? ModificadoDesde { get; set; }
        public int PageSize { get; set; } = 100;
        public string? ContinuationToken { get; set; }
    }

    public class MchPagedResponse<T>
    {
        public IReadOnlyList<T> Data { get; set; } = Array.Empty<T>();
        public int TotalRecords { get; set; }
        public int PageSize { get; set; }
        public string? NextContinuationToken { get; set; }
        public DateTime GeneratedAtUtc { get; set; }
    }

    public class MchCompanyDto
    {
        public int Id { get; set; }
        public string? Nit { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Address { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime ModifiedAt { get; set; }
    }

    public class MchBranchDto
    {
        public int Id { get; set; }
        public int CompanyId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? City { get; set; }
        public string? Department { get; set; }
        public string? Address { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string? WorkshopManager { get; set; }
        public string? MainBrand { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime ModifiedAt { get; set; }
    }

    public class MchThirdPartyDto
    {
        public int Id { get; set; }
        public int CompanyId { get; set; }
        public string Type { get; set; } = string.Empty;
        public string? IdentificationType { get; set; }
        public string? TaxId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? ContactName { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? Department { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime ModifiedAt { get; set; }
    }

    public class MchArticleDto
    {
        public int Id { get; set; }
        public int CompanyId { get; set; }
        public string Reference { get; set; } = string.Empty;
        public string? Barcode { get; set; }
        public string Description { get; set; } = string.Empty;
        public string? ExtendedDescription { get; set; }
        public string? Category { get; set; }
        public string? CategoryHierarchy { get; set; }
        public string ArticleType { get; set; } = string.Empty;
        public string BaseUnit { get; set; } = string.Empty;
        public decimal SalePrice { get; set; }
        public string IvaType { get; set; } = string.Empty;
        public decimal IvaRate { get; set; }
        public bool PriceIncludesIva { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime ModifiedAt { get; set; }
    }

    public class MchInventoryDto
    {
        public int Id { get; set; }
        public int CompanyId { get; set; }
        public int BranchId { get; set; }
        public string BranchName { get; set; } = string.Empty;
        public string Warehouse { get; set; } = string.Empty;
        public int ProductId { get; set; }
        public string Reference { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public decimal Quantity { get; set; }
        public string Unit { get; set; } = string.Empty;
        public decimal CurrentCost { get; set; }
        public decimal SalePrice { get; set; }
        public int MinimumStock { get; set; }
        public int MaximumStock { get; set; }
        public string ProductStatus { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime ModifiedAt { get; set; }
    }

    public class MchSaleDto
    {
        public int Id { get; set; }
        public int CompanyId { get; set; }
        public int BranchId { get; set; }
        public string? BranchName { get; set; }
        public string DocumentType { get; set; } = string.Empty;
        public string DocumentNumber { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public int? CustomerId { get; set; }
        public string? CustomerName { get; set; }
        public int? ServiceOrderId { get; set; }
        public string PaymentMethod { get; set; } = string.Empty;
        public string ElectronicInvoicingStatus { get; set; } = string.Empty;
        public decimal TotalAmount { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime ModifiedAt { get; set; }
        public List<MchSaleLineDto> Lines { get; set; } = new();
    }

    public class MchSaleLineDto
    {
        public int Id { get; set; }
        public int ProductId { get; set; }
        public string? Reference { get; set; }
        public string? Description { get; set; }
        public decimal Quantity { get; set; }
        public string? Unit { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal TaxRate { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal SubTotal { get; set; }
        public decimal? Cost { get; set; }
    }

    public class MchPurchaseDto
    {
        public int Id { get; set; }
        public int CompanyId { get; set; }
        public int BranchId { get; set; }
        public string? BranchName { get; set; }
        public int SupplierId { get; set; }
        public string? SupplierName { get; set; }
        public string DocumentType { get; set; } = string.Empty;
        public string DocumentNumber { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public DateTime? SupplierInvoiceDate { get; set; }
        public DateTime? ReceptionDate { get; set; }
        public decimal ItemsSubTotal { get; set; }
        public decimal ItemsTaxAmount { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal Freight { get; set; }
        public decimal FreightTaxRate { get; set; }
        public decimal FreightTaxAmount { get; set; }
        public string Status { get; set; } = string.Empty;
        public string AccountingStatus { get; set; } = string.Empty;
        public string? AccountingReference { get; set; }
        public DateTime? AccountingExportedAt { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime ModifiedAt { get; set; }
        public List<MchPurchaseLineDto> Lines { get; set; } = new();
    }

    public class MchPurchaseLineDto
    {
        public int Id { get; set; }
        public int ProductId { get; set; }
        public string? Reference { get; set; }
        public string? Description { get; set; }
        public decimal Quantity { get; set; }
        public string? Unit { get; set; }
        public decimal UnitCost { get; set; }
        public decimal TaxRate { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal SubTotal { get; set; }
    }

    public class MchServiceOrderDto
    {
        public int Id { get; set; }
        public int CompanyId { get; set; }
        public int? BranchId { get; set; }
        public string? BranchName { get; set; }
        public string Number { get; set; } = string.Empty;
        public string Plate { get; set; } = string.Empty;
        public string Brand { get; set; } = string.Empty;
        public string Model { get; set; } = string.Empty;
        public int Year { get; set; }
        public decimal Mileage { get; set; }
        public DateTime IntakeDateTime { get; set; }
        public DateTime? ExitDateTime { get; set; }
        public int CustomerId { get; set; }
        public string? CustomerName { get; set; }
        public string Technician { get; set; } = string.Empty;
        public string? WorkshopManager { get; set; }
        public string Status { get; set; } = string.Empty;
        public string FuelLevel { get; set; } = string.Empty;
        public string InitialObservations { get; set; } = string.Empty;
        public string VisualCondition { get; set; } = string.Empty;
        public string? DeliveryNotes { get; set; }
        public string? CloseType { get; set; }
        public string? CloseReason { get; set; }
        public decimal LaborCost { get; set; }
        public string? InvoiceNumber { get; set; }
        public DateTime? InvoiceDate { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime ModifiedAt { get; set; }
        public List<MchServiceOrderWorkDto> Works { get; set; } = new();
        public List<MchServiceOrderPartDto> Parts { get; set; } = new();
    }

    public class MchServiceOrderWorkDto
    {
        public int Id { get; set; }
        public int? ProductId { get; set; }
        public string Description { get; set; } = string.Empty;
        public string Technician { get; set; } = string.Empty;
        public decimal? EstimatedTimeHours { get; set; }
        public decimal LaborCost { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    public class MchServiceOrderPartDto
    {
        public int Id { get; set; }
        public int ProductId { get; set; }
        public string? Reference { get; set; }
        public string? Description { get; set; }
        public decimal Quantity { get; set; }
        public string? Unit { get; set; }
        public decimal UnitPrice { get; set; }
        public string DiscountType { get; set; } = string.Empty;
        public decimal DiscountValue { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal SubTotal { get; set; }
    }
}
