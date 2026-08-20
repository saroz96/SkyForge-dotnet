// using Microsoft.EntityFrameworkCore;
// using SkyForge.Data;
// using SkyForge.Models.FiscalYearModel;
// using SkyForge.Models.Retailer;
// using System.Text.RegularExpressions;
// using SkyForge.Models;

// namespace SkyForge.Services.BillNumberServices
// {
//     public interface IBillNumberService
//     {
//         Task<string> GetNextBillNumberAsync(Guid companyId, Guid fiscalYearId, string transactionType);
//         Task<string> GetCurrentBillNumberAsync(Guid companyId, Guid fiscalYearId, string transactionType);
//     }

//     public class BillNumberService : IBillNumberService
//     {
//         private readonly ApplicationDbContext _context;
//         private readonly ILogger<BillNumberService> _logger;

//         public BillNumberService(ApplicationDbContext context, ILogger<BillNumberService> logger)
//         {
//             _context = context;
//             _logger = logger;
//         }

//         public async Task<string> GetNextBillNumberAsync(Guid companyId, Guid fiscalYearId, string transactionType)
//         {
//             try
//             {
//                 var validTypes = new[] { "sales", "salesQuotation", "salesReturn", "purchase", "purchaseReturn",
//                     "payment", "receipt", "stockAdjustment", "debitNote", "creditNote", "journalVoucher" };

//                 if (!validTypes.Contains(transactionType))
//                 {
//                     throw new ArgumentException($"Invalid transaction type: {transactionType}");
//                 }

//                 var fiscalYear = await _context.FiscalYears
//                     .FirstOrDefaultAsync(f => f.Id == fiscalYearId && f.CompanyId == companyId);

//                 if (fiscalYear == null)
//                     throw new ArgumentException("Fiscal year not found");

//                 string prefix = GetPrefixForTransactionType(fiscalYear.BillPrefixes, transactionType);

//                 if (string.IsNullOrEmpty(prefix) || !Regex.IsMatch(prefix, @"^[A-Z]{4}$"))
//                 {
//                     throw new Exception($"Invalid prefix for {transactionType}");
//                 }

//                 // ATOMIC INCREMENT - like MongoDB's $inc
//                 // Try to find existing counter
//                 var billCounter = await _context.BillCounters
//                     .FirstOrDefaultAsync(bc => bc.CompanyId == companyId &&
//                                               bc.FiscalYearId == fiscalYearId &&
//                                               bc.TransactionType == transactionType);

//                 long nextNumber;

//                 if (billCounter == null)
//                 {
//                     // Create new counter starting from 1 (first increment will make it 1)
//                     billCounter = new BillCounter
//                     {
//                         CompanyId = companyId,
//                         FiscalYearId = fiscalYearId,
//                         TransactionType = transactionType,
//                         CurrentBillNumber = 0, // Start at 0, first increment makes it 1
//                         CreatedAt = DateTime.UtcNow,
//                         UpdatedAt = DateTime.UtcNow
//                     };

//                     _context.BillCounters.Add(billCounter);
//                     await _context.SaveChangesAsync();

//                     // Now increment to 1
//                     billCounter.CurrentBillNumber = 1;
//                     billCounter.UpdatedAt = DateTime.UtcNow;
//                     await _context.SaveChangesAsync();

//                     nextNumber = 1;
//                 }
//                 else
//                 {
//                     // Increment the counter (like $inc)
//                     billCounter.CurrentBillNumber++;
//                     billCounter.UpdatedAt = DateTime.UtcNow;

//                     await _context.SaveChangesAsync();
//                     nextNumber = billCounter.CurrentBillNumber;
//                 }

//                 // Format with leading zeros (7 digits)
//                 return $"{prefix}{nextNumber.ToString().PadLeft(7, '0')}";
//             }
//             catch (Exception ex)
//             {
//                 _logger.LogError(ex, "Bill number generation failed");
//                 throw;
//             }
//         }

//         public async Task<string> GetCurrentBillNumberAsync(Guid companyId, Guid fiscalYearId, string transactionType)
//         {
//             try
//             {
//                 var validTypes = new[] { "sales", "salesQuotation", "salesReturn", "purchase", "purchaseReturn",
//                     "payment", "receipt", "stockAdjustment", "debitNote", "creditNote", "journalVoucher" };

//                 if (!validTypes.Contains(transactionType))
//                 {
//                     throw new ArgumentException($"Invalid transaction type: {transactionType}");
//                 }

//                 var fiscalYear = await _context.FiscalYears
//                     .FirstOrDefaultAsync(f => f.Id == fiscalYearId && f.CompanyId == companyId);

//                 if (fiscalYear == null)
//                     throw new ArgumentException("Fiscal year not found");

