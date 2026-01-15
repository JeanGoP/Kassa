using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using TPV.Application.DTOs;
using TPV.Application.Interfaces;
using TPV.Domain.Entities;
using TPV.Domain.Interfaces;

namespace TPV.Application.Services
{
    public class ServiceOrderService : IServiceOrderService
    {
        private readonly IRepository<ServiceOrder> _repository;
        private readonly IRepository<Customer> _customerRepository;

        public ServiceOrderService(IRepository<ServiceOrder> repository, IRepository<Customer> customerRepository)
        {
            _repository = repository;
            _customerRepository = customerRepository;
        }

        public async Task<IEnumerable<ServiceOrderDto>> GetAllAsync(string search)
        {
            var orders = await _repository.GetAsync(
                predicate: o =>
                    string.IsNullOrEmpty(search) ||
                    o.Plate.Contains(search) ||
                    o.Technician.Contains(search) ||
                    o.Customer.FirstName.Contains(search) ||
                    o.Customer.LastName.Contains(search),
                orderBy: q => q.OrderByDescending(o => o.IntakeDateTime),
                includeString: "Customer"
            );

            return orders.Select(o => new ServiceOrderDto
            {
                Id = o.Id,
                CustomerId = o.CustomerId,
                CustomerName = o.Customer != null ? $"{o.Customer.FirstName} {o.Customer.LastName}" : "Unknown",
                Plate = o.Plate,
                Brand = o.Brand,
                Model = o.Model,
                Year = o.Year,
                Mileage = o.Mileage,
                IntakeDateTime = o.IntakeDateTime,
                FuelLevel = o.FuelLevel,
                InitialObservations = o.InitialObservations,
                VisualCondition = o.VisualCondition,
                Technician = o.Technician,
                Status = o.Status
            });
        }

        public async Task<ServiceOrderDto> CreateAsync(CreateServiceOrderDto dto)
        {
            var entity = new ServiceOrder
            {
                CustomerId = dto.CustomerId,
                Plate = dto.Plate,
                Brand = dto.Brand,
                Model = dto.Model,
                Year = dto.Year,
                Mileage = dto.Mileage,
                IntakeDateTime = dto.IntakeDateTime,
                FuelLevel = dto.FuelLevel,
                InitialObservations = dto.InitialObservations,
                VisualCondition = dto.VisualCondition,
                Technician = dto.Technician,
                Status = dto.Status
            };

            await _repository.AddAsync(entity);

            // Fetch customer name for DTO
            var customer = await _customerRepository.GetByIdAsync(entity.CustomerId);

            return new ServiceOrderDto
            {
                Id = entity.Id,
                CustomerId = entity.CustomerId,
                CustomerName = customer != null ? $"{customer.FirstName} {customer.LastName}" : "Unknown",
                Plate = entity.Plate,
                Brand = entity.Brand,
                Model = entity.Model,
                Year = entity.Year,
                Mileage = entity.Mileage,
                IntakeDateTime = entity.IntakeDateTime,
                FuelLevel = entity.FuelLevel,
                InitialObservations = entity.InitialObservations,
                VisualCondition = entity.VisualCondition,
                Technician = entity.Technician,
                Status = entity.Status
            };
        }

        public async Task<ServiceOrderDto> GetByIdAsync(int id)
        {
            var entity = await _repository.GetByIdAsync(id);
            if (entity == null) return null;

            var customer = await _customerRepository.GetByIdAsync(entity.CustomerId);

            return new ServiceOrderDto
            {
                Id = entity.Id,
                CustomerId = entity.CustomerId,
                CustomerName = customer != null ? $"{customer.FirstName} {customer.LastName}" : "Unknown",
                Plate = entity.Plate,
                Brand = entity.Brand,
                Model = entity.Model,
                Year = entity.Year,
                Mileage = entity.Mileage,
                IntakeDateTime = entity.IntakeDateTime,
                FuelLevel = entity.FuelLevel,
                InitialObservations = entity.InitialObservations,
                VisualCondition = entity.VisualCondition,
                Technician = entity.Technician,
                Status = entity.Status
            };
        }
    }
}
