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

        public TechnicianService(IRepository<Technician> repository)
        {
            _repository = repository;
        }

        public async Task<IEnumerable<TechnicianDto>> GetAllAsync(string? search = null)
        {
            var technicians = await _repository.GetAsync(
                predicate: t => string.IsNullOrEmpty(search) ||
                                t.Name.Contains(search) ||
                                (t.Specialty != null && t.Specialty.Contains(search)),
                orderBy: q => q.OrderBy(t => t.Name)
            );

            return technicians.Select(t => new TechnicianDto
            {
                Id = t.Id,
                Name = t.Name,
                Phone = t.Phone,
                Email = t.Email,
                Specialty = t.Specialty
            });
        }

        public async Task<TechnicianDto> GetByIdAsync(int id)
        {
            var t = await _repository.GetByIdAsync(id);
            if (t == null) return null;

            return new TechnicianDto
            {
                Id = t.Id,
                Name = t.Name,
                Phone = t.Phone,
                Email = t.Email,
                Specialty = t.Specialty
            };
        }

        public async Task<TechnicianDto> CreateAsync(CreateTechnicianDto dto)
        {
            var entity = new Technician
            {
                Name = dto.Name,
                Phone = dto.Phone,
                Email = dto.Email,
                Specialty = dto.Specialty,
                IsActive = true
            };

            var created = await _repository.AddAsync(entity);

            return new TechnicianDto
            {
                Id = created.Id,
                Name = created.Name,
                Phone = created.Phone,
                Email = created.Email,
                Specialty = created.Specialty
            };
        }

        public async Task UpdateAsync(int id, CreateTechnicianDto dto)
        {
            var entity = await _repository.GetByIdAsync(id);
            if (entity != null)
            {
                entity.Name = dto.Name;
                entity.Phone = dto.Phone;
                entity.Email = dto.Email;
                entity.Specialty = dto.Specialty;

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
    }
}

