using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using TPV.Application.DTOs;
using TPV.Domain.Entities;
using TPV.Domain.Interfaces;
using TPV.Application.Interfaces;

namespace TPV.Application.Services
{
    public class SupplierService : ISupplierService
    {
        private readonly IRepository<Supplier> _supplierRepository;
        private readonly ILogger<SupplierService> _logger;

        public SupplierService(IRepository<Supplier> supplierRepository, ILogger<SupplierService> logger)
        {
            _supplierRepository = supplierRepository;
            _logger = logger;
        }

        public async Task<IEnumerable<SupplierDto>> GetAllAsync()
        {
            var suppliers = await _supplierRepository.GetAllAsync();
            return suppliers.Where(s => s.IsActive).Select(s => new SupplierDto
            {
                Id = s.Id,
                Name = s.Name,
                ContactName = s.ContactName,
                Phone = s.Phone,
                Email = s.Email,
                Address = s.Address,
                IdentificationType = s.IdentificationType,
                TaxId = s.TaxId
            });
        }

        public async Task<SupplierDto?> GetByIdAsync(int id)
        {
            var s = await _supplierRepository.GetByIdAsync(id);
            if (s == null || !s.IsActive) return null;
            return new SupplierDto
            {
                Id = s.Id,
                Name = s.Name,
                ContactName = s.ContactName,
                Phone = s.Phone,
                Email = s.Email,
                Address = s.Address,
                IdentificationType = s.IdentificationType,
                TaxId = s.TaxId
            };
        }

        public async Task<SupplierDto> CreateAsync(CreateSupplierDto dto)
        {
            if (!string.IsNullOrEmpty(dto.TaxId))
            {
                dto.TaxId = dto.TaxId.Trim();
                var existing = await _supplierRepository.GetAsync(s => s.TaxId.Trim() == dto.TaxId);
                if (existing.Any())
                {
                    _logger.LogWarning("Intento de crear proveedor duplicado (App Check) con identificación {TaxId}", dto.TaxId);
                    throw new System.Exception($"Ya existe un proveedor con la identificación {dto.TaxId}");
                }
            }

            var supplier = new Supplier
            {
                Name = dto.Name,
                ContactName = dto.ContactName,
                Phone = dto.Phone,
                Email = dto.Email,
                Address = dto.Address,
                IdentificationType = dto.IdentificationType,
                TaxId = dto.TaxId,
                IsActive = true
            };

            try
            {
                var created = await _supplierRepository.AddAsync(supplier);
                return new SupplierDto
                {
                    Id = created.Id,
                    Name = created.Name,
                    ContactName = created.ContactName,
                    Phone = created.Phone,
                    Email = created.Email,
                    Address = created.Address,
                    IdentificationType = created.IdentificationType,
                    TaxId = created.TaxId
                };
            }
            catch (System.Exception ex)
            {
                if (ex.InnerException != null && (ex.InnerException.Message.Contains("IX_Suppliers_TenantId_TaxId") || ex.InnerException.Message.Contains("IX_Suppliers_TaxId")))
                {
                    _logger.LogWarning("Intento de duplicar proveedor con identificación {TaxId} (DB Constraint)", dto.TaxId);
                    throw new System.Exception($"Ya existe un proveedor con la identificación {dto.TaxId} (Error de base de datos)");
                }
                _logger.LogError(ex, "Error al crear proveedor con identificación {TaxId}", dto.TaxId);
                throw;
            }
        }

        public async Task UpdateAsync(int id, CreateSupplierDto dto)
        {
            var supplier = await _supplierRepository.GetByIdAsync(id);
            if (supplier != null)
            {
                if (!string.IsNullOrEmpty(dto.TaxId))
                {
                    dto.TaxId = dto.TaxId.Trim();
                    if (dto.TaxId != supplier.TaxId)
                    {
                        var existing = await _supplierRepository.GetAsync(s => s.TaxId.Trim() == dto.TaxId && s.Id != id);
                        if (existing.Any())
                        {
                            _logger.LogWarning("Intento de actualizar a proveedor duplicado (App Check) con identificación {TaxId}", dto.TaxId);
                            throw new System.Exception($"Ya existe otro proveedor con la identificación {dto.TaxId}");
                        }
                    }
                }

                supplier.Name = dto.Name;
                supplier.ContactName = dto.ContactName;
                supplier.Phone = dto.Phone;
                supplier.Email = dto.Email;
                supplier.Address = dto.Address;
                supplier.IdentificationType = dto.IdentificationType;
                supplier.TaxId = dto.TaxId;

                try
                {
                    await _supplierRepository.UpdateAsync(supplier);
                }
                catch (System.Exception ex)
                {
                    if (ex.InnerException != null && (ex.InnerException.Message.Contains("IX_Suppliers_TenantId_TaxId") || ex.InnerException.Message.Contains("IX_Suppliers_TaxId")))
                    {
                        _logger.LogWarning("Intento de duplicar proveedor con identificación {TaxId} en actualización", dto.TaxId);
                        throw new System.Exception($"Ya existe otro proveedor con la identificación {dto.TaxId} (Error de base de datos)");
                    }
                    _logger.LogError(ex, "Error al actualizar proveedor {Id}", id);
                    throw;
                }
            }
        }

        public async Task DeleteAsync(int id)
        {
            var supplier = await _supplierRepository.GetByIdAsync(id);
            if (supplier != null)
            {
                supplier.IsActive = false;
                await _supplierRepository.UpdateAsync(supplier);
            }
        }
    }
}
