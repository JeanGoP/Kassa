using System.Security.Cryptography;
using System.Reflection;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using TPV.Domain.Common;
using TPV.Domain.Entities;
using TPV.Infrastructure.Persistence;
using TPV.Infrastructure.Identity;

namespace TPV.Web.Controllers.Api.Integrations
{
    [ApiController]
    [Route("api/integrations/mch")]
    [Route("api/integrations/mch/v1")]
    [EnableRateLimiting("mch")]
    [ServiceFilter(typeof(MchUtcJsonResultFilter))]
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
                version = "1.0",
                canonicalBasePath = "/api/integrations/mch/v1",
                generatedAtUtc = DateTime.UtcNow,
                resources = new[]
                {
                    "companies",
                    "branches",
                    "brands",
                    "models",
                    "customers",
                    "suppliers",
                    "personnel",
                    "article-catalog",
                    "inventory",
                    "sales",
                    "purchases",
                    "service-orders",
                    "warranties",
                    "preparation-orders",
                    "vehicles",
                    "coverage"
                }
            });
        }

        [HttpGet("health")]
        public async Task<IActionResult> GetHealth()
        {
            var denied = ValidateAccess();
            if (denied != null) return denied;

            var databaseAvailable = false;
            try
            {
                databaseAvailable = await _dbContext.Database.CanConnectAsync();
            }
            catch
            {
                databaseAvailable = false;
            }

            var response = new
            {
                status = databaseAvailable ? "available" : "unavailable",
                apiVersion = "1.0",
                environment = _configuration["Integrations:MCH:Environment"] ?? "production",
                databaseAvailable,
                checkedAtUtc = DateTimeOffset.UtcNow,
                maintenanceWindow = _configuration["Integrations:MCH:MaintenanceWindow"] ?? "Domingos 02:00-04:00 America/Bogota"
            };

            return databaseAvailable ? Ok(response) : StatusCode(StatusCodes.Status503ServiceUnavailable, response);
        }

        [HttpGet("contract")]
        public IActionResult GetContract()
        {
            var denied = ValidateAccess();
            if (denied != null) return denied;

            var resources = new Dictionary<string, Type>
            {
                ["companies"] = typeof(MchCompanyDto),
                ["branches"] = typeof(MchBranchDto),
                ["brands"] = typeof(MchBrandDto),
                ["models"] = typeof(MchVehicleModelDto),
                ["customers"] = typeof(MchThirdPartyDto),
                ["suppliers"] = typeof(MchThirdPartyDto),
                ["personnel"] = typeof(MchPersonnelDto),
                ["article-catalog"] = typeof(MchArticleDto),
                ["units"] = typeof(MchUnitDto),
                ["inventory"] = typeof(MchInventoryDto),
                ["inventory-movements"] = typeof(MchInventoryMovementDto),
                ["sales"] = typeof(MchSaleDto),
                ["purchases"] = typeof(MchPurchaseDto),
                ["service-orders"] = typeof(MchServiceOrderDto),
                ["vehicles"] = typeof(MchVehicleDto),
                ["warranties"] = typeof(MchWarrantyDto),
                ["preparation-orders"] = typeof(MchPreparationOrderDto)
            };

            var componentTypes = resources.Values
                .Concat(new[]
                {
                    typeof(MchQuery), typeof(MchArticleApplicabilityDto), typeof(MchArticleReferenceRelationDto),
                    typeof(MchArticleKitComponentDto), typeof(MchInventoryLocationBalanceDto),
                    typeof(MchSaleLineDto), typeof(MchSaleAdjustmentDto), typeof(MchSaleAdjustmentLineDto),
                    typeof(MchPurchaseLineDto), typeof(MchPreparationOrderConsumptionDto),
                    typeof(MchServiceOrderWorkDto), typeof(MchServiceOrderPartDto),
                    typeof(MchServiceOrderStatusHistoryDto), typeof(MchWarrantyReplacementPartDto),
                    typeof(MchWarrantyStatusHistoryDto), typeof(MchVehicleOwnerDto),
                    typeof(MchVehicleServiceHistoryDto), typeof(MchVehicleMaintenanceReviewDto)
                })
                .Distinct()
                .ToDictionary(type => type.Name, DescribeContractType);

            return Ok(new
            {
                apiVersion = "1.0",
                basePath = "/api/integrations/mch/v1",
                authenticationHeader = ApiKeyHeaderName,
                responseFormat = "application/json",
                timeZone = "UTC",
                pagination = new
                {
                    request = new { pageSize = "integer (1-500)", continuationToken = "string" },
                    response = new { data = "array", totalRecords = "integer", pageSize = "integer", nextContinuationToken = "string|null", generatedAtUtc = "string(date-time)" }
                },
                endpoints = resources.Select(item => new
                {
                    method = "GET",
                    path = $"/api/integrations/mch/v1/{item.Key}",
                    responseItemSchema = item.Value.Name
                }),
                components = componentTypes
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
                status = "Roadmap MCH v6 completado",
                note = "API versionada de solo lectura. No crea ni modifica informacion.",
                availableNow = new[]
                {
                    "Empresas, sucursales, clientes, proveedores y personal basico",
                    "Personal consolidado desde usuarios, tecnicos y jefes de taller",
                    "Catalogos formales de marcas y modelos por empresa",
                    "Catalogo basico de articulos y servicios con marca",
                    "Inventario por sucursal con costo y niveles minimo/maximo",
                    "Ventas, compras y ordenes de taller",
                    "Garantias de fabricante desde deteccion hasta factura y pago",
                    "Ordenes de alistamiento con solicitud, vehiculo, ejecutante, consumos y hallazgos",
                    "Maestro de vehiculos por VIN con propietario e historial de atenciones",
                    "Filtros por empresa, sucursal, marca, fechas y modificado_desde donde aplica",
                    "Paginacion por continuationToken"
                },
                operationalControls = new[]
                {
                    "Ruta canonica /api/integrations/mch/v1",
                    "Contrato consultable en /contract y salud en /health",
                    "Rotacion sin corte mediante multiples ApiKeys",
                    "Limite configurable por credencial",
                    "Politica operativa documentada en Documentation/MCH_API_OPERATIONS.md"
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
                    Nit = t.Nit ?? string.Empty,
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
                    MainBrandId = b.MainBrandId,
                    MainBrand = b.MainBrand != null ? b.MainBrand.Name : null,
                    Status = ToStatus(b.IsActive),
                    CreatedAt = b.CreatedAt,
                    ModifiedAt = b.UpdatedAt ?? b.CreatedAt
                });

            return Ok(await ToPagedResponseAsync(projected, query));
        }

        [HttpGet("brands")]
        public async Task<IActionResult> GetBrands([FromQuery] MchQuery query)
        {
            var denied = ValidateAccess();
            if (denied != null) return denied;

            IQueryable<Brand> source = _dbContext.Brands.IgnoreQueryFilters().AsNoTracking();
            source = ApplyTenantScope(source);
            source = ApplyEntityFilters(source, query);
            source = ApplyModifiedFilter(source, query);
            if (!string.IsNullOrWhiteSpace(query.Marca)) source = source.Where(b => b.Name.Contains(query.Marca));

            var projected = source.OrderBy(b => b.Id).Select(b => new MchBrandDto
            {
                Id = b.Id,
                CompanyId = b.TenantId,
                Code = b.Code,
                Name = b.Name,
                Status = ToStatus(b.IsActive),
                CreatedAt = b.CreatedAt,
                ModifiedAt = b.UpdatedAt ?? b.CreatedAt
            });
            return Ok(await ToPagedResponseAsync(projected, query));
        }

        [HttpGet("models")]
        public async Task<IActionResult> GetModels([FromQuery] MchQuery query)
        {
            var denied = ValidateAccess();
            if (denied != null) return denied;

            IQueryable<VehicleModel> source = _dbContext.VehicleModels.IgnoreQueryFilters().AsNoTracking();
            source = ApplyTenantScope(source);
            source = ApplyEntityFilters(source, query);
            source = ApplyModifiedFilter(source, query);
            if (!string.IsNullOrWhiteSpace(query.Marca)) source = source.Where(m => m.Brand.Name.Contains(query.Marca));

            var projected = source.OrderBy(m => m.Id).Select(m => new MchVehicleModelDto
            {
                Id = m.Id,
                CompanyId = m.TenantId,
                BrandId = m.BrandId,
                Brand = m.Brand.Name,
                Code = m.Code,
                Name = m.Name,
                Status = ToStatus(m.IsActive),
                CreatedAt = m.CreatedAt,
                ModifiedAt = m.UpdatedAt ?? m.CreatedAt
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
                .Include(s => s.OfficialBrand)
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
                    SupplierType = s.SupplierType,
                    OfficialBrandId = s.OfficialBrandId,
                    OfficialBrand = s.OfficialBrand != null ? s.OfficialBrand.Name : null,
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
                .Include(p => p.Category)
                    .ThenInclude(c => c.Parent)
                        .ThenInclude(c => c.Parent)
                            .ThenInclude(c => c.Parent)
                                .ThenInclude(c => c.Parent)
                .Include(p => p.Brand)
                .Include(p => p.BaseUnit)
                .Include(p => p.PurchaseUnit)
                .Include(p => p.SaleUnit)
                .Include(p => p.UnitConversions)
                .Include(p => p.Applicabilities)
                    .ThenInclude(a => a.VehicleModel)
                        .ThenInclude(m => m.Brand)
                .Include(p => p.OutgoingReferenceRelations)
                    .ThenInclude(r => r.RelatedProduct)
                .Include(p => p.IncomingReferenceRelations)
                    .ThenInclude(r => r.Product)
                .Include(p => p.KitComponents)
                    .ThenInclude(c => c.ComponentProduct)
                .Include(p => p.KitComponents)
                    .ThenInclude(c => c.UnitOfMeasure)
                .AsNoTracking();

            source = ApplyTenantScope(source);
            source = ApplyEntityFilters(source, query);
            source = ApplyModifiedFilter(source, query);

            var paged = await PageEntitiesAsync(source.OrderBy(p => p.Id), query, products => products.Select(p => new MchArticleDto
                {
                    Id = p.Id,
                    CompanyId = p.TenantId,
                    Reference = p.SKU,
                    Barcode = p.Barcode,
                    Description = p.Name,
                    ExtendedDescription = p.Description,
                    CategoryId = p.CategoryId,
                    Category = p.Category?.Name,
                    CategoryLevel = p.Category?.Level,
                    CategoryHierarchy = BuildCategoryPath(p.Category),
                    ArticleType = p.Type,
                    OriginType = p.OriginType,
                    IsOfficialCatalog = p.IsOfficialCatalog,
                    Manufacturer = p.Manufacturer,
                    ReferenceType = p.ReferenceType,
                    BrandId = p.BrandId,
                    Brand = p.Brand != null ? p.Brand.Name : null,
                    BaseUnitId = p.BaseUnitId,
                    BaseUnit = p.BaseUnit != null ? p.BaseUnit.Code : p.UnitOfMeasure,
                    AllowsFractionalQuantity = p.AllowsFractionalQuantity,
                    PurchaseUnitId = p.PurchaseUnitId,
                    PurchaseUnit = p.PurchaseUnit != null ? p.PurchaseUnit.Code : p.UnitOfMeasure,
                    PurchaseFactorToBase = p.UnitConversions.Where(c => c.UsageType == "PURCHASE").Select(c => c.FactorToBase).FirstOrDefault(),
                    SaleUnitId = p.SaleUnitId,
                    SaleUnit = p.SaleUnit != null ? p.SaleUnit.Code : p.UnitOfMeasure,
                    SaleFactorToBase = p.UnitConversions.Where(c => c.UsageType == "SALE").Select(c => c.FactorToBase).FirstOrDefault(),
                    MinimumOrderQuantity = p.MinimumOrderQuantity,
                    OrderMultiple = p.OrderMultiple,
                    WeightKg = p.WeightKg,
                    LengthCm = p.LengthCm,
                    WidthCm = p.WidthCm,
                    HeightCm = p.HeightCm,
                    LeadTimeDays = p.LeadTimeDays,
                    ReorderPoint = p.ReorderPoint,
                    MinimumStock = p.MinimumStock,
                    MaximumStock = p.MaximumStock,
                    SalePrice = p.Price,
                    IvaType = p.IvaType,
                    IvaRate = p.IvaRate,
                    PriceIncludesIva = p.PriceIncludesIva,
                    Status = p.CatalogStatus,
                    CreatedAt = p.CreatedAt,
                    ModifiedAt = p.UpdatedAt ?? p.CreatedAt,
                    Applicabilities = p.Applicabilities.OrderBy(a => a.VehicleModel.Brand.Name).ThenBy(a => a.VehicleModel.Name)
                        .Select(a => new MchArticleApplicabilityDto
                        {
                            VehicleModelId = a.VehicleModelId,
                            BrandId = a.VehicleModel.BrandId,
                            Brand = a.VehicleModel.Brand.Name,
                            ModelCode = a.VehicleModel.Code,
                            Model = a.VehicleModel.Name,
                            SourceType = a.SourceType
                        }).ToList(),
                    ReferenceRelations = p.OutgoingReferenceRelations.Where(r => r.RelationType == "INTERCAMBIABLE")
                        .Select(r => MapMchArticleRelation(r, r.RelatedProduct, "INTERCAMBIABLE"))
                        .Concat(p.IncomingReferenceRelations.Where(r => r.RelationType == "INTERCAMBIABLE")
                            .Select(r => MapMchArticleRelation(r, r.Product, "INTERCAMBIABLE")))
                        .Concat(p.OutgoingReferenceRelations.Where(r => r.RelationType == "SUSTITUYE_A")
                            .Select(r => MapMchArticleRelation(r, r.RelatedProduct, "SUSTITUYE_A")))
                        .Concat(p.IncomingReferenceRelations.Where(r => r.RelationType == "SUSTITUYE_A")
                            .Select(r => MapMchArticleRelation(r, r.Product, "SUSTITUIDA_POR")))
                        .OrderBy(r => r.RelationType).ThenBy(r => r.RelatedReference).ToList(),
                    KitComponents = p.KitComponents.OrderBy(c => c.ComponentProduct.SKU).Select(c => new MchArticleKitComponentDto
                    {
                        ProductId = c.ComponentProductId,
                        Reference = c.ComponentProduct.SKU,
                        Description = c.ComponentProduct.Name,
                        Quantity = c.Quantity,
                        UnitId = c.UnitOfMeasureId,
                        Unit = c.UnitOfMeasure.Code
                    }).ToList()
                }).ToList());

            return Ok(paged);
        }

        [HttpGet("units")]
        public async Task<IActionResult> GetUnits([FromQuery] MchQuery query)
        {
            var denied = ValidateAccess();
            if (denied != null) return denied;
            IQueryable<UnitOfMeasure> source = _dbContext.UnitsOfMeasure.IgnoreQueryFilters().AsNoTracking();
            source = ApplyTenantScope(source);
            source = ApplyEntityFilters(source, query);
            source = ApplyModifiedFilter(source, query);
            var projected = source.OrderBy(u => u.Id).Select(u => new MchUnitDto
            {
                Id = u.Id, CompanyId = u.TenantId, Code = u.Code, Name = u.Name, Symbol = u.Symbol,
                AllowsDecimals = u.AllowsDecimals, Status = ToStatus(u.IsActive),
                CreatedAt = u.CreatedAt, ModifiedAt = u.UpdatedAt ?? u.CreatedAt
            });
            return Ok(await ToPagedResponseAsync(projected, query));
        }

        [HttpGet("personnel")]
        public async Task<IActionResult> GetPersonnel([FromQuery] MchQuery query)
        {
            var denied = ValidateAccess();
            if (denied != null) return denied;

            var allowedTenantIds = GetAllowedTenantIds();
            var branches = await _dbContext.Branches
                .IgnoreQueryFilters()
                .AsNoTracking()
                .Where(branch => allowedTenantIds.Contains(branch.TenantId))
                .Select(branch => new { branch.Id, branch.TenantId, branch.Name, branch.WorkshopManagerId })
                .ToListAsync();

            var branchById = branches.ToDictionary(branch => branch.Id);
            var personnel = new List<MchPersonnelDto>();

            var users = await _dbContext.Users
                .AsNoTracking()
                .Where(user => user.TenantId.HasValue && allowedTenantIds.Contains(user.TenantId.Value))
                .ToListAsync();
            var userIds = users.Select(user => user.Id).ToArray();
            var userRoleRows = await (
                from userRole in _dbContext.UserRoles.AsNoTracking()
                join role in _dbContext.Roles.AsNoTracking() on userRole.RoleId equals role.Id
                where userIds.Contains(userRole.UserId)
                select new { userRole.UserId, Role = role.Name! })
                .ToListAsync();
            var rolesByUser = userRoleRows
                .GroupBy(item => item.UserId)
                .ToDictionary(group => group.Key, group => string.Join(", ", group.Select(item => item.Role).OrderBy(role => role)));

            foreach (var user in users)
            {
                var modifiedAt = user.UpdatedAt ?? user.CreatedAt;
                if (!MatchesPersonnelQuery(user.TenantId!.Value, user.CurrentBranchId, user.CreatedAt, modifiedAt, query)) continue;
                branchById.TryGetValue(user.CurrentBranchId ?? 0, out var branch);
                var fullName = string.Join(" ", new[] { user.FirstName, user.LastName }.Where(value => !string.IsNullOrWhiteSpace(value))).Trim();
                personnel.Add(new MchPersonnelDto
                {
                    Id = $"USER:{user.Id}", CompanyId = user.TenantId.Value, BranchId = branch?.Id,
                    BranchName = branch?.Name, Name = string.IsNullOrWhiteSpace(fullName) ? user.Email ?? user.UserName ?? user.Id : fullName,
                    Position = rolesByUser.GetValueOrDefault(user.Id, "USUARIO"), Source = "USUARIO",
                    Email = user.Email, Phone = user.PhoneNumber, Status = ToStatus(user.IsActive),
                    CreatedAt = ToUtcOffset(user.CreatedAt), ModifiedAt = ToUtcOffset(modifiedAt)
                });
            }

            var technicians = await _dbContext.Technicians
                .IgnoreQueryFilters()
                .AsNoTracking()
                .Where(technician => allowedTenantIds.Contains(technician.TenantId))
                .ToListAsync();
            foreach (var technician in technicians)
            {
                var modifiedAt = technician.UpdatedAt ?? technician.CreatedAt;
                if (!MatchesPersonnelQuery(technician.TenantId, technician.BranchId, technician.CreatedAt, modifiedAt, query)) continue;
                branchById.TryGetValue(technician.BranchId ?? 0, out var branch);
                personnel.Add(new MchPersonnelDto
                {
                    Id = $"TECHNICIAN:{technician.Id}", CompanyId = technician.TenantId, BranchId = branch?.Id,
                    BranchName = branch?.Name, Name = technician.Name, Position = "TECNICO", Specialty = technician.Specialty,
                    Source = "TECNICO", Email = technician.Email, Phone = technician.Phone, Status = ToStatus(technician.IsActive),
                    CreatedAt = ToUtcOffset(technician.CreatedAt), ModifiedAt = ToUtcOffset(modifiedAt)
                });
            }

            var managers = await _dbContext.WorkshopManagers
                .IgnoreQueryFilters()
                .AsNoTracking()
                .Where(manager => allowedTenantIds.Contains(manager.TenantId))
                .ToListAsync();
            foreach (var manager in managers)
            {
                var assignedBranches = branches.Where(branch => branch.WorkshopManagerId == manager.Id).ToList();
                if (assignedBranches.Count == 0) assignedBranches.Add(null!);
                foreach (var branch in assignedBranches)
                {
                    var modifiedAt = manager.UpdatedAt ?? manager.CreatedAt;
                    if (!MatchesPersonnelQuery(manager.TenantId, branch?.Id, manager.CreatedAt, modifiedAt, query)) continue;
                    personnel.Add(new MchPersonnelDto
                    {
                        Id = branch == null ? $"WORKSHOP_MANAGER:{manager.Id}" : $"WORKSHOP_MANAGER:{manager.Id}:BRANCH:{branch.Id}",
                        CompanyId = manager.TenantId, BranchId = branch?.Id, BranchName = branch?.Name,
                        Name = manager.Name, Position = "JEFE DE TALLER", Source = "JEFE_TALLER",
                        Email = manager.Email, Phone = manager.Phone, Status = ToStatus(manager.IsActive),
                        CreatedAt = ToUtcOffset(manager.CreatedAt), ModifiedAt = ToUtcOffset(modifiedAt)
                    });
                }
            }

            var ordered = personnel.OrderBy(item => item.CompanyId).ThenBy(item => item.BranchId).ThenBy(item => item.Name).ThenBy(item => item.Id).ToList();
            var pageSize = GetPageSize(query);
            var offset = GetOffset(query);
            var data = ordered.Skip(offset).Take(pageSize).ToList();
            return Ok(new MchPagedResponse<MchPersonnelDto>
            {
                Data = data,
                TotalRecords = ordered.Count,
                PageSize = pageSize,
                NextContinuationToken = offset + data.Count < ordered.Count ? (offset + data.Count).ToString() : null,
                GeneratedAtUtc = DateTime.UtcNow
            });
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
                    BrandId = s.Product.BrandId,
                    Brand = s.Product.Brand != null ? s.Product.Brand.Name : null,
                    Quantity = s.Quantity,
                    UnitId = s.Product.BaseUnitId,
                    Unit = s.Product.BaseUnit != null ? s.Product.BaseUnit.Code : s.Product.UnitOfMeasure,
                    CurrentCost = s.Cost,
                    SalePrice = s.Product.Price,
                    MinimumStock = s.MinStockLevel,
                    MaximumStock = s.MaxStockLevel,
                    ProductStatus = ToStatus(s.Product.IsActive),
                    Status = ToStatus(s.IsActive),
                    Locations = _dbContext.InventoryLocationBalances.IgnoreQueryFilters()
                        .Where(b => b.TenantId == s.TenantId && b.ProductId == s.ProductId && b.InventoryLocation.BranchId == s.BranchId)
                        .Select(b => new MchInventoryLocationBalanceDto
                        {
                            LocationId = b.InventoryLocationId,
                            LocationCode = b.InventoryLocation.Code,
                            LocationName = b.InventoryLocation.Name,
                            Quantity = b.QuantityBase,
                            Unit = s.Product.BaseUnit != null ? s.Product.BaseUnit.Code : s.Product.UnitOfMeasure
                        }).ToList(),
                    CreatedAt = s.CreatedAt,
                    ModifiedAt = s.UpdatedAt ?? s.CreatedAt
                });

            return Ok(await ToPagedResponseAsync(projected, query));
        }

        [HttpGet("inventory-movements")]
        public async Task<IActionResult> GetInventoryMovements([FromQuery] MchQuery query)
        {
            var denied = ValidateAccess();
            if (denied != null) return denied;

            IQueryable<InventoryMovement> source = _dbContext.InventoryMovements.IgnoreQueryFilters().AsNoTracking();
            source = ApplyTenantScope(source);
            source = ApplyEntityFilters(source, query);
            source = ApplyModifiedFilter(source, query);
            source = ApplyDateRange(source, query, m => m.OccurredAt);
            if (query.SucursalId.HasValue) source = source.Where(m => m.BranchId == query.SucursalId.Value);

            var projected = source.OrderBy(m => m.Id).Select(m => new MchInventoryMovementDto
            {
                Id = m.Id, CompanyId = m.TenantId, BranchId = m.BranchId, BranchName = m.Branch.Name,
                Warehouse = m.Branch.Name, LocationId = m.InventoryLocationId,
                Location = m.InventoryLocation != null ? m.InventoryLocation.Code + " - " + m.InventoryLocation.Name : null,
                DestinationBranchId = m.DestinationBranchId, DestinationBranchName = m.DestinationBranch != null ? m.DestinationBranch.Name : null,
                DestinationLocationId = m.DestinationLocationId,
                DestinationLocation = m.DestinationLocation != null ? m.DestinationLocation.Code + " - " + m.DestinationLocation.Name : null,
                ProductId = m.ProductId, Reference = m.Product.SKU, Description = m.Product.Name,
                MovementType = m.MovementType, Quantity = m.Quantity, UnitId = m.UnitOfMeasureId,
                Unit = m.UnitCode, FactorToBase = m.FactorToBase, BaseQuantity = m.BaseQuantity,
                DocumentType = m.DocumentType, DocumentId = m.DocumentId, DocumentNumber = m.DocumentNumber,
                Reason = m.Reason, UserId = m.UserId, OccurredAt = m.OccurredAt,
                CreatedAt = m.CreatedAt, ModifiedAt = m.UpdatedAt ?? m.CreatedAt
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
                        .ThenInclude(p => p.Brand)
                .Include(s => s.Adjustments)
                    .ThenInclude(a => a.Details)
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
                CustomerIdentificationType = s.Customer != null ? s.Customer.IdentificationType : null,
                CustomerTaxId = s.Customer != null ? s.Customer.TaxId : null,
                ServiceOrderId = s.ServiceOrderId,
                PaymentMethod = s.PaymentMethod,
                ElectronicInvoicingStatus = s.ElectronicInvoicingStatus,
                TotalAmount = s.TotalAmount,
                AmountReceived = s.AmountReceived ?? s.TotalAmount,
                CustomerAdvanceApplied = s.CustomerAdvanceApplied,
                CustomerAdvanceCreated = s.CustomerAdvanceCreated,
                ChangeAmount = s.ChangeAmount,
                Status = ToStatus(s.IsActive),
                CreatedAt = s.CreatedAt,
                ModifiedAt = s.UpdatedAt ?? s.CreatedAt,
                Lines = s.SaleDetails.Select(d => new MchSaleLineDto
                {
                    Id = d.Id,
                    ProductId = d.ProductId,
                    Reference = d.Product?.SKU,
                    Description = d.Product?.Name,
                    BrandId = d.BrandId ?? d.Product?.BrandId,
                    Brand = d.BrandName ?? d.Product?.Brand?.Name,
                    Quantity = d.Quantity,
                    UnitId = d.UnitOfMeasureId,
                    Unit = d.UnitCode,
                    BaseQuantity = d.QuantityBase,
                    UnitPrice = d.UnitPrice,
                    DiscountAmount = d.DiscountAmount,
                    TaxRate = d.TaxRate,
                    TaxAmount = d.TaxAmount,
                    SubTotal = d.SubTotal,
                    UnitCost = d.UnitCost,
                    Cost = d.TotalCost,
                    AccountingClassification = d.AccountingClassification
                }).ToList(),
                Adjustments = s.Adjustments.OrderBy(a => a.Id).Select(a => new MchSaleAdjustmentDto
                {
                    Id = a.Id,
                    OriginalSaleId = a.SaleId,
                    OriginalDocumentNumber = s.InvoiceNumber,
                    DocumentType = a.DocumentType,
                    DocumentNumber = a.DocumentNumber,
                    Date = a.Date,
                    Reason = a.Reason,
                    RestocksInventory = a.RestocksInventory,
                    TotalAmount = a.TotalAmount,
                    Status = a.Status,
                    Lines = a.Details.Select(d => new MchSaleAdjustmentLineDto
                    {
                        Id = d.Id,
                        SaleDetailId = d.SaleDetailId,
                        ProductId = d.ProductId,
                        Reference = d.Product.SKU,
                        Description = d.Product.Name,
                        BrandId = d.BrandId,
                        Brand = d.BrandName,
                        Quantity = d.Quantity,
                        UnitId = d.UnitOfMeasureId,
                        Unit = d.UnitCode,
                        BaseQuantity = d.QuantityBase,
                        UnitPrice = d.UnitPrice,
                        DiscountAmount = d.DiscountAmount,
                        TaxRate = d.TaxRate,
                        TaxAmount = d.TaxAmount,
                        SubTotal = d.SubTotal,
                        UnitCost = d.UnitCost,
                        Cost = d.TotalCost,
                        AccountingClassification = d.AccountingClassification
                    }).ToList()
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
                .Include(p => p.InventoryLocation)
                .Include(p => p.PurchaseDetails)
                    .ThenInclude(d => d.Product)
                        .ThenInclude(p => p.Brand)
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
                LocationId = p.InventoryLocationId,
                LocationCode = p.InventoryLocation.Code,
                LocationName = p.InventoryLocation.Name,
                SupplierId = p.SupplierId,
                SupplierName = p.Supplier?.Name,
                SupplierIdentificationType = p.Supplier?.IdentificationType,
                SupplierTaxId = p.Supplier?.TaxId,
                SupplierType = p.SupplierType,
                OfficialBrandId = p.OfficialBrandId,
                OfficialBrand = p.OfficialBrandName,
                DocumentType = "Purchase",
                DocumentNumber = p.ReferenceNumber,
                Date = p.Date,
                SupplierInvoiceDate = p.SupplierInvoiceDate,
                ReceptionDate = p.ReceivedAt,
                PurchaseOrderNumber = p.PurchaseOrderNumber,
                PurchaseOrderDate = p.PurchaseOrderDate,
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
                    BrandId = d.BrandId ?? d.Product?.BrandId,
                    Brand = d.BrandName ?? d.Product?.Brand?.Name,
                    Quantity = d.Quantity,
                    UnitId = d.UnitOfMeasureId,
                    Unit = d.UnitCode,
                    BaseQuantity = d.QuantityBase,
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
                .Include(o => o.Branch)
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
                source = source.Where(o => o.BranchId == query.SucursalId.Value ||
                    (o.BranchId == null && o.Sale != null && o.Sale.BranchId == query.SucursalId.Value));
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

                var statusHistory = await _dbContext.ServiceOrderStatusHistories
                    .IgnoreQueryFilters()
                    .AsNoTracking()
                    .Where(h => orderIds.Contains(h.ServiceOrderId))
                    .OrderBy(h => h.ChangedAt)
                    .ToListAsync();

                return orders.Select(o => new MchServiceOrderDto
                {
                    Id = o.Id,
                    CompanyId = o.TenantId,
                    CompanyName = o.CompanyName,
                    CompanyNit = o.CompanyNit,
                    BranchId = o.BranchId ?? o.Sale?.BranchId,
                    BranchName = o.Branch?.Name ?? o.Sale?.Branch?.Name,
                    Number = o.OrderNumber,
                    VehicleId = o.VehicleId,
                    ChassisNumber = o.ChassisNumber,
                    EngineNumber = o.EngineNumber,
                    Plate = o.Plate,
                    BrandId = o.BrandId,
                    VehicleModelId = o.VehicleModelId,
                    Brand = o.Brand,
                    Model = o.Model,
                    Year = o.Year,
                    Mileage = o.Mileage,
                    MaintenanceReviewMileage = o.MaintenanceReviewMileage,
                    IntakeDateTime = o.IntakeDateTime,
                    PromisedDeliveryDateTime = o.PromisedDeliveryDateTime,
                    ExitDateTime = o.ExitDateTime,
                    OrderType = o.OrderType,
                    Origin = o.Origin,
                    ReceivedByUserId = o.ReceivedByUserId,
                    ReceivedByName = o.ReceivedByName,
                    CustomerId = o.CustomerId,
                    CustomerIdentification = o.Customer?.TaxId,
                    CustomerName = o.Customer != null ? $"{o.Customer.FirstName} {o.Customer.LastName}".Trim() : null,
                    CustomerPhone = o.Customer?.Phone,
                    CustomerEmail = o.Customer?.Email,
                    Technician = o.Technician,
                    WorkshopManager = o.WorkshopManager,
                    Status = o.Status,
                    CancelledAt = o.CancelledAt,
                    CancellationReason = o.CancellationReason,
                    CancelledByUserId = o.CancelledByUserId,
                    CancelledByName = o.CancelledByName,
                    FuelLevel = o.FuelLevel,
                    InitialObservations = o.InitialObservations,
                    VisualCondition = o.VisualCondition,
                    ProblemDescription = o.ProblemDescription,
                    TechnicalDiagnosis = o.TechnicalDiagnosis,
                    CustomerApprovedDiagnosis = o.CustomerApprovedDiagnosis,
                    DiagnosisApprovalDate = o.DiagnosisApprovalDate,
                    DiagnosedAt = o.DiagnosedAt,
                    DiagnosedByUserId = o.DiagnosedByUserId,
                    DiagnosedByName = o.DiagnosedByName,
                    DeliveryNotes = o.DeliveryNotes,
                    CloseType = o.CloseType,
                    CloseReason = o.CloseReason,
                    LaborCost = o.LaborCost,
                    LaborTotal = works.Where(w => w.ServiceOrderId == o.Id).Sum(w => w.LaborCost),
                    LaborTaxTotal = works.Where(w => w.ServiceOrderId == o.Id)
                        .Sum(w => decimal.Round(w.LaborCost * w.TaxRate / 100m, 2)),
                    PartsTotal = parts.Where(p => p.ServiceOrderId == o.Id && p.LineType == "REPUESTO").Sum(p => p.SubTotal),
                    ConsumablesTotal = parts.Where(p => p.ServiceOrderId == o.Id && p.LineType == "INSUMO").Sum(p => p.SubTotal),
                    CustomerInvoiceTotal = works.Where(w => w.ServiceOrderId == o.Id && w.AddsToCustomerTotal)
                            .Sum(w => w.LaborCost + decimal.Round(w.LaborCost * w.TaxRate / 100m, 2))
                        + parts.Where(p => p.ServiceOrderId == o.Id && p.AddsToCustomerTotal).Sum(p => p.SubTotal),
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
                            ActualTimeHours = w.ActualTimeHours,
                            LaborCost = w.LaborCost,
                            TaxRate = w.TaxRate,
                            Payer = w.Payer,
                            AddsToCustomerTotal = w.AddsToCustomerTotal,
                            ServiceType = w.ServiceType,
                            MaintenanceReviewMileage = w.MaintenanceReviewMileage,
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
                            UnitId = p.UnitOfMeasureId,
                            Unit = p.UnitCode,
                            BaseQuantity = p.QuantityBase,
                            LineType = p.LineType,
                            Payer = p.Payer,
                            AddsToCustomerTotal = p.AddsToCustomerTotal,
                            ServiceType = p.ServiceType,
                            MaintenanceReviewMileage = p.MaintenanceReviewMileage,
                            Technician = p.Technician,
                            EstimatedTimeHours = p.EstimatedTimeHours,
                            ActualTimeHours = p.ActualTimeHours,
                            UnitPrice = p.UnitPrice,
                            DiscountType = p.DiscountType,
                            DiscountValue = p.DiscountValue,
                            DiscountAmount = p.DiscountAmount,
                            SubTotal = p.SubTotal
                        })
                        .ToList(),
                    StatusHistory = statusHistory
                        .Where(h => h.ServiceOrderId == o.Id)
                        .Select(h => new MchServiceOrderStatusHistoryDto
                        {
                            Id = h.Id,
                            Status = h.Status,
                            ChangedAt = h.ChangedAt,
                            ChangedByUserId = h.ChangedByUserId,
                            ChangedByName = h.ChangedByName,
                            Notes = h.Notes
                        })
                        .ToList()
                }).ToList();
            });

            return Ok(paged);
        }

        [HttpGet("vehicles")]
        public async Task<IActionResult> GetVehicles([FromQuery] MchQuery query)
        {
            var denied = ValidateAccess();
            if (denied != null) return denied;

            IQueryable<Vehicle> source = _dbContext.Vehicles
                .IgnoreQueryFilters()
                .Include(v => v.Branch)
                .Include(v => v.CurrentOwner)
                .AsNoTracking();

            source = ApplyTenantScope(source);
            source = ApplyEntityFilters(source, query);
            source = ApplyModifiedFilter(source, query);
            source = ApplyDateRange(source, query, v => v.CreatedAt);

            var paged = await PageEntitiesAsync(source.OrderBy(v => v.Id), query, async vehicles =>
            {
                var vehicleIds = vehicles.Select(v => v.Id).ToArray();
                var owners = await _dbContext.VehicleOwnerHistories
                    .IgnoreQueryFilters()
                    .Include(h => h.Customer)
                    .AsNoTracking()
                    .Where(h => vehicleIds.Contains(h.VehicleId))
                    .ToListAsync();
                var serviceOrders = await _dbContext.ServiceOrders
                    .IgnoreQueryFilters()
                    .Include(o => o.Branch)
                    .AsNoTracking()
                    .Where(o => o.VehicleId.HasValue && vehicleIds.Contains(o.VehicleId.Value))
                    .ToListAsync();
                var preparationOrders = await _dbContext.PreparationOrders
                    .IgnoreQueryFilters()
                    .Include(o => o.Branch)
                    .AsNoTracking()
                    .Where(o => o.VehicleId.HasValue && vehicleIds.Contains(o.VehicleId.Value))
                    .ToListAsync();

                return vehicles.Select(v => new MchVehicleDto
                {
                    Id = v.Id,
                    CompanyId = v.TenantId,
                    BranchId = v.BranchId,
                    BranchName = v.Branch?.Name,
                    ChassisNumber = v.ChassisNumber,
                    EngineNumber = v.EngineNumber,
                    Plate = v.Plate,
                    BrandId = v.BrandId,
                    VehicleModelId = v.VehicleModelId,
                    Brand = v.Brand,
                    Model = v.Model,
                    Year = v.Year,
                    SaleDate = v.SaleDate,
                    CurrentOwnerId = v.CurrentOwnerId,
                    CurrentOwnerIdentification = v.CurrentOwner?.TaxId,
                    CurrentOwnerName = v.CurrentOwner == null ? null : $"{v.CurrentOwner.FirstName} {v.CurrentOwner.LastName}".Trim(),
                    OwnerSince = v.OwnerSince,
                    LastKnownMileage = v.LastKnownMileage,
                    Status = ToStatus(v.IsActive),
                    CreatedAt = v.CreatedAt,
                    ModifiedAt = v.UpdatedAt ?? v.CreatedAt,
                    OwnerHistory = owners.Where(h => h.VehicleId == v.Id).OrderBy(h => h.OwnedFrom).Select(h => new MchVehicleOwnerDto
                    {
                        CustomerId = h.CustomerId,
                        CustomerIdentification = h.Customer?.TaxId,
                        CustomerName = h.Customer == null ? string.Empty : $"{h.Customer.FirstName} {h.Customer.LastName}".Trim(),
                        OwnedFrom = h.OwnedFrom,
                        OwnedUntil = h.OwnedUntil
                    }).ToList(),
                    ServiceHistory = serviceOrders.Where(o => o.VehicleId == v.Id).Select(o => new MchVehicleServiceHistoryDto
                    {
                        Source = "OrdenTaller",
                        RecordId = o.Id,
                        Number = o.Id.ToString(),
                        Date = o.IntakeDateTime,
                        Mileage = o.Mileage,
                        BranchId = o.BranchId ?? v.BranchId,
                        BranchName = o.Branch?.Name ?? v.Branch?.Name,
                        Status = o.Status,
                        MaintenanceReviewMileage = o.MaintenanceReviewMileage
                    }).Concat(preparationOrders.Where(o => o.VehicleId == v.Id).Select(o => new MchVehicleServiceHistoryDto
                    {
                        Source = "Alistamiento",
                        RecordId = o.Id,
                        Number = o.OrderNumber,
                        Date = o.RequestedAt,
                        Mileage = o.Mileage,
                        BranchId = o.BranchId,
                        BranchName = o.Branch?.Name,
                        Status = o.Status
                    })).OrderBy(h => h.Date).ToList(),
                    MaintenanceReviews = serviceOrders
                        .Where(o => o.VehicleId == v.Id && o.MaintenanceReviewMileage.HasValue)
                        .OrderBy(o => o.IntakeDateTime)
                        .Select(o => new MchVehicleMaintenanceReviewDto
                        {
                            ServiceOrderId = o.Id,
                            ReviewMileage = o.MaintenanceReviewMileage!.Value,
                            AttendedAt = o.IntakeDateTime,
                            BranchId = o.BranchId ?? v.BranchId
                        }).ToList()
                }).ToList();
            });

            return Ok(paged);
        }

        [HttpGet("warranties")]
        public async Task<IActionResult> GetWarranties([FromQuery] MchQuery query)
        {
            var denied = ValidateAccess();
            if (denied != null) return denied;

            IQueryable<Warranty> source = _dbContext.Warranties
                .IgnoreQueryFilters()
                .Include(w => w.Customer)
                .Include(w => w.Branch)
                .Include(w => w.BrandCatalog)
                .Include(w => w.Vehicle)
                .Include(w => w.ServiceOrder)
                .Include(w => w.ManufacturerInvoice)
                .AsNoTracking();

            source = ApplyTenantScope(source);
            source = ApplyEntityFilters(source, query);
            source = ApplyModifiedFilter(source, query);
            source = ApplyDateRange(source, query, w => w.FailureDate);
            if (query.SucursalId.HasValue) source = source.Where(w => w.BranchId == query.SucursalId.Value);
            if (!string.IsNullOrWhiteSpace(query.Marca))
                source = source.Where(w => (w.BrandName != null && w.BrandName.Contains(query.Marca)) ||
                    (w.BrandCatalog != null && w.BrandCatalog.Name.Contains(query.Marca)));

            var paged = await PageEntitiesAsync(source.OrderBy(w => w.Id), query, async warranties =>
            {
                var warrantyIds = warranties.Select(w => w.Id).ToArray();
                var invoiceIds = warranties.Where(w => w.ManufacturerInvoiceId.HasValue).Select(w => w.ManufacturerInvoiceId!.Value).Distinct().ToArray();

                var replacementParts = await _dbContext.WarrantyReplacementParts
                    .IgnoreQueryFilters()
                    .Include(p => p.Product)
                    .AsNoTracking()
                    .Where(p => warrantyIds.Contains(p.WarrantyId) && p.IsActive)
                    .ToListAsync();
                var statusHistory = await _dbContext.WarrantyStatusHistories
                    .IgnoreQueryFilters()
                    .AsNoTracking()
                    .Where(h => warrantyIds.Contains(h.WarrantyId))
                    .OrderBy(h => h.ChangedAt)
                    .ToListAsync();
                var preparationOrders = await _dbContext.PreparationOrders
                    .IgnoreQueryFilters()
                    .AsNoTracking()
                    .Where(o => o.WarrantyId.HasValue && warrantyIds.Contains(o.WarrantyId.Value))
                    .ToListAsync();
                var invoiceCoverage = invoiceIds.Length == 0
                    ? new List<Warranty>()
                    : await _dbContext.Warranties.IgnoreQueryFilters().AsNoTracking()
                        .Where(w => w.ManufacturerInvoiceId.HasValue && invoiceIds.Contains(w.ManufacturerInvoiceId.Value))
                        .ToListAsync();

                return warranties.Select(w => new MchWarrantyDto
                {
                    Id = w.Id,
                    CompanyId = w.TenantId,
                    CompanyName = w.CompanyName,
                    CompanyNit = w.CompanyNit,
                    BranchId = w.BranchId,
                    BranchName = w.BranchName ?? w.Branch?.Name,
                    BrandId = w.BrandId,
                    Brand = w.BrandName ?? w.BrandCatalog?.Name,
                    Number = w.WarrantyNumber,
                    IsLegacyRecord = w.IsLegacyRecord,
                    VehicleId = w.VehicleId,
                    ChassisNumber = w.ChassisNumber,
                    Plate = w.Plate,
                    VehicleModel = w.Vehicle?.Model,
                    ServiceOrderId = w.ServiceOrderId,
                    ServiceOrderNumber = w.ServiceOrder?.OrderNumber,
                    PreparationOrderId = preparationOrders.FirstOrDefault(o => o.WarrantyId == w.Id)?.Id,
                    PreparationOrderNumber = preparationOrders.FirstOrDefault(o => o.WarrantyId == w.Id)?.OrderNumber,
                    CustomerId = w.CustomerId,
                    CustomerIdentification = w.Customer?.TaxId,
                    CustomerName = w.Customer == null ? null : $"{w.Customer.FirstName} {w.Customer.LastName}".Trim(),
                    ClaimType = w.ClaimType,
                    DetectionMoment = w.DetectionMoment,
                    AttributedCause = w.AttributedCause,
                    FailureDate = w.FailureDate,
                    FailureMileage = w.FailureMileage,
                    FailureDescription = w.FailureDescription,
                    FailureMode = w.FailureMode,
                    CausingPartProductId = w.CausingPartProductId,
                    CausingPartReference = w.CausingPartReference,
                    CausingPartDescription = w.CausingPartDescription,
                    RecognizedLaborHours = w.RecognizedLaborHours,
                    RecognizedLaborValue = w.RecognizedLaborValue,
                    CustomerEquivalentValue = w.CustomerEquivalentValue,
                    ManufacturerStatus = w.ManufacturerStatus,
                    AuthorizationNumber = w.AuthorizationNumber,
                    AuthorizationDate = w.AuthorizationDate,
                    FiledAt = w.FiledAt,
                    ApprovedValue = w.ApprovedValue,
                    RejectedValue = w.RejectedValue,
                    RejectionReason = w.RejectionReason,
                    RecognizedValue = w.RecognizedValue,
                    VehicleOrPartLot = w.VehicleOrPartLot,
                    ManufacturingDate = w.ManufacturingDate,
                    ManufacturerInvoiceNumber = w.ManufacturerInvoice?.InvoiceNumber,
                    ManufacturerInvoiceDate = w.ManufacturerInvoice?.InvoiceDate,
                    ManufacturerInvoiceTotal = w.ManufacturerInvoice?.TotalAmount,
                    PaidByManufacturer = w.ManufacturerInvoice?.PaidAt.HasValue == true,
                    ManufacturerPaidAt = w.ManufacturerInvoice?.PaidAt,
                    ManufacturerPaymentReference = w.ManufacturerInvoice?.PaymentReference,
                    CoveredWarrantyIds = w.ManufacturerInvoiceId.HasValue
                        ? invoiceCoverage.Where(covered => covered.ManufacturerInvoiceId == w.ManufacturerInvoiceId).Select(covered => covered.Id).ToList()
                        : new List<int>(),
                    Status = ToStatus(w.IsActive),
                    CreatedAt = w.CreatedAt,
                    ModifiedAt = w.UpdatedAt ?? w.CreatedAt,
                    ReplacementParts = replacementParts.Where(p => p.WarrantyId == w.Id).Select(p => new MchWarrantyReplacementPartDto
                    {
                        Id = p.Id,
                        ProductId = p.ProductId,
                        Reference = p.Reference,
                        Description = p.Description,
                        Quantity = p.Quantity,
                        UnitId = p.UnitOfMeasureId,
                        Unit = p.Unit,
                        BaseQuantity = p.QuantityBase,
                        UnitValue = p.UnitValue,
                        TotalValue = p.TotalValue
                    }).ToList(),
                    StatusHistory = statusHistory.Where(h => h.WarrantyId == w.Id).Select(h => new MchWarrantyStatusHistoryDto
                    {
                        Id = h.Id,
                        ManufacturerStatus = h.ManufacturerStatus,
                        ChangedAt = h.ChangedAt,
                        ChangedByUserId = h.ChangedByUserId,
                        ChangedByName = h.ChangedByName,
                        Notes = h.Notes
                    }).ToList()
                }).ToList();
            });

            return Ok(paged);
        }

        [HttpGet("preparation-orders")]
        public async Task<IActionResult> GetPreparationOrders([FromQuery] MchQuery query)
        {
            var denied = ValidateAccess();
            if (denied != null) return denied;

            IQueryable<PreparationOrder> source = _dbContext.PreparationOrders
                .IgnoreQueryFilters()
                .Include(o => o.Branch)
                .Include(o => o.Customer)
                .Include(o => o.Items)
                    .ThenInclude(i => i.Product)
                .AsNoTracking();

            source = ApplyTenantScope(source);
            source = ApplyEntityFilters(source, query);
            source = ApplyModifiedFilter(source, query);
            source = ApplyDateRange(source, query, o => o.RequestedAt);

            var paged = await PageEntitiesAsync(source.OrderBy(o => o.Id), query, orders => orders.Select(o => new MchPreparationOrderDto
            {
                Id = o.Id,
                CompanyId = o.TenantId,
                BranchId = o.BranchId,
                BranchName = o.Branch?.Name,
                Number = o.OrderNumber,
                Status = o.Status,
                CommercialDocumentReference = o.CommercialDocumentReference,
                ChassisNumber = o.ChassisNumber,
                EngineNumber = o.EngineNumber,
                Plate = o.Plate,
                BrandId = o.BrandId,
                VehicleModelId = o.VehicleModelId,
                Brand = o.Brand,
                Model = o.Model,
                Year = o.Year,
                Mileage = o.Mileage,
                RequestedAt = o.RequestedAt,
                CompletedAt = o.CompletedAt,
                ExecutedBy = o.ExecutedBy,
                CustomerId = o.CustomerId,
                CustomerName = o.Customer != null ? $"{o.Customer.FirstName} {o.Customer.LastName}".Trim() : null,
                Findings = o.Findings,
                WarrantyOpened = o.WarrantyOpened,
                WarrantyId = o.WarrantyId,
                Notes = o.Notes,
                CreatedAt = o.CreatedAt,
                ModifiedAt = o.UpdatedAt ?? o.CreatedAt,
                Consumptions = o.Items.Select(i => new MchPreparationOrderConsumptionDto
                {
                    Id = i.Id,
                    ProductId = i.ProductId,
                    Reference = string.IsNullOrWhiteSpace(i.Reference) ? i.Product != null ? i.Product.SKU : null : i.Reference,
                    Description = string.IsNullOrWhiteSpace(i.Description) ? i.Product != null ? i.Product.Name : null : i.Description,
                    Quantity = i.Quantity,
                    UnitId = i.UnitOfMeasureId,
                    Unit = i.Unit,
                    BaseQuantity = i.QuantityBase,
                    UnitValue = i.UnitValue,
                    TotalValue = i.TotalValue,
                    Notes = i.Notes
                }).ToList()
            }).ToList());

            return Ok(paged);
        }

        private IActionResult? ValidateAccess()
        {
            var enabled = _configuration.GetValue("Integrations:MCH:Enabled", false);
            var configuredApiKeys = GetConfiguredApiKeys();

            Response.Headers["X-MCH-API-Version"] = "1.0";
            Response.Headers["X-MCH-Time-Zone"] = "UTC";
            Response.Headers.CacheControl = "no-store";
            if (!Request.Path.StartsWithSegments("/api/integrations/mch/v1"))
            {
                Response.Headers["Deprecation"] = "true";
                Response.Headers.Link = "</api/integrations/mch/v1>; rel=\"successor-version\"";
            }

            if (!enabled || configuredApiKeys.Length == 0)
            {
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new
                {
                    message = "Integracion MCH no configurada.",
                    requiredConfiguration = "Integrations:MCH:Enabled=true e Integrations:MCH:ApiKeys con al menos una clave"
                });
            }

            if (GetAllowedTenantIds().Length == 0)
            {
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new
                {
                    message = "Integracion MCH sin alcance de empresas autorizado.",
                    requiredConfiguration = "Integrations:MCH:AllowedTenantIds con al menos un tenant autorizado"
                });
            }

            var providedApiKey = Request.Headers[ApiKeyHeaderName].FirstOrDefault();
            if (string.IsNullOrWhiteSpace(providedApiKey) || !configuredApiKeys.Any(expected => SecureEquals(providedApiKey, expected)))
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

        private string[] GetConfiguredApiKeys()
        {
            var keys = _configuration.GetSection("Integrations:MCH:ApiKeys").Get<string[]>() ?? Array.Empty<string>();
            var legacyKey = _configuration["Integrations:MCH:ApiKey"];
            return keys
                .Append(legacyKey)
                .Where(key => !string.IsNullOrWhiteSpace(key))
                .Select(key => key!.Trim())
                .Distinct(StringComparer.Ordinal)
                .ToArray();
        }

        private IQueryable<Tenant> ApplyTenantScope(IQueryable<Tenant> source)
        {
            var allowedTenantIds = GetAllowedTenantIds();
            return source.Where(t => allowedTenantIds.Contains(t.Id));
        }

        private IQueryable<T> ApplyTenantScope<T>(IQueryable<T> source) where T : class, IMustHaveTenant
        {
            var allowedTenantIds = GetAllowedTenantIds();
            return source.Where(e => allowedTenantIds.Contains(e.TenantId));
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

            if (!string.IsNullOrWhiteSpace(query.Marca))
            {
                source = source.Where(s => s.Product.Brand != null && s.Product.Brand.Name.Contains(query.Marca));
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

            if (!string.IsNullOrWhiteSpace(query.Marca))
            {
                source = source.Where(s => s.SaleDetails.Any(d =>
                    (d.BrandName != null && d.BrandName.Contains(query.Marca)) ||
                    (d.Product.Brand != null && d.Product.Brand.Name.Contains(query.Marca))));
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

            if (!string.IsNullOrWhiteSpace(query.Marca))
            {
                source = source.Where(p => p.PurchaseDetails.Any(d =>
                    (d.BrandName != null && d.BrandName.Contains(query.Marca)) ||
                    (d.Product.Brand != null && d.Product.Brand.Name.Contains(query.Marca))));
            }

            return source;
        }

        private IQueryable<Branch> ApplyEntityFilters(IQueryable<Branch> source, MchQuery query)
        {
            source = ApplyEntityFilters<Branch>(source, query);
            if (query.SucursalId.HasValue) source = source.Where(b => b.Id == query.SucursalId.Value);
            if (!string.IsNullOrWhiteSpace(query.Marca))
                source = source.Where(b => b.MainBrand != null && b.MainBrand.Name.Contains(query.Marca));
            return source;
        }

        private IQueryable<Product> ApplyEntityFilters(IQueryable<Product> source, MchQuery query)
        {
            source = ApplyEntityFilters<Product>(source, query);
            if (!string.IsNullOrWhiteSpace(query.Marca))
                source = source.Where(p => p.Brand != null && p.Brand.Name.Contains(query.Marca));
            return source;
        }

        private IQueryable<PreparationOrder> ApplyEntityFilters(IQueryable<PreparationOrder> source, MchQuery query)
        {
            source = ApplyEntityFilters<PreparationOrder>(source, query);

            if (query.SucursalId.HasValue)
            {
                source = source.Where(o => o.BranchId == query.SucursalId.Value);
            }

            if (!string.IsNullOrWhiteSpace(query.Marca))
            {
                source = source.Where(o => o.Brand.Contains(query.Marca));
            }

            return source;
        }

        private IQueryable<Vehicle> ApplyEntityFilters(IQueryable<Vehicle> source, MchQuery query)
        {
            source = ApplyEntityFilters<Vehicle>(source, query);
            if (query.SucursalId.HasValue) source = source.Where(v => v.BranchId == query.SucursalId.Value);
            if (!string.IsNullOrWhiteSpace(query.Marca)) source = source.Where(v => v.Brand.Contains(query.Marca));
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

        private static bool MatchesPersonnelQuery(int companyId, int? branchId, DateTime createdAt, DateTime modifiedAt, MchQuery query)
        {
            if (query.EmpresaId.HasValue && query.EmpresaId.Value != companyId) return false;
            if (query.SucursalId.HasValue && query.SucursalId.Value != branchId) return false;
            if (query.Desde.HasValue && createdAt < query.Desde.Value) return false;
            if (query.Hasta.HasValue && createdAt > NormalizeEndDate(query.Hasta.Value)) return false;
            if (query.ModificadoDesde.HasValue && modifiedAt < query.ModificadoDesde.Value) return false;
            return true;
        }

        private static DateTimeOffset ToUtcOffset(DateTime value)
        {
            var utc = value.Kind switch
            {
                DateTimeKind.Utc => value,
                DateTimeKind.Local => value.ToUniversalTime(),
                _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
            };
            return new DateTimeOffset(utc);
        }

        private static object DescribeContractType(Type type)
        {
            var nullability = new NullabilityInfoContext();
            return new
            {
                type = "object",
                fields = type.GetProperties(BindingFlags.Public | BindingFlags.Instance)
                    .Select(property =>
                    {
                        var propertyType = Nullable.GetUnderlyingType(property.PropertyType) ?? property.PropertyType;
                        var isCollection = propertyType != typeof(string) && typeof(System.Collections.IEnumerable).IsAssignableFrom(propertyType);
                        var itemType = isCollection
                            ? propertyType.IsArray ? propertyType.GetElementType() : propertyType.GetGenericArguments().FirstOrDefault()
                            : null;
                        return new
                        {
                            name = JsonNamingPolicy.CamelCase.ConvertName(property.Name),
                            type = ToContractType(propertyType),
                            nullable = Nullable.GetUnderlyingType(property.PropertyType) != null ||
                                       (!property.PropertyType.IsValueType && nullability.Create(property).WriteState == NullabilityState.Nullable),
                            itemType = itemType == null ? null : ToContractType(itemType)
                        };
                    })
            };
        }

        private static string ToContractType(Type type)
        {
            type = Nullable.GetUnderlyingType(type) ?? type;
            if (type == typeof(string) || type == typeof(char)) return "string";
            if (type == typeof(DateTime) || type == typeof(DateTimeOffset)) return "string(date-time)";
            if (type == typeof(bool)) return "boolean";
            if (type == typeof(byte) || type == typeof(short) || type == typeof(int) || type == typeof(long)) return "integer";
            if (type == typeof(float) || type == typeof(double) || type == typeof(decimal)) return "number(decimal)";
            if (type.IsArray || (type != typeof(string) && typeof(System.Collections.IEnumerable).IsAssignableFrom(type))) return "array";
            return type.Name;
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

        private static string? BuildCategoryPath(Category? category)
        {
            if (category == null) return null;
            var names = new Stack<string>();
            var current = category;
            while (current != null)
            {
                names.Push(current.Name);
                current = current.Parent;
            }
            return string.Join(" / ", names);
        }

        private static MchArticleReferenceRelationDto MapMchArticleRelation(
            ProductReferenceRelation relation,
            Product related,
            string relationType) => new()
        {
            RelatedProductId = related.Id,
            RelatedReference = related.SKU,
            RelatedDescription = related.Name,
            RelationType = relationType,
            SourceType = relation.SourceType,
            EffectiveFrom = relation.EffectiveFrom
        };

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
        public string Nit { get; set; } = string.Empty;
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
        public int? MainBrandId { get; set; }
        public string? MainBrand { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime ModifiedAt { get; set; }
    }

    public class MchBrandDto
    {
        public int Id { get; set; }
        public int CompanyId { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime ModifiedAt { get; set; }
    }

    public class MchPersonnelDto
    {
        public string Id { get; set; } = string.Empty;
        public int CompanyId { get; set; }
        public int? BranchId { get; set; }
        public string? BranchName { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Position { get; set; } = string.Empty;
        public string? Specialty { get; set; }
        public string Source { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset ModifiedAt { get; set; }
    }

    public class MchVehicleModelDto : MchBrandDto
    {
        public int BrandId { get; set; }
        public string Brand { get; set; } = string.Empty;
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
        public string? SupplierType { get; set; }
        public int? OfficialBrandId { get; set; }
        public string? OfficialBrand { get; set; }
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
        public int CategoryId { get; set; }
        public string? Category { get; set; }
        public int? CategoryLevel { get; set; }
        public string? CategoryHierarchy { get; set; }
        public string ArticleType { get; set; } = string.Empty;
        public string OriginType { get; set; } = string.Empty;
        public bool IsOfficialCatalog { get; set; }
        public string? Manufacturer { get; set; }
        public string ReferenceType { get; set; } = string.Empty;
        public int? BrandId { get; set; }
        public string? Brand { get; set; }
        public string BaseUnit { get; set; } = string.Empty;
        public int? BaseUnitId { get; set; }
        public bool AllowsFractionalQuantity { get; set; }
        public int? PurchaseUnitId { get; set; }
        public string? PurchaseUnit { get; set; }
        public decimal PurchaseFactorToBase { get; set; }
        public int? SaleUnitId { get; set; }
        public string? SaleUnit { get; set; }
        public decimal SaleFactorToBase { get; set; }
        public decimal MinimumOrderQuantity { get; set; }
        public decimal OrderMultiple { get; set; }
        public decimal? WeightKg { get; set; }
        public decimal? LengthCm { get; set; }
        public decimal? WidthCm { get; set; }
        public decimal? HeightCm { get; set; }
        public int? LeadTimeDays { get; set; }
        public decimal ReorderPoint { get; set; }
        public decimal MinimumStock { get; set; }
        public decimal MaximumStock { get; set; }
        public decimal SalePrice { get; set; }
        public string IvaType { get; set; } = string.Empty;
        public decimal IvaRate { get; set; }
        public bool PriceIncludesIva { get; set; }
        public List<MchArticleApplicabilityDto> Applicabilities { get; set; } = new();
        public List<MchArticleReferenceRelationDto> ReferenceRelations { get; set; } = new();
        public List<MchArticleKitComponentDto> KitComponents { get; set; } = new();
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
        public int? BrandId { get; set; }
        public string? Brand { get; set; }
        public decimal Quantity { get; set; }
        public int? UnitId { get; set; }
        public string Unit { get; set; } = string.Empty;
        public decimal CurrentCost { get; set; }
        public decimal SalePrice { get; set; }
        public decimal MinimumStock { get; set; }
        public decimal MaximumStock { get; set; }
        public List<MchInventoryLocationBalanceDto> Locations { get; set; } = new();
        public string ProductStatus { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime ModifiedAt { get; set; }
    }

    public class MchUnitDto
    {
        public int Id { get; set; }
        public int CompanyId { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Symbol { get; set; } = string.Empty;
        public bool AllowsDecimals { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime ModifiedAt { get; set; }
    }

    public class MchArticleApplicabilityDto
    {
        public int VehicleModelId { get; set; }
        public int BrandId { get; set; }
        public string Brand { get; set; } = string.Empty;
        public string ModelCode { get; set; } = string.Empty;
        public string Model { get; set; } = string.Empty;
        public string SourceType { get; set; } = string.Empty;
    }

    public class MchArticleReferenceRelationDto
    {
        public int RelatedProductId { get; set; }
        public string RelatedReference { get; set; } = string.Empty;
        public string RelatedDescription { get; set; } = string.Empty;
        public string RelationType { get; set; } = string.Empty;
        public string SourceType { get; set; } = string.Empty;
        public DateTime? EffectiveFrom { get; set; }
    }

    public class MchArticleKitComponentDto
    {
        public int ProductId { get; set; }
        public string Reference { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public decimal Quantity { get; set; }
        public int UnitId { get; set; }
        public string Unit { get; set; } = string.Empty;
    }

    public class MchInventoryLocationBalanceDto
    {
        public int LocationId { get; set; }
        public string LocationCode { get; set; } = string.Empty;
        public string LocationName { get; set; } = string.Empty;
        public decimal Quantity { get; set; }
        public string Unit { get; set; } = string.Empty;
    }

    public class MchInventoryMovementDto
    {
        public int Id { get; set; }
        public int CompanyId { get; set; }
        public int BranchId { get; set; }
        public string BranchName { get; set; } = string.Empty;
        public string Warehouse { get; set; } = string.Empty;
        public int? LocationId { get; set; }
        public string? Location { get; set; }
        public int? DestinationBranchId { get; set; }
        public string? DestinationBranchName { get; set; }
        public int? DestinationLocationId { get; set; }
        public string? DestinationLocation { get; set; }
        public int ProductId { get; set; }
        public string Reference { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string MovementType { get; set; } = string.Empty;
        public decimal Quantity { get; set; }
        public int UnitId { get; set; }
        public string Unit { get; set; } = string.Empty;
        public decimal FactorToBase { get; set; }
        public decimal BaseQuantity { get; set; }
        public string? DocumentType { get; set; }
        public int? DocumentId { get; set; }
        public string? DocumentNumber { get; set; }
        public string? Reason { get; set; }
        public string? UserId { get; set; }
        public DateTime OccurredAt { get; set; }
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
        public string? CustomerIdentificationType { get; set; }
        public string? CustomerTaxId { get; set; }
        public int? ServiceOrderId { get; set; }
        public string PaymentMethod { get; set; } = string.Empty;
        public string ElectronicInvoicingStatus { get; set; } = string.Empty;
        public decimal TotalAmount { get; set; }
        public decimal AmountReceived { get; set; }
        public decimal CustomerAdvanceApplied { get; set; }
        public decimal CustomerAdvanceCreated { get; set; }
        public decimal ChangeAmount { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime ModifiedAt { get; set; }
        public List<MchSaleLineDto> Lines { get; set; } = new();
        public List<MchSaleAdjustmentDto> Adjustments { get; set; } = new();
    }

    public class MchSaleLineDto
    {
        public int Id { get; set; }
        public int ProductId { get; set; }
        public string? Reference { get; set; }
        public string? Description { get; set; }
        public int? BrandId { get; set; }
        public string? Brand { get; set; }
        public decimal Quantity { get; set; }
        public int? UnitId { get; set; }
        public string? Unit { get; set; }
        public decimal BaseQuantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal TaxRate { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal SubTotal { get; set; }
        public decimal UnitCost { get; set; }
        public decimal Cost { get; set; }
        public string AccountingClassification { get; set; } = string.Empty;
    }

    public class MchSaleAdjustmentDto
    {
        public int Id { get; set; }
        public int OriginalSaleId { get; set; }
        public string OriginalDocumentNumber { get; set; } = string.Empty;
        public string DocumentType { get; set; } = string.Empty;
        public string DocumentNumber { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public string Reason { get; set; } = string.Empty;
        public bool RestocksInventory { get; set; }
        public decimal TotalAmount { get; set; }
        public string Status { get; set; } = string.Empty;
        public List<MchSaleAdjustmentLineDto> Lines { get; set; } = new();
    }

    public class MchSaleAdjustmentLineDto : MchSaleLineDto
    {
        public int SaleDetailId { get; set; }
    }

    public class MchPurchaseDto
    {
        public int Id { get; set; }
        public int CompanyId { get; set; }
        public int BranchId { get; set; }
        public string? BranchName { get; set; }
        public int LocationId { get; set; }
        public string? LocationCode { get; set; }
        public string? LocationName { get; set; }
        public int SupplierId { get; set; }
        public string? SupplierName { get; set; }
        public string? SupplierIdentificationType { get; set; }
        public string? SupplierTaxId { get; set; }
        public string SupplierType { get; set; } = string.Empty;
        public int? OfficialBrandId { get; set; }
        public string? OfficialBrand { get; set; }
        public string DocumentType { get; set; } = string.Empty;
        public string DocumentNumber { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public DateTime? SupplierInvoiceDate { get; set; }
        public DateTime? ReceptionDate { get; set; }
        public string? PurchaseOrderNumber { get; set; }
        public DateTime? PurchaseOrderDate { get; set; }
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
        public int? BrandId { get; set; }
        public string? Brand { get; set; }
        public decimal Quantity { get; set; }
        public int? UnitId { get; set; }
        public string? Unit { get; set; }
        public decimal BaseQuantity { get; set; }
        public decimal UnitCost { get; set; }
        public decimal TaxRate { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal SubTotal { get; set; }
    }

    public class MchPreparationOrderDto
    {
        public int Id { get; set; }
        public int CompanyId { get; set; }
        public int BranchId { get; set; }
        public string? BranchName { get; set; }
        public string Number { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string? CommercialDocumentReference { get; set; }
        public string ChassisNumber { get; set; } = string.Empty;
        public string? EngineNumber { get; set; }
        public string? Plate { get; set; }
        public int? BrandId { get; set; }
        public int? VehicleModelId { get; set; }
        public string Brand { get; set; } = string.Empty;
        public string Model { get; set; } = string.Empty;
        public int? Year { get; set; }
        public decimal? Mileage { get; set; }
        public DateTime RequestedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public string? ExecutedBy { get; set; }
        public int? CustomerId { get; set; }
        public string? CustomerName { get; set; }
        public string? Findings { get; set; }
        public bool WarrantyOpened { get; set; }
        public int? WarrantyId { get; set; }
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime ModifiedAt { get; set; }
        public List<MchPreparationOrderConsumptionDto> Consumptions { get; set; } = new();
    }

    public class MchPreparationOrderConsumptionDto
    {
        public int Id { get; set; }
        public int? ProductId { get; set; }
        public string? Reference { get; set; }
        public string? Description { get; set; }
        public int? BrandId { get; set; }
        public string? Brand { get; set; }
        public decimal Quantity { get; set; }
        public int? UnitId { get; set; }
        public string Unit { get; set; } = string.Empty;
        public decimal BaseQuantity { get; set; }
        public decimal UnitValue { get; set; }
        public decimal TotalValue { get; set; }
        public string? Notes { get; set; }
    }

    public class MchServiceOrderDto
    {
        public int Id { get; set; }
        public int CompanyId { get; set; }
        public string CompanyName { get; set; } = string.Empty;
        public string? CompanyNit { get; set; }
        public int? BranchId { get; set; }
        public string? BranchName { get; set; }
        public string Number { get; set; } = string.Empty;
        public int? VehicleId { get; set; }
        public string? ChassisNumber { get; set; }
        public string? EngineNumber { get; set; }
        public string Plate { get; set; } = string.Empty;
        public int? BrandId { get; set; }
        public int? VehicleModelId { get; set; }
        public string Brand { get; set; } = string.Empty;
        public string Model { get; set; } = string.Empty;
        public int Year { get; set; }
        public decimal Mileage { get; set; }
        public int? MaintenanceReviewMileage { get; set; }
        public DateTime IntakeDateTime { get; set; }
        public DateTime? PromisedDeliveryDateTime { get; set; }
        public DateTime? ExitDateTime { get; set; }
        public string OrderType { get; set; } = string.Empty;
        public string Origin { get; set; } = string.Empty;
        public string? ReceivedByUserId { get; set; }
        public string? ReceivedByName { get; set; }
        public int CustomerId { get; set; }
        public string? CustomerIdentification { get; set; }
        public string? CustomerName { get; set; }
        public string? CustomerPhone { get; set; }
        public string? CustomerEmail { get; set; }
        public string Technician { get; set; } = string.Empty;
        public string? WorkshopManager { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime? CancelledAt { get; set; }
        public string? CancellationReason { get; set; }
        public string? CancelledByUserId { get; set; }
        public string? CancelledByName { get; set; }
        public string FuelLevel { get; set; } = string.Empty;
        public string InitialObservations { get; set; } = string.Empty;
        public string VisualCondition { get; set; } = string.Empty;
        public string? ProblemDescription { get; set; }
        public string? TechnicalDiagnosis { get; set; }
        public bool? CustomerApprovedDiagnosis { get; set; }
        public DateTime? DiagnosisApprovalDate { get; set; }
        public DateTime? DiagnosedAt { get; set; }
        public string? DiagnosedByUserId { get; set; }
        public string? DiagnosedByName { get; set; }
        public string? DeliveryNotes { get; set; }
        public string? CloseType { get; set; }
        public string? CloseReason { get; set; }
        public decimal LaborCost { get; set; }
        public decimal LaborTotal { get; set; }
        public decimal LaborTaxTotal { get; set; }
        public decimal PartsTotal { get; set; }
        public decimal ConsumablesTotal { get; set; }
        public decimal CustomerInvoiceTotal { get; set; }
        public string? InvoiceNumber { get; set; }
        public DateTime? InvoiceDate { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime ModifiedAt { get; set; }
        public List<MchServiceOrderWorkDto> Works { get; set; } = new();
        public List<MchServiceOrderPartDto> Parts { get; set; } = new();
        public List<MchServiceOrderStatusHistoryDto> StatusHistory { get; set; } = new();
    }

    public class MchServiceOrderWorkDto
    {
        public int Id { get; set; }
        public int? ProductId { get; set; }
        public string Description { get; set; } = string.Empty;
        public string Technician { get; set; } = string.Empty;
        public decimal? EstimatedTimeHours { get; set; }
        public decimal? ActualTimeHours { get; set; }
        public decimal LaborCost { get; set; }
        public decimal TaxRate { get; set; }
        public string Payer { get; set; } = string.Empty;
        public bool AddsToCustomerTotal { get; set; }
        public string ServiceType { get; set; } = string.Empty;
        public int? MaintenanceReviewMileage { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    public class MchServiceOrderPartDto
    {
        public int Id { get; set; }
        public int ProductId { get; set; }
        public string? Reference { get; set; }
        public string? Description { get; set; }
        public decimal Quantity { get; set; }
        public int? UnitId { get; set; }
        public string? Unit { get; set; }
        public decimal BaseQuantity { get; set; }
        public string LineType { get; set; } = string.Empty;
        public string Payer { get; set; } = string.Empty;
        public bool AddsToCustomerTotal { get; set; }
        public string ServiceType { get; set; } = string.Empty;
        public int? MaintenanceReviewMileage { get; set; }
        public string? Technician { get; set; }
        public decimal? EstimatedTimeHours { get; set; }
        public decimal? ActualTimeHours { get; set; }
        public decimal UnitPrice { get; set; }
        public string DiscountType { get; set; } = string.Empty;
        public decimal DiscountValue { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal SubTotal { get; set; }
    }

    public class MchServiceOrderStatusHistoryDto
    {
        public int Id { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime ChangedAt { get; set; }
        public string? ChangedByUserId { get; set; }
        public string? ChangedByName { get; set; }
        public string? Notes { get; set; }
    }

    public class MchWarrantyDto
    {
        public int Id { get; set; }
        public int CompanyId { get; set; }
        public string CompanyName { get; set; } = string.Empty;
        public string? CompanyNit { get; set; }
        public int? BranchId { get; set; }
        public string? BranchName { get; set; }
        public int? BrandId { get; set; }
        public string? Brand { get; set; }
        public string Number { get; set; } = string.Empty;
        public bool IsLegacyRecord { get; set; }
        public int? VehicleId { get; set; }
        public string ChassisNumber { get; set; } = string.Empty;
        public string? Plate { get; set; }
        public string? VehicleModel { get; set; }
        public int? ServiceOrderId { get; set; }
        public string? ServiceOrderNumber { get; set; }
        public int? PreparationOrderId { get; set; }
        public string? PreparationOrderNumber { get; set; }
        public int? CustomerId { get; set; }
        public string? CustomerIdentification { get; set; }
        public string? CustomerName { get; set; }
        public string ClaimType { get; set; } = string.Empty;
        public string DetectionMoment { get; set; } = string.Empty;
        public string? AttributedCause { get; set; }
        public DateTime FailureDate { get; set; }
        public decimal FailureMileage { get; set; }
        public string FailureDescription { get; set; } = string.Empty;
        public string? FailureMode { get; set; }
        public int? CausingPartProductId { get; set; }
        public string CausingPartReference { get; set; } = string.Empty;
        public string CausingPartDescription { get; set; } = string.Empty;
        public decimal RecognizedLaborHours { get; set; }
        public decimal RecognizedLaborValue { get; set; }
        public decimal CustomerEquivalentValue { get; set; }
        public string ManufacturerStatus { get; set; } = string.Empty;
        public string? AuthorizationNumber { get; set; }
        public DateTime? AuthorizationDate { get; set; }
        public DateTime? FiledAt { get; set; }
        public decimal ApprovedValue { get; set; }
        public decimal RejectedValue { get; set; }
        public string? RejectionReason { get; set; }
        public decimal RecognizedValue { get; set; }
        public string? VehicleOrPartLot { get; set; }
        public DateTime? ManufacturingDate { get; set; }
        public string? ManufacturerInvoiceNumber { get; set; }
        public DateTime? ManufacturerInvoiceDate { get; set; }
        public decimal? ManufacturerInvoiceTotal { get; set; }
        public bool PaidByManufacturer { get; set; }
        public DateTime? ManufacturerPaidAt { get; set; }
        public string? ManufacturerPaymentReference { get; set; }
        public List<int> CoveredWarrantyIds { get; set; } = new();
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime ModifiedAt { get; set; }
        public List<MchWarrantyReplacementPartDto> ReplacementParts { get; set; } = new();
        public List<MchWarrantyStatusHistoryDto> StatusHistory { get; set; } = new();
    }

    public class MchWarrantyReplacementPartDto
    {
        public int Id { get; set; }
        public int? ProductId { get; set; }
        public string Reference { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public decimal Quantity { get; set; }
        public int? UnitId { get; set; }
        public string Unit { get; set; } = string.Empty;
        public decimal BaseQuantity { get; set; }
        public decimal UnitValue { get; set; }
        public decimal TotalValue { get; set; }
    }

    public class MchWarrantyStatusHistoryDto
    {
        public int Id { get; set; }
        public string ManufacturerStatus { get; set; } = string.Empty;
        public DateTime ChangedAt { get; set; }
        public string? ChangedByUserId { get; set; }
        public string? ChangedByName { get; set; }
        public string? Notes { get; set; }
    }

    public class MchVehicleDto
    {
        public int Id { get; set; }
        public int CompanyId { get; set; }
        public int BranchId { get; set; }
        public string? BranchName { get; set; }
        public string ChassisNumber { get; set; } = string.Empty;
        public string? EngineNumber { get; set; }
        public string? Plate { get; set; }
        public int? BrandId { get; set; }
        public int? VehicleModelId { get; set; }
        public string Brand { get; set; } = string.Empty;
        public string Model { get; set; } = string.Empty;
        public int? Year { get; set; }
        public DateTime? SaleDate { get; set; }
        public int? CurrentOwnerId { get; set; }
        public string? CurrentOwnerIdentification { get; set; }
        public string? CurrentOwnerName { get; set; }
        public DateTime? OwnerSince { get; set; }
        public decimal? LastKnownMileage { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime ModifiedAt { get; set; }
        public List<MchVehicleOwnerDto> OwnerHistory { get; set; } = new();
        public List<MchVehicleServiceHistoryDto> ServiceHistory { get; set; } = new();
        public List<MchVehicleMaintenanceReviewDto> MaintenanceReviews { get; set; } = new();
    }

    public class MchVehicleOwnerDto
    {
        public int CustomerId { get; set; }
        public string? CustomerIdentification { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public DateTime OwnedFrom { get; set; }
        public DateTime? OwnedUntil { get; set; }
    }

    public class MchVehicleServiceHistoryDto
    {
        public string Source { get; set; } = string.Empty;
        public int RecordId { get; set; }
        public string Number { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public decimal? Mileage { get; set; }
        public int BranchId { get; set; }
        public string? BranchName { get; set; }
        public string Status { get; set; } = string.Empty;
        public int? MaintenanceReviewMileage { get; set; }
    }

    public class MchVehicleMaintenanceReviewDto
    {
        public int ServiceOrderId { get; set; }
        public int ReviewMileage { get; set; }
        public DateTime AttendedAt { get; set; }
        public int BranchId { get; set; }
    }
}
