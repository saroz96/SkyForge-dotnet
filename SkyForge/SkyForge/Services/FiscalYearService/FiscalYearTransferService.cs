using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Dto;
using SkyForge.Models.FiscalYearModel;
using SkyForge.Models.Retailer.Items;
using SkyForge.Models.Retailer.TransactionModel;
using SkyForge.Models.AccountModel;
using SkyForge.Models.AccountGroupModel;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SkyForge.Services
{
    public class FiscalYearTransferService : IFiscalYearTransferService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<FiscalYearTransferService> _logger;

        public FiscalYearTransferService(
            ApplicationDbContext context,
            ILogger<FiscalYearTransferService> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// Gets the list of account group names that should NOT be carried forward
        /// These are nominal accounts that should be closed at year-end
        /// </summary>
        private static readonly HashSet<string> _nominalAccountGroups = new HashSet<string>
{
    "Purchase",
    "Sale",
    "Expenses (Indirect/Admn.)",
    "Expenses (Direct/Mfg.)",
    "Income (Direct/Opr.)",
    "Income (Indirect)",
};

        /// <summary>
        /// Ensures the Stock in Hand account group exists for the company
        /// </summary>
        private async Task<AccountGroup> EnsureStockInHandGroupExistsAsync(Guid companyId, FiscalYear fiscalYear)
        {
            var stockInHandGroup = await _context.AccountGroups
                .FirstOrDefaultAsync(g => g.Name == "Stock in Hand" && g.CompanyId == companyId);

            if (stockInHandGroup == null)
            {
                stockInHandGroup = new AccountGroup
                {
                    Id = Guid.NewGuid(),
                    Name = "Stock in Hand",
                    PrimaryGroup = "No",
                    Type = "Current Assets",
                    CompanyId = companyId,
                    OriginalFiscalYearId = fiscalYear.Id,
                    Date = fiscalYear.StartDate ?? DateTime.UtcNow,
                    NepaliDate = fiscalYear.StartDateNepali,
                    CreatedAt = DateTime.UtcNow
                };

                _context.AccountGroups.Add(stockInHandGroup);
                await _context.SaveChangesAsync();
                _logger.LogInformation($"Created Stock in Hand account group for company {companyId}");
            }

            return stockInHandGroup;
        }

        /// <summary>
        /// Ensures the Stock in Hand account exists for the company
        /// </summary>
        private async Task<Account> EnsureStockInHandAccountExistsAsync(Guid companyId, FiscalYear fiscalYear, AccountGroup stockInHandGroup)
        {
            var stockInHandAccount = await _context.Accounts
                .FirstOrDefaultAsync(a => a.Name == "Stock in Hand" && a.CompanyId == companyId);

            if (stockInHandAccount == null)
            {
                stockInHandAccount = new Account
                {
                    Id = Guid.NewGuid(),
                    Name = "Stock in Hand",
                    AccountGroupsId = stockInHandGroup.Id,
                    CompanyId = companyId,
                    OriginalFiscalYearId = fiscalYear.Id,
                    OpeningBalanceType = "Dr",
                    IsActive = true,
                    Date = fiscalYear.StartDate ?? DateTime.UtcNow,
                    NepaliDate = fiscalYear.StartDateNepali,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.Accounts.Add(stockInHandAccount);
                await _context.SaveChangesAsync();
                _logger.LogInformation($"Created Stock in Hand account for company {companyId}");
            }

            return stockInHandAccount;
        }

        public async Task<FiscalYearTransferResponseDto> ValidateTransferAsync(
           Guid sourceFiscalYearId,
           Guid targetFiscalYearId,
           Guid companyId)
        {
            var response = new FiscalYearTransferResponseDto();

            try
            {
                var sourceFiscalYear = await _context.FiscalYears
                    .FirstOrDefaultAsync(f => f.Id == sourceFiscalYearId && f.CompanyId == companyId);

                if (sourceFiscalYear == null)
                {
                    response.Success = false;
                    response.Errors.Add("Source fiscal year not found");
                    return response;
                }

                var targetFiscalYear = await _context.FiscalYears
                    .FirstOrDefaultAsync(f => f.Id == targetFiscalYearId && f.CompanyId == companyId);

                if (targetFiscalYear == null)
                {
                    response.Success = false;
                    response.Errors.Add("Target fiscal year not found");
                    return response;
                }

                if (targetFiscalYear.StartDate <= sourceFiscalYear.EndDate)
                {
                    response.Success = false;
                    response.Errors.Add("Target fiscal year must start after source fiscal year ends");
                    return response;
                }

                var existingOpeningBalance = await _context.Transactions
                    .AnyAsync(t => t.FiscalYearId == targetFiscalYearId &&
                                   t.Type == TransactionType.OpeningBalance);

                if (existingOpeningBalance)
                {
                    response.Success = false;
                    response.Errors.Add("Opening balance already exists for this fiscal year");
                    return response;
                }

                response.Success = true;
                response.Message = "Validation successful";
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error validating fiscal year transfer");
                response.Success = false;
                response.Errors.Add($"Validation error: {ex.Message}");
            }

            return response;
        }

        public async Task<object> GetTransferPreviewAsync(Guid sourceFiscalYearId, Guid targetFiscalYearId, Guid companyId)
        {
            var sourceFiscalYear = await _context.FiscalYears
                .FirstOrDefaultAsync(f => f.Id == sourceFiscalYearId && f.CompanyId == companyId);

            var targetFiscalYear = await _context.FiscalYears
                .FirstOrDefaultAsync(f => f.Id == targetFiscalYearId && f.CompanyId == companyId);

            var itemStocks = await GetItemClosingStocksFromStockEntriesAsync(sourceFiscalYearId, companyId);
            var accountBalances = await GetAccountClosingBalancesFromTransactionsAsync(sourceFiscalYearId, companyId);

            return new
            {
                SourceFiscalYear = new { sourceFiscalYear?.Id, sourceFiscalYear?.Name, sourceFiscalYear?.StartDate, sourceFiscalYear?.EndDate, sourceFiscalYear?.StartDateNepali, sourceFiscalYear?.EndDateNepali },
                TargetFiscalYear = new { targetFiscalYear?.Id, targetFiscalYear?.Name, targetFiscalYear?.StartDate, targetFiscalYear?.EndDate, targetFiscalYear?.StartDateNepali, targetFiscalYear?.EndDateNepali },
                ItemsPreview = new
                {
                    TotalItems = itemStocks.Count,
                    ItemsWithStock = itemStocks.Count(i => i.ClosingStock > 0),
                    TotalClosingStockValue = itemStocks.Sum(i => i.ClosingStockValue),
                    TotalClosingStockQuantity = itemStocks.Sum(i => i.ClosingStock),
                    SampleItems = itemStocks.Take(10).Select(i => new
                    {
                        i.Item.Name,
                        ClosingStock = i.ClosingStock,
                        ClosingStockValue = i.ClosingStockValue,
                        PurchasePrice = i.PurchasePrice
                    })
                },
                AccountsPreview = new
                {
                    TotalAccounts = accountBalances.Count(a => a.DebitAmount > 0 || a.CreditAmount > 0),
                    TotalDebitBalance = accountBalances.Sum(a => a.DebitAmount),
                    TotalCreditBalance = accountBalances.Sum(a => a.CreditAmount),
                    SampleAccounts = accountBalances
                        .Where(a => a.DebitAmount > 0 || a.CreditAmount > 0)
                        .Take(10)
                        .Select(a => new
                        {
                            a.AccountName,
                            a.DebitAmount,
                            a.CreditAmount,
                            a.BalanceType
                        })
                }
            };
        }

        public async Task<FiscalYearTransferResponseDto> TransferFiscalYearBalancesAsync(
            FiscalYearTransferRequestDto request,
            Guid companyId)
        {
            var response = new FiscalYearTransferResponseDto();

            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                _logger.LogInformation("Starting fiscal year transfer from {SourceId} to {TargetId}",
                    request.SourceFiscalYearId, request.TargetFiscalYearId);

                var validation = await ValidateTransferAsync(request.SourceFiscalYearId, request.TargetFiscalYearId, companyId);
                if (!validation.Success)
                {
                    return validation;
                }

                var sourceFiscalYear = await _context.FiscalYears
                    .FirstOrDefaultAsync(f => f.Id == request.SourceFiscalYearId && f.CompanyId == companyId);

                var targetFiscalYear = await _context.FiscalYears
                    .FirstOrDefaultAsync(f => f.Id == request.TargetFiscalYearId && f.CompanyId == companyId);

                var summary = new FiscalYearTransferSummaryDto
                {
                    SourceFiscalYearId = sourceFiscalYear!.Id,
                    SourceFiscalYearName = sourceFiscalYear.Name,
                    TargetFiscalYearId = targetFiscalYear!.Id,
                    TargetFiscalYearName = targetFiscalYear.Name,
                    TransferDate = request.TransferDate,
                    CompletedAt = DateTime.UtcNow
                };

                decimal totalStockValue = 0;

                DateTime transferDateAd = request.TransferDate;
                string transferDateNepali = request.TransferDateNepali?.ToString() ?? "";

                // Get fiscal year start and end dates
                DateTime sourceFiscalYearStartDate = sourceFiscalYear.StartDate ?? DateTime.UtcNow;
                DateTime sourceFiscalYearEndDate = sourceFiscalYear.EndDate ?? DateTime.UtcNow;
                DateTime targetFiscalYearStartDate = targetFiscalYear.StartDate ?? DateTime.UtcNow;

                // Get Nepali dates from fiscal year
                string sourceFiscalYearStartDateNepali = sourceFiscalYear.StartDateNepali ?? transferDateNepali;
                string sourceFiscalYearEndDateNepali = sourceFiscalYear.EndDateNepali ?? transferDateNepali;
                string targetFiscalYearStartDateNepali = targetFiscalYear.StartDateNepali ?? transferDateNepali;

                if (request.TransferItems)
                {
                    var itemSummary = await CalculateAndSaveClosingStockForSourceFiscalYearAsync(
                        request.SourceFiscalYearId,
                        companyId,
                        sourceFiscalYearEndDate,
                        sourceFiscalYearEndDateNepali,
                        sourceFiscalYearStartDate,
                        sourceFiscalYearStartDateNepali);

                    summary.ItemsSummary = itemSummary;
                    totalStockValue = itemSummary.TotalClosingStockValue;

                    await CreateOpeningStockForTargetFiscalYearAsync(
                        request.SourceFiscalYearId,
                        request.TargetFiscalYearId,
                        companyId,
                        targetFiscalYearStartDate,
                        targetFiscalYearStartDateNepali);
                }

                // ✅ Get closing balances (Stock in Hand will be added separately)
                var closingBalances = await GetAccountClosingBalancesFromTransactionsAsync(
                    request.SourceFiscalYearId,
                    companyId);

                // ✅ Add Stock in Hand account balance with total stock value
                await AddStockInHandAccountBalanceAsync(
                    companyId,
                    request.TargetFiscalYearId,
                    totalStockValue,
                    closingBalances);

                // Save closing balances for SOURCE fiscal year with END date
                await SaveClosingBalancesForSourceFiscalYearAsync(
                    request.SourceFiscalYearId,
                    companyId,
                    sourceFiscalYearEndDate,
                    sourceFiscalYearEndDateNepali,
                    closingBalances);

                // Create Opening Balance Transaction for TARGET fiscal year with START date
                var openingBalanceTransaction = await CreateOpeningBalanceTransactionAsync(
                    targetFiscalYear!.Id,
                    companyId,
                    targetFiscalYearStartDate,
                    targetFiscalYearStartDateNepali,
                    closingBalances);

                summary.OpeningBalanceTransactionId = openingBalanceTransaction.Id;
                summary.OpeningBalanceVoucherNo = openingBalanceTransaction.BillNumber ?? "OP-BAL-001";

                summary.AccountsSummary = new AccountTransferSummaryDto
                {
                    AccountsProcessed = closingBalances.Count(a => a.DebitAmount > 0 || a.CreditAmount > 0),
                    TotalDebitBalance = closingBalances.Sum(a => a.DebitAmount),
                    TotalCreditBalance = closingBalances.Sum(a => a.CreditAmount),
                    AccountDetails = closingBalances.Where(a => a.DebitAmount > 0 || a.CreditAmount > 0).ToList()
                };

                await transaction.CommitAsync();

                response.Success = true;
                response.Message = "Fiscal year transfer completed successfully";
                response.Data = summary;

                _logger.LogInformation("Fiscal year transfer completed successfully. Total stock value: {TotalStockValue}", totalStockValue);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Error during fiscal year transfer");
                response.Success = false;
                response.Errors.Add($"Transfer error: {ex.Message}");
                response.Message = "Transfer failed";
            }

            return response;
        }

        private async Task AddStockInHandAccountBalanceAsync(
          Guid companyId,
          Guid targetFiscalYearId,
          decimal totalStockValue,
          List<AccountBalanceSummaryDto> closingBalances)
        {
            if (totalStockValue <= 0)
            {
                _logger.LogInformation("Total stock value is 0, skipping Stock in Hand account addition");
                return;
            }

            // ✅ Get the account that belongs to "Stock in Hand" account group
            var stockInHandAccount = await _context.Accounts
                .Include(a => a.AccountGroup)
                .FirstOrDefaultAsync(a => a.CompanyId == companyId &&
                                         a.AccountGroup != null &&
                                         a.AccountGroup.Name == "Stock in Hand" &&
                                         a.IsActive);

            if (stockInHandAccount == null)
            {
                _logger.LogWarning("No account found with AccountGroup 'Stock in Hand'. Please create it first.");
                return;
            }

            // Check if Stock in Hand account already exists in closing balances
            var existingStockAccount = closingBalances.FirstOrDefault(b => b.AccountId == stockInHandAccount.Id);

            if (existingStockAccount != null)
            {
                // Update existing stock account balance
                existingStockAccount.DebitAmount = totalStockValue;
                existingStockAccount.CreditAmount = 0;
                existingStockAccount.BalanceType = "Dr";
                _logger.LogInformation($"Updated Stock in Hand account balance: {totalStockValue}");
            }
            else
            {
                // Add new stock in hand account balance
                closingBalances.Add(new AccountBalanceSummaryDto
                {
                    AccountId = stockInHandAccount.Id,
                    AccountName = stockInHandAccount.Name,
                    AccountGroupName = stockInHandAccount.AccountGroup?.Name ?? "Stock in Hand",
                    DebitAmount = totalStockValue,
                    CreditAmount = 0,
                    BalanceType = "Dr"
                });
                _logger.LogInformation($"Added Stock in Hand account balance: {totalStockValue}");
            }

            _logger.LogInformation("Added/Updated Stock in Hand account balance: {TotalStockValue} for account: {AccountName} (Group: Stock in Hand)",
                totalStockValue, stockInHandAccount.Name);
        }
        private async Task<Account?> GetStockInHandAccountAsync(Guid companyId)
        {
            return await _context.Accounts
                .FirstOrDefaultAsync(a => a.CompanyId == companyId &&
                                         a.Name == "Stock in Hand" &&
                                         a.IsActive);
        }

        // private async Task<(decimal TotalQuantity, decimal TotalValue)> CalculateItemClosingStockFromStockEntriesAsync(
        //     Guid itemId,
        //     Guid fiscalYearId,
        //     Guid companyId)
        // {
        //     var stockEntries = await _context.StockEntries
        //         .Where(s => s.ItemId == itemId &&
        //                    s.FiscalYearId == fiscalYearId)
        //         .ToListAsync();

        //     decimal totalQuantity = 0;
        //     decimal totalValue = 0;

        //     foreach (var entry in stockEntries)
        //     {
        //         totalQuantity += entry.Quantity;
        //         totalValue += entry.Quantity * entry.PuPrice;
        //     }

        //     return (totalQuantity, totalValue);
        // }

        private async Task<(decimal TotalQuantity, decimal TotalValue)> CalculateItemClosingStockFromStockEntriesAsync(
            Guid itemId,
            Guid fiscalYearId,
            Guid companyId)
        {
            // ✅ Get ALL stock entries for this item (no fiscal year filter)
            var stockEntries = await _context.StockEntries
                .Where(s => s.ItemId == itemId)
                .ToListAsync();

            decimal totalQuantity = 0;
            decimal totalValue = 0;

            foreach (var entry in stockEntries)
            {
                totalQuantity += entry.Quantity;
                totalValue += entry.Quantity * entry.PuPrice;
            }

            _logger.LogInformation($"Item {itemId}: Total Quantity: {totalQuantity}, Total Value: {totalValue} from {stockEntries.Count} entries");

            return (totalQuantity, totalValue);
        }

        // private async Task CreateOpeningStockForTargetFiscalYearAsync(
        //     Guid sourceFiscalYearId,
        //     Guid targetFiscalYearId,
        //     Guid companyId,
        //     DateTime targetFiscalYearStartDate,
        //     string targetFiscalYearStartDateNepali)
        // {
        //     // Get all items with closing stock from source fiscal year
        //     var closingStocks = await _context.ItemClosingStockByFiscalYear
        //         .Include(cs => cs.Item)
        //         .Where(cs => cs.FiscalYearId == sourceFiscalYearId)
        //         .ToListAsync();

        //     var existingOpeningStocks = await _context.ItemOpeningStockByFiscalYear
        //         .Where(os => os.FiscalYearId == targetFiscalYearId)
        //         .ToDictionaryAsync(os => os.ItemId, os => os);

        //     foreach (var closingStock in closingStocks)
        //     {
        //         // ✅ Calculate average purchase price and sales price from stock entries
        //         var stockEntryData = await CalculateItemAveragePricesFromStockEntriesAsync(
        //             closingStock.ItemId,
        //             sourceFiscalYearId,
        //             companyId);

        //         decimal avgPurchasePrice = stockEntryData.AveragePurchasePrice;
        //         decimal avgSalesPrice = stockEntryData.AverageSalesPrice;

        //         if (existingOpeningStocks.TryGetValue(closingStock.ItemId, out var existingRecord))
        //         {
        //             // Update existing opening stock record
        //             existingRecord.OpeningStock = closingStock.ClosingStock;
        //             existingRecord.OpeningStockValue = closingStock.ClosingStockValue;
        //             existingRecord.PurchasePrice = avgPurchasePrice; // ✅ Use calculated average
        //             existingRecord.SalesPrice = avgSalesPrice; // ✅ Use calculated average
        //             existingRecord.Date = targetFiscalYearStartDate;
        //             existingRecord.NepaliDate = targetFiscalYearStartDateNepali;
        //             existingRecord.UpdatedAt = DateTime.UtcNow;
        //         }
        //         else
        //         {
        //             // Create new opening stock record
        //             var openingStock = new ItemOpeningStockByFiscalYear
        //             {
        //                 Id = Guid.NewGuid(),
        //                 ItemId = closingStock.ItemId,
        //                 FiscalYearId = targetFiscalYearId,
        //                 CompanyId = companyId,
        //                 OpeningStock = closingStock.ClosingStock,
        //                 OpeningStockValue = closingStock.ClosingStockValue,
        //                 PurchasePrice = avgPurchasePrice, // ✅ Use calculated average
        //                 SalesPrice = avgSalesPrice, // ✅ Use calculated average
        //                 Date = targetFiscalYearStartDate,
        //                 NepaliDate = targetFiscalYearStartDateNepali,
        //                 CreatedAt = DateTime.UtcNow,
        //                 UpdatedAt = DateTime.UtcNow
        //             };
        //             _context.ItemOpeningStockByFiscalYear.Add(openingStock);
        //         }
        //     }

        //     await _context.SaveChangesAsync();
        // }

        private async Task CreateOpeningStockForTargetFiscalYearAsync(
            Guid sourceFiscalYearId,
            Guid targetFiscalYearId,
            Guid companyId,
            DateTime targetFiscalYearStartDate,
            string targetFiscalYearStartDateNepali)
        {
            // ✅ Get all items with closing stock from source fiscal year
            var closingStocks = await _context.ItemClosingStockByFiscalYear
                .Include(cs => cs.Item)
                .Where(cs => cs.FiscalYearId == sourceFiscalYearId)
                .ToListAsync();

            // ✅ If no closing stocks found, get the latest closing stock for each item
            if (closingStocks == null || !closingStocks.Any())
            {
                _logger.LogInformation($"No closing stocks found for fiscal year {sourceFiscalYearId}. Getting latest closing stock for each item.");

                var allClosingStocks = await _context.ItemClosingStockByFiscalYear
                    .Include(cs => cs.Item)
                    .Where(cs => cs.Item.CompanyId == companyId)
                    .OrderByDescending(cs => cs.Date)
                    .ToListAsync();

                closingStocks = allClosingStocks
                    .GroupBy(cs => cs.ItemId)
                    .Select(g => g.First())
                    .ToList();
            }

            var existingOpeningStocks = await _context.ItemOpeningStockByFiscalYear
                .Where(os => os.FiscalYearId == targetFiscalYearId)
                .ToDictionaryAsync(os => os.ItemId, os => os);

            foreach (var closingStock in closingStocks)
            {
                // ✅ Calculate average purchase price and sales price from ALL stock entries
                var stockEntryData = await CalculateItemAveragePricesFromStockEntriesAsync(
                    closingStock.ItemId,
                    sourceFiscalYearId,
                    companyId);

                decimal avgPurchasePrice = stockEntryData.AveragePurchasePrice;
                decimal avgSalesPrice = stockEntryData.AverageSalesPrice;

                if (existingOpeningStocks.TryGetValue(closingStock.ItemId, out var existingRecord))
                {
                    // Update existing opening stock record
                    existingRecord.OpeningStock = closingStock.ClosingStock;
                    existingRecord.OpeningStockValue = closingStock.ClosingStockValue;
                    existingRecord.PurchasePrice = avgPurchasePrice;
                    existingRecord.SalesPrice = avgSalesPrice;
                    existingRecord.Date = targetFiscalYearStartDate;
                    existingRecord.NepaliDate = targetFiscalYearStartDateNepali;
                    existingRecord.UpdatedAt = DateTime.UtcNow;
                }
                else
                {
                    // Create new opening stock record
                    var openingStock = new ItemOpeningStockByFiscalYear
                    {
                        Id = Guid.NewGuid(),
                        ItemId = closingStock.ItemId,
                        FiscalYearId = targetFiscalYearId,
                        CompanyId = companyId,
                        OpeningStock = closingStock.ClosingStock,
                        OpeningStockValue = closingStock.ClosingStockValue,
                        PurchasePrice = avgPurchasePrice,
                        SalesPrice = avgSalesPrice,
                        Date = targetFiscalYearStartDate,
                        NepaliDate = targetFiscalYearStartDateNepali,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    _context.ItemOpeningStockByFiscalYear.Add(openingStock);
                }
            }

            await _context.SaveChangesAsync();
        }

        /// <summary>
        /// Calculate average purchase price and sales price from stock entries for an item
        /// </summary>
        // private async Task<(decimal AveragePurchasePrice, decimal AverageSalesPrice)> CalculateItemAveragePricesFromStockEntriesAsync(
        //     Guid itemId,
        //     Guid fiscalYearId,
        //     Guid companyId)
        // {
        //     var stockEntries = await _context.StockEntries
        //         .Where(s => s.ItemId == itemId &&
        //                    s.FiscalYearId == fiscalYearId)
        //         .ToListAsync();

        //     if (stockEntries.Count == 0)
        //     {
        //         // If no stock entries, get the item's default prices
        //         var item = await _context.Items
        //             .FirstOrDefaultAsync(i => i.Id == itemId && i.CompanyId == companyId);

        //         return (item?.PuPrice ?? 0, item?.Price ?? 0);
        //     }

        //     decimal totalQuantity = 0;
        //     decimal totalPurchaseValue = 0;
        //     decimal totalSalesValue = 0;

        //     foreach (var entry in stockEntries)
        //     {
        //         totalQuantity += entry.Quantity;
        //         totalPurchaseValue += entry.Quantity * entry.PuPrice;
        //         totalSalesValue += entry.Quantity * entry.Price;
        //     }

        //     decimal averagePurchasePrice = totalQuantity > 0
        //         ? totalPurchaseValue / totalQuantity
        //         : 0;

        //     decimal averageSalesPrice = totalQuantity > 0
        //         ? totalSalesValue / totalQuantity
        //         : 0;

        //     return (averagePurchasePrice, averageSalesPrice);
        // }

        // private async Task<ItemTransferSummaryDto> CalculateAndSaveClosingStockForSourceFiscalYearAsync(
        //     Guid sourceFiscalYearId,
        //     Guid companyId,
        //     DateTime sourceFiscalYearEndDate,
        //     string sourceFiscalYearEndDateNepali,
        //     DateTime sourceFiscalYearStartDate,
        //     string sourceFiscalYearStartDateNepali)
        // {
        //     var summary = new ItemTransferSummaryDto();

        //     var items = await _context.Items
        //         .Where(i => i.CompanyId == companyId && i.Status == "active")
        //         .ToListAsync();

        //     summary.ItemsProcessed = items.Count;

        //     var existingClosingStocks = await _context.ItemClosingStockByFiscalYear
        //         .Where(cs => cs.FiscalYearId == sourceFiscalYearId)
        //         .ToDictionaryAsync(cs => cs.ItemId, cs => cs);

        //     foreach (var item in items)
        //     {
        //         // Calculate closing stock quantity and value
        //         var closingStockData = await CalculateItemClosingStockFromStockEntriesAsync(item.Id, sourceFiscalYearId, companyId);

        //         // ✅ Calculate average purchase price and sales price from stock entries
        //         var averagePrices = await CalculateItemAveragePricesFromStockEntriesAsync(item.Id, sourceFiscalYearId, companyId);

        //         var avgPurchasePrice = averagePrices.AveragePurchasePrice;
        //         var avgSalesPrice = averagePrices.AverageSalesPrice;

        //         if (closingStockData.TotalQuantity > 0)
        //         {
        //             summary.ItemsWithStock++;
        //             summary.TotalClosingStockQuantity += closingStockData.TotalQuantity;
        //             summary.TotalClosingStockValue += closingStockData.TotalValue;
        //         }

        //         if (existingClosingStocks.TryGetValue(item.Id, out var existingRecord))
        //         {
        //             // Update existing record with calculated averages
        //             existingRecord.ClosingStock = closingStockData.TotalQuantity;
        //             existingRecord.ClosingStockValue = closingStockData.TotalValue;
        //             existingRecord.PurchasePrice = avgPurchasePrice; // ✅ Use calculated average
        //             existingRecord.SalesPrice = avgSalesPrice; // ✅ Use calculated average
        //             existingRecord.Date = sourceFiscalYearEndDate;
        //             existingRecord.NepaliDate = sourceFiscalYearEndDateNepali;
        //             existingRecord.UpdatedAt = DateTime.UtcNow;
        //         }
        //         else
        //         {
        //             // Create new closing stock record with calculated averages
        //             var closingStock = new ItemClosingStockByFiscalYear
        //             {
        //                 Id = Guid.NewGuid(),
        //                 ItemId = item.Id,
        //                 FiscalYearId = sourceFiscalYearId,
        //                 ClosingStock = closingStockData.TotalQuantity,
        //                 ClosingStockValue = closingStockData.TotalValue,
        //                 PurchasePrice = avgPurchasePrice, // ✅ Use calculated average
        //                 SalesPrice = avgSalesPrice, // ✅ Use calculated average
        //                 Date = sourceFiscalYearEndDate,
        //                 NepaliDate = sourceFiscalYearEndDateNepali,
        //                 CreatedAt = DateTime.UtcNow,
        //                 UpdatedAt = DateTime.UtcNow
        //             };
        //             _context.ItemClosingStockByFiscalYear.Add(closingStock);
        //         }

        //         summary.ItemDetails.Add(new ItemStockSummaryDto
        //         {
        //             ItemId = item.Id,
        //             ItemName = item.Name,
        //             ClosingQuantity = closingStockData.TotalQuantity,
        //             ClosingValue = closingStockData.TotalValue,
        //             AverageRate = avgPurchasePrice // Use purchase price as average rate
        //         });
        //     }

        //     await _context.SaveChangesAsync();
        //     return summary;
        // }

        private async Task<ItemTransferSummaryDto> CalculateAndSaveClosingStockForSourceFiscalYearAsync(
            Guid sourceFiscalYearId,
            Guid companyId,
            DateTime sourceFiscalYearEndDate,
            string sourceFiscalYearEndDateNepali,
            DateTime sourceFiscalYearStartDate,
            string sourceFiscalYearStartDateNepali)
        {
            var summary = new ItemTransferSummaryDto();

            var items = await _context.Items
                .Where(i => i.CompanyId == companyId && i.Status == "active")
                .ToListAsync();

            summary.ItemsProcessed = items.Count;

            var existingClosingStocks = await _context.ItemClosingStockByFiscalYear
                .Where(cs => cs.FiscalYearId == sourceFiscalYearId)
                .ToDictionaryAsync(cs => cs.ItemId, cs => cs);

            foreach (var item in items)
            {
                // ✅ Calculate closing stock quantity and value from ALL stock entries
                var closingStockData = await CalculateItemClosingStockFromStockEntriesAsync(item.Id, sourceFiscalYearId, companyId);

                // ✅ Calculate average purchase price and sales price from ALL stock entries
                var averagePrices = await CalculateItemAveragePricesFromStockEntriesAsync(item.Id, sourceFiscalYearId, companyId);

                var avgPurchasePrice = averagePrices.AveragePurchasePrice;
                var avgSalesPrice = averagePrices.AverageSalesPrice;

                if (closingStockData.TotalQuantity > 0)
                {
                    summary.ItemsWithStock++;
                    summary.TotalClosingStockQuantity += closingStockData.TotalQuantity;
                    summary.TotalClosingStockValue += closingStockData.TotalValue;
                }

                if (existingClosingStocks.TryGetValue(item.Id, out var existingRecord))
                {
                    // Update existing record with calculated averages
                    existingRecord.ClosingStock = closingStockData.TotalQuantity;
                    existingRecord.ClosingStockValue = closingStockData.TotalValue;
                    existingRecord.PurchasePrice = avgPurchasePrice;
                    existingRecord.SalesPrice = avgSalesPrice;
                    existingRecord.Date = sourceFiscalYearEndDate;
                    existingRecord.NepaliDate = sourceFiscalYearEndDateNepali;
                    existingRecord.UpdatedAt = DateTime.UtcNow;
                }
                else
                {
                    // Create new closing stock record with calculated averages
                    var closingStock = new ItemClosingStockByFiscalYear
                    {
                        Id = Guid.NewGuid(),
                        ItemId = item.Id,
                        FiscalYearId = sourceFiscalYearId,
                        ClosingStock = closingStockData.TotalQuantity,
                        ClosingStockValue = closingStockData.TotalValue,
                        PurchasePrice = avgPurchasePrice,
                        SalesPrice = avgSalesPrice,
                        Date = sourceFiscalYearEndDate,
                        NepaliDate = sourceFiscalYearEndDateNepali,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    _context.ItemClosingStockByFiscalYear.Add(closingStock);
                }

                summary.ItemDetails.Add(new ItemStockSummaryDto
                {
                    ItemId = item.Id,
                    ItemName = item.Name,
                    ClosingQuantity = closingStockData.TotalQuantity,
                    ClosingValue = closingStockData.TotalValue,
                    AverageRate = avgPurchasePrice
                });
            }

            await _context.SaveChangesAsync();
            return summary;
        }

        /// <summary>
        /// Calculate average purchase price and sales price from stock entries for an item
        /// </summary>
        // private async Task<(decimal AveragePurchasePrice, decimal AverageSalesPrice)> CalculateItemAveragePricesFromStockEntriesAsync(
        //     Guid itemId,
        //     Guid fiscalYearId,
        //     Guid companyId)
        // {
        //     var stockEntries = await _context.StockEntries
        //         .Where(s => s.ItemId == itemId &&
        //                    s.FiscalYearId == fiscalYearId)
        //         .ToListAsync();

        //     if (stockEntries.Count == 0)
        //     {
        //         // If no stock entries, get the item's default prices
        //         var item = await _context.Items
        //             .FirstOrDefaultAsync(i => i.Id == itemId && i.CompanyId == companyId);

        //         return (item?.PuPrice ?? 0, item?.Price ?? 0);
        //     }

        //     decimal totalQuantity = 0;
        //     decimal totalPurchaseValue = 0;
        //     decimal totalSalesValue = 0;

        //     foreach (var entry in stockEntries)
        //     {
        //         totalQuantity += entry.Quantity;
        //         totalPurchaseValue += entry.Quantity * entry.PuPrice;
        //         totalSalesValue += entry.Quantity * entry.Price;
        //     }

        //     decimal averagePurchasePrice = totalQuantity > 0
        //         ? totalPurchaseValue / totalQuantity
        //         : 0;

        //     decimal averageSalesPrice = totalQuantity > 0
        //         ? totalSalesValue / totalQuantity
        //         : 0;

        //     return (averagePurchasePrice, averageSalesPrice);
        // }

        private async Task<(decimal AveragePurchasePrice, decimal AverageSalesPrice)> CalculateItemAveragePricesFromStockEntriesAsync(
     Guid itemId,
     Guid fiscalYearId,
     Guid companyId)
        {
            // ✅ Get ALL stock entries for this item (no fiscal year filter)
            var stockEntries = await _context.StockEntries
                .Where(s => s.ItemId == itemId)
                .ToListAsync();

            if (stockEntries.Count == 0)
            {
                // If no stock entries at all, get the item's default prices
                var item = await _context.Items
                    .FirstOrDefaultAsync(i => i.Id == itemId && i.CompanyId == companyId);

                return (item?.PuPrice ?? 0, item?.Price ?? 0);
            }

            decimal totalQuantity = 0;
            decimal totalPurchaseValue = 0;
            decimal totalSalesValue = 0;

            foreach (var entry in stockEntries)
            {
                totalQuantity += entry.Quantity;
                totalPurchaseValue += entry.Quantity * entry.PuPrice;
                totalSalesValue += entry.Quantity * entry.Price;
            }

            decimal averagePurchasePrice = totalQuantity > 0
                ? totalPurchaseValue / totalQuantity
                : 0;

            decimal averageSalesPrice = totalQuantity > 0
                ? totalSalesValue / totalQuantity
                : 0;

            return (averagePurchasePrice, averageSalesPrice);
        }
        // private async Task<List<ItemClosingStockByFiscalYear>> GetItemClosingStocksFromStockEntriesAsync(
        //            Guid fiscalYearId,
        //            Guid companyId)
        // {
        //     var items = await _context.Items
        //         .Where(i => i.CompanyId == companyId)
        //         .ToListAsync();

        //     var result = new List<ItemClosingStockByFiscalYear>();

        //     foreach (var item in items)
        //     {
        //         var stock = await CalculateItemClosingStockFromStockEntriesAsync(item.Id, fiscalYearId, companyId);
        //         result.Add(new ItemClosingStockByFiscalYear
        //         {
        //             ItemId = item.Id,
        //             Item = item,
        //             ClosingStock = stock.TotalQuantity,
        //             ClosingStockValue = stock.TotalValue
        //         });
        //     }

        //     return result;
        // }

        private async Task<List<ItemClosingStockByFiscalYear>> GetItemClosingStocksFromStockEntriesAsync(
            Guid fiscalYearId,
            Guid companyId)
        {
            var items = await _context.Items
                .Where(i => i.CompanyId == companyId)
                .ToListAsync();

            var result = new List<ItemClosingStockByFiscalYear>();

            foreach (var item in items)
            {
                // ✅ Calculate from ALL stock entries
                var stock = await CalculateItemClosingStockFromStockEntriesAsync(item.Id, fiscalYearId, companyId);

                // Get average prices from ALL stock entries
                var averagePrices = await CalculateItemAveragePricesFromStockEntriesAsync(item.Id, fiscalYearId, companyId);

                result.Add(new ItemClosingStockByFiscalYear
                {
                    ItemId = item.Id,
                    Item = item,
                    ClosingStock = stock.TotalQuantity,
                    ClosingStockValue = stock.TotalValue,
                    PurchasePrice = averagePrices.AveragePurchasePrice,
                    SalesPrice = averagePrices.AverageSalesPrice
                });
            }

            return result;
        }

        private async Task<List<AccountBalanceSummaryDto>> GetAccountClosingBalancesFromTransactionsAsync(
        Guid fiscalYearId,
        Guid companyId)
        {
            try
            {
                // Validate inputs
                if (fiscalYearId == Guid.Empty || companyId == Guid.Empty)
                {
                    _logger.LogError("Invalid fiscal year or company ID provided");
                    return new List<AccountBalanceSummaryDto>();
                }

                // Get all active accounts for the company with AccountGroup included
                var accounts = await _context.Accounts
                    .Include(a => a.AccountGroup)
                    .Where(a => a.CompanyId == companyId && a.IsActive)
                    .ToListAsync();

                if (accounts == null || !accounts.Any())
                {
                    _logger.LogWarning($"No active accounts found for company {companyId}");
                    return new List<AccountBalanceSummaryDto>();
                }

                var result = new List<AccountBalanceSummaryDto>();

                foreach (var account in accounts)
                {
                    try
                    {
                        if (account == null) continue;

                        // ✅ Get account group name safely
                        var accountGroupName = account.AccountGroup?.Name ?? string.Empty;

                        // ✅ SKIP accounts with AccountGroup "Stock in Hand" - we handle it separately with total stock value
                        if (!string.IsNullOrEmpty(accountGroupName) &&
                            accountGroupName.Equals("Stock in Hand", StringComparison.OrdinalIgnoreCase))
                        {
                            _logger.LogInformation($"Skipping account in Stock in Hand group: {account.Name} - will be added with calculated stock value");
                            continue;
                        }

                        // ✅ Skip nominal accounts (Purchase, Sale, Expenses, Income)
                        if (!string.IsNullOrEmpty(accountGroupName) &&
                            _nominalAccountGroups.Contains(accountGroupName))
                        {
                            _logger.LogInformation($"Skipping nominal account: {account.Name} (Group: {accountGroupName})");
                            continue;
                        }

                        if (string.IsNullOrEmpty(accountGroupName))
                        {
                            _logger.LogWarning($"Account {account.Name} (ID: {account.Id}) has no AccountGroup assigned. Processing anyway.");
                        }

                        // Get all transactions for this fiscal year where this account is involved
                        var transactions = await _context.Transactions
                            .Where(t => t.CompanyId == companyId &&
                                       t.FiscalYearId == fiscalYearId &&
                                       t.Status == TransactionStatus.Active &&
                                       (t.AccountId == account.Id ||
                                        t.PaymentAccountId == account.Id ||
                                        t.ReceiptAccountId == account.Id ||
                                        t.DebitAccountId == account.Id ||
                                        t.CreditAccountId == account.Id))
                            .Include(t => t.TransactionItems)
                            .ToListAsync();

                        decimal totalDebit = 0;
                        decimal totalCredit = 0;

                        foreach (var transaction in transactions)
                        {
                            if (transaction == null) continue;

                            if (transaction.AccountId == account.Id)
                            {
                                totalDebit += transaction.TotalDebit;
                                totalCredit += transaction.TotalCredit;
                            }

                            if (transaction.PaymentAccountId == account.Id)
                            {
                                totalDebit += transaction.TotalDebit;
                            }

                            if (transaction.ReceiptAccountId == account.Id)
                            {
                                totalCredit += transaction.TotalCredit;
                            }

                            if (transaction.DebitAccountId == account.Id)
                            {
                                totalDebit += transaction.TotalDebit;
                            }

                            if (transaction.CreditAccountId == account.Id)
                            {
                                totalCredit += transaction.TotalCredit;
                            }
                        }

                        // Check for opening balance from previous fiscal years
                        var openingBalanceRecord = await _context.OpeningBalanceByFiscalYear
                            .FirstOrDefaultAsync(o => o.AccountId == account.Id && o.FiscalYearId == fiscalYearId);

                        if (openingBalanceRecord != null)
                        {
                            if (openingBalanceRecord.Type == "Dr")
                                totalDebit += openingBalanceRecord.Amount;
                            else
                                totalCredit += openingBalanceRecord.Amount;
                        }

                        decimal closingBalance = Math.Abs(totalDebit - totalCredit);
                        string balanceType = totalDebit >= totalCredit ? "Dr" : "Cr";

                        // Only add if there's a balance
                        if (closingBalance > 0)
                        {
                            result.Add(new AccountBalanceSummaryDto
                            {
                                AccountId = account.Id,
                                AccountName = account.Name ?? "Unknown",
                                AccountGroupName = account.AccountGroup?.Name ?? "Unknown",
                                DebitAmount = totalDebit >= totalCredit ? closingBalance : 0,
                                CreditAmount = totalCredit > totalDebit ? closingBalance : 0,
                                BalanceType = balanceType
                            });
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, $"Error processing account {account?.Id}");
                        continue;
                    }
                }

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error in GetAccountClosingBalancesFromTransactionsAsync for fiscal year {fiscalYearId}, company {companyId}");
                return new List<AccountBalanceSummaryDto>();
            }
        }


        private async Task<Transaction> CreateOpeningBalanceTransactionAsync(
            Guid fiscalYearId,
            Guid companyId,
            DateTime fiscalYearStartDate,
            string fiscalYearStartDateNepali,
            List<AccountBalanceSummaryDto> closingBalances)
        {
            var billNumber = await GenerateOpeningBalanceBillNumberAsync(fiscalYearId, companyId);

            decimal totalDebit = closingBalances.Sum(b => b.DebitAmount);
            decimal totalCredit = closingBalances.Sum(b => b.CreditAmount);

            if (totalDebit != totalCredit)
            {
                var difference = Math.Abs(totalDebit - totalCredit);
                var suspenseAccount = await GetOrCreateSuspenseAccountAsync(companyId);

                if (totalDebit > totalCredit)
                {
                    closingBalances.Add(new AccountBalanceSummaryDto
                    {
                        AccountId = suspenseAccount.Id,
                        AccountName = "Suspense Account",
                        DebitAmount = 0,
                        CreditAmount = difference,
                        BalanceType = "Cr"
                    });
                    totalCredit += difference;
                }
                else
                {
                    closingBalances.Add(new AccountBalanceSummaryDto
                    {
                        AccountId = suspenseAccount.Id,
                        AccountName = "Suspense Account",
                        DebitAmount = difference,
                        CreditAmount = 0,
                        BalanceType = "Dr"
                    });
                    totalDebit += difference;
                }
            }

            var openingBalanceTransaction = new Transaction
            {
                Id = Guid.NewGuid(),
                CompanyId = companyId,
                FiscalYearId = fiscalYearId,
                Type = TransactionType.OpeningBalance,
                BillNumber = billNumber,
                Date = fiscalYearStartDate,
                NepaliDate = fiscalYearStartDateNepali,
                TransactionDateNepali = fiscalYearStartDateNepali,
                TotalDebit = totalDebit,
                TotalCredit = totalCredit,
                Status = TransactionStatus.Active,
                IsActive = true,
                PaymentMode = PaymentMode.Cash,
                InstType = InstrumentType.NA,
                CreatedAt = DateTime.UtcNow,
                TransactionItems = new List<TransactionItem>()
            };

            foreach (var balance in closingBalances.Where(b => b.DebitAmount > 0 || b.CreditAmount > 0))
            {
                var transactionItem = new TransactionItem
                {
                    Id = Guid.NewGuid(),
                    TransactionId = openingBalanceTransaction.Id,
                    Debit = balance.DebitAmount,
                    Credit = balance.CreditAmount,
                    CreatedAt = DateTime.UtcNow
                };

                openingBalanceTransaction.TransactionItems.Add(transactionItem);
            }

            _context.Transactions.Add(openingBalanceTransaction);
            await _context.SaveChangesAsync();

            // Save to OpeningBalanceByFiscalYear table with START date (multiple per account - one per fiscal year)
            foreach (var balance in closingBalances.Where(b => b.DebitAmount > 0 || b.CreditAmount > 0))
            {
                // Check if already exists for this fiscal year
                var existingByFiscalYear = await _context.OpeningBalanceByFiscalYear
                    .FirstOrDefaultAsync(ob => ob.AccountId == balance.AccountId
                                            && ob.FiscalYearId == fiscalYearId);

                if (existingByFiscalYear != null)
                {
                    existingByFiscalYear.Amount = balance.DebitAmount > 0 ? balance.DebitAmount : balance.CreditAmount;
                    existingByFiscalYear.Type = balance.DebitAmount > 0 ? "Dr" : "Cr";
                    existingByFiscalYear.Date = fiscalYearStartDate;
                    existingByFiscalYear.NepaliDate = fiscalYearStartDateNepali;
                }
                else
                {
                    var openingBalanceRecord = new OpeningBalanceByFiscalYear
                    {
                        Id = Guid.NewGuid(),
                        AccountId = balance.AccountId,
                        FiscalYearId = fiscalYearId,
                        CompanyId = companyId,
                        Amount = balance.DebitAmount > 0 ? balance.DebitAmount : balance.CreditAmount,
                        Type = balance.DebitAmount > 0 ? "Dr" : "Cr",
                        Date = fiscalYearStartDate,
                        NepaliDate = fiscalYearStartDateNepali,
                    };

                    _context.OpeningBalanceByFiscalYear.Add(openingBalanceRecord);
                }
            }

            // *** FIX: Save to OpeningBalance table (MASTER - only ONE per account, not per fiscal year) ***
            foreach (var balance in closingBalances.Where(b => b.DebitAmount > 0 || b.CreditAmount > 0))
            {
                // Check if an OpeningBalance record already exists for this account (MASTER record)
                var existingMasterOpeningBalance = await _context.OpeningBalances
                    .FirstOrDefaultAsync(ob => ob.AccountId == balance.AccountId
                                            && ob.CompanyId == companyId);

                if (existingMasterOpeningBalance != null)
                {
                    // UPDATE the master opening balance (only ONE per account)
                    existingMasterOpeningBalance.Amount = balance.DebitAmount > 0 ? balance.DebitAmount : balance.CreditAmount;
                    existingMasterOpeningBalance.Type = balance.DebitAmount > 0 ? "Dr" : "Cr";
                    existingMasterOpeningBalance.Date = fiscalYearStartDate;
                    existingMasterOpeningBalance.NepaliDate = fiscalYearStartDateNepali;
                    // Keep the FiscalYearId as null or update it - this is the MASTER record
                    existingMasterOpeningBalance.FiscalYearId = null; // Master record doesn't have fiscal year
                }
                else
                {
                    // CREATE new master opening balance (only ONE per account)
                    var openingBalanceMaster = new OpeningBalance
                    {
                        Id = Guid.NewGuid(),
                        AccountId = balance.AccountId,
                        CompanyId = companyId,
                        Amount = balance.DebitAmount > 0 ? balance.DebitAmount : balance.CreditAmount,
                        Type = balance.DebitAmount > 0 ? "Dr" : "Cr",
                        Date = fiscalYearStartDate,
                        NepaliDate = fiscalYearStartDateNepali,
                        FiscalYearId = null // Master record - not tied to a specific fiscal year
                    };

                    _context.OpeningBalances.Add(openingBalanceMaster);
                }
            }

            await _context.SaveChangesAsync();

            return openingBalanceTransaction;
        }

        /// <summary>
        /// Save closing balances for the SOURCE fiscal year with END date
        /// </summary>
        private async Task SaveClosingBalancesForSourceFiscalYearAsync(
            Guid sourceFiscalYearId,
            Guid companyId,
            DateTime sourceFiscalYearEndDate,
            string sourceFiscalYearEndDateNepali,
            List<AccountBalanceSummaryDto> closingBalances)
        {
            foreach (var balance in closingBalances.Where(b => b.DebitAmount > 0 || b.CreditAmount > 0))
            {
                var existingClosingBalance = await _context.ClosingBalanceByFiscalYear
                    .FirstOrDefaultAsync(cb => cb.AccountId == balance.AccountId
                                            && cb.CompanyId == companyId
                                            && cb.FiscalYearId == sourceFiscalYearId);

                if (existingClosingBalance != null)
                {
                    // Update existing closing balance with END date
                    existingClosingBalance.Amount = balance.DebitAmount > 0 ? balance.DebitAmount : balance.CreditAmount;
                    existingClosingBalance.Type = balance.DebitAmount > 0 ? "Dr" : "Cr";
                    existingClosingBalance.Date = sourceFiscalYearEndDate; // ✅ Use END date
                    existingClosingBalance.NepaliDate = sourceFiscalYearEndDateNepali; // ✅ Use END Nepali date
                    existingClosingBalance.FiscalYearId = sourceFiscalYearId;
                }
                else
                {
                    // Create new closing balance WITH END date
                    var closingBalanceRecord = new ClosingBalanceByFiscalYear
                    {
                        Id = Guid.NewGuid(),
                        AccountId = balance.AccountId,
                        CompanyId = companyId,
                        Amount = balance.DebitAmount > 0 ? balance.DebitAmount : balance.CreditAmount,
                        Type = balance.DebitAmount > 0 ? "Dr" : "Cr",
                        Date = sourceFiscalYearEndDate, // ✅ Use END date
                        NepaliDate = sourceFiscalYearEndDateNepali, // ✅ Use END Nepali date
                        FiscalYearId = sourceFiscalYearId
                    };

                    _context.ClosingBalanceByFiscalYear.Add(closingBalanceRecord);
                }
            }

            await _context.SaveChangesAsync();
        }

        private async Task<string> GenerateOpeningBalanceBillNumberAsync(Guid fiscalYearId, Guid companyId)
        {
            var openingBalanceCount = await _context.Transactions
                .CountAsync(t => t.FiscalYearId == fiscalYearId &&
                                t.CompanyId == companyId &&
                                t.Type == TransactionType.OpeningBalance);

            return $"OP-BAL-{(openingBalanceCount + 1):D5}";
        }

        private async Task<Account> GetOrCreateSuspenseAccountAsync(Guid companyId)
        {
            var suspenseAccount = await _context.Accounts
                .FirstOrDefaultAsync(a => a.CompanyId == companyId && a.Name == "Suspense Account");

            if (suspenseAccount != null)
                return suspenseAccount;

            var defaultGroup = await _context.AccountGroups
                .FirstOrDefaultAsync(g => g.CompanyId == companyId && g.Name == "Current Assets");

            if (defaultGroup == null)
            {
                throw new InvalidOperationException($"Current Assets account group not found for company {companyId}");
            }

            var activeFiscalYear = await _context.FiscalYears
                .FirstOrDefaultAsync(f => f.CompanyId == companyId && f.IsActive);

            if (activeFiscalYear == null)
            {
                throw new InvalidOperationException($"No active fiscal year found for company {companyId}");
            }

            suspenseAccount = new Account
            {
                Id = Guid.NewGuid(),
                Name = "Suspense Account",
                AccountGroupsId = defaultGroup.Id,
                CompanyId = companyId,
                OriginalFiscalYearId = activeFiscalYear.Id,
                OpeningBalanceType = "Dr",
                IsActive = true,
                Date = activeFiscalYear.StartDate ?? DateTime.UtcNow,
                NepaliDate = activeFiscalYear.StartDateNepali ?? DateTime.UtcNow.ToString("yyyy-MM-dd"),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Accounts.Add(suspenseAccount);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Created new Suspense Account for company {CompanyId}", companyId);

            return suspenseAccount;
        }
    }
}