//                 string prefix = GetPrefixForTransactionType(fiscalYear.BillPrefixes, transactionType);

//                 if (string.IsNullOrEmpty(prefix) || !Regex.IsMatch(prefix, @"^[A-Z]{4}$"))
//                 {
//                     throw new Exception($"Invalid prefix for {transactionType}");
//                 }

//                 var billCounter = await _context.BillCounters
//                     .FirstOrDefaultAsync(bc => bc.CompanyId == companyId &&
//                                               bc.FiscalYearId == fiscalYearId &&
//                                               bc.TransactionType == transactionType);

//                 long nextNumber;

//                 if (billCounter == null)
//                 {
//                     // If no counter exists, next bill will be 1
//                     nextNumber = 1;
//                 }
//                 else
//                 {
//                     // Get the current counter value + 1 (this is the next number to be used)
//                     // Counter stores the LAST USED number, so next is counter + 1
//                     nextNumber = billCounter.CurrentBillNumber + 1;
//                 }

//                 // Format with leading zeros (7 digits)
//                 return $"{prefix}{nextNumber.ToString().PadLeft(7, '0')}";
//             }
//             catch (Exception ex)
//             {
//                 _logger.LogError(ex, "Error getting current bill number");
//                 throw;
//             }
//         }

//         private string GetPrefixForTransactionType(BillPrefixes billPrefixes, string transactionType)
//         {
//             return transactionType.ToLower() switch
//             {
//                 "sales" => billPrefixes.Sales,
//                 "salesquotation" => billPrefixes.SalesQuotation,
//                 "salesreturn" => billPrefixes.SalesReturn,
//                 "purchase" => billPrefixes.Purchase,
//                 "purchasereturn" => billPrefixes.PurchaseReturn,
//                 "payment" => billPrefixes.Payment,
//                 "receipt" => billPrefixes.Receipt,
//                 "stockadjustment" => billPrefixes.StockAdjustment,
//                 "debitnote" => billPrefixes.DebitNote,
//                 "creditnote" => billPrefixes.CreditNote,
//                 "journalvoucher" => billPrefixes.JournalVoucher,
//                 _ => string.Empty
//             };
//         }
//     }
// }

//------------------------------------------------end1

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using SkyForge.Data;
using SkyForge.Models;
using SkyForge.Models.FiscalYearModel;
using SkyForge.Models.Retailer;
using System.Text.RegularExpressions;

namespace SkyForge.Services.BillNumberServices
{
    public interface IBillNumberService
    {
        Task<string> GetNextBillNumberAsync(Guid companyId, Guid fiscalYearId, string transactionType);
        Task<string> GetCurrentBillNumberAsync(Guid companyId, Guid fiscalYearId, string transactionType);
        Task<long> GetNextNumberValueAsync(Guid companyId, Guid fiscalYearId, string transactionType);
    }

    public class BillNumberService : IBillNumberService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<BillNumberService> _logger;
        private readonly IMemoryCache _cache;
        private readonly SemaphoreSlim _semaphore = new SemaphoreSlim(1, 1);
        private readonly Dictionary<string, string> _prefixCache = new Dictionary<string, string>();

        public BillNumberService(
            ApplicationDbContext context, 
            ILogger<BillNumberService> logger,
            IMemoryCache cache)
        {
            _context = context;
            _logger = logger;
            _cache = cache;
        }

        public async Task<long> GetNextNumberValueAsync(Guid companyId, Guid fiscalYearId, string transactionType)
        {
            try
            {
                string cacheKey = $"bill_counter_value_{companyId}_{fiscalYearId}_{transactionType}";
                
                // Try cache first
                if (_cache.TryGetValue(cacheKey, out long cachedNumber))
                {
                    return cachedNumber;
                }

                await _semaphore.WaitAsync();
                
                try
                {
                    var billCounter = await _context.BillCounters
                        .AsNoTracking()
                        .FirstOrDefaultAsync(bc => bc.CompanyId == companyId &&
                                                  bc.FiscalYearId == fiscalYearId &&
                                                  bc.TransactionType == transactionType);

                    long nextNumber = billCounter == null ? 1 : billCounter.CurrentBillNumber + 1;
                    
                    // Cache for 5 seconds - short enough to be updated quickly
                    _cache.Set(cacheKey, nextNumber, TimeSpan.FromSeconds(5));
                    
                    return nextNumber;
                }
                finally
                {
                    _semaphore.Release();
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting next number value");
                throw;
            }
        }

        public async Task<string> GetCurrentBillNumberAsync(Guid companyId, Guid fiscalYearId, string transactionType)
        {
            try
            {
                string cacheKey = $"bill_counter_display_{companyId}_{fiscalYearId}_{transactionType}";
                
                if (_cache.TryGetValue(cacheKey, out string cachedBillNumber))
                {
                    return cachedBillNumber;
                }

                var fiscalYear = await _context.FiscalYears
                    .AsNoTracking()
                    .FirstOrDefaultAsync(f => f.Id == fiscalYearId && f.CompanyId == companyId);

                if (fiscalYear == null)
                    throw new ArgumentException("Fiscal year not found");

                string prefix = GetPrefixForTransactionType(fiscalYear.BillPrefixes, transactionType);

                var nextNumber = await GetNextNumberValueAsync(companyId, fiscalYearId, transactionType);
                
                string billNumber = $"{prefix}{nextNumber.ToString().PadLeft(7, '0')}";
                
                // Cache for 3 seconds - very short
                _cache.Set(cacheKey, billNumber, TimeSpan.FromSeconds(3));
                
                return billNumber;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting current bill number");
                throw;
            }
        }

        public async Task<string> GetNextBillNumberAsync(Guid companyId, Guid fiscalYearId, string transactionType)
        {
            try
            {
                var validTypes = new[] { "sales", "salesQuotation", "salesReturn", "purchase", "purchaseReturn",
                    "payment", "receipt", "stockAdjustment", "debitNote", "creditNote", "journalVoucher" };

                if (!validTypes.Contains(transactionType))
                {
                    throw new ArgumentException($"Invalid transaction type: {transactionType}");
                }

                await _semaphore.WaitAsync();
                
                try
                {
                    var fiscalYear = await _context.FiscalYears
                        .AsNoTracking()
                        .FirstOrDefaultAsync(f => f.Id == fiscalYearId && f.CompanyId == companyId);

                    if (fiscalYear == null)
                        throw new ArgumentException("Fiscal year not found");

                    string prefix = GetPrefixForTransactionType(fiscalYear.BillPrefixes, transactionType);

                    var billCounter = await _context.BillCounters
                        .FirstOrDefaultAsync(bc => bc.CompanyId == companyId &&
                                                  bc.FiscalYearId == fiscalYearId &&
                                                  bc.TransactionType == transactionType);

                    long nextNumber;

                    if (billCounter == null)
                    {
                        // Create new counter
                        billCounter = new BillCounter
                        {
                            CompanyId = companyId,
                            FiscalYearId = fiscalYearId,
                            TransactionType = transactionType,
                            CurrentBillNumber = 0,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        };

                        _context.BillCounters.Add(billCounter);
                        await _context.SaveChangesAsync();

                        // Increment to 1
                        billCounter.CurrentBillNumber = 1;
                        billCounter.UpdatedAt = DateTime.UtcNow;
                        await _context.SaveChangesAsync();
                        nextNumber = 1;
                    }
                    else
                    {
                        // Atomic increment
                        billCounter.CurrentBillNumber++;
                        billCounter.UpdatedAt = DateTime.UtcNow;
                        await _context.SaveChangesAsync();
                        nextNumber = billCounter.CurrentBillNumber;
                    }

                    // Clear caches
                    ClearCache(companyId, fiscalYearId, transactionType);

                    return $"{prefix}{nextNumber.ToString().PadLeft(7, '0')}";
                }
                finally
                {
                    _semaphore.Release();
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Bill number generation failed");
                throw;
            }
        }

        private void ClearCache(Guid companyId, Guid fiscalYearId, string transactionType)
        {
            string valueKey = $"bill_counter_value_{companyId}_{fiscalYearId}_{transactionType}";
            string displayKey = $"bill_counter_display_{companyId}_{fiscalYearId}_{transactionType}";
            _cache.Remove(valueKey);
            _cache.Remove(displayKey);
        }

        private string GetPrefixForTransactionType(BillPrefixes billPrefixes, string transactionType)
        {
            string key = transactionType.ToLower();
            
            if (_prefixCache.TryGetValue(key, out string cachedPrefix))
            {
                return cachedPrefix;
            }

            string prefix = transactionType.ToLower() switch
            {
                "sales" => billPrefixes.Sales,
                "salesquotation" => billPrefixes.SalesQuotation,
                "salesreturn" => billPrefixes.SalesReturn,
                "purchase" => billPrefixes.Purchase,
                "purchasereturn" => billPrefixes.PurchaseReturn,
                "payment" => billPrefixes.Payment,
                "receipt" => billPrefixes.Receipt,
                "stockadjustment" => billPrefixes.StockAdjustment,
                "debitnote" => billPrefixes.DebitNote,
                "creditnote" => billPrefixes.CreditNote,
                "journalvoucher" => billPrefixes.JournalVoucher,
                _ => string.Empty
            };

            _prefixCache[key] = prefix;
            return prefix;
        }
    }
}