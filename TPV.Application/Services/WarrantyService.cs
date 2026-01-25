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
    public class WarrantyService : IWarrantyService
    {
        private readonly IRepository<Warranty> _repository;
        private readonly IRepository<Customer> _customerRepository;
        private readonly IRepository<ServiceOrder> _serviceOrderRepository;

        public WarrantyService(
            IRepository<Warranty> repository, 
            IRepository<Customer> customerRepository,
            IRepository<ServiceOrder> serviceOrderRepository)
        {
            _repository = repository;
            _customerRepository = customerRepository;
            _serviceOrderRepository = serviceOrderRepository;
        }

        public async Task<IEnumerable<WarrantyDto>> GetAllAsync(string? plate = null)
        {
            IEnumerable<Warranty> query = await _repository.GetAllAsync();
            if (!string.IsNullOrEmpty(plate))
            {
                query = query.Where(w => w.Plate.ToLower().Contains(plate.ToLower()));
            }
            
            var list = new List<WarrantyDto>();
            foreach (var w in query)
            {
                list.Add(await MapToDto(w));
            }
            return list;
        }

        public async Task<WarrantyDto> GetByIdAsync(int id)
        {
            var entity = await _repository.GetByIdAsync(id);
            return entity != null ? await MapToDto(entity) : null;
        }

        public async Task<WarrantyDto> CreateAsync(CreateWarrantyDto dto)
        {
            var entity = new Warranty
            {
                Plate = dto.Plate.ToUpper(),
                CustomerId = dto.CustomerId,
                Type = dto.Type,
                Description = dto.Description,
                StartDate = dto.StartDate,
                EndDate = dto.EndDate,
                StartMileage = dto.StartMileage,
                LimitMileage1 = dto.LimitMileage1,
                LimitMileage2 = dto.LimitMileage2,
                LimitMileage3 = dto.LimitMileage3,
                TermsAndConditions = dto.TermsAndConditions,
                Status = dto.Status,
                IsActive = true
            };

            var created = await _repository.AddAsync(entity);
            return await MapToDto(created);
        }

        public async Task UpdateAsync(int id, CreateWarrantyDto dto)
        {
            var entity = await _repository.GetByIdAsync(id);
            if (entity != null)
            {
                entity.Plate = dto.Plate.ToUpper();
                entity.CustomerId = dto.CustomerId;
                entity.Type = dto.Type;
                entity.Description = dto.Description;
                entity.StartDate = dto.StartDate;
                entity.EndDate = dto.EndDate;
                entity.StartMileage = dto.StartMileage;
                entity.LimitMileage1 = dto.LimitMileage1;
                entity.LimitMileage2 = dto.LimitMileage2;
                entity.LimitMileage3 = dto.LimitMileage3;
                entity.TermsAndConditions = dto.TermsAndConditions;
                entity.Status = dto.Status;
                
                await _repository.UpdateAsync(entity);
            }
        }

        public async Task DeleteAsync(int id)
        {
            var entity = await _repository.GetByIdAsync(id);
            if (entity != null)
            {
                entity.IsActive = false;
                await _repository.UpdateAsync(entity);
            }
        }

        public async Task<IEnumerable<WarrantyDto>> GetActiveWarrantiesByPlateAsync(string plate)
        {
            var candidates = await _repository.GetAsync(w => w.Plate == plate.ToUpper() && w.IsActive && w.Status == "Active");
            
            // Get last known mileage from Service Orders
            decimal lastKnownMileage = 0;
            var lastOrder = (await _serviceOrderRepository.GetAsync(
                predicate: o => o.Plate == plate.ToUpper(),
                orderBy: q => q.OrderByDescending(o => o.IntakeDateTime)
            )).FirstOrDefault();

            if (lastOrder != null)
            {
                lastKnownMileage = lastOrder.Mileage;
            }

            var list = new List<WarrantyDto>();
            foreach(var w in candidates)
            {
                // 1. Date Validation
                if (w.EndDate.HasValue && w.EndDate.Value.Date < DateTime.UtcNow.Date)
                {
                    continue;
                }

                // 2. Mileage Validation (Historical)
                // Check if current mileage exceeds ALL defined limits
                var limits = new[] { w.LimitMileage1, w.LimitMileage2, w.LimitMileage3 }
                    .Where(l => l.HasValue)
                    .Select(l => l.Value)
                    .ToList();

                if (limits.Any() && lastKnownMileage > limits.Max())
                {
                    continue;
                }

                list.Add(await MapToDto(w));
            }
            return list;
        }

        private async Task<WarrantyDto> MapToDto(Warranty entity)
        {
            string customerName = "";
            if (entity.CustomerId.HasValue)
            {
                var c = await _customerRepository.GetByIdAsync(entity.CustomerId.Value);
                if (c != null) customerName = $"{c.FirstName} {c.LastName}";
            }

            return new WarrantyDto
            {
                Id = entity.Id,
                Plate = entity.Plate,
                CustomerId = entity.CustomerId,
                CustomerName = customerName,
                Type = entity.Type,
                Description = entity.Description,
                StartDate = entity.StartDate,
                EndDate = entity.EndDate,
                StartMileage = entity.StartMileage,
                LimitMileage1 = entity.LimitMileage1,
                LimitMileage2 = entity.LimitMileage2,
                LimitMileage3 = entity.LimitMileage3,
                TermsAndConditions = entity.TermsAndConditions,
                Status = entity.Status,
                IsActive = entity.IsActive
            };
        }
    }
}