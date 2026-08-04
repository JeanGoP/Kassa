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
        private readonly IRepository<WorkshopManager> _workshopManagerRepository;
        private readonly IRepository<Brand> _brandRepository;
        private readonly IUserService _userService;

        public BranchService(
            IRepository<Branch> branchRepository,
            IRepository<WorkshopManager> workshopManagerRepository,
            IRepository<Brand> brandRepository,
            IUserService userService)
        {
            _branchRepository = branchRepository;
            _workshopManagerRepository = workshopManagerRepository;
            _brandRepository = brandRepository;
            _userService = userService;
        }

        public async Task<IEnumerable<BranchDto>> GetAllAsync()
        {
            var branches = await _branchRepository.GetAsync(
                orderBy: q => q.OrderBy(b => b.Name),
                includeString: "WorkshopManager,MainBrand"
            );
            return branches.Select(MapToDto);
        }

        public async Task<BranchDto> GetByIdAsync(int id)
        {
            var branch = (await _branchRepository.GetAsync(
                predicate: b => b.Id == id,
                includeString: "WorkshopManager,MainBrand"
            )).FirstOrDefault();
            return branch == null ? null : MapToDto(branch);
        }

        public async Task<BranchDto> GetCurrentForUserAsync(string userId)
        {
            var branchId = await _userService.GetUserBranchIdAsync(userId);
            if (!branchId.HasValue) return null;

            var branch = (await _branchRepository.GetAsync(
                predicate: b => b.Id == branchId.Value,
                includeString: "WorkshopManager,MainBrand"
            )).FirstOrDefault();

            return branch == null ? null : MapToDto(branch);
        }

        public async Task<BranchDto> CreateAsync(CreateBranchDto dto)
        {
            var manager = await ResolveWorkshopManagerAsync(dto.WorkshopManagerId);
            var mainBrand = await ResolveBrandAsync(dto.MainBrandId);
            var branch = new Branch
            {
                Name = dto.Name,
                Address = dto.Address,
                Phone = dto.Phone,
                Email = dto.Email,
                ManagerName = manager?.Name ?? dto.ManagerName,
                WorkshopManagerId = manager?.Id,
                Department = dto.Department,
                City = dto.City,
                MainBrandId = mainBrand?.Id,
                MainBrand = mainBrand
            };

            await _branchRepository.AddAsync(branch);
            return MapToDto(branch);
        }

        public async Task UpdateAsync(int id, CreateBranchDto dto)
        {
            var branch = await _branchRepository.GetByIdAsync(id);
            if (branch == null) throw new Exception("Branch not found");
            var manager = await ResolveWorkshopManagerAsync(dto.WorkshopManagerId);
            var mainBrand = await ResolveBrandAsync(dto.MainBrandId);

            branch.Name = dto.Name;
            branch.Address = dto.Address;
            branch.Phone = dto.Phone;
            branch.Email = dto.Email;
            branch.ManagerName = manager?.Name ?? dto.ManagerName;
            branch.WorkshopManagerId = manager?.Id;
            branch.Department = dto.Department;
            branch.City = dto.City;
            branch.MainBrandId = mainBrand?.Id;
            branch.MainBrand = mainBrand;

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
            var workshopManagerName = branch.WorkshopManager?.Name ?? branch.ManagerName;
            return new BranchDto
            {
                Id = branch.Id,
                Name = branch.Name,
                Address = branch.Address,
                Phone = branch.Phone,
                Email = branch.Email,
                ManagerName = workshopManagerName,
                WorkshopManagerId = branch.WorkshopManagerId,
                WorkshopManagerName = workshopManagerName,
                Department = branch.Department,
                City = branch.City,
                MainBrandId = branch.MainBrandId,
                MainBrandName = branch.MainBrand?.Name
            };
        }

        private async Task<WorkshopManager> ResolveWorkshopManagerAsync(int? workshopManagerId)
        {
            if (!workshopManagerId.HasValue) return null;

            var manager = (await _workshopManagerRepository.GetAsync(m => m.Id == workshopManagerId.Value))
                .FirstOrDefault();

            if (manager == null)
            {
                throw new Exception("Workshop manager not found");
            }

            return manager;
        }

        private async Task<Brand> ResolveBrandAsync(int? brandId)
        {
            if (!brandId.HasValue) return null;
            var brand = await _brandRepository.GetByIdAsync(brandId.Value);
            if (brand == null || !brand.IsActive)
                throw new InvalidOperationException("Seleccione una marca principal activa.");
            return brand;
        }
    }
}
