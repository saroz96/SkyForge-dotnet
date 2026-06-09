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

        // ... (ValidateTransferAsync and GetTransferPreviewAsync remain the same)

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

                // Check if target fiscal year is after source
                if (targetFiscalYear.StartDate <= sourceFiscalYear.EndDate)
                {
                    response.Success = false;
                    response.Errors.Add("Target fiscal year must start after source fiscal year ends");
                    return response;
                }

                // Check if opening balance already exists for target fiscal year
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

            // Get item stock summary from StockEntry for SOURCE fiscal year
            var itemStocks = await GetItemClosingStocksFromStockEntriesAsync(sourceFiscalYearId, companyId);

            // Get account balances from transactions
            var accountBalances = await GetAccountClosingBalancesFromTransactionsAsync(sourceFiscalYearId, companyId);

            return new
            {
                SourceFiscalYear = new { sourceFiscalYear?.Id, sourceFiscalYear?.Name, sourceFiscalYear?.StartDate, sourceFiscalYear?.EndDate },
                TargetFiscalYear = new { targetFiscalYear?.Id, targetFiscalYear?.Name, targetFiscalYear?.StartDate, targetFiscalYear?.EndDate },
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

                // Validate
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

                // Get transfer dates
                DateTime transferDateAd = request.TransferDate;
                string transferDateNepali = request.TransferDateNepali?.ToString() ?? "";

                // 1. Calculate and save CLOSING stock for SOURCE fiscal year
                if (request.TransferItems)
                {
                    var itemSummary = await CalculateAndSaveClosingStockForSourceFiscalYearAsync(
                        request.SourceFiscalYearId,
                        companyId,
                        transferDateAd,
                        transferDateNepali);

                    summary.ItemsSummary = itemSummary;
                    totalStockValue = itemSummary.TotalClosingStockValue;

                    // 2. Create OPENING stock for TARGET fiscal year (NO duplicate items!)
                    await CreateOpeningStockForTargetFiscalYearAsync(
                        request.SourceFiscalYearId,
                        request.TargetFiscalYearId,
                        companyId,
                        transferDateAd,
                        transferDateNepali);
                }

                // 3. Get closing account balances from source fiscal year
                var closingBalances = await GetAccountClosingBalancesFromTransactionsAsync(
                    request.SourceFiscalYearId,
                    companyId);

                // 4. Add Stock in Hand account balance to closing balances (NO duplicate account!)
                await AddStockInHandAccountBalanceAsync(
                    companyId,
                    request.TargetFiscalYearId,
                    totalStockValue,
                    closingBalances);

                // 5. Create Opening Balance Transaction for TARGET fiscal year
                var openingBalanceTransaction = await CreateOpeningBalanceTransactionAsync(
                    targetFiscalYear!.Id,
                    companyId,
                    transferDateAd,
                    transferDateNepali,
                    closingBalances);

                summary.OpeningBalanceTransactionId = openingBalanceTransaction.Id;
                summary.OpeningBalanceVoucherNo = openingBalanceTransaction.BillNumber ?? "OP-BAL-001";

                // Update accounts summary
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

        /// <summary>
        /// Add Stock in Hand account balance to the closing balances (NO duplicate account!)
        /// </summary>
        private async Task AddStockInHandAccountBalanceAsync(
            Guid companyId,
            Guid targetFiscalYearId,
            decimal totalStockValue,
            List<AccountBalanceSummaryDto> closingBalances)
        {
            if (totalStockValue <= 0) return;

            // Get existing Stock in Hand account (DO NOT CREATE NEW ONE)
            var stockInHandAccount = await _context.Accounts
                .FirstOrDefaultAsync(a => a.CompanyId == companyId &&
                                         a.Name == "Stock in Hand" &&
                                         a.IsActive);

            if (stockInHandAccount == null)
            {
                _logger.LogWarning("Stock in Hand account not found");
                return;
            }

            // Check if stock in hand account already exists in closing balances
            var existingStockAccount = closingBalances.FirstOrDefault(b => b.AccountId == stockInHandAccount.Id);

            if (existingStockAccount != null)
            {
                // Update existing stock account balance (add to debit)
                existingStockAccount.DebitAmount += totalStockValue;
                existingStockAccount.BalanceType = "Dr";
            }
            else
            {
                // Add new stock in hand account balance
                closingBalances.Add(new AccountBalanceSummaryDto
                {
                    AccountId = stockInHandAccount.Id,
                    AccountName = stockInHandAccount.Name,
                    DebitAmount = totalStockValue,
                    CreditAmount = 0,
                    BalanceType = "Dr"
                });
            }

            _logger.LogInformation("Added Stock in Hand account balance: {TotalStockValue} for account: {AccountName}",
                totalStockValue, stockInHandAccount.Name);
        }

        /// <summary>
        /// Get existing Stock in Hand account (NO creation!)
        /// </summary>
        private async Task<Account?> GetStockInHandAccountAsync(Guid companyId)
        {
            return await _context.Accounts
                .FirstOrDefaultAsync(a => a.CompanyId == companyId &&
                                         a.Name == "Stock in Hand" &&
                                         a.IsActive);
        }

        /// <summary>
        /// Calculate closing stock from StockEntry records for SOURCE fiscal year using PuPrice
        /// </summary>
        private async Task<ItemTransferSummaryDto> CalculateAndSaveClosingStockForSourceFiscalYearAsync(
            Guid sourceFiscalYearId,
            Guid companyId,
            DateTime transferDateAd,
            string transferDateNepali)
        {
            var summary = new ItemTransferSummaryDto();

            var items = await _context.Items
                .Where(i => i.CompanyId == companyId && i.Status == "active")
                .ToListAsync();

            summary.ItemsProcessed = items.Count;

            // Get existing closing stock records for SOURCE fiscal year
            var existingClosingStocks = await _context.ItemClosingStockByFiscalYear
                .Where(cs => cs.FiscalYearId == sourceFiscalYearId)
                .ToDictionaryAsync(cs => cs.ItemId, cs => cs);

            foreach (var item in items)
            {
                // Calculate closing stock from StockEntry records for SOURCE fiscal year using PuPrice
                var closingStockData = await CalculateItemClosingStockFromStockEntriesAsync(item.Id, sourceFiscalYearId, companyId);

                // Calculate average purchase price (PuPrice)
                var avgPurchasePrice = closingStockData.TotalQuantity > 0
                    ? closingStockData.TotalValue / closingStockData.TotalQuantity
                    : 0;

                if (closingStockData.TotalQuantity > 0)
                {
                    summary.ItemsWithStock++;
                    summary.TotalClosingStockQuantity += closingStockData.TotalQuantity;
                    summary.TotalClosingStockValue += closingStockData.TotalValue;
                }

                // Save or update closing stock record for SOURCE fiscal year
                if (existingClosingStocks.TryGetValue(item.Id, out var existingRecord))
                {
                    // Update existing record
                    existingRecord.ClosingStock = closingStockData.TotalQuantity;
                    existingRecord.ClosingStockValue = closingStockData.TotalValue;
                    existingRecord.PurchasePrice = avgPurchasePrice;
                    existingRecord.SalesPrice = item.Price ?? avgPurchasePrice;
                    existingRecord.Date = transferDateAd;
                    existingRecord.NepaliDate = transferDateNepali;
                    existingRecord.UpdatedAt = DateTime.UtcNow;
                }
                else
                {
                    // Create new closing stock record for SOURCE fiscal year
                    var closingStock = new ItemClosingStockByFiscalYear
                    {
                        Id = Guid.NewGuid(),
                        ItemId = item.Id,
                        FiscalYearId = sourceFiscalYearId,
                        ClosingStock = closingStockData.TotalQuantity,
                        ClosingStockValue = closingStockData.TotalValue,
                        PurchasePrice = avgPurchasePrice,
                        SalesPrice = item.Price ?? avgPurchasePrice,
                        Date = transferDateAd,
                        NepaliDate = transferDateNepali,
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
        /// Calculate closing stock directly from StockEntry records using PuPrice
        /// </summary>
        private async Task<(decimal TotalQuantity, decimal TotalValue)> CalculateItemClosingStockFromStockEntriesAsync(
            Guid itemId,
            Guid fiscalYearId,
            Guid companyId)
        {
            // Get all stock entries for this item in the fiscal year
            var stockEntries = await _context.StockEntries
                .Where(s => s.ItemId == itemId &&
                           s.FiscalYearId == fiscalYearId)
                .ToListAsync();

            decimal totalQuantity = 0;
            decimal totalValue = 0;

            foreach (var entry in stockEntries)
            {
                // Use PuPrice for stock value calculation, NOT Price
                // PuPrice is the Purchase Unit Price
                totalQuantity += entry.Quantity;
                totalValue += entry.Quantity * entry.PuPrice;
            }

            return (totalQuantity, totalValue);
        }

        /// <summary>
        /// Create OPENING stock for TARGET fiscal year (NO duplicate items!)
        /// </summary>
        private async Task CreateOpeningStockForTargetFiscalYearAsync(
            Guid sourceFiscalYearId,
            Guid targetFiscalYearId,
            Guid companyId,
            DateTime transferDateAd,
            string transferDateNepali)
        {
            // Get all closing stock records from SOURCE fiscal year
            var closingStocks = await _context.ItemClosingStockByFiscalYear
                .Include(cs => cs.Item)
                .Where(cs => cs.FiscalYearId == sourceFiscalYearId)
                .ToListAsync();

            // Check for existing opening stock in TARGET fiscal year
            var existingOpeningStocks = await _context.ItemOpeningStockByFiscalYear
                .Where(os => os.FiscalYearId == targetFiscalYearId)
                .ToDictionaryAsync(os => os.ItemId, os => os);

            foreach (var closingStock in closingStocks)
            {
                if (existingOpeningStocks.TryGetValue(closingStock.ItemId, out var existingRecord))
                {
                    // Update existing opening stock record for TARGET fiscal year
                    existingRecord.OpeningStock = closingStock.ClosingStock;
                    existingRecord.OpeningStockValue = closingStock.ClosingStockValue;
                    existingRecord.PurchasePrice = closingStock.PurchasePrice;
                    existingRecord.SalesPrice = closingStock.SalesPrice;
                    existingRecord.Date = transferDateAd;
                    existingRecord.NepaliDate = transferDateNepali;
                    existingRecord.UpdatedAt = DateTime.UtcNow;
                }
                else
                {
                    // Create new opening stock record for TARGET fiscal year (Item remains the same!)
                    var openingStock = new ItemOpeningStockByFiscalYear
                    {
                        Id = Guid.NewGuid(),
                        ItemId = closingStock.ItemId, // Same Item ID! No duplication
                        FiscalYearId = targetFiscalYearId,
                        CompanyId = companyId, // Add CompanyId if your model has it
                        OpeningStock = closingStock.ClosingStock,
                        OpeningStockValue = closingStock.ClosingStockValue,
                        PurchasePrice = closingStock.PurchasePrice,
                        SalesPrice = closingStock.SalesPrice,
                        Date = transferDateAd,
                        NepaliDate = transferDateNepali,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    _context.ItemOpeningStockByFiscalYear.Add(openingStock);
                }
            }

            await _context.SaveChangesAsync();
        }

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
                var stock = await CalculateItemClosingStockFromStockEntriesAsync(item.Id, fiscalYearId, companyId);
                result.Add(new ItemClosingStockByFiscalYear
                {
                    ItemId = item.Id,
                    Item = item,
                    ClosingStock = stock.TotalQuantity,
                    ClosingStockValue = stock.TotalValue
                });
            }

            return result;
        }

        /// <summary>
        /// Get account closing balances from transactions (using existing accounts)
        /// </summary>
        private async Task<List<AccountBalanceSummaryDto>> GetAccountClosingBalancesFromTransactionsAsync(
            Guid fiscalYearId,
            Guid companyId)
        {
            // Get all accounts (NO fiscal year filter!)
            var accounts = await _context.Accounts
                .Where(a => a.CompanyId == companyId && a.IsActive)
                .ToListAsync();

            var result = new List<AccountBalanceSummaryDto>();

            foreach (var account in accounts)
            {
                // Skip Stock in Hand account - we'll handle it separately
                if (account.Name == "Stock in Hand")
                {
                    continue;
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

                // Check OpeningBalanceByFiscalYear table for this fiscal year
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

                result.Add(new AccountBalanceSummaryDto
                {
                    AccountId = account.Id,
                    AccountName = account.Name,
                    DebitAmount = totalDebit >= totalCredit ? closingBalance : 0,
                    CreditAmount = totalCredit > totalDebit ? closingBalance : 0,
                    BalanceType = balanceType
                });
            }

            return result;
        }

        /// <summary>
        /// Create Opening Balance Transaction (NO duplicate accounts!)
        /// </summary>
        private async Task<Transaction> CreateOpeningBalanceTransactionAsync(
            Guid fiscalYearId,
            Guid companyId,
            DateTime transferDateAd,
            string transferDateNepali,
            List<AccountBalanceSummaryDto> closingBalances)
        {
            var billNumber = await GenerateOpeningBalanceBillNumberAsync(fiscalYearId, companyId);

            decimal totalDebit = closingBalances.Sum(b => b.DebitAmount);
            decimal totalCredit = closingBalances.Sum(b => b.CreditAmount);

            // Ensure debits equal credits
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
                Date = transferDateAd,
                NepaliDate = transferDateNepali,
                TransactionDateNepali = transferDateNepali,
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

            // Save to OpeningBalanceByFiscalYear table for TARGET fiscal year (NO duplicate accounts!)
            foreach (var balance in closingBalances.Where(b => b.DebitAmount > 0 || b.CreditAmount > 0))
            {
                var openingBalanceRecord = new OpeningBalanceByFiscalYear
                {
                    Id = Guid.NewGuid(),
                    AccountId = balance.AccountId, // Same Account ID! No duplication
                    FiscalYearId = fiscalYearId,
                    CompanyId = companyId,
                    Amount = balance.DebitAmount > 0 ? balance.DebitAmount : balance.CreditAmount,
                    Type = balance.DebitAmount > 0 ? "Dr" : "Cr",
                    Date = transferDateAd,
                    NepaliDate = transferDateNepali,
                };

                _context.OpeningBalanceByFiscalYear.Add(openingBalanceRecord);
            }

            await _context.SaveChangesAsync();

            return openingBalanceTransaction;
        }

        private async Task<string> GenerateOpeningBalanceBillNumberAsync(Guid fiscalYearId, Guid companyId)
        {
            var openingBalanceCount = await _context.Transactions
                .CountAsync(t => t.FiscalYearId == fiscalYearId &&
                                t.CompanyId == companyId &&
                                t.Type == TransactionType.OpeningBalance);

            return $"OP-BAL-{(openingBalanceCount + 1):D5}";
        }

        /// <summary>
        /// Get or create Suspense Account (only once, shared across all fiscal years)
        /// </summary>
        private async Task<Account> GetOrCreateSuspenseAccountAsync(Guid companyId)
        {
            // Try to find existing Suspense Account (NO fiscal year filter!)
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

            // Get active fiscal year for OriginalFiscalYearId only
            var activeFiscalYear = await _context.FiscalYears
                .FirstOrDefaultAsync(f => f.CompanyId == companyId && f.IsActive);

            if (activeFiscalYear == null)
            {
                throw new InvalidOperationException($"No active fiscal year found for company {companyId}");
            }

            // Create Suspense Account only ONCE (shared across all fiscal years)
            suspenseAccount = new Account
            {
                Id = Guid.NewGuid(),
                Name = "Suspense Account",
                AccountGroupsId = defaultGroup.Id,
                CompanyId = companyId,
                OriginalFiscalYearId = activeFiscalYear.Id, // Track when it was created
                OpeningBalanceType = "Dr",
                IsActive = true,
                Date = DateTime.UtcNow,
                NepaliDate = DateTime.UtcNow.ToString("yyyy-MM-dd"),
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