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

//         // public async Task<string> GetNextBillNumberAsync(Guid companyId, Guid fiscalYearId, string transactionType)
//         // {
//         //     try
//         //     {
//         //         var validTypes = new[] { "sales", "salesQuotation", "salesReturn", "purchase", "purchaseReturn",
//         //             "payment", "receipt", "stockAdjustment", "debitNote", "creditNote", "journalVoucher" };
                
//         //         if (!validTypes.Contains(transactionType))
//         //         {
//         //             throw new ArgumentException($"Invalid transaction type: {transactionType}");
//         //         }

//         //         var fiscalYear = await _context.FiscalYears
//         //             .FirstOrDefaultAsync(f => f.Id == fiscalYearId && f.CompanyId == companyId);
                
//         //         if (fiscalYear == null)
//         //             throw new ArgumentException("Fiscal year not found");

//         //         string prefix = GetPrefixForTransactionType(fiscalYear.BillPrefixes, transactionType);
                
//         //         if (string.IsNullOrEmpty(prefix) || !Regex.IsMatch(prefix, @"^[A-Z]{4}$"))
//         //         {
//         //             throw new Exception($"Invalid prefix for {transactionType}");
//         //         }

//         //         var billCounter = await _context.BillCounters
//         //             .FirstOrDefaultAsync(bc => bc.CompanyId == companyId &&
//         //                                       bc.FiscalYearId == fiscalYearId &&
//         //                                       bc.TransactionType == transactionType);

//         //         long currentNumber; // Changed from int to long
                
//         //         if (billCounter == null)
//         //         {
//         //             // Create new counter starting from 1
//         //             billCounter = new BillCounter
//         //             {
//         //                 CompanyId = companyId,
//         //                 FiscalYearId = fiscalYearId,
//         //                 TransactionType = transactionType,
//         //                 CurrentBillNumber = 1 // This will be automatically converted to long
//         //             };
//         //             await _context.BillCounters.AddAsync(billCounter);
//         //             await _context.SaveChangesAsync();
                    
//         //             // currentNumber = billCounter.CurrentBillNumber;
//         //             currentNumber = 1;
//         //         }
//         //         else
//         //         {
//         //             // Increment the counter
//         //             billCounter.CurrentBillNumber++;
//         //             billCounter.UpdatedAt = DateTime.UtcNow;
                    
//         //             await _context.SaveChangesAsync();
//         //             currentNumber = billCounter.CurrentBillNumber;
//         //         }

//         //         // Format with leading zeros (7 digits)
//         //         return $"{prefix}{currentNumber.ToString().PadLeft(7, '0')}";
//         //     }
//         //     catch (Exception ex)
//         //     {
//         //         _logger.LogError(ex, "Bill number generation failed");
//         //         throw;
//         //     }
//         // }

//         public async Task<string> GetNextBillNumberAsync(Guid companyId, Guid fiscalYearId, string transactionType)
// {
//     try
//     {
//         var validTypes = new[] { "sales", "salesQuotation", "salesReturn", "purchase", "purchaseReturn",
//             "payment", "receipt", "stockAdjustment", "debitNote", "creditNote", "journalVoucher" };
        
//         if (!validTypes.Contains(transactionType))
//         {
//             throw new ArgumentException($"Invalid transaction type: {transactionType}");
//         }

//         var fiscalYear = await _context.FiscalYears
//             .FirstOrDefaultAsync(f => f.Id == fiscalYearId && f.CompanyId == companyId);
        
//         if (fiscalYear == null)
//             throw new ArgumentException("Fiscal year not found");

//         string prefix = GetPrefixForTransactionType(fiscalYear.BillPrefixes, transactionType);
        
//         if (string.IsNullOrEmpty(prefix) || !Regex.IsMatch(prefix, @"^[A-Z]{4}$"))
//         {
//             throw new Exception($"Invalid prefix for {transactionType}");
//         }

//         var billCounter = await _context.BillCounters
//             .FirstOrDefaultAsync(bc => bc.CompanyId == companyId &&
//                                       bc.FiscalYearId == fiscalYearId &&
//                                       bc.TransactionType == transactionType);

//         long currentNumber;
        
//         if (billCounter == null)
//         {
//             // Create new counter starting from 0
//             billCounter = new BillCounter
//             {
//                 CompanyId = companyId,
//                 FiscalYearId = fiscalYearId,
//                 TransactionType = transactionType,
//                 CurrentBillNumber = 1 // Start at 0
//             };
//             await _context.BillCounters.AddAsync(billCounter);
//             await _context.SaveChangesAsync();
            
