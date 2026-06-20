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
            // Check if fiscal year already exists
            var existingFiscalYear = await _context.FiscalYears
                .FirstOrDefaultAsync(f => f.CompanyId == fiscalYear.CompanyId && f.Name == fiscalYear.Name);

            if (existingFiscalYear != null)
            {
                return existingFiscalYear; // Return existing one
            }

            if (fiscalYear.DateFormat == DateFormatEnum.Nepali)
            {
                if (!fiscalYear.StartDate.HasValue)
                    fiscalYear.StartDate = DateTime.MinValue;
                if (!fiscalYear.EndDate.HasValue)
                    fiscalYear.EndDate = DateTime.MinValue;
            }

            // Generate bill prefixes if not provided
            if (fiscalYear.BillPrefixes == null)
                fiscalYear.BillPrefixes = new BillPrefixes();

            var generatedPrefixes = new HashSet<string>();

            // Define transaction types
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

            // Generate unique prefixes
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

            // Generate new Guid if not provided
            if (fiscalYear.Id == Guid.Empty)
            {
                fiscalYear.Id = Guid.NewGuid();
            }

            // Set default dates if not provided
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
                // Deactivate all other fiscal years for this company
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

            try
            {
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
                    Address = sourceCompany.Address,
                    Country = sourceCompany.Country,
                    State = sourceCompany.State,
                    City = sourceCompany.City,
                    Ward = sourceCompany.Ward,
                    Phone = sourceCompany.Phone,
                    Pan = sourceCompany.Pan,
                    Email = sourceCompany.Email,
                    VatEnabled = sourceCompany.VatEnabled,
                    DateFormat = sourceCompany.DateFormat,
                    FiscalYearStartDateEnglish = splitFiscalYear.StartDate,
                    FiscalYearStartDateNepali = splitFiscalYear.StartDateNepali ?? string.Empty,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.Companies.Add(newCompany);
                await _context.SaveChangesAsync(cancellationToken);

                // Step 2: Create fiscal years for new company
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
                    BillPrefixes = new BillPrefixes(), // Will be populated later
                    CreatedAt = DateTime.UtcNow
                };

                _context.FiscalYears.Add(newFiscalYear);
                await _context.SaveChangesAsync(cancellationToken);

                // Step 3: Clone settings
                await onProgress(new SplitFiscalYearProgressEventDto
                {
                    Type = "progress",
                    Value = 20,
                    Message = "Cloning settings..."
                });

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
                }
                else
                {
                    // Create default settings
                    var defaultSettings = new Settings
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = newCompany.Id,
                        UserId = userId,
                        FiscalYearId = newFiscalYear.Id,
                        Value = "{}",
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.CompanySettings.Add(defaultSettings);
                }

                await _context.SaveChangesAsync(cancellationToken);

                // Step 4: Clone users from source company
                await onProgress(new SplitFiscalYearProgressEventDto
                {
                    Type = "progress",
                    Value = 21,
                    Message = "Cloning users with roles and permissions..."
                });

                var sourceUsers = await _context.Users
                    .ToListAsync(cancellationToken);

                var userMap = new Dictionary<Guid, Guid>();
                userMap[userId] = userId; // Current user maps to themselves

                int usersProcessed = 0;

                foreach (var sourceUser in sourceUsers)
                {
                    if (sourceUser.Id == userId)
                    {
                        usersProcessed++;
                        continue;
                    }

                    var existingUser = await _context.Users
                        .FirstOrDefaultAsync(u => u.Email == sourceUser.Email, cancellationToken);

                    Guid newUserId;

                    if (existingUser != null)
                    {
                        newUserId = existingUser.Id;
                    }
                    else
                    {
                        // Create new user
                        var newUser = new User
                        {
                            Id = Guid.NewGuid(),
                            Name = sourceUser.Name,
                            Email = sourceUser.Email,
                            FiscalYearId = newFiscalYear.Id,
                            IsActive = sourceUser.IsActive,
                            IsAdmin = sourceUser.IsAdmin,
                            IsEmailVerified = sourceUser.IsEmailVerified,
                            MenuPermissions = sourceUser.MenuPermissions != null
                                ? new Dictionary<string, bool>(sourceUser.MenuPermissions)
                                : new Dictionary<string, bool>(),
                            GrantedById = sourceUser.GrantedById.HasValue && userMap.ContainsKey(sourceUser.GrantedById.Value)
                                ? userMap[sourceUser.GrantedById.Value]
                                : userId,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        };
                        _context.Users.Add(newUser);
                        newUserId = newUser.Id;
                    }

                    userMap[sourceUser.Id] = newUserId;
                    usersProcessed++;

                    await onProgress(new SplitFiscalYearProgressEventDto
                    {
                        Type = "progress",
                        Value = 21 + (usersProcessed / sourceUsers.Count),
                        Message = $"Cloned {usersProcessed}/{sourceUsers.Count} users..."
                    });
                }

                await _context.SaveChangesAsync(cancellationToken);

                // Update grantedBy references
                foreach (var kvp in userMap)
                {
                    await _context.Users
                        .Where(u => u.GrantedById == kvp.Key)
                        .ExecuteUpdateAsync(setters => setters
                            .SetProperty(u => u.GrantedById, kvp.Value)
                            .SetProperty(u => u.UpdatedAt, DateTime.UtcNow),
                            cancellationToken);
                }

                // Update company users list
                var clonedUserIds = userMap.Values.Distinct().ToList();
                if (!clonedUserIds.Contains(userId))
                {
                    clonedUserIds.Add(userId);
                }

                newCompany.Users = await _context.Users
                    .Where(u => clonedUserIds.Contains(u.Id))
                    .ToListAsync(cancellationToken);

                _context.Companies.Update(newCompany);
                await _context.SaveChangesAsync(cancellationToken);

                // Step 5: Clone company groups
                await onProgress(new SplitFiscalYearProgressEventDto
                {
                    Type = "progress",
                    Value = 23,
                    Message = "Cloning account groups..."
                });

                var sourceCompanyGroups = await _context.AccountGroups
                    .Where(g => g.CompanyId == request.SourceCompanyId)
                    .ToListAsync(cancellationToken);

                var companyGroupMap = new Dictionary<Guid, Guid>();
                int companyGroupsProcessed = 0;

                foreach (var group in sourceCompanyGroups)
                {
                    var existingGroup = await _context.AccountGroups
                        .FirstOrDefaultAsync(g => g.Name == group.Name && g.CompanyId == newCompany.Id, cancellationToken);

                    Guid newGroupId;

                    if (existingGroup != null)
                    {
                        newGroupId = existingGroup.Id;
                    }
                    else
                    {
                        var newGroup = new AccountGroup
                        {
                            Id = Guid.NewGuid(),
                            Name = group.Name,
                            Type = group.Type,
                            CompanyId = newCompany.Id,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        };
                        _context.AccountGroups.Add(newGroup);
                        newGroupId = newGroup.Id;
                    }

                    companyGroupMap[group.Id] = newGroupId;
                    companyGroupsProcessed++;

                    await onProgress(new SplitFiscalYearProgressEventDto
                    {
                        Type = "progress",
                        Value = 23 + (companyGroupsProcessed / sourceCompanyGroups.Count),
                        Message = $"Cloned {companyGroupsProcessed}/{sourceCompanyGroups.Count} account groups..."
                    });
                }

                await _context.SaveChangesAsync(cancellationToken);

                // Step 6: Clone categories
                await onProgress(new SplitFiscalYearProgressEventDto
                {
                    Type = "progress",
                    Value = 24,
                    Message = "Cloning categories..."
                });

                var sourceCategories = await _context.Categories
                    .Where(c => c.CompanyId == request.SourceCompanyId && c.FiscalYearId == splitFiscalYear.Id)
                    .ToListAsync(cancellationToken);

                var categoryMap = new Dictionary<Guid, Guid>();
                int categoriesProcessed = 0;

                foreach (var category in sourceCategories)
                {
                    var existingCategory = await _context.Categories
                        .FirstOrDefaultAsync(c => c.Name == category.Name && c.CompanyId == newCompany.Id, cancellationToken);

                    Guid newCategoryId;

                    if (existingCategory != null)
                    {
                        newCategoryId = existingCategory.Id;
                    }
                    else
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
                        newCategoryId = newCategory.Id;
                    }

                    categoryMap[category.Id] = newCategoryId;
                    categoriesProcessed++;

                    await onProgress(new SplitFiscalYearProgressEventDto
                    {
                        Type = "progress",
                        Value = 24 + (categoriesProcessed / sourceCategories.Count),
                        Message = $"Cloned {categoriesProcessed}/{sourceCategories.Count} categories..."
                    });
                }

                await _context.SaveChangesAsync(cancellationToken);

                // Step 7: Clone item companies
                await onProgress(new SplitFiscalYearProgressEventDto
                {
                    Type = "progress",
                    Value = 25,
                    Message = "Cloning item companies..."
                });

                var sourceItemCompanies = await _context.ItemCompanies
                    .Where(ic => ic.CompanyId == request.SourceCompanyId && ic.FiscalYearId == splitFiscalYear.Id)
                    .ToListAsync(cancellationToken);

                var itemCompanyMap = new Dictionary<Guid, Guid>();
                int itemCompaniesProcessed = 0;

                foreach (var itemCompany in sourceItemCompanies)
                {
                    var existingItemCompany = await _context.ItemCompanies
                        .FirstOrDefaultAsync(ic => ic.Name == itemCompany.Name && ic.CompanyId == newCompany.Id, cancellationToken);

                    Guid newItemCompanyId;

                    if (existingItemCompany != null)
                    {
                        newItemCompanyId = existingItemCompany.Id;
                    }
                    else
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
                        newItemCompanyId = newItemCompany.Id;
                    }

                    itemCompanyMap[itemCompany.Id] = newItemCompanyId;
                    itemCompaniesProcessed++;

                    await onProgress(new SplitFiscalYearProgressEventDto
                    {
                        Type = "progress",
                        Value = 25 + (itemCompaniesProcessed / sourceItemCompanies.Count),
                        Message = $"Cloned {itemCompaniesProcessed}/{sourceItemCompanies.Count} item companies..."
                    });
                }

                await _context.SaveChangesAsync(cancellationToken);

                // Step 8: Clone main units
                await onProgress(new SplitFiscalYearProgressEventDto
                {
                    Type = "progress",
                    Value = 26,
                    Message = "Cloning main units..."
                });

                var sourceMainUnits = await _context.MainUnits
                    .Where(mu => mu.CompanyId == request.SourceCompanyId && mu.FiscalYearId == splitFiscalYear.Id)
                    .ToListAsync(cancellationToken);

                var mainUnitMap = new Dictionary<Guid, Guid>();
                int mainUnitsProcessed = 0;

                foreach (var mainUnit in sourceMainUnits)
                {
                    var existingMainUnit = await _context.MainUnits
                        .FirstOrDefaultAsync(mu => mu.Name == mainUnit.Name && mu.CompanyId == newCompany.Id, cancellationToken);

                    Guid newMainUnitId;

                    if (existingMainUnit != null)
                    {
                        newMainUnitId = existingMainUnit.Id;
                    }
                    else
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
                        newMainUnitId = newMainUnit.Id;
                    }

                    mainUnitMap[mainUnit.Id] = newMainUnitId;
                    mainUnitsProcessed++;

                    await onProgress(new SplitFiscalYearProgressEventDto
                    {
                        Type = "progress",
                        Value = 26 + (mainUnitsProcessed / sourceMainUnits.Count),
                        Message = $"Cloned {mainUnitsProcessed}/{sourceMainUnits.Count} main units..."
                    });
                }

                await _context.SaveChangesAsync(cancellationToken);

                // Step 9: Clone units
                await onProgress(new SplitFiscalYearProgressEventDto
                {
                    Type = "progress",
                    Value = 27,
                    Message = "Cloning units..."
                });

                var sourceUnits = await _context.Units
                    .Where(u => u.CompanyId == request.SourceCompanyId && u.FiscalYearId == splitFiscalYear.Id)
                    .ToListAsync(cancellationToken);

                var unitMap = new Dictionary<Guid, Guid>();
                int unitsProcessed = 0;

                foreach (var unit in sourceUnits)
                {
                    var existingUnit = await _context.Units
                        .FirstOrDefaultAsync(u => u.Name == unit.Name && u.CompanyId == newCompany.Id, cancellationToken);

                    Guid newUnitId;

                    if (existingUnit != null)
                    {
                        newUnitId = existingUnit.Id;
                    }
                    else
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
                        newUnitId = newUnit.Id;
                    }

                    unitMap[unit.Id] = newUnitId;
                    unitsProcessed++;

                    await onProgress(new SplitFiscalYearProgressEventDto
                    {
                        Type = "progress",
                        Value = 27 + (unitsProcessed / sourceUnits.Count),
                        Message = $"Cloned {unitsProcessed}/{sourceUnits.Count} units..."
                    });
                }

                await _context.SaveChangesAsync(cancellationToken);

                // Step 10: Clone compositions
                await onProgress(new SplitFiscalYearProgressEventDto
                {
                    Type = "progress",
                    Value = 28,
                    Message = "Cloning compositions..."
                });

                var sourceCompositions = await _context.Compositions
                    .Where(c => c.CompanyId == request.SourceCompanyId && c.FiscalYearId == splitFiscalYear.Id)
                    .ToListAsync(cancellationToken);

                var compositionMap = new Dictionary<Guid, Guid>();
                int compositionsProcessed = 0;

                foreach (var composition in sourceCompositions)
                {
                    var existingComposition = await _context.Compositions
                        .FirstOrDefaultAsync(c => c.Name == composition.Name && c.CompanyId == newCompany.Id, cancellationToken);

                    Guid newCompositionId;

                    if (existingComposition != null)
                    {
                        newCompositionId = existingComposition.Id;
                    }
                    else
                    {
                        var newComposition = new Composition
                        {
                            Id = Guid.NewGuid(),
                            Name = composition.Name,
                            CompanyId = newCompany.Id,
                            FiscalYearId = newFiscalYear.Id,
                            OriginalFiscalYearId = newFiscalYear.Id,
                            Date = DateTime.UtcNow,
                            CreatedAt = DateTime.UtcNow
                        };
                        _context.Compositions.Add(newComposition);
                        newCompositionId = newComposition.Id;
                    }

                    compositionMap[composition.Id] = newCompositionId;
                    compositionsProcessed++;

                    await onProgress(new SplitFiscalYearProgressEventDto
                    {
                        Type = "progress",
                        Value = 28 + (compositionsProcessed / sourceCompositions.Count),
                        Message = $"Cloned {compositionsProcessed}/{sourceCompositions.Count} compositions..."
                    });
                }

                await _context.SaveChangesAsync(cancellationToken);

                // Helper for safe reference mapping
                Guid? GetSafeReference(Guid? oldId, Dictionary<Guid, Guid> mapping, string fieldName, string itemName)
                {
                    if (!oldId.HasValue)
                        return null;

                    if (mapping.TryGetValue(oldId.Value, out var newId))
                        return newId;

                    _logger.LogWarning($"No mapping found for {fieldName}: {oldId} in {itemName}");
                    return null;
                }

                // Step 11: Clone items
                await onProgress(new SplitFiscalYearProgressEventDto
                {
                    Type = "progress",
                    Value = 29,
                    Message = "Cloning items with stock and composition data..."
                });

                var sourceItems = await _context.Items
                    .Where(i => i.CompanyId == request.SourceCompanyId && i.OriginalFiscalYearId == splitFiscalYear.Id)
                    .Include(i => i.OpeningStocksByFiscalYear)
                    .Include(i => i.ClosingStocksByFiscalYear)
                    .Include(i => i.InitialOpeningStock)
                    .Include(i => i.StockEntries)
                    .ToListAsync(cancellationToken);

                int itemsProcessed = 0;
                var newItemIds = new List<Guid>();

                foreach (var item in sourceItems)
                {
                    // Map composition IDs
                    var newCompositionIds = new List<Guid>();
                    var itemCompositions = await _context.ItemCompositions
                        .Where(ic => ic.ItemId == item.Id)
                        .ToListAsync(cancellationToken);

                    foreach (var ic in itemCompositions)
                    {
                        if (compositionMap.TryGetValue(ic.CompositionId, out var newCompId))
                        {
                            newCompositionIds.Add(newCompId);
                        }
                    }

                    // Get mapped references
                    var newItemCompanyId = GetSafeReference(item.ItemsCompanyId, itemCompanyMap, "itemsCompany", item.Name);
                    var newCategoryId = GetSafeReference(item.CategoryId, categoryMap, "category", item.Name);
                    var newUnitId = GetSafeReference(item.UnitId, unitMap, "unit", item.Name);
                    var newMainUnitId = GetSafeReference(item.MainUnitId, mainUnitMap, "mainUnit", item.Name);

                    if (!newItemCompanyId.HasValue || !newCategoryId.HasValue || !newUnitId.HasValue)
                    {
                        _logger.LogError($"Skipping item {item.Name} - missing required cloned references");
                        continue;
                    }

                    // Get opening and closing stock data for the split fiscal year
                    var openingStockData = item.OpeningStocksByFiscalYear
                        .FirstOrDefault(os => os.FiscalYearId == splitFiscalYear.Id);

                    var closingStockData = item.ClosingStocksByFiscalYear
                        .FirstOrDefault(cs => cs.FiscalYearId == splitFiscalYear.Id);

                    decimal currentStock = item.StockEntries?.Sum(se => se.Quantity) ?? 0;
                    decimal currentOpeningStock = openingStockData?.OpeningStock ?? 0;
                    decimal purchasePrice = openingStockData?.PurchasePrice ?? item.PuPrice ?? 0;
                    decimal salesPrice = openingStockData?.SalesPrice ?? item.Price ?? 0;
                    decimal openingStockValue = purchasePrice * currentOpeningStock;

                    // Clone stock entries
                    var clonedStockEntries = item.StockEntries?.Select(entry => new StockEntry
                    {
                        Id = Guid.NewGuid(),
                        BatchNumber = entry.BatchNumber,
                        Quantity = entry.Quantity,
                        Price = entry.Price,
                        PuPrice = entry.PuPrice,
                        NetPrice = entry.NetPrice,
                        Mrp = entry.Mrp,
                        MarginPercentage = entry.MarginPercentage,
                        DiscountPercentagePerItem = entry.DiscountPercentagePerItem,
                        DiscountAmountPerItem = entry.DiscountAmountPerItem,
                        ItemCcAmount = entry.ItemCcAmount,
                        MainUnitPuPrice = entry.MainUnitPuPrice,
                        ExpiryDate = entry.ExpiryDate,
                        ExpiryStatus = entry.ExpiryStatus,
                        DaysUntilExpiry = entry.DaysUntilExpiry,
                        ItemId = default, // Will be set after new item is created
                        CompanyId = newCompany.Id,
                        FiscalYearId = newFiscalYear.Id,
                        PurchaseBillId = null, // Clear purchase bill reference
                        StoreId = entry.StoreId,
                        RackId = entry.RackId,
                        Date = DateTime.UtcNow,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    }).ToList() ?? new List<StockEntry>();

                    var newItem = new Item
                    {
                        Id = Guid.NewGuid(),
                        Name = item.Name,
                        Hscode = item.Hscode,
                        CategoryId = newCategoryId.Value,
                        ItemsCompanyId = newItemCompanyId.Value,
                        Price = salesPrice,
                        PuPrice = purchasePrice,
                        MainUnitPuPrice = item.MainUnitPuPrice,
                        MainUnitId = newMainUnitId,
                        WsUnit = item.WsUnit,
                        UnitId = newUnitId.Value,
                        VatStatus = item.VatStatus,
                        OpeningStock = currentOpeningStock,
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
                        UpdatedAt = DateTime.UtcNow,
                        StockEntries = clonedStockEntries
                    };

                    // Handle initial opening stock
                    if (item.InitialOpeningStock != null)
                    {
                        newItem.InitialOpeningStock = new ItemInitialOpeningStock
                        {
                            Id = Guid.NewGuid(),
                            InitialFiscalYearId = newFiscalYear.Id,
                            OpeningStock = item.InitialOpeningStock.OpeningStock,
                            OpeningStockValue = item.InitialOpeningStock.OpeningStockValue,
                            PurchasePrice = item.InitialOpeningStock.PurchasePrice,
                            SalesPrice = item.InitialOpeningStock.SalesPrice,
                            Date = DateTime.UtcNow,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        };
                    }

                    // Handle opening stock by fiscal year
                    if (openingStockData != null)
                    {
                        newItem.OpeningStocksByFiscalYear.Add(new ItemOpeningStockByFiscalYear
                        {
                            Id = Guid.NewGuid(),
                            FiscalYearId = newFiscalYear.Id,
                            OpeningStock = openingStockData.OpeningStock,
                            OpeningStockValue = openingStockValue,
                            PurchasePrice = purchasePrice,
                            SalesPrice = salesPrice,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        });
                    }

                    // Handle closing stock by fiscal year
                    if (closingStockData != null)
                    {
                        newItem.ClosingStocksByFiscalYear.Add(new ItemClosingStockByFiscalYear
                        {
                            Id = Guid.NewGuid(),
                            FiscalYearId = newFiscalYear.Id,
                            ClosingStock = closingStockData.ClosingStock,
                            ClosingStockValue = closingStockData.ClosingStockValue,
                            PurchasePrice = closingStockData.PurchasePrice,
                            SalesPrice = closingStockData.SalesPrice,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        });
                    }

                    // Handle item compositions
                    foreach (var compId in newCompositionIds)
                    {
                        newItem.ItemCompositions.Add(new ItemComposition
                        {
                            ItemId = newItem.Id,
                            CompositionId = compId,
                            CreatedAt = DateTime.UtcNow
                        });
                    }

                    // Set ItemId for stock entries
                    foreach (var entry in clonedStockEntries)
                    {
                        entry.ItemId = newItem.Id;
                    }

                    _context.Items.Add(newItem);
                    newItemIds.Add(newItem.Id);
                    itemsProcessed++;

                    var progressValue = 29 + (itemsProcessed / sourceItems.Count * 29);
                    await onProgress(new SplitFiscalYearProgressEventDto
                    {
                        Type = "progress",
                        Value = (int)Math.Min(progressValue, 58),
                        Message = $"Cloned {itemsProcessed}/{sourceItems.Count} items with compositions and stock..."
                    });
                }

                await _context.SaveChangesAsync(cancellationToken);

                // Step 12: Clone accounts
                await onProgress(new SplitFiscalYearProgressEventDto
                {
                    Type = "progress",
                    Value = 58,
                    Message = "Cloning accounts with balance data..."
                });

                var sourceAccounts = await _context.Accounts
                    .Where(a => a.CompanyId == request.SourceCompanyId)
                    .Include(a => a.OpeningBalanceByFiscalYear)
                    .Include(a => a.ClosingBalanceByFiscalYear)
                    .Include(a => a.InitialOpeningBalance)
                    .Include(a => a.OpeningBalance)
                    .ToListAsync(cancellationToken);

                int accountsProcessed = 0;

                foreach (var account in sourceAccounts)
                {
                    var openingBalanceData = account.OpeningBalanceByFiscalYear
                        .FirstOrDefault(ob => ob.FiscalYearId == splitFiscalYear.Id);

                    decimal currentOpeningBalanceAmount = account.OpeningBalance?.Amount ?? 0;
                    string currentOpeningBalanceType = account.OpeningBalance?.Type ?? "Dr";

                    var newCompanyGroupId = GetSafeReference(account.AccountGroupsId, companyGroupMap, "companyGroups", account.Name);

                    if (!newCompanyGroupId.HasValue)
                    {
                        _logger.LogError($"Skipping account {account.Name} - missing required company group reference");
                        continue;
                    }

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
                        AccountGroupsId = newCompanyGroupId.Value,
                        CompanyId = newCompany.Id,
                        OriginalFiscalYearId = newFiscalYear.Id,
                        OpeningBalanceType = currentOpeningBalanceType,
                        DefaultCashAccount = account.DefaultCashAccount,
                        IsActive = account.IsActive,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow,
                        Date = DateTime.UtcNow
                    };

                    // Handle opening balance
                    newAccount.OpeningBalance = new OpeningBalance
                    {
                        Id = Guid.NewGuid(),
                        FiscalYearId = newFiscalYear.Id,
                        Amount = currentOpeningBalanceAmount,
                        Type = currentOpeningBalanceType,
                        Date = splitFiscalYear.StartDate ?? DateTime.UtcNow,
                        AccountId = newAccount.Id,
                        CompanyId = newCompany.Id
                    };

                    // Handle opening balance by fiscal year
                    newAccount.OpeningBalanceByFiscalYear.Add(new OpeningBalanceByFiscalYear
                    {
                        Id = Guid.NewGuid(),
                        FiscalYearId = newFiscalYear.Id,
                        Amount = currentOpeningBalanceAmount,
                        Type = currentOpeningBalanceType,
                        Date = splitFiscalYear.StartDate ?? DateTime.UtcNow,
                        AccountId = newAccount.Id,
                        CompanyId = newCompany.Id
                    });

                    // Handle closing balance by fiscal year
                    newAccount.ClosingBalanceByFiscalYear.Add(new ClosingBalanceByFiscalYear
                    {
                        Id = Guid.NewGuid(),
                        FiscalYearId = newFiscalYear.Id,
                        Amount = currentOpeningBalanceAmount,
                        Type = currentOpeningBalanceType,
                        Date = splitFiscalYear.StartDate ?? DateTime.UtcNow,
                        AccountId = newAccount.Id,
                        CompanyId = newCompany.Id
                    });

                    // Handle initial opening balance
                    if (account.InitialOpeningBalance != null)
                    {
                        newAccount.InitialOpeningBalance = new InitialOpeningBalance
                        {
                            Id = Guid.NewGuid(),
                            InitialFiscalYearId = newFiscalYear.Id,
                            Amount = account.InitialOpeningBalance.Amount,
                            Type = account.InitialOpeningBalance.Type,
                            Date = splitFiscalYear.StartDate ?? DateTime.UtcNow,
                            AccountId = newAccount.Id,
                            CompanyId = newCompany.Id
                        };
                    }

                    _context.Accounts.Add(newAccount);
                    accountsProcessed++;

                    var progressValue = 58 + (accountsProcessed / sourceAccounts.Count * 25);
                    await onProgress(new SplitFiscalYearProgressEventDto
                    {
                        Type = "progress",
                        Value = (int)Math.Min(progressValue, 83),
                        Message = $"Cloned {accountsProcessed}/{sourceAccounts.Count} accounts with balance data..."
                    });
                }

                await _context.SaveChangesAsync(cancellationToken);

                // Step 13: Find transactions (placeholder - actual copying requires reference mapping)
                await onProgress(new SplitFiscalYearProgressEventDto
                {
                    Type = "progress",
                    Value = 83,
                    Message = "Copying transactions (This is a placeholder - requires re-mapping all references)..."
                });

                var sourceTransactions = await _context.Transactions
                    .Where(t => t.CompanyId == request.SourceCompanyId && t.FiscalYearId == splitFiscalYear.Id)
                    .CountAsync(cancellationToken);

                await onProgress(new SplitFiscalYearProgressEventDto
                {
                    Type = "log",
                    Message = $"Found {sourceTransactions} transactions to potentially copy. Manual mapping of references is required for actual copying."
                });

                // Step 14: Initialize bill counters
                await onProgress(new SplitFiscalYearProgressEventDto
                {
                    Type = "progress",
                    Value = 90,
                    Message = "Initializing counters..."
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
                            && bc.TransactionType == transactionType, cancellationToken);

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

                // Step 15: Clean up source company if requested
                if (request.DeleteAfterSplit)
                {
                    await onProgress(new SplitFiscalYearProgressEventDto
                    {
                        Type = "progress",
                        Value = 95,
                        Message = "Cleaning up source company..."
                    });

                    var deletionStats = new DeletionStatsDto();

                    // Check if it's the only fiscal year
                    var fiscalYearCount = await _context.FiscalYears
                        .CountAsync(f => f.CompanyId == request.SourceCompanyId, cancellationToken);

                    if (fiscalYearCount <= 1)
                    {
                        await onProgress(new SplitFiscalYearProgressEventDto
                        {
                            Type = "error",
                            Error = "Cannot delete the last remaining fiscal year in the source company."
                        });
                        await transaction.RollbackAsync(cancellationToken);
                        return;
                    }

                    // Delete transactions
                    var transactionsToDelete = await _context.Transactions
                        .Where(t => t.CompanyId == request.SourceCompanyId && t.FiscalYearId == splitFiscalYear.Id)
                        .ToListAsync(cancellationToken);

                    _context.Transactions.RemoveRange(transactionsToDelete);
                    deletionStats.TransactionsDeleted = transactionsToDelete.Count;

                    // Clean up items
                    var itemsAffected = await _context.Items
                        .Where(i => i.CompanyId == request.SourceCompanyId && i.OriginalFiscalYearId == splitFiscalYear.Id)
                        .Include(i => i.OpeningStocksByFiscalYear)
                        .Include(i => i.ClosingStocksByFiscalYear)
                        .ToListAsync(cancellationToken);

                    foreach (var item in itemsAffected)
                    {
                        // Remove fiscal year references from opening/closing stocks
                        var openingStocksToRemove = item.OpeningStocksByFiscalYear
                            .Where(os => os.FiscalYearId == splitFiscalYear.Id)
                            .ToList();
                        foreach (var os in openingStocksToRemove)
                        {
                            _context.ItemOpeningStockByFiscalYear.Remove(os);
                        }

                        var closingStocksToRemove = item.ClosingStocksByFiscalYear
                            .Where(cs => cs.FiscalYearId == splitFiscalYear.Id)
                            .ToList();
                        foreach (var cs in closingStocksToRemove)
                        {
                            _context.ItemClosingStockByFiscalYear.Remove(cs);
                        }

                        // Check if this was the only fiscal year for the item
                        var remainingOpeningStocks = await _context.ItemOpeningStockByFiscalYear
                            .CountAsync(os => os.ItemId == item.Id, cancellationToken);

                        if (remainingOpeningStocks == 0)
                        {
                            _context.Items.Remove(item);
                            deletionStats.ItemsDeleted++;
                        }
                        else
                        {
                            item.OriginalFiscalYearId = null;
                            _context.Items.Update(item);
                        }
                    }

                    // Clean up accounts
                    var accountsAffected = await _context.Accounts
                        .Where(a => a.CompanyId == request.SourceCompanyId && a.OriginalFiscalYearId == splitFiscalYear.Id)
                        .Include(a => a.OpeningBalanceByFiscalYear)
                        .Include(a => a.ClosingBalanceByFiscalYear)
                        .ToListAsync(cancellationToken);

                    foreach (var account in accountsAffected)
                    {
                        // Remove fiscal year references from opening/closing balances
                        var openingBalancesToRemove = account.OpeningBalanceByFiscalYear
                            .Where(ob => ob.FiscalYearId == splitFiscalYear.Id)
                            .ToList();
                        foreach (var ob in openingBalancesToRemove)
                        {
                            _context.OpeningBalanceByFiscalYear.Remove(ob);
                        }

                        var closingBalancesToRemove = account.ClosingBalanceByFiscalYear
                            .Where(cb => cb.FiscalYearId == splitFiscalYear.Id)
                            .ToList();
                        foreach (var cb in closingBalancesToRemove)
                        {
                            _context.ClosingBalanceByFiscalYear.Remove(cb);
                        }

                        // Check if this was the only fiscal year for the account
                        var remainingOpeningBalances = await _context.OpeningBalanceByFiscalYear
                            .CountAsync(ob => ob.AccountId == account.Id, cancellationToken);

                        if (remainingOpeningBalances == 0)
                        {
                            _context.Accounts.Remove(account);
                            deletionStats.AccountsDeleted++;
                        }
                        else
                        {
                            account.OriginalFiscalYearId = null;
                            _context.Accounts.Update(account);
                        }
                    }

                    // Delete settings specific to this fiscal year
                    var settingsToDelete = await _context.CompanySettings
                        .Where(s => s.CompanyId == request.SourceCompanyId && s.FiscalYearId == splitFiscalYear.Id)
                        .ToListAsync(cancellationToken);
                    _context.CompanySettings.RemoveRange(settingsToDelete);
                    deletionStats.SettingsDeleted = settingsToDelete.Count;

                    // Delete bill counters specific to this fiscal year
                    var billCountersToDelete = await _context.BillCounters
                        .Where(bc => bc.CompanyId == request.SourceCompanyId && bc.FiscalYearId == splitFiscalYear.Id)
                        .ToListAsync(cancellationToken);
                    _context.BillCounters.RemoveRange(billCountersToDelete);
                    deletionStats.BillCountersDeleted = billCountersToDelete.Count;

                    // Delete the fiscal year itself
                    _context.FiscalYears.Remove(splitFiscalYear);
                    deletionStats.FiscalYearsDeleted = 1;

                    // Update users who had this fiscal year as their active fiscal year
                    var usersToUpdate = await _context.Users
                        .Where(u => u.FiscalYearId == splitFiscalYear.Id)
                        .ToListAsync(cancellationToken);

                    foreach (var user in usersToUpdate)
                    {
                        // Find another fiscal year for this company to set as active
                        var otherFiscalYear = await _context.FiscalYears
                            .FirstOrDefaultAsync(f => f.CompanyId == request.SourceCompanyId && f.Id != splitFiscalYear.Id, cancellationToken);

                        user.FiscalYearId = otherFiscalYear?.Id;
                        user.UpdatedAt = DateTime.UtcNow;
                        deletionStats.UsersUpdated++;
                    }

                    await _context.SaveChangesAsync(cancellationToken);

                    await onProgress(new SplitFiscalYearProgressEventDto
                    {
                        Type = "progress",
                        Value = 99,
                        Message = $"Cleanup completed: {deletionStats.ItemsDeleted} items, {deletionStats.AccountsDeleted} accounts, {deletionStats.TransactionsDeleted} transactions removed from source fiscal year."
                    });
                }

                await transaction.CommitAsync(cancellationToken);

                // Final response
                var result = new SplitFiscalYearResultDto
                {
                    Success = true,
                    Message = $"Company split successfully. New company \"{request.NewCompanyName}\" created with cloned balances and stocks.",
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
                            UsersCopied = usersProcessed,
                            CompanyGroupsCopied = companyGroupsProcessed,
                            CategoriesCopied = categoriesProcessed,
                            ItemsCompaniesCopied = itemCompaniesProcessed,
                            MainUnitsCopied = mainUnitsProcessed,
                            UnitsCopied = unitsProcessed,
                            CompositionsCopied = compositionsProcessed,
                            ItemsCopied = itemsProcessed,
                            AccountsCopied = accountsProcessed,
                            TransactionsFoundForCopy = sourceTransactions
                        }
                    }
                };

                await onProgress(new SplitFiscalYearProgressEventDto
                {
                    Type = "complete",
                    Data = result
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error splitting company");
                await transaction.RollbackAsync(cancellationToken);

                await onProgress(new SplitFiscalYearProgressEventDto
                {
                    Type = "error",
                    Error = ex.Message,
                    Details = ex.StackTrace
                });
            }
        }
    }
}
