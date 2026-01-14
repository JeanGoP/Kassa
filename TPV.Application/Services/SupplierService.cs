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

        public SupplierService(IRepository<Supplier> supplierRepository)
        {
            _supplierRepository = supplierRepository;
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
                Address = s.Address
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
                Address = s.Address
            };
        }

        public async Task<SupplierDto> CreateAsync(CreateSupplierDto dto)
        {
            var supplier = new Supplier
            {
                Name = dto.Name,
                ContactName = dto.ContactName,
                Phone = dto.Phone,
                Email = dto.Email,
                Address = dto.Address,
                IsActive = true
            };
            var created = await _supplierRepository.AddAsync(supplier);
            return new SupplierDto
            {
                Id = created.Id,
                Name = created.Name,
                ContactName = created.ContactName,
                Phone = created.Phone,
                Email = created.Email,
                Address = created.Address
            };
        }

        public async Task UpdateAsync(int id, CreateSupplierDto dto)
        {
            var supplier = await _supplierRepository.GetByIdAsync(id);
            if (supplier != null)
            {
                supplier.Name = dto.Name;
                supplier.ContactName = dto.ContactName;
                supplier.Phone = dto.Phone;
                supplier.Email = dto.Email;
                supplier.Address = dto.Address;
                await _supplierRepository.UpdateAsync(supplier);
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