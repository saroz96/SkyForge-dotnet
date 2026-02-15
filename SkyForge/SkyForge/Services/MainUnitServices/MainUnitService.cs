using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Models.Retailer.MainUnitModel;
using SkyForge.Services.MainUnitServices;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SkyForge.Services.MainUnitServices
{
    public class MainUnitService : IMainUnitService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<MainUnitService> _logger;

        public MainUnitService(ApplicationDbContext context, ILogger<MainUnitService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<MainUnit> CreateMainUnitAsync(MainUnit mainUnit)
        {
            try
            {
                // Validate company exists
                var company = await _context.Companies.FindAsync(mainUnit.CompanyId);
                if (company == null)
                {
                    throw new KeyNotFoundException($"Company with ID {mainUnit.CompanyId} not found");
                }

                // Check if main unit with same name already exists for this company
                var existingMainUnit = await _context.MainUnits
                    .FirstOrDefaultAsync(mu => mu.CompanyId == mainUnit.CompanyId &&
                                               mu.Name.ToLower() == mainUnit.Name.ToLower());

                if (existingMainUnit != null)
                {
                    throw new InvalidOperationException($"Main unit '{mainUnit.Name}' already exists for this company");
                }

                // Generate unique number if not provided
                if (!mainUnit.UniqueNumber.HasValue)
                {
                    mainUnit.UniqueNumber = await GenerateUniqueMainUnitNumberAsync();
                }

                mainUnit.CreatedAt = DateTime.UtcNow;
                mainUnit.UpdatedAt = null;

                _context.MainUnits.Add(mainUnit);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Main unit '{MainUnitName}' (ID: {MainUnitId}, Unique: {UniqueNumber}) created for company {CompanyId}",
                    mainUnit.Name, mainUnit.Id, mainUnit.UniqueNumber, mainUnit.CompanyId);

                return mainUnit;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating main unit '{MainUnitName}' for company {CompanyId}",
                    mainUnit.Name, mainUnit.CompanyId);
                throw;
            }
        }

        public async Task<MainUnit> GetMainUnitByIdAsync(Guid id)
        {
            try
            {
                var mainUnit = await _context.MainUnits
                    .Include(mu => mu.Company)
                    .FirstOrDefaultAsync(mu => mu.Id == id);

                if (mainUnit == null)
                {
                    _logger.LogWarning("Main unit {MainUnitId} not found", id);
                }

                return mainUnit;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting main unit {MainUnitId}", id);
                throw;
            }
        }

        public async Task<List<MainUnit>> GetMainUnitsByCompanyAsync(Guid companyId)
        {
            try
            {
                var mainUnits = await _context.MainUnits
                    .Where(mu => mu.CompanyId == companyId)
                    .Include(mu => mu.Company)
                    .OrderBy(mu => mu.Name)
                    .ToListAsync();

                _logger.LogInformation("Retrieved {Count} main units for company {CompanyId}",
                    mainUnits.Count, companyId);

                return mainUnits;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting main units for company {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<MainUnit> UpdateMainUnitAsync(Guid id, MainUnit mainUnit)
        {
            try
            {
                var existingMainUnit = await _context.MainUnits.FindAsync(id);
                if (existingMainUnit == null)
                {
                    throw new KeyNotFoundException($"Main unit with ID {id} not found");
                }

                // Check if new name conflicts with another main unit in the same company
                if (existingMainUnit.Name.ToLower() != mainUnit.Name.ToLower())
                {
                    var duplicate = await _context.MainUnits
                        .FirstOrDefaultAsync(mu => mu.CompanyId == existingMainUnit.CompanyId &&
                                                  mu.Id != id &&
                                                  mu.Name.ToLower() == mainUnit.Name.ToLower());

                    if (duplicate != null)
                    {
                        throw new InvalidOperationException($"Main unit '{mainUnit.Name}' already exists for this company");
                    }
                }

                // Update properties
                existingMainUnit.Name = mainUnit.Name;
                existingMainUnit.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation("Main unit {MainUnitId} updated to '{MainUnitName}'",
                    id, existingMainUnit.Name);

                return existingMainUnit;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating main unit {MainUnitId}", id);
                throw;
            }
        }

        public async Task<bool> DeleteMainUnitAsync(Guid id)
        {
            try
            {
                var mainUnit = await _context.MainUnits.FindAsync(id);
                if (mainUnit == null)
                {
                    _logger.LogWarning("Main unit {MainUnitId} not found for deletion", id);
                    return false;
                }

                _context.MainUnits.Remove(mainUnit);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Main unit {MainUnitId} '{MainUnitName}' deleted",
                    id, mainUnit.Name);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting main unit {MainUnitId}", id);
                throw;
            }
        }

        public async Task<bool> AddDefaultMainUnitsAsync(Guid companyId)
        {
            try
            {
                _logger.LogInformation("Adding default main units for company {CompanyId}", companyId);

                // Check if company exists
                var company = await _context.Companies.FindAsync(companyId);
                if (company == null)
                {
                    throw new KeyNotFoundException($"Company with ID {companyId} not found");
                }

                // Get existing main units to avoid duplicates
                var existingMainUnits = await _context.MainUnits
                    .Where(mu => mu.CompanyId == companyId)
                    .Select(mu => mu.Name.ToLower())
                    .ToListAsync();

                var defaultMainUnitNames = GetDefaultMainUnitNames();
                var newMainUnits = new List<MainUnit>();
                var now = DateTime.UtcNow;

                // Generate unique numbers for all new main units
                var generatedNumbers = new HashSet<int>();
                var random = new Random();

                foreach (var mainUnitName in defaultMainUnitNames)
                {
                    var lowerName = mainUnitName.ToLower();

                    // Skip if main unit already exists
                    if (existingMainUnits.Contains(lowerName))
                        continue;

                    // Generate unique number for this main unit
                    int uniqueNumber;
                    bool isUnique;

                    do
                    {
                        uniqueNumber = random.Next(1000, 10000);
                        isUnique = !generatedNumbers.Contains(uniqueNumber);

                        // Also check if number exists in database
                        if (isUnique)
                        {
                            var existsInDb = await _context.MainUnits
                                .AnyAsync(mu => mu.UniqueNumber == uniqueNumber);
                            isUnique = !existsInDb;
                        }

                    } while (!isUnique);

                    var mainUnit = new MainUnit
                    {
                        Name = mainUnitName,
                        CompanyId = companyId,
                        UniqueNumber = uniqueNumber,
                        CreatedAt = now
                    };

                    newMainUnits.Add(mainUnit);
                    generatedNumbers.Add(uniqueNumber);
                    existingMainUnits.Add(lowerName);
                }

                if (newMainUnits.Any())
                {
                    _context.MainUnits.AddRange(newMainUnits);
                    await _context.SaveChangesAsync();

                    _logger.LogInformation("Added {Count} default main units for company {CompanyId}",
                        newMainUnits.Count, companyId);
                }
                else
                {
                    _logger.LogInformation("All default main units already exist for company {CompanyId}", companyId);
                }

                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding default main units for company {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<MainUnit> GetMainUnitByNameAsync(Guid companyId, string name)
        {
            try
            {
                var mainUnit = await _context.MainUnits
                    .FirstOrDefaultAsync(mu => mu.CompanyId == companyId &&
                                               mu.Name.ToLower() == name.ToLower());

                if (mainUnit == null)
                {
                    _logger.LogDebug("Main unit '{MainUnitName}' not found for company {CompanyId}", name, companyId);
                }

                return mainUnit;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting main unit '{MainUnitName}' for company {CompanyId}", name, companyId);
                throw;
            }
        }

        public async Task<List<MainUnit>> SearchMainUnitsAsync(Guid companyId, string searchTerm)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(searchTerm))
                {
                    return await GetMainUnitsByCompanyAsync(companyId);
                }

                var mainUnits = await _context.MainUnits
                    .Where(mu => mu.CompanyId == companyId &&
                                mu.Name.ToLower().Contains(searchTerm.ToLower()))
                    .OrderBy(mu => mu.Name)
                    .Take(50)
                    .ToListAsync();

                _logger.LogInformation("Found {Count} main units matching '{SearchTerm}' for company {CompanyId}",
                    mainUnits.Count, searchTerm, companyId);

                return mainUnits;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error searching main units with term '{SearchTerm}' for company {CompanyId}",
                    searchTerm, companyId);
                throw;
            }
        }

        public async Task<MainUnit> GetOrCreateMainUnitAsync(Guid companyId, string name)
        {
            try
            {
                var mainUnit = await GetMainUnitByNameAsync(companyId, name);

                if (mainUnit == null)
                {
                    mainUnit = new MainUnit
                    {
                        Name = name,
                        CompanyId = companyId,
                        CreatedAt = DateTime.UtcNow
                    };

                    mainUnit = await CreateMainUnitAsync(mainUnit);
                    _logger.LogInformation("Created main unit '{MainUnitName}' for company {CompanyId}", name, companyId);
                }

                return mainUnit;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting or creating main unit '{MainUnitName}' for company {CompanyId}",
                    name, companyId);
                throw;
            }
        }

        public async Task<bool> BulkCreateMainUnitsAsync(Guid companyId, List<string> mainUnitNames)
        {
            try
            {
                _logger.LogInformation("Bulk creating {Count} main units for company {CompanyId}",
                    mainUnitNames.Count, companyId);

                // Check if company exists
                var company = await _context.Companies.FindAsync(companyId);
                if (company == null)
                {
                    throw new KeyNotFoundException($"Company with ID {companyId} not found");
                }

                var existingMainUnits = await _context.MainUnits
                    .Where(mu => mu.CompanyId == companyId)
                    .Select(mu => mu.Name.ToLower())
                    .ToListAsync();

                var newMainUnits = new List<MainUnit>();
                var now = DateTime.UtcNow;

                // Generate unique numbers for all new main units
                var generatedNumbers = new HashSet<int>();
                var random = new Random();

                foreach (var mainUnitName in mainUnitNames)
                {
                    if (string.IsNullOrWhiteSpace(mainUnitName))
                        continue;

                    var normalizedName = mainUnitName.Trim();
                    var lowerName = normalizedName.ToLower();

                    // Skip if main unit already exists
                    if (existingMainUnits.Contains(lowerName))
                        continue;

                    // Generate unique number for this main unit
                    int uniqueNumber;
                    bool isUnique;

                    do
                    {
                        uniqueNumber = random.Next(1000, 10000);
                        isUnique = !generatedNumbers.Contains(uniqueNumber);

                        // Also check if number exists in database
                        if (isUnique)
                        {
                            var existsInDb = await _context.MainUnits
                                .AnyAsync(mu => mu.UniqueNumber == uniqueNumber);
                            isUnique = !existsInDb;
                        }

                    } while (!isUnique);

                    var mainUnit = new MainUnit
                    {
                        Name = normalizedName,
                        CompanyId = companyId,
                        UniqueNumber = uniqueNumber,
                        CreatedAt = now
                    };

                    newMainUnits.Add(mainUnit);
                    generatedNumbers.Add(uniqueNumber);
                    existingMainUnits.Add(lowerName);
                }

                if (newMainUnits.Any())
                {
                    _context.MainUnits.AddRange(newMainUnits);
                    await _context.SaveChangesAsync();

                    _logger.LogInformation("Successfully created {Count} new main units for company {CompanyId}",
                        newMainUnits.Count, companyId);
                }
                else
                {
                    _logger.LogInformation("No new main units to create for company {CompanyId}", companyId);
                }

                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error bulk creating main units for company {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<int> GenerateUniqueMainUnitNumberAsync()
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

                    // Check if number already exists for any main unit
                    isUnique = !await _context.MainUnits
                        .AnyAsync(mu => mu.UniqueNumber == uniqueNumber);

                } while (!isUnique);

                _logger.LogDebug("Generated unique main unit number: {UniqueNumber}", uniqueNumber);
                return uniqueNumber;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating unique main unit number");
                throw;
            }
        }

        public List<string> GetDefaultMainUnitNames()
        {
            // Matching your React frontend default main units
            return new List<string>
            {
                "Bott",
                "Box",
                "Dozen",
                "Gms.",
                "Jar",
                "Kgs.",
                "Kit",
                "Test",
                "Mtr",
                "Pair",
                "Pcs",
                "Ph",
                "Pkt",
                "Roll",
                "Set",
                "Than",
                "Tonne",
                "Units"
            };
        }

        public async Task<Dictionary<string, List<MainUnit>>> GetMainUnitsGroupedByCategoryAsync(Guid companyId)
        {
            try
            {
                var allMainUnits = await GetMainUnitsByCompanyAsync(companyId);
                var groupedMainUnits = new Dictionary<string, List<MainUnit>>();

                // Define categories based on unit types
                var categories = new Dictionary<string, List<string>>
                {
                    ["Weight"] = new List<string> { "kgs", "gms", "tonne", "kg", "g", "ton" },
                    ["Length/Distance"] = new List<string> { "mtr", "meter", "cm", "mm", "km" },
                    ["Volume"] = new List<string> { "ltr", "liter", "ml", "bott", "jar" },
                    ["Count/Pieces"] = new List<string> { "pcs", "units", "piece", "unit", "pair", "dozen" },
                    ["Package"] = new List<string> { "box", "kit", "pkt", "roll", "set", "than" },
                    ["Other"] = new List<string> { "test", "ph" }
                };

                // Initialize all categories
                foreach (var category in categories.Keys)
                {
                    groupedMainUnits[category] = new List<MainUnit>();
                }

                // Group main units
                foreach (var mainUnit in allMainUnits)
                {
                    var mainUnitLower = mainUnit.Name.ToLower();
                    var categorized = false;

                    foreach (var category in categories)
                    {
                        if (category.Value.Any(keyword => mainUnitLower.Contains(keyword)))
                        {
                            groupedMainUnits[category.Key].Add(mainUnit);
                            categorized = true;
                            break;
                        }
                    }

                    // If not categorized, add to "Other"
                    if (!categorized)
                    {
                        groupedMainUnits["Other"].Add(mainUnit);
                    }
                }

                // Remove empty categories
                var emptyCategories = groupedMainUnits.Where(kv => !kv.Value.Any()).Select(kv => kv.Key).ToList();
                foreach (var category in emptyCategories)
                {
                    groupedMainUnits.Remove(category);
                }

                _logger.LogInformation("Grouped main units into {Count} categories for company {CompanyId}",
                    groupedMainUnits.Count, companyId);

                return groupedMainUnits;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error grouping main units for company {CompanyId}", companyId);
                throw;
            }
        }
    }
}
