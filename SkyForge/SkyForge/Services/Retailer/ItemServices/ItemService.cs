using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Dto.RetailerDto.ItemDto;
using SkyForge.Dto.RetailerDto.CompositionDto;
using SkyForge.Models.Retailer.Items;
using SkyForge.Models.Retailer.ItemCompanyModel;
using SkyForge.Models.Retailer.CategoryModel;
using SkyForge.Models.Retailer.CompositionModel;
using SkyForge.Models.Retailer.MainUnitModel;
using SkyForge.Models.Retailer.Purchase;
using SkyForge.Models.Retailer.Sales;
using SkyForge.Models.UnitModel;
using SkyForge.Models.CompanyModel;
using SkyForge.Models.FiscalYearModel;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using SkyForge.Models.Retailer.StoreModel;
using SkyForge.Models.RackModel;
using Npgsql;
using Microsoft.Extensions.Configuration;

namespace SkyForge.Services.Retailer.ItemServices
{
    public class ItemService : IItemService
    {
        private readonly ApplicationDbContext _context;
        private readonly Random _random;
        private readonly ILogger<ItemService> _logger;
        private readonly string _connectionString;

        public ItemService(
            ApplicationDbContext context,
             ILogger<ItemService> logger,
             IConfiguration configuration)
        {
            _context = context;
            _logger = logger;
            _random = new Random();
            _connectionString = configuration.GetConnectionString("DefaultConnection");
        }

        /// <summary>
        /// Validates and ensures the unique number is available for the company
        /// </summary>
        private async Task<int> ValidateAndGetUniqueNumberAsync(Guid companyId, int? providedUniqueNumber)
        {
            // If a unique number is provided from frontend, validate it
            if (providedUniqueNumber.HasValue)
            {
                // Check if number is within 5-digit range
                if (providedUniqueNumber.Value < 10001 || providedUniqueNumber.Value > 99999)
                {
                    throw new InvalidOperationException($"Unique number {providedUniqueNumber.Value} must be between 10001 and 99999");
                }

                // Check if number already exists for this company
                var exists = await _context.Items
                    .AnyAsync(i => i.CompanyId == companyId && i.UniqueNumber == providedUniqueNumber.Value);

                if (exists)
                {
                    throw new InvalidOperationException($"Unique number {providedUniqueNumber.Value} already exists!");
                }

                return providedUniqueNumber.Value;
            }

            // If no number provided, generate the next available number
            return await GenerateNextAvailableUniqueNumberAsync(companyId);
        }

        /// <summary>
        /// Generates the next available unique number for a company (5-digit, starting from 10001)
        /// </summary>
        private async Task<int> GenerateNextAvailableUniqueNumberAsync(Guid companyId)
        {
            try
            {
                // Get all existing unique numbers for this company
                var existingNumbers = await _context.Items
                    .Where(i => i.CompanyId == companyId)
                    .Select(i => i.UniqueNumber)
                    .OrderBy(n => n)
                    .ToListAsync();

                // Find the next available number starting from 10001
                int nextNumber = 10001;
                foreach (var existingNumber in existingNumbers)
                {
                    if (existingNumber == nextNumber)
                    {
                        nextNumber++;
                    }
                    else if (existingNumber > nextNumber)
                    {
                        // Found a gap
                        break;
                    }
                }

                // Check if we've exceeded the 5-digit limit
                if (nextNumber > 99999)
                {
                    // Try to find any gap in the existing numbers
                    int gapNumber = 10001;
                    foreach (var existingNumber in existingNumbers)
                    {
                        if (existingNumber > gapNumber)
                        {
                            return gapNumber;
                        }
                        gapNumber = existingNumber + 1;
                        if (gapNumber > 99999) break;
                    }

                    throw new InvalidOperationException("No available 5-digit numbers (10001-99999) for this company");
                }

                _logger.LogInformation("Generated next available unique number: {UniqueNumber} for company {CompanyId}",
                    nextNumber, companyId);

                return nextNumber;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating unique number for company {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<long> GenerateBarcodeNumberAsync(Guid companyId)
        {
            try
            {
                long barcodeNumber;
                bool isUnique;
                int attempts = 0;
                const int maxAttempts = 50;

                do
                {
                    attempts++;

                    // Generate random 13-digit barcode number (EAN-13 compatible)
                    // Generate first 12 digits randomly
                    var first12Digits = (long)(_random.NextDouble() * 900000000000) + 100000000000;

                    // Calculate check digit for EAN-13
                    barcodeNumber = CalculateEan13CheckDigit(first12Digits);

                    // Check if barcode already exists in the same company
                    isUnique = !await _context.Items
                        .AnyAsync(i => i.CompanyId == companyId && i.BarcodeNumber == barcodeNumber);

                    if (attempts >= maxAttempts)
                    {
                        // Fallback: Use timestamp-based number
                        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                        barcodeNumber = timestamp % 10000000000000; // Ensure 13 digits
                        _logger.LogWarning("Using fallback barcode generation: {BarcodeNumber}", barcodeNumber);
                        break;
                    }

                } while (!isUnique);

                _logger.LogDebug("Generated barcode number: {BarcodeNumber} for company {CompanyId}", barcodeNumber, companyId);
                return barcodeNumber;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating barcode number for company {CompanyId}", companyId);
                throw;
            }
        }

        /// <summary>
        /// Calculates EAN-13 check digit
        /// </summary>
        private long CalculateEan13CheckDigit(long first12Digits)
        {
            string digits = first12Digits.ToString("D12");
            int sum = 0;

            for (int i = 0; i < 12; i++)
            {
                int digit = int.Parse(digits[i].ToString());
                sum += (i % 2 == 0) ? digit : digit * 3;
            }

            int checkDigit = (10 - (sum % 10)) % 10;
            return first12Digits * 10 + checkDigit;
        }

        /// <summary>
        /// Generates the next available unique number for a specific company (5-digit, starting from 10001)
        /// </summary>
        public async Task<int> GenerateUniqueItemNumberForImportAsync(Guid companyId)
        {
            try
            {
                // Get all existing unique numbers for this company
                var existingNumbers = await _context.Items
                    .Where(i => i.CompanyId == companyId)
                    .Select(i => i.UniqueNumber)
                    .OrderBy(n => n)
                    .ToListAsync();

                // Start from 10001
                int nextNumber = 10001;

                // Find the next available number
                foreach (var existingNumber in existingNumbers)
                {
                    if (existingNumber == nextNumber)
                    {
                        nextNumber++;
                    }
                    else if (existingNumber > nextNumber)
                    {
                        // Found a gap
                        break;
                    }
                }

                // Check if we've exceeded the 5-digit limit
                if (nextNumber > 99999)
                {
                    // Try to find any gap in the existing numbers
                    int gapNumber = 10001;
                    foreach (var existingNumber in existingNumbers)
                    {
                        if (existingNumber > gapNumber)
                        {
                            return gapNumber;
                        }
                        gapNumber = existingNumber + 1;
                        if (gapNumber > 99999) break;
                    }

                    throw new InvalidOperationException("No available 5-digit numbers (10001-99999) for this company");
                }

                _logger.LogInformation("Generated next available unique number: {UniqueNumber} for company {CompanyId}",
                    nextNumber, companyId);

                return nextNumber;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating unique number for company {CompanyId}", companyId);
                throw;
            }
        }

        //for 5 digit------------------------------start
        /// <summary>
        /// Generates a unique item number using database sequence (Fastest & Most Reliable)
        /// </summary>
        public async Task<int> GenerateUniqueItemNumberAsync(Guid companyId)
        {
            try
            {
                string sequenceName = $"item_seq_{companyId.ToString().Replace("-", "_")}";

                _logger.LogInformation($"Looking for sequence: {sequenceName}");

                // Ensure sequence exists for this company
                await EnsureSequenceExistsAsync(companyId, sequenceName);

                // Get next value from sequence
                using var connection = new NpgsqlConnection(_connectionString);
                await connection.OpenAsync();

                using var cmd = new NpgsqlCommand(
                    $"SELECT nextval('\"{sequenceName}\"')", // Added quotes for case sensitivity
                    connection);

                var result = await cmd.ExecuteScalarAsync();
                var uniqueNumber = Convert.ToInt32(result);

                _logger.LogDebug("Generated unique item number from sequence: {UniqueNumber} for company {CompanyId}",
                    uniqueNumber, companyId);
                return uniqueNumber;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating unique item number for company {CompanyId}", companyId);
                throw;
            }
        }

        /// <summary>
        /// Ensures a sequence exists for the company, creates it if not
        /// </summary>
        private async Task EnsureSequenceExistsAsync(Guid companyId, string sequenceName)
        {
            try
            {
                using var connection = new NpgsqlConnection(_connectionString);
                await connection.OpenAsync();

                // Check if sequence exists
                using var checkCmd = new NpgsqlCommand(
                    @"SELECT EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = @sequenceName)",
                    connection);
                checkCmd.Parameters.AddWithValue("sequenceName", sequenceName.ToLower());

                var exists = await checkCmd.ExecuteScalarAsync();

                _logger.LogInformation($"Sequence {sequenceName} exists: {exists}");

                if (!(bool)exists)
                {
                    // Get current max unique number
                    int maxUniqueNumber = 0;
                    try
                    {
                        maxUniqueNumber = await _context.Items
                            .Where(i => i.CompanyId == companyId)
                            .Select(i => i.UniqueNumber)
                            .MaxAsync();
                    }
                    catch (InvalidOperationException)
                    {
                        maxUniqueNumber = 0;
                    }

                    long startValue = maxUniqueNumber < 10000 ? 10000 : maxUniqueNumber + 1;

                    // Create new sequence with 5 digits
                    using var createCmd = new NpgsqlCommand(
                        $@"CREATE SEQUENCE ""{sequenceName}"" 
                   START WITH {startValue} 
                   INCREMENT BY 1 
                   MINVALUE 10000 
                   MAXVALUE 99999 
                   CYCLE",
                        connection);
                    await createCmd.ExecuteNonQueryAsync();
                    _logger.LogInformation("Created sequence {SequenceName} for company {CompanyId} with start value {StartValue}",
                        sequenceName, companyId, startValue);
                }
                else
                {
                    // 🔴 CRITICAL: Check if sequence is 6-digit and force reset to 5-digit
                    using var checkMinValueCmd = new NpgsqlCommand(
                        $"SELECT min_value FROM pg_sequences WHERE sequencename = @sequenceName",
                        connection);
                    checkMinValueCmd.Parameters.AddWithValue("sequenceName", sequenceName.ToLower());

                    var minValueObj = await checkMinValueCmd.ExecuteScalarAsync();
                    long minValue = minValueObj != null ? Convert.ToInt64(minValueObj) : 0;

                    // 🔴 FORCE RESET: If minValue is 100000 (6-digit), reset to 5-digit
                    if (minValue >= 100000)
                    {
                        _logger.LogWarning($"Sequence {sequenceName} is 6-digit (minValue: {minValue}). Forcing reset to 5-digit...");

                        // Get current max unique number from items
                        int maxUniqueNumber = 0;
                        try
                        {
                            maxUniqueNumber = await _context.Items
                                .Where(i => i.CompanyId == companyId)
                                .Select(i => i.UniqueNumber)
                                .MaxAsync();
                        }
                        catch (InvalidOperationException)
                        {
                            maxUniqueNumber = 0;
                        }

                        // Calculate new start value (5-digit)
                        long startValue = maxUniqueNumber < 10000 ? 10000 : maxUniqueNumber + 1;

                        // Drop and recreate the sequence with 5-digit configuration
                        using var dropCmd = new NpgsqlCommand(
                            $@"DROP SEQUENCE IF EXISTS ""{sequenceName}""",
                            connection);
                        await dropCmd.ExecuteNonQueryAsync();

                        using var createCmd = new NpgsqlCommand(
                            $@"CREATE SEQUENCE ""{sequenceName}"" 
                       START WITH {startValue} 
                       INCREMENT BY 1 
                       MINVALUE 10000 
                       MAXVALUE 99999 
                       CYCLE",
                            connection);
                        await createCmd.ExecuteNonQueryAsync();

                        _logger.LogInformation($"Reset sequence {sequenceName} to 5-digit with start value {startValue}");
                    }
                    // Check if sequence needs upgrading from 4-digit to 5-digit
                    else if (minValue < 10000)
                    {
                        _logger.LogInformation($"Upgrading sequence {sequenceName} from 4-digit to 5-digit");

                        try
                        {
                            // Try to alter the sequence
                            using var alterCmd = new NpgsqlCommand(
                                $@"ALTER SEQUENCE ""{sequenceName}"" 
                           MINVALUE 10000 MAXVALUE 99999",
                                connection);
                            await alterCmd.ExecuteNonQueryAsync();

                            // Get current value
                            using var getValCmd = new NpgsqlCommand(
                                $"SELECT last_value FROM pg_sequences WHERE sequencename = @sequenceName",
                                connection);
                            getValCmd.Parameters.AddWithValue("sequenceName", sequenceName.ToLower());
                            var curValObj = await getValCmd.ExecuteScalarAsync();
                            long currentValue = curValObj != null ? Convert.ToInt64(curValObj) : 10000;

                            long newStart = currentValue < 10000 ? 10000 : currentValue + 1;

                            using var restartCmd = new NpgsqlCommand(
                                $@"ALTER SEQUENCE ""{sequenceName}"" RESTART WITH {newStart}",
                                connection);
                            await restartCmd.ExecuteNonQueryAsync();

                            _logger.LogInformation($"Successfully upgraded sequence {sequenceName} to 5 digits");
                        }
                        catch (Exception ex)
                        {
                            _logger.LogWarning($"Alter failed: {ex.Message}. Recreating sequence...");

                            // Drop and recreate
                            using var dropCmd = new NpgsqlCommand(
                                $@"DROP SEQUENCE ""{sequenceName}""",
                                connection);
                            await dropCmd.ExecuteNonQueryAsync();

                            int maxUniqueNumber = 0;
                            try
                            {
                                maxUniqueNumber = await _context.Items
                                    .Where(i => i.CompanyId == companyId)
                                    .Select(i => i.UniqueNumber)
                                    .MaxAsync();
                            }
                            catch (InvalidOperationException)
                            {
                                maxUniqueNumber = 0;
                            }

                            long startValue = maxUniqueNumber < 10000 ? 10000 : maxUniqueNumber + 1;

                            using var createCmd = new NpgsqlCommand(
                                $@"CREATE SEQUENCE ""{sequenceName}"" 
                           START WITH {startValue} 
                           INCREMENT BY 1 
                           MINVALUE 10000 
                           MAXVALUE 99999 
                           CYCLE",
                                connection);
                            await createCmd.ExecuteNonQueryAsync();

                            _logger.LogInformation($"Recreated sequence {sequenceName} with start value {startValue}");
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error ensuring sequence exists: {SequenceName} for company {CompanyId}", sequenceName, companyId);
                throw;
            }
        }

        /// <summary>
        /// Creates a new item with all related entities
        /// </summary>
        // public async Task<Item> CreateItemAsync(CreateItemDTO createItemDto, Guid companyId, Guid fiscalYearId)
        // {
        //     using var transaction = await _context.Database.BeginTransactionAsync();

        //     try
        //     {
        //         _logger.LogInformation("Creating new item for company {CompanyId}", companyId);

        //         // 1. Validate fiscal year exists and belongs to company
        //         var fiscalYear = await _context.FiscalYears
        //             .FirstOrDefaultAsync(f => f.Id == fiscalYearId && f.CompanyId == companyId);

        //         if (fiscalYear == null)
        //         {
        //             throw new InvalidOperationException($"Fiscal year {fiscalYearId} not found for company {companyId}");
        //         }

        //         // 2. Check for duplicate item name
        //         var existingItem = await _context.Items
        //             .AnyAsync(i => i.Name.ToLower() == createItemDto.Name.ToLower().Trim()
        //                 && i.CompanyId == companyId);

        //         if (existingItem)
        //         {
        //             throw new InvalidOperationException($"Item '{createItemDto.Name.Trim()}' already exists!");
        //         }

        //         // 3. Validate and get unique number (from frontend or generate)
        //         var uniqueNumber = await ValidateAndGetUniqueNumberAsync(companyId, createItemDto.UniqueNumber);

        //         // 4. Generate barcode number
        //         var barcodeNumber = await GenerateBarcodeNumberAsync(companyId);

        //         // 5. Get default store and rack
        //         var defaultStore = await GetDefaultStoreAsync(companyId);
        //         var defaultRack = defaultStore != null ? await GetDefaultRackAsync(defaultStore.Id) : null;

        //         // 6. Calculate purchase and sales prices for consistency
        //         decimal purchasePrice = createItemDto.PuPrice ?? 0;
        //         decimal salesPrice = createItemDto.Price ?? 0;
        //         decimal openingStock = createItemDto.OpeningStock;
        //         decimal openingStockValue = openingStock * purchasePrice;

        //         // 7. Create new item
        //         var newItem = new Item
        //         {
        //             Id = Guid.NewGuid(),
        //             Name = createItemDto.Name?.Trim() ?? "",
        //             Hscode = createItemDto.Hscode,
        //             CategoryId = createItemDto.CategoryId,
        //             ItemsCompanyId = createItemDto.ItemsCompanyId,
        //             Price = salesPrice,
        //             PuPrice = purchasePrice,
        //             MainUnitPuPrice = createItemDto.MainUnitPuPrice,
        //             MainUnitId = createItemDto.MainUnitId,
        //             WsUnit = createItemDto.WsUnit,
        //             UnitId = createItemDto.UnitId,
        //             VatStatus = createItemDto.VatStatus,
        //             OpeningStock = openingStock,
        //             MinStock = createItemDto.MinStock,
        //             MaxStock = createItemDto.MaxStock,
        //             ReorderLevel = createItemDto.ReorderLevel,
        //             UniqueNumber = uniqueNumber,
        //             BarcodeNumber = barcodeNumber,
        //             CompanyId = companyId,
        //             Status = createItemDto.Status ?? "active",
        //             CreatedAt = DateTime.UtcNow,
        //             OriginalFiscalYearId = fiscalYearId,
        //             Date = fiscalYear.StartDate.HasValue ? fiscalYear.StartDate.Value.ToUniversalTime() : DateTime.UtcNow,
        //             NepaliDate = !string.IsNullOrEmpty(fiscalYear.StartDateNepali) ? fiscalYear.StartDateNepali : DateTime.UtcNow.ToString("yyyy-MM-dd"),
        //             UpdatedAt = DateTime.UtcNow
        //         };

        //         // 8. Add compositions if provided
        //         if (createItemDto.CompositionIds != null && createItemDto.CompositionIds.Any())
        //         {
        //             newItem.ItemCompositions = createItemDto.CompositionIds.Select(compositionId => new ItemComposition
        //             {
        //                 ItemId = newItem.Id,
        //                 CompositionId = compositionId
        //             }).ToList();
        //         }

        //         // 9. Create initial opening stock record
        //         var initialOpeningStock = new ItemInitialOpeningStock
        //         {
        //             Id = Guid.NewGuid(),
        //             ItemId = newItem.Id,
        //             InitialFiscalYearId = createItemDto.InitialOpeningStock?.InitialFiscalYearId ?? fiscalYearId,
        //             CompanyId = companyId,
        //             OpeningStock = openingStock,
        //             OpeningStockValue = createItemDto.InitialOpeningStock?.OpeningStockValue ?? openingStockValue,
        //             PurchasePrice = createItemDto.InitialOpeningStock?.PurchasePrice ?? purchasePrice,
        //             SalesPrice = createItemDto.InitialOpeningStock?.SalesPrice ?? salesPrice,
        //             Date = createItemDto.InitialOpeningStock?.Date ??
        //                    (fiscalYear.StartDate.HasValue ? fiscalYear.StartDate.Value.ToUniversalTime() : DateTime.UtcNow),
        //             NepaliDate = !string.IsNullOrEmpty(fiscalYear.StartDateNepali) ? fiscalYear.StartDateNepali : DateTime.UtcNow.ToString("yyyy-MM-dd"),
        //             CreatedAt = DateTime.UtcNow,
        //             UpdatedAt = DateTime.UtcNow
        //         };

        //         newItem.InitialOpeningStock = initialOpeningStock;

        //         // 10. Create opening stocks by fiscal year
        //         var openingStocks = new List<ItemOpeningStockByFiscalYear>();

        //         // Check if current fiscal year is already provided in DTO
        //         var existingCurrentFiscalYearStock = createItemDto.OpeningStocksByFiscalYear?
        //             .FirstOrDefault(os => os.FiscalYearId == fiscalYearId);

        //         if (existingCurrentFiscalYearStock != null)
        //         {
        //             // Use provided values for current fiscal year
        //             var openingStockCurrent = new ItemOpeningStockByFiscalYear
        //             {
        //                 Id = Guid.NewGuid(),
        //                 ItemId = newItem.Id,
        //                 FiscalYearId = fiscalYearId,
        //                 CompanyId = companyId,
        //                 OpeningStock = existingCurrentFiscalYearStock.OpeningStock,
        //                 OpeningStockValue = existingCurrentFiscalYearStock.OpeningStockValue,
        //                 PurchasePrice = existingCurrentFiscalYearStock.PurchasePrice,
        //                 SalesPrice = existingCurrentFiscalYearStock.SalesPrice,
        //                 Date = createItemDto.InitialOpeningStock?.Date ??
        //                    (fiscalYear.StartDate.HasValue ? fiscalYear.StartDate.Value.ToUniversalTime() : DateTime.UtcNow),
        //                 NepaliDate = !string.IsNullOrEmpty(fiscalYear.StartDateNepali) ? fiscalYear.StartDateNepali : DateTime.UtcNow.ToString("yyyy-MM-dd"),
        //                 CreatedAt = DateTime.UtcNow,
        //                 UpdatedAt = DateTime.UtcNow
        //             };
        //             openingStocks.Add(openingStockCurrent);
        //         }
        //         else
        //         {
        //             // Create default opening stock for current fiscal year
        //             var openingStockCurrent = new ItemOpeningStockByFiscalYear
        //             {
        //                 Id = Guid.NewGuid(),
        //                 ItemId = newItem.Id,
        //                 FiscalYearId = fiscalYearId,
        //                 CompanyId = companyId,
        //                 OpeningStock = openingStock,
        //                 OpeningStockValue = openingStockValue,
        //                 PurchasePrice = purchasePrice,
        //                 SalesPrice = salesPrice,
        //                 Date = createItemDto.InitialOpeningStock?.Date ??
        //                    (fiscalYear.StartDate.HasValue ? fiscalYear.StartDate.Value.ToUniversalTime() : DateTime.UtcNow),
        //                 NepaliDate = !string.IsNullOrEmpty(fiscalYear.StartDateNepali) ? fiscalYear.StartDateNepali : DateTime.UtcNow.ToString("yyyy-MM-dd"),
        //                 CreatedAt = DateTime.UtcNow,
        //                 UpdatedAt = DateTime.UtcNow
        //             };
        //             openingStocks.Add(openingStockCurrent);
        //         }

        //         // Add opening stocks for other fiscal years if provided
        //         if (createItemDto.OpeningStocksByFiscalYear != null)
        //         {
        //             foreach (var openingStockDto in createItemDto.OpeningStocksByFiscalYear)
        //             {
        //                 // Skip current fiscal year as we already handled it
        //                 if (openingStockDto.FiscalYearId == fiscalYearId)
        //                     continue;

        //                 // Validate fiscal year exists and belongs to company
        //                 var fiscalYearForOpeningStock = await _context.FiscalYears
        //                     .FirstOrDefaultAsync(f => f.Id == openingStockDto.FiscalYearId && f.CompanyId == companyId);

        //                 if (fiscalYearForOpeningStock == null)
        //                 {
        //                     throw new InvalidOperationException($"Fiscal year {openingStockDto.FiscalYearId} not found for opening stock");
        //                 }

        //                 // Calculate opening stock value if not provided
        //                 decimal calculatedOpeningStockValue = openingStockDto.OpeningStockValue;
        //                 if (calculatedOpeningStockValue == 0)
        //                 {
        //                     calculatedOpeningStockValue = openingStockDto.OpeningStock * openingStockDto.PurchasePrice;
        //                 }

        //                 var openingStockRecord = new ItemOpeningStockByFiscalYear
        //                 {
        //                     Id = Guid.NewGuid(),
        //                     ItemId = newItem.Id,
        //                     FiscalYearId = openingStockDto.FiscalYearId,
        //                     CompanyId = companyId,
        //                     OpeningStock = openingStockDto.OpeningStock,
        //                     OpeningStockValue = calculatedOpeningStockValue,
        //                     PurchasePrice = openingStockDto.PurchasePrice,
        //                     SalesPrice = openingStockDto.SalesPrice,
        //                     Date = createItemDto.InitialOpeningStock?.Date ??
        //                    (fiscalYear.StartDate.HasValue ? fiscalYear.StartDate.Value.ToUniversalTime() : DateTime.UtcNow),
        //                     NepaliDate = !string.IsNullOrEmpty(fiscalYear.StartDateNepali) ? fiscalYear.StartDateNepali : DateTime.UtcNow.ToString("yyyy-MM-dd"),
        //                     CreatedAt = DateTime.UtcNow,
        //                     UpdatedAt = DateTime.UtcNow
        //                 };

        //                 openingStocks.Add(openingStockRecord);
        //             }
        //         }

        //         newItem.OpeningStocksByFiscalYear = openingStocks;

        //         // 11. Create closing stocks by fiscal year if provided
        //         if (createItemDto.ClosingStocksByFiscalYear != null && createItemDto.ClosingStocksByFiscalYear.Any())
        //         {
        //             var closingStocks = new List<ItemClosingStockByFiscalYear>();

        //             foreach (var closingStockDto in createItemDto.ClosingStocksByFiscalYear)
        //             {
        //                 // Validate fiscal year exists and belongs to company
        //                 var fiscalYearForClosingStock = await _context.FiscalYears
        //                     .FirstOrDefaultAsync(f => f.Id == closingStockDto.FiscalYearId && f.CompanyId == companyId);

        //                 if (fiscalYearForClosingStock == null)
        //                 {
        //                     throw new InvalidOperationException($"Fiscal year {closingStockDto.FiscalYearId} not found for closing stock");
        //                 }

        //                 // Calculate closing stock value if not provided
        //                 decimal calculatedClosingStockValue = closingStockDto.ClosingStockValue;
        //                 if (calculatedClosingStockValue == 0)
        //                 {
        //                     calculatedClosingStockValue = closingStockDto.ClosingStock * closingStockDto.PurchasePrice;
        //                 }

        //                 var closingStock = new ItemClosingStockByFiscalYear
        //                 {
        //                     Id = Guid.NewGuid(),
        //                     ItemId = newItem.Id,
        //                     FiscalYearId = closingStockDto.FiscalYearId,
        //                     CompanyId = closingStockDto.CompanyId,
        //                     ClosingStock = closingStockDto.ClosingStock,
        //                     ClosingStockValue = calculatedClosingStockValue,
        //                     PurchasePrice = closingStockDto.PurchasePrice,
        //                     SalesPrice = closingStockDto.SalesPrice,
        //                     Date = createItemDto.InitialOpeningStock?.Date ??
        //                    (fiscalYear.StartDate.HasValue ? fiscalYear.StartDate.Value.ToUniversalTime() : DateTime.UtcNow),
        //                     NepaliDate = !string.IsNullOrEmpty(fiscalYear.StartDateNepali) ? fiscalYear.StartDateNepali : DateTime.UtcNow.ToString("yyyy-MM-dd"),
        //                     CreatedAt = DateTime.UtcNow,
        //                     UpdatedAt = DateTime.UtcNow
        //                 };

        //                 closingStocks.Add(closingStock);
        //             }

        //             newItem.ClosingStocksByFiscalYear = closingStocks;
        //         }

        //         // 12. Add stock entry if opening stock > 0
        //         if (openingStock > 0)
        //         {
        //             var stockEntry = new StockEntry
        //             {
        //                 Id = Guid.NewGuid(),
        //                 ItemId = newItem.Id,
        //                 WsUnit = createItemDto.WsUnit,
        //                 Quantity = openingStock,
        //                 Price = salesPrice,
        //                 NetPrice = salesPrice,
        //                 PuPrice = purchasePrice,
        //                 NetPuPrice = purchasePrice,
        //                 MainUnitPuPrice = createItemDto.MainUnitPuPrice,
        //                 Mrp = salesPrice,
        //                 BatchNumber = "ADJ-ADD",
        //                 Currency = createItemDto.Currency ?? "NPR",
        //                 StoreId = createItemDto.StoreId ?? defaultStore?.Id,
        //                 RackId = createItemDto.RackId ?? defaultRack?.Id,
        //                 ExpiryDate = DateOnly.FromDateTime(DateTime.UtcNow.AddYears(2)),
        //                 ExpiryStatus = "safe",
        //                 DaysUntilExpiry = 730,
        //                 CompanyId = companyId,
        //                 FiscalYearId = fiscalYearId,
        //                 UniqueUuid = Guid.NewGuid().ToString(),
        //                 Date = createItemDto.InitialOpeningStock?.Date ??
        //                    (fiscalYear.StartDate.HasValue ? fiscalYear.StartDate.Value.ToUniversalTime() : DateTime.UtcNow),
        //                 NepaliDate = !string.IsNullOrEmpty(fiscalYear.StartDateNepali) ? fiscalYear.StartDateNepali : DateTime.UtcNow.ToString("yyyy-MM-dd"),
        //                 CreatedAt = DateTime.UtcNow,
        //                 UpdatedAt = DateTime.UtcNow
        //             };

        //             newItem.StockEntries = new List<StockEntry> { stockEntry };
        //         }

        //         // 13. Save the item and all related entities
        //         await _context.Items.AddAsync(newItem);
        //         await _context.SaveChangesAsync();

        //         // 14. Commit transaction
        //         await transaction.CommitAsync();

        //         _logger.LogInformation("Item created successfully: {ItemName} (ID: {ItemId}, Unique: {UniqueNumber})",
        //             newItem.Name, newItem.Id, newItem.UniqueNumber);

        //         return newItem;
        //     }
        //     catch (DbUpdateException ex) when (ex.InnerException is Npgsql.PostgresException pgEx && pgEx.SqlState == "23505")
        //     {
        //         await transaction.RollbackAsync();
        //         // Handle duplicate key violation
        //         if (pgEx.ConstraintName == "IX_Item_Company_UniqueNumber" || pgEx.ConstraintName == "IX_Item_UniqueNumber")
        //         {
        //             _logger.LogWarning(ex, "Duplicate unique number detected. Generating new number and retrying.");

        //             // Check if the duplicate was from the frontend number
        //             if (createItemDto.UniqueNumber.HasValue)
        //             {
        //                 // Generate a new number and try again
        //                 var newNumber = await GenerateNextAvailableUniqueNumberAsync(companyId);
        //                 createItemDto.UniqueNumber = newNumber;

        //                 // Retry with the new number (recursive call with retry flag to prevent infinite loop)
        //                 return await CreateItemAsync(createItemDto, companyId, fiscalYearId);
        //             }
        //         }
        //         throw;
        //     }
        //     catch (Exception)
        //     {
        //         await transaction.RollbackAsync();
        //         throw;
        //     }
        // }

        /// <summary>
        /// Creates a new item with all related entities
        /// </summary>
        public async Task<Item> CreateItemAsync(CreateItemDTO createItemDto, Guid companyId, Guid fiscalYearId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                _logger.LogInformation("Creating new item for company {CompanyId}", companyId);

                // 1. Validate fiscal year exists and belongs to company
                var fiscalYear = await _context.FiscalYears
                    .FirstOrDefaultAsync(f => f.Id == fiscalYearId && f.CompanyId == companyId);

                if (fiscalYear == null)
                {
                    throw new InvalidOperationException($"Fiscal year {fiscalYearId} not found for company {companyId}");
                }

                // ✅ 2. Get the initial fiscal year for this company
                var initialFiscalYear = await _context.FiscalYears
                    .Where(f => f.CompanyId == companyId)
                    .OrderBy(f => f.StartDate)
                    .FirstOrDefaultAsync();

                if (initialFiscalYear == null)
                {
                    throw new InvalidOperationException("Initial fiscal year not found");
                }

                // ✅ 3. Check if current fiscal year is the initial fiscal year
                bool isInitialFiscalYear = fiscalYear.Id == initialFiscalYear.Id;

                _logger.LogInformation($"Current Fiscal Year: {fiscalYear.Name}, Is Initial: {isInitialFiscalYear}");

                // 4. Check for duplicate item name
                var existingItem = await _context.Items
                    .AnyAsync(i => i.Name.ToLower() == createItemDto.Name.ToLower().Trim()
                        && i.CompanyId == companyId);

                if (existingItem)
                {
                    throw new InvalidOperationException($"Item '{createItemDto.Name.Trim()}' already exists!");
                }

                // 5. Validate and get unique number (from frontend or generate)
                var uniqueNumber = await ValidateAndGetUniqueNumberAsync(companyId, createItemDto.UniqueNumber);

                // 6. Generate barcode number
                var barcodeNumber = await GenerateBarcodeNumberAsync(companyId);

                // 7. Get default store and rack
                var defaultStore = await GetDefaultStoreAsync(companyId);
                var defaultRack = defaultStore != null ? await GetDefaultRackAsync(defaultStore.Id) : null;

                // ✅ 8. Purchase and Sales prices are ALWAYS allowed (regardless of fiscal year)
                decimal purchasePrice = createItemDto.PuPrice ?? 0;
                decimal salesPrice = createItemDto.Price ?? 0;

                // ✅ 9. Opening stock is ONLY allowed in INITIAL fiscal year
                decimal openingStock = 0;
                decimal openingStockValue = 0;

                if (isInitialFiscalYear)
                {
                    openingStock = createItemDto.OpeningStock;
                    openingStockValue = openingStock * purchasePrice;
                    _logger.LogInformation($"Initial fiscal year: Setting opening stock to {openingStock}");
                }
                else
                {
                    _logger.LogInformation($"Non-initial fiscal year: Opening stock set to 0 (prices allowed)");
                    // ⚠️ If user tries to send opening stock in non-initial year, ignore it
                    if (createItemDto.OpeningStock > 0)
                    {
                        _logger.LogWarning($"User attempted to set opening stock in non-initial fiscal year. Ignoring.");
                    }
                }

                // 10. Create new item
                var newItem = new Item
                {
                    Id = Guid.NewGuid(),
                    Name = createItemDto.Name?.Trim() ?? "",
                    Hscode = createItemDto.Hscode,
                    CategoryId = createItemDto.CategoryId,
                    ItemsCompanyId = createItemDto.ItemsCompanyId,
                    Price = salesPrice, // ✅ ALWAYS allowed
                    PuPrice = purchasePrice, // ✅ ALWAYS allowed
                    MainUnitPuPrice = createItemDto.MainUnitPuPrice,
                    MainUnitId = createItemDto.MainUnitId,
                    WsUnit = createItemDto.WsUnit,
                    UnitId = createItemDto.UnitId,
                    VatStatus = createItemDto.VatStatus,
                    OpeningStock = openingStock, // ✅ Will be 0 in non-initial year
                    MinStock = createItemDto.MinStock,
                    MaxStock = createItemDto.MaxStock,
                    ReorderLevel = createItemDto.ReorderLevel,
                    UniqueNumber = uniqueNumber,
                    BarcodeNumber = barcodeNumber,
                    CompanyId = companyId,
                    Status = createItemDto.Status ?? "active",
                    CreatedAt = DateTime.UtcNow,
                    OriginalFiscalYearId = fiscalYearId,
                    Date = fiscalYear.StartDate.HasValue ? fiscalYear.StartDate.Value.ToUniversalTime() : DateTime.UtcNow,
                    NepaliDate = !string.IsNullOrEmpty(fiscalYear.StartDateNepali) ? fiscalYear.StartDateNepali : DateTime.UtcNow.ToString("yyyy-MM-dd"),
                    UpdatedAt = DateTime.UtcNow
                };

                // 11. Add compositions if provided
                if (createItemDto.CompositionIds != null && createItemDto.CompositionIds.Any())
                {
                    newItem.ItemCompositions = createItemDto.CompositionIds.Select(compositionId => new ItemComposition
                    {
                        ItemId = newItem.Id,
                        CompositionId = compositionId
                    }).ToList();
                }

                // ✅ 12. ONLY create opening stock records if in INITIAL fiscal year AND opening stock > 0
                if (isInitialFiscalYear && openingStock > 0)
                {
                    // Create initial opening stock record
                    var initialOpeningStock = new ItemInitialOpeningStock
                    {
                        Id = Guid.NewGuid(),
                        ItemId = newItem.Id,
                        InitialFiscalYearId = createItemDto.InitialOpeningStock?.InitialFiscalYearId ?? fiscalYearId,
                        CompanyId = companyId,
                        OpeningStock = openingStock,
                        OpeningStockValue = createItemDto.InitialOpeningStock?.OpeningStockValue ?? openingStockValue,
                        PurchasePrice = createItemDto.InitialOpeningStock?.PurchasePrice ?? purchasePrice,
                        SalesPrice = createItemDto.InitialOpeningStock?.SalesPrice ?? salesPrice,
                        Date = createItemDto.InitialOpeningStock?.Date ??
                               (fiscalYear.StartDate.HasValue ? fiscalYear.StartDate.Value.ToUniversalTime() : DateTime.UtcNow),
                        NepaliDate = !string.IsNullOrEmpty(fiscalYear.StartDateNepali) ? fiscalYear.StartDateNepali : DateTime.UtcNow.ToString("yyyy-MM-dd"),
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };

                    newItem.InitialOpeningStock = initialOpeningStock;

                    // Create opening stock for current fiscal year
                    var openingStockCurrent = new ItemOpeningStockByFiscalYear
                    {
                        Id = Guid.NewGuid(),
                        ItemId = newItem.Id,
                        FiscalYearId = fiscalYearId,
                        CompanyId = companyId,
                        OpeningStock = openingStock,
                        OpeningStockValue = openingStockValue,
                        PurchasePrice = purchasePrice,
                        SalesPrice = salesPrice,
                        Date = createItemDto.InitialOpeningStock?.Date ??
                               (fiscalYear.StartDate.HasValue ? fiscalYear.StartDate.Value.ToUniversalTime() : DateTime.UtcNow),
                        NepaliDate = !string.IsNullOrEmpty(fiscalYear.StartDateNepali) ? fiscalYear.StartDateNepali : DateTime.UtcNow.ToString("yyyy-MM-dd"),
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    newItem.OpeningStocksByFiscalYear = new List<ItemOpeningStockByFiscalYear> { openingStockCurrent };

                    // 13. Add stock entry if opening stock > 0
                    var stockEntry = new StockEntry
                    {
                        Id = Guid.NewGuid(),
                        ItemId = newItem.Id,
                        WsUnit = createItemDto.WsUnit,
                        Quantity = openingStock,
                        Price = salesPrice,
                        NetPrice = salesPrice,
                        PuPrice = purchasePrice,
                        NetPuPrice = purchasePrice,
                        MainUnitPuPrice = createItemDto.MainUnitPuPrice,
                        Mrp = salesPrice,
                        BatchNumber = "ADJ-ADD",
                        Currency = createItemDto.Currency ?? "NPR",
                        StoreId = createItemDto.StoreId ?? defaultStore?.Id,
                        RackId = createItemDto.RackId ?? defaultRack?.Id,
                        ExpiryDate = DateOnly.FromDateTime(DateTime.UtcNow.AddYears(2)),
                        ExpiryStatus = "safe",
                        DaysUntilExpiry = 730,
                        CompanyId = companyId,
                        FiscalYearId = fiscalYearId,
                        UniqueUuid = Guid.NewGuid().ToString(),
                        Date = createItemDto.InitialOpeningStock?.Date ??
                               (fiscalYear.StartDate.HasValue ? fiscalYear.StartDate.Value.ToUniversalTime() : DateTime.UtcNow),
                        NepaliDate = !string.IsNullOrEmpty(fiscalYear.StartDateNepali) ? fiscalYear.StartDateNepali : DateTime.UtcNow.ToString("yyyy-MM-dd"),
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };

                    newItem.StockEntries = new List<StockEntry> { stockEntry };
                }
                else if (!isInitialFiscalYear)
                {
                    _logger.LogInformation($"Skipping opening stock creation - Not in initial fiscal year");
                    // Ensure no opening stock records are created
                    newItem.InitialOpeningStock = null;
                    newItem.OpeningStocksByFiscalYear = new List<ItemOpeningStockByFiscalYear>();
                    newItem.StockEntries = new List<StockEntry>();
                    newItem.OpeningStock = 0;
                    // ✅ But keep the prices!
                    newItem.Price = salesPrice;
                    newItem.PuPrice = purchasePrice;
                }

                // 14. Save the item and all related entities
                await _context.Items.AddAsync(newItem);
                await _context.SaveChangesAsync();

                // 15. Commit transaction
                await transaction.CommitAsync();

                _logger.LogInformation($"Item created successfully: {newItem.Name} (ID: {newItem.Id}, Unique: {newItem.UniqueNumber}, Initial FY: {isInitialFiscalYear})");

                return newItem;
            }
            catch (DbUpdateException ex) when (ex.InnerException is Npgsql.PostgresException pgEx && pgEx.SqlState == "23505")
            {
                await transaction.RollbackAsync();
                if (pgEx.ConstraintName == "IX_Item_Company_UniqueNumber" || pgEx.ConstraintName == "IX_Item_UniqueNumber")
                {
                    _logger.LogWarning(ex, "Duplicate unique number detected. Generating new number and retrying.");
                    if (createItemDto.UniqueNumber.HasValue)
                    {
                        var newNumber = await GenerateNextAvailableUniqueNumberAsync(companyId);
                        createItemDto.UniqueNumber = newNumber;
                        return await CreateItemAsync(createItemDto, companyId, fiscalYearId);
                    }
                }
                throw;
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        private async Task<Store?> GetDefaultStoreAsync(Guid companyId)
        {
            // First try to find store named "Main"
            var mainStore = await _context.Stores
                .FirstOrDefaultAsync(s => s.CompanyId == companyId &&
                                         s.Name == "Main" &&
                                         s.IsActive);

            if (mainStore != null)
                return mainStore;

            // Then try "Default"
            var defaultStore = await _context.Stores
                .FirstOrDefaultAsync(s => s.CompanyId == companyId &&
                                         s.Name == "Default" &&
                                         s.IsActive);

            if (defaultStore != null)
                return defaultStore;

            // Finally, get the first active store
            return await _context.Stores
                .FirstOrDefaultAsync(s => s.CompanyId == companyId && s.IsActive);
        }

        private async Task<Rack?> GetDefaultRackAsync(Guid storeId)
        {
            // First try to find rack named "Default"
            var defaultRack = await _context.Racks
                .FirstOrDefaultAsync(r => r.StoreId == storeId &&
                                         r.Name == "Default" &&
                                         r.IsActive);

            if (defaultRack != null)
                return defaultRack;

            // Then try "Main"
            var mainRack = await _context.Racks
                .FirstOrDefaultAsync(r => r.StoreId == storeId &&
                                         r.Name == "Main" &&
                                         r.IsActive);

            if (mainRack != null)
                return mainRack;

            // Finally, get the first active rack
            return await _context.Racks
                .FirstOrDefaultAsync(r => r.StoreId == storeId && r.IsActive);
        }


        /// <summary>
        /// Gets item by ID with all related data
        /// </summary>
        public async Task<Item> GetItemByIdAsync(Guid itemId)
        {
            try
            {
                var item = await _context.Items
                    .Include(i => i.Category)
                    .Include(i => i.ItemCompany)
                    .Include(i => i.Unit)
                    .Include(i => i.MainUnit)
                    .Include(i => i.Company)
                    .Include(i => i.OriginalFiscalYear)
                    .Include(i => i.ItemCompositions)
                        .ThenInclude(ic => ic.Composition)
                    .Include(i => i.InitialOpeningStock)
                        .ThenInclude(ios => ios!.InitialFiscalYear)
                    .Include(i => i.ClosingStocksByFiscalYear)
                        .ThenInclude(cs => cs.FiscalYear)
                    .Include(i => i.OpeningStocksByFiscalYear)
                        .ThenInclude(os => os.FiscalYear)
                    .Include(i => i.StockEntries)
                    .AsSplitQuery()
                    .FirstOrDefaultAsync(i => i.Id == itemId);

                if (item == null)
                {
                    _logger.LogWarning("Item {ItemId} not found", itemId);
                }

                return item;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting item {ItemId}", itemId);
                throw;
            }
        }

        /// <summary>
        /// Gets all items for a company in a specific fiscal year
        /// </summary>
        public async Task<List<Item>> GetItemsByCompanyAsync(Guid companyId, Guid fiscalYearId)
        {
            try
            {
                var items = await _context.Items
                    .Where(i => i.CompanyId == companyId)
                    .Include(i => i.Category)
                    .Include(i => i.ItemCompany)
                    .Include(i => i.Unit)
                    .Include(i => i.MainUnit)
                    .Include(i => i.ItemCompositions)
                        .ThenInclude(ic => ic.Composition)
                    .Include(i => i.StockEntries)
                    .OrderBy(i => i.Name)
                    .ToListAsync();

                _logger.LogInformation("Retrieved {Count} items for company {CompanyId}", items.Count, companyId);
                return items;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting items for company {CompanyId}", companyId);
                throw;
            }
        }


        // public async Task<Item> UpdateItemAsync(Guid itemId, UpdateItemDTO updateItemDto, Guid companyId, Guid fiscalYearId)
        // {
        //     using var transaction = await _context.Database.BeginTransactionAsync();

        //     try
        //     {
        //         // 1. Validate fiscal year exists and belongs to company
        //         var fiscalYear = await _context.FiscalYears
        //             .FirstOrDefaultAsync(f => f.Id == fiscalYearId && f.CompanyId == companyId);

        //         if (fiscalYear == null)
        //         {
        //             throw new InvalidOperationException($"Fiscal year {fiscalYearId} not found for company {companyId}");
        //         }

        //         // Load the item WITH tracking for updates
        //         var existingItem = await _context.Items
        //             .Include(i => i.ItemCompositions)
        //             .Include(i => i.OpeningStocksByFiscalYear)
        //             .Include(i => i.ClosingStocksByFiscalYear)
        //             .Include(i => i.StockEntries)
        //             .Include(i => i.Sales)
        //             .Include(i => i.Purchases)
        //             .Include(i => i.SalesReturns)
        //             .Include(i => i.PurchaseReturns)
        //             .FirstOrDefaultAsync(i => i.Id == itemId);

        //         if (existingItem == null)
        //         {
        //             throw new KeyNotFoundException($"Item with ID {itemId} not found");
        //         }

        //         // Check for duplicate name (excluding current item)
        //         if (!string.IsNullOrEmpty(updateItemDto.Name))
        //         {
        //             var duplicateItem = await _context.Items
        //                 .AsNoTracking()
        //                 .FirstOrDefaultAsync(i => i.Id != itemId
        //                     && i.CompanyId == existingItem.CompanyId
        //                     && i.Name.ToLower() == updateItemDto.Name.Trim().ToLower());

        //             if (duplicateItem != null)
        //             {
        //                 throw new InvalidOperationException($"Item '{updateItemDto.Name?.Trim()}' already exists for this fiscal year");
        //             }
        //         }

        //         // Store old values for logging
        //         decimal? oldPrice = existingItem.Price;
        //         decimal? oldPuPrice = existingItem.PuPrice;
        //         decimal? oldMainUnitPuPrice = existingItem.MainUnitPuPrice;

        //         // Update basic properties
        //         if (!string.IsNullOrEmpty(updateItemDto.Name))
        //         {
        //             existingItem.Name = updateItemDto.Name.Trim();
        //         }

        //         existingItem.Hscode = updateItemDto.Hscode;

        //         if (updateItemDto.CategoryId.HasValue)
        //         {
        //             var categoryExists = await _context.Categories
        //                 .AsNoTracking()
        //                 .AnyAsync(c => c.Id == updateItemDto.CategoryId.Value && c.CompanyId == existingItem.CompanyId);

        //             if (!categoryExists)
        //             {
        //                 throw new InvalidOperationException("Invalid category");
        //             }
        //             existingItem.CategoryId = updateItemDto.CategoryId.Value;
        //         }

        //         if (updateItemDto.ItemsCompanyId.HasValue)
        //         {
        //             var itemsCompanyExists = await _context.ItemCompanies
        //                 .AsNoTracking()
        //                 .AnyAsync(ic => ic.Id == updateItemDto.ItemsCompanyId.Value && ic.CompanyId == existingItem.CompanyId);

        //             if (!itemsCompanyExists)
        //             {
        //                 throw new InvalidOperationException("Invalid item company");
        //             }
        //             existingItem.ItemsCompanyId = updateItemDto.ItemsCompanyId.Value;
        //         }

        //         // Update prices - DIRECTLY from frontend
        //         existingItem.Price = updateItemDto.Price ?? 0;
        //         existingItem.PuPrice = updateItemDto.PuPrice ?? 0;
        //         existingItem.MainUnitPuPrice = updateItemDto.MainUnitPuPrice ?? 0;

        //         if (updateItemDto.MainUnitId.HasValue)
        //         {
        //             if (updateItemDto.MainUnitId.Value != Guid.Empty)
        //             {
        //                 var mainUnitExists = await _context.MainUnits
        //                     .AsNoTracking()
        //                     .AnyAsync(u => u.Id == updateItemDto.MainUnitId.Value && u.CompanyId == existingItem.CompanyId);

        //                 if (!mainUnitExists)
        //                 {
        //                     throw new InvalidOperationException("Invalid main unit");
        //                 }
        //             }
        //             existingItem.MainUnitId = updateItemDto.MainUnitId.Value;
        //         }

        //         existingItem.WsUnit = updateItemDto.WsUnit ?? existingItem.WsUnit;

        //         if (updateItemDto.UnitId.HasValue)
        //         {
        //             var unitExists = await _context.Units
        //                 .AsNoTracking()
        //                 .AnyAsync(u => u.Id == updateItemDto.UnitId.Value && u.CompanyId == existingItem.CompanyId);

        //             if (!unitExists)
        //             {
        //                 throw new InvalidOperationException("Invalid unit");
        //             }
        //             existingItem.UnitId = updateItemDto.UnitId.Value;
        //         }

        //         if (!string.IsNullOrEmpty(updateItemDto.VatStatus))
        //         {
        //             existingItem.VatStatus = updateItemDto.VatStatus;
        //         }

        //         existingItem.MinStock = updateItemDto.MinStock ?? existingItem.MinStock;
        //         existingItem.MaxStock = updateItemDto.MaxStock ?? existingItem.MaxStock;
        //         existingItem.ReorderLevel = updateItemDto.ReorderLevel ?? existingItem.ReorderLevel;

        //         if (!string.IsNullOrEmpty(updateItemDto.Status))
        //         {
        //             existingItem.Status = updateItemDto.Status;
        //         }

        //         existingItem.UpdatedAt = DateTime.UtcNow;

        //         // Update compositions if provided
        //         if (updateItemDto.CompositionIds != null)
        //         {
        //             // Remove existing compositions
        //             var existingCompositions = await _context.ItemCompositions
        //                 .Where(ic => ic.ItemId == itemId)
        //                 .ToListAsync();

        //             if (existingCompositions.Any())
        //             {
        //                 _context.ItemCompositions.RemoveRange(existingCompositions);
        //             }

        //             // Add new compositions
        //             if (updateItemDto.CompositionIds.Any())
        //             {
        //                 // Validate new compositions
        //                 var validCompositionsCount = await _context.Compositions
        //                     .AsNoTracking()
        //                     .Where(c => updateItemDto.CompositionIds.Contains(c.Id) && c.CompanyId == existingItem.CompanyId)
        //                     .CountAsync();

        //                 if (validCompositionsCount != updateItemDto.CompositionIds.Count)
        //                 {
        //                     throw new InvalidOperationException("One or more invalid compositions");
        //                 }

        //                 var newCompositions = updateItemDto.CompositionIds.Select(compositionId => new ItemComposition
        //                 {
        //                     ItemId = existingItem.Id,
        //                     CompositionId = compositionId
        //                 }).ToList();

        //                 await _context.ItemCompositions.AddRangeAsync(newCompositions);
        //             }
        //         }

        //         // Helper method to get default date
        //         DateTime GetDefaultDate(DateTime? providedDate)
        //         {
        //             return providedDate ?? fiscalYear.StartDate?.ToUniversalTime() ?? DateTime.UtcNow;
        //         }

        //         // Helper method to get default Nepali date
        //         string GetDefaultNepaliDate(string? providedNepaliDate)
        //         {
        //             return providedNepaliDate ?? fiscalYear.StartDateNepali ?? DateTime.UtcNow.ToString("yyyy-MM-dd");
        //         }

        //         // ========== UPDATE OPENING STOCK ENTRIES ONLY ==========
        //         // Identify opening stock entries by checking if they are the first entry for this item
        //         // and were created before any transactions
        //         _logger.LogInformation($"Updating opening stock prices for item {itemId}. New Price: {existingItem.Price}, New PuPrice: {existingItem.PuPrice}");

        //         // Get the initial opening stock entry for this item (created when the item was first created)
        //         // We can identify it by checking if it's the oldest stock entry with batch number "XXX" 
        //         // or if it's associated with the InitialOpeningStock
        //         var initialOpeningStockEntry = await _context.StockEntries
        //             .Where(se => se.ItemId == itemId && se.BatchNumber == "ADJ-ADD")
        //             .OrderBy(se => se.CreatedAt)
        //             .FirstOrDefaultAsync();

        //         if (initialOpeningStockEntry != null)
        //         {
        //             _logger.LogInformation($"Found initial opening stock entry with quantity: {initialOpeningStockEntry.Quantity}");

        //             // ✅ UPDATE ONLY THE INITIAL OPENING STOCK ENTRY
        //             initialOpeningStockEntry.Price = existingItem.Price ?? 0;
        //             initialOpeningStockEntry.NetPrice = existingItem.Price ?? 0;
        //             initialOpeningStockEntry.Mrp = existingItem.Price ?? 0;

        //             initialOpeningStockEntry.PuPrice = existingItem.PuPrice ?? 0;
        //             initialOpeningStockEntry.NetPuPrice = existingItem.PuPrice ?? 0;
        //             initialOpeningStockEntry.MainUnitPuPrice = existingItem.MainUnitPuPrice;

        //             initialOpeningStockEntry.UpdatedAt = DateTime.UtcNow;
        //             _context.Entry(initialOpeningStockEntry).State = EntityState.Modified;

        //             _logger.LogInformation($"Updated initial opening stock entry with new prices");
        //         }
        //         else
        //         {
        //             _logger.LogInformation("No initial opening stock entry found to update");
        //         }

        //         // ========== STOCK UPDATE LOGIC WITH VALIDATION ==========

        //         // Get the OLD stock from ItemInitialOpeningStock
        //         var existingInitialOpeningStock = await _context.Set<ItemInitialOpeningStock>()
        //             .FirstOrDefaultAsync(ios => ios.ItemId == itemId);

        //         decimal oldStock = 0;
        //         if (existingInitialOpeningStock != null)
        //         {
        //             oldStock = existingInitialOpeningStock.OpeningStock;
        //         }

        //         // Get the NEW requested stock
        //         decimal newStock = 0;
        //         if (updateItemDto.OpeningStock.HasValue)
        //         {
        //             newStock = updateItemDto.OpeningStock.Value;
        //         }

        //         // ========== STOCK VALIDATION: PREVENT NEGATIVE STOCK ==========
        //         // Calculate the total stock that has been used/sold through transactions
        //         // We need to check if the new stock would go negative

        //         // Get current total stock from all stock entries (positive stock)
        //         var currentTotalStock = await _context.StockEntries
        //             .Where(se => se.ItemId == itemId && se.Quantity > 0)
        //             .SumAsync(se => se.Quantity);

        //         // Get total stock consumed (negative stock from transactions)
        //         var consumedStock = await _context.StockEntries
        //             .Where(se => se.ItemId == itemId && se.Quantity < 0)
        //             .SumAsync(se => Math.Abs(se.Quantity));

        //         // Calculate effective stock
        //         decimal effectiveStock = currentTotalStock - consumedStock;

        //         _logger.LogInformation($"Item {itemId} - Old Stock: {oldStock}, New Stock: {newStock}, Effective Stock: {effectiveStock}");

        //         // ✅ VALIDATION: If decreasing stock, ensure it doesn't go below effective stock
        //         if (newStock < oldStock)
        //         {
        //             decimal decreaseAmount = oldStock - newStock;

        //             if (decreaseAmount > effectiveStock)
        //             {
        //                 var itemName = existingItem.Name ?? "Item";
        //                 throw new InvalidOperationException(
        //                     $"Cannot reduce stock from {oldStock} to {newStock} for '{itemName}'. " +
        //                     $"Only {effectiveStock} units available to reduce. " +
        //                     $"Stock has been consumed by {consumedStock} units through transactions.");
        //             }

        //             _logger.LogInformation($"Stock reduction of {decreaseAmount} is valid. Available to reduce: {effectiveStock}");
        //         }

        //         // Calculate the difference (adjustment needed) - only if valid
        //         decimal stockDifference = newStock - oldStock;

        //         _logger.LogInformation($"Item {itemId} - Old Stock: {oldStock}, New Stock: {newStock}, Difference: {stockDifference}");

        //         // 1. UPDATE ItemInitialOpeningStock with new prices FROM FRONTEND
        //         if (existingInitialOpeningStock != null)
        //         {
        //             // Update existing
        //             existingInitialOpeningStock.OpeningStock = newStock;
        //             existingInitialOpeningStock.OpeningStockValue = newStock * (existingItem.PuPrice ?? 0);
        //             existingInitialOpeningStock.PurchasePrice = existingItem.PuPrice ?? 0; // ✅ FROM FRONTEND
        //             existingInitialOpeningStock.SalesPrice = existingItem.Price ?? 0;      // ✅ FROM FRONTEND
        //             existingInitialOpeningStock.Date = GetDefaultDate(updateItemDto.InitialOpeningStock?.Date);
        //             existingInitialOpeningStock.NepaliDate = GetDefaultNepaliDate(updateItemDto.InitialOpeningStock?.NepaliDate);
        //             existingInitialOpeningStock.UpdatedAt = DateTime.UtcNow;

        //             _context.Entry(existingInitialOpeningStock).State = EntityState.Modified;
        //         }
        //         else if (newStock > 0)
        //         {
        //             // Create new if it doesn't exist and stock > 0
        //             var newInitialOpeningStock = new ItemInitialOpeningStock
        //             {
        //                 Id = Guid.NewGuid(),
        //                 ItemId = existingItem.Id,
        //                 CompanyId = existingItem.CompanyId,
        //                 InitialFiscalYearId = updateItemDto.InitialOpeningStock?.InitialFiscalYearId ?? fiscalYearId,
        //                 OpeningStock = newStock,
        //                 OpeningStockValue = newStock * (existingItem.PuPrice ?? 0),
        //                 PurchasePrice = existingItem.PuPrice ?? 0, // ✅ FROM FRONTEND
        //                 SalesPrice = existingItem.Price ?? 0,      // ✅ FROM FRONTEND
        //                 Date = GetDefaultDate(updateItemDto.InitialOpeningStock?.Date),
        //                 NepaliDate = GetDefaultNepaliDate(updateItemDto.InitialOpeningStock?.NepaliDate),
        //                 CreatedAt = DateTime.UtcNow,
        //                 UpdatedAt = DateTime.UtcNow
        //             };

        //             await _context.Set<ItemInitialOpeningStock>().AddAsync(newInitialOpeningStock);
        //             existingItem.InitialOpeningStock = newInitialOpeningStock;
        //         }

        //         // 2. UPDATE ItemOpeningStockByFiscalYear for current fiscal year with new prices FROM FRONTEND
        //         var currentFiscalYearOpeningStock = existingItem.OpeningStocksByFiscalYear?
        //             .FirstOrDefault(os => os.FiscalYearId == fiscalYearId);

        //         if (currentFiscalYearOpeningStock != null)
        //         {
        //             // Update existing
        //             currentFiscalYearOpeningStock.OpeningStock = newStock;
        //             currentFiscalYearOpeningStock.OpeningStockValue = newStock * (existingItem.PuPrice ?? 0);
        //             currentFiscalYearOpeningStock.PurchasePrice = existingItem.PuPrice ?? 0; // ✅ FROM FRONTEND
        //             currentFiscalYearOpeningStock.SalesPrice = existingItem.Price ?? 0;      // ✅ FROM FRONTEND
        //             currentFiscalYearOpeningStock.Date = GetDefaultDate(updateItemDto.InitialOpeningStock?.Date);
        //             currentFiscalYearOpeningStock.NepaliDate = GetDefaultNepaliDate(updateItemDto.InitialOpeningStock?.NepaliDate);
        //             currentFiscalYearOpeningStock.UpdatedAt = DateTime.UtcNow;
        //         }
        //         else if (newStock > 0)
        //         {
        //             // Create new if it doesn't exist and stock > 0
        //             var newOpeningStockRecord = new ItemOpeningStockByFiscalYear
        //             {
        //                 Id = Guid.NewGuid(),
        //                 ItemId = existingItem.Id,
        //                 FiscalYearId = fiscalYearId,
        //                 CompanyId = existingItem.CompanyId,
        //                 OpeningStock = newStock,
        //                 OpeningStockValue = newStock * (existingItem.PuPrice ?? 0),
        //                 PurchasePrice = existingItem.PuPrice ?? 0, // ✅ FROM FRONTEND
        //                 SalesPrice = existingItem.Price ?? 0,      // ✅ FROM FRONTEND
        //                 Date = GetDefaultDate(updateItemDto.InitialOpeningStock?.Date),
        //                 NepaliDate = GetDefaultNepaliDate(updateItemDto.InitialOpeningStock?.NepaliDate),
        //                 CreatedAt = DateTime.UtcNow,
        //                 UpdatedAt = DateTime.UtcNow
        //             };

        //             await _context.Set<ItemOpeningStockByFiscalYear>().AddAsync(newOpeningStockRecord);
        //         }

        //         // 3. HANDLE STOCK ENTRY ADJUSTMENT (only if stockDifference is valid)
        //         if (Math.Abs(stockDifference) > 0.001m)
        //         {
        //             if (stockDifference > 0)
        //             {
        //                 // CASE 1: INCREASING STOCK
        //                 // Create a positive adjustment entry with CURRENT prices
        //                 _logger.LogInformation($"Increasing stock for item {itemId} by {stockDifference}");

        //                 var newStockEntry = new StockEntry
        //                 {
        //                     Id = Guid.NewGuid(),
        //                     ItemId = existingItem.Id,
        //                     CompanyId = existingItem.CompanyId,
        //                     WsUnit = existingItem.WsUnit,
        //                     Quantity = stockDifference, // Positive addition
        //                     Price = existingItem.Price ?? 0,
        //                     NetPrice = existingItem.Price ?? 0,
        //                     PuPrice = existingItem.PuPrice ?? 0,
        //                     NetPuPrice = existingItem.PuPrice ?? 0,
        //                     MainUnitPuPrice = existingItem.MainUnitPuPrice,
        //                     Mrp = existingItem.Price ?? 0,
        //                     BatchNumber = "ADJ-ADD",
        //                     ExpiryDate = DateOnly.FromDateTime(DateTime.UtcNow.AddYears(2)),
        //                     ExpiryStatus = "safe",
        //                     DaysUntilExpiry = 730,
        //                     FiscalYearId = fiscalYearId,
        //                     UniqueUuid = Guid.NewGuid().ToString(),
        //                     Date = GetDefaultDate(updateItemDto.InitialOpeningStock?.Date),
        //                     NepaliDate = GetDefaultNepaliDate(updateItemDto.InitialOpeningStock?.NepaliDate),
        //                     CreatedAt = DateTime.UtcNow,
        //                     UpdatedAt = DateTime.UtcNow
        //                 };

        //                 await _context.StockEntries.AddAsync(newStockEntry);
        //                 _logger.LogInformation($"Created positive adjustment entry of {stockDifference} for item {itemId} with current prices");
        //             }
        //             else
        //             {
        //                 // CASE 2: DECREASING STOCK
        //                 // Reduce from positive stock entries using FIFO
        //                 decimal remainingToReduce = Math.Abs(stockDifference);

        //                 _logger.LogInformation($"Decreasing stock for item {itemId} by {remainingToReduce}");

        //                 // Get all positive stock entries (oldest first - FIFO)
        //                 var positiveStockEntries = await _context.StockEntries
        //                     .Where(se => se.ItemId == itemId && se.Quantity > 0)
        //                     .OrderBy(se => se.CreatedAt)
        //                     .ToListAsync();

        //                 // Track entries that need to be deleted (quantity becomes 0)
        //                 var entriesToDelete = new List<StockEntry>();

        //                 foreach (var entry in positiveStockEntries)
        //                 {
        //                     if (remainingToReduce <= 0)
        //                         break;

        //                     if (entry.Quantity <= remainingToReduce)
        //                     {
        //                         // Fully reduce this entry - mark for deletion
        //                         remainingToReduce -= entry.Quantity;
        //                         entry.Quantity = 0;
        //                         entriesToDelete.Add(entry);
        //                         _logger.LogInformation($"Fully reduced stock entry {entry.Id} by {entry.Quantity} - will be deleted");
        //                     }
        //                     else
        //                     {
        //                         // Partially reduce this entry
        //                         entry.Quantity -= remainingToReduce;
        //                         _context.Entry(entry).State = EntityState.Modified;
        //                         _logger.LogInformation($"Partially reduced stock entry {entry.Id} by {remainingToReduce}. Remaining: {entry.Quantity}");
        //                         remainingToReduce = 0;
        //                     }
        //                 }

        //                 // Delete all entries that have quantity 0
        //                 foreach (var entry in entriesToDelete)
        //                 {
        //                     _context.StockEntries.Remove(entry);
        //                     _logger.LogInformation($"Deleted stock entry {entry.Id} with quantity 0");
        //                 }

        //                 _logger.LogInformation($"Successfully reduced stock by {Math.Abs(stockDifference)} using existing positive stock entries.");
        //             }
        //         }
        //         else
        //         {
        //             _logger.LogInformation($"No stock adjustment needed for item {itemId} - stock unchanged");
        //         }

        //         // Update the Item's OpeningStock property as well
        //         existingItem.OpeningStock = newStock;

        //         try
        //         {
        //             await _context.SaveChangesAsync();
        //             await transaction.CommitAsync();

        //             _logger.LogInformation($"Item {itemId} updated successfully. Stock: {oldStock} -> {newStock}, Adjustment: {stockDifference}");
        //             return existingItem;
        //         }
        //         catch (DbUpdateConcurrencyException ex)
        //         {
        //             await transaction.RollbackAsync();
        //             _logger.LogError(ex, $"Concurrency error updating item {itemId}. Data may have been modified by another process.");
        //             throw new InvalidOperationException("The item was modified by another process. Please refresh and try again.");
        //         }
        //         catch (DbUpdateException ex)
        //         {
        //             await transaction.RollbackAsync();
        //             _logger.LogError(ex, $"Database error updating item {itemId}");
        //             throw;
        //         }
        //     }
        //     catch (Exception ex)
        //     {
        //         await transaction.RollbackAsync();
        //         _logger.LogError(ex, $"Error updating item {itemId}");
        //         throw;
        //     }
        // }

        public async Task<Item> UpdateItemAsync(Guid itemId, UpdateItemDTO updateItemDto, Guid companyId, Guid fiscalYearId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                // 1. Validate fiscal year exists and belongs to company
                var fiscalYear = await _context.FiscalYears
                    .FirstOrDefaultAsync(f => f.Id == fiscalYearId && f.CompanyId == companyId);

                if (fiscalYear == null)
                {
                    throw new InvalidOperationException($"Fiscal year {fiscalYearId} not found for company {companyId}");
                }

                // 2. Get the initial fiscal year for this company
                var initialFiscalYear = await _context.FiscalYears
                    .Where(f => f.CompanyId == companyId)
                    .OrderBy(f => f.StartDate)
                    .FirstOrDefaultAsync();

                if (initialFiscalYear == null)
                {
                    throw new InvalidOperationException("Initial fiscal year not found");
                }

                // 3. Check if current fiscal year is the initial fiscal year
                bool isInitialFiscalYear = fiscalYear.Id == initialFiscalYear.Id;

                _logger.LogInformation($"Current Fiscal Year: {fiscalYear.Name}, Is Initial: {isInitialFiscalYear}");

                // Load the item WITH tracking for updates
                var existingItem = await _context.Items
                    .Include(i => i.ItemCompositions)
                    .Include(i => i.OpeningStocksByFiscalYear)
                    .Include(i => i.ClosingStocksByFiscalYear)
                    .Include(i => i.StockEntries)
                    .Include(i => i.Sales)
                    .Include(i => i.Purchases)
                    .Include(i => i.SalesReturns)
                    .Include(i => i.PurchaseReturns)
                    .FirstOrDefaultAsync(i => i.Id == itemId);

                if (existingItem == null)
                {
                    throw new KeyNotFoundException($"Item with ID {itemId} not found");
                }

                // Check for duplicate name (excluding current item)
                if (!string.IsNullOrEmpty(updateItemDto.Name))
                {
                    var duplicateItem = await _context.Items
                        .AsNoTracking()
                        .FirstOrDefaultAsync(i => i.Id != itemId
                            && i.CompanyId == existingItem.CompanyId
                            && i.Name.ToLower() == updateItemDto.Name.Trim().ToLower());

                    if (duplicateItem != null)
                    {
                        throw new InvalidOperationException($"Item '{updateItemDto.Name?.Trim()}' already exists for this fiscal year");
                    }
                }

                // Store old values for logging
                decimal? oldPrice = existingItem.Price;
                decimal? oldPuPrice = existingItem.PuPrice;

                // Update basic properties (ALWAYS allowed regardless of fiscal year)
                if (!string.IsNullOrEmpty(updateItemDto.Name))
                {
                    existingItem.Name = updateItemDto.Name.Trim();
                }

                existingItem.Hscode = updateItemDto.Hscode;

                if (updateItemDto.CategoryId.HasValue)
                {
                    var categoryExists = await _context.Categories
                        .AsNoTracking()
                        .AnyAsync(c => c.Id == updateItemDto.CategoryId.Value && c.CompanyId == existingItem.CompanyId);

                    if (!categoryExists)
                    {
                        throw new InvalidOperationException("Invalid category");
                    }
                    existingItem.CategoryId = updateItemDto.CategoryId.Value;
                }

                if (updateItemDto.ItemsCompanyId.HasValue)
                {
                    var itemsCompanyExists = await _context.ItemCompanies
                        .AsNoTracking()
                        .AnyAsync(ic => ic.Id == updateItemDto.ItemsCompanyId.Value && ic.CompanyId == existingItem.CompanyId);

                    if (!itemsCompanyExists)
                    {
                        throw new InvalidOperationException("Invalid item company");
                    }
                    existingItem.ItemsCompanyId = updateItemDto.ItemsCompanyId.Value;
                }

                // ✅ ONLY update prices if in INITIAL fiscal year
                if (isInitialFiscalYear)
                {
                    _logger.LogInformation($"Updating prices for item {itemId} in initial fiscal year");
                    existingItem.Price = updateItemDto.Price ?? 0;
                    existingItem.PuPrice = updateItemDto.PuPrice ?? 0;
                    existingItem.MainUnitPuPrice = updateItemDto.MainUnitPuPrice ?? 0;
                }
                else
                {
                    _logger.LogInformation($"Skipping price updates for item {itemId} - Not in initial fiscal year");
                    // Keep existing prices
                }

                if (updateItemDto.MainUnitId.HasValue)
                {
                    if (updateItemDto.MainUnitId.Value != Guid.Empty)
                    {
                        var mainUnitExists = await _context.MainUnits
                            .AsNoTracking()
                            .AnyAsync(u => u.Id == updateItemDto.MainUnitId.Value && u.CompanyId == existingItem.CompanyId);

                        if (!mainUnitExists)
                        {
                            throw new InvalidOperationException("Invalid main unit");
                        }
                    }
                    existingItem.MainUnitId = updateItemDto.MainUnitId.Value;
                }

                existingItem.WsUnit = updateItemDto.WsUnit ?? existingItem.WsUnit;

                if (updateItemDto.UnitId.HasValue)
                {
                    var unitExists = await _context.Units
                        .AsNoTracking()
                        .AnyAsync(u => u.Id == updateItemDto.UnitId.Value && u.CompanyId == existingItem.CompanyId);

                    if (!unitExists)
                    {
                        throw new InvalidOperationException("Invalid unit");
                    }
                    existingItem.UnitId = updateItemDto.UnitId.Value;
                }

                if (!string.IsNullOrEmpty(updateItemDto.VatStatus))
                {
                    existingItem.VatStatus = updateItemDto.VatStatus;
                }

                existingItem.MinStock = updateItemDto.MinStock ?? existingItem.MinStock;
                existingItem.MaxStock = updateItemDto.MaxStock ?? existingItem.MaxStock;
                existingItem.ReorderLevel = updateItemDto.ReorderLevel ?? existingItem.ReorderLevel;

                if (!string.IsNullOrEmpty(updateItemDto.Status))
                {
                    existingItem.Status = updateItemDto.Status;
                }

                existingItem.UpdatedAt = DateTime.UtcNow;

                // Update compositions if provided (ALWAYS allowed)
                if (updateItemDto.CompositionIds != null)
                {
                    // Remove existing compositions
                    var existingCompositions = await _context.ItemCompositions
                        .Where(ic => ic.ItemId == itemId)
                        .ToListAsync();

                    if (existingCompositions.Any())
                    {
                        _context.ItemCompositions.RemoveRange(existingCompositions);
                    }

                    // Add new compositions
                    if (updateItemDto.CompositionIds.Any())
                    {
                        // Validate new compositions
                        var validCompositionsCount = await _context.Compositions
                            .AsNoTracking()
                            .Where(c => updateItemDto.CompositionIds.Contains(c.Id) && c.CompanyId == existingItem.CompanyId)
                            .CountAsync();

                        if (validCompositionsCount != updateItemDto.CompositionIds.Count)
                        {
                            throw new InvalidOperationException("One or more invalid compositions");
                        }

                        var newCompositions = updateItemDto.CompositionIds.Select(compositionId => new ItemComposition
                        {
                            ItemId = existingItem.Id,
                            CompositionId = compositionId
                        }).ToList();

                        await _context.ItemCompositions.AddRangeAsync(newCompositions);
                    }
                }

                // Helper method to get default date
                DateTime GetDefaultDate(DateTime? providedDate)
                {
                    return providedDate ?? fiscalYear.StartDate?.ToUniversalTime() ?? DateTime.UtcNow;
                }

                // Helper method to get default Nepali date
                string GetDefaultNepaliDate(string? providedNepaliDate)
                {
                    return providedNepaliDate ?? fiscalYear.StartDateNepali ?? DateTime.UtcNow.ToString("yyyy-MM-dd");
                }

                // ========== STOCK-RELATED UPDATES - ONLY IN INITIAL FISCAL YEAR ==========
                if (isInitialFiscalYear)
                {
                    _logger.LogInformation($"Processing stock updates for item {itemId} in initial fiscal year");

                    // ========== UPDATE OPENING STOCK ENTRIES ONLY ==========
                    // Identify opening stock entries by checking if they are the first entry for this item
                    _logger.LogInformation($"Updating opening stock prices for item {itemId}. New Price: {existingItem.Price}, New PuPrice: {existingItem.PuPrice}");

                    // Get the initial opening stock entry for this item
                    var initialOpeningStockEntry = await _context.StockEntries
                        .Where(se => se.ItemId == itemId && se.BatchNumber == "ADJ-ADD")
                        .OrderBy(se => se.CreatedAt)
                        .FirstOrDefaultAsync();

                    if (initialOpeningStockEntry != null)
                    {
                        _logger.LogInformation($"Found initial opening stock entry with quantity: {initialOpeningStockEntry.Quantity}");

                        // ✅ UPDATE ONLY THE INITIAL OPENING STOCK ENTRY
                        initialOpeningStockEntry.Price = existingItem.Price ?? 0;
                        initialOpeningStockEntry.NetPrice = existingItem.Price ?? 0;
                        initialOpeningStockEntry.Mrp = existingItem.Price ?? 0;

                        initialOpeningStockEntry.PuPrice = existingItem.PuPrice ?? 0;
                        initialOpeningStockEntry.NetPuPrice = existingItem.PuPrice ?? 0;
                        initialOpeningStockEntry.MainUnitPuPrice = existingItem.MainUnitPuPrice;

                        initialOpeningStockEntry.UpdatedAt = DateTime.UtcNow;
                        _context.Entry(initialOpeningStockEntry).State = EntityState.Modified;

                        _logger.LogInformation($"Updated initial opening stock entry with new prices");
                    }
                    else
                    {
                        _logger.LogInformation("No initial opening stock entry found to update");
                    }

                    // ========== STOCK UPDATE LOGIC WITH VALIDATION ==========

                    // Get the OLD stock from ItemInitialOpeningStock
                    var existingInitialOpeningStock = await _context.Set<ItemInitialOpeningStock>()
                        .FirstOrDefaultAsync(ios => ios.ItemId == itemId);

                    decimal oldStock = 0;
                    if (existingInitialOpeningStock != null)
                    {
                        oldStock = existingInitialOpeningStock.OpeningStock;
                    }

                    // Get the NEW requested stock
                    decimal newStock = 0;
                    if (updateItemDto.OpeningStock.HasValue)
                    {
                        newStock = updateItemDto.OpeningStock.Value;
                    }

                    // ========== STOCK VALIDATION: PREVENT NEGATIVE STOCK ==========
                    // Get current total stock from all stock entries (positive stock)
                    var currentTotalStock = await _context.StockEntries
                        .Where(se => se.ItemId == itemId && se.Quantity > 0)
                        .SumAsync(se => se.Quantity);

                    // Get total stock consumed (negative stock from transactions)
                    var consumedStock = await _context.StockEntries
                        .Where(se => se.ItemId == itemId && se.Quantity < 0)
                        .SumAsync(se => Math.Abs(se.Quantity));

                    // Calculate effective stock
                    decimal effectiveStock = currentTotalStock - consumedStock;

                    _logger.LogInformation($"Item {itemId} - Old Stock: {oldStock}, New Stock: {newStock}, Effective Stock: {effectiveStock}");

                    // ✅ VALIDATION: If decreasing stock, ensure it doesn't go below effective stock
                    if (newStock < oldStock)
                    {
                        decimal decreaseAmount = oldStock - newStock;

                        if (decreaseAmount > effectiveStock)
                        {
                            var itemName = existingItem.Name ?? "Item";
                            throw new InvalidOperationException(
                                $"Cannot reduce stock from {oldStock} to {newStock} for '{itemName}'. " +
                                $"Only {effectiveStock} units available to reduce. " +
                                $"Stock has been consumed by {consumedStock} units through transactions.");
                        }

                        _logger.LogInformation($"Stock reduction of {decreaseAmount} is valid. Available to reduce: {effectiveStock}");
                    }

                    // Calculate the difference (adjustment needed) - only if valid
                    decimal stockDifference = newStock - oldStock;

                    _logger.LogInformation($"Item {itemId} - Old Stock: {oldStock}, New Stock: {newStock}, Difference: {stockDifference}");

                    // 1. UPDATE ItemInitialOpeningStock with new prices FROM FRONTEND
                    if (existingInitialOpeningStock != null)
                    {
                        // Update existing
                        existingInitialOpeningStock.OpeningStock = newStock;
                        existingInitialOpeningStock.OpeningStockValue = newStock * (existingItem.PuPrice ?? 0);
                        existingInitialOpeningStock.PurchasePrice = existingItem.PuPrice ?? 0;
                        existingInitialOpeningStock.SalesPrice = existingItem.Price ?? 0;
                        existingInitialOpeningStock.Date = GetDefaultDate(updateItemDto.InitialOpeningStock?.Date);
                        existingInitialOpeningStock.NepaliDate = GetDefaultNepaliDate(updateItemDto.InitialOpeningStock?.NepaliDate);
                        existingInitialOpeningStock.UpdatedAt = DateTime.UtcNow;

                        _context.Entry(existingInitialOpeningStock).State = EntityState.Modified;
                    }
                    else if (newStock > 0)
                    {
                        // Create new if it doesn't exist and stock > 0
                        var newInitialOpeningStock = new ItemInitialOpeningStock
                        {
                            Id = Guid.NewGuid(),
                            ItemId = existingItem.Id,
                            CompanyId = existingItem.CompanyId,
                            InitialFiscalYearId = updateItemDto.InitialOpeningStock?.InitialFiscalYearId ?? fiscalYearId,
                            OpeningStock = newStock,
                            OpeningStockValue = newStock * (existingItem.PuPrice ?? 0),
                            PurchasePrice = existingItem.PuPrice ?? 0,
                            SalesPrice = existingItem.Price ?? 0,
                            Date = GetDefaultDate(updateItemDto.InitialOpeningStock?.Date),
                            NepaliDate = GetDefaultNepaliDate(updateItemDto.InitialOpeningStock?.NepaliDate),
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        };

                        await _context.Set<ItemInitialOpeningStock>().AddAsync(newInitialOpeningStock);
                        existingItem.InitialOpeningStock = newInitialOpeningStock;
                    }

                    // 2. UPDATE ItemOpeningStockByFiscalYear for current fiscal year with new prices FROM FRONTEND
                    var currentFiscalYearOpeningStock = existingItem.OpeningStocksByFiscalYear?
                        .FirstOrDefault(os => os.FiscalYearId == fiscalYearId);

                    if (currentFiscalYearOpeningStock != null)
                    {
                        // Update existing
                        currentFiscalYearOpeningStock.OpeningStock = newStock;
                        currentFiscalYearOpeningStock.OpeningStockValue = newStock * (existingItem.PuPrice ?? 0);
                        currentFiscalYearOpeningStock.PurchasePrice = existingItem.PuPrice ?? 0;
                        currentFiscalYearOpeningStock.SalesPrice = existingItem.Price ?? 0;
                        currentFiscalYearOpeningStock.Date = GetDefaultDate(updateItemDto.InitialOpeningStock?.Date);
                        currentFiscalYearOpeningStock.NepaliDate = GetDefaultNepaliDate(updateItemDto.InitialOpeningStock?.NepaliDate);
                        currentFiscalYearOpeningStock.UpdatedAt = DateTime.UtcNow;
                    }
                    else if (newStock > 0)
                    {
                        // Create new if it doesn't exist and stock > 0
                        var newOpeningStockRecord = new ItemOpeningStockByFiscalYear
                        {
                            Id = Guid.NewGuid(),
                            ItemId = existingItem.Id,
                            FiscalYearId = fiscalYearId,
                            CompanyId = existingItem.CompanyId,
                            OpeningStock = newStock,
                            OpeningStockValue = newStock * (existingItem.PuPrice ?? 0),
                            PurchasePrice = existingItem.PuPrice ?? 0,
                            SalesPrice = existingItem.Price ?? 0,
                            Date = GetDefaultDate(updateItemDto.InitialOpeningStock?.Date),
                            NepaliDate = GetDefaultNepaliDate(updateItemDto.InitialOpeningStock?.NepaliDate),
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        };

                        await _context.Set<ItemOpeningStockByFiscalYear>().AddAsync(newOpeningStockRecord);
                    }

                    // 3. HANDLE STOCK ENTRY ADJUSTMENT (only if stockDifference is valid)
                    if (Math.Abs(stockDifference) > 0.001m)
                    {
                        if (stockDifference > 0)
                        {
                            // CASE 1: INCREASING STOCK
                            _logger.LogInformation($"Increasing stock for item {itemId} by {stockDifference}");

                            var newStockEntry = new StockEntry
                            {
                                Id = Guid.NewGuid(),
                                ItemId = existingItem.Id,
                                CompanyId = existingItem.CompanyId,
                                WsUnit = existingItem.WsUnit,
                                Quantity = stockDifference,
                                Price = existingItem.Price ?? 0,
                                NetPrice = existingItem.Price ?? 0,
                                PuPrice = existingItem.PuPrice ?? 0,
                                NetPuPrice = existingItem.PuPrice ?? 0,
                                MainUnitPuPrice = existingItem.MainUnitPuPrice,
                                Mrp = existingItem.Price ?? 0,
                                BatchNumber = "ADJ-ADD",
                                ExpiryDate = DateOnly.FromDateTime(DateTime.UtcNow.AddYears(2)),
                                ExpiryStatus = "safe",
                                DaysUntilExpiry = 730,
                                FiscalYearId = fiscalYearId,
                                UniqueUuid = Guid.NewGuid().ToString(),
                                Date = GetDefaultDate(updateItemDto.InitialOpeningStock?.Date),
                                NepaliDate = GetDefaultNepaliDate(updateItemDto.InitialOpeningStock?.NepaliDate),
                                CreatedAt = DateTime.UtcNow,
                                UpdatedAt = DateTime.UtcNow
                            };

                            await _context.StockEntries.AddAsync(newStockEntry);
                            _logger.LogInformation($"Created positive adjustment entry of {stockDifference} for item {itemId} with current prices");
                        }
                        else
                        {
                            // CASE 2: DECREASING STOCK
                            decimal remainingToReduce = Math.Abs(stockDifference);

                            _logger.LogInformation($"Decreasing stock for item {itemId} by {remainingToReduce}");

                            // Get all positive stock entries (oldest first - FIFO)
                            var positiveStockEntries = await _context.StockEntries
                                .Where(se => se.ItemId == itemId && se.Quantity > 0)
                                .OrderBy(se => se.CreatedAt)
                                .ToListAsync();

                            var entriesToDelete = new List<StockEntry>();

                            foreach (var entry in positiveStockEntries)
                            {
                                if (remainingToReduce <= 0)
                                    break;

                                if (entry.Quantity <= remainingToReduce)
                                {
                                    remainingToReduce -= entry.Quantity;
                                    entry.Quantity = 0;
                                    entriesToDelete.Add(entry);
                                    _logger.LogInformation($"Fully reduced stock entry {entry.Id} by {entry.Quantity} - will be deleted");
                                }
                                else
                                {
                                    entry.Quantity -= remainingToReduce;
                                    _context.Entry(entry).State = EntityState.Modified;
                                    _logger.LogInformation($"Partially reduced stock entry {entry.Id} by {remainingToReduce}. Remaining: {entry.Quantity}");
                                    remainingToReduce = 0;
                                }
                            }

                            foreach (var entry in entriesToDelete)
                            {
                                _context.StockEntries.Remove(entry);
                                _logger.LogInformation($"Deleted stock entry {entry.Id} with quantity 0");
                            }

                            _logger.LogInformation($"Successfully reduced stock by {Math.Abs(stockDifference)} using existing positive stock entries.");
                        }
                    }
                    else
                    {
                        _logger.LogInformation($"No stock adjustment needed for item {itemId} - stock unchanged");
                    }

                    // Update the Item's OpeningStock property
                    existingItem.OpeningStock = newStock;
                }
                else
                {
                    // ✅ NOT in initial fiscal year - SKIP ALL stock-related updates
                    _logger.LogInformation($"Skipping all stock-related updates for item {itemId} - Not in initial fiscal year");

                    // ⚠️ Optionally: If the user tries to send stock data in non-initial year, ignore it
                    if (updateItemDto.OpeningStock.HasValue)
                    {
                        _logger.LogWarning($"User attempted to update opening stock in non-initial fiscal year. Ignoring.");
                    }
                    if (updateItemDto.Price.HasValue || updateItemDto.PuPrice.HasValue)
                    {
                        _logger.LogWarning($"User attempted to update prices in non-initial fiscal year. Ignoring.");
                    }
                    if (updateItemDto.InitialOpeningStock != null)
                    {
                        _logger.LogWarning($"User attempted to update initial opening stock in non-initial fiscal year. Ignoring.");
                    }
                }

                try
                {
                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();

                    _logger.LogInformation($"Item {itemId} updated successfully. Initial Fiscal Year: {isInitialFiscalYear}");
                    return existingItem;
                }
                catch (DbUpdateConcurrencyException ex)
                {
                    await transaction.RollbackAsync();
                    _logger.LogError(ex, $"Concurrency error updating item {itemId}");
                    throw new InvalidOperationException("The item was modified by another process. Please refresh and try again.");
                }
                catch (DbUpdateException ex)
                {
                    await transaction.RollbackAsync();
                    _logger.LogError(ex, $"Database error updating item {itemId}");
                    throw;
                }
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, $"Error updating item {itemId}");
                throw;
            }
        }

        public async Task<bool> DeleteItemAsync(Guid itemId, Guid companyId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                // Check if item exists and belongs to the company
                var item = await _context.Items
                    .FirstOrDefaultAsync(i => i.Id == itemId && i.CompanyId == companyId);

                if (item == null)
                {
                    _logger.LogWarning("Item {ItemId} not found for company {CompanyId}", itemId, companyId);
                    return false;
                }

                // Check if the item has any related transactions via TransactionItems
                bool hasSales = await _context.SalesBills
                    .AnyAsync(sb => sb.CompanyId == companyId &&
                                  sb.Items != null &&
                                  sb.Items.Any(i => i.ItemId == itemId));

                bool hasSalesReturn = await _context.SalesReturns
                    .AnyAsync(sr => sr.CompanyId == companyId &&
                                  sr.Items != null &&
                                  sr.Items.Any(i => i.ItemId == itemId));

                bool hasPurchase = await _context.PurchaseBills
                    .AnyAsync(pb => pb.CompanyId == companyId &&
                                  pb.Items != null &&
                                  pb.Items.Any(i => i.ItemId == itemId));

                bool hasPurchaseReturn = await _context.PurchaseReturns
                    .AnyAsync(pr => pr.CompanyId == companyId &&
                                  pr.Items != null &&
                                  pr.Items.Any(i => i.ItemId == itemId));

                bool hasStockAdjustment = await _context.StockAdjustments
                    .AnyAsync(sa => sa.CompanyId == companyId &&
                                  sa.Items != null &&
                                  sa.Items.Any(i => i.ItemId == itemId));

                // Check if the item has any related transactions via TransactionItems (new structure)
                bool hasTransaction = await _context.TransactionItems
                    .AnyAsync(ti => ti.ItemId == itemId &&
                                  ti.Transaction != null &&
                                  ti.Transaction.CompanyId == companyId);

                if (hasSales || hasSalesReturn || hasPurchase || hasPurchaseReturn || hasStockAdjustment || hasTransaction)
                {
                    _logger.LogWarning("Cannot delete item {ItemId} because it has related transactions", itemId);
                    return false;
                }

                // Load related entities for deletion
                await _context.Entry(item)
                    .Collection(i => i.ItemCompositions)
                    .LoadAsync();

                await _context.Entry(item)
                    .Collection(i => i.StockEntries)
                    .LoadAsync();

                // Check for InitialOpeningStock
                var initialOpeningStock = await _context.Set<ItemInitialOpeningStock>()
                    .FirstOrDefaultAsync(ios => ios.ItemId == itemId);

                if (initialOpeningStock != null)
                {
                    _context.Set<ItemInitialOpeningStock>().Remove(initialOpeningStock);
                }

                // Delete opening stocks by fiscal year
                var openingStocks = await _context.Set<ItemOpeningStockByFiscalYear>()
                    .Where(os => os.ItemId == itemId)
                    .ToListAsync();

                if (openingStocks.Any())
                {
                    _context.Set<ItemOpeningStockByFiscalYear>().RemoveRange(openingStocks);
                }

                // Delete closing stocks by fiscal year
                var closingStocks = await _context.Set<ItemClosingStockByFiscalYear>()
                    .Where(cs => cs.ItemId == itemId)
                    .ToListAsync();

                if (closingStocks.Any())
                {
                    _context.Set<ItemClosingStockByFiscalYear>().RemoveRange(closingStocks);
                }

                // Delete related entities
                if (item.ItemCompositions != null && item.ItemCompositions.Any())
                {
                    _context.ItemCompositions.RemoveRange(item.ItemCompositions);
                }

                if (item.StockEntries != null && item.StockEntries.Any())
                {
                    _context.StockEntries.RemoveRange(item.StockEntries);
                }

                // Finally delete the item
                _context.Items.Remove(item);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                _logger.LogInformation("Item {ItemId} deleted successfully", itemId);
                return true;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Error deleting item {ItemId}", itemId);
                throw;
            }
        }

        public async Task<BulkDeleteResult> BulkDeleteItemsAsync(List<Guid> itemIds, Guid companyId)
        {
            var result = new BulkDeleteResult();
            var itemsToDelete = new List<Item>();
            var failedItems = new List<BulkDeleteItemResult>();

            try
            {
                // Get all items that belong to the company
                var items = await _context.Items
                    .Where(i => itemIds.Contains(i.Id) && i.CompanyId == companyId)
                    .Include(i => i.ItemCompositions)
                    .Include(i => i.StockEntries)
                    .ToListAsync();

                // Track which IDs were found
                var foundItemIds = items.Select(i => i.Id).ToHashSet();
                var notFoundIds = itemIds.Where(id => !foundItemIds.Contains(id)).ToList();

                // Add not found items to failed results
                foreach (var notFoundId in notFoundIds)
                {
                    failedItems.Add(new BulkDeleteItemResult
                    {
                        ItemId = notFoundId,
                        Success = false,
                        Status = "not_found",
                        ErrorMessage = "Item not found or does not belong to this company"
                    });
                }

                // Check each found item for transactions
                var validItems = new List<Item>();
                var transactionErrors = new Dictionary<Guid, string>();

                foreach (var item in items)
                {
                    var hasTransactions = await HasRelatedTransactionsAsync(item.Id, companyId);

                    if (hasTransactions)
                    {
                        failedItems.Add(new BulkDeleteItemResult
                        {
                            ItemId = item.Id,
                            ItemName = item.Name,
                            Success = false,
                            Status = "has_transactions",
                            ErrorMessage = "Item cannot be deleted as it has related transactions or entries."
                        });
                    }
                    else
                    {
                        validItems.Add(item);
                    }
                }

                if (validItems.Any())
                {
                    using var transaction = await _context.Database.BeginTransactionAsync();

                    try
                    {
                        var validItemIds = validItems.Select(i => i.Id).ToList();

                        // Delete related entities for all valid items
                        await DeleteRelatedEntitiesBulkAsync(validItemIds, companyId);

                        // Remove the items
                        _context.Items.RemoveRange(validItems);
                        await _context.SaveChangesAsync();
                        await transaction.CommitAsync();

                        // Add successful results
                        foreach (var item in validItems)
                        {
                            result.Results.Add(new BulkDeleteItemResult
                            {
                                ItemId = item.Id,
                                ItemName = item.Name,
                                Success = true,
                                Status = "deleted"
                            });
                        }

                        _logger.LogInformation("Bulk delete completed: {DeletedCount} items deleted, {FailedCount} failed",
                            validItems.Count, failedItems.Count);
                    }
                    catch (Exception ex)
                    {
                        await transaction.RollbackAsync();
                        _logger.LogError(ex, "Error during bulk delete transaction");

                        // Mark all valid items as failed due to transaction error
                        foreach (var item in validItems)
                        {
                            failedItems.Add(new BulkDeleteItemResult
                            {
                                ItemId = item.Id,
                                ItemName = item.Name,
                                Success = false,
                                Status = "error",
                                ErrorMessage = "Database error occurred during deletion"
                            });
                        }

                        throw; // Re-throw to let controller handle
                    }
                }

                // Combine results
                result.Results.AddRange(failedItems);
                result.TotalRequested = itemIds.Count;
                result.DeletedCount = validItems.Count;
                result.FailedCount = failedItems.Count;
                result.Success = failedItems.Count == 0;

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in bulk delete for company {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<bool> HasRelatedTransactionsAsync(Guid itemId, Guid companyId)
        {
            bool hasSales = await _context.SalesBills
                .AnyAsync(sb => sb.CompanyId == companyId &&
                              sb.Items != null &&
                              sb.Items.Any(i => i.ItemId == itemId));

            bool hasSalesReturn = await _context.SalesReturns
                .AnyAsync(sr => sr.CompanyId == companyId &&
                              sr.Items != null &&
                              sr.Items.Any(i => i.ItemId == itemId));

            bool hasPurchase = await _context.PurchaseBills
                .AnyAsync(pb => pb.CompanyId == companyId &&
                              pb.Items != null &&
                              pb.Items.Any(i => i.ItemId == itemId));

            bool hasPurchaseReturn = await _context.PurchaseReturns
                .AnyAsync(pr => pr.CompanyId == companyId &&
                              pr.Items != null &&
                              pr.Items.Any(i => i.ItemId == itemId));

            bool hasStockAdjustment = await _context.StockAdjustments
                .AnyAsync(sa => sa.CompanyId == companyId &&
                              sa.Items != null &&
                              sa.Items.Any(i => i.ItemId == itemId));

            bool hasTransaction = await _context.TransactionItems
                .AnyAsync(ti => ti.ItemId == itemId &&
                              ti.Transaction != null &&
                              ti.Transaction.CompanyId == companyId);

            return hasSales || hasSalesReturn || hasPurchase || hasPurchaseReturn ||
                   hasStockAdjustment || hasTransaction;
        }

        public async Task DeleteRelatedEntitiesBulkAsync(List<Guid> itemIds, Guid companyId)
        {
            // Delete ItemCompositions
            var compositions = await _context.ItemCompositions
                .Where(ic => itemIds.Contains(ic.ItemId))
                .ToListAsync();

            if (compositions.Any())
            {
                _context.ItemCompositions.RemoveRange(compositions);
            }

            // Delete StockEntries
            var stockEntries = await _context.StockEntries
                .Where(se => itemIds.Contains(se.ItemId))
                .ToListAsync();

            if (stockEntries.Any())
            {
                _context.StockEntries.RemoveRange(stockEntries);
            }

            // Delete ItemInitialOpeningStock
            var initialOpeningStocks = await _context.Set<ItemInitialOpeningStock>()
                .Where(ios => itemIds.Contains(ios.ItemId))
                .ToListAsync();

            if (initialOpeningStocks.Any())
            {
                _context.Set<ItemInitialOpeningStock>().RemoveRange(initialOpeningStocks);
            }

            // Delete ItemOpeningStockByFiscalYear
            var openingStocks = await _context.Set<ItemOpeningStockByFiscalYear>()
                .Where(os => itemIds.Contains(os.ItemId))
                .ToListAsync();

            if (openingStocks.Any())
            {
                _context.Set<ItemOpeningStockByFiscalYear>().RemoveRange(openingStocks);
            }

            // Delete ItemClosingStockByFiscalYear
            var closingStocks = await _context.Set<ItemClosingStockByFiscalYear>()
                .Where(cs => itemIds.Contains(cs.ItemId))
                .ToListAsync();

            if (closingStocks.Any())
            {
                _context.Set<ItemClosingStockByFiscalYear>().RemoveRange(closingStocks);
            }
        }

        /// <summary>
        /// Searches items by name, company, or category
        /// </summary>
        public async Task<List<Item>> SearchItemsAsync(Guid companyId, string searchTerm)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(searchTerm))
                {
                    return await GetItemsByCompanyAsync(companyId, await GetCurrentFiscalYearIdAsync(companyId));
                }

                var items = await _context.Items
                    .Where(i => i.CompanyId == companyId &&
                               (i.Name.ToLower().Contains(searchTerm.ToLower()) ||
                                (i.ItemCompany != null && i.ItemCompany.Name.ToLower().Contains(searchTerm.ToLower())) ||
                                (i.Category != null && i.Category.Name.ToLower().Contains(searchTerm.ToLower())) ||
                                i.UniqueNumber.ToString().Contains(searchTerm) ||
                                i.BarcodeNumber.ToString().Contains(searchTerm)))
                    .Include(i => i.Category)
                    .Include(i => i.ItemCompany)
                    .Include(i => i.Unit)
                    .Include(i => i.MainUnit)
                    .OrderBy(i => i.Name)
                    .Take(100) // Limit results
                    .ToListAsync();

                _logger.LogInformation("Found {Count} items matching '{SearchTerm}' for company {CompanyId}",
                    items.Count, searchTerm, companyId);
                return items;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error searching items with term '{SearchTerm}' for company {CompanyId}",
                    searchTerm, companyId);
                throw;
            }
        }

        /// <summary>
        /// Gets detailed item information
        /// </summary>
        public async Task<ItemDetailsDTO> GetItemDetailsAsync(Guid itemId)
        {
            try
            {
                var item = await GetItemByIdAsync(itemId);

                if (item == null)
                {
                    return null;
                }

                // Calculate current stock
                decimal currentStock = item.OpeningStock;
                if (item.StockEntries != null && item.StockEntries.Any())
                {
                    currentStock = item.StockEntries.Sum(se => se.Quantity);
                }

                var details = new ItemDetailsDTO
                {
                    Id = item.Id,
                    Name = item.Name,
                    Hscode = item.Hscode,
                    CategoryId = item.CategoryId,
                    CategoryName = item.Category?.Name,
                    ItemsCompanyId = item.ItemsCompanyId,
                    ItemsCompanyName = item.ItemCompany?.Name,
                    Price = item.Price,
                    PuPrice = item.PuPrice,
                    MainUnitPuPrice = item.MainUnitPuPrice,
                    MainUnitId = item.MainUnitId,
                    MainUnitName = item.MainUnit?.Name,
                    WsUnit = item.WsUnit,
                    UnitId = item.UnitId,
                    UnitName = item.Unit?.Name,
                    VatStatus = item.VatStatus,
                    OpeningStock = item.OpeningStock,
                    CurrentStock = currentStock,
                    MinStock = item.MinStock,
                    MaxStock = item.MaxStock,
                    ReorderLevel = item.ReorderLevel,
                    UniqueNumber = item.UniqueNumber,
                    BarcodeNumber = item.BarcodeNumber,
                    CompanyId = item.CompanyId,
                    CompanyName = item.Company?.Name,
                    Status = item.Status,
                    CreatedAt = item.CreatedAt,
                    UpdatedAt = item.UpdatedAt,
                    StockValue = currentStock * (item.Price ?? 0),
                    Compositions = item.ItemCompositions?.Select(ic => new CompositionItemDTO
                    {
                        Id = ic.Composition?.Id ?? Guid.Empty,
                        Name = ic.Composition?.Name ?? string.Empty,
                        VatStatus = item.VatStatus,
                        Status = item.Status,
                        Price = item.Price,
                        PuPrice = item.PuPrice,
                        UnitName = item.Unit?.Name,
                        CategoryName = item.Category?.Name,
                        CreatedAt = item.CreatedAt
                    }).ToList() ?? new List<CompositionItemDTO>(),
                    StockEntriesCount = item.StockEntries?.Count ?? 0,
                    HasTransactions = await CheckItemHasTransactionsAsync(itemId)
                };

                return details;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting item details for {ItemId}", itemId);
                throw;
            }
        }

        /// <summary>
        /// Gets items with stock below threshold
        /// </summary>
        public async Task<List<Item>> GetItemsWithLowStockAsync(Guid companyId, decimal threshold = 10)
        {
            try
            {
                var currentFiscalYearId = await GetCurrentFiscalYearIdAsync(companyId);

                var items = await _context.Items
                    .Where(i => i.CompanyId == companyId)
                    .Include(i => i.Category)
                    .Include(i => i.ItemCompany)
                    .Include(i => i.StockEntries)
                    .ToListAsync();

                var lowStockItems = items.Where(item =>
                {
                    decimal currentStock = item.OpeningStock;
                    if (item.StockEntries != null && item.StockEntries.Any())
                    {
                        currentStock = item.StockEntries.Sum(se => se.Quantity);
                    }
                    return currentStock <= threshold;
                }).ToList();

                _logger.LogInformation("Found {Count} items with low stock for company {CompanyId}",
                    lowStockItems.Count, companyId);
                return lowStockItems;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting low stock items for company {CompanyId}", companyId);
                throw;
            }
        }

        /// <summary>
        /// Gets current fiscal year ID for a company
        /// </summary>
        public async Task<Guid> GetCurrentFiscalYearIdAsync(Guid companyId)
        {
            var fiscalYear = await _context.FiscalYears
                .FirstOrDefaultAsync(f => f.CompanyId == companyId && f.IsActive);

            if (fiscalYear == null)
            {
                fiscalYear = await _context.FiscalYears
                    .Where(f => f.CompanyId == companyId)
                    .OrderByDescending(f => f.StartDate)
                    .FirstOrDefaultAsync();
            }

            return fiscalYear?.Id ?? throw new InvalidOperationException("No fiscal year found for company");
        }


        /// <summary>
        /// Checks if item has any transactions
        /// </summary>
        public async Task<bool> CheckItemHasTransactionsAsync(Guid itemId)
        {
            return await _context.TransactionItems
                .AnyAsync(ti => ti.ItemId == itemId);
            // Also check if item appears in any transaction items via the Item property
        }

        /// <summary>
        /// Updates batch information for a specific batch number across all related entities
        /// </summary>
        public async Task<bool> UpdateBatchByNumberAsync(Guid itemId, string oldBatchNumber, UpdateBatchByNumberDTO updateDto, Guid companyId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                _logger.LogInformation("Updating batch for item {ItemId}, old batch number: {OldBatchNumber} to new batch number: {NewBatchNumber}",
                    itemId, oldBatchNumber, updateDto.NewBatchNumber);

                // 1. Validate input
                if (string.IsNullOrWhiteSpace(updateDto.NewBatchNumber))
                {
                    throw new ArgumentException("New batch number is required");
                }

                if (string.IsNullOrWhiteSpace(oldBatchNumber))
                {
                    throw new ArgumentException("Old batch number is required");
                }

                if (updateDto.Price <= 0)
                {
                    throw new ArgumentException("Price must be greater than 0");
                }

                if (updateDto.Mrp <= 0)
                {
                    throw new ArgumentException("MRP must be greater than 0");
                }

                // 2. Find the item with its stock entries
                var item = await _context.Items
                    .Include(i => i.StockEntries)
                    .FirstOrDefaultAsync(i => i.Id == itemId && i.CompanyId == companyId);

                if (item == null)
                {
                    _logger.LogWarning("Item {ItemId} not found for company {CompanyId}", itemId, companyId);
                    return false;
                }

                // 3. Find the stock entry by batch number
                var stockEntry = item.StockEntries?
                    .FirstOrDefault(se => se.BatchNumber == oldBatchNumber);

                if (stockEntry == null)
                {
                    _logger.LogWarning("Batch '{OldBatchNumber}' not found for item {ItemId}", oldBatchNumber, itemId);
                    return false;
                }

                // 4. Update the stock entry
                stockEntry.BatchNumber = updateDto.NewBatchNumber;
                if (updateDto.ExpiryDate.HasValue)
                {
                    stockEntry.ExpiryDate = updateDto.ExpiryDate.Value;
                    stockEntry.ExpiryStatus = CalculateExpiryStatus(updateDto.ExpiryDate.Value);
                    stockEntry.DaysUntilExpiry = CalculateDaysUntilExpiry(updateDto.ExpiryDate.Value);
                }
                stockEntry.Price = updateDto.Price;
                stockEntry.NetPrice = updateDto.Price;
                stockEntry.MarginPercentage = updateDto.MarginPercentage;
                stockEntry.Mrp = updateDto.Mrp;
                stockEntry.UpdatedAt = DateTime.UtcNow;

                // Update the item's UpdatedAt timestamp
                item.UpdatedAt = DateTime.UtcNow;

                // 5. Update batch details in all PurchaseBillItems
                var purchaseBillItems = await _context.PurchaseBillItems
                    .Where(pbi => pbi.ItemId == itemId && pbi.BatchNumber == oldBatchNumber)
                    .ToListAsync();

                foreach (var pbi in purchaseBillItems)
                {
                    pbi.BatchNumber = updateDto.NewBatchNumber;
                    pbi.ExpiryDate = updateDto.ExpiryDate ?? pbi.ExpiryDate;
                    pbi.Price = updateDto.Price;
                    pbi.MarginPercentage = updateDto.MarginPercentage;
                    pbi.Mrp = updateDto.Mrp;
                    pbi.AltPrice = pbi.WsUnit > 0 ? updateDto.Price / pbi.WsUnit.Value : updateDto.Price;
                    pbi.NepaliDate = pbi.PurchaseBill != null ? pbi.PurchaseBill.NepaliDate : pbi.NepaliDate;
                }

                _logger.LogInformation("Updated {Count} purchase bill items", purchaseBillItems.Count);

                // 6. Update batch details in SalesBillItems
                var salesBillItems = await _context.SalesBillItems
                    .Where(sbi => sbi.ItemId == itemId && sbi.BatchNumber == oldBatchNumber)
                    .ToListAsync();

                foreach (var sbi in salesBillItems)
                {
                    sbi.BatchNumber = updateDto.NewBatchNumber;
                    sbi.ExpiryDate = updateDto.ExpiryDate ?? sbi.ExpiryDate;
                    sbi.Price = updateDto.Price;
                    sbi.MarginPercentage = updateDto.MarginPercentage;
                    sbi.Mrp = updateDto.Mrp;
                    sbi.NepaliDate = sbi.SalesBill != null ? sbi.SalesBill.NepaliDate : sbi.NepaliDate;
                }

                _logger.LogInformation("Updated {Count} sales bill items", salesBillItems.Count);

                // 7. Update batch details in PurchaseReturnBillItems
                var purchaseReturnItems = await _context.PurchaseReturnItems
                    .Where(pri => pri.ItemId == itemId && pri.BatchNumber == oldBatchNumber)
                    .ToListAsync();

                foreach (var pri in purchaseReturnItems)
                {
                    pri.BatchNumber = updateDto.NewBatchNumber;
                    pri.ExpiryDate = updateDto.ExpiryDate ?? pri.ExpiryDate;
                    pri.Price = updateDto.Price;
                    pri.MarginPercentage = updateDto.MarginPercentage;
                    pri.Mrp = updateDto.Mrp;
                    pri.NepaliDate = pri.PurchaseReturn != null ? pri.PurchaseReturn.NepaliDate : pri.NepaliDate;
                }

                _logger.LogInformation("Updated {Count} purchase return items", purchaseReturnItems.Count);

                // 8. Update batch details in SalesReturnBillItems
                var salesReturnItems = await _context.SalesReturnItems
                    .Where(sri => sri.ItemId == itemId && sri.BatchNumber == oldBatchNumber)
                    .ToListAsync();

                foreach (var sri in salesReturnItems)
                {
                    sri.BatchNumber = updateDto.NewBatchNumber;
                    sri.ExpiryDate = updateDto.ExpiryDate ?? sri.ExpiryDate;
                    sri.Mrp = updateDto.Mrp;
                    sri.MarginPercentage = updateDto.MarginPercentage;
                    sri.Price = updateDto.Price;
                    sri.NepaliDate = sri.SalesReturn != null ? sri.SalesReturn.NepaliDate : sri.NepaliDate;
                }

                _logger.LogInformation("Updated {Count} sales return items", salesReturnItems.Count);

                // 9. Update batch details in StockEntries (other entries with same batch number)
                var otherStockEntries = await _context.StockEntries
                    .Where(se => se.ItemId == itemId &&
                                se.BatchNumber == oldBatchNumber &&
                                se.Id != stockEntry.Id)
                    .ToListAsync();

                foreach (var se in otherStockEntries)
                {
                    se.BatchNumber = updateDto.NewBatchNumber;
                    if (updateDto.ExpiryDate.HasValue)
                    {
                        se.ExpiryDate = updateDto.ExpiryDate.Value;
                        se.ExpiryStatus = CalculateExpiryStatus(updateDto.ExpiryDate.Value);
                        se.DaysUntilExpiry = CalculateDaysUntilExpiry(updateDto.ExpiryDate.Value);
                    }
                    se.Price = updateDto.Price;
                    se.Mrp = updateDto.Mrp;
                    se.MarginPercentage = updateDto.MarginPercentage;
                    se.NetPrice = updateDto.Price;
                    se.UpdatedAt = DateTime.UtcNow;
                }

                _logger.LogInformation("Updated {Count} other stock entries", otherStockEntries.Count);

                // 11. Save all changes
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                _logger.LogInformation("Successfully updated batch from '{OldBatchNumber}' to '{NewBatchNumber}' for item {ItemId}",
                    oldBatchNumber, updateDto.NewBatchNumber, itemId);

                return true;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Error updating batch for item {ItemId}, old batch: {OldBatchNumber}", itemId, oldBatchNumber);
                throw;
            }
        }

        // Helper methods for expiry calculations
        private int CalculateDaysUntilExpiry(DateOnly expiryDate)
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var daysUntilExpiry = (expiryDate.ToDateTime(TimeOnly.MinValue) - today.ToDateTime(TimeOnly.MinValue)).Days;
            return daysUntilExpiry;
        }

        private string CalculateExpiryStatus(DateOnly expiryDate)
        {
            var daysUntilExpiry = CalculateDaysUntilExpiry(expiryDate);

            if (daysUntilExpiry <= 0)
                return "expired";
            else if (daysUntilExpiry <= 30)
                return "danger";
            else if (daysUntilExpiry <= 90)
                return "warning";
            else
                return "safe";
        }
    }

    // Helper class for result
    public class BulkDeleteResult
    {
        public bool Success { get; set; }
        public int TotalRequested { get; set; }
        public int DeletedCount { get; set; }
        public int FailedCount { get; set; }
        public List<BulkDeleteItemResult> Results { get; set; } = new();
    }

    public class BulkDeleteItemResult
    {
        public Guid ItemId { get; set; }
        public string? ItemName { get; set; }
        public bool Success { get; set; }
        public string? ErrorMessage { get; set; }
        public string? Status { get; set; }
    }
}