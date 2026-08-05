using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using TPV.Application.DTOs;
using TPV.Application.Interfaces;
using TPV.Domain.Entities;
using TPV.Domain.Interfaces;

namespace TPV.Application.Services
{
    public class TechnicianService : ITechnicianService
    {
        private readonly IRepository<Technician> _repository;
        private readonly IRepository<Branch> _branchRepository;

        public TechnicianService(IRepository<Technician> repository, IRepository<Branch> branchRepository)
        {
            _repository = repository;
            _branchRepository = branchRepository;
        }

        public async Task<IEnumerable<TechnicianDto>> GetAllAsync(string? search = null)
        {
            var technicians = await _repository.GetAsync(
                predicate: t => string.IsNullOrEmpty(search) ||
                                t.Name.Contains(search) ||
                                (t.Specialty != null && t.Specialty.Contains(search)),
                orderBy: q => q.OrderBy(t => t.Name),
                includeString: "Branch"
            );

            return technicians.Select(t => new TechnicianDto
            {
                Id = t.Id,
                Name = t.Name,
                Phone = t.Phone,
                Email = t.Email,
                Specialty = t.Specialty,
                BranchId = t.BranchId,
                BranchName = t.Branch?.Name
            });
        }

        public async Task<TechnicianDto> GetByIdAsync(int id)
        {
            var t = (await _repository.GetAsync(x => x.Id == id, includeString: "Branch")).FirstOrDefault();
            if (t == null) return null;

            return new TechnicianDto
            {
                Id = t.Id,
                Name = t.Name,
                Phone = t.Phone,
                Email = t.Email,
                Specialty = t.Specialty,
                BranchId = t.BranchId,
                BranchName = t.Branch?.Name
            };
        }

        public async Task<TechnicianDto> CreateAsync(CreateTechnicianDto dto)
        {
            var branch = await ResolveBranchAsync(dto.BranchId);
            var entity = new Technician
            {
                Name = dto.Name,
                Phone = dto.Phone,
                Email = dto.Email,
                Specialty = dto.Specialty,
                BranchId = branch?.Id,
                Branch = branch,
                IsActive = true
            };

            var created = await _repository.AddAsync(entity);

            return new TechnicianDto
            {
                Id = created.Id,
                Name = created.Name,
                Phone = created.Phone,
                Email = created.Email,
                Specialty = created.Specialty,
                BranchId = created.BranchId,
                BranchName = branch?.Name
            };
        }

        public async Task UpdateAsync(int id, CreateTechnicianDto dto)
        {
            var entity = await _repository.GetByIdAsync(id);
            if (entity != null)
            {
                var branch = await ResolveBranchAsync(dto.BranchId);
                entity.Name = dto.Name;
                entity.Phone = dto.Phone;
                entity.Email = dto.Email;
                entity.Specialty = dto.Specialty;
                entity.BranchId = branch?.Id;
                entity.Branch = branch;

                await _repository.UpdateAsync(entity);
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

        private async Task<Branch?> ResolveBranchAsync(int? branchId)
        {
            if (!branchId.HasValue) return null;
            var branch = await _branchRepository.GetByIdAsync(branchId.Value);
            if (branch == null || !branch.IsActive)
            {
                throw new System.InvalidOperationException("Seleccione una sucursal activa para el tecnico.");
            }
            return branch;
        }
    }
}

