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
    public class BranchService : IBranchService
    {
        private readonly IRepository<Branch> _branchRepository;

        public BranchService(IRepository<Branch> branchRepository)
        {
            _branchRepository = branchRepository;
        }

        public async Task<IEnumerable<BranchDto>> GetAllAsync()
        {
            var branches = await _branchRepository.GetAllAsync();
            return branches.Select(MapToDto);
        }

        public async Task<BranchDto> GetByIdAsync(int id)
        {
            var branch = await _branchRepository.GetByIdAsync(id);
            return branch == null ? null : MapToDto(branch);
        }

        public async Task<BranchDto> CreateAsync(CreateBranchDto dto)
        {
            var branch = new Branch
            {
                Name = dto.Name,
                Address = dto.Address,
                Phone = dto.Phone,
                Email = dto.Email
            };

            await _branchRepository.AddAsync(branch);
            return MapToDto(branch);
        }

        public async Task UpdateAsync(int id, CreateBranchDto dto)
        {
            var branch = await _branchRepository.GetByIdAsync(id);
            if (branch == null) throw new Exception("Branch not found");

            branch.Name = dto.Name;
            branch.Address = dto.Address;
            branch.Phone = dto.Phone;
            branch.Email = dto.Email;

            await _branchRepository.UpdateAsync(branch);
        }

        public async Task DeleteAsync(int id)
        {
            var branch = await _branchRepository.GetByIdAsync(id);
            if (branch == null) throw new Exception("Branch not found");

            await _branchRepository.DeleteAsync(branch);
        }

        private BranchDto MapToDto(Branch branch)
        {
            return new BranchDto
            {
                Id = branch.Id,
                Name = branch.Name,
                Address = branch.Address,
                Phone = branch.Phone,
                Email = branch.Email
            };
        }
    }
}