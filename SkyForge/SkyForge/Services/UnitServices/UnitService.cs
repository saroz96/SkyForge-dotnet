using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Models.UnitModel;
using SkyForge.Services.UnitServices;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SkyForge.Services.UnitServices
{
    public class UnitService : IUnitService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<UnitService> _logger;

        public UnitService(ApplicationDbContext context, ILogger<UnitService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<Unit> CreateUnitAsync(Unit unit)
        {
            try
            {
                // Validate company exists
                var company = await _context.Companies.FindAsync(unit.CompanyId);
                if (company == null)
                {
                    throw new KeyNotFoundException($"Company with ID {unit.CompanyId} not found");
                }

                // Check if unit with same name already exists for this company
                var existingUnit = await _context.Units
                    .FirstOrDefaultAsync(u => u.CompanyId == unit.CompanyId &&
                                              u.Name.ToLower() == unit.Name.ToLower());

                if (existingUnit != null)
                {
                    throw new InvalidOperationException($"Unit '{unit.Name}' already exists for this company");
                }

                // Generate unique number if not provided
                if (!unit.UniqueNumber.HasValue)
                {
                    unit.UniqueNumber = await GenerateUniqueUnitNumberAsync();
                }

                unit.CreatedAt = DateTime.UtcNow;
                unit.UpdatedAt = null;

                _context.Units.Add(unit);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Unit '{UnitName}' (ID: {UnitId}, Unique: {UniqueNumber}) created for company {CompanyId}",
                    unit.Name, unit.Id, unit.UniqueNumber, unit.CompanyId);

                return unit;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating unit '{UnitName}' for company {CompanyId}",
                    unit.Name, unit.CompanyId);
                throw;
            }
        }

        public async Task<Unit> GetUnitByIdAsync(Guid id)
        {
            try
            {
                var unit = await _context.Units
                    .Include(u => u.Company)
                    .FirstOrDefaultAsync(u => u.Id == id);

                if (unit == null)
                {
                    _logger.LogWarning("Unit {UnitId} not found", id);
                }

                return unit;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting unit {UnitId}", id);
                throw;
            }
        }

        public async Task<List<Unit>> GetUnitsByCompanyAsync(Guid companyId)
        {
            try
            {
                var units = await _context.Units
                    .Where(u => u.CompanyId == companyId)
                    .Include(u => u.Company)
                    .OrderBy(u => u.Name)
                    .ToListAsync();

                _logger.LogInformation("Retrieved {Count} units for company {CompanyId}",
                    units.Count, companyId);

                return units;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting units for company {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<Unit> UpdateUnitAsync(Guid id, Unit unit)
        {
            try
            {
                var existingUnit = await _context.Units.FindAsync(id);
                if (existingUnit == null)
                {
                    throw new KeyNotFoundException($"Unit with ID {id} not found");
                }

                // Check if new name conflicts with another unit in the same company
                if (existingUnit.Name.ToLower() != unit.Name.ToLower())
                {
                    var duplicate = await _context.Units
                        .FirstOrDefaultAsync(u => u.CompanyId == existingUnit.CompanyId &&
                                                 u.Id != id &&
                                                 u.Name.ToLower() == unit.Name.ToLower());

                    if (duplicate != null)
                    {
                        throw new InvalidOperationException($"Unit '{unit.Name}' already exists for this company");
                    }
                }

                // Update properties
                existingUnit.Name = unit.Name;
                existingUnit.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation("Unit {UnitId} updated to '{UnitName}'", id, existingUnit.Name);

                return existingUnit;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating unit {UnitId}", id);
                throw;
            }
        }

        public async Task<bool> DeleteUnitAsync(Guid id)
        {
            try
            {
                var unit = await _context.Units.FindAsync(id);
                if (unit == null)
                {
                    _logger.LogWarning("Unit {UnitId} not found for deletion", id);
                    return false;
                }

                _context.Units.Remove(unit);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Unit {UnitId} '{UnitName}' deleted", id, unit.Name);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting unit {UnitId}", id);
                throw;
            }
        }

        public async Task<bool> AddDefaultUnitsAsync(Guid companyId)
        {
            try
            {
                _logger.LogInformation("Adding default units for company {CompanyId}", companyId);

                // Check if company exists
                var company = await _context.Companies.FindAsync(companyId);
                if (company == null)
                {
                    throw new KeyNotFoundException($"Company with ID {companyId} not found");
                }

                // Get existing units to avoid duplicates
                var existingUnits = await _context.Units
                    .Where(u => u.CompanyId == companyId)
                    .Select(u => u.Name.ToLower())
                    .ToListAsync();

                var defaultUnitNames = GetDefaultUnitNames();
                var newUnits = new List<Unit>();
                var now = DateTime.UtcNow;

                // Generate unique numbers for all new units
                var generatedNumbers = new HashSet<int>();
                var random = new Random();

                foreach (var unitName in defaultUnitNames)
                {
                    var lowerName = unitName.ToLower();

                    // Skip if unit already exists
                    if (existingUnits.Contains(lowerName))
                        continue;

                    // Generate unique number for this unit
                    int uniqueNumber;
                    bool isUnique;

                    do
                    {
                        uniqueNumber = random.Next(1000, 10000);
                        isUnique = !generatedNumbers.Contains(uniqueNumber);

                        // Also check if number exists in database
                        if (isUnique)
                        {
                            var existsInDb = await _context.Units
                                .AnyAsync(u => u.UniqueNumber == uniqueNumber);
                            isUnique = !existsInDb;
                        }

                    } while (!isUnique);

                    var unit = new Unit
                    {
                        Name = unitName,
                        CompanyId = companyId,
                        UniqueNumber = uniqueNumber,
                        CreatedAt = now
                    };

                    newUnits.Add(unit);
                    generatedNumbers.Add(uniqueNumber);
                    existingUnits.Add(lowerName);
                }

                if (newUnits.Any())
                {
                    _context.Units.AddRange(newUnits);
                    await _context.SaveChangesAsync();

                    _logger.LogInformation("Added {Count} default units for company {CompanyId}",
                        newUnits.Count, companyId);
                }
                else
                {
                    _logger.LogInformation("All default units already exist for company {CompanyId}", companyId);
                }

                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding default units for company {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<Unit> GetUnitByNameAsync(Guid companyId, string name)
        {
            try
            {
                var unit = await _context.Units
                    .FirstOrDefaultAsync(u => u.CompanyId == companyId &&
                                              u.Name.ToLower() == name.ToLower());

                if (unit == null)
                {
                    _logger.LogDebug("Unit '{UnitName}' not found for company {CompanyId}", name, companyId);
                }

                return unit;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting unit '{UnitName}' for company {CompanyId}", name, companyId);
                throw;
            }
        }

        public async Task<List<Unit>> SearchUnitsAsync(Guid companyId, string searchTerm)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(searchTerm))
                {
                    return await GetUnitsByCompanyAsync(companyId);
                }

                var units = await _context.Units
                    .Where(u => u.CompanyId == companyId &&
                               u.Name.ToLower().Contains(searchTerm.ToLower()))
                    .OrderBy(u => u.Name)
                    .Take(50) // Limit results
                    .ToListAsync();

                _logger.LogInformation("Found {Count} units matching '{SearchTerm}' for company {CompanyId}",
                    units.Count, searchTerm, companyId);

                return units;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error searching units with term '{SearchTerm}' for company {CompanyId}",
                    searchTerm, companyId);
                throw;
            }
        }

        public async Task<Unit> GetOrCreateUnitAsync(Guid companyId, string name)
        {
            try
            {
                var unit = await GetUnitByNameAsync(companyId, name);

                if (unit == null)
                {
                    unit = new Unit
                    {
                        Name = name,
                        CompanyId = companyId,
                        CreatedAt = DateTime.UtcNow
                    };

                    unit = await CreateUnitAsync(unit);
                    _logger.LogInformation("Created unit '{UnitName}' for company {CompanyId}", name, companyId);
                }

                return unit;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting or creating unit '{UnitName}' for company {CompanyId}",
                    name, companyId);
                throw;
            }
        }

        public async Task<bool> BulkCreateUnitsAsync(Guid companyId, List<string> unitNames)
        {
            try
            {
                _logger.LogInformation("Bulk creating {Count} units for company {CompanyId}",
                    unitNames.Count, companyId);

                // Check if company exists
                var company = await _context.Companies.FindAsync(companyId);
                if (company == null)
                {
                    throw new KeyNotFoundException($"Company with ID {companyId} not found");
                }

                var existingUnits = await _context.Units
                    .Where(u => u.CompanyId == companyId)
                    .Select(u => u.Name.ToLower())
                    .ToListAsync();

                var newUnits = new List<Unit>();
                var now = DateTime.UtcNow;

                // Generate unique numbers for all new units
                var generatedNumbers = new HashSet<int>();
                var random = new Random();

                foreach (var unitName in unitNames)
                {
                    if (string.IsNullOrWhiteSpace(unitName))
                        continue;

                    var normalizedName = unitName.Trim();
                    var lowerName = normalizedName.ToLower();

                    // Skip if unit already exists
                    if (existingUnits.Contains(lowerName))
                        continue;

                    // Generate unique number for this unit
                    int uniqueNumber;
                    bool isUnique;

                    do
                    {
                        uniqueNumber = random.Next(1000, 10000);
                        isUnique = !generatedNumbers.Contains(uniqueNumber);

                        // Also check if number exists in database
                        if (isUnique)
                        {
                            var existsInDb = await _context.Units
                                .AnyAsync(u => u.UniqueNumber == uniqueNumber);
                            isUnique = !existsInDb;
                        }

                    } while (!isUnique);

                    var unit = new Unit
                    {
                        Name = normalizedName,
                        CompanyId = companyId,
                        UniqueNumber = uniqueNumber,
                        CreatedAt = now
                    };

                    newUnits.Add(unit);
                    generatedNumbers.Add(uniqueNumber);
                    existingUnits.Add(lowerName);
                }

                if (newUnits.Any())
                {
                    _context.Units.AddRange(newUnits);
                    await _context.SaveChangesAsync();

                    _logger.LogInformation("Successfully created {Count} new units for company {CompanyId}",
                        newUnits.Count, companyId);
                }
                else
                {
                    _logger.LogInformation("No new units to create for company {CompanyId}", companyId);
                }

                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error bulk creating units for company {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<int> GenerateUniqueUnitNumberAsync()
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

                    // Check if number already exists for any unit
                    isUnique = !await _context.Units
                        .AnyAsync(u => u.UniqueNumber == uniqueNumber);

                } while (!isUnique);

                _logger.LogDebug("Generated unique unit number: {UniqueNumber}", uniqueNumber);
                return uniqueNumber;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating unique unit number");
                throw;
            }
        }

        public List<string> GetDefaultUnitNames()
        {
            // Matching your React frontend default units
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

        // Additional helper methods (not in interface but useful internally)

        public async Task<List<Unit>> GetCommonUnitsAsync(Guid companyId)
        {
            try
            {
                var commonUnitNames = new List<string> { "Pcs", "Units", "Kgs.", "Gms.", "Box", "Bott" };
                var units = new List<Unit>();

                foreach (var unitName in commonUnitNames)
                {
                    var unit = await GetUnitByNameAsync(companyId, unitName);
                    if (unit != null)
                    {
                        units.Add(unit);
                    }
                }

                return units;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting common units for company {CompanyId}", companyId);
                throw;
            }
        }

        // Get units grouped by type/category (optional enhancement)
        public async Task<Dictionary<string, List<Unit>>> GetUnitsGroupedByTypeAsync(Guid companyId)
        {
            try
            {
                var allUnits = await GetUnitsByCompanyAsync(companyId);
                var groupedUnits = new Dictionary<string, List<Unit>>();

                // Simple grouping logic - can be enhanced based on your business rules
                foreach (var unit in allUnits)
                {
                    var type = GetUnitType(unit.Name);

                    if (!groupedUnits.ContainsKey(type))
                    {
                        groupedUnits[type] = new List<Unit>();
                    }

                    groupedUnits[type].Add(unit);
                }

                return groupedUnits;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error grouping units for company {CompanyId}", companyId);
                throw;
            }
        }

        private string GetUnitType(string unitName)
        {
            // Simple type detection - can be enhanced
            unitName = unitName.ToLower();

            if (unitName.Contains("kg") || unitName.Contains("g") || unitName.Contains("ton"))
                return "Weight";

            if (unitName.Contains("m") || unitName.Contains("cm") || unitName.Contains("mm"))
                return "Length";

            if (unitName.Contains("l") || unitName.Contains("ml"))
                return "Volume";

            if (unitName.Contains("pcs") || unitName.Contains("unit") || unitName.Contains("piece"))
                return "Count";

            return "Other";
        }

        // Validate if unit name is valid (contains only allowed characters)
        public bool IsValidUnitName(string unitName)
        {
            if (string.IsNullOrWhiteSpace(unitName))
                return false;

            // Allow letters, numbers, spaces, dots, and common unit symbols
            return unitName.All(c => char.IsLetterOrDigit(c) || c == ' ' || c == '.' || c == '/');
        }

        // Get unit abbreviation if available
        public string GetUnitAbbreviation(string unitName)
        {
            // Simple abbreviation mapping
            return unitName.ToLower() switch
            {
                "kilograms" or "kgs." => "kg",
                "grams" or "gms." => "g",
                "pieces" or "pcs" => "pc",
                "meters" or "mtr" => "m",
                "liters" => "L",
                "milliliters" => "mL",
                "centimeters" => "cm",
                _ => unitName
            };
        }
    }
}