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
        //     int sourceAccountGroupsCount = 0;
        //     int sourceCategoriesCount = 0;
        //     int sourceItemCompaniesCount = 0;
        //     int sourceMainUnitsCount = 0;
        //     int sourceUnitsCount = 0;
        //     int sourceAccountsCount = 0;

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

        //         // Step 6: Clone categories
        //         await onProgress(new SplitFiscalYearProgressEventDto
        //         {
        //             Type = "progress",
        //             Value = 45,
        //             Message = "Cloning categories..."
        //         });

        //         var categoryMap = new Dictionary<Guid, Guid>();
        //         var sourceCategories = await _context.Categories
        //             .Where(c => c.CompanyId == request.SourceCompanyId && c.FiscalYearId == splitFiscalYear.Id)
        //             .ToListAsync(cancellationToken);

        //         sourceCategoriesCount = sourceCategories.Count;

        //         foreach (var category in sourceCategories)
        //         {
        //             var newCategory = new Category
        //             {
        //                 Id = Guid.NewGuid(),
        //                 Name = category.Name,
        //                 UniqueNumber = category.UniqueNumber,
        //                 CompanyId = newCompany.Id,
        //                 FiscalYearId = newFiscalYear.Id,
        //                 OriginalFiscalYearId = newFiscalYear.Id,
        //                 Date = DateTime.UtcNow,
        //                 CreatedAt = DateTime.UtcNow
        //             };
        //             _context.Categories.Add(newCategory);
        //             categoryMap[category.Id] = newCategory.Id;
        //         }
        //         await _context.SaveChangesAsync(cancellationToken);
        //         _logger.LogInformation("Cloned {Count} categories", sourceCategories.Count);

        //         // Step 7: Clone item companies
        //         await onProgress(new SplitFiscalYearProgressEventDto
        //         {
        //             Type = "progress",
        //             Value = 50,
        //             Message = "Cloning item companies..."
        //         });

        //         var itemCompanyMap = new Dictionary<Guid, Guid>();
        //         var sourceItemCompanies = await _context.ItemCompanies
        //             .Where(ic => ic.CompanyId == request.SourceCompanyId && ic.FiscalYearId == splitFiscalYear.Id)
        //             .ToListAsync(cancellationToken);

        //         sourceItemCompaniesCount = sourceItemCompanies.Count;

        //         foreach (var itemCompany in sourceItemCompanies)
        //         {
        //             var newItemCompany = new ItemCompany
        //             {
        //                 Id = Guid.NewGuid(),
        //                 Name = itemCompany.Name,
        //                 UniqueNumber = itemCompany.UniqueNumber,
        //                 CompanyId = newCompany.Id,
        //                 FiscalYearId = newFiscalYear.Id,
        //                 OriginalFiscalYearId = newFiscalYear.Id,
        //                 Date = DateTime.UtcNow,
        //                 CreatedAt = DateTime.UtcNow
        //             };
        //             _context.ItemCompanies.Add(newItemCompany);
        //             itemCompanyMap[itemCompany.Id] = newItemCompany.Id;
        //         }
        //         await _context.SaveChangesAsync(cancellationToken);
        //         _logger.LogInformation("Cloned {Count} item companies", sourceItemCompanies.Count);

        //         // Step 8: Clone main units
        //         await onProgress(new SplitFiscalYearProgressEventDto
        //         {
        //             Type = "progress",
        //             Value = 53,
        //             Message = "Cloning main units..."
        //         });

        //         var mainUnitMap = new Dictionary<Guid, Guid>();
        //         var sourceMainUnits = await _context.MainUnits
        //             .Where(mu => mu.CompanyId == request.SourceCompanyId && mu.FiscalYearId == splitFiscalYear.Id)
        //             .ToListAsync(cancellationToken);

        //         sourceMainUnitsCount = sourceMainUnits.Count;

        //         foreach (var mainUnit in sourceMainUnits)
        //         {
        //             var newMainUnit = new MainUnit
        //             {
        //                 Id = Guid.NewGuid(),
        //                 Name = mainUnit.Name,
        //                 UniqueNumber = mainUnit.UniqueNumber,
        //                 CompanyId = newCompany.Id,
        //                 FiscalYearId = newFiscalYear.Id,
        //                 OriginalFiscalYearId = newFiscalYear.Id,
        //                 Date = DateTime.UtcNow,
        //                 CreatedAt = DateTime.UtcNow
        //             };
        //             _context.MainUnits.Add(newMainUnit);
        //             mainUnitMap[mainUnit.Id] = newMainUnit.Id;
        //         }
        //         await _context.SaveChangesAsync(cancellationToken);
        //         _logger.LogInformation("Cloned {Count} main units", sourceMainUnits.Count);

        //         // Step 9: Clone units
        //         await onProgress(new SplitFiscalYearProgressEventDto
        //         {
        //             Type = "progress",
        //             Value = 55,
        //             Message = "Cloning units..."
        //         });

        //         var unitMap = new Dictionary<Guid, Guid>();
        //         var sourceUnits = await _context.Units
        //             .Where(u => u.CompanyId == request.SourceCompanyId && u.FiscalYearId == splitFiscalYear.Id)
        //             .ToListAsync(cancellationToken);

        //         sourceUnitsCount = sourceUnits.Count;

        //         foreach (var unit in sourceUnits)
        //         {
        //             var newUnit = new Unit
        //             {
        //                 Id = Guid.NewGuid(),
        //                 Name = unit.Name,
        //                 UniqueNumber = unit.UniqueNumber,
        //                 CompanyId = newCompany.Id,
        //                 FiscalYearId = newFiscalYear.Id,
        //                 OriginalFiscalYearId = newFiscalYear.Id,
        //                 Date = DateTime.UtcNow,
        //                 CreatedAt = DateTime.UtcNow
        //             };
        //             _context.Units.Add(newUnit);
        //             unitMap[unit.Id] = newUnit.Id;
        //         }
        //         await _context.SaveChangesAsync(cancellationToken);
        //         _logger.LogInformation("Cloned {Count} units", sourceUnits.Count);

        //         // Step 10: Clone items with stock entries
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
        //             .ToListAsync(cancellationToken);

        //         if (!sourceItems.Any())
        //         {
        //             _logger.LogWarning("No items found with OriginalFiscalYearId = {FiscalYearId}, fetching all items for company", splitFiscalYear.Id);
        //             sourceItems = await _context.Items
        //                 .Where(i => i.CompanyId == request.SourceCompanyId)
        //                 .Include(i => i.StockEntries)
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
        //         _logger.LogInformation("Cloned {Count} items with {StockCount} stock entries", itemsCopied, stockEntriesCopied);

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

        //                 // 2. Delete TransactionItems first (they reference Transactions)
        //                 var transactionItemsToDelete = await _context.TransactionItems
        //                     .Where(ti => ti.Transaction != null && ti.Transaction.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (transactionItemsToDelete.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} TransactionItems", transactionItemsToDelete.Count);
        //                     _context.TransactionItems.RemoveRange(transactionItemsToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 3. Delete Transactions that reference this fiscal year
        //                 var transactionsToDelete = await _context.Transactions
        //                     .Where(t => t.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (transactionsToDelete.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} Transactions", transactionsToDelete.Count);
        //                     _context.Transactions.RemoveRange(transactionsToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 4. Delete OpeningBalanceByFiscalYear records for this fiscal year
        //                 var openingBalancesByFiscalYear = await _context.OpeningBalanceByFiscalYear
        //                     .Where(ob => ob.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (openingBalancesByFiscalYear.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} OpeningBalanceByFiscalYear records", openingBalancesByFiscalYear.Count);
        //                     _context.OpeningBalanceByFiscalYear.RemoveRange(openingBalancesByFiscalYear);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 5. Delete ClosingBalanceByFiscalYear records for this fiscal year
        //                 var closingBalancesByFiscalYear = await _context.ClosingBalanceByFiscalYear
        //                     .Where(cb => cb.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (closingBalancesByFiscalYear.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} ClosingBalanceByFiscalYear records", closingBalancesByFiscalYear.Count);
        //                     _context.ClosingBalanceByFiscalYear.RemoveRange(closingBalancesByFiscalYear);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 6. Delete ItemOpeningStockByFiscalYear records for this fiscal year
        //                 var itemOpeningStocksByFiscalYear = await _context.ItemOpeningStockByFiscalYear
        //                     .Where(ios => ios.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (itemOpeningStocksByFiscalYear.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} ItemOpeningStockByFiscalYear records", itemOpeningStocksByFiscalYear.Count);
        //                     _context.ItemOpeningStockByFiscalYear.RemoveRange(itemOpeningStocksByFiscalYear);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 7. Delete ItemClosingStockByFiscalYear records for this fiscal year
        //                 var itemClosingStocksByFiscalYear = await _context.ItemClosingStockByFiscalYear
        //                     .Where(ics => ics.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (itemClosingStocksByFiscalYear.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} ItemClosingStockByFiscalYear records", itemClosingStocksByFiscalYear.Count);
        //                     _context.ItemClosingStockByFiscalYear.RemoveRange(itemClosingStocksByFiscalYear);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 8. Delete SalesBillItems first (they reference SalesBills)
        //                 var salesBillItemsToDelete = await _context.SalesBillItems
        //                     .Where(sbi => sbi.SalesBill != null && sbi.SalesBill.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (salesBillItemsToDelete.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} SalesBillItems", salesBillItemsToDelete.Count);
        //                     _context.SalesBillItems.RemoveRange(salesBillItemsToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 9. Delete SalesBills for this fiscal year
        //                 var salesBillsToDelete = await _context.SalesBills
        //                     .Where(sb => sb.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (salesBillsToDelete.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} SalesBills", salesBillsToDelete.Count);
        //                     _context.SalesBills.RemoveRange(salesBillsToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 10. Delete PurchaseBillItems first (they reference PurchaseBills)
        //                 var purchaseBillItemsToDelete = await _context.PurchaseBillItems
        //                     .Where(pbi => pbi.PurchaseBill != null && pbi.PurchaseBill.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (purchaseBillItemsToDelete.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} PurchaseBillItems", purchaseBillItemsToDelete.Count);
        //                     _context.PurchaseBillItems.RemoveRange(purchaseBillItemsToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 11. Delete PurchaseBills for this fiscal year
        //                 var purchaseBillsToDelete = await _context.PurchaseBills
        //                     .Where(pb => pb.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (purchaseBillsToDelete.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} PurchaseBills", purchaseBillsToDelete.Count);
        //                     _context.PurchaseBills.RemoveRange(purchaseBillsToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 12. Delete SalesReturnItems first (they reference SalesReturns)
        //                 var salesReturnItemsToDelete = await _context.SalesReturnItems
        //                     .Where(sri => sri.SalesReturn != null && sri.SalesReturn.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (salesReturnItemsToDelete.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} SalesReturnItems", salesReturnItemsToDelete.Count);
        //                     _context.SalesReturnItems.RemoveRange(salesReturnItemsToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 13. Delete SalesReturns for this fiscal year
        //                 var salesReturnsToDelete = await _context.SalesReturns
        //                     .Where(sr => sr.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (salesReturnsToDelete.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} SalesReturns", salesReturnsToDelete.Count);
        //                     _context.SalesReturns.RemoveRange(salesReturnsToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 14. Delete PurchaseReturnItems first (they reference PurchaseReturns)
        //                 var purchaseReturnItemsToDelete = await _context.PurchaseReturnItems
        //                     .Where(pri => pri.PurchaseReturn != null && pri.PurchaseReturn.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (purchaseReturnItemsToDelete.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} PurchaseReturnItems", purchaseReturnItemsToDelete.Count);
        //                     _context.PurchaseReturnItems.RemoveRange(purchaseReturnItemsToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 15. Delete PurchaseReturns for this fiscal year
        //                 var purchaseReturnsToDelete = await _context.PurchaseReturns
        //                     .Where(pr => pr.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (purchaseReturnsToDelete.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} PurchaseReturns", purchaseReturnsToDelete.Count);
        //                     _context.PurchaseReturns.RemoveRange(purchaseReturnsToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 16. Delete PaymentEntries first (they reference Payments)
        //                 var paymentEntriesToDelete = await _context.PaymentEntries
        //                     .Where(pe => pe.Payment != null && pe.Payment.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (paymentEntriesToDelete.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} PaymentEntries", paymentEntriesToDelete.Count);
        //                     _context.PaymentEntries.RemoveRange(paymentEntriesToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 17. Delete Payments for this fiscal year
        //                 var paymentsToDelete = await _context.Payments
        //                     .Where(p => p.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (paymentsToDelete.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} Payments", paymentsToDelete.Count);
        //                     _context.Payments.RemoveRange(paymentsToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 18. Delete ReceiptEntries first (they reference Receipts)
        //                 var receiptEntriesToDelete = await _context.ReceiptEntries
        //                     .Where(re => re.Receipt != null && re.Receipt.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (receiptEntriesToDelete.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} ReceiptEntries", receiptEntriesToDelete.Count);
        //                     _context.ReceiptEntries.RemoveRange(receiptEntriesToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 19. Delete Receipts for this fiscal year
        //                 var receiptsToDelete = await _context.Receipts
        //                     .Where(r => r.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (receiptsToDelete.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} Receipts", receiptsToDelete.Count);
        //                     _context.Receipts.RemoveRange(receiptsToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 20. Delete JournalEntries first (they reference JournalVouchers)
        //                 var journalEntriesToDelete = await _context.JournalEntries
        //                     .Where(je => je.JournalVoucher != null && je.JournalVoucher.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (journalEntriesToDelete.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} JournalEntries", journalEntriesToDelete.Count);
        //                     _context.JournalEntries.RemoveRange(journalEntriesToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 21. Delete JournalVouchers for this fiscal year
        //                 var journalVouchersToDelete = await _context.JournalVouchers
        //                     .Where(jv => jv.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (journalVouchersToDelete.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} JournalVouchers", journalVouchersToDelete.Count);
        //                     _context.JournalVouchers.RemoveRange(journalVouchersToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 22. Delete DebitNoteEntries first (they reference DebitNotes)
        //                 var debitNoteEntriesToDelete = await _context.DebitNoteEntries
        //                     .Where(dne => dne.DebitNote != null && dne.DebitNote.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (debitNoteEntriesToDelete.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} DebitNoteEntries", debitNoteEntriesToDelete.Count);
        //                     _context.DebitNoteEntries.RemoveRange(debitNoteEntriesToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 23. Delete DebitNotes for this fiscal year
        //                 var debitNotesToDelete = await _context.DebitNotes
        //                     .Where(dn => dn.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (debitNotesToDelete.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} DebitNotes", debitNotesToDelete.Count);
        //                     _context.DebitNotes.RemoveRange(debitNotesToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 24. Delete CreditNoteEntries first (they reference CreditNotes)
        //                 var creditNoteEntriesToDelete = await _context.CreditNoteEntries
        //                     .Where(cne => cne.CreditNote != null && cne.CreditNote.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (creditNoteEntriesToDelete.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} CreditNoteEntries", creditNoteEntriesToDelete.Count);
        //                     _context.CreditNoteEntries.RemoveRange(creditNoteEntriesToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 25. Delete CreditNotes for this fiscal year
        //                 var creditNotesToDelete = await _context.CreditNotes
        //                     .Where(cn => cn.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (creditNotesToDelete.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} CreditNotes", creditNotesToDelete.Count);
        //                     _context.CreditNotes.RemoveRange(creditNotesToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 26. Delete StockAdjustmentItems first (they reference StockAdjustments)
        //                 var stockAdjustmentItemsToDelete = await _context.StockAdjustmentItems
        //                     .Where(sai => sai.StockAdjustment != null && sai.StockAdjustment.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (stockAdjustmentItemsToDelete.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} StockAdjustmentItems", stockAdjustmentItemsToDelete.Count);
        //                     _context.StockAdjustmentItems.RemoveRange(stockAdjustmentItemsToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 27. Delete StockAdjustments for this fiscal year
        //                 var stockAdjustmentsToDelete = await _context.StockAdjustments
        //                     .Where(sa => sa.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (stockAdjustmentsToDelete.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} StockAdjustments", stockAdjustmentsToDelete.Count);
        //                     _context.StockAdjustments.RemoveRange(stockAdjustmentsToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 28. Delete SalesQuotationItems first (they reference SalesQuotations)
        //                 var salesQuotationItemsToDelete = await _context.SalesQuotationItems
        //                     .Where(sqi => sqi.SalesQuotation != null && sqi.SalesQuotation.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (salesQuotationItemsToDelete.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} SalesQuotationItems", salesQuotationItemsToDelete.Count);
        //                     _context.SalesQuotationItems.RemoveRange(salesQuotationItemsToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 29. Delete SalesQuotations for this fiscal year
        //                 var salesQuotationsToDelete = await _context.SalesQuotations
        //                     .Where(sq => sq.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (salesQuotationsToDelete.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} SalesQuotations", salesQuotationsToDelete.Count);
        //                     _context.SalesQuotations.RemoveRange(salesQuotationsToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 30. Delete StockEntries for this fiscal year
        //                 var stockEntriesToDelete = await _context.StockEntries
        //                     .Where(se => se.CompanyId == request.SourceCompanyId && se.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (stockEntriesToDelete.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} stock entries", stockEntriesToDelete.Count);
        //                     _context.StockEntries.RemoveRange(stockEntriesToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 31. Delete BillCounters for this fiscal year
        //                 var billCountersToDelete = await _context.BillCounters
        //                     .Where(bc => bc.CompanyId == request.SourceCompanyId && bc.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (billCountersToDelete.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} bill counters", billCountersToDelete.Count);
        //                     _context.BillCounters.RemoveRange(billCountersToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 32. Delete CompanySettings for this fiscal year
        //                 var settingsToDelete = await _context.CompanySettings
        //                     .Where(s => s.CompanyId == request.SourceCompanyId && s.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (settingsToDelete.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} settings", settingsToDelete.Count);
        //                     _context.CompanySettings.RemoveRange(settingsToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 33. Update items - remove OriginalFiscalYearId reference
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

        //                 // 34. Update accounts - remove OriginalFiscalYearId reference
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

        //                 // 35. Update Users who have this fiscal year as their active fiscal year
        //                 var usersToUpdate = await _context.Users
        //                     .Where(u => u.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (usersToUpdate.Any())
        //                 {
        //                     _logger.LogInformation("Updating {Count} users - changing fiscal year", usersToUpdate.Count);

        //                     // Find another fiscal year for this company to set as active
        //                     var otherFiscalYear = await _context.FiscalYears
        //                         .FirstOrDefaultAsync(f => f.CompanyId == request.SourceCompanyId && f.Id != splitFiscalYear.Id, cancellationToken);

        //                     foreach (var user in usersToUpdate)
        //                     {
        //                         user.FiscalYearId = otherFiscalYear?.Id;
        //                         user.UpdatedAt = DateTime.UtcNow;
        //                     }
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 36. Delete categories for this fiscal year
        //                 var categoriesToDelete = await _context.Categories
        //                     .Where(c => c.CompanyId == request.SourceCompanyId && c.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (categoriesToDelete.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} categories", categoriesToDelete.Count);
        //                     _context.Categories.RemoveRange(categoriesToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 37. Delete item companies for this fiscal year
        //                 var itemCompaniesToDelete = await _context.ItemCompanies
        //                     .Where(ic => ic.CompanyId == request.SourceCompanyId && ic.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (itemCompaniesToDelete.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} item companies", itemCompaniesToDelete.Count);
        //                     _context.ItemCompanies.RemoveRange(itemCompaniesToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 38. Delete main units for this fiscal year
        //                 var mainUnitsToDelete = await _context.MainUnits
        //                     .Where(mu => mu.CompanyId == request.SourceCompanyId && mu.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (mainUnitsToDelete.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} main units", mainUnitsToDelete.Count);
        //                     _context.MainUnits.RemoveRange(mainUnitsToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 39. Delete units for this fiscal year
        //                 var unitsToDelete = await _context.Units
        //                     .Where(u => u.CompanyId == request.SourceCompanyId && u.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (unitsToDelete.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} units", unitsToDelete.Count);
        //                     _context.Units.RemoveRange(unitsToDelete);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 40. Delete OpeningBalances (if they reference this fiscal year)
        //                 var openingBalances = await _context.OpeningBalances
        //                     .Where(ob => ob.FiscalYearId == splitFiscalYear.Id)
        //                     .ToListAsync(cancellationToken);

        //                 if (openingBalances.Any())
        //                 {
        //                     _logger.LogInformation("Deleting {Count} OpeningBalances", openingBalances.Count);
        //                     _context.OpeningBalances.RemoveRange(openingBalances);
        //                     await _context.SaveChangesAsync(cancellationToken);
        //                 }

        //                 // 41. Delete the fiscal year itself
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
        //         // Step 11: Initialize bill counters for new company
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
        //                     StockEntriesCopied = stockEntriesCopied
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

        public async Task SplitFiscalYearAsync(SplitFiscalYearRequestDto request, Guid userId, Func<SplitFiscalYearProgressEventDto, Task> onProgress, CancellationToken cancellationToken = default)
        {
            await onProgress(new SplitFiscalYearProgressEventDto
            {
                Type = "progress",
                Value = 5,
                Message = "Starting company split process..."
            });

            await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);

            // Declare variables at the top to track counts
            int itemsCopied = 0;
            int stockEntriesCopied = 0;
            int sourceAccountGroupsCount = 0;
            int sourceCategoriesCount = 0;
            int sourceItemCompaniesCount = 0;
            int sourceMainUnitsCount = 0;
            int sourceUnitsCount = 0;
            int sourceAccountsCount = 0;
            int openingBalancesCopied = 0;

            try
            {
                _logger.LogInformation("=== Starting SplitFiscalYearAsync ===");
                _logger.LogInformation("SourceCompanyId: {SourceCompanyId}", request.SourceCompanyId);
                _logger.LogInformation("FiscalYearId: {FiscalYearId}", request.FiscalYearId);
                _logger.LogInformation("NewCompanyName: {NewCompanyName}", request.NewCompanyName);
                _logger.LogInformation("DeleteAfterSplit: {DeleteAfterSplit}", request.DeleteAfterSplit);

                // Get source company
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

                // Get fiscal year to split
                var splitFiscalYear = await _context.FiscalYears
                    .FirstOrDefaultAsync(f => f.Id == request.FiscalYearId && f.CompanyId == request.SourceCompanyId, cancellationToken);

                if (splitFiscalYear == null)
                {
                    await onProgress(new SplitFiscalYearProgressEventDto
                    {
                        Type = "error",
                        Error = "Fiscal year not found in source company"
                    });
                    return;
                }

                // Check if new company name already exists
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

                // Step 1: Create new company
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
                    FiscalYearStartDateEnglish = splitFiscalYear.StartDate,
                    FiscalYearStartDateNepali = splitFiscalYear.StartDateNepali ?? string.Empty,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.Companies.Add(newCompany);
                await _context.SaveChangesAsync(cancellationToken);
                _logger.LogInformation("New company created with ID: {CompanyId}", newCompany.Id);

                // Step 2: Create fiscal year for new company
                await onProgress(new SplitFiscalYearProgressEventDto
                {
                    Type = "progress",
                    Value = 15,
                    Message = "Setting up fiscal years..."
                });

                var newFiscalYear = new FiscalYear
                {
                    Id = Guid.NewGuid(),
                    Name = splitFiscalYear.Name,
                    StartDate = splitFiscalYear.StartDate,
                    EndDate = splitFiscalYear.EndDate,
                    StartDateNepali = splitFiscalYear.StartDateNepali,
                    EndDateNepali = splitFiscalYear.EndDateNepali,
                    DateFormat = splitFiscalYear.DateFormat,
                    CompanyId = newCompany.Id,
                    IsActive = true,
                    BillPrefixes = new BillPrefixes(),
                    CreatedAt = DateTime.UtcNow
                };

                _context.FiscalYears.Add(newFiscalYear);
                await _context.SaveChangesAsync(cancellationToken);
                _logger.LogInformation("New fiscal year created with ID: {FiscalYearId}", newFiscalYear.Id);

                // Step 3: Clone settings
                await onProgress(new SplitFiscalYearProgressEventDto
                {
                    Type = "progress",
                    Value = 20,
                    Message = "Cloning settings..."
                });

                try
                {
                    var sourceSettings = await _context.CompanySettings
                        .FirstOrDefaultAsync(s => s.CompanyId == request.SourceCompanyId && s.FiscalYearId == splitFiscalYear.Id, cancellationToken);

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

                // Step 4: Clone account groups
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

                // Step 5: Clone accounts
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

                // Step 6: Clone OpeningBalanceByFiscalYear (Transfer opening balances to new fiscal year)
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
                    // Get the new account ID from the mapping
                    if (!accountMap.TryGetValue(openingBalance.AccountId, out var newAccountId))
                    {
                        _logger.LogWarning($"Account {openingBalance.AccountId} not found in account map, skipping opening balance");
                        continue;
                    }

                    // Check if opening balance already exists for this account in the new fiscal year
                    var existingOpeningBalance = await _context.OpeningBalanceByFiscalYear
                        .FirstOrDefaultAsync(ob => ob.AccountId == newAccountId && ob.FiscalYearId == newFiscalYear.Id, cancellationToken);

                    if (existingOpeningBalance != null)
                    {
                        // Update existing opening balance
                        existingOpeningBalance.Amount = openingBalance.Amount;
                        existingOpeningBalance.Type = openingBalance.Type;
                        existingOpeningBalance.Date = openingBalance.Date;
                        existingOpeningBalance.NepaliDate = openingBalance.NepaliDate;
                        existingOpeningBalance.CompanyId = newCompany.Id;
                    }
                    else
                    {
                        // Create new opening balance for the new fiscal year
                        var newOpeningBalance = new OpeningBalanceByFiscalYear
                        {
                            Id = Guid.NewGuid(),
                            AccountId = newAccountId,
                            FiscalYearId = newFiscalYear.Id,
                            CompanyId = newCompany.Id,
                            Amount = openingBalance.Amount,
                            Type = openingBalance.Type,
                            Date = openingBalance.Date,
                            NepaliDate = openingBalance.NepaliDate,
                        };
                        _context.OpeningBalanceByFiscalYear.Add(newOpeningBalance);
                    }

                    openingBalancesCopied++;
                }

                await _context.SaveChangesAsync(cancellationToken);
                _logger.LogInformation("Cloned {Count} opening balances", openingBalancesCopied);

                // Step 7: Clone categories
                await onProgress(new SplitFiscalYearProgressEventDto
                {
                    Type = "progress",
                    Value = 45,
                    Message = "Cloning categories..."
                });

                var categoryMap = new Dictionary<Guid, Guid>();
                var sourceCategories = await _context.Categories
                    .Where(c => c.CompanyId == request.SourceCompanyId && c.FiscalYearId == splitFiscalYear.Id)
                    .ToListAsync(cancellationToken);

                sourceCategoriesCount = sourceCategories.Count;

                foreach (var category in sourceCategories)
                {
                    var newCategory = new Category
                    {
                        Id = Guid.NewGuid(),
                        Name = category.Name,
                        UniqueNumber = category.UniqueNumber,
                        CompanyId = newCompany.Id,
                        FiscalYearId = newFiscalYear.Id,
                        OriginalFiscalYearId = newFiscalYear.Id,
                        Date = DateTime.UtcNow,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.Categories.Add(newCategory);
                    categoryMap[category.Id] = newCategory.Id;
                }
                await _context.SaveChangesAsync(cancellationToken);
                _logger.LogInformation("Cloned {Count} categories", sourceCategories.Count);

                // Step 8: Clone item companies
                await onProgress(new SplitFiscalYearProgressEventDto
                {
                    Type = "progress",
                    Value = 50,
                    Message = "Cloning item companies..."
                });

                var itemCompanyMap = new Dictionary<Guid, Guid>();
                var sourceItemCompanies = await _context.ItemCompanies
                    .Where(ic => ic.CompanyId == request.SourceCompanyId && ic.FiscalYearId == splitFiscalYear.Id)
                    .ToListAsync(cancellationToken);

                sourceItemCompaniesCount = sourceItemCompanies.Count;

                foreach (var itemCompany in sourceItemCompanies)
                {
                    var newItemCompany = new ItemCompany
                    {
                        Id = Guid.NewGuid(),
                        Name = itemCompany.Name,
                        UniqueNumber = itemCompany.UniqueNumber,
                        CompanyId = newCompany.Id,
                        FiscalYearId = newFiscalYear.Id,
                        OriginalFiscalYearId = newFiscalYear.Id,
                        Date = DateTime.UtcNow,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.ItemCompanies.Add(newItemCompany);
                    itemCompanyMap[itemCompany.Id] = newItemCompany.Id;
                }
                await _context.SaveChangesAsync(cancellationToken);
                _logger.LogInformation("Cloned {Count} item companies", sourceItemCompanies.Count);

                // Step 9: Clone main units
                await onProgress(new SplitFiscalYearProgressEventDto
                {
                    Type = "progress",
                    Value = 53,
                    Message = "Cloning main units..."
                });

                var mainUnitMap = new Dictionary<Guid, Guid>();
                var sourceMainUnits = await _context.MainUnits
                    .Where(mu => mu.CompanyId == request.SourceCompanyId && mu.FiscalYearId == splitFiscalYear.Id)
                    .ToListAsync(cancellationToken);

                sourceMainUnitsCount = sourceMainUnits.Count;

                foreach (var mainUnit in sourceMainUnits)
                {
                    var newMainUnit = new MainUnit
                    {
                        Id = Guid.NewGuid(),
                        Name = mainUnit.Name,
                        UniqueNumber = mainUnit.UniqueNumber,
                        CompanyId = newCompany.Id,
                        FiscalYearId = newFiscalYear.Id,
                        OriginalFiscalYearId = newFiscalYear.Id,
                        Date = DateTime.UtcNow,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.MainUnits.Add(newMainUnit);
                    mainUnitMap[mainUnit.Id] = newMainUnit.Id;
                }
                await _context.SaveChangesAsync(cancellationToken);
                _logger.LogInformation("Cloned {Count} main units", sourceMainUnits.Count);

                // Step 10: Clone units
                await onProgress(new SplitFiscalYearProgressEventDto
                {
                    Type = "progress",
                    Value = 55,
                    Message = "Cloning units..."
                });

                var unitMap = new Dictionary<Guid, Guid>();
                var sourceUnits = await _context.Units
                    .Where(u => u.CompanyId == request.SourceCompanyId && u.FiscalYearId == splitFiscalYear.Id)
                    .ToListAsync(cancellationToken);

                sourceUnitsCount = sourceUnits.Count;

                foreach (var unit in sourceUnits)
                {
                    var newUnit = new Unit
                    {
                        Id = Guid.NewGuid(),
                        Name = unit.Name,
                        UniqueNumber = unit.UniqueNumber,
                        CompanyId = newCompany.Id,
                        FiscalYearId = newFiscalYear.Id,
                        OriginalFiscalYearId = newFiscalYear.Id,
                        Date = DateTime.UtcNow,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.Units.Add(newUnit);
                    unitMap[unit.Id] = newUnit.Id;
                }
                await _context.SaveChangesAsync(cancellationToken);
                _logger.LogInformation("Cloned {Count} units", sourceUnits.Count);

                // Step 11: Clone items with stock entries
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
                    .ToListAsync(cancellationToken);

                if (!sourceItems.Any())
                {
                    _logger.LogWarning("No items found with OriginalFiscalYearId = {FiscalYearId}, fetching all items for company", splitFiscalYear.Id);
                    sourceItems = await _context.Items
                        .Where(i => i.CompanyId == request.SourceCompanyId)
                        .Include(i => i.StockEntries)
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
                        _logger.LogError(ex, $"Error cloning item {item.Name} (ID: {item.Id})");
                    }
                }

                await _context.SaveChangesAsync(cancellationToken);
                _logger.LogInformation("Cloned {Count} items with {StockCount} stock entries", itemsCopied, stockEntriesCopied);

                // ============================================================
                // DELETE FISCAL YEAR FROM SOURCE COMPANY IF REQUESTED
                // ============================================================
                if (request.DeleteAfterSplit)
                {
                    await onProgress(new SplitFiscalYearProgressEventDto
                    {
                        Type = "progress",
                        Value = 85,
                        Message = "Removing split fiscal year from source company..."
                    });

                    _logger.LogInformation("Starting deletion of fiscal year {FiscalYearId} from source company", splitFiscalYear.Id);

                    try
                    {
                        // 1. Check if this is the only fiscal year for the company
                        var fiscalYearCount = await _context.FiscalYears
                            .CountAsync(f => f.CompanyId == request.SourceCompanyId, cancellationToken);

                        if (fiscalYearCount <= 1)
                        {
                            await onProgress(new SplitFiscalYearProgressEventDto
                            {
                                Type = "error",
                                Error = "Cannot delete the last remaining fiscal year in the source company.",
                                Message = "The company must have at least one fiscal year."
                            });
                            await transaction.RollbackAsync(cancellationToken);
                            return;
                        }

                        // 2. FIRST: Get all transaction IDs that reference this fiscal year
                        var transactionIds = await _context.Transactions
                            .Where(t => t.FiscalYearId == splitFiscalYear.Id)
                            .Select(t => t.Id)
                            .ToListAsync(cancellationToken);

                        // 3. Delete TransactionItems that reference these transactions
                        if (transactionIds.Any())
                        {
                            var transactionItemsToDelete = await _context.TransactionItems
                                .Where(ti => transactionIds.Contains(ti.TransactionId))
                                .ToListAsync(cancellationToken);

                            if (transactionItemsToDelete.Any())
                            {
                                _logger.LogInformation("Deleting {Count} TransactionItems", transactionItemsToDelete.Count);
                                _context.TransactionItems.RemoveRange(transactionItemsToDelete);
                                await _context.SaveChangesAsync(cancellationToken);
                            }

                            // 4. Delete Transactions that reference this fiscal year
                            var transactionsToDelete = await _context.Transactions
                                .Where(t => t.FiscalYearId == splitFiscalYear.Id)
                                .ToListAsync(cancellationToken);

                            if (transactionsToDelete.Any())
                            {
                                _logger.LogInformation("Deleting {Count} Transactions", transactionsToDelete.Count);
                                _context.Transactions.RemoveRange(transactionsToDelete);
                                await _context.SaveChangesAsync(cancellationToken);
                            }
                        }

                        // 5. Delete all other related records...
                        // (Continue with the rest of your deletion code)

                        // 6. Delete OpeningBalanceByFiscalYear records
                        var openingBalancesToDelete = await _context.OpeningBalanceByFiscalYear
                            .Where(ob => ob.FiscalYearId == splitFiscalYear.Id)
                            .ToListAsync(cancellationToken);

                        if (openingBalancesToDelete.Any())
                        {
                            _logger.LogInformation("Deleting {Count} OpeningBalanceByFiscalYear records", openingBalancesToDelete.Count);
                            _context.OpeningBalanceByFiscalYear.RemoveRange(openingBalancesToDelete);
                            await _context.SaveChangesAsync(cancellationToken);
                        }

                        // 7. Delete ClosingBalanceByFiscalYear records
                        var closingBalancesToDelete = await _context.ClosingBalanceByFiscalYear
                            .Where(cb => cb.FiscalYearId == splitFiscalYear.Id)
                            .ToListAsync(cancellationToken);

                        if (closingBalancesToDelete.Any())
                        {
                            _logger.LogInformation("Deleting {Count} ClosingBalanceByFiscalYear records", closingBalancesToDelete.Count);
                            _context.ClosingBalanceByFiscalYear.RemoveRange(closingBalancesToDelete);
                            await _context.SaveChangesAsync(cancellationToken);
                        }

                        // 8. Delete OpeningBalances
                        var openingBalances = await _context.OpeningBalances
                            .Where(ob => ob.FiscalYearId == splitFiscalYear.Id)
                            .ToListAsync(cancellationToken);

                        if (openingBalances.Any())
                        {
                            _logger.LogInformation("Deleting {Count} OpeningBalances", openingBalances.Count);
                            _context.OpeningBalances.RemoveRange(openingBalances);
                            await _context.SaveChangesAsync(cancellationToken);
                        }

                        // 9. Delete ItemOpeningStockByFiscalYear records
                        var itemOpeningStocksToDelete = await _context.ItemOpeningStockByFiscalYear
                            .Where(ios => ios.FiscalYearId == splitFiscalYear.Id)
                            .ToListAsync(cancellationToken);

                        if (itemOpeningStocksToDelete.Any())
                        {
                            _logger.LogInformation("Deleting {Count} ItemOpeningStockByFiscalYear records", itemOpeningStocksToDelete.Count);
                            _context.ItemOpeningStockByFiscalYear.RemoveRange(itemOpeningStocksToDelete);
                            await _context.SaveChangesAsync(cancellationToken);
                        }

                        // 10. Delete ItemClosingStockByFiscalYear records
                        var itemClosingStocksToDelete = await _context.ItemClosingStockByFiscalYear
                            .Where(ics => ics.FiscalYearId == splitFiscalYear.Id)
                            .ToListAsync(cancellationToken);

                        if (itemClosingStocksToDelete.Any())
                        {
                            _logger.LogInformation("Deleting {Count} ItemClosingStockByFiscalYear records", itemClosingStocksToDelete.Count);
                            _context.ItemClosingStockByFiscalYear.RemoveRange(itemClosingStocksToDelete);
                            await _context.SaveChangesAsync(cancellationToken);
                        }

                        // 11. Delete SalesBillItems first (they reference SalesBills)
                        var salesBillItemsToDelete = await _context.SalesBillItems
                            .Where(sbi => sbi.SalesBill != null && sbi.SalesBill.FiscalYearId == splitFiscalYear.Id)
                            .ToListAsync(cancellationToken);

                        if (salesBillItemsToDelete.Any())
                        {
                            _logger.LogInformation("Deleting {Count} SalesBillItems", salesBillItemsToDelete.Count);
                            _context.SalesBillItems.RemoveRange(salesBillItemsToDelete);
                            await _context.SaveChangesAsync(cancellationToken);
                        }

                        // 12. Delete SalesBills
                        var salesBillsToDelete = await _context.SalesBills
                            .Where(sb => sb.FiscalYearId == splitFiscalYear.Id)
                            .ToListAsync(cancellationToken);

                        if (salesBillsToDelete.Any())
                        {
                            _logger.LogInformation("Deleting {Count} SalesBills", salesBillsToDelete.Count);
                            _context.SalesBills.RemoveRange(salesBillsToDelete);
                            await _context.SaveChangesAsync(cancellationToken);
                        }

                        // 13. Delete PurchaseBillItems first
                        var purchaseBillItemsToDelete = await _context.PurchaseBillItems
                            .Where(pbi => pbi.PurchaseBill != null && pbi.PurchaseBill.FiscalYearId == splitFiscalYear.Id)
                            .ToListAsync(cancellationToken);

                        if (purchaseBillItemsToDelete.Any())
                        {
                            _logger.LogInformation("Deleting {Count} PurchaseBillItems", purchaseBillItemsToDelete.Count);
                            _context.PurchaseBillItems.RemoveRange(purchaseBillItemsToDelete);
                            await _context.SaveChangesAsync(cancellationToken);
                        }

                        // 14. Delete PurchaseBills
                        var purchaseBillsToDelete = await _context.PurchaseBills
                            .Where(pb => pb.FiscalYearId == splitFiscalYear.Id)
                            .ToListAsync(cancellationToken);

                        if (purchaseBillsToDelete.Any())
                        {
                            _logger.LogInformation("Deleting {Count} PurchaseBills", purchaseBillsToDelete.Count);
                            _context.PurchaseBills.RemoveRange(purchaseBillsToDelete);
                            await _context.SaveChangesAsync(cancellationToken);
                        }

                        // 15. Delete SalesReturnItems first
                        var salesReturnItemsToDelete = await _context.SalesReturnItems
                            .Where(sri => sri.SalesReturn != null && sri.SalesReturn.FiscalYearId == splitFiscalYear.Id)
                            .ToListAsync(cancellationToken);

                        if (salesReturnItemsToDelete.Any())
                        {
                            _logger.LogInformation("Deleting {Count} SalesReturnItems", salesReturnItemsToDelete.Count);
                            _context.SalesReturnItems.RemoveRange(salesReturnItemsToDelete);
                            await _context.SaveChangesAsync(cancellationToken);
                        }

                        // 16. Delete SalesReturns
                        var salesReturnsToDelete = await _context.SalesReturns
                            .Where(sr => sr.FiscalYearId == splitFiscalYear.Id)
                            .ToListAsync(cancellationToken);

                        if (salesReturnsToDelete.Any())
                        {
                            _logger.LogInformation("Deleting {Count} SalesReturns", salesReturnsToDelete.Count);
                            _context.SalesReturns.RemoveRange(salesReturnsToDelete);
                            await _context.SaveChangesAsync(cancellationToken);
                        }

                        // 17. Delete PurchaseReturnItems first
                        var purchaseReturnItemsToDelete = await _context.PurchaseReturnItems
                            .Where(pri => pri.PurchaseReturn != null && pri.PurchaseReturn.FiscalYearId == splitFiscalYear.Id)
                            .ToListAsync(cancellationToken);

                        if (purchaseReturnItemsToDelete.Any())
                        {
                            _logger.LogInformation("Deleting {Count} PurchaseReturnItems", purchaseReturnItemsToDelete.Count);
                            _context.PurchaseReturnItems.RemoveRange(purchaseReturnItemsToDelete);
                            await _context.SaveChangesAsync(cancellationToken);
                        }

                        // 18. Delete PurchaseReturns
                        var purchaseReturnsToDelete = await _context.PurchaseReturns
                            .Where(pr => pr.FiscalYearId == splitFiscalYear.Id)
                            .ToListAsync(cancellationToken);

                        if (purchaseReturnsToDelete.Any())
                        {
                            _logger.LogInformation("Deleting {Count} PurchaseReturns", purchaseReturnsToDelete.Count);
                            _context.PurchaseReturns.RemoveRange(purchaseReturnsToDelete);
                            await _context.SaveChangesAsync(cancellationToken);
                        }

                        // 19. Delete PaymentEntries first
                        var paymentEntriesToDelete = await _context.PaymentEntries
                            .Where(pe => pe.Payment != null && pe.Payment.FiscalYearId == splitFiscalYear.Id)
                            .ToListAsync(cancellationToken);

                        if (paymentEntriesToDelete.Any())
                        {
                            _logger.LogInformation("Deleting {Count} PaymentEntries", paymentEntriesToDelete.Count);
                            _context.PaymentEntries.RemoveRange(paymentEntriesToDelete);
                            await _context.SaveChangesAsync(cancellationToken);
                        }

                        // 20. Delete Payments
                        var paymentsToDelete = await _context.Payments
                            .Where(p => p.FiscalYearId == splitFiscalYear.Id)
                            .ToListAsync(cancellationToken);

                        if (paymentsToDelete.Any())
                        {
                            _logger.LogInformation("Deleting {Count} Payments", paymentsToDelete.Count);
                            _context.Payments.RemoveRange(paymentsToDelete);
                            await _context.SaveChangesAsync(cancellationToken);
                        }

                        // 21. Delete ReceiptEntries first
                        var receiptEntriesToDelete = await _context.ReceiptEntries
                            .Where(re => re.Receipt != null && re.Receipt.FiscalYearId == splitFiscalYear.Id)
                            .ToListAsync(cancellationToken);

                        if (receiptEntriesToDelete.Any())
                        {
                            _logger.LogInformation("Deleting {Count} ReceiptEntries", receiptEntriesToDelete.Count);
                            _context.ReceiptEntries.RemoveRange(receiptEntriesToDelete);
                            await _context.SaveChangesAsync(cancellationToken);
                        }

                        // 22. Delete Receipts
                        var receiptsToDelete = await _context.Receipts
                            .Where(r => r.FiscalYearId == splitFiscalYear.Id)
                            .ToListAsync(cancellationToken);

                        if (receiptsToDelete.Any())
                        {
                            _logger.LogInformation("Deleting {Count} Receipts", receiptsToDelete.Count);
                            _context.Receipts.RemoveRange(receiptsToDelete);
                            await _context.SaveChangesAsync(cancellationToken);
                        }

                        // 23. Delete JournalEntries first
                        var journalEntriesToDelete = await _context.JournalEntries
                            .Where(je => je.JournalVoucher != null && je.JournalVoucher.FiscalYearId == splitFiscalYear.Id)
                            .ToListAsync(cancellationToken);

                        if (journalEntriesToDelete.Any())
                        {
                            _logger.LogInformation("Deleting {Count} JournalEntries", journalEntriesToDelete.Count);
                            _context.JournalEntries.RemoveRange(journalEntriesToDelete);
                            await _context.SaveChangesAsync(cancellationToken);
                        }

                        // 24. Delete JournalVouchers
                        var journalVouchersToDelete = await _context.JournalVouchers
                            .Where(jv => jv.FiscalYearId == splitFiscalYear.Id)
                            .ToListAsync(cancellationToken);

                        if (journalVouchersToDelete.Any())
                        {
                            _logger.LogInformation("Deleting {Count} JournalVouchers", journalVouchersToDelete.Count);
                            _context.JournalVouchers.RemoveRange(journalVouchersToDelete);
                            await _context.SaveChangesAsync(cancellationToken);
                        }

                        // 25. Delete DebitNoteEntries first
                        var debitNoteEntriesToDelete = await _context.DebitNoteEntries
                            .Where(dne => dne.DebitNote != null && dne.DebitNote.FiscalYearId == splitFiscalYear.Id)
                            .ToListAsync(cancellationToken);

                        if (debitNoteEntriesToDelete.Any())
                        {
                            _logger.LogInformation("Deleting {Count} DebitNoteEntries", debitNoteEntriesToDelete.Count);
                            _context.DebitNoteEntries.RemoveRange(debitNoteEntriesToDelete);
                            await _context.SaveChangesAsync(cancellationToken);
                        }

                        // 26. Delete DebitNotes
                        var debitNotesToDelete = await _context.DebitNotes
                            .Where(dn => dn.FiscalYearId == splitFiscalYear.Id)
                            .ToListAsync(cancellationToken);

                        if (debitNotesToDelete.Any())
                        {
                            _logger.LogInformation("Deleting {Count} DebitNotes", debitNotesToDelete.Count);
                            _context.DebitNotes.RemoveRange(debitNotesToDelete);
                            await _context.SaveChangesAsync(cancellationToken);
                        }

                        // 27. Delete CreditNoteEntries first
                        var creditNoteEntriesToDelete = await _context.CreditNoteEntries
                            .Where(cne => cne.CreditNote != null && cne.CreditNote.FiscalYearId == splitFiscalYear.Id)
                            .ToListAsync(cancellationToken);

                        if (creditNoteEntriesToDelete.Any())
                        {
                            _logger.LogInformation("Deleting {Count} CreditNoteEntries", creditNoteEntriesToDelete.Count);
                            _context.CreditNoteEntries.RemoveRange(creditNoteEntriesToDelete);
                            await _context.SaveChangesAsync(cancellationToken);
                        }

                        // 28. Delete CreditNotes
                        var creditNotesToDelete = await _context.CreditNotes
                            .Where(cn => cn.FiscalYearId == splitFiscalYear.Id)
                            .ToListAsync(cancellationToken);

                        if (creditNotesToDelete.Any())
                        {
                            _logger.LogInformation("Deleting {Count} CreditNotes", creditNotesToDelete.Count);
                            _context.CreditNotes.RemoveRange(creditNotesToDelete);
                            await _context.SaveChangesAsync(cancellationToken);
                        }

                        // 29. Delete StockAdjustmentItems first
                        var stockAdjustmentItemsToDelete = await _context.StockAdjustmentItems
                            .Where(sai => sai.StockAdjustment != null && sai.StockAdjustment.FiscalYearId == splitFiscalYear.Id)
                            .ToListAsync(cancellationToken);

                        if (stockAdjustmentItemsToDelete.Any())
                        {
                            _logger.LogInformation("Deleting {Count} StockAdjustmentItems", stockAdjustmentItemsToDelete.Count);
                            _context.StockAdjustmentItems.RemoveRange(stockAdjustmentItemsToDelete);
                            await _context.SaveChangesAsync(cancellationToken);
                        }

                        // 30. Delete StockAdjustments
                        var stockAdjustmentsToDelete = await _context.StockAdjustments
                            .Where(sa => sa.FiscalYearId == splitFiscalYear.Id)
                            .ToListAsync(cancellationToken);

                        if (stockAdjustmentsToDelete.Any())
                        {
                            _logger.LogInformation("Deleting {Count} StockAdjustments", stockAdjustmentsToDelete.Count);
                            _context.StockAdjustments.RemoveRange(stockAdjustmentsToDelete);
                            await _context.SaveChangesAsync(cancellationToken);
                        }

                        // 31. Delete SalesQuotationItems first
                        var salesQuotationItemsToDelete = await _context.SalesQuotationItems
                            .Where(sqi => sqi.SalesQuotation != null && sqi.SalesQuotation.FiscalYearId == splitFiscalYear.Id)
                            .ToListAsync(cancellationToken);

                        if (salesQuotationItemsToDelete.Any())
                        {
                            _logger.LogInformation("Deleting {Count} SalesQuotationItems", salesQuotationItemsToDelete.Count);
                            _context.SalesQuotationItems.RemoveRange(salesQuotationItemsToDelete);
                            await _context.SaveChangesAsync(cancellationToken);
                        }

                        // 32. Delete SalesQuotations
                        var salesQuotationsToDelete = await _context.SalesQuotations
                            .Where(sq => sq.FiscalYearId == splitFiscalYear.Id)
                            .ToListAsync(cancellationToken);

                        if (salesQuotationsToDelete.Any())
                        {
                            _logger.LogInformation("Deleting {Count} SalesQuotations", salesQuotationsToDelete.Count);
                            _context.SalesQuotations.RemoveRange(salesQuotationsToDelete);
                            await _context.SaveChangesAsync(cancellationToken);
                        }

                        // 33. Delete StockEntries
                        var stockEntriesToDelete = await _context.StockEntries
                            .Where(se => se.CompanyId == request.SourceCompanyId && se.FiscalYearId == splitFiscalYear.Id)
                            .ToListAsync(cancellationToken);

                        if (stockEntriesToDelete.Any())
                        {
                            _logger.LogInformation("Deleting {Count} stock entries", stockEntriesToDelete.Count);
                            _context.StockEntries.RemoveRange(stockEntriesToDelete);
                            await _context.SaveChangesAsync(cancellationToken);
                        }

                        // 34. Delete BillCounters
                        var billCountersToDelete = await _context.BillCounters
                            .Where(bc => bc.CompanyId == request.SourceCompanyId && bc.FiscalYearId == splitFiscalYear.Id)
                            .ToListAsync(cancellationToken);

                        if (billCountersToDelete.Any())
                        {
                            _logger.LogInformation("Deleting {Count} bill counters", billCountersToDelete.Count);
                            _context.BillCounters.RemoveRange(billCountersToDelete);
                            await _context.SaveChangesAsync(cancellationToken);
                        }

                        // 35. Delete CompanySettings
                        var settingsToDelete = await _context.CompanySettings
                            .Where(s => s.CompanyId == request.SourceCompanyId && s.FiscalYearId == splitFiscalYear.Id)
                            .ToListAsync(cancellationToken);

                        if (settingsToDelete.Any())
                        {
                            _logger.LogInformation("Deleting {Count} settings", settingsToDelete.Count);
                            _context.CompanySettings.RemoveRange(settingsToDelete);
                            await _context.SaveChangesAsync(cancellationToken);
                        }

                        // 36. Update items - remove OriginalFiscalYearId reference
                        var itemsToUpdate = await _context.Items
                            .Where(i => i.CompanyId == request.SourceCompanyId && i.OriginalFiscalYearId == splitFiscalYear.Id)
                            .ToListAsync(cancellationToken);

                        if (itemsToUpdate.Any())
                        {
                            _logger.LogInformation("Updating {Count} items - removing fiscal year reference", itemsToUpdate.Count);
                            foreach (var item in itemsToUpdate)
                            {
                                item.OriginalFiscalYearId = null;
                            }
                            await _context.SaveChangesAsync(cancellationToken);
                        }

                        // 37. Update accounts - remove OriginalFiscalYearId reference
                        var accountsToUpdate = await _context.Accounts
                            .Where(a => a.CompanyId == request.SourceCompanyId && a.OriginalFiscalYearId == splitFiscalYear.Id)
                            .ToListAsync(cancellationToken);

                        if (accountsToUpdate.Any())
                        {
                            _logger.LogInformation("Updating {Count} accounts - removing fiscal year reference", accountsToUpdate.Count);
                            foreach (var account in accountsToUpdate)
                            {
                                account.OriginalFiscalYearId = null;
                            }
                            await _context.SaveChangesAsync(cancellationToken);
                        }

                        // 38. Update Users
                        var usersToUpdate = await _context.Users
                            .Where(u => u.FiscalYearId == splitFiscalYear.Id)
                            .ToListAsync(cancellationToken);

                        if (usersToUpdate.Any())
                        {
                            _logger.LogInformation("Updating {Count} users - changing fiscal year", usersToUpdate.Count);
                            var otherFiscalYear = await _context.FiscalYears
                                .FirstOrDefaultAsync(f => f.CompanyId == request.SourceCompanyId && f.Id != splitFiscalYear.Id, cancellationToken);

                            foreach (var user in usersToUpdate)
                            {
                                user.FiscalYearId = otherFiscalYear?.Id;
                                user.UpdatedAt = DateTime.UtcNow;
                            }
                            await _context.SaveChangesAsync(cancellationToken);
                        }

                        // 39. Delete categories
                        var categoriesToDelete = await _context.Categories
                            .Where(c => c.CompanyId == request.SourceCompanyId && c.FiscalYearId == splitFiscalYear.Id)
                            .ToListAsync(cancellationToken);

                        if (categoriesToDelete.Any())
                        {
                            _logger.LogInformation("Deleting {Count} categories", categoriesToDelete.Count);
                            _context.Categories.RemoveRange(categoriesToDelete);
                            await _context.SaveChangesAsync(cancellationToken);
                        }

                        // 40. Delete item companies
                        var itemCompaniesToDelete = await _context.ItemCompanies
                            .Where(ic => ic.CompanyId == request.SourceCompanyId && ic.FiscalYearId == splitFiscalYear.Id)
                            .ToListAsync(cancellationToken);

                        if (itemCompaniesToDelete.Any())
                        {
                            _logger.LogInformation("Deleting {Count} item companies", itemCompaniesToDelete.Count);
                            _context.ItemCompanies.RemoveRange(itemCompaniesToDelete);
                            await _context.SaveChangesAsync(cancellationToken);
                        }

                        // 41. Delete main units
                        var mainUnitsToDelete = await _context.MainUnits
                            .Where(mu => mu.CompanyId == request.SourceCompanyId && mu.FiscalYearId == splitFiscalYear.Id)
                            .ToListAsync(cancellationToken);

                        if (mainUnitsToDelete.Any())
                        {
                            _logger.LogInformation("Deleting {Count} main units", mainUnitsToDelete.Count);
                            _context.MainUnits.RemoveRange(mainUnitsToDelete);
                            await _context.SaveChangesAsync(cancellationToken);
                        }

                        // 42. Delete units
                        var unitsToDelete = await _context.Units
                            .Where(u => u.CompanyId == request.SourceCompanyId && u.FiscalYearId == splitFiscalYear.Id)
                            .ToListAsync(cancellationToken);

                        if (unitsToDelete.Any())
                        {
                            _logger.LogInformation("Deleting {Count} units", unitsToDelete.Count);
                            _context.Units.RemoveRange(unitsToDelete);
                            await _context.SaveChangesAsync(cancellationToken);
                        }

                        // 43. Delete the fiscal year itself
                        _context.FiscalYears.Remove(splitFiscalYear);
                        await _context.SaveChangesAsync(cancellationToken);

                        _logger.LogInformation("Successfully deleted fiscal year {FiscalYearId} from source company", splitFiscalYear.Id);

                        await onProgress(new SplitFiscalYearProgressEventDto
                        {
                            Type = "progress",
                            Value = 95,
                            Message = "Split fiscal year removed from source company"
                        });
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error during deletion of fiscal year");
                        await onProgress(new SplitFiscalYearProgressEventDto
                        {
                            Type = "error",
                            Error = $"Failed to delete fiscal year: {ex.Message}",
                            Details = ex.StackTrace
                        });
                        throw;
                    }
                }

                // Step 12: Initialize bill counters for new company
                await onProgress(new SplitFiscalYearProgressEventDto
                {
                    Type = "progress",
                    Value = 80,
                    Message = "Initializing counters..."
                });

                var transactionTypes = new[]
                {
            "Sales", "Purchase", "SalesReturn", "PurchaseReturn",
            "Payment", "Receipt", "Journal", "DebitNote", "CreditNote", "StockAdjustment"
        };

                foreach (var transactionType in transactionTypes)
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
                await _context.SaveChangesAsync(cancellationToken);

                // Commit transaction
                await transaction.CommitAsync(cancellationToken);
                _logger.LogInformation("Transaction committed successfully");

                // Prepare result
                var result = new SplitFiscalYearResultDto
                {
                    Success = true,
                    Message = request.DeleteAfterSplit
                        ? $"Company split successfully. New company \"{request.NewCompanyName}\" created and fiscal year removed from source company."
                        : $"Company split successfully. New company \"{request.NewCompanyName}\" created with cloned data.",
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
                            Name = splitFiscalYear.Name
                        },
                        Statistics = new SplitStatisticsDto
                        {
                            UsersCopied = 1,
                            CompanyGroupsCopied = sourceAccountGroupsCount,
                            CategoriesCopied = sourceCategoriesCount,
                            ItemsCompaniesCopied = sourceItemCompaniesCount,
                            MainUnitsCopied = sourceMainUnitsCount,
                            UnitsCopied = sourceUnitsCount,
                            CompositionsCopied = 0,
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


