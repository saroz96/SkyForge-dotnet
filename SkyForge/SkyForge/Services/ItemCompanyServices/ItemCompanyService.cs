
using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Models.Retailer.ItemCompanyModel;
using SkyForge.Services.ItemCompanyServices;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SkyForge.Services.ItemCompanyServices
{
    public class ItemCompanyService : IItemCompanyService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<ItemCompanyService> _logger;

        public ItemCompanyService(ApplicationDbContext context, ILogger<ItemCompanyService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<ItemCompany> CreateItemCompanyAsync(ItemCompany itemCompany)
        {
            try
            {
                // Validate company exists
                var company = await _context.Companies.FindAsync(itemCompany.CompanyId);
                if (company == null)
                {
                    throw new KeyNotFoundException($"Company with ID {itemCompany.CompanyId} not found");
                }

                // Check if item company with same name already exists for this company
                var existingItemCompany = await _context.ItemCompanies
                    .FirstOrDefaultAsync(ic => ic.CompanyId == itemCompany.CompanyId &&
                                               ic.Name.ToLower() == itemCompany.Name.ToLower());

                if (existingItemCompany != null)
                {
                    throw new InvalidOperationException($"Item company '{itemCompany.Name}' already exists for this company");
                }

                // Generate unique number if not provided
                if (!itemCompany.UniqueNumber.HasValue)
                {
                    itemCompany.UniqueNumber = await GenerateUniqueItemCompanyNumberAsync();
                }

                itemCompany.CreatedAt = DateTime.UtcNow;
                itemCompany.UpdatedAt = null;

                _context.ItemCompanies.Add(itemCompany);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Item company '{ItemCompanyName}' (ID: {ItemCompanyId}, Unique: {UniqueNumber}) created for company {CompanyId}",
                    itemCompany.Name, itemCompany.Id, itemCompany.UniqueNumber, itemCompany.CompanyId);

                return itemCompany;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating item company '{ItemCompanyName}' for company {CompanyId}",
                    itemCompany.Name, itemCompany.CompanyId);
                throw;
            }
        }

        public async Task<ItemCompany> GetItemCompanyByIdAsync(Guid id)
        {
            try
            {
                var itemCompany = await _context.ItemCompanies
                    .Include(ic => ic.Company)
                    .FirstOrDefaultAsync(ic => ic.Id == id);

                if (itemCompany == null)
                {
                    _logger.LogWarning("Item company {ItemCompanyId} not found", id);
                }

                return itemCompany;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting item company {ItemCompanyId}", id);
                throw;
            }
        }

        public async Task<List<ItemCompany>> GetItemCompaniesByCompanyAsync(Guid companyId)
        {
            try
            {
                var itemCompanies = await _context.ItemCompanies
                    .Where(ic => ic.CompanyId == companyId)
                    .Include(ic => ic.Company)
                    .OrderBy(ic => ic.Name)
                    .ToListAsync();

                _logger.LogInformation("Retrieved {Count} item companies for company {CompanyId}",
                    itemCompanies.Count, companyId);

                return itemCompanies;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting item companies for company {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<ItemCompany> UpdateItemCompanyAsync(Guid id, ItemCompany itemCompany)
        {
            try
            {
                var existingItemCompany = await _context.ItemCompanies.FindAsync(id);
                if (existingItemCompany == null)
                {
                    throw new KeyNotFoundException($"Item company with ID {id} not found");
                }

                // Check if new name conflicts with another item company in the same company
                if (existingItemCompany.Name.ToLower() != itemCompany.Name.ToLower())
                {
                    var duplicate = await _context.ItemCompanies
                        .FirstOrDefaultAsync(ic => ic.CompanyId == existingItemCompany.CompanyId &&
                                                  ic.Id != id &&
                                                  ic.Name.ToLower() == itemCompany.Name.ToLower());

                    if (duplicate != null)
                    {
                        throw new InvalidOperationException($"Item company '{itemCompany.Name}' already exists for this company");
                    }
                }

                // Update properties
                existingItemCompany.Name = itemCompany.Name;
                existingItemCompany.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation("Item company {ItemCompanyId} updated to '{ItemCompanyName}'",
                    id, existingItemCompany.Name);

                return existingItemCompany;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating item company {ItemCompanyId}", id);
                throw;
            }
        }

        public async Task<bool> DeleteItemCompanyAsync(Guid id)
        {
            try
            {
                var itemCompany = await _context.ItemCompanies.FindAsync(id);
                if (itemCompany == null)
                {
                    _logger.LogWarning("Item company {ItemCompanyId} not found for deletion", id);
                    return false;
                }
                
                _context.ItemCompanies.Remove(itemCompany);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Item company {ItemCompanyId} '{ItemCompanyName}' deleted",
                    id, itemCompany.Name);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting item company {ItemCompanyId}", id);
                throw;
            }
        }

        public async Task<bool> AddDefaultItemCompanyAsync(Guid companyId)
        {
            try
            {
                _logger.LogInformation("Adding default item company for company {CompanyId}", companyId);

                // Check if company exists
                var company = await _context.Companies.FindAsync(companyId);
                if (company == null)
                {
                    throw new KeyNotFoundException($"Company with ID {companyId} not found");
                }

                // Check if default item company already exists for this company
                var existingItemCompany = await _context.ItemCompanies
                    .FirstOrDefaultAsync(ic => ic.CompanyId == companyId &&
                                               ic.Name.ToLower() == "general");

                if (existingItemCompany != null)
                {
                    _logger.LogInformation("Default item company already exists for company {CompanyId}", companyId);
                    return false;
                }

                // Create default item company with unique number
                var defaultItemCompany = new ItemCompany
                {
                    Name = "General",
                    CompanyId = companyId,
                    CreatedAt = DateTime.UtcNow
                };

                // Generate unique number for default item company
                defaultItemCompany.UniqueNumber = await GenerateUniqueItemCompanyNumberAsync();

                _context.ItemCompanies.Add(defaultItemCompany);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Default item company 'General' (Unique: {UniqueNumber}) created for company {CompanyId}",
                    defaultItemCompany.UniqueNumber, companyId);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding default item company for company {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<ItemCompany> GetItemCompanyByNameAsync(Guid companyId, string name)
        {
            try
            {
                var itemCompany = await _context.ItemCompanies
                    .FirstOrDefaultAsync(ic => ic.CompanyId == companyId &&
                                               ic.Name.ToLower() == name.ToLower());

                if (itemCompany == null)
                {
                    _logger.LogDebug("Item company '{ItemCompanyName}' not found for company {CompanyId}",
                        name, companyId);
                }

                return itemCompany;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting item company '{ItemCompanyName}' for company {CompanyId}",
                    name, companyId);
                throw;
            }
        }

        public async Task<List<ItemCompany>> SearchItemCompaniesAsync(Guid companyId, string searchTerm)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(searchTerm))
                {
                    return await GetItemCompaniesByCompanyAsync(companyId);
                }

                var itemCompanies = await _context.ItemCompanies
                    .Where(ic => ic.CompanyId == companyId &&
                                ic.Name.ToLower().Contains(searchTerm.ToLower()))
                    .OrderBy(ic => ic.Name)
                    .Take(50) // Limit results
                    .ToListAsync();

                _logger.LogInformation("Found {Count} item companies matching '{SearchTerm}' for company {CompanyId}",
                    itemCompanies.Count, searchTerm, companyId);

                return itemCompanies;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error searching item companies with term '{SearchTerm}' for company {CompanyId}",
                    searchTerm, companyId);
                throw;
            }
        }

        public async Task<ItemCompany> GetOrCreateItemCompanyAsync(Guid companyId, string name)
        {
            try
            {
                var itemCompany = await GetItemCompanyByNameAsync(companyId, name);

                if (itemCompany == null)
                {
                    itemCompany = new ItemCompany
                    {
                        Name = name,
                        CompanyId = companyId,
                        CreatedAt = DateTime.UtcNow
                    };

                    // Generate unique number
                    itemCompany.UniqueNumber = await GenerateUniqueItemCompanyNumberAsync();

                    itemCompany = await CreateItemCompanyAsync(itemCompany);
                    _logger.LogInformation("Created item company '{ItemCompanyName}' (Unique: {UniqueNumber}) for company {CompanyId}",
                        name, itemCompany.UniqueNumber, companyId);
                }

                return itemCompany;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting or creating item company '{ItemCompanyName}' for company {CompanyId}",
                    name, companyId);
                throw;
            }
        }

        public async Task<bool> BulkCreateItemCompaniesAsync(Guid companyId, List<string> companyNames)
        {
            try
            {
                _logger.LogInformation("Bulk creating {Count} item companies for company {CompanyId}",
                    companyNames.Count, companyId);

                // Check if company exists
                var company = await _context.Companies.FindAsync(companyId);
                if (company == null)
                {
                    throw new KeyNotFoundException($"Company with ID {companyId} not found");
                }

                var existingItemCompanies = await _context.ItemCompanies
                    .Where(ic => ic.CompanyId == companyId)
                    .Select(ic => ic.Name.ToLower())
                    .ToListAsync();

                var newItemCompanies = new List<ItemCompany>();
                var now = DateTime.UtcNow;

                // Generate unique numbers for all new item companies
                var generatedNumbers = new HashSet<int>();
                var random = new Random();

                foreach (var companyName in companyNames)
                {
                    if (string.IsNullOrWhiteSpace(companyName))
                        continue;

                    var normalizedName = companyName.Trim();
                    var lowerName = normalizedName.ToLower();

                    // Skip if item company already exists
                    if (existingItemCompanies.Contains(lowerName))
                        continue;

                    // Generate unique number for this item company
                    int uniqueNumber;
                    bool isUnique;

                    do
                    {
                        uniqueNumber = random.Next(1000, 10000);
                        isUnique = !generatedNumbers.Contains(uniqueNumber);

                        // Also check if number exists in database
                        if (isUnique)
                        {
                            var existsInDb = await _context.ItemCompanies
                                .AnyAsync(ic => ic.UniqueNumber == uniqueNumber);
                            isUnique = !existsInDb;
                        }

                    } while (!isUnique);

                    var itemCompany = new ItemCompany
                    {
                        Name = normalizedName,
                        CompanyId = companyId,
                        UniqueNumber = uniqueNumber,
                        CreatedAt = now
                    };

                    newItemCompanies.Add(itemCompany);
                    generatedNumbers.Add(uniqueNumber);
                    existingItemCompanies.Add(lowerName); // Add to list to prevent duplicates in same batch
                }

                if (newItemCompanies.Any())
                {
                    _context.ItemCompanies.AddRange(newItemCompanies);
                    await _context.SaveChangesAsync();

                    _logger.LogInformation("Successfully created {Count} new item companies for company {CompanyId}",
                        newItemCompanies.Count, companyId);
                }
                else
                {
                    _logger.LogInformation("No new item companies to create for company {CompanyId}", companyId);
                }

                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error bulk creating item companies for company {CompanyId}", companyId);
                throw;
            }
        }

        public List<string> GetDefaultItemCompanyNames()
        {
            return new List<string>
            {
                "General",
                "Local",
                "Imported",
                "Wholesale",
                "Manufacturer",
                "Distributor",
                "Supplier",
                "Branded",
                "Unbranded"
            };
        }

        // Method to add multiple default item companies
        public async Task<bool> AddMultipleDefaultItemCompaniesAsync(Guid companyId)
        {
            try
            {
                var defaultNames = GetDefaultItemCompanyNames();
                return await BulkCreateItemCompaniesAsync(companyId, defaultNames);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding multiple default item companies for company {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<int> GenerateUniqueItemCompanyNumberAsync()
        {
            try
            {
                int uniqueNumber;
                bool isUnique;
                var random = new Random();

                do
                {
                    // Generate random 4-digit number (1000-9999)
                    uniqueNumber = random.Next(1000, 10000);

                    // Check if number already exists for any item company
                    isUnique = !await _context.ItemCompanies
                        .AnyAsync(ic => ic.UniqueNumber == uniqueNumber);

                } while (!isUnique);

                _logger.LogDebug("Generated unique item company number: {UniqueNumber}", uniqueNumber);
                return uniqueNumber;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating unique item company number");
                throw;
            }
        }
    }
}
