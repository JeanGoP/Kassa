using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using TPV.Application.DTOs;
using TPV.Application.Interfaces;
using TPV.Domain.Entities;
using TPV.Domain.Interfaces;

namespace TPV.Application.Services
{
    public class MotorcycleServiceCatalogService : IMotorcycleServiceCatalogService
    {
        private static readonly (string Name, string Description, int Minutes, decimal Price, decimal TaxRate, int Order)[] DefaultServices =
        {
            ("Revision general", "Inspeccion general de la moto y puntos de seguridad.", 60, 0m, 0m, 10),
            ("Cambio de aceite", "Cambio de aceite y revision basica de niveles.", 30, 0m, 0m, 20),
            ("Mantenimiento preventivo", "Servicio preventivo por kilometraje o rutina.", 90, 0m, 0m, 30),
            ("Ajuste de frenos", "Revision, ajuste y limpieza del sistema de frenos.", 45, 0m, 0m, 40),
            ("Cambio de pastillas o bandas", "Cambio de elementos de freno segun estado.", 60, 0m, 0m, 50),
            ("Revision electrica", "Diagnostico de luces, bateria, carga y conexiones.", 60, 0m, 0m, 60),
            ("Cambio de llantas", "Montaje o cambio de llanta delantera o trasera.", 45, 0m, 0m, 70),
            ("Sincronizacion", "Ajuste de motor, carburacion o parametros de marcha.", 90, 0m, 0m, 80),
            ("Revision de suspension", "Inspeccion de amortiguadores, barras y direccion.", 60, 0m, 0m, 90),
            ("Kit de arrastre", "Revision o cambio de cadena, sprocket y catalina.", 75, 0m, 0m, 100)
        };

        private readonly IRepository<MotorcycleService> _repository;
        private readonly IRepository<AppointmentSchedule> _scheduleRepository;
        private readonly ICurrentTenantService _currentTenantService;

        public MotorcycleServiceCatalogService(
            IRepository<MotorcycleService> repository,
            IRepository<AppointmentSchedule> scheduleRepository,
            ICurrentTenantService currentTenantService)
        {
            _repository = repository;
            _scheduleRepository = scheduleRepository;
            _currentTenantService = currentTenantService;
        }

        public async Task<IEnumerable<MotorcycleServiceDto>> GetAllAsync(string? search = null)
        {
            var tenantId = await ResolveCatalogTenantIdAsync();
            if (!tenantId.HasValue)
            {
                return Enumerable.Empty<MotorcycleServiceDto>();
            }

            await EnsureDefaultsAsync(tenantId.Value);
            await DeactivateDuplicateServicesAsync(tenantId.Value);

            var normalizedSearch = search?.Trim();
            var services = await _repository.GetAsync(
                predicate: service => service.IsActive &&
                    service.TenantId == tenantId.Value &&
                    (string.IsNullOrEmpty(normalizedSearch) ||
                     service.Name.Contains(normalizedSearch) ||
                     (service.Description != null && service.Description.Contains(normalizedSearch))),
                orderBy: query => query.OrderBy(service => service.DisplayOrder).ThenBy(service => service.Name));

            return DeduplicateByName(services).Select(MapToDto);
        }

        public async Task<IEnumerable<MotorcycleServiceDto>> GetPublicByScheduleSlugAsync(string slug, string? search = null)
        {
            var schedule = (await _scheduleRepository.GetAsync(
                predicate: item => item.PublicSlug == slug && item.IsActive && item.IsPublicBookingEnabled))
                .FirstOrDefault();

            if (schedule == null)
            {
                return Enumerable.Empty<MotorcycleServiceDto>();
            }

            await EnsureDefaultsAsync(schedule.TenantId);

            var normalizedSearch = search?.Trim();
            var services = await _repository.GetAsync(
                predicate: service => service.IsActive &&
                    service.TenantId == schedule.TenantId &&
                    (string.IsNullOrEmpty(normalizedSearch) ||
                     service.Name.Contains(normalizedSearch) ||
                     (service.Description != null && service.Description.Contains(normalizedSearch))),
                orderBy: query => query.OrderBy(service => service.DisplayOrder).ThenBy(service => service.Name));

            return services.Select(MapToDto);
        }

        public async Task<MotorcycleServiceDto?> GetByIdAsync(int id)
        {
            var service = await _repository.GetByIdAsync(id);
            return service == null || !service.IsActive ? null : MapToDto(service);
        }

        public async Task<MotorcycleServiceDto> CreateAsync(CreateMotorcycleServiceDto dto)
        {
            var tenantId = await ResolveCatalogTenantIdAsync()
                ?? throw new Exception("No se pudo determinar la empresa del catalogo de servicios.");
            var name = CleanName(dto.Name);
            await EnsureUniqueNameAsync(name, tenantId);

            var entity = new MotorcycleService
            {
                TenantId = tenantId,
                Name = name,
                Description = CleanOptional(dto.Description),
                EstimatedMinutes = NormalizeMinutes(dto.EstimatedMinutes),
                Price = NormalizePrice(dto.Price),
                TaxRate = NormalizeTaxRate(dto.TaxRate),
                DisplayOrder = Math.Max(0, dto.DisplayOrder),
                IsActive = true
            };

            var created = await _repository.AddAsync(entity);
            return MapToDto(created);
        }

        public async Task UpdateAsync(int id, CreateMotorcycleServiceDto dto)
        {
            var entity = await _repository.GetByIdAsync(id);
            if (entity == null || !entity.IsActive)
            {
                throw new Exception("Servicio no encontrado.");
            }

            var name = CleanName(dto.Name);
            await EnsureUniqueNameAsync(name, entity.TenantId, id);

            entity.Name = name;
            entity.Description = CleanOptional(dto.Description);
            entity.EstimatedMinutes = NormalizeMinutes(dto.EstimatedMinutes);
            entity.Price = NormalizePrice(dto.Price);
            entity.TaxRate = NormalizeTaxRate(dto.TaxRate);
            entity.DisplayOrder = Math.Max(0, dto.DisplayOrder);
            entity.UpdatedAt = DateTime.UtcNow;

            await _repository.UpdateAsync(entity);
        }

        public async Task DeleteAsync(int id)
        {
            var entity = await _repository.GetByIdAsync(id);
            if (entity == null) return;

            entity.IsActive = false;
            entity.UpdatedAt = DateTime.UtcNow;
            await _repository.UpdateAsync(entity);
        }

        private async Task EnsureDefaultsAsync(int tenantId)
        {
            if (tenantId <= 0) return;

            var existing = await _repository.GetAsync(
                predicate: service => service.TenantId == tenantId);

            if (existing.Any()) return;

            foreach (var service in DefaultServices)
            {
                await _repository.AddAsync(new MotorcycleService
                {
                    TenantId = tenantId,
                    Name = service.Name,
                    Description = service.Description,
                    EstimatedMinutes = service.Minutes,
                    Price = service.Price,
                    TaxRate = service.TaxRate,
                    DisplayOrder = service.Order,
                    IsActive = true
                });
            }
        }

        private async Task<int?> ResolveCatalogTenantIdAsync()
        {
            var currentTenantId = _currentTenantService.TenantId;
            if (currentTenantId.HasValue && currentTenantId.Value > 0)
            {
                return currentTenantId.Value;
            }

            var schedule = (await _scheduleRepository.GetAsync(
                predicate: item => item.IsActive && item.TenantId > 0,
                orderBy: query => query.OrderBy(item => item.Id)))
                .FirstOrDefault();

            if (schedule != null)
            {
                return schedule.TenantId;
            }

            var service = (await _repository.GetAsync(
                predicate: item => item.TenantId > 0,
                orderBy: query => query.OrderBy(item => item.TenantId).ThenBy(item => item.DisplayOrder).ThenBy(item => item.Name)))
                .FirstOrDefault();

            if (service != null)
            {
                return service.TenantId;
            }

            var globalService = (await _repository.GetAsync(
                predicate: item => item.TenantId == 0,
                orderBy: query => query.OrderBy(item => item.DisplayOrder).ThenBy(item => item.Name)))
                .FirstOrDefault();

            return globalService?.TenantId;
        }

        private async Task DeactivateDuplicateServicesAsync(int tenantId)
        {
            var activeServices = await _repository.GetAsync(
                predicate: service => service.IsActive && service.TenantId == tenantId,
                orderBy: query => query.OrderBy(service => service.DisplayOrder).ThenBy(service => service.Name).ThenBy(service => service.Id),
                disableTracking: false);

            var duplicates = activeServices
                .GroupBy(service => NormalizeName(service.Name))
                .Where(group => !string.IsNullOrWhiteSpace(group.Key) && group.Count() > 1)
                .SelectMany(group => group.Skip(1))
                .ToList();

            foreach (var duplicate in duplicates)
            {
                duplicate.IsActive = false;
                duplicate.UpdatedAt = DateTime.UtcNow;
                await _repository.UpdateAsync(duplicate);
            }
        }

        private async Task EnsureUniqueNameAsync(string name, int tenantId, int? currentId = null)
        {
            var duplicates = await _repository.GetAsync(
                predicate: service => service.IsActive &&
                    service.TenantId == tenantId &&
                    service.Name == name &&
                    (!currentId.HasValue || service.Id != currentId.Value));

            if (duplicates.Any())
            {
                throw new Exception("Ya existe un servicio con ese nombre.");
            }
        }

        private static string CleanName(string value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                throw new Exception("El nombre del servicio es obligatorio.");
            }

            return value.Trim();
        }

        private static string? CleanOptional(string? value)
        {
            return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
        }

        private static int? NormalizeMinutes(int? minutes)
        {
            if (!minutes.HasValue) return null;
            return Math.Clamp(minutes.Value, 5, 600);
        }

        private static decimal NormalizePrice(decimal price)
        {
            if (price < 0) throw new Exception("El precio fijo no puede ser negativo.");
            return decimal.Round(price, 2);
        }

        private static decimal NormalizeTaxRate(decimal taxRate)
        {
            if (taxRate < 0 || taxRate > 100) throw new Exception("El impuesto debe estar entre 0 y 100.");
            return decimal.Round(taxRate, 2);
        }

        private static IEnumerable<MotorcycleService> DeduplicateByName(IEnumerable<MotorcycleService> services)
        {
            return services
                .GroupBy(service => NormalizeName(service.Name))
                .Select(group => group.OrderBy(service => service.DisplayOrder).ThenBy(service => service.Id).First())
                .OrderBy(service => service.DisplayOrder)
                .ThenBy(service => service.Name);
        }

        private static string NormalizeName(string value)
        {
            return (value ?? string.Empty).Trim().ToUpperInvariant();
        }

        private static MotorcycleServiceDto MapToDto(MotorcycleService service)
        {
            return new MotorcycleServiceDto
            {
                Id = service.Id,
                Name = service.Name,
                Description = service.Description,
                EstimatedMinutes = service.EstimatedMinutes,
                Price = service.Price,
                TaxRate = service.TaxRate,
                DisplayOrder = service.DisplayOrder
            };
        }
    }
}
