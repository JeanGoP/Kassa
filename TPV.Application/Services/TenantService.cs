using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using TPV.Application.DTOs;
using TPV.Application.Interfaces;
using TPV.Domain.Entities;
using TPV.Domain.Interfaces;

namespace TPV.Application.Services
{
    public class TenantService : ITenantService
    {
        private readonly IRepository<Tenant> _repository;

        public TenantService(IRepository<Tenant> repository)
        {
            _repository = repository;
        }

        public async Task<IEnumerable<TenantDto>> GetAllAsync()
        {
            var tenants = await _repository.GetAllAsync();
            return tenants.Select(t => new TenantDto
            {
                Id = t.Id,
                Name = t.Name,
                Nit = t.Nit,
                Address = t.Address,
                Phone = t.Phone,
                Email = t.Email,
                LogoUrl = t.LogoUrl
            });
        }

        public async Task<TenantDto> GetByIdAsync(int id)
        {
            var t = await _repository.GetByIdAsync(id);
            if (t == null) return null;

            return new TenantDto
            {
                Id = t.Id,
                Name = t.Name,
                Nit = t.Nit,
                Address = t.Address,
                Phone = t.Phone,
                Email = t.Email,
                LogoUrl = t.LogoUrl
            };
        }

        public async Task<TenantDto> CreateAsync(CreateTenantDto dto)
        {
            dto.Nit = dto.Nit.Trim();
            if (string.IsNullOrWhiteSpace(dto.Nit))
            {
                throw new System.Exception("El NIT de la empresa es obligatorio.");
            }

            if (!string.IsNullOrEmpty(dto.Nit))
            {
                dto.Nit = dto.Nit.Trim();
                var existing = await _repository.GetAsync(t => t.Nit.Trim() == dto.Nit);
                if (existing.Any())
                {
                    throw new System.Exception($"Ya existe una empresa con el NIT {dto.Nit}");
                }
            }

            var tenant = new Tenant
            {
                Name = dto.Name,
                Nit = dto.Nit,
                Address = dto.Address,
                Phone = dto.Phone,
                Email = dto.Email,
                LogoUrl = dto.LogoUrl
            };

            var created = await _repository.AddAsync(tenant);

            return new TenantDto
            {
                Id = created.Id,
                Name = created.Name,
                Nit = created.Nit,
                Address = created.Address,
                Phone = created.Phone,
                Email = created.Email,
                LogoUrl = created.LogoUrl
            };
        }

        public async Task UpdateAsync(int id, CreateTenantDto dto)
        {
            var tenant = await _repository.GetByIdAsync(id);
            if (tenant != null)
            {
                dto.Nit = dto.Nit.Trim();
                if (string.IsNullOrWhiteSpace(dto.Nit))
                {
                    throw new System.Exception("El NIT de la empresa es obligatorio.");
                }

                if (!string.IsNullOrEmpty(dto.Nit))
                {
                    dto.Nit = dto.Nit.Trim();
                    if (dto.Nit != tenant.Nit)
                    {
                        var existing = await _repository.GetAsync(t => t.Nit.Trim() == dto.Nit && t.Id != id);
                        if (existing.Any())
                        {
                            throw new System.Exception($"Ya existe otra empresa con el NIT {dto.Nit}");
                        }
                    }
                }

                tenant.Name = dto.Name;
                tenant.Nit = dto.Nit;
                tenant.Address = dto.Address;
                tenant.Phone = dto.Phone;
                tenant.Email = dto.Email;
                tenant.LogoUrl = dto.LogoUrl;

                await _repository.UpdateAsync(tenant);
            }
        }

        public async Task DeleteAsync(int id)
        {
            var entity = await _repository.GetByIdAsync(id);
            if (entity != null)
            {
                await _repository.DeleteAsync(entity);
            }
        }
    }
}
