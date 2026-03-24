using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Services.BillNumberServices;
using SkyForge.Models.Retailer.Items;
using SkyForge.Models.Retailer.TransactionModel;
using SkyForge.Models.AccountModel;
using SkyForge.Dto.AccountDto;
using SkyForge.Models.Shared;
using SkyForge.Dto.RetailerDto.SalesBillDto;
using SkyForge.Models.Retailer.Sales;
using SkyForge.Dto.RetailerDto;

namespace SkyForge.Services.Retailer.SalesBillServices
{
    public class SalesBillService : ISalesBillService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<SalesBillService> _logger;
        private readonly IBillNumberService _billNumberService;

        public SalesBillService(
            ApplicationDbContext context,
            ILogger<SalesBillService> logger,
            IBillNumberService billNumberService)
        {
            _context = context;
            _logger = logger;
            _billNumberService = billNumberService;
        }

        public async Task<SalesBillResponseDTO> GetCreditSalesDataAsync(Guid companyId, Guid fiscalYearId, Guid userId)
        {
            try
            {
                _logger.LogInformation("GetCreditSalesDataAsync called for Company: {CompanyId}, User: {UserId}", companyId, userId);

                // Get company with all required fields
                var company = await _context.Companies
                    .Where(c => c.Id == companyId)
                    .Select(c => new CompanyInfoDTO
                    {
                        Id = c.Id,
                        Name = c.Name,
                        Address = c.Address,
                        City = c.City,
                        Phone = c.Phone,
                        Pan = c.Pan,
                        DateFormat = c.DateFormat.ToString(),
                        VatEnabled = c.VatEnabled,
                    })
                    .FirstOrDefaultAsync();

                if (company == null)
                    return null;

                // Get fiscal year
                var currentFiscalYear = await _context.FiscalYears
                    .Where(fy => fy.Id == fiscalYearId && fy.CompanyId == companyId)
                    .Select(fy => new FiscalYearDTO
                    {
                        Id = fy.Id,
                        Name = fy.Name,
                        StartDate = fy.StartDate,
                        EndDate = fy.EndDate,
                        IsActive = fy.IsActive,
                        DateFormat = fy.DateFormat.ToString()
                    })
                    .FirstOrDefaultAsync();

                // Get categories
                var categories = await _context.Categories
                    .Where(c => c.CompanyId == companyId)
                    .Select(c => new CategoryInfoDTO
                    {
                        Id = c.Id,
                        Name = c.Name
                    })
                    .ToListAsync();

                // Get units
                var units = await _context.Units
                    .Where(u => u.CompanyId == companyId)
                    .Select(u => new UnitInfoDTO
                    {
                        Id = u.Id,
                        Name = u.Name,
                    })
                    .ToListAsync();

                // Get main units
                var mainUnits = await _context.MainUnits
                    .Where(mu => mu.CompanyId == companyId)
                    .Select(mu => new UnitInfoDTO
                    {
                        Id = mu.Id,
                        Name = mu.Name
                    })
                    .ToListAsync();

                // Get company groups (specifically Sundry Debtors for credit sales)
                var relevantGroupNames = new[] { "Sundry Debtors", "Sundry Creditors" };
                var companyGroups = await _context.AccountGroups
                    .Where(ag => ag.CompanyId == companyId && relevantGroupNames.Contains(ag.Name))
                    .Select(ag => new CompanyGroupInfoDTO
                    {
                        Id = ag.Id,
                        Name = ag.Name
                    })
                    .ToListAsync();

                var relevantGroupIds = companyGroups.Select(g => g.Id).ToList();

                // Get user for preferences and permissions
                var user = await _context.Users
                    .Include(u => u.UserRoles)
                        .ThenInclude(ur => ur.Role)
                    .FirstOrDefaultAsync(u => u.Id == userId);

                bool isAdmin = user?.IsAdmin ?? false;
                string userRole = "User";

                if (isAdmin)
                {
                    userRole = "Admin";
                }
                else if (user?.UserRoles != null)
                {
                    var primaryRole = user.UserRoles.FirstOrDefault(ur => ur.IsPrimary);
                    if (primaryRole?.Role != null)
                    {
                        userRole = primaryRole.Role.Name;
                    }
                }

                // Date handling
                var today = DateTime.UtcNow;
                var nepaliDate = today.ToString("yyyy-MM-dd"); // You might want to use a proper Nepali date converter
                var transactionDateNepali = today.ToString("yyyy-MM-dd");
                var companyDateFormat = company.DateFormat?.ToLower() ?? "english";

                // Get next bill number from BillNumberService
                var currentBillNumber = await _billNumberService.GetCurrentBillNumberAsync(companyId, fiscalYearId, "sales");

                // Prepare response
                var response = new SalesBillResponseDTO
                {
                    Company = company,
                    Dates = new DateInfoDTO
                    {
                        NepaliDate = nepaliDate,
                        TransactionDateNepali = transactionDateNepali,
                        CompanyDateFormat = companyDateFormat
                    },
                    CurrentFiscalYear = currentFiscalYear,
                    NextSalesBillNumber = currentBillNumber,
                    Categories = categories,
                    Units = units,
                    CompanyGroups = companyGroups,
                    UserPreferences = new UserPreferencesDTO
                    {
                        Theme = user?.Preferences?.Theme.ToString() ?? "light"
                    },
                    Permissions = new PermissionsDTO
                    {
                        IsAdminOrSupervisor = isAdmin || userRole == "Supervisor"
                    }
                };

                _logger.LogInformation("Successfully fetched credit sales data for Company: {CompanyId}", companyId);
                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetCreditSalesDataAsync for Company: {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<string> GetNextCreditSalesBillNumberAsync(Guid companyId, Guid fiscalYearId)
        {
            return await _billNumberService.GetNextBillNumberAsync(companyId, fiscalYearId, "sales");
        }
        public async Task<string> GetCurrentCreditSalesBillNumberAsync(Guid companyId, Guid fiscalYearId)
        {
            return await _billNumberService.GetCurrentBillNumberAsync(companyId, fiscalYearId, "sales");
        }

        public async Task<SalesBill> CreateCreditSalesBillAsync(CreateSalesBillDTO dto, Guid userId, Guid companyId, Guid fiscalYearId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                _logger.LogInformation("CreateSalesBillAsync started for Company: {CompanyId}, User: {UserId}", companyId, userId);

                // Validate company and fiscal year
                var company = await _context.Companies.FindAsync(companyId);
                if (company == null)
                    throw new ArgumentException("Company not found");

                var fiscalYear = await _context.FiscalYears.FindAsync(fiscalYearId);
                if (fiscalYear == null || fiscalYear.CompanyId != companyId)
                    throw new ArgumentException("Invalid fiscal year");

                // Get default accounts
                var salesAccountId = await GetDefaultAccountIdAsync("Sales", companyId);
                var vatAccountId = await GetDefaultAccountIdAsync("VAT", companyId);
                var roundOffAccountId = await GetDefaultAccountIdAsync("Rounded Off", companyId);
                var cashAccountId = await GetDefaultAccountIdAsync("Cash in Hand", companyId);

                // Get next bill number
                var billNumber = await _billNumberService.GetNextBillNumberAsync(companyId, fiscalYearId, "sales");

                // Validate account
                var account = await _context.Accounts
                    .FirstOrDefaultAsync(a => a.Id == dto.AccountId && a.CompanyId == companyId);
                if (account == null)
                    throw new ArgumentException("Invalid account for this company");

                // Parse VAT exemption
                bool isVatExemptBool = dto.IsVatExempt == "true" || dto.IsVatExempt == "True" || dto.IsVatExempt == "1";
                bool isVatAll = dto.IsVatExempt == "all";

                // Validate items and track VAT status
                bool hasVatableItems = false;
                bool hasNonVatableItems = false;

                // Group items by ItemId to check total stock per item
                var itemsGrouped = dto.Items.GroupBy(i => i.ItemId);

                foreach (var itemGroup in itemsGrouped)
                {
                    var item = await _context.Items
                        .Include(i => i.StockEntries)
                        .FirstOrDefaultAsync(i => i.Id == itemGroup.Key && i.CompanyId == companyId);

                    if (item == null)
                        throw new ArgumentException($"Item with id {itemGroup.Key} not found");

                    // Track VAT status
                    if (item.VatStatus?.ToLower() == "vatable")
                    {
                        hasVatableItems = true;
                    }
                    else
                    {
                        hasNonVatableItems = true;
                    }

                    // Check if there are any stock entries
                    if (item.StockEntries == null || !item.StockEntries.Any())
                        throw new ArgumentException($"No stock entries found for item: {item.Name}");

                    // Calculate total available stock across all batches
                    var totalAvailableStock = item.StockEntries.Sum(e => e.Quantity);

                    // Calculate total requested quantity for this item
                    var totalRequestedQuantity = itemGroup.Sum(i => i.Quantity);

                    // Check if enough stock exists overall
                    if (totalAvailableStock < totalRequestedQuantity)
                    {
                        throw new ArgumentException(
                            $"Not enough stock for item: {item.Name}. " +
                            $"Total available: {totalAvailableStock}, Required: {totalRequestedQuantity}"
                        );
                    }
                }

                if (dto.IsVatExempt != "all")
                {
                    if (isVatExemptBool && hasVatableItems)
                        throw new InvalidOperationException("Cannot save VAT exempt bill with vatable items");

                    if (!isVatExemptBool && hasNonVatableItems)
                        throw new InvalidOperationException("Cannot save bill with non-vatable items when VAT is applied");
                }
                // Get previous balance for account
                decimal previousBalance = 0;
                var lastTransaction = await _context.Transactions
                    .Where(t => t.AccountId == dto.AccountId)
                    .OrderByDescending(t => t.CreatedAt)
                    .FirstOrDefaultAsync();

                if (lastTransaction != null)
                    previousBalance = lastTransaction.Balance ?? 0;

                // Determine if company uses Nepali date format
                bool isNepaliFormat = company.DateFormat?.ToString().ToLower() == "nepali";

                // Create sales bill with frontend-calculated values
                var salesBill = new SalesBill
                {
                    Id = Guid.NewGuid(),
                    CompanyId = companyId,
                    UserId = userId,
                    BillNumber = billNumber,
                    PurchaseSalesType = "Sales",
                    AccountId = dto.AccountId,
                    CashAccount = dto.CashAccount,
                    CashAccountAddress = dto.CashAccountAddress,
                    CashAccountPan = dto.CashAccountPan,
                    CashAccountEmail = dto.CashAccountEmail,
                    CashAccountPhone = dto.CashAccountPhone,
                    SettingsId = dto.SettingsId,
                    FiscalYearId = fiscalYearId,
                    Type = "Sale",
                    SubTotal = dto.SubTotal ?? 0,
                    NonVatSales = dto.NonVatSales ?? 0,
                    TaxableAmount = dto.TaxableAmount ?? 0,
                    DiscountPercentage = dto.DiscountPercentage ?? 0,
                    DiscountAmount = dto.DiscountAmount ?? 0,
                    VatPercentage = dto.VatPercentage,
                    VatAmount = dto.VatAmount ?? 0,
                    TotalAmount = dto.TotalAmount ?? 0,
                    IsVatExempt = isVatExemptBool,
                    IsVatAll = isVatAll ? "all" : null,
                    RoundOffAmount = dto.RoundOffAmount ?? 0,
                    PaymentMode = dto.PaymentMode,
                    nepaliDate = dto.NepaliDate,
                    Date = dto.Date,
                    transactionDateNepali = dto.TransactionDateNepali,
                    TransactionDate = dto.TransactionDate,
                    OriginalCopies = dto.OriginalCopies,
                    FirstPrinted = false,
                    PrintCount = 0,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                // Add sales bill to context
                await _context.SalesBills.AddAsync(salesBill);

                // Process each item in the order received, using FIFO for stock reduction
                foreach (var itemDto in dto.Items)
                {
                    var item = await _context.Items
                        .Include(i => i.StockEntries)
                        .FirstOrDefaultAsync(i => i.Id == itemDto.ItemId);

                    if (item == null)
                        continue;

                    // Get available batches with positive stock, ordered by date (FIFO)
                    var availableBatches = item.StockEntries
                        .Where(e => e.Quantity > 0)
                        .OrderBy(e => e.Date) // FIFO: oldest first
                        .ToList();

                    if (!availableBatches.Any())
                        throw new ArgumentException($"No available stock for item: {item.Name}");

                    // Fulfill this line item from available batches
                    var remainingQuantity = itemDto.Quantity;
                    var usedBatchNumber = "";
                    var usedUniqueUuid = "";

                    foreach (var batch in availableBatches)
                    {
                        if (remainingQuantity <= 0) break;

                        if (batch.Quantity >= remainingQuantity)
                        {
                            // This batch can fulfill the entire remaining quantity
                            batch.Quantity -= remainingQuantity;
                            usedBatchNumber = batch.BatchNumber;
                            usedUniqueUuid = batch.UniqueUuid;
                            remainingQuantity = 0;

                            if (batch.Quantity == 0)
                            {
                                _context.StockEntries.Remove(batch);
                            }
                        }
                        else
                        {
                            // Take all from this batch and continue to next
                            remainingQuantity -= batch.Quantity;
                            usedBatchNumber = batch.BatchNumber; // Will be overwritten if multiple batches used
                            usedUniqueUuid = batch.UniqueUuid;   // Will be overwritten if multiple batches used
                            batch.Quantity = 0;
                            _context.StockEntries.Remove(batch);
                        }
                    }

                    if (remainingQuantity > 0)
                    {
                        throw new ArgumentException(
                            $"Could not fulfill quantity for item: {item.Name}. " +
                            $"Remaining: {remainingQuantity} after using all available batches"
                        );
                    }

                    // Calculate net price after discount
                    decimal netPrice = itemDto.Price - (itemDto.Price * (dto.DiscountPercentage ?? 0) / 100);
                    // decimal newMarginPercentage = (itemDto.Price - itemDto.PuPrice ?? 0 / itemDto.PuPrice ?? 0) * 100;
                    decimal newMarginPercentage = 0;
                    if (itemDto.PuPrice.HasValue && itemDto.PuPrice.Value > 0)
                    {
                        newMarginPercentage = ((itemDto.Price - itemDto.PuPrice.Value) / itemDto.PuPrice.Value) * 100;
                        newMarginPercentage = Math.Round(newMarginPercentage, 2);
                    }
                    // If PuPrice is null or zero, margin remains 0
                    // Create sales bill item
                    var billItem = new SalesBillItem
                    {
                        Id = Guid.NewGuid(),
                        SalesBillId = salesBill.Id,
                        ItemId = itemDto.ItemId,
                        UnitId = itemDto.UnitId,
                        Quantity = itemDto.Quantity,
                        Price = itemDto.Price,
                        PuPrice = itemDto.PuPrice,
                        MarginPercentage = newMarginPercentage,
                        NetPuPrice = itemDto.NetPuPrice ?? itemDto.PuPrice,
                        Mrp = itemDto.Mrp ?? 0,
                        DiscountPercentagePerItem = dto.DiscountPercentage ?? 0,
                        DiscountAmountPerItem = (itemDto.Price * itemDto.Quantity * (dto.DiscountPercentage ?? 0)) / 100,
                        NetPrice = netPrice,
                        BatchNumber = usedBatchNumber,
                        ExpiryDate = itemDto.ExpiryDate.HasValue
                            ? DateOnly.FromDateTime(itemDto.ExpiryDate.Value.ToDateTime(TimeOnly.MinValue))
                            : null,
                        VatStatus = item.VatStatus ?? "vatable",
                        UniqueUuid = usedUniqueUuid,
                        CreatedAt = isNepaliFormat ? dto.NepaliDate : dto.Date,
                        UpdatedAt = isNepaliFormat ? dto.NepaliDate : dto.Date
                    };

                    salesBill.Items.Add(billItem);

                    // Create item-level transaction for party account
                    var partyTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        ItemId = itemDto.ItemId,
                        UnitId = itemDto.UnitId,
                        WSUnit = 1,
                        Quantity = itemDto.Quantity,
                        Price = itemDto.Price,
                        PuPrice = itemDto.PuPrice,
                        DiscountPercentagePerItem = dto.DiscountPercentage ?? 0,
                        DiscountAmountPerItem = (itemDto.Price * itemDto.Quantity * (dto.DiscountPercentage ?? 0)) / 100,
                        NetPuPrice = itemDto.NetPuPrice ?? (itemDto.PuPrice ?? 0m),
                        AccountId = dto.AccountId,
                        SalesBillId = salesBill.Id,
                        BillNumber = salesBill.BillNumber,
                        Type = TransactionType.Sale,
                        PurchaseSalesType = "Sales",
                        Debit = salesBill.TotalAmount,
                        Credit = 0,
                        PaymentMode = ParsePaymentMode(dto.PaymentMode),
                        Balance = previousBalance - salesBill.TotalAmount,
                        Date = salesBill.Date,
                        BillDate = salesBill.Date,
                        FiscalYearId = fiscalYearId,
                        CreatedAt = DateTime.UtcNow,
                        Status = TransactionStatus.Active,
                        IsActive = true
                    };

                    await _context.Transactions.AddAsync(partyTransaction);
                }

                // 1. Sales Account transaction
                if (salesAccountId.HasValue)
                {
                    var salesAmount = (dto.TaxableAmount ?? 0) + (dto.NonVatSales ?? 0);

                    var salesTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        AccountId = salesAccountId.Value,
                        SalesBillId = salesBill.Id,
                        BillNumber = salesBill.BillNumber,
                        Type = TransactionType.Sale,
                        PurchaseSalesType = "Sales",
                        Debit = 0,
                        Credit = salesAmount,
                        PaymentMode = ParsePaymentMode(dto.PaymentMode),
                        Date = salesBill.TransactionDate,
                        BillDate = salesBill.Date,
                        FiscalYearId = fiscalYearId,
                        CreatedAt = DateTime.UtcNow,
                        Status = TransactionStatus.Active,
                        IsActive = true
                    };

                    await _context.Transactions.AddAsync(salesTransaction);
                }

                // 2. VAT transaction if applicable
                if (dto.VatAmount > 0 && vatAccountId.HasValue && !isVatExemptBool)
                {
                    var vatTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        AccountId = vatAccountId.Value,
                        SalesBillId = salesBill.Id,
                        BillNumber = salesBill.BillNumber,
                        IsType = TransactionIsType.VAT,
                        Type = TransactionType.Sale,
                        PurchaseSalesType = "Sales",
                        Debit = 0,
                        Credit = dto.VatAmount.Value,
                        PaymentMode = ParsePaymentMode(dto.PaymentMode),
                        Date = salesBill.TransactionDate,
                        BillDate = salesBill.Date,
                        FiscalYearId = fiscalYearId,
                        CreatedAt = DateTime.UtcNow,
                        Status = TransactionStatus.Active,
                        IsActive = true
                    };

                    await _context.Transactions.AddAsync(vatTransaction);
                }

                // 3. Round-off transaction if applicable
                if (dto.RoundOffAmount != 0 && roundOffAccountId.HasValue)
                {
                    var roundOffTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        AccountId = roundOffAccountId.Value,
                        SalesBillId = salesBill.Id,
                        BillNumber = salesBill.BillNumber,
                        IsType = TransactionIsType.RoundOff,
                        Type = TransactionType.Sale,
                        PurchaseSalesType = "Sales",
                        Debit = dto.RoundOffAmount > 0 ? dto.RoundOffAmount.Value : 0,
                        Credit = dto.RoundOffAmount < 0 ? Math.Abs(dto.RoundOffAmount.Value) : 0,
                        PaymentMode = ParsePaymentMode(dto.PaymentMode),
                        Date = salesBill.TransactionDate,
                        BillDate = salesBill.Date,
                        FiscalYearId = fiscalYearId,
                        CreatedAt = DateTime.UtcNow,
                        Status = TransactionStatus.Active,
                        IsActive = true
                    };

                    await _context.Transactions.AddAsync(roundOffTransaction);
                }

                // 4. Cash transaction if payment mode is cash
                if (dto.PaymentMode?.ToLower() == "cash" && cashAccountId.HasValue)
                {
                    var cashTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        AccountId = cashAccountId.Value,
                        SalesBillId = salesBill.Id,
                        BillNumber = salesBill.BillNumber,
                        Type = TransactionType.Sale,
                        PurchaseSalesType = "Sales",
                        Debit = dto.TotalAmount ?? 0,
                        Credit = 0,
                        PaymentMode = PaymentMode.Cash,
                        Date = salesBill.TransactionDate,
                        BillDate = salesBill.Date,
                        FiscalYearId = fiscalYearId,
                        CreatedAt = DateTime.UtcNow,
                        Status = TransactionStatus.Active,
                        IsActive = true
                    };

                    await _context.Transactions.AddAsync(cashTransaction);
                }

                // Save all changes
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                _logger.LogInformation("Sales bill created successfully with ID: {BillId}, Number: {BillNumber}",
                    salesBill.Id, salesBill.BillNumber);

                return salesBill;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Error creating sales bill");
                throw;
            }
        }

        public async Task<SalesOpenResponseDTO> GetCreditSalesOpenDataAsync(Guid companyId, Guid fiscalYearId, Guid userId)
        {
            try
            {
                _logger.LogInformation("GetCreditSalesOpenDataAsync called for Company: {CompanyId}, User: {UserId}", companyId, userId);

                // Get company with essential fields only
                var company = await _context.Companies
                    .Where(c => c.Id == companyId)
                    .Select(c => new SalesOpenCompanyDTO
                    {
                        Id = c.Id,
                        DateFormat = c.DateFormat.ToString(),
                        VatEnabled = c.VatEnabled,
                        Name = c.Name,
                        Address = c.Address,
                        Phone = c.Phone,
                        Pan = c.Pan
                    })
                    .FirstOrDefaultAsync();

                if (company == null)
                    return null;

                // Get current fiscal year
                var currentFiscalYear = await _context.FiscalYears
                    .Where(fy => fy.Id == fiscalYearId && fy.CompanyId == companyId)
                    .Select(fy => new FiscalYearDTO
                    {
                        Id = fy.Id,
                        Name = fy.Name,
                        StartDate = fy.StartDate,
                        EndDate = fy.EndDate,
                        IsActive = fy.IsActive
                    })
                    .FirstOrDefaultAsync();

                // Get categories
                var categories = await _context.Categories
                    .Where(c => c.CompanyId == companyId)
                    .Select(c => new CategoryInfoDTO
                    {
                        Id = c.Id,
                        Name = c.Name
                    })
                    .ToListAsync();

                // Get units
                var units = await _context.Units
                    .Where(u => u.CompanyId == companyId)
                    .Select(u => new UnitInfoDTO
                    {
                        Id = u.Id,
                        Name = u.Name,
                    })
                    .ToListAsync();

                // Get company groups (specifically Sundry Debtors and Sundry Creditors)
                var relevantGroupNames = new[] { "Sundry Debtors", "Sundry Creditors" };
                var companyGroups = await _context.AccountGroups
                    .Where(ag => ag.CompanyId == companyId && relevantGroupNames.Contains(ag.Name))
                    .Select(ag => new CompanyGroupInfoDTO
                    {
                        Id = ag.Id,
                        Name = ag.Name
                    })
                    .ToListAsync();

                var relevantGroupIds = companyGroups.Select(g => g.Id).ToList();

                // Get user for preferences and permissions
                var user = await _context.Users
                    .Include(u => u.UserRoles)
                        .ThenInclude(ur => ur.Role)
                    .FirstOrDefaultAsync(u => u.Id == userId);

                bool isAdmin = user?.IsAdmin ?? false;
                string userRole = "User";

                if (isAdmin)
                {
                    userRole = "Admin";
                }
                else if (user?.UserRoles != null)
                {
                    var primaryRole = user.UserRoles.FirstOrDefault(ur => ur.IsPrimary);
                    if (primaryRole?.Role != null)
                    {
                        userRole = primaryRole.Role.Name;
                    }
                }

                // Date handling
                var today = DateTime.UtcNow;
                var nepaliDate = today.ToString("yyyy-MM-dd"); // You might want to use a proper Nepali date converter
                var transactionDateNepali = today.ToString("yyyy-MM-dd");
                var companyDateFormat = company.DateFormat?.ToLower() ?? "english";

                // Get current company name from session context (you might need to pass this from controller)
                var currentCompanyName = company.Name;

                // Prepare response
                var response = new SalesOpenResponseDTO
                {
                    Company = company,
                    Dates = new DateInfoDTO
                    {
                        NepaliDate = nepaliDate,
                        TransactionDateNepali = transactionDateNepali,
                        CompanyDateFormat = companyDateFormat
                    },
                    CurrentFiscalYear = currentFiscalYear,
                    Categories = categories,
                    Units = units,
                    CompanyGroups = companyGroups,
                    CurrentCompany = new CurrentCompanyInfoDTO
                    {
                        Name = currentCompanyName,
                        Address = company.Address,
                        Phone = company.Phone,
                        Pan = company.Pan
                    },
                    UserPreferences = new UserPreferencesDTO
                    {
                        Theme = user?.Preferences?.Theme.ToString() ?? "light"
                    },
                    Permissions = new PermissionsDTO
                    {
                        IsAdminOrSupervisor = isAdmin || userRole == "Supervisor"
                    }
                };

                _logger.LogInformation("Successfully fetched credit sales open data for Company: {CompanyId}", companyId);
                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetCreditSalesOpenDataAsync for Company: {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<string> GetNextCreditSalesOpenBillNumberAsync(Guid companyId, Guid fiscalYearId)
        {
            return await _billNumberService.GetNextBillNumberAsync(companyId, fiscalYearId, "sales");
        }
        public async Task<string> GetCurrentCreditSalesOpenBillNumberAsync(Guid companyId, Guid fiscalYearId)
        {
            return await _billNumberService.GetCurrentBillNumberAsync(companyId, fiscalYearId, "sales");
        }
        public async Task<SalesBill> CreateCreditSalesOpenBillAsync(CreateSalesOpenDTO dto, Guid userId, Guid companyId, Guid fiscalYearId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                _logger.LogInformation("CreateCreditSalesOpenBillAsync started for Company: {CompanyId}, User: {UserId}", companyId, userId);

                // Validate company and fiscal year
                var company = await _context.Companies.FindAsync(companyId);
                if (company == null)
                    throw new ArgumentException("Company not found");

                var fiscalYear = await _context.FiscalYears.FindAsync(fiscalYearId);
                if (fiscalYear == null || fiscalYear.CompanyId != companyId)
                    throw new ArgumentException("Invalid fiscal year");

                // Parse VAT exemption
                bool isVatExemptBool = dto.IsVatExempt == "true" || dto.IsVatExempt == "True" || dto.IsVatExempt == "1";
                bool isVatAll = dto.IsVatExempt == "all";

                // Validate account
                var account = await _context.Accounts
                    .FirstOrDefaultAsync(a => a.Id == dto.AccountId && a.CompanyId == companyId);
                if (account == null)
                    throw new ArgumentException("Invalid account for this company");

                // Validate items and track VAT status
                bool hasVatableItems = false;
                bool hasNonVatableItems = false;
                var productStockChecks = new Dictionary<Guid, (Item item, decimal requestedQuantity, string batchNumber, string uniqueUuid)>();

                // First pass: Validate items and check stock availability
                foreach (var itemDto in dto.Items)
                {
                    var item = await _context.Items
                        .Include(i => i.StockEntries)
                        .FirstOrDefaultAsync(i => i.Id == itemDto.ItemId && i.CompanyId == companyId);

                    if (item == null)
                        throw new ArgumentException($"Item with id {itemDto.ItemId} not found");

                    // Track VAT status
                    if (item.VatStatus?.ToLower() == "vatable")
                    {
                        hasVatableItems = true;
                    }
                    else
                    {
                        hasNonVatableItems = true;
                    }

                    // Check if batch exists
                    if (item.StockEntries == null || !item.StockEntries.Any())
                        throw new ArgumentException($"No stock entries found for item: {item.Name}");

                    // Find the specific batch
                    var batchEntry = item.StockEntries
                        .FirstOrDefault(e => e.BatchNumber == itemDto.BatchNumber &&
                                            (string.IsNullOrEmpty(itemDto.UniqueUuid) || e.UniqueUuid == itemDto.UniqueUuid));

                    if (batchEntry == null)
                    {
                        var availableBatches = string.Join("; ", item.StockEntries.Select(e =>
                            $"Batch: '{e.BatchNumber}', Qty: {e.Quantity}"));
                        throw new ArgumentException($"Batch number '{itemDto.BatchNumber}' not found for item: {item.Name}. Available batches: {availableBatches}");
                    }

                    // Check stock quantity
                    if (batchEntry.Quantity < itemDto.Quantity)
                    {
                        var ex = new InvalidOperationException($"Not enough stock for item: {item.Name}");
                        ex.Data["available"] = batchEntry.Quantity;
                        ex.Data["required"] = itemDto.Quantity;
                        throw ex;
                    }

                    productStockChecks[item.Id] = (item, itemDto.Quantity, itemDto.BatchNumber, itemDto.UniqueUuid);
                }

                // VAT validation
                if (dto.IsVatExempt != "all")
                {
                    if (isVatExemptBool && hasVatableItems)
                        throw new InvalidOperationException("Cannot save VAT exempt bill with vatable items");

                    if (!isVatExemptBool && hasNonVatableItems)
                        throw new InvalidOperationException("Cannot save bill with non-vatable items when VAT is applied");
                }

                // Get next bill number
                var billNumber = await _billNumberService.GetNextBillNumberAsync(companyId, fiscalYearId, "sales");

                // Get previous balance for account
                decimal previousBalance = 0;
                var lastTransaction = await _context.Transactions
                    .Where(t => t.AccountId == dto.AccountId)
                    .OrderByDescending(t => t.CreatedAt)
                    .FirstOrDefaultAsync();

                if (lastTransaction != null)
                    previousBalance = lastTransaction.Balance ?? 0;

                // Get default accounts
                var salesAccountId = await GetDefaultAccountIdAsync("Sales", companyId);
                var vatAccountId = await GetDefaultAccountIdAsync("VAT", companyId);
                var roundOffAccountId = await GetDefaultAccountIdAsync("Rounded Off", companyId);
                var cashAccountId = await GetDefaultAccountIdAsync("Cash in Hand", companyId);

                // Determine if company uses Nepali date format
                bool isNepaliFormat = company.DateFormat?.ToString().ToLower() == "nepali";

                // Create sales bill with frontend-calculated values
                var salesBill = new SalesBill
                {
                    Id = Guid.NewGuid(),
                    CompanyId = companyId,
                    UserId = userId,
                    BillNumber = billNumber,
                    PurchaseSalesType = "Sales",
                    AccountId = dto.AccountId,
                    FiscalYearId = fiscalYearId,
                    Type = "Sale",
                    SubTotal = dto.SubTotal ?? 0,
                    NonVatSales = dto.NonTaxableAmount ?? 0,
                    TaxableAmount = dto.TaxableAmount ?? 0,
                    DiscountPercentage = dto.DiscountPercentage ?? 0,
                    DiscountAmount = dto.DiscountAmount ?? 0,
                    VatPercentage = isVatExemptBool ? 0 : (dto.VatPercentage ?? 0),
                    VatAmount = dto.VatAmount ?? 0,
                    TotalAmount = dto.TotalAmount ?? 0,
                    IsVatExempt = isVatExemptBool,
                    IsVatAll = isVatAll ? "all" : null,
                    RoundOffAmount = dto.RoundOffAmount ?? 0,
                    PaymentMode = dto.PaymentMode,
                    nepaliDate = dto.NepaliDate,
                    Date = dto.Date,
                    transactionDateNepali = dto.TransactionDateNepali,
                    TransactionDate = dto.TransactionDate,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                // Add sales bill to context
                await _context.SalesBills.AddAsync(salesBill);

                // Process items and reduce stock
                foreach (var itemDto in dto.Items)
                {
                    var item = await _context.Items
                        .Include(i => i.StockEntries)
                        .FirstOrDefaultAsync(i => i.Id == itemDto.ItemId);

                    if (item == null)
                        continue;

                    // Find the batch to reduce
                    var batchToReduce = item.StockEntries
                        .FirstOrDefault(e => e.BatchNumber == itemDto.BatchNumber &&
                                            (string.IsNullOrEmpty(itemDto.UniqueUuid) || e.UniqueUuid == itemDto.UniqueUuid));

                    if (batchToReduce != null)
                    {
                        // Reduce stock
                        batchToReduce.Quantity -= itemDto.Quantity;

                        // If batch quantity becomes zero or negative, remove it
                        if (batchToReduce.Quantity <= 0)
                        {
                            _context.StockEntries.Remove(batchToReduce);
                        }
                    }

                    // Update item total stock
                    _context.Items.Update(item);

                    // Calculate net price after discount
                    decimal netPrice = itemDto.Price - (itemDto.Price * (dto.DiscountPercentage ?? 0) / 100);
                    decimal newMarginPercentage = 0;
                    if (itemDto.PuPrice.HasValue && itemDto.PuPrice.Value > 0)
                    {
                        newMarginPercentage = ((itemDto.Price - itemDto.PuPrice.Value) / itemDto.PuPrice.Value) * 100;
                        newMarginPercentage = Math.Round(newMarginPercentage, 2);
                    }
                    // Create sales bill item
                    var billItem = new SalesBillItem
                    {
                        Id = Guid.NewGuid(),
                        SalesBillId = salesBill.Id,
                        ItemId = itemDto.ItemId,
                        UnitId = itemDto.UnitId,
                        Quantity = itemDto.Quantity,
                        Price = itemDto.Price,
                        PuPrice = itemDto.PuPrice,
                        MarginPercentage = newMarginPercentage,
                        Mrp = itemDto.Mrp ?? 0,
                        NetPuPrice = itemDto.NetPuPrice ?? itemDto.PuPrice,
                        DiscountPercentagePerItem = dto.DiscountPercentage ?? 0,
                        DiscountAmountPerItem = (itemDto.Price * itemDto.Quantity * (dto.DiscountPercentage ?? 0)) / 100,
                        NetPrice = netPrice,
                        BatchNumber = itemDto.BatchNumber,
                        ExpiryDate = itemDto.ExpiryDate,
                        VatStatus = item.VatStatus ?? "vatable",
                        UniqueUuid = batchToReduce?.UniqueUuid,
                        CreatedAt = isNepaliFormat ? dto.NepaliDate : dto.Date,
                        UpdatedAt = isNepaliFormat ? dto.NepaliDate : dto.Date
                    };

                    salesBill.Items.Add(billItem);
                }

                // Create item-level transactions for party account
                foreach (var itemDto in dto.Items)
                {
                    var item = await _context.Items.FindAsync(itemDto.ItemId);
                    if (item == null) continue;

                    var partyTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        ItemId = itemDto.ItemId,
                        UnitId = itemDto.UnitId,
                        Quantity = itemDto.Quantity,
                        Price = itemDto.Price,
                        PuPrice = itemDto.PuPrice,
                        DiscountPercentagePerItem = dto.DiscountPercentage ?? 0,
                        DiscountAmountPerItem = (itemDto.Price * itemDto.Quantity * (dto.DiscountPercentage ?? 0)) / 100,
                        NetPuPrice = itemDto.NetPuPrice ?? (itemDto.PuPrice ?? 0m),
                        AccountId = dto.AccountId,
                        SalesBillId = salesBill.Id,
                        BillNumber = salesBill.BillNumber,
                        Type = TransactionType.Sale,
                        PurchaseSalesType = "Sales",
                        Debit = dto.TotalAmount ?? 0,
                        Credit = 0,
                        PaymentMode = ParsePaymentMode(dto.PaymentMode),
                        Balance = previousBalance - (dto.TotalAmount ?? 0),
                        Date = salesBill.Date,
                        BillDate = salesBill.Date,
                        FiscalYearId = fiscalYearId,
                        CreatedAt = DateTime.UtcNow,
                        Status = TransactionStatus.Active,
                        IsActive = true,
                        IsType = TransactionIsType.Sale
                    };

                    await _context.Transactions.AddAsync(partyTransaction);
                }

                // 1. Sales Account transaction
                if (salesAccountId.HasValue)
                {
                    var salesAmount = (dto.TaxableAmount ?? 0) + (dto.NonTaxableAmount ?? 0);

                    if (salesAmount > 0)
                    {
                        var salesTransaction = new Transaction
                        {
                            Id = Guid.NewGuid(),
                            CompanyId = companyId,
                            AccountId = salesAccountId.Value,
                            SalesBillId = salesBill.Id,
                            BillNumber = salesBill.BillNumber,
                            Type = TransactionType.Sale,
                            PurchaseSalesType = "Sales",
                            Debit = 0,
                            Credit = salesAmount,
                            PaymentMode = ParsePaymentMode(dto.PaymentMode),
                            Date = salesBill.TransactionDate,
                            BillDate = salesBill.Date,
                            FiscalYearId = fiscalYearId,
                            CreatedAt = DateTime.UtcNow,
                            Status = TransactionStatus.Active,
                            IsActive = true,
                            IsType = TransactionIsType.Sale,
                            Balance = previousBalance + salesAmount
                        };

                        await _context.Transactions.AddAsync(salesTransaction);
                    }
                }

                // 2. VAT transaction if applicable
                if (dto.VatAmount > 0 && vatAccountId.HasValue && !isVatExemptBool)
                {
                    var vatTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        AccountId = vatAccountId.Value,
                        SalesBillId = salesBill.Id,
                        BillNumber = salesBill.BillNumber,
                        IsType = TransactionIsType.VAT,
                        Type = TransactionType.Sale,
                        PurchaseSalesType = "Sales",
                        Debit = 0,
                        Credit = dto.VatAmount.Value,
                        PaymentMode = ParsePaymentMode(dto.PaymentMode),
                        Date = salesBill.TransactionDate,
                        BillDate = salesBill.Date,
                        FiscalYearId = fiscalYearId,
                        CreatedAt = DateTime.UtcNow,
                        Status = TransactionStatus.Active,
                        IsActive = true,
                        Balance = previousBalance + dto.VatAmount.Value
                    };

                    await _context.Transactions.AddAsync(vatTransaction);
                }

                // 3. Round-off transaction if applicable
                if (dto.RoundOffAmount != 0 && roundOffAccountId.HasValue)
                {
                    var roundOffTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        AccountId = roundOffAccountId.Value,
                        SalesBillId = salesBill.Id,
                        BillNumber = salesBill.BillNumber,
                        IsType = TransactionIsType.RoundOff,
                        Type = TransactionType.Sale,
                        PurchaseSalesType = "Sales",
                        Debit = dto.RoundOffAmount > 0 ? 0 : Math.Abs(dto.RoundOffAmount.Value),
                        Credit = dto.RoundOffAmount > 0 ? dto.RoundOffAmount.Value : 0,
                        PaymentMode = ParsePaymentMode(dto.PaymentMode),
                        Date = salesBill.TransactionDate,
                        BillDate = salesBill.Date,
                        FiscalYearId = fiscalYearId,
                        CreatedAt = DateTime.UtcNow,
                        Status = TransactionStatus.Active,
                        IsActive = true,
                        Balance = previousBalance + dto.RoundOffAmount.Value
                    };

                    await _context.Transactions.AddAsync(roundOffTransaction);
                }

                // 4. Cash transaction if payment mode is cash
                if (dto.PaymentMode?.ToLower() == "cash" && cashAccountId.HasValue)
                {
                    var cashTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        AccountId = cashAccountId.Value,
                        SalesBillId = salesBill.Id,
                        BillNumber = salesBill.BillNumber,
                        Type = TransactionType.Sale,
                        PurchaseSalesType = "Sales",
                        Debit = dto.TotalAmount ?? 0,
                        Credit = 0,
                        PaymentMode = PaymentMode.Cash,
                        Date = salesBill.TransactionDate,
                        BillDate = salesBill.Date,
                        FiscalYearId = fiscalYearId,
                        CreatedAt = DateTime.UtcNow,
                        Status = TransactionStatus.Active,
                        IsActive = true,
                        IsType = TransactionIsType.Sale,
                        Balance = previousBalance + (dto.TotalAmount ?? 0)
                    };

                    await _context.Transactions.AddAsync(cashTransaction);
                }

                // Save all changes
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                _logger.LogInformation("Credit sales open bill created successfully with ID: {BillId}, Number: {BillNumber}",
                    salesBill.Id, salesBill.BillNumber);

                return salesBill;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Error creating credit sales open bill");
                throw;
            }
        }

        private async Task<Guid?> GetDefaultAccountIdAsync(string accountName, Guid companyId)
        {
            var account = await _context.Accounts
                .FirstOrDefaultAsync(a => a.Name == accountName && a.CompanyId == companyId);
            return account?.Id;
        }
        private PaymentMode ParsePaymentMode(string? paymentMode)
        {
            return paymentMode?.ToLower() switch
            {
                "cash" => PaymentMode.Cash,
                "credit" => PaymentMode.Credit,
                "payment" => PaymentMode.Payment,
                "receipt" => PaymentMode.Receipt,
                "journal" => PaymentMode.Journal,
                "drnote" => PaymentMode.DrNote,
                "crnote" => PaymentMode.CrNote,
                _ => PaymentMode.Credit // Default to Credit
            };
        }

        public async Task<CreditSalesFindsDTO> GetCreditSalesFindsAsync(Guid companyId, Guid fiscalYearId, Guid userId)
        {
            try
            {
                _logger.LogInformation("GetCreditSalesFindsAsync called for Company: {CompanyId}, FiscalYear: {FiscalYearId}, User: {UserId}",
                    companyId, fiscalYearId, userId);

                // Get company information
                var company = await _context.Companies
                    .Where(c => c.Id == companyId)
                    .Select(c => new CompanyInfoDTO
                    {
                        Id = c.Id,
                        Name = c.Name,
                        Address = c.Address,
                        City = c.City,
                        Phone = c.Phone,
                        Pan = c.Pan,
                        RenewalDate = c.RenewalDate,
                        DateFormat = c.DateFormat.ToString(),
                        VatEnabled = c.VatEnabled,
                    })
                    .FirstOrDefaultAsync();

                if (company == null)
                {
                    _logger.LogWarning("Company not found with ID: {CompanyId}", companyId);
                    throw new ArgumentException("Company not found");
                }

                // Determine if company uses Nepali date format
                bool isNepaliFormat = company.DateFormat?.ToLower() == "nepali";

                _logger.LogInformation("Company date format: {DateFormat}, IsNepaliFormat: {IsNepaliFormat}",
                    company.DateFormat, isNepaliFormat);

                // Get fiscal year information
                var currentFiscalYear = await _context.FiscalYears
                    .Where(f => f.Id == fiscalYearId && f.CompanyId == companyId)
                    .Select(f => new FiscalYearDTO
                    {
                        Id = f.Id,
                        Name = f.Name,
                        StartDate = f.StartDate,
                        EndDate = f.EndDate,
                        StartDateNepali = f.StartDateNepali,
                        EndDateNepali = f.EndDateNepali,
                        IsActive = f.IsActive,
                    })
                    .FirstOrDefaultAsync();

                if (currentFiscalYear == null)
                {
                    _logger.LogWarning("Fiscal year not found with ID: {FiscalYearId} for Company: {CompanyId}",
                        fiscalYearId, companyId);
                    throw new ArgumentException("Fiscal year not found");
                }

                // Get company date format string
                string companyDateFormat = company.DateFormat?.ToLower() ?? "english";

                // Fetch the latest purchase bill for this company and fiscal year
                // EXCLUDE bills that have CashAccount populated (not null)
                var latestBillQuery = _context.SalesBills
                    .Where(pb => pb.CompanyId == companyId &&
                                pb.FiscalYearId == fiscalYearId &&
                                pb.CashAccount == null); // CHANGED: Exclude bills with CashAccount

                if (isNepaliFormat)
                {
                    // For Nepali format, order by nepaliDate descending
                    latestBillQuery = latestBillQuery.OrderByDescending(pb => pb.nepaliDate)
                                                     .ThenByDescending(pb => pb.BillNumber);
                }
                else
                {
                    // For English format, order by Date descending
                    latestBillQuery = latestBillQuery.OrderByDescending(pb => pb.Date)
                                                     .ThenByDescending(pb => pb.BillNumber);
                }

                var latestBill = await latestBillQuery
                    .Select(pb => new
                    {
                        pb.BillNumber,
                        pb.Date,
                        pb.nepaliDate
                    })
                    .FirstOrDefaultAsync();

                _logger.LogInformation("Latest bill query result: BillNumber: {BillNumber}, Date: {Date}, NepaliDate: {NepaliDate}",
                    latestBill?.BillNumber, latestBill?.Date, latestBill?.nepaliDate);

                // Get user with roles
                var user = await _context.Users
                    .Include(u => u.UserRoles)
                        .ThenInclude(ur => ur.Role)
                    .FirstOrDefaultAsync(u => u.Id == userId);

                if (user == null)
                {
                    _logger.LogWarning("User not found with ID: {UserId}", userId);
                    throw new ArgumentException("User not found");
                }

                bool isAdmin = user?.IsAdmin ?? false;
                string userRole = "User";

                if (isAdmin)
                {
                    userRole = "Admin";
                }
                else if (user?.UserRoles != null)
                {
                    var primaryRole = user.UserRoles.FirstOrDefault(ur => ur.IsPrimary);
                    if (primaryRole?.Role != null)
                    {
                        userRole = primaryRole.Role.Name;
                    }
                }

                // Determine if user is admin or supervisor
                bool isAdminOrSupervisor = isAdmin || userRole == "Supervisor";

                // Create user info DTO
                var userInfo = new UserInfoDTO
                {
                    Id = user.Id,
                    Name = user.Name,
                    Email = user.Email,
                    IsAdmin = isAdmin,
                    Role = userRole,
                    Preferences = new UserPreferencesDTO
                    {
                        Theme = user.Preferences?.Theme.ToString() ?? "light"
                    }
                };

                // Create response DTO
                var response = new CreditSalesFindsDTO
                {
                    Company = company,
                    BillNumber = latestBill?.BillNumber ?? string.Empty,
                    CurrentFiscalYear = currentFiscalYear,
                    CompanyDateFormat = companyDateFormat,
                    CurrentCompanyName = company.Name,
                    Date = DateTime.UtcNow.Date,
                    Title = string.Empty,
                    Body = string.Empty,
                    User = userInfo,
                    Theme = userInfo.Preferences?.Theme ?? "light",
                    IsAdminOrSupervisor = isAdminOrSupervisor
                };

                _logger.LogInformation("Successfully retrieved credit sales finds data for Company: {CompanyId}", companyId);

                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetCreditSalesFindsAsync for Company: {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<CreditSalesPartyInfoDTO?> GetCreditSalesPartyInfoAsync(string billNumber, Guid companyId, Guid fiscalYearId)
        {
            try
            {
                _logger.LogInformation($"Getting party info for credit sales: {billNumber}, Company: {companyId}, FiscalYear: {fiscalYearId}");

                // Find the purchase bill with account information
                var creditSalesBill = await _context.SalesBills
                    .Include(pb => pb.Account)
                    .Where(pb => pb.BillNumber == billNumber &&
                                pb.CompanyId == companyId &&
                                pb.FiscalYearId == fiscalYearId)
                    .Select(pb => new CreditSalesPartyInfoDTO
                    {
                        BillNumber = pb.BillNumber,
                        Date = pb.Date,
                        PaymentMode = pb.PaymentMode,
                        AccountId = pb.AccountId ?? Guid.Empty,
                        AccountName = pb.Account != null ? pb.Account.Name : string.Empty,
                        AccountAddress = pb.Account != null ? pb.Account.Address : string.Empty,
                        AccountPan = pb.Account != null ? pb.Account.Pan : string.Empty,
                        AccountUniqueNumber = pb.Account != null ? pb.Account.UniqueNumber : null
                    })
                    .FirstOrDefaultAsync();

                if (creditSalesBill == null)
                {
                    _logger.LogWarning($"Credit sales bill not found: {billNumber}");
                    return null;
                }

                _logger.LogInformation($"Successfully retrieved party info for bill: {billNumber}");
                return creditSalesBill;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting credit sales party info for bill: {billNumber}");
                throw;
            }
        }

        public async Task<ChangeCreditSalesPartyResponseDTO> ChangeCreditSalesPartyAsync(string billNumber, Guid newAccountId, Guid companyId, Guid fiscalYearId, Guid userId)
        {
            _logger.LogInformation($"Changing party for credit sales: {billNumber} to new account: {newAccountId}");

            // Start a database transaction to ensure data consistency
            using var dbTransaction = await _context.Database.BeginTransactionAsync();

            try
            {
                // 1. Verify the new account exists, is active, and is a party account
                var newAccount = await VerifyAndGetPartyAccountAsync(newAccountId, companyId);

                // 2. Get the original purchase bill with account
                var originalBill = await _context.SalesBills
                    .Include(pb => pb.Account)
                    .Include(pb => pb.Items)
                    .FirstOrDefaultAsync(pb => pb.BillNumber == billNumber &&
                                               pb.CompanyId == companyId &&
                                               pb.FiscalYearId == fiscalYearId);

                if (originalBill == null)
                {
                    throw new Exception("Voucher not found");
                }

                // Check if party is actually changed
                if (originalBill.AccountId == newAccountId)
                {
                    throw new Exception("Selected party is same as current party");
                }

                var oldAccountId = originalBill.AccountId;
                var oldAccountName = originalBill.Account?.Name ?? "Unknown";

                // 3. Calculate amounts
                var totalAmount = originalBill.TotalAmount;
                var taxableAmount = originalBill.TaxableAmount;
                var NonVatSales = originalBill.NonVatSales;
                var vatAmount = originalBill.VatAmount;
                var roundOffAmount = originalBill.RoundOffAmount;
                var creditSalesAmount = taxableAmount + NonVatSales;

                // 4. Get purchase account ID
                var creditSalesAccountId = await GetDefaultAccountIdAsync("Sales", companyId);
                var vatAccountId = await GetDefaultAccountIdAsync("VAT", companyId);
                var roundOffAccountId = await GetDefaultAccountIdAsync("Rounded Off", companyId);

                // Parse payment mode
                var paymentMode = ParsePaymentMode(originalBill.PaymentMode ?? "Credit");

                // 5. Get all transactions linked to this purchase bill
                var transactions = await _context.Transactions
                    .Where(t => t.SalesBillId == originalBill.Id &&
                               t.CompanyId == companyId &&
                               t.FiscalYearId == fiscalYearId &&
                               t.Status == TransactionStatus.Active)
                    .ToListAsync();

                _logger.LogInformation($"Found {transactions.Count} transactions for bill {billNumber}");

                // 6. Update purchase bill with new account
                originalBill.AccountId = newAccountId;
                originalBill.UpdatedAt = DateTime.UtcNow;
                originalBill.PurchaseSalesType = "Sales"; // Update purchase type with new party name

                // 7. Process each transaction
                foreach (var trans in transactions)
                {
                    // Check if this is the main party transaction (old party)
                    // Party transaction is identified by having AccountId = oldAccountId AND Debit = 0, Credit = totalAmount
                    var isMainPartyTransaction = trans.AccountId == oldAccountId &&
                                                 trans.Debit == totalAmount &&
                                                 trans.Credit == 0 &&
                                                 trans.Type == TransactionType.Sale;

                    if (isMainPartyTransaction)
                    {
                        // Update to new party - Party account should be DEBIT side
                        trans.AccountId = newAccountId;
                        trans.PurchaseSalesType = "Sales";
                        trans.UpdatedAt = DateTime.UtcNow;

                        _logger.LogInformation($"Updated main party transaction {trans.Id} from account {oldAccountId} to {newAccountId}");
                    }
                    // Check if this is a purchase account transaction
                    else if (creditSalesAccountId.HasValue && trans.AccountId == creditSalesAccountId.Value)
                    {
                        trans.PurchaseSalesType = "Sales";
                        trans.UpdatedAt = DateTime.UtcNow;

                        _logger.LogInformation($"Updated credit sales account transaction {trans.Id} with new party name: {newAccount.Name}");
                    }
                    // Check if this is a VAT transaction
                    else if (vatAccountId.HasValue && trans.AccountId == vatAccountId.Value && trans.IsType == TransactionIsType.VAT)
                    {
                        trans.PurchaseSalesType = "Sales";
                        trans.UpdatedAt = DateTime.UtcNow;

                        _logger.LogInformation($"Updated VAT transaction {trans.Id} with new party name: {newAccount.Name}");
                    }
                    // Check if this is a RoundOff transaction
                    else if (roundOffAccountId.HasValue && trans.AccountId == roundOffAccountId.Value && trans.IsType == TransactionIsType.RoundOff)
                    {
                        trans.PurchaseSalesType = "Sales";
                        trans.UpdatedAt = DateTime.UtcNow;

                        _logger.LogInformation($"Updated RoundOff transaction {trans.Id} with new party name: {newAccount.Name}");
                    }
                    // Check if this is a cash transaction (if payment mode was cash)
                    else if (trans.PaymentMode == PaymentMode.Cash && trans.Debit == 0 && trans.Credit == totalAmount)
                    {
                        trans.PurchaseSalesType = "Sales";
                        trans.UpdatedAt = DateTime.UtcNow;

                        _logger.LogInformation($"Updated cash transaction {trans.Id} with new party name: {newAccount.Name}");
                    }
                    // For any other transactions linked to items (item-level party transactions)
                    else if (trans.ItemId.HasValue && trans.Type == TransactionType.Purc)
                    {
                        // These are the item-level party transactions created in CreatesalesBillAsync
                        trans.AccountId = newAccountId; // Update the account to new party
                        trans.PurchaseSalesType = "Sales";
                        trans.UpdatedAt = DateTime.UtcNow;

                        _logger.LogInformation($"Updated item-level party transaction {trans.Id} for item {trans.ItemId}");
                    }
                }

                // 8. Save changes
                await _context.SaveChangesAsync();

                // 9. Commit transaction
                await dbTransaction.CommitAsync();

                _logger.LogInformation($"Successfully changed party for bill: {billNumber} from {oldAccountName} to {newAccount.Name}");

                return new ChangeCreditSalesPartyResponseDTO
                {
                    BillNumber = billNumber,
                    AccountId = newAccountId,
                    AccountName = newAccount.Name,
                    Message = $"Party changed successfully from \"{oldAccountName}\" to \"{newAccount.Name}\""
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error changing party for bill: {billNumber}");
                await dbTransaction.RollbackAsync();
                throw;
            }
        }

        private async Task<Account> VerifyAndGetPartyAccountAsync(Guid accountId, Guid companyId)
        {
            var account = await _context.Accounts
                .Include(a => a.AccountGroup)
                .FirstOrDefaultAsync(a => a.Id == accountId &&
                                          a.CompanyId == companyId &&
                                          a.IsActive);

            if (account == null)
            {
                throw new Exception($"Account with ID {accountId} not found or inactive");
            }

            // Verify account is a party account (Sundry Debtors or Sundry Creditors)
            if (account.AccountGroup != null)
            {
                var accountGroupName = account.AccountGroup.Name;
                if (accountGroupName != "Sundry Debtors" && accountGroupName != "Sundry Creditors")
                {
                    _logger.LogWarning($"Account {account.Name} is in group {accountGroupName}, not a typical party account");
                }
            }

            return account;
        }

        public async Task<BillIdResponseDTO> GetCreditSalesBillIdByNumberAsync(string billNumber, Guid companyId, Guid fiscalYearId)
        {
            try
            {
                _logger.LogInformation($"Getting credit sales ID for number: {billNumber}, Company: {companyId}, FiscalYear: {fiscalYearId}");

                var creditSalesBill = await _context.SalesBills
                    .Where(pb => pb.BillNumber == billNumber &&
                                pb.CompanyId == companyId &&
                                pb.FiscalYearId == fiscalYearId)
                    .Select(pb => new BillIdResponseDTO
                    {
                        Id = pb.Id,
                        BillNumber = pb.BillNumber
                    })
                    .FirstOrDefaultAsync();

                if (creditSalesBill == null)
                {
                    _logger.LogWarning($"Credit sales not found for number: {billNumber}");
                    throw new ArgumentException("Voucher not found");
                }

                _logger.LogInformation($"Successfully retrieved bill ID for number: {billNumber}");
                return creditSalesBill;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting credit sales ID for number: {billNumber}");
                throw;
            }
        }

        public async Task<SalesEditDataDTO> GetCreditSalesEditDataAsync(Guid billId, Guid companyId, Guid fiscalYearId, Guid userId)
        {
            try
            {
                _logger.LogInformation("GetCreditSalesEditDataAsync called for Bill ID: {BillId}, Company: {CompanyId}, FiscalYear: {FiscalYearId}",
                    billId, companyId, fiscalYearId);

                // Get company information including date format
                var company = await _context.Companies
                     .Where(c => c.Id == companyId)
                     .Select(c => new CompanyInfoDTO
                     {
                         Id = c.Id,
                         Name = c.Name,
                         Address = c.Address,
                         City = c.City,
                         Phone = c.Phone,
                         Pan = c.Pan,
                         RenewalDate = c.RenewalDate,
                         DateFormat = c.DateFormat.ToString(),
                         VatEnabled = c.VatEnabled,
                     })
                     .FirstOrDefaultAsync();

                if (company == null)
                    throw new ArgumentException("Company not found");

                // Determine if company uses Nepali date format
                bool isNepaliFormat = company.DateFormat?.ToLower() == "nepali";

                _logger.LogInformation("Company date format: {DateFormat}, IsNepaliFormat: {IsNepaliFormat}",
                    company.DateFormat, isNepaliFormat);

                // Get fiscal year
                var currentFiscalYear = await _context.FiscalYears
                    .Where(f => f.Id == fiscalYearId && f.CompanyId == companyId)
                    .Select(f => new FiscalYearDTO
                    {
                        Id = f.Id,
                        Name = f.Name,
                        StartDate = f.StartDate,
                        EndDate = f.EndDate,
                        StartDateNepali = f.StartDateNepali,
                        EndDateNepali = f.EndDateNepali,
                        IsActive = f.IsActive,
                    })
                    .FirstOrDefaultAsync();

                if (currentFiscalYear == null)
                    throw new ArgumentException("Fiscal year not found");

                // Get company date format
                string companyDateFormat = company.DateFormat?.ToLower() ?? "english";

                // Fetch sales bill with all related data
                var salesBill = await _context.SalesBills
                    .Include(sb => sb.Account)
                    .Include(sb => sb.Items)
                        .ThenInclude(i => i.Item)
                            .ThenInclude(it => it.Unit)
                    .Include(sb => sb.Items)
                        .ThenInclude(i => i.Item)
                            .ThenInclude(it => it.Category)
                    .Include(sb => sb.Items)
                        .ThenInclude(i => i.Unit)
                    .FirstOrDefaultAsync(sb => sb.Id == billId &&
                                              sb.CompanyId == companyId &&
                                              sb.FiscalYearId == fiscalYearId);

                if (salesBill == null)
                    throw new ArgumentException("Sales bill not found or does not belong to the selected company/fiscal year");

                // Process items to include stock and latest price
                var processedItems = new List<SalesBillItemEditDTO>();

                foreach (var item in salesBill.Items)
                {
                    // Get stock entries for this item
                    var stockEntries = await _context.StockEntries
                        .Where(se => se.ItemId == item.ItemId)
                        .OrderByDescending(se => se.Date)
                        .ToListAsync();

                    // Calculate total stock
                    decimal totalStock = stockEntries.Sum(se => se.Quantity);

                    // Get latest purchase price
                    var latestStockEntry = stockEntries.FirstOrDefault();
                    decimal latestPuPrice = latestStockEntry?.PuPrice ?? item.Item?.PuPrice ?? 0;

                    // Round to 2 decimal places
                    latestPuPrice = Math.Round(latestPuPrice * 100) / 100;

                    // Get unit info
                    UnitInfoDTO unitInfo = null;
                    if (item.Unit != null)
                    {
                        unitInfo = new UnitInfoDTO
                        {
                            Id = item.Unit.Id,
                            Name = item.Unit.Name
                        };
                    }
                    else if (item.Item?.Unit != null)
                    {
                        unitInfo = new UnitInfoDTO
                        {
                            Id = item.Item.Unit.Id,
                            Name = item.Item.Unit.Name
                        };
                    }

                    // Get category info
                    CategoryInfoDTO categoryInfo = null;
                    if (item.Item?.Category != null)
                    {
                        categoryInfo = new CategoryInfoDTO
                        {
                            Id = item.Item.Category.Id,
                            Name = item.Item.Category.Name
                        };
                    }

                    // Map stock entries to DTO
                    var stockEntryDtos = stockEntries.Select(se => new StockEntryInfoDTO
                    {
                        Id = se.Id,
                        Quantity = se.Quantity,
                        PuPrice = se.PuPrice,
                        Date = se.Date
                    }).ToList();

                    // Calculate amount
                    decimal amount = item.Quantity * item.Price;

                    // Map to response DTO
                    var itemDto = new SalesBillItemEditDTO
                    {
                        Id = item.Id,
                        SalesBillId = item.SalesBillId,
                        ItemId = item.ItemId,
                        ItemName = item.Item?.Name,
                        Hscode = item.Item?.Hscode,
                        UniqueNumber = item.Item?.UniqueNumber,
                        UnitId = item.Item?.UnitId ?? item.UnitId,  // Current unit ID
                        UnitName = item.Item?.Unit?.Name ?? item.Unit?.Name ?? "",  // Current unit name
                        Quantity = item.Quantity,
                        Price = item.Price,
                        PuPrice = item.PuPrice,
                        NetPuPrice = item.NetPuPrice,
                        DiscountPercentagePerItem = item.DiscountPercentagePerItem,
                        DiscountAmountPerItem = item.DiscountAmountPerItem,
                        NetPrice = item.NetPrice,
                        BatchNumber = item.BatchNumber,
                        ExpiryDate = item.ExpiryDate,
                        VatStatus = item.VatStatus,
                        UniqueUuid = item.UniqueUuid,
                        PurchaseBillId = item.PurchaseBillId,
                        CreatedAt = item.CreatedAt,
                        UpdatedAt = item.UpdatedAt,

                        // Additional properties for edit
                        Stock = totalStock,
                        LatestPuPrice = latestPuPrice,
                        Amount = amount,
                        StockEntries = stockEntryDtos,
                        Category = categoryInfo,
                        Unit = unitInfo
                    };

                    processedItems.Add(itemDto);
                }

                // Fetch all items for the company (for dropdown) with stock and latest price
                var allItems = await _context.Items
                    .Include(i => i.Unit)
                    .Include(i => i.Category)
                    .Where(i => i.CompanyId == companyId && i.Status == "active")
                    .ToListAsync();

                var processedAllItems = new List<ItemEditDTO>();

                foreach (var item in allItems)
                {
                    // Get stock entries for this item
                    var stockEntries = await _context.StockEntries
                        .Where(se => se.ItemId == item.Id)
                        .OrderByDescending(se => se.Date)
                        .Select(se => new StockEntryInfoDTO
                        {
                            Id = se.Id,
                            Quantity = se.Quantity,
                            PuPrice = se.PuPrice,
                            Date = se.Date
                        })
                        .ToListAsync();

                    // Calculate total stock
                    decimal totalStock = stockEntries.Sum(se => se.Quantity ?? 0);

                    // Get latest purchase price
                    var latestStockEntry = stockEntries.FirstOrDefault();
                    decimal latestPuPrice = latestStockEntry?.PuPrice ?? item.PuPrice ?? 0;
                    latestPuPrice = Math.Round(latestPuPrice * 100) / 100;

                    // Get unit info
                    UnitInfoDTO unitInfo = null;
                    if (item.Unit != null)
                    {
                        unitInfo = new UnitInfoDTO
                        {
                            Id = item.Unit.Id,
                            Name = item.Unit.Name
                        };
                    }

                    // Get category info
                    CategoryInfoDTO categoryInfo = null;
                    if (item.Category != null)
                    {
                        categoryInfo = new CategoryInfoDTO
                        {
                            Id = item.Category.Id,
                            Name = item.Category.Name
                        };
                    }

                    var itemDto = new ItemEditDTO
                    {
                        Id = item.Id,
                        Name = item.Name,
                        Hscode = item.Hscode,
                        UniqueNumber = item.UniqueNumber,
                        VatStatus = item.VatStatus ?? "vatable",
                        Unit = unitInfo,
                        Category = categoryInfo,
                        PuPrice = item.PuPrice ?? 0,
                        Quantity = 0,
                        Stock = totalStock,
                        LatestPuPrice = latestPuPrice,
                        StockEntries = stockEntries
                    };

                    processedAllItems.Add(itemDto);
                }

                // Sort items by name
                processedAllItems = processedAllItems.OrderBy(i => i.Name).ToList();

                // Fetch relevant accounts (Sundry Debtors only for credit sales)
                var relevantGroups = await _context.AccountGroups
                    .Where(cg => cg.Name == "Sundry Debtors" || cg.Name == "Sundry Debtors")
                    .Select(cg => cg.Id)
                    .ToListAsync();

                var accounts = await _context.Accounts
                    .Where(a => a.CompanyId == companyId && a.IsActive == true)
                    .Select(a => new AccountInfoDTO
                    {
                        Id = a.Id,
                        Name = a.Name,
                        Address = a.Address,
                        Pan = a.Pan,
                        UniqueNumber = a.UniqueNumber,
                    })
                    .ToListAsync();

                // Get user with roles
                var user = await _context.Users
                    .Include(u => u.UserRoles)
                        .ThenInclude(ur => ur.Role)
                    .FirstOrDefaultAsync(u => u.Id == userId);

                bool isAdmin = user?.IsAdmin ?? false;
                string userRole = "User";

                if (isAdmin)
                {
                    userRole = "Admin";
                }
                else if (user?.UserRoles != null)
                {
                    var primaryRole = user.UserRoles.FirstOrDefault(ur => ur.IsPrimary);
                    if (primaryRole?.Role != null)
                    {
                        userRole = primaryRole.Role.Name;
                    }
                }

                // Map sales bill to response DTO
                var salesBillDto = MapToResponseDTO(salesBill, companyDateFormat);

                // Add the processed items with additional edit properties
                salesBillDto.Items = processedItems.Cast<SalesBillItemResponseDTO>().ToList();

                // Create response following the same pattern as PurchaseReturnEditDataDTO
                var response = new SalesEditDataDTO
                {
                    Company = company,
                    SalesBill = salesBillDto,
                    Items = processedAllItems,
                    Accounts = accounts,
                    User = new UserEditInfoDTO
                    {
                        IsAdmin = isAdmin,
                        Role = userRole,
                        Preferences = new UserPreferencesDTO
                        {
                            Theme = user?.Preferences?.Theme.ToString() ?? "light"
                        }
                    }
                };

                _logger.LogInformation("Successfully retrieved credit sales edit data for Bill ID: {BillId}", billId);

                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting credit sales edit data for Bill ID: {BillId}", billId);
                throw;
            }
        }

        private SalesBillResponseDTO MapToResponseDTO(SalesBill salesBill, string companyDateFormat)
        {
            bool isNepaliFormat = companyDateFormat?.ToLower() == "nepali";

            return new SalesBillResponseDTO
            {
                Id = salesBill.Id,
                CompanyId = salesBill.CompanyId,
                CompanyName = salesBill.Company?.Name,
                FirstPrinted = salesBill.FirstPrinted,
                PrintCount = salesBill.PrintCount,
                PurchaseSalesType = "Sales",
                OriginalCopies = salesBill.OriginalCopies,
                UserId = salesBill.UserId,
                UserName = salesBill.User?.Name,
                BillNumber = salesBill.BillNumber,
                AccountId = salesBill.AccountId,
                // AccountName = salesBill.Account?.Name,
                AccountName = salesBill.Account != null ? salesBill.Account.Name : salesBill.CashAccount,
                CashAccount = salesBill.CashAccount,
                CashAccountAddress = salesBill.CashAccountAddress,
                CashAccountPan = salesBill.CashAccountPan,
                CashAccountEmail = salesBill.CashAccountEmail,
                CashAccountPhone = salesBill.CashAccountPhone,
                SettingsId = salesBill.SettingsId,
                FiscalYearId = salesBill.FiscalYearId,
                FiscalYearName = salesBill.FiscalYear?.Name,
                Items = salesBill.Items.Select(i => new SalesBillItemResponseDTO
                {
                    Id = i.Id,
                    SalesBillId = i.SalesBillId,
                    ItemId = i.ItemId,
                    ItemName = i.Item?.Name,
                    Hscode = i.Item?.Hscode,
                    UniqueNumber = i.Item?.UniqueNumber,
                    UnitId = i.UnitId,
                    UnitName = i.Unit?.Name,
                    Quantity = i.Quantity,
                    Price = i.Price,
                    PuPrice = i.PuPrice,
                    NetPuPrice = i.NetPuPrice,
                    Mrp = i.Mrp,
                    DiscountPercentagePerItem = i.DiscountPercentagePerItem,
                    DiscountAmountPerItem = i.DiscountAmountPerItem,
                    NetPrice = i.NetPrice,
                    BatchNumber = i.BatchNumber,
                    ExpiryDate = i.ExpiryDate,
                    VatStatus = i.VatStatus,
                    UniqueUuid = i.UniqueUuid,
                    PurchaseBillId = i.PurchaseBillId,
                    CreatedAt = i.CreatedAt,
                    UpdatedAt = i.UpdatedAt
                }).ToList(),
                SubTotal = salesBill.SubTotal,
                NonVatSales = salesBill.NonVatSales,
                TaxableAmount = salesBill.TaxableAmount,
                DiscountPercentage = salesBill.DiscountPercentage,
                DiscountAmount = salesBill.DiscountAmount,
                VatPercentage = salesBill.VatPercentage,
                VatAmount = salesBill.VatAmount,
                TotalAmount = salesBill.TotalAmount,
                IsVatExempt = salesBill.IsVatExempt,
                IsVatAll = salesBill.IsVatAll,
                RoundOffAmount = salesBill.RoundOffAmount,
                PaymentMode = salesBill.PaymentMode,
                NepaliDate = salesBill.nepaliDate,
                Date = isNepaliFormat ? salesBill.nepaliDate : salesBill.Date,
                TransactionDateNepali = salesBill.transactionDateNepali,
                TransactionDate = salesBill.TransactionDate,
                CreatedAt = salesBill.CreatedAt,
                UpdatedAt = salesBill.UpdatedAt
            };
        }

        public async Task<SalesBill> UpdateCreditSalesBillAsync(Guid billId, UpdateSalesBillDTO dto, Guid userId, Guid companyId, Guid fiscalYearId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                _logger.LogInformation("UpdateCreditSalesBillAsync started for Bill ID: {BillId}, Company: {CompanyId}, User: {UserId}",
                    billId, companyId, userId);

                // Validate required fields
                if (dto.AccountId == Guid.Empty)
                    throw new ArgumentException("Account ID is required");

                if (dto.Items == null || !dto.Items.Any())
                    throw new ArgumentException("At least one item is required");

                // Get the existing sales bill with ALL related data
                var existingBill = await _context.SalesBills
                    .Include(sb => sb.Items)
                    .FirstOrDefaultAsync(sb => sb.Id == billId && sb.CompanyId == companyId);

                if (existingBill == null)
                    throw new ArgumentException("Sales bill not found");

                // Validate company and fiscal year
                var company = await _context.Companies.FindAsync(companyId);
                if (company == null)
                    throw new ArgumentException("Company not found");

                var fiscalYear = await _context.FiscalYears.FindAsync(fiscalYearId);
                if (fiscalYear == null || fiscalYear.CompanyId != companyId)
                    throw new ArgumentException("Invalid fiscal year");

                // Validate account
                var account = await _context.Accounts
                    .FirstOrDefaultAsync(a => a.Id == dto.AccountId && a.CompanyId == companyId);
                if (account == null)
                    throw new ArgumentException("Invalid account for this company");

                // Parse VAT exemption
                bool isVatExemptBool = dto.IsVatExempt == "true" || dto.IsVatExempt == "True" || dto.IsVatExempt == "1";
                bool isVatAll = dto.IsVatExempt == "all";

                // STEP 1: RESTORE STOCK for all existing items
                await RestoreStockForSalesBillItemsAsync(existingBill, companyId);

                // STEP 2: Delete all associated transactions FIRST
                var existingTransactions = await _context.Transactions
                    .Where(t => t.SalesBillId == billId)
                    .ToListAsync();

                if (existingTransactions.Any())
                {
                    _context.Transactions.RemoveRange(existingTransactions);
                    _logger.LogInformation("Deleted {Count} existing transactions", existingTransactions.Count);

                    // Save changes to delete transactions
                    await _context.SaveChangesAsync();
                }

                // STEP 3: Delete existing items
                if (existingBill.Items.Any())
                {
                    _context.SalesBillItems.RemoveRange(existingBill.Items);
                    existingBill.Items.Clear();

                    // Save changes to delete items
                    await _context.SaveChangesAsync();
                }

                // Get default accounts
                var salesAccount = await _context.Accounts
                    .FirstOrDefaultAsync(a => a.Name == "Sales" && a.CompanyId == companyId);

                var vatAccount = await _context.Accounts
                    .FirstOrDefaultAsync(a => a.Name == "VAT" && a.CompanyId == companyId);

                var roundOffAccount = await _context.Accounts
                    .FirstOrDefaultAsync(a => a.Name == "Rounded Off" && a.CompanyId == companyId);

                var cashAccount = await _context.Accounts
                    .FirstOrDefaultAsync(a => a.Name == "Cash in Hand" && a.CompanyId == companyId);

                var paymentMode = ParsePaymentMode(dto.PaymentMode);

                // Get previous balance for account
                decimal previousBalance = 0;
                var lastTransaction = await _context.Transactions
                    .Where(t => t.AccountId == dto.AccountId)
                    .OrderByDescending(t => t.CreatedAt)
                    .FirstOrDefaultAsync();

                if (lastTransaction != null)
                    previousBalance = lastTransaction.Balance ?? 0;

                // STEP 4: Validate new items and check stock availability
                await ValidateAndCheckStockForSalesItemsAsync(dto.Items, companyId, isVatExemptBool, isVatAll);

                // STEP 5: UPDATE BILL PROPERTIES (do this before adding new items)
                existingBill.AccountId = dto.AccountId;
                existingBill.SubTotal = dto.SubTotal ?? 0;
                existingBill.NonVatSales = dto.NonTaxableAmount ?? 0;
                existingBill.TaxableAmount = dto.TaxableAmount ?? 0;
                existingBill.DiscountPercentage = dto.DiscountPercentage ?? 0;
                existingBill.DiscountAmount = dto.DiscountAmount ?? 0;
                existingBill.VatPercentage = isVatExemptBool ? 0 : (dto.VatPercentage ?? 0);
                existingBill.VatAmount = dto.VatAmount ?? 0;
                existingBill.TotalAmount = dto.TotalAmount ?? 0;
                existingBill.IsVatExempt = isVatExemptBool;
                existingBill.IsVatAll = isVatAll ? "all" : null;
                existingBill.RoundOffAmount = dto.RoundOffAmount ?? 0;
                existingBill.PaymentMode = dto.PaymentMode;
                existingBill.nepaliDate = dto.NepaliDate;
                existingBill.Date = dto.Date;
                existingBill.transactionDateNepali = dto.TransactionDateNepali;
                existingBill.TransactionDate = dto.TransactionDate;
                existingBill.UpdatedAt = DateTime.UtcNow;

                // Update the bill first
                _context.SalesBills.Update(existingBill);
                await _context.SaveChangesAsync();

                // STEP 6: Process new items and reduce stock
                foreach (var itemDto in dto.Items)
                {
                    var item = await _context.Items
                        .Include(i => i.StockEntries)
                        .FirstOrDefaultAsync(i => i.Id == itemDto.ItemId && i.CompanyId == companyId);

                    if (item == null)
                        throw new ArgumentException($"Item with id {itemDto.ItemId} not found");

                    // Find the batch to reduce
                    var batchToReduce = item.StockEntries
                        .FirstOrDefault(e => e.BatchNumber == itemDto.BatchNumber &&
                                            (string.IsNullOrEmpty(itemDto.UniqueUuid) || e.UniqueUuid == itemDto.UniqueUuid));

                    if (batchToReduce == null)
                        throw new ArgumentException($"Batch {itemDto.BatchNumber} not found for item {item.Name}");

                    // Reduce stock
                    await ReduceStockForSalesBillItemAsync(item, itemDto.BatchNumber, itemDto.Quantity, itemDto.UniqueUuid);

                    // Calculate net price after discount
                    decimal netPrice = itemDto.Price - (itemDto.Price * (dto.DiscountPercentage ?? 0) / 100);

                    // Determine if company uses Nepali date format
                    bool isNepaliFormat = company.DateFormat?.ToString().ToLower() == "nepali";
                    decimal newMarginPercentage = 0;
                    if (itemDto.PuPrice.HasValue && itemDto.PuPrice.Value > 0)
                    {
                        newMarginPercentage = ((itemDto.Price - itemDto.PuPrice.Value) / itemDto.PuPrice.Value) * 100;
                        newMarginPercentage = Math.Round(newMarginPercentage, 2);
                    }
                    // Create sales bill item
                    var billItem = new SalesBillItem
                    {
                        Id = Guid.NewGuid(),
                        SalesBillId = existingBill.Id,
                        ItemId = itemDto.ItemId,
                        UnitId = itemDto.UnitId,
                        Quantity = itemDto.Quantity,
                        Price = itemDto.Price,
                        PuPrice = itemDto.PuPrice,
                        NetPuPrice = itemDto.NetPuPrice ?? itemDto.PuPrice,
                        MarginPercentage = newMarginPercentage,
                        Mrp = itemDto.Mrp ?? 0,
                        DiscountPercentagePerItem = dto.DiscountPercentage ?? 0,
                        DiscountAmountPerItem = (itemDto.Price * itemDto.Quantity * (dto.DiscountPercentage ?? 0)) / 100,
                        NetPrice = netPrice,
                        BatchNumber = itemDto.BatchNumber,
                        ExpiryDate = itemDto.ExpiryDate,
                        VatStatus = item.VatStatus ?? "vatable",
                        UniqueUuid = batchToReduce?.UniqueUuid,
                        PurchaseBillId = itemDto.PurchaseBillId,
                        CreatedAt = isNepaliFormat ? dto.NepaliDate : dto.Date,
                        UpdatedAt = isNepaliFormat ? dto.NepaliDate : dto.Date
                    };

                    existingBill.Items.Add(billItem);
                    await _context.SalesBillItems.AddAsync(billItem);
                }

                // Save items
                await _context.SaveChangesAsync();

                // STEP 7: CREATE NEW TRANSACTIONS
                var transactions = new List<Transaction>();

                // 1. Party account transaction
                var partyTransaction = new Transaction
                {
                    Id = Guid.NewGuid(),
                    CompanyId = companyId,
                    AccountId = dto.AccountId,
                    SalesBillId = existingBill.Id,
                    BillNumber = existingBill.BillNumber,
                    Type = TransactionType.Sale,
                    PurchaseSalesType = "Sales",
                    Debit = dto.TotalAmount ?? 0,
                    Credit = 0,
                    PaymentMode = paymentMode,
                    Balance = previousBalance - (dto.TotalAmount ?? 0),
                    Date = existingBill.TransactionDate,
                    BillDate = existingBill.Date,
                    FiscalYearId = fiscalYearId,
                    CreatedAt = DateTime.UtcNow,
                    Status = TransactionStatus.Active,
                    IsActive = true,
                    IsType = TransactionIsType.Sale
                };
                transactions.Add(partyTransaction);

                // 2. Sales Account transaction
                if (salesAccount != null)
                {
                    var salesAmount = (dto.TaxableAmount ?? 0) + (dto.NonTaxableAmount ?? 0);
                    if (salesAmount > 0)
                    {
                        var salesTransaction = new Transaction
                        {
                            Id = Guid.NewGuid(),
                            CompanyId = companyId,
                            AccountId = salesAccount.Id,
                            SalesBillId = existingBill.Id,
                            BillNumber = existingBill.BillNumber,
                            Type = TransactionType.Sale,
                            PurchaseSalesType = "Sales",
                            Debit = 0,
                            Credit = salesAmount,
                            PaymentMode = paymentMode,
                            Date = existingBill.TransactionDate,
                            BillDate = existingBill.Date,
                            FiscalYearId = fiscalYearId,
                            CreatedAt = DateTime.UtcNow,
                            Status = TransactionStatus.Active,
                            IsActive = true,
                            IsType = TransactionIsType.Sale,
                            Balance = previousBalance + salesAmount
                        };
                        transactions.Add(salesTransaction);
                    }
                }

                // 3. VAT transaction if applicable
                if (dto.VatAmount > 0 && vatAccount != null && !isVatExemptBool)
                {
                    var vatTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        AccountId = vatAccount.Id,
                        SalesBillId = existingBill.Id,
                        BillNumber = existingBill.BillNumber,
                        IsType = TransactionIsType.VAT,
                        Type = TransactionType.Sale,
                        PurchaseSalesType = "Sales",
                        Debit = 0,
                        Credit = dto.VatAmount.Value,
                        PaymentMode = paymentMode,
                        Date = existingBill.TransactionDate,
                        BillDate = existingBill.Date,
                        FiscalYearId = fiscalYearId,
                        CreatedAt = DateTime.UtcNow,
                        Status = TransactionStatus.Active,
                        IsActive = true,
                        Balance = previousBalance + dto.VatAmount.Value
                    };
                    transactions.Add(vatTransaction);
                }

                // 4. Round-off transaction if applicable
                if (dto.RoundOffAmount != 0 && roundOffAccount != null)
                {
                    var roundOffTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        AccountId = roundOffAccount.Id,
                        SalesBillId = existingBill.Id,
                        BillNumber = existingBill.BillNumber,
                        IsType = TransactionIsType.RoundOff,
                        Type = TransactionType.Sale,
                        PurchaseSalesType = "Sales",
                        Debit = dto.RoundOffAmount > 0 ? 0 : Math.Abs(dto.RoundOffAmount.Value),
                        Credit = dto.RoundOffAmount > 0 ? dto.RoundOffAmount.Value : 0,
                        PaymentMode = paymentMode,
                        Date = existingBill.TransactionDate,
                        BillDate = existingBill.Date,
                        FiscalYearId = fiscalYearId,
                        CreatedAt = DateTime.UtcNow,
                        Status = TransactionStatus.Active,
                        IsActive = true,
                        Balance = previousBalance + dto.RoundOffAmount.Value
                    };
                    transactions.Add(roundOffTransaction);
                }

                // 5. Cash transaction if payment mode is cash
                if (paymentMode == PaymentMode.Cash && cashAccount != null)
                {
                    var cashTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        AccountId = cashAccount.Id,
                        SalesBillId = existingBill.Id,
                        BillNumber = existingBill.BillNumber,
                        Type = TransactionType.Sale,
                        PurchaseSalesType = "Sales",
                        Debit = dto.TotalAmount ?? 0,
                        Credit = 0,
                        PaymentMode = paymentMode,
                        Date = existingBill.TransactionDate,
                        BillDate = existingBill.Date,
                        FiscalYearId = fiscalYearId,
                        CreatedAt = DateTime.UtcNow,
                        Status = TransactionStatus.Active,
                        IsActive = true,
                        IsType = TransactionIsType.Sale,
                        Balance = previousBalance + (dto.TotalAmount ?? 0)
                    };
                    transactions.Add(cashTransaction);
                }

                // Add all transactions
                await _context.Transactions.AddRangeAsync(transactions);
                await _context.SaveChangesAsync();

                await transaction.CommitAsync();

                _logger.LogInformation("Credit sales bill updated successfully with ID: {BillId}, Number: {BillNumber}",
                    existingBill.Id, existingBill.BillNumber);

                // Reload the bill with account and items for response
                var updatedBill = await _context.SalesBills
                    .Include(sb => sb.Account)
                    .Include(sb => sb.Items)
                    .FirstOrDefaultAsync(sb => sb.Id == existingBill.Id);

                return updatedBill;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Error updating credit sales bill for Bill ID: {BillId}", billId);
                throw;
            }
        }

        // Helper method to restore stock
        private async Task RestoreStockForSalesBillItemsAsync(SalesBill salesBill, Guid companyId)
        {
            foreach (var item in salesBill.Items)
            {
                var product = await _context.Items
                    .Include(i => i.StockEntries)
                    .FirstOrDefaultAsync(i => i.Id == item.ItemId && i.CompanyId == companyId);

                if (product == null)
                {
                    _logger.LogWarning($"Product with ID {item.ItemId} not found during stock restoration");
                    continue;
                }

                // Find the batch entry
                var batchEntry = product.StockEntries?
                    .FirstOrDefault(e => e.BatchNumber == item.BatchNumber &&
                                        e.UniqueUuid == item.UniqueUuid);

                if (batchEntry != null)
                {
                    // Restore stock
                    batchEntry.Quantity += item.Quantity;
                    batchEntry.UpdatedAt = DateTime.UtcNow;
                    _context.StockEntries.Update(batchEntry);
                    _logger.LogInformation($"Restored {item.Quantity} stock for item {product.Name}, batch {item.BatchNumber}");
                }
                else
                {
                    // If batch doesn't exist, create a new one
                    var newStockEntry = new StockEntry
                    {
                        Id = Guid.NewGuid(),
                        ItemId = product.Id,
                        BatchNumber = item.BatchNumber,
                        UniqueUuid = item.UniqueUuid ?? Guid.NewGuid().ToString(),
                        Quantity = item.Quantity,
                        PuPrice = item.PuPrice ?? 0,
                        Price = item.Price,
                        Mrp = item.Mrp ?? 0,
                        ExpiryDate = item.ExpiryDate ?? default(DateOnly),
                        Date = item.CreatedAt,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    await _context.StockEntries.AddAsync(newStockEntry);
                    _logger.LogInformation($"Created new stock entry for item {product.Name}, batch {item.BatchNumber} with quantity {item.Quantity}");
                }
            }

            await _context.SaveChangesAsync();
        }

        // Helper method to reduce stock
        private async Task ReduceStockForSalesBillItemAsync(Item product, string batchNumber, decimal quantity, string uniqueUuid)
        {
            if (product.StockEntries == null || !product.StockEntries.Any())
                throw new ArgumentException($"No stock entries found for item: {product.Name}");

            var batchEntry = product.StockEntries
                .FirstOrDefault(e => e.BatchNumber == batchNumber &&
                                    e.UniqueUuid == uniqueUuid);

            if (batchEntry == null)
            {
                var availableBatches = string.Join("; ", product.StockEntries.Select(e =>
                    $"Batch: '{e.BatchNumber}', UUID: '{e.UniqueUuid}', Qty: {e.Quantity}"));

                throw new ArgumentException(
                    $"Batch number '{batchNumber}' with UUID '{uniqueUuid}' not found for item: {product.Name}. " +
                    $"Available batches: {availableBatches}");
            }

            // Check if there's enough stock
            if (batchEntry.Quantity < quantity)
                throw new InvalidOperationException(
                    $"Not enough stock in batch '{batchNumber}'. Available: {batchEntry.Quantity}, Required: {quantity}");

            // Reduce the quantity
            batchEntry.Quantity -= quantity;
            batchEntry.UpdatedAt = DateTime.UtcNow;

            // If batch quantity becomes zero or negative, remove it
            if (batchEntry.Quantity <= 0)
            {
                _context.StockEntries.Remove(batchEntry);
                _logger.LogInformation($"Removed depleted stock entry for item {product.Name}, batch {batchNumber}");
            }
            else
            {
                _context.StockEntries.Update(batchEntry);
            }

            _logger.LogInformation($"Reduced {quantity} stock for item {product.Name}, batch {batchNumber}");
        }

        // Helper method to validate items and check stock
        private async Task ValidateAndCheckStockForSalesItemsAsync(List<UpdateSalesBillItemDTO> items, Guid companyId, bool isVatExemptBool, bool isVatAll)
        {
            bool hasVatableItems = false;
            bool hasNonVatableItems = false;

            foreach (var itemDto in items)
            {
                var item = await _context.Items
                    .Include(i => i.StockEntries)
                    .FirstOrDefaultAsync(i => i.Id == itemDto.ItemId && i.CompanyId == companyId);

                if (item == null)
                    throw new ArgumentException($"Item with id {itemDto.ItemId} not found");

                // Track VAT status
                if (item.VatStatus?.ToLower() == "vatable")
                {
                    hasVatableItems = true;
                }
                else
                {
                    hasNonVatableItems = true;
                }

                // Check if batch exists
                if (item.StockEntries == null || !item.StockEntries.Any())
                    throw new ArgumentException($"No stock entries found for item: {item.Name}");

                // Find the specific batch
                var batchEntry = item.StockEntries
                    .FirstOrDefault(e => e.BatchNumber == itemDto.BatchNumber &&
                                        (string.IsNullOrEmpty(itemDto.UniqueUuid) || e.UniqueUuid == itemDto.UniqueUuid));

                if (batchEntry == null)
                {
                    var availableBatches = string.Join("; ", item.StockEntries.Select(e =>
                        $"Batch: '{e.BatchNumber}', UUID: '{e.UniqueUuid}', Qty: {e.Quantity}"));
                    throw new ArgumentException($"Batch number '{itemDto.BatchNumber}' not found for item: {item.Name}. Available batches: {availableBatches}");
                }

                // Check stock quantity
                if (batchEntry.Quantity < itemDto.Quantity)
                {
                    var ex = new InvalidOperationException($"Not enough stock for item: {item.Name}");
                    ex.Data["available"] = batchEntry.Quantity;
                    ex.Data["required"] = itemDto.Quantity;
                    throw ex;
                }
            }

            // VAT validation
            if (!isVatAll)
            {
                if (isVatExemptBool && hasVatableItems)
                    throw new InvalidOperationException("Cannot save VAT exempt bill with vatable items");

                if (!isVatExemptBool && hasNonVatableItems)
                    throw new InvalidOperationException("Cannot save bill with non-vatable items when VAT is applied");
            }
        }


        public async Task<SalesBillResponseDTO> GetCashSalesDataAsync(Guid companyId, Guid fiscalYearId, Guid userId)
        {
            try
            {
                _logger.LogInformation("GetCashSalesDataAsync called for Company: {CompanyId}, User: {UserId}", companyId, userId);

                // Get company with all required fields
                var company = await _context.Companies
                    .Where(c => c.Id == companyId)
                    .Select(c => new CompanyInfoDTO
                    {
                        Id = c.Id,
                        Name = c.Name,
                        Address = c.Address,
                        City = c.City,
                        Phone = c.Phone,
                        Pan = c.Pan,
                        DateFormat = c.DateFormat.ToString(),
                        VatEnabled = c.VatEnabled,
                    })
                    .FirstOrDefaultAsync();

                if (company == null)
                    return null;

                // Get fiscal year
                var currentFiscalYear = await _context.FiscalYears
                    .Where(fy => fy.Id == fiscalYearId && fy.CompanyId == companyId)
                    .Select(fy => new FiscalYearDTO
                    {
                        Id = fy.Id,
                        Name = fy.Name,
                        StartDate = fy.StartDate,
                        EndDate = fy.EndDate,
                        IsActive = fy.IsActive,
                        DateFormat = fy.DateFormat.ToString()
                    })
                    .FirstOrDefaultAsync();

                // Get categories
                var categories = await _context.Categories
                    .Where(c => c.CompanyId == companyId)
                    .Select(c => new CategoryInfoDTO
                    {
                        Id = c.Id,
                        Name = c.Name
                    })
                    .ToListAsync();

                // Get units
                var units = await _context.Units
                    .Where(u => u.CompanyId == companyId)
                    .Select(u => new UnitInfoDTO
                    {
                        Id = u.Id,
                        Name = u.Name,
                    })
                    .ToListAsync();

                // Get main units
                var mainUnits = await _context.MainUnits
                    .Where(mu => mu.CompanyId == companyId)
                    .Select(mu => new UnitInfoDTO
                    {
                        Id = mu.Id,
                        Name = mu.Name
                    })
                    .ToListAsync();

                // Get company groups
                var companyGroups = await _context.AccountGroups
                    .Where(ag => ag.CompanyId == companyId)
                    .Select(ag => new CompanyGroupInfoDTO
                    {
                        Id = ag.Id,
                        Name = ag.Name
                    })
                    .ToListAsync();

                // Get user for preferences and permissions
                var user = await _context.Users
                    .Include(u => u.UserRoles)
                        .ThenInclude(ur => ur.Role)
                    .FirstOrDefaultAsync(u => u.Id == userId);

                bool isAdmin = user?.IsAdmin ?? false;
                string userRole = "User";

                if (isAdmin)
                {
                    userRole = "Admin";
                }
                else if (user?.UserRoles != null)
                {
                    var primaryRole = user.UserRoles.FirstOrDefault(ur => ur.IsPrimary);
                    if (primaryRole?.Role != null)
                    {
                        userRole = primaryRole.Role.Name;
                    }
                }

                // Date handling
                var today = DateTime.UtcNow;
                var nepaliDate = today.ToString("yyyy-MM-dd"); // You might want to use a proper Nepali date converter
                var transactionDateNepali = today.ToString("yyyy-MM-dd");
                var companyDateFormat = company.DateFormat?.ToLower() ?? "english";

                // Get next bill number from BillNumberService
                var currentBillNumber = await _billNumberService.GetCurrentBillNumberAsync(companyId, fiscalYearId, "sales");

                // Prepare response
                var response = new SalesBillResponseDTO
                {
                    Company = company,
                    Dates = new DateInfoDTO
                    {
                        NepaliDate = nepaliDate,
                        TransactionDateNepali = transactionDateNepali,
                        CompanyDateFormat = companyDateFormat
                    },
                    CurrentFiscalYear = currentFiscalYear,
                    NextSalesBillNumber = currentBillNumber,
                    Categories = categories,
                    Units = units,
                    CompanyGroups = companyGroups,
                    UserPreferences = new UserPreferencesDTO
                    {
                        Theme = user?.Preferences?.Theme.ToString() ?? "light"
                    },
                    Permissions = new PermissionsDTO
                    {
                        IsAdminOrSupervisor = isAdmin || userRole == "Supervisor"
                    }
                };

                _logger.LogInformation("Successfully fetched cash sales data for Company: {CompanyId}", companyId);
                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetCashSalesDataAsync for Company: {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<string> GetNextCashSalesBillNumberAsync(Guid companyId, Guid fiscalYearId)
        {
            return await _billNumberService.GetNextBillNumberAsync(companyId, fiscalYearId, "sales");
        }
        public async Task<string> GetCurrentCashSalesBillNumberAsync(Guid companyId, Guid fiscalYearId)
        {
            return await _billNumberService.GetCurrentBillNumberAsync(companyId, fiscalYearId, "sales");
        }
        public async Task<SalesBill> CreateCashSalesBillAsync(CreateSalesBillDTO dto, Guid userId, Guid companyId, Guid fiscalYearId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                _logger.LogInformation("CreateCashSalesBillAsync started for Company: {CompanyId}, User: {UserId}", companyId, userId);

                // Validate company and fiscal year
                var company = await _context.Companies.FindAsync(companyId);
                if (company == null)
                    throw new ArgumentException("Company not found");

                var fiscalYear = await _context.FiscalYears.FindAsync(fiscalYearId);
                if (fiscalYear == null || fiscalYear.CompanyId != companyId)
                    throw new ArgumentException("Invalid fiscal year");

                // Get default accounts
                var salesAccountId = await GetDefaultAccountIdAsync("Sales", companyId);
                var vatAccountId = await GetDefaultAccountIdAsync("VAT", companyId);
                var roundOffAccountId = await GetDefaultAccountIdAsync("Rounded Off", companyId);
                var cashInHandAccountId = await GetDefaultAccountIdAsync("Cash in Hand", companyId);

                // Get next bill number
                var billNumber = await _billNumberService.GetNextBillNumberAsync(companyId, fiscalYearId, "sales");

                // Parse VAT exemption
                // bool isVatExemptBool = dto.IsVatExempt;
                // string isVatAll = dto.IsVatExempt ? "all" : dto.IsVatAll;

                // Parse VAT exemption
                bool isVatExemptBool = dto.IsVatExempt == "true" || dto.IsVatExempt == "True" || dto.IsVatExempt == "1";
                bool isVatAll = dto.IsVatExempt == "all";

                // Validate items and track VAT status
                bool hasVatableItems = false;
                bool hasNonVatableItems = false;

                // Group items by ItemId to check total stock per item
                var itemsGrouped = dto.Items.GroupBy(i => i.ItemId);

                foreach (var itemGroup in itemsGrouped)
                {
                    var item = await _context.Items
                        .Include(i => i.StockEntries)
                        .FirstOrDefaultAsync(i => i.Id == itemGroup.Key && i.CompanyId == companyId);

                    if (item == null)
                        throw new ArgumentException($"Item with id {itemGroup.Key} not found");

                    // Track VAT status
                    if (item.VatStatus?.ToLower() == "vatable")
                    {
                        hasVatableItems = true;
                    }
                    else
                    {
                        hasNonVatableItems = true;
                    }

                    // Check if there are any stock entries
                    if (item.StockEntries == null || !item.StockEntries.Any())
                        throw new ArgumentException($"No stock entries found for item: {item.Name}");

                    // Calculate total available stock across all batches
                    var totalAvailableStock = item.StockEntries.Sum(e => e.Quantity);

                    // Calculate total requested quantity for this item
                    var totalRequestedQuantity = itemGroup.Sum(i => i.Quantity);

                    // Check if enough stock exists overall
                    if (totalAvailableStock < totalRequestedQuantity)
                    {
                        throw new ArgumentException(
                            $"Not enough stock for item: {item.Name}. " +
                            $"Total available: {totalAvailableStock}, Required: {totalRequestedQuantity}"
                        );
                    }
                }

                // VAT validation for cash sales
                // if (!dto.IsVatExempt) // Not "all" case
                // {
                //     if (dto.IsVatExempt && hasVatableItems)
                //         throw new InvalidOperationException("Cannot save VAT exempt bill with vatable items");

                //     if (!dto.IsVatExempt && hasNonVatableItems)
                //         throw new InvalidOperationException("Cannot save bill with non-vatable items when VAT is applied");
                // }

                // VAT validation
                if (dto.IsVatExempt != "all")
                {
                    if (isVatExemptBool && hasVatableItems)
                        throw new InvalidOperationException("Cannot save VAT exempt bill with vatable items");

                    if (!isVatExemptBool && hasNonVatableItems)
                        throw new InvalidOperationException("Cannot save bill with non-vatable items when VAT is applied");
                }

                // Get previous balance for cash account
                decimal previousBalance = 0;
                var lastTransaction = await _context.Transactions
                    .Where(t => t.AccountId == cashInHandAccountId)
                    .OrderByDescending(t => t.CreatedAt)
                    .FirstOrDefaultAsync();

                if (lastTransaction != null)
                    previousBalance = lastTransaction.Balance ?? 0;

                // Determine if company uses Nepali date format
                bool isNepaliFormat = company.DateFormat?.ToString().ToLower() == "nepali";


                // Create sales bill with frontend-calculated values
                var salesBill = new SalesBill
                {
                    Id = Guid.NewGuid(),
                    CompanyId = companyId,
                    UserId = userId,
                    BillNumber = billNumber,
                    PurchaseSalesType = "Sales",
                    Type = "Sale",
                    AccountId = null, // No account for cash sales
                    CashAccount = dto.CashAccount,
                    CashAccountAddress = dto.CashAccountAddress,
                    CashAccountPan = dto.CashAccountPan,
                    CashAccountEmail = dto.CashAccountEmail,
                    CashAccountPhone = dto.CashAccountPhone,
                    SettingsId = dto.SettingsId,
                    FiscalYearId = fiscalYearId,
                    SubTotal = dto.SubTotal ?? 0,
                    NonVatSales = dto.NonVatSales ?? 0,
                    TaxableAmount = dto.TaxableAmount ?? 0,
                    DiscountPercentage = dto.DiscountPercentage ?? 0,
                    DiscountAmount = dto.DiscountAmount ?? 0,
                    VatPercentage = dto.VatPercentage,
                    VatAmount = dto.VatAmount ?? 0,
                    TotalAmount = dto.TotalAmount ?? 0,
                    IsVatExempt = isVatExemptBool,
                    IsVatAll = isVatAll ? "all" : null,
                    RoundOffAmount = dto.RoundOffAmount ?? 0,
                    PaymentMode = dto.PaymentMode,
                    nepaliDate = dto.NepaliDate,
                    Date = dto.Date,
                    transactionDateNepali = dto.TransactionDateNepali,
                    TransactionDate = dto.TransactionDate,
                    OriginalCopies = dto.OriginalCopies,
                    FirstPrinted = false,
                    PrintCount = 0,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                // Add sales bill to context
                await _context.SalesBills.AddAsync(salesBill);

                // Group items by (ItemId, BatchNumber) to process stock reduction efficiently
                var groupedItems = dto.Items
                    .GroupBy(i => new { i.ItemId, BatchNumber = i.BatchNumber ?? "N/A" })
                    .Select(g => new
                    {
                        g.Key.ItemId,
                        g.Key.BatchNumber,
                        TotalQuantity = g.Sum(i => i.Quantity)
                    })
                    .ToList();

                // Process stock reduction for each group
                var billItems = new List<SalesBillItem>();
                var transactions = new List<Transaction>();

                foreach (var itemDto in dto.Items)
                {
                    var item = await _context.Items
                        .Include(i => i.StockEntries)
                        .FirstOrDefaultAsync(i => i.Id == itemDto.ItemId);

                    if (item == null)
                        continue;

                    // Get available batches with positive stock, ordered by date (FIFO)
                    var availableBatches = item.StockEntries
                        .Where(e => e.Quantity > 0)
                        .OrderBy(e => e.Date) // FIFO: oldest first
                        .ToList();

                    if (!availableBatches.Any())
                        throw new ArgumentException($"No available stock for item: {item.Name}");

                    // Fulfill this line item from available batches
                    var remainingQuantity = itemDto.Quantity;
                    var batchesUsed = new List<(string BatchNumber, string UniqueUuid, decimal Quantity)>();

                    foreach (var batch in availableBatches)
                    {
                        if (remainingQuantity <= 0) break;

                        if (batch.Quantity >= remainingQuantity)
                        {
                            // This batch can fulfill the entire remaining quantity
                            batchesUsed.Add((batch.BatchNumber, batch.UniqueUuid, remainingQuantity));
                            batch.Quantity -= remainingQuantity;
                            remainingQuantity = 0;

                            if (batch.Quantity == 0)
                            {
                                _context.StockEntries.Remove(batch);
                            }
                        }
                        else
                        {
                            // Take all from this batch and continue to next
                            batchesUsed.Add((batch.BatchNumber, batch.UniqueUuid, batch.Quantity));
                            remainingQuantity -= batch.Quantity;
                            batch.Quantity = 0;
                            _context.StockEntries.Remove(batch);
                        }
                    }

                    if (remainingQuantity > 0)
                    {
                        throw new ArgumentException(
                            $"Could not fulfill quantity for item: {item.Name}. " +
                            $"Remaining: {remainingQuantity} after using all available batches"
                        );
                    }

                    // Calculate net price after discount
                    decimal netPrice = itemDto.Price - (itemDto.Price * (dto.DiscountPercentage ?? 0) / 100);
                    decimal newMarginPercentage = 0;
                    if (itemDto.PuPrice.HasValue && itemDto.PuPrice.Value > 0)
                    {
                        newMarginPercentage = ((itemDto.Price - itemDto.PuPrice.Value) / itemDto.PuPrice.Value) * 100;
                        newMarginPercentage = Math.Round(newMarginPercentage, 2);
                    }
                    // Create sales bill items for each batch used
                    foreach (var batch in batchesUsed)
                    {
                        var billItem = new SalesBillItem
                        {
                            Id = Guid.NewGuid(),
                            SalesBillId = salesBill.Id,
                            ItemId = itemDto.ItemId,
                            UnitId = itemDto.UnitId,
                            Quantity = batch.Quantity,
                            Price = itemDto.Price,
                            PuPrice = itemDto.PuPrice,
                            NetPuPrice = itemDto.NetPuPrice ?? itemDto.PuPrice,
                            MarginPercentage = newMarginPercentage,
                            Mrp = itemDto.Mrp ?? 0,
                            DiscountPercentagePerItem = dto.DiscountPercentage ?? 0,
                            DiscountAmountPerItem = (itemDto.Price * batch.Quantity * (dto.DiscountPercentage ?? 0)) / 100,
                            NetPrice = netPrice,
                            BatchNumber = batch.BatchNumber,
                            ExpiryDate = itemDto.ExpiryDate.HasValue
                                ? DateOnly.FromDateTime(itemDto.ExpiryDate.Value.ToDateTime(TimeOnly.MinValue))
                                : null,
                            VatStatus = item.VatStatus ?? "vatable",
                            UniqueUuid = batch.UniqueUuid,
                            CreatedAt = isNepaliFormat ? dto.NepaliDate : dto.Date,
                            UpdatedAt = isNepaliFormat ? dto.NepaliDate : dto.Date
                        };

                        billItems.Add(billItem);
                    }

                    // Create cash transaction for this item
                    var cashTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        ItemId = itemDto.ItemId,
                        UnitId = itemDto.UnitId,
                        WSUnit = 1,
                        Quantity = itemDto.Quantity,
                        Price = itemDto.Price,
                        PuPrice = itemDto.PuPrice,
                        DiscountPercentagePerItem = dto.DiscountPercentage ?? 0,
                        DiscountAmountPerItem = (itemDto.Price * itemDto.Quantity * (dto.DiscountPercentage ?? 0)) / 100,
                        NetPuPrice = itemDto.NetPuPrice ?? (itemDto.PuPrice ?? 0m),
                        AccountId = cashInHandAccountId,
                        // CashAccount = dto.CashAccount,
                        SalesBillId = salesBill.Id,
                        BillNumber = salesBill.BillNumber,
                        Type = TransactionType.Sale,
                        PurchaseSalesType = "Sales",
                        Debit = dto.TotalAmount ?? 0,
                        Credit = 0,
                        PaymentMode = ParsePaymentMode(dto.PaymentMode),
                        Balance = previousBalance - (dto.TotalAmount ?? 0),
                        nepaliDate = dto.NepaliDate,
                        transactionDateNepali = dto.TransactionDateNepali,
                        Date = salesBill.Date,
                        BillDate = salesBill.Date,
                        FiscalYearId = fiscalYearId,
                        CreatedAt = DateTime.UtcNow,
                        Status = TransactionStatus.Active,
                        IsActive = true
                    };

                    transactions.Add(cashTransaction);
                }

                // Add all bill items
                salesBill.Items = billItems;
                await _context.SalesBillItems.AddRangeAsync(billItems);

                // Add cash transactions
                await _context.Transactions.AddRangeAsync(transactions);

                // 1. Sales Account transaction
                if (salesAccountId.HasValue)
                {
                    var salesAmount = (dto.TaxableAmount ?? 0) + (dto.NonVatSales ?? 0);

                    var salesTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        AccountId = salesAccountId.Value,
                        SalesBillId = salesBill.Id,
                        BillNumber = salesBill.BillNumber,
                        Type = TransactionType.Sale,
                        PurchaseSalesType = "Sales",
                        Debit = 0,
                        Credit = salesAmount,
                        PaymentMode = ParsePaymentMode(dto.PaymentMode),
                        nepaliDate = dto.NepaliDate,
                        transactionDateNepali = dto.TransactionDateNepali,
                        Date = salesBill.TransactionDate,
                        BillDate = salesBill.Date,
                        FiscalYearId = fiscalYearId,
                        CreatedAt = DateTime.UtcNow,
                        Status = TransactionStatus.Active,
                        IsActive = true
                    };

                    await _context.Transactions.AddAsync(salesTransaction);
                }

                // 2. VAT transaction if applicable
                if (dto.VatAmount > 0 && vatAccountId.HasValue && !isVatExemptBool)
                {
                    var vatTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        AccountId = vatAccountId.Value,
                        SalesBillId = salesBill.Id,
                        BillNumber = salesBill.BillNumber,
                        IsType = TransactionIsType.VAT,
                        Type = TransactionType.Sale,
                        PurchaseSalesType = "Sales",
                        Debit = 0,
                        Credit = dto.VatAmount.Value,
                        PaymentMode = ParsePaymentMode(dto.PaymentMode),
                        nepaliDate = dto.NepaliDate,
                        transactionDateNepali = dto.TransactionDateNepali,
                        Date = salesBill.TransactionDate,
                        BillDate = salesBill.Date,
                        FiscalYearId = fiscalYearId,
                        CreatedAt = DateTime.UtcNow,
                        Status = TransactionStatus.Active,
                        IsActive = true
                    };

                    await _context.Transactions.AddAsync(vatTransaction);
                }

                // 3. Round-off transaction if applicable
                if (dto.RoundOffAmount != 0 && roundOffAccountId.HasValue)
                {
                    var roundOffTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        AccountId = roundOffAccountId.Value,
                        SalesBillId = salesBill.Id,
                        BillNumber = salesBill.BillNumber,
                        IsType = TransactionIsType.RoundOff,
                        Type = TransactionType.Sale,
                        PurchaseSalesType = "Sales",
                        Debit = dto.RoundOffAmount > 0 ? dto.RoundOffAmount.Value : 0,
                        Credit = dto.RoundOffAmount < 0 ? Math.Abs(dto.RoundOffAmount.Value) : 0,
                        PaymentMode = ParsePaymentMode(dto.PaymentMode),
                        nepaliDate = dto.NepaliDate,
                        transactionDateNepali = dto.TransactionDateNepali,
                        Date = salesBill.TransactionDate,
                        BillDate = salesBill.Date,
                        FiscalYearId = fiscalYearId,
                        CreatedAt = DateTime.UtcNow,
                        Status = TransactionStatus.Active,
                        IsActive = true
                    };

                    await _context.Transactions.AddAsync(roundOffTransaction);
                }

                // 4. Cash in Hand transaction (already added above for each item, but we need a consolidated one)
                if (cashInHandAccountId.HasValue && dto.PaymentMode?.ToLower() == "cash")
                {
                    var cashInHandTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        AccountId = cashInHandAccountId.Value,
                        SalesBillId = salesBill.Id,
                        BillNumber = salesBill.BillNumber,
                        Type = TransactionType.Sale,
                        PurchaseSalesType = "Sales",
                        Debit = dto.TotalAmount ?? 0,
                        Credit = 0,
                        PaymentMode = PaymentMode.Cash,
                        nepaliDate = dto.NepaliDate,
                        transactionDateNepali = dto.TransactionDateNepali,
                        Date = salesBill.TransactionDate,
                        BillDate = salesBill.Date,
                        FiscalYearId = fiscalYearId,
                        CreatedAt = DateTime.UtcNow,
                        Status = TransactionStatus.Active,
                        IsActive = true
                    };

                    await _context.Transactions.AddAsync(cashInHandTransaction);
                }

                // Save all changes
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                _logger.LogInformation("Cash sales bill created successfully with ID: {BillId}, Number: {BillNumber}",
                    salesBill.Id, salesBill.BillNumber);

                return salesBill;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Error creating cash sales bill");
                throw;
            }
        }

        public async Task<SalesOpenResponseDTO> GetCashSalesOpenDataAsync(Guid companyId, Guid fiscalYearId, Guid userId)
        {
            try
            {
                _logger.LogInformation("GetCashSalesOpenDataAsync called for Company: {CompanyId}, User: {UserId}", companyId, userId);

                // Get company with essential fields only
                var company = await _context.Companies
                    .Where(c => c.Id == companyId)
                    .Select(c => new SalesOpenCompanyDTO
                    {
                        Id = c.Id,
                        DateFormat = c.DateFormat.ToString(),
                        VatEnabled = c.VatEnabled,
                        Name = c.Name,
                        Address = c.Address,
                        Phone = c.Phone,
                        Pan = c.Pan
                    })
                    .FirstOrDefaultAsync();

                if (company == null)
                    return null;

                // Get current fiscal year
                var currentFiscalYear = await _context.FiscalYears
                    .Where(fy => fy.Id == fiscalYearId && fy.CompanyId == companyId)
                    .Select(fy => new FiscalYearDTO
                    {
                        Id = fy.Id,
                        Name = fy.Name,
                        StartDate = fy.StartDate,
                        EndDate = fy.EndDate,
                        IsActive = fy.IsActive
                    })
                    .FirstOrDefaultAsync();

                // Get categories
                var categories = await _context.Categories
                    .Where(c => c.CompanyId == companyId)
                    .Select(c => new CategoryInfoDTO
                    {
                        Id = c.Id,
                        Name = c.Name
                    })
                    .ToListAsync();

                // Get units
                var units = await _context.Units
                    .Where(u => u.CompanyId == companyId)
                    .Select(u => new UnitInfoDTO
                    {
                        Id = u.Id,
                        Name = u.Name,
                    })
                    .ToListAsync();

                // Get company groups
                var companyGroups = await _context.AccountGroups
                    .Where(ag => ag.CompanyId == companyId)
                    .Select(ag => new CompanyGroupInfoDTO
                    {
                        Id = ag.Id,
                        Name = ag.Name
                    })
                    .ToListAsync();

                // Get user for preferences and permissions
                var user = await _context.Users
                    .Include(u => u.UserRoles)
                        .ThenInclude(ur => ur.Role)
                    .FirstOrDefaultAsync(u => u.Id == userId);

                bool isAdmin = user?.IsAdmin ?? false;
                string userRole = "User";

                if (isAdmin)
                {
                    userRole = "Admin";
                }
                else if (user?.UserRoles != null)
                {
                    var primaryRole = user.UserRoles.FirstOrDefault(ur => ur.IsPrimary);
                    if (primaryRole?.Role != null)
                    {
                        userRole = primaryRole.Role.Name;
                    }
                }

                // Date handling
                var today = DateTime.UtcNow;
                var nepaliDate = today.ToString("yyyy-MM-dd"); // You might want to use a proper Nepali date converter
                var transactionDateNepali = today.ToString("yyyy-MM-dd");
                var companyDateFormat = company.DateFormat?.ToLower() ?? "english";

                // Get current company name
                var currentCompanyName = company.Name;

                // Prepare response
                var response = new SalesOpenResponseDTO
                {
                    Company = company,
                    Dates = new DateInfoDTO
                    {
                        NepaliDate = nepaliDate,
                        TransactionDateNepali = transactionDateNepali,
                        CompanyDateFormat = companyDateFormat
                    },
                    CurrentFiscalYear = currentFiscalYear,
                    Categories = categories,
                    Units = units,
                    CompanyGroups = companyGroups,
                    CurrentCompany = new CurrentCompanyInfoDTO
                    {
                        Name = currentCompanyName,
                        Address = company.Address,
                        Phone = company.Phone,
                        Pan = company.Pan
                    },
                    UserPreferences = new UserPreferencesDTO
                    {
                        Theme = user?.Preferences?.Theme.ToString() ?? "light"
                    },
                    Permissions = new PermissionsDTO
                    {
                        IsAdminOrSupervisor = isAdmin || userRole == "Supervisor"
                    }
                };

                _logger.LogInformation("Successfully fetched cash sales open data for Company: {CompanyId}", companyId);
                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetCashSalesOpenDataAsync for Company: {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<string> GetNextCashSalesOpenBillNumberAsync(Guid companyId, Guid fiscalYearId)
        {
            return await _billNumberService.GetNextBillNumberAsync(companyId, fiscalYearId, "sales");
        }
        public async Task<string> GetCurrentCashSalesOpenBillNumberAsync(Guid companyId, Guid fiscalYearId)
        {
            return await _billNumberService.GetCurrentBillNumberAsync(companyId, fiscalYearId, "sales");
        }
        public async Task<SalesBill> CreateCashSalesOpenBillAsync(CreateSalesOpenDTO dto, Guid userId, Guid companyId, Guid fiscalYearId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                _logger.LogInformation("CreateCashSalesOpenBillAsync started for Company: {CompanyId}, User: {UserId}", companyId, userId);

                // Validate company and fiscal year
                var company = await _context.Companies.FindAsync(companyId);
                if (company == null)
                    throw new ArgumentException("Company not found");

                var fiscalYear = await _context.FiscalYears.FindAsync(fiscalYearId);
                if (fiscalYear == null || fiscalYear.CompanyId != companyId)
                    throw new ArgumentException("Invalid fiscal year");

                // Parse VAT exemption
                bool isVatExemptBool = dto.IsVatExempt == "true" || dto.IsVatExempt == "True" || dto.IsVatExempt == "1";
                bool isVatAll = dto.IsVatExempt == "all";

                // Validate items and track VAT status
                bool hasVatableItems = false;
                bool hasNonVatableItems = false;
                var productStockChecks = new Dictionary<Guid, (Item item, decimal requestedQuantity, string batchNumber, string uniqueUuid)>();

                // First pass: Validate items and check stock availability
                foreach (var itemDto in dto.Items)
                {
                    var item = await _context.Items
                        .Include(i => i.StockEntries)
                        .FirstOrDefaultAsync(i => i.Id == itemDto.ItemId && i.CompanyId == companyId);

                    if (item == null)
                        throw new ArgumentException($"Item with id {itemDto.ItemId} not found");

                    // Track VAT status
                    if (item.VatStatus?.ToLower() == "vatable")
                    {
                        hasVatableItems = true;
                    }
                    else
                    {
                        hasNonVatableItems = true;
                    }

                    // Check if batch exists
                    if (item.StockEntries == null || !item.StockEntries.Any())
                        throw new ArgumentException($"No stock entries found for item: {item.Name}");

                    // Find the specific batch
                    var batchEntry = item.StockEntries
                        .FirstOrDefault(e => e.BatchNumber == itemDto.BatchNumber &&
                                            (string.IsNullOrEmpty(itemDto.UniqueUuid) || e.UniqueUuid == itemDto.UniqueUuid));

                    if (batchEntry == null)
                    {
                        var availableBatches = string.Join("; ", item.StockEntries.Select(e =>
                            $"Batch: '{e.BatchNumber}', Qty: {e.Quantity}"));
                        throw new ArgumentException($"Batch number '{itemDto.BatchNumber}' not found for item: {item.Name}. Available batches: {availableBatches}");
                    }

                    // Check stock quantity
                    if (batchEntry.Quantity < itemDto.Quantity)
                    {
                        var ex = new InvalidOperationException($"Not enough stock for item: {item.Name}");
                        ex.Data["available"] = batchEntry.Quantity;
                        ex.Data["required"] = itemDto.Quantity;
                        throw ex;
                    }

                    productStockChecks[item.Id] = (item, itemDto.Quantity, itemDto.BatchNumber, itemDto.UniqueUuid);
                }

                // VAT validation
                if (dto.IsVatExempt != "all")
                {
                    if (isVatExemptBool && hasVatableItems)
                        throw new InvalidOperationException("Cannot save VAT exempt bill with vatable items");

                    if (!isVatExemptBool && hasNonVatableItems)
                        throw new InvalidOperationException("Cannot save bill with non-vatable items when VAT is applied");
                }

                // Get next bill number
                var billNumber = await _billNumberService.GetNextBillNumberAsync(companyId, fiscalYearId, "sales");

                // Get default accounts
                var salesAccountId = await GetDefaultAccountIdAsync("Sales", companyId);
                var vatAccountId = await GetDefaultAccountIdAsync("VAT", companyId);
                var roundOffAccountId = await GetDefaultAccountIdAsync("Rounded Off", companyId);
                var cashInHandAccountId = await GetDefaultAccountIdAsync("Cash in Hand", companyId);

                // Determine if company uses Nepali date format
                bool isNepaliFormat = company.DateFormat?.ToString().ToLower() == "nepali";


                // Create sales bill with frontend-calculated values - NO CALCULATIONS HERE
                var salesBill = new SalesBill
                {
                    Id = Guid.NewGuid(),
                    CompanyId = companyId,
                    UserId = userId,
                    BillNumber = billNumber,
                    PurchaseSalesType = "Sales",
                    Type = "Sale",
                    CashAccount = dto.CashAccount,
                    CashAccountAddress = dto.CashAccountAddress,
                    CashAccountPan = dto.CashAccountPan,
                    CashAccountEmail = dto.CashAccountEmail,
                    CashAccountPhone = dto.CashAccountPhone,
                    FiscalYearId = fiscalYearId,
                    SubTotal = dto.SubTotal ?? 0,
                    NonVatSales = dto.NonTaxableAmount ?? 0,
                    TaxableAmount = dto.TaxableAmount ?? 0,
                    DiscountPercentage = dto.DiscountPercentage ?? 0,
                    DiscountAmount = dto.DiscountAmount ?? 0,
                    VatPercentage = isVatExemptBool ? 0 : (dto.VatPercentage ?? 0),
                    VatAmount = dto.VatAmount ?? 0,
                    TotalAmount = dto.TotalAmount ?? 0,
                    IsVatExempt = isVatExemptBool,
                    IsVatAll = isVatAll ? "all" : null,
                    RoundOffAmount = dto.RoundOffAmount ?? 0,
                    PaymentMode = dto.PaymentMode,
                    nepaliDate = dto.NepaliDate,
                    Date = dto.Date,
                    transactionDateNepali = dto.TransactionDateNepali,
                    TransactionDate = dto.TransactionDate,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                // Add sales bill to context
                await _context.SalesBills.AddAsync(salesBill);

                // Process items and reduce stock
                foreach (var itemDto in dto.Items)
                {
                    var item = await _context.Items
                        .Include(i => i.StockEntries)
                        .FirstOrDefaultAsync(i => i.Id == itemDto.ItemId);

                    if (item == null)
                        continue;

                    // Find the batch to reduce
                    var batchToReduce = item.StockEntries
                        .FirstOrDefault(e => e.BatchNumber == itemDto.BatchNumber &&
                                            (string.IsNullOrEmpty(itemDto.UniqueUuid) || e.UniqueUuid == itemDto.UniqueUuid));

                    if (batchToReduce != null)
                    {
                        // Reduce stock
                        batchToReduce.Quantity -= itemDto.Quantity;

                        // If batch quantity becomes zero or negative, remove it
                        if (batchToReduce.Quantity <= 0)
                        {
                            _context.StockEntries.Remove(batchToReduce);
                        }
                    }

                    // Update item total stock
                    _context.Items.Update(item);

                    decimal newMarginPercentage = 0;
                    if (itemDto.PuPrice.HasValue && itemDto.PuPrice.Value > 0)
                    {
                        newMarginPercentage = ((itemDto.Price - itemDto.PuPrice.Value) / itemDto.PuPrice.Value) * 100;
                        newMarginPercentage = Math.Round(newMarginPercentage, 2);
                    }

                    // Create sales bill item - use frontend values
                    var billItem = new SalesBillItem
                    {
                        Id = Guid.NewGuid(),
                        SalesBillId = salesBill.Id,
                        ItemId = itemDto.ItemId,
                        UnitId = itemDto.UnitId,
                        Quantity = itemDto.Quantity,
                        Price = itemDto.Price,
                        PuPrice = itemDto.PuPrice,
                        NetPuPrice = itemDto.NetPuPrice ?? itemDto.PuPrice,
                        MarginPercentage = newMarginPercentage,
                        Mrp = itemDto.Mrp ?? 0,
                        DiscountPercentagePerItem = itemDto.DiscountPercentagePerItem,
                        DiscountAmountPerItem = itemDto.DiscountAmountPerItem,
                        NetPrice = itemDto.NetPrice,
                        BatchNumber = itemDto.BatchNumber,
                        ExpiryDate = itemDto.ExpiryDate,
                        VatStatus = item.VatStatus ?? "vatable",
                        UniqueUuid = batchToReduce?.UniqueUuid,
                        CreatedAt = isNepaliFormat ? dto.NepaliDate : dto.Date,
                        UpdatedAt = isNepaliFormat ? dto.NepaliDate : dto.Date
                    };

                    salesBill.Items.Add(billItem);
                }

                // Create a single transaction for the entire bill (like in credit sales)
                var transactionEntry = new Transaction
                {
                    Id = Guid.NewGuid(),
                    CompanyId = companyId,
                    // CashAccount = dto.CashAccount,
                    BillNumber = billNumber,
                    SalesBillId = salesBill.Id,
                    Type = TransactionType.Sale,
                    PurchaseSalesType = "Sales",
                    Debit = dto.TotalAmount ?? 0,
                    Credit = 0,
                    PaymentMode = ParsePaymentMode(dto.PaymentMode),
                    Date = salesBill.TransactionDate,
                    BillDate = salesBill.Date,
                    FiscalYearId = fiscalYearId,
                    CreatedAt = DateTime.UtcNow,
                    Status = TransactionStatus.Active,
                    IsActive = true,
                    IsType = TransactionIsType.Sale,
                };

                await _context.Transactions.AddAsync(transactionEntry);

                // 1. Sales Account transaction
                if (salesAccountId.HasValue)
                {
                    var salesAmount = (dto.TaxableAmount ?? 0) + (dto.NonTaxableAmount ?? 0);

                    if (salesAmount > 0)
                    {
                        var salesTransaction = new Transaction
                        {
                            Id = Guid.NewGuid(),
                            CompanyId = companyId,
                            AccountId = salesAccountId.Value,
                            BillNumber = billNumber,
                            SalesBillId = salesBill.Id,
                            Type = TransactionType.Sale,
                            PurchaseSalesType = "Sales",
                            Debit = 0,
                            Credit = salesAmount,
                            PaymentMode = ParsePaymentMode(dto.PaymentMode),
                            Date = salesBill.TransactionDate,
                            BillDate = salesBill.Date,
                            FiscalYearId = fiscalYearId,
                            CreatedAt = DateTime.UtcNow,
                            Status = TransactionStatus.Active,
                            IsActive = true,
                            IsType = TransactionIsType.Sale,
                        };

                        await _context.Transactions.AddAsync(salesTransaction);
                    }
                }

                // 2. VAT transaction if applicable
                if (dto.VatAmount > 0 && vatAccountId.HasValue && !isVatExemptBool)
                {
                    var vatTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        AccountId = vatAccountId.Value,
                        BillNumber = billNumber,
                        SalesBillId = salesBill.Id,
                        IsType = TransactionIsType.VAT,
                        Type = TransactionType.Sale,
                        PurchaseSalesType = "Sales",
                        Debit = 0,
                        Credit = dto.VatAmount.Value,
                        PaymentMode = ParsePaymentMode(dto.PaymentMode),
                        Date = salesBill.TransactionDate,
                        BillDate = salesBill.Date,
                        FiscalYearId = fiscalYearId,
                        CreatedAt = DateTime.UtcNow,
                        Status = TransactionStatus.Active,
                        IsActive = true,
                    };

                    await _context.Transactions.AddAsync(vatTransaction);
                }

                // 3. Round-off transaction if applicable
                if (dto.RoundOffAmount != 0 && roundOffAccountId.HasValue)
                {
                    var roundOffTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        AccountId = roundOffAccountId.Value,
                        BillNumber = billNumber,
                        SalesBillId = salesBill.Id,
                        IsType = TransactionIsType.RoundOff,
                        Type = TransactionType.Sale,
                        PurchaseSalesType = "Sales",
                        Debit = dto.RoundOffAmount > 0 ? 0 : Math.Abs(dto.RoundOffAmount.Value),
                        Credit = dto.RoundOffAmount > 0 ? dto.RoundOffAmount.Value : 0,
                        PaymentMode = ParsePaymentMode(dto.PaymentMode),
                        Date = salesBill.TransactionDate,
                        BillDate = salesBill.Date,
                        FiscalYearId = fiscalYearId,
                        CreatedAt = DateTime.UtcNow,
                        Status = TransactionStatus.Active,
                        IsActive = true,
                    };

                    await _context.Transactions.AddAsync(roundOffTransaction);
                }

                // 4. Cash transaction if payment mode is cash
                if (dto.PaymentMode?.ToLower() == "cash" && cashInHandAccountId.HasValue)
                {
                    var cashTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        AccountId = cashInHandAccountId.Value,
                        // CashAccount = dto.CashAccount,
                        BillNumber = billNumber,
                        SalesBillId = salesBill.Id,
                        IsType = TransactionIsType.Sale,
                        Type = TransactionType.Sale,
                        PurchaseSalesType = "Sales",
                        Debit = dto.TotalAmount ?? 0,
                        Credit = 0,
                        PaymentMode = PaymentMode.Cash,
                        Date = salesBill.TransactionDate,
                        BillDate = salesBill.Date,
                        FiscalYearId = fiscalYearId,
                        CreatedAt = DateTime.UtcNow,
                        Status = TransactionStatus.Active,
                        IsActive = true,
                    };

                    await _context.Transactions.AddAsync(cashTransaction);
                }

                // Save all changes
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                _logger.LogInformation("Cash sales open bill created successfully with ID: {BillId}, Number: {BillNumber}",
                    salesBill.Id, salesBill.BillNumber);

                return salesBill;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Error creating cash sales open bill");
                throw;
            }
        }

        public async Task<CreditSalesFindsDTO> GetCashSalesFindsAsync(Guid companyId, Guid fiscalYearId, Guid userId)
        {
            try
            {
                _logger.LogInformation("GetCashSalesFindsAsync called for Company: {CompanyId}, FiscalYear: {FiscalYearId}, User: {UserId}",
                    companyId, fiscalYearId, userId);

                // Get company information
                var company = await _context.Companies
                    .Where(c => c.Id == companyId)
                    .Select(c => new CompanyInfoDTO
                    {
                        Id = c.Id,
                        Name = c.Name,
                        Address = c.Address,
                        City = c.City,
                        Phone = c.Phone,
                        Pan = c.Pan,
                        RenewalDate = c.RenewalDate,
                        DateFormat = c.DateFormat.ToString(),
                        VatEnabled = c.VatEnabled,
                    })
                    .FirstOrDefaultAsync();

                if (company == null)
                {
                    _logger.LogWarning("Company not found with ID: {CompanyId}", companyId);
                    throw new ArgumentException("Company not found");
                }

                // Determine if company uses Nepali date format
                bool isNepaliFormat = company.DateFormat?.ToLower() == "nepali";

                _logger.LogInformation("Company date format: {DateFormat}, IsNepaliFormat: {IsNepaliFormat}",
                    company.DateFormat, isNepaliFormat);

                // Get fiscal year information
                var currentFiscalYear = await _context.FiscalYears
                    .Where(f => f.Id == fiscalYearId && f.CompanyId == companyId)
                    .Select(f => new FiscalYearDTO
                    {
                        Id = f.Id,
                        Name = f.Name,
                        StartDate = f.StartDate,
                        EndDate = f.EndDate,
                        StartDateNepali = f.StartDateNepali,
                        EndDateNepali = f.EndDateNepali,
                        IsActive = f.IsActive,
                    })
                    .FirstOrDefaultAsync();

                if (currentFiscalYear == null)
                {
                    _logger.LogWarning("Fiscal year not found with ID: {FiscalYearId} for Company: {CompanyId}",
                        fiscalYearId, companyId);
                    throw new ArgumentException("Fiscal year not found");
                }

                // Get company date format string
                string companyDateFormat = company.DateFormat?.ToLower() ?? "english";

                // Fetch the latest purchase bill for this company and fiscal year
                // EXCLUDE bills that have CashAccount populated (not null)
                var latestBillQuery = _context.SalesBills
                    .Where(pb => pb.CompanyId == companyId &&
                                pb.FiscalYearId == fiscalYearId &&
                                pb.Account == null); // CHANGED: Exclude bills with Account

                if (isNepaliFormat)
                {
                    // For Nepali format, order by nepaliDate descending
                    latestBillQuery = latestBillQuery.OrderByDescending(pb => pb.nepaliDate)
                                                     .ThenByDescending(pb => pb.BillNumber);
                }
                else
                {
                    // For English format, order by Date descending
                    latestBillQuery = latestBillQuery.OrderByDescending(pb => pb.Date)
                                                     .ThenByDescending(pb => pb.BillNumber);
                }

                var latestBill = await latestBillQuery
                    .Select(pb => new
                    {
                        pb.BillNumber,
                        pb.Date,
                        pb.nepaliDate
                    })
                    .FirstOrDefaultAsync();

                _logger.LogInformation("Latest bill query result: BillNumber: {BillNumber}, Date: {Date}, NepaliDate: {NepaliDate}",
                    latestBill?.BillNumber, latestBill?.Date, latestBill?.nepaliDate);

                // Get user with roles
                var user = await _context.Users
                    .Include(u => u.UserRoles)
                        .ThenInclude(ur => ur.Role)
                    .FirstOrDefaultAsync(u => u.Id == userId);

                if (user == null)
                {
                    _logger.LogWarning("User not found with ID: {UserId}", userId);
                    throw new ArgumentException("User not found");
                }

                bool isAdmin = user?.IsAdmin ?? false;
                string userRole = "User";

                if (isAdmin)
                {
                    userRole = "Admin";
                }
                else if (user?.UserRoles != null)
                {
                    var primaryRole = user.UserRoles.FirstOrDefault(ur => ur.IsPrimary);
                    if (primaryRole?.Role != null)
                    {
                        userRole = primaryRole.Role.Name;
                    }
                }

                // Determine if user is admin or supervisor
                bool isAdminOrSupervisor = isAdmin || userRole == "Supervisor";

                // Create user info DTO
                var userInfo = new UserInfoDTO
                {
                    Id = user.Id,
                    Name = user.Name,
                    Email = user.Email,
                    IsAdmin = isAdmin,
                    Role = userRole,
                    Preferences = new UserPreferencesDTO
                    {
                        Theme = user.Preferences?.Theme.ToString() ?? "light"
                    }
                };

                // Create response DTO
                var response = new CreditSalesFindsDTO
                {
                    Company = company,
                    BillNumber = latestBill?.BillNumber ?? string.Empty,
                    CurrentFiscalYear = currentFiscalYear,
                    CompanyDateFormat = companyDateFormat,
                    CurrentCompanyName = company.Name,
                    Date = DateTime.UtcNow.Date,
                    Title = string.Empty,
                    Body = string.Empty,
                    User = userInfo,
                    Theme = userInfo.Preferences?.Theme ?? "light",
                    IsAdminOrSupervisor = isAdminOrSupervisor
                };

                _logger.LogInformation("Successfully retrieved credit sales finds data for Company: {CompanyId}", companyId);

                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetCashSalesFindsAsync for Company: {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<BillIdResponseDTO> GetCashSalesBillIdByNumberAsync(string billNumber, Guid companyId, Guid fiscalYearId)
        {
            try
            {
                _logger.LogInformation($"Getting cash sales ID for number: {billNumber}, Company: {companyId}, FiscalYear: {fiscalYearId}");

                var cashSalesBill = await _context.SalesBills
                    .Where(pb => pb.BillNumber == billNumber &&
                                pb.CompanyId == companyId &&
                                pb.FiscalYearId == fiscalYearId)
                    .Select(pb => new BillIdResponseDTO
                    {
                        Id = pb.Id,
                        BillNumber = pb.BillNumber
                    })
                    .FirstOrDefaultAsync();

                if (cashSalesBill == null)
                {
                    _logger.LogWarning($"Cash sales not found for number: {billNumber}");
                    throw new ArgumentException("Voucher not found");
                }

                _logger.LogInformation($"Successfully retrieved bill ID for number: {billNumber}");
                return cashSalesBill;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting cash sales ID for number: {billNumber}");
                throw;
            }
        }

        public async Task<SalesEditDataDTO> GetCashSalesEditDataAsync(Guid billId, Guid companyId, Guid fiscalYearId, Guid userId)
        {
            try
            {
                _logger.LogInformation("GetCashSalesEditDataAsync called for Bill ID: {BillId}, Company: {CompanyId}, FiscalYear: {FiscalYearId}",
                    billId, companyId, fiscalYearId);

                // Get company information including date format
                var company = await _context.Companies
                     .Where(c => c.Id == companyId)
                     .Select(c => new CompanyInfoDTO
                     {
                         Id = c.Id,
                         Name = c.Name,
                         Address = c.Address,
                         City = c.City,
                         Phone = c.Phone,
                         Pan = c.Pan,
                         RenewalDate = c.RenewalDate,
                         DateFormat = c.DateFormat.ToString(),
                         VatEnabled = c.VatEnabled,
                     })
                     .FirstOrDefaultAsync();

                if (company == null)
                    throw new ArgumentException("Company not found");

                // Determine if company uses Nepali date format
                bool isNepaliFormat = company.DateFormat?.ToLower() == "nepali";

                _logger.LogInformation("Company date format: {DateFormat}, IsNepaliFormat: {IsNepaliFormat}",
                    company.DateFormat, isNepaliFormat);

                // Get fiscal year
                var currentFiscalYear = await _context.FiscalYears
                    .Where(f => f.Id == fiscalYearId && f.CompanyId == companyId)
                    .Select(f => new FiscalYearDTO
                    {
                        Id = f.Id,
                        Name = f.Name,
                        StartDate = f.StartDate,
                        EndDate = f.EndDate,
                        StartDateNepali = f.StartDateNepali,
                        EndDateNepali = f.EndDateNepali,
                        IsActive = f.IsActive,
                    })
                    .FirstOrDefaultAsync();

                if (currentFiscalYear == null)
                    throw new ArgumentException("Fiscal year not found");

                // Get company date format
                string companyDateFormat = company.DateFormat?.ToLower() ?? "english";

                // Fetch sales bill with all related data
                var salesBill = await _context.SalesBills
                    .Include(sb => sb.Items)
                        .ThenInclude(i => i.Item)
                            .ThenInclude(it => it.Unit)
                    .Include(sb => sb.Items)
                        .ThenInclude(i => i.Item)
                            .ThenInclude(it => it.Category)
                    .Include(sb => sb.Items)
                        .ThenInclude(i => i.Unit)
                    .FirstOrDefaultAsync(sb => sb.Id == billId &&
                                              sb.CompanyId == companyId &&
                                              sb.FiscalYearId == fiscalYearId);

                if (salesBill == null)
                    throw new ArgumentException("Sales bill not found or does not belong to the selected company/fiscal year");

                // Process items to include stock and latest price
                var processedItems = new List<SalesBillItemEditDTO>();

                foreach (var item in salesBill.Items)
                {
                    // Get stock entries for this item
                    var stockEntries = await _context.StockEntries
                        .Where(se => se.ItemId == item.ItemId)
                        .OrderByDescending(se => se.Date)
                        .ToListAsync();

                    // Calculate total stock
                    decimal totalStock = stockEntries.Sum(se => se.Quantity);

                    // Get latest purchase price
                    var latestStockEntry = stockEntries.FirstOrDefault();
                    decimal latestPuPrice = latestStockEntry?.PuPrice ?? item.Item?.PuPrice ?? 0;

                    // Round to 2 decimal places
                    latestPuPrice = Math.Round(latestPuPrice * 100) / 100;

                    // Get unit info
                    UnitInfoDTO unitInfo = null;
                    if (item.Unit != null)
                    {
                        unitInfo = new UnitInfoDTO
                        {
                            Id = item.Unit.Id,
                            Name = item.Unit.Name
                        };
                    }
                    else if (item.Item?.Unit != null)
                    {
                        unitInfo = new UnitInfoDTO
                        {
                            Id = item.Item.Unit.Id,
                            Name = item.Item.Unit.Name
                        };
                    }

                    // Get category info
                    CategoryInfoDTO categoryInfo = null;
                    if (item.Item?.Category != null)
                    {
                        categoryInfo = new CategoryInfoDTO
                        {
                            Id = item.Item.Category.Id,
                            Name = item.Item.Category.Name
                        };
                    }

                    // Map stock entries to DTO
                    var stockEntryDtos = stockEntries.Select(se => new StockEntryInfoDTO
                    {
                        Id = se.Id,
                        Quantity = se.Quantity,
                        PuPrice = se.PuPrice,
                        Date = se.Date
                    }).ToList();

                    // Calculate amount
                    decimal amount = item.Quantity * item.Price;

                    // Map to response DTO
                    var itemDto = new SalesBillItemEditDTO
                    {
                        Id = item.Id,
                        SalesBillId = item.SalesBillId,
                        ItemId = item.ItemId,
                        ItemName = item.Item?.Name,
                        Hscode = item.Item?.Hscode,
                        UniqueNumber = item.Item?.UniqueNumber,
                        UnitId = item.Item?.UnitId ?? item.UnitId,  // Current unit ID
                        UnitName = item.Item?.Unit?.Name ?? item.Unit?.Name ?? "",  // Current unit name
                        Quantity = item.Quantity,
                        Price = item.Price,
                        PuPrice = item.PuPrice,
                        NetPuPrice = item.NetPuPrice,
                        DiscountPercentagePerItem = item.DiscountPercentagePerItem,
                        DiscountAmountPerItem = item.DiscountAmountPerItem,
                        NetPrice = item.NetPrice,
                        BatchNumber = item.BatchNumber,
                        ExpiryDate = item.ExpiryDate,
                        Mrp = item.Mrp,
                        VatStatus = item.VatStatus,
                        UniqueUuid = item.UniqueUuid,
                        PurchaseBillId = item.PurchaseBillId,
                        CreatedAt = item.CreatedAt,
                        UpdatedAt = item.UpdatedAt,

                        // Additional properties for edit
                        Stock = totalStock,
                        LatestPuPrice = latestPuPrice,
                        Amount = amount,
                        StockEntries = stockEntryDtos,
                        Category = categoryInfo,
                        Unit = unitInfo
                    };

                    processedItems.Add(itemDto);
                }

                // Fetch all items for the company (for dropdown) with stock and latest price
                var allItems = await _context.Items
                    .Include(i => i.Unit)
                    .Include(i => i.Category)
                    .Where(i => i.CompanyId == companyId && i.Status == "active")
                    .ToListAsync();

                var processedAllItems = new List<ItemEditDTO>();

                foreach (var item in allItems)
                {
                    // Get stock entries for this item
                    var stockEntries = await _context.StockEntries
                        .Where(se => se.ItemId == item.Id)
                        .OrderByDescending(se => se.Date)
                        .Select(se => new StockEntryInfoDTO
                        {
                            Id = se.Id,
                            Quantity = se.Quantity,
                            PuPrice = se.PuPrice,
                            Date = se.Date
                        })
                        .ToListAsync();

                    // Calculate total stock
                    decimal totalStock = stockEntries.Sum(se => se.Quantity ?? 0);

                    // Get latest purchase price
                    var latestStockEntry = stockEntries.FirstOrDefault();
                    decimal latestPuPrice = latestStockEntry?.PuPrice ?? item.PuPrice ?? 0;
                    latestPuPrice = Math.Round(latestPuPrice * 100) / 100;

                    // Get unit info
                    UnitInfoDTO unitInfo = null;
                    if (item.Unit != null)
                    {
                        unitInfo = new UnitInfoDTO
                        {
                            Id = item.Unit.Id,
                            Name = item.Unit.Name
                        };
                    }

                    // Get category info
                    CategoryInfoDTO categoryInfo = null;
                    if (item.Category != null)
                    {
                        categoryInfo = new CategoryInfoDTO
                        {
                            Id = item.Category.Id,
                            Name = item.Category.Name
                        };
                    }

                    var itemDto = new ItemEditDTO
                    {
                        Id = item.Id,
                        Name = item.Name,
                        Hscode = item.Hscode,
                        UniqueNumber = item.UniqueNumber,
                        VatStatus = item.VatStatus ?? "vatable",
                        Unit = unitInfo,
                        Category = categoryInfo,
                        PuPrice = item.PuPrice ?? 0,
                        Quantity = 0,
                        Stock = totalStock,
                        LatestPuPrice = latestPuPrice,
                        StockEntries = stockEntries
                    };

                    processedAllItems.Add(itemDto);
                }

                // Sort items by name
                processedAllItems = processedAllItems.OrderBy(i => i.Name).ToList();

                // Fetch cash accounts (Cash in Hand only for cash sales)
                var cashGroupNames = new[] { "Cash in Hand" };

                // Get user with roles
                var user = await _context.Users
                    .Include(u => u.UserRoles)
                        .ThenInclude(ur => ur.Role)
                    .FirstOrDefaultAsync(u => u.Id == userId);

                bool isAdmin = user?.IsAdmin ?? false;
                string userRole = "User";

                if (isAdmin)
                {
                    userRole = "Admin";
                }
                else if (user?.UserRoles != null)
                {
                    var primaryRole = user.UserRoles.FirstOrDefault(ur => ur.IsPrimary);
                    if (primaryRole?.Role != null)
                    {
                        userRole = primaryRole.Role.Name;
                    }
                }

                // Map sales bill to response DTO
                var salesBillDto = MapToResponseDTO(salesBill, companyDateFormat);

                // Add the processed items with additional edit properties
                salesBillDto.Items = processedItems.Cast<SalesBillItemResponseDTO>().ToList();

                // Add cash account details to the sales bill DTO
                salesBillDto.CashAccount = salesBill.CashAccount;
                salesBillDto.CashAccountAddress = salesBill.CashAccountAddress;
                salesBillDto.CashAccountPan = salesBill.CashAccountPan;
                salesBillDto.CashAccountEmail = salesBill.CashAccountEmail;
                salesBillDto.CashAccountPhone = salesBill.CashAccountPhone;

                // Create response following the same pattern as credit sales
                var response = new SalesEditDataDTO
                {
                    Company = company,
                    SalesBill = salesBillDto,
                    Items = processedAllItems,
                    User = new UserEditInfoDTO
                    {
                        IsAdmin = isAdmin,
                        Role = userRole,
                        Preferences = new UserPreferencesDTO
                        {
                            Theme = user?.Preferences?.Theme.ToString() ?? "light"
                        }
                    }
                };

                _logger.LogInformation("Successfully retrieved cash sales edit data for Bill ID: {BillId}", billId);

                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting cash sales edit data for Bill ID: {BillId}", billId);
                throw;
            }
        }
        public async Task<SalesBill> UpdateCashSalesBillAsync(Guid billId, UpdateSalesBillDTO dto, Guid userId, Guid companyId, Guid fiscalYearId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                _logger.LogInformation("UpdateCashSalesBillAsync started for Bill ID: {BillId}, Company: {CompanyId}, User: {UserId}",
                    billId, companyId, userId);

                // Validate required fields
                if (string.IsNullOrEmpty(dto.CashAccount))
                    throw new ArgumentException("Cash account name is required");

                if (dto.Items == null || !dto.Items.Any())
                    throw new ArgumentException("At least one item is required");

                // Get the existing sales bill with ALL related data
                var existingBill = await _context.SalesBills
                    .Include(sb => sb.Items)
                    .FirstOrDefaultAsync(sb => sb.Id == billId && sb.CompanyId == companyId);

                if (existingBill == null)
                    throw new ArgumentException("Sales bill not found");

                // Validate company and fiscal year
                var company = await _context.Companies.FindAsync(companyId);
                if (company == null)
                    throw new ArgumentException("Company not found");

                var fiscalYear = await _context.FiscalYears.FindAsync(fiscalYearId);
                if (fiscalYear == null || fiscalYear.CompanyId != companyId)
                    throw new ArgumentException("Invalid fiscal year");

                // Parse VAT exemption
                bool isVatExemptBool = dto.IsVatExempt == "true" || dto.IsVatExempt == "True" || dto.IsVatExempt == "1";
                bool isVatAll = dto.IsVatExempt == "all";

                // STEP 1: RESTORE STOCK for all existing items
                await RestoreStockForSalesBillItemsAsync(existingBill, companyId);

                // STEP 2: Delete all associated transactions
                var existingTransactions = await _context.Transactions
                    .Where(t => t.SalesBillId == billId)
                    .ToListAsync();

                if (existingTransactions.Any())
                {
                    _context.Transactions.RemoveRange(existingTransactions);
                    _logger.LogInformation("Deleted {Count} existing transactions", existingTransactions.Count);
                    await _context.SaveChangesAsync();
                }

                // STEP 3: Delete existing items
                if (existingBill.Items.Any())
                {
                    _context.SalesBillItems.RemoveRange(existingBill.Items);
                    existingBill.Items.Clear();
                    await _context.SaveChangesAsync();
                }

                // Get default accounts
                var salesAccount = await _context.Accounts
                    .FirstOrDefaultAsync(a => a.Name == "Sales" && a.CompanyId == companyId);

                var vatAccount = await _context.Accounts
                    .FirstOrDefaultAsync(a => a.Name == "VAT" && a.CompanyId == companyId);

                var roundOffAccount = await _context.Accounts
                    .FirstOrDefaultAsync(a => a.Name == "Rounded Off" && a.CompanyId == companyId);

                var cashInHandAccount = await _context.Accounts
                    .FirstOrDefaultAsync(a => a.Name == "Cash in Hand" && a.CompanyId == companyId);

                var paymentMode = ParsePaymentMode(dto.PaymentMode);

                // STEP 4: Validate new items and check stock availability
                await ValidateAndCheckStockForSalesItemsAsync(dto.Items, companyId, isVatExemptBool, isVatAll);

                // STEP 5: UPDATE BILL PROPERTIES
                existingBill.CashAccount = dto.CashAccount;
                existingBill.CashAccountAddress = dto.CashAccountAddress;
                existingBill.CashAccountPan = dto.CashAccountPan;
                existingBill.CashAccountEmail = dto.CashAccountEmail;
                existingBill.CashAccountPhone = dto.CashAccountPhone;
                existingBill.SubTotal = dto.SubTotal ?? 0;
                existingBill.NonVatSales = dto.NonTaxableAmount ?? 0;
                existingBill.TaxableAmount = dto.TaxableAmount ?? 0;
                existingBill.DiscountPercentage = dto.DiscountPercentage ?? 0;
                existingBill.DiscountAmount = dto.DiscountAmount ?? 0;
                existingBill.VatPercentage = isVatExemptBool ? 0 : (dto.VatPercentage ?? 0);
                existingBill.VatAmount = dto.VatAmount ?? 0;
                existingBill.TotalAmount = dto.TotalAmount ?? 0;
                existingBill.IsVatExempt = isVatExemptBool;
                existingBill.IsVatAll = isVatAll ? "all" : null;
                existingBill.RoundOffAmount = dto.RoundOffAmount ?? 0;
                existingBill.PaymentMode = dto.PaymentMode;
                existingBill.nepaliDate = dto.NepaliDate;
                existingBill.Date = dto.Date;
                existingBill.transactionDateNepali = dto.TransactionDateNepali;
                existingBill.TransactionDate = dto.TransactionDate;
                existingBill.UpdatedAt = DateTime.UtcNow;

                // Update the bill
                _context.SalesBills.Update(existingBill);
                await _context.SaveChangesAsync();

                // STEP 6: Process new items and reduce stock
                foreach (var itemDto in dto.Items)
                {
                    var item = await _context.Items
                        .Include(i => i.StockEntries)
                        .FirstOrDefaultAsync(i => i.Id == itemDto.ItemId && i.CompanyId == companyId);

                    if (item == null)
                        throw new ArgumentException($"Item with id {itemDto.ItemId} not found");

                    // Find the batch to reduce
                    var batchToReduce = item.StockEntries
                        .FirstOrDefault(e => e.BatchNumber == itemDto.BatchNumber &&
                                            (string.IsNullOrEmpty(itemDto.UniqueUuid) || e.UniqueUuid == itemDto.UniqueUuid));

                    if (batchToReduce == null)
                        throw new ArgumentException($"Batch {itemDto.BatchNumber} not found for item {item.Name}");

                    // Reduce stock
                    await ReduceStockForSalesBillItemAsync(item, itemDto.BatchNumber, itemDto.Quantity, itemDto.UniqueUuid);

                    // Calculate net price after discount
                    decimal netPrice = itemDto.Price - (itemDto.Price * (dto.DiscountPercentage ?? 0) / 100);

                    // Determine if company uses Nepali date format
                    bool isNepaliFormat = company.DateFormat?.ToString().ToLower() == "nepali";

                    decimal newMarginPercentage = 0;
                    if (itemDto.PuPrice.HasValue && itemDto.PuPrice.Value > 0)
                    {
                        newMarginPercentage = ((itemDto.Price - itemDto.PuPrice.Value) / itemDto.PuPrice.Value) * 100;
                        newMarginPercentage = Math.Round(newMarginPercentage, 2);
                    }
                    // Create sales bill item
                    var billItem = new SalesBillItem
                    {
                        Id = Guid.NewGuid(),
                        SalesBillId = existingBill.Id,
                        ItemId = itemDto.ItemId,
                        UnitId = itemDto.UnitId,
                        Quantity = itemDto.Quantity,
                        Price = itemDto.Price,
                        PuPrice = itemDto.PuPrice,
                        NetPuPrice = itemDto.NetPuPrice ?? itemDto.PuPrice,
                        MarginPercentage = newMarginPercentage,
                        Mrp = itemDto.Mrp,
                        DiscountPercentagePerItem = dto.DiscountPercentage ?? 0,
                        DiscountAmountPerItem = (itemDto.Price * itemDto.Quantity * dto.DiscountPercentage ?? 0) / 100,
                        NetPrice = netPrice,
                        BatchNumber = itemDto.BatchNumber,
                        ExpiryDate = itemDto.ExpiryDate,
                        VatStatus = item.VatStatus ?? "vatable",
                        UniqueUuid = batchToReduce?.UniqueUuid,
                        PurchaseBillId = itemDto.PurchaseBillId,
                        CreatedAt = isNepaliFormat ? dto.NepaliDate : dto.Date,
                        UpdatedAt = isNepaliFormat ? dto.NepaliDate : dto.Date
                    };

                    existingBill.Items.Add(billItem);
                    await _context.SalesBillItems.AddAsync(billItem);
                }

                // Save items
                await _context.SaveChangesAsync();

                // STEP 7: CREATE NEW TRANSACTIONS
                var transactions = new List<Transaction>();

                // 1. Main transaction for the bill
                var mainTransaction = new Transaction
                {
                    Id = Guid.NewGuid(),
                    CompanyId = companyId,
                    SalesBillId = existingBill.Id,
                    BillNumber = existingBill.BillNumber,
                    Type = TransactionType.Sale,
                    PurchaseSalesType = "Sales",
                    Debit = dto.TotalAmount ?? 0,
                    Credit = 0,
                    PaymentMode = paymentMode,
                    Date = existingBill.TransactionDate,
                    BillDate = existingBill.Date,
                    FiscalYearId = fiscalYearId,
                    CreatedAt = DateTime.UtcNow,
                    Status = TransactionStatus.Active,
                    IsActive = true,
                    IsType = TransactionIsType.Sale,
                };
                transactions.Add(mainTransaction);

                // 2. Sales Account transaction
                if (salesAccount != null)
                {
                    var salesAmount = (dto.TaxableAmount ?? 0) + (dto.NonTaxableAmount ?? 0);
                    if (salesAmount > 0)
                    {
                        var salesTransaction = new Transaction
                        {
                            Id = Guid.NewGuid(),
                            CompanyId = companyId,
                            AccountId = salesAccount.Id,
                            SalesBillId = existingBill.Id,
                            BillNumber = existingBill.BillNumber,
                            Type = TransactionType.Sale,
                            PurchaseSalesType = "Sales",
                            Debit = 0,
                            Credit = salesAmount,
                            PaymentMode = paymentMode,
                            Date = existingBill.TransactionDate,
                            BillDate = existingBill.Date,
                            FiscalYearId = fiscalYearId,
                            CreatedAt = DateTime.UtcNow,
                            Status = TransactionStatus.Active,
                            IsActive = true,
                            IsType = TransactionIsType.Sale,
                        };
                        transactions.Add(salesTransaction);
                    }
                }

                // 3. VAT transaction if applicable
                if (dto.VatAmount > 0 && vatAccount != null && !isVatExemptBool)
                {
                    var vatTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        AccountId = vatAccount.Id,
                        SalesBillId = existingBill.Id,
                        BillNumber = existingBill.BillNumber,
                        IsType = TransactionIsType.VAT,
                        Type = TransactionType.Sale,
                        PurchaseSalesType = "Sales",
                        Debit = 0,
                        Credit = dto.VatAmount.Value,
                        PaymentMode = paymentMode,
                        Date = existingBill.TransactionDate,
                        BillDate = existingBill.Date,
                        FiscalYearId = fiscalYearId,
                        CreatedAt = DateTime.UtcNow,
                        Status = TransactionStatus.Active,
                        IsActive = true,
                    };
                    transactions.Add(vatTransaction);
                }

                // 4. Round-off transaction if applicable
                if (dto.RoundOffAmount != 0 && roundOffAccount != null)
                {
                    var roundOffTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        AccountId = roundOffAccount.Id,
                        SalesBillId = existingBill.Id,
                        BillNumber = existingBill.BillNumber,
                        IsType = TransactionIsType.RoundOff,
                        Type = TransactionType.Sale,
                        PurchaseSalesType = "Sales",
                        Debit = dto.RoundOffAmount > 0 ? 0 : Math.Abs(dto.RoundOffAmount.Value),
                        Credit = dto.RoundOffAmount > 0 ? dto.RoundOffAmount.Value : 0,
                        PaymentMode = paymentMode,
                        Date = existingBill.TransactionDate,
                        BillDate = existingBill.Date,
                        FiscalYearId = fiscalYearId,
                        CreatedAt = DateTime.UtcNow,
                        Status = TransactionStatus.Active,
                        IsActive = true,
                    };
                    transactions.Add(roundOffTransaction);
                }

                // 5. Cash transaction
                if (paymentMode == PaymentMode.Cash && cashInHandAccount != null)
                {
                    var cashTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        AccountId = cashInHandAccount.Id,
                        SalesBillId = existingBill.Id,
                        BillNumber = existingBill.BillNumber,
                        IsType = TransactionIsType.Sale,
                        Type = TransactionType.Sale,
                        PurchaseSalesType = "Sales",
                        Debit = dto.TotalAmount ?? 0,
                        Credit = 0,
                        PaymentMode = PaymentMode.Cash,
                        Date = existingBill.TransactionDate,
                        BillDate = existingBill.Date,
                        FiscalYearId = fiscalYearId,
                        CreatedAt = DateTime.UtcNow,
                        Status = TransactionStatus.Active,
                        IsActive = true,
                    };
                    transactions.Add(cashTransaction);
                }

                // Add all transactions
                await _context.Transactions.AddRangeAsync(transactions);
                await _context.SaveChangesAsync();

                await transaction.CommitAsync();

                _logger.LogInformation("Cash sales bill updated successfully with ID: {BillId}, Number: {BillNumber}",
                    existingBill.Id, existingBill.BillNumber);

                // Reload the bill with items for response
                var updatedBill = await _context.SalesBills
                    .Include(sb => sb.Items)
                    .FirstOrDefaultAsync(sb => sb.Id == existingBill.Id);

                return updatedBill;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Error updating cash sales bill for Bill ID: {BillId}", billId);
                throw;
            }
        }
        public async Task<SalesRegisterDataDTO> GetSalesRegisterAsync(Guid companyId, Guid fiscalYearId, string? fromDate = null, string? toDate = null)
        {
            try
            {
                _logger.LogInformation("GetSalesRegisterAsync called with companyId: {CompanyId}, fiscalYearId: {FiscalYearId}, fromDate: {FromDate}, toDate: {ToDate}",
                    companyId, fiscalYearId, fromDate, toDate);

                // Get company information including date format
                var company = await _context.Companies
                    .Where(c => c.Id == companyId)
                    .Select(c => new CompanyInfoDTO
                    {
                        Id = c.Id,
                        Name = c.Name,
                        Address = c.Address,
                        City = c.City,
                        Phone = c.Phone,
                        Pan = c.Pan,
                        RenewalDate = c.RenewalDate,
                        DateFormat = c.DateFormat.ToString(),
                        VatEnabled = c.VatEnabled,
                    })
                    .FirstOrDefaultAsync();

                if (company == null)
                    throw new ArgumentException("Company not found");

                // Determine if company uses Nepali date format
                bool isNepaliFormat = company.DateFormat?.ToLower() == "nepali";

                _logger.LogInformation("Company date format: {DateFormat}, IsNepaliFormat: {IsNepaliFormat}",
                    company.DateFormat, isNepaliFormat);

                // Get fiscal year
                var fiscalYear = await _context.FiscalYears
                    .Where(f => f.Id == fiscalYearId && f.CompanyId == companyId)
                    .Select(f => new FiscalYearDTO
                    {
                        Id = f.Id,
                        Name = f.Name,
                        StartDate = f.StartDate,
                        EndDate = f.EndDate,
                        StartDateNepali = f.StartDateNepali,
                        EndDateNepali = f.EndDateNepali,
                        IsActive = f.IsActive,
                    })
                    .FirstOrDefaultAsync();

                // If no date range provided, return empty bill list
                if (string.IsNullOrEmpty(fromDate) || string.IsNullOrEmpty(toDate))
                {
                    _logger.LogInformation("No date range provided, returning empty bill list");
                    return new SalesRegisterDataDTO
                    {
                        Company = company,
                        CurrentFiscalYear = fiscalYear,
                        Bills = new List<SalesBillResponseDTO>(),
                        FromDate = fromDate,
                        ToDate = toDate,
                        CurrentCompanyName = company.Name,
                        CompanyDateFormat = company.DateFormat,
                        VatEnabled = company.VatEnabled,
                    };
                }

                // Parse dates based on company format
                DateTime startDateTime;
                DateTime endDateTime;

                if (isNepaliFormat)
                {
                    // For Nepali dates, we need to convert the Nepali date string to DateTime for comparison
                    // Note: This assumes the Nepali date is stored as DateTime in the database
                    // You might need to adjust this based on how you store Nepali dates
                    if (!DateTime.TryParse(fromDate, out startDateTime))
                    {
                        _logger.LogWarning("Invalid fromDate format for Nepali date: {FromDate}", fromDate);
                        startDateTime = DateTime.MinValue;
                    }

                    if (!DateTime.TryParse(toDate, out endDateTime))
                    {
                        _logger.LogWarning("Invalid toDate format for Nepali date: {ToDate}", toDate);
                        endDateTime = DateTime.MaxValue;
                    }
                }
                else
                {
                    // For English dates, parse normally
                    if (!DateTime.TryParse(fromDate, out startDateTime))
                    {
                        _logger.LogWarning("Invalid fromDate format: {FromDate}", fromDate);
                        startDateTime = DateTime.MinValue;
                    }

                    if (!DateTime.TryParse(toDate, out endDateTime))
                    {
                        _logger.LogWarning("Invalid toDate format: {ToDate}", toDate);
                        endDateTime = DateTime.MaxValue;
                    }
                }

                // Set end date to end of day
                endDateTime = endDateTime.Date.AddDays(1).AddTicks(-1);

                _logger.LogInformation("Searching for bills between {StartDate} and {EndDate} using {DateFormat} format",
                    startDateTime, endDateTime, isNepaliFormat ? "Nepali" : "English");

                // First, check if there are any purchase bills for this company and fiscal year
                var totalBillsCount = await _context.SalesBills
                    .CountAsync(pb => pb.CompanyId == companyId && pb.FiscalYearId == fiscalYearId);

                _logger.LogInformation("Total bills for company {CompanyId} and fiscal year {FiscalYearId}: {Count}",
                    companyId, fiscalYearId, totalBillsCount);

                // Build query with date filter based on company date format
                var query = _context.SalesBills
                    .Include(pb => pb.Company)
                    .Include(pb => pb.Account)
                    .Include(pb => pb.User)
                    .Include(pb => pb.FiscalYear)
                    .Include(pb => pb.Items)
                        .ThenInclude(i => i.Item)
                    .Where(pb => pb.CompanyId == companyId &&
                                pb.FiscalYearId == fiscalYearId);

                // Apply date filter based on company's date format
                if (isNepaliFormat)
                {
                    // Use nepaliDate field for filtering
                    query = query.Where(pb => pb.nepaliDate >= startDateTime && pb.nepaliDate <= endDateTime);
                    _logger.LogInformation("Using nepaliDate field for filtering");
                }
                else
                {
                    // Use Date field for filtering
                    query = query.Where(pb => pb.Date >= startDateTime && pb.Date <= endDateTime);
                    _logger.LogInformation("Using Date field for filtering");
                }

                // Log the SQL query (optional - for debugging)
                var sql = query.ToQueryString();
                _logger.LogDebug("SQL Query: {Sql}", sql);

                // Get bills ordered by date and bill number
                var SalesBills = await query
                    .OrderBy(pb => pb.Date)
                    .ThenBy(pb => pb.BillNumber)
                    .ToListAsync();

                _logger.LogInformation("Found {Count} bills matching the criteria", SalesBills.Count);

                // If no bills found, log sample of all bills to debug
                if (SalesBills.Count == 0)
                {
                    var sampleBills = await _context.SalesBills
                        .Where(pb => pb.CompanyId == companyId)
                        .OrderByDescending(pb => pb.Date)
                        .Take(5)
                        .Select(pb => new { pb.Id, pb.BillNumber, pb.Date, pb.nepaliDate })
                        .ToListAsync();

                    _logger.LogInformation("Sample of recent bills (Date vs NepaliDate): {SampleBills}",
                        string.Join(", ", sampleBills.Select(b => $"{b.BillNumber} - Date: {b.Date}, NepaliDate: {b.nepaliDate}")));
                }

                // Map to response DTOs
                var billDtos = SalesBills.Select(bill => MapToResponseDTO(bill, company.DateFormat)).ToList();

                return new SalesRegisterDataDTO
                {
                    Company = company,
                    CurrentFiscalYear = fiscalYear,
                    Bills = billDtos,
                    FromDate = fromDate,
                    ToDate = toDate,
                    CurrentCompanyName = company.Name,
                    CompanyDateFormat = company.DateFormat,
                    VatEnabled = company.VatEnabled,
                    IsAdminOrSupervisor = true
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting purchase register for company {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<SalesBillEntryDataDTO> GetSalesRegisterEntryDataAsync(Guid companyId, Guid fiscalYearId, Guid userId)
        {
            // Get company
            var company = await _context.Companies
                .Where(c => c.Id == companyId)
                .Select(c => new CompanyInfoDTO
                {
                    Id = c.Id,
                    Name = c.Name,
                    Address = c.Address,
                    City = c.City,
                    Phone = c.Phone,
                    Pan = c.Pan,
                    RenewalDate = c.RenewalDate,
                    DateFormat = c.DateFormat.ToString(),
                    VatEnabled = c.VatEnabled
                })
                .FirstOrDefaultAsync();

            if (company == null)
                throw new ArgumentException("Company not found");

            // Get fiscal year
            var fiscalYear = await _context.FiscalYears
                .Where(f => f.Id == fiscalYearId && f.CompanyId == companyId)
                .Select(f => new FiscalYearDTO
                {
                    Id = f.Id,
                    Name = f.Name,
                    StartDate = f.StartDate,
                    EndDate = f.EndDate,
                    StartDateNepali = f.StartDateNepali,
                    EndDateNepali = f.EndDateNepali,
                    IsActive = f.IsActive
                })
                .FirstOrDefaultAsync();

            if (fiscalYear == null)
                throw new ArgumentException("Fiscal year not found");

            // Create the response
            var data = new SalesBillEntryDataDTO
            {
                Company = company,
                // Accounts = accounts, // This should now work with AccountInfoDTO
                Dates = new DateInfoDTO
                {
                    NepaliDate = DateTime.UtcNow.ToString("yyyy-MM-dd"),
                    TransactionDateNepali = DateTime.UtcNow.ToString("yyyy-MM-dd"),
                    CompanyDateFormat = company.DateFormat
                },
                CurrentFiscalYear = fiscalYear,
                UserPreferences = new UserPreferencesDTO { Theme = "light" },
                Permissions = new PermissionsDTO
                {
                    IsAdminOrSupervisor = true,
                    StoreManagementEnabled = false
                },
                CurrentCompanyName = company.Name
            };

            return data;
        }

        public async Task<SalesBillPrintDTO> GetSalesForPrintAsync(Guid id, Guid companyId, Guid userId, Guid fiscalYearId)
        {
            try
            {
                _logger.LogInformation("GetSalesForPrintAsync called for Bill ID: {BillId}, Company: {CompanyId}", id, companyId);

                // Get company details - materialize first
                var companyEntity = await _context.Companies
                    .Where(c => c.Id == companyId)
                    .FirstOrDefaultAsync();

                if (companyEntity == null)
                    throw new ArgumentException("Company not found");

                // Parse renewal date
                DateTime? renewalDate = null;
                if (DateTime.TryParse(companyEntity.RenewalDate, out var parsedDate))
                {
                    renewalDate = parsedDate;
                }

                // Create DTO manually
                var company = new CompanyPrintDTO
                {
                    Id = companyEntity.Id,
                    RenewalDate = renewalDate,
                    DateFormat = companyEntity.DateFormat.ToString(),
                    FiscalYear = null
                };
                if (company == null)
                    throw new ArgumentException("Company not found");

                // Get fiscal year
                var currentFiscalYear = await _context.FiscalYears
                    .Where(f => f.Id == fiscalYearId && f.CompanyId == companyId)
                    .Select(f => new FiscalYearDTO
                    {
                        Id = f.Id,
                        Name = f.Name,
                        StartDate = f.StartDate,
                        EndDate = f.EndDate,
                        StartDateNepali = f.StartDateNepali,
                        EndDateNepali = f.EndDateNepali,
                        IsActive = f.IsActive
                    })
                    .FirstOrDefaultAsync();

                // Get current company info
                var currentCompany = await _context.Companies
                    .Where(c => c.Id == companyId)
                    .Select(c => new CompanyPrintInfoDTO
                    {
                        Id = c.Id,
                        Name = c.Name,
                        Phone = c.Phone,
                        Pan = c.Pan,
                        Address = c.Address
                    })
                    .FirstOrDefaultAsync();

                // Get the purchase bill with all related data
                var salesBill = await _context.SalesBills
                    .Include(pb => pb.Account)
                    .Include(pb => pb.User)
                    .Include(pb => pb.Items)
                        .ThenInclude(i => i.Item)
                            .ThenInclude(it => it.Unit)
                    .FirstOrDefaultAsync(pb => pb.Id == id && pb.CompanyId == companyId);

                if (salesBill == null)
                    throw new ArgumentException("Bill not found");

                // Check and update first printed status
                bool firstBill = !salesBill.FirstPrinted;
                if (firstBill)
                {
                    salesBill.FirstPrinted = true;
                    salesBill.PrintCount += 1;
                    await _context.SaveChangesAsync();
                }

                // Calculate last balance for credit bills
                decimal? finalBalance = null;
                string balanceLabel = "";

                if (salesBill.PaymentMode?.ToLower() == "credit")
                {
                    // Fix: Use Date instead of TransactionDate
                    var latestTransaction = await _context.Transactions
                        .Where(t => t.CompanyId == companyId &&
                                   t.SalesBillId == id)
                        .OrderByDescending(t => t.Date)
                        .FirstOrDefaultAsync();

                    decimal lastBalance = 0;

                    if (latestTransaction != null)
                    {
                        lastBalance = Math.Abs(latestTransaction.Balance ?? 0);
                        if (latestTransaction.Debit > 0)
                            balanceLabel = "Dr";
                        else if (latestTransaction.Credit > 0)
                            balanceLabel = "Cr";
                    }

                    // Get opening balance from account
                    if (salesBill.Account != null && salesBill.Account.OpeningBalance != null)
                    {
                        var openingBalance = salesBill.Account.OpeningBalance;
                        lastBalance += openingBalance.Type == "Dr" ? openingBalance.Amount : -openingBalance.Amount;
                        balanceLabel = openingBalance.Type;
                    }

                    finalBalance = lastBalance;
                }

                // Get user with roles
                var user = await _context.Users
                    .Include(u => u.UserRoles)
                        .ThenInclude(ur => ur.Role)
                    .FirstOrDefaultAsync(u => u.Id == userId);

                // Create user preferences DTO
                var userPreferences = new UserPreferencesDTO
                {
                    Theme = user?.Preferences.Theme.ToString() ?? "Light"
                };

                // Determine if user is admin or supervisor
                bool isAdminOrSupervisor = user?.IsAdmin == true ||
                                          (user?.UserRoles?.Any(ur => ur.Role?.Name == "Supervisor" &&
                                                                     (ur.ExpiresAt == null || ur.ExpiresAt > DateTime.UtcNow)) ?? false);

                // Get company date format
                bool isNepaliFormat = company.DateFormat?.ToLower() == "nepali";

                // Map to response DTO
                var response = new SalesBillPrintDTO
                {
                    Company = company,
                    CurrentFiscalYear = currentFiscalYear,
                    Bill = new SalesBillPrintBillDTO
                    {
                        Id = salesBill.Id,
                        BillNumber = salesBill.BillNumber,
                        CashAccount = salesBill.CashAccount,
                        CashAccountAddress = salesBill.CashAccountAddress,
                        CashAccountPan = salesBill.CashAccountPan,
                        CashAccountEmail = salesBill.CashAccountEmail,
                        CashAccountPhone = salesBill.CashAccountPhone,
                        FirstPrinted = salesBill.FirstPrinted,
                        PrintCount = salesBill.PrintCount,
                        PaymentMode = salesBill.PaymentMode,
                        Date = isNepaliFormat ? salesBill.nepaliDate : salesBill.Date,
                        TransactionDate = isNepaliFormat ? salesBill.transactionDateNepali : salesBill.TransactionDate,
                        SubTotal = salesBill.SubTotal,
                        NonVatSales = salesBill.NonVatSales,
                        TaxableAmount = salesBill.TaxableAmount,
                        DiscountPercentage = salesBill.DiscountPercentage,
                        DiscountAmount = salesBill.DiscountAmount,
                        VatPercentage = salesBill.VatPercentage,
                        VatAmount = salesBill.VatAmount,
                        TotalAmount = salesBill.TotalAmount,
                        IsVatExempt = salesBill.IsVatExempt,
                        RoundOffAmount = salesBill.RoundOffAmount,
                        Account = salesBill.Account != null ? new AccountPrintDTO
                        {
                            Id = salesBill.Account.Id,
                            Name = salesBill.Account.Name,
                            Pan = salesBill.Account.Pan,
                            Address = salesBill.Account.Address,
                            Email = salesBill.Account.Email,
                            Phone = salesBill.Account.Phone,
                        } : null,
                        User = salesBill.User != null ? new UserPrintDTO
                        {
                            Id = salesBill.User.Id,
                            Name = salesBill.User.Name,
                            IsAdmin = salesBill.User.IsAdmin,
                            Role = salesBill.User.UserRoles?
                                .FirstOrDefault(ur => ur.IsPrimary)?.Role?.Name ?? "User"
                        } : null,
                        Items = salesBill.Items.Select(i => new SalesBillItemPrintDTO
                        {
                            Id = i.Id,
                            ItemId = i.ItemId,
                            ItemName = i.Item?.Name,
                            Hscode = i.Item?.Hscode,  // Add this
                            UniqueNumber = i.Item?.UniqueNumber,  // Add this
                            UnitId = i.UnitId,
                            UnitName = i.Item?.Unit?.Name,
                            Quantity = i.Quantity,
                            Price = i.Price,
                            PuPrice = i.PuPrice ?? 0,
                            DiscountPercentagePerItem = i.DiscountPercentagePerItem,
                            DiscountAmountPerItem = i.DiscountAmountPerItem,
                            NetPuPrice = i.NetPuPrice,
                            BatchNumber = i.BatchNumber,
                            ExpiryDate = i.ExpiryDate,
                            VatStatus = i.VatStatus
                        }).ToList()
                    },
                    CurrentCompanyName = currentCompany?.Name ?? string.Empty,
                    CurrentCompany = currentCompany ?? new CompanyPrintInfoDTO(),
                    FirstBill = firstBill,
                    LastBalance = finalBalance,
                    BalanceLabel = balanceLabel,
                    PaymentMode = salesBill.PaymentMode ?? string.Empty,
                    NepaliDate = salesBill.nepaliDate.ToString("yyyy-MM-dd"),
                    TransactionDateNepali = salesBill.transactionDateNepali.ToString("yyyy-MM-dd"),
                    EnglishDate = salesBill.Date,
                    CompanyDateFormat = company.DateFormat?.ToString()?.ToLower() ?? "english",
                    User = new UserPrintDTO
                    {
                        Id = userId,
                        Name = user?.Name ?? string.Empty,
                        IsAdmin = user?.IsAdmin ?? false,
                        Role = user?.UserRoles?
                            .FirstOrDefault(ur => ur.IsPrimary)?.Role?.Name ??
                               (user?.IsAdmin == true ? "Admin" : "User"),
                        Preferences = userPreferences
                    },
                    IsAdminOrSupervisor = isAdminOrSupervisor
                };

                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting purchase bill for print: {BillId}", id);
                throw;
            }
        }

    }
}

