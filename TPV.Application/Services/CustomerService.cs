using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using TPV.Application.DTOs;
using TPV.Application.Interfaces;
using TPV.Domain.Entities;
using TPV.Domain.Interfaces;

namespace TPV.Application.Services
{
    public class CustomerService : ICustomerService
    {
        private readonly IRepository<Customer> _customerRepository;

        public CustomerService(IRepository<Customer> customerRepository)
        {
            _customerRepository = customerRepository;
        }

        public async Task<IEnumerable<CustomerDto>> GetAllAsync(string? search = null)
        {
            var customers = await _customerRepository.GetAsync(
                predicate: c => string.IsNullOrEmpty(search) || 
                             c.FirstName.Contains(search) || 
                             c.LastName.Contains(search) ||
                             c.TaxId.Contains(search),
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
                TaxId = c.TaxId
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
                TaxId = c.TaxId
            };
        }

        public async Task<CustomerDto> CreateAsync(CreateCustomerDto dto)
        {
            var customer = new Customer
            {
                FirstName = dto.FirstName,
                LastName = dto.LastName,
                Email = dto.Email,
                Phone = dto.Phone,
                Address = dto.Address,
                TaxId = dto.TaxId,
                IsActive = true
            };

            var created = await _customerRepository.AddAsync(customer);

            return new CustomerDto
            {
                Id = created.Id,
                FirstName = created.FirstName,
                LastName = created.LastName,
                Email = created.Email,
                Phone = created.Phone,
                Address = created.Address,
                TaxId = created.TaxId
            };
        }

        public async Task UpdateAsync(int id, CreateCustomerDto dto)
        {
            var customer = await _customerRepository.GetByIdAsync(id);
            if (customer != null)
            {
                customer.FirstName = dto.FirstName;
                customer.LastName = dto.LastName;
                customer.Email = dto.Email;
                customer.Phone = dto.Phone;
                customer.Address = dto.Address;
                customer.TaxId = dto.TaxId;

                await _customerRepository.UpdateAsync(customer);
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