//             // Now increment to 1 for the first bill
//             billCounter.CurrentBillNumber = 1;
//             await _context.SaveChangesAsync();
            
//             currentNumber = 1;
//         }
//         else
//         {
//             // Increment the counter
//             billCounter.CurrentBillNumber++;
//             billCounter.UpdatedAt = DateTime.UtcNow;
            
//             await _context.SaveChangesAsync();
//             currentNumber = billCounter.CurrentBillNumber;
//         }

//         // Format with leading zeros (7 digits)
//         return $"{prefix}{currentNumber.ToString().PadLeft(7, '0')}";
//     }
//     catch (Exception ex)
//     {
//         _logger.LogError(ex, "Bill number generation failed");
//         throw;
//     }
// }

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

//                 long currentNumber; // Changed from int to long
                
//                 if (billCounter == null)
//                 {
//                     // If no counter exists, start from 1
//                     currentNumber = 1;
//                 }
//                 else
//                 {
//                     // Get the current number without incrementing
//                     currentNumber = billCounter.CurrentBillNumber;
//                 }

//                 // Format with leading zeros (7 digits)
//                 return $"{prefix}{currentNumber.ToString().PadLeft(7, '0')}";
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

using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Models.FiscalYearModel;
using SkyForge.Models.Retailer;
using System.Text.RegularExpressions;
using SkyForge.Models;

namespace SkyForge.Services.BillNumberServices
{
    public interface IBillNumberService
    {
        Task<string> GetNextBillNumberAsync(Guid companyId, Guid fiscalYearId, string transactionType);
        Task<string> GetCurrentBillNumberAsync(Guid companyId, Guid fiscalYearId, string transactionType);
    }

    public class BillNumberService : IBillNumberService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<BillNumberService> _logger;

        public BillNumberService(ApplicationDbContext context, ILogger<BillNumberService> logger)
        {
            _context = context;
            _logger = logger;
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

                var fiscalYear = await _context.FiscalYears
                    .FirstOrDefaultAsync(f => f.Id == fiscalYearId && f.CompanyId == companyId);
                
                if (fiscalYear == null)
                    throw new ArgumentException("Fiscal year not found");

                string prefix = GetPrefixForTransactionType(fiscalYear.BillPrefixes, transactionType);
                
                if (string.IsNullOrEmpty(prefix) || !Regex.IsMatch(prefix, @"^[A-Z]{4}$"))
                {
                    throw new Exception($"Invalid prefix for {transactionType}");
                }

                // ATOMIC INCREMENT - like MongoDB's $inc
                // Try to find existing counter
                var billCounter = await _context.BillCounters
                    .FirstOrDefaultAsync(bc => bc.CompanyId == companyId &&
                                              bc.FiscalYearId == fiscalYearId &&
                                              bc.TransactionType == transactionType);

                long nextNumber;
                
                if (billCounter == null)
                {
                    // Create new counter starting from 1 (first increment will make it 1)
                    billCounter = new BillCounter
                    {
                        CompanyId = companyId,
                        FiscalYearId = fiscalYearId,
                        TransactionType = transactionType,
                        CurrentBillNumber = 0, // Start at 0, first increment makes it 1
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    
                    _context.BillCounters.Add(billCounter);
                    await _context.SaveChangesAsync();
                    
                    // Now increment to 1
                    billCounter.CurrentBillNumber = 1;
                    billCounter.UpdatedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                    
                    nextNumber = 1;
                }
                else
                {
                    // Increment the counter (like $inc)
                    billCounter.CurrentBillNumber++;
                    billCounter.UpdatedAt = DateTime.UtcNow;
                    
                    await _context.SaveChangesAsync();
                    nextNumber = billCounter.CurrentBillNumber;
                }

                // Format with leading zeros (7 digits)
                return $"{prefix}{nextNumber.ToString().PadLeft(7, '0')}";
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Bill number generation failed");
                throw;
            }
        }

