using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Services.BillNumberServices;
using SkyForge.Models.Retailer.Items;
using SkyForge.Models.Retailer.TransactionModel;
using SkyForge.Models.AccountModel;
using SkyForge.Dto.AccountDto;
using SkyForge.Dto.RetailerDto.SalesBillDto;
using SkyForge.Dto.RetailerDto.SalesReturnDto;
using SkyForge.Dto.RetailerDto;
using SkyForge.Models.Retailer.SalesReturnModel;
using SkyForge.Dto.RetailerDto.ItemDto;
using SkyForge.Models.Retailer.StoreModel;
using SkyForge.Models.RackModel;



namespace SkyForge.Services.Retailer.SalesReturnServices
{
    public class SalesReturnService : ISalesReturnService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<SalesReturnService> _logger;
        private readonly IBillNumberService _billNumberService;

        public SalesReturnService(
            ApplicationDbContext context,
            ILogger<SalesReturnService> logger,
            IBillNumberService billNumberService)
        {
            _context = context;
            _logger = logger;
            _billNumberService = billNumberService;
        }

        public async Task<SalesReturnResponseDTO> GetSalesReturnDataAsync(Guid companyId, Guid fiscalYearId, Guid userId)
        {
            try
            {
                _logger.LogInformation("GetSalesReturnDataAsync called for Company: {CompanyId}, User: {UserId}", companyId, userId);

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
                    return null!;

                // Get fiscal year (matching Express: currentFiscalYear)
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

                // Get sales invoices for reference (matching Express: SalesBill.find)
                var salesInvoices = await _context.SalesBills
                    .Where(sb => sb.CompanyId == companyId)
                    .OrderByDescending(sb => sb.TransactionDate)
                    .Take(100)
                    .Select(sb => new SalesBillData
                    {
                        Id = sb.Id,
                        BillNumber = sb.BillNumber,
                        Account = sb.Account != null ? new AccountInfoDTO
                        {
                            Id = sb.Account.Id,
                            Name = sb.Account.Name
                        } : null,
                        TotalAmount = sb.TotalAmount,
                        VatAmount = sb.VatAmount,
                        DiscountAmount = sb.DiscountAmount,
                        SubTotal = sb.SubTotal,
                        TaxableAmount = sb.TaxableAmount,
                        NonVatSales = sb.NonVatSales,
                        IsVatExempt = sb.IsVatExempt,
                        VatPercentage = sb.VatPercentage,
                        PaymentMode = sb.PaymentMode ?? string.Empty,
                        TransactionDate = sb.TransactionDate
                    })
                    .ToListAsync();

                // Get company groups for Sundry Debtors and Sundry Creditors (matching Express logic)
                var relevantGroupNames = new[] { "Sundry Debtors", "Sundry Creditors" };
                var companyGroups = await _context.AccountGroups
                    .Where(ag => ag.CompanyId == companyId && relevantGroupNames.Contains(ag.Name))
                    .Select(ag => new CompanyGroupInfoDTO
                    {
                        Id = ag.Id,
                        Name = ag.Name
                    })
                    .ToListAsync();

                // var relevantGroupIds = companyGroups.Select(g => g.Id).ToList();

                // Get user for preferences (matching Express: req.user.preferences)
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

                // Date handling (matching Express: Nepali date conversions)
                var today = DateTime.UtcNow;
                var nepaliDate = today.ToString("yyyy-MM-dd"); // You might want to use a proper Nepali date converter
                var transactionDateNepali = today.ToString("yyyy-MM-dd");
                var companyDateFormat = company.DateFormat?.ToLower() ?? "english";


                // Prepare response matching Express structure
                var response = new SalesReturnResponseDTO
                {
                    Company = new CompanyInfoDTO
                    {
                        Id = company.Id,
                        Name = company.Name,
                        RenewalDate = company.RenewalDate,
                        DateFormat = company.DateFormat,
                        VatEnabled = company.VatEnabled,
                        FiscalYear = company.FiscalYear
                    },
                    SalesInvoices = salesInvoices,
                    Dates = new DateInfoDTO
                    {
                        NepaliDate = nepaliDate,
                        TransactionDateNepali = transactionDateNepali,
                        CompanyDateFormat = companyDateFormat
                    },
                    CurrentFiscalYear = currentFiscalYear != null ? new FiscalYearDTO
                    {
                        Id = currentFiscalYear.Id,
                        Name = currentFiscalYear.Name,
                        StartDate = currentFiscalYear.StartDate,
                        EndDate = currentFiscalYear.EndDate,
                        IsActive = currentFiscalYear.IsActive,
                        DateFormat = currentFiscalYear.DateFormat
                    } : null,
                    UserPreferences = new UserPreferencesDTO
                    {
                        Theme = user?.Preferences?.Theme.ToString() ?? "light"
                    },
                    Permissions = new PermissionsDTO
                    {
                        IsAdminOrSupervisor = isAdmin || userRole == "Supervisor"
                    }
                };

                _logger.LogInformation("Successfully fetched sales return data for Company: {CompanyId}", companyId);
                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetSalesReturnDataAsync for Company: {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<string> GetNextSalesReturnBillNumberAsync(Guid companyId, Guid fiscalYearId)
        {
            return await _billNumberService.GetNextBillNumberAsync(companyId, fiscalYearId, "salesReturn");
        }
        public async Task<string> GetCurrentSalesReturnBillNumberAsync(Guid companyId, Guid fiscalYearId)
        {
            return await _billNumberService.GetCurrentBillNumberAsync(companyId, fiscalYearId, "salesReturn");
        }

        public async Task<SalesBillData?> GetSalesBillByNumberAsync(string billNumber, Guid companyId, Guid fiscalYearId)
        {
            try
            {
                _logger.LogInformation("GetSalesBillByNumberAsync called for BillNumber: {BillNumber}, Company: {CompanyId}, FiscalYear: {FiscalYearId}",
                    billNumber, companyId, fiscalYearId);

                if (string.IsNullOrEmpty(billNumber))
                    throw new ArgumentException("Bill number is required");

                // Find the sales bill by number
                var salesBill = await _context.SalesBills
                    .Include(sb => sb.Account)
                    .Include(sb => sb.User)
                    .Include(sb => sb.Items)
                        .ThenInclude(i => i.Item)
                            .ThenInclude(it => it.Unit)
                    .Include(sb => sb.Items)
                        .ThenInclude(i => i.Item)
                            .ThenInclude(it => it.Category)
                    .Include(sb => sb.Items)
                        .ThenInclude(i => i.Unit)
                    .FirstOrDefaultAsync(sb => sb.BillNumber == billNumber &&
                                              sb.CompanyId == companyId &&
                                              sb.PurchaseSalesType == "Sales" &&
                                              sb.FiscalYearId == fiscalYearId);

                if (salesBill == null)
                    return null;

                // Check if this is a cash sales bill
                if (!string.IsNullOrEmpty(salesBill.CashAccount))
                {
                    throw new InvalidOperationException($"Bill {billNumber} is a Cash Sales bill. Cash sales returns should be created from Cash Sales Return section.")
                    {
                        Data = {
                    ["IsCashSales"] = true,
                    ["BillType"] = "cash",
                    ["CashAccount"] = salesBill.CashAccount,
                    ["CashAccountAddress"] = salesBill.CashAccountAddress ?? string.Empty,
                    ["CashAccountPan"] = salesBill.CashAccountPan ?? string.Empty,
                    ["CashAccountEmail"] = salesBill.CashAccountEmail ?? string.Empty,
                    ["CashAccountPhone"] = salesBill.CashAccountPhone ?? string.Empty
                }
                    };
                }

                // Check if this is a credit sales bill (should have account)
                if (salesBill.Account == null)
                {
                    throw new InvalidOperationException($"Bill {billNumber} is not a valid credit sales bill. Account information is missing.")
                    {
                        Data = { ["IsCreditSales"] = false }
                    };
                }

                // Check if this bill already has returns
                var existingReturns = await _context.SalesReturns
                    .Where(sr => sr.OriginalSalesBillId == salesBill.Id && sr.CompanyId == companyId)
                    .Select(sr => new
                    {
                        sr.BillNumber,
                        sr.Date,
                        sr.TotalAmount
                    })
                    .ToListAsync();

                // Get return items for quantity calculation
                var returnItems = await _context.SalesReturnItems
                    .Include(sri => sri.SalesReturn)
                    .Where(sri => sri.SalesReturn.CompanyId == companyId &&
                                 sri.SalesReturn.OriginalSalesBillId == salesBill.Id)
                    .ToListAsync();

                // Calculate returned quantities for each item
                var returnedQuantities = new Dictionary<string, decimal>();
                foreach (var returnItem in returnItems)
                {
                    var key = $"{returnItem.ItemId}_{returnItem.BatchNumber}";
                    if (!returnedQuantities.ContainsKey(key))
                        returnedQuantities[key] = 0;
                    returnedQuantities[key] += returnItem.Quantity;
                }

                // Process items for the response
                var processedItems = new List<SalesBillItemDTO>();
                decimal totalItems = 0;
                decimal totalAvailableItems = 0;
                bool isFullyReturned = true;

                foreach (var item in salesBill.Items)
                {
                    var itemData = item.Item;
                    var key = $"{item.ItemId}_{item.BatchNumber}";
                    var returnedQty = returnedQuantities.GetValueOrDefault(key, 0);
                    var availableQty = Math.Max(0, item.Quantity - returnedQty);

                    totalItems += item.Quantity;
                    totalAvailableItems += availableQty;

                    if (availableQty > 0)
                        isFullyReturned = false;

                    // Create item DTO with ALL properties populated
                    var itemDto = new SalesBillItemDTO
                    {
                        Id = item.Id,
                        ItemId = item.ItemId,
                        ItemName = itemData?.Name,
                        Hscode = itemData?.Hscode,           // THIS WAS MISSING
                        UniqueNumber = itemData?.UniqueNumber, // THIS WAS MISSING
                        UnitId = item.UnitId,
                        UnitName = item.Unit?.Name,           // This will get the unit name
                        Quantity = item.Quantity,
                        Price = item.Price,
                        PuPrice = item.PuPrice,
                        NetPuPrice = item.NetPuPrice,
                        Mrp = item.Mrp,
                        DiscountPercentagePerItem = item.DiscountPercentagePerItem,
                        DiscountAmountPerItem = item.DiscountAmountPerItem,
                        NetPrice = item.NetPrice,
                        BatchNumber = item.BatchNumber,
                        ExpiryDate = item.ExpiryDate,
                        VatStatus = item.VatStatus,
                        UniqueUuid = item.UniqueUuid,
                        PurchaseBillId = item.PurchaseBillId,
                        Item = itemData != null ? new ItemDetailsDTO
                        {
                            Id = itemData.Id,
                            Name = itemData.Name,
                            Hscode = itemData.Hscode,
                            UniqueNumber = itemData.UniqueNumber,
                            UnitId = itemData.UnitId,
                            UnitName = itemData.Unit?.Name,
                            CategoryId = itemData.CategoryId,
                            CategoryName = itemData.Category?.Name,
                            Price = itemData.Price,
                            PuPrice = itemData.PuPrice,
                        } : null
                    };

                    processedItems.Add(itemDto);
                }

                // Create the response DTO
                var billData = new SalesBillData
                {
                    Id = salesBill.Id,
                    BillNumber = salesBill.BillNumber,
                    Account = salesBill.Account != null ? new AccountInfoDTO
                    {
                        Id = salesBill.Account.Id,
                        Name = salesBill.Account.Name,
                        Address = salesBill.Account.Address,
                        Pan = salesBill.Account.Pan,
                        Email = salesBill.Account.Email,
                        Phone = salesBill.Account.Phone
                    } : null,
                    Items = processedItems,
                    SubTotal = salesBill.SubTotal,
                    NonVatSales = salesBill.NonVatSales,
                    TaxableAmount = salesBill.TaxableAmount,
                    DiscountPercentage = salesBill.DiscountPercentage,
                    DiscountAmount = salesBill.DiscountAmount,
                    RoundOffAmount = salesBill.RoundOffAmount,
                    VatPercentage = salesBill.VatPercentage,
                    VatAmount = salesBill.VatAmount,
                    TotalAmount = salesBill.TotalAmount,
                    IsVatExempt = salesBill.IsVatExempt,
                    PaymentMode = salesBill.PaymentMode ?? string.Empty,
                    NepaliDate = salesBill.nepaliDate,
                    Date = salesBill.Date,
                    TransactionDateNepali = salesBill.transactionDateNepali,
                    TransactionDate = salesBill.TransactionDate,
                    User = salesBill.User != null ? new UserInfoDTO
                    {
                        Id = salesBill.User.Id,
                        Name = salesBill.User.Name,
                        Email = salesBill.User.Email,
                        IsAdmin = salesBill.User.IsAdmin,
                        Preferences = salesBill.User.Preferences != null ? new UserPreferencesDTO
                        {
                            Theme = salesBill.User.Preferences.Theme.ToString()
                        } : new UserPreferencesDTO()
                    } : null
                };

                return billData;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetSalesBillByNumberAsync for BillNumber: {BillNumber}", billNumber);
                throw;
            }
        }

        public async Task<SalesReturn> CreateSalesReturnAsync(CreateSalesReturnDTO dto, Guid userId, Guid companyId, Guid fiscalYearId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                _logger.LogInformation("CreateSalesReturnAsync started for Company: {CompanyId}, User: {UserId}", companyId, userId);

                // Validate company and fiscal year
                var company = await _context.Companies.FindAsync(companyId);
                if (company == null)
                    throw new ArgumentException("Company not found");

                var fiscalYear = await _context.FiscalYears.FindAsync(fiscalYearId);
                if (fiscalYear == null || fiscalYear.CompanyId != companyId)
                    throw new ArgumentException("Invalid fiscal year");

                var defaultStore = await GetDefaultStoreAsync(companyId);
                var defaultRack = defaultStore != null ? await GetDefaultRackAsync(defaultStore.Id) : null;

                // Get default accounts
                var salesAccountId = await GetDefaultAccountIdAsync("Sales", companyId);
                var vatAccountId = await GetDefaultAccountIdAsync("VAT", companyId);
                var roundOffAccountId = await GetDefaultAccountIdAsync("Rounded Off", companyId);
                var cashAccountId = await GetDefaultAccountIdAsync("Cash in Hand", companyId);

                // Parse payment mode
                var paymentMode = ParsePaymentMode(dto.PaymentMode);

                // Get next return number
                var returnNumber = await _billNumberService.GetNextBillNumberAsync(companyId, fiscalYearId, "salesReturn");

                // Validate account (party account - Sundry Debtors for credit sales)
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

                // Load all items at once
                var itemIds = dto.Items.Select(i => i.ItemId).Distinct().ToList();
                var itemsDict = await _context.Items
                    .Include(i => i.StockEntries)
                    .Where(i => itemIds.Contains(i.Id))
                    .ToDictionaryAsync(i => i.Id);

                // Calculate total return amount
                decimal totalReturnAmount = dto.TotalAmount ?? 0;
                decimal salesReturnAmount = (dto.TaxableAmount ?? 0) + (dto.NonVatSalesReturn ?? 0);

                // Determine if company uses Nepali date format
                bool isNepaliFormat = company.DateFormat?.ToString().ToLower() == "nepali";

                // Generate a unique ID for the stock entry
                var uniqueId = Guid.NewGuid().ToString();

                // Create sales return bill FIRST (so it has an ID)
                var salesReturn = new SalesReturn
                {
                    Id = Guid.NewGuid(),
                    CompanyId = companyId,
                    UserId = userId,
                    BillNumber = returnNumber,
                    PurchaseSalesReturnType = "Sales Return",
                    Type = "SlRt",
                    OriginalSalesBillId = dto.OriginalSalesBillId,
                    OriginalSalesBillNumber = dto.OriginalSalesBillNumber,
                    AccountId = dto.AccountId,
                    CashAccount = dto.CashAccount,
                    CashAccountAddress = dto.CashAccountAddress,
                    CashAccountPan = dto.CashAccountPan,
                    CashAccountEmail = dto.CashAccountEmail,
                    CashAccountPhone = dto.CashAccountPhone,
                    UnitId = dto.UnitId,
                    SettingsId = dto.SettingsId,
                    FiscalYearId = fiscalYearId,
                    SubTotal = dto.SubTotal ?? 0,
                    NonVatSalesReturn = dto.NonVatSalesReturn ?? 0,
                    TaxableAmount = dto.TaxableAmount ?? 0,
                    DiscountPercentage = dto.DiscountPercentage ?? 0,
                    DiscountAmount = dto.DiscountAmount ?? 0,
                    VatPercentage = dto.VatPercentage,
                    VatAmount = dto.VatAmount ?? 0,
                    TotalAmount = totalReturnAmount,
                    IsVatExempt = isVatExemptBool,
                    IsVatAll = isVatAll ? "all" : null,
                    RoundOffAmount = dto.RoundOffAmount ?? 0,
                    PaymentMode = dto.PaymentMode,
                    Quantity = dto.Quantity,
                    Price = dto.Price,
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

                await _context.SalesReturns.AddAsync(salesReturn);

                // Track totals for header transactions
                decimal totalPartyCredit = 0;
                decimal totalSalesDebit = 0;
                decimal totalVatDebit = 0;

                // Store item calculations for transaction items
                var itemCalculations = new List<SalesReturnItemCalculation>();

                var returnItems = new List<SalesReturnItem>();

                // PROCESS ITEMS IN MEMORY
                decimal overallDiscountPercentage = dto.DiscountPercentage ?? 0m;

                foreach (var itemDto in dto.Items)
                {
                    if (!itemsDict.TryGetValue(itemDto.ItemId, out var item))
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

                    // Try to find a matching sales bill item to get original values
                    var matchingSalesItem = await _context.SalesBillItems
                        .Include(sbi => sbi.SalesBill)
                        .Where(sbi => sbi.ItemId == itemDto.ItemId
                            && sbi.Price == itemDto.Price
                            && sbi.SalesBill.CompanyId == companyId)
                        .OrderByDescending(sbi => sbi.CreatedAt)
                        .FirstOrDefaultAsync();

                    decimal salesPrice = itemDto.Price;
                    decimal puPrice = itemDto.Price;
                    decimal mrp = itemDto.Price;
                    decimal marginPercentage = itemDto.MarginPercentage;
                    string batchNumber = itemDto.BatchNumber ?? "XXX";
                    DateOnly? expiryDate = itemDto.ExpiryDate;

                    if (matchingSalesItem != null)
                    {
                        salesPrice = matchingSalesItem.Price;
                        puPrice = matchingSalesItem.PuPrice ?? matchingSalesItem.Price;
                        marginPercentage = matchingSalesItem.MarginPercentage;
                        mrp = matchingSalesItem.Mrp ?? matchingSalesItem.Price;
                        batchNumber = matchingSalesItem.BatchNumber ?? batchNumber;
                        expiryDate = matchingSalesItem.ExpiryDate ?? expiryDate;
                    }

                    // Calculate values
                    decimal totalSalesValueBeforeDiscount = salesPrice * itemDto.Quantity;
                    decimal discountAmountForItem = (totalSalesValueBeforeDiscount * overallDiscountPercentage) / 100m;
                    decimal itemValueAfterDiscount = totalSalesValueBeforeDiscount - discountAmountForItem;

                    // Calculate item-wise VAT
                    decimal itemTaxableAmount = 0m;
                    decimal itemVatPercentage = dto.VatPercentage;
                    decimal itemVatAmount = 0m;

                    if (!isVatExemptBool && itemVatPercentage > 0 && item.VatStatus?.ToLower() == "vatable")
                    {
                        itemTaxableAmount = itemValueAfterDiscount;
                        itemVatAmount = (itemTaxableAmount * itemVatPercentage) / 100m;
                    }

                    // Update totals
                    totalPartyCredit += itemValueAfterDiscount + itemVatAmount;  // Party gets CREDIT (reduction in receivable)
                    totalSalesDebit += itemValueAfterDiscount;                   // Sales account gets DEBIT (reduction in revenue)
                    totalVatDebit += itemVatAmount;                              // VAT account gets DEBIT (reduction in output VAT)

                    var netPrice = salesPrice - (salesPrice * overallDiscountPercentage / 100);
                    var netPuPrice = puPrice - (puPrice * overallDiscountPercentage / 100);

                    // ADD STOCK ENTRY (ADDING stock back for returns - POSITIVE quantity)
                    var stockEntry = new StockEntry
                    {
                        Id = Guid.NewGuid(),
                        ItemId = item.Id,
                        Quantity = itemDto.Quantity,
                        Price = salesPrice,
                        PuPrice = puPrice,
                        MarginPercentage = marginPercentage,
                        Mrp = mrp,
                        NetPrice = netPrice,
                        NetPuPrice = netPuPrice,
                        DiscountPercentagePerItem = overallDiscountPercentage,
                        DiscountAmountPerItem = discountAmountForItem,
                        BatchNumber = batchNumber,
                        ExpiryDate = expiryDate ?? DateOnly.FromDateTime(DateTime.Now.AddYears(2)),
                        Date = isNepaliFormat ? dto.NepaliDate : dto.Date,
                        UniqueUuid = uniqueId,
                        SalesReturnBillId = salesReturn.Id,
                        FiscalYearId = fiscalYearId,
                        StoreId = itemDto.StoreId ?? defaultStore?.Id,
                        RackId = itemDto.RackId ?? defaultRack?.Id,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };

                    _context.StockEntries.Add(stockEntry);

                    // CREATE SALES RETURN ITEM
                    var returnItem = new SalesReturnItem
                    {
                        Id = Guid.NewGuid(),
                        SalesReturnId = salesReturn.Id,
                        ItemId = itemDto.ItemId,
                        UnitId = itemDto.UnitId,
                        Quantity = itemDto.Quantity,
                        Price = salesPrice,
                        PuPrice = puPrice,
                        MarginPercentage = marginPercentage,
                        Mrp = mrp,
                        NetPrice = netPrice,
                        NetPuPrice = netPuPrice,
                        DiscountPercentagePerItem = overallDiscountPercentage,
                        DiscountAmountPerItem = discountAmountForItem,
                        BatchNumber = batchNumber,
                        ExpiryDate = expiryDate ?? DateOnly.FromDateTime(DateTime.Now.AddYears(2)),
                        VatStatus = item.VatStatus ?? "vatable",
                        UniqueUuid = uniqueId,
                        CreatedAt = isNepaliFormat ? dto.NepaliDate : dto.Date,
                        UpdatedAt = isNepaliFormat ? dto.NepaliDate : dto.Date
                    };

                    _context.SalesReturnItems.Add(returnItem);
                    returnItems.Add(returnItem);

                    // Store calculation for transaction items
                    itemCalculations.Add(new SalesReturnItemCalculation
                    {
                        ItemId = itemDto.ItemId,
                        UnitId = itemDto.UnitId,
                        WsUnit = 1,
                        Quantity = itemDto.Quantity,
                        Price = salesPrice,
                        PuPrice = puPrice,
                        DiscountPercentagePerItem = overallDiscountPercentage,
                        DiscountAmountPerItem = discountAmountForItem,
                        NetPuPrice = netPuPrice,
                        TaxableAmount = itemTaxableAmount,
                        VatPercentage = itemVatPercentage,
                        VatAmount = itemVatAmount,
                        ItemValueAfterDiscount = itemValueAfterDiscount
                    });
                }

                // VAT validation
                if (dto.IsVatExempt != "all")
                {
                    if (isVatExemptBool && hasVatableItems)
                        throw new InvalidOperationException("Cannot save VAT exempt bill with vatable items");

                    if (!isVatExemptBool && hasNonVatableItems)
                        throw new InvalidOperationException("Cannot save bill with non-vatable items when VAT is applied");
                }

                // Save items and stock entries
                await _context.SaveChangesAsync();

                // ========== CREATE HEADER TRANSACTIONS WITH TRANSACTION ITEMS ==========

                // 1. PARTY ACCOUNT TRANSACTION (Header - Credit to party - reduction in receivable)
                if (dto.AccountId != Guid.Empty && totalPartyCredit > 0)
                {
                    var partyTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        AccountId = dto.AccountId,
                        SalesReturnBillId = salesReturn.Id,
                        BillNumber = salesReturn.BillNumber,
                        IsType = TransactionIsType.SlRt,
                        Type = TransactionType.SlRt,
                        PurchaseSalesReturnType = "Sales Return",
                        TotalDebit = 0,
                        TotalCredit = dto.TotalAmount ?? 0,
                        TaxableAmount = dto.TaxableAmount,
                        VatPercentage = dto.VatPercentage,
                        VatAmount = dto.VatAmount,
                        PaymentMode = paymentMode,
                        Date = salesReturn.TransactionDate,
                        BillDate = salesReturn.Date,
                        nepaliDate = dto.NepaliDate,
                        transactionDateNepali = dto.TransactionDateNepali,
                        FiscalYearId = fiscalYearId,
                        CreatedAt = DateTime.UtcNow,
                        Status = TransactionStatus.Active,
                        IsActive = true
                    };

                    await _context.Transactions.AddAsync(partyTransaction);

                    // Add Transaction Items for Party Transaction
                    foreach (var calc in itemCalculations)
                    {
                        var transactionItem = new TransactionItem
                        {
                            Id = Guid.NewGuid(),
                            TransactionId = partyTransaction.Id,
                            ItemId = calc.ItemId,
                            UnitId = calc.UnitId,
                            WSUnit = calc.WsUnit,
                            Quantity = calc.Quantity,
                            Price = calc.Price,
                            PuPrice = calc.PuPrice,
                            DiscountPercentagePerItem = calc.DiscountPercentagePerItem,
                            DiscountAmountPerItem = calc.DiscountAmountPerItem,
                            NetPuPrice = calc.NetPuPrice ?? 0,
                            TaxableAmount = calc.TaxableAmount,
                            VatPercentage = calc.VatPercentage,
                            VatAmount = calc.VatAmount,
                            Debit = 0,
                            Credit = calc.ItemValueAfterDiscount + calc.VatAmount,
                            CreatedAt = DateTime.UtcNow
                        };
                        await _context.TransactionItems.AddAsync(transactionItem);
                    }

                    _logger.LogInformation("Created Party transaction: TotalCredit {Amount}", totalPartyCredit);
                }

                // 2. SALES ACCOUNT TRANSACTION (Header - Debit to Sales account - reduction in revenue)
                if (salesAccountId.HasValue && totalSalesDebit > 0)
                {
                    var salesTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        AccountId = salesAccountId.Value,
                        SalesReturnBillId = salesReturn.Id,
                        BillNumber = salesReturn.BillNumber,
                        Type = TransactionType.SlRt,
                        PurchaseSalesReturnType = "Sales Return",
                        TotalDebit = totalSalesDebit,
                        TotalCredit = 0,
                        TaxableAmount = dto.TaxableAmount,
                        VatPercentage = dto.VatPercentage,
                        VatAmount = dto.VatAmount,
                        PaymentMode = paymentMode,
                        Date = salesReturn.TransactionDate,
                        BillDate = salesReturn.Date,
                        nepaliDate = dto.NepaliDate,
                        transactionDateNepali = dto.TransactionDateNepali,
                        FiscalYearId = fiscalYearId,
                        CreatedAt = DateTime.UtcNow,
                        Status = TransactionStatus.Active,
                        IsActive = true
                    };

                    await _context.Transactions.AddAsync(salesTransaction);

                    // Add Transaction Items for Sales Transaction
                    foreach (var calc in itemCalculations)
                    {
                        var transactionItem = new TransactionItem
                        {
                            Id = Guid.NewGuid(),
                            TransactionId = salesTransaction.Id,
                            ItemId = calc.ItemId,
                            UnitId = calc.UnitId,
                            WSUnit = calc.WsUnit,
                            Quantity = calc.Quantity,
                            Price = calc.Price,
                            PuPrice = calc.PuPrice,
                            DiscountPercentagePerItem = calc.DiscountPercentagePerItem,
                            DiscountAmountPerItem = calc.DiscountAmountPerItem,
                            NetPuPrice = calc.NetPuPrice ?? 0,
                            TaxableAmount = calc.TaxableAmount,
                            VatPercentage = calc.VatPercentage,
                            VatAmount = calc.VatAmount,
                            Debit = calc.ItemValueAfterDiscount,
                            Credit = 0,
                            CreatedAt = DateTime.UtcNow
                        };
                        await _context.TransactionItems.AddAsync(transactionItem);
                    }

                    _logger.LogInformation("Created Sales account transaction: TotalDebit {Amount}", totalSalesDebit);
                }

                // 3. VAT TRANSACTION (Header - Debit to VAT account - reduction in output VAT)
                if (totalVatDebit > 0 && vatAccountId.HasValue && !isVatExemptBool)
                {
                    var vatTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        AccountId = vatAccountId.Value,
                        SalesReturnBillId = salesReturn.Id,
                        BillNumber = salesReturn.BillNumber,
                        IsType = TransactionIsType.VAT,
                        Type = TransactionType.SlRt,
                        PurchaseSalesReturnType = "Sales Return",
                        TotalDebit = totalVatDebit,
                        TotalCredit = 0,
                        TaxableAmount = dto.TaxableAmount,
                        VatPercentage = dto.VatPercentage,
                        VatAmount = totalVatDebit,
                        PaymentMode = paymentMode,
                        Date = salesReturn.TransactionDate,
                        BillDate = salesReturn.Date,
                        nepaliDate = dto.NepaliDate,
                        transactionDateNepali = dto.TransactionDateNepali,
                        FiscalYearId = fiscalYearId,
                        CreatedAt = DateTime.UtcNow,
                        Status = TransactionStatus.Active,
                        IsActive = true
                    };

                    await _context.Transactions.AddAsync(vatTransaction);

                    // Add Transaction Items for VAT Transaction
                    foreach (var calc in itemCalculations.Where(c => c.VatAmount > 0))
                    {
                        var transactionItem = new TransactionItem
                        {
                            Id = Guid.NewGuid(),
                            TransactionId = vatTransaction.Id,
                            ItemId = calc.ItemId,
                            UnitId = calc.UnitId,
                            WSUnit = calc.WsUnit,
                            Quantity = calc.Quantity,
                            Price = calc.Price,
                            PuPrice = calc.PuPrice,
                            DiscountPercentagePerItem = calc.DiscountPercentagePerItem,
                            DiscountAmountPerItem = calc.DiscountAmountPerItem,
                            NetPuPrice = calc.NetPuPrice ?? 0,
                            TaxableAmount = calc.TaxableAmount,
                            VatPercentage = calc.VatPercentage,
                            VatAmount = calc.VatAmount,
                            Debit = calc.VatAmount,
                            Credit = 0,
                            CreatedAt = DateTime.UtcNow
                        };
                        await _context.TransactionItems.AddAsync(transactionItem);
                    }

                    _logger.LogInformation("Created VAT transaction: TotalDebit {Amount}", totalVatDebit);
                }

                // 4. ROUND-OFF TRANSACTION if applicable
                if (dto.RoundOffAmount != 0 && roundOffAccountId.HasValue)
                {
                    var roundOffTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        AccountId = roundOffAccountId.Value,
                        SalesReturnBillId = salesReturn.Id,
                        BillNumber = salesReturn.BillNumber,
                        IsType = TransactionIsType.RoundOff,
                        Type = TransactionType.SlRt,
                        PurchaseSalesReturnType = "Sales Return",
                        TotalDebit = dto.RoundOffAmount > 0 ? dto.RoundOffAmount.Value : 0,
                        TotalCredit = dto.RoundOffAmount < 0 ? Math.Abs(dto.RoundOffAmount.Value) : 0,
                        PaymentMode = paymentMode,
                        Date = salesReturn.TransactionDate,
                        BillDate = salesReturn.Date,
                        nepaliDate = dto.NepaliDate,
                        transactionDateNepali = dto.TransactionDateNepali,
                        FiscalYearId = fiscalYearId,
                        CreatedAt = DateTime.UtcNow,
                        Status = TransactionStatus.Active,
                        IsActive = true
                    };

                    await _context.Transactions.AddAsync(roundOffTransaction);
                    _logger.LogInformation("Created Round-off transaction");
                }

                // 5. CASH TRANSACTION if payment mode is cash (Credit - Money going OUT)
                if (paymentMode == PaymentMode.Cash && cashAccountId.HasValue && totalReturnAmount > 0)
                {
                    var cashTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        AccountId = cashAccountId.Value,
                        SalesReturnBillId = salesReturn.Id,
                        BillNumber = salesReturn.BillNumber,
                        Type = TransactionType.SlRt,
                        PurchaseSalesReturnType = "Sales Return",
                        TotalDebit = 0,
                        TotalCredit = totalReturnAmount,
                        PaymentMode = PaymentMode.Cash,
                        Date = salesReturn.TransactionDate,
                        BillDate = salesReturn.Date,
                        nepaliDate = dto.NepaliDate,
                        transactionDateNepali = dto.TransactionDateNepali,
                        FiscalYearId = fiscalYearId,
                        CreatedAt = DateTime.UtcNow,
                        Status = TransactionStatus.Active,
                        IsActive = true
                    };

                    await _context.Transactions.AddAsync(cashTransaction);
                    _logger.LogInformation("Created Cash transaction: TotalCredit {Amount}", totalReturnAmount);
                }

                // Update sales return with items
                salesReturn.Items = returnItems;

                // SINGLE SAVE CHANGES CALL
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                _logger.LogInformation("Sales return created successfully with ID: {ReturnId}, Number: {ReturnNumber}",
                    salesReturn.Id, salesReturn.BillNumber);

                return salesReturn;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Error creating sales return");
                throw;
            }
        }

        // Helper class for sales return item calculations
        private class SalesReturnItemCalculation
        {
            public Guid ItemId { get; set; }
            public Guid UnitId { get; set; }
            public int? WsUnit { get; set; }
            public decimal Quantity { get; set; }
            public decimal Price { get; set; }
            public decimal? PuPrice { get; set; }
            public decimal DiscountPercentagePerItem { get; set; }
            public decimal DiscountAmountPerItem { get; set; }
            public decimal? NetPuPrice { get; set; }
            public decimal TaxableAmount { get; set; }
            public decimal VatPercentage { get; set; }
            public decimal VatAmount { get; set; }
            public decimal ItemValueAfterDiscount { get; set; }
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

        public async Task<SalesReturnFindsDTO> GetSalesReturnFindsAsync(Guid companyId, Guid fiscalYearId, Guid userId)
        {
            try
            {
                _logger.LogInformation("GetSalesReturnFindsAsync called for Company: {CompanyId}, FiscalYear: {FiscalYearId}, User: {UserId}",
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
                var latestBillQuery = _context.SalesReturns
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
                var response = new SalesReturnFindsDTO
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

                _logger.LogInformation("Successfully retrieved sales return finds data for Company: {CompanyId}", companyId);

                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetSalesReturnFindsAsync for Company: {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<SalesReturnPartyInfoDTO?> GetSalesReturnPartyInfoAsync(string billNumber, Guid companyId, Guid fiscalYearId)
        {
            try
            {
                _logger.LogInformation($"Getting party info for credit sales: {billNumber}, Company: {companyId}, FiscalYear: {fiscalYearId}");

                // Find the purchase bill with account information
                var creditSalesReturnBill = await _context.SalesReturns
                    .Include(sr => sr.Account)
                    .Where(sr => sr.BillNumber == billNumber &&
                                sr.CompanyId == companyId &&
                                sr.FiscalYearId == fiscalYearId)
                    .Select(sr => new SalesReturnPartyInfoDTO
                    {
                        BillNumber = sr.BillNumber,
                        Date = sr.Date,
                        PaymentMode = sr.PaymentMode,
                        AccountId = sr.AccountId ?? Guid.Empty,
                        AccountName = sr.Account != null ? sr.Account.Name : string.Empty,
                        AccountAddress = sr.Account != null ? sr.Account.Address : string.Empty,
                        AccountPan = sr.Account != null ? sr.Account.Pan : string.Empty,
                        AccountUniqueNumber = sr.Account != null ? sr.Account.UniqueNumber : null
                    })
                    .FirstOrDefaultAsync();

                if (creditSalesReturnBill == null)
                {
                    _logger.LogWarning($"Credit sales return bill not found: {billNumber}");
                    return null;
                }

                _logger.LogInformation($"Successfully retrieved party info for bill: {billNumber}");
                return creditSalesReturnBill;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting credit sales party info for bill: {billNumber}");
                throw;
            }
        }


        // public async Task<ChangeSalesReturnPartyResponseDTO> ChangeSalesReturnPartyAsync(string billNumber, Guid newAccountId, Guid companyId, Guid fiscalYearId, Guid userId)
        // {
        //     _logger.LogInformation($"Changing party for credit sales: {billNumber} to new account: {newAccountId}");

        //     // Start a database transaction to ensure data consistency
        //     using var dbTransaction = await _context.Database.BeginTransactionAsync();

        //     try
        //     {
        //         // 1. Verify the new account exists, is active, and is a party account
        //         var newAccount = await VerifyAndGetPartyAccountAsync(newAccountId, companyId);

        //         // 2. Get the original sales return bill with account
        //         var originalBill = await _context.SalesReturns
        //             .Include(sr => sr.Account)
        //             .Include(sr => sr.Items)
        //             .FirstOrDefaultAsync(sr => sr.BillNumber == billNumber &&
        //                                        sr.CompanyId == companyId &&
        //                                        sr.FiscalYearId == fiscalYearId);

        //         if (originalBill == null)
        //         {
        //             throw new Exception("Voucher not found");
        //         }

        //         // Check if party is actually changed
        //         if (originalBill.AccountId == newAccountId)
        //         {
        //             throw new Exception("Selected party is same as current party");
        //         }

        //         var oldAccountId = originalBill.AccountId;
        //         var oldAccountName = originalBill.Account?.Name ?? "Unknown";

        //         // 3. Calculate amounts
        //         var totalAmount = originalBill.TotalAmount;
        //         var taxableAmount = originalBill.TaxableAmount;
        //         var NonVatSalesReturn = originalBill.NonVatSalesReturn;
        //         var vatAmount = originalBill.VatAmount;
        //         var roundOffAmount = originalBill.RoundOffAmount;
        //         var creditSalesAmount = taxableAmount + NonVatSalesReturn;

        //         // 4. Get purchase account ID
        //         var creditSalesReturnAccountId = await GetDefaultAccountIdAsync("Sales Return", companyId);
        //         var vatAccountId = await GetDefaultAccountIdAsync("VAT", companyId);
        //         var roundOffAccountId = await GetDefaultAccountIdAsync("Rounded Off", companyId);

        //         // Parse payment mode
        //         var paymentMode = ParsePaymentMode(originalBill.PaymentMode ?? "Credit");

        //         // 5. Get all transactions linked to this sales return bill
        //         var transactions = await _context.Transactions
        //             .Where(t => t.SalesReturnBillId == originalBill.Id &&
        //                        t.CompanyId == companyId &&
        //                        t.FiscalYearId == fiscalYearId &&
        //                        t.Status == TransactionStatus.Active)
        //             .ToListAsync();

        //         _logger.LogInformation($"Found {transactions.Count} transactions for bill {billNumber}");

        //         // 6. Update purchase bill with new account
        //         originalBill.AccountId = newAccountId;
        //         originalBill.UpdatedAt = DateTime.UtcNow;
        //         originalBill.PurchaseSalesReturnType = "Sales Return"; // Update purchase type with new party name

        //         // 7. Process each transaction
        //         foreach (var trans in transactions)
        //         {
        //             // Check if this is the main party transaction (old party)
        //             // Party transaction is identified by having AccountId = oldAccountId AND Debit = 0, Credit = totalAmount
        //             var isMainPartyTransaction = trans.AccountId == oldAccountId &&
        //                                          trans.Debit == 0 &&
        //                                          trans.Credit == totalAmount &&
        //                                          trans.Type == TransactionType.SlRt;

        //             if (isMainPartyTransaction)
        //             {
        //                 // Update to new party - Party account should be CREDIT side
        //                 trans.AccountId = newAccountId;
        //                 trans.PurchaseSalesReturnType = "Sales Return";
        //                 trans.UpdatedAt = DateTime.UtcNow;

        //                 _logger.LogInformation($"Updated main party transaction {trans.Id} from account {oldAccountId} to {newAccountId}");
        //             }
        //             // Check if this is a purchase account transaction
        //             else if (creditSalesReturnAccountId.HasValue && trans.AccountId == creditSalesReturnAccountId.Value)
        //             {
        //                 trans.PurchaseSalesReturnType = "Sales Return";
        //                 trans.UpdatedAt = DateTime.UtcNow;

        //                 _logger.LogInformation($"Updated credit sales account transaction {trans.Id} with new party name: {newAccount.Name}");
        //             }
        //             // Check if this is a VAT transaction
        //             else if (vatAccountId.HasValue && trans.AccountId == vatAccountId.Value && trans.IsType == TransactionIsType.VAT)
        //             {
        //                 trans.PurchaseSalesReturnType = "Sales Return";
        //                 trans.UpdatedAt = DateTime.UtcNow;

        //                 _logger.LogInformation($"Updated VAT transaction {trans.Id} with new party name: {newAccount.Name}");
        //             }
        //             // Check if this is a RoundOff transaction
        //             else if (roundOffAccountId.HasValue && trans.AccountId == roundOffAccountId.Value && trans.IsType == TransactionIsType.RoundOff)
        //             {
        //                 trans.PurchaseSalesReturnType = "Sales Return";
        //                 trans.UpdatedAt = DateTime.UtcNow;

        //                 _logger.LogInformation($"Updated RoundOff transaction {trans.Id} with new party name: {newAccount.Name}");
        //             }
        //             // Check if this is a cash transaction (if payment mode was cash)
        //             else if (trans.PaymentMode == PaymentMode.Cash && trans.Debit == 0 && trans.Credit == totalAmount)
        //             {
        //                 trans.PurchaseSalesReturnType = "Sales Return";
        //                 trans.UpdatedAt = DateTime.UtcNow;

        //                 _logger.LogInformation($"Updated cash transaction {trans.Id} with new party name: {newAccount.Name}");
        //             }
        //             // For any other transactions linked to items (item-level party transactions)
        //             else if (trans.ItemId.HasValue && trans.Type == TransactionType.Purc)
        //             {
        //                 // These are the item-level party transactions created in CreatesalesBillAsync
        //                 trans.AccountId = newAccountId; // Update the account to new party
        //                 trans.PurchaseSalesReturnType = "Sales Return";
        //                 trans.UpdatedAt = DateTime.UtcNow;

        //                 _logger.LogInformation($"Updated item-level party transaction {trans.Id} for item {trans.ItemId}");
        //             }
        //         }

        //         // 8. Save changes
        //         await _context.SaveChangesAsync();

        //         // 9. Commit transaction
        //         await dbTransaction.CommitAsync();

        //         _logger.LogInformation($"Successfully changed party for bill: {billNumber} from {oldAccountName} to {newAccount.Name}");

        //         return new ChangeSalesReturnPartyResponseDTO
        //         {
        //             BillNumber = billNumber,
        //             AccountId = newAccountId,
        //             AccountName = newAccount.Name,
        //             Message = $"Party changed successfully from \"{oldAccountName}\" to \"{newAccount.Name}\""
        //         };
        //     }
        //     catch (Exception ex)
        //     {
        //         _logger.LogError(ex, $"Error changing party for bill: {billNumber}");
        //         await dbTransaction.RollbackAsync();
        //         throw;
        //     }
        // }

        public async Task<ChangeSalesReturnPartyResponseDTO> ChangeSalesReturnPartyAsync(string billNumber, Guid newAccountId, Guid companyId, Guid fiscalYearId, Guid userId)
        {
            _logger.LogInformation($"Changing party for sales return: {billNumber} to new account: {newAccountId}");

            // Start a database transaction to ensure data consistency
            using var dbTransaction = await _context.Database.BeginTransactionAsync();

            try
            {
                // 1. Verify the new account exists, is active, and is a party account
                var newAccount = await VerifyAndGetPartyAccountAsync(newAccountId, companyId);

                // 2. Get the original sales return bill with account and items
                var originalBill = await _context.SalesReturns
                    .Include(sr => sr.Account)
                    .Include(sr => sr.Items)
                    .FirstOrDefaultAsync(sr => sr.BillNumber == billNumber &&
                                               sr.CompanyId == companyId &&
                                               sr.FiscalYearId == fiscalYearId);

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
                var totalAmount = originalBill.TotalAmount ?? 0;
                var taxableAmount = originalBill.TaxableAmount ?? 0;
                var nonVatSalesReturn = originalBill.NonVatSalesReturn ?? 0;
                var vatAmount = originalBill.VatAmount ?? 0;
                var roundOffAmount = originalBill.RoundOffAmount ?? 0;
                var salesReturnAmount = taxableAmount + nonVatSalesReturn;

                // 4. Get default account IDs
                var salesReturnAccountId = await GetDefaultAccountIdAsync("Sales Return", companyId);
                var vatAccountId = await GetDefaultAccountIdAsync("VAT", companyId);
                var roundOffAccountId = await GetDefaultAccountIdAsync("Rounded Off", companyId);

                // Parse payment mode
                var paymentMode = ParsePaymentMode(originalBill.PaymentMode ?? "Credit");

                // 5. Get all transactions linked to this sales return bill WITH their transaction items
                var transactions = await _context.Transactions
                    .Where(t => t.SalesReturnBillId == originalBill.Id &&
                               t.CompanyId == companyId &&
                               t.FiscalYearId == fiscalYearId &&
                               t.Status == TransactionStatus.Active)
                    .Include(t => t.TransactionItems) // Include transaction items
                    .ToListAsync();

                _logger.LogInformation($"Found {transactions.Count} transactions for bill {billNumber}");

                // 6. Update sales return bill with new account
                originalBill.AccountId = newAccountId;
                originalBill.UpdatedAt = DateTime.UtcNow;
                originalBill.PurchaseSalesReturnType = "Sales Return";

                // 7. Process each transaction
                foreach (var trans in transactions)
                {
                    // Check if this is the main party transaction (old party)
                    // Party transaction is identified by having AccountId = oldAccountId AND TotalDebit = 0, TotalCredit = totalAmount
                    var isMainPartyTransaction = trans.AccountId == oldAccountId &&
                                                 trans.TotalDebit == 0 &&
                                                 trans.TotalCredit == totalAmount &&
                                                 trans.Type == TransactionType.SlRt;

                    if (isMainPartyTransaction)
                    {
                        // Update to new party - Party account should be CREDIT side (reduction in receivable)
                        trans.AccountId = newAccountId;
                        trans.PurchaseSalesReturnType = "Sales Return";
                        trans.UpdatedAt = DateTime.UtcNow;

                        _logger.LogInformation($"Updated main party transaction {trans.Id} from account {oldAccountId} to {newAccountId}");

                        // Update all transaction items under this transaction
                        foreach (var transactionItem in trans.TransactionItems)
                        {
                            transactionItem.UpdatedAt = DateTime.UtcNow;
                            _logger.LogInformation($"Updated transaction item {transactionItem.Id} under party transaction {trans.Id}");
                        }
                    }
                    // Check if this is a sales return account transaction (Debit to Sales Return account)
                    else if (salesReturnAccountId.HasValue && trans.AccountId == salesReturnAccountId.Value)
                    {
                        trans.PurchaseSalesReturnType = "Sales Return";
                        trans.UpdatedAt = DateTime.UtcNow;

                        // Update transaction items if any
                        foreach (var transactionItem in trans.TransactionItems)
                        {
                            transactionItem.UpdatedAt = DateTime.UtcNow;
                        }

                        _logger.LogInformation($"Updated sales return account transaction {trans.Id} with new party name: {newAccount.Name}");
                    }
                    // Check if this is a VAT transaction (Debit to VAT account)
                    else if (vatAccountId.HasValue && trans.AccountId == vatAccountId.Value && trans.IsType == TransactionIsType.VAT)
                    {
                        trans.PurchaseSalesReturnType = "Sales Return";
                        trans.UpdatedAt = DateTime.UtcNow;

                        // Update transaction items (VAT items per product)
                        foreach (var transactionItem in trans.TransactionItems)
                        {
                            transactionItem.UpdatedAt = DateTime.UtcNow;
                        }

                        _logger.LogInformation($"Updated VAT transaction {trans.Id} with new party name: {newAccount.Name}");
                    }
                    // Check if this is a RoundOff transaction
                    else if (roundOffAccountId.HasValue && trans.AccountId == roundOffAccountId.Value && trans.IsType == TransactionIsType.RoundOff)
                    {
                        trans.PurchaseSalesReturnType = "Sales Return";
                        trans.UpdatedAt = DateTime.UtcNow;

                        _logger.LogInformation($"Updated RoundOff transaction {trans.Id} with new party name: {newAccount.Name}");
                    }
                    // Check if this is a cash transaction (if payment mode was cash)
                    else if (trans.PaymentMode == PaymentMode.Cash && trans.TotalDebit == 0 && trans.TotalCredit == totalAmount)
                    {
                        trans.PurchaseSalesReturnType = "Sales Return";
                        trans.UpdatedAt = DateTime.UtcNow;

                        _logger.LogInformation($"Updated cash transaction {trans.Id} with new party name: {newAccount.Name}");
                    }
                    // For any other transactions that might have items
                    else if (trans.TransactionItems.Any() && trans.Type == TransactionType.SlRt)
                    {
                        // Update the transaction header
                        trans.PurchaseSalesReturnType = "Sales Return";
                        trans.UpdatedAt = DateTime.UtcNow;

                        // Update all transaction items
                        foreach (var transactionItem in trans.TransactionItems)
                        {
                            transactionItem.UpdatedAt = DateTime.UtcNow;
                        }

                        _logger.LogInformation($"Updated transaction {trans.Id} with {trans.TransactionItems.Count} items");
                    }
                }

                // 8. Save changes
                await _context.SaveChangesAsync();

                // 9. Commit transaction
                await dbTransaction.CommitAsync();

                _logger.LogInformation($"Successfully changed party for bill: {billNumber} from {oldAccountName} to {newAccount.Name}");

                return new ChangeSalesReturnPartyResponseDTO
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
        public async Task<SalesReturnBillIdResponseDTO> GetSalesReturnBillIdByNumberAsync(string billNumber, Guid companyId, Guid fiscalYearId)
        {
            try
            {
                _logger.LogInformation($"Getting credit sales return ID for number: {billNumber}, Company: {companyId}, FiscalYear: {fiscalYearId}");

                var creditSalesReturnBill = await _context.SalesReturns
                    .Where(sr => sr.BillNumber == billNumber &&
                                sr.CompanyId == companyId &&
                                sr.FiscalYearId == fiscalYearId)
                    .Select(sr => new SalesReturnBillIdResponseDTO
                    {
                        Id = sr.Id,
                        BillNumber = sr.BillNumber
                    })
                    .FirstOrDefaultAsync();

                if (creditSalesReturnBill == null)
                {
                    _logger.LogWarning($"Credit sales return not found for number: {billNumber}");
                    throw new ArgumentException("Voucher not found");
                }

                _logger.LogInformation($"Successfully retrieved bill ID for number: {billNumber}");
                return creditSalesReturnBill;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting credit sales ID for number: {billNumber}");
                throw;
            }
        }

        public async Task<SalesReturnEditDataDTO> GetSalesReturnEditDataAsync(Guid billId, Guid companyId, Guid fiscalYearId, Guid userId)
        {
            try
            {
                _logger.LogInformation("GetSalesReturnEditDataAsync called for Bill ID: {BillId}, Company: {CompanyId}, FiscalYear: {FiscalYearId}",
                    billId, companyId, fiscalYearId);

                // Get company information including date format and VAT enabled status
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

                // Fetch sales return invoice with all related data - following purchase pattern
                var salesReturnInvoice = await _context.SalesReturns
                    .Include(sr => sr.Account)
                    .Include(sr => sr.OriginalSalesBill)
                    .Include(sr => sr.Unit)
                    .Include(sr => sr.Items)
                        .ThenInclude(i => i.Item)
                            .ThenInclude(it => it.Unit)
                    .Include(sr => sr.Items)
                        .ThenInclude(i => i.Item)
                            .ThenInclude(it => it.Category)
                    .Include(sr => sr.Items)
                        .ThenInclude(i => i.Unit)
                    .FirstOrDefaultAsync(sr => sr.Id == billId &&
                                              sr.CompanyId == companyId &&
                                              sr.FiscalYearId == fiscalYearId);

                if (salesReturnInvoice == null)
                    throw new ArgumentException("Sales return invoice not found or does not belong to the selected company/fiscal year");

                // Map sales return invoice to response DTO using the single mapping method - following purchase pattern
                var salesReturnDto = MapToSalesReturnResponseDTO(salesReturnInvoice, companyDateFormat);

                // Note: Items are already mapped inside MapToSalesReturnResponseDTO
                // No need to manually process items separately

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

                // Fetch accounts - following purchase pattern
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

                // Create response following the same pattern as PurchaseEditDataDTO
                var response = new SalesReturnEditDataDTO
                {
                    Company = company,
                    SalesReturnInvoice = salesReturnDto, // This already includes the mapped items
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

                _logger.LogInformation("Successfully retrieved sales return edit data for Bill ID: {BillId}", billId);

                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting sales return edit data for Bill ID: {BillId}", billId);
                throw;
            }
        }
        private SalesReturnResponseDTO MapToSalesReturnResponseDTO(SalesReturn salesReturn, string companyDateFormat)
        {
            bool isNepaliFormat = companyDateFormat?.ToLower() == "nepali";

            return new SalesReturnResponseDTO
            {
                Id = salesReturn.Id,
                SalesReturnId = salesReturn.Id,
                CompanyId = salesReturn.CompanyId,
                FirstPrinted = salesReturn.FirstPrinted,
                PrintCount = salesReturn.PrintCount,
                PurchaseSalesReturnType = "Sales Return",
                OriginalCopies = salesReturn.OriginalCopies,
                UserId = salesReturn.UserId,
                UserName = salesReturn.User?.Name,
                BillNumber = salesReturn.BillNumber,

                // Original Sales Bill Reference
                OriginalSalesBillId = salesReturn.OriginalSalesBillId,
                OriginalSalesBillNumber = salesReturn.OriginalSalesBillNumber,
                OriginalSalesBill = salesReturn.OriginalSalesBill != null ? new SalesBillData
                {
                    Id = salesReturn.OriginalSalesBill.Id,
                    BillNumber = salesReturn.OriginalSalesBill.BillNumber,
                    TotalAmount = salesReturn.OriginalSalesBill.TotalAmount,
                } : null,

                // Account Information
                AccountId = salesReturn.AccountId,
                AccountName = salesReturn.Account != null ? salesReturn.Account.Name : salesReturn.CashAccount,

                // Cash Account Information
                CashAccount = salesReturn.CashAccount,
                CashAccountAddress = salesReturn.CashAccountAddress,
                CashAccountPan = salesReturn.CashAccountPan,
                CashAccountEmail = salesReturn.CashAccountEmail,
                CashAccountPhone = salesReturn.CashAccountPhone,

                UnitId = salesReturn.UnitId,
                UnitName = salesReturn.Unit?.Name,
                SettingsId = salesReturn.SettingsId,

                FiscalYearId = salesReturn.FiscalYearId,
                FiscalYearName = salesReturn.FiscalYear?.Name,

                // Financial Fields
                SubTotal = salesReturn.SubTotal,
                NonVatSalesReturn = salesReturn.NonVatSalesReturn,
                TaxableAmount = salesReturn.TaxableAmount,
                DiscountPercentage = salesReturn.DiscountPercentage,
                DiscountAmount = salesReturn.DiscountAmount,
                VatPercentage = salesReturn.VatPercentage,
                VatAmount = salesReturn.VatAmount,
                TotalAmount = salesReturn.TotalAmount,
                IsVatExempt = salesReturn.IsVatExempt,
                IsVatAll = salesReturn.IsVatAll,
                RoundOffAmount = salesReturn.RoundOffAmount,
                PaymentMode = salesReturn.PaymentMode,
                Quantity = salesReturn.Quantity,
                Price = salesReturn.Price,

                // Items - mapped inline following purchase pattern
                Items = salesReturn.Items?.Select(item => new SalesReturnItemResponseDTO
                {
                    Id = item.Id,
                    SalesReturnId = item.SalesReturnId,
                    ItemId = item.ItemId,
                    ItemName = item.Item?.Name,
                    Hscode = item.Item?.Hscode,
                    UniqueNumber = item.Item?.UniqueNumber,
                    UnitId = item.UnitId,
                    UnitName = item.Unit?.Name ?? item.Item?.Unit?.Name,
                    Quantity = item.Quantity,
                    Price = item.Price,
                    NetPrice = item.NetPrice,
                    PuPrice = item.PuPrice,
                    DiscountPercentagePerItem = item.DiscountPercentagePerItem,
                    DiscountAmountPerItem = item.DiscountAmountPerItem,
                    NetPuPrice = item.NetPuPrice,
                    BatchNumber = item.BatchNumber,
                    ExpiryDate = item.ExpiryDate,
                    VatStatus = item.VatStatus,
                    UniqueUuid = item.UniqueUuid,
                    CreatedAt = item.CreatedAt,
                    UpdatedAt = item.UpdatedAt
                }).ToList() ?? new List<SalesReturnItemResponseDTO>(),

                // Dates
                NepaliDate = salesReturn.nepaliDate,
                Date = isNepaliFormat ? salesReturn.nepaliDate : salesReturn.Date,
                TransactionDateNepali = salesReturn.transactionDateNepali,
                TransactionDate = salesReturn.TransactionDate,

                // Metadata
                CreatedAt = salesReturn.CreatedAt,
                UpdatedAt = salesReturn.UpdatedAt
            };
        }

        public async Task<SalesReturn> UpdateSalesReturnAsync(Guid id, UpdateSalesReturnDTO dto, Guid companyId, Guid fiscalYearId, Guid userId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                _logger.LogInformation("=== Starting UpdateSalesReturnAsync for Bill ID: {BillId} ===", id);

                // Validate required fields
                if (dto.AccountId == null || dto.AccountId == Guid.Empty)
                    throw new ArgumentException("Account ID is required");

                if (dto.Items == null || !dto.Items.Any())
                    throw new ArgumentException("At least one item is required");

                if (string.IsNullOrEmpty(dto.PaymentMode))
                    throw new ArgumentException("Payment mode is required");

                // Validate calculated amounts are provided
                if (!dto.SubTotal.HasValue || !dto.TaxableAmount.HasValue ||
                    !dto.NonVatSalesReturn.HasValue || !dto.TotalAmount.HasValue)
                {
                    throw new ArgumentException("SubTotal, TaxableAmount, NonVatSalesReturn, and TotalAmount are required");
                }

                // Get the existing sales return with ALL related data
                var existingBill = await _context.SalesReturns
                    .Include(sr => sr.Items)
                    .Include(sr => sr.Account)
                    .FirstOrDefaultAsync(sr => sr.Id == id && sr.CompanyId == companyId);

                if (existingBill == null)
                    throw new ArgumentException("Sales return bill not found");

                // Get company to check date format and VAT enabled
                var company = await _context.Companies.FindAsync(companyId);
                if (company == null)
                    throw new ArgumentException("Company not found");

                var fiscalYear = await _context.FiscalYears
                    .FirstOrDefaultAsync(f => f.Id == fiscalYearId && f.CompanyId == companyId);

                if (fiscalYear == null)
                    throw new ArgumentException("Fiscal year not found");

                // Validate account belongs to company
                var account = await _context.Accounts
                    .FirstOrDefaultAsync(a => a.Id == dto.AccountId && a.CompanyId == companyId);

                if (account == null)
                    throw new ArgumentException("Invalid account for this company");

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

                // Determine VAT exemption
                bool isVatExempt = dto.IsVatExempt ?? false;
                bool isVatAll = dto.IsVatAll == "all";
                bool isNepaliFormat = company.DateFormat?.ToString().ToLower() == "nepali";

                // Parse VAT exemption from string if needed
                if (!string.IsNullOrEmpty(dto.IsVatAll))
                {
                    if (dto.IsVatAll.ToLower() == "true" || dto.IsVatAll == "1")
                        isVatExempt = true;
                    else if (dto.IsVatAll.ToLower() == "all")
                        isVatAll = true;
                }

                // Track VAT status validation
                bool hasVatableItems = false;
                bool hasNonVatableItems = false;

                // Calculate total return amount
                decimal totalReturnAmount = dto.TotalAmount ?? 0;
                decimal salesReturnAmount = (dto.TaxableAmount ?? 0) + (dto.NonVatSalesReturn ?? 0);

                // STEP 1: RESTORE STOCK by removing all stock entries for this sales return
                var existingStockEntries = await _context.StockEntries
                    .Where(se => se.SalesReturnBillId == id)
                    .ToListAsync();

                if (existingStockEntries.Any())
                {
                    _context.StockEntries.RemoveRange(existingStockEntries);
                    _logger.LogInformation("Removed {Count} existing stock entries", existingStockEntries.Count);
                }

                // STEP 2: Delete all associated transactions AND their transaction items
                var existingTransactions = await _context.Transactions
                    .Where(t => t.SalesReturnBillId == id)
                    .Include(t => t.TransactionItems)
                    .ToListAsync();

                if (existingTransactions.Any())
                {
                    // TransactionItems will be deleted automatically due to Cascade delete
                    _context.Transactions.RemoveRange(existingTransactions);
                    _logger.LogInformation("Deleted {Count} existing transactions with their items", existingTransactions.Count);
                }

                // STEP 3: Delete existing items
                if (existingBill.Items.Any())
                {
                    _context.SalesReturnItems.RemoveRange(existingBill.Items);
                    existingBill.Items.Clear();
                    _logger.LogInformation("Deleted {Count} existing items", existingBill.Items.Count);
                }

                // Save changes after deletions
                await _context.SaveChangesAsync();
                _logger.LogInformation("Saved deletions successfully");

                // STEP 4: UPDATE BILL PROPERTIES
                existingBill.AccountId = dto.AccountId;
                existingBill.OriginalSalesBillId = dto.OriginalSalesBillId;
                existingBill.OriginalSalesBillNumber = dto.OriginalSalesBillNumber;
                existingBill.PurchaseSalesReturnType = "Sales Return";
                existingBill.OriginalCopies = dto.OriginalCopies ?? existingBill.OriginalCopies;
                existingBill.FirstPrinted = dto.FirstPrinted ?? existingBill.FirstPrinted;
                existingBill.CashAccount = dto.CashAccount;
                existingBill.CashAccountAddress = dto.CashAccountAddress;
                existingBill.CashAccountPan = dto.CashAccountPan;
                existingBill.CashAccountEmail = dto.CashAccountEmail;
                existingBill.CashAccountPhone = dto.CashAccountPhone;
                existingBill.UnitId = dto.UnitId;
                existingBill.SettingsId = dto.SettingsId;

                // Financial fields
                existingBill.SubTotal = dto.SubTotal;
                existingBill.NonVatSalesReturn = dto.NonVatSalesReturn;
                existingBill.TaxableAmount = dto.TaxableAmount;
                existingBill.DiscountPercentage = dto.DiscountPercentage;
                existingBill.DiscountAmount = dto.DiscountAmount;
                existingBill.VatPercentage = isVatExempt ? 0 : (dto.VatPercentage ?? 13);
                existingBill.VatAmount = dto.VatAmount;
                existingBill.TotalAmount = totalReturnAmount;
                existingBill.IsVatExempt = isVatExempt;
                existingBill.IsVatAll = isVatAll ? "all" : (isVatExempt ? "true" : "false");
                existingBill.RoundOffAmount = dto.RoundOffAmount;
                existingBill.PaymentMode = dto.PaymentMode;
                existingBill.Quantity = dto.Quantity;
                existingBill.Price = dto.Price;

                // Dates
                if (dto.NepaliDate != default)
                    existingBill.nepaliDate = dto.NepaliDate;
                if (dto.Date != default)
                    existingBill.Date = dto.Date;
                if (dto.TransactionDateNepali != default)
                    existingBill.transactionDateNepali = dto.TransactionDateNepali;
                if (dto.TransactionDate != default)
                    existingBill.TransactionDate = dto.TransactionDate;

                existingBill.UpdatedAt = DateTime.UtcNow;

                // Update the bill
                _context.SalesReturns.Update(existingBill);
                await _context.SaveChangesAsync();

                // Generate a unique ID for all stock entries in this update
                var uniqueId = Guid.NewGuid().ToString();

                // Track totals for header transactions
                decimal totalPartyCredit = 0;
                decimal totalSalesDebit = 0;
                decimal totalVatDebit = 0;

                // Store item calculations for transaction items
                var itemCalculations = new List<SalesReturnItemCalculation>();

                // STEP 5: Process new items and create stock entries (ADDING stock back for returns)
                var returnItems = new List<SalesReturnItem>();
                decimal overallDiscountPercentage = dto.DiscountPercentage ?? 0m;

                // Load all items at once
                var itemIds = dto.Items.Select(i => i.ItemId).Distinct().ToList();
                var itemsDict = await _context.Items
                    .Include(i => i.StockEntries)
                    .Where(i => itemIds.Contains(i.Id))
                    .ToDictionaryAsync(i => i.Id);

                foreach (var itemDto in dto.Items)
                {
                    if (!itemsDict.TryGetValue(itemDto.ItemId, out var item))
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

                    // Try to find a matching sales bill item to get original values
                    var matchingSalesItem = await _context.SalesBillItems
                        .Include(sbi => sbi.SalesBill)
                        .Where(sbi => sbi.ItemId == itemDto.ItemId
                            && sbi.Price == itemDto.Price
                            && sbi.SalesBill.CompanyId == companyId)
                        .OrderByDescending(sbi => sbi.CreatedAt)
                        .FirstOrDefaultAsync();

                    decimal salesPrice = itemDto.Price;
                    decimal puPrice = itemDto.PuPrice ?? itemDto.Price;
                    decimal mrp = itemDto.Mrp ?? 0;
                    decimal marginPercentage = itemDto.MarginPercentage;
                    string batchNumber = itemDto.BatchNumber ?? "XXX";
                    DateOnly? expiryDate = itemDto.ExpiryDate;

                    if (matchingSalesItem != null)
                    {
                        salesPrice = matchingSalesItem.Price;
                        puPrice = matchingSalesItem.PuPrice ?? matchingSalesItem.Price;
                        marginPercentage = matchingSalesItem.MarginPercentage;
                        mrp = matchingSalesItem.Mrp ?? matchingSalesItem.Price;
                        batchNumber = matchingSalesItem.BatchNumber ?? batchNumber;
                        expiryDate = matchingSalesItem.ExpiryDate ?? expiryDate;
                    }

                    // Calculate values
                    decimal totalSalesValueBeforeDiscount = salesPrice * itemDto.Quantity;
                    decimal discountAmountForItem = (totalSalesValueBeforeDiscount * overallDiscountPercentage) / 100m;
                    decimal itemValueAfterDiscount = totalSalesValueBeforeDiscount - discountAmountForItem;

                    // Calculate item-wise VAT
                    decimal itemTaxableAmount = 0m;
                    decimal itemVatPercentage = dto.VatPercentage ?? 0;
                    decimal itemVatAmount = 0m;

                    if (!isVatExempt && itemVatPercentage > 0 && item.VatStatus?.ToLower() == "vatable")
                    {
                        itemTaxableAmount = itemValueAfterDiscount;
                        itemVatAmount = (itemTaxableAmount * itemVatPercentage) / 100m;
                    }

                    // Update totals
                    totalPartyCredit += itemValueAfterDiscount + itemVatAmount;  // Party gets CREDIT (reduction in receivable)
                    totalSalesDebit += itemValueAfterDiscount;                   // Sales account gets DEBIT (reduction in revenue)
                    totalVatDebit += itemVatAmount;                              // VAT account gets DEBIT (reduction in output VAT)

                    var netPrice = salesPrice - (salesPrice * overallDiscountPercentage / 100);
                    var netPuPrice = puPrice - (puPrice * overallDiscountPercentage / 100);

                    // CREATE STOCK ENTRY (ADDING STOCK BACK TO INVENTORY - POSITIVE QUANTITY)
                    var stockEntry = new StockEntry
                    {
                        Id = Guid.NewGuid(),
                        ItemId = item.Id,
                        Quantity = itemDto.Quantity,
                        Price = salesPrice,
                        PuPrice = puPrice,
                        MarginPercentage = marginPercentage,
                        Mrp = mrp,
                        NetPrice = netPrice,
                        NetPuPrice = netPuPrice,
                        DiscountPercentagePerItem = overallDiscountPercentage,
                        DiscountAmountPerItem = discountAmountForItem,
                        BatchNumber = batchNumber,
                        ExpiryDate = expiryDate ?? DateOnly.FromDateTime(DateTime.Now.AddYears(2)),
                        Date = isNepaliFormat ? existingBill.nepaliDate : existingBill.Date,
                        UniqueUuid = uniqueId,
                        FiscalYearId = fiscalYearId,
                        SalesReturnBillId = existingBill.Id,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };

                    _context.StockEntries.Add(stockEntry);

                    // CREATE NEW SALES RETURN ITEM
                    var returnItem = new SalesReturnItem
                    {
                        Id = Guid.NewGuid(),
                        SalesReturnId = existingBill.Id,
                        ItemId = itemDto.ItemId,
                        UnitId = itemDto.UnitId,
                        Quantity = itemDto.Quantity,
                        Price = salesPrice,
                        PuPrice = puPrice,
                        NetPuPrice = netPuPrice,
                        Mrp = mrp,
                        MarginPercentage = marginPercentage,
                        DiscountPercentagePerItem = overallDiscountPercentage,
                        DiscountAmountPerItem = discountAmountForItem,
                        NetPrice = netPrice,
                        BatchNumber = batchNumber,
                        ExpiryDate = expiryDate,
                        VatStatus = itemDto.VatStatus ?? item.VatStatus ?? "vatable",
                        UniqueUuid = uniqueId,
                        CreatedAt = isNepaliFormat ? existingBill.nepaliDate : existingBill.Date,
                        UpdatedAt = isNepaliFormat ? existingBill.nepaliDate : existingBill.Date
                    };

                    _context.SalesReturnItems.Add(returnItem);
                    returnItems.Add(returnItem);

                    // Store calculation for transaction items
                    itemCalculations.Add(new SalesReturnItemCalculation
                    {
                        ItemId = itemDto.ItemId,
                        UnitId = itemDto.UnitId,
                        WsUnit = 1,
                        Quantity = itemDto.Quantity,
                        Price = salesPrice,
                        PuPrice = puPrice,
                        DiscountPercentagePerItem = overallDiscountPercentage,
                        DiscountAmountPerItem = discountAmountForItem,
                        NetPuPrice = netPuPrice,
                        TaxableAmount = itemTaxableAmount,
                        VatPercentage = itemVatPercentage,
                        VatAmount = itemVatAmount,
                        ItemValueAfterDiscount = itemValueAfterDiscount
                    });
                }

                // VAT validation
                if (dto.IsVatAll != "all")
                {
                    if (isVatExempt && hasVatableItems)
                        throw new InvalidOperationException("Cannot update VAT exempt bill with vatable items");

                    if (!isVatExempt && hasNonVatableItems)
                        throw new InvalidOperationException("Cannot update bill with non-vatable items when VAT is applied");
                }

                // Save items and stock entries
                await _context.SaveChangesAsync();

                // ========== CREATE HEADER TRANSACTIONS WITH TRANSACTION ITEMS ==========

                // 1. PARTY ACCOUNT TRANSACTION (Header - Credit to party - reduction in receivable)
                if (dto.AccountId != Guid.Empty && totalPartyCredit > 0)
                {
                    var partyTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        AccountId = dto.AccountId,
                        SalesReturnBillId = existingBill.Id,
                        BillNumber = existingBill.BillNumber,
                        IsType = TransactionIsType.SlRt,
                        Type = TransactionType.SlRt,
                        PurchaseSalesReturnType = "Sales Return",
                        TotalDebit = 0,
                        TotalCredit = totalPartyCredit,
                        TaxableAmount = dto.TaxableAmount,
                        VatPercentage = dto.VatPercentage,
                        VatAmount = dto.VatAmount,
                        PaymentMode = paymentMode,
                        Date = existingBill.TransactionDate,
                        BillDate = existingBill.Date,
                        nepaliDate = dto.NepaliDate,
                        transactionDateNepali = dto.TransactionDateNepali,
                        FiscalYearId = fiscalYearId,
                        CreatedAt = DateTime.UtcNow,
                        Status = TransactionStatus.Active,
                        IsActive = true
                    };

                    await _context.Transactions.AddAsync(partyTransaction);

                    // Add Transaction Items for Party Transaction
                    foreach (var calc in itemCalculations)
                    {
                        var transactionItem = new TransactionItem
                        {
                            Id = Guid.NewGuid(),
                            TransactionId = partyTransaction.Id,
                            ItemId = calc.ItemId,
                            UnitId = calc.UnitId,
                            WSUnit = calc.WsUnit,
                            Quantity = calc.Quantity,
                            Price = calc.Price,
                            PuPrice = calc.PuPrice,
                            DiscountPercentagePerItem = calc.DiscountPercentagePerItem,
                            DiscountAmountPerItem = calc.DiscountAmountPerItem,
                            NetPuPrice = calc.NetPuPrice ?? 0,
                            TaxableAmount = calc.TaxableAmount,
                            VatPercentage = calc.VatPercentage,
                            VatAmount = calc.VatAmount,
                            Debit = 0,
                            Credit = calc.ItemValueAfterDiscount + calc.VatAmount,
                            CreatedAt = DateTime.UtcNow
                        };
                        await _context.TransactionItems.AddAsync(transactionItem);
                    }

                    _logger.LogInformation("Created Party transaction: TotalCredit {Amount}", totalPartyCredit);
                }

                // 2. SALES ACCOUNT TRANSACTION (Header - Debit to Sales account - reduction in revenue)
                if (salesAccount != null && totalSalesDebit > 0)
                {
                    var salesTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        AccountId = salesAccount.Id,
                        SalesReturnBillId = existingBill.Id,
                        BillNumber = existingBill.BillNumber,
                        Type = TransactionType.SlRt,
                        PurchaseSalesReturnType = "Sales Return",
                        TotalDebit = totalSalesDebit,
                        TotalCredit = 0,
                        TaxableAmount = dto.TaxableAmount,
                        VatPercentage = dto.VatPercentage,
                        VatAmount = dto.VatAmount,
                        PaymentMode = paymentMode,
                        Date = existingBill.TransactionDate,
                        BillDate = existingBill.Date,
                        nepaliDate = dto.NepaliDate,
                        transactionDateNepali = dto.TransactionDateNepali,
                        FiscalYearId = fiscalYearId,
                        CreatedAt = DateTime.UtcNow,
                        Status = TransactionStatus.Active,
                        IsActive = true
                    };

                    await _context.Transactions.AddAsync(salesTransaction);

                    // Add Transaction Items for Sales Transaction
                    foreach (var calc in itemCalculations)
                    {
                        var transactionItem = new TransactionItem
                        {
                            Id = Guid.NewGuid(),
                            TransactionId = salesTransaction.Id,
                            ItemId = calc.ItemId,
                            UnitId = calc.UnitId,
                            WSUnit = calc.WsUnit,
                            Quantity = calc.Quantity,
                            Price = calc.Price,
                            PuPrice = calc.PuPrice,
                            DiscountPercentagePerItem = calc.DiscountPercentagePerItem,
                            DiscountAmountPerItem = calc.DiscountAmountPerItem,
                            NetPuPrice = calc.NetPuPrice ?? 0,
                            TaxableAmount = calc.TaxableAmount,
                            VatPercentage = calc.VatPercentage,
                            VatAmount = calc.VatAmount,
                            Debit = calc.ItemValueAfterDiscount,
                            Credit = 0,
                            CreatedAt = DateTime.UtcNow
                        };
                        await _context.TransactionItems.AddAsync(transactionItem);
                    }

                    _logger.LogInformation("Created Sales account transaction: TotalDebit {Amount}", totalSalesDebit);
                }

                // 3. VAT TRANSACTION (Header - Debit to VAT account - reduction in output VAT)
                if (totalVatDebit > 0 && vatAccount != null && !isVatExempt)
                {
                    var vatTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        AccountId = vatAccount.Id,
                        SalesReturnBillId = existingBill.Id,
                        BillNumber = existingBill.BillNumber,
                        IsType = TransactionIsType.VAT,
                        Type = TransactionType.SlRt,
                        PurchaseSalesReturnType = "Sales Return",
                        TotalDebit = totalVatDebit,
                        TotalCredit = 0,
                        TaxableAmount = dto.TaxableAmount,
                        VatPercentage = dto.VatPercentage,
                        VatAmount = totalVatDebit,
                        PaymentMode = paymentMode,
                        Date = existingBill.TransactionDate,
                        BillDate = existingBill.Date,
                        nepaliDate = dto.NepaliDate,
                        transactionDateNepali = dto.TransactionDateNepali,
                        FiscalYearId = fiscalYearId,
                        CreatedAt = DateTime.UtcNow,
                        Status = TransactionStatus.Active,
                        IsActive = true
                    };

                    await _context.Transactions.AddAsync(vatTransaction);

                    // Add Transaction Items for VAT Transaction
                    foreach (var calc in itemCalculations.Where(c => c.VatAmount > 0))
                    {
                        var transactionItem = new TransactionItem
                        {
                            Id = Guid.NewGuid(),
                            TransactionId = vatTransaction.Id,
                            ItemId = calc.ItemId,
                            UnitId = calc.UnitId,
                            WSUnit = calc.WsUnit,
                            Quantity = calc.Quantity,
                            Price = calc.Price,
                            PuPrice = calc.PuPrice,
                            DiscountPercentagePerItem = calc.DiscountPercentagePerItem,
                            DiscountAmountPerItem = calc.DiscountAmountPerItem,
                            NetPuPrice = calc.NetPuPrice ?? 0,
                            TaxableAmount = calc.TaxableAmount,
                            VatPercentage = calc.VatPercentage,
                            VatAmount = calc.VatAmount,
                            Debit = calc.VatAmount,
                            Credit = 0,
                            CreatedAt = DateTime.UtcNow
                        };
                        await _context.TransactionItems.AddAsync(transactionItem);
                    }

                    _logger.LogInformation("Created VAT transaction: TotalDebit {Amount}", totalVatDebit);
                }

                // 4. ROUND-OFF TRANSACTION if applicable
                if (dto.RoundOffAmount != 0 && roundOffAccount != null)
                {
                    var roundOffTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        AccountId = roundOffAccount.Id,
                        SalesReturnBillId = existingBill.Id,
                        BillNumber = existingBill.BillNumber,
                        IsType = TransactionIsType.RoundOff,
                        Type = TransactionType.SlRt,
                        PurchaseSalesReturnType = "Sales Return",
                        TotalDebit = dto.RoundOffAmount > 0 ? dto.RoundOffAmount.Value : 0,
                        TotalCredit = dto.RoundOffAmount < 0 ? Math.Abs(dto.RoundOffAmount.Value) : 0,
                        PaymentMode = paymentMode,
                        Date = existingBill.TransactionDate,
                        BillDate = existingBill.Date,
                        nepaliDate = dto.NepaliDate,
                        transactionDateNepali = dto.TransactionDateNepali,
                        FiscalYearId = fiscalYearId,
                        CreatedAt = DateTime.UtcNow,
                        Status = TransactionStatus.Active,
                        IsActive = true
                    };

                    await _context.Transactions.AddAsync(roundOffTransaction);
                    _logger.LogInformation("Created Round-off transaction");
                }

                // 5. CASH TRANSACTION if payment mode is cash (Credit - Money going OUT)
                if (paymentMode == PaymentMode.Cash && cashAccount != null && totalReturnAmount > 0)
                {
                    var cashTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        AccountId = cashAccount.Id,
                        SalesReturnBillId = existingBill.Id,
                        BillNumber = existingBill.BillNumber,
                        Type = TransactionType.SlRt,
                        PurchaseSalesReturnType = "Sales Return",
                        TotalDebit = 0,
                        TotalCredit = totalReturnAmount,
                        PaymentMode = PaymentMode.Cash,
                        Date = existingBill.TransactionDate,
                        BillDate = existingBill.Date,
                        nepaliDate = dto.NepaliDate,
                        transactionDateNepali = dto.TransactionDateNepali,
                        FiscalYearId = fiscalYearId,
                        CreatedAt = DateTime.UtcNow,
                        Status = TransactionStatus.Active,
                        IsActive = true
                    };

                    await _context.Transactions.AddAsync(cashTransaction);
                    _logger.LogInformation("Created Cash transaction: TotalCredit {Amount}", totalReturnAmount);
                }

                // Update items collection
                existingBill.Items = returnItems;

                // Save all changes
                var saveResult = await _context.SaveChangesAsync();
                _logger.LogInformation("SaveChangesAsync completed. {RowCount} rows affected.", saveResult);

                await transaction.CommitAsync();
                _logger.LogInformation("Transaction committed successfully");

                _logger.LogInformation("=== Successfully updated sales return bill: {BillId} ===", id);

                return existingBill;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating sales return bill: {BillId}", id);
                await transaction.RollbackAsync();
                throw;
            }
        }

        private async Task CheckIfStockIsUsedInReturnsAsync(SalesReturn existingBill, Guid companyId)
        {
            foreach (var existingItem in existingBill.Items)
            {
                // Check if this stock entry has been used in other transactions
                var usedInOtherReturns = await _context.SalesReturns
                    .Include(sr => sr.Items)
                    .Where(sr => sr.CompanyId == companyId && sr.Id != existingBill.Id)
                    .SelectMany(sr => sr.Items)
                    .AnyAsync(sri => sri.ItemId == existingItem.ItemId &&
                                   sri.BatchNumber == existingItem.BatchNumber &&
                                   sri.UniqueUuid == existingItem.UniqueUuid);

                if (usedInOtherReturns)
                {
                    var product = await _context.Items.FindAsync(existingItem.ItemId);
                    throw new ArgumentException($"Item {product?.Name} (Batch: {existingItem.BatchNumber}) has been used in other returns and cannot be edited");
                }

                var usedInSales = await _context.SalesBills
                    .Include(sb => sb.Items)
                    .Where(sb => sb.CompanyId == companyId)
                    .SelectMany(sb => sb.Items)
                    .AnyAsync(si => si.ItemId == existingItem.ItemId &&
                                  si.BatchNumber == existingItem.BatchNumber &&
                                  si.UniqueUuid == existingItem.UniqueUuid);

                if (usedInSales)
                {
                    var product = await _context.Items.FindAsync(existingItem.ItemId);
                    throw new ArgumentException($"Item {product?.Name} (Batch: {existingItem.BatchNumber}) has been sold and cannot be edited");
                }
            }
        }

        public async Task<SalesReturnResponseDTO> GetCashSalesReturnDataAsync(Guid companyId, Guid fiscalYearId, Guid userId)
        {
            try
            {
                _logger.LogInformation("GetCashSalesReturnDataAsync called for Company: {CompanyId}, User: {UserId}", companyId, userId);

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
                        RenewalDate = c.RenewalDate,
                        DateFormat = c.DateFormat.ToString(),
                        VatEnabled = c.VatEnabled,
                    })
                    .FirstOrDefaultAsync();

                if (company == null)
                    return null!;

                // Get fiscal year
                var currentFiscalYear = await _context.FiscalYears
                    .Where(fy => fy.Id == fiscalYearId && fy.CompanyId == companyId)
                    .Select(fy => new FiscalYearDTO
                    {
                        Id = fy.Id,
                        Name = fy.Name,
                        StartDate = fy.StartDate,
                        EndDate = fy.EndDate,
                        StartDateNepali = fy.StartDateNepali,
                        EndDateNepali = fy.EndDateNepali,
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

                // Get company groups (Cash in Hand group)
                // var cashInHandGroup = await _context.AccountGroups
                //     .FirstOrDefaultAsync(ag => ag.CompanyId == companyId && ag.Name == "Cash in Hand");

                // var relevantGroupIds = cashInHandGroup != null ? new List<Guid> { cashInHandGroup.Id } : new List<Guid>();

                // Get sales invoices for reference
                var salesInvoices = await _context.SalesBills
                    .Where(sb => sb.CompanyId == companyId)
                    .OrderByDescending(sb => sb.TransactionDate)
                    .Take(100)
                    .Select(sb => new SalesBillData
                    {
                        Id = sb.Id,
                        BillNumber = sb.BillNumber,
                        Account = sb.Account != null ? new AccountInfoDTO
                        {
                            Id = sb.Account.Id,
                            Name = sb.Account.Name
                        } : null,
                        CashAccount = sb.CashAccount,
                        CashAccountAddress = sb.CashAccountAddress,
                        TotalAmount = sb.TotalAmount,
                        VatAmount = sb.VatAmount,
                        DiscountAmount = sb.DiscountAmount,
                        SubTotal = sb.SubTotal,
                        TaxableAmount = sb.TaxableAmount,
                        NonVatSales = sb.NonVatSales,
                        IsVatExempt = sb.IsVatExempt,
                        VatPercentage = sb.VatPercentage,
                        PaymentMode = sb.PaymentMode ?? string.Empty,
                        TransactionDate = sb.TransactionDate,
                        TransactionDateNepali = sb.transactionDateNepali,
                        NepaliDate = sb.nepaliDate,
                        Date = sb.Date
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

                // Prepare response
                var response = new SalesReturnResponseDTO
                {
                    Company = company,
                    CurrentCompany = company,
                    SalesInvoices = salesInvoices,
                    Dates = new DateInfoDTO
                    {
                        NepaliDate = nepaliDate,
                        TransactionDateNepali = transactionDateNepali,
                        CompanyDateFormat = companyDateFormat
                    },
                    CurrentFiscalYear = currentFiscalYear,
                    Categories = categories,
                    Units = units,
                    CompanyGroups = new List<CompanyGroupInfoDTO>(), // Empty list as we're not using groups for cash returns
                    UserPreferences = new UserPreferencesDTO
                    {
                        Theme = user?.Preferences?.Theme.ToString() ?? "light"
                    },
                    Permissions = new PermissionsDTO
                    {
                        IsAdminOrSupervisor = isAdmin || userRole == "Supervisor"
                    }
                };

                _logger.LogInformation("Successfully fetched cash sales return data for Company: {CompanyId}", companyId);
                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetCashSalesReturnDataAsync for Company: {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<string> GetNextCashSalesReturnBillNumberAsync(Guid companyId, Guid fiscalYearId)
        {
            return await _billNumberService.GetNextBillNumberAsync(companyId, fiscalYearId, "salesReturn");
        }
        public async Task<string> GetCurrentCashSalesReturnBillNumberAsync(Guid companyId, Guid fiscalYearId)
        {
            return await _billNumberService.GetCurrentBillNumberAsync(companyId, fiscalYearId, "salesReturn");
        }

        public async Task<SalesBillData?> GetCashSalesBillByNumberAsync(string billNumber, Guid companyId, Guid fiscalYearId)
        {
            try
            {
                _logger.LogInformation("GetCashSalesBillByNumberAsync called for BillNumber: {BillNumber}, Company: {CompanyId}, FiscalYear: {FiscalYearId}",
                    billNumber, companyId, fiscalYearId);

                if (string.IsNullOrEmpty(billNumber))
                    throw new ArgumentException("Bill number is required");

                // Find the sales bill by number
                var salesBill = await _context.SalesBills
                    .Include(sb => sb.User)
                    .Include(sb => sb.Items)
                        .ThenInclude(i => i.Item)
                            .ThenInclude(it => it.Unit)
                    .Include(sb => sb.Items)
                        .ThenInclude(i => i.Item)
                            .ThenInclude(it => it.Category)
                    .Include(sb => sb.Items)
                        .ThenInclude(i => i.Unit)
                    .FirstOrDefaultAsync(sb => sb.BillNumber == billNumber &&
                                              sb.CompanyId == companyId &&
                                              sb.PurchaseSalesType == "Sales" &&
                                              sb.FiscalYearId == fiscalYearId);

                if (salesBill == null)
                    return null;

                // Check if this is a credit sales bill
                if (salesBill.AccountId != null)
                {
                    var account = await _context.Accounts.FindAsync(salesBill.AccountId);
                    throw new InvalidOperationException($"Bill {billNumber} is a Credit Sales bill. Credit sales returns should be created from Sales Return section.")
                    {
                        Data = {
                    ["IsCreditSales"] = true,
                    ["BillType"] = "credit",
                    ["Account"] = account?.Name ?? "Unknown",
                    ["AccountAddress"] = account?.Address ?? string.Empty,
                    ["AccountPan"] = account?.Pan ?? string.Empty,
                    ["AccountEmail"] = account?.Email ?? string.Empty,
                    ["AccountPhone"] = account?.Phone ?? string.Empty
                }
                    };
                }

                // Check if this is a cash sales bill (should have CashAccount)
                if (string.IsNullOrEmpty(salesBill.CashAccount))
                {
                    throw new InvalidOperationException($"Bill {billNumber} is not a valid cash sales bill. Cash account information is missing.");
                }

                // Process items for the response
                var processedItems = new List<SalesBillItemDTO>();

                foreach (var item in salesBill.Items)
                {
                    var itemData = item.Item;

                    var itemDto = new SalesBillItemDTO
                    {
                        Id = item.Id,
                        ItemId = item.ItemId,
                        ItemName = itemData?.Name,
                        Hscode = itemData?.Hscode,
                        UniqueNumber = itemData?.UniqueNumber,
                        UnitId = item.UnitId,
                        UnitName = item.Unit?.Name,
                        Quantity = item.Quantity,
                        Price = item.Price,
                        PuPrice = item.PuPrice,
                        NetPuPrice = item.NetPuPrice,
                        Mrp = item.Mrp,
                        DiscountPercentagePerItem = item.DiscountPercentagePerItem,
                        DiscountAmountPerItem = item.DiscountAmountPerItem,
                        NetPrice = item.NetPrice,
                        BatchNumber = item.BatchNumber,
                        ExpiryDate = item.ExpiryDate,
                        VatStatus = item.VatStatus,
                        UniqueUuid = item.UniqueUuid,
                        PurchaseBillId = item.PurchaseBillId,
                        Item = itemData != null ? new ItemDetailsDTO
                        {
                            Id = itemData.Id,
                            Name = itemData.Name,
                            Hscode = itemData.Hscode,
                            UniqueNumber = itemData.UniqueNumber,
                            UnitId = itemData.UnitId,
                            UnitName = itemData.Unit?.Name,
                            CategoryId = itemData.CategoryId,
                            CategoryName = itemData.Category?.Name,
                            Price = itemData.Price,
                            PuPrice = itemData.PuPrice,
                        } : null
                    };

                    processedItems.Add(itemDto);
                }

                // Create the response DTO
                var billData = new SalesBillData
                {
                    Id = salesBill.Id,
                    BillNumber = salesBill.BillNumber,
                    CashAccount = salesBill.CashAccount,
                    CashAccountAddress = salesBill.CashAccountAddress,
                    CashAccountPan = salesBill.CashAccountPan,
                    CashAccountEmail = salesBill.CashAccountEmail,
                    CashAccountPhone = salesBill.CashAccountPhone,
                    Items = processedItems,
                    SubTotal = salesBill.SubTotal,
                    NonVatSales = salesBill.NonVatSales,
                    TaxableAmount = salesBill.TaxableAmount,
                    DiscountPercentage = salesBill.DiscountPercentage,
                    DiscountAmount = salesBill.DiscountAmount,
                    RoundOffAmount = salesBill.RoundOffAmount,
                    VatPercentage = salesBill.VatPercentage,
                    VatAmount = salesBill.VatAmount,
                    TotalAmount = salesBill.TotalAmount,
                    IsVatExempt = salesBill.IsVatExempt,
                    PaymentMode = salesBill.PaymentMode ?? string.Empty,
                    NepaliDate = salesBill.nepaliDate,
                    Date = salesBill.Date,
                    TransactionDateNepali = salesBill.transactionDateNepali,
                    TransactionDate = salesBill.TransactionDate,
                    User = salesBill.User != null ? new UserInfoDTO
                    {
                        Id = salesBill.User.Id,
                        Name = salesBill.User.Name,
                        Email = salesBill.User.Email,
                        IsAdmin = salesBill.User.IsAdmin,
                        Preferences = salesBill.User.Preferences != null ? new UserPreferencesDTO
                        {
                            Theme = salesBill.User.Preferences.Theme.ToString()
                        } : new UserPreferencesDTO()
                    } : null
                };

                return billData;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetCashSalesBillByNumberAsync for BillNumber: {BillNumber}", billNumber);
                throw;
            }
        }

        public async Task<SalesReturn> CreateCashSalesReturnAsync(CreateSalesReturnDTO dto, Guid userId, Guid companyId, Guid fiscalYearId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                _logger.LogInformation("CreateCashSalesReturnAsync started for Company: {CompanyId}, User: {UserId}", companyId, userId);

                // Validate company and fiscal year
                var company = await _context.Companies.FindAsync(companyId);
                if (company == null)
                    throw new ArgumentException("Company not found");

                var fiscalYear = await _context.FiscalYears.FindAsync(fiscalYearId);
                if (fiscalYear == null || fiscalYear.CompanyId != companyId)
                    throw new ArgumentException("Invalid fiscal year");

                var defaultStore = await GetDefaultStoreAsync(companyId);
                var defaultRack = defaultStore != null ? await GetDefaultRackAsync(defaultStore.Id) : null;

                // Get default accounts
                var salesAccountId = await GetDefaultAccountIdAsync("Sales", companyId);
                var vatAccountId = await GetDefaultAccountIdAsync("VAT", companyId);
                var roundOffAccountId = await GetDefaultAccountIdAsync("Rounded Off", companyId);
                var cashInHandAccountId = await GetDefaultAccountIdAsync("Cash in Hand", companyId);

                // Parse payment mode
                var paymentMode = ParsePaymentMode(dto.PaymentMode);

                // Get next return number
                var returnNumber = await _billNumberService.GetNextBillNumberAsync(companyId, fiscalYearId, "salesReturn");

                // Parse VAT exemption
                bool isVatExemptBool = dto.IsVatExempt == "true" || dto.IsVatExempt == "True" || dto.IsVatExempt == "1";
                bool isVatAll = dto.IsVatExempt == "all";

                // Load all items at once
                var itemIds = dto.Items.Select(i => i.ItemId).Distinct().ToList();
                var itemsDict = await _context.Items
                    .Include(i => i.StockEntries)
                    .Where(i => itemIds.Contains(i.Id))
                    .ToDictionaryAsync(i => i.Id);

                // Track VAT status validation
                bool hasVatableItems = false;
                bool hasNonVatableItems = false;

                // Validate items and track VAT status
                foreach (var itemDto in dto.Items)
                {
                    if (!itemsDict.TryGetValue(itemDto.ItemId, out var item))
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
                }

                // VAT validation
                if (dto.IsVatExempt != "all")
                {
                    if (isVatExemptBool && hasVatableItems)
                        throw new InvalidOperationException("Cannot save VAT exempt bill with vatable items");

                    if (!isVatExemptBool && hasNonVatableItems)
                        throw new InvalidOperationException("Cannot save bill with non-vatable items when VAT is applied");
                }

                // Determine if company uses Nepali date format
                bool isNepaliFormat = company.DateFormat?.ToString().ToLower() == "nepali";

                // Generate a unique ID for the stock entry
                var uniqueId = Guid.NewGuid().ToString();

                // Calculate total return amount
                decimal totalReturnAmount = dto.TotalAmount ?? 0;
                decimal salesReturnAmount = (dto.TaxableAmount ?? 0) + (dto.NonVatSalesReturn ?? 0);

                // Create sales return bill FIRST
                var salesReturn = new SalesReturn
                {
                    Id = Guid.NewGuid(),
                    CompanyId = companyId,
                    UserId = userId,
                    BillNumber = returnNumber,
                    PurchaseSalesReturnType = "Sales Return",
                    Type = "SlRt",
                    OriginalSalesBillId = dto.OriginalSalesBillId,
                    OriginalSalesBillNumber = dto.OriginalSalesBillNumber,
                    AccountId = null, // No account for cash returns
                    CashAccount = dto.CashAccount,
                    CashAccountAddress = dto.CashAccountAddress,
                    CashAccountPan = dto.CashAccountPan,
                    CashAccountEmail = dto.CashAccountEmail,
                    CashAccountPhone = dto.CashAccountPhone,
                    UnitId = dto.UnitId,
                    SettingsId = dto.SettingsId,
                    FiscalYearId = fiscalYearId,
                    SubTotal = dto.SubTotal ?? 0,
                    NonVatSalesReturn = dto.NonVatSalesReturn ?? 0,
                    TaxableAmount = dto.TaxableAmount ?? 0,
                    DiscountPercentage = dto.DiscountPercentage ?? 0,
                    DiscountAmount = dto.DiscountAmount ?? 0,
                    VatPercentage = dto.VatPercentage,
                    VatAmount = dto.VatAmount ?? 0,
                    TotalAmount = totalReturnAmount,
                    IsVatExempt = isVatExemptBool,
                    IsVatAll = isVatAll ? "all" : null,
                    RoundOffAmount = dto.RoundOffAmount ?? 0,
                    PaymentMode = dto.PaymentMode,
                    Quantity = dto.Quantity,
                    Price = dto.Price,
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

                await _context.SalesReturns.AddAsync(salesReturn);

                // Track totals for header transactions
                decimal totalCashCredit = 0;
                decimal totalSalesDebit = 0;
                decimal totalVatDebit = 0;

                // Store item calculations for transaction items
                var itemCalculations = new List<SalesReturnItemCalculation>();

                var returnItems = new List<SalesReturnItem>();
                decimal overallDiscountPercentage = dto.DiscountPercentage ?? 0m;

                // PROCESS ITEMS IN MEMORY
                foreach (var itemDto in dto.Items)
                {
                    if (!itemsDict.TryGetValue(itemDto.ItemId, out var item))
                        throw new ArgumentException($"Item with id {itemDto.ItemId} not found");

                    // Try to find a matching sales bill item to get original values
                    var matchingSalesItem = await _context.SalesBillItems
                        .Include(sbi => sbi.SalesBill)
                        .Where(sbi => sbi.ItemId == itemDto.ItemId
                            && sbi.Price == itemDto.Price
                            && sbi.SalesBill.CompanyId == companyId)
                        .OrderByDescending(sbi => sbi.CreatedAt)
                        .FirstOrDefaultAsync();

                    decimal salesPrice = itemDto.Price;
                    decimal puPrice = itemDto.PuPrice ?? itemDto.Price;
                    decimal mrp = itemDto.Mrp ?? 0;
                    decimal marginPercentage = itemDto.MarginPercentage;
                    string batchNumber = itemDto.BatchNumber ?? "XXX";
                    DateOnly? expiryDate = itemDto.ExpiryDate;

                    if (matchingSalesItem != null)
                    {
                        salesPrice = matchingSalesItem.Price;
                        puPrice = matchingSalesItem.PuPrice ?? matchingSalesItem.Price;
                        marginPercentage = matchingSalesItem.MarginPercentage;
                        mrp = matchingSalesItem.Mrp ?? matchingSalesItem.Price;
                        batchNumber = matchingSalesItem.BatchNumber ?? batchNumber;
                        expiryDate = matchingSalesItem.ExpiryDate ?? expiryDate;
                    }

                    // Calculate values
                    decimal totalSalesValueBeforeDiscount = salesPrice * itemDto.Quantity;
                    decimal discountAmountForItem = (totalSalesValueBeforeDiscount * overallDiscountPercentage) / 100m;
                    decimal itemValueAfterDiscount = totalSalesValueBeforeDiscount - discountAmountForItem;

                    // Calculate item-wise VAT
                    decimal itemTaxableAmount = 0m;
                    decimal itemVatPercentage = dto.VatPercentage;
                    decimal itemVatAmount = 0m;

                    if (!isVatExemptBool && itemVatPercentage > 0 && item.VatStatus?.ToLower() == "vatable")
                    {
                        itemTaxableAmount = itemValueAfterDiscount;
                        itemVatAmount = (itemTaxableAmount * itemVatPercentage) / 100m;
                    }

                    // Update totals
                    totalCashCredit += itemValueAfterDiscount + itemVatAmount;   // Cash gets CREDIT (money going OUT)
                    totalSalesDebit += itemValueAfterDiscount;                   // Sales account gets DEBIT (reduction in revenue)
                    totalVatDebit += itemVatAmount;                              // VAT account gets DEBIT (reduction in output VAT)

                    var netPrice = salesPrice - (salesPrice * overallDiscountPercentage / 100);
                    var netPuPrice = puPrice - (puPrice * overallDiscountPercentage / 100);

                    // ADD STOCK ENTRY (ADDING stock back for returns - POSITIVE quantity)
                    var stockEntry = new StockEntry
                    {
                        Id = Guid.NewGuid(),
                        ItemId = item.Id,
                        Quantity = itemDto.Quantity,
                        Price = salesPrice,
                        PuPrice = puPrice,
                        MarginPercentage = marginPercentage,
                        Mrp = mrp,
                        NetPrice = netPrice,
                        NetPuPrice = netPuPrice,
                        DiscountPercentagePerItem = overallDiscountPercentage,
                        DiscountAmountPerItem = discountAmountForItem,
                        BatchNumber = batchNumber,
                        ExpiryDate = expiryDate ?? DateOnly.FromDateTime(DateTime.Now.AddYears(2)),
                        Date = isNepaliFormat ? dto.NepaliDate : dto.Date,
                        UniqueUuid = uniqueId,
                        SalesReturnBillId = salesReturn.Id,
                        FiscalYearId = fiscalYearId,
                        StoreId = itemDto.StoreId ?? defaultStore?.Id,
                        RackId = itemDto.RackId ?? defaultRack?.Id,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };

                    _context.StockEntries.Add(stockEntry);

                    // CREATE SALES RETURN ITEM
                    var returnItem = new SalesReturnItem
                    {
                        Id = Guid.NewGuid(),
                        SalesReturnId = salesReturn.Id,
                        ItemId = itemDto.ItemId,
                        UnitId = itemDto.UnitId,
                        Quantity = itemDto.Quantity,
                        Price = salesPrice,
                        PuPrice = puPrice,
                        MarginPercentage = marginPercentage,
                        Mrp = mrp,
                        NetPrice = netPrice,
                        NetPuPrice = netPuPrice,
                        DiscountPercentagePerItem = overallDiscountPercentage,
                        DiscountAmountPerItem = discountAmountForItem,
                        BatchNumber = batchNumber,
                        ExpiryDate = expiryDate ?? DateOnly.FromDateTime(DateTime.Now.AddYears(2)),
                        VatStatus = item.VatStatus ?? "vatable",
                        UniqueUuid = uniqueId,
                        CreatedAt = isNepaliFormat ? dto.NepaliDate : dto.Date,
                        UpdatedAt = isNepaliFormat ? dto.NepaliDate : dto.Date
                    };

                    _context.SalesReturnItems.Add(returnItem);
                    returnItems.Add(returnItem);

                    // Store calculation for transaction items
                    itemCalculations.Add(new SalesReturnItemCalculation
                    {
                        ItemId = itemDto.ItemId,
                        UnitId = itemDto.UnitId,
                        WsUnit = 1,
                        Quantity = itemDto.Quantity,
                        Price = salesPrice,
                        PuPrice = puPrice,
                        DiscountPercentagePerItem = overallDiscountPercentage,
                        DiscountAmountPerItem = discountAmountForItem,
                        NetPuPrice = netPuPrice,
                        TaxableAmount = itemTaxableAmount,
                        VatPercentage = itemVatPercentage,
                        VatAmount = itemVatAmount,
                        ItemValueAfterDiscount = itemValueAfterDiscount
                    });
                }

                // Save items and stock entries
                await _context.SaveChangesAsync();

                // ========== CREATE HEADER TRANSACTIONS WITH TRANSACTION ITEMS ==========

                // 1. CASH IN HAND TRANSACTION (Header - Credit - Money going OUT)
                if (cashInHandAccountId.HasValue && totalCashCredit > 0)
                {
                    var cashTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        AccountId = cashInHandAccountId.Value,
                        SalesReturnBillId = salesReturn.Id,
                        BillNumber = salesReturn.BillNumber,
                        IsType = TransactionIsType.SlRt,
                        Type = TransactionType.SlRt,
                        PurchaseSalesReturnType = "Sales Return",
                        TotalDebit = 0,
                        TotalCredit = totalCashCredit,
                        TaxableAmount = dto.TaxableAmount,
                        VatPercentage = dto.VatPercentage,
                        VatAmount = dto.VatAmount,
                        PaymentMode = paymentMode,
                        Date = salesReturn.TransactionDate,
                        BillDate = salesReturn.Date,
                        nepaliDate = dto.NepaliDate,
                        transactionDateNepali = dto.TransactionDateNepali,
                        FiscalYearId = fiscalYearId,
                        CreatedAt = DateTime.UtcNow,
                        Status = TransactionStatus.Active,
                        IsActive = true
                    };

                    await _context.Transactions.AddAsync(cashTransaction);

                    // Add Transaction Items for Cash Transaction
                    foreach (var calc in itemCalculations)
                    {
                        var transactionItem = new TransactionItem
                        {
                            Id = Guid.NewGuid(),
                            TransactionId = cashTransaction.Id,
                            ItemId = calc.ItemId,
                            UnitId = calc.UnitId,
                            WSUnit = calc.WsUnit,
                            Quantity = calc.Quantity,
                            Price = calc.Price,
                            PuPrice = calc.PuPrice,
                            DiscountPercentagePerItem = calc.DiscountPercentagePerItem,
                            DiscountAmountPerItem = calc.DiscountAmountPerItem,
                            NetPuPrice = calc.NetPuPrice ?? 0,
                            TaxableAmount = calc.TaxableAmount,
                            VatPercentage = calc.VatPercentage,
                            VatAmount = calc.VatAmount,
                            Debit = 0,
                            Credit = calc.ItemValueAfterDiscount + calc.VatAmount,
                            CreatedAt = DateTime.UtcNow
                        };
                        await _context.TransactionItems.AddAsync(transactionItem);
                    }

                    _logger.LogInformation("Created Cash in Hand transaction: TotalCredit {Amount}", totalCashCredit);
                }

                // 2. SALES ACCOUNT TRANSACTION (Header - Debit - Reducing sales revenue)
                if (salesAccountId.HasValue && totalSalesDebit > 0)
                {
                    var salesTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        AccountId = salesAccountId.Value,
                        SalesReturnBillId = salesReturn.Id,
                        BillNumber = salesReturn.BillNumber,
                        Type = TransactionType.SlRt,
                        PurchaseSalesReturnType = "Sales Return",
                        TotalDebit = totalSalesDebit,
                        TotalCredit = 0,
                        TaxableAmount = dto.TaxableAmount,
                        VatPercentage = dto.VatPercentage,
                        VatAmount = dto.VatAmount,
                        PaymentMode = paymentMode,
                        Date = salesReturn.TransactionDate,
                        BillDate = salesReturn.Date,
                        nepaliDate = dto.NepaliDate,
                        transactionDateNepali = dto.TransactionDateNepali,
                        FiscalYearId = fiscalYearId,
                        CreatedAt = DateTime.UtcNow,
                        Status = TransactionStatus.Active,
                        IsActive = true
                    };

                    await _context.Transactions.AddAsync(salesTransaction);

                    // Add Transaction Items for Sales Transaction
                    foreach (var calc in itemCalculations)
                    {
                        var transactionItem = new TransactionItem
                        {
                            Id = Guid.NewGuid(),
                            TransactionId = salesTransaction.Id,
                            ItemId = calc.ItemId,
                            UnitId = calc.UnitId,
                            WSUnit = calc.WsUnit,
                            Quantity = calc.Quantity,
                            Price = calc.Price,
                            PuPrice = calc.PuPrice,
                            DiscountPercentagePerItem = calc.DiscountPercentagePerItem,
                            DiscountAmountPerItem = calc.DiscountAmountPerItem,
                            NetPuPrice = calc.NetPuPrice ?? 0,
                            TaxableAmount = calc.TaxableAmount,
                            VatPercentage = calc.VatPercentage,
                            VatAmount = calc.VatAmount,
                            Debit = calc.ItemValueAfterDiscount,
                            Credit = 0,
                            CreatedAt = DateTime.UtcNow
                        };
                        await _context.TransactionItems.AddAsync(transactionItem);
                    }

                    _logger.LogInformation("Created Sales account transaction: TotalDebit {Amount}", totalSalesDebit);
                }

                // 3. VAT TRANSACTION (Header - Debit - Reducing VAT liability)
                if (totalVatDebit > 0 && vatAccountId.HasValue && !isVatExemptBool)
                {
                    var vatTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        AccountId = vatAccountId.Value,
                        SalesReturnBillId = salesReturn.Id,
                        BillNumber = salesReturn.BillNumber,
                        IsType = TransactionIsType.VAT,
                        Type = TransactionType.SlRt,
                        PurchaseSalesReturnType = "Sales Return",
                        TotalDebit = totalVatDebit,
                        TotalCredit = 0,
                        TaxableAmount = dto.TaxableAmount,
                        VatPercentage = dto.VatPercentage,
                        VatAmount = totalVatDebit,
                        PaymentMode = paymentMode,
                        Date = salesReturn.TransactionDate,
                        BillDate = salesReturn.Date,
                        nepaliDate = dto.NepaliDate,
                        transactionDateNepali = dto.TransactionDateNepali,
                        FiscalYearId = fiscalYearId,
                        CreatedAt = DateTime.UtcNow,
                        Status = TransactionStatus.Active,
                        IsActive = true
                    };

                    await _context.Transactions.AddAsync(vatTransaction);

                    // Add Transaction Items for VAT Transaction
                    foreach (var calc in itemCalculations.Where(c => c.VatAmount > 0))
                    {
                        var transactionItem = new TransactionItem
                        {
                            Id = Guid.NewGuid(),
                            TransactionId = vatTransaction.Id,
                            ItemId = calc.ItemId,
                            UnitId = calc.UnitId,
                            WSUnit = calc.WsUnit,
                            Quantity = calc.Quantity,
                            Price = calc.Price,
                            PuPrice = calc.PuPrice,
                            DiscountPercentagePerItem = calc.DiscountPercentagePerItem,
                            DiscountAmountPerItem = calc.DiscountAmountPerItem,
                            NetPuPrice = calc.NetPuPrice ?? 0,
                            TaxableAmount = calc.TaxableAmount,
                            VatPercentage = calc.VatPercentage,
                            VatAmount = calc.VatAmount,
                            Debit = calc.VatAmount,
                            Credit = 0,
                            CreatedAt = DateTime.UtcNow
                        };
                        await _context.TransactionItems.AddAsync(transactionItem);
                    }

                    _logger.LogInformation("Created VAT transaction: TotalDebit {Amount}", totalVatDebit);
                }

                // 4. ROUND-OFF TRANSACTION if applicable
                if (dto.RoundOffAmount != 0 && roundOffAccountId.HasValue)
                {
                    var roundOffTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        AccountId = roundOffAccountId.Value,
                        SalesReturnBillId = salesReturn.Id,
                        BillNumber = salesReturn.BillNumber,
                        IsType = TransactionIsType.RoundOff,
                        Type = TransactionType.SlRt,
                        PurchaseSalesReturnType = "Sales Return",
                        TotalDebit = dto.RoundOffAmount > 0 ? 0 : Math.Abs(dto.RoundOffAmount.Value),
                        TotalCredit = dto.RoundOffAmount > 0 ? dto.RoundOffAmount.Value : 0,
                        PaymentMode = paymentMode,
                        Date = salesReturn.TransactionDate,
                        BillDate = salesReturn.Date,
                        nepaliDate = dto.NepaliDate,
                        transactionDateNepali = dto.TransactionDateNepali,
                        FiscalYearId = fiscalYearId,
                        CreatedAt = DateTime.UtcNow,
                        Status = TransactionStatus.Active,
                        IsActive = true
                    };

                    await _context.Transactions.AddAsync(roundOffTransaction);
                    _logger.LogInformation("Created Round-off transaction");
                }

                // Update sales return with items
                salesReturn.Items = returnItems;

                // Save all changes
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                _logger.LogInformation("Cash sales return created successfully with ID: {ReturnId}, Number: {ReturnNumber}",
                    salesReturn.Id, salesReturn.BillNumber);

                return salesReturn;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Error creating cash sales return");
                throw;
            }
        }

        public async Task<CashSalesReturnFindsDTO> GetCashSalesReturnFindsAsync(Guid companyId, Guid fiscalYearId, Guid userId)
        {
            try
            {
                _logger.LogInformation("GetCashSalesReturnFindsAsync called for Company: {CompanyId}, FiscalYear: {FiscalYearId}, User: {UserId}",
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

                var latestBillQuery = _context.SalesReturns
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
                var response = new CashSalesReturnFindsDTO
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

                _logger.LogInformation("Successfully retrieved cash sales return finds data for Company: {CompanyId}", companyId);

                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetCashSalesReturnFindsAsync for Company: {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<SalesReturnBillIdResponseDTO> GetCashSalesReturnBillIdByNumberAsync(string billNumber, Guid companyId, Guid fiscalYearId)
        {
            try
            {
                _logger.LogInformation($"Getting credit sales return ID for number: {billNumber}, Company: {companyId}, FiscalYear: {fiscalYearId}");

                var cashSalesReturnBill = await _context.SalesReturns
                    .Where(sr => sr.BillNumber == billNumber &&
                                sr.CompanyId == companyId &&
                                sr.FiscalYearId == fiscalYearId)
                    .Select(sr => new SalesReturnBillIdResponseDTO
                    {
                        Id = sr.Id,
                        BillNumber = sr.BillNumber
                    })
                    .FirstOrDefaultAsync();

                if (cashSalesReturnBill == null)
                {
                    _logger.LogWarning($"Credit sales return not found for number: {billNumber}");
                    throw new ArgumentException("Voucher not found");
                }

                _logger.LogInformation($"Successfully retrieved bill ID for number: {billNumber}");
                return cashSalesReturnBill;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting credit sales ID for number: {billNumber}");
                throw;
            }
        }
        public async Task<SalesReturnEditDataDTO> GetCashSalesReturnEditDataAsync(Guid billId, Guid companyId, Guid fiscalYearId, Guid userId)
        {
            try
            {
                _logger.LogInformation("GetCashSalesReturnEditDataAsync called for Bill ID: {BillId}, Company: {CompanyId}, FiscalYear: {FiscalYearId}",
                    billId, companyId, fiscalYearId);

                // Get company information including date format and VAT enabled status
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

                // Fetch cash sales return invoice with all related data
                var salesReturnInvoice = await _context.SalesReturns
                    .Include(sr => sr.OriginalSalesBill)
                    .Include(sr => sr.Unit)
                    .Include(sr => sr.Items)
                        .ThenInclude(i => i.Item)
                            .ThenInclude(it => it.Unit)
                    .Include(sr => sr.Items)
                        .ThenInclude(i => i.Item)
                            .ThenInclude(it => it.Category)
                    .Include(sr => sr.Items)
                        .ThenInclude(i => i.Unit)
                    .FirstOrDefaultAsync(sr => sr.Id == billId &&
                                              sr.CompanyId == companyId &&
                                              sr.FiscalYearId == fiscalYearId &&
                                              sr.PaymentMode != null && // Cash sales return should have payment mode
                                              sr.CashAccount != null);  // Cash sales return should have cash account

                if (salesReturnInvoice == null)
                    throw new ArgumentException("Cash sales return invoice not found or does not belong to the selected company/fiscal year");

                // Map sales return invoice to response DTO using the existing mapping method
                var salesReturnDto = MapToSalesReturnResponseDTO(salesReturnInvoice, companyDateFormat);

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

                // Fetch accounts (for reference, though cash returns might not need accounts)
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

                // Create response using the same DTO structure
                var response = new SalesReturnEditDataDTO
                {
                    Company = company,
                    SalesReturnInvoice = salesReturnDto, // This already includes the mapped items
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

                _logger.LogInformation("Successfully retrieved cash sales return edit data for Bill ID: {BillId}", billId);

                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting cash sales return edit data for Bill ID: {BillId}", billId);
                throw;
            }
        }

        public async Task<SalesReturn> UpdateCashSalesReturnAsync(Guid id, UpdateSalesReturnDTO dto, Guid companyId, Guid fiscalYearId, Guid userId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                _logger.LogInformation("=== Starting UpdateCashSalesReturnAsync for Bill ID: {BillId} ===", id);

                // Validate required fields
                if (string.IsNullOrEmpty(dto.CashAccount))
                    throw new ArgumentException("Cash account is required");

                if (dto.Items == null || !dto.Items.Any())
                    throw new ArgumentException("At least one item is required");

                if (string.IsNullOrEmpty(dto.PaymentMode))
                    throw new ArgumentException("Payment mode is required");

                // Validate calculated amounts are provided
                if (!dto.SubTotal.HasValue || !dto.TaxableAmount.HasValue ||
                    !dto.NonVatSalesReturn.HasValue || !dto.TotalAmount.HasValue)
                {
                    throw new ArgumentException("SubTotal, TaxableAmount, NonVatSalesReturn, and TotalAmount are required");
                }

                // Get the existing sales return with ALL related data
                var existingBill = await _context.SalesReturns
                    .Include(sr => sr.Items)
                    .FirstOrDefaultAsync(sr => sr.Id == id && sr.CompanyId == companyId);

                if (existingBill == null)
                    throw new ArgumentException("Cash sales return bill not found");

                // Verify this is a cash sales return
                if (string.IsNullOrEmpty(existingBill.CashAccount) || string.IsNullOrEmpty(existingBill.PaymentMode))
                {
                    throw new ArgumentException("The specified sales return is not a cash sales return");
                }

                // Get company to check date format and VAT enabled
                var company = await _context.Companies.FindAsync(companyId);
                if (company == null)
                    throw new ArgumentException("Company not found");

                var fiscalYear = await _context.FiscalYears
                    .FirstOrDefaultAsync(f => f.Id == fiscalYearId && f.CompanyId == companyId);

                if (fiscalYear == null)
                    throw new ArgumentException("Fiscal year not found");

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

                // Determine VAT exemption
                bool isVatExempt = dto.IsVatExempt ?? false;
                bool isVatAll = dto.IsVatAll == "all";
                bool isNepaliFormat = company.DateFormat?.ToString().ToLower() == "nepali";

                // Parse VAT exemption from string if needed
                if (!string.IsNullOrEmpty(dto.IsVatAll))
                {
                    if (dto.IsVatAll.ToLower() == "true" || dto.IsVatAll == "1")
                        isVatExempt = true;
                    else if (dto.IsVatAll.ToLower() == "all")
                        isVatAll = true;
                }

                // Track VAT status validation
                bool hasVatableItems = false;
                bool hasNonVatableItems = false;

                // Calculate total return amount
                decimal totalReturnAmount = dto.TotalAmount ?? 0;
                decimal salesReturnAmount = (dto.TaxableAmount ?? 0) + (dto.NonVatSalesReturn ?? 0);

                // STEP 1: RESTORE STOCK by removing all stock entries for this sales return
                var existingStockEntries = await _context.StockEntries
                    .Where(se => se.SalesReturnBillId == id)
                    .ToListAsync();

                if (existingStockEntries.Any())
                {
                    _context.StockEntries.RemoveRange(existingStockEntries);
                    _logger.LogInformation("Removed {Count} existing stock entries", existingStockEntries.Count);
                }

                // STEP 2: Delete all associated transactions AND their transaction items
                var existingTransactions = await _context.Transactions
                    .Where(t => t.SalesReturnBillId == id)
                    .Include(t => t.TransactionItems)
                    .ToListAsync();

                if (existingTransactions.Any())
                {
                    // TransactionItems will be deleted automatically due to Cascade delete
                    _context.Transactions.RemoveRange(existingTransactions);
                    _logger.LogInformation("Deleted {Count} existing transactions with their items", existingTransactions.Count);
                }

                // STEP 3: Delete existing items
                if (existingBill.Items.Any())
                {
                    _context.SalesReturnItems.RemoveRange(existingBill.Items);
                    existingBill.Items.Clear();
                    _logger.LogInformation("Deleted {Count} existing items", existingBill.Items.Count);
                }

                // Save changes after deletions
                await _context.SaveChangesAsync();
                _logger.LogInformation("Saved deletions successfully");

                // STEP 4: UPDATE BILL PROPERTIES
                existingBill.OriginalSalesBillId = dto.OriginalSalesBillId;
                existingBill.OriginalSalesBillNumber = dto.OriginalSalesBillNumber;
                existingBill.PurchaseSalesReturnType = "Sales Return";
                existingBill.OriginalCopies = dto.OriginalCopies ?? existingBill.OriginalCopies;
                existingBill.FirstPrinted = dto.FirstPrinted ?? existingBill.FirstPrinted;

                // Cash account details (AccountId should remain null for cash returns)
                existingBill.AccountId = null;
                existingBill.CashAccount = dto.CashAccount ?? existingBill.CashAccount;
                existingBill.CashAccountAddress = dto.CashAccountAddress ?? existingBill.CashAccountAddress;
                existingBill.CashAccountPan = dto.CashAccountPan ?? existingBill.CashAccountPan;
                existingBill.CashAccountEmail = dto.CashAccountEmail ?? existingBill.CashAccountEmail;
                existingBill.CashAccountPhone = dto.CashAccountPhone ?? existingBill.CashAccountPhone;

                existingBill.UnitId = dto.UnitId;
                existingBill.SettingsId = dto.SettingsId;

                // Financial fields
                existingBill.SubTotal = dto.SubTotal;
                existingBill.NonVatSalesReturn = dto.NonVatSalesReturn;
                existingBill.TaxableAmount = dto.TaxableAmount;
                existingBill.DiscountPercentage = dto.DiscountPercentage;
                existingBill.DiscountAmount = dto.DiscountAmount;
                existingBill.VatPercentage = isVatExempt ? 0 : (dto.VatPercentage ?? 13);
                existingBill.VatAmount = dto.VatAmount;
                existingBill.TotalAmount = totalReturnAmount;
                existingBill.IsVatExempt = isVatExempt;
                existingBill.IsVatAll = isVatAll ? "all" : (isVatExempt ? "true" : "false");
                existingBill.RoundOffAmount = dto.RoundOffAmount;
                existingBill.PaymentMode = dto.PaymentMode;
                existingBill.Quantity = dto.Quantity;
                existingBill.Price = dto.Price;

                // Dates
                if (dto.NepaliDate != default)
                    existingBill.nepaliDate = dto.NepaliDate;
                if (dto.Date != default)
                    existingBill.Date = dto.Date;
                if (dto.TransactionDateNepali != default)
                    existingBill.transactionDateNepali = dto.TransactionDateNepali;
                if (dto.TransactionDate != default)
                    existingBill.TransactionDate = dto.TransactionDate;

                existingBill.UpdatedAt = DateTime.UtcNow;

                // Update the bill
                _context.SalesReturns.Update(existingBill);
                await _context.SaveChangesAsync();

                // Generate a unique ID for all stock entries in this update
                var uniqueId = Guid.NewGuid().ToString();

                // Track totals for header transactions
                decimal totalCashCredit = 0;
                decimal totalSalesDebit = 0;
                decimal totalVatDebit = 0;

                // Store item calculations for transaction items
                var itemCalculations = new List<SalesReturnItemCalculation>();

                // STEP 5: Process new items and create stock entries
                var returnItems = new List<SalesReturnItem>();
                decimal overallDiscountPercentage = dto.DiscountPercentage ?? 0m;

                // Load all items at once
                var itemIds = dto.Items.Select(i => i.ItemId).Distinct().ToList();
                var itemsDict = await _context.Items
                    .Include(i => i.StockEntries)
                    .Where(i => itemIds.Contains(i.Id))
                    .ToDictionaryAsync(i => i.Id);

                foreach (var itemDto in dto.Items)
                {
                    if (!itemsDict.TryGetValue(itemDto.ItemId, out var item))
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

                    // Try to find a matching sales bill item to get original values
                    var matchingSalesItem = await _context.SalesBillItems
                        .Include(sbi => sbi.SalesBill)
                        .Where(sbi => sbi.ItemId == itemDto.ItemId
                            && sbi.Price == itemDto.Price
                            && sbi.SalesBill.CompanyId == companyId)
                        .OrderByDescending(sbi => sbi.CreatedAt)
                        .FirstOrDefaultAsync();

                    decimal salesPrice = itemDto.Price;
                    decimal puPrice = itemDto.PuPrice ?? itemDto.Price;
                    decimal mrp = itemDto.Mrp ?? 0;
                    decimal marginPercentage = itemDto.MarginPercentage;
                    string batchNumber = itemDto.BatchNumber ?? "XXX";
                    DateOnly? expiryDate = itemDto.ExpiryDate;

                    if (matchingSalesItem != null)
                    {
                        salesPrice = matchingSalesItem.Price;
                        puPrice = matchingSalesItem.PuPrice ?? matchingSalesItem.Price;
                        marginPercentage = matchingSalesItem.MarginPercentage;
                        mrp = matchingSalesItem.Mrp ?? matchingSalesItem.Price;
                        batchNumber = matchingSalesItem.BatchNumber ?? batchNumber;
                        expiryDate = matchingSalesItem.ExpiryDate ?? expiryDate;
                    }

                    // Calculate values
                    decimal totalSalesValueBeforeDiscount = salesPrice * itemDto.Quantity;
                    decimal discountAmountForItem = (totalSalesValueBeforeDiscount * overallDiscountPercentage) / 100m;
                    decimal itemValueAfterDiscount = totalSalesValueBeforeDiscount - discountAmountForItem;

                    // Calculate item-wise VAT
                    decimal itemTaxableAmount = 0m;
                    decimal itemVatPercentage = dto.VatPercentage ?? 0;
                    decimal itemVatAmount = 0m;

                    if (!isVatExempt && itemVatPercentage > 0 && item.VatStatus?.ToLower() == "vatable")
                    {
                        itemTaxableAmount = itemValueAfterDiscount;
                        itemVatAmount = (itemTaxableAmount * itemVatPercentage) / 100m;
                    }

                    // Update totals
                    totalCashCredit += itemValueAfterDiscount + itemVatAmount;   // Cash gets CREDIT (money going OUT)
                    totalSalesDebit += itemValueAfterDiscount;                   // Sales account gets DEBIT (reduction in revenue)
                    totalVatDebit += itemVatAmount;                              // VAT account gets DEBIT (reduction in output VAT)

                    var netPrice = salesPrice - (salesPrice * overallDiscountPercentage / 100);
                    var netPuPrice = puPrice - (puPrice * overallDiscountPercentage / 100);

                    // CREATE STOCK ENTRY (ADDING STOCK BACK TO INVENTORY - POSITIVE QUANTITY)
                    var stockEntry = new StockEntry
                    {
                        Id = Guid.NewGuid(),
                        ItemId = item.Id,
                        Quantity = itemDto.Quantity,
                        Price = salesPrice,
                        PuPrice = puPrice,
                        MarginPercentage = marginPercentage,
                        Mrp = mrp,
                        NetPrice = netPrice,
                        NetPuPrice = netPuPrice,
                        DiscountPercentagePerItem = overallDiscountPercentage,
                        DiscountAmountPerItem = discountAmountForItem,
                        BatchNumber = batchNumber,
                        ExpiryDate = expiryDate ?? DateOnly.FromDateTime(DateTime.Now.AddYears(2)),
                        Date = isNepaliFormat ? existingBill.nepaliDate : existingBill.Date,
                        UniqueUuid = uniqueId,
                        FiscalYearId = fiscalYearId,
                        SalesReturnBillId = existingBill.Id,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };

                    _context.StockEntries.Add(stockEntry);

                    // CREATE NEW SALES RETURN ITEM
                    var returnItem = new SalesReturnItem
                    {
                        Id = Guid.NewGuid(),
                        SalesReturnId = existingBill.Id,
                        ItemId = itemDto.ItemId,
                        UnitId = itemDto.UnitId,
                        Quantity = itemDto.Quantity,
                        Price = salesPrice,
                        PuPrice = puPrice,
                        NetPuPrice = netPuPrice,
                        Mrp = mrp,
                        MarginPercentage = marginPercentage,
                        DiscountPercentagePerItem = overallDiscountPercentage,
                        DiscountAmountPerItem = discountAmountForItem,
                        NetPrice = netPrice,
                        BatchNumber = batchNumber,
                        ExpiryDate = expiryDate,
                        VatStatus = itemDto.VatStatus ?? item.VatStatus ?? "vatable",
                        UniqueUuid = uniqueId,
                        CreatedAt = isNepaliFormat ? existingBill.nepaliDate : existingBill.Date,
                        UpdatedAt = isNepaliFormat ? existingBill.nepaliDate : existingBill.Date
                    };

                    _context.SalesReturnItems.Add(returnItem);
                    returnItems.Add(returnItem);

                    // Store calculation for transaction items
                    itemCalculations.Add(new SalesReturnItemCalculation
                    {
                        ItemId = itemDto.ItemId,
                        UnitId = itemDto.UnitId,
                        WsUnit = 1,
                        Quantity = itemDto.Quantity,
                        Price = salesPrice,
                        PuPrice = puPrice,
                        DiscountPercentagePerItem = overallDiscountPercentage,
                        DiscountAmountPerItem = discountAmountForItem,
                        NetPuPrice = netPuPrice,
                        TaxableAmount = itemTaxableAmount,
                        VatPercentage = itemVatPercentage,
                        VatAmount = itemVatAmount,
                        ItemValueAfterDiscount = itemValueAfterDiscount
                    });
                }

                // VAT validation
                if (dto.IsVatAll != "all")
                {
                    if (isVatExempt && hasVatableItems)
                        throw new InvalidOperationException("Cannot update VAT exempt bill with vatable items");

                    if (!isVatExempt && hasNonVatableItems)
                        throw new InvalidOperationException("Cannot update bill with non-vatable items when VAT is applied");
                }

                // Save items and stock entries
                await _context.SaveChangesAsync();

                // ========== CREATE HEADER TRANSACTIONS WITH TRANSACTION ITEMS ==========

                // 1. CASH IN HAND TRANSACTION (Header - Credit - Money going OUT)
                if (cashAccount != null && totalCashCredit > 0)
                {
                    var cashTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        AccountId = cashAccount.Id,
                        SalesReturnBillId = existingBill.Id,
                        BillNumber = existingBill.BillNumber,
                        IsType = TransactionIsType.SlRt,
                        Type = TransactionType.SlRt,
                        PurchaseSalesReturnType = "Sales Return",
                        TotalDebit = 0,
                        TotalCredit = totalCashCredit,
                        TaxableAmount = dto.TaxableAmount,
                        VatPercentage = dto.VatPercentage,
                        VatAmount = dto.VatAmount,
                        PaymentMode = paymentMode,
                        Date = existingBill.TransactionDate,
                        BillDate = existingBill.Date,
                        nepaliDate = dto.NepaliDate,
                        transactionDateNepali = dto.TransactionDateNepali,
                        FiscalYearId = fiscalYearId,
                        CreatedAt = DateTime.UtcNow,
                        Status = TransactionStatus.Active,
                        IsActive = true
                    };

                    await _context.Transactions.AddAsync(cashTransaction);

                    // Add Transaction Items for Cash Transaction
                    foreach (var calc in itemCalculations)
                    {
                        var transactionItem = new TransactionItem
                        {
                            Id = Guid.NewGuid(),
                            TransactionId = cashTransaction.Id,
                            ItemId = calc.ItemId,
                            UnitId = calc.UnitId,
                            WSUnit = calc.WsUnit,
                            Quantity = calc.Quantity,
                            Price = calc.Price,
                            PuPrice = calc.PuPrice,
                            DiscountPercentagePerItem = calc.DiscountPercentagePerItem,
                            DiscountAmountPerItem = calc.DiscountAmountPerItem,
                            NetPuPrice = calc.NetPuPrice ?? 0,
                            TaxableAmount = calc.TaxableAmount,
                            VatPercentage = calc.VatPercentage,
                            VatAmount = calc.VatAmount,
                            Debit = 0,
                            Credit = calc.ItemValueAfterDiscount + calc.VatAmount,
                            CreatedAt = DateTime.UtcNow
                        };
                        await _context.TransactionItems.AddAsync(transactionItem);
                    }

                    _logger.LogInformation("Created Cash in Hand transaction: TotalCredit {Amount}", totalCashCredit);
                }

                // 2. SALES ACCOUNT TRANSACTION (Header - Debit - Reducing sales revenue)
                if (salesAccount != null && totalSalesDebit > 0)
                {
                    var salesTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        AccountId = salesAccount.Id,
                        SalesReturnBillId = existingBill.Id,
                        BillNumber = existingBill.BillNumber,
                        Type = TransactionType.SlRt,
                        PurchaseSalesReturnType = "Sales Return",
                        TotalDebit = totalSalesDebit,
                        TotalCredit = 0,
                        TaxableAmount = dto.TaxableAmount,
                        VatPercentage = dto.VatPercentage,
                        VatAmount = dto.VatAmount,
                        PaymentMode = paymentMode,
                        Date = existingBill.TransactionDate,
                        BillDate = existingBill.Date,
                        nepaliDate = dto.NepaliDate,
                        transactionDateNepali = dto.TransactionDateNepali,
                        FiscalYearId = fiscalYearId,
                        CreatedAt = DateTime.UtcNow,
                        Status = TransactionStatus.Active,
                        IsActive = true
                    };

                    await _context.Transactions.AddAsync(salesTransaction);

                    // Add Transaction Items for Sales Transaction
                    foreach (var calc in itemCalculations)
                    {
                        var transactionItem = new TransactionItem
                        {
                            Id = Guid.NewGuid(),
                            TransactionId = salesTransaction.Id,
                            ItemId = calc.ItemId,
                            UnitId = calc.UnitId,
                            WSUnit = calc.WsUnit,
                            Quantity = calc.Quantity,
                            Price = calc.Price,
                            PuPrice = calc.PuPrice,
                            DiscountPercentagePerItem = calc.DiscountPercentagePerItem,
                            DiscountAmountPerItem = calc.DiscountAmountPerItem,
                            NetPuPrice = calc.NetPuPrice ?? 0,
                            TaxableAmount = calc.TaxableAmount,
                            VatPercentage = calc.VatPercentage,
                            VatAmount = calc.VatAmount,
                            Debit = calc.ItemValueAfterDiscount,
                            Credit = 0,
                            CreatedAt = DateTime.UtcNow
                        };
                        await _context.TransactionItems.AddAsync(transactionItem);
                    }

                    _logger.LogInformation("Created Sales account transaction: TotalDebit {Amount}", totalSalesDebit);
                }

                // 3. VAT TRANSACTION (Header - Debit - Reducing VAT liability)
                if (totalVatDebit > 0 && vatAccount != null && !isVatExempt)
                {
                    var vatTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        AccountId = vatAccount.Id,
                        SalesReturnBillId = existingBill.Id,
                        BillNumber = existingBill.BillNumber,
                        IsType = TransactionIsType.VAT,
                        Type = TransactionType.SlRt,
                        PurchaseSalesReturnType = "Sales Return",
                        TotalDebit = totalVatDebit,
                        TotalCredit = 0,
                        TaxableAmount = dto.TaxableAmount,
                        VatPercentage = dto.VatPercentage,
                        VatAmount = totalVatDebit,
                        PaymentMode = paymentMode,
                        Date = existingBill.TransactionDate,
                        BillDate = existingBill.Date,
                        nepaliDate = dto.NepaliDate,
                        transactionDateNepali = dto.TransactionDateNepali,
                        FiscalYearId = fiscalYearId,
                        CreatedAt = DateTime.UtcNow,
                        Status = TransactionStatus.Active,
                        IsActive = true
                    };

                    await _context.Transactions.AddAsync(vatTransaction);

                    // Add Transaction Items for VAT Transaction
                    foreach (var calc in itemCalculations.Where(c => c.VatAmount > 0))
                    {
                        var transactionItem = new TransactionItem
                        {
                            Id = Guid.NewGuid(),
                            TransactionId = vatTransaction.Id,
                            ItemId = calc.ItemId,
                            UnitId = calc.UnitId,
                            WSUnit = calc.WsUnit,
                            Quantity = calc.Quantity,
                            Price = calc.Price,
                            PuPrice = calc.PuPrice,
                            DiscountPercentagePerItem = calc.DiscountPercentagePerItem,
                            DiscountAmountPerItem = calc.DiscountAmountPerItem,
                            NetPuPrice = calc.NetPuPrice ?? 0,
                            TaxableAmount = calc.TaxableAmount,
                            VatPercentage = calc.VatPercentage,
                            VatAmount = calc.VatAmount,
                            Debit = calc.VatAmount,
                            Credit = 0,
                            CreatedAt = DateTime.UtcNow
                        };
                        await _context.TransactionItems.AddAsync(transactionItem);
                    }

                    _logger.LogInformation("Created VAT transaction: TotalDebit {Amount}", totalVatDebit);
                }

                // 4. ROUND-OFF TRANSACTION if applicable
                if (dto.RoundOffAmount != 0 && roundOffAccount != null)
                {
                    var roundOffTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        AccountId = roundOffAccount.Id,
                        SalesReturnBillId = existingBill.Id,
                        BillNumber = existingBill.BillNumber,
                        IsType = TransactionIsType.RoundOff,
                        Type = TransactionType.SlRt,
                        PurchaseSalesReturnType = "Sales Return",
                        TotalDebit = dto.RoundOffAmount > 0 ? 0 : Math.Abs(dto.RoundOffAmount.Value),
                        TotalCredit = dto.RoundOffAmount > 0 ? dto.RoundOffAmount.Value : 0,
                        PaymentMode = paymentMode,
                        Date = existingBill.TransactionDate,
                        BillDate = existingBill.Date,
                        nepaliDate = dto.NepaliDate,
                        transactionDateNepali = dto.TransactionDateNepali,
                        FiscalYearId = fiscalYearId,
                        CreatedAt = DateTime.UtcNow,
                        Status = TransactionStatus.Active,
                        IsActive = true
                    };

                    await _context.Transactions.AddAsync(roundOffTransaction);
                    _logger.LogInformation("Created Round-off transaction");
                }

                // Update items collection
                existingBill.Items = returnItems;

                // Save all changes
                var saveResult = await _context.SaveChangesAsync();
                _logger.LogInformation("SaveChangesAsync completed. {RowCount} rows affected.", saveResult);

                await transaction.CommitAsync();
                _logger.LogInformation("Transaction committed successfully");

                _logger.LogInformation("=== Successfully updated cash sales return bill: {BillId} ===", id);

                return existingBill;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating cash sales return bill: {BillId}", id);
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<SalesReturnRegisterDataDTO> GetSalesReturnRegisterAsync(Guid companyId, Guid fiscalYearId, string? fromDate = null, string? toDate = null)
        {
            try
            {
                _logger.LogInformation("GetSalesReturnRegisterAsync called with companyId: {CompanyId}, fiscalYearId: {FiscalYearId}, fromDate: {FromDate}, toDate: {ToDate}",
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

                // Parse dates based on company format
                DateTime startDateTime;
                DateTime endDateTime;

                if (isNepaliFormat)
                {
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

                _logger.LogInformation("Searching for sales returns between {StartDate} and {EndDate} using {DateFormat} format",
                    startDateTime, endDateTime, isNepaliFormat ? "Nepali" : "English");

                // Build query for ALL sales returns (both cash and credit)
                var query = _context.SalesReturns
                    .Include(sr => sr.Company)
                    .Include(sr => sr.Account)
                    .Include(sr => sr.User)
                    .Include(sr => sr.FiscalYear)
                    .Include(sr => sr.Items)
                        .ThenInclude(i => i.Item)
                    .Include(sr => sr.OriginalSalesBill)
                    .Where(sr => sr.CompanyId == companyId &&
                                sr.FiscalYearId == fiscalYearId);

                // Apply date filter based on company's date format
                if (isNepaliFormat)
                {
                    // Use nepaliDate field for filtering
                    query = query.Where(sr => sr.nepaliDate >= startDateTime && sr.nepaliDate <= endDateTime);
                    _logger.LogInformation("Using nepaliDate field for filtering");
                }
                else
                {
                    // Use Date field for filtering
                    query = query.Where(sr => sr.Date >= startDateTime && sr.Date <= endDateTime);
                    _logger.LogInformation("Using Date field for filtering");
                }

                // Log the SQL query (optional - for debugging)
                var sql = query.ToQueryString();
                _logger.LogDebug("SQL Query: {Sql}", sql);

                // Get bills ordered by date and bill number
                var salesReturns = await query
                    .OrderBy(sr => sr.Date)
                    .ThenBy(sr => sr.BillNumber)
                    .ToListAsync();

                _logger.LogInformation("Found {Count} sales returns matching the criteria", salesReturns.Count);
                _logger.LogInformation("Breakdown - Credit: {CreditCount}, Cash: {CashCount}",
                    salesReturns.Count(sr => sr.AccountId != null),
                    salesReturns.Count(sr => sr.AccountId == null && sr.CashAccount != null));

                // Map to response DTOs using your existing mapping method
                var billDtos = salesReturns.Select(bill => MapToSalesReturnResponseDTO(bill, company.DateFormat)).ToList();

                return new SalesReturnRegisterDataDTO
                {
                    Company = company,
                    CurrentFiscalYear = fiscalYear,
                    Bills = billDtos,
                    FromDate = fromDate,
                    ToDate = toDate,
                    CurrentCompanyName = company.Name,
                    CompanyDateFormat = company.DateFormat,
                    VatEnabled = company.VatEnabled,
                    IsVatExempt = company.VatEnabled == false
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting sales return register for company {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<SalesReturnEntryDataDTO> GetSalesReturnRegisterEntryDataAsync(Guid companyId, Guid fiscalYearId, Guid userId)
        {
            try
            {
                _logger.LogInformation("GetSalesReturnRegisterEntryDataAsync called for Company: {CompanyId}, FiscalYear: {FiscalYearId}, User: {UserId}",
                    companyId, fiscalYearId, userId);

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

                // Get all accounts (for credit returns)
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

                // Get user preferences
                var user = await _context.Users
                    .Include(u => u.Preferences)
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

                // Create the response
                var data = new SalesReturnEntryDataDTO
                {
                    Company = company,
                    Accounts = accounts,
                    Categories = categories,
                    Units = units,
                    Dates = new DateInfoDTO
                    {
                        NepaliDate = DateTime.UtcNow.ToString("yyyy-MM-dd"),
                        TransactionDateNepali = DateTime.UtcNow.ToString("yyyy-MM-dd"),
                        CompanyDateFormat = company.DateFormat
                    },
                    CurrentFiscalYear = fiscalYear,
                    UserPreferences = new UserPreferencesDTO
                    {
                        Theme = user?.Preferences?.Theme.ToString() ?? "light"
                    },
                    Permissions = new PermissionsDTO
                    {
                        IsAdminOrSupervisor = isAdmin || userRole == "Supervisor",
                        StoreManagementEnabled = false
                    },
                    CurrentCompanyName = company.Name
                };

                _logger.LogInformation("Successfully retrieved sales return entry data for company {CompanyName}", company.Name);

                return data;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting sales return entry data for company {CompanyId}", companyId);
                throw;
            }
        }

        // public async Task<SalesReturnPrintDTO> GetSalesReturnForPrintAsync(Guid id, Guid companyId, Guid userId, Guid fiscalYearId)
        // {
        //     try
        //     {
        //         _logger.LogInformation("GetSalesReturnForPrintAsync called for Bill ID: {BillId}, Company: {CompanyId}", id, companyId);

        //         // Get company details
        //         var companyEntity = await _context.Companies
        //             .Where(c => c.Id == companyId)
        //             .FirstOrDefaultAsync();

        //         if (companyEntity == null)
        //             throw new ArgumentException("Company not found");

        //         // Parse renewal date
        //         DateTime? renewalDate = null;
        //         if (DateTime.TryParse(companyEntity.RenewalDate, out var parsedDate))
        //         {
        //             renewalDate = parsedDate;
        //         }

        //         // Create company DTO
        //         var company = new CompanyPrintDTO
        //         {
        //             Id = companyEntity.Id,
        //             RenewalDate = renewalDate,
        //             DateFormat = companyEntity.DateFormat.ToString(),
        //             FiscalYear = null
        //         };

        //         // Get fiscal year
        //         var currentFiscalYear = await _context.FiscalYears
        //             .Where(f => f.Id == fiscalYearId && f.CompanyId == companyId)
        //             .Select(f => new FiscalYearDTO
        //             {
        //                 Id = f.Id,
        //                 Name = f.Name,
        //                 StartDate = f.StartDate,
        //                 EndDate = f.EndDate,
        //                 StartDateNepali = f.StartDateNepali,
        //                 EndDateNepali = f.EndDateNepali,
        //                 IsActive = f.IsActive
        //             })
        //             .FirstOrDefaultAsync();

        //         // Get current company info for display
        //         var currentCompany = await _context.Companies
        //             .Where(c => c.Id == companyId)
        //             .Select(c => new CompanyPrintInfoDTO
        //             {
        //                 Id = c.Id,
        //                 Name = c.Name,
        //                 Phone = c.Phone,
        //                 Pan = c.Pan,
        //                 Address = c.Address
        //             })
        //             .FirstOrDefaultAsync();

        //         // Get the sales return with all related data
        //         var salesReturn = await _context.SalesReturns
        //             .Include(sr => sr.Account)
        //             .Include(sr => sr.User)
        //             .Include(sr => sr.OriginalSalesBill)
        //             .Include(sr => sr.Items)
        //                 .ThenInclude(i => i.Item)
        //                     .ThenInclude(it => it.Unit)
        //             .FirstOrDefaultAsync(sr => sr.Id == id && sr.CompanyId == companyId);

        //         if (salesReturn == null)
        //             throw new ArgumentException("Sales return bill not found");

        //         // Check and update first printed status
        //         bool firstBill = !salesReturn.FirstPrinted;
        //         if (firstBill)
        //         {
        //             salesReturn.FirstPrinted = true;
        //             salesReturn.PrintCount += 1;
        //             await _context.SaveChangesAsync();
        //         }

        //         // Calculate last balance for credit bills
        //         decimal? finalBalance = null;
        //         string balanceLabel = "";

        //         if (salesReturn.PaymentMode?.ToLower() == "credit" && salesReturn.AccountId != null)
        //         {
        //             // Find the latest transaction for this sales return
        //             var latestTransaction = await _context.Transactions
        //                 .Where(t => t.CompanyId == companyId &&
        //                            t.SalesReturnBillId == id)
        //                 .OrderByDescending(t => t.Date)
        //                 .FirstOrDefaultAsync();

        //             decimal lastBalance = 0;

        //             if (latestTransaction != null)
        //             {
        //                 lastBalance = Math.Abs(latestTransaction.Balance ?? 0);
        //                 if (latestTransaction.Debit > 0)
        //                     balanceLabel = "Dr";
        //                 else if (latestTransaction.Credit > 0)
        //                     balanceLabel = "Cr";
        //             }

        //             // Get opening balance from account
        //             if (salesReturn.Account != null && salesReturn.Account.OpeningBalance != null)
        //             {
        //                 var openingBalance = salesReturn.Account.OpeningBalance;
        //                 lastBalance += openingBalance.Type == "Dr" ? openingBalance.Amount : -openingBalance.Amount;
        //                 balanceLabel = openingBalance.Type;
        //             }

        //             finalBalance = lastBalance;
        //         }

        //         // Get user with roles
        //         var user = await _context.Users
        //             .Include(u => u.UserRoles)
        //                 .ThenInclude(ur => ur.Role)
        //             .Include(u => u.Preferences)
        //             .FirstOrDefaultAsync(u => u.Id == userId);

        //         // Create user preferences DTO
        //         var userPreferences = new UserPreferencesDTO
        //         {
        //             Theme = user?.Preferences?.Theme.ToString() ?? "Light"
        //         };

        //         // Determine if user is admin or supervisor
        //         bool isAdminOrSupervisor = user?.IsAdmin == true ||
        //                                   (user?.UserRoles?.Any(ur => ur.Role?.Name == "Supervisor" &&
        //                                                              (ur.ExpiresAt == null || ur.ExpiresAt > DateTime.UtcNow)) ?? false);

        //         // Get company date format
        //         bool isNepaliFormat = company.DateFormat?.ToLower() == "nepali";

        //         // Map to response DTO
        //         var response = new SalesReturnPrintDTO
        //         {
        //             Company = company,
        //             CurrentFiscalYear = currentFiscalYear,
        //             Bill = new SalesReturnPrintBillDTO
        //             {
        //                 Id = salesReturn.Id,
        //                 BillNumber = salesReturn.BillNumber,
        //                 OriginalSalesBillId = salesReturn.OriginalSalesBillId,
        //                 OriginalSalesBillNumber = salesReturn.OriginalSalesBillNumber,
        //                 OriginalSalesBill = salesReturn.OriginalSalesBill != null ? new SalesBillPrintBillDTO
        //                 {
        //                     Id = salesReturn.OriginalSalesBill.Id,
        //                     BillNumber = salesReturn.OriginalSalesBill.BillNumber,
        //                     TotalAmount = salesReturn.OriginalSalesBill.TotalAmount,
        //                 } : null,
        //                 FirstPrinted = salesReturn.FirstPrinted,
        //                 PrintCount = salesReturn.PrintCount,
        //                 PaymentMode = salesReturn.PaymentMode,
        //                 Date = isNepaliFormat ? salesReturn.nepaliDate : salesReturn.Date,
        //                 TransactionDate = isNepaliFormat ? salesReturn.transactionDateNepali : salesReturn.TransactionDate,
        //                 SubTotal = salesReturn.SubTotal ?? 0,
        //                 NonVatSalesReturn = salesReturn.NonVatSalesReturn ?? 0,
        //                 TaxableAmount = salesReturn.TaxableAmount ?? 0,
        //                 DiscountPercentage = salesReturn.DiscountPercentage ?? 0,
        //                 DiscountAmount = salesReturn.DiscountAmount ?? 0,
        //                 VatPercentage = salesReturn.VatPercentage,
        //                 VatAmount = salesReturn.VatAmount ?? 0,
        //                 TotalAmount = salesReturn.TotalAmount ?? 0,
        //                 IsVatExempt = salesReturn.IsVatExempt,
        //                 RoundOffAmount = salesReturn.RoundOffAmount ?? 0,
        //                 Account = salesReturn.Account != null ? new AccountPrintDTO
        //                 {
        //                     Id = salesReturn.Account.Id,
        //                     Name = salesReturn.Account.Name,
        //                     Pan = salesReturn.Account.Pan,
        //                     Address = salesReturn.Account.Address,
        //                     Email = salesReturn.Account.Email,
        //                     Phone = salesReturn.Account.Phone,
        //                 } : null,
        //                 CashAccount = salesReturn.CashAccount,
        //                 CashAccountAddress = salesReturn.CashAccountAddress,
        //                 CashAccountPan = salesReturn.CashAccountPan,
        //                 CashAccountEmail = salesReturn.CashAccountEmail,
        //                 CashAccountPhone = salesReturn.CashAccountPhone,
        //                 User = salesReturn.User != null ? new UserPrintDTO
        //                 {
        //                     Id = salesReturn.User.Id,
        //                     Name = salesReturn.User.Name,
        //                     IsAdmin = salesReturn.User.IsAdmin,
        //                     Role = salesReturn.User.UserRoles?
        //                         .FirstOrDefault(ur => ur.IsPrimary)?.Role?.Name ?? "User"
        //                 } : null,
        //                 Items = salesReturn.Items.Select(i => new SalesReturnItemPrintDTO
        //                 {
        //                     Id = i.Id,
        //                     ItemId = i.ItemId,
        //                     ItemName = i.Item?.Name,
        //                     Hscode = i.Item?.Hscode,
        //                     UniqueNumber = i.Item?.UniqueNumber ?? 0,
        //                     UnitId = i.UnitId,
        //                     UnitName = i.Unit?.Name ?? i.Item?.Unit?.Name,
        //                     Quantity = i.Quantity,
        //                     Price = i.Price,
        //                     PuPrice = i.PuPrice ?? 0,
        //                     DiscountPercentagePerItem = i.DiscountPercentagePerItem,
        //                     DiscountAmountPerItem = i.DiscountAmountPerItem,
        //                     NetPuPrice = i.NetPuPrice,
        //                     NetPrice = i.NetPrice ?? 0,
        //                     BatchNumber = i.BatchNumber,
        //                     ExpiryDate = i.ExpiryDate,
        //                     VatStatus = i.VatStatus ?? "vatable"
        //                 }).ToList()
        //             },
        //             CurrentCompanyName = currentCompany?.Name ?? string.Empty,
        //             CurrentCompany = currentCompany ?? new CompanyPrintInfoDTO(),
        //             FirstBill = firstBill,
        //             LastBalance = finalBalance,
        //             BalanceLabel = balanceLabel,
        //             PaymentMode = salesReturn.PaymentMode ?? string.Empty,
        //             NepaliDate = salesReturn.nepaliDate.ToString("yyyy-MM-dd"),
        //             TransactionDateNepali = salesReturn.transactionDateNepali.ToString("yyyy-MM-dd"),
        //             EnglishDate = salesReturn.Date,
        //             CompanyDateFormat = company.DateFormat?.ToString()?.ToLower() ?? "english",
        //             User = new UserPrintDTO
        //             {
        //                 Id = userId,
        //                 Name = user?.Name ?? string.Empty,
        //                 IsAdmin = user?.IsAdmin ?? false,
        //                 Role = user?.UserRoles?
        //                     .FirstOrDefault(ur => ur.IsPrimary)?.Role?.Name ??
        //                        (user?.IsAdmin == true ? "Admin" : "User"),
        //                 Preferences = userPreferences
        //             },
        //             IsAdminOrSupervisor = isAdminOrSupervisor
        //         };

        //         return response;
        //     }
        //     catch (Exception ex)
        //     {
        //         _logger.LogError(ex, "Error getting sales return for print: {BillId}", id);
        //         throw;
        //     }
        // }

        public async Task<SalesReturnPrintDTO> GetSalesReturnForPrintAsync(Guid id, Guid companyId, Guid userId, Guid fiscalYearId)
        {
            try
            {
                _logger.LogInformation("GetSalesReturnForPrintAsync called for Bill ID: {BillId}, Company: {CompanyId}", id, companyId);

                // Get company details
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

                // Create company DTO
                var company = new CompanyPrintDTO
                {
                    Id = companyEntity.Id,
                    RenewalDate = renewalDate,
                    DateFormat = companyEntity.DateFormat.ToString(),
                    FiscalYear = null
                };

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

                // Get current company info for display
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

                // Get the sales return with all related data
                var salesReturn = await _context.SalesReturns
                    .Include(sr => sr.Account)
                    .Include(sr => sr.User)
                    .Include(sr => sr.OriginalSalesBill)
                    .Include(sr => sr.Items)
                        .ThenInclude(i => i.Item)
                            .ThenInclude(it => it.Unit)
                    .FirstOrDefaultAsync(sr => sr.Id == id && sr.CompanyId == companyId);

                if (salesReturn == null)
                    throw new ArgumentException("Sales return bill not found");

                // Get the party transaction for this sales return (for credit returns)
                Transaction? partyTransaction = null;
                if (salesReturn.PaymentMode?.ToLower() == "credit" && salesReturn.AccountId != null)
                {
                    partyTransaction = await _context.Transactions
                        .Where(t => t.CompanyId == companyId &&
                                   t.SalesReturnBillId == id &&
                                   t.Type == TransactionType.SlRt &&
                                   t.TotalCredit > 0) // Party transaction has TotalCredit for sales return
                        .Include(t => t.TransactionItems)
                        .OrderByDescending(t => t.Date)
                        .FirstOrDefaultAsync();
                }

                // For cash returns, get the cash transaction
                Transaction? cashTransaction = null;
                if (salesReturn.PaymentMode?.ToLower() == "cash")
                {
                    cashTransaction = await _context.Transactions
                        .Where(t => t.CompanyId == companyId &&
                                   t.SalesReturnBillId == id &&
                                   t.Type == TransactionType.SlRt &&
                                   t.TotalCredit > 0) // Cash transaction has TotalCredit (money going OUT)
                        .Include(t => t.TransactionItems)
                        .OrderByDescending(t => t.Date)
                        .FirstOrDefaultAsync();
                }

                // Create a dictionary for quick lookup of item-wise VAT from TransactionItems
                var itemVatDictionary = new Dictionary<Guid, (decimal? TaxableAmount, decimal? VatPercentage, decimal? VatAmount)>();

                var relevantTransaction = partyTransaction ?? cashTransaction;
                if (relevantTransaction?.TransactionItems != null)
                {
                    foreach (var ti in relevantTransaction.TransactionItems)
                    {
                        if (ti.ItemId.HasValue)
                        {
                            itemVatDictionary[ti.ItemId.Value] = (
                                ti.TaxableAmount,
                                ti.VatPercentage,
                                ti.VatAmount
                            );
                        }
                    }
                }

                // Check and update first printed status
                bool firstBill = !salesReturn.FirstPrinted;
                if (firstBill)
                {
                    salesReturn.FirstPrinted = true;
                    salesReturn.PrintCount += 1;
                    await _context.SaveChangesAsync();
                }

                // Calculate last balance for credit bills
                decimal? finalBalance = null;
                string balanceLabel = "";

                if (salesReturn.PaymentMode?.ToLower() == "credit" && salesReturn.AccountId != null)
                {
                    decimal lastBalance = 0;

                    if (partyTransaction != null)
                    {
                        // Use TotalCredit for party transaction (reduction in receivable)
                        lastBalance = Math.Abs(partyTransaction.TotalCredit);

                        // Determine if it's Debit or Credit balance
                        if (partyTransaction.TotalDebit > partyTransaction.TotalCredit)
                            balanceLabel = "Dr";
                        else if (partyTransaction.TotalCredit > partyTransaction.TotalDebit)
                            balanceLabel = "Cr";
                        else
                            balanceLabel = "";
                    }

                    // Get opening balance from account
                    if (salesReturn.Account != null && salesReturn.Account.OpeningBalance != null)
                    {
                        var openingBalance = salesReturn.Account.OpeningBalance;
                        lastBalance += openingBalance.Type == "Dr" ? openingBalance.Amount : -openingBalance.Amount;
                        balanceLabel = openingBalance.Type;
                    }

                    finalBalance = lastBalance;
                }

                // Get user with roles
                var user = await _context.Users
                    .Include(u => u.UserRoles)
                        .ThenInclude(ur => ur.Role)
                    .Include(u => u.Preferences)
                    .FirstOrDefaultAsync(u => u.Id == userId);

                // Create user preferences DTO
                var userPreferences = new UserPreferencesDTO
                {
                    Theme = user?.Preferences?.Theme.ToString() ?? "Light"
                };

                // Determine if user is admin or supervisor
                bool isAdminOrSupervisor = user?.IsAdmin == true ||
                                          (user?.UserRoles?.Any(ur => ur.Role?.Name == "Supervisor" &&
                                                                     (ur.ExpiresAt == null || ur.ExpiresAt > DateTime.UtcNow)) ?? false);

                // Get company date format
                bool isNepaliFormat = company.DateFormat?.ToLower() == "nepali";

                // Map to response DTO with item-wise VAT from TransactionItems
                var response = new SalesReturnPrintDTO
                {
                    Company = company,
                    CurrentFiscalYear = currentFiscalYear,
                    Bill = new SalesReturnPrintBillDTO
                    {
                        Id = salesReturn.Id,
                        BillNumber = salesReturn.BillNumber,
                        OriginalSalesBillId = salesReturn.OriginalSalesBillId,
                        OriginalSalesBillNumber = salesReturn.OriginalSalesBillNumber,
                        OriginalSalesBill = salesReturn.OriginalSalesBill != null ? new SalesBillPrintBillDTO
                        {
                            Id = salesReturn.OriginalSalesBill.Id,
                            BillNumber = salesReturn.OriginalSalesBill.BillNumber,
                            TotalAmount = salesReturn.OriginalSalesBill.TotalAmount,
                        } : null,
                        FirstPrinted = salesReturn.FirstPrinted,
                        PrintCount = salesReturn.PrintCount,
                        PaymentMode = salesReturn.PaymentMode,
                        Date = isNepaliFormat ? salesReturn.nepaliDate : salesReturn.Date,
                        TransactionDate = isNepaliFormat ? salesReturn.transactionDateNepali : salesReturn.TransactionDate,
                        SubTotal = salesReturn.SubTotal ?? 0,
                        NonVatSalesReturn = salesReturn.NonVatSalesReturn ?? 0,
                        TaxableAmount = salesReturn.TaxableAmount ?? 0,
                        DiscountPercentage = salesReturn.DiscountPercentage ?? 0,
                        DiscountAmount = salesReturn.DiscountAmount ?? 0,
                        VatPercentage = salesReturn.VatPercentage,
                        VatAmount = salesReturn.VatAmount ?? 0,
                        TotalAmount = salesReturn.TotalAmount ?? 0,
                        IsVatExempt = salesReturn.IsVatExempt,
                        RoundOffAmount = salesReturn.RoundOffAmount ?? 0,
                        Account = salesReturn.Account != null ? new AccountPrintDTO
                        {
                            Id = salesReturn.Account.Id,
                            Name = salesReturn.Account.Name,
                            Pan = salesReturn.Account.Pan,
                            Address = salesReturn.Account.Address,
                            Email = salesReturn.Account.Email,
                            Phone = salesReturn.Account.Phone,
                        } : null,
                        CashAccount = salesReturn.CashAccount,
                        CashAccountAddress = salesReturn.CashAccountAddress,
                        CashAccountPan = salesReturn.CashAccountPan,
                        CashAccountEmail = salesReturn.CashAccountEmail,
                        CashAccountPhone = salesReturn.CashAccountPhone,
                        User = salesReturn.User != null ? new UserPrintDTO
                        {
                            Id = salesReturn.User.Id,
                            Name = salesReturn.User.Name,
                            IsAdmin = salesReturn.User.IsAdmin,
                            Role = salesReturn.User.UserRoles?
                                .FirstOrDefault(ur => ur.IsPrimary)?.Role?.Name ?? "User"
                        } : null,
                        Items = salesReturn.Items.Select(i =>
                        {
                            // Get item-wise VAT from dictionary if available
                            itemVatDictionary.TryGetValue(i.ItemId, out var vatInfo);

                            return new SalesReturnItemPrintDTO
                            {
                                Id = i.Id,
                                ItemId = i.ItemId,
                                ItemName = i.Item?.Name,
                                Hscode = i.Item?.Hscode,
                                UniqueNumber = i.Item?.UniqueNumber ?? 0,
                                UnitId = i.UnitId,
                                UnitName = i.Unit?.Name ?? i.Item?.Unit?.Name,
                                Quantity = i.Quantity,
                                Price = i.Price,
                                PuPrice = i.PuPrice ?? 0,
                                DiscountPercentagePerItem = i.DiscountPercentagePerItem,
                                DiscountAmountPerItem = i.DiscountAmountPerItem,
                                NetPuPrice = i.NetPuPrice,
                                NetPrice = i.NetPrice ?? 0,
                                BatchNumber = i.BatchNumber,
                                ExpiryDate = i.ExpiryDate,
                                VatStatus = i.VatStatus ?? "vatable",
                            };
                        }).ToList()
                    },
                    CurrentCompanyName = currentCompany?.Name ?? string.Empty,
                    CurrentCompany = currentCompany ?? new CompanyPrintInfoDTO(),
                    FirstBill = firstBill,
                    LastBalance = finalBalance,
                    BalanceLabel = balanceLabel,
                    PaymentMode = salesReturn.PaymentMode ?? string.Empty,
                    NepaliDate = salesReturn.nepaliDate.ToString("yyyy-MM-dd"),
                    TransactionDateNepali = salesReturn.transactionDateNepali.ToString("yyyy-MM-dd"),
                    EnglishDate = salesReturn.Date,
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
                _logger.LogError(ex, "Error getting sales return for print: {BillId}", id);
                throw;
            }
        }

        public async Task<SalesReturnVatReportDTO> GetSalesReturnVatReportAsync(Guid companyId, Guid fiscalYearId, string? fromDate, string? toDate)
        {
            try
            {
                _logger.LogInformation("GetSalesReturnVatReportAsync called for Company: {CompanyId}, FiscalYear: {FiscalYearId}, FromDate: {FromDate}, ToDate: {ToDate}",
                    companyId, fiscalYearId, fromDate, toDate);

                // Get company details
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

                string companyDateFormat = company.DateFormat?.ToLower() ?? "english";
                string nepaliDate = DateTime.UtcNow.ToString("yyyy-MM-dd");

                // If no date range provided, return empty report
                if (string.IsNullOrEmpty(fromDate) || string.IsNullOrEmpty(toDate))
                {
                    return new SalesReturnVatReportDTO
                    {
                        Company = company,
                        CurrentFiscalYear = currentFiscalYear,
                        SalesReturnVatReport = new List<SalesReturnVatEntryDTO>(),
                        CompanyDateFormat = companyDateFormat,
                        NepaliDate = nepaliDate,
                        CurrentCompany = company,
                        FromDate = fromDate ?? "",
                        ToDate = toDate ?? "",
                        CurrentCompanyName = company.Name
                    };
                }

                // Determine if company uses Nepali date format
                bool isNepaliFormat = companyDateFormat == "nepali";

                // Parse dates
                DateTime startDateTime;
                DateTime endDateTime;

                if (isNepaliFormat)
                {
                    if (!DateTime.TryParse(fromDate, out startDateTime))
                        startDateTime = DateTime.MinValue;
                    if (!DateTime.TryParse(toDate, out endDateTime))
                        endDateTime = DateTime.MaxValue;
                }
                else
                {
                    if (!DateTime.TryParse(fromDate, out startDateTime))
                        startDateTime = DateTime.MinValue;
                    if (!DateTime.TryParse(toDate, out endDateTime))
                        endDateTime = DateTime.MaxValue;
                }

                endDateTime = endDateTime.Date.AddDays(1).AddTicks(-1);

                // Build query for sales returns
                var query = _context.SalesReturns
                    .Where(sr => sr.CompanyId == companyId &&
                                sr.FiscalYearId == fiscalYearId);

                // Apply date filter based on company's date format
                if (isNepaliFormat)
                    query = query.Where(sr => sr.nepaliDate >= startDateTime && sr.nepaliDate <= endDateTime);
                else
                    query = query.Where(sr => sr.Date >= startDateTime && sr.Date <= endDateTime);

                var salesReturns = await query
                    .Include(sr => sr.Account)
                    .OrderBy(sr => sr.Date)
                    .ToListAsync();

                // Build the sales return VAT report
                var salesReturnVatReport = salesReturns.Select(salesReturn => new SalesReturnVatEntryDTO
                {
                    BillNumber = salesReturn.BillNumber,
                    Date = salesReturn.Date,
                    NepaliDate = salesReturn.nepaliDate,
                    AccountName = salesReturn.Account != null ? salesReturn.Account.Name ?? "" : salesReturn.CashAccount ?? "Cash Sale Return",
                    PanNumber = salesReturn.Account != null ? salesReturn.Account.Pan ?? "" : salesReturn.CashAccountPan ?? "",
                    TotalAmount = salesReturn.TotalAmount ?? 0,
                    DiscountAmount = salesReturn.DiscountAmount ?? 0,
                    NonVatSalesReturn = salesReturn.NonVatSalesReturn ?? 0,
                    TaxableAmount = salesReturn.TaxableAmount ?? 0,
                    VatAmount = salesReturn.VatAmount ?? 0,
                    IsCash = salesReturn.Account == null
                }).ToList();

                return new SalesReturnVatReportDTO
                {
                    Company = company,
                    CurrentFiscalYear = currentFiscalYear,
                    SalesReturnVatReport = salesReturnVatReport,
                    CompanyDateFormat = companyDateFormat,
                    NepaliDate = nepaliDate,
                    CurrentCompany = company,
                    FromDate = fromDate,
                    ToDate = toDate,
                    CurrentCompanyName = company.Name
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetSalesReturnVatReportAsync for Company: {CompanyId}", companyId);
                throw;
            }
        }
    }
}