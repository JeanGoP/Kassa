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
    public class WorkshopManagerService : IWorkshopManagerService
    {
        private readonly IRepository<WorkshopManager> _repository;
        private readonly IRepository<Branch> _branchRepository;

        public WorkshopManagerService(
            IRepository<WorkshopManager> repository,
            IRepository<Branch> branchRepository)
        {
            _repository = repository;
            _branchRepository = branchRepository;
        }

        public async Task<IEnumerable<WorkshopManagerDto>> GetAllAsync(string? search = null)
        {
            var normalizedSearch = search?.Trim();
            var managers = await _repository.GetAsync(
                predicate: m => string.IsNullOrEmpty(normalizedSearch) ||
                                m.Name.Contains(normalizedSearch) ||
                                (m.Phone != null && m.Phone.Contains(normalizedSearch)) ||
                                (m.Email != null && m.Email.Contains(normalizedSearch)),
                orderBy: q => q.OrderBy(m => m.Name)
            );

            return managers.Select(MapToDto);
        }

        public async Task<WorkshopManagerDto> GetByIdAsync(int id)
        {
            var manager = await _repository.GetByIdAsync(id);
            return manager == null ? null : MapToDto(manager);
        }

        public async Task<WorkshopManagerDto> CreateAsync(CreateWorkshopManagerDto dto)
        {
            var manager = new WorkshopManager
            {
                Name = dto.Name.Trim(),
                Phone = dto.Phone,
                Email = dto.Email,
                Notes = dto.Notes,
                IsActive = true
            };

            await _repository.AddAsync(manager);
            return MapToDto(manager);
        }

        public async Task UpdateAsync(int id, CreateWorkshopManagerDto dto)
        {
            var manager = await _repository.GetByIdAsync(id);
            if (manager == null) throw new Exception("Workshop manager not found");

            manager.Name = dto.Name.Trim();
            manager.Phone = dto.Phone;
            manager.Email = dto.Email;
            manager.Notes = dto.Notes;

            await _repository.UpdateAsync(manager);
        }

        public async Task DeleteAsync(int id)
        {
            var manager = await _repository.GetByIdAsync(id);
            if (manager == null) throw new Exception("Workshop manager not found");

            var assignedBranches = await _branchRepository.GetAsync(b => b.WorkshopManagerId == id);
            if (assignedBranches.Any())
            {
                throw new InvalidOperationException("No se puede eliminar el jefe de taller porque esta asignado a una sucursal.");
            }

            await _repository.DeleteAsync(manager);
        }

        private static WorkshopManagerDto MapToDto(WorkshopManager manager)
        {
            return new WorkshopManagerDto
            {
                Id = manager.Id,
                Name = manager.Name,
                Phone = manager.Phone,
                Email = manager.Email,
                Notes = manager.Notes
            };
        }
    }
}