        public async Task<string> GetCurrentBillNumberAsync(Guid companyId, Guid fiscalYearId, string transactionType)
        {
            try
            {
                var validTypes = new[] { "sales", "salesQuotation", "salesReturn", "purchase", "purchaseReturn",
                    "payment", "receipt", "stockAdjustment", "debitNote", "creditNote", "journalVoucher" };
                
                if (!validTypes.Contains(transactionType))
                {
                    throw new ArgumentException($"Invalid transaction type: {transactionType}");
                }

                var fiscalYear = await _context.FiscalYears
                    .FirstOrDefaultAsync(f => f.Id == fiscalYearId && f.CompanyId == companyId);
                
                if (fiscalYear == null)
                    throw new ArgumentException("Fiscal year not found");

                string prefix = GetPrefixForTransactionType(fiscalYear.BillPrefixes, transactionType);
                
                if (string.IsNullOrEmpty(prefix) || !Regex.IsMatch(prefix, @"^[A-Z]{4}$"))
                {
                    throw new Exception($"Invalid prefix for {transactionType}");
                }

                var billCounter = await _context.BillCounters
                    .FirstOrDefaultAsync(bc => bc.CompanyId == companyId &&
                                              bc.FiscalYearId == fiscalYearId &&
                                              bc.TransactionType == transactionType);

                long nextNumber;
                
                if (billCounter == null)
                {
                    // If no counter exists, next bill will be 1
                    nextNumber = 1;
                }
                else
                {
                    // Get the current counter value + 1 (this is the next number to be used)
                    // Counter stores the LAST USED number, so next is counter + 1
                    nextNumber = billCounter.CurrentBillNumber + 1;
                }

                // Format with leading zeros (7 digits)
                return $"{prefix}{nextNumber.ToString().PadLeft(7, '0')}";
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting current bill number");
                throw;
            }
        }

        private string GetPrefixForTransactionType(BillPrefixes billPrefixes, string transactionType)
        {
            return transactionType.ToLower() switch
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
        }
    }
}
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
//         Task MarkBillNumberAsUsedAsync(Guid companyId, Guid fiscalYearId, string transactionType, string billNumber);
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
                
//                 if (!validTypes.Contains(transactionType.ToLower()))
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

//                 long nextNumber; // This is the NEXT number to be used
                
//                 if (billCounter == null)
//                 {
//                     // If no counter exists, next number is 1
//                     nextNumber = 1;
//                 }
//                 else
//                 {
//                     // Next number is current + 1 (without incrementing the counter)
//                     nextNumber = billCounter.CurrentBillNumber + 1;
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
                
//                 if (!validTypes.Contains(transactionType.ToLower()))
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

//                 long currentNumber;
                
//                 if (billCounter == null)
//                 {
//                     // If no counter exists, current number is 0 (meaning next will be 1)
//                     currentNumber = 0;
//                 }
//                 else
//                 {
//                     currentNumber = billCounter.CurrentBillNumber;
//                 }

//                 // Format with leading zeros (7 digits) - if currentNumber is 0, show 0000000
//                 return $"{prefix}{(currentNumber > 0 ? currentNumber.ToString().PadLeft(7, '0') : "0000000")}";
//             }
//             catch (Exception ex)
//             {
//                 _logger.LogError(ex, "Error getting current bill number");
//                 throw;
//             }
//         }

//         public async Task MarkBillNumberAsUsedAsync(Guid companyId, Guid fiscalYearId, string transactionType, string billNumber)
//         {
//             try
//             {
//                 var billCounter = await _context.BillCounters
//                     .FirstOrDefaultAsync(bc => bc.CompanyId == companyId &&
//                                               bc.FiscalYearId == fiscalYearId &&
//                                               bc.TransactionType == transactionType);

//                 // Parse the number from the bill number (e.g., "PUR240000042" -> 42)
//                 var match = Regex.Match(billNumber, @"\d+$");
//                 if (match.Success && long.TryParse(match.Value, out long usedNumber))
//                 {
//                     if (billCounter == null)
//                     {
//                         // Create new counter with the used number
//                         billCounter = new BillCounter
//                         {
//                             Id = Guid.NewGuid(),
//                             CompanyId = companyId,
//                             FiscalYearId = fiscalYearId,
//                             TransactionType = transactionType,
//                             CurrentBillNumber = usedNumber,
//                             CreatedAt = DateTime.UtcNow,
//                             UpdatedAt = DateTime.UtcNow
//                         };
//                         await _context.BillCounters.AddAsync(billCounter);
//                     }
//                     else if (usedNumber > billCounter.CurrentBillNumber)
//                     {
//                         // Update existing counter only if the used number is greater
//                         billCounter.CurrentBillNumber = usedNumber;
//                         billCounter.UpdatedAt = DateTime.UtcNow;
//                         _context.BillCounters.Update(billCounter);
//                     }
                    
//                     await _context.SaveChangesAsync();
//                     _logger.LogInformation($"Bill number {billNumber} marked as used for {transactionType}");
//                 }
//             }
//             catch (Exception ex)
//             {
//                 _logger.LogError(ex, "Error marking bill number as used: {BillNumber}", billNumber);
//                 // Don't throw - we don't want to fail the transaction if this fails
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