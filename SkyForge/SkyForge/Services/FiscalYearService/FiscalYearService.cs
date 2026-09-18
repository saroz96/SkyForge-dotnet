using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Models.FiscalYearModel;
using SkyForge.Models.Shared;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using SkyForge.Dto;
using SkyForge.Models.CompanyModel;
using SkyForge.Models.UserModel;
using SkyForge.Models.Retailer.SettingsModel;
using SkyForge.Models.AccountGroupModel;
using SkyForge.Models.Retailer.CategoryModel;
using SkyForge.Models.Retailer.ItemCompanyModel;
using SkyForge.Models.Retailer.MainUnitModel;
using SkyForge.Models.AccountModel;
using SkyForge.Models.UnitModel;
using SkyForge.Models.Retailer.CompositionModel;
using SkyForge.Models.Retailer.Items;
using SkyForge.Models;

namespace SkyForge.Services
{
    public interface IFiscalYearService
    {
        Task<FiscalYear> CreateFiscalYearAsync(FiscalYear fiscalYear);
        Task<FiscalYear> GetActiveFiscalYearAsync(Guid companyId);
        Task<List<FiscalYear>> GetCompanyFiscalYearsAsync(Guid companyId);
        Task<bool> ActivateFiscalYearAsync(Guid fiscalYearId, Guid companyId);
        Task SplitFiscalYearAsync(SplitFiscalYearRequestDto request, Guid userId, Func<SplitFiscalYearProgressEventDto, Task> onProgress, CancellationToken cancellationToken = default);
    }

    public class FiscalYearService : IFiscalYearService
    {
        private readonly ApplicationDbContext _context;
        private readonly Random _random;
        private readonly ILogger<FiscalYearService> _logger;

        public FiscalYearService(ApplicationDbContext context, ILogger<FiscalYearService> logger)
        {
            _context = context;
            _random = new Random();
            _logger = logger;
        }

        public async Task<FiscalYear> CreateFiscalYearAsync(FiscalYear fiscalYear)
        {
            var existingFiscalYear = await _context.FiscalYears
                .FirstOrDefaultAsync(f => f.CompanyId == fiscalYear.CompanyId && f.Name == fiscalYear.Name);

            if (existingFiscalYear != null)
            {
                return existingFiscalYear;
            }

            if (fiscalYear.DateFormat == DateFormatEnum.Nepali)
            {
                if (!fiscalYear.StartDate.HasValue)
                    fiscalYear.StartDate = DateTime.MinValue;
                if (!fiscalYear.EndDate.HasValue)
                    fiscalYear.EndDate = DateTime.MinValue;
            }

            if (fiscalYear.BillPrefixes == null)
                fiscalYear.BillPrefixes = new BillPrefixes();

            var generatedPrefixes = new HashSet<string>();

            var transactionTypes = new Dictionary<string, Action<string>>
            {
                ["Sales"] = (prefix) => fiscalYear.BillPrefixes.Sales = prefix,
                ["SalesQuotation"] = (prefix) => fiscalYear.BillPrefixes.SalesQuotation = prefix,
                ["SalesReturn"] = (prefix) => fiscalYear.BillPrefixes.SalesReturn = prefix,
                ["Purchase"] = (prefix) => fiscalYear.BillPrefixes.Purchase = prefix,
                ["PurchaseReturn"] = (prefix) => fiscalYear.BillPrefixes.PurchaseReturn = prefix,
                ["Payment"] = (prefix) => fiscalYear.BillPrefixes.Payment = prefix,
                ["Receipt"] = (prefix) => fiscalYear.BillPrefixes.Receipt = prefix,
                ["StockAdjustment"] = (prefix) => fiscalYear.BillPrefixes.StockAdjustment = prefix,
                ["DebitNote"] = (prefix) => fiscalYear.BillPrefixes.DebitNote = prefix,
                ["CreditNote"] = (prefix) => fiscalYear.BillPrefixes.CreditNote = prefix,
                ["JournalVoucher"] = (prefix) => fiscalYear.BillPrefixes.JournalVoucher = prefix
            };

            foreach (var transactionType in transactionTypes)
            {
                var currentPrefix = GetTransactionPrefix(fiscalYear.BillPrefixes, transactionType.Key);
                if (string.IsNullOrEmpty(currentPrefix))
                {
                    string prefix;
                    do
                    {
                        prefix = GenerateRandomPrefix();
                    } while (generatedPrefixes.Contains(prefix));

                    transactionType.Value(prefix);
                    generatedPrefixes.Add(prefix);
                }
                else
                {
                    generatedPrefixes.Add(currentPrefix);
                }
            }

            if (fiscalYear.Id == Guid.Empty)
            {
                fiscalYear.Id = Guid.NewGuid();
            }

            if (fiscalYear.CreatedAt == default)
            {
                fiscalYear.CreatedAt = DateTime.UtcNow;
            }

            var existingFiscalYears = await _context.FiscalYears
                .CountAsync(f => f.CompanyId == fiscalYear.CompanyId);

            if (existingFiscalYears == 0)
                fiscalYear.IsActive = true;

            _context.FiscalYears.Add(fiscalYear);
            await _context.SaveChangesAsync();

            return fiscalYear;
        }

        public async Task<FiscalYear> GetActiveFiscalYearAsync(Guid companyId)
        {
            return await _context.FiscalYears
                .FirstOrDefaultAsync(f => f.CompanyId == companyId && f.IsActive);
        }

        public async Task<List<FiscalYear>> GetCompanyFiscalYearsAsync(Guid companyId)
        {
            return await _context.FiscalYears
                .Where(f => f.CompanyId == companyId)
                .OrderByDescending(f => f.StartDate)
                .ToListAsync();
        }

        public async Task<bool> ActivateFiscalYearAsync(Guid fiscalYearId, Guid companyId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var fiscalYears = await _context.FiscalYears
                    .Where(f => f.CompanyId == companyId)
                    .ToListAsync();

                foreach (var fy in fiscalYears)
                {
                    fy.IsActive = (fy.Id == fiscalYearId);
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                return true;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        private string GetTransactionPrefix(BillPrefixes prefixes, string transactionType)
        {
            return transactionType switch
            {
                "Sales" => prefixes.Sales,
                "SalesQuotation" => prefixes.SalesQuotation,
                "SalesReturn" => prefixes.SalesReturn,
                "Purchase" => prefixes.Purchase,
                "PurchaseReturn" => prefixes.PurchaseReturn,
                "Payment" => prefixes.Payment,
                "Receipt" => prefixes.Receipt,
                "StockAdjustment" => prefixes.StockAdjustment,
                "DebitNote" => prefixes.DebitNote,
                "CreditNote" => prefixes.CreditNote,
                "JournalVoucher" => prefixes.JournalVoucher,
                _ => null
            };
        }

        private string GenerateRandomPrefix()
        {
            const string letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
            return new string(Enumerable.Range(0, 4)
                .Select(_ => letters[_random.Next(letters.Length)])
                .ToArray());
        }

        // public async Task SplitFiscalYearAsync(SplitFiscalYearRequestDto request, Guid userId, Func<SplitFiscalYearProgressEventDto, Task> onProgress, CancellationToken cancellationToken = default)
        // {
        //     await onProgress(new SplitFiscalYearProgressEventDto
        //     {
        //         Type = "progress",
        //         Value = 5,
        //         Message = "Starting company split process..."
        //     });

        //     await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);

        //     // Declare variables at the top to track counts
        //     int itemsCopied = 0;
        //     int stockEntriesCopied = 0;
        //     int itemCompositionsCopied = 0;
        //     int sourceAccountGroupsCount = 0;
        //     int sourceCategoriesCount = 0;
        //     int sourceItemCompaniesCount = 0;
        //     int sourceMainUnitsCount = 0;
        //     int sourceUnitsCount = 0;
        //     int sourceAccountsCount = 0;
        //     int openingBalancesCopied = 0;
        //     int initialOpeningBalancesCopied = 0;

        //     try
        //     {
        //         _logger.LogInformation("=== Starting SplitFiscalYearAsync ===");
        //         _logger.LogInformation("SourceCompanyId: {SourceCompanyId}", request.SourceCompanyId);
        //         _logger.LogInformation("FiscalYearId: {FiscalYearId}", request.FiscalYearId);
        //         _logger.LogInformation("NewCompanyName: {NewCompanyName}", request.NewCompanyName);
        //         _logger.LogInformation("DeleteAfterSplit: {DeleteAfterSplit}", request.DeleteAfterSplit);

        //         // Get source company
        //         var sourceCompany = await _context.Companies
        //             .FirstOrDefaultAsync(c => c.Id == request.SourceCompanyId, cancellationToken);

        //         if (sourceCompany == null)
        //         {
        //             await onProgress(new SplitFiscalYearProgressEventDto
        //             {
        //                 Type = "error",
        //                 Error = "Source company not found"
        //             });
        //             return;
        //         }

        //         // Get fiscal year to split
        //         var splitFiscalYear = await _context.FiscalYears
        //             .FirstOrDefaultAsync(f => f.Id == request.FiscalYearId && f.CompanyId == request.SourceCompanyId, cancellationToken);

        //         if (splitFiscalYear == null)
        //         {
        //             await onProgress(new SplitFiscalYearProgressEventDto
        //             {
        //                 Type = "error",
        //                 Error = "Fiscal year not found in source company"
        //             });
        //             return;
        //         }

        //         // Check if new company name already exists
        //         var existingCompany = await _context.Companies
        //             .AnyAsync(c => c.Name == request.NewCompanyName && c.OwnerId == userId, cancellationToken);

        //         if (existingCompany)
        //         {
        //             await onProgress(new SplitFiscalYearProgressEventDto
        //             {
        //                 Type = "error",
        //                 Error = "Company with this name already exists"
        //             });
        //             return;
        //         }

        //         // Step 1: Create new company
        //         await onProgress(new SplitFiscalYearProgressEventDto
        //         {
        //             Type = "progress",
        //             Value = 10,
        //             Message = "Creating new company..."
        //         });

        //         var newCompany = new Company
        //         {
        //             Id = Guid.NewGuid(),
        //             Name = request.NewCompanyName,
        //             OwnerId = userId,
        //             TradeType = sourceCompany.TradeType,
        //             Address = sourceCompany.Address ?? string.Empty,
        //             Country = sourceCompany.Country ?? string.Empty,
        //             State = sourceCompany.State ?? string.Empty,
        //             City = sourceCompany.City ?? string.Empty,
        //             Ward = sourceCompany.Ward,
        //             Phone = sourceCompany.Phone ?? string.Empty,
        //             Pan = sourceCompany.Pan ?? string.Empty,
        //             Email = sourceCompany.Email ?? string.Empty,
        //             VatEnabled = sourceCompany.VatEnabled,
        //             DateFormat = sourceCompany.DateFormat,
        //             FiscalYearStartDateEnglish = splitFiscalYear.StartDate,
        //             FiscalYearStartDateNepali = splitFiscalYear.StartDateNepali ?? string.Empty,
        //             CreatedAt = DateTime.UtcNow,
        //             UpdatedAt = DateTime.UtcNow
        //         };

        //         _context.Companies.Add(newCompany);
        //         await _context.SaveChangesAsync(cancellationToken);
        //         _logger.LogInformation("New company created with ID: {CompanyId}", newCompany.Id);

        //         // Step 2: Create fiscal year for new company
        //         await onProgress(new SplitFiscalYearProgressEventDto
        //         {
        //             Type = "progress",
        //             Value = 15,
        //             Message = "Setting up fiscal years..."
        //         });

        //         var newFiscalYear = new FiscalYear
        //         {
        //             Id = Guid.NewGuid(),
        //             Name = splitFiscalYear.Name,
        //             StartDate = splitFiscalYear.StartDate,
        //             EndDate = splitFiscalYear.EndDate,
        //             StartDateNepali = splitFiscalYear.StartDateNepali,
        //             EndDateNepali = splitFiscalYear.EndDateNepali,
        //             DateFormat = splitFiscalYear.DateFormat,
        //             CompanyId = newCompany.Id,
        //             IsActive = true,
        //             BillPrefixes = new BillPrefixes(),
        //             CreatedAt = DateTime.UtcNow
        //         };

        //         _context.FiscalYears.Add(newFiscalYear);
        //         await _context.SaveChangesAsync(cancellationToken);
        //         _logger.LogInformation("New fiscal year created with ID: {FiscalYearId}", newFiscalYear.Id);

        //         // Step 3: Clone settings
        //         await onProgress(new SplitFiscalYearProgressEventDto
        //         {
        //             Type = "progress",
        //             Value = 20,
        //             Message = "Cloning settings..."
        //         });

        //         try
        //         {
        //             var sourceSettings = await _context.CompanySettings
        //                 .FirstOrDefaultAsync(s => s.CompanyId == request.SourceCompanyId && s.FiscalYearId == splitFiscalYear.Id, cancellationToken);

        //             if (sourceSettings != null)
        //             {
        //                 var newSettings = new Settings
        //                 {
        //                     Id = Guid.NewGuid(),
        //                     CompanyId = newCompany.Id,
        //                     UserId = userId,
        //                     FiscalYearId = newFiscalYear.Id,
        //                     RoundOffSales = sourceSettings.RoundOffSales,
        //                     RoundOffPurchase = sourceSettings.RoundOffPurchase,
        //                     RoundOffSalesReturn = sourceSettings.RoundOffSalesReturn,
        //                     RoundOffPurchaseReturn = sourceSettings.RoundOffPurchaseReturn,
        //                     DisplayTransactions = sourceSettings.DisplayTransactions,
        //                     DisplayTransactionsForPurchase = sourceSettings.DisplayTransactionsForPurchase,
        //                     DisplayTransactionsForSalesReturn = sourceSettings.DisplayTransactionsForSalesReturn,
        //                     DisplayTransactionsForPurchaseReturn = sourceSettings.DisplayTransactionsForPurchaseReturn,
        //                     UseVoucherLastDateForSales = sourceSettings.UseVoucherLastDateForSales,
        //                     UseVoucherLastDateForSalesReturn = sourceSettings.UseVoucherLastDateForSalesReturn,
        //                     UseVoucherLastDateForPurchase = sourceSettings.UseVoucherLastDateForPurchase,
        //                     UseVoucherLastDateForPurchaseReturn = sourceSettings.UseVoucherLastDateForPurchaseReturn,
        //                     UseVoucherLastDateForPayment = sourceSettings.UseVoucherLastDateForPayment,
        //                     UseVoucherLastDateForReceipt = sourceSettings.UseVoucherLastDateForReceipt,
        //                     UseVoucherLastDateForJournal = sourceSettings.UseVoucherLastDateForJournal,
        //                     UseVoucherLastDateForDebitNote = sourceSettings.UseVoucherLastDateForDebitNote,
        //                     UseVoucherLastDateForCreditNote = sourceSettings.UseVoucherLastDateForCreditNote,
        //                     UseVoucherLastDateForSalesQuotation = sourceSettings.UseVoucherLastDateForSalesQuotation,
        //                     UseVoucherLastDateForStockAdjustment = sourceSettings.UseVoucherLastDateForStockAdjustment,
        //                     StoreManagement = sourceSettings.StoreManagement,
        //                     Value = sourceSettings.Value,
        //                     CreatedAt = DateTime.UtcNow
        //                 };
        //                 _context.CompanySettings.Add(newSettings);
        //                 await _context.SaveChangesAsync(cancellationToken);
        //             }
        //         }
        //         catch (Exception ex)
        //         {
        //             _logger.LogWarning(ex, "Failed to clone settings, continuing with defaults");
        //         }

        //         // Step 4: Clone account groups
        //         await onProgress(new SplitFiscalYearProgressEventDto
        //         {
        //             Type = "progress",
        //             Value = 25,
        //             Message = "Cloning account groups..."
        //         });

        //         var accountGroupMap = new Dictionary<Guid, Guid>();
        //         var sourceAccountGroups = await _context.AccountGroups
        //             .Where(g => g.CompanyId == request.SourceCompanyId)
        //             .ToListAsync(cancellationToken);

        //         sourceAccountGroupsCount = sourceAccountGroups.Count;

        //         foreach (var group in sourceAccountGroups)
        //         {
        //             var newGroup = new AccountGroup
        //             {
        //                 Id = Guid.NewGuid(),
        //                 Name = group.Name,
        //                 Type = group.Type,
        //                 CompanyId = newCompany.Id,
        //                 PrimaryGroup = group.PrimaryGroup,
        //                 CreatedAt = DateTime.UtcNow,
        //                 UpdatedAt = DateTime.UtcNow
        //             };
        //             _context.AccountGroups.Add(newGroup);
        //             accountGroupMap[group.Id] = newGroup.Id;
        //         }
        //         await _context.SaveChangesAsync(cancellationToken);
        //         _logger.LogInformation("Cloned {Count} account groups", sourceAccountGroups.Count);

        //         // Step 5: Clone accounts
        //         await onProgress(new SplitFiscalYearProgressEventDto
        //         {
        //             Type = "progress",
        //             Value = 35,
        //             Message = "Cloning accounts..."
        //         });

        //         var sourceAccounts = await _context.Accounts
        //             .Where(a => a.CompanyId == request.SourceCompanyId)
        //             .Include(a => a.OpeningBalance)
        //             .ToListAsync(cancellationToken);

        //         sourceAccountsCount = sourceAccounts.Count;
        //         var accountMap = new Dictionary<Guid, Guid>();

        //         foreach (var account in sourceAccounts)
        //         {
        //             var newAccountGroupId = accountGroupMap.TryGetValue(account.AccountGroupsId, out var mappedId)
        //                 ? mappedId
        //                 : account.AccountGroupsId;

        //             var newAccount = new Account
        //             {
        //                 Id = Guid.NewGuid(),
        //                 Name = account.Name,
        //                 Address = account.Address,
        //                 Ward = account.Ward,
        //                 Phone = account.Phone,
        //                 Pan = account.Pan,
        //                 ContactPerson = account.ContactPerson,
        //                 Email = account.Email,
        //                 UniqueNumber = account.UniqueNumber,
        //                 CreditLimit = account.CreditLimit,
        //                 AccountGroupsId = newAccountGroupId,
        //                 CompanyId = newCompany.Id,
        //                 OriginalFiscalYearId = newFiscalYear.Id,
        //                 OpeningBalanceType = account.OpeningBalanceType,
        //                 DefaultCashAccount = account.DefaultCashAccount,
        //                 IsActive = account.IsActive,
        //                 CreatedAt = DateTime.UtcNow,
        //                 UpdatedAt = DateTime.UtcNow,
        //                 Date = DateTime.UtcNow
        //             };

        //             if (account.OpeningBalance != null)
        //             {
        //                 newAccount.OpeningBalance = new OpeningBalance
        //                 {
        //                     Id = Guid.NewGuid(),
        //                     FiscalYearId = newFiscalYear.Id,
        //                     Amount = account.OpeningBalance.Amount,
        //                     Type = account.OpeningBalance.Type,
        //                     Date = splitFiscalYear.StartDate ?? DateTime.UtcNow,
        //                     AccountId = newAccount.Id,
        //                     CompanyId = newCompany.Id
        //                 };
        //             }

        //             _context.Accounts.Add(newAccount);
        //             accountMap[account.Id] = newAccount.Id;
        //         }
        //         await _context.SaveChangesAsync(cancellationToken);
        //         _logger.LogInformation("Cloned {Count} accounts", sourceAccounts.Count);

        //         // Step 5.5: Create InitialOpeningBalance for the new company
        //         //           using the source company's OPENING balances of the split fiscal year.
        //         await onProgress(new SplitFiscalYearProgressEventDto
        //         {
        //             Type = "progress",
        //             Value = 38,
        //             Message = "Setting initial opening balances..."
        //         });

        //         var sourceInitialBalances = await _context.OpeningBalanceByFiscalYear
        //             .Where(ob => ob.FiscalYearId == splitFiscalYear.Id
        //                       && ob.CompanyId == request.SourceCompanyId)
        //             .Include(ob => ob.Account)
        //             .ToListAsync(cancellationToken);

        //         _logger.LogInformation("Found {Count} source opening balances to set as initial opening balances",
        //             sourceInitialBalances.Count);

        //         foreach (var openingBalance in sourceInitialBalances)
        //         {
        //             // Map old account ID → new account ID
        //             if (!accountMap.TryGetValue(openingBalance.AccountId, out var newAccountId))
        //             {
        //                 _logger.LogWarning("Account {AccountId} not found in accountMap, skipping initial opening balance",
        //                     openingBalance.AccountId);
        //                 continue;
        //             }

        //             // Check if an InitialOpeningBalance already exists for this account
        //             // (1-to-1 relationship → check on AccountId only)
        //             var existingInitial = await _context.InitialOpeningBalances
        //                 .FirstOrDefaultAsync(iob => iob.AccountId == newAccountId, cancellationToken);

        //             if (existingInitial != null)
        //             {
        //                 // Update existing
        //                 existingInitial.Amount = openingBalance.Amount;
        //                 existingInitial.Type = openingBalance.Type;
        //                 existingInitial.Date = openingBalance.Date;
        //                 existingInitial.NepaliDate = openingBalance.NepaliDate;
        //                 existingInitial.CompanyId = newCompany.Id;
        //                 existingInitial.InitialFiscalYearId = newFiscalYear.Id;
        //             }
        //             else
        //             {
        //                 // Create new
        //                 _context.InitialOpeningBalances.Add(new InitialOpeningBalance
        //                 {
        //                     Id = Guid.NewGuid(),
        //                     InitialFiscalYearId = newFiscalYear.Id,   // New company's first FY
        //                     AccountId = newAccountId,
        //                     CompanyId = newCompany.Id,
        //                     Amount = openingBalance.Amount,           // ✅ Same amount as Step 6
        //                     Type = openingBalance.Type,               // ✅ Same type as Step 6
        //                     Date = openingBalance.Date,
        //                     NepaliDate = openingBalance.NepaliDate
        //                 });
        //             }

        //             initialOpeningBalancesCopied++;
        //         }

        //         await _context.SaveChangesAsync(cancellationToken);
        //         _logger.LogInformation("Created {Count} initial opening balances", initialOpeningBalancesCopied);
        //         // Step 6: Clone OpeningBalanceByFiscalYear (Transfer opening balances to new fiscal year)
        //         await onProgress(new SplitFiscalYearProgressEventDto
        //         {
        //             Type = "progress",
        //             Value = 40,
        //             Message = "Cloning opening balances to new fiscal year..."
        //         });

        //         var sourceOpeningBalances = await _context.OpeningBalanceByFiscalYear
        //             .Where(ob => ob.FiscalYearId == splitFiscalYear.Id && ob.CompanyId == request.SourceCompanyId)
        //             .Include(ob => ob.Account)
        //             .ToListAsync(cancellationToken);

        //         _logger.LogInformation("Found {Count} opening balances to clone", sourceOpeningBalances.Count);

        //         foreach (var openingBalance in sourceOpeningBalances)
        //         {
        //             // Get the new account ID from the mapping
        //             if (!accountMap.TryGetValue(openingBalance.AccountId, out var newAccountId))
        //             {
        //                 _logger.LogWarning($"Account {openingBalance.AccountId} not found in account map, skipping opening balance");
        //                 continue;
        //             }

        //             // Check if opening balance already exists for this account in the new fiscal year
        //             var existingOpeningBalance = await _context.OpeningBalanceByFiscalYear
        //                 .FirstOrDefaultAsync(ob => ob.AccountId == newAccountId && ob.FiscalYearId == newFiscalYear.Id, cancellationToken);

        //             if (existingOpeningBalance != null)
        //             {
        //                 // Update existing opening balance
        //                 existingOpeningBalance.Amount = openingBalance.Amount;
        //                 existingOpeningBalance.Type = openingBalance.Type;
        //                 existingOpeningBalance.Date = openingBalance.Date;
        //                 existingOpeningBalance.NepaliDate = openingBalance.NepaliDate;
        //                 existingOpeningBalance.CompanyId = newCompany.Id;
        //             }
        //             else
        //             {
        //                 // Create new opening balance for the new fiscal year
        //                 var newOpeningBalance = new OpeningBalanceByFiscalYear
        //                 {
        //                     Id = Guid.NewGuid(),
        //                     AccountId = newAccountId,
        //                     FiscalYearId = newFiscalYear.Id,
        //                     CompanyId = newCompany.Id,
        //                     Amount = openingBalance.Amount,
        //                     Type = openingBalance.Type,
        //                     Date = openingBalance.Date,
        //                     NepaliDate = openingBalance.NepaliDate,
        //                 };
        //                 _context.OpeningBalanceByFiscalYear.Add(newOpeningBalance);
        //             }

        //             openingBalancesCopied++;
        //         }

        //         await _context.SaveChangesAsync(cancellationToken);
        //         _logger.LogInformation("Cloned {Count} opening balances", openingBalancesCopied);

        //         // Step 7: Clone categories
        //         await onProgress(new SplitFiscalYearProgressEventDto
        //         {
        //             Type = "progress",
        //             Value = 45,
        //             Message = "Cloning categories..."
        //         });

        //         var categoryMap = new Dictionary<Guid, Guid>();

        //         // Clone categories - same pattern as items
        //         var sourceCategories = await _context.Categories
        //             .Where(c => c.CompanyId == request.SourceCompanyId)
        //             .Where(c => c.OriginalFiscalYearId == splitFiscalYear.Id || c.FiscalYearId == splitFiscalYear.Id)
        //             .ToListAsync(cancellationToken);

        //         // FALLBACK: If no categories found, fetch ALL categories for company
        //         if (!sourceCategories.Any())
        //         {
        //             _logger.LogWarning("No categories found with OriginalFiscalYearId = {FiscalYearId}, fetching all categories for company", splitFiscalYear.Id);
        //             sourceCategories = await _context.Categories
        //                 .Where(c => c.CompanyId == request.SourceCompanyId)
        //                 .ToListAsync(cancellationToken);
        //         }

        //         sourceCategoriesCount = sourceCategories.Count;
        //         _logger.LogInformation("Found {Count} categories to clone", sourceCategories.Count);

        //         foreach (var category in sourceCategories)
        //         {
        //             // Check if category already exists in new company (by name) to avoid duplicates
        //             var existingCategory = await _context.Categories
        //                 .FirstOrDefaultAsync(c => c.CompanyId == newCompany.Id && c.Name == category.Name, cancellationToken);

        //             if (existingCategory != null)
        //             {
        //                 // Map to existing category
        //                 categoryMap[category.Id] = existingCategory.Id;
        //                 _logger.LogInformation("Category {Name} already exists in new company, mapping to existing", category.Name);
        //                 continue;
        //             }

        //             var newCategory = new Category
        //             {
        //                 Id = Guid.NewGuid(),
        //                 Name = category.Name,
        //                 UniqueNumber = category.UniqueNumber,
        //                 CompanyId = newCompany.Id,
        //                 FiscalYearId = newFiscalYear.Id,
        //                 OriginalFiscalYearId = newFiscalYear.Id,  // Set to new fiscal year since it's a fresh clone
        //                 Date = DateTime.UtcNow,
        //                 NepaliDate = category.NepaliDate,
        //                 CreatedAt = DateTime.UtcNow
        //             };
        //             _context.Categories.Add(newCategory);
        //             categoryMap[category.Id] = newCategory.Id;
        //         }
        //         await _context.SaveChangesAsync(cancellationToken);
        //         _logger.LogInformation("Cloned {Count} categories", sourceCategories.Count);

        //         await onProgress(new SplitFiscalYearProgressEventDto
        //         {
        //             Type = "progress",
        //             Value = 50,
        //             Message = "Cloning item companies..."
        //         });

        //         var itemCompanyMap = new Dictionary<Guid, Guid>();

        //         // Clone item companies - same pattern as items
        //         var sourceItemCompanies = await _context.ItemCompanies
        //             .Where(ic => ic.CompanyId == request.SourceCompanyId)
        //             .Where(ic => ic.OriginalFiscalYearId == splitFiscalYear.Id || ic.FiscalYearId == splitFiscalYear.Id)
        //             .ToListAsync(cancellationToken);

        //         // FALLBACK: If no item companies found, fetch ALL for company
        //         if (!sourceItemCompanies.Any())
        //         {
        //             _logger.LogWarning("No item companies found with OriginalFiscalYearId = {FiscalYearId}, fetching all item companies for company", splitFiscalYear.Id);
        //             sourceItemCompanies = await _context.ItemCompanies
        //                 .Where(ic => ic.CompanyId == request.SourceCompanyId)
        //                 .ToListAsync(cancellationToken);
        //         }

        //         sourceItemCompaniesCount = sourceItemCompanies.Count;
        //         _logger.LogInformation("Found {Count} item companies to clone", sourceItemCompanies.Count);

        //         foreach (var itemCompany in sourceItemCompanies)
        //         {
        //             // Check if item company already exists in new company (by name) to avoid duplicates
        //             var existingItemCompany = await _context.ItemCompanies
        //                 .FirstOrDefaultAsync(ic => ic.CompanyId == newCompany.Id && ic.Name == itemCompany.Name, cancellationToken);

        //             if (existingItemCompany != null)
        //             {
        //                 // Map to existing item company
        //                 itemCompanyMap[itemCompany.Id] = existingItemCompany.Id;
        //                 _logger.LogInformation("Item company {Name} already exists in new company, mapping to existing", itemCompany.Name);
        //                 continue;
        //             }

        //             var newItemCompany = new ItemCompany
        //             {
        //                 Id = Guid.NewGuid(),
        //                 Name = itemCompany.Name,
        //                 UniqueNumber = itemCompany.UniqueNumber,
        //                 CompanyId = newCompany.Id,
        //                 FiscalYearId = newFiscalYear.Id,
        //                 OriginalFiscalYearId = newFiscalYear.Id,
        //                 Date = DateTime.UtcNow,
        //                 NepaliDate = itemCompany.NepaliDate,  // Add this if your model has it
        //                 CreatedAt = DateTime.UtcNow
        //             };
        //             _context.ItemCompanies.Add(newItemCompany);
        //             itemCompanyMap[itemCompany.Id] = newItemCompany.Id;
        //         }

        //         await _context.SaveChangesAsync(cancellationToken);
        //         _logger.LogInformation("Cloned {Count} item companies", sourceItemCompanies.Count);

        //         await onProgress(new SplitFiscalYearProgressEventDto
        //         {
        //             Type = "progress",
        //             Value = 53,
        //             Message = "Cloning main units..."
        //         });

        //         var mainUnitMap = new Dictionary<Guid, Guid>();

        //         // Clone main units - same pattern as items/categories/item companies/units
        //         var sourceMainUnits = await _context.MainUnits
        //             .Where(mu => mu.CompanyId == request.SourceCompanyId)
        //             .Where(mu => mu.OriginalFiscalYearId == splitFiscalYear.Id || mu.FiscalYearId == splitFiscalYear.Id)
        //             .ToListAsync(cancellationToken);

        //         // FALLBACK: If no main units found, fetch ALL main units for company
        //         if (!sourceMainUnits.Any())
        //         {
        //             _logger.LogWarning("No main units found with OriginalFiscalYearId = {FiscalYearId}, fetching all main units for company", splitFiscalYear.Id);
        //             sourceMainUnits = await _context.MainUnits
        //                 .Where(mu => mu.CompanyId == request.SourceCompanyId)
        //                 .ToListAsync(cancellationToken);
        //         }

        //         sourceMainUnitsCount = sourceMainUnits.Count;
        //         _logger.LogInformation("Found {Count} main units to clone", sourceMainUnits.Count);

        //         foreach (var mainUnit in sourceMainUnits)
        //         {
        //             // Check if main unit already exists in new company (by name OR unique number) to avoid duplicates
        //             var existingMainUnit = await _context.MainUnits
        //                 .FirstOrDefaultAsync(mu => mu.CompanyId == newCompany.Id &&
        //                     (mu.Name == mainUnit.Name || mu.UniqueNumber == mainUnit.UniqueNumber),
        //                     cancellationToken);

        //             if (existingMainUnit != null)
        //             {
        //                 // Map to existing main unit
        //                 mainUnitMap[mainUnit.Id] = existingMainUnit.Id;
        //                 _logger.LogInformation("Main unit {Name} already exists in new company, mapping to existing", mainUnit.Name);
        //                 continue;
        //             }

        //             var newMainUnit = new MainUnit
        //             {
        //                 Id = Guid.NewGuid(),
        //                 Name = mainUnit.Name,
        //                 UniqueNumber = mainUnit.UniqueNumber,
        //                 CompanyId = newCompany.Id,
        //                 FiscalYearId = newFiscalYear.Id,
        //                 OriginalFiscalYearId = newFiscalYear.Id,
        //                 Date = DateTime.UtcNow,
        //                 NepaliDate = mainUnit.NepaliDate,  // Add this if your MainUnit model has it
        //                 CreatedAt = DateTime.UtcNow
        //             };
        //             _context.MainUnits.Add(newMainUnit);
        //             mainUnitMap[mainUnit.Id] = newMainUnit.Id;
        //         }

        //         await _context.SaveChangesAsync(cancellationToken);
        //         _logger.LogInformation("Cloned {Count} main units", sourceMainUnits.Count);

        //         await onProgress(new SplitFiscalYearProgressEventDto
        //         {
        //             Type = "progress",
        //             Value = 55,
        //             Message = "Cloning units..."
        //         });

        //         var unitMap = new Dictionary<Guid, Guid>();

        //         // Clone units - same pattern as items/categories/item companies
        //         var sourceUnits = await _context.Units
        //             .Where(u => u.CompanyId == request.SourceCompanyId)
        //             .Where(u => u.OriginalFiscalYearId == splitFiscalYear.Id || u.FiscalYearId == splitFiscalYear.Id)
        //             .ToListAsync(cancellationToken);

        //         // FALLBACK: If no units found, fetch ALL units for company
        //         if (!sourceUnits.Any())
        //         {
        //             _logger.LogWarning("No units found with OriginalFiscalYearId = {FiscalYearId}, fetching all units for company", splitFiscalYear.Id);
        //             sourceUnits = await _context.Units
        //                 .Where(u => u.CompanyId == request.SourceCompanyId)
        //                 .ToListAsync(cancellationToken);
        //         }

        //         sourceUnitsCount = sourceUnits.Count;
        //         _logger.LogInformation("Found {Count} units to clone", sourceUnits.Count);

        //         foreach (var unit in sourceUnits)
        //         {
        //             // Check if unit already exists in new company (by name) to avoid duplicates
        //             var existingUnit = await _context.Units
        //                 .FirstOrDefaultAsync(u => u.CompanyId == newCompany.Id && u.Name == unit.Name, cancellationToken);

        //             if (existingUnit != null)
        //             {
        //                 // Map to existing unit
        //                 unitMap[unit.Id] = existingUnit.Id;
        //                 _logger.LogInformation("Unit {Name} already exists in new company, mapping to existing", unit.Name);
        //                 continue;
        //             }

        //             var newUnit = new Unit
        //             {
        //                 Id = Guid.NewGuid(),
        //                 Name = unit.Name,
        //                 UniqueNumber = unit.UniqueNumber,
        //                 CompanyId = newCompany.Id,
        //                 FiscalYearId = newFiscalYear.Id,
        //                 OriginalFiscalYearId = newFiscalYear.Id,
        //                 Date = DateTime.UtcNow,
        //                 NepaliDate = unit.NepaliDate,  // Add this if your Unit model has it
        //                 CreatedAt = DateTime.UtcNow
        //             };
        //             _context.Units.Add(newUnit);
        //             unitMap[unit.Id] = newUnit.Id;
        //         }

        //         await _context.SaveChangesAsync(cancellationToken);
        //         _logger.LogInformation("Cloned {Count} units", sourceUnits.Count);

        //         // Step 10.5: Clone compositions
        //         await onProgress(new SplitFiscalYearProgressEventDto
        //         {
        //             Type = "progress",
        //             Value = 58,
        //             Message = "Cloning compositions..."
        //         });

        //         var compositionMap = new Dictionary<Guid, Guid>();

        //         // Clone compositions - same pattern as categories/units/etc.
        //         var sourceCompositions = await _context.Compositions
        //             .Where(c => c.CompanyId == request.SourceCompanyId)
        //             .Where(c => c.OriginalFiscalYearId == splitFiscalYear.Id || c.FiscalYearId == splitFiscalYear.Id)
        //             .ToListAsync(cancellationToken);

        //         // FALLBACK: If no compositions found, fetch ALL for company
        //         if (!sourceCompositions.Any())
        //         {
        //             _logger.LogWarning("No compositions found with OriginalFiscalYearId = {FiscalYearId}, fetching all compositions for company", splitFiscalYear.Id);
        //             sourceCompositions = await _context.Compositions
        //                 .Where(c => c.CompanyId == request.SourceCompanyId)
        //                 .ToListAsync(cancellationToken);
        //         }

        //         int sourceCompositionsCount = sourceCompositions.Count;
        //         _logger.LogInformation("Found {Count} compositions to clone", sourceCompositions.Count);

        //         foreach (var composition in sourceCompositions)
        //         {
        //             // Check if composition already exists in new company (by name OR unique number)
        //             var existingComposition = await _context.Compositions
        //                 .FirstOrDefaultAsync(c => c.CompanyId == newCompany.Id &&
        //                     (c.Name == composition.Name || c.UniqueNumber == composition.UniqueNumber),
        //                     cancellationToken);

        //             if (existingComposition != null)
        //             {
        //                 compositionMap[composition.Id] = existingComposition.Id;
        //                 _logger.LogInformation("Composition {Name} already exists in new company, mapping to existing", composition.Name);
        //                 continue;
        //             }

        //             var newComposition = new Composition
        //             {
        //                 Id = Guid.NewGuid(),
        //                 Name = composition.Name,
        //                 UniqueNumber = composition.UniqueNumber,
        //                 CompanyId = newCompany.Id,
        //                 FiscalYearId = newFiscalYear.Id,
        //                 OriginalFiscalYearId = newFiscalYear.Id,
        //                 Date = DateTime.UtcNow,
        //                 NepaliDate = composition.NepaliDate,
        //                 CreatedAt = DateTime.UtcNow,
        //                 UpdatedAt = DateTime.UtcNow
        //             };
        //             _context.Compositions.Add(newComposition);
        //             compositionMap[composition.Id] = newComposition.Id;
        //         }

        //         await _context.SaveChangesAsync(cancellationToken);
        //         _logger.LogInformation("Cloned {Count} compositions", sourceCompositions.Count);

        //         // Step 11: Clone items with stock entries
        //         await onProgress(new SplitFiscalYearProgressEventDto
        //         {
        //             Type = "progress",
        //             Value = 60,
        //             Message = "Cloning items with stock entries..."
        //         });

        //         var sourceItems = await _context.Items
        //             .Where(i => i.CompanyId == request.SourceCompanyId)
        //             .Where(i => i.OriginalFiscalYearId == splitFiscalYear.Id || i.CreatedAt >= splitFiscalYear.StartDate)
        //             .Include(i => i.StockEntries)
        //             .Include(i => i.ItemCompositions)
        //             .ToListAsync(cancellationToken);

        //         if (!sourceItems.Any())
        //         {
        //             _logger.LogWarning("No items found with OriginalFiscalYearId = {FiscalYearId}, fetching all items for company", splitFiscalYear.Id);
        //             sourceItems = await _context.Items
        //                 .Where(i => i.CompanyId == request.SourceCompanyId)
        //                 .Include(i => i.StockEntries)
        //                 .Include(i => i.ItemCompositions)
        //                 .ToListAsync(cancellationToken);
        //         }

        //         _logger.LogInformation("Found {Count} items to clone", sourceItems.Count);

        //         foreach (var item in sourceItems)
        //         {
        //             try
        //             {
        //                 var newCategoryId = categoryMap.TryGetValue(item.CategoryId, out var catId) ? catId : item.CategoryId;
        //                 var newItemCompanyId = itemCompanyMap.TryGetValue(item.ItemsCompanyId, out var icId) ? icId : item.ItemsCompanyId;
        //                 var newUnitId = unitMap.TryGetValue(item.UnitId, out var uId) ? uId : item.UnitId;
        //                 var newMainUnitId = mainUnitMap.TryGetValue(item.MainUnitId ?? Guid.Empty, out var muId) ? muId : item.MainUnitId;

        //                 var newItem = new Item
        //                 {
        //                     Id = Guid.NewGuid(),
        //                     Name = item.Name,
        //                     Hscode = item.Hscode,
        //                     CategoryId = newCategoryId,
        //                     ItemsCompanyId = newItemCompanyId,
        //                     Price = item.Price,
        //                     PuPrice = item.PuPrice,
        //                     MainUnitPuPrice = item.MainUnitPuPrice,
        //                     MainUnitId = newMainUnitId,
        //                     WsUnit = item.WsUnit,
        //                     UnitId = newUnitId,
        //                     VatStatus = item.VatStatus,
        //                     OpeningStock = item.OpeningStock,
        //                     MinStock = item.MinStock,
        //                     MaxStock = item.MaxStock,
        //                     ReorderLevel = item.ReorderLevel,
        //                     UniqueNumber = item.UniqueNumber,
        //                     BarcodeNumber = item.BarcodeNumber,
        //                     CompanyId = newCompany.Id,
        //                     OriginalFiscalYearId = newFiscalYear.Id,
        //                     Status = item.Status,
        //                     CreatedAt = DateTime.UtcNow,
        //                     Date = DateTime.UtcNow,
        //                     UpdatedAt = DateTime.UtcNow
        //                 };

        //                 _context.Items.Add(newItem);
        //                 itemsCopied++;

        //                 // Clone ItemCompositions (junction between items and compositions)
        //                 if (item.ItemCompositions != null && item.ItemCompositions.Any())
        //                 {
        //                     foreach (var itemComposition in item.ItemCompositions)
        //                     {
        //                         if (!compositionMap.TryGetValue(itemComposition.CompositionId, out var newCompositionId))
        //                         {
        //                             _logger.LogWarning(
        //                                 "Composition {CompositionId} for item {ItemName} not found in compositionMap, skipping link",
        //                                 itemComposition.CompositionId, item.Name);
        //                             continue;
        //                         }

        //                         var newItemComposition = new ItemComposition
        //                         {
        //                             ItemId = newItem.Id,                  // new item
        //                             CompositionId = newCompositionId,     // mapped new composition
        //                             CreatedAt = DateTime.UtcNow
        //                         };
        //                         _context.ItemCompositions.Add(newItemComposition);
        //                         itemCompositionsCopied++;
        //                     }
        //                 }

        //                 if (item.StockEntries != null && item.StockEntries.Any())
        //                 {
        //                     foreach (var stockEntry in item.StockEntries)
        //                     {
        //                         var newStockEntry = new StockEntry
        //                         {
        //                             Id = Guid.NewGuid(),
        //                             ItemId = newItem.Id,
        //                             Date = DateTime.UtcNow,
        //                             WsUnit = stockEntry.WsUnit,
        //                             Quantity = stockEntry.Quantity,
        //                             BillQty = stockEntry.BillQty,
        //                             ActualQty = stockEntry.ActualQty,
        //                             Bonus = stockEntry.Bonus,
        //                             BatchNumber = stockEntry.BatchNumber ?? "XXX",
        //                             ExpiryDate = stockEntry.ExpiryDate,
        //                             Price = stockEntry.Price,
        //                             NetPrice = stockEntry.NetPrice,
        //                             PuPrice = stockEntry.PuPrice,
        //                             CcPercentage = stockEntry.CcPercentage,
        //                             ItemCcAmount = stockEntry.ItemCcAmount,
        //                             DiscountPercentagePerItem = stockEntry.DiscountPercentagePerItem,
        //                             DiscountAmountPerItem = stockEntry.DiscountAmountPerItem,
        //                             NetPuPrice = stockEntry.NetPuPrice,
        //                             MainUnitPuPrice = stockEntry.MainUnitPuPrice,
        //                             Mrp = stockEntry.Mrp,
        //                             MarginPercentage = stockEntry.MarginPercentage,
        //                             Currency = stockEntry.Currency,
        //                             CompanyId = newCompany.Id,
        //                             FiscalYearId = newFiscalYear.Id,
        //                             UniqueUuid = stockEntry.UniqueUuid,
        //                             PurchaseBillId = null,
        //                             SalesReturnBillId = null,
        //                             ExpiryStatus = stockEntry.ExpiryStatus,
        //                             DaysUntilExpiry = stockEntry.DaysUntilExpiry,
        //                             StoreId = stockEntry.StoreId,
        //                             RackId = stockEntry.RackId,
        //                             SourceTransferFromStoreId = null,
        //                             SourceTransferOriginalEntryId = null,
        //                             SourceTransferDate = null,
        //                             NepaliDate = stockEntry.NepaliDate,
        //                             CreatedAt = DateTime.UtcNow,
        //                             UpdatedAt = DateTime.UtcNow
        //                         };
        //                         _context.StockEntries.Add(newStockEntry);
        //                         stockEntriesCopied++;
        //                     }
        //                 }
        //             }
        //             catch (Exception ex)
        //             {
        //                 _logger.LogError(ex, $"Error cloning item {item.Name} (ID: {item.Id})");
        //             }
        //         }

        //         await _context.SaveChangesAsync(cancellationToken);
        //         _logger.LogInformation("Cloned {Count} items with {StockCount} stock entries and {CompCount} composition links", itemsCopied, stockEntriesCopied, itemCompositionsCopied);

        //         // ============================================================
        //         // DELETE FISCAL YEAR FROM SOURCE COMPANY IF REQUESTED
        //         // ============================================================
        //         if (request.DeleteAfterSplit)
        //         {
        //             await onProgress(new SplitFiscalYearProgressEventDto
        //             {
        //                 Type = "progress",
        //                 Value = 85,
        //                 Message = "Removing split fiscal year from source company..."
        //             });

        //             _logger.LogInformation("Starting deletion of fiscal year {FiscalYearId} from source company", splitFiscalYear.Id);

        //             try
        //             {
        //                 // 1. Check if this is the only fiscal year for the company
        //                 var fiscalYearCount = await _context.FiscalYears
        //                     .CountAsync(f => f.CompanyId == request.SourceCompanyId, cancellationToken);

        //                 if (fiscalYearCount <= 1)
        //                 {
        //                     await onProgress(new SplitFiscalYearProgressEventDto
        //                     {
        //                         Type = "error",
        //                         Error = "Cannot delete the last remaining fiscal year in the source company.",
        //                         Message = "The company must have at least one fiscal year."
        //                     });
        //                     await transaction.RollbackAsync(cancellationToken);
        //                     return;
        //                 }

        //                 // 2. FIRST: Get all transaction IDs that reference this fiscal year
        //                 var transactionIds = await _context.Transactions
        //                     .Where(t => t.FiscalYearId == splitFiscalYear.Id)
        //                     .Select(t => t.Id)
        //                     .ToListAsync(cancellationToken);

        //                 // 3. Delete TransactionItems that reference these transactions
        //                 if (transactionIds.Any())
        //                 {
        //                     var transactionItemsToDelete = await _context.TransactionItems
        //                         .Where(ti => transactionIds.Contains(ti.TransactionId))
        //                         .ToListAsync(cancellationToken);

        //                     if (transactionItemsToDelete.Any())
        //                     {
        //                         _logger.LogInformation("Deleting {Count} TransactionItems", transactionItemsToDelete.Count);
        //                         _context.TransactionItems.RemoveRange(transactionItemsToDelete);
        //                         await _context.SaveChangesAsync(cancellationToken);
        //                     }

        //                     // 4. Delete Transactions that reference this fiscal year
        //                     var transactionsToDelete = await _context.Transactions
        //                         .Where(t => t.FiscalYearId == splitFiscalYear.Id)
        //                         .ToListAsync(cancellationToken);

        //                     if (transactionsToDelete.Any())
        //                     {
        //                         _logger.LogInformation("Deleting {Count} Transactions", transactionsToDelete.Count);
        //                         _context.Transactions.RemoveRange(transactionsToDelete);
        //                         await _context.SaveChangesAsync(cancellationToken);
        //                     }
        //                 }

        //                 // 5. Delete all other related records...
        //                 // (Continue with the rest of your deletion code)

        //                 // 6. Delete OpeningBalanceByFiscalYear records
        //                 var openingBalancesToDelete = await _context.OpeningBalanceByFiscalYear
        //                     .Where(ob => ob.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (openingBalancesToDelete.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} OpeningBalanceByFiscalYear records", openingBalancesToDelete.Count);
        //                     _context.OpeningBalanceByFiscalYear.RemoveRange(openingBalancesToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 7. Delete ClosingBalanceByFiscalYear records
        //                 var closingBalancesToDelete = await _context.ClosingBalanceByFiscalYear
        //                     .Where(cb => cb.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (closingBalancesToDelete.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} ClosingBalanceByFiscalYear records", closingBalancesToDelete.Count);
        //                     _context.ClosingBalanceByFiscalYear.RemoveRange(closingBalancesToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 8. Delete OpeningBalances
        //                 var openingBalances = await _context.OpeningBalances
        //                     .Where(ob => ob.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (openingBalances.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} OpeningBalances", openingBalances.Count);
        //                     _context.OpeningBalances.RemoveRange(openingBalances);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 9. Delete ItemOpeningStockByFiscalYear records
        //                 var itemOpeningStocksToDelete = await _context.ItemOpeningStockByFiscalYear
        //                     .Where(ios => ios.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (itemOpeningStocksToDelete.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} ItemOpeningStockByFiscalYear records", itemOpeningStocksToDelete.Count);
        //                     _context.ItemOpeningStockByFiscalYear.RemoveRange(itemOpeningStocksToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 10. Delete ItemClosingStockByFiscalYear records
        //                 var itemClosingStocksToDelete = await _context.ItemClosingStockByFiscalYear
        //                     .Where(ics => ics.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (itemClosingStocksToDelete.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} ItemClosingStockByFiscalYear records", itemClosingStocksToDelete.Count);
        //                     _context.ItemClosingStockByFiscalYear.RemoveRange(itemClosingStocksToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 11. Delete SalesBillItems first (they reference SalesBills)
        //                 var salesBillItemsToDelete = await _context.SalesBillItems
        //                     .Where(sbi => sbi.SalesBill != null && sbi.SalesBill.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (salesBillItemsToDelete.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} SalesBillItems", salesBillItemsToDelete.Count);
        //                     _context.SalesBillItems.RemoveRange(salesBillItemsToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 12. Delete SalesBills
        //                 var salesBillsToDelete = await _context.SalesBills
        //                     .Where(sb => sb.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (salesBillsToDelete.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} SalesBills", salesBillsToDelete.Count);
        //                     _context.SalesBills.RemoveRange(salesBillsToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 13. Delete PurchaseBillItems first
        //                 var purchaseBillItemsToDelete = await _context.PurchaseBillItems
        //                     .Where(pbi => pbi.PurchaseBill != null && pbi.PurchaseBill.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (purchaseBillItemsToDelete.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} PurchaseBillItems", purchaseBillItemsToDelete.Count);
        //                     _context.PurchaseBillItems.RemoveRange(purchaseBillItemsToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 14. Delete PurchaseBills
        //                 var purchaseBillsToDelete = await _context.PurchaseBills
        //                     .Where(pb => pb.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (purchaseBillsToDelete.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} PurchaseBills", purchaseBillsToDelete.Count);
        //                     _context.PurchaseBills.RemoveRange(purchaseBillsToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 15. Delete SalesReturnItems first
        //                 var salesReturnItemsToDelete = await _context.SalesReturnItems
        //                     .Where(sri => sri.SalesReturn != null && sri.SalesReturn.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (salesReturnItemsToDelete.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} SalesReturnItems", salesReturnItemsToDelete.Count);
        //                     _context.SalesReturnItems.RemoveRange(salesReturnItemsToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 16. Delete SalesReturns
        //                 var salesReturnsToDelete = await _context.SalesReturns
        //                     .Where(sr => sr.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (salesReturnsToDelete.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} SalesReturns", salesReturnsToDelete.Count);
        //                     _context.SalesReturns.RemoveRange(salesReturnsToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 17. Delete PurchaseReturnItems first
        //                 var purchaseReturnItemsToDelete = await _context.PurchaseReturnItems
        //                     .Where(pri => pri.PurchaseReturn != null && pri.PurchaseReturn.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (purchaseReturnItemsToDelete.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} PurchaseReturnItems", purchaseReturnItemsToDelete.Count);
        //                     _context.PurchaseReturnItems.RemoveRange(purchaseReturnItemsToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 18. Delete PurchaseReturns
        //                 var purchaseReturnsToDelete = await _context.PurchaseReturns
        //                     .Where(pr => pr.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (purchaseReturnsToDelete.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} PurchaseReturns", purchaseReturnsToDelete.Count);
        //                     _context.PurchaseReturns.RemoveRange(purchaseReturnsToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 19. Delete PaymentEntries first
        //                 var paymentEntriesToDelete = await _context.PaymentEntries
        //                     .Where(pe => pe.Payment != null && pe.Payment.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (paymentEntriesToDelete.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} PaymentEntries", paymentEntriesToDelete.Count);
        //                     _context.PaymentEntries.RemoveRange(paymentEntriesToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 20. Delete Payments
        //                 var paymentsToDelete = await _context.Payments
        //                     .Where(p => p.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (paymentsToDelete.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} Payments", paymentsToDelete.Count);
        //                     _context.Payments.RemoveRange(paymentsToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 21. Delete ReceiptEntries first
        //                 var receiptEntriesToDelete = await _context.ReceiptEntries
        //                     .Where(re => re.Receipt != null && re.Receipt.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (receiptEntriesToDelete.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} ReceiptEntries", receiptEntriesToDelete.Count);
        //                     _context.ReceiptEntries.RemoveRange(receiptEntriesToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 22. Delete Receipts
        //                 var receiptsToDelete = await _context.Receipts
        //                     .Where(r => r.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (receiptsToDelete.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} Receipts", receiptsToDelete.Count);
        //                     _context.Receipts.RemoveRange(receiptsToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 23. Delete JournalEntries first
        //                 var journalEntriesToDelete = await _context.JournalEntries
        //                     .Where(je => je.JournalVoucher != null && je.JournalVoucher.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (journalEntriesToDelete.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} JournalEntries", journalEntriesToDelete.Count);
        //                     _context.JournalEntries.RemoveRange(journalEntriesToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 24. Delete JournalVouchers
        //                 var journalVouchersToDelete = await _context.JournalVouchers
        //                     .Where(jv => jv.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (journalVouchersToDelete.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} JournalVouchers", journalVouchersToDelete.Count);
        //                     _context.JournalVouchers.RemoveRange(journalVouchersToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 25. Delete DebitNoteEntries first
        //                 var debitNoteEntriesToDelete = await _context.DebitNoteEntries
        //                     .Where(dne => dne.DebitNote != null && dne.DebitNote.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (debitNoteEntriesToDelete.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} DebitNoteEntries", debitNoteEntriesToDelete.Count);
        //                     _context.DebitNoteEntries.RemoveRange(debitNoteEntriesToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 26. Delete DebitNotes
        //                 var debitNotesToDelete = await _context.DebitNotes
        //                     .Where(dn => dn.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (debitNotesToDelete.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} DebitNotes", debitNotesToDelete.Count);
        //                     _context.DebitNotes.RemoveRange(debitNotesToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 27. Delete CreditNoteEntries first
        //                 var creditNoteEntriesToDelete = await _context.CreditNoteEntries
        //                     .Where(cne => cne.CreditNote != null && cne.CreditNote.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (creditNoteEntriesToDelete.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} CreditNoteEntries", creditNoteEntriesToDelete.Count);
        //                     _context.CreditNoteEntries.RemoveRange(creditNoteEntriesToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 28. Delete CreditNotes
        //                 var creditNotesToDelete = await _context.CreditNotes
        //                     .Where(cn => cn.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (creditNotesToDelete.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} CreditNotes", creditNotesToDelete.Count);
        //                     _context.CreditNotes.RemoveRange(creditNotesToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 29. Delete StockAdjustmentItems first
        //                 var stockAdjustmentItemsToDelete = await _context.StockAdjustmentItems
        //                     .Where(sai => sai.StockAdjustment != null && sai.StockAdjustment.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (stockAdjustmentItemsToDelete.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} StockAdjustmentItems", stockAdjustmentItemsToDelete.Count);
        //                     _context.StockAdjustmentItems.RemoveRange(stockAdjustmentItemsToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 30. Delete StockAdjustments
        //                 var stockAdjustmentsToDelete = await _context.StockAdjustments
        //                     .Where(sa => sa.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (stockAdjustmentsToDelete.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} StockAdjustments", stockAdjustmentsToDelete.Count);
        //                     _context.StockAdjustments.RemoveRange(stockAdjustmentsToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 31. Delete SalesQuotationItems first
        //                 var salesQuotationItemsToDelete = await _context.SalesQuotationItems
        //                     .Where(sqi => sqi.SalesQuotation != null && sqi.SalesQuotation.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (salesQuotationItemsToDelete.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} SalesQuotationItems", salesQuotationItemsToDelete.Count);
        //                     _context.SalesQuotationItems.RemoveRange(salesQuotationItemsToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 32. Delete SalesQuotations
        //                 var salesQuotationsToDelete = await _context.SalesQuotations
        //                     .Where(sq => sq.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (salesQuotationsToDelete.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} SalesQuotations", salesQuotationsToDelete.Count);
        //                     _context.SalesQuotations.RemoveRange(salesQuotationsToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 33. Delete StockEntries
        //                 var stockEntriesToDelete = await _context.StockEntries
        //                     .Where(se => se.CompanyId == request.SourceCompanyId && se.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (stockEntriesToDelete.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} stock entries", stockEntriesToDelete.Count);
        //                     _context.StockEntries.RemoveRange(stockEntriesToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 34. Delete BillCounters
        //                 var billCountersToDelete = await _context.BillCounters
        //                     .Where(bc => bc.CompanyId == request.SourceCompanyId && bc.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (billCountersToDelete.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} bill counters", billCountersToDelete.Count);
        //                     _context.BillCounters.RemoveRange(billCountersToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 35. Delete CompanySettings
        //                 var settingsToDelete = await _context.CompanySettings
        //                     .Where(s => s.CompanyId == request.SourceCompanyId && s.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (settingsToDelete.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} settings", settingsToDelete.Count);
        //                     _context.CompanySettings.RemoveRange(settingsToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 36. Update items - remove OriginalFiscalYearId reference
        //                 var itemsToUpdate = await _context.Items
        //                     .Where(i => i.CompanyId == request.SourceCompanyId && i.OriginalFiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (itemsToUpdate.Any())
        //                 {
        //                     _logger.LogInformation("Updating {Count} items - removing fiscal year reference", itemsToUpdate.Count);
        //                     foreach (var item in itemsToUpdate)
        //                     {
        //                         item.OriginalFiscalYearId = null;
        //                     }
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 37. Update accounts - remove OriginalFiscalYearId reference
        //                 var accountsToUpdate = await _context.Accounts
        //                     .Where(a => a.CompanyId == request.SourceCompanyId && a.OriginalFiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (accountsToUpdate.Any())
        //                 {
        //                     _logger.LogInformation("Updating {Count} accounts - removing fiscal year reference", accountsToUpdate.Count);
        //                     foreach (var account in accountsToUpdate)
        //                     {
        //                         account.OriginalFiscalYearId = null;
        //                     }
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 38. Update Users
        //                 var usersToUpdate = await _context.Users
        //                     .Where(u => u.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (usersToUpdate.Any())
        //                 {
        //                     _logger.LogInformation("Updating {Count} users - changing fiscal year", usersToUpdate.Count);
        //                     var otherFiscalYear = await _context.FiscalYears
        //                         .FirstOrDefaultAsync(f => f.CompanyId == request.SourceCompanyId && f.Id != splitFiscalYear.Id, cancellationToken);

        //                     foreach (var user in usersToUpdate)
        //                     {
        //                         user.FiscalYearId = otherFiscalYear?.Id;
        //                         user.UpdatedAt = DateTime.UtcNow;
        //                     }
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 39. Delete categories
        //                 var categoriesToDelete = await _context.Categories
        //                     .Where(c => c.CompanyId == request.SourceCompanyId && c.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (categoriesToDelete.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} categories", categoriesToDelete.Count);
        //                     _context.Categories.RemoveRange(categoriesToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 40. Delete item companies
        //                 var itemCompaniesToDelete = await _context.ItemCompanies
        //                     .Where(ic => ic.CompanyId == request.SourceCompanyId && ic.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (itemCompaniesToDelete.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} item companies", itemCompaniesToDelete.Count);
        //                     _context.ItemCompanies.RemoveRange(itemCompaniesToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 41. Delete main units
        //                 var mainUnitsToDelete = await _context.MainUnits
        //                     .Where(mu => mu.CompanyId == request.SourceCompanyId && mu.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (mainUnitsToDelete.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} main units", mainUnitsToDelete.Count);
        //                     _context.MainUnits.RemoveRange(mainUnitsToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 42. Delete units
        //                 var unitsToDelete = await _context.Units
        //                     .Where(u => u.CompanyId == request.SourceCompanyId && u.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (unitsToDelete.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} units", unitsToDelete.Count);
        //                     _context.Units.RemoveRange(unitsToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 43. Delete the fiscal year itself
        //                 _context.FiscalYears.Remove(splitFiscalYear);
        //                 await _context.SaveChangesAsync(cancellationToken);

        //                 _logger.LogInformation("Successfully deleted fiscal year {FiscalYearId} from source company", splitFiscalYear.Id);

        //                 await onProgress(new SplitFiscalYearProgressEventDto
        //                 {
        //                     Type = "progress",
        //                     Value = 95,
        //                     Message = "Split fiscal year removed from source company"
        //                 });
        //             }
        //             catch (Exception ex)
        //             {
        //                 _logger.LogError(ex, "Error during deletion of fiscal year");
        //                 await onProgress(new SplitFiscalYearProgressEventDto
        //                 {
        //                     Type = "error",
        //                     Error = $"Failed to delete fiscal year: {ex.Message}",
        //                     Details = ex.StackTrace
        //                 });
        //                 throw;
        //             }
        //         }

        //         // Step 12: Initialize bill counters for new company
        //         await onProgress(new SplitFiscalYearProgressEventDto
        //         {
        //             Type = "progress",
        //             Value = 80,
        //             Message = "Initializing counters..."
        //         });

        //         var transactionTypes = new[]
        //         {
        //     "Sales", "Purchase", "SalesReturn", "PurchaseReturn",
        //     "Payment", "Receipt", "Journal", "DebitNote", "CreditNote", "StockAdjustment"
        // };

        //         foreach (var transactionType in transactionTypes)
        //         {
        //             _context.BillCounters.Add(new BillCounter
        //             {
        //                 Id = Guid.NewGuid(),
        //                 CompanyId = newCompany.Id,
        //                 FiscalYearId = newFiscalYear.Id,
        //                 TransactionType = transactionType,
        //                 CurrentBillNumber = 0,
        //                 CreatedAt = DateTime.UtcNow
        //             });
        //         }
        //         await _context.SaveChangesAsync(cancellationToken);

        //         // Commit transaction
        //         await transaction.CommitAsync(cancellationToken);
        //         _logger.LogInformation("Transaction committed successfully");

        //         // Prepare result
        //         var result = new SplitFiscalYearResultDto
        //         {
        //             Success = true,
        //             Message = request.DeleteAfterSplit
        //                 ? $"Company split successfully. New company \"{request.NewCompanyName}\" created and fiscal year removed from source company."
        //                 : $"Company split successfully. New company \"{request.NewCompanyName}\" created with cloned data.",
        //             Data = new SplitFiscalYearDataDto
        //             {
        //                 NewCompany = new NewCompanyInfoDto
        //                 {
        //                     Id = newCompany.Id,
        //                     Name = newCompany.Name
        //                 },
        //                 NewFiscalYear = new NewFiscalYearInfoDto
        //                 {
        //                     Id = newFiscalYear.Id,
        //                     Name = splitFiscalYear.Name
        //                 },
        //                 Statistics = new SplitStatisticsDto
        //                 {
        //                     UsersCopied = 1,
        //                     CompanyGroupsCopied = sourceAccountGroupsCount,
        //                     CategoriesCopied = sourceCategoriesCount,
        //                     ItemsCompaniesCopied = sourceItemCompaniesCount,
        //                     MainUnitsCopied = sourceMainUnitsCount,
        //                     UnitsCopied = sourceUnitsCount,
        //                     CompositionsCopied = 0,
        //                     ItemsCopied = itemsCopied,
        //                     AccountsCopied = sourceAccountsCount,
        //                     TransactionsFoundForCopy = 0,
        //                     StockEntriesCopied = stockEntriesCopied,
        //                     OpeningBalancesCopied = openingBalancesCopied
        //                 }
        //             }
        //         };

        //         await onProgress(new SplitFiscalYearProgressEventDto
        //         {
        //             Type = "complete",
        //             Message = "Company split completed successfully",
        //             Data = result
        //         });

        //         _logger.LogInformation("Split completed successfully");
        //     }
        //     catch (Exception ex)
        //     {
        //         _logger.LogError(ex, "Error splitting company - rolling back transaction");
        //         await transaction.RollbackAsync(cancellationToken);

        //         await onProgress(new SplitFiscalYearProgressEventDto
        //         {
        //             Type = "error",
        //             Error = ex.Message,
        //             Details = ex.StackTrace
        //         });
        //         throw;
        //     }
        // }

        //------------------------------------------------------------end1

        // public async Task SplitFiscalYearAsync(
        //     SplitFiscalYearRequestDto request,
        //     Guid userId,
        //     Func<SplitFiscalYearProgressEventDto, Task> onProgress,
        //     CancellationToken cancellationToken = default)
        // {
        //     await onProgress(new SplitFiscalYearProgressEventDto
        //     {
        //         Type = "progress",
        //         Value = 5,
        //         Message = "Starting company split process..."
        //     });

        //     await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);

        //     // Counters
        //     int itemsCopied = 0;
        //     int stockEntriesCopied = 0;
        //     int itemCompositionsCopied = 0;
        //     int sourceAccountGroupsCount = 0;
        //     int sourceCategoriesCount = 0;
        //     int sourceItemCompaniesCount = 0;
        //     int sourceMainUnitsCount = 0;
        //     int sourceUnitsCount = 0;
        //     int sourceAccountsCount = 0;
        //     int openingBalancesCopied = 0;
        //     int initialOpeningBalancesCopied = 0;
        //     int sourceCompositionsCount = 0;

        //     try
        //     {
        //         _logger.LogInformation("=== Starting SplitFiscalYearAsync ===");
        //         _logger.LogInformation("SourceCompanyId: {SourceCompanyId}", request.SourceCompanyId);
        //         _logger.LogInformation("FiscalYearId (data source): {FiscalYearId}", request.FiscalYearId);
        //         _logger.LogInformation("TargetFiscalYearId (to move): {TargetFiscalYearId}", request.TargetFiscalYearId);
        //         _logger.LogInformation("NewCompanyName: {NewCompanyName}", request.NewCompanyName);
        //         _logger.LogInformation("DeleteAfterSplit: {DeleteAfterSplit}", request.DeleteAfterSplit);

        //         // ============================================================
        //         // VALIDATION
        //         // ============================================================

        //         // If TargetFiscalYearId is empty, fall back to FiscalYearId (common case)
        //         if (request.TargetFiscalYearId == Guid.Empty)
        //         {
        //             request.TargetFiscalYearId = request.FiscalYearId;
        //             _logger.LogInformation("TargetFiscalYearId was empty, defaulting to FiscalYearId: {FyId}", request.FiscalYearId);
        //         }

        //         // Get source company
        //         var sourceCompany = await _context.Companies
        //             .FirstOrDefaultAsync(c => c.Id == request.SourceCompanyId, cancellationToken);

        //         if (sourceCompany == null)
        //         {
        //             await onProgress(new SplitFiscalYearProgressEventDto
        //             {
        //                 Type = "error",
        //                 Error = "Source company not found"
        //             });
        //             return;
        //         }

        //         // Get fiscal year whose DATA will be cloned
        //         var splitFiscalYear = await _context.FiscalYears
        //             .FirstOrDefaultAsync(f => f.Id == request.FiscalYearId && f.CompanyId == request.SourceCompanyId, cancellationToken);

        //         if (splitFiscalYear == null)
        //         {
        //             await onProgress(new SplitFiscalYearProgressEventDto
        //             {
        //                 Type = "error",
        //                 Error = "Fiscal year to split not found in source company"
        //             });
        //             return;
        //         }

        //         // Get fiscal year that will be MOVED to the new company
        //         var targetFiscalYear = await _context.FiscalYears
        //             .FirstOrDefaultAsync(f => f.Id == request.TargetFiscalYearId && f.CompanyId == request.SourceCompanyId, cancellationToken);

        //         if (targetFiscalYear == null)
        //         {
        //             await onProgress(new SplitFiscalYearProgressEventDto
        //             {
        //                 Type = "error",
        //                 Error = "Target fiscal year (to move to new company) not found in source company"
        //             });
        //             return;
        //         }

        //         // Prevent moving the only fiscal year of the source company
        //         var sourceFiscalYearCount = await _context.FiscalYears
        //             .CountAsync(f => f.CompanyId == request.SourceCompanyId, cancellationToken);

        //         if (sourceFiscalYearCount <= 1)
        //         {
        //             await onProgress(new SplitFiscalYearProgressEventDto
        //             {
        //                 Type = "error",
        //                 Error = "Cannot move the only fiscal year in the source company to the new company. " +
        //                         "The source company must keep at least one fiscal year."
        //             });
        //             return;
        //         }

        //         // Check if new company name already exists for this user
        //         var existingCompany = await _context.Companies
        //             .AnyAsync(c => c.Name == request.NewCompanyName && c.OwnerId == userId, cancellationToken);

        //         if (existingCompany)
        //         {
        //             await onProgress(new SplitFiscalYearProgressEventDto
        //             {
        //                 Type = "error",
        //                 Error = "Company with this name already exists"
        //             });
        //             return;
        //         }

        //         // ============================================================
        //         // STEP 1: Create new company
        //         // ============================================================
        //         await onProgress(new SplitFiscalYearProgressEventDto
        //         {
        //             Type = "progress",
        //             Value = 10,
        //             Message = "Creating new company..."
        //         });

        //         var newCompany = new Company
        //         {
        //             Id = Guid.NewGuid(),
        //             Name = request.NewCompanyName,
        //             OwnerId = userId,
        //             TradeType = sourceCompany.TradeType,
        //             Address = sourceCompany.Address ?? string.Empty,
        //             Country = sourceCompany.Country ?? string.Empty,
        //             State = sourceCompany.State ?? string.Empty,
        //             City = sourceCompany.City ?? string.Empty,
        //             Ward = sourceCompany.Ward,
        //             Phone = sourceCompany.Phone ?? string.Empty,
        //             Pan = sourceCompany.Pan ?? string.Empty,
        //             Email = sourceCompany.Email ?? string.Empty,
        //             VatEnabled = sourceCompany.VatEnabled,
        //             DateFormat = sourceCompany.DateFormat,
        //             FiscalYearStartDateEnglish = targetFiscalYear.StartDate,
        //             FiscalYearStartDateNepali = targetFiscalYear.StartDateNepali ?? string.Empty,
        //             CreatedAt = DateTime.UtcNow,
        //             UpdatedAt = DateTime.UtcNow
        //         };

        //         _context.Companies.Add(newCompany);
        //         await _context.SaveChangesAsync(cancellationToken);
        //         _logger.LogInformation("New company created with ID: {CompanyId}", newCompany.Id);

        //         // ============================================================
        //         // STEP 2: MOVE the pre-existing target fiscal year to the new company.
        //         //         DO NOT create a new fiscal year.
        //         //         BillPrefixes and all other fields are preserved as-is.
        //         // ============================================================
        //         await onProgress(new SplitFiscalYearProgressEventDto
        //         {
        //             Type = "progress",
        //             Value = 15,
        //             Message = "Moving fiscal year to new company..."
        //         });

        //         // Defensive: ensure BillPrefixes object is not null
        //         targetFiscalYear.BillPrefixes ??= new BillPrefixes();

        //         _logger.LogInformation(
        //             "Moving fiscal year {FiscalYearId} ({Name}) from company {SourceCompanyId} to {NewCompanyId}. " +
        //             "BillPrefixes preserved — Sales: {Sales}, Purchase: {Purchase}, Payment: {Payment}",
        //             targetFiscalYear.Id, targetFiscalYear.Name,
        //             request.SourceCompanyId, newCompany.Id,
        //             targetFiscalYear.BillPrefixes.Sales,
        //             targetFiscalYear.BillPrefixes.Purchase,
        //             targetFiscalYear.BillPrefixes.Payment);

        //         targetFiscalYear.CompanyId = newCompany.Id;
        //         targetFiscalYear.IsActive = true;

        //         _context.FiscalYears.Update(targetFiscalYear);
        //         await _context.SaveChangesAsync(cancellationToken);

        //         var newFiscalYear = targetFiscalYear;   // alias for the rest of the method

        //         _logger.LogInformation(
        //             "Fiscal year {FiscalYearId} moved to new company {CompanyId}",
        //             newFiscalYear.Id, newCompany.Id);

        //         // ============================================================
        //         // STEP 3: Clone settings
        //         // ============================================================
        //         await onProgress(new SplitFiscalYearProgressEventDto
        //         {
        //             Type = "progress",
        //             Value = 20,
        //             Message = "Cloning settings..."
        //         });

        //         try
        //         {
        //             var sourceSettings = await _context.CompanySettings
        //                 .FirstOrDefaultAsync(s => s.CompanyId == request.SourceCompanyId
        //                                        && s.FiscalYearId == splitFiscalYear.Id, cancellationToken);

        //             if (sourceSettings != null)
        //             {
        //                 var newSettings = new Settings
        //                 {
        //                     Id = Guid.NewGuid(),
        //                     CompanyId = newCompany.Id,
        //                     UserId = userId,
        //                     FiscalYearId = newFiscalYear.Id,
        //                     RoundOffSales = sourceSettings.RoundOffSales,
        //                     RoundOffPurchase = sourceSettings.RoundOffPurchase,
        //                     RoundOffSalesReturn = sourceSettings.RoundOffSalesReturn,
        //                     RoundOffPurchaseReturn = sourceSettings.RoundOffPurchaseReturn,
        //                     DisplayTransactions = sourceSettings.DisplayTransactions,
        //                     DisplayTransactionsForPurchase = sourceSettings.DisplayTransactionsForPurchase,
        //                     DisplayTransactionsForSalesReturn = sourceSettings.DisplayTransactionsForSalesReturn,
        //                     DisplayTransactionsForPurchaseReturn = sourceSettings.DisplayTransactionsForPurchaseReturn,
        //                     UseVoucherLastDateForSales = sourceSettings.UseVoucherLastDateForSales,
        //                     UseVoucherLastDateForSalesReturn = sourceSettings.UseVoucherLastDateForSalesReturn,
        //                     UseVoucherLastDateForPurchase = sourceSettings.UseVoucherLastDateForPurchase,
        //                     UseVoucherLastDateForPurchaseReturn = sourceSettings.UseVoucherLastDateForPurchaseReturn,
        //                     UseVoucherLastDateForPayment = sourceSettings.UseVoucherLastDateForPayment,
        //                     UseVoucherLastDateForReceipt = sourceSettings.UseVoucherLastDateForReceipt,
        //                     UseVoucherLastDateForJournal = sourceSettings.UseVoucherLastDateForJournal,
        //                     UseVoucherLastDateForDebitNote = sourceSettings.UseVoucherLastDateForDebitNote,
        //                     UseVoucherLastDateForCreditNote = sourceSettings.UseVoucherLastDateForCreditNote,
        //                     UseVoucherLastDateForSalesQuotation = sourceSettings.UseVoucherLastDateForSalesQuotation,
        //                     UseVoucherLastDateForStockAdjustment = sourceSettings.UseVoucherLastDateForStockAdjustment,
        //                     StoreManagement = sourceSettings.StoreManagement,
        //                     Value = sourceSettings.Value,
        //                     CreatedAt = DateTime.UtcNow
        //                 };
        //                 _context.CompanySettings.Add(newSettings);
        //                 await _context.SaveChangesAsync(cancellationToken);
        //             }
        //         }
        //         catch (Exception ex)
        //         {
        //             _logger.LogWarning(ex, "Failed to clone settings, continuing with defaults");
        //         }

        //         // ============================================================
        //         // STEP 4: Clone account groups
        //         // ============================================================
        //         await onProgress(new SplitFiscalYearProgressEventDto
        //         {
        //             Type = "progress",
        //             Value = 25,
        //             Message = "Cloning account groups..."
        //         });

        //         var accountGroupMap = new Dictionary<Guid, Guid>();
        //         var sourceAccountGroups = await _context.AccountGroups
        //             .Where(g => g.CompanyId == request.SourceCompanyId)
        //             .ToListAsync(cancellationToken);

        //         sourceAccountGroupsCount = sourceAccountGroups.Count;

        //         foreach (var group in sourceAccountGroups)
        //         {
        //             var newGroup = new AccountGroup
        //             {
        //                 Id = Guid.NewGuid(),
        //                 Name = group.Name,
        //                 Type = group.Type,
        //                 CompanyId = newCompany.Id,
        //                 PrimaryGroup = group.PrimaryGroup,
        //                 CreatedAt = DateTime.UtcNow,
        //                 UpdatedAt = DateTime.UtcNow
        //             };
        //             _context.AccountGroups.Add(newGroup);
        //             accountGroupMap[group.Id] = newGroup.Id;
        //         }
        //         await _context.SaveChangesAsync(cancellationToken);
        //         _logger.LogInformation("Cloned {Count} account groups", sourceAccountGroups.Count);

        //         // ============================================================
        //         // STEP 5: Clone accounts (with OpeningBalance navigation)
        //         // ============================================================
        //         await onProgress(new SplitFiscalYearProgressEventDto
        //         {
        //             Type = "progress",
        //             Value = 35,
        //             Message = "Cloning accounts..."
        //         });

        //         var sourceAccounts = await _context.Accounts
        //             .Where(a => a.CompanyId == request.SourceCompanyId)
        //             .Include(a => a.OpeningBalance)
        //             .ToListAsync(cancellationToken);

        //         sourceAccountsCount = sourceAccounts.Count;
        //         var accountMap = new Dictionary<Guid, Guid>();

        //         foreach (var account in sourceAccounts)
        //         {
        //             var newAccountGroupId = accountGroupMap.TryGetValue(account.AccountGroupsId, out var mappedId)
        //                 ? mappedId
        //                 : account.AccountGroupsId;

        //             var newAccount = new Account
        //             {
        //                 Id = Guid.NewGuid(),
        //                 Name = account.Name,
        //                 Address = account.Address,
        //                 Ward = account.Ward,
        //                 Phone = account.Phone,
        //                 Pan = account.Pan,
        //                 ContactPerson = account.ContactPerson,
        //                 Email = account.Email,
        //                 UniqueNumber = account.UniqueNumber,
        //                 CreditLimit = account.CreditLimit,
        //                 AccountGroupsId = newAccountGroupId,
        //                 CompanyId = newCompany.Id,
        //                 OriginalFiscalYearId = newFiscalYear.Id,
        //                 OpeningBalanceType = account.OpeningBalanceType,
        //                 DefaultCashAccount = account.DefaultCashAccount,
        //                 IsActive = account.IsActive,
        //                 CreatedAt = DateTime.UtcNow,
        //                 UpdatedAt = DateTime.UtcNow,
        //                 Date = DateTime.UtcNow
        //             };

        //             if (account.OpeningBalance != null)
        //             {
        //                 newAccount.OpeningBalance = new OpeningBalance
        //                 {
        //                     Id = Guid.NewGuid(),
        //                     FiscalYearId = newFiscalYear.Id,
        //                     Amount = account.OpeningBalance.Amount,
        //                     Type = account.OpeningBalance.Type,
        //                     Date = splitFiscalYear.StartDate ?? DateTime.UtcNow,
        //                     AccountId = newAccount.Id,
        //                     CompanyId = newCompany.Id
        //                 };
        //             }

        //             _context.Accounts.Add(newAccount);
        //             accountMap[account.Id] = newAccount.Id;
        //         }
        //         await _context.SaveChangesAsync(cancellationToken);
        //         _logger.LogInformation("Cloned {Count} accounts", sourceAccounts.Count);

        //         // ============================================================
        //         // STEP 5.5: Create InitialOpeningBalance for the new company
        //         //           using the SOURCE fiscal year's opening balances.
        //         // ============================================================
        //         await onProgress(new SplitFiscalYearProgressEventDto
        //         {
        //             Type = "progress",
        //             Value = 38,
        //             Message = "Setting initial opening balances..."
        //         });

        //         var sourceInitialBalances = await _context.OpeningBalanceByFiscalYear
        //             .Where(ob => ob.FiscalYearId == splitFiscalYear.Id
        //                       && ob.CompanyId == request.SourceCompanyId)
        //             .Include(ob => ob.Account)
        //             .ToListAsync(cancellationToken);

        //         _logger.LogInformation("Found {Count} source opening balances to set as initial opening balances",
        //             sourceInitialBalances.Count);

        //         foreach (var openingBalance in sourceInitialBalances)
        //         {
        //             if (!accountMap.TryGetValue(openingBalance.AccountId, out var newAccountId))
        //             {
        //                 _logger.LogWarning("Account {AccountId} not found in accountMap, skipping initial opening balance",
        //                     openingBalance.AccountId);
        //                 continue;
        //             }

        //             var existingInitial = await _context.InitialOpeningBalances
        //                 .FirstOrDefaultAsync(iob => iob.AccountId == newAccountId, cancellationToken);

        //             if (existingInitial != null)
        //             {
        //                 existingInitial.Amount = openingBalance.Amount;
        //                 existingInitial.Type = openingBalance.Type;
        //                 existingInitial.Date = openingBalance.Date;
        //                 existingInitial.NepaliDate = openingBalance.NepaliDate;
        //                 existingInitial.CompanyId = newCompany.Id;
        //                 existingInitial.InitialFiscalYearId = newFiscalYear.Id;
        //             }
        //             else
        //             {
        //                 _context.InitialOpeningBalances.Add(new InitialOpeningBalance
        //                 {
        //                     Id = Guid.NewGuid(),
        //                     InitialFiscalYearId = newFiscalYear.Id,
        //                     AccountId = newAccountId,
        //                     CompanyId = newCompany.Id,
        //                     Amount = openingBalance.Amount,
        //                     Type = openingBalance.Type,
        //                     Date = openingBalance.Date,
        //                     NepaliDate = openingBalance.NepaliDate
        //                 });
        //             }

        //             initialOpeningBalancesCopied++;
        //         }

        //         await _context.SaveChangesAsync(cancellationToken);
        //         _logger.LogInformation("Created {Count} initial opening balances", initialOpeningBalancesCopied);

        //         // ============================================================
        //         // STEP 6: Clone OpeningBalanceByFiscalYear for the moved fiscal year
        //         // ============================================================
        //         await onProgress(new SplitFiscalYearProgressEventDto
        //         {
        //             Type = "progress",
        //             Value = 40,
        //             Message = "Cloning opening balances to new fiscal year..."
        //         });

        //         var sourceOpeningBalances = await _context.OpeningBalanceByFiscalYear
        //             .Where(ob => ob.FiscalYearId == splitFiscalYear.Id && ob.CompanyId == request.SourceCompanyId)
        //             .Include(ob => ob.Account)
        //             .ToListAsync(cancellationToken);

        //         _logger.LogInformation("Found {Count} opening balances to clone", sourceOpeningBalances.Count);

        //         foreach (var openingBalance in sourceOpeningBalances)
        //         {
        //             if (!accountMap.TryGetValue(openingBalance.AccountId, out var newAccountId))
        //             {
        //                 _logger.LogWarning("Account {AccountId} not found in account map, skipping opening balance",
        //                     openingBalance.AccountId);
        //                 continue;
        //             }

        //             var existingOpeningBalance = await _context.OpeningBalanceByFiscalYear
        //                 .FirstOrDefaultAsync(ob => ob.AccountId == newAccountId
        //                                        && ob.FiscalYearId == newFiscalYear.Id, cancellationToken);

        //             if (existingOpeningBalance != null)
        //             {
        //                 existingOpeningBalance.Amount = openingBalance.Amount;
        //                 existingOpeningBalance.Type = openingBalance.Type;
        //                 existingOpeningBalance.Date = openingBalance.Date;
        //                 existingOpeningBalance.NepaliDate = openingBalance.NepaliDate;
        //                 existingOpeningBalance.CompanyId = newCompany.Id;
        //             }
        //             else
        //             {
        //                 _context.OpeningBalanceByFiscalYear.Add(new OpeningBalanceByFiscalYear
        //                 {
        //                     Id = Guid.NewGuid(),
        //                     AccountId = newAccountId,
        //                     FiscalYearId = newFiscalYear.Id,
        //                     CompanyId = newCompany.Id,
        //                     Amount = openingBalance.Amount,
        //                     Type = openingBalance.Type,
        //                     Date = openingBalance.Date,
        //                     NepaliDate = openingBalance.NepaliDate,
        //                 });
        //             }

        //             openingBalancesCopied++;
        //         }

        //         await _context.SaveChangesAsync(cancellationToken);
        //         _logger.LogInformation("Cloned {Count} opening balances", openingBalancesCopied);

        //         // ============================================================
        //         // STEP 7: Clone categories
        //         // ============================================================
        //         await onProgress(new SplitFiscalYearProgressEventDto
        //         {
        //             Type = "progress",
        //             Value = 45,
        //             Message = "Cloning categories..."
        //         });

        //         var categoryMap = new Dictionary<Guid, Guid>();

        //         var sourceCategories = await _context.Categories
        //             .Where(c => c.CompanyId == request.SourceCompanyId)
        //             .Where(c => c.OriginalFiscalYearId == splitFiscalYear.Id || c.FiscalYearId == splitFiscalYear.Id)
        //             .ToListAsync(cancellationToken);

        //         if (!sourceCategories.Any())
        //         {
        //             _logger.LogWarning("No categories found with OriginalFiscalYearId = {FiscalYearId}, fetching all categories for company", splitFiscalYear.Id);
        //             sourceCategories = await _context.Categories
        //                 .Where(c => c.CompanyId == request.SourceCompanyId)
        //                 .ToListAsync(cancellationToken);
        //         }

        //         sourceCategoriesCount = sourceCategories.Count;
        //         _logger.LogInformation("Found {Count} categories to clone", sourceCategories.Count);

        //         foreach (var category in sourceCategories)
        //         {
        //             var existingCategory = await _context.Categories
        //                 .FirstOrDefaultAsync(c => c.CompanyId == newCompany.Id && c.Name == category.Name, cancellationToken);

        //             if (existingCategory != null)
        //             {
        //                 categoryMap[category.Id] = existingCategory.Id;
        //                 continue;
        //             }

        //             var newCategory = new Category
        //             {
        //                 Id = Guid.NewGuid(),
        //                 Name = category.Name,
        //                 UniqueNumber = category.UniqueNumber,
        //                 CompanyId = newCompany.Id,
        //                 FiscalYearId = newFiscalYear.Id,
        //                 OriginalFiscalYearId = newFiscalYear.Id,
        //                 Date = DateTime.UtcNow,
        //                 NepaliDate = category.NepaliDate,
        //                 CreatedAt = DateTime.UtcNow
        //             };
        //             _context.Categories.Add(newCategory);
        //             categoryMap[category.Id] = newCategory.Id;
        //         }
        //         await _context.SaveChangesAsync(cancellationToken);
        //         _logger.LogInformation("Cloned {Count} categories", sourceCategories.Count);

        //         // ============================================================
        //         // STEP 8: Clone item companies
        //         // ============================================================
        //         await onProgress(new SplitFiscalYearProgressEventDto
        //         {
        //             Type = "progress",
        //             Value = 50,
        //             Message = "Cloning item companies..."
        //         });

        //         var itemCompanyMap = new Dictionary<Guid, Guid>();

        //         var sourceItemCompanies = await _context.ItemCompanies
        //             .Where(ic => ic.CompanyId == request.SourceCompanyId)
        //             .Where(ic => ic.OriginalFiscalYearId == splitFiscalYear.Id || ic.FiscalYearId == splitFiscalYear.Id)
        //             .ToListAsync(cancellationToken);

        //         if (!sourceItemCompanies.Any())
        //         {
        //             sourceItemCompanies = await _context.ItemCompanies
        //                 .Where(ic => ic.CompanyId == request.SourceCompanyId)
        //                 .ToListAsync(cancellationToken);
        //         }

        //         sourceItemCompaniesCount = sourceItemCompanies.Count;

        //         foreach (var itemCompany in sourceItemCompanies)
        //         {
        //             var existingItemCompany = await _context.ItemCompanies
        //                 .FirstOrDefaultAsync(ic => ic.CompanyId == newCompany.Id && ic.Name == itemCompany.Name, cancellationToken);

        //             if (existingItemCompany != null)
        //             {
        //                 itemCompanyMap[itemCompany.Id] = existingItemCompany.Id;
        //                 continue;
        //             }

        //             var newItemCompany = new ItemCompany
        //             {
        //                 Id = Guid.NewGuid(),
        //                 Name = itemCompany.Name,
        //                 UniqueNumber = itemCompany.UniqueNumber,
        //                 CompanyId = newCompany.Id,
        //                 FiscalYearId = newFiscalYear.Id,
        //                 OriginalFiscalYearId = newFiscalYear.Id,
        //                 Date = DateTime.UtcNow,
        //                 NepaliDate = itemCompany.NepaliDate,
        //                 CreatedAt = DateTime.UtcNow
        //             };
        //             _context.ItemCompanies.Add(newItemCompany);
        //             itemCompanyMap[itemCompany.Id] = newItemCompany.Id;
        //         }
        //         await _context.SaveChangesAsync(cancellationToken);
        //         _logger.LogInformation("Cloned {Count} item companies", sourceItemCompanies.Count);

        //         // ============================================================
        //         // STEP 9: Clone main units
        //         // ============================================================
        //         await onProgress(new SplitFiscalYearProgressEventDto
        //         {
        //             Type = "progress",
        //             Value = 53,
        //             Message = "Cloning main units..."
        //         });

        //         var mainUnitMap = new Dictionary<Guid, Guid>();

        //         var sourceMainUnits = await _context.MainUnits
        //             .Where(mu => mu.CompanyId == request.SourceCompanyId)
        //             .Where(mu => mu.OriginalFiscalYearId == splitFiscalYear.Id || mu.FiscalYearId == splitFiscalYear.Id)
        //             .ToListAsync(cancellationToken);

        //         if (!sourceMainUnits.Any())
        //         {
        //             sourceMainUnits = await _context.MainUnits
        //                 .Where(mu => mu.CompanyId == request.SourceCompanyId)
        //                 .ToListAsync(cancellationToken);
        //         }

        //         sourceMainUnitsCount = sourceMainUnits.Count;

        //         foreach (var mainUnit in sourceMainUnits)
        //         {
        //             var existingMainUnit = await _context.MainUnits
        //                 .FirstOrDefaultAsync(mu => mu.CompanyId == newCompany.Id &&
        //                     (mu.Name == mainUnit.Name || mu.UniqueNumber == mainUnit.UniqueNumber),
        //                     cancellationToken);

        //             if (existingMainUnit != null)
        //             {
        //                 mainUnitMap[mainUnit.Id] = existingMainUnit.Id;
        //                 continue;
        //             }

        //             var newMainUnit = new MainUnit
        //             {
        //                 Id = Guid.NewGuid(),
        //                 Name = mainUnit.Name,
        //                 UniqueNumber = mainUnit.UniqueNumber,
        //                 CompanyId = newCompany.Id,
        //                 FiscalYearId = newFiscalYear.Id,
        //                 OriginalFiscalYearId = newFiscalYear.Id,
        //                 Date = DateTime.UtcNow,
        //                 NepaliDate = mainUnit.NepaliDate,
        //                 CreatedAt = DateTime.UtcNow
        //             };
        //             _context.MainUnits.Add(newMainUnit);
        //             mainUnitMap[mainUnit.Id] = newMainUnit.Id;
        //         }
        //         await _context.SaveChangesAsync(cancellationToken);
        //         _logger.LogInformation("Cloned {Count} main units", sourceMainUnits.Count);

        //         // ============================================================
        //         // STEP 10: Clone units
        //         // ============================================================
        //         await onProgress(new SplitFiscalYearProgressEventDto
        //         {
        //             Type = "progress",
        //             Value = 55,
        //             Message = "Cloning units..."
        //         });

        //         var unitMap = new Dictionary<Guid, Guid>();

        //         var sourceUnits = await _context.Units
        //             .Where(u => u.CompanyId == request.SourceCompanyId)
        //             .Where(u => u.OriginalFiscalYearId == splitFiscalYear.Id || u.FiscalYearId == splitFiscalYear.Id)
        //             .ToListAsync(cancellationToken);

        //         if (!sourceUnits.Any())
        //         {
        //             sourceUnits = await _context.Units
        //                 .Where(u => u.CompanyId == request.SourceCompanyId)
        //                 .ToListAsync(cancellationToken);
        //         }

        //         sourceUnitsCount = sourceUnits.Count;

        //         foreach (var unit in sourceUnits)
        //         {
        //             var existingUnit = await _context.Units
        //                 .FirstOrDefaultAsync(u => u.CompanyId == newCompany.Id && u.Name == unit.Name, cancellationToken);

        //             if (existingUnit != null)
        //             {
        //                 unitMap[unit.Id] = existingUnit.Id;
        //                 continue;
        //             }

        //             var newUnit = new Unit
        //             {
        //                 Id = Guid.NewGuid(),
        //                 Name = unit.Name,
        //                 UniqueNumber = unit.UniqueNumber,
        //                 CompanyId = newCompany.Id,
        //                 FiscalYearId = newFiscalYear.Id,
        //                 OriginalFiscalYearId = newFiscalYear.Id,
        //                 Date = DateTime.UtcNow,
        //                 NepaliDate = unit.NepaliDate,
        //                 CreatedAt = DateTime.UtcNow
        //             };
        //             _context.Units.Add(newUnit);
        //             unitMap[unit.Id] = newUnit.Id;
        //         }
        //         await _context.SaveChangesAsync(cancellationToken);
        //         _logger.LogInformation("Cloned {Count} units", sourceUnits.Count);

        //         // ============================================================
        //         // STEP 10.5: Clone compositions
        //         // ============================================================
        //         await onProgress(new SplitFiscalYearProgressEventDto
        //         {
        //             Type = "progress",
        //             Value = 58,
        //             Message = "Cloning compositions..."
        //         });

        //         var compositionMap = new Dictionary<Guid, Guid>();

        //         var sourceCompositions = await _context.Compositions
        //             .Where(c => c.CompanyId == request.SourceCompanyId)
        //             .Where(c => c.OriginalFiscalYearId == splitFiscalYear.Id || c.FiscalYearId == splitFiscalYear.Id)
        //             .ToListAsync(cancellationToken);

        //         if (!sourceCompositions.Any())
        //         {
        //             sourceCompositions = await _context.Compositions
        //                 .Where(c => c.CompanyId == request.SourceCompanyId)
        //                 .ToListAsync(cancellationToken);
        //         }

        //         sourceCompositionsCount = sourceCompositions.Count;

        //         foreach (var composition in sourceCompositions)
        //         {
        //             var existingComposition = await _context.Compositions
        //                 .FirstOrDefaultAsync(c => c.CompanyId == newCompany.Id &&
        //                     (c.Name == composition.Name || c.UniqueNumber == composition.UniqueNumber),
        //                     cancellationToken);

        //             if (existingComposition != null)
        //             {
        //                 compositionMap[composition.Id] = existingComposition.Id;
        //                 continue;
        //             }

        //             var newComposition = new Composition
        //             {
        //                 Id = Guid.NewGuid(),
        //                 Name = composition.Name,
        //                 UniqueNumber = composition.UniqueNumber,
        //                 CompanyId = newCompany.Id,
        //                 FiscalYearId = newFiscalYear.Id,
        //                 OriginalFiscalYearId = newFiscalYear.Id,
        //                 Date = DateTime.UtcNow,
        //                 NepaliDate = composition.NepaliDate,
        //                 CreatedAt = DateTime.UtcNow,
        //                 UpdatedAt = DateTime.UtcNow
        //             };
        //             _context.Compositions.Add(newComposition);
        //             compositionMap[composition.Id] = newComposition.Id;
        //         }
        //         await _context.SaveChangesAsync(cancellationToken);
        //         _logger.LogInformation("Cloned {Count} compositions", sourceCompositions.Count);

        //         // ============================================================
        //         // STEP 11: Clone items with stock entries AND item-composition links
        //         // ============================================================
        //         await onProgress(new SplitFiscalYearProgressEventDto
        //         {
        //             Type = "progress",
        //             Value = 60,
        //             Message = "Cloning items with stock entries..."
        //         });

        //         var sourceItems = await _context.Items
        //             .Where(i => i.CompanyId == request.SourceCompanyId)
        //             .Where(i => i.OriginalFiscalYearId == splitFiscalYear.Id || i.CreatedAt >= splitFiscalYear.StartDate)
        //             .Include(i => i.StockEntries)
        //             .Include(i => i.ItemCompositions)
        //             .ToListAsync(cancellationToken);

        //         if (!sourceItems.Any())
        //         {
        //             sourceItems = await _context.Items
        //                 .Where(i => i.CompanyId == request.SourceCompanyId)
        //                 .Include(i => i.StockEntries)
        //                 .Include(i => i.ItemCompositions)
        //                 .ToListAsync(cancellationToken);
        //         }

        //         _logger.LogInformation("Found {Count} items to clone", sourceItems.Count);

        //         foreach (var item in sourceItems)
        //         {
        //             try
        //             {
        //                 var newCategoryId = categoryMap.TryGetValue(item.CategoryId, out var catId) ? catId : item.CategoryId;
        //                 var newItemCompanyId = itemCompanyMap.TryGetValue(item.ItemsCompanyId, out var icId) ? icId : item.ItemsCompanyId;
        //                 var newUnitId = unitMap.TryGetValue(item.UnitId, out var uId) ? uId : item.UnitId;
        //                 var newMainUnitId = mainUnitMap.TryGetValue(item.MainUnitId ?? Guid.Empty, out var muId) ? muId : item.MainUnitId;

        //                 var newItem = new Item
        //                 {
        //                     Id = Guid.NewGuid(),
        //                     Name = item.Name,
        //                     Hscode = item.Hscode,
        //                     CategoryId = newCategoryId,
        //                     ItemsCompanyId = newItemCompanyId,
        //                     Price = item.Price,
        //                     PuPrice = item.PuPrice,
        //                     MainUnitPuPrice = item.MainUnitPuPrice,
        //                     MainUnitId = newMainUnitId,
        //                     WsUnit = item.WsUnit,
        //                     UnitId = newUnitId,
        //                     VatStatus = item.VatStatus,
        //                     OpeningStock = item.OpeningStock,
        //                     MinStock = item.MinStock,
        //                     MaxStock = item.MaxStock,
        //                     ReorderLevel = item.ReorderLevel,
        //                     UniqueNumber = item.UniqueNumber,
        //                     BarcodeNumber = item.BarcodeNumber,
        //                     CompanyId = newCompany.Id,
        //                     OriginalFiscalYearId = newFiscalYear.Id,
        //                     Status = item.Status,
        //                     CreatedAt = DateTime.UtcNow,
        //                     Date = DateTime.UtcNow,
        //                     UpdatedAt = DateTime.UtcNow
        //                 };

        //                 _context.Items.Add(newItem);
        //                 itemsCopied++;

        //                 // Clone ItemCompositions (junction)
        //                 if (item.ItemCompositions != null && item.ItemCompositions.Any())
        //                 {
        //                     foreach (var itemComposition in item.ItemCompositions)
        //                     {
        //                         if (!compositionMap.TryGetValue(itemComposition.CompositionId, out var newCompositionId))
        //                         {
        //                             _logger.LogWarning(
        //                                 "Composition {CompositionId} for item {ItemName} not found in compositionMap, skipping link",
        //                                 itemComposition.CompositionId, item.Name);
        //                             continue;
        //                         }

        //                         _context.ItemCompositions.Add(new ItemComposition
        //                         {
        //                             ItemId = newItem.Id,
        //                             CompositionId = newCompositionId,
        //                             CreatedAt = DateTime.UtcNow
        //                         });
        //                         itemCompositionsCopied++;
        //                     }
        //                 }

        //                 // Clone StockEntries
        //                 if (item.StockEntries != null && item.StockEntries.Any())
        //                 {
        //                     foreach (var stockEntry in item.StockEntries)
        //                     {
        //                         var newStockEntry = new StockEntry
        //                         {
        //                             Id = Guid.NewGuid(),
        //                             ItemId = newItem.Id,
        //                             Date = DateTime.UtcNow,
        //                             WsUnit = stockEntry.WsUnit,
        //                             Quantity = stockEntry.Quantity,
        //                             BillQty = stockEntry.BillQty,
        //                             ActualQty = stockEntry.ActualQty,
        //                             Bonus = stockEntry.Bonus,
        //                             BatchNumber = stockEntry.BatchNumber ?? "XXX",
        //                             ExpiryDate = stockEntry.ExpiryDate,
        //                             Price = stockEntry.Price,
        //                             NetPrice = stockEntry.NetPrice,
        //                             PuPrice = stockEntry.PuPrice,
        //                             CcPercentage = stockEntry.CcPercentage,
        //                             ItemCcAmount = stockEntry.ItemCcAmount,
        //                             DiscountPercentagePerItem = stockEntry.DiscountPercentagePerItem,
        //                             DiscountAmountPerItem = stockEntry.DiscountAmountPerItem,
        //                             NetPuPrice = stockEntry.NetPuPrice,
        //                             MainUnitPuPrice = stockEntry.MainUnitPuPrice,
        //                             Mrp = stockEntry.Mrp,
        //                             MarginPercentage = stockEntry.MarginPercentage,
        //                             Currency = stockEntry.Currency,
        //                             CompanyId = newCompany.Id,
        //                             FiscalYearId = newFiscalYear.Id,
        //                             UniqueUuid = stockEntry.UniqueUuid,
        //                             PurchaseBillId = null,
        //                             SalesReturnBillId = null,
        //                             ExpiryStatus = stockEntry.ExpiryStatus,
        //                             DaysUntilExpiry = stockEntry.DaysUntilExpiry,
        //                             StoreId = stockEntry.StoreId,
        //                             RackId = stockEntry.RackId,
        //                             SourceTransferFromStoreId = null,
        //                             SourceTransferOriginalEntryId = null,
        //                             SourceTransferDate = null,
        //                             NepaliDate = stockEntry.NepaliDate,
        //                             CreatedAt = DateTime.UtcNow,
        //                             UpdatedAt = DateTime.UtcNow
        //                         };
        //                         _context.StockEntries.Add(newStockEntry);
        //                         stockEntriesCopied++;
        //                     }
        //                 }
        //             }
        //             catch (Exception ex)
        //             {
        //                 _logger.LogError(ex, "Error cloning item {Name} (ID: {Id})", item.Name, item.Id);
        //             }
        //         }

        //         await _context.SaveChangesAsync(cancellationToken);
        //         _logger.LogInformation("Cloned {Count} items with {StockCount} stock entries and {CompCount} composition links",
        //             itemsCopied, stockEntriesCopied, itemCompositionsCopied);

        //         // ============================================================
        //         // DELETE FISCAL YEAR FROM SOURCE COMPANY (only if requested AND safe)
        //         // ============================================================
        //         if (request.DeleteAfterSplit)
        //         {
        //             // Guard: don't try to delete the fiscal year that was just moved
        //             if (request.FiscalYearId == request.TargetFiscalYearId)
        //             {
        //                 _logger.LogWarning(
        //                     "DeleteAfterSplit is true but the target FY ({TargetFyId}) is the same as the split FY. " +
        //                     "Skipping delete — the fiscal year has already been moved to the new company.",
        //                     request.TargetFiscalYearId);

        //                 await onProgress(new SplitFiscalYearProgressEventDto
        //                 {
        //                     Type = "progress",
        //                     Value = 85,
        //                     Message = "Split fiscal year was moved to new company (no deletion needed)."
        //                 });
        //             }
        //             else
        //             {
        //                 await onProgress(new SplitFiscalYearProgressEventDto
        //                 {
        //                     Type = "progress",
        //                     Value = 85,
        //                     Message = "Removing split fiscal year from source company..."
        //                 });

        //                 _logger.LogInformation("Starting deletion of fiscal year {FiscalYearId} from source company", splitFiscalYear.Id);

        //                 try
        //                 {
        //                     // Check if this is the only fiscal year for the company
        //                     var fiscalYearCount = await _context.FiscalYears
        //                         .CountAsync(f => f.CompanyId == request.SourceCompanyId, cancellationToken);

        //                     if (fiscalYearCount <= 1)
        //                     {
        //                         await onProgress(new SplitFiscalYearProgressEventDto
        //                         {
        //                             Type = "error",
        //                             Error = "Cannot delete the last remaining fiscal year in the source company.",
        //                             Message = "The company must have at least one fiscal year."
        //                         });
        //                         await transaction.RollbackAsync(cancellationToken);
        //                         return;
        //                     }

        //                     // 1. Get transaction IDs
        //                     var transactionIds = await _context.Transactions
        //                         .Where(t => t.FiscalYearId == splitFiscalYear.Id)
        //                         .Select(t => t.Id)
        //                         .ToListAsync(cancellationToken);

        //                     // 2. Delete TransactionItems
        //                     if (transactionIds.Any())
        //                     {
        //                         var transactionItemsToDelete = await _context.TransactionItems
        //                             .Where(ti => transactionIds.Contains(ti.TransactionId))
        //                             .ToListAsync(cancellationToken);

        //                         if (transactionItemsToDelete.Any())
        //                         {
        //                             _context.TransactionItems.RemoveRange(transactionItemsToDelete);
        //                             await _context.SaveChangesAsync(cancellationToken);
        //                         }

        //                         // 3. Delete Transactions
        //                         var transactionsToDelete = await _context.Transactions
        //                             .Where(t => t.FiscalYearId == splitFiscalYear.Id)
        //                             .ToListAsync(cancellationToken);

        //                         if (transactionsToDelete.Any())
        //                         {
        //                             _context.Transactions.RemoveRange(transactionsToDelete);
        //                             await _context.SaveChangesAsync(cancellationToken);
        //                         }
        //                     }

        //                     // 4. Delete OpeningBalanceByFiscalYear
        //                     var openingBalancesToDelete = await _context.OpeningBalanceByFiscalYear
        //                         .Where(ob => ob.FiscalYearId == splitFiscalYear.Id)
        //                         .ToListAsync(cancellationToken);

        //                     if (openingBalancesToDelete.Any())
        //                     {
        //                         _context.OpeningBalanceByFiscalYear.RemoveRange(openingBalancesToDelete);
        //                         await _context.SaveChangesAsync(cancellationToken);
        //                     }

        //                     // 5. Delete ClosingBalanceByFiscalYear
        //                     var closingBalancesToDelete = await _context.ClosingBalanceByFiscalYear
        //                         .Where(cb => cb.FiscalYearId == splitFiscalYear.Id)
        //                         .ToListAsync(cancellationToken);

        //                     if (closingBalancesToDelete.Any())
        //                     {
        //                         _context.ClosingBalanceByFiscalYear.RemoveRange(closingBalancesToDelete);
        //                         await _context.SaveChangesAsync(cancellationToken);
        //                     }

        //                     // 6. Delete OpeningBalances
        //                     var openingBalances = await _context.OpeningBalances
        //                         .Where(ob => ob.FiscalYearId == splitFiscalYear.Id)
        //                         .ToListAsync(cancellationToken);

        //                     if (openingBalances.Any())
        //                     {
        //                         _context.OpeningBalances.RemoveRange(openingBalances);
        //                         await _context.SaveChangesAsync(cancellationToken);
        //                     }

        //                     // 7. Delete ItemOpeningStockByFiscalYear
        //                     var itemOpeningStocksToDelete = await _context.ItemOpeningStockByFiscalYear
        //                         .Where(ios => ios.FiscalYearId == splitFiscalYear.Id)
        //                         .ToListAsync(cancellationToken);

        //                     if (itemOpeningStocksToDelete.Any())
        //                     {
        //                         _context.ItemOpeningStockByFiscalYear.RemoveRange(itemOpeningStocksToDelete);
        //                         await _context.SaveChangesAsync(cancellationToken);
        //                     }

        //                     // 8. Delete ItemClosingStockByFiscalYear
        //                     var itemClosingStocksToDelete = await _context.ItemClosingStockByFiscalYear
        //                         .Where(ics => ics.FiscalYearId == splitFiscalYear.Id)
        //                         .ToListAsync(cancellationToken);

        //                     if (itemClosingStocksToDelete.Any())
        //                     {
        //                         _context.ItemClosingStockByFiscalYear.RemoveRange(itemClosingStocksToDelete);
        //                         await _context.SaveChangesAsync(cancellationToken);
        //                     }

        //                     // 9. SalesBillItems → SalesBills
        //                     var salesBillItemsToDelete = await _context.SalesBillItems
        //                         .Where(sbi => sbi.SalesBill != null && sbi.SalesBill.FiscalYearId == splitFiscalYear.Id)
        //                         .ToListAsync(cancellationToken);
        //                     if (salesBillItemsToDelete.Any())
        //                     {
        //                         _context.SalesBillItems.RemoveRange(salesBillItemsToDelete);
        //                         await _context.SaveChangesAsync(cancellationToken);
        //                     }

        //                     var salesBillsToDelete = await _context.SalesBills
        //                         .Where(sb => sb.FiscalYearId == splitFiscalYear.Id)
        //                         .ToListAsync(cancellationToken);
        //                     if (salesBillsToDelete.Any())
        //                     {
        //                         _context.SalesBills.RemoveRange(salesBillsToDelete);
        //                         await _context.SaveChangesAsync(cancellationToken);
        //                     }

        //                     // 10. PurchaseBillItems → PurchaseBills
        //                     var purchaseBillItemsToDelete = await _context.PurchaseBillItems
        //                         .Where(pbi => pbi.PurchaseBill != null && pbi.PurchaseBill.FiscalYearId == splitFiscalYear.Id)
        //                         .ToListAsync(cancellationToken);
        //                     if (purchaseBillItemsToDelete.Any())
        //                     {
        //                         _context.PurchaseBillItems.RemoveRange(purchaseBillItemsToDelete);
        //                         await _context.SaveChangesAsync(cancellationToken);
        //                     }

        //                     var purchaseBillsToDelete = await _context.PurchaseBills
        //                         .Where(pb => pb.FiscalYearId == splitFiscalYear.Id)
        //                         .ToListAsync(cancellationToken);
        //                     if (purchaseBillsToDelete.Any())
        //                     {
        //                         _context.PurchaseBills.RemoveRange(purchaseBillsToDelete);
        //                         await _context.SaveChangesAsync(cancellationToken);
        //                     }

        //                     // 11. SalesReturnItems → SalesReturns
        //                     var salesReturnItemsToDelete = await _context.SalesReturnItems
        //                         .Where(sri => sri.SalesReturn != null && sri.SalesReturn.FiscalYearId == splitFiscalYear.Id)
        //                         .ToListAsync(cancellationToken);
        //                     if (salesReturnItemsToDelete.Any())
        //                     {
        //                         _context.SalesReturnItems.RemoveRange(salesReturnItemsToDelete);
        //                         await _context.SaveChangesAsync(cancellationToken);
        //                     }

        //                     var salesReturnsToDelete = await _context.SalesReturns
        //                         .Where(sr => sr.FiscalYearId == splitFiscalYear.Id)
        //                         .ToListAsync(cancellationToken);
        //                     if (salesReturnsToDelete.Any())
        //                     {
        //                         _context.SalesReturns.RemoveRange(salesReturnsToDelete);
        //                         await _context.SaveChangesAsync(cancellationToken);
        //                     }

        //                     // 12. PurchaseReturnItems → PurchaseReturns
        //                     var purchaseReturnItemsToDelete = await _context.PurchaseReturnItems
        //                         .Where(pri => pri.PurchaseReturn != null && pri.PurchaseReturn.FiscalYearId == splitFiscalYear.Id)
        //                         .ToListAsync(cancellationToken);
        //                     if (purchaseReturnItemsToDelete.Any())
        //                     {
        //                         _context.PurchaseReturnItems.RemoveRange(purchaseReturnItemsToDelete);
        //                         await _context.SaveChangesAsync(cancellationToken);
        //                     }

        //                     var purchaseReturnsToDelete = await _context.PurchaseReturns
        //                         .Where(pr => pr.FiscalYearId == splitFiscalYear.Id)
        //                         .ToListAsync(cancellationToken);
        //                     if (purchaseReturnsToDelete.Any())
        //                     {
        //                         _context.PurchaseReturns.RemoveRange(purchaseReturnsToDelete);
        //                         await _context.SaveChangesAsync(cancellationToken);
        //                     }

        //                     // 13. PaymentEntries → Payments
        //                     var paymentEntriesToDelete = await _context.PaymentEntries
        //                         .Where(pe => pe.Payment != null && pe.Payment.FiscalYearId == splitFiscalYear.Id)
        //                         .ToListAsync(cancellationToken);
        //                     if (paymentEntriesToDelete.Any())
        //                     {
        //                         _context.PaymentEntries.RemoveRange(paymentEntriesToDelete);
        //                         await _context.SaveChangesAsync(cancellationToken);
        //                     }

        //                     var paymentsToDelete = await _context.Payments
        //                         .Where(p => p.FiscalYearId == splitFiscalYear.Id)
        //                         .ToListAsync(cancellationToken);
        //                     if (paymentsToDelete.Any())
        //                     {
        //                         _context.Payments.RemoveRange(paymentsToDelete);
        //                         await _context.SaveChangesAsync(cancellationToken);
        //                     }

        //                     // 14. ReceiptEntries → Receipts
        //                     var receiptEntriesToDelete = await _context.ReceiptEntries
        //                         .Where(re => re.Receipt != null && re.Receipt.FiscalYearId == splitFiscalYear.Id)
        //                         .ToListAsync(cancellationToken);
        //                     if (receiptEntriesToDelete.Any())
        //                     {
        //                         _context.ReceiptEntries.RemoveRange(receiptEntriesToDelete);
        //                         await _context.SaveChangesAsync(cancellationToken);
        //                     }

        //                     var receiptsToDelete = await _context.Receipts
        //                         .Where(r => r.FiscalYearId == splitFiscalYear.Id)
        //                         .ToListAsync(cancellationToken);
        //                     if (receiptsToDelete.Any())
        //                     {
        //                         _context.Receipts.RemoveRange(receiptsToDelete);
        //                         await _context.SaveChangesAsync(cancellationToken);
        //                     }

        //                     // 15. JournalEntries → JournalVouchers
        //                     var journalEntriesToDelete = await _context.JournalEntries
        //                         .Where(je => je.JournalVoucher != null && je.JournalVoucher.FiscalYearId == splitFiscalYear.Id)
        //                         .ToListAsync(cancellationToken);
        //                     if (journalEntriesToDelete.Any())
        //                     {
        //                         _context.JournalEntries.RemoveRange(journalEntriesToDelete);
        //                         await _context.SaveChangesAsync(cancellationToken);
        //                     }

        //                     var journalVouchersToDelete = await _context.JournalVouchers
        //                         .Where(jv => jv.FiscalYearId == splitFiscalYear.Id)
        //                         .ToListAsync(cancellationToken);
        //                     if (journalVouchersToDelete.Any())
        //                     {
        //                         _context.JournalVouchers.RemoveRange(journalVouchersToDelete);
        //                         await _context.SaveChangesAsync(cancellationToken);
        //                     }

        //                     // 16. DebitNoteEntries → DebitNotes
        //                     var debitNoteEntriesToDelete = await _context.DebitNoteEntries
        //                         .Where(dne => dne.DebitNote != null && dne.DebitNote.FiscalYearId == splitFiscalYear.Id)
        //                         .ToListAsync(cancellationToken);
        //                     if (debitNoteEntriesToDelete.Any())
        //                     {
        //                         _context.DebitNoteEntries.RemoveRange(debitNoteEntriesToDelete);
        //                         await _context.SaveChangesAsync(cancellationToken);
        //                     }

        //                     var debitNotesToDelete = await _context.DebitNotes
        //                         .Where(dn => dn.FiscalYearId == splitFiscalYear.Id)
        //                         .ToListAsync(cancellationToken);
        //                     if (debitNotesToDelete.Any())
        //                     {
        //                         _context.DebitNotes.RemoveRange(debitNotesToDelete);
        //                         await _context.SaveChangesAsync(cancellationToken);
        //                     }

        //                     // 17. CreditNoteEntries → CreditNotes
        //                     var creditNoteEntriesToDelete = await _context.CreditNoteEntries
        //                         .Where(cne => cne.CreditNote != null && cne.CreditNote.FiscalYearId == splitFiscalYear.Id)
        //                         .ToListAsync(cancellationToken);
        //                     if (creditNoteEntriesToDelete.Any())
        //                     {
        //                         _context.CreditNoteEntries.RemoveRange(creditNoteEntriesToDelete);
        //                         await _context.SaveChangesAsync(cancellationToken);
        //                     }

        //                     var creditNotesToDelete = await _context.CreditNotes
        //                         .Where(cn => cn.FiscalYearId == splitFiscalYear.Id)
        //                         .ToListAsync(cancellationToken);
        //                     if (creditNotesToDelete.Any())
        //                     {
        //                         _context.CreditNotes.RemoveRange(creditNotesToDelete);
        //                         await _context.SaveChangesAsync(cancellationToken);
        //                     }

        //                     // 18. StockAdjustmentItems → StockAdjustments
        //                     var stockAdjustmentItemsToDelete = await _context.StockAdjustmentItems
        //                         .Where(sai => sai.StockAdjustment != null && sai.StockAdjustment.FiscalYearId == splitFiscalYear.Id)
        //                         .ToListAsync(cancellationToken);
        //                     if (stockAdjustmentItemsToDelete.Any())
        //                     {
        //                         _context.StockAdjustmentItems.RemoveRange(stockAdjustmentItemsToDelete);
        //                         await _context.SaveChangesAsync(cancellationToken);
        //                     }

        //                     var stockAdjustmentsToDelete = await _context.StockAdjustments
        //                         .Where(sa => sa.FiscalYearId == splitFiscalYear.Id)
        //                         .ToListAsync(cancellationToken);
        //                     if (stockAdjustmentsToDelete.Any())
        //                     {
        //                         _context.StockAdjustments.RemoveRange(stockAdjustmentsToDelete);
        //                         await _context.SaveChangesAsync(cancellationToken);
        //                     }

        //                     // 19. SalesQuotationItems → SalesQuotations
        //                     var salesQuotationItemsToDelete = await _context.SalesQuotationItems
        //                         .Where(sqi => sqi.SalesQuotation != null && sqi.SalesQuotation.FiscalYearId == splitFiscalYear.Id)
        //                         .ToListAsync(cancellationToken);
        //                     if (salesQuotationItemsToDelete.Any())
        //                     {
        //                         _context.SalesQuotationItems.RemoveRange(salesQuotationItemsToDelete);
        //                         await _context.SaveChangesAsync(cancellationToken);
        //                     }

        //                     var salesQuotationsToDelete = await _context.SalesQuotations
        //                         .Where(sq => sq.FiscalYearId == splitFiscalYear.Id)
        //                         .ToListAsync(cancellationToken);
        //                     if (salesQuotationsToDelete.Any())
        //                     {
        //                         _context.SalesQuotations.RemoveRange(salesQuotationsToDelete);
        //                         await _context.SaveChangesAsync(cancellationToken);
        //                     }

        //                     // 20. StockEntries
        //                     var stockEntriesToDelete = await _context.StockEntries
        //                         .Where(se => se.CompanyId == request.SourceCompanyId && se.FiscalYearId == splitFiscalYear.Id)
        //                         .ToListAsync(cancellationToken);
        //                     if (stockEntriesToDelete.Any())
        //                     {
        //                         _context.StockEntries.RemoveRange(stockEntriesToDelete);
        //                         await _context.SaveChangesAsync(cancellationToken);
        //                     }

        //                     // 21. BillCounters
        //                     var billCountersToDelete = await _context.BillCounters
        //                         .Where(bc => bc.CompanyId == request.SourceCompanyId && bc.FiscalYearId == splitFiscalYear.Id)
        //                         .ToListAsync(cancellationToken);
        //                     if (billCountersToDelete.Any())
        //                     {
        //                         _context.BillCounters.RemoveRange(billCountersToDelete);
        //                         await _context.SaveChangesAsync(cancellationToken);
        //                     }

        //                     // 22. CompanySettings
        //                     var settingsToDelete = await _context.CompanySettings
        //                         .Where(s => s.CompanyId == request.SourceCompanyId && s.FiscalYearId == splitFiscalYear.Id)
        //                         .ToListAsync(cancellationToken);
        //                     if (settingsToDelete.Any())
        //                     {
        //                         _context.CompanySettings.RemoveRange(settingsToDelete);
        //                         await _context.SaveChangesAsync(cancellationToken);
        //                     }

        //                     // 23. Update items — remove OriginalFiscalYearId
        //                     var itemsToUpdate = await _context.Items
        //                         .Where(i => i.CompanyId == request.SourceCompanyId && i.OriginalFiscalYearId == splitFiscalYear.Id)
        //                         .ToListAsync(cancellationToken);
        //                     if (itemsToUpdate.Any())
        //                     {
        //                         foreach (var item in itemsToUpdate)
        //                             item.OriginalFiscalYearId = null;
        //                         await _context.SaveChangesAsync(cancellationToken);
        //                     }

        //                     // 24. Update accounts — remove OriginalFiscalYearId
        //                     var accountsToUpdate = await _context.Accounts
        //                         .Where(a => a.CompanyId == request.SourceCompanyId && a.OriginalFiscalYearId == splitFiscalYear.Id)
        //                         .ToListAsync(cancellationToken);
        //                     if (accountsToUpdate.Any())
        //                     {
        //                         foreach (var account in accountsToUpdate)
        //                             account.OriginalFiscalYearId = null;
        //                         await _context.SaveChangesAsync(cancellationToken);
        //                     }

        //                     // 25. Update Users — reassign to another fiscal year
        //                     var usersToUpdate = await _context.Users
        //                         .Where(u => u.FiscalYearId == splitFiscalYear.Id)
        //                         .ToListAsync(cancellationToken);
        //                     if (usersToUpdate.Any())
        //                     {
        //                         var otherFiscalYear = await _context.FiscalYears
        //                             .FirstOrDefaultAsync(f => f.CompanyId == request.SourceCompanyId
        //                                                    && f.Id != splitFiscalYear.Id, cancellationToken);

        //                         foreach (var user in usersToUpdate)
        //                         {
        //                             user.FiscalYearId = otherFiscalYear?.Id;
        //                             user.UpdatedAt = DateTime.UtcNow;
        //                         }
        //                         await _context.SaveChangesAsync(cancellationToken);
        //                     }

        //                     // 26. Delete categories
        //                     var categoriesToDelete = await _context.Categories
        //                         .Where(c => c.CompanyId == request.SourceCompanyId && c.FiscalYearId == splitFiscalYear.Id)
        //                         .ToListAsync(cancellationToken);
        //                     if (categoriesToDelete.Any())
        //                     {
        //                         _context.Categories.RemoveRange(categoriesToDelete);
        //                         await _context.SaveChangesAsync(cancellationToken);
        //                     }

        //                     // 27. Delete item companies
        //                     var itemCompaniesToDelete = await _context.ItemCompanies
        //                         .Where(ic => ic.CompanyId == request.SourceCompanyId && ic.FiscalYearId == splitFiscalYear.Id)
        //                         .ToListAsync(cancellationToken);
        //                     if (itemCompaniesToDelete.Any())
        //                     {
        //                         _context.ItemCompanies.RemoveRange(itemCompaniesToDelete);
        //                         await _context.SaveChangesAsync(cancellationToken);
        //                     }

        //                     // 28. Delete main units
        //                     var mainUnitsToDelete = await _context.MainUnits
        //                         .Where(mu => mu.CompanyId == request.SourceCompanyId && mu.FiscalYearId == splitFiscalYear.Id)
        //                         .ToListAsync(cancellationToken);
        //                     if (mainUnitsToDelete.Any())
        //                     {
        //                         _context.MainUnits.RemoveRange(mainUnitsToDelete);
        //                         await _context.SaveChangesAsync(cancellationToken);
        //                     }

        //                     // 29. Delete units
        //                     var unitsToDelete = await _context.Units
        //                         .Where(u => u.CompanyId == request.SourceCompanyId && u.FiscalYearId == splitFiscalYear.Id)
        //                         .ToListAsync(cancellationToken);
        //                     if (unitsToDelete.Any())
        //                     {
        //                         _context.Units.RemoveRange(unitsToDelete);
        //                         await _context.SaveChangesAsync(cancellationToken);
        //                     }

        //                     // 30. Finally delete the split fiscal year itself
        //                     _context.FiscalYears.Remove(splitFiscalYear);
        //                     await _context.SaveChangesAsync(cancellationToken);

        //                     _logger.LogInformation("Successfully deleted fiscal year {FiscalYearId} from source company", splitFiscalYear.Id);

        //                     await onProgress(new SplitFiscalYearProgressEventDto
        //                     {
        //                         Type = "progress",
        //                         Value = 95,
        //                         Message = "Split fiscal year removed from source company"
        //                     });
        //                 }
        //                 catch (Exception ex)
        //                 {
        //                     _logger.LogError(ex, "Error during deletion of fiscal year");
        //                     await onProgress(new SplitFiscalYearProgressEventDto
        //                     {
        //                         Type = "error",
        //                         Error = $"Failed to delete fiscal year: {ex.Message}",
        //                         Details = ex.StackTrace
        //                     });
        //                     throw;
        //                 }
        //             }
        //         }

        //         // ============================================================
        //         // STEP 12: Ensure BillCounters exist for the moved fiscal year
        //         //          (idempotent — only creates missing ones)
        //         // ============================================================
        //         await onProgress(new SplitFiscalYearProgressEventDto
        //         {
        //             Type = "progress",
        //             Value = 80,
        //             Message = "Ensuring bill counters..."
        //         });

        //         var transactionTypes = new[]
        //         {
        //     "Sales", "Purchase", "SalesReturn", "PurchaseReturn",
        //     "Payment", "Receipt", "Journal", "DebitNote", "CreditNote", "StockAdjustment"
        // };

        //         foreach (var transactionType in transactionTypes)
        //         {
        //             var existingCounter = await _context.BillCounters
        //                 .FirstOrDefaultAsync(bc => bc.CompanyId == newCompany.Id
        //                                         && bc.FiscalYearId == newFiscalYear.Id
        //                                         && bc.TransactionType == transactionType,
        //                     cancellationToken);

        //             if (existingCounter == null)
        //             {
        //                 _context.BillCounters.Add(new BillCounter
        //                 {
        //                     Id = Guid.NewGuid(),
        //                     CompanyId = newCompany.Id,
        //                     FiscalYearId = newFiscalYear.Id,
        //                     TransactionType = transactionType,
        //                     CurrentBillNumber = 0,
        //                     CreatedAt = DateTime.UtcNow
        //                 });
        //             }
        //             // If the counter exists (from when the FY was used in the source company),
        //             // leave it as-is. Its CompanyId may still be the source company —
        //             // if you need to fix that, see note below.
        //         }
        //         await _context.SaveChangesAsync(cancellationToken);

        //         // Commit transaction
        //         await transaction.CommitAsync(cancellationToken);
        //         _logger.LogInformation("Transaction committed successfully");

        //         // ============================================================
        //         // Prepare result
        //         // ============================================================
        //         var result = new SplitFiscalYearResultDto
        //         {
        //             Success = true,
        //             Message = request.DeleteAfterSplit
        //                 ? $"Company split successfully. New company \"{request.NewCompanyName}\" created with fiscal year moved from source company."
        //                 : $"Company split successfully. New company \"{request.NewCompanyName}\" created with cloned data.",
        //             Data = new SplitFiscalYearDataDto
        //             {
        //                 NewCompany = new NewCompanyInfoDto
        //                 {
        //                     Id = newCompany.Id,
        //                     Name = newCompany.Name
        //                 },
        //                 NewFiscalYear = new NewFiscalYearInfoDto
        //                 {
        //                     Id = newFiscalYear.Id,
        //                     Name = newFiscalYear.Name
        //                 },
        //                 Statistics = new SplitStatisticsDto
        //                 {
        //                     UsersCopied = 1,
        //                     CompanyGroupsCopied = sourceAccountGroupsCount,
        //                     CategoriesCopied = sourceCategoriesCount,
        //                     ItemsCompaniesCopied = sourceItemCompaniesCount,
        //                     MainUnitsCopied = sourceMainUnitsCount,
        //                     UnitsCopied = sourceUnitsCount,
        //                     CompositionsCopied = sourceCompositionsCount,
        //                     ItemsCopied = itemsCopied,
        //                     AccountsCopied = sourceAccountsCount,
        //                     TransactionsFoundForCopy = 0,
        //                     StockEntriesCopied = stockEntriesCopied,
        //                     OpeningBalancesCopied = openingBalancesCopied
        //                 }
        //             }
        //         };

        //         await onProgress(new SplitFiscalYearProgressEventDto
        //         {
        //             Type = "complete",
        //             Message = "Company split completed successfully",
        //             Data = result
        //         });

        //         _logger.LogInformation("Split completed successfully");
        //     }
        //     catch (Exception ex)
        //     {
        //         _logger.LogError(ex, "Error splitting company - rolling back transaction");
        //         await transaction.RollbackAsync(cancellationToken);

        //         await onProgress(new SplitFiscalYearProgressEventDto
        //         {
        //             Type = "error",
        //             Error = ex.Message,
        //             Details = ex.StackTrace
        //         });
        //         throw;
        //     }
        // }

        //------------------------------------------------------------end2

        // public async Task SplitFiscalYearAsync(
        //     SplitFiscalYearRequestDto request,
        //     Guid userId,
        //     Func<SplitFiscalYearProgressEventDto, Task> onProgress,
        //     CancellationToken cancellationToken = default)
        // {
        //     await onProgress(new SplitFiscalYearProgressEventDto
        //     {
        //         Type = "progress",
        //         Value = 5,
        //         Message = "Starting company split process..."
        //     });

        //     await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);

        //     // Counters
        //     int itemsCopied = 0;
        //     int stockEntriesCopied = 0;
        //     int itemCompositionsCopied = 0;
        //     int sourceAccountGroupsCount = 0;
        //     int sourceCategoriesCount = 0;
        //     int sourceItemCompaniesCount = 0;
        //     int sourceMainUnitsCount = 0;
        //     int sourceUnitsCount = 0;
        //     int sourceAccountsCount = 0;
        //     int openingBalancesCopied = 0;
        //     int initialOpeningBalancesCopied = 0;
        //     int sourceCompositionsCount = 0;

        //     try
        //     {
        //         _logger.LogInformation("=== Starting SplitFiscalYearAsync ===");
        //         _logger.LogInformation("SourceCompanyId: {SourceCompanyId}", request.SourceCompanyId);
        //         _logger.LogInformation("FiscalYearId: {FiscalYearId}", request.FiscalYearId);
        //         _logger.LogInformation("NewCompanyName: {NewCompanyName}", request.NewCompanyName);
        //         _logger.LogInformation("DeleteAfterSplit: {DeleteAfterSplit}", request.DeleteAfterSplit);

        //         // ============================================================
        //         // VALIDATION
        //         // ============================================================

        //         // Get source company
        //         var sourceCompany = await _context.Companies
        //             .FirstOrDefaultAsync(c => c.Id == request.SourceCompanyId, cancellationToken);

        //         if (sourceCompany == null)
        //         {
        //             await onProgress(new SplitFiscalYearProgressEventDto
        //             {
        //                 Type = "error",
        //                 Error = "Source company not found"
        //             });
        //             return;
        //         }

        //         // Get the fiscal year that will be split / moved / cloned.
        //         // In the current frontend flow, the user picks exactly one FY —
        //         // it serves as both the data source and the target.
        //         var splitFiscalYear = await _context.FiscalYears
        //             .FirstOrDefaultAsync(f => f.Id == request.FiscalYearId
        //                                    && f.CompanyId == request.SourceCompanyId, cancellationToken);

        //         if (splitFiscalYear == null)
        //         {
        //             await onProgress(new SplitFiscalYearProgressEventDto
        //             {
        //                 Type = "error",
        //                 Error = "Fiscal year not found in source company"
        //             });
        //             return;
        //         }

        //         // The target FY is the same as the split FY.
        //         var targetFiscalYear = splitFiscalYear;

        //         // Check if this is the only fiscal year in the source company.
        //         // - Move mode (deleteAfterSplit = true): forbidden — would leave source with 0 FYs.
        //         // - Clone mode (deleteAfterSplit = false): allowed — source keeps its only FY.
        //         var sourceFiscalYearCount = await _context.FiscalYears
        //             .CountAsync(f => f.CompanyId == request.SourceCompanyId, cancellationToken);

        //         if (request.DeleteAfterSplit && sourceFiscalYearCount <= 1)
        //         {
        //             await onProgress(new SplitFiscalYearProgressEventDto
        //             {
        //                 Type = "error",
        //                 Error = "Cannot remove the only fiscal year from the source company. " +
        //                         "Either disable 'Remove splited fiscal year?' or create another fiscal year first."
        //             });
        //             return;
        //         }

        //         // Check if new company name already exists for this user
        //         var existingCompany = await _context.Companies
        //             .AnyAsync(c => c.Name == request.NewCompanyName && c.OwnerId == userId, cancellationToken);

        //         if (existingCompany)
        //         {
        //             await onProgress(new SplitFiscalYearProgressEventDto
        //             {
        //                 Type = "error",
        //                 Error = "Company with this name already exists"
        //             });
        //             return;
        //         }

        //         // ============================================================
        //         // STEP 1: Create new company
        //         // ============================================================
        //         await onProgress(new SplitFiscalYearProgressEventDto
        //         {
        //             Type = "progress",
        //             Value = 10,
        //             Message = "Creating new company..."
        //         });

        //         var newCompany = new Company
        //         {
        //             Id = Guid.NewGuid(),
        //             Name = request.NewCompanyName,
        //             OwnerId = userId,
        //             TradeType = sourceCompany.TradeType,
        //             Address = sourceCompany.Address ?? string.Empty,
        //             Country = sourceCompany.Country ?? string.Empty,
        //             State = sourceCompany.State ?? string.Empty,
        //             City = sourceCompany.City ?? string.Empty,
        //             Ward = sourceCompany.Ward,
        //             Phone = sourceCompany.Phone ?? string.Empty,
        //             Pan = sourceCompany.Pan ?? string.Empty,
        //             Email = sourceCompany.Email ?? string.Empty,
        //             VatEnabled = sourceCompany.VatEnabled,
        //             DateFormat = sourceCompany.DateFormat,
        //             FiscalYearStartDateEnglish = targetFiscalYear.StartDate,
        //             FiscalYearStartDateNepali = targetFiscalYear.StartDateNepali ?? string.Empty,
        //             CreatedAt = DateTime.UtcNow,
        //             UpdatedAt = DateTime.UtcNow
        //         };

        //         _context.Companies.Add(newCompany);
        //         await _context.SaveChangesAsync(cancellationToken);
        //         _logger.LogInformation("New company created with ID: {CompanyId}", newCompany.Id);

        //         // ============================================================
        //         // STEP 2: Handle the target fiscal year.
        //         //   - deleteAfterSplit = true  → MOVE: source loses the FY
        //         //   - deleteAfterSplit = false → CLONE: source keeps the FY
        //         // ============================================================
        //         await onProgress(new SplitFiscalYearProgressEventDto
        //         {
        //             Type = "progress",
        //             Value = 15,
        //             Message = request.DeleteAfterSplit
        //                 ? "Moving fiscal year to new company..."
        //                 : "Cloning fiscal year to new company (source keeps original)..."
        //         });

        //         // Defensive: ensure BillPrefixes is not null
        //         targetFiscalYear.BillPrefixes ??= new BillPrefixes();

        //         FiscalYear newFiscalYear;

        //         if (request.DeleteAfterSplit)
        //         {
        //             // ✅ MOVE MODE — change CompanyId on the existing row
        //             _logger.LogInformation(
        //                 "MOVE mode: transferring FY {FiscalYearId} ({Name}) from company {SourceCompanyId} to {NewCompanyId}. " +
        //                 "BillPrefixes preserved — Sales: {Sales}, Purchase: {Purchase}, Payment: {Payment}",
        //                 targetFiscalYear.Id, targetFiscalYear.Name,
        //                 request.SourceCompanyId, newCompany.Id,
        //                 targetFiscalYear.BillPrefixes.Sales,
        //                 targetFiscalYear.BillPrefixes.Purchase,
        //                 targetFiscalYear.BillPrefixes.Payment);

        //             targetFiscalYear.CompanyId = newCompany.Id;
        //             targetFiscalYear.IsActive = true;

        //             _context.FiscalYears.Update(targetFiscalYear);
        //             await _context.SaveChangesAsync(cancellationToken);

        //             newFiscalYear = targetFiscalYear;

        //             _logger.LogInformation(
        //                 "Fiscal year {FiscalYearId} MOVED to new company {CompanyId}",
        //                 newFiscalYear.Id, newCompany.Id);
        //         }
        //         else
        //         {
        //             // ✅ CLONE MODE — create a new FY row for the new company.
        //             //    Source keeps its own FY intact.
        //             newFiscalYear = new FiscalYear
        //             {
        //                 Id = Guid.NewGuid(),
        //                 Name = targetFiscalYear.Name,
        //                 StartDate = targetFiscalYear.StartDate,
        //                 EndDate = targetFiscalYear.EndDate,
        //                 StartDateNepali = targetFiscalYear.StartDateNepali,
        //                 EndDateNepali = targetFiscalYear.EndDateNepali,
        //                 DateFormat = targetFiscalYear.DateFormat,
        //                 CompanyId = newCompany.Id,
        //                 IsActive = true,
        //                 // Copy all 11 prefixes exactly as-is from the source FY
        //                 BillPrefixes = new BillPrefixes
        //                 {
        //                     Sales = targetFiscalYear.BillPrefixes.Sales,
        //                     SalesQuotation = targetFiscalYear.BillPrefixes.SalesQuotation,
        //                     SalesReturn = targetFiscalYear.BillPrefixes.SalesReturn,
        //                     Purchase = targetFiscalYear.BillPrefixes.Purchase,
        //                     PurchaseReturn = targetFiscalYear.BillPrefixes.PurchaseReturn,
        //                     Payment = targetFiscalYear.BillPrefixes.Payment,
        //                     Receipt = targetFiscalYear.BillPrefixes.Receipt,
        //                     StockAdjustment = targetFiscalYear.BillPrefixes.StockAdjustment,
        //                     DebitNote = targetFiscalYear.BillPrefixes.DebitNote,
        //                     CreditNote = targetFiscalYear.BillPrefixes.CreditNote,
        //                     JournalVoucher = targetFiscalYear.BillPrefixes.JournalVoucher,
        //                 },
        //                 CreatedAt = DateTime.UtcNow
        //             };

        //             _context.FiscalYears.Add(newFiscalYear);
        //             await _context.SaveChangesAsync(cancellationToken);

        //             _logger.LogInformation(
        //                 "CLONE mode: created new FY {NewFiscalYearId} ({Name}) for company {NewCompanyId}. " +
        //                 "Source FY {SourceFiscalYearId} REMAINS in company {SourceCompanyId}. " +
        //                 "BillPrefixes cloned — Sales: {Sales}",
        //                 newFiscalYear.Id, newFiscalYear.Name, newCompany.Id,
        //                 targetFiscalYear.Id, request.SourceCompanyId,
        //                 newFiscalYear.BillPrefixes.Sales);
        //         }

        //         // ============================================================
        //         // STEP 3: Clone settings
        //         // ============================================================
        //         await onProgress(new SplitFiscalYearProgressEventDto
        //         {
        //             Type = "progress",
        //             Value = 20,
        //             Message = "Cloning settings..."
        //         });

        //         try
        //         {
        //             var sourceSettings = await _context.CompanySettings
        //                 .FirstOrDefaultAsync(s => s.CompanyId == request.SourceCompanyId
        //                                        && s.FiscalYearId == splitFiscalYear.Id, cancellationToken);

        //             if (sourceSettings != null)
        //             {
        //                 var newSettings = new Settings
        //                 {
        //                     Id = Guid.NewGuid(),
        //                     CompanyId = newCompany.Id,
        //                     UserId = userId,
        //                     FiscalYearId = newFiscalYear.Id,
        //                     RoundOffSales = sourceSettings.RoundOffSales,
        //                     RoundOffPurchase = sourceSettings.RoundOffPurchase,
        //                     RoundOffSalesReturn = sourceSettings.RoundOffSalesReturn,
        //                     RoundOffPurchaseReturn = sourceSettings.RoundOffPurchaseReturn,
        //                     DisplayTransactions = sourceSettings.DisplayTransactions,
        //                     DisplayTransactionsForPurchase = sourceSettings.DisplayTransactionsForPurchase,
        //                     DisplayTransactionsForSalesReturn = sourceSettings.DisplayTransactionsForSalesReturn,
        //                     DisplayTransactionsForPurchaseReturn = sourceSettings.DisplayTransactionsForPurchaseReturn,
        //                     UseVoucherLastDateForSales = sourceSettings.UseVoucherLastDateForSales,
        //                     UseVoucherLastDateForSalesReturn = sourceSettings.UseVoucherLastDateForSalesReturn,
        //                     UseVoucherLastDateForPurchase = sourceSettings.UseVoucherLastDateForPurchase,
        //                     UseVoucherLastDateForPurchaseReturn = sourceSettings.UseVoucherLastDateForPurchaseReturn,
        //                     UseVoucherLastDateForPayment = sourceSettings.UseVoucherLastDateForPayment,
        //                     UseVoucherLastDateForReceipt = sourceSettings.UseVoucherLastDateForReceipt,
        //                     UseVoucherLastDateForJournal = sourceSettings.UseVoucherLastDateForJournal,
        //                     UseVoucherLastDateForDebitNote = sourceSettings.UseVoucherLastDateForDebitNote,
        //                     UseVoucherLastDateForCreditNote = sourceSettings.UseVoucherLastDateForCreditNote,
        //                     UseVoucherLastDateForSalesQuotation = sourceSettings.UseVoucherLastDateForSalesQuotation,
        //                     UseVoucherLastDateForStockAdjustment = sourceSettings.UseVoucherLastDateForStockAdjustment,
        //                     StoreManagement = sourceSettings.StoreManagement,
        //                     Value = sourceSettings.Value,
        //                     CreatedAt = DateTime.UtcNow
        //                 };
        //                 _context.CompanySettings.Add(newSettings);
        //                 await _context.SaveChangesAsync(cancellationToken);
        //             }
        //         }
        //         catch (Exception ex)
        //         {
        //             _logger.LogWarning(ex, "Failed to clone settings, continuing with defaults");
        //         }

        //         // ============================================================
        //         // STEP 4: Clone account groups
        //         // ============================================================
        //         await onProgress(new SplitFiscalYearProgressEventDto
        //         {
        //             Type = "progress",
        //             Value = 25,
        //             Message = "Cloning account groups..."
        //         });

        //         var accountGroupMap = new Dictionary<Guid, Guid>();
        //         var sourceAccountGroups = await _context.AccountGroups
        //             .Where(g => g.CompanyId == request.SourceCompanyId)
        //             .ToListAsync(cancellationToken);

        //         sourceAccountGroupsCount = sourceAccountGroups.Count;

        //         foreach (var group in sourceAccountGroups)
        //         {
        //             var newGroup = new AccountGroup
        //             {
        //                 Id = Guid.NewGuid(),
        //                 Name = group.Name,
        //                 Type = group.Type,
        //                 CompanyId = newCompany.Id,
        //                 PrimaryGroup = group.PrimaryGroup,
        //                 CreatedAt = DateTime.UtcNow,
        //                 UpdatedAt = DateTime.UtcNow
        //             };
        //             _context.AccountGroups.Add(newGroup);
        //             accountGroupMap[group.Id] = newGroup.Id;
        //         }
        //         await _context.SaveChangesAsync(cancellationToken);
        //         _logger.LogInformation("Cloned {Count} account groups", sourceAccountGroups.Count);

        //         // ============================================================
        //         // STEP 5: Clone accounts (with OpeningBalance navigation)
        //         // ============================================================
        //         await onProgress(new SplitFiscalYearProgressEventDto
        //         {
        //             Type = "progress",
        //             Value = 35,
        //             Message = "Cloning accounts..."
        //         });

        //         var sourceAccounts = await _context.Accounts
        //             .Where(a => a.CompanyId == request.SourceCompanyId)
        //             .Include(a => a.OpeningBalance)
        //             .ToListAsync(cancellationToken);

        //         sourceAccountsCount = sourceAccounts.Count;
        //         var accountMap = new Dictionary<Guid, Guid>();

        //         foreach (var account in sourceAccounts)
        //         {
        //             var newAccountGroupId = accountGroupMap.TryGetValue(account.AccountGroupsId, out var mappedId)
        //                 ? mappedId
        //                 : account.AccountGroupsId;

        //             var newAccount = new Account
        //             {
        //                 Id = Guid.NewGuid(),
        //                 Name = account.Name,
        //                 Address = account.Address,
        //                 Ward = account.Ward,
        //                 Phone = account.Phone,
        //                 Pan = account.Pan,
        //                 ContactPerson = account.ContactPerson,
        //                 Email = account.Email,
        //                 UniqueNumber = account.UniqueNumber,
        //                 CreditLimit = account.CreditLimit,
        //                 AccountGroupsId = newAccountGroupId,
        //                 CompanyId = newCompany.Id,
        //                 OriginalFiscalYearId = newFiscalYear.Id,
        //                 OpeningBalanceType = account.OpeningBalanceType,
        //                 DefaultCashAccount = account.DefaultCashAccount,
        //                 IsActive = account.IsActive,
        //                 CreatedAt = DateTime.UtcNow,
        //                 UpdatedAt = DateTime.UtcNow,
        //                 Date = DateTime.UtcNow
        //             };

        //             if (account.OpeningBalance != null)
        //             {
        //                 newAccount.OpeningBalance = new OpeningBalance
        //                 {
        //                     Id = Guid.NewGuid(),
        //                     FiscalYearId = newFiscalYear.Id,
        //                     Amount = account.OpeningBalance.Amount,
        //                     Type = account.OpeningBalance.Type,
        //                     Date = splitFiscalYear.StartDate ?? DateTime.UtcNow,
        //                     AccountId = newAccount.Id,
        //                     CompanyId = newCompany.Id
        //                 };
        //             }

        //             _context.Accounts.Add(newAccount);
        //             accountMap[account.Id] = newAccount.Id;
        //         }
        //         await _context.SaveChangesAsync(cancellationToken);
        //         _logger.LogInformation("Cloned {Count} accounts", sourceAccounts.Count);

        //         // ============================================================
        //         // STEP 5.5: Create InitialOpeningBalance for the new company
        //         // ============================================================
        //         await onProgress(new SplitFiscalYearProgressEventDto
        //         {
        //             Type = "progress",
        //             Value = 38,
        //             Message = "Setting initial opening balances..."
        //         });

        //         var sourceInitialBalances = await _context.OpeningBalanceByFiscalYear
        //             .Where(ob => ob.FiscalYearId == splitFiscalYear.Id
        //                       && ob.CompanyId == request.SourceCompanyId)
        //             .Include(ob => ob.Account)
        //             .ToListAsync(cancellationToken);

        //         _logger.LogInformation("Found {Count} source opening balances to set as initial opening balances",
        //             sourceInitialBalances.Count);

        //         foreach (var openingBalance in sourceInitialBalances)
        //         {
        //             if (!accountMap.TryGetValue(openingBalance.AccountId, out var newAccountId))
        //             {
        //                 _logger.LogWarning("Account {AccountId} not found in accountMap, skipping initial opening balance",
        //                     openingBalance.AccountId);
        //                 continue;
        //             }

        //             var existingInitial = await _context.InitialOpeningBalances
        //                 .FirstOrDefaultAsync(iob => iob.AccountId == newAccountId, cancellationToken);

        //             if (existingInitial != null)
        //             {
        //                 existingInitial.Amount = openingBalance.Amount;
        //                 existingInitial.Type = openingBalance.Type;
        //                 existingInitial.Date = openingBalance.Date;
        //                 existingInitial.NepaliDate = openingBalance.NepaliDate;
        //                 existingInitial.CompanyId = newCompany.Id;
        //                 existingInitial.InitialFiscalYearId = newFiscalYear.Id;
        //             }
        //             else
        //             {
        //                 _context.InitialOpeningBalances.Add(new InitialOpeningBalance
        //                 {
        //                     Id = Guid.NewGuid(),
        //                     InitialFiscalYearId = newFiscalYear.Id,
        //                     AccountId = newAccountId,
        //                     CompanyId = newCompany.Id,
        //                     Amount = openingBalance.Amount,
        //                     Type = openingBalance.Type,
        //                     Date = openingBalance.Date,
        //                     NepaliDate = openingBalance.NepaliDate
        //                 });
        //             }

        //             initialOpeningBalancesCopied++;
        //         }

        //         await _context.SaveChangesAsync(cancellationToken);
        //         _logger.LogInformation("Created {Count} initial opening balances", initialOpeningBalancesCopied);

        //         // ============================================================
        //         // STEP 6: Clone OpeningBalanceByFiscalYear
        //         // ============================================================
        //         await onProgress(new SplitFiscalYearProgressEventDto
        //         {
        //             Type = "progress",
        //             Value = 40,
        //             Message = "Cloning opening balances to new fiscal year..."
        //         });

        //         var sourceOpeningBalances = await _context.OpeningBalanceByFiscalYear
        //             .Where(ob => ob.FiscalYearId == splitFiscalYear.Id && ob.CompanyId == request.SourceCompanyId)
        //             .Include(ob => ob.Account)
        //             .ToListAsync(cancellationToken);

        //         _logger.LogInformation("Found {Count} opening balances to clone", sourceOpeningBalances.Count);

        //         foreach (var openingBalance in sourceOpeningBalances)
        //         {
        //             if (!accountMap.TryGetValue(openingBalance.AccountId, out var newAccountId))
        //             {
        //                 _logger.LogWarning("Account {AccountId} not found in account map, skipping opening balance",
        //                     openingBalance.AccountId);
        //                 continue;
        //             }

        //             var existingOpeningBalance = await _context.OpeningBalanceByFiscalYear
        //                 .FirstOrDefaultAsync(ob => ob.AccountId == newAccountId
        //                                        && ob.FiscalYearId == newFiscalYear.Id, cancellationToken);

        //             if (existingOpeningBalance != null)
        //             {
        //                 existingOpeningBalance.Amount = openingBalance.Amount;
        //                 existingOpeningBalance.Type = openingBalance.Type;
        //                 existingOpeningBalance.Date = openingBalance.Date;
        //                 existingOpeningBalance.NepaliDate = openingBalance.NepaliDate;
        //                 existingOpeningBalance.CompanyId = newCompany.Id;
        //             }
        //             else
        //             {
        //                 _context.OpeningBalanceByFiscalYear.Add(new OpeningBalanceByFiscalYear
        //                 {
        //                     Id = Guid.NewGuid(),
        //                     AccountId = newAccountId,
        //                     FiscalYearId = newFiscalYear.Id,
        //                     CompanyId = newCompany.Id,
        //                     Amount = openingBalance.Amount,
        //                     Type = openingBalance.Type,
        //                     Date = openingBalance.Date,
        //                     NepaliDate = openingBalance.NepaliDate,
        //                 });
        //             }

        //             openingBalancesCopied++;
        //         }

        //         await _context.SaveChangesAsync(cancellationToken);
        //         _logger.LogInformation("Cloned {Count} opening balances", openingBalancesCopied);

        //         // ============================================================
        //         // STEP 7: Clone categories
        //         // ============================================================
        //         await onProgress(new SplitFiscalYearProgressEventDto
        //         {
        //             Type = "progress",
        //             Value = 45,
        //             Message = "Cloning categories..."
        //         });

        //         var categoryMap = new Dictionary<Guid, Guid>();

        //         var sourceCategories = await _context.Categories
        //             .Where(c => c.CompanyId == request.SourceCompanyId)
        //             .Where(c => c.OriginalFiscalYearId == splitFiscalYear.Id || c.FiscalYearId == splitFiscalYear.Id)
        //             .ToListAsync(cancellationToken);

        //         if (!sourceCategories.Any())
        //         {
        //             _logger.LogWarning("No categories found with OriginalFiscalYearId = {FiscalYearId}, fetching all categories for company", splitFiscalYear.Id);
        //             sourceCategories = await _context.Categories
        //                 .Where(c => c.CompanyId == request.SourceCompanyId)
        //                 .ToListAsync(cancellationToken);
        //         }

        //         sourceCategoriesCount = sourceCategories.Count;
        //         _logger.LogInformation("Found {Count} categories to clone", sourceCategories.Count);

        //         foreach (var category in sourceCategories)
        //         {
        //             var existingCategory = await _context.Categories
        //                 .FirstOrDefaultAsync(c => c.CompanyId == newCompany.Id && c.Name == category.Name, cancellationToken);

        //             if (existingCategory != null)
        //             {
        //                 categoryMap[category.Id] = existingCategory.Id;
        //                 continue;
        //             }

        //             var newCategory = new Category
        //             {
        //                 Id = Guid.NewGuid(),
        //                 Name = category.Name,
        //                 UniqueNumber = category.UniqueNumber,
        //                 CompanyId = newCompany.Id,
        //                 FiscalYearId = newFiscalYear.Id,
        //                 OriginalFiscalYearId = newFiscalYear.Id,
        //                 Date = DateTime.UtcNow,
        //                 NepaliDate = category.NepaliDate,
        //                 CreatedAt = DateTime.UtcNow
        //             };
        //             _context.Categories.Add(newCategory);
        //             categoryMap[category.Id] = newCategory.Id;
        //         }
        //         await _context.SaveChangesAsync(cancellationToken);
        //         _logger.LogInformation("Cloned {Count} categories", sourceCategories.Count);

        //         // ============================================================
        //         // STEP 8: Clone item companies
        //         // ============================================================
        //         await onProgress(new SplitFiscalYearProgressEventDto
        //         {
        //             Type = "progress",
        //             Value = 50,
        //             Message = "Cloning item companies..."
        //         });

        //         var itemCompanyMap = new Dictionary<Guid, Guid>();

        //         var sourceItemCompanies = await _context.ItemCompanies
        //             .Where(ic => ic.CompanyId == request.SourceCompanyId)
        //             .Where(ic => ic.OriginalFiscalYearId == splitFiscalYear.Id || ic.FiscalYearId == splitFiscalYear.Id)
        //             .ToListAsync(cancellationToken);

        //         if (!sourceItemCompanies.Any())
        //         {
        //             sourceItemCompanies = await _context.ItemCompanies
        //                 .Where(ic => ic.CompanyId == request.SourceCompanyId)
        //                 .ToListAsync(cancellationToken);
        //         }

        //         sourceItemCompaniesCount = sourceItemCompanies.Count;

        //         foreach (var itemCompany in sourceItemCompanies)
        //         {
        //             var existingItemCompany = await _context.ItemCompanies
        //                 .FirstOrDefaultAsync(ic => ic.CompanyId == newCompany.Id && ic.Name == itemCompany.Name, cancellationToken);

        //             if (existingItemCompany != null)
        //             {
        //                 itemCompanyMap[itemCompany.Id] = existingItemCompany.Id;
        //                 continue;
        //             }

        //             var newItemCompany = new ItemCompany
        //             {
        //                 Id = Guid.NewGuid(),
        //                 Name = itemCompany.Name,
        //                 UniqueNumber = itemCompany.UniqueNumber,
        //                 CompanyId = newCompany.Id,
        //                 FiscalYearId = newFiscalYear.Id,
        //                 OriginalFiscalYearId = newFiscalYear.Id,
        //                 Date = DateTime.UtcNow,
        //                 NepaliDate = itemCompany.NepaliDate,
        //                 CreatedAt = DateTime.UtcNow
        //             };
        //             _context.ItemCompanies.Add(newItemCompany);
        //             itemCompanyMap[itemCompany.Id] = newItemCompany.Id;
        //         }
        //         await _context.SaveChangesAsync(cancellationToken);
        //         _logger.LogInformation("Cloned {Count} item companies", sourceItemCompanies.Count);

        //         // ============================================================
        //         // STEP 9: Clone main units
        //         // ============================================================
        //         await onProgress(new SplitFiscalYearProgressEventDto
        //         {
        //             Type = "progress",
        //             Value = 53,
        //             Message = "Cloning main units..."
        //         });

        //         var mainUnitMap = new Dictionary<Guid, Guid>();

        //         var sourceMainUnits = await _context.MainUnits
        //             .Where(mu => mu.CompanyId == request.SourceCompanyId)
        //             .Where(mu => mu.OriginalFiscalYearId == splitFiscalYear.Id || mu.FiscalYearId == splitFiscalYear.Id)
        //             .ToListAsync(cancellationToken);

        //         if (!sourceMainUnits.Any())
        //         {
        //             sourceMainUnits = await _context.MainUnits
        //                 .Where(mu => mu.CompanyId == request.SourceCompanyId)
        //                 .ToListAsync(cancellationToken);
        //         }

        //         sourceMainUnitsCount = sourceMainUnits.Count;

        //         foreach (var mainUnit in sourceMainUnits)
        //         {
        //             var existingMainUnit = await _context.MainUnits
        //                 .FirstOrDefaultAsync(mu => mu.CompanyId == newCompany.Id &&
        //                     (mu.Name == mainUnit.Name || mu.UniqueNumber == mainUnit.UniqueNumber),
        //                     cancellationToken);

        //             if (existingMainUnit != null)
        //             {
        //                 mainUnitMap[mainUnit.Id] = existingMainUnit.Id;
        //                 continue;
        //             }

        //             var newMainUnit = new MainUnit
        //             {
        //                 Id = Guid.NewGuid(),
        //                 Name = mainUnit.Name,
        //                 UniqueNumber = mainUnit.UniqueNumber,
        //                 CompanyId = newCompany.Id,
        //                 FiscalYearId = newFiscalYear.Id,
        //                 OriginalFiscalYearId = newFiscalYear.Id,
        //                 Date = DateTime.UtcNow,
        //                 NepaliDate = mainUnit.NepaliDate,
        //                 CreatedAt = DateTime.UtcNow
        //             };
        //             _context.MainUnits.Add(newMainUnit);
        //             mainUnitMap[mainUnit.Id] = newMainUnit.Id;
        //         }
        //         await _context.SaveChangesAsync(cancellationToken);
        //         _logger.LogInformation("Cloned {Count} main units", sourceMainUnits.Count);

        //         // ============================================================
        //         // STEP 10: Clone units
        //         // ============================================================
        //         await onProgress(new SplitFiscalYearProgressEventDto
        //         {
        //             Type = "progress",
        //             Value = 55,
        //             Message = "Cloning units..."
        //         });

        //         var unitMap = new Dictionary<Guid, Guid>();

        //         var sourceUnits = await _context.Units
        //             .Where(u => u.CompanyId == request.SourceCompanyId)
        //             .Where(u => u.OriginalFiscalYearId == splitFiscalYear.Id || u.FiscalYearId == splitFiscalYear.Id)
        //             .ToListAsync(cancellationToken);

        //         if (!sourceUnits.Any())
        //         {
        //             sourceUnits = await _context.Units
        //                 .Where(u => u.CompanyId == request.SourceCompanyId)
        //                 .ToListAsync(cancellationToken);
        //         }

        //         sourceUnitsCount = sourceUnits.Count;

        //         foreach (var unit in sourceUnits)
        //         {
        //             var existingUnit = await _context.Units
        //                 .FirstOrDefaultAsync(u => u.CompanyId == newCompany.Id && u.Name == unit.Name, cancellationToken);

        //             if (existingUnit != null)
        //             {
        //                 unitMap[unit.Id] = existingUnit.Id;
        //                 continue;
        //             }

        //             var newUnit = new Unit
        //             {
        //                 Id = Guid.NewGuid(),
        //                 Name = unit.Name,
        //                 UniqueNumber = unit.UniqueNumber,
        //                 CompanyId = newCompany.Id,
        //                 FiscalYearId = newFiscalYear.Id,
        //                 OriginalFiscalYearId = newFiscalYear.Id,
        //                 Date = DateTime.UtcNow,
        //                 NepaliDate = unit.NepaliDate,
        //                 CreatedAt = DateTime.UtcNow
        //             };
        //             _context.Units.Add(newUnit);
        //             unitMap[unit.Id] = newUnit.Id;
        //         }
        //         await _context.SaveChangesAsync(cancellationToken);
        //         _logger.LogInformation("Cloned {Count} units", sourceUnits.Count);

        //         // ============================================================
        //         // STEP 10.5: Clone compositions
        //         // ============================================================
        //         await onProgress(new SplitFiscalYearProgressEventDto
        //         {
        //             Type = "progress",
        //             Value = 58,
        //             Message = "Cloning compositions..."
        //         });

        //         var compositionMap = new Dictionary<Guid, Guid>();

        //         var sourceCompositions = await _context.Compositions
        //             .Where(c => c.CompanyId == request.SourceCompanyId)
        //             .Where(c => c.OriginalFiscalYearId == splitFiscalYear.Id || c.FiscalYearId == splitFiscalYear.Id)
        //             .ToListAsync(cancellationToken);

        //         if (!sourceCompositions.Any())
        //         {
        //             sourceCompositions = await _context.Compositions
        //                 .Where(c => c.CompanyId == request.SourceCompanyId)
        //                 .ToListAsync(cancellationToken);
        //         }

        //         sourceCompositionsCount = sourceCompositions.Count;

        //         foreach (var composition in sourceCompositions)
        //         {
        //             var existingComposition = await _context.Compositions
        //                 .FirstOrDefaultAsync(c => c.CompanyId == newCompany.Id &&
        //                     (c.Name == composition.Name || c.UniqueNumber == composition.UniqueNumber),
        //                     cancellationToken);

        //             if (existingComposition != null)
        //             {
        //                 compositionMap[composition.Id] = existingComposition.Id;
        //                 continue;
        //             }

        //             var newComposition = new Composition
        //             {
        //                 Id = Guid.NewGuid(),
        //                 Name = composition.Name,
        //                 UniqueNumber = composition.UniqueNumber,
        //                 CompanyId = newCompany.Id,
        //                 FiscalYearId = newFiscalYear.Id,
        //                 OriginalFiscalYearId = newFiscalYear.Id,
        //                 Date = DateTime.UtcNow,
        //                 NepaliDate = composition.NepaliDate,
        //                 CreatedAt = DateTime.UtcNow,
        //                 UpdatedAt = DateTime.UtcNow
        //             };
        //             _context.Compositions.Add(newComposition);
        //             compositionMap[composition.Id] = newComposition.Id;
        //         }
        //         await _context.SaveChangesAsync(cancellationToken);
        //         _logger.LogInformation("Cloned {Count} compositions", sourceCompositions.Count);

        //         // ============================================================
        //         // STEP 11: Clone items with stock entries AND item-composition links
        //         // ============================================================
        //         await onProgress(new SplitFiscalYearProgressEventDto
        //         {
        //             Type = "progress",
        //             Value = 60,
        //             Message = "Cloning items with stock entries..."
        //         });

        //         var sourceItems = await _context.Items
        //             .Where(i => i.CompanyId == request.SourceCompanyId)
        //             .Where(i => i.OriginalFiscalYearId == splitFiscalYear.Id || i.CreatedAt >= splitFiscalYear.StartDate)
        //             .Include(i => i.StockEntries)
        //             .Include(i => i.ItemCompositions)
        //             .ToListAsync(cancellationToken);

        //         if (!sourceItems.Any())
        //         {
        //             sourceItems = await _context.Items
        //                 .Where(i => i.CompanyId == request.SourceCompanyId)
        //                 .Include(i => i.StockEntries)
        //                 .Include(i => i.ItemCompositions)
        //                 .ToListAsync(cancellationToken);
        //         }

        //         _logger.LogInformation("Found {Count} items to clone", sourceItems.Count);

        //         foreach (var item in sourceItems)
        //         {
        //             try
        //             {
        //                 var newCategoryId = categoryMap.TryGetValue(item.CategoryId, out var catId) ? catId : item.CategoryId;
        //                 var newItemCompanyId = itemCompanyMap.TryGetValue(item.ItemsCompanyId, out var icId) ? icId : item.ItemsCompanyId;
        //                 var newUnitId = unitMap.TryGetValue(item.UnitId, out var uId) ? uId : item.UnitId;
        //                 var newMainUnitId = mainUnitMap.TryGetValue(item.MainUnitId ?? Guid.Empty, out var muId) ? muId : item.MainUnitId;

        //                 var newItem = new Item
        //                 {
        //                     Id = Guid.NewGuid(),
        //                     Name = item.Name,
        //                     Hscode = item.Hscode,
        //                     CategoryId = newCategoryId,
        //                     ItemsCompanyId = newItemCompanyId,
        //                     Price = item.Price,
        //                     PuPrice = item.PuPrice,
        //                     MainUnitPuPrice = item.MainUnitPuPrice,
        //                     MainUnitId = newMainUnitId,
        //                     WsUnit = item.WsUnit,
        //                     UnitId = newUnitId,
        //                     VatStatus = item.VatStatus,
        //                     OpeningStock = item.OpeningStock,
        //                     MinStock = item.MinStock,
        //                     MaxStock = item.MaxStock,
        //                     ReorderLevel = item.ReorderLevel,
        //                     UniqueNumber = item.UniqueNumber,
        //                     BarcodeNumber = item.BarcodeNumber,
        //                     CompanyId = newCompany.Id,
        //                     OriginalFiscalYearId = newFiscalYear.Id,
        //                     Status = item.Status,
        //                     CreatedAt = DateTime.UtcNow,
        //                     Date = DateTime.UtcNow,
        //                     UpdatedAt = DateTime.UtcNow
        //                 };

        //                 _context.Items.Add(newItem);
        //                 itemsCopied++;

        //                 // Clone ItemCompositions (junction)
        //                 if (item.ItemCompositions != null && item.ItemCompositions.Any())
        //                 {
        //                     foreach (var itemComposition in item.ItemCompositions)
        //                     {
        //                         if (!compositionMap.TryGetValue(itemComposition.CompositionId, out var newCompositionId))
        //                         {
        //                             _logger.LogWarning(
        //                                 "Composition {CompositionId} for item {ItemName} not found in compositionMap, skipping link",
        //                                 itemComposition.CompositionId, item.Name);
        //                             continue;
        //                         }

        //                         _context.ItemCompositions.Add(new ItemComposition
        //                         {
        //                             ItemId = newItem.Id,
        //                             CompositionId = newCompositionId,
        //                             CreatedAt = DateTime.UtcNow
        //                         });
        //                         itemCompositionsCopied++;
        //                     }
        //                 }

        //                 // Clone StockEntries
        //                 if (item.StockEntries != null && item.StockEntries.Any())
        //                 {
        //                     foreach (var stockEntry in item.StockEntries)
        //                     {
        //                         var newStockEntry = new StockEntry
        //                         {
        //                             Id = Guid.NewGuid(),
        //                             ItemId = newItem.Id,
        //                             Date = DateTime.UtcNow,
        //                             WsUnit = stockEntry.WsUnit,
        //                             Quantity = stockEntry.Quantity,
        //                             BillQty = stockEntry.BillQty,
        //                             ActualQty = stockEntry.ActualQty,
        //                             Bonus = stockEntry.Bonus,
        //                             BatchNumber = stockEntry.BatchNumber ?? "XXX",
        //                             ExpiryDate = stockEntry.ExpiryDate,
        //                             Price = stockEntry.Price,
        //                             NetPrice = stockEntry.NetPrice,
        //                             PuPrice = stockEntry.PuPrice,
        //                             CcPercentage = stockEntry.CcPercentage,
        //                             ItemCcAmount = stockEntry.ItemCcAmount,
        //                             DiscountPercentagePerItem = stockEntry.DiscountPercentagePerItem,
        //                             DiscountAmountPerItem = stockEntry.DiscountAmountPerItem,
        //                             NetPuPrice = stockEntry.NetPuPrice,
        //                             MainUnitPuPrice = stockEntry.MainUnitPuPrice,
        //                             Mrp = stockEntry.Mrp,
        //                             MarginPercentage = stockEntry.MarginPercentage,
        //                             Currency = stockEntry.Currency,
        //                             CompanyId = newCompany.Id,
        //                             FiscalYearId = newFiscalYear.Id,
        //                             UniqueUuid = stockEntry.UniqueUuid,
        //                             PurchaseBillId = null,
        //                             SalesReturnBillId = null,
        //                             ExpiryStatus = stockEntry.ExpiryStatus,
        //                             DaysUntilExpiry = stockEntry.DaysUntilExpiry,
        //                             StoreId = stockEntry.StoreId,
        //                             RackId = stockEntry.RackId,
        //                             SourceTransferFromStoreId = null,
        //                             SourceTransferOriginalEntryId = null,
        //                             SourceTransferDate = null,
        //                             NepaliDate = stockEntry.NepaliDate,
        //                             CreatedAt = DateTime.UtcNow,
        //                             UpdatedAt = DateTime.UtcNow
        //                         };
        //                         _context.StockEntries.Add(newStockEntry);
        //                         stockEntriesCopied++;
        //                     }
        //                 }
        //             }
        //             catch (Exception ex)
        //             {
        //                 _logger.LogError(ex, "Error cloning item {Name} (ID: {Id})", item.Name, item.Id);
        //             }
        //         }

        //         await _context.SaveChangesAsync(cancellationToken);
        //         _logger.LogInformation("Cloned {Count} items with {StockCount} stock entries and {CompCount} composition links",
        //             itemsCopied, stockEntriesCopied, itemCompositionsCopied);

        //         // ============================================================
        //         // DELETE BLOCK
        //         // In the current flow, the split FY == the target FY, so no separate
        //         // deletion is needed:
        //         //   - MOVE mode:  source already lost the FY when we changed CompanyId
        //         //   - CLONE mode: source intentionally keeps its own FY
        //         // The block below handles the advanced case where the caller passes
        //         // a different FiscalYearId (the delete case becomes meaningful).
        //         // ============================================================
        //         if (request.DeleteAfterSplit && splitFiscalYear.Id != targetFiscalYear.Id)
        //         {
        //             await onProgress(new SplitFiscalYearProgressEventDto
        //             {
        //                 Type = "progress",
        //                 Value = 85,
        //                 Message = "Removing split fiscal year from source company..."
        //             });

        //             _logger.LogInformation(
        //                 "DeleteAfterSplit=true and split FY ({SplitFyId}) != target FY ({TargetFyId}). " +
        //                 "Deleting split FY from source company {SourceCompanyId}.",
        //                 splitFiscalYear.Id, targetFiscalYear.Id, request.SourceCompanyId);

        //             try
        //             {
        //                 // Check if this is the only fiscal year for the company
        //                 var fiscalYearCount = await _context.FiscalYears
        //                     .CountAsync(f => f.CompanyId == request.SourceCompanyId, cancellationToken);

        //                 if (fiscalYearCount <= 1)
        //                 {
        //                     await onProgress(new SplitFiscalYearProgressEventDto
        //                     {
        //                         Type = "error",
        //                         Error = "Cannot delete the last remaining fiscal year in the source company.",
        //                         Message = "The company must have at least one fiscal year."
        //                     });
        //                     await transaction.RollbackAsync(cancellationToken);
        //                     return;
        //                 }

        //                 // 1. Get transaction IDs
        //                 var transactionIds = await _context.Transactions
        //                     .Where(t => t.FiscalYearId == splitFiscalYear.Id)
        //                     .Select(t => t.Id)
        //                     .ToListAsync(cancellationToken);

        //                 // 2. Delete TransactionItems
        //                 if (transactionIds.Any())
        //                 {
        //                     var transactionItemsToDelete = await _context.TransactionItems
        //                         .Where(ti => transactionIds.Contains(ti.TransactionId))
        //                         .ToListAsync(cancellationToken);

        //                     if (transactionItemsToDelete.Any())
        //                     {
        //                         _context.TransactionItems.RemoveRange(transactionItemsToDelete);
        //                         await _context.SaveChangesAsync(cancellationToken);
        //                     }

        //                     // 3. Delete Transactions
        //                     var transactionsToDelete = await _context.Transactions
        //                         .Where(t => t.FiscalYearId == splitFiscalYear.Id)
        //                         .ToListAsync(cancellationToken);

        //                     if (transactionsToDelete.Any())
        //                     {
        //                         _context.Transactions.RemoveRange(transactionsToDelete);
        //                         await _context.SaveChangesAsync(cancellationToken);
        //                     }
        //                 }

        //                 // 4. Delete OpeningBalanceByFiscalYear
        //                 var openingBalancesToDelete = await _context.OpeningBalanceByFiscalYear
        //                     .Where(ob => ob.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);
        //                 if (openingBalancesToDelete.Any())
        //                 {
        //                     _context.OpeningBalanceByFiscalYear.RemoveRange(openingBalancesToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 5. Delete ClosingBalanceByFiscalYear
        //                 var closingBalancesToDelete = await _context.ClosingBalanceByFiscalYear
        //                     .Where(cb => cb.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);
        //                 if (closingBalancesToDelete.Any())
        //                 {
        //                     _context.ClosingBalanceByFiscalYear.RemoveRange(closingBalancesToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 6. Delete OpeningBalances
        //                 var openingBalances = await _context.OpeningBalances
        //                     .Where(ob => ob.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);
        //                 if (openingBalances.Any())
        //                 {
        //                     _context.OpeningBalances.RemoveRange(openingBalances);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 7. ItemOpeningStockByFiscalYear
        //                 var itemOpeningStocksToDelete = await _context.ItemOpeningStockByFiscalYear
        //                     .Where(ios => ios.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);
        //                 if (itemOpeningStocksToDelete.Any())
        //                 {
        //                     _context.ItemOpeningStockByFiscalYear.RemoveRange(itemOpeningStocksToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 8. ItemClosingStockByFiscalYear
        //                 var itemClosingStocksToDelete = await _context.ItemClosingStockByFiscalYear
        //                     .Where(ics => ics.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);
        //                 if (itemClosingStocksToDelete.Any())
        //                 {
        //                     _context.ItemClosingStockByFiscalYear.RemoveRange(itemClosingStocksToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 9. SalesBillItems → SalesBills
        //                 var salesBillItemsToDelete = await _context.SalesBillItems
        //                     .Where(sbi => sbi.SalesBill != null && sbi.SalesBill.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);
        //                 if (salesBillItemsToDelete.Any())
        //                 {
        //                     _context.SalesBillItems.RemoveRange(salesBillItemsToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }
        //                 var salesBillsToDelete = await _context.SalesBills
        //                     .Where(sb => sb.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);
        //                 if (salesBillsToDelete.Any())
        //                 {
        //                     _context.SalesBills.RemoveRange(salesBillsToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 10. PurchaseBillItems → PurchaseBills
        //                 var purchaseBillItemsToDelete = await _context.PurchaseBillItems
        //                     .Where(pbi => pbi.PurchaseBill != null && pbi.PurchaseBill.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);
        //                 if (purchaseBillItemsToDelete.Any())
        //                 {
        //                     _context.PurchaseBillItems.RemoveRange(purchaseBillItemsToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }
        //                 var purchaseBillsToDelete = await _context.PurchaseBills
        //                     .Where(pb => pb.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);
        //                 if (purchaseBillsToDelete.Any())
        //                 {
        //                     _context.PurchaseBills.RemoveRange(purchaseBillsToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 11. SalesReturnItems → SalesReturns
        //                 var salesReturnItemsToDelete = await _context.SalesReturnItems
        //                     .Where(sri => sri.SalesReturn != null && sri.SalesReturn.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);
        //                 if (salesReturnItemsToDelete.Any())
        //                 {
        //                     _context.SalesReturnItems.RemoveRange(salesReturnItemsToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }
        //                 var salesReturnsToDelete = await _context.SalesReturns
        //                     .Where(sr => sr.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);
        //                 if (salesReturnsToDelete.Any())
        //                 {
        //                     _context.SalesReturns.RemoveRange(salesReturnsToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 12. PurchaseReturnItems → PurchaseReturns
        //                 var purchaseReturnItemsToDelete = await _context.PurchaseReturnItems
        //                     .Where(pri => pri.PurchaseReturn != null && pri.PurchaseReturn.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);
        //                 if (purchaseReturnItemsToDelete.Any())
        //                 {
        //                     _context.PurchaseReturnItems.RemoveRange(purchaseReturnItemsToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }
        //                 var purchaseReturnsToDelete = await _context.PurchaseReturns
        //                     .Where(pr => pr.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);
        //                 if (purchaseReturnsToDelete.Any())
        //                 {
        //                     _context.PurchaseReturns.RemoveRange(purchaseReturnsToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 13. PaymentEntries → Payments
        //                 var paymentEntriesToDelete = await _context.PaymentEntries
        //                     .Where(pe => pe.Payment != null && pe.Payment.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);
        //                 if (paymentEntriesToDelete.Any())
        //                 {
        //                     _context.PaymentEntries.RemoveRange(paymentEntriesToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }
        //                 var paymentsToDelete = await _context.Payments
        //                     .Where(p => p.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);
        //                 if (paymentsToDelete.Any())
        //                 {
        //                     _context.Payments.RemoveRange(paymentsToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 14. ReceiptEntries → Receipts
        //                 var receiptEntriesToDelete = await _context.ReceiptEntries
        //                     .Where(re => re.Receipt != null && re.Receipt.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);
        //                 if (receiptEntriesToDelete.Any())
        //                 {
        //                     _context.ReceiptEntries.RemoveRange(receiptEntriesToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }
        //                 var receiptsToDelete = await _context.Receipts
        //                     .Where(r => r.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);
        //                 if (receiptsToDelete.Any())
        //                 {
        //                     _context.Receipts.RemoveRange(receiptsToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 15. JournalEntries → JournalVouchers
        //                 var journalEntriesToDelete = await _context.JournalEntries
        //                     .Where(je => je.JournalVoucher != null && je.JournalVoucher.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);
        //                 if (journalEntriesToDelete.Any())
        //                 {
        //                     _context.JournalEntries.RemoveRange(journalEntriesToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }
        //                 var journalVouchersToDelete = await _context.JournalVouchers
        //                     .Where(jv => jv.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);
        //                 if (journalVouchersToDelete.Any())
        //                 {
        //                     _context.JournalVouchers.RemoveRange(journalVouchersToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 16. DebitNoteEntries → DebitNotes
        //                 var debitNoteEntriesToDelete = await _context.DebitNoteEntries
        //                     .Where(dne => dne.DebitNote != null && dne.DebitNote.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);
        //                 if (debitNoteEntriesToDelete.Any())
        //                 {
        //                     _context.DebitNoteEntries.RemoveRange(debitNoteEntriesToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }
        //                 var debitNotesToDelete = await _context.DebitNotes
        //                     .Where(dn => dn.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);
        //                 if (debitNotesToDelete.Any())
        //                 {
        //                     _context.DebitNotes.RemoveRange(debitNotesToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 17. CreditNoteEntries → CreditNotes
        //                 var creditNoteEntriesToDelete = await _context.CreditNoteEntries
        //                     .Where(cne => cne.CreditNote != null && cne.CreditNote.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);
        //                 if (creditNoteEntriesToDelete.Any())
        //                 {
        //                     _context.CreditNoteEntries.RemoveRange(creditNoteEntriesToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }
        //                 var creditNotesToDelete = await _context.CreditNotes
        //                     .Where(cn => cn.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);
        //                 if (creditNotesToDelete.Any())
        //                 {
        //                     _context.CreditNotes.RemoveRange(creditNotesToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 18. StockAdjustmentItems → StockAdjustments
        //                 var stockAdjustmentItemsToDelete = await _context.StockAdjustmentItems
        //                     .Where(sai => sai.StockAdjustment != null && sai.StockAdjustment.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);
        //                 if (stockAdjustmentItemsToDelete.Any())
        //                 {
        //                     _context.StockAdjustmentItems.RemoveRange(stockAdjustmentItemsToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }
        //                 var stockAdjustmentsToDelete = await _context.StockAdjustments
        //                     .Where(sa => sa.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);
        //                 if (stockAdjustmentsToDelete.Any())
        //                 {
        //                     _context.StockAdjustments.RemoveRange(stockAdjustmentsToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 19. SalesQuotationItems → SalesQuotations
        //                 var salesQuotationItemsToDelete = await _context.SalesQuotationItems
        //                     .Where(sqi => sqi.SalesQuotation != null && sqi.SalesQuotation.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);
        //                 if (salesQuotationItemsToDelete.Any())
        //                 {
        //                     _context.SalesQuotationItems.RemoveRange(salesQuotationItemsToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }
        //                 var salesQuotationsToDelete = await _context.SalesQuotations
        //                     .Where(sq => sq.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);
        //                 if (salesQuotationsToDelete.Any())
        //                 {
        //                     _context.SalesQuotations.RemoveRange(salesQuotationsToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 20. StockEntries
        //                 var stockEntriesToDelete = await _context.StockEntries
        //                     .Where(se => se.CompanyId == request.SourceCompanyId && se.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);
        //                 if (stockEntriesToDelete.Any())
        //                 {
        //                     _context.StockEntries.RemoveRange(stockEntriesToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 21. BillCounters
        //                 var billCountersToDelete = await _context.BillCounters
        //                     .Where(bc => bc.CompanyId == request.SourceCompanyId && bc.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);
        //                 if (billCountersToDelete.Any())
        //                 {
        //                     _context.BillCounters.RemoveRange(billCountersToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 22. CompanySettings
        //                 var settingsToDelete = await _context.CompanySettings
        //                     .Where(s => s.CompanyId == request.SourceCompanyId && s.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);
        //                 if (settingsToDelete.Any())
        //                 {
        //                     _context.CompanySettings.RemoveRange(settingsToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 23. Update items — remove OriginalFiscalYearId
        //                 var itemsToUpdate = await _context.Items
        //                     .Where(i => i.CompanyId == request.SourceCompanyId && i.OriginalFiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);
        //                 if (itemsToUpdate.Any())
        //                 {
        //                     foreach (var item in itemsToUpdate)
        //                         item.OriginalFiscalYearId = null;
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 24. Update accounts — remove OriginalFiscalYearId
        //                 var accountsToUpdate = await _context.Accounts
        //                     .Where(a => a.CompanyId == request.SourceCompanyId && a.OriginalFiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);
        //                 if (accountsToUpdate.Any())
        //                 {
        //                     foreach (var account in accountsToUpdate)
        //                         account.OriginalFiscalYearId = null;
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 25. Update Users — reassign to another fiscal year
        //                 var usersToUpdate = await _context.Users
        //                     .Where(u => u.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);
        //                 if (usersToUpdate.Any())
        //                 {
        //                     var otherFiscalYear = await _context.FiscalYears
        //                         .FirstOrDefaultAsync(f => f.CompanyId == request.SourceCompanyId
        //                                                && f.Id != splitFiscalYear.Id, cancellationToken);

        //                     foreach (var user in usersToUpdate)
        //                     {
        //                         user.FiscalYearId = otherFiscalYear?.Id;
        //                         user.UpdatedAt = DateTime.UtcNow;
        //                     }
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 26. Delete categories
        //                 var categoriesToDelete = await _context.Categories
        //                     .Where(c => c.CompanyId == request.SourceCompanyId && c.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);
        //                 if (categoriesToDelete.Any())
        //                 {
        //                     _context.Categories.RemoveRange(categoriesToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 27. Delete item companies
        //                 var itemCompaniesToDelete = await _context.ItemCompanies
        //                     .Where(ic => ic.CompanyId == request.SourceCompanyId && ic.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);
        //                 if (itemCompaniesToDelete.Any())
        //                 {
        //                     _context.ItemCompanies.RemoveRange(itemCompaniesToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 28. Delete main units
        //                 var mainUnitsToDelete = await _context.MainUnits
        //                     .Where(mu => mu.CompanyId == request.SourceCompanyId && mu.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);
        //                 if (mainUnitsToDelete.Any())
        //                 {
        //                     _context.MainUnits.RemoveRange(mainUnitsToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 29. Delete units
        //                 var unitsToDelete = await _context.Units
        //                     .Where(u => u.CompanyId == request.SourceCompanyId && u.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);
        //                 if (unitsToDelete.Any())
        //                 {
        //                     _context.Units.RemoveRange(unitsToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 30. Finally delete the split fiscal year itself
        //                 _context.FiscalYears.Remove(splitFiscalYear);
        //                 await _context.SaveChangesAsync(cancellationToken);

        //                 _logger.LogInformation("Successfully deleted fiscal year {FiscalYearId} from source company", splitFiscalYear.Id);

        //                 await onProgress(new SplitFiscalYearProgressEventDto
        //                 {
        //                     Type = "progress",
        //                     Value = 95,
        //                     Message = "Split fiscal year removed from source company"
        //                 });
        //             }
        //             catch (Exception ex)
        //             {
        //                 _logger.LogError(ex, "Error during deletion of fiscal year");
        //                 await onProgress(new SplitFiscalYearProgressEventDto
        //                 {
        //                     Type = "error",
        //                     Error = $"Failed to delete fiscal year: {ex.Message}",
        //                     Details = ex.StackTrace
        //                 });
        //                 throw;
        //             }
        //         }
        //         else
        //         {
        //             _logger.LogInformation(
        //                 "Skipping delete block. DeleteAfterSplit={Delete}, SplitFyId={SplitFyId}, TargetFyId={TargetFyId}. " +
        //                 "MOVE or CLONE in Step 2 already handled the source-company state correctly.",
        //                 request.DeleteAfterSplit, splitFiscalYear.Id, targetFiscalYear.Id);
        //         }

        //         // ============================================================
        //         // STEP 12: Ensure BillCounters exist for the moved/cloned fiscal year
        //         //          (idempotent — only creates missing ones)
        //         // ============================================================
        //         await onProgress(new SplitFiscalYearProgressEventDto
        //         {
        //             Type = "progress",
        //             Value = 80,
        //             Message = "Ensuring bill counters..."
        //         });

        //         var transactionTypes = new[]
        //         {
        //     "Sales", "Purchase", "SalesReturn", "PurchaseReturn",
        //     "Payment", "Receipt", "Journal", "DebitNote", "CreditNote", "StockAdjustment"
        // };

        //         foreach (var transactionType in transactionTypes)
        //         {
        //             var existingCounter = await _context.BillCounters
        //                 .FirstOrDefaultAsync(bc => bc.CompanyId == newCompany.Id
        //                                         && bc.FiscalYearId == newFiscalYear.Id
        //                                         && bc.TransactionType == transactionType,
        //                     cancellationToken);

        //             if (existingCounter == null)
        //             {
        //                 _context.BillCounters.Add(new BillCounter
        //                 {
        //                     Id = Guid.NewGuid(),
        //                     CompanyId = newCompany.Id,
        //                     FiscalYearId = newFiscalYear.Id,
        //                     TransactionType = transactionType,
        //                     CurrentBillNumber = 0,
        //                     CreatedAt = DateTime.UtcNow
        //                 });
        //             }
        //         }
        //         await _context.SaveChangesAsync(cancellationToken);

        //         // Commit transaction
        //         await transaction.CommitAsync(cancellationToken);
        //         _logger.LogInformation("Transaction committed successfully");

        //         // ============================================================
        //         // Prepare result
        //         // ============================================================
        //         var result = new SplitFiscalYearResultDto
        //         {
        //             Success = true,
        //             Message = request.DeleteAfterSplit
        //                 ? $"Company split successfully. New company \"{request.NewCompanyName}\" created and fiscal year moved from source company."
        //                 : $"Company split successfully. New company \"{request.NewCompanyName}\" created. Source company kept its fiscal year.",
        //             Data = new SplitFiscalYearDataDto
        //             {
        //                 NewCompany = new NewCompanyInfoDto
        //                 {
        //                     Id = newCompany.Id,
        //                     Name = newCompany.Name
        //                 },
        //                 NewFiscalYear = new NewFiscalYearInfoDto
        //                 {
        //                     Id = newFiscalYear.Id,
        //                     Name = newFiscalYear.Name
        //                 },
        //                 Statistics = new SplitStatisticsDto
        //                 {
        //                     UsersCopied = 1,
        //                     CompanyGroupsCopied = sourceAccountGroupsCount,
        //                     CategoriesCopied = sourceCategoriesCount,
        //                     ItemsCompaniesCopied = sourceItemCompaniesCount,
        //                     MainUnitsCopied = sourceMainUnitsCount,
        //                     UnitsCopied = sourceUnitsCount,
        //                     CompositionsCopied = sourceCompositionsCount,
        //                     ItemsCopied = itemsCopied,
        //                     AccountsCopied = sourceAccountsCount,
        //                     TransactionsFoundForCopy = 0,
        //                     StockEntriesCopied = stockEntriesCopied,
        //                     OpeningBalancesCopied = openingBalancesCopied
        //                 }
        //             }
        //         };

        //         await onProgress(new SplitFiscalYearProgressEventDto
        //         {
        //             Type = "complete",
        //             Message = "Company split completed successfully",
        //             Data = result
        //         });

        //         _logger.LogInformation("Split completed successfully");
        //     }
        //     catch (Exception ex)
        //     {
        //         _logger.LogError(ex, "Error splitting company - rolling back transaction");
        //         await transaction.RollbackAsync(cancellationToken);

        //         await onProgress(new SplitFiscalYearProgressEventDto
        //         {
        //             Type = "error",
        //             Error = ex.Message,
        //             Details = ex.StackTrace
        //         });
        //         throw;
        //     }
        // }


        //----------------------------------------------------------end3
        public async Task SplitFiscalYearAsync(
            SplitFiscalYearRequestDto request,
            Guid userId,
            Func<SplitFiscalYearProgressEventDto, Task> onProgress,
            CancellationToken cancellationToken = default)
        {
            await onProgress(new SplitFiscalYearProgressEventDto
            {
                Type = "progress",
                Value = 5,
                Message = "Starting company split process..."
            });

            await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);

            // Counters
            int itemsCopied = 0;
            int stockEntriesCopied = 0;
            int itemCompositionsCopied = 0;
            int initialOpeningStocksCopied = 0;
            int openingStocksByFyCopied = 0;
            int closingStocksByFyCopied = 0;
            int sourceAccountGroupsCount = 0;
            int sourceCategoriesCount = 0;
            int sourceItemCompaniesCount = 0;
            int sourceMainUnitsCount = 0;
            int sourceUnitsCount = 0;
            int sourceAccountsCount = 0;
            int openingBalancesCopied = 0;
            int initialOpeningBalancesCopied = 0;
            int sourceCompositionsCount = 0;

            try
            {
                _logger.LogInformation("=== Starting SplitFiscalYearAsync ===");
                _logger.LogInformation("SourceCompanyId: {SourceCompanyId}", request.SourceCompanyId);
                _logger.LogInformation("FiscalYearId: {FiscalYearId}", request.FiscalYearId);
                _logger.LogInformation("NewCompanyName: {NewCompanyName}", request.NewCompanyName);
                _logger.LogInformation("DeleteAfterSplit: {DeleteAfterSplit}", request.DeleteAfterSplit);

                // ============================================================
                // VALIDATION
                // ============================================================

                var sourceCompany = await _context.Companies
                    .FirstOrDefaultAsync(c => c.Id == request.SourceCompanyId, cancellationToken);

                if (sourceCompany == null)
                {
                    await onProgress(new SplitFiscalYearProgressEventDto
                    {
                        Type = "error",
                        Error = "Source company not found"
                    });
                    return;
                }

                var splitFiscalYear = await _context.FiscalYears
                    .FirstOrDefaultAsync(f => f.Id == request.FiscalYearId
                                           && f.CompanyId == request.SourceCompanyId, cancellationToken);

                if (splitFiscalYear == null)
                {
                    await onProgress(new SplitFiscalYearProgressEventDto
                    {
                        Type = "error",
                        Error = "Fiscal year not found in source company"
                    });
                    return;
                }

                var targetFiscalYear = splitFiscalYear;

                var sourceFiscalYearCount = await _context.FiscalYears
                    .CountAsync(f => f.CompanyId == request.SourceCompanyId, cancellationToken);

                if (request.DeleteAfterSplit && sourceFiscalYearCount <= 1)
                {
                    await onProgress(new SplitFiscalYearProgressEventDto
                    {
                        Type = "error",
                        Error = "Cannot remove the only fiscal year from the source company. " +
                                "Either disable 'Remove splited fiscal year?' or create another fiscal year first."
                    });
                    return;
                }

                var existingCompany = await _context.Companies
                    .AnyAsync(c => c.Name == request.NewCompanyName && c.OwnerId == userId, cancellationToken);

                if (existingCompany)
                {
                    await onProgress(new SplitFiscalYearProgressEventDto
                    {
                        Type = "error",
                        Error = "Company with this name already exists"
                    });
                    return;
                }

                // ============================================================
                // STEP 1: Create new company
                // ============================================================
                await onProgress(new SplitFiscalYearProgressEventDto
                {
                    Type = "progress",
                    Value = 10,
                    Message = "Creating new company..."
                });

                var newCompany = new Company
                {
                    Id = Guid.NewGuid(),
                    Name = request.NewCompanyName,
                    OwnerId = userId,
                    TradeType = sourceCompany.TradeType,
                    Address = sourceCompany.Address ?? string.Empty,
                    Country = sourceCompany.Country ?? string.Empty,
                    State = sourceCompany.State ?? string.Empty,
                    City = sourceCompany.City ?? string.Empty,
                    Ward = sourceCompany.Ward,
                    Phone = sourceCompany.Phone ?? string.Empty,
                    Pan = sourceCompany.Pan ?? string.Empty,
                    Email = sourceCompany.Email ?? string.Empty,
                    VatEnabled = sourceCompany.VatEnabled,
                    DateFormat = sourceCompany.DateFormat,
                    FiscalYearStartDateEnglish = targetFiscalYear.StartDate,
                    FiscalYearStartDateNepali = targetFiscalYear.StartDateNepali ?? string.Empty,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.Companies.Add(newCompany);
                await _context.SaveChangesAsync(cancellationToken);
                _logger.LogInformation("New company created with ID: {CompanyId}", newCompany.Id);

                // ============================================================
                // STEP 2: Create a NEW FY for the new company (always clone).
                //         Same FY data/prefixes as the split FY.
                // ============================================================
                await onProgress(new SplitFiscalYearProgressEventDto
                {
                    Type = "progress",
                    Value = 15,
                    Message = "Creating fiscal year for new company..."
                });

                targetFiscalYear.BillPrefixes ??= new BillPrefixes();

                var newFiscalYear = new FiscalYear
                {
                    Id = Guid.NewGuid(),
                    Name = targetFiscalYear.Name,
                    StartDate = targetFiscalYear.StartDate,
                    EndDate = targetFiscalYear.EndDate,
                    StartDateNepali = targetFiscalYear.StartDateNepali,
                    EndDateNepali = targetFiscalYear.EndDateNepali,
                    DateFormat = targetFiscalYear.DateFormat,
                    CompanyId = newCompany.Id,
                    IsActive = true,
                    BillPrefixes = new BillPrefixes
                    {
                        Sales = targetFiscalYear.BillPrefixes.Sales,
                        SalesQuotation = targetFiscalYear.BillPrefixes.SalesQuotation,
                        SalesReturn = targetFiscalYear.BillPrefixes.SalesReturn,
                        Purchase = targetFiscalYear.BillPrefixes.Purchase,
                        PurchaseReturn = targetFiscalYear.BillPrefixes.PurchaseReturn,
                        Payment = targetFiscalYear.BillPrefixes.Payment,
                        Receipt = targetFiscalYear.BillPrefixes.Receipt,
                        StockAdjustment = targetFiscalYear.BillPrefixes.StockAdjustment,
                        DebitNote = targetFiscalYear.BillPrefixes.DebitNote,
                        CreditNote = targetFiscalYear.BillPrefixes.CreditNote,
                        JournalVoucher = targetFiscalYear.BillPrefixes.JournalVoucher,
                    },
                    CreatedAt = DateTime.UtcNow
                };

                _context.FiscalYears.Add(newFiscalYear);
                await _context.SaveChangesAsync(cancellationToken);

                _logger.LogInformation(
                    "New FY created: {NewFiscalYearId} ({Name}) for company {NewCompanyId}. " +
                    "BillPrefixes cloned — Sales: {Sales}",
                    newFiscalYear.Id, newFiscalYear.Name, newCompany.Id,
                    newFiscalYear.BillPrefixes.Sales);

                // ============================================================
                // STEP 3: Clone settings
                // ============================================================
                await onProgress(new SplitFiscalYearProgressEventDto
                {
                    Type = "progress",
                    Value = 20,
                    Message = "Cloning settings..."
                });

                try
                {
                    var sourceSettings = await _context.CompanySettings
                        .FirstOrDefaultAsync(s => s.CompanyId == request.SourceCompanyId
                                               && s.FiscalYearId == splitFiscalYear.Id, cancellationToken);

                    if (sourceSettings != null)
                    {
                        var newSettings = new Settings
                        {
                            Id = Guid.NewGuid(),
                            CompanyId = newCompany.Id,
                            UserId = userId,
                            FiscalYearId = newFiscalYear.Id,
                            RoundOffSales = sourceSettings.RoundOffSales,
                            RoundOffPurchase = sourceSettings.RoundOffPurchase,
                            RoundOffSalesReturn = sourceSettings.RoundOffSalesReturn,
                            RoundOffPurchaseReturn = sourceSettings.RoundOffPurchaseReturn,
                            DisplayTransactions = sourceSettings.DisplayTransactions,
                            DisplayTransactionsForPurchase = sourceSettings.DisplayTransactionsForPurchase,
                            DisplayTransactionsForSalesReturn = sourceSettings.DisplayTransactionsForSalesReturn,
                            DisplayTransactionsForPurchaseReturn = sourceSettings.DisplayTransactionsForPurchaseReturn,
                            UseVoucherLastDateForSales = sourceSettings.UseVoucherLastDateForSales,
                            UseVoucherLastDateForSalesReturn = sourceSettings.UseVoucherLastDateForSalesReturn,
                            UseVoucherLastDateForPurchase = sourceSettings.UseVoucherLastDateForPurchase,
                            UseVoucherLastDateForPurchaseReturn = sourceSettings.UseVoucherLastDateForPurchaseReturn,
                            UseVoucherLastDateForPayment = sourceSettings.UseVoucherLastDateForPayment,
                            UseVoucherLastDateForReceipt = sourceSettings.UseVoucherLastDateForReceipt,
                            UseVoucherLastDateForJournal = sourceSettings.UseVoucherLastDateForJournal,
                            UseVoucherLastDateForDebitNote = sourceSettings.UseVoucherLastDateForDebitNote,
                            UseVoucherLastDateForCreditNote = sourceSettings.UseVoucherLastDateForCreditNote,
                            UseVoucherLastDateForSalesQuotation = sourceSettings.UseVoucherLastDateForSalesQuotation,
                            UseVoucherLastDateForStockAdjustment = sourceSettings.UseVoucherLastDateForStockAdjustment,
                            StoreManagement = sourceSettings.StoreManagement,
                            Value = sourceSettings.Value,
                            CreatedAt = DateTime.UtcNow
                        };
                        _context.CompanySettings.Add(newSettings);
                        await _context.SaveChangesAsync(cancellationToken);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to clone settings, continuing with defaults");
                }

                // ============================================================
                // STEP 4: Clone account groups
                // ============================================================
                await onProgress(new SplitFiscalYearProgressEventDto
                {
                    Type = "progress",
                    Value = 25,
                    Message = "Cloning account groups..."
                });

                var accountGroupMap = new Dictionary<Guid, Guid>();
                var sourceAccountGroups = await _context.AccountGroups
                    .Where(g => g.CompanyId == request.SourceCompanyId)
                    .ToListAsync(cancellationToken);

                sourceAccountGroupsCount = sourceAccountGroups.Count;

                foreach (var group in sourceAccountGroups)
                {
                    var newGroup = new AccountGroup
                    {
                        Id = Guid.NewGuid(),
                        Name = group.Name,
                        Type = group.Type,
                        CompanyId = newCompany.Id,
                        PrimaryGroup = group.PrimaryGroup,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    _context.AccountGroups.Add(newGroup);
                    accountGroupMap[group.Id] = newGroup.Id;
                }
                await _context.SaveChangesAsync(cancellationToken);
                _logger.LogInformation("Cloned {Count} account groups", sourceAccountGroups.Count);

                // ============================================================
                // STEP 5: Clone accounts
                // ============================================================
                await onProgress(new SplitFiscalYearProgressEventDto
                {
                    Type = "progress",
                    Value = 35,
                    Message = "Cloning accounts..."
                });

                var sourceAccounts = await _context.Accounts
                    .Where(a => a.CompanyId == request.SourceCompanyId)
                    .Include(a => a.OpeningBalance)
                    .ToListAsync(cancellationToken);

                sourceAccountsCount = sourceAccounts.Count;
                var accountMap = new Dictionary<Guid, Guid>();

                foreach (var account in sourceAccounts)
                {
                    var newAccountGroupId = accountGroupMap.TryGetValue(account.AccountGroupsId, out var mappedId)
                        ? mappedId
                        : account.AccountGroupsId;

                    var newAccount = new Account
                    {
                        Id = Guid.NewGuid(),
                        Name = account.Name,
                        Address = account.Address,
                        Ward = account.Ward,
                        Phone = account.Phone,
                        Pan = account.Pan,
                        ContactPerson = account.ContactPerson,
                        Email = account.Email,
                        UniqueNumber = account.UniqueNumber,
                        CreditLimit = account.CreditLimit,
                        AccountGroupsId = newAccountGroupId,
                        CompanyId = newCompany.Id,
                        OriginalFiscalYearId = newFiscalYear.Id,
                        OpeningBalanceType = account.OpeningBalanceType,
                        DefaultCashAccount = account.DefaultCashAccount,
                        IsActive = account.IsActive,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow,
                        Date = DateTime.UtcNow
                    };

                    if (account.OpeningBalance != null)
                    {
                        newAccount.OpeningBalance = new OpeningBalance
                        {
                            Id = Guid.NewGuid(),
                            FiscalYearId = newFiscalYear.Id,
                            Amount = account.OpeningBalance.Amount,
                            Type = account.OpeningBalance.Type,
                            Date = splitFiscalYear.StartDate ?? DateTime.UtcNow,
                            AccountId = newAccount.Id,
                            CompanyId = newCompany.Id
                        };
                    }

                    _context.Accounts.Add(newAccount);
                    accountMap[account.Id] = newAccount.Id;
                }
                await _context.SaveChangesAsync(cancellationToken);
                _logger.LogInformation("Cloned {Count} accounts", sourceAccounts.Count);

                // ============================================================
                // STEP 5.5: InitialOpeningBalance
                // ============================================================
                await onProgress(new SplitFiscalYearProgressEventDto
                {
                    Type = "progress",
                    Value = 38,
                    Message = "Setting initial opening balances..."
                });

                var sourceInitialBalances = await _context.OpeningBalanceByFiscalYear
                    .Where(ob => ob.FiscalYearId == splitFiscalYear.Id
                              && ob.CompanyId == request.SourceCompanyId)
                    .Include(ob => ob.Account)
                    .ToListAsync(cancellationToken);

                _logger.LogInformation("Found {Count} source opening balances to set as initial opening balances",
                    sourceInitialBalances.Count);

                foreach (var openingBalance in sourceInitialBalances)
                {
                    if (!accountMap.TryGetValue(openingBalance.AccountId, out var newAccountId))
                    {
                        _logger.LogWarning("Account {AccountId} not found in accountMap, skipping initial opening balance",
                            openingBalance.AccountId);
                        continue;
                    }

                    var existingInitial = await _context.InitialOpeningBalances
                        .FirstOrDefaultAsync(iob => iob.AccountId == newAccountId, cancellationToken);

                    if (existingInitial != null)
                    {
                        existingInitial.Amount = openingBalance.Amount;
                        existingInitial.Type = openingBalance.Type;
                        existingInitial.Date = openingBalance.Date;
                        existingInitial.NepaliDate = openingBalance.NepaliDate;
                        existingInitial.CompanyId = newCompany.Id;
                        existingInitial.InitialFiscalYearId = newFiscalYear.Id;
                    }
                    else
                    {
                        _context.InitialOpeningBalances.Add(new InitialOpeningBalance
                        {
                            Id = Guid.NewGuid(),
                            InitialFiscalYearId = newFiscalYear.Id,
                            AccountId = newAccountId,
                            CompanyId = newCompany.Id,
                            Amount = openingBalance.Amount,
                            Type = openingBalance.Type,
                            Date = openingBalance.Date,
                            NepaliDate = openingBalance.NepaliDate
                        });
                    }

                    initialOpeningBalancesCopied++;
                }

                await _context.SaveChangesAsync(cancellationToken);
                _logger.LogInformation("Created {Count} initial opening balances", initialOpeningBalancesCopied);

                // ============================================================
                // STEP 6: OpeningBalanceByFiscalYear
                // ============================================================
                await onProgress(new SplitFiscalYearProgressEventDto
                {
                    Type = "progress",
                    Value = 40,
                    Message = "Cloning opening balances to new fiscal year..."
                });

                var sourceOpeningBalances = await _context.OpeningBalanceByFiscalYear
                    .Where(ob => ob.FiscalYearId == splitFiscalYear.Id && ob.CompanyId == request.SourceCompanyId)
                    .Include(ob => ob.Account)
                    .ToListAsync(cancellationToken);

                _logger.LogInformation("Found {Count} opening balances to clone", sourceOpeningBalances.Count);

                foreach (var openingBalance in sourceOpeningBalances)
                {
                    if (!accountMap.TryGetValue(openingBalance.AccountId, out var newAccountId))
                    {
                        _logger.LogWarning("Account {AccountId} not found in account map, skipping opening balance",
                            openingBalance.AccountId);
                        continue;
                    }

                    var existingOpeningBalance = await _context.OpeningBalanceByFiscalYear
                        .FirstOrDefaultAsync(ob => ob.AccountId == newAccountId
                                               && ob.FiscalYearId == newFiscalYear.Id, cancellationToken);

                    if (existingOpeningBalance != null)
                    {
                        existingOpeningBalance.Amount = openingBalance.Amount;
                        existingOpeningBalance.Type = openingBalance.Type;
                        existingOpeningBalance.Date = openingBalance.Date;
                        existingOpeningBalance.NepaliDate = openingBalance.NepaliDate;
                        existingOpeningBalance.CompanyId = newCompany.Id;
                    }
                    else
                    {
                        _context.OpeningBalanceByFiscalYear.Add(new OpeningBalanceByFiscalYear
                        {
                            Id = Guid.NewGuid(),
                            AccountId = newAccountId,
                            FiscalYearId = newFiscalYear.Id,
                            CompanyId = newCompany.Id,
                            Amount = openingBalance.Amount,
                            Type = openingBalance.Type,
                            Date = openingBalance.Date,
                            NepaliDate = openingBalance.NepaliDate,
                        });
                    }

                    openingBalancesCopied++;
                }

                await _context.SaveChangesAsync(cancellationToken);
                _logger.LogInformation("Cloned {Count} opening balances", openingBalancesCopied);

                // ============================================================
                // STEP 7: Categories
                // ============================================================
                await onProgress(new SplitFiscalYearProgressEventDto
                {
                    Type = "progress",
                    Value = 45,
                    Message = "Cloning categories..."
                });

                var categoryMap = new Dictionary<Guid, Guid>();

                var sourceCategories = await _context.Categories
                    .Where(c => c.CompanyId == request.SourceCompanyId)
                    .Where(c => c.OriginalFiscalYearId == splitFiscalYear.Id || c.FiscalYearId == splitFiscalYear.Id)
                    .ToListAsync(cancellationToken);

                if (!sourceCategories.Any())
                {
                    sourceCategories = await _context.Categories
                        .Where(c => c.CompanyId == request.SourceCompanyId)
                        .ToListAsync(cancellationToken);
                }

                sourceCategoriesCount = sourceCategories.Count;

                foreach (var category in sourceCategories)
                {
                    var existingCategory = await _context.Categories
                        .FirstOrDefaultAsync(c => c.CompanyId == newCompany.Id && c.Name == category.Name, cancellationToken);

                    if (existingCategory != null)
                    {
                        categoryMap[category.Id] = existingCategory.Id;
                        continue;
                    }

                    var newCategory = new Category
                    {
                        Id = Guid.NewGuid(),
                        Name = category.Name,
                        UniqueNumber = category.UniqueNumber,
                        CompanyId = newCompany.Id,
                        FiscalYearId = newFiscalYear.Id,
                        OriginalFiscalYearId = newFiscalYear.Id,
                        Date = DateTime.UtcNow,
                        NepaliDate = category.NepaliDate,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.Categories.Add(newCategory);
                    categoryMap[category.Id] = newCategory.Id;
                }
                await _context.SaveChangesAsync(cancellationToken);
                _logger.LogInformation("Cloned {Count} categories", sourceCategories.Count);

                // ============================================================
                // STEP 8: ItemCompanies
                // ============================================================
                await onProgress(new SplitFiscalYearProgressEventDto
                {
                    Type = "progress",
                    Value = 50,
                    Message = "Cloning item companies..."
                });

                var itemCompanyMap = new Dictionary<Guid, Guid>();

                var sourceItemCompanies = await _context.ItemCompanies
                    .Where(ic => ic.CompanyId == request.SourceCompanyId)
                    .Where(ic => ic.OriginalFiscalYearId == splitFiscalYear.Id || ic.FiscalYearId == splitFiscalYear.Id)
                    .ToListAsync(cancellationToken);

                if (!sourceItemCompanies.Any())
                {
                    sourceItemCompanies = await _context.ItemCompanies
                        .Where(ic => ic.CompanyId == request.SourceCompanyId)
                        .ToListAsync(cancellationToken);
                }

                sourceItemCompaniesCount = sourceItemCompanies.Count;

                foreach (var itemCompany in sourceItemCompanies)
                {
                    var existingItemCompany = await _context.ItemCompanies
                        .FirstOrDefaultAsync(ic => ic.CompanyId == newCompany.Id && ic.Name == itemCompany.Name, cancellationToken);

                    if (existingItemCompany != null)
                    {
                        itemCompanyMap[itemCompany.Id] = existingItemCompany.Id;
                        continue;
                    }

                    var newItemCompany = new ItemCompany
                    {
                        Id = Guid.NewGuid(),
                        Name = itemCompany.Name,
                        UniqueNumber = itemCompany.UniqueNumber,
                        CompanyId = newCompany.Id,
                        FiscalYearId = newFiscalYear.Id,
                        OriginalFiscalYearId = newFiscalYear.Id,
                        Date = DateTime.UtcNow,
                        NepaliDate = itemCompany.NepaliDate,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.ItemCompanies.Add(newItemCompany);
                    itemCompanyMap[itemCompany.Id] = newItemCompany.Id;
                }
                await _context.SaveChangesAsync(cancellationToken);
                _logger.LogInformation("Cloned {Count} item companies", sourceItemCompanies.Count);

                // ============================================================
                // STEP 9: MainUnits
                // ============================================================
                await onProgress(new SplitFiscalYearProgressEventDto
                {
                    Type = "progress",
                    Value = 53,
                    Message = "Cloning main units..."
                });

                var mainUnitMap = new Dictionary<Guid, Guid>();

                var sourceMainUnits = await _context.MainUnits
                    .Where(mu => mu.CompanyId == request.SourceCompanyId)
                    .Where(mu => mu.OriginalFiscalYearId == splitFiscalYear.Id || mu.FiscalYearId == splitFiscalYear.Id)
                    .ToListAsync(cancellationToken);

                if (!sourceMainUnits.Any())
                {
                    sourceMainUnits = await _context.MainUnits
                        .Where(mu => mu.CompanyId == request.SourceCompanyId)
                        .ToListAsync(cancellationToken);
                }

                sourceMainUnitsCount = sourceMainUnits.Count;

                foreach (var mainUnit in sourceMainUnits)
                {
                    var existingMainUnit = await _context.MainUnits
                        .FirstOrDefaultAsync(mu => mu.CompanyId == newCompany.Id &&
                            (mu.Name == mainUnit.Name || mu.UniqueNumber == mainUnit.UniqueNumber),
                            cancellationToken);

                    if (existingMainUnit != null)
                    {
                        mainUnitMap[mainUnit.Id] = existingMainUnit.Id;
                        continue;
                    }

                    var newMainUnit = new MainUnit
                    {
                        Id = Guid.NewGuid(),
                        Name = mainUnit.Name,
                        UniqueNumber = mainUnit.UniqueNumber,
                        CompanyId = newCompany.Id,
                        FiscalYearId = newFiscalYear.Id,
                        OriginalFiscalYearId = newFiscalYear.Id,
                        Date = DateTime.UtcNow,
                        NepaliDate = mainUnit.NepaliDate,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.MainUnits.Add(newMainUnit);
                    mainUnitMap[mainUnit.Id] = newMainUnit.Id;
                }
                await _context.SaveChangesAsync(cancellationToken);
                _logger.LogInformation("Cloned {Count} main units", sourceMainUnits.Count);

                // ============================================================
                // STEP 10: Units
                // ============================================================
                await onProgress(new SplitFiscalYearProgressEventDto
                {
                    Type = "progress",
                    Value = 55,
                    Message = "Cloning units..."
                });

                var unitMap = new Dictionary<Guid, Guid>();

                var sourceUnits = await _context.Units
                    .Where(u => u.CompanyId == request.SourceCompanyId)
                    .Where(u => u.OriginalFiscalYearId == splitFiscalYear.Id || u.FiscalYearId == splitFiscalYear.Id)
                    .ToListAsync(cancellationToken);

                if (!sourceUnits.Any())
                {
                    sourceUnits = await _context.Units
                        .Where(u => u.CompanyId == request.SourceCompanyId)
                        .ToListAsync(cancellationToken);
                }

                sourceUnitsCount = sourceUnits.Count;

                foreach (var unit in sourceUnits)
                {
                    var existingUnit = await _context.Units
                        .FirstOrDefaultAsync(u => u.CompanyId == newCompany.Id && u.Name == unit.Name, cancellationToken);

                    if (existingUnit != null)
                    {
                        unitMap[unit.Id] = existingUnit.Id;
                        continue;
                    }

                    var newUnit = new Unit
                    {
                        Id = Guid.NewGuid(),
                        Name = unit.Name,
                        UniqueNumber = unit.UniqueNumber,
                        CompanyId = newCompany.Id,
                        FiscalYearId = newFiscalYear.Id,
                        OriginalFiscalYearId = newFiscalYear.Id,
                        Date = DateTime.UtcNow,
                        NepaliDate = unit.NepaliDate,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.Units.Add(newUnit);
                    unitMap[unit.Id] = newUnit.Id;
                }
                await _context.SaveChangesAsync(cancellationToken);
                _logger.LogInformation("Cloned {Count} units", sourceUnits.Count);

                // ============================================================
                // STEP 10.5: Compositions
                // ============================================================
                await onProgress(new SplitFiscalYearProgressEventDto
                {
                    Type = "progress",
                    Value = 58,
                    Message = "Cloning compositions..."
                });

                var compositionMap = new Dictionary<Guid, Guid>();

                var sourceCompositions = await _context.Compositions
                    .Where(c => c.CompanyId == request.SourceCompanyId)
                    .Where(c => c.OriginalFiscalYearId == splitFiscalYear.Id || c.FiscalYearId == splitFiscalYear.Id)
                    .ToListAsync(cancellationToken);

                if (!sourceCompositions.Any())
                {
                    sourceCompositions = await _context.Compositions
                        .Where(c => c.CompanyId == request.SourceCompanyId)
                        .ToListAsync(cancellationToken);
                }

                sourceCompositionsCount = sourceCompositions.Count;

                foreach (var composition in sourceCompositions)
                {
                    var existingComposition = await _context.Compositions
                        .FirstOrDefaultAsync(c => c.CompanyId == newCompany.Id &&
                            (c.Name == composition.Name || c.UniqueNumber == composition.UniqueNumber),
                            cancellationToken);

                    if (existingComposition != null)
                    {
                        compositionMap[composition.Id] = existingComposition.Id;
                        continue;
                    }

                    var newComposition = new Composition
                    {
                        Id = Guid.NewGuid(),
                        Name = composition.Name,
                        UniqueNumber = composition.UniqueNumber,
                        CompanyId = newCompany.Id,
                        FiscalYearId = newFiscalYear.Id,
                        OriginalFiscalYearId = newFiscalYear.Id,
                        Date = DateTime.UtcNow,
                        NepaliDate = composition.NepaliDate,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    _context.Compositions.Add(newComposition);
                    compositionMap[composition.Id] = newComposition.Id;
                }
                await _context.SaveChangesAsync(cancellationToken);
                _logger.LogInformation("Cloned {Count} compositions", sourceCompositions.Count);

                // ============================================================
                // STEP 11: Items with stock entries and composition links
                // ============================================================
                // await onProgress(new SplitFiscalYearProgressEventDto
                // {
                //     Type = "progress",
                //     Value = 60,
                //     Message = "Cloning items with stock entries..."
                // });

                // var sourceItems = await _context.Items
                //     .Where(i => i.CompanyId == request.SourceCompanyId)
                //     .Where(i => i.OriginalFiscalYearId == splitFiscalYear.Id || i.CreatedAt >= splitFiscalYear.StartDate)
                //     .Include(i => i.StockEntries)
                //     .Include(i => i.ItemCompositions)
                //     .ToListAsync(cancellationToken);

                // if (!sourceItems.Any())
                // {
                //     sourceItems = await _context.Items
                //         .Where(i => i.CompanyId == request.SourceCompanyId)
                //         .Include(i => i.StockEntries)
                //         .Include(i => i.ItemCompositions)
                //         .ToListAsync(cancellationToken);
                // }

                // _logger.LogInformation("Found {Count} items to clone", sourceItems.Count);

                // foreach (var item in sourceItems)
                // {
                //     try
                //     {
                //         var newCategoryId = categoryMap.TryGetValue(item.CategoryId, out var catId) ? catId : item.CategoryId;
                //         var newItemCompanyId = itemCompanyMap.TryGetValue(item.ItemsCompanyId, out var icId) ? icId : item.ItemsCompanyId;
                //         var newUnitId = unitMap.TryGetValue(item.UnitId, out var uId) ? uId : item.UnitId;
                //         var newMainUnitId = mainUnitMap.TryGetValue(item.MainUnitId ?? Guid.Empty, out var muId) ? muId : item.MainUnitId;

                //         var newItem = new Item
                //         {
                //             Id = Guid.NewGuid(),
                //             Name = item.Name,
                //             Hscode = item.Hscode,
                //             CategoryId = newCategoryId,
                //             ItemsCompanyId = newItemCompanyId,
                //             Price = item.Price,
                //             PuPrice = item.PuPrice,
                //             MainUnitPuPrice = item.MainUnitPuPrice,
                //             MainUnitId = newMainUnitId,
                //             WsUnit = item.WsUnit,
                //             UnitId = newUnitId,
                //             VatStatus = item.VatStatus,
                //             OpeningStock = item.OpeningStock,
                //             MinStock = item.MinStock,
                //             MaxStock = item.MaxStock,
                //             ReorderLevel = item.ReorderLevel,
                //             UniqueNumber = item.UniqueNumber,
                //             BarcodeNumber = item.BarcodeNumber,
                //             CompanyId = newCompany.Id,
                //             OriginalFiscalYearId = newFiscalYear.Id,
                //             Status = item.Status,
                //             CreatedAt = DateTime.UtcNow,
                //             Date = DateTime.UtcNow,
                //             UpdatedAt = DateTime.UtcNow
                //         };

                //         _context.Items.Add(newItem);
                //         itemsCopied++;

                //         if (item.ItemCompositions != null && item.ItemCompositions.Any())
                //         {
                //             foreach (var itemComposition in item.ItemCompositions)
                //             {
                //                 if (!compositionMap.TryGetValue(itemComposition.CompositionId, out var newCompositionId))
                //                 {
                //                     _logger.LogWarning(
                //                         "Composition {CompositionId} for item {ItemName} not found in compositionMap, skipping link",
                //                         itemComposition.CompositionId, item.Name);
                //                     continue;
                //                 }

                //                 _context.ItemCompositions.Add(new ItemComposition
                //                 {
                //                     ItemId = newItem.Id,
                //                     CompositionId = newCompositionId,
                //                     CreatedAt = DateTime.UtcNow
                //                 });
                //                 itemCompositionsCopied++;
                //             }
                //         }

                //         if (item.StockEntries != null && item.StockEntries.Any())
                //         {
                //             foreach (var stockEntry in item.StockEntries)
                //             {
                //                 var newStockEntry = new StockEntry
                //                 {
                //                     Id = Guid.NewGuid(),
                //                     ItemId = newItem.Id,
                //                     Date = DateTime.UtcNow,
                //                     WsUnit = stockEntry.WsUnit,
                //                     Quantity = stockEntry.Quantity,
                //                     BillQty = stockEntry.BillQty,
                //                     ActualQty = stockEntry.ActualQty,
                //                     Bonus = stockEntry.Bonus,
                //                     BatchNumber = stockEntry.BatchNumber ?? "XXX",
                //                     ExpiryDate = stockEntry.ExpiryDate,
                //                     Price = stockEntry.Price,
                //                     NetPrice = stockEntry.NetPrice,
                //                     PuPrice = stockEntry.PuPrice,
                //                     CcPercentage = stockEntry.CcPercentage,
                //                     ItemCcAmount = stockEntry.ItemCcAmount,
                //                     DiscountPercentagePerItem = stockEntry.DiscountPercentagePerItem,
                //                     DiscountAmountPerItem = stockEntry.DiscountAmountPerItem,
                //                     NetPuPrice = stockEntry.NetPuPrice,
                //                     MainUnitPuPrice = stockEntry.MainUnitPuPrice,
                //                     Mrp = stockEntry.Mrp,
                //                     MarginPercentage = stockEntry.MarginPercentage,
                //                     Currency = stockEntry.Currency,
                //                     CompanyId = newCompany.Id,
                //                     FiscalYearId = newFiscalYear.Id,
                //                     UniqueUuid = stockEntry.UniqueUuid,
                //                     PurchaseBillId = null,
                //                     SalesReturnBillId = null,
                //                     ExpiryStatus = stockEntry.ExpiryStatus,
                //                     DaysUntilExpiry = stockEntry.DaysUntilExpiry,
                //                     StoreId = stockEntry.StoreId,
                //                     RackId = stockEntry.RackId,
                //                     SourceTransferFromStoreId = null,
                //                     SourceTransferOriginalEntryId = null,
                //                     SourceTransferDate = null,
                //                     NepaliDate = stockEntry.NepaliDate,
                //                     CreatedAt = DateTime.UtcNow,
                //                     UpdatedAt = DateTime.UtcNow
                //                 };
                //                 _context.StockEntries.Add(newStockEntry);
                //                 stockEntriesCopied++;
                //             }
                //         }
                //     }
                //     catch (Exception ex)
                //     {
                //         _logger.LogError(ex, "Error cloning item {Name} (ID: {Id})", item.Name, item.Id);
                //     }
                // }

                // await _context.SaveChangesAsync(cancellationToken);
                // _logger.LogInformation("Cloned {Count} items with {StockCount} stock entries and {CompCount} composition links",
                //     itemsCopied, stockEntriesCopied, itemCompositionsCopied);

                // ============================================================
                // STEP 11: Clone items with:
                //   - ItemCompositions (junction)
                //   - StockEntries (FIFO)
                //   - ItemOpeningStockByFiscalYear   (per-FY opening stock)
                //   - ItemClosingStockByFiscalYear   (per-FY closing stock)
                //   - ItemInitialOpeningStock        (1-to-1 initial balance,
                //                                     populated from the SAME source
                //                                     as ItemOpeningStockByFiscalYear)
                // ============================================================
                await onProgress(new SplitFiscalYearProgressEventDto
                {
                    Type = "progress",
                    Value = 60,
                    Message = "Cloning items with stock entries..."
                });

                var sourceItems = await _context.Items
                    .Where(i => i.CompanyId == request.SourceCompanyId)
                    .Where(i => i.OriginalFiscalYearId == splitFiscalYear.Id || i.CreatedAt >= splitFiscalYear.StartDate)
                    .Include(i => i.StockEntries)
                    .Include(i => i.ItemCompositions)
                    .Include(i => i.OpeningStocksByFiscalYear)
                    .Include(i => i.ClosingStocksByFiscalYear)
                    .ToListAsync(cancellationToken);

                if (!sourceItems.Any())
                {
                    sourceItems = await _context.Items
                        .Where(i => i.CompanyId == request.SourceCompanyId)
                        .Include(i => i.StockEntries)
                        .Include(i => i.ItemCompositions)
                        .Include(i => i.OpeningStocksByFiscalYear)
                        .Include(i => i.ClosingStocksByFiscalYear)
                        .ToListAsync(cancellationToken);
                }

                _logger.LogInformation("Found {Count} items to clone", sourceItems.Count);

                foreach (var item in sourceItems)
                {
                    try
                    {
                        var newCategoryId = categoryMap.TryGetValue(item.CategoryId, out var catId) ? catId : item.CategoryId;
                        var newItemCompanyId = itemCompanyMap.TryGetValue(item.ItemsCompanyId, out var icId) ? icId : item.ItemsCompanyId;
                        var newUnitId = unitMap.TryGetValue(item.UnitId, out var uId) ? uId : item.UnitId;
                        var newMainUnitId = mainUnitMap.TryGetValue(item.MainUnitId ?? Guid.Empty, out var muId) ? muId : item.MainUnitId;

                        var newItem = new Item
                        {
                            Id = Guid.NewGuid(),
                            Name = item.Name,
                            Hscode = item.Hscode,
                            CategoryId = newCategoryId,
                            ItemsCompanyId = newItemCompanyId,
                            Price = item.Price,
                            PuPrice = item.PuPrice,
                            MainUnitPuPrice = item.MainUnitPuPrice,
                            MainUnitId = newMainUnitId,
                            WsUnit = item.WsUnit,
                            UnitId = newUnitId,
                            VatStatus = item.VatStatus,
                            OpeningStock = item.OpeningStock,
                            MinStock = item.MinStock,
                            MaxStock = item.MaxStock,
                            ReorderLevel = item.ReorderLevel,
                            UniqueNumber = item.UniqueNumber,
                            BarcodeNumber = item.BarcodeNumber,
                            CompanyId = newCompany.Id,
                            OriginalFiscalYearId = newFiscalYear.Id,
                            Status = item.Status,
                            CreatedAt = DateTime.UtcNow,
                            Date = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        };

                        _context.Items.Add(newItem);
                        itemsCopied++;

                        // ---------- ItemCompositions (junction) ----------
                        if (item.ItemCompositions != null && item.ItemCompositions.Any())
                        {
                            foreach (var itemComposition in item.ItemCompositions)
                            {
                                if (!compositionMap.TryGetValue(itemComposition.CompositionId, out var newCompositionId))
                                {
                                    _logger.LogWarning(
                                        "Composition {CompositionId} for item {ItemName} not found in compositionMap, skipping link",
                                        itemComposition.CompositionId, item.Name);
                                    continue;
                                }

                                _context.ItemCompositions.Add(new ItemComposition
                                {
                                    ItemId = newItem.Id,
                                    CompositionId = newCompositionId,
                                    CreatedAt = DateTime.UtcNow
                                });
                                itemCompositionsCopied++;
                            }
                        }

                        // ============================================================
                        // Find the source's ItemOpeningStockByFiscalYear row for the split FY.
                        // This is the SAME source we'll use for both:
                        //   - new ItemOpeningStockByFiscalYear (for the new FY)
                        //   - new ItemInitialOpeningStock      (the new company's "initial")
                        // ============================================================
                        var srcOpeningStockForSplitFy = item.OpeningStocksByFiscalYear?
                            .FirstOrDefault(s => s.FiscalYearId == splitFiscalYear.Id);

                        // If no explicit per-FY row exists, fall back to the item's own OpeningStock fields
                        // so we still have values to seed both target tables.
                        var fallbackOpeningStock = srcOpeningStockForSplitFy?.OpeningStock
                                                   ?? item.OpeningStock;
                        var fallbackOpeningStockValue = srcOpeningStockForSplitFy?.OpeningStockValue
                                                        ?? 0m;
                        var fallbackPurchasePrice = srcOpeningStockForSplitFy?.PurchasePrice
                                                    ?? item.PuPrice
                                                    ?? 0m;
                        var fallbackSalesPrice = srcOpeningStockForSplitFy?.SalesPrice
                                                 ?? item.Price
                                                 ?? 0m;
                        var fallbackDate = srcOpeningStockForSplitFy?.Date ?? DateTime.UtcNow;
                        var fallbackNepaliDate = srcOpeningStockForSplitFy?.NepaliDate;

                        // ---------- ItemOpeningStockByFiscalYear (for the new FY) ----------
                        _context.ItemOpeningStockByFiscalYear.Add(new ItemOpeningStockByFiscalYear
                        {
                            Id = Guid.NewGuid(),
                            ItemId = newItem.Id,
                            FiscalYearId = newFiscalYear.Id,
                            CompanyId = newCompany.Id,
                            OpeningStock = fallbackOpeningStock,
                            OpeningStockValue = fallbackOpeningStockValue,
                            PurchasePrice = fallbackPurchasePrice,
                            SalesPrice = fallbackSalesPrice,
                            Date = fallbackDate,
                            NepaliDate = fallbackNepaliDate,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        });
                        openingStocksByFyCopied++;

                        // ---------- ItemInitialOpeningStock (SAME source, SAME values) ----------
                        // The new company's first FY IS its initial FY.
                        // So its "initial opening stock" must equal the opening stock of
                        // the split FY that we just carried over.
                        _context.ItemInitialOpeningStocks.Add(new ItemInitialOpeningStock
                        {
                            Id = Guid.NewGuid(),
                            ItemId = newItem.Id,
                            InitialFiscalYearId = newFiscalYear.Id,
                            CompanyId = newCompany.Id,
                            OpeningStock = fallbackOpeningStock,            // ← same qty
                            OpeningStockValue = fallbackOpeningStockValue,  // ← same value
                            PurchasePrice = fallbackPurchasePrice,          // ← same price
                            SalesPrice = fallbackSalesPrice,                // ← same price
                            Date = fallbackDate,
                            NepaliDate = fallbackNepaliDate,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        });
                        initialOpeningStocksCopied++;

                        _logger.LogInformation(
                            "Cloned item {ItemName}: OpeningStockByFiscalYear + ItemInitialOpeningStock both set to Qty={Qty}, Value={Val}, PuPrice={Pu}, SalesPrice={Sp}",
                            newItem.Name, fallbackOpeningStock, fallbackOpeningStockValue,
                            fallbackPurchasePrice, fallbackSalesPrice);

                        // ---------- ItemClosingStockByFiscalYear (for the new FY) ----------
                        var srcClosingStockForSplitFy = item.ClosingStocksByFiscalYear?
                            .FirstOrDefault(s => s.FiscalYearId == splitFiscalYear.Id);

                        if (srcClosingStockForSplitFy != null)
                        {
                            _context.ItemClosingStockByFiscalYear.Add(new ItemClosingStockByFiscalYear
                            {
                                Id = Guid.NewGuid(),
                                ItemId = newItem.Id,
                                FiscalYearId = newFiscalYear.Id,
                                ClosingStock = srcClosingStockForSplitFy.ClosingStock,
                                ClosingStockValue = srcClosingStockForSplitFy.ClosingStockValue,
                                PurchasePrice = srcClosingStockForSplitFy.PurchasePrice,
                                SalesPrice = srcClosingStockForSplitFy.SalesPrice,
                                CreatedAt = DateTime.UtcNow,
                                UpdatedAt = DateTime.UtcNow
                            });
                            closingStocksByFyCopied++;
                        }

                        // ---------- StockEntries (FIFO) ----------
                        if (item.StockEntries != null && item.StockEntries.Any())
                        {
                            foreach (var stockEntry in item.StockEntries)
                            {
                                var newStockEntry = new StockEntry
                                {
                                    Id = Guid.NewGuid(),
                                    ItemId = newItem.Id,
                                    Date = DateTime.UtcNow,
                                    WsUnit = stockEntry.WsUnit,
                                    Quantity = stockEntry.Quantity,
                                    BillQty = stockEntry.BillQty,
                                    ActualQty = stockEntry.ActualQty,
                                    Bonus = stockEntry.Bonus,
                                    BatchNumber = stockEntry.BatchNumber ?? "XXX",
                                    ExpiryDate = stockEntry.ExpiryDate,
                                    Price = stockEntry.Price,
                                    NetPrice = stockEntry.NetPrice,
                                    PuPrice = stockEntry.PuPrice,
                                    CcPercentage = stockEntry.CcPercentage,
                                    ItemCcAmount = stockEntry.ItemCcAmount,
                                    DiscountPercentagePerItem = stockEntry.DiscountPercentagePerItem,
                                    DiscountAmountPerItem = stockEntry.DiscountAmountPerItem,
                                    NetPuPrice = stockEntry.NetPuPrice,
                                    MainUnitPuPrice = stockEntry.MainUnitPuPrice,
                                    Mrp = stockEntry.Mrp,
                                    MarginPercentage = stockEntry.MarginPercentage,
                                    Currency = stockEntry.Currency,
                                    CompanyId = newCompany.Id,
                                    FiscalYearId = newFiscalYear.Id,
                                    UniqueUuid = stockEntry.UniqueUuid,
                                    PurchaseBillId = null,
                                    SalesReturnBillId = null,
                                    ExpiryStatus = stockEntry.ExpiryStatus,
                                    DaysUntilExpiry = stockEntry.DaysUntilExpiry,
                                    StoreId = stockEntry.StoreId,
                                    RackId = stockEntry.RackId,
                                    SourceTransferFromStoreId = null,
                                    SourceTransferOriginalEntryId = null,
                                    SourceTransferDate = null,
                                    NepaliDate = stockEntry.NepaliDate,
                                    CreatedAt = DateTime.UtcNow,
                                    UpdatedAt = DateTime.UtcNow
                                };
                                _context.StockEntries.Add(newStockEntry);
                                stockEntriesCopied++;
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error cloning item {Name} (ID: {Id})", item.Name, item.Id);
                    }
                }

                await _context.SaveChangesAsync(cancellationToken);

                _logger.LogInformation(
                    "Cloned {ItemCount} items, {StockCount} stock entries, {CompCount} composition links, " +
                    "{InitCount} ItemInitialOpeningStock, {OpCount} ItemOpeningStockByFiscalYear, {ClCount} ItemClosingStockByFiscalYear",
                    itemsCopied, stockEntriesCopied, itemCompositionsCopied,
                    initialOpeningStocksCopied, openingStocksByFyCopied, closingStocksByFyCopied);

                // ============================================================
                // STEP 12: Ensure BillCounters for the new FY
                // ============================================================
                await onProgress(new SplitFiscalYearProgressEventDto
                {
                    Type = "progress",
                    Value = 80,
                    Message = "Ensuring bill counters..."
                });

                var transactionTypes = new[]
                {
            "Sales", "Purchase", "SalesReturn", "PurchaseReturn",
            "Payment", "Receipt", "Journal", "DebitNote", "CreditNote", "StockAdjustment"
        };

                foreach (var transactionType in transactionTypes)
                {
                    var existingCounter = await _context.BillCounters
                        .FirstOrDefaultAsync(bc => bc.CompanyId == newCompany.Id
                                                && bc.FiscalYearId == newFiscalYear.Id
                                                && bc.TransactionType == transactionType,
                            cancellationToken);

                    if (existingCounter == null)
                    {
                        _context.BillCounters.Add(new BillCounter
                        {
                            Id = Guid.NewGuid(),
                            CompanyId = newCompany.Id,
                            FiscalYearId = newFiscalYear.Id,
                            TransactionType = transactionType,
                            CurrentBillNumber = 0,
                            CreatedAt = DateTime.UtcNow
                        });
                    }
                }
                await _context.SaveChangesAsync(cancellationToken);

                // ============================================================
                // STEP 13: If user chose "Remove FY from source":
                //          Delete ONLY the FY-scoped data (bills, transactions,
                //          balances, stock entries, counters, etc.) from the source,
                //          then delete the FY row itself.
                //
                //          Shared master data (Accounts, AccountGroups, Categories,
                //          Items, Units, etc.) is NOT deleted — it survives across FYs.
                // ============================================================
                if (request.DeleteAfterSplit)
                {
                    await onProgress(new SplitFiscalYearProgressEventDto
                    {
                        Type = "progress",
                        Value = 88,
                        Message = "Removing fiscal year and its transactional data from source company..."
                    });

                    _logger.LogInformation(
                        "Deleting FY-scoped data for split FY {FiscalYearId} from source company {SourceCompanyId}. " +
                        "Shared master data (Accounts, Items, Categories, etc.) will NOT be deleted.",
                        splitFiscalYear.Id, request.SourceCompanyId);

                    // ---------- Delete FY-scoped data in dependency order ----------

                    // 1. TransactionItems (child of Transaction)
                    var txnIdsForFy = await _context.Transactions
                        .Where(t => t.FiscalYearId == splitFiscalYear.Id)
                        .Select(t => t.Id)
                        .ToListAsync(cancellationToken);

                    if (txnIdsForFy.Any())
                    {
                        var txnItemsToDelete = await _context.TransactionItems
                            .Where(ti => txnIdsForFy.Contains(ti.TransactionId))
                            .ToListAsync(cancellationToken);
                        if (txnItemsToDelete.Any())
                        {
                            _context.TransactionItems.RemoveRange(txnItemsToDelete);
                            _logger.LogInformation("Deleted {Count} TransactionItems", txnItemsToDelete.Count);
                        }

                        var txnsToDelete = await _context.Transactions
                            .Where(t => t.FiscalYearId == splitFiscalYear.Id)
                            .ToListAsync(cancellationToken);
                        if (txnsToDelete.Any())
                        {
                            _context.Transactions.RemoveRange(txnsToDelete);
                            _logger.LogInformation("Deleted {Count} Transactions", txnsToDelete.Count);
                        }
                    }

                    // 2. SalesBillItems → SalesBills
                    var sbiForFy = await _context.SalesBillItems
                        .Where(sbi => sbi.SalesBill != null && sbi.SalesBill.FiscalYearId == splitFiscalYear.Id)
                        .ToListAsync(cancellationToken);
                    if (sbiForFy.Any())
                    {
                        _context.SalesBillItems.RemoveRange(sbiForFy);
                    }

                    var sbForFy = await _context.SalesBills
                        .Where(sb => sb.FiscalYearId == splitFiscalYear.Id)
                        .ToListAsync(cancellationToken);
                    if (sbForFy.Any())
                    {
                        _context.SalesBills.RemoveRange(sbForFy);
                        _logger.LogInformation("Deleted {Count} SalesBills (with items)", sbForFy.Count);
                    }

                    // 3. PurchaseBillItems → PurchaseBills
                    var pbiForFy = await _context.PurchaseBillItems
                        .Where(pbi => pbi.PurchaseBill != null && pbi.PurchaseBill.FiscalYearId == splitFiscalYear.Id)
                        .ToListAsync(cancellationToken);
                    if (pbiForFy.Any())
                    {
                        _context.PurchaseBillItems.RemoveRange(pbiForFy);
                    }

                    var pbForFy = await _context.PurchaseBills
                        .Where(pb => pb.FiscalYearId == splitFiscalYear.Id)
                        .ToListAsync(cancellationToken);
                    if (pbForFy.Any())
                    {
                        _context.PurchaseBills.RemoveRange(pbForFy);
                        _logger.LogInformation("Deleted {Count} PurchaseBills (with items)", pbForFy.Count);
                    }

                    // 4. SalesReturnItems → SalesReturns
                    var sriForFy = await _context.SalesReturnItems
                        .Where(sri => sri.SalesReturn != null && sri.SalesReturn.FiscalYearId == splitFiscalYear.Id)
                        .ToListAsync(cancellationToken);
                    if (sriForFy.Any())
                    {
                        _context.SalesReturnItems.RemoveRange(sriForFy);
                    }

                    var srForFy = await _context.SalesReturns
                        .Where(sr => sr.FiscalYearId == splitFiscalYear.Id)
                        .ToListAsync(cancellationToken);
                    if (srForFy.Any())
                    {
                        _context.SalesReturns.RemoveRange(srForFy);
                        _logger.LogInformation("Deleted {Count} SalesReturns (with items)", srForFy.Count);
                    }

                    // 5. PurchaseReturnItems → PurchaseReturns
                    var priForFy = await _context.PurchaseReturnItems
                        .Where(pri => pri.PurchaseReturn != null && pri.PurchaseReturn.FiscalYearId == splitFiscalYear.Id)
                        .ToListAsync(cancellationToken);
                    if (priForFy.Any())
                    {
                        _context.PurchaseReturnItems.RemoveRange(priForFy);
                    }

                    var prForFy = await _context.PurchaseReturns
                        .Where(pr => pr.FiscalYearId == splitFiscalYear.Id)
                        .ToListAsync(cancellationToken);
                    if (prForFy.Any())
                    {
                        _context.PurchaseReturns.RemoveRange(prForFy);
                        _logger.LogInformation("Deleted {Count} PurchaseReturns (with items)", prForFy.Count);
                    }

                    // 6. PaymentEntries → Payments
                    var peForFy = await _context.PaymentEntries
                        .Where(pe => pe.Payment != null && pe.Payment.FiscalYearId == splitFiscalYear.Id)
                        .ToListAsync(cancellationToken);
                    if (peForFy.Any())
                    {
                        _context.PaymentEntries.RemoveRange(peForFy);
                    }

                    var payForFy = await _context.Payments
                        .Where(p => p.FiscalYearId == splitFiscalYear.Id)
                        .ToListAsync(cancellationToken);
                    if (payForFy.Any())
                    {
                        _context.Payments.RemoveRange(payForFy);
                        _logger.LogInformation("Deleted {Count} Payments (with entries)", payForFy.Count);
                    }

                    // 7. ReceiptEntries → Receipts
                    var reForFy = await _context.ReceiptEntries
                        .Where(re => re.Receipt != null && re.Receipt.FiscalYearId == splitFiscalYear.Id)
                        .ToListAsync(cancellationToken);
                    if (reForFy.Any())
                    {
                        _context.ReceiptEntries.RemoveRange(reForFy);
                    }

                    var rcpForFy = await _context.Receipts
                        .Where(r => r.FiscalYearId == splitFiscalYear.Id)
                        .ToListAsync(cancellationToken);
                    if (rcpForFy.Any())
                    {
                        _context.Receipts.RemoveRange(rcpForFy);
                        _logger.LogInformation("Deleted {Count} Receipts (with entries)", rcpForFy.Count);
                    }

                    // 8. JournalEntries → JournalVouchers
                    var jeForFy = await _context.JournalEntries
                        .Where(je => je.JournalVoucher != null && je.JournalVoucher.FiscalYearId == splitFiscalYear.Id)
                        .ToListAsync(cancellationToken);
                    if (jeForFy.Any())
                    {
                        _context.JournalEntries.RemoveRange(jeForFy);
                    }

                    var jvForFy = await _context.JournalVouchers
                        .Where(jv => jv.FiscalYearId == splitFiscalYear.Id)
                        .ToListAsync(cancellationToken);
                    if (jvForFy.Any())
                    {
                        _context.JournalVouchers.RemoveRange(jvForFy);
                        _logger.LogInformation("Deleted {Count} JournalVouchers (with entries)", jvForFy.Count);
                    }

                    // 9. DebitNoteEntries → DebitNotes
                    var dneForFy = await _context.DebitNoteEntries
                        .Where(dne => dne.DebitNote != null && dne.DebitNote.FiscalYearId == splitFiscalYear.Id)
                        .ToListAsync(cancellationToken);
                    if (dneForFy.Any())
                    {
                        _context.DebitNoteEntries.RemoveRange(dneForFy);
                    }

                    var dnForFy = await _context.DebitNotes
                        .Where(dn => dn.FiscalYearId == splitFiscalYear.Id)
                        .ToListAsync(cancellationToken);
                    if (dnForFy.Any())
                    {
                        _context.DebitNotes.RemoveRange(dnForFy);
                        _logger.LogInformation("Deleted {Count} DebitNotes (with entries)", dnForFy.Count);
                    }

                    // 10. CreditNoteEntries → CreditNotes
                    var cneForFy = await _context.CreditNoteEntries
                        .Where(cne => cne.CreditNote != null && cne.CreditNote.FiscalYearId == splitFiscalYear.Id)
                        .ToListAsync(cancellationToken);
                    if (cneForFy.Any())
                    {
                        _context.CreditNoteEntries.RemoveRange(cneForFy);
                    }

                    var cnForFy = await _context.CreditNotes
                        .Where(cn => cn.FiscalYearId == splitFiscalYear.Id)
                        .ToListAsync(cancellationToken);
                    if (cnForFy.Any())
                    {
                        _context.CreditNotes.RemoveRange(cnForFy);
                        _logger.LogInformation("Deleted {Count} CreditNotes (with entries)", cnForFy.Count);
                    }

                    // 11. StockAdjustmentItems → StockAdjustments
                    var saiForFy = await _context.StockAdjustmentItems
                        .Where(sai => sai.StockAdjustment != null && sai.StockAdjustment.FiscalYearId == splitFiscalYear.Id)
                        .ToListAsync(cancellationToken);
                    if (saiForFy.Any())
                    {
                        _context.StockAdjustmentItems.RemoveRange(saiForFy);
                    }

                    var saForFy = await _context.StockAdjustments
                        .Where(sa => sa.FiscalYearId == splitFiscalYear.Id)
                        .ToListAsync(cancellationToken);
                    if (saForFy.Any())
                    {
                        _context.StockAdjustments.RemoveRange(saForFy);
                        _logger.LogInformation("Deleted {Count} StockAdjustments (with items)", saForFy.Count);
                    }

                    // 12. SalesQuotationItems → SalesQuotations
                    var sqiForFy = await _context.SalesQuotationItems
                        .Where(sqi => sqi.SalesQuotation != null && sqi.SalesQuotation.FiscalYearId == splitFiscalYear.Id)
                        .ToListAsync(cancellationToken);
                    if (sqiForFy.Any())
                    {
                        _context.SalesQuotationItems.RemoveRange(sqiForFy);
                    }

                    var sqForFy = await _context.SalesQuotations
                        .Where(sq => sq.FiscalYearId == splitFiscalYear.Id)
                        .ToListAsync(cancellationToken);
                    if (sqForFy.Any())
                    {
                        _context.SalesQuotations.RemoveRange(sqForFy);
                        _logger.LogInformation("Deleted {Count} SalesQuotations (with items)", sqForFy.Count);
                    }

                    // 13. StockEntries
                    var seForFy = await _context.StockEntries
                        .Where(se => se.FiscalYearId == splitFiscalYear.Id)
                        .ToListAsync(cancellationToken);
                    if (seForFy.Any())
                    {
                        _context.StockEntries.RemoveRange(seForFy);
                        _logger.LogInformation("Deleted {Count} StockEntries", seForFy.Count);
                    }

                    // 14. ItemOpeningStockByFiscalYear
                    var iosForFy = await _context.ItemOpeningStockByFiscalYear
                        .Where(ios => ios.FiscalYearId == splitFiscalYear.Id)
                        .ToListAsync(cancellationToken);
                    if (iosForFy.Any())
                    {
                        _context.ItemOpeningStockByFiscalYear.RemoveRange(iosForFy);
                        _logger.LogInformation("Deleted {Count} ItemOpeningStockByFiscalYear", iosForFy.Count);
                    }

                    // 15. ItemClosingStockByFiscalYear
                    var icsForFy = await _context.ItemClosingStockByFiscalYear
                        .Where(ics => ics.FiscalYearId == splitFiscalYear.Id)
                        .ToListAsync(cancellationToken);
                    if (icsForFy.Any())
                    {
                        _context.ItemClosingStockByFiscalYear.RemoveRange(icsForFy);
                        _logger.LogInformation("Deleted {Count} ItemClosingStockByFiscalYear", icsForFy.Count);
                    }

                    // 16. OpeningBalanceByFiscalYear
                    var obfyForFy = await _context.OpeningBalanceByFiscalYear
                        .Where(ob => ob.FiscalYearId == splitFiscalYear.Id)
                        .ToListAsync(cancellationToken);
                    if (obfyForFy.Any())
                    {
                        _context.OpeningBalanceByFiscalYear.RemoveRange(obfyForFy);
                        _logger.LogInformation("Deleted {Count} OpeningBalanceByFiscalYear", obfyForFy.Count);
                    }

                    // 17. ClosingBalanceByFiscalYear
                    var cbfyForFy = await _context.ClosingBalanceByFiscalYear
                        .Where(cb => cb.FiscalYearId == splitFiscalYear.Id)
                        .ToListAsync(cancellationToken);
                    if (cbfyForFy.Any())
                    {
                        _context.ClosingBalanceByFiscalYear.RemoveRange(cbfyForFy);
                        _logger.LogInformation("Deleted {Count} ClosingBalanceByFiscalYear", cbfyForFy.Count);
                    }

                    // 18. OpeningBalances (legacy per-account, per-FY)
                    var obsForFy = await _context.OpeningBalances
                        .Where(ob => ob.FiscalYearId == splitFiscalYear.Id)
                        .ToListAsync(cancellationToken);
                    if (obsForFy.Any())
                    {
                        _context.OpeningBalances.RemoveRange(obsForFy);
                        _logger.LogInformation("Deleted {Count} OpeningBalances", obsForFy.Count);
                    }

                    // 19. InitialOpeningBalances (per-FY)
                    var iobForFy = await _context.InitialOpeningBalances
                        .Where(iob => iob.InitialFiscalYearId == splitFiscalYear.Id)
                        .ToListAsync(cancellationToken);
                    if (iobForFy.Any())
                    {
                        _context.InitialOpeningBalances.RemoveRange(iobForFy);
                        _logger.LogInformation("Deleted {Count} InitialOpeningBalances", iobForFy.Count);
                    }

                    // 20. BillCounters
                    var bcForFy = await _context.BillCounters
                        .Where(bc => bc.FiscalYearId == splitFiscalYear.Id)
                        .ToListAsync(cancellationToken);
                    if (bcForFy.Any())
                    {
                        _context.BillCounters.RemoveRange(bcForFy);
                        _logger.LogInformation("Deleted {Count} BillCounters", bcForFy.Count);
                    }

                    // 21. CompanySettings (per-FY)
                    var settingsForFy = await _context.CompanySettings
                        .Where(s => s.FiscalYearId == splitFiscalYear.Id)
                        .ToListAsync(cancellationToken);
                    if (settingsForFy.Any())
                    {
                        _context.CompanySettings.RemoveRange(settingsForFy);
                        _logger.LogInformation("Deleted {Count} CompanySettings", settingsForFy.Count);
                    }

                    // 22. CashCounterSessions and their children
                    var cashSessionsForFy = await _context.CashCounterSessions
                        .Where(cs => cs.FiscalYearId == splitFiscalYear.Id)
                        .ToListAsync(cancellationToken);
                    if (cashSessionsForFy.Any())
                    {
                        var sessionIds = cashSessionsForFy.Select(s => s.Id).ToList();

                        var ccsb = await _context.CashCounterSalesBills
                            .Where(x => sessionIds.Contains(x.SessionId)).ToListAsync(cancellationToken);
                        if (ccsb.Any()) _context.CashCounterSalesBills.RemoveRange(ccsb);

                        var ccsr = await _context.CashCounterSalesReturns
                            .Where(x => sessionIds.Contains(x.SessionId)).ToListAsync(cancellationToken);
                        if (ccsr.Any()) _context.CashCounterSalesReturns.RemoveRange(ccsr);

                        var ccp = await _context.CashCounterPayments
                            .Where(x => sessionIds.Contains(x.SessionId)).ToListAsync(cancellationToken);
                        if (ccp.Any()) _context.CashCounterPayments.RemoveRange(ccp);

                        var ccr = await _context.CashCounterReceipts
                            .Where(x => sessionIds.Contains(x.SessionId)).ToListAsync(cancellationToken);
                        if (ccr.Any()) _context.CashCounterReceipts.RemoveRange(ccr);

                        var ccjv = await _context.CashCounterJournalVouchers
                            .Where(x => sessionIds.Contains(x.SessionId)).ToListAsync(cancellationToken);
                        if (ccjv.Any()) _context.CashCounterJournalVouchers.RemoveRange(ccjv);

                        var ccdn = await _context.CashCounterDebitNotes
                            .Where(x => sessionIds.Contains(x.SessionId)).ToListAsync(cancellationToken);
                        if (ccdn.Any()) _context.CashCounterDebitNotes.RemoveRange(ccdn);

                        var cccn = await _context.CashCounterCreditNotes
                            .Where(x => sessionIds.Contains(x.SessionId)).ToListAsync(cancellationToken);
                        if (cccn.Any()) _context.CashCounterCreditNotes.RemoveRange(cccn);

                        var ccpb = await _context.CashCounterPurchaseBills
                            .Where(x => sessionIds.Contains(x.SessionId)).ToListAsync(cancellationToken);
                        if (ccpb.Any()) _context.CashCounterPurchaseBills.RemoveRange(ccpb);

                        var ccpr = await _context.CashCounterPurchaseReturns
                            .Where(x => sessionIds.Contains(x.SessionId)).ToListAsync(cancellationToken);
                        if (ccpr.Any()) _context.CashCounterPurchaseReturns.RemoveRange(ccpr);

                        var ccd = await _context.CashCounterDenominations
                            .Where(x => sessionIds.Contains(x.SessionId)).ToListAsync(cancellationToken);
                        if (ccd.Any()) _context.CashCounterDenominations.RemoveRange(ccd);

                        var cct = await _context.CashCounterTransactions
                            .Where(x => sessionIds.Contains(x.SessionId)).ToListAsync(cancellationToken);
                        if (cct.Any()) _context.CashCounterTransactions.RemoveRange(cct);

                        _context.CashCounterSessions.RemoveRange(cashSessionsForFy);
                        _logger.LogInformation("Deleted {Count} CashCounterSessions (with children)", cashSessionsForFy.Count);
                    }

                    await _context.SaveChangesAsync(cancellationToken);

                    // 23. Finally delete the split fiscal year itself
                    _context.FiscalYears.Remove(splitFiscalYear);
                    await _context.SaveChangesAsync(cancellationToken);

                    _logger.LogInformation(
                        "Deleted split FY {FiscalYearId} and all its FY-scoped data from source company. " +
                        "Shared master data (Accounts, Items, Categories, Units, ItemCompanies, MainUnits, Compositions, AccountGroups) preserved.",
                        splitFiscalYear.Id);

                    await onProgress(new SplitFiscalYearProgressEventDto
                    {
                        Type = "progress",
                        Value = 95,
                        Message = "Split fiscal year and its data removed from source company."
                    });
                }
                else
                {
                    _logger.LogInformation(
                        "Source FY {FiscalYearId} left untouched. Source company data unaffected.",
                        targetFiscalYear.Id);
                }

                // Commit
                await transaction.CommitAsync(cancellationToken);
                _logger.LogInformation("Transaction committed successfully");

                // ============================================================
                // Prepare result
                // ============================================================
                var result = new SplitFiscalYearResultDto
                {
                    Success = true,
                    Message = request.DeleteAfterSplit
                        ? $"Company split successfully. New company \"{request.NewCompanyName}\" created. " +
                          $"Source company's fiscal year and its transactional data were removed; shared master data was preserved."
                        : $"Company split successfully. New company \"{request.NewCompanyName}\" created. " +
                          $"Source company kept its fiscal year and data intact.",
                    Data = new SplitFiscalYearDataDto
                    {
                        NewCompany = new NewCompanyInfoDto
                        {
                            Id = newCompany.Id,
                            Name = newCompany.Name
                        },
                        NewFiscalYear = new NewFiscalYearInfoDto
                        {
                            Id = newFiscalYear.Id,
                            Name = newFiscalYear.Name
                        },
                        Statistics = new SplitStatisticsDto
                        {
                            UsersCopied = 1,
                            CompanyGroupsCopied = sourceAccountGroupsCount,
                            CategoriesCopied = sourceCategoriesCount,
                            ItemsCompaniesCopied = sourceItemCompaniesCount,
                            MainUnitsCopied = sourceMainUnitsCount,
                            UnitsCopied = sourceUnitsCount,
                            CompositionsCopied = sourceCompositionsCount,
                            ItemsCopied = itemsCopied,
                            AccountsCopied = sourceAccountsCount,
                            TransactionsFoundForCopy = 0,
                            StockEntriesCopied = stockEntriesCopied,
                            OpeningBalancesCopied = openingBalancesCopied
                        }
                    }
                };

                await onProgress(new SplitFiscalYearProgressEventDto
                {
                    Type = "complete",
                    Message = "Company split completed successfully",
                    Data = result
                });

                _logger.LogInformation("Split completed successfully");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error splitting company - rolling back transaction");
                await transaction.RollbackAsync(cancellationToken);

                await onProgress(new SplitFiscalYearProgressEventDto
                {
                    Type = "error",
                    Error = ex.Message,
                    Details = ex.StackTrace
                });
                throw;
            }
        }


    }
}


