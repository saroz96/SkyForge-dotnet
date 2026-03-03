using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Models.AccountModel;
using SkyForge.Models.CompanyModel;
using SkyForge.Models.FiscalYearModel;
using SkyForge.Models.Retailer.Purchase;
using SkyForge.Models.Retailer.SettingsModel;
using SkyForge.Models.UnitModel;
using SkyForge.Models.UserModel;
using System.Linq;
using System.Text.RegularExpressions;
using SkyForge.Dto.RetailerDto.PurchaseBillDto;
using SkyForge.Dto.AccountDto;
using SkyForge.Services.BillNumberServices;
using SkyForge.Models.Retailer.Items;
using SkyForge.Models.Retailer.StoreModel;
using SkyForge.Models.RackModel;
using SkyForge.Models.Retailer.TransactionModel;
using SkyForge.Models.Shared;

namespace SkyForge.Services.Retailer.PurchaseServices
{
    public class PurchaseService : IPurchaseService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<PurchaseService> _logger;
        private readonly IBillNumberService _billNumberService;

        public PurchaseService(
            ApplicationDbContext context,
             ILogger<PurchaseService> logger,
             IBillNumberService billNumberService
             )
        {
            _context = context;
            _logger = logger;
            _billNumberService = billNumberService;
        }

        public async Task<PurchaseRegisterDataDTO> GetPurchaseRegisterAsync(
            Guid companyId,
            Guid fiscalYearId,
            string? fromDate = null,
            string? toDate = null)
        {
            try
            {
                _logger.LogInformation("GetPurchaseRegisterAsync called with companyId: {CompanyId}, fiscalYearId: {FiscalYearId}, fromDate: {FromDate}, toDate: {ToDate}",
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
                    return new PurchaseRegisterDataDTO
                    {
                        Company = company,
                        CurrentFiscalYear = fiscalYear,
                        Bills = new List<PurchaseBillResponseDTO>(),
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
                var totalBillsCount = await _context.PurchaseBills
                    .CountAsync(pb => pb.CompanyId == companyId && pb.FiscalYearId == fiscalYearId);

                _logger.LogInformation("Total bills for company {CompanyId} and fiscal year {FiscalYearId}: {Count}",
                    companyId, fiscalYearId, totalBillsCount);

                // Build query with date filter based on company date format
                var query = _context.PurchaseBills
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
                var purchaseBills = await query
                    .OrderBy(pb => pb.Date)
                    .ThenBy(pb => pb.BillNumber)
                    .ToListAsync();

                _logger.LogInformation("Found {Count} bills matching the criteria", purchaseBills.Count);

                // If no bills found, log sample of all bills to debug
                if (purchaseBills.Count == 0)
                {
                    var sampleBills = await _context.PurchaseBills
                        .Where(pb => pb.CompanyId == companyId)
                        .OrderByDescending(pb => pb.Date)
                        .Take(5)
                        .Select(pb => new { pb.Id, pb.BillNumber, pb.Date, pb.nepaliDate })
                        .ToListAsync();

                    _logger.LogInformation("Sample of recent bills (Date vs NepaliDate): {SampleBills}",
                        string.Join(", ", sampleBills.Select(b => $"{b.BillNumber} - Date: {b.Date}, NepaliDate: {b.nepaliDate}")));
                }

                // Map to response DTOs
                var billDtos = purchaseBills.Select(bill => MapToResponseDTO(bill, company.DateFormat)).ToList();

                return new PurchaseRegisterDataDTO
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

        // public async Task<PurchaseBill> CreatePurchaseBillAsync(CreatePurchaseBillDTO dto, Guid userId, Guid companyId, Guid fiscalYearId)
        // {
        //     using var transaction = await _context.Database.BeginTransactionAsync();
        //     try
        //     {
        //         // Validate company and fiscal year
        //         var company = await _context.Companies.FindAsync(companyId);
        //         if (company == null)
        //             throw new ArgumentException("Company not found");

        //         var fiscalYear = await _context.FiscalYears.FindAsync(fiscalYearId);
        //         if (fiscalYear == null || fiscalYear.CompanyId != companyId)
        //             throw new ArgumentException("Invalid fiscal year");

        //         var defaultStore = await GetDefaultStoreAsync(companyId);
        //         var defaultRack = defaultStore != null ? await GetDefaultRackAsync(defaultStore.Id) : null;

        //         var purchaseAccountId = await GetDefaultAccountIdAsync("Purchase", companyId);
        //         var vatAccountId = await GetDefaultAccountIdAsync("VAT", companyId);
        //         var roundOffAccountId = await GetDefaultAccountIdAsync("Rounded Off", companyId);
        //         var cashAccountId = await GetDefaultAccountIdAsync("Cash in Hand", companyId);

        //         // Parse payment mode from string to enum
        //         var paymentMode = ParsePaymentMode(dto.PaymentMode);
        //         var billNumber = await _billNumberService.GetNextBillNumberAsync(companyId, fiscalYearId, "purchase");
        //         // Create purchase bill
        //         var purchaseBill = new PurchaseBill
        //         {
        //             Id = Guid.NewGuid(),
        //             CompanyId = companyId,
        //             UserId = userId,
        //             BillNumber = billNumber,
        //             PartyBillNumber = dto.PartyBillNumber,
        //             AccountId = dto.AccountId,
        //             VatAccountId = dto.VatAccountId,
        //             PurchaseAccountId = dto.PurchaseAccountId,
        //             RoundOffAccountId = dto.RoundOffAccountId,
        //             UnitId = dto.UnitId,
        //             SettingsId = dto.SettingsId,
        //             FiscalYearId = fiscalYearId,
        //             SubTotal = dto.SubTotal ?? 0,
        //             NonVatPurchase = dto.NonVatPurchase ?? 0,
        //             TaxableAmount = dto.TaxableAmount ?? 0,
        //             TotalCcAmount = dto.TotalCcAmount ?? 0,
        //             DiscountPercentage = dto.DiscountPercentage ?? 0,
        //             DiscountAmount = dto.DiscountAmount ?? 0,
        //             VatPercentage = dto.VatPercentage,
        //             VatAmount = dto.VatAmount ?? 0,
        //             TotalAmount = dto.TotalAmount ?? 0,
        //             IsVatExempt = dto.IsVatExempt,
        //             IsVatAll = dto.IsVatAll,
        //             RoundOffAmount = dto.RoundOffAmount ?? 0,
        //             PaymentMode = dto.PaymentMode,
        //             nepaliDate = dto.NepaliDate,
        //             Date = dto.Date,
        //             transactionDateNepali = dto.TransactionDateNepali,
        //             TransactionDate = dto.TransactionDate,
        //             PurchaseSalesType = dto.PurchaseSalesType,
        //             OriginalCopies = dto.OriginalCopies,
        //             CreatedAt = DateTime.UtcNow,
        //             UpdatedAt = DateTime.UtcNow
        //         };

        //         // Dictionary to track items and avoid duplicate product updates
        //         var productStockUpdates = new Dictionary<Guid, (Item item, List<StockEntry> stockEntries, decimal totalNetQuantity, decimal wsUnit)>();

        //         // Add items
        //         foreach (var itemDto in dto.Items)
        //         {
        //             // Get the item/product
        //             var item = await _context.Items
        //                 .FirstOrDefaultAsync(i => i.Id == itemDto.ItemId);

        //             if (item == null)
        //                 throw new ArgumentException($"Item with id {itemDto.ItemId} not found");

        //             // Calculate values based on MongoDB logic
        //             decimal wsUnit = itemDto.WsUnit ?? 1m;
        //             decimal quantity = itemDto.Quantity;
        //             decimal bonus = itemDto.Bonus ?? 0m;

        //             // Total quantity including bonus multiplied by WS Unit
        //             decimal totalQuantityWithBonus = quantity + bonus;
        //             decimal netQuantity = totalQuantityWithBonus * wsUnit;

        //             // Calculate puPrice without bonus (puPrice * quantity) / (quantity * WSUnit)
        //             decimal puPriceWithOutBonus = itemDto.PuPrice * quantity;
        //             decimal puPricePerUnit = quantity > 0 && wsUnit > 0
        //                 ? puPriceWithOutBonus / (quantity * wsUnit)
        //                 : 0m;

        //             // Calculate discount amount per item
        //             decimal discountPercentage = dto.DiscountPercentage ?? 0m;
        //             decimal discountAmountPerItem = (itemDto.PuPrice * quantity * discountPercentage) / 100m;

        //             // Calculate net pu price after discount
        //             decimal netPuPrice = itemDto.PuPrice - (itemDto.PuPrice * discountPercentage / 100m);

        //             // Calculate MRP for stock (convert INR if needed)
        //             decimal mrpForStock = itemDto.Currency == "INR"
        //                 ? itemDto.Mrp * 1.6m
        //                 : itemDto.Mrp;

        //             // Adjust MRP by WS Unit
        //             decimal mrpPerUnit = wsUnit > 0 ? mrpForStock / wsUnit : 0m;

        //             var UniqueUuid = Guid.NewGuid().ToString();

        //             // Create purchase bill item
        //             var billItem = new PurchaseBillItem
        //             {
        //                 Id = Guid.NewGuid(),
        //                 PurchaseBillId = purchaseBill.Id,
        //                 ItemId = itemDto.ItemId,
        //                 UnitId = itemDto.UnitId,
        //                 WsUnit = wsUnit,
        //                 Quantity = quantity,
        //                 Bonus = bonus,
        //                 AltBonus = itemDto.AltBonus ?? 0,
        //                 Price = itemDto.Price ?? 0,
        //                 PuPrice = itemDto.PuPrice,
        //                 DiscountPercentagePerItem = discountPercentage,
        //                 DiscountAmountPerItem = discountAmountPerItem,
        //                 NetPuPrice = netPuPrice,
        //                 CcPercentage = itemDto.CcPercentage,
        //                 ItemCcAmount = itemDto.ItemCcAmount,
        //                 Mrp = itemDto.Mrp,
        //                 MarginPercentage = itemDto.MarginPercentage,
        //                 Currency = itemDto.Currency ?? "NPR",
        //                 AltQuantity = itemDto.AltQuantity ?? 0,
        //                 AltPrice = itemDto.AltPrice ?? 0,
        //                 AltPuPrice = itemDto.AltPuPrice ?? 0,
        //                 BatchNumber = itemDto.BatchNumber ?? "XXX",
        //                 ExpiryDate = itemDto.ExpiryDate ?? DateOnly.FromDateTime(DateTime.UtcNow.AddYears(2)),
        //                 VatStatus = itemDto.VatStatus,
        //                 UniqueUuid = UniqueUuid,
        //                 CreatedAt = DateTime.UtcNow,
        //                 UpdatedAt = DateTime.UtcNow
        //             };

        //             purchaseBill.Items.Add(billItem);

        //             // Create stock entry
        //             var stockEntry = new StockEntry
        //             {
        //                 Id = Guid.NewGuid(),
        //                 ItemId = itemDto.ItemId,
        //                 // Date = dto.TransactionDate ?? DateTime.UtcNow,
        //                 WsUnit = wsUnit,
        //                 Quantity = netQuantity,
        //                 Bonus = bonus * wsUnit,
        //                 BatchNumber = itemDto.BatchNumber ?? "XXX",
        //                 ExpiryDate = itemDto.ExpiryDate ?? DateOnly.FromDateTime(DateTime.UtcNow.AddYears(2)),
        //                 Price = wsUnit > 0 ? (itemDto.Price ?? 0m) / wsUnit : 0m,
        //                 PuPrice = netPuPrice,
        //                 NetPuPrice = netPuPrice,
        //                 ItemCcAmount = itemDto.ItemCcAmount,
        //                 DiscountPercentagePerItem = discountPercentage,
        //                 DiscountAmountPerItem = discountAmountPerItem,
        //                 MainUnitPuPrice = itemDto.PuPrice,
        //                 Mrp = mrpPerUnit,
        //                 MarginPercentage = itemDto.MarginPercentage,
        //                 Currency = itemDto.Currency ?? "NPR",
        //                 FiscalYearId = fiscalYearId,
        //                 UniqueUuid = UniqueUuid,
        //                 PurchaseBillId = purchaseBill.Id,
        //                 ExpiryStatus = CalculateExpiryStatus(itemDto.ExpiryDate ?? DateOnly.FromDateTime(DateTime.UtcNow.AddYears(2))),
        //                 DaysUntilExpiry = CalculateDaysUntilExpiry(itemDto.ExpiryDate ?? DateOnly.FromDateTime(DateTime.UtcNow.AddYears(2))),
        //                 StoreId = itemDto.StoreId ?? defaultStore?.Id,
        //                 RackId = itemDto.RackId ?? defaultRack?.Id,
        //                 CreatedAt = DateTime.UtcNow,
        //                 UpdatedAt = DateTime.UtcNow
        //             };
        //             Console.WriteLine($"StockEntry.NetPuPrice set to: {stockEntry.NetPuPrice}");

        //             // Add stock entry to context
        //             await _context.StockEntries.AddAsync(stockEntry);

        //             // 🔥 NEW: Create item-level party transactions for each item
        //             var partyTransaction = new Transaction
        //             {
        //                 Id = Guid.NewGuid(),
        //                 CompanyId = companyId,
        //                 ItemId = itemDto.ItemId,
        //                 UnitId = itemDto.UnitId,
        //                 WSUnit = (int?)wsUnit,
        //                 Quantity = quantity,
        //                 Bonus = bonus,
        //                 Price = itemDto.Price ?? 0,
        //                 PuPrice = itemDto.PuPrice,
        //                 DiscountPercentagePerItem = discountPercentage,
        //                 DiscountAmountPerItem = discountAmountPerItem,
        //                 NetPuPrice = netPuPrice,
        //                 AccountId = dto.AccountId,
        //                 PurchaseBillId = purchaseBill.Id,
        //                 BillNumber = purchaseBill.BillNumber,
        //                 PartyBillNumber = dto.PartyBillNumber,
        //                 Type = TransactionType.Purc,
        //                 PurchaseSalesType = "Purchase",
        //                 Debit = 0,
        //                 Credit = purchaseBill.TotalAmount ?? 0,
        //                 PaymentMode = paymentMode,
        //                 Date = dto.Date,
        //                 BillDate = dto.Date,
        //                 nepaliDate = dto.NepaliDate,
        //                 transactionDateNepali = dto.TransactionDateNepali,
        //                 FiscalYearId = fiscalYearId,
        //                 CreatedAt = DateTime.UtcNow,
        //                 Status = TransactionStatus.Active,
        //                 IsActive = true
        //             };

        //             await _context.Transactions.AddAsync(partyTransaction);

        //             // Track product stock updates (we don't update Item.Stock directly since it doesn't exist)
        //             if (!productStockUpdates.ContainsKey(item.Id))
        //             {
        //                 productStockUpdates[item.Id] = (item, new List<StockEntry>(), 0m, wsUnit);
        //             }

        //             productStockUpdates[item.Id].stockEntries.Add(stockEntry);
        //             productStockUpdates[item.Id] = (
        //                 productStockUpdates[item.Id].item,
        //                 productStockUpdates[item.Id].stockEntries,
        //                 productStockUpdates[item.Id].totalNetQuantity + netQuantity,
        //                 wsUnit // Keep the latest WSUnit
        //             );
        //         }

        //         // Update product WSUnit (but not Stock since it doesn't exist)
        //         foreach (var update in productStockUpdates.Values)
        //         {
        //             var item = update.item;
        //             var newWsUnit = update.wsUnit;

        //             // Update only the WSUnit
        //             item.WsUnit = newWsUnit;

        //             _context.Items.Update(item);
        //         }

        //         await _context.PurchaseBills.AddAsync(purchaseBill);

        //         if (purchaseAccountId.HasValue)
        //         {
        //             var purchaseAmount = (dto.TaxableAmount ?? 0) + (dto.NonVatPurchase ?? 0);

        //             var purchaseTransaction = new Transaction
        //             {
        //                 Id = Guid.NewGuid(),
        //                 CompanyId = companyId,
        //                 AccountId = purchaseAccountId.Value,
        //                 PurchaseBillId = purchaseBill.Id,
        //                 BillNumber = purchaseBill.BillNumber,
        //                 PartyBillNumber = dto.PartyBillNumber,
        //                 Type = TransactionType.Purc,
        //                 PurchaseSalesType = "Purchase",
        //                 Debit = purchaseAmount,
        //                 Credit = 0,
        //                 PaymentMode = paymentMode,
        //                 Date = dto.TransactionDate,
        //                 BillDate = dto.Date,
        //                 FiscalYearId = fiscalYearId,
        //                 CreatedAt = DateTime.UtcNow,
        //                 Status = TransactionStatus.Active,
        //                 IsActive = true
        //             };

        //             await _context.Transactions.AddAsync(purchaseTransaction);
        //         }

        //         // 2. VAT transaction if applicable
        //         if (dto.VatAmount > 0 && vatAccountId.HasValue && !dto.IsVatExempt)
        //         {
        //             var vatTransaction = new Transaction
        //             {
        //                 Id = Guid.NewGuid(),
        //                 CompanyId = companyId,
        //                 AccountId = vatAccountId.Value,
        //                 PurchaseBillId = purchaseBill.Id,
        //                 BillNumber = purchaseBill.BillNumber,
        //                 PartyBillNumber = dto.PartyBillNumber,
        //                 IsType = TransactionIsType.VAT,
        //                 Type = TransactionType.Purc,
        //                 PurchaseSalesType = "Purchase",
        //                 Debit = dto.VatAmount.Value,
        //                 Credit = 0,
        //                 PaymentMode = paymentMode,
        //                 Date = dto.TransactionDate,
        //                 BillDate = dto.Date,
        //                 FiscalYearId = fiscalYearId,
        //                 CreatedAt = DateTime.UtcNow,
        //                 Status = TransactionStatus.Active,
        //                 IsActive = true
        //             };

        //             await _context.Transactions.AddAsync(vatTransaction);
        //         }

        //         // 3. Round-off transaction if applicable
        //         if (dto.RoundOffAmount != 0 && roundOffAccountId.HasValue)
        //         {
        //             var roundOffTransaction = new Transaction
        //             {
        //                 Id = Guid.NewGuid(),
        //                 CompanyId = companyId,
        //                 AccountId = roundOffAccountId.Value,
        //                 PurchaseBillId = purchaseBill.Id,
        //                 BillNumber = purchaseBill.BillNumber,
        //                 PartyBillNumber = dto.PartyBillNumber,
        //                 IsType = TransactionIsType.RoundOff,
        //                 Type = TransactionType.Purc,
        //                 PurchaseSalesType = "Purchase",
        //                 Debit = dto.RoundOffAmount > 0 ? dto.RoundOffAmount.Value : 0,
        //                 Credit = dto.RoundOffAmount < 0 ? Math.Abs(dto.RoundOffAmount.Value) : 0,
        //                 PaymentMode = paymentMode,
        //                 Date = dto.TransactionDate,
        //                 BillDate = dto.Date,
        //                 FiscalYearId = fiscalYearId,
        //                 CreatedAt = DateTime.UtcNow,
        //                 Status = TransactionStatus.Active,
        //                 IsActive = true
        //             };

        //             await _context.Transactions.AddAsync(roundOffTransaction);
        //         }

        //         // 4. Cash transaction if payment mode is cash
        //         if (paymentMode == PaymentMode.Cash && cashAccountId.HasValue)
        //         {
        //             var cashTransaction = new Transaction
        //             {
        //                 Id = Guid.NewGuid(),
        //                 CompanyId = companyId,
        //                 AccountId = cashAccountId.Value,
        //                 PurchaseBillId = purchaseBill.Id,
        //                 BillNumber = purchaseBill.BillNumber,
        //                 PartyBillNumber = dto.PartyBillNumber,
        //                 Type = TransactionType.Purc,
        //                 PurchaseSalesType = "Purchase",
        //                 Debit = 0,
        //                 Credit = dto.TotalAmount ?? 0,
        //                 PaymentMode = PaymentMode.Cash,
        //                 Date = dto.TransactionDate,
        //                 BillDate = dto.Date,
        //                 FiscalYearId = fiscalYearId,
        //                 CreatedAt = DateTime.UtcNow,
        //                 Status = TransactionStatus.Active,
        //                 IsActive = true
        //             };

        //             await _context.Transactions.AddAsync(cashTransaction);
        //         }

        //         await _context.SaveChangesAsync();

        //         await transaction.CommitAsync();

        //         return purchaseBill;
        //     }
        //     catch (Exception ex)
        //     {
        //         await transaction.RollbackAsync();
        //         _logger.LogError(ex, "Error creating purchase bill");
        //         throw;
        //     }
        // }

        public async Task<PurchaseBill> CreatePurchaseBillAsync(CreatePurchaseBillDTO dto, Guid userId, Guid companyId, Guid fiscalYearId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // Validate company and fiscal year
                var company = await _context.Companies.FindAsync(companyId);
                if (company == null)
                    throw new ArgumentException("Company not found");

                var fiscalYear = await _context.FiscalYears.FindAsync(fiscalYearId);
                if (fiscalYear == null || fiscalYear.CompanyId != companyId)
                    throw new ArgumentException("Invalid fiscal year");

                var defaultStore = await GetDefaultStoreAsync(companyId);
                var defaultRack = defaultStore != null ? await GetDefaultRackAsync(defaultStore.Id) : null;

                var purchaseAccountId = await GetDefaultAccountIdAsync("Purchase", companyId);
                var vatAccountId = await GetDefaultAccountIdAsync("VAT", companyId);
                var roundOffAccountId = await GetDefaultAccountIdAsync("Rounded Off", companyId);
                var cashAccountId = await GetDefaultAccountIdAsync("Cash in Hand", companyId);

                // Parse payment mode from string to enum
                var paymentMode = ParsePaymentMode(dto.PaymentMode);
                var billNumber = await _billNumberService.GetNextBillNumberAsync(companyId, fiscalYearId, "purchase");

                // Create purchase bill
                var purchaseBill = new PurchaseBill
                {
                    Id = Guid.NewGuid(),
                    CompanyId = companyId,
                    UserId = userId,
                    BillNumber = billNumber,
                    PartyBillNumber = dto.PartyBillNumber,
                    AccountId = dto.AccountId,
                    VatAccountId = dto.VatAccountId,
                    PurchaseAccountId = dto.PurchaseAccountId,
                    RoundOffAccountId = dto.RoundOffAccountId,
                    UnitId = dto.UnitId,
                    SettingsId = dto.SettingsId,
                    FiscalYearId = fiscalYearId,
                    SubTotal = dto.SubTotal ?? 0,
                    NonVatPurchase = dto.NonVatPurchase ?? 0,
                    TaxableAmount = dto.TaxableAmount ?? 0,
                    TotalCcAmount = dto.TotalCcAmount ?? 0,
                    DiscountPercentage = dto.DiscountPercentage ?? 0,
                    DiscountAmount = dto.DiscountAmount ?? 0,
                    VatPercentage = dto.VatPercentage,
                    VatAmount = dto.VatAmount ?? 0,
                    TotalAmount = dto.TotalAmount ?? 0,
                    IsVatExempt = dto.IsVatExempt,
                    IsVatAll = dto.IsVatAll,
                    RoundOffAmount = dto.RoundOffAmount ?? 0,
                    PaymentMode = dto.PaymentMode,
                    nepaliDate = dto.NepaliDate,
                    Date = dto.Date,
                    transactionDateNepali = dto.TransactionDateNepali,
                    TransactionDate = dto.TransactionDate,
                    PurchaseSalesType = dto.PurchaseSalesType,
                    OriginalCopies = dto.OriginalCopies,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                // Dictionary to track items and avoid duplicate product updates
                var productStockUpdates = new Dictionary<Guid, (Item item, List<StockEntry> stockEntries, decimal totalNetQuantity, decimal wsUnit)>();

                // Get the overall discount percentage from the voucher
                decimal overallDiscountPercentage = dto.DiscountPercentage ?? 0m;

                // Add items
                foreach (var itemDto in dto.Items)
                {
                    // Get the item/product
                    var item = await _context.Items
                        .FirstOrDefaultAsync(i => i.Id == itemDto.ItemId);

                    if (item == null)
                        throw new ArgumentException($"Item with id {itemDto.ItemId} not found");

                    // Calculate values based on MongoDB logic
                    decimal wsUnit = itemDto.WsUnit ?? 1m;
                    decimal quantity = itemDto.Quantity;
                    decimal bonus = itemDto.Bonus ?? 0m;
                    decimal ccAmountForItem = itemDto.ItemCcAmount;
                    decimal ccPercentage = itemDto.CcPercentage;
                    decimal roundOffAmount = dto.RoundOffAmount ?? 0m;

                    // Total quantity including bonus multiplied by WS Unit
                    decimal totalQuantityWithBonus = quantity + bonus;
                    decimal netQuantity = totalQuantityWithBonus * wsUnit;

                    // Calculate total purchase value before discount and CC (only for purchased quantity, not bonus)
                    decimal totalPurchaseValueBeforeDiscount = itemDto.PuPrice * quantity;

                    // Calculate discount amount for this item based on overall voucher discount
                    decimal discountAmountForItem = (totalPurchaseValueBeforeDiscount * overallDiscountPercentage) / 100m;

                    // Calculate CC charge amount for this item
                    // decimal ccAmountForItem = (totalPurchaseValueBeforeDiscount * ccPercentage) / 100m;

                    // Calculate net purchase value after discount and including CC charges
                    // CC charges ADD to the cost (they are an additional expense)
                    decimal netPurchaseValueAfterDiscountAndCC = totalPurchaseValueBeforeDiscount - discountAmountForItem + ccAmountForItem + roundOffAmount;

                    // Calculate the final PuPrice per unit (including bonus items) - WITH CC CHARGES INCLUDED
                    // The cost is spread across all units (purchased + bonus)
                    decimal finalPuPricePerUnit = netQuantity > 0
                        ? netPurchaseValueAfterDiscountAndCC / netQuantity
                        : 0m;

                    // Calculate puPrice without bonus (for reference)
                    decimal puPriceWithOutBonus = (itemDto.PuPrice) * quantity;
                    decimal puPricePerUnit = quantity > 0 && wsUnit > 0
                        ? puPriceWithOutBonus / (quantity * wsUnit)
                        : 0m;

                    // Calculate discount amount per item
                    decimal discountAmountPerItem = (itemDto.PuPrice * quantity * overallDiscountPercentage) / 100m;

                    // Calculate net pu price (before spreading to bonus) - including CC
                    decimal netPuPrice = itemDto.PuPrice - (itemDto.PuPrice * overallDiscountPercentage / 100m) + (itemDto.PuPrice * ccPercentage / 100m);

                    // Calculate MRP for stock (convert INR if needed)
                    decimal mrpForStock = itemDto.Currency == "INR"
                        ? itemDto.Mrp * 1.6m
                        : itemDto.Mrp;

                    // Adjust MRP by WS Unit
                    decimal mrpPerUnit = wsUnit > 0 ? mrpForStock / wsUnit : 0m;

                    var UniqueUuid = Guid.NewGuid().ToString();

                    // Create purchase bill item
                    var billItem = new PurchaseBillItem
                    {
                        Id = Guid.NewGuid(),
                        PurchaseBillId = purchaseBill.Id,
                        ItemId = itemDto.ItemId,
                        UnitId = itemDto.UnitId,
                        WsUnit = wsUnit,
                        Quantity = quantity,
                        Bonus = bonus,
                        AltBonus = itemDto.AltBonus ?? 0,
                        Price = itemDto.Price ?? 0,
                        PuPrice = itemDto.PuPrice,
                        DiscountPercentagePerItem = overallDiscountPercentage,
                        DiscountAmountPerItem = discountAmountPerItem,
                        NetPuPrice = netPuPrice,
                        CcPercentage = ccPercentage,
                        ItemCcAmount = ccAmountForItem,
                        Mrp = itemDto.Mrp,
                        MarginPercentage = itemDto.MarginPercentage,
                        Currency = itemDto.Currency ?? "NPR",
                        AltQuantity = itemDto.AltQuantity ?? 0,
                        AltPrice = itemDto.AltPrice ?? 0,
                        AltPuPrice = itemDto.AltPuPrice ?? 0,
                        BatchNumber = itemDto.BatchNumber ?? "XXX",
                        ExpiryDate = itemDto.ExpiryDate ?? DateOnly.FromDateTime(DateTime.UtcNow.AddYears(2)),
                        VatStatus = itemDto.VatStatus,
                        UniqueUuid = UniqueUuid,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };

                    purchaseBill.Items.Add(billItem);

                    // Create stock entry with CORRECT PuPrice (after discount and including CC, spread across bonus items)
                    var stockEntry = new StockEntry
                    {
                        Id = Guid.NewGuid(),
                        ItemId = itemDto.ItemId,
                        WsUnit = wsUnit,
                        Quantity = netQuantity,
                        Bonus = bonus * wsUnit,
                        BatchNumber = itemDto.BatchNumber ?? "XXX",
                        ExpiryDate = itemDto.ExpiryDate ?? DateOnly.FromDateTime(DateTime.UtcNow.AddYears(2)),
                        Price = wsUnit > 0 ? (itemDto.Price ?? 0m) / wsUnit : 0m,

                        // THIS IS THE FIXED PART - Using finalPuPricePerUnit which accounts for:
                        // 1. Original PuPrice
                        // 2. Overall voucher discount
                        // 3. CC charges (added to cost)
                        // 4. Bonus items (spreading cost across all units)
                        PuPrice = finalPuPricePerUnit,

                        NetPuPrice = finalPuPricePerUnit, // Also set NetPuPrice to the same value for consistency
                        ItemCcAmount = ccAmountForItem,
                        DiscountPercentagePerItem = overallDiscountPercentage,
                        DiscountAmountPerItem = discountAmountPerItem,
                        MainUnitPuPrice = itemDto.PuPrice,
                        Mrp = mrpPerUnit,
                        MarginPercentage = itemDto.MarginPercentage,
                        Currency = itemDto.Currency ?? "NPR",
                        FiscalYearId = fiscalYearId,
                        UniqueUuid = UniqueUuid,
                        PurchaseBillId = purchaseBill.Id,
                        ExpiryStatus = CalculateExpiryStatus(itemDto.ExpiryDate ?? DateOnly.FromDateTime(DateTime.UtcNow.AddYears(2))),
                        DaysUntilExpiry = CalculateDaysUntilExpiry(itemDto.ExpiryDate ?? DateOnly.FromDateTime(DateTime.UtcNow.AddYears(2))),
                        StoreId = itemDto.StoreId ?? defaultStore?.Id,
                        RackId = itemDto.RackId ?? defaultRack?.Id,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };

                    Console.WriteLine($"StockEntry.PuPrice set to: {stockEntry.PuPrice}");
                    Console.WriteLine($"Calculation: Total Value Before: {totalPurchaseValueBeforeDiscount}, Discount: {discountAmountForItem}, CC: {ccAmountForItem}, Net Value: {netPurchaseValueAfterDiscountAndCC}, Total Units: {netQuantity}, Final Price/Unit: {finalPuPricePerUnit}");

                    // Add stock entry to context
                    await _context.StockEntries.AddAsync(stockEntry);

                    // Create item-level party transactions for each item
                    var partyTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        ItemId = itemDto.ItemId,
                        UnitId = itemDto.UnitId,
                        WSUnit = (int?)wsUnit,
                        Quantity = quantity,
                        Bonus = bonus,
                        Price = itemDto.Price ?? 0,
                        PuPrice = itemDto.PuPrice,
                        DiscountPercentagePerItem = overallDiscountPercentage,
                        DiscountAmountPerItem = discountAmountPerItem,
                        NetPuPrice = netPuPrice,
                        AccountId = dto.AccountId,
                        PurchaseBillId = purchaseBill.Id,
                        BillNumber = purchaseBill.BillNumber,
                        PartyBillNumber = dto.PartyBillNumber,
                        Type = TransactionType.Purc,
                        PurchaseSalesType = "Purchase",
                        Debit = 0,
                        Credit = purchaseBill.TotalAmount ?? 0,
                        PaymentMode = paymentMode,
                        Date = dto.Date,
                        BillDate = dto.Date,
                        nepaliDate = dto.NepaliDate,
                        transactionDateNepali = dto.TransactionDateNepali,
                        FiscalYearId = fiscalYearId,
                        CreatedAt = DateTime.UtcNow,
                        Status = TransactionStatus.Active,
                        IsActive = true
                    };

                    await _context.Transactions.AddAsync(partyTransaction);

                    // Track product stock updates
                    if (!productStockUpdates.ContainsKey(item.Id))
                    {
                        productStockUpdates[item.Id] = (item, new List<StockEntry>(), 0m, wsUnit);
                    }

                    productStockUpdates[item.Id].stockEntries.Add(stockEntry);
                    productStockUpdates[item.Id] = (
                        productStockUpdates[item.Id].item,
                        productStockUpdates[item.Id].stockEntries,
                        productStockUpdates[item.Id].totalNetQuantity + netQuantity,
                        wsUnit
                    );
                }

                // Update product WSUnit
                foreach (var update in productStockUpdates.Values)
                {
                    var item = update.item;
                    var newWsUnit = update.wsUnit;
                    item.WsUnit = newWsUnit;
                    _context.Items.Update(item);
                }

                await _context.PurchaseBills.AddAsync(purchaseBill);

                // Purchase account transaction
                if (purchaseAccountId.HasValue)
                {
                    var purchaseAmount = (dto.TaxableAmount ?? 0) + (dto.NonVatPurchase ?? 0);

                    var purchaseTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        AccountId = purchaseAccountId.Value,
                        PurchaseBillId = purchaseBill.Id,
                        BillNumber = purchaseBill.BillNumber,
                        PartyBillNumber = dto.PartyBillNumber,
                        Type = TransactionType.Purc,
                        PurchaseSalesType = "Purchase",
                        Debit = purchaseAmount,
                        Credit = 0,
                        PaymentMode = paymentMode,
                        Date = dto.TransactionDate,
                        BillDate = dto.Date,
                        FiscalYearId = fiscalYearId,
                        CreatedAt = DateTime.UtcNow,
                        Status = TransactionStatus.Active,
                        IsActive = true
                    };

                    await _context.Transactions.AddAsync(purchaseTransaction);
                }

                // VAT transaction if applicable
                if (dto.VatAmount > 0 && vatAccountId.HasValue && !dto.IsVatExempt)
                {
                    var vatTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        AccountId = vatAccountId.Value,
                        PurchaseBillId = purchaseBill.Id,
                        BillNumber = purchaseBill.BillNumber,
                        PartyBillNumber = dto.PartyBillNumber,
                        IsType = TransactionIsType.VAT,
                        Type = TransactionType.Purc,
                        PurchaseSalesType = "Purchase",
                        Debit = dto.VatAmount.Value,
                        Credit = 0,
                        PaymentMode = paymentMode,
                        Date = dto.TransactionDate,
                        BillDate = dto.Date,
                        FiscalYearId = fiscalYearId,
                        CreatedAt = DateTime.UtcNow,
                        Status = TransactionStatus.Active,
                        IsActive = true
                    };

                    await _context.Transactions.AddAsync(vatTransaction);
                }

                // Round-off transaction if applicable
                if (dto.RoundOffAmount != 0 && roundOffAccountId.HasValue)
                {
                    var roundOffTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        AccountId = roundOffAccountId.Value,
                        PurchaseBillId = purchaseBill.Id,
                        BillNumber = purchaseBill.BillNumber,
                        PartyBillNumber = dto.PartyBillNumber,
                        IsType = TransactionIsType.RoundOff,
                        Type = TransactionType.Purc,
                        PurchaseSalesType = "Purchase",
                        Debit = dto.RoundOffAmount > 0 ? dto.RoundOffAmount.Value : 0,
                        Credit = dto.RoundOffAmount < 0 ? Math.Abs(dto.RoundOffAmount.Value) : 0,
                        PaymentMode = paymentMode,
                        Date = dto.TransactionDate,
                        BillDate = dto.Date,
                        FiscalYearId = fiscalYearId,
                        CreatedAt = DateTime.UtcNow,
                        Status = TransactionStatus.Active,
                        IsActive = true
                    };

                    await _context.Transactions.AddAsync(roundOffTransaction);
                }

                // Cash transaction if payment mode is cash
                if (paymentMode == PaymentMode.Cash && cashAccountId.HasValue)
                {
                    var cashTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        AccountId = cashAccountId.Value,
                        PurchaseBillId = purchaseBill.Id,
                        BillNumber = purchaseBill.BillNumber,
                        PartyBillNumber = dto.PartyBillNumber,
                        Type = TransactionType.Purc,
                        PurchaseSalesType = "Purchase",
                        Debit = 0,
                        Credit = dto.TotalAmount ?? 0,
                        PaymentMode = PaymentMode.Cash,
                        Date = dto.TransactionDate,
                        BillDate = dto.Date,
                        FiscalYearId = fiscalYearId,
                        CreatedAt = DateTime.UtcNow,
                        Status = TransactionStatus.Active,
                        IsActive = true
                    };

                    await _context.Transactions.AddAsync(cashTransaction);
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return purchaseBill;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Error creating purchase bill");
                throw;
            }
        }

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

        public async Task<string> GetCurrentBillNumberAsync(Guid companyId, Guid fiscalYearId)
        {
            return await _billNumberService.GetCurrentBillNumberAsync(companyId, fiscalYearId, "purchase");
        }


        // public async Task<PurchaseFindsDTO> GetPurchaseFindsAsync(Guid companyId, Guid fiscalYearId, Guid userId)
        // {
        //     try
        //     {
        //         _logger.LogInformation("GetPurchaseFindsAsync called for Company: {CompanyId}, FiscalYear: {FiscalYearId}, User: {UserId}",
        //             companyId, fiscalYearId, userId);

        //         // Get company information including date format
        //         var company = await _context.Companies
        //             .Where(c => c.Id == companyId)
        //             .Select(c => new CompanyInfoDTO
        //             {
        //                 Id = c.Id,
        //                 Name = c.Name,
        //                 Address = c.Address,
        //                 City = c.City,
        //                 Phone = c.Phone,
        //                 Pan = c.Pan,
        //                 RenewalDate = c.RenewalDate,
        //                 DateFormat = c.DateFormat.ToString(),
        //                 VatEnabled = c.VatEnabled,
        //             })
        //             .FirstOrDefaultAsync();

        //         if (company == null)
        //         {
        //             _logger.LogWarning("Company not found with ID: {CompanyId}", companyId);
        //             throw new ArgumentException("Company not found");
        //         }

        //         // Determine if company uses Nepali date format
        //         bool isNepaliFormat = company.DateFormat?.ToLower() == "nepali";

        //         _logger.LogInformation("Company date format: {DateFormat}, IsNepaliFormat: {IsNepaliFormat}",
        //             company.DateFormat, isNepaliFormat);

        //         // Get fiscal year information
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
        //                 IsActive = f.IsActive,
        //             })
        //             .FirstOrDefaultAsync();

        //         if (currentFiscalYear == null)
        //         {
        //             _logger.LogWarning("Fiscal year not found with ID: {FiscalYearId} for Company: {CompanyId}",
        //                 fiscalYearId, companyId);
        //             throw new ArgumentException("Fiscal year not found");
        //         }

        //         // Get company date format
        //         string companyDateFormat = company.DateFormat?.ToLower() ?? "english";

        //         // Fetch the latest purchase bill for this company and fiscal year
        //         var latestBill = await _context.PurchaseBills
        //             .Where(pb => pb.CompanyId == companyId && pb.FiscalYearId == fiscalYearId)
        //             .OrderByDescending(pb => pb.Date)
        //             .ThenByDescending(pb => pb.BillNumber)
        //             .Select(pb => new
        //             {
        //                 pb.BillNumber,
        //                 pb.Date
        //             })
        //             .FirstOrDefaultAsync();

        //         _logger.LogInformation("Latest bill query result: BillNumber: {BillNumber}, Date: {Date}",
        //             latestBill?.BillNumber, latestBill?.Date);

        //         // Get user with roles
        //         var user = await _context.Users
        //             .Include(u => u.UserRoles)
        //                 .ThenInclude(ur => ur.Role)
        //             .FirstOrDefaultAsync(u => u.Id == userId);

        //         if (user == null)
        //         {
        //             _logger.LogWarning("User not found with ID: {UserId}", userId);
        //             throw new ArgumentException("User not found");
        //         }

        //         bool isAdmin = user?.IsAdmin ?? false;
        //         string userRole = "User";

        //         if (isAdmin)
        //         {
        //             userRole = "Admin";
        //         }
        //         else if (user?.UserRoles != null)
        //         {
        //             var primaryRole = user.UserRoles.FirstOrDefault(ur => ur.IsPrimary);
        //             if (primaryRole?.Role != null)
        //             {
        //                 userRole = primaryRole.Role.Name;
        //             }
        //         }

        //         // Determine if user is admin or supervisor
        //         bool isAdminOrSupervisor = isAdmin || userRole == "Supervisor";

        //         // Create user info DTO
        //         var userInfo = new UserInfoDTO
        //         {
        //             Id = user.Id,
        //             Name = user.Name,
        //             Email = user.Email,
        //             IsAdmin = isAdmin,
        //             Role = userRole,
        //             Preferences = new UserPreferencesDTO
        //             {
        //                 Theme = user.Preferences?.Theme.ToString() ?? "light"
        //             }
        //         };

        //         // Create response DTO
        //         var response = new PurchaseFindsDTO
        //         {
        //             Company = company,
        //             BillNumber = latestBill?.BillNumber ?? string.Empty,
        //             CurrentFiscalYear = currentFiscalYear,
        //             CompanyDateFormat = companyDateFormat,
        //             CurrentCompanyName = company.Name,
        //             Date = DateTime.UtcNow.Date,
        //             Title = string.Empty,
        //             Body = string.Empty,
        //             User = userInfo,
        //             Theme = userInfo.Preferences?.Theme ?? "light",
        //             IsAdminOrSupervisor = isAdminOrSupervisor
        //         };

        //         _logger.LogInformation("Successfully retrieved purchase finds data for Company: {CompanyId}", companyId);

        //         return response;
        //     }
        //     catch (Exception ex)
        //     {
        //         _logger.LogError(ex, "Error in GetPurchaseFindsAsync for Company: {CompanyId}", companyId);
        //         throw;
        //     }
        // }

        public async Task<PurchaseFindsDTO> GetPurchaseFindsAsync(Guid companyId, Guid fiscalYearId, Guid userId)
        {
            try
            {
                _logger.LogInformation("GetPurchaseFindsAsync called for Company: {CompanyId}, FiscalYear: {FiscalYearId}, User: {UserId}",
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
                // Order by the appropriate date field based on company format
                var latestBillQuery = _context.PurchaseBills
                    .Where(pb => pb.CompanyId == companyId && pb.FiscalYearId == fiscalYearId);

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
                var response = new PurchaseFindsDTO
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

                _logger.LogInformation("Successfully retrieved purchase finds data for Company: {CompanyId}", companyId);

                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetPurchaseFindsAsync for Company: {CompanyId}", companyId);
                throw;
            }
        }

        // Services/Retailer/PurchaseService.cs (add this method)
        public async Task<PurchasePartyInfoDto?> GetPurchasePartyInfoAsync(string billNumber, Guid companyId, Guid fiscalYearId)
        {
            try
            {
                _logger.LogInformation($"Getting party info for purchase bill: {billNumber}, Company: {companyId}, FiscalYear: {fiscalYearId}");

                // Find the purchase bill with account information
                var purchaseBill = await _context.PurchaseBills
                    .Include(pb => pb.Account)
                    .Where(pb => pb.BillNumber == billNumber &&
                                pb.CompanyId == companyId &&
                                pb.FiscalYearId == fiscalYearId)
                    .Select(pb => new PurchasePartyInfoDto
                    {
                        BillNumber = pb.BillNumber,
                        Date = pb.Date,
                        PartyBillNumber = pb.PartyBillNumber,
                        PaymentMode = pb.PaymentMode,
                        AccountId = pb.AccountId ?? Guid.Empty,
                        AccountName = pb.Account != null ? pb.Account.Name : string.Empty,
                        AccountAddress = pb.Account != null ? pb.Account.Address : string.Empty,
                        AccountPan = pb.Account != null ? pb.Account.Pan : string.Empty,
                        AccountUniqueNumber = pb.Account != null ? pb.Account.UniqueNumber : null
                    })
                    .FirstOrDefaultAsync();

                if (purchaseBill == null)
                {
                    _logger.LogWarning($"Purchase bill not found: {billNumber}");
                    return null;
                }

                _logger.LogInformation($"Successfully retrieved party info for bill: {billNumber}");
                return purchaseBill;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting purchase party info for bill: {billNumber}");
                throw;
            }
        }

        // Services/Retailer/PurchaseService.cs
        public async Task<ChangePartyResponseDto> ChangePartyAsync(
            string billNumber,
            Guid newAccountId,
            Guid companyId,
            Guid fiscalYearId,
            Guid userId)
        {
            _logger.LogInformation($"Changing party for purchase bill: {billNumber} to new account: {newAccountId}");

            // Start a database transaction to ensure data consistency
            using var dbTransaction = await _context.Database.BeginTransactionAsync();

            try
            {
                // 1. Verify the new account exists, is active, and is a party account
                var newAccount = await VerifyAndGetPartyAccountAsync(newAccountId, companyId);

                // 2. Get the original purchase bill with account
                var originalBill = await _context.PurchaseBills
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
                var totalAmount = originalBill.TotalAmount ?? 0;
                var taxableAmount = originalBill.TaxableAmount ?? 0;
                var nonVatPurchase = originalBill.NonVatPurchase ?? 0;
                var vatAmount = originalBill.VatAmount ?? 0;
                var roundOffAmount = originalBill.RoundOffAmount ?? 0;
                var purchaseAmount = taxableAmount + nonVatPurchase;

                // 4. Get purchase account ID
                var purchaseAccountId = await GetDefaultAccountIdAsync("Purchase", companyId);
                var vatAccountId = await GetDefaultAccountIdAsync("VAT", companyId);
                var roundOffAccountId = await GetDefaultAccountIdAsync("Rounded Off", companyId);

                // Parse payment mode
                var paymentMode = ParsePaymentMode(originalBill.PaymentMode ?? "Credit");

                // 5. Get all transactions linked to this purchase bill
                var transactions = await _context.Transactions
                    .Where(t => t.PurchaseBillId == originalBill.Id &&
                               t.CompanyId == companyId &&
                               t.FiscalYearId == fiscalYearId &&
                               t.Status == TransactionStatus.Active)
                    .ToListAsync();

                _logger.LogInformation($"Found {transactions.Count} transactions for bill {billNumber}");

                // 6. Update purchase bill with new account
                originalBill.AccountId = newAccountId;
                originalBill.UpdatedAt = DateTime.UtcNow;
                originalBill.PurchaseSalesType = newAccount.Name; // Update purchase type with new party name

                // 7. Process each transaction
                foreach (var trans in transactions)
                {
                    // Check if this is the main party transaction (old party)
                    // Party transaction is identified by having AccountId = oldAccountId AND Debit = 0, Credit = totalAmount
                    var isMainPartyTransaction = trans.AccountId == oldAccountId &&
                                                 trans.Debit == 0 &&
                                                 trans.Credit == totalAmount &&
                                                 trans.Type == TransactionType.Purc;

                    if (isMainPartyTransaction)
                    {
                        // Update to new party - Party account should be CREDIT side
                        trans.AccountId = newAccountId;
                        trans.PurchaseSalesType = newAccount.Name;
                        trans.UpdatedAt = DateTime.UtcNow;

                        _logger.LogInformation($"Updated main party transaction {trans.Id} from account {oldAccountId} to {newAccountId}");
                    }
                    // Check if this is a purchase account transaction
                    else if (purchaseAccountId.HasValue && trans.AccountId == purchaseAccountId.Value)
                    {
                        // Purchase account should be DEBIT side (purchase expense)
                        trans.PurchaseSalesType = newAccount.Name;
                        trans.UpdatedAt = DateTime.UtcNow;

                        _logger.LogInformation($"Updated purchase account transaction {trans.Id} with new party name: {newAccount.Name}");
                    }
                    // Check if this is a VAT transaction
                    else if (vatAccountId.HasValue && trans.AccountId == vatAccountId.Value && trans.IsType == TransactionIsType.VAT)
                    {
                        trans.PurchaseSalesType = newAccount.Name;
                        trans.UpdatedAt = DateTime.UtcNow;

                        _logger.LogInformation($"Updated VAT transaction {trans.Id} with new party name: {newAccount.Name}");
                    }
                    // Check if this is a RoundOff transaction
                    else if (roundOffAccountId.HasValue && trans.AccountId == roundOffAccountId.Value && trans.IsType == TransactionIsType.RoundOff)
                    {
                        trans.PurchaseSalesType = newAccount.Name;
                        trans.UpdatedAt = DateTime.UtcNow;

                        _logger.LogInformation($"Updated RoundOff transaction {trans.Id} with new party name: {newAccount.Name}");
                    }
                    // Check if this is a cash transaction (if payment mode was cash)
                    else if (trans.PaymentMode == PaymentMode.Cash && trans.Debit == 0 && trans.Credit == totalAmount)
                    {
                        trans.PurchaseSalesType = newAccount.Name;
                        trans.UpdatedAt = DateTime.UtcNow;

                        _logger.LogInformation($"Updated cash transaction {trans.Id} with new party name: {newAccount.Name}");
                    }
                    // For any other transactions linked to items (item-level party transactions)
                    else if (trans.ItemId.HasValue && trans.Type == TransactionType.Purc)
                    {
                        // These are the item-level party transactions created in CreatePurchaseBillAsync
                        trans.AccountId = newAccountId; // Update the account to new party
                        trans.PurchaseSalesType = newAccount.Name;
                        trans.UpdatedAt = DateTime.UtcNow;

                        _logger.LogInformation($"Updated item-level party transaction {trans.Id} for item {trans.ItemId}");
                    }
                }

                // 8. Save changes
                await _context.SaveChangesAsync();

                // 9. Commit transaction
                await dbTransaction.CommitAsync();

                _logger.LogInformation($"Successfully changed party for bill: {billNumber} from {oldAccountName} to {newAccount.Name}");

                return new ChangePartyResponseDto
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
        // Services/Retailer/PurchaseService.cs
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
                    // Allow it but log warning - some businesses might use different account groups
                }
            }

            return account;
        }

        // Services/Retailer/PurchaseService.cs
        public async Task<BillIdResponseDTO> GetPurchaseBillIdByNumberAsync(string billNumber, Guid companyId, Guid fiscalYearId)
        {
            try
            {
                _logger.LogInformation($"Getting purchase bill ID for number: {billNumber}, Company: {companyId}, FiscalYear: {fiscalYearId}");

                var purchaseBill = await _context.PurchaseBills
                    .Where(pb => pb.BillNumber == billNumber &&
                                pb.CompanyId == companyId &&
                                pb.FiscalYearId == fiscalYearId)
                    .Select(pb => new BillIdResponseDTO
                    {
                        Id = pb.Id,
                        BillNumber = pb.BillNumber
                    })
                    .FirstOrDefaultAsync();

                if (purchaseBill == null)
                {
                    _logger.LogWarning($"Purchase bill not found for number: {billNumber}");
                    throw new ArgumentException("Voucher not found");
                }

                _logger.LogInformation($"Successfully retrieved bill ID for number: {billNumber}");
                return purchaseBill;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting purchase bill ID for number: {billNumber}");
                throw;
            }
        }

        public async Task<PurchaseEditDataDTO> GetPurchaseEditDataAsync(Guid billId, Guid companyId, Guid fiscalYearId, Guid userId)
        {
            try
            {
                _logger.LogInformation("GetPurchaseEditDataAsync called for Bill ID: {BillId}, Company: {CompanyId}, FiscalYear: {FiscalYearId}",
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

                // Fetch purchase bill with all related data
                var purchaseInvoice = await _context.PurchaseBills
                    .Include(pb => pb.Account)
                    .Include(pb => pb.Items)
                        .ThenInclude(i => i.Item)
                            .ThenInclude(it => it.Unit)
                    .Include(pb => pb.Items)
                        .ThenInclude(i => i.Item)
                            .ThenInclude(it => it.Category)
                    .Include(pb => pb.Items)
                        .ThenInclude(i => i.Unit)
                    .FirstOrDefaultAsync(pb => pb.Id == billId &&
                                              pb.CompanyId == companyId &&
                                              pb.FiscalYearId == fiscalYearId);

                if (purchaseInvoice == null)
                    throw new ArgumentException("Purchase invoice not found or does not belong to the selected company/fiscal year");

                // Process items to include stock and latest price - using the same pattern as GetPurchaseRegisterAsync
                // but with additional data for edit
                var processedItems = new List<PurchaseBillItemResponseDTO>();

                foreach (var item in purchaseInvoice.Items)
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
                    decimal amount = (item.Quantity * (item.PuPrice));

                    // Map to response DTO
                    var itemDto = MapToResponseDTOItem(item, companyDateFormat);

                    // Note: In a real implementation, you might want to create a derived class
                    // that includes these additional properties. For now, we'll handle this
                    // in the final response assembly.
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
                        VatStatus = item.VatStatus,
                        Unit = unitInfo,
                        Category = categoryInfo,
                        PuPrice = item.PuPrice ?? 0,
                        Quantity = 0, // Item doesn't have Quantity property in your model
                        Stock = totalStock,
                        LatestPuPrice = latestPuPrice,
                        StockEntries = stockEntries
                    };

                    processedAllItems.Add(itemDto);
                }

                // Sort items by name
                processedAllItems = processedAllItems.OrderBy(i => i.Name).ToList();
                // Fetch relevant accounts (Sundry Creditors only for purchase)
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

                // Map purchase invoice to response DTO
                var purchaseInvoiceDto = MapToResponseDTO(purchaseInvoice, companyDateFormat);

                // Create response following the same pattern as PurchaseRegisterDataDTO
                var response = new PurchaseEditDataDTO
                {
                    Company = company,
                    PurchaseInvoice = purchaseInvoiceDto,
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

                _logger.LogInformation("Successfully retrieved purchase edit data for Bill ID: {BillId}", billId);

                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting purchase edit data for Bill ID: {BillId}", billId);
                throw;
            }
        }


        private PurchaseBillItemResponseDTO MapToResponseDTOItem(PurchaseBillItem item, string companyDateFormat)
        {
            bool isNepaliFormat = companyDateFormat?.ToLower() == "nepali";

            return new PurchaseBillItemResponseDTO
            {
                Id = item.Id,
                PurchaseBillId = item.PurchaseBillId,
                ItemId = item.ItemId,
                ItemName = item.Item?.Name,
                Hscode = item.Item?.Hscode,
                UniqueNumber = item.Item?.UniqueNumber,
                UnitId = item.UnitId,
                UnitName = item.Unit?.Name,
                WsUnit = item.WsUnit ?? 0,
                Quantity = item.Quantity,
                Bonus = item.Bonus,
                AltBonus = item.AltBonus,
                Price = item.Price,
                PuPrice = item.PuPrice,
                DiscountPercentagePerItem = item.DiscountPercentagePerItem,
                DiscountAmountPerItem = item.DiscountAmountPerItem,
                NetPuPrice = item.NetPuPrice,
                CcPercentage = item.CcPercentage,
                ItemCcAmount = item.ItemCcAmount,
                Mrp = item.Mrp,
                MarginPercentage = item.MarginPercentage,
                Currency = item.Currency,
                AltQuantity = item.AltQuantity,
                AltPrice = item.AltPrice,
                AltPuPrice = item.AltPuPrice,
                BatchNumber = item.BatchNumber,
                ExpiryDate = item.ExpiryDate,
                VatStatus = item.VatStatus,
                UniqueUuid = item.UniqueUuid,
                CreatedAt = item.CreatedAt,
                UpdatedAt = item.UpdatedAt
            };
        }

        public async Task<PurchaseBillResponseDTO> GetPurchaseBillAsync(Guid id, Guid companyId)
        {
            var purchaseBill = await _context.PurchaseBills
                .Include(pb => pb.Company)
                .Include(pb => pb.User)
                .Include(pb => pb.Account)
                .Include(pb => pb.VatAccount)
                .Include(pb => pb.PurchaseAccount)
                .Include(pb => pb.RoundOffAccount)
                .Include(pb => pb.Unit)
                .Include(pb => pb.FiscalYear)
                .Include(pb => pb.Items)
                    .ThenInclude(i => i.Item)
                .Include(pb => pb.Items)
                    .ThenInclude(i => i.Unit)
                .FirstOrDefaultAsync(pb => pb.Id == id && pb.CompanyId == companyId);

            if (purchaseBill == null)
                return null;
            var company = await _context.Companies
                   .Where(c => c.Id == companyId)
                   .Select(c => c.DateFormat.ToString())
                   .FirstOrDefaultAsync();
            return MapToResponseDTO(purchaseBill, company ?? "English");
        }
        public async Task<IEnumerable<PurchaseBillResponseDTO>> GetPurchaseBillsAsync(Guid companyId, DateTime? fromDate = null, DateTime? toDate = null)
        {
            var query = _context.PurchaseBills
                .Include(pb => pb.Company)
                .Include(pb => pb.Account)
                .Include(pb => pb.FiscalYear)
                .Where(pb => pb.CompanyId == companyId);

            if (fromDate.HasValue)
                query = query.Where(pb => pb.Date >= fromDate.Value);

            if (toDate.HasValue)
                query = query.Where(pb => pb.Date <= toDate.Value);

            var purchaseBills = await query
                .OrderByDescending(pb => pb.Date)
                .ThenByDescending(pb => pb.BillNumber)
                .ToListAsync();

            var company = await _context.Companies
       .Where(c => c.Id == companyId)
       .Select(c => c.DateFormat.ToString())
       .FirstOrDefaultAsync();

            string companyDateFormat = company ?? "English";

            return purchaseBills.Select(bill => MapToResponseDTO(bill, companyDateFormat)).ToList();
        }

        // public async Task<PurchaseBill> UpdatePurchaseBillAsync(Guid id, UpdatePurchaseBillDTO dto, Guid companyId, Guid fiscalYearId, Guid userId)
        // {
        //     using var transaction = await _context.Database.BeginTransactionAsync();
        //     try
        //     {
        //         _logger.LogInformation("=== Starting UpdatePurchaseBillAsync for Bill ID: {BillId} ===", id);
        //         _logger.LogInformation("CompanyId: {CompanyId}, FiscalYearId: {FiscalYearId}, UserId: {UserId}", companyId, fiscalYearId, userId);

        //         // Validate required fields
        //         _logger.LogDebug("Validating required fields...");
        //         if (dto.AccountId == Guid.Empty)
        //             throw new ArgumentException("Account ID is required");

        //         if (dto.Items == null || !dto.Items.Any())
        //             throw new ArgumentException("At least one item is required");

        //         if (string.IsNullOrEmpty(dto.PaymentMode))
        //             throw new ArgumentException("Payment mode is required");

        //         // Get company to check date format
        //         var company = await _context.Companies.FindAsync(companyId);
        //         if (company == null)
        //             throw new ArgumentException("Company not found");

        //         // Validate dates based on company format
        //         bool isNepaliFormat = company.DateFormat == DateFormatEnum.Nepali;

        //         // Validate account belongs to company
        //         var account = await _context.Accounts
        //             .FirstOrDefaultAsync(a => a.Id == dto.AccountId && a.CompanyId == companyId);

        //         if (account == null)
        //             throw new ArgumentException("Invalid account for this company");

        //         // Get the existing purchase bill with ALL related data
        //         var existingBill = await _context.PurchaseBills
        //             .Include(pb => pb.Items)
        //             .FirstOrDefaultAsync(pb => pb.Id == id && pb.CompanyId == companyId);

        //         if (existingBill == null)
        //             throw new ArgumentException("Purchase bill not found");

        //         var fiscalYear = await _context.FiscalYears
        //             .FirstOrDefaultAsync(f => f.Id == fiscalYearId && f.CompanyId == companyId);

        //         if (fiscalYear == null)
        //             throw new ArgumentException("Fiscal year not found");

        //         // CHECK IF STOCK IS USED
        //         await CheckIfStockIsUsedAsync(existingBill, companyId);

        //         // Get all stock entries for this purchase bill
        //         var existingStockEntries = await _context.StockEntries
        //             .Where(se => se.PurchaseBillId == id)
        //             .ToListAsync();

        //         // Create dictionaries for quick lookup
        //         var existingItemsDict = existingBill.Items.ToDictionary(i => i.UniqueUuid);
        //         var existingStockDict = existingStockEntries.ToDictionary(se => se.UniqueUuid);
        //         // var existingTransactions = existingBill.Transactions?.ToList() ?? new List<Transaction>();

        //         // Track items to process
        //         var itemsToUpdate = new List<PurchaseBillItem>();
        //         var itemsToAdd = new List<PurchaseBillItem>();
        //         var itemsToDelete = new List<PurchaseBillItem>();

        //         var stockToUpdate = new List<StockEntry>();
        //         var stockToAdd = new List<StockEntry>();
        //         var stockToDelete = new List<StockEntry>();

        //         var transactionsToAdd = new List<Transaction>();
        //         // var transactionsToDelete = existingTransactions.ToList(); // Will delete all and recreate

        //         // Process DTO items - determine which are new and which are updates
        //         foreach (var itemDto in dto.Items)
        //         {
        //             if (string.IsNullOrEmpty(itemDto.UniqueUuid) || !existingItemsDict.ContainsKey(itemDto.UniqueUuid))
        //             {
        //                 // New item - will be added
        //                 itemsToAdd.Add(null); // Placeholder, will create later
        //             }
        //             else
        //             {
        //                 // Existing item - will be updated
        //                 itemsToUpdate.Add(existingItemsDict[itemDto.UniqueUuid]);
        //             }
        //         }

        //         // Find items to delete (in existing but not in DTO)
        //         foreach (var existingItem in existingBill.Items)
        //         {
        //             if (!dto.Items.Any(i => i.UniqueUuid == existingItem.UniqueUuid))
        //             {
        //                 itemsToDelete.Add(existingItem);

        //                 // Also mark corresponding stock entry for deletion
        //                 if (existingStockDict.TryGetValue(existingItem.UniqueUuid, out var stockEntry))
        //                 {
        //                     stockToDelete.Add(stockEntry);
        //                 }
        //             }
        //         }

        //         // DELETE PHASE - Remove items that are no longer in the bill
        //         if (itemsToDelete.Any())
        //         {
        //             _logger.LogInformation("Deleting {Count} items that are no longer in the bill", itemsToDelete.Count);

        //             foreach (var item in itemsToDelete)
        //             {
        //                 _context.PurchaseBillItems.Remove(item);
        //             }
        //         }

        //         if (stockToDelete.Any())
        //         {
        //             _logger.LogInformation("Deleting {Count} stock entries", stockToDelete.Count);
        //             _context.StockEntries.RemoveRange(stockToDelete);
        //         }

        //         // Get default accounts
        //         var purchaseAccount = await _context.Accounts
        //             .FirstOrDefaultAsync(a => a.Name == "Purchase" && a.CompanyId == companyId);

        //         var vatAccount = await _context.Accounts
        //             .FirstOrDefaultAsync(a => a.Name == "VAT" && a.CompanyId == companyId);

        //         var roundOffAccount = await _context.Accounts
        //             .FirstOrDefaultAsync(a => a.Name == "Rounded Off" && a.CompanyId == companyId);

        //         var cashAccount = await _context.Accounts
        //             .FirstOrDefaultAsync(a => a.Name == "Cash in Hand" && a.CompanyId == companyId);

        //         var paymentMode = ParsePaymentMode(dto.PaymentMode);

        //         // Determine VAT exemption
        //         bool isVatExempt = dto.IsVatExempt;
        //         bool isVatAll = dto.IsVatAll == "all";

        //         // UPDATE BILL PROPERTIES
        //         existingBill.AccountId = dto.AccountId;
        //         existingBill.IsVatExempt = isVatExempt;
        //         existingBill.VatPercentage = isVatExempt ? 0 : dto.VatPercentage;
        //         existingBill.PartyBillNumber = dto.PartyBillNumber;
        //         existingBill.SubTotal = dto.SubTotal;
        //         existingBill.DiscountAmount = dto.DiscountAmount;
        //         existingBill.DiscountPercentage = dto.DiscountPercentage;
        //         existingBill.NonVatPurchase = dto.NonVatPurchase;
        //         existingBill.TaxableAmount = dto.TaxableAmount;
        //         existingBill.VatAmount = dto.VatAmount;
        //         existingBill.IsVatAll = isVatAll ? "all" : (isVatExempt ? "true" : "false");
        //         existingBill.TotalAmount = dto.TotalAmount;
        //         existingBill.RoundOffAmount = dto.RoundOffAmount;
        //         existingBill.PaymentMode = dto.PaymentMode;
        //         existingBill.TotalCcAmount = dto.TotalCcAmount;

        //         // Set dates based on company format
        //         if (isNepaliFormat)
        //         {
        //             existingBill.nepaliDate = dto.NepaliDate;
        //             existingBill.Date = dto.Date;
        //             existingBill.transactionDateNepali = dto.TransactionDateNepali;
        //             existingBill.TransactionDate = dto.TransactionDate;
        //         }
        //         else
        //         {
        //             existingBill.Date = dto.Date;
        //             existingBill.nepaliDate = dto.NepaliDate;
        //             existingBill.TransactionDate = dto.TransactionDate;
        //             existingBill.transactionDateNepali = dto.TransactionDateNepali;
        //         }

        //         existingBill.UpdatedAt = DateTime.UtcNow;

        //         // PROCESS ITEMS - Update existing and add new
        //         foreach (var itemDto in dto.Items)
        //         {
        //             var product = await _context.Items
        //                 .FirstOrDefaultAsync(i => i.Id == itemDto.ItemId && i.CompanyId == companyId);

        //             if (product == null)
        //                 throw new ArgumentException($"Item with id {itemDto.ItemId} not found");

        //             // Calculate values
        //             decimal wsUnit = itemDto.WsUnit ?? 1m;
        //             decimal quantity = itemDto.Quantity;
        //             decimal bonus = itemDto.Bonus ?? 0m;

        //             decimal totalQuantityWithBonus = quantity + bonus;
        //             decimal netQuantity = totalQuantityWithBonus * wsUnit;

        //             decimal puPriceWithOutBonus = itemDto.PuPrice * quantity;
        //             decimal puPricePerUnit = quantity > 0 && wsUnit > 0
        //                 ? puPriceWithOutBonus / (quantity * wsUnit)
        //                 : 0m;

        //             decimal discountPercentage = dto.DiscountPercentage;
        //             decimal discountAmountPerItem = (itemDto.PuPrice * quantity * discountPercentage) / 100m;
        //             decimal netPuPrice = itemDto.PuPrice - (itemDto.PuPrice * discountPercentage / 100m);

        //             decimal mrpForStock = itemDto.Currency == "INR"
        //                 ? (itemDto.Mrp) * 1.6m
        //                 : (itemDto.Mrp);

        //             decimal mrpPerUnit = wsUnit > 0 ? mrpForStock / wsUnit : 0m;

        //             string uniqueUuid = itemDto.UniqueUuid ?? Guid.NewGuid().ToString();

        //             // Check if this is an existing item or new item
        //             if (!string.IsNullOrEmpty(itemDto.UniqueUuid) && existingItemsDict.TryGetValue(itemDto.UniqueUuid, out var existingItem))
        //             {
        //                 // UPDATE EXISTING ITEM
        //                 existingItem.ItemId = itemDto.ItemId;
        //                 existingItem.UnitId = itemDto.UnitId;
        //                 existingItem.WsUnit = wsUnit;
        //                 existingItem.Quantity = quantity;
        //                 existingItem.Bonus = bonus;
        //                 existingItem.AltBonus = bonus;
        //                 existingItem.Price = itemDto.Price ?? 0;
        //                 existingItem.PuPrice = itemDto.PuPrice;
        //                 existingItem.DiscountPercentagePerItem = discountPercentage;
        //                 existingItem.DiscountAmountPerItem = discountAmountPerItem;
        //                 existingItem.NetPuPrice = netPuPrice;
        //                 existingItem.CcPercentage = itemDto.CcPercentage;
        //                 existingItem.ItemCcAmount = itemDto.ItemCcAmount;
        //                 existingItem.Mrp = itemDto.Mrp;
        //                 existingItem.MarginPercentage = itemDto.MarginPercentage;
        //                 existingItem.Currency = itemDto.Currency ?? "NPR";
        //                 existingItem.AltQuantity = quantity;
        //                 existingItem.AltPrice = itemDto.Price ?? 0;
        //                 existingItem.AltPuPrice = itemDto.PuPrice;
        //                 existingItem.BatchNumber = itemDto.BatchNumber ?? "XXX";
        //                 existingItem.ExpiryDate = itemDto.ExpiryDate ?? DateOnly.FromDateTime(DateTime.UtcNow.AddYears(2));
        //                 existingItem.VatStatus = itemDto.VatStatus ?? product.VatStatus ?? "vatable";
        //                 existingItem.UpdatedAt = DateTime.UtcNow;

        //                 _context.PurchaseBillItems.Update(existingItem);

        //                 // UPDATE CORRESPONDING STOCK ENTRY
        //                 if (existingStockDict.TryGetValue(uniqueUuid, out var existingStock))
        //                 {
        //                     existingStock.Date = isNepaliFormat ? dto.NepaliDate : dto.Date;
        //                     existingStock.WsUnit = wsUnit;
        //                     existingStock.Quantity = netQuantity;
        //                     existingStock.Bonus = bonus * wsUnit;
        //                     existingStock.BatchNumber = itemDto.BatchNumber ?? "XXX";
        //                     existingStock.ExpiryDate = itemDto.ExpiryDate ?? DateOnly.FromDateTime(DateTime.UtcNow.AddYears(2));
        //                     existingStock.Price = wsUnit > 0 ? (itemDto.Price ?? 0m) / wsUnit : 0m;
        //                     existingStock.NetPrice = wsUnit > 0 ? (itemDto.Price ?? 0m) / wsUnit : 0m;
        //                     existingStock.PuPrice = puPricePerUnit;
        //                     existingStock.NetPuPrice = netPuPrice;
        //                     existingStock.ItemCcAmount = itemDto.ItemCcAmount;
        //                     existingStock.DiscountPercentagePerItem = discountPercentage;
        //                     existingStock.DiscountAmountPerItem = discountAmountPerItem;
        //                     existingStock.MainUnitPuPrice = itemDto.PuPrice;
        //                     existingStock.Mrp = mrpPerUnit;
        //                     existingStock.MarginPercentage = itemDto.MarginPercentage;
        //                     existingStock.Currency = itemDto.Currency ?? "NPR";
        //                     existingStock.UpdatedAt = DateTime.UtcNow;

        //                     _context.StockEntries.Update(existingStock);
        //                 }
        //             }
        //             else
        //             {
        //                 // ADD NEW ITEM
        //                 var newItem = new PurchaseBillItem
        //                 {
        //                     Id = Guid.NewGuid(),
        //                     PurchaseBillId = existingBill.Id,
        //                     ItemId = itemDto.ItemId,
        //                     UnitId = itemDto.UnitId,
        //                     WsUnit = wsUnit,
        //                     Quantity = quantity,
        //                     Bonus = bonus,
        //                     AltBonus = bonus,
        //                     Price = itemDto.Price ?? 0,
        //                     PuPrice = itemDto.PuPrice,
        //                     DiscountPercentagePerItem = discountPercentage,
        //                     DiscountAmountPerItem = discountAmountPerItem,
        //                     NetPuPrice = netPuPrice,
        //                     CcPercentage = itemDto.CcPercentage,
        //                     ItemCcAmount = itemDto.ItemCcAmount,
        //                     Mrp = itemDto.Mrp,
        //                     MarginPercentage = itemDto.MarginPercentage,
        //                     Currency = itemDto.Currency ?? "NPR",
        //                     AltQuantity = quantity,
        //                     AltPrice = itemDto.Price ?? 0,
        //                     AltPuPrice = itemDto.PuPrice,
        //                     BatchNumber = itemDto.BatchNumber ?? "XXX",
        //                     ExpiryDate = itemDto.ExpiryDate ?? DateOnly.FromDateTime(DateTime.UtcNow.AddYears(2)),
        //                     VatStatus = itemDto.VatStatus ?? product.VatStatus ?? "vatable",
        //                     UniqueUuid = uniqueUuid,
        //                     CreatedAt = DateTime.UtcNow,
        //                     UpdatedAt = DateTime.UtcNow
        //                 };

        //                 existingBill.Items.Add(newItem);

        //                 // ADD NEW STOCK ENTRY
        //                 var newStock = new StockEntry
        //                 {
        //                     Id = Guid.NewGuid(),
        //                     ItemId = itemDto.ItemId,
        //                     Date = isNepaliFormat ? dto.NepaliDate : dto.Date,
        //                     WsUnit = wsUnit,
        //                     Quantity = netQuantity,
        //                     Bonus = bonus * wsUnit,
        //                     BatchNumber = itemDto.BatchNumber ?? "XXX",
        //                     ExpiryDate = itemDto.ExpiryDate ?? DateOnly.FromDateTime(DateTime.UtcNow.AddYears(2)),
        //                     Price = wsUnit > 0 ? (itemDto.Price ?? 0m) / wsUnit : 0m,
        //                     NetPrice = wsUnit > 0 ? (itemDto.Price ?? 0m) / wsUnit : 0m,
        //                     PuPrice = puPricePerUnit,
        //                     NetPuPrice = netPuPrice,
        //                     ItemCcAmount = itemDto.ItemCcAmount,
        //                     DiscountPercentagePerItem = discountPercentage,
        //                     DiscountAmountPerItem = discountAmountPerItem,
        //                     MainUnitPuPrice = itemDto.PuPrice,
        //                     Mrp = mrpPerUnit,
        //                     MarginPercentage = itemDto.MarginPercentage,
        //                     Currency = itemDto.Currency ?? "NPR",
        //                     FiscalYearId = fiscalYearId,
        //                     UniqueUuid = uniqueUuid,
        //                     PurchaseBillId = existingBill.Id,
        //                     ExpiryStatus = CalculateExpiryStatus(itemDto.ExpiryDate ?? DateOnly.FromDateTime(DateTime.UtcNow.AddYears(2))),
        //                     DaysUntilExpiry = CalculateDaysUntilExpiry(itemDto.ExpiryDate ?? DateOnly.FromDateTime(DateTime.UtcNow.AddYears(2))),
        //                     CreatedAt = DateTime.UtcNow,
        //                     UpdatedAt = DateTime.UtcNow
        //                 };

        //                 await _context.StockEntries.AddAsync(newStock);
        //             }

        //             // CREATE NEW TRANSACTION FOR EACH ITEM (always create new ones)
        //             var partyTransaction = new Transaction
        //             {
        //                 Id = Guid.NewGuid(),
        //                 CompanyId = companyId,
        //                 ItemId = itemDto.ItemId,
        //                 UnitId = itemDto.UnitId,
        //                 WSUnit = (int?)wsUnit,
        //                 Quantity = quantity,
        //                 Bonus = bonus,
        //                 Price = itemDto.Price ?? 0,
        //                 PuPrice = itemDto.PuPrice,
        //                 DiscountPercentagePerItem = discountPercentage,
        //                 DiscountAmountPerItem = discountAmountPerItem,
        //                 NetPuPrice = netPuPrice,
        //                 AccountId = dto.AccountId,
        //                 PurchaseBillId = existingBill.Id,
        //                 BillNumber = existingBill.BillNumber,
        //                 PartyBillNumber = dto.PartyBillNumber,
        //                 Type = TransactionType.Purc,
        //                 PurchaseSalesType = "Purchase",
        //                 Debit = 0,
        //                 Credit = dto.TotalAmount,
        //                 PaymentMode = paymentMode,
        //                 Date = isNepaliFormat ? dto.NepaliDate : dto.Date,
        //                 BillDate = isNepaliFormat ? dto.NepaliDate : dto.Date,
        //                 nepaliDate = dto.NepaliDate,
        //                 transactionDateNepali = dto.TransactionDateNepali,
        //                 FiscalYearId = fiscalYearId,
        //                 CreatedAt = DateTime.UtcNow,
        //                 Status = TransactionStatus.Active,
        //                 IsActive = true,
        //             };

        //             await _context.Transactions.AddAsync(partyTransaction);
        //         }

        //         // CREATE ACCOUNT TRANSACTIONS
        //         // 1. Purchase account transaction
        //         if (purchaseAccount != null)
        //         {
        //             var purchaseAmount = dto.TaxableAmount + dto.NonVatPurchase;
        //             var purchaseTransaction = new Transaction
        //             {
        //                 Id = Guid.NewGuid(),
        //                 CompanyId = companyId,
        //                 AccountId = purchaseAccount.Id,
        //                 PurchaseBillId = existingBill.Id,
        //                 BillNumber = existingBill.BillNumber,
        //                 PartyBillNumber = dto.PartyBillNumber,
        //                 Type = TransactionType.Purc,
        //                 PurchaseSalesType = "Purchase",
        //                 Debit = purchaseAmount,
        //                 Credit = 0,
        //                 PaymentMode = paymentMode,
        //                 Date = isNepaliFormat ? dto.NepaliDate : dto.Date,
        //                 BillDate = isNepaliFormat ? dto.NepaliDate : dto.Date,
        //                 FiscalYearId = fiscalYearId,
        //                 CreatedAt = DateTime.UtcNow,
        //                 Status = TransactionStatus.Active,
        //                 IsActive = true
        //             };

        //             await _context.Transactions.AddAsync(purchaseTransaction);
        //         }

        //         // 2. VAT transaction if applicable
        //         if (dto.VatAmount > 0 && vatAccount != null && !isVatExempt)
        //         {
        //             var vatTransaction = new Transaction
        //             {
        //                 Id = Guid.NewGuid(),
        //                 CompanyId = companyId,
        //                 AccountId = vatAccount.Id,
        //                 PurchaseBillId = existingBill.Id,
        //                 BillNumber = existingBill.BillNumber,
        //                 PartyBillNumber = dto.PartyBillNumber,
        //                 IsType = TransactionIsType.VAT,
        //                 Type = TransactionType.Purc,
        //                 PurchaseSalesType = "Purchase",
        //                 Debit = dto.VatAmount,
        //                 Credit = 0,
        //                 PaymentMode = paymentMode,
        //                 Date = isNepaliFormat ? dto.NepaliDate : dto.Date,
        //                 BillDate = isNepaliFormat ? dto.NepaliDate : dto.Date,
        //                 FiscalYearId = fiscalYearId,
        //                 CreatedAt = DateTime.UtcNow,
        //                 Status = TransactionStatus.Active,
        //                 IsActive = true
        //             };

        //             await _context.Transactions.AddAsync(vatTransaction);
        //         }

        //         // 3. Round-off transaction if applicable
        //         if (dto.RoundOffAmount != 0 && roundOffAccount != null)
        //         {
        //             var roundOffTransaction = new Transaction
        //             {
        //                 Id = Guid.NewGuid(),
        //                 CompanyId = companyId,
        //                 AccountId = roundOffAccount.Id,
        //                 PurchaseBillId = existingBill.Id,
        //                 BillNumber = existingBill.BillNumber,
        //                 PartyBillNumber = dto.PartyBillNumber,
        //                 IsType = TransactionIsType.RoundOff,
        //                 Type = TransactionType.Purc,
        //                 PurchaseSalesType = "Purchase",
        //                 Debit = dto.RoundOffAmount > 0 ? dto.RoundOffAmount : 0,
        //                 Credit = dto.RoundOffAmount < 0 ? Math.Abs(dto.RoundOffAmount) : 0,
        //                 PaymentMode = paymentMode,
        //                 Date = isNepaliFormat ? dto.NepaliDate : dto.Date,
        //                 BillDate = isNepaliFormat ? dto.NepaliDate : dto.Date,
        //                 FiscalYearId = fiscalYearId,
        //                 CreatedAt = DateTime.UtcNow,
        //                 Status = TransactionStatus.Active,
        //                 IsActive = true
        //             };

        //             await _context.Transactions.AddAsync(roundOffTransaction);
        //         }

        //         // 4. Cash transaction if payment mode is cash
        //         if (paymentMode == PaymentMode.Cash && cashAccount != null)
        //         {
        //             var cashTransaction = new Transaction
        //             {
        //                 Id = Guid.NewGuid(),
        //                 CompanyId = companyId,
        //                 AccountId = cashAccount.Id,
        //                 PurchaseBillId = existingBill.Id,
        //                 BillNumber = existingBill.BillNumber,
        //                 PartyBillNumber = dto.PartyBillNumber,
        //                 Type = TransactionType.Purc,
        //                 PurchaseSalesType = "Purchase",
        //                 Debit = 0,
        //                 Credit = dto.TotalAmount,
        //                 PaymentMode = PaymentMode.Cash,
        //                 Date = isNepaliFormat ? dto.NepaliDate : dto.Date,
        //                 BillDate = isNepaliFormat ? dto.NepaliDate : dto.Date,
        //                 FiscalYearId = fiscalYearId,
        //                 CreatedAt = DateTime.UtcNow,
        //                 Status = TransactionStatus.Active,
        //                 IsActive = true
        //             };

        //             await _context.Transactions.AddAsync(cashTransaction);
        //         }

        //         // LOG ENTITY STATES BEFORE SAVE
        //         _logger.LogInformation("=== Entity States Before SaveChanges ===");
        //         var beforeSaveEntries = _context.ChangeTracker.Entries()
        //             .Where(e => e.State != EntityState.Unchanged)
        //             .ToList();

        //         _logger.LogInformation("Total changed entities: {Count}", beforeSaveEntries.Count);

        //         foreach (var entry in beforeSaveEntries)
        //         {
        //             _logger.LogInformation("  Entity: {EntityType}, Id: {EntityId}, State: {State}",
        //                 entry.Entity.GetType().Name, GetEntityId(entry.Entity), entry.State);
        //         }

        //         // Save all changes
        //         _logger.LogInformation("Calling SaveChangesAsync...");
        //         var saveResult = await _context.SaveChangesAsync();
        //         _logger.LogInformation("SaveChangesAsync completed. {RowCount} rows affected.", saveResult);

        //         await transaction.CommitAsync();
        //         _logger.LogInformation("Transaction committed successfully");

        //         _logger.LogInformation("=== Successfully updated purchase bill: {BillId} ===", id);

        //         return existingBill;
        //     }
        //     catch (DbUpdateConcurrencyException ex)
        //     {
        //         _logger.LogError(ex, "CONCURRENCY EXCEPTION in UpdatePurchaseBillAsync for bill {BillId}", id);

        //         foreach (var entry in ex.Entries)
        //         {
        //             var entityType = entry.Entity.GetType().Name;
        //             var entityId = GetEntityId(entry.Entity);
        //             var databaseValues = await entry.GetDatabaseValuesAsync();

        //             _logger.LogInformation("Entity: {EntityType}, Id: {EntityId}", entityType, entityId);
        //             _logger.LogInformation("  Original State: {State}", entry.State);

        //             if (databaseValues == null)
        //             {
        //                 _logger.LogInformation("  Entity no longer exists in database");
        //             }
        //         }

        //         await transaction.RollbackAsync();
        //         throw;
        //     }
        //     catch (Exception ex)
        //     {
        //         _logger.LogError(ex, "Error updating purchase bill: {BillId}", id);
        //         await transaction.RollbackAsync();
        //         throw;
        //     }
        // }

        // Helper method to check if stock is used

        public async Task<PurchaseBill> UpdatePurchaseBillAsync(Guid id, UpdatePurchaseBillDTO dto, Guid companyId, Guid fiscalYearId, Guid userId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                _logger.LogInformation("=== Starting UpdatePurchaseBillAsync for Bill ID: {BillId} ===", id);
                _logger.LogInformation("CompanyId: {CompanyId}, FiscalYearId: {FiscalYearId}, UserId: {UserId}", companyId, fiscalYearId, userId);

                // Validate required fields
                _logger.LogDebug("Validating required fields...");
                if (dto.AccountId == Guid.Empty)
                    throw new ArgumentException("Account ID is required");

                if (dto.Items == null || !dto.Items.Any())
                    throw new ArgumentException("At least one item is required");

                if (string.IsNullOrEmpty(dto.PaymentMode))
                    throw new ArgumentException("Payment mode is required");

                // Get company to check date format
                var company = await _context.Companies.FindAsync(companyId);
                if (company == null)
                    throw new ArgumentException("Company not found");

                // Validate dates based on company format
                bool isNepaliFormat = company.DateFormat == DateFormatEnum.Nepali;

                // Validate account belongs to company
                var account = await _context.Accounts
                    .FirstOrDefaultAsync(a => a.Id == dto.AccountId && a.CompanyId == companyId);

                if (account == null)
                    throw new ArgumentException("Invalid account for this company");

                // Get the existing purchase bill with ALL related data
                var existingBill = await _context.PurchaseBills
                    .Include(pb => pb.Items)
                    .FirstOrDefaultAsync(pb => pb.Id == id && pb.CompanyId == companyId);

                if (existingBill == null)
                    throw new ArgumentException("Purchase bill not found");

                var fiscalYear = await _context.FiscalYears
                    .FirstOrDefaultAsync(f => f.Id == fiscalYearId && f.CompanyId == companyId);

                if (fiscalYear == null)
                    throw new ArgumentException("Fiscal year not found");

                // CHECK IF STOCK IS USED
                await CheckIfStockIsUsedAsync(existingBill, companyId);

                // Get all stock entries for this purchase bill
                var existingStockEntries = await _context.StockEntries
                    .Where(se => se.PurchaseBillId == id)
                    .ToListAsync();

                // Create dictionaries for quick lookup
                var existingItemsDict = existingBill.Items.ToDictionary(i => i.UniqueUuid);
                var existingStockDict = existingStockEntries.ToDictionary(se => se.UniqueUuid);

                // Track items to process
                var itemsToUpdate = new List<PurchaseBillItem>();
                var itemsToAdd = new List<PurchaseBillItem>();
                var itemsToDelete = new List<PurchaseBillItem>();

                var stockToUpdate = new List<StockEntry>();
                var stockToAdd = new List<StockEntry>();
                var stockToDelete = new List<StockEntry>();

                // Get the overall discount percentage and round-off amount from the voucher
                decimal overallDiscountPercentage = dto.DiscountPercentage;
                decimal roundOffAmount = dto.RoundOffAmount;

                // FIRST PASS: Calculate total purchase value before round-off for proportional distribution
                decimal totalPurchaseValueBeforeRoundOff = 0m;
                var itemCalculations = new Dictionary<string, (decimal netValueAfterDiscountAndCC, decimal netQuantity, decimal wsUnit, decimal quantity)>();

                foreach (var itemDto in dto.Items)
                {
                    decimal quantity = itemDto.Quantity;
                    decimal bonus = itemDto.Bonus ?? 0m;
                    decimal wsUnit = itemDto.WsUnit ?? 1m;
                    decimal ccAmountForItem = itemDto.ItemCcAmount;

                    // Calculate total purchase value before discount
                    decimal totalPurchaseValueBeforeDiscount = itemDto.PuPrice * quantity;

                    // Calculate discount amount for this item
                    decimal discountAmountForItem = (totalPurchaseValueBeforeDiscount * overallDiscountPercentage) / 100m;

                    // Net value after discount and CC (before round-off)
                    decimal netValueAfterDiscountAndCC = totalPurchaseValueBeforeDiscount - discountAmountForItem + ccAmountForItem;

                    // Track for proportional distribution
                    totalPurchaseValueBeforeRoundOff += netValueAfterDiscountAndCC;

                    // Store calculation for second pass
                    string uniqueUuid = itemDto.UniqueUuid ?? Guid.NewGuid().ToString();
                    decimal netQuantity = (quantity + bonus) * wsUnit;

                    itemCalculations[uniqueUuid] = (netValueAfterDiscountAndCC, netQuantity, wsUnit, quantity);
                }

                // Process DTO items - determine which are new and which are updates
                foreach (var itemDto in dto.Items)
                {
                    if (string.IsNullOrEmpty(itemDto.UniqueUuid) || !existingItemsDict.ContainsKey(itemDto.UniqueUuid))
                    {
                        // New item - will be added
                        itemsToAdd.Add(null); // Placeholder, will create later
                    }
                    else
                    {
                        // Existing item - will be updated
                        itemsToUpdate.Add(existingItemsDict[itemDto.UniqueUuid]);
                    }
                }

                // Find items to delete (in existing but not in DTO)
                foreach (var existingItem in existingBill.Items)
                {
                    if (!dto.Items.Any(i => i.UniqueUuid == existingItem.UniqueUuid))
                    {
                        itemsToDelete.Add(existingItem);

                        // Also mark corresponding stock entry for deletion
                        if (existingStockDict.TryGetValue(existingItem.UniqueUuid, out var stockEntry))
                        {
                            stockToDelete.Add(stockEntry);
                        }
                    }
                }

                // DELETE PHASE - Remove items that are no longer in the bill
                if (itemsToDelete.Any())
                {
                    _logger.LogInformation("Deleting {Count} items that are no longer in the bill", itemsToDelete.Count);

                    foreach (var item in itemsToDelete)
                    {
                        _context.PurchaseBillItems.Remove(item);
                    }
                }

                if (stockToDelete.Any())
                {
                    _logger.LogInformation("Deleting {Count} stock entries", stockToDelete.Count);
                    _context.StockEntries.RemoveRange(stockToDelete);
                }

                // Get default accounts
                var purchaseAccount = await _context.Accounts
                    .FirstOrDefaultAsync(a => a.Name == "Purchase" && a.CompanyId == companyId);

                var vatAccount = await _context.Accounts
                    .FirstOrDefaultAsync(a => a.Name == "VAT" && a.CompanyId == companyId);

                var roundOffAccount = await _context.Accounts
                    .FirstOrDefaultAsync(a => a.Name == "Rounded Off" && a.CompanyId == companyId);

                var cashAccount = await _context.Accounts
                    .FirstOrDefaultAsync(a => a.Name == "Cash in Hand" && a.CompanyId == companyId);

                var paymentMode = ParsePaymentMode(dto.PaymentMode);

                // Determine VAT exemption
                bool isVatExempt = dto.IsVatExempt;
                bool isVatAll = dto.IsVatAll == "all";

                // UPDATE BILL PROPERTIES
                existingBill.AccountId = dto.AccountId;
                existingBill.IsVatExempt = isVatExempt;
                existingBill.VatPercentage = isVatExempt ? 0 : dto.VatPercentage;
                existingBill.PartyBillNumber = dto.PartyBillNumber;
                existingBill.SubTotal = dto.SubTotal;
                existingBill.DiscountAmount = dto.DiscountAmount;
                existingBill.DiscountPercentage = dto.DiscountPercentage;
                existingBill.NonVatPurchase = dto.NonVatPurchase;
                existingBill.TaxableAmount = dto.TaxableAmount;
                existingBill.VatAmount = dto.VatAmount;
                existingBill.IsVatAll = isVatAll ? "all" : (isVatExempt ? "true" : "false");
                existingBill.TotalAmount = dto.TotalAmount;
                existingBill.RoundOffAmount = dto.RoundOffAmount;
                existingBill.PaymentMode = dto.PaymentMode;
                existingBill.TotalCcAmount = dto.TotalCcAmount;

                // Set dates based on company format
                if (isNepaliFormat)
                {
                    existingBill.nepaliDate = dto.NepaliDate;
                    existingBill.Date = dto.Date;
                    existingBill.transactionDateNepali = dto.TransactionDateNepali;
                    existingBill.TransactionDate = dto.TransactionDate;
                }
                else
                {
                    existingBill.Date = dto.Date;
                    existingBill.nepaliDate = dto.NepaliDate;
                    existingBill.TransactionDate = dto.TransactionDate;
                    existingBill.transactionDateNepali = dto.TransactionDateNepali;
                }

                existingBill.UpdatedAt = DateTime.UtcNow;

                // PROCESS ITEMS - Update existing and add new with correct calculations
                foreach (var itemDto in dto.Items)
                {
                    var product = await _context.Items
                        .FirstOrDefaultAsync(i => i.Id == itemDto.ItemId && i.CompanyId == companyId);

                    if (product == null)
                        throw new ArgumentException($"Item with id {itemDto.ItemId} not found");

                    // Calculate values based on MongoDB logic - SAME AS CREATE METHOD
                    decimal wsUnit = itemDto.WsUnit ?? 1m;
                    decimal quantity = itemDto.Quantity;
                    decimal bonus = itemDto.Bonus ?? 0m;
                    decimal ccAmountForItem = itemDto.ItemCcAmount;
                    decimal ccPercentage = itemDto.CcPercentage;

                    // Total quantity including bonus multiplied by WS Unit
                    decimal totalQuantityWithBonus = quantity + bonus;
                    decimal netQuantity = totalQuantityWithBonus * wsUnit;

                    // Calculate total purchase value before discount (only for purchased quantity, not bonus)
                    decimal totalPurchaseValueBeforeDiscount = itemDto.PuPrice * quantity;

                    // Calculate discount amount for this item based on overall voucher discount
                    decimal discountAmountForItem = (totalPurchaseValueBeforeDiscount * overallDiscountPercentage) / 100m;

                    // Calculate net value after discount and CC (before round-off)
                    decimal netValueAfterDiscountAndCC = totalPurchaseValueBeforeDiscount - discountAmountForItem + ccAmountForItem;

                    // Distribute round-off amount proportionally based on item's value
                    decimal itemRoundOffAmount = 0m;
                    if (totalPurchaseValueBeforeRoundOff > 0 && roundOffAmount != 0)
                    {
                        decimal roundOffShare = netValueAfterDiscountAndCC / totalPurchaseValueBeforeRoundOff;
                        itemRoundOffAmount = roundOffAmount * roundOffShare;
                    }

                    // Calculate net purchase value after discount, CC, and including round-off
                    decimal netPurchaseValueAfterAll = netValueAfterDiscountAndCC + itemRoundOffAmount;

                    // Calculate the final PuPrice per unit (including bonus items) - WITH CC CHARGES AND ROUND-OFF INCLUDED
                    // The cost is spread across all units (purchased + bonus)
                    decimal finalPuPricePerUnit = netQuantity > 0
                        ? netPurchaseValueAfterAll / netQuantity
                        : 0m;

                    // Calculate MRP for stock (convert INR if needed)
                    decimal mrpForStock = itemDto.Currency == "INR"
                        ? itemDto.Mrp * 1.6m
                        : itemDto.Mrp;

                    decimal mrpPerUnit = wsUnit > 0 ? mrpForStock / wsUnit : 0m;

                    // Calculate net pu price per unit (before spreading to bonus) - including CC and round-off
                    decimal netPuPrice = itemDto.PuPrice - (itemDto.PuPrice * overallDiscountPercentage / 100m);

                    // Add per-unit CC amount (distribute total CC amount across all purchased units)
                    if (quantity > 0 && ccAmountForItem != 0)
                    {
                        netPuPrice += (ccAmountForItem / quantity);
                    }

                    // Add per-unit round-off amount (distribute proportionally)
                    if (quantity > 0 && itemRoundOffAmount != 0)
                    {
                        netPuPrice += (itemRoundOffAmount / quantity);
                    }

                    string uniqueUuid = itemDto.UniqueUuid ?? Guid.NewGuid().ToString();

                    // Check if this is an existing item or new item
                    if (!string.IsNullOrEmpty(itemDto.UniqueUuid) && existingItemsDict.TryGetValue(itemDto.UniqueUuid, out var existingItem))
                    {
                        // UPDATE EXISTING ITEM
                        existingItem.ItemId = itemDto.ItemId;
                        existingItem.UnitId = itemDto.UnitId;
                        existingItem.WsUnit = wsUnit;
                        existingItem.Quantity = quantity;
                        existingItem.Bonus = bonus;
                        existingItem.AltBonus = bonus;
                        existingItem.Price = itemDto.Price ?? 0;
                        existingItem.PuPrice = itemDto.PuPrice;
                        existingItem.DiscountPercentagePerItem = overallDiscountPercentage;
                        existingItem.DiscountAmountPerItem = discountAmountForItem;
                        existingItem.NetPuPrice = netPuPrice;
                        existingItem.CcPercentage = ccPercentage;
                        existingItem.ItemCcAmount = ccAmountForItem;
                        existingItem.Mrp = itemDto.Mrp;
                        existingItem.MarginPercentage = itemDto.MarginPercentage;
                        existingItem.Currency = itemDto.Currency ?? "NPR";
                        existingItem.AltQuantity = quantity;
                        existingItem.AltPrice = itemDto.Price ?? 0;
                        existingItem.AltPuPrice = itemDto.PuPrice;
                        existingItem.BatchNumber = itemDto.BatchNumber ?? "XXX";
                        existingItem.ExpiryDate = itemDto.ExpiryDate ?? DateOnly.FromDateTime(DateTime.UtcNow.AddYears(2));
                        existingItem.VatStatus = itemDto.VatStatus ?? product.VatStatus ?? "vatable";
                        existingItem.UpdatedAt = DateTime.UtcNow;

                        _context.PurchaseBillItems.Update(existingItem);

                        // UPDATE CORRESPONDING STOCK ENTRY - WITH CORRECT PuPrice
                        if (existingStockDict.TryGetValue(uniqueUuid, out var existingStock))
                        {
                            existingStock.Date = isNepaliFormat ? dto.NepaliDate : dto.Date;
                            existingStock.WsUnit = wsUnit;
                            existingStock.Quantity = netQuantity;
                            existingStock.Bonus = bonus * wsUnit;
                            existingStock.BatchNumber = itemDto.BatchNumber ?? "XXX";
                            existingStock.ExpiryDate = itemDto.ExpiryDate ?? DateOnly.FromDateTime(DateTime.UtcNow.AddYears(2));
                            existingStock.Price = wsUnit > 0 ? (itemDto.Price ?? 0m) / wsUnit : 0m;
                            existingStock.NetPrice = wsUnit > 0 ? (itemDto.Price ?? 0m) / wsUnit : 0m;

                            // IMPORTANT: Using finalPuPricePerUnit which accounts for:
                            // 1. Original PuPrice
                            // 2. Overall voucher discount
                            // 3. CC charges (amount from frontend)
                            // 4. Round-off amount (distributed proportionally)
                            // 5. Bonus items (spreading cost across all units)
                            existingStock.PuPrice = finalPuPricePerUnit;
                            existingStock.NetPuPrice = finalPuPricePerUnit;

                            existingStock.ItemCcAmount = ccAmountForItem;
                            existingStock.DiscountPercentagePerItem = overallDiscountPercentage;
                            existingStock.DiscountAmountPerItem = discountAmountForItem;
                            existingStock.MainUnitPuPrice = itemDto.PuPrice;
                            existingStock.Mrp = mrpPerUnit;
                            existingStock.MarginPercentage = itemDto.MarginPercentage;
                            existingStock.Currency = itemDto.Currency ?? "NPR";
                            existingStock.UpdatedAt = DateTime.UtcNow;

                            _context.StockEntries.Update(existingStock);

                            _logger.LogInformation($"UPDATED StockEntry.PuPrice set to: {existingStock.PuPrice}");
                            _logger.LogInformation($"UPDATED Calculation: Total Value Before: {totalPurchaseValueBeforeDiscount}, Discount: {discountAmountForItem}, CC: {ccAmountForItem}, Round-off: {itemRoundOffAmount}, Net Value: {netPurchaseValueAfterAll}, Total Units: {netQuantity}, Final Price/Unit: {finalPuPricePerUnit}");
                        }
                    }
                    else
                    {
                        // ADD NEW ITEM
                        var newItem = new PurchaseBillItem
                        {
                            Id = Guid.NewGuid(),
                            PurchaseBillId = existingBill.Id,
                            ItemId = itemDto.ItemId,
                            UnitId = itemDto.UnitId,
                            WsUnit = wsUnit,
                            Quantity = quantity,
                            Bonus = bonus,
                            AltBonus = bonus,
                            Price = itemDto.Price ?? 0,
                            PuPrice = itemDto.PuPrice,
                            DiscountPercentagePerItem = overallDiscountPercentage,
                            DiscountAmountPerItem = discountAmountForItem,
                            NetPuPrice = netPuPrice,
                            CcPercentage = ccPercentage,
                            ItemCcAmount = ccAmountForItem,
                            Mrp = itemDto.Mrp,
                            MarginPercentage = itemDto.MarginPercentage,
                            Currency = itemDto.Currency ?? "NPR",
                            AltQuantity = quantity,
                            AltPrice = itemDto.Price ?? 0,
                            AltPuPrice = itemDto.PuPrice,
                            BatchNumber = itemDto.BatchNumber ?? "XXX",
                            ExpiryDate = itemDto.ExpiryDate ?? DateOnly.FromDateTime(DateTime.UtcNow.AddYears(2)),
                            VatStatus = itemDto.VatStatus ?? product.VatStatus ?? "vatable",
                            UniqueUuid = uniqueUuid,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        };

                        existingBill.Items.Add(newItem);

                        // ADD NEW STOCK ENTRY - WITH CORRECT PuPrice
                        var newStock = new StockEntry
                        {
                            Id = Guid.NewGuid(),
                            ItemId = itemDto.ItemId,
                            Date = isNepaliFormat ? dto.NepaliDate : dto.Date,
                            WsUnit = wsUnit,
                            Quantity = netQuantity,
                            Bonus = bonus * wsUnit,
                            BatchNumber = itemDto.BatchNumber ?? "XXX",
                            ExpiryDate = itemDto.ExpiryDate ?? DateOnly.FromDateTime(DateTime.UtcNow.AddYears(2)),
                            Price = wsUnit > 0 ? (itemDto.Price ?? 0m) / wsUnit : 0m,
                            NetPrice = wsUnit > 0 ? (itemDto.Price ?? 0m) / wsUnit : 0m,

                            // IMPORTANT: Using finalPuPricePerUnit which accounts for:
                            // 1. Original PuPrice
                            // 2. Overall voucher discount
                            // 3. CC charges (amount from frontend)
                            // 4. Round-off amount (distributed proportionally)
                            // 5. Bonus items (spreading cost across all units)
                            PuPrice = finalPuPricePerUnit,
                            NetPuPrice = finalPuPricePerUnit,

                            ItemCcAmount = ccAmountForItem,
                            DiscountPercentagePerItem = overallDiscountPercentage,
                            DiscountAmountPerItem = discountAmountForItem,
                            MainUnitPuPrice = itemDto.PuPrice,
                            Mrp = mrpPerUnit,
                            MarginPercentage = itemDto.MarginPercentage,
                            Currency = itemDto.Currency ?? "NPR",
                            FiscalYearId = fiscalYearId,
                            UniqueUuid = uniqueUuid,
                            PurchaseBillId = existingBill.Id,
                            ExpiryStatus = CalculateExpiryStatus(itemDto.ExpiryDate ?? DateOnly.FromDateTime(DateTime.UtcNow.AddYears(2))),
                            DaysUntilExpiry = CalculateDaysUntilExpiry(itemDto.ExpiryDate ?? DateOnly.FromDateTime(DateTime.UtcNow.AddYears(2))),
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        };

                        await _context.StockEntries.AddAsync(newStock);

                        _logger.LogInformation($"ADDED StockEntry.PuPrice set to: {newStock.PuPrice}");
                        _logger.LogInformation($"ADDED Calculation: Total Value Before: {totalPurchaseValueBeforeDiscount}, Discount: {discountAmountForItem}, CC: {ccAmountForItem}, Round-off: {itemRoundOffAmount}, Net Value: {netPurchaseValueAfterAll}, Total Units: {netQuantity}, Final Price/Unit: {finalPuPricePerUnit}");
                    }

                    // CREATE NEW TRANSACTION FOR EACH ITEM (always create new ones)
                    var partyTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        ItemId = itemDto.ItemId,
                        UnitId = itemDto.UnitId,
                        WSUnit = (int?)wsUnit,
                        Quantity = quantity,
                        Bonus = bonus,
                        Price = itemDto.Price ?? 0,
                        PuPrice = itemDto.PuPrice,
                        DiscountPercentagePerItem = overallDiscountPercentage,
                        DiscountAmountPerItem = discountAmountForItem,
                        NetPuPrice = netPuPrice,
                        AccountId = dto.AccountId,
                        PurchaseBillId = existingBill.Id,
                        BillNumber = existingBill.BillNumber,
                        PartyBillNumber = dto.PartyBillNumber,
                        Type = TransactionType.Purc,
                        PurchaseSalesType = "Purchase",
                        Debit = 0,
                        Credit = dto.TotalAmount,
                        PaymentMode = paymentMode,
                        Date = isNepaliFormat ? dto.NepaliDate : dto.Date,
                        BillDate = isNepaliFormat ? dto.NepaliDate : dto.Date,
                        nepaliDate = dto.NepaliDate,
                        transactionDateNepali = dto.TransactionDateNepali,
                        FiscalYearId = fiscalYearId,
                        CreatedAt = DateTime.UtcNow,
                        Status = TransactionStatus.Active,
                        IsActive = true,
                    };

                    await _context.Transactions.AddAsync(partyTransaction);
                }

                // CREATE ACCOUNT TRANSACTIONS
                // 1. Purchase account transaction
                if (purchaseAccount != null)
                {
                    var purchaseAmount = dto.TaxableAmount + dto.NonVatPurchase;
                    var purchaseTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        AccountId = purchaseAccount.Id,
                        PurchaseBillId = existingBill.Id,
                        BillNumber = existingBill.BillNumber,
                        PartyBillNumber = dto.PartyBillNumber,
                        Type = TransactionType.Purc,
                        PurchaseSalesType = "Purchase",
                        Debit = purchaseAmount,
                        Credit = 0,
                        PaymentMode = paymentMode,
                        Date = isNepaliFormat ? dto.NepaliDate : dto.Date,
                        BillDate = isNepaliFormat ? dto.NepaliDate : dto.Date,
                        FiscalYearId = fiscalYearId,
                        CreatedAt = DateTime.UtcNow,
                        Status = TransactionStatus.Active,
                        IsActive = true
                    };

                    await _context.Transactions.AddAsync(purchaseTransaction);
                }

                // 2. VAT transaction if applicable
                if (dto.VatAmount > 0 && vatAccount != null && !isVatExempt)
                {
                    var vatTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        AccountId = vatAccount.Id,
                        PurchaseBillId = existingBill.Id,
                        BillNumber = existingBill.BillNumber,
                        PartyBillNumber = dto.PartyBillNumber,
                        IsType = TransactionIsType.VAT,
                        Type = TransactionType.Purc,
                        PurchaseSalesType = "Purchase",
                        Debit = dto.VatAmount,
                        Credit = 0,
                        PaymentMode = paymentMode,
                        Date = isNepaliFormat ? dto.NepaliDate : dto.Date,
                        BillDate = isNepaliFormat ? dto.NepaliDate : dto.Date,
                        FiscalYearId = fiscalYearId,
                        CreatedAt = DateTime.UtcNow,
                        Status = TransactionStatus.Active,
                        IsActive = true
                    };

                    await _context.Transactions.AddAsync(vatTransaction);
                }

                // 3. Round-off transaction if applicable
                if (dto.RoundOffAmount != 0 && roundOffAccount != null)
                {
                    var roundOffTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        AccountId = roundOffAccount.Id,
                        PurchaseBillId = existingBill.Id,
                        BillNumber = existingBill.BillNumber,
                        PartyBillNumber = dto.PartyBillNumber,
                        IsType = TransactionIsType.RoundOff,
                        Type = TransactionType.Purc,
                        PurchaseSalesType = "Purchase",
                        Debit = dto.RoundOffAmount > 0 ? dto.RoundOffAmount : 0,
                        Credit = dto.RoundOffAmount < 0 ? Math.Abs(dto.RoundOffAmount) : 0,
                        PaymentMode = paymentMode,
                        Date = isNepaliFormat ? dto.NepaliDate : dto.Date,
                        BillDate = isNepaliFormat ? dto.NepaliDate : dto.Date,
                        FiscalYearId = fiscalYearId,
                        CreatedAt = DateTime.UtcNow,
                        Status = TransactionStatus.Active,
                        IsActive = true
                    };

                    await _context.Transactions.AddAsync(roundOffTransaction);
                }

                // 4. Cash transaction if payment mode is cash
                if (paymentMode == PaymentMode.Cash && cashAccount != null)
                {
                    var cashTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        AccountId = cashAccount.Id,
                        PurchaseBillId = existingBill.Id,
                        BillNumber = existingBill.BillNumber,
                        PartyBillNumber = dto.PartyBillNumber,
                        Type = TransactionType.Purc,
                        PurchaseSalesType = "Purchase",
                        Debit = 0,
                        Credit = dto.TotalAmount,
                        PaymentMode = PaymentMode.Cash,
                        Date = isNepaliFormat ? dto.NepaliDate : dto.Date,
                        BillDate = isNepaliFormat ? dto.NepaliDate : dto.Date,
                        FiscalYearId = fiscalYearId,
                        CreatedAt = DateTime.UtcNow,
                        Status = TransactionStatus.Active,
                        IsActive = true
                    };

                    await _context.Transactions.AddAsync(cashTransaction);
                }

                // LOG ENTITY STATES BEFORE SAVE
                _logger.LogInformation("=== Entity States Before SaveChanges ===");
                var beforeSaveEntries = _context.ChangeTracker.Entries()
                    .Where(e => e.State != EntityState.Unchanged)
                    .ToList();

                _logger.LogInformation("Total changed entities: {Count}", beforeSaveEntries.Count);

                foreach (var entry in beforeSaveEntries)
                {
                    _logger.LogInformation("  Entity: {EntityType}, Id: {EntityId}, State: {State}",
                        entry.Entity.GetType().Name, GetEntityId(entry.Entity), entry.State);
                }

                // Save all changes
                _logger.LogInformation("Calling SaveChangesAsync...");
                var saveResult = await _context.SaveChangesAsync();
                _logger.LogInformation("SaveChangesAsync completed. {RowCount} rows affected.", saveResult);

                await transaction.CommitAsync();
                _logger.LogInformation("Transaction committed successfully");

                _logger.LogInformation("=== Successfully updated purchase bill: {BillId} ===", id);

                return existingBill;
            }
            catch (DbUpdateConcurrencyException ex)
            {
                _logger.LogError(ex, "CONCURRENCY EXCEPTION in UpdatePurchaseBillAsync for bill {BillId}", id);

                foreach (var entry in ex.Entries)
                {
                    var entityType = entry.Entity.GetType().Name;
                    var entityId = GetEntityId(entry.Entity);
                    var databaseValues = await entry.GetDatabaseValuesAsync();

                    _logger.LogInformation("Entity: {EntityType}, Id: {EntityId}", entityType, entityId);
                    _logger.LogInformation("  Original State: {State}", entry.State);

                    if (databaseValues == null)
                    {
                        _logger.LogInformation("  Entity no longer exists in database");
                    }
                }

                await transaction.RollbackAsync();
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating purchase bill: {BillId}", id);
                await transaction.RollbackAsync();
                throw;
            }
        }
        private async Task CheckIfStockIsUsedAsync(PurchaseBill existingBill, Guid companyId)
        {
            foreach (var existingItem in existingBill.Items)
            {
                // Check if this stock entry has been used in other transactions
                var usedInSales = await _context.SalesBills
                    .Include(sb => sb.Items)
                    .Where(sb => sb.CompanyId == companyId)
                    .SelectMany(sb => sb.Items)
                    .AnyAsync(si => si.ItemId == existingItem.ItemId &&
                                   si.BatchNumber == existingItem.BatchNumber &&
                                   si.UniqueUuid == existingItem.UniqueUuid &&
                                   si.PurchaseBillId != existingBill.Id);

                if (usedInSales)
                {
                    var product = await _context.Items.FindAsync(existingItem.ItemId);
                    throw new ArgumentException($"Item {product?.Name} (Batch: {existingItem.BatchNumber}) has been used in sales and cannot be edited");
                }

                var usedInSalesReturns = await _context.SalesReturns
                    .Include(sr => sr.Items)
                    .Where(sr => sr.CompanyId == companyId)
                    .SelectMany(sr => sr.Items)
                    .AnyAsync(sri => sri.ItemId == existingItem.ItemId &&
                                    sri.BatchNumber == existingItem.BatchNumber &&
                                    sri.UniqueUuid == existingItem.UniqueUuid);

                if (usedInSalesReturns)
                {
                    var product = await _context.Items.FindAsync(existingItem.ItemId);
                    throw new ArgumentException($"Item {product?.Name} (Batch: {existingItem.BatchNumber}) has been used in sales returns and cannot be edited");
                }

                var usedInPurchaseReturns = await _context.PurchaseReturns
                    .Include(pr => pr.Items)
                    .Where(pr => pr.CompanyId == companyId)
                    .SelectMany(pr => pr.Items)
                    .AnyAsync(pri => pri.ItemId == existingItem.ItemId &&
                                    pri.BatchNumber == existingItem.BatchNumber &&
                                    pri.UniqueUuid == existingItem.UniqueUuid &&
                                    pri.PurchaseBillId != existingBill.Id);

                if (usedInPurchaseReturns)
                {
                    var product = await _context.Items.FindAsync(existingItem.ItemId);
                    throw new ArgumentException($"Item {product?.Name} (Batch: {existingItem.BatchNumber}) has been returned to supplier and cannot be edited");
                }
            }
        }

        // Helper method to get entity ID for logging
        private string GetEntityId(object entity)
        {
            try
            {
                var property = entity.GetType().GetProperty("Id");
                if (property != null)
                {
                    var value = property.GetValue(entity);
                    return value?.ToString() ?? "null";
                }
            }
            catch
            {
                // Ignore errors in helper method
            }

            return "unknown";
        }
        public async Task<bool> DeletePurchaseBillAsync(Guid id, Guid companyId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var purchaseBill = await _context.PurchaseBills
                    .Include(pb => pb.Items)
                    .FirstOrDefaultAsync(pb => pb.Id == id && pb.CompanyId == companyId);

                if (purchaseBill == null)
                    return false;

                // Remove items first
                _context.PurchaseBillItems.RemoveRange(purchaseBill.Items);

                // Remove the bill
                _context.PurchaseBills.Remove(purchaseBill);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return true;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Error deleting purchase bill");
                throw;
            }
        }

        public async Task<string> GetNextBillNumberAsync(Guid companyId, Guid fiscalYearId)
        {
            return await _billNumberService.GetNextBillNumberAsync(companyId, fiscalYearId, "purchase");
        }

        public async Task<bool> CheckDuplicateInvoiceAsync(string partyBillNumber, Guid companyId)
        {
            if (string.IsNullOrWhiteSpace(partyBillNumber))
                return false;

            return await _context.PurchaseBills
                .AnyAsync(pb => pb.CompanyId == companyId &&
                               pb.PartyBillNumber == partyBillNumber.Trim());
        }

        public async Task<LastPurchaseDataDTO> GetLastPurchaseDataAsync(Guid itemId, Guid companyId)
        {
            try
            {
                // Get the most recent purchase bill item for this item
                var lastPurchaseItem = await _context.PurchaseBillItems
                    .Include(pbi => pbi.PurchaseBill)
                    .Include(pbi => pbi.Unit)
                    .Where(pbi => pbi.ItemId == itemId &&
                                 pbi.PurchaseBill.CompanyId == companyId)
                    .OrderByDescending(pbi => pbi.PurchaseBill.Date)
                    .ThenByDescending(pbi => pbi.PurchaseBill.CreatedAt)
                    .Select(pbi => new LastPurchaseDataDTO
                    {
                        PurchaseBillId = pbi.PurchaseBillId,
                        BillNumber = pbi.PurchaseBill.BillNumber,
                        Date = pbi.PurchaseBill.Date,
                        // NepaliDate = pbi.PurchaseBill.nepaliDate,
                        Quantity = pbi.Quantity,
                        Bonus = pbi.Bonus ?? 0,
                        PuPrice = pbi.PuPrice,
                        NetPuPrice = pbi.NetPuPrice,
                        Price = pbi.Price,
                        Mrp = pbi.Mrp,
                        MarginPercentage = pbi.MarginPercentage,
                        CcPercentage = pbi.CcPercentage,  // Use CcPercentage from DB
                        ItemCcAmount = pbi.ItemCcAmount,  // Use ItemCcAmount from DB
                        Currency = pbi.Currency ?? "NPR",
                        WsUnit = pbi.WsUnit ?? 1,  // Use WsUnit from DB
                        UnitId = pbi.UnitId,
                        UnitName = pbi.Unit != null ? pbi.Unit.Name : "",
                        BatchNumber = pbi.BatchNumber,
                        ExpiryDate = pbi.ExpiryDate,
                        VatStatus = pbi.VatStatus
                    })
                    .FirstOrDefaultAsync();

                if (lastPurchaseItem == null)
                {
                    // Return default values if no purchase history
                    return new LastPurchaseDataDTO
                    {
                        PuPrice = 0,
                        Mrp = 0,
                        MarginPercentage = 0,
                        CcPercentage = 7.5m, // Default CC percentage
                        ItemCcAmount = 0,
                        Currency = "NPR",
                        WsUnit = 1,
                        BatchNumber = "XXX",
                        ExpiryDate = DateOnly.FromDateTime(DateTime.UtcNow.AddYears(2)),
                        VatStatus = "vatable"
                    };
                }

                return lastPurchaseItem;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting last purchase data for item {ItemId}", itemId);
                throw;
            }
        }


        public async Task<PurchaseBillPrintDTO> GetPurchaseBillForPrintAsync(Guid id, Guid companyId, Guid userId, Guid fiscalYearId)
        {
            try
            {
                _logger.LogInformation("GetPurchaseBillForPrintAsync called for Bill ID: {BillId}, Company: {CompanyId}", id, companyId);

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
                var purchaseBill = await _context.PurchaseBills
                    .Include(pb => pb.Account)
                    .Include(pb => pb.User)
                    .Include(pb => pb.Items)
                        .ThenInclude(i => i.Item)
                            .ThenInclude(it => it.Unit)
                    .FirstOrDefaultAsync(pb => pb.Id == id && pb.CompanyId == companyId);

                if (purchaseBill == null)
                    throw new ArgumentException("Bill not found");

                // Check and update first printed status
                bool firstBill = !purchaseBill.FirstPrinted;
                if (firstBill)
                {
                    purchaseBill.FirstPrinted = true;
                    purchaseBill.PrintCount += 1;
                    await _context.SaveChangesAsync();
                }

                // Calculate last balance for credit bills
                decimal? finalBalance = null;
                string balanceLabel = "";

                if (purchaseBill.PaymentMode?.ToLower() == "credit")
                {
                    // Fix: Use Date instead of TransactionDate
                    var latestTransaction = await _context.Transactions
                        .Where(t => t.CompanyId == companyId &&
                                   t.PurchaseBillId == id)
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
                    if (purchaseBill.Account != null && purchaseBill.Account.OpeningBalance != null)
                    {
                        var openingBalance = purchaseBill.Account.OpeningBalance;
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
                var response = new PurchaseBillPrintDTO
                {
                    Company = company,
                    CurrentFiscalYear = currentFiscalYear,
                    Bill = new PurchaseBillPrintBillDTO
                    {
                        Id = purchaseBill.Id,
                        BillNumber = purchaseBill.BillNumber,
                        PartyBillNumber = purchaseBill.PartyBillNumber,
                        FirstPrinted = purchaseBill.FirstPrinted,
                        PrintCount = purchaseBill.PrintCount,
                        PaymentMode = purchaseBill.PaymentMode,
                        Date = isNepaliFormat ? purchaseBill.nepaliDate : purchaseBill.Date,
                        TransactionDate = isNepaliFormat ? purchaseBill.transactionDateNepali : purchaseBill.TransactionDate,
                        SubTotal = purchaseBill.SubTotal,
                        NonVatPurchase = purchaseBill.NonVatPurchase,
                        TaxableAmount = purchaseBill.TaxableAmount,
                        TotalCcAmount = purchaseBill.TotalCcAmount,
                        DiscountPercentage = purchaseBill.DiscountPercentage,
                        DiscountAmount = purchaseBill.DiscountAmount,
                        VatPercentage = purchaseBill.VatPercentage,
                        VatAmount = purchaseBill.VatAmount,
                        TotalAmount = purchaseBill.TotalAmount,
                        IsVatExempt = purchaseBill.IsVatExempt,
                        RoundOffAmount = purchaseBill.RoundOffAmount,
                        Account = purchaseBill.Account != null ? new AccountPrintDTO
                        {
                            Id = purchaseBill.Account.Id,
                            Name = purchaseBill.Account.Name,
                            Pan = purchaseBill.Account.Pan,
                            Address = purchaseBill.Account.Address,
                            Email = purchaseBill.Account.Email,
                            Phone = purchaseBill.Account.Phone,
                        } : null,
                        User = purchaseBill.User != null ? new UserPrintDTO
                        {
                            Id = purchaseBill.User.Id,
                            Name = purchaseBill.User.Name,
                            IsAdmin = purchaseBill.User.IsAdmin,
                            Role = purchaseBill.User.UserRoles?
                                .FirstOrDefault(ur => ur.IsPrimary)?.Role?.Name ?? "User"
                        } : null,
                        Items = purchaseBill.Items.Select(i => new PurchaseBillItemPrintDTO
                        {
                            Id = i.Id,
                            ItemId = i.ItemId,
                            ItemName = i.Item?.Name,
                            Hscode = i.Item?.Hscode,  // Add this
                            UniqueNumber = i.Item?.UniqueNumber,  // Add this
                            UnitId = i.UnitId,
                            UnitName = i.Item?.Unit?.Name,
                            WsUnit = i.WsUnit,
                            Quantity = i.Quantity,
                            Bonus = i.Bonus,
                            Price = i.Price,
                            PuPrice = i.PuPrice,
                            DiscountPercentagePerItem = i.DiscountPercentagePerItem,
                            DiscountAmountPerItem = i.DiscountAmountPerItem,
                            NetPuPrice = i.NetPuPrice,
                            CcPercentage = i.CcPercentage,
                            ItemCcAmount = i.ItemCcAmount,
                            Mrp = i.Mrp,
                            MarginPercentage = i.MarginPercentage,
                            Currency = i.Currency,
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
                    PaymentMode = purchaseBill.PaymentMode ?? string.Empty,
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

        public async Task<PurchaseEntryDataDTO> GetPurchaseEntryDataAsync(Guid companyId, Guid fiscalYearId, Guid userId)
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

            // Get next bill number
            var currentBillNumber = await _billNumberService.GetCurrentBillNumberAsync(companyId, fiscalYearId, "purchase");

            //   var nextBillNumber = await _billNumberService.GetNextBillNumberAsync(companyId, fiscalYearId, "purchase");

            // Create the response
            var data = new PurchaseEntryDataDTO
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
                // NextPurchaseBillNumber = nextBillNumber,
                NextPurchaseBillNumber = currentBillNumber,
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

        private PurchaseBillResponseDTO MapToResponseDTO(PurchaseBill purchaseBill, string companyDateFormat)
        {
            bool isNepaliFormat = companyDateFormat?.ToLower() == "nepali";

            return new PurchaseBillResponseDTO
            {
                Id = purchaseBill.Id,
                CompanyId = purchaseBill.CompanyId,
                CompanyName = purchaseBill.Company?.Name,
                FirstPrinted = purchaseBill.FirstPrinted,
                PrintCount = purchaseBill.PrintCount,
                PurchaseSalesType = purchaseBill.PurchaseSalesType,
                OriginalCopies = purchaseBill.OriginalCopies,
                UserId = purchaseBill.UserId,
                UserName = purchaseBill.User?.Name,
                BillNumber = purchaseBill.BillNumber,
                PartyBillNumber = purchaseBill.PartyBillNumber,
                AccountId = purchaseBill.AccountId,
                AccountName = purchaseBill.Account?.Name,
                VatAccountId = purchaseBill.VatAccountId,
                VatAccountName = purchaseBill.VatAccount?.Name,
                PurchaseAccountId = purchaseBill.PurchaseAccountId,
                PurchaseAccountName = purchaseBill.PurchaseAccount?.Name,
                RoundOffAccountId = purchaseBill.RoundOffAccountId,
                RoundOffAccountName = purchaseBill.RoundOffAccount?.Name,
                UnitId = purchaseBill.UnitId,
                UnitName = purchaseBill.Unit?.Name,
                SettingsId = purchaseBill.SettingsId,
                FiscalYearId = purchaseBill.FiscalYearId,
                FiscalYearName = purchaseBill.FiscalYear?.Name,
                Items = purchaseBill.Items.Select(i => new PurchaseBillItemResponseDTO
                {
                    Id = i.Id,
                    PurchaseBillId = i.PurchaseBillId,
                    ItemId = i.ItemId,
                    ItemName = i.Item?.Name,
                    Hscode = i.Item?.Hscode,
                    UniqueNumber = i.Item?.UniqueNumber,
                    UnitId = i.UnitId,
                    UnitName = i.Unit?.Name,
                    WsUnit = i.WsUnit,
                    Quantity = i.Quantity,
                    Bonus = i.Bonus,
                    AltBonus = i.AltBonus,
                    Price = i.Price,
                    PuPrice = i.PuPrice,
                    DiscountPercentagePerItem = i.DiscountPercentagePerItem,
                    DiscountAmountPerItem = i.DiscountAmountPerItem,
                    NetPuPrice = i.NetPuPrice,
                    CcPercentage = i.CcPercentage,
                    ItemCcAmount = i.ItemCcAmount,
                    Mrp = i.Mrp,
                    MarginPercentage = i.MarginPercentage,
                    Currency = i.Currency,
                    AltQuantity = i.AltQuantity,
                    AltPrice = i.AltPrice,
                    AltPuPrice = i.AltPuPrice,
                    BatchNumber = i.BatchNumber,
                    ExpiryDate = i.ExpiryDate,
                    VatStatus = i.VatStatus,
                    UniqueUuid = i.UniqueUuid,
                    CreatedAt = i.CreatedAt,
                    UpdatedAt = i.UpdatedAt
                }).ToList(),
                SubTotal = purchaseBill.SubTotal,
                NonVatPurchase = purchaseBill.NonVatPurchase,
                TaxableAmount = purchaseBill.TaxableAmount,
                TotalCcAmount = purchaseBill.TotalCcAmount,
                DiscountPercentage = purchaseBill.DiscountPercentage,
                DiscountAmount = purchaseBill.DiscountAmount,
                VatPercentage = purchaseBill.VatPercentage,
                VatAmount = purchaseBill.VatAmount,
                TotalAmount = purchaseBill.TotalAmount,
                IsVatExempt = purchaseBill.IsVatExempt,
                IsVatAll = purchaseBill.IsVatAll,
                RoundOffAmount = purchaseBill.RoundOffAmount,
                PaymentMode = purchaseBill.PaymentMode,
                NepaliDate = purchaseBill.nepaliDate,
                Date = isNepaliFormat ? purchaseBill.nepaliDate : purchaseBill.Date,
                TransactionDateNepali = purchaseBill.transactionDateNepali,
                TransactionDate = purchaseBill.TransactionDate,
                CreatedAt = purchaseBill.CreatedAt,
                UpdatedAt = purchaseBill.UpdatedAt
            };
        }
    }
}
