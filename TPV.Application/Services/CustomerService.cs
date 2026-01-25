using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using TPV.Application.DTOs;
using TPV.Application.Interfaces;
using TPV.Domain.Entities;
using TPV.Domain.Interfaces;

using Microsoft.Extensions.Logging;

namespace TPV.Application.Services
{
    public class CustomerService : ICustomerService
    {
        private readonly IRepository<Customer> _customerRepository;
        private readonly ILogger<CustomerService> _logger;

        public CustomerService(IRepository<Customer> customerRepository, ILogger<CustomerService> logger)
        {
            _customerRepository = customerRepository;
            _logger = logger;
        }

        public async Task<IEnumerable<CustomerDto>> GetAllAsync(string? search = null)
        {
            var customers = await _customerRepository.GetAsync(
                predicate: c => string.IsNullOrEmpty(search) ||
                             c.FirstName.Contains(search) ||
                             c.LastName.Contains(search) ||
                             (c.TaxId != null && c.TaxId.Contains(search)),
                orderBy: q => q.OrderBy(c => c.LastName)
            );

            return customers.Select(c => new CustomerDto
            {
                Id = c.Id,
                FirstName = c.FirstName,
                LastName = c.LastName,
                Email = c.Email,
                Phone = c.Phone,
                Address = c.Address,
                IdentificationType = c.IdentificationType,
                TaxId = c.TaxId,
                Department = c.Department,
                City = c.City
            });
        }

        public async Task<CustomerDto> GetByIdAsync(int id)
        {
            var c = await _customerRepository.GetByIdAsync(id);
            if (c == null) return null;

            return new CustomerDto
            {
                Id = c.Id,
                FirstName = c.FirstName,
                LastName = c.LastName,
                Email = c.Email,
                Phone = c.Phone,
                Address = c.Address,
                IdentificationType = c.IdentificationType,
                TaxId = c.TaxId,
                Department = c.Department,
                City = c.City
            };
        }

        public async Task<CustomerDto> CreateAsync(CreateCustomerDto dto)
        {
            if (!string.IsNullOrEmpty(dto.TaxId))
            {
                dto.TaxId = dto.TaxId.Trim();
                var existing = await _customerRepository.GetAsync(c => c.TaxId.Trim() == dto.TaxId);
                if (existing.Any())
                {
                    throw new System.Exception($"Ya existe un cliente con la identificación {dto.TaxId}");
                }
            }

            var customer = new Customer
            {
                FirstName = dto.FirstName,
                LastName = dto.LastName,
                Email = dto.Email,
                Phone = dto.Phone,
                Address = dto.Address,
                IdentificationType = dto.IdentificationType,
                TaxId = dto.TaxId,
                Department = dto.Department,
                City = dto.City,
                IsActive = true
            };

            try
            {
                var created = await _customerRepository.AddAsync(customer);

                return new CustomerDto
                {
                    Id = created.Id,
                    FirstName = created.FirstName,
                    LastName = created.LastName,
                    Email = created.Email,
                    Phone = created.Phone,
                    Address = created.Address,
                    IdentificationType = created.IdentificationType,
                    TaxId = created.TaxId,
                    Department = created.Department,
                    City = created.City
                };
            }
            catch (System.Exception ex)
            {
                // Check for inner exception related to database unique constraint
                if (ex.InnerException != null && ex.InnerException.Message.Contains("IX_Customers_TenantId_TaxId"))
                {
                    _logger.LogWarning("Intento de duplicar cliente con identificación {TaxId}", dto.TaxId);
                    throw new System.Exception($"Ya existe un cliente con la identificación {dto.TaxId} (Error de base de datos)");
                }
                _logger.LogError(ex, "Error al crear cliente con identificación {TaxId}", dto.TaxId);
                throw;
            }
        }

        public async Task UpdateAsync(int id, CreateCustomerDto dto)
        {
            var customer = await _customerRepository.GetByIdAsync(id);
            if (customer != null)
            {
                if (!string.IsNullOrEmpty(dto.TaxId))
                {
                    dto.TaxId = dto.TaxId.Trim();

                    if (dto.TaxId != customer.TaxId)
                    {
                        var existing = await _customerRepository.GetAsync(c => c.TaxId.Trim() == dto.TaxId && c.Id != id);
                        if (existing.Any())
                        {
                            throw new System.Exception($"Ya existe otro cliente con la identificación {dto.TaxId}");
                        }
                    }
                }

                customer.FirstName = dto.FirstName;
                customer.LastName = dto.LastName;
                customer.Email = dto.Email;
                customer.Phone = dto.Phone;
                customer.Address = dto.Address;
                customer.IdentificationType = dto.IdentificationType;
                customer.TaxId = dto.TaxId;
                customer.Department = dto.Department;
                customer.City = dto.City;

                try
                {
                    await _customerRepository.UpdateAsync(customer);
                }
                catch (System.Exception ex)
                {
                    if (ex.InnerException != null && ex.InnerException.Message.Contains("IX_Customers_TenantId_TaxId"))
                    {
                        _logger.LogWarning("Intento de duplicar cliente con identificación {TaxId} en actualización", dto.TaxId);
                        throw new System.Exception($"Ya existe un cliente con la identificación {dto.TaxId} (Error de base de datos)");
                    }
                    _logger.LogError(ex, "Error al actualizar cliente {Id}", id);
                    throw;
                }
            }
        }

        public async Task DeleteAsync(int id)
        {
            var customer = await _customerRepository.GetByIdAsync(id);
            if (customer != null)
            {
                await _customerRepository.DeleteAsync(customer);
            }
        }
    }
}
