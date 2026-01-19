using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using TPV.Application.DTOs;
using TPV.Application.Interfaces;
using TPV.Domain.Entities;
using TPV.Domain.Interfaces;

namespace TPV.Application.Services
{
    public class CategoryService : ICategoryService
    {
        private readonly IRepository<Category> _categoryRepository;

        public CategoryService(IRepository<Category> categoryRepository)
        {
            _categoryRepository = categoryRepository;
        }

        public async Task<IEnumerable<CategoryDto>> GetAllAsync()
        {
            var categories = await _categoryRepository.GetAllAsync();
            var ordered = categories
                .OrderBy(c => c.Level)
                .ThenBy(c => c.Name)
                .ToList();

            return ordered.Select(c => new CategoryDto
            {
                Id = c.Id,
                Name = c.Name,
                Description = c.Description,
                IsPrimary = c.IsPrimary,
                Level = c.Level,
                ParentId = c.ParentId,
                ParentName = c.Parent != null ? c.Parent.Name : null
            });
        }

        public async Task<CategoryDto> GetByIdAsync(int id)
        {
            var categories = await _categoryRepository.GetAsync(c => c.Id == id, null, "Parent");
            var category = categories.FirstOrDefault();
            if (category == null) return null;

            return new CategoryDto
            {
                Id = category.Id,
                Name = category.Name,
                Description = category.Description,
                IsPrimary = category.IsPrimary,
                Level = category.Level,
                ParentId = category.ParentId,
                ParentName = category.Parent != null ? category.Parent.Name : null
            };
        }

        public async Task<CategoryDto> CreateAsync(CreateCategoryDto dto)
        {
            var category = new Category();
            await ApplyHierarchyAsync(category, dto);

            var created = await _categoryRepository.AddAsync(category);

            return new CategoryDto
            {
                Id = created.Id,
                Name = created.Name,
                Description = created.Description,
                IsPrimary = created.IsPrimary,
                Level = created.Level,
                ParentId = created.ParentId,
                ParentName = null
            };
        }

        public async Task UpdateAsync(int id, CreateCategoryDto dto)
        {
            var category = await _categoryRepository.GetByIdAsync(id);
            if (category != null)
            {
                await ApplyHierarchyAsync(category, dto);
                await _categoryRepository.UpdateAsync(category);
            }
        }

        public async Task DeleteAsync(int id)
        {
            var category = await _categoryRepository.GetByIdAsync(id);
            if (category != null)
            {
                var children = await _categoryRepository.GetAsync(c => c.ParentId == id);
                if (children.Any())
                {
                    throw new System.InvalidOperationException("No se puede eliminar una categoría que tiene subcategorías.");
                }

                await _categoryRepository.DeleteAsync(category);
            }
        }

        private async Task ApplyHierarchyAsync(Category category, CreateCategoryDto dto)
        {
            category.Name = dto.Name;
            category.Description = dto.Description;
            category.IsPrimary = dto.IsPrimary;
            category.IsActive = true;

            if (dto.ParentId.HasValue)
            {
                if (category.Id != 0 && dto.ParentId.Value == category.Id)
                {
                    throw new System.InvalidOperationException("Una categoría no puede ser su propio padre.");
                }

                var parent = await _categoryRepository.GetByIdAsync(dto.ParentId.Value);
                if (parent == null)
                {
                    throw new System.InvalidOperationException("La categoría padre no existe.");
                }

                if (category.Id != 0)
                {
                    var currentId = parent.ParentId;
                    while (currentId.HasValue)
                    {
                        if (currentId.Value == category.Id)
                        {
                            throw new System.InvalidOperationException("No se pueden crear ciclos en la jerarquía de categorías.");
                        }

                        var ancestor = await _categoryRepository.GetByIdAsync(currentId.Value);
                        currentId = ancestor?.ParentId;
                    }
                }

                var level = parent.Level + 1;
                if (level > 5)
                {
                    throw new System.InvalidOperationException("Solo se permiten hasta 5 niveles de categorías.");
                }

                category.ParentId = dto.ParentId;
                category.Level = level;
            }
            else
            {
                category.ParentId = null;
                category.Level = 1;
            }
        }
    }
}
