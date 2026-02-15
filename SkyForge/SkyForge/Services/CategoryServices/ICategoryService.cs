using SkyForge.Models.Retailer.CategoryModel;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace SkyForge.Services.CategoryServices
{
    public interface ICategoryService
    {
        Task<Category> CreateCategoryAsync(Category category);
        Task<Category> GetCategoryByIdAsync(Guid id);
        Task<List<Category>> GetCategoriesByCompanyAsync(Guid companyId);
        Task<Category> UpdateCategoryAsync(Guid id, Category category);
        Task<bool> DeleteCategoryAsync(Guid id);
        Task<bool> AddDefaultCategoryAsync(Guid companyId);
        Task<Category> GetCategoryByNameAsync(Guid companyId, string name);
        Task<List<Category>> SearchCategoriesAsync(Guid companyId, string searchTerm);
        Task<int> GenerateUniqueCategoryNumberAsync();
    }
}