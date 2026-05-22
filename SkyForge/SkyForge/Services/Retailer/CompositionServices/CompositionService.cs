using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Models.Retailer.CompositionModel;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SkyForge.Services.Retailer.CompositionServices
{
    public class CompositionService : ICompositionService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<CompositionService> _logger;

        public CompositionService(
            ApplicationDbContext context,
            ILogger<CompositionService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<IEnumerable<Composition>> GetCompositionsByCompanyAsync(Guid companyId)
        {
            try
            {
                return await _context.Compositions
                    .Where(c => c.CompanyId == companyId)
                    .Include(c => c.Company)
                    .Include(c => c.ItemCompositions)
                        .ThenInclude(ic => ic.Item)
                    .OrderBy(c => c.Name)
                    .ToListAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting compositions for company {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<Composition> GetCompositionByIdAsync(Guid id)
        {
            try
            {
                return await _context.Compositions
                    .Where(c => c.Id == id)
                    .Include(c => c.Company)
                    .Include(c => c.ItemCompositions)
                        .ThenInclude(ic => ic.Item)
                    .FirstOrDefaultAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting composition by id {Id}", id);
                throw;
            }
        }

        public async Task<Composition> CreateCompositionAsync(Composition composition)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                // Validate company exists
                var company = await _context.Companies.FindAsync(composition.CompanyId);
                if (company == null)
                {
                    throw new KeyNotFoundException($"Company with ID {composition.CompanyId} not found");
                }

                // Handle FiscalYearId if it exists (check if MainUnit has these fields)
                if (composition.FiscalYearId != Guid.Empty)
                {
                    var fiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.Id == composition.FiscalYearId && f.CompanyId == composition.CompanyId);

                    if (fiscalYear != null)
                    {
                        // Set Date and NepaliDate from fiscal year if they are not already set
                        if (composition.Date == default(DateTime))
                        {
                            composition.Date = fiscalYear.StartDate.HasValue
                                ? fiscalYear.StartDate.Value.ToUniversalTime()
                                : DateTime.UtcNow;
                        }

                        if (string.IsNullOrEmpty(composition.NepaliDate))
                        {
                            composition.NepaliDate = !string.IsNullOrEmpty(fiscalYear.StartDateNepali)
                                ? fiscalYear.StartDateNepali
                                : DateTime.UtcNow.ToString("yyyy-MM-dd");
                        }
                    }
                }

                // Handle FiscalYearId if empty
                if (composition.FiscalYearId == Guid.Empty)
                {
                    // If no fiscal year provided, get the active one
                    var activeFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == composition.CompanyId && f.IsActive);

                    if (activeFiscalYear == null)
                    {
                        throw new InvalidOperationException($"No active fiscal year found for company {composition.CompanyId}");
                    }

                    composition.FiscalYearId = activeFiscalYear.Id;
                    composition.OriginalFiscalYearId = activeFiscalYear.Id;

                    // Set Date and NepaliDate from active fiscal year
                    composition.Date = activeFiscalYear.StartDate.HasValue
                        ? activeFiscalYear.StartDate.Value.ToUniversalTime()
                        : DateTime.UtcNow;
                    composition.NepaliDate = !string.IsNullOrEmpty(activeFiscalYear.StartDateNepali)
                        ? activeFiscalYear.StartDateNepali
                        : DateTime.UtcNow.ToString("yyyy-MM-dd");
                }
                else
                {
                    // Verify the provided fiscal year exists and belongs to the company
                    var fiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.Id == composition.FiscalYearId && f.CompanyId == composition.CompanyId);

                    if (fiscalYear == null)
                    {
                        throw new KeyNotFoundException($"Fiscal year {composition.FiscalYearId} not found for company {composition.CompanyId}");
                    }

                    // Also set OriginalFiscalYearId if not set
                    if (composition.OriginalFiscalYearId == Guid.Empty)
                    {
                        composition.OriginalFiscalYearId = composition.FiscalYearId;
                    }

                    // Set Date and NepaliDate from fiscal year if not already set
                    if (composition.Date == default(DateTime))
                    {
                        composition.Date = fiscalYear.StartDate.HasValue
                            ? fiscalYear.StartDate.Value.ToUniversalTime()
                            : DateTime.UtcNow;
                    }

                    if (string.IsNullOrEmpty(composition.NepaliDate))
                    {
                        composition.NepaliDate = !string.IsNullOrEmpty(fiscalYear.StartDateNepali)
                            ? fiscalYear.StartDateNepali
                            : DateTime.UtcNow.ToString("yyyy-MM-dd");
                    }
                }
                // Check if composition name already exists for this company
                var existingComposition = await _context.Compositions
                    .FirstOrDefaultAsync(c =>
                        c.Name.ToLower() == composition.Name.ToLower() &&
                        c.CompanyId == composition.CompanyId);

                if (existingComposition != null)
                {
                    throw new InvalidOperationException($"A composition with the name '{composition.Name}' already exists in this company.");
                }

                // Generate unique number if not provided
                if (composition.UniqueNumber == 0)
                {
                    composition.UniqueNumber = await GenerateUniqueCompositionNumberAsync();
                }

                // Set timestamps
                composition.CreatedAt = DateTime.UtcNow;
                composition.UpdatedAt = DateTime.UtcNow;

                await _context.Compositions.AddAsync(composition);
                await _context.SaveChangesAsync();

                await transaction.CommitAsync();
                return composition;
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<Composition> UpdateCompositionAsync(Guid id, Composition compositionUpdate)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var existingComposition = await _context.Compositions
                    .Include(c => c.ItemCompositions)
                    .FirstOrDefaultAsync(c => c.Id == id);

                if (existingComposition == null)
                {
                    throw new KeyNotFoundException($"Composition with ID {id} not found.");
                }

                // Check if new name already exists for this company (excluding current composition)
                if (!string.IsNullOrEmpty(compositionUpdate.Name) &&
                    compositionUpdate.Name.ToLower() != existingComposition.Name.ToLower())
                {
                    var duplicateComposition = await _context.Compositions
                        .FirstOrDefaultAsync(c =>
                            c.Name.ToLower() == compositionUpdate.Name.ToLower() &&
                            c.CompanyId == existingComposition.CompanyId &&
                            c.Id != id);

                    if (duplicateComposition != null)
                    {
                        throw new InvalidOperationException($"A composition with the name '{compositionUpdate.Name}' already exists in this company.");
                    }

                    existingComposition.Name = compositionUpdate.Name;
                }

                // Update unique number if provided
                if (compositionUpdate.UniqueNumber != 0 &&
                    compositionUpdate.UniqueNumber != existingComposition.UniqueNumber)
                {
                    // Check if unique number already exists
                    var duplicateNumber = await _context.Compositions
                        .FirstOrDefaultAsync(c =>
                            c.UniqueNumber == compositionUpdate.UniqueNumber &&
                            c.Id != id);

                    if (duplicateNumber != null)
                    {
                        throw new InvalidOperationException($"A composition with unique number '{compositionUpdate.UniqueNumber}' already exists.");
                    }

                    existingComposition.UniqueNumber = compositionUpdate.UniqueNumber;
                }

                existingComposition.UpdatedAt = DateTime.UtcNow;

                _context.Compositions.Update(existingComposition);
                await _context.SaveChangesAsync();

                await transaction.CommitAsync();
                return existingComposition;
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<bool> DeleteCompositionAsync(Guid id)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var composition = await _context.Compositions
                    .Include(c => c.ItemCompositions)
                    .FirstOrDefaultAsync(c => c.Id == id);

                if (composition == null)
                {
                    return false;
                }

                // Check if composition has any items
                if (composition.ItemCompositions.Any())
                {
                    throw new InvalidOperationException("Cannot delete composition that has items assigned to it.");
                }

                _context.Compositions.Remove(composition);
                await _context.SaveChangesAsync();

                await transaction.CommitAsync();
                return true;
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<bool> CheckCompositionExistsAsync(string name, Guid companyId)
        {
            try
            {
                return await _context.Compositions
                    .AnyAsync(c =>
                        c.Name.ToLower() == name.ToLower() &&
                        c.CompanyId == companyId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking if composition exists with name {Name} for company {CompanyId}", name, companyId);
                throw;
            }
        }

        public async Task<int> GenerateUniqueCompositionNumberAsync()
        {
            try
            {
                int uniqueNumber;
                bool isUnique;
                var random = new Random();
                var maxAttempts = 100; // Prevent infinite loop

                for (int attempt = 0; attempt < maxAttempts; attempt++)
                {
                    // Generate random 4-digit number (1000-9999)
                    uniqueNumber = random.Next(1000, 10000);

                    // Check if number already exists for any composition
                    isUnique = !await _context.Compositions
                        .AnyAsync(c => c.UniqueNumber == uniqueNumber);

                    if (isUnique)
                    {
                        _logger.LogDebug("Generated unique composition number: {UniqueNumber}", uniqueNumber);
                        return uniqueNumber;
                    }
                }

                // If we couldn't find a unique number in 100 attempts, use sequential
                _logger.LogWarning("Could not generate random unique number, using sequential approach");
                var maxNumber = await _context.Compositions
                    .MaxAsync(c => (int?)c.UniqueNumber) ?? 0;

                return maxNumber + 1;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating unique composition number");
                // Fallback to simple incremental number
                var maxNumber = await _context.Compositions
                    .MaxAsync(c => (int?)c.UniqueNumber) ?? 0;

                return maxNumber + 1;
            }
        }

        public async Task<IEnumerable<Composition>> SearchCompositionsAsync(Guid companyId, string searchTerm)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(searchTerm))
                {
                    return await GetCompositionsByCompanyAsync(companyId);
                }

                return await _context.Compositions
                    .Where(c => c.CompanyId == companyId &&
                                (c.Name.Contains(searchTerm) ||
                                 c.UniqueNumber.ToString().Contains(searchTerm)))
                    .Include(c => c.Company)
                    .Include(c => c.ItemCompositions)
                        .ThenInclude(ic => ic.Item)
                    .OrderBy(c => c.Name)
                    .ToListAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error searching compositions with term {SearchTerm} for company {CompanyId}", searchTerm, companyId);
                throw;
            }
        }

        public async Task<bool> AddItemsToCompositionAsync(Guid compositionId, IEnumerable<Guid> itemIds)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var composition = await _context.Compositions
                    .Include(c => c.ItemCompositions)
                    .FirstOrDefaultAsync(c => c.Id == compositionId);

                if (composition == null)
                {
                    throw new KeyNotFoundException($"Composition with ID {compositionId} not found.");
                }

                var existingItemIds = composition.ItemCompositions
                    .Select(ic => ic.ItemId)
                    .ToHashSet();

                var newItems = itemIds
                    .Where(itemId => !existingItemIds.Contains(itemId))
                    .Select(itemId => new ItemComposition
                    {
                        ItemId = itemId,
                        CompositionId = compositionId,
                        CreatedAt = DateTime.UtcNow
                    });

                await _context.ItemCompositions.AddRangeAsync(newItems);
                composition.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return true;
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<bool> RemoveItemsFromCompositionAsync(Guid compositionId, IEnumerable<Guid> itemIds)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var itemCompositions = await _context.ItemCompositions
                    .Where(ic => ic.CompositionId == compositionId && itemIds.Contains(ic.ItemId))
                    .ToListAsync();

                if (!itemCompositions.Any())
                {
                    return false;
                }

                _context.ItemCompositions.RemoveRange(itemCompositions);

                var composition = await _context.Compositions.FindAsync(compositionId);
                if (composition != null)
                {
                    composition.UpdatedAt = DateTime.UtcNow;
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return true;
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<IEnumerable<Composition>> GetCompositionsWithItemsAsync(Guid companyId)
        {
            try
            {
                return await _context.Compositions
                    .Where(c => c.CompanyId == companyId)
                    .Include(c => c.Company)
                    .Include(c => c.ItemCompositions)
                        .ThenInclude(ic => ic.Item)
                            .ThenInclude(i => i.Unit)
                    .OrderBy(c => c.Name)
                    .ToListAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting compositions with items for company {CompanyId}", companyId);
                throw;
            }
        }

        // Additional helper methods for better unique number generation

        public async Task<int> GenerateBulkUniqueNumbersAsync(int count)
        {
            try
            {
                var random = new Random();
                var generatedNumbers = new HashSet<int>();
                var maxAttempts = count * 10; // Allow some retries

                for (int i = 0; i < count; i++)
                {
                    int uniqueNumber;
                    bool isUnique;
                    int attempts = 0;

                    do
                    {
                        uniqueNumber = random.Next(1000, 10000);
                        isUnique = !generatedNumbers.Contains(uniqueNumber);

                        // Also check if number exists in database
                        if (isUnique)
                        {
                            var existsInDb = await _context.Compositions
                                .AnyAsync(c => c.UniqueNumber == uniqueNumber);
                            isUnique = !existsInDb;
                        }

                        attempts++;
                        if (attempts > maxAttempts / count)
                        {
                            _logger.LogWarning("Could not find unique number after {Attempts} attempts", attempts);
                            // Fallback: use sequential
                            var maxNumber = await _context.Compositions
                                .MaxAsync(c => (int?)c.UniqueNumber) ?? 0;
                            uniqueNumber = maxNumber + i + 1;
                            isUnique = true;
                        }

                    } while (!isUnique);

                    generatedNumbers.Add(uniqueNumber);
                }

                // Return the first generated number (or any logic you prefer)
                return generatedNumbers.First();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating bulk unique numbers");
                throw;
            }
        }

        public async Task<bool> ValidateUniqueNumberAsync(int uniqueNumber)
        {
            try
            {
                // Check if number is within valid range
                if (uniqueNumber < 1000 || uniqueNumber > 9999)
                {
                    return false;
                }

                // Check if number already exists
                var exists = await _context.Compositions
                    .AnyAsync(c => c.UniqueNumber == uniqueNumber);

                return !exists;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error validating unique number {UniqueNumber}", uniqueNumber);
                throw;
            }
        }

        public async Task<List<int>> GetAvailableUniqueNumbersAsync(int count = 10)
        {
            try
            {
                var random = new Random();
                var availableNumbers = new List<int>();
                var maxAttempts = count * 5;

                // Get all existing unique numbers
                var existingNumbers = await _context.Compositions
                    .Select(c => c.UniqueNumber)
                    .ToListAsync();

                var existingSet = new HashSet<int>(existingNumbers);

                for (int i = 0; i < count; i++)
                {
                    int candidate;
                    int attempts = 0;

                    do
                    {
                        candidate = random.Next(1000, 10000);
                        attempts++;

                        if (attempts > maxAttempts)
                        {
                            _logger.LogWarning("Could not find enough unique numbers");
                            break;
                        }
                    } while (existingSet.Contains(candidate) || availableNumbers.Contains(candidate));

                    if (attempts <= maxAttempts)
                    {
                        availableNumbers.Add(candidate);
                        existingSet.Add(candidate); // Add to set to avoid duplicates in this batch
                    }
                }

                return availableNumbers;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting available unique numbers");
                return new List<int>();
            }
        }
    }
}