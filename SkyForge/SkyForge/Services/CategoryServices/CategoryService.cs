using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Models.Retailer.CategoryModel;
using SkyForge.Services.CategoryServices;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SkyForge.Services.CategoryServices
{
    public class CategoryService : ICategoryService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<CategoryService> _logger;

        public CategoryService(ApplicationDbContext context, ILogger<CategoryService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<Category> CreateCategoryAsync(Category category)
        {
            try
            {
                // Validate company exists
                var company = await _context.Companies.FindAsync(category.CompanyId);
                if (company == null)
                {
                    throw new KeyNotFoundException($"Company with ID {category.CompanyId} not found");
                }

                // Check if category with same name already exists for this company
                var existingCategory = await _context.Categories
                    .FirstOrDefaultAsync(c => c.CompanyId == category.CompanyId &&
                                              c.Name.ToLower() == category.Name.ToLower());

                if (existingCategory != null)
                {
                    throw new InvalidOperationException($"Category '{category.Name}' already exists for this company");
                }

                // Generate unique number if not provided
                if (!category.UniqueNumber.HasValue)
                {
                    category.UniqueNumber = await GenerateUniqueCategoryNumberAsync();
                }

                category.CreatedAt = DateTime.UtcNow;
                category.UpdatedAt = null;

                _context.Categories.Add(category);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Category '{CategoryName}' (ID: {CategoryId}, Unique: {UniqueNumber}) created for company {CompanyId}",
                    category.Name, category.Id, category.UniqueNumber, category.CompanyId);

                return category;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating category '{CategoryName}' for company {CompanyId}",
                    category.Name, category.CompanyId);
                throw;
            }
        }

        public async Task<Category> GetCategoryByIdAsync(Guid id)
        {
            try
            {
                var category = await _context.Categories
                    .Include(c => c.Company)
                    .FirstOrDefaultAsync(c => c.Id == id);

                if (category == null)
                {
                    _logger.LogWarning("Category {CategoryId} not found", id);
                }

                return category;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting category {CategoryId}", id);
                throw;
            }
        }

        public async Task<List<Category>> GetCategoriesByCompanyAsync(Guid companyId)
        {
            try
            {
                var categories = await _context.Categories
                    .Where(c => c.CompanyId == companyId)
                    .Include(c => c.Company)
                    .OrderBy(c => c.Name)
                    .ToListAsync();

                _logger.LogInformation("Retrieved {Count} categories for company {CompanyId}",
                    categories.Count, companyId);

                return categories;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting categories for company {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<Category> UpdateCategoryAsync(Guid id, Category category)
        {
            try
            {
                var existingCategory = await _context.Categories.FindAsync(id);
                if (existingCategory == null)
                {
                    throw new KeyNotFoundException($"Category with ID {id} not found");
                }

                // Check if new name conflicts with another category in the same company
                if (existingCategory.Name.ToLower() != category.Name.ToLower())
                {
                    var duplicate = await _context.Categories
                        .FirstOrDefaultAsync(c => c.CompanyId == existingCategory.CompanyId &&
                                                 c.Id != id &&
                                                 c.Name.ToLower() == category.Name.ToLower());

                    if (duplicate != null)
                    {
                        throw new InvalidOperationException($"Category '{category.Name}' already exists for this company");
                    }
                }

                // Update properties
                existingCategory.Name = category.Name;
                existingCategory.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation("Category {CategoryId} updated to '{CategoryName}'", id, existingCategory.Name);

                return existingCategory;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating category {CategoryId}", id);
                throw;
            }
        }

        public async Task<bool> DeleteCategoryAsync(Guid id)
        {
            try
            {
                var category = await _context.Categories.FindAsync(id);
                if (category == null)
                {
                    _logger.LogWarning("Category {CategoryId} not found for deletion", id);
                    return false;
                }

                _context.Categories.Remove(category);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Category {CategoryId} '{CategoryName}' deleted", id, category.Name);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting category {CategoryId}", id);
                throw;
            }
        }

        public async Task<bool> AddDefaultCategoryAsync(Guid companyId)
        {
            try
            {
                _logger.LogInformation("Adding default category for company {CompanyId}", companyId);

                // Check if company exists
                var company = await _context.Companies.FindAsync(companyId);
                if (company == null)
                {
                    throw new KeyNotFoundException($"Company with ID {companyId} not found");
                }

                // Check if default category already exists for this company
                var existingCategory = await _context.Categories
                    .FirstOrDefaultAsync(c => c.CompanyId == companyId &&
                                              c.Name.ToLower() == "general");

                if (existingCategory != null)
                {
                    _logger.LogInformation("Default category already exists for company {CompanyId}", companyId);
                    return false;
                }

                // Create default category with unique number
                var defaultCategory = new Category
                {
                    Name = "General",
                    CompanyId = companyId,
                    CreatedAt = DateTime.UtcNow
                };

                // Generate unique number for default category
                defaultCategory.UniqueNumber = await GenerateUniqueCategoryNumberAsync();

                _context.Categories.Add(defaultCategory);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Default category 'General' (Unique: {UniqueNumber}) created for company {CompanyId}",
                    defaultCategory.UniqueNumber, companyId);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding default category for company {CompanyId}", companyId);
                throw;
            }
        }
        public async Task<Category> GetCategoryByNameAsync(Guid companyId, string name)
        {
            try
            {
                var category = await _context.Categories
                    .FirstOrDefaultAsync(c => c.CompanyId == companyId &&
                                              c.Name.ToLower() == name.ToLower());

                if (category == null)
                {
                    _logger.LogDebug("Category '{CategoryName}' not found for company {CompanyId}", name, companyId);
                }

                return category;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting category '{CategoryName}' for company {CompanyId}", name, companyId);
                throw;
            }
        }

        public async Task<List<Category>> SearchCategoriesAsync(Guid companyId, string searchTerm)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(searchTerm))
                {
                    return await GetCategoriesByCompanyAsync(companyId);
                }

                var categories = await _context.Categories
                    .Where(c => c.CompanyId == companyId &&
                               c.Name.ToLower().Contains(searchTerm.ToLower()))
                    .OrderBy(c => c.Name)
                    .Take(50) // Limit results
                    .ToListAsync();

                _logger.LogInformation("Found {Count} categories matching '{SearchTerm}' for company {CompanyId}",
                    categories.Count, searchTerm, companyId);

                return categories;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error searching categories with term '{SearchTerm}' for company {CompanyId}",
                    searchTerm, companyId);
                throw;
            }
        }

        // Helper method to get or create category by name
        public async Task<Category> GetOrCreateCategoryAsync(Guid companyId, string name)
        {
            try
            {
                var category = await GetCategoryByNameAsync(companyId, name);

                if (category == null)
                {
                    category = new Category
                    {
                        Name = name,
                        CompanyId = companyId,
                        CreatedAt = DateTime.UtcNow
                    };

                    // Generate unique number
                    category.UniqueNumber = await GenerateUniqueCategoryNumberAsync();

                    category = await CreateCategoryAsync(category);
                    _logger.LogInformation("Created category '{CategoryName}' (Unique: {UniqueNumber}) for company {CompanyId}",
                        name, category.UniqueNumber, companyId);
                }

                return category;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting or creating category '{CategoryName}' for company {CompanyId}",
                    name, companyId);
                throw;
            }
        }

        public async Task<bool> BulkCreateCategoriesAsync(Guid companyId, List<string> categoryNames)
        {
            try
            {
                _logger.LogInformation("Bulk creating {Count} categories for company {CompanyId}",
                    categoryNames.Count, companyId);

                // Check if company exists
                var company = await _context.Companies.FindAsync(companyId);
                if (company == null)
                {
                    throw new KeyNotFoundException($"Company with ID {companyId} not found");
                }

                var existingCategories = await _context.Categories
                    .Where(c => c.CompanyId == companyId)
                    .Select(c => c.Name.ToLower())
                    .ToListAsync();

                var newCategories = new List<Category>();
                var now = DateTime.UtcNow;

                // Generate unique numbers for all new categories
                var generatedNumbers = new HashSet<int>();
                var random = new Random();

                foreach (var categoryName in categoryNames)
                {
                    if (string.IsNullOrWhiteSpace(categoryName))
                        continue;

                    var normalizedName = categoryName.Trim();
                    var lowerName = normalizedName.ToLower();

                    // Skip if category already exists
                    if (existingCategories.Contains(lowerName))
                        continue;

                    // Generate unique number for this category
                    int uniqueNumber;
                    bool isUnique;

                    do
                    {
                        uniqueNumber = random.Next(1000, 10000);
                        isUnique = !generatedNumbers.Contains(uniqueNumber);

                        // Also check if number exists in database
                        if (isUnique)
                        {
                            var existsInDb = await _context.Categories
                                .AnyAsync(c => c.UniqueNumber == uniqueNumber);
                            isUnique = !existsInDb;
                        }

                    } while (!isUnique);

                    var category = new Category
                    {
                        Name = normalizedName,
                        CompanyId = companyId,
                        UniqueNumber = uniqueNumber,
                        CreatedAt = now
                    };

                    newCategories.Add(category);
                    generatedNumbers.Add(uniqueNumber);
                    existingCategories.Add(lowerName); // Add to list to prevent duplicates in same batch
                }

                if (newCategories.Any())
                {
                    _context.Categories.AddRange(newCategories);
                    await _context.SaveChangesAsync();

                    _logger.LogInformation("Successfully created {Count} new categories for company {CompanyId}",
                        newCategories.Count, companyId);
                }
                else
                {
                    _logger.LogInformation("No new categories to create for company {CompanyId}", companyId);
                }

                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error bulk creating categories for company {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<int> GenerateUniqueCategoryNumberAsync()
        {
            try
            {
                int uniqueNumber;
                bool isUnique;

                do
                {
                    // Generate random 4-digit number (1000-9999)
                    uniqueNumber = new Random().Next(1000, 10000);

                    // Check if number already exists for any category
                    isUnique = !await _context.Categories
                        .AnyAsync(c => c.UniqueNumber == uniqueNumber);

                } while (!isUnique);

                _logger.LogDebug("Generated unique category number: {UniqueNumber}", uniqueNumber);
                return uniqueNumber;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating unique category number");
                throw;
            }
        }
    }
}
