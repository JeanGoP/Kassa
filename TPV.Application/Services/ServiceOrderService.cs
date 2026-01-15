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
        private readonly IRepository<ServiceOrderWork> _workRepository;

        public ServiceOrderService(IRepository<ServiceOrder> repository, IRepository<Customer> customerRepository, IRepository<ServiceOrderWork> workRepository)
        {
            _repository = repository;
            _customerRepository = customerRepository;
            _workRepository = workRepository;
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

        public async Task<ServiceOrderDto> SetDiagnosisAsync(int id, ServiceOrderDiagnosisDto dto)
        {
            var entity = await _repository.GetByIdAsync(id);
            if (entity == null) return null;

            entity.Status = "EN DIAGNOSTICO";
            await _repository.UpdateAsync(entity);

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

        public async Task<IEnumerable<ServiceOrderWorkDto>> GetWorksByOrderAsync(int serviceOrderId)
        {
            var works = await _workRepository.GetAsync(w => w.ServiceOrderId == serviceOrderId);

            return works.Select(w => new ServiceOrderWorkDto
            {
                Id = w.Id,
                ServiceOrderId = w.ServiceOrderId,
                Description = w.Description,
                Technician = w.Technician,
                EstimatedTimeHours = w.EstimatedTimeHours,
                LaborCost = w.LaborCost,
                Status = w.Status
            });
        }

        public async Task<ServiceOrderWorkDto> AddWorkAsync(int serviceOrderId, CreateServiceOrderWorkDto dto)
        {
            var order = await _repository.GetByIdAsync(serviceOrderId);
            if (order == null) return null;

            var entity = new ServiceOrderWork
            {
                ServiceOrderId = serviceOrderId,
                Description = dto.Description,
                Technician = dto.Technician,
                EstimatedTimeHours = dto.EstimatedTimeHours,
                LaborCost = dto.LaborCost,
                Status = dto.Status
            };

            await _workRepository.AddAsync(entity);

            return new ServiceOrderWorkDto
            {
                Id = entity.Id,
                ServiceOrderId = entity.ServiceOrderId,
                Description = entity.Description,
                Technician = entity.Technician,
                EstimatedTimeHours = entity.EstimatedTimeHours,
                LaborCost = entity.LaborCost,
                Status = entity.Status
            };
        }

        public async Task<ServiceOrderWorkDto> UpdateWorkStatusAsync(int serviceOrderId, int workId, ServiceOrderWorkStatusDto dto)
        {
            var entity = await _workRepository.GetByIdAsync(workId);
            if (entity == null || entity.ServiceOrderId != serviceOrderId) return null;

            entity.Status = dto.Status;
            await _workRepository.UpdateAsync(entity);

            return new ServiceOrderWorkDto
            {
                Id = entity.Id,
                ServiceOrderId = entity.ServiceOrderId,
                Description = entity.Description,
                Technician = entity.Technician,
                EstimatedTimeHours = entity.EstimatedTimeHours,
                LaborCost = entity.LaborCost,
                Status = entity.Status
            };
        }
    }
}
