using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Dto.RetailerDto.PurchaseReturnDto;
using SkyForge.Services.BillNumberServices;
using SkyForge.Models.Retailer.PurchaseReturnModel;
using SkyForge.Models.Retailer.Items;
using SkyForge.Models.Retailer.TransactionModel;
using SkyForge.Models.AccountModel;
using SkyForge.Dto.AccountDto;
using SkyForge.Models.Shared;
using SkyForge.Dto.RetailerDto;


namespace SkyForge.Services.Retailer.PurchaseReturnServices
{
    public class PurchaseReturnService : IPurchaseReturnService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<PurchaseReturnService> _logger;
        private readonly IBillNumberService _billNumberService;

        public PurchaseReturnService(
            ApplicationDbContext context,
            ILogger<PurchaseReturnService> logger,
            IBillNumberService billNumberService)
        {
            _context = context;
            _logger = logger;
            _billNumberService = billNumberService;
        }
        // public async Task<PurchaseReturn> CreatePurchaseReturnAsync(CreatePurchaseReturnDTO dto, Guid userId, Guid companyId, Guid fiscalYearId)
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

        //         // Get default accounts
        //         var purchaseAccountId = await GetDefaultAccountIdAsync("Purchase", companyId);
        //         var vatAccountId = await GetDefaultAccountIdAsync("VAT", companyId);
        //         var roundOffAccountId = await GetDefaultAccountIdAsync("Rounded Off", companyId);
        //         var cashAccountId = await GetDefaultAccountIdAsync("Cash in Hand", companyId);

        //         // Parse payment mode from string to enum
        //         var paymentMode = ParsePaymentMode(dto.PaymentMode);
        //         var billNumber = await _billNumberService.GetNextBillNumberAsync(companyId, fiscalYearId, "purchaseReturn");

        //         // Validate account
        //         var account = await _context.Accounts
        //             .FirstOrDefaultAsync(a => a.Id == dto.AccountId && a.CompanyId == companyId);
        //         if (account == null)
        //             throw new ArgumentException("Invalid account for this company");

        //         // ✅ LOAD ALL ITEMS AT ONCE
        //         var itemIds = dto.Items.Select(i => i.ItemId).Distinct().ToList();
        //         var itemsDict = await _context.Items
        //             .Include(i => i.StockEntries)
        //             .Where(i => itemIds.Contains(i.Id))
        //             .ToDictionaryAsync(i => i.Id);

        //         // ✅ GET PREVIOUS TRANSACTION BALANCE ONCE
        //         var previousTransaction = await _context.Transactions
        //             .Where(t => t.AccountId == dto.AccountId)
        //             .OrderByDescending(t => t.CreatedAt)
        //             .FirstOrDefaultAsync();
        //         decimal previousBalance = previousTransaction?.Balance ?? 0;

        //         // Calculate totals and validate items
        //         decimal subTotal = 0;
        //         decimal totalTaxableAmount = 0;
        //         decimal totalNonTaxableAmount = 0;
        //         bool hasVatableItems = false;
        //         bool hasNonVatableItems = false;

        //         // Dictionary to track items and stock reductions
        //         var productStockReductions = new Dictionary<Guid, (Item item, List<StockEntry> stockEntries, decimal totalReducedQuantity)>();

        //         // Create purchase return bill FIRST (so it has an ID)
        //         var purchaseReturn = new PurchaseReturn
        //         {
        //             Id = Guid.NewGuid(),
        //             CompanyId = companyId,
        //             UserId = userId,
        //             BillNumber = billNumber,
        //             PartyBillNumber = dto.PartyBillNumber,
        //             AccountId = dto.AccountId,
        //             SettingsId = dto.SettingsId,
        //             FiscalYearId = fiscalYearId,
        //             SubTotal = dto.SubTotal ?? 0, // Use dto values directly
        //             NonVatPurchaseReturn = dto.NonVatPurchaseReturn ?? 0,
        //             TaxableAmount = dto.TaxableAmount ?? 0,
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
        //             PurchaseSalesReturnType = "Purchase Return",
        //             Type = "PrRt",
        //             OriginalCopies = dto.OriginalCopies,
        //             CreatedAt = DateTime.UtcNow,
        //             UpdatedAt = DateTime.UtcNow
        //         };

        //         await _context.PurchaseReturns.AddAsync(purchaseReturn);

        //         // ✅ PROCESS ITEMS IN MEMORY (NO ADDITIONAL DB CALLS)
        //         foreach (var itemDto in dto.Items)
        //         {
        //             if (!itemsDict.TryGetValue(itemDto.ItemId, out var item))
        //                 throw new ArgumentException($"Item with id {itemDto.ItemId} not found");

        //             _logger.LogInformation($"Looking for batch: {itemDto.BatchNumber}, UUID: {itemDto.UniqueUuid} in item: {item.Name}");

        //             // Find the batch entry
        //             var batchEntry = item.StockEntries?
        //                 .FirstOrDefault(e => e.BatchNumber == itemDto.BatchNumber &&
        //                                     e.UniqueUuid == itemDto.UniqueUuid);

        //             if (batchEntry == null)
        //             {
        //                 var availableBatches = string.Join("; ", item.StockEntries?.Select(e =>
        //                     $"Batch: '{e.BatchNumber}', UUID: '{e.UniqueUuid}', Qty: {e.Quantity}") ?? new List<string>());

        //                 throw new ArgumentException(
        //                     $"Batch number '{itemDto.BatchNumber}' with UUID '{itemDto.UniqueUuid}' not found for item: {item.Name}. " +
        //                     $"Available batches: {availableBatches}");
        //             }

        //             // Check stock quantity
        //             if (batchEntry.Quantity < itemDto.Quantity)
        //                 throw new ArgumentException(
        //                     $"Not enough stock for item: {item.Name}. " +
        //                     $"Available in batch '{itemDto.BatchNumber}': {batchEntry.Quantity}, " +
        //                     $"Required: {itemDto.Quantity}");

        //             // Reduce stock directly on the loaded entity
        //             batchEntry.Quantity -= itemDto.Quantity;
        //             batchEntry.UpdatedAt = DateTime.UtcNow;

        //             if (batchEntry.Quantity == 0)
        //             {
        //                 // Optionally mark or handle empty batch
        //             }

        //             // Calculate values
        //             decimal wsUnit = batchEntry.WsUnit ?? 1m;
        //             decimal quantity = itemDto.Quantity;
        //             decimal discountPercentage = dto.DiscountPercentage ?? 0m;
        //             decimal discountAmountPerItem = ((itemDto.PuPrice) * quantity * discountPercentage) / 100m;
        //             decimal netPuPrice = (itemDto.PuPrice) - ((itemDto.PuPrice) * discountPercentage / 100m);

        //             // Create purchase return bill item
        //             var billItem = new PurchaseReturnItem
        //             {
        //                 Id = Guid.NewGuid(),
        //                 PurchaseReturnId = purchaseReturn.Id,
        //                 ItemId = itemDto.ItemId,
        //                 UnitId = itemDto.UnitId,
        //                 Quantity = quantity,
        //                 Price = itemDto.Price,
        //                 PuPrice = itemDto.PuPrice,
        //                 DiscountPercentagePerItem = discountPercentage,
        //                 DiscountAmountPerItem = discountAmountPerItem,
        //                 NetPuPrice = netPuPrice,
        //                 BatchNumber = itemDto.BatchNumber,
        //                 ExpiryDate = itemDto.ExpiryDate,
        //                 VatStatus = item.VatStatus ?? "vatable",
        //                 UniqueUuid = itemDto.UniqueUuid,
        //                 CreatedAt = DateTime.UtcNow,
        //                 UpdatedAt = DateTime.UtcNow
        //             };

        //             purchaseReturn.Items.Add(billItem);

        //             // Track stock reductions
        //             if (!productStockReductions.ContainsKey(item.Id))
        //             {
        //                 productStockReductions[item.Id] = (item, new List<StockEntry>(), 0m);
        //             }

        //             productStockReductions[item.Id].stockEntries.Add(batchEntry);
        //             productStockReductions[item.Id] = (
        //                 productStockReductions[item.Id].item,
        //                 productStockReductions[item.Id].stockEntries,
        //                 productStockReductions[item.Id].totalReducedQuantity + (quantity * wsUnit)
        //             );

        //             // Create item-level party transaction
        //             var partyTransaction = new Transaction
        //             {
        //                 Id = Guid.NewGuid(),
        //                 CompanyId = companyId,
        //                 ItemId = itemDto.ItemId,
        //                 UnitId = itemDto.UnitId,
        //                 WSUnit = (int?)wsUnit,
        //                 Quantity = quantity,
        //                 Bonus = 0,
        //                 Price = itemDto.Price,
        //                 PuPrice = itemDto.PuPrice,
        //                 DiscountPercentagePerItem = discountPercentage,
        //                 DiscountAmountPerItem = discountAmountPerItem,
        //                 NetPuPrice = netPuPrice,
        //                 AccountId = dto.AccountId,
        //                 PurchaseReturnBillId = purchaseReturn.Id,
        //                 BillNumber = purchaseReturn.BillNumber,
        //                 PartyBillNumber = dto.PartyBillNumber,
        //                 Type = TransactionType.PrRt,
        //                 PurchaseSalesReturnType = "Purchase Return",
        //                 Debit = purchaseReturn.TotalAmount ?? 0,
        //                 Credit = 0,
        //                 PaymentMode = paymentMode,
        //                 Balance = previousBalance - purchaseReturn.TotalAmount,
        //                 Date = purchaseReturn.Date,
        //                 BillDate = purchaseReturn.Date,
        //                 nepaliDate = dto.NepaliDate,
        //                 transactionDateNepali = dto.TransactionDateNepali,
        //                 FiscalYearId = fiscalYearId,
        //                 CreatedAt = DateTime.UtcNow,
        //                 Status = TransactionStatus.Active,
        //                 IsActive = true
        //             };

        //             await _context.Transactions.AddAsync(partyTransaction);
        //         }

        //         // Add other transactions (Purchase, VAT, Round-off, Cash)
        //         if (purchaseAccountId.HasValue)
        //         {
        //             var purchaseAmount = (dto.TaxableAmount ?? 0) + (dto.NonVatPurchaseReturn ?? 0);
        //             if (purchaseAmount > 0)
        //             {
        //                 var purchaseTransaction = new Transaction
        //                 {
        //                     Id = Guid.NewGuid(),
        //                     CompanyId = companyId,
        //                     AccountId = purchaseAccountId.Value,
        //                     PurchaseReturnBillId = purchaseReturn.Id,
        //                     BillNumber = purchaseReturn.BillNumber,
        //                     PartyBillNumber = dto.PartyBillNumber,
        //                     Type = TransactionType.PrRt,
        //                     PurchaseSalesReturnType = "Purchase Return",
        //                     Debit = 0,
        //                     Credit = purchaseAmount,
        //                     PaymentMode = paymentMode,
        //                     Date = purchaseReturn.TransactionDate,
        //                     BillDate = purchaseReturn.Date,
        //                     nepaliDate = dto.NepaliDate,
        //                     transactionDateNepali = dto.TransactionDateNepali,
        //                     FiscalYearId = fiscalYearId,
        //                     CreatedAt = DateTime.UtcNow,
        //                     Status = TransactionStatus.Active,
        //                     IsActive = true
        //                 };
        //                 await _context.Transactions.AddAsync(purchaseTransaction);
        //             }
        //         }

        //         if (dto.VatAmount > 0 && vatAccountId.HasValue && !dto.IsVatExempt)
        //         {
        //             var vatTransaction = new Transaction
        //             {
        //                 Id = Guid.NewGuid(),
        //                 CompanyId = companyId,
        //                 AccountId = vatAccountId.Value,
        //                 PurchaseReturnBillId = purchaseReturn.Id,
        //                 BillNumber = purchaseReturn.BillNumber,
        //                 PartyBillNumber = dto.PartyBillNumber,
        //                 IsType = TransactionIsType.VAT,
        //                 Type = TransactionType.PrRt,
        //                 PurchaseSalesReturnType = "Purchase Return",
        //                 Debit = 0,
        //                 Credit = dto.VatAmount.Value,
        //                 PaymentMode = paymentMode,
        //                 Date = purchaseReturn.TransactionDate,
        //                 BillDate = purchaseReturn.Date,
        //                 nepaliDate = dto.NepaliDate,
        //                 transactionDateNepali = dto.TransactionDateNepali,
        //                 FiscalYearId = fiscalYearId,
        //                 CreatedAt = DateTime.UtcNow,
        //                 Status = TransactionStatus.Active,
        //                 IsActive = true
        //             };
        //             await _context.Transactions.AddAsync(vatTransaction);
        //         }

        //         if (dto.RoundOffAmount != 0 && roundOffAccountId.HasValue)
        //         {
        //             var roundOffTransaction = new Transaction
        //             {
        //                 Id = Guid.NewGuid(),
        //                 CompanyId = companyId,
        //                 AccountId = roundOffAccountId.Value,
        //                 PurchaseReturnBillId = purchaseReturn.Id,
        //                 BillNumber = purchaseReturn.BillNumber,
        //                 PartyBillNumber = dto.PartyBillNumber,
        //                 IsType = TransactionIsType.RoundOff,
        //                 Type = TransactionType.PrRt,
        //                 PurchaseSalesReturnType = "Purchase Return",
        //                 Debit = dto.RoundOffAmount > 0 ? dto.RoundOffAmount.Value : 0,
        //                 Credit = dto.RoundOffAmount < 0 ? Math.Abs(dto.RoundOffAmount.Value) : 0,
        //                 PaymentMode = paymentMode,
        //                 Date = purchaseReturn.TransactionDate,
        //                 BillDate = purchaseReturn.Date,
        //                 nepaliDate = dto.NepaliDate,
        //                 transactionDateNepali = dto.TransactionDateNepali,
        //                 FiscalYearId = fiscalYearId,
        //                 CreatedAt = DateTime.UtcNow,
        //                 Status = TransactionStatus.Active,
        //                 IsActive = true
        //             };
        //             await _context.Transactions.AddAsync(roundOffTransaction);
        //         }

        //         if (paymentMode == PaymentMode.Cash && cashAccountId.HasValue)
        //         {
        //             var cashTransaction = new Transaction
        //             {
        //                 Id = Guid.NewGuid(),
        //                 CompanyId = companyId,
        //                 AccountId = cashAccountId.Value,
        //                 PurchaseReturnBillId = purchaseReturn.Id,
        //                 BillNumber = purchaseReturn.BillNumber,
        //                 PartyBillNumber = dto.PartyBillNumber,
        //                 Type = TransactionType.PrRt,
        //                 PurchaseSalesReturnType = "Purchase Return",
        //                 Debit = dto.TotalAmount ?? 0,
        //                 Credit = 0,
        //                 PaymentMode = PaymentMode.Cash,
        //                 Date = purchaseReturn.TransactionDate,
        //                 BillDate = purchaseReturn.Date,
        //                 nepaliDate = dto.NepaliDate,
        //                 transactionDateNepali = dto.TransactionDateNepali,
        //                 FiscalYearId = fiscalYearId,
        //                 CreatedAt = DateTime.UtcNow,
        //                 Status = TransactionStatus.Active,
        //                 IsActive = true
        //             };
        //             await _context.Transactions.AddAsync(cashTransaction);
        //         }

        //         // ✅ SINGLE SAVE CHANGES CALL
        //         await _context.SaveChangesAsync();
        //         await transaction.CommitAsync();

        //         return purchaseReturn;
        //     }
        //     catch (Exception ex)
        //     {
        //         _logger.LogError(ex, "Error creating purchase return");
        //         await transaction.RollbackAsync();
        //         throw;
        //     }
        // }

        public async Task<PurchaseReturn> CreatePurchaseReturnAsync(CreatePurchaseReturnDTO dto, Guid userId, Guid companyId, Guid fiscalYearId)
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

                // Get default accounts
                var purchaseAccountId = await GetDefaultAccountIdAsync("Purchase", companyId);
                var vatAccountId = await GetDefaultAccountIdAsync("VAT", companyId);
                var roundOffAccountId = await GetDefaultAccountIdAsync("Rounded Off", companyId);
                var cashAccountId = await GetDefaultAccountIdAsync("Cash in Hand", companyId);

                // Parse payment mode from string to enum
                var paymentMode = ParsePaymentMode(dto.PaymentMode);
                var billNumber = await _billNumberService.GetNextBillNumberAsync(companyId, fiscalYearId, "purchaseReturn");

                // Validate account
                var account = await _context.Accounts
                    .FirstOrDefaultAsync(a => a.Id == dto.AccountId && a.CompanyId == companyId);
                if (account == null)
                    throw new ArgumentException("Invalid account for this company");

                // LOAD ALL ITEMS AT ONCE
                var itemIds = dto.Items.Select(i => i.ItemId).Distinct().ToList();
                var itemsDict = await _context.Items
                    .Include(i => i.StockEntries)
                    .Where(i => itemIds.Contains(i.Id))
                    .ToDictionaryAsync(i => i.Id);

                // Calculate totals and validate items
                decimal subTotal = 0;
                decimal totalTaxableAmount = 0;
                decimal totalNonTaxableAmount = 0;
                bool hasVatableItems = false;
                bool hasNonVatableItems = false;

                // Track totals for header transactions
                decimal totalPartyDebit = 0;
                decimal totalPurchaseCredit = 0;
                decimal totalVatCredit = 0;

                // Store item calculations for transaction items
                var itemCalculations = new List<PurchaseReturnItemCalculation>();

                // Dictionary to track items and stock reductions
                var productStockReductions = new Dictionary<Guid, (Item item, List<StockEntry> stockEntries, decimal totalReducedQuantity)>();

                // Create purchase return bill FIRST (so it has an ID)
                var purchaseReturn = new PurchaseReturn
                {
                    Id = Guid.NewGuid(),
                    CompanyId = companyId,
                    UserId = userId,
                    BillNumber = billNumber,
                    PartyBillNumber = dto.PartyBillNumber,
                    AccountId = dto.AccountId,
                    SettingsId = dto.SettingsId,
                    FiscalYearId = fiscalYearId,
                    SubTotal = dto.SubTotal ?? 0,
                    NonVatPurchaseReturn = dto.NonVatPurchaseReturn ?? 0,
                    TaxableAmount = dto.TaxableAmount ?? 0,
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
                    PurchaseSalesReturnType = "Purchase Return",
                    Type = "PrRt",
                    OriginalCopies = dto.OriginalCopies,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                await _context.PurchaseReturns.AddAsync(purchaseReturn);

                // PROCESS ITEMS IN MEMORY
                decimal overallDiscountPercentage = dto.DiscountPercentage ?? 0m;

                foreach (var itemDto in dto.Items)
                {
                    if (!itemsDict.TryGetValue(itemDto.ItemId, out var item))
                        throw new ArgumentException($"Item with id {itemDto.ItemId} not found");

                    _logger.LogInformation($"Looking for batch: {itemDto.BatchNumber}, UUID: {itemDto.UniqueUuid} in item: {item.Name}");

                    // Find the batch entry
                    var batchEntry = item.StockEntries?
                        .FirstOrDefault(e => e.BatchNumber == itemDto.BatchNumber &&
                                            e.UniqueUuid == itemDto.UniqueUuid);

                    if (batchEntry == null)
                    {
                        var availableBatches = string.Join("; ", item.StockEntries?.Select(e =>
                            $"Batch: '{e.BatchNumber}', UUID: '{e.UniqueUuid}', Qty: {e.Quantity}") ?? new List<string>());

                        throw new ArgumentException(
                            $"Batch number '{itemDto.BatchNumber}' with UUID '{itemDto.UniqueUuid}' not found for item: {item.Name}. " +
                            $"Available batches: {availableBatches}");
                    }

                    // Check stock quantity
                    if (batchEntry.Quantity < itemDto.Quantity)
                        throw new ArgumentException(
                            $"Not enough stock for item: {item.Name}. " +
                            $"Available in batch '{itemDto.BatchNumber}': {batchEntry.Quantity}, " +
                            $"Required: {itemDto.Quantity}");

                    // Reduce stock directly on the loaded entity
                    batchEntry.Quantity -= itemDto.Quantity;
                    batchEntry.UpdatedAt = DateTime.UtcNow;

                    // Calculate values
                    decimal wsUnit = batchEntry.WsUnit ?? 1m;
                    decimal quantity = itemDto.Quantity;
                    decimal discountPercentage = dto.DiscountPercentage ?? 0m;
                    decimal totalPurchaseValueBeforeDiscount = itemDto.PuPrice * quantity;
                    decimal discountAmountForItem = (totalPurchaseValueBeforeDiscount * discountPercentage) / 100m;
                    decimal itemValueAfterDiscount = totalPurchaseValueBeforeDiscount - discountAmountForItem;
                    decimal netPuPrice = itemDto.PuPrice - (itemDto.PuPrice * discountPercentage / 100m);

                    // Calculate item-wise VAT
                    decimal itemTaxableAmount = 0m;
                    decimal itemVatPercentage = dto.VatPercentage;
                    decimal itemVatAmount = 0m;
                    bool isItemVatExempt = dto.IsVatExempt;

                    if (!isItemVatExempt && itemVatPercentage > 0)
                    {
                        itemTaxableAmount = itemValueAfterDiscount;
                        itemVatAmount = (itemTaxableAmount * itemVatPercentage) / 100m;
                    }

                    // Update totals
                    totalPartyDebit += itemValueAfterDiscount + itemVatAmount;  // Party gets DEBIT (amount receivable back)
                    totalPurchaseCredit += itemValueAfterDiscount;              // Purchase account gets CREDIT (reduction in expense)
                    totalVatCredit += itemVatAmount;                            // VAT account gets CREDIT (input VAT reduction)

                    // Create purchase return bill item
                    var billItem = new PurchaseReturnItem
                    {
                        Id = Guid.NewGuid(),
                        PurchaseReturnId = purchaseReturn.Id,
                        ItemId = itemDto.ItemId,
                        UnitId = itemDto.UnitId,
                        Quantity = quantity,
                        Price = itemDto.Price,
                        PuPrice = itemDto.PuPrice,
                        DiscountPercentagePerItem = discountPercentage,
                        DiscountAmountPerItem = discountAmountForItem,
                        NetPuPrice = netPuPrice,
                        BatchNumber = itemDto.BatchNumber,
                        ExpiryDate = itemDto.ExpiryDate,
                        VatStatus = item.VatStatus ?? "vatable",
                        UniqueUuid = itemDto.UniqueUuid,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };

                    purchaseReturn.Items.Add(billItem);

                    // Store calculation for transaction items
                    itemCalculations.Add(new PurchaseReturnItemCalculation
                    {
                        ItemId = itemDto.ItemId,
                        UnitId = itemDto.UnitId,
                        WsUnit = wsUnit,
                        Quantity = quantity,
                        Bonus = 0,
                        Price = itemDto.Price,
                        PuPrice = itemDto.PuPrice,
                        DiscountPercentagePerItem = discountPercentage,
                        DiscountAmountPerItem = discountAmountForItem,
                        NetPuPrice = netPuPrice,
                        TaxableAmount = itemTaxableAmount,
                        VatPercentage = itemVatPercentage,
                        VatAmount = itemVatAmount,
                        ItemValueAfterDiscount = itemValueAfterDiscount
                    });

                    // Track stock reductions
                    if (!productStockReductions.ContainsKey(item.Id))
                    {
                        productStockReductions[item.Id] = (item, new List<StockEntry>(), 0m);
                    }

                    productStockReductions[item.Id].stockEntries.Add(batchEntry);
                    productStockReductions[item.Id] = (
                        productStockReductions[item.Id].item,
                        productStockReductions[item.Id].stockEntries,
                        productStockReductions[item.Id].totalReducedQuantity + (quantity * wsUnit)
                    );
                }

                // ========== CREATE HEADER TRANSACTIONS WITH TRANSACTION ITEMS ==========

                // 1. PARTY ACCOUNT TRANSACTION (Header - Debit to party - amount receivable back)
                if (dto.AccountId != Guid.Empty && totalPartyDebit > 0)
                {
                    var partyTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        AccountId = dto.AccountId,
                        PurchaseReturnBillId = purchaseReturn.Id,
                        BillNumber = purchaseReturn.BillNumber,
                        PartyBillNumber = dto.PartyBillNumber,
                        Type = TransactionType.PrRt,
                        PurchaseSalesReturnType = "Purchase Return",
                        TotalDebit = dto.TotalAmount ?? 0,
                        TotalCredit = 0,
                        TaxableAmount = dto.TaxableAmount,
                        VatPercentage = dto.VatPercentage,
                        VatAmount = dto.VatAmount,
                        PaymentMode = paymentMode,
                        Date = purchaseReturn.TransactionDate,
                        BillDate = purchaseReturn.Date,
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
                            WSUnit = (int?)calc.WsUnit,
                            Quantity = calc.Quantity,
                            Bonus = calc.Bonus,
                            Price = calc.Price,
                            PuPrice = calc.PuPrice,
                            DiscountPercentagePerItem = calc.DiscountPercentagePerItem,
                            DiscountAmountPerItem = calc.DiscountAmountPerItem,
                            NetPuPrice = calc.NetPuPrice,
                            TaxableAmount = calc.TaxableAmount,
                            VatPercentage = calc.VatPercentage,
                            VatAmount = calc.VatAmount,
                            Debit = calc.ItemValueAfterDiscount + calc.VatAmount,
                            Credit = 0,
                            CreatedAt = DateTime.UtcNow
                        };
                        await _context.TransactionItems.AddAsync(transactionItem);
                    }
                }

                // 2. PURCHASE ACCOUNT TRANSACTION (Header - Credit to Purchase account - reduction in expense)
                if (purchaseAccountId.HasValue && totalPurchaseCredit > 0)
                {
                    var purchaseTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        AccountId = purchaseAccountId.Value,
                        PurchaseReturnBillId = purchaseReturn.Id,
                        BillNumber = purchaseReturn.BillNumber,
                        PartyBillNumber = dto.PartyBillNumber,
                        Type = TransactionType.PrRt,
                        PurchaseSalesReturnType = "Purchase Return",
                        TotalDebit = 0,
                        TotalCredit = totalPurchaseCredit,
                        TaxableAmount = dto.TaxableAmount,
                        VatPercentage = dto.VatPercentage,
                        VatAmount = dto.VatAmount,
                        PaymentMode = paymentMode,
                        Date = purchaseReturn.TransactionDate,
                        BillDate = purchaseReturn.Date,
                        nepaliDate = dto.NepaliDate,
                        transactionDateNepali = dto.TransactionDateNepali,
                        FiscalYearId = fiscalYearId,
                        CreatedAt = DateTime.UtcNow,
                        Status = TransactionStatus.Active,
                        IsActive = true
                    };

                    await _context.Transactions.AddAsync(purchaseTransaction);

                    // Add Transaction Items for Purchase Transaction
                    foreach (var calc in itemCalculations)
                    {
                        var transactionItem = new TransactionItem
                        {
                            Id = Guid.NewGuid(),
                            TransactionId = purchaseTransaction.Id,
                            ItemId = calc.ItemId,
                            UnitId = calc.UnitId,
                            WSUnit = (int?)calc.WsUnit,
                            Quantity = calc.Quantity,
                            Bonus = calc.Bonus,
                            Price = calc.Price,
                            PuPrice = calc.PuPrice,
                            DiscountPercentagePerItem = calc.DiscountPercentagePerItem,
                            DiscountAmountPerItem = calc.DiscountAmountPerItem,
                            NetPuPrice = calc.NetPuPrice,
                            TaxableAmount = calc.TaxableAmount,
                            VatPercentage = calc.VatPercentage,
                            VatAmount = calc.VatAmount,
                            Debit = 0,
                            Credit = calc.ItemValueAfterDiscount,
                            CreatedAt = DateTime.UtcNow
                        };
                        await _context.TransactionItems.AddAsync(transactionItem);
                    }
                }

                // 3. VAT TRANSACTION (Header - Credit to VAT account - reduction in input VAT)
                if (totalVatCredit > 0 && vatAccountId.HasValue && !dto.IsVatExempt)
                {
                    var vatTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        AccountId = vatAccountId.Value,
                        PurchaseReturnBillId = purchaseReturn.Id,
                        BillNumber = purchaseReturn.BillNumber,
                        PartyBillNumber = dto.PartyBillNumber,
                        IsType = TransactionIsType.VAT,
                        Type = TransactionType.PrRt,
                        PurchaseSalesReturnType = "Purchase Return",
                        TotalDebit = 0,
                        TotalCredit = totalVatCredit,
                        TaxableAmount = dto.TaxableAmount,
                        VatPercentage = dto.VatPercentage,
                        VatAmount = totalVatCredit,
                        PaymentMode = paymentMode,
                        Date = purchaseReturn.TransactionDate,
                        BillDate = purchaseReturn.Date,
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
                            WSUnit = (int?)calc.WsUnit,
                            Quantity = calc.Quantity,
                            Bonus = calc.Bonus,
                            Price = calc.Price,
                            PuPrice = calc.PuPrice,
                            DiscountPercentagePerItem = calc.DiscountPercentagePerItem,
                            DiscountAmountPerItem = calc.DiscountAmountPerItem,
                            NetPuPrice = calc.NetPuPrice,
                            TaxableAmount = calc.TaxableAmount,
                            VatPercentage = calc.VatPercentage,
                            VatAmount = calc.VatAmount,
                            Debit = 0,
                            Credit = calc.VatAmount,
                            CreatedAt = DateTime.UtcNow
                        };
                        await _context.TransactionItems.AddAsync(transactionItem);
                    }
                }

                // 4. ROUND-OFF TRANSACTION (Header) if applicable
                if (dto.RoundOffAmount != 0 && roundOffAccountId.HasValue)
                {
                    var roundOffTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        AccountId = roundOffAccountId.Value,
                        PurchaseReturnBillId = purchaseReturn.Id,
                        BillNumber = purchaseReturn.BillNumber,
                        PartyBillNumber = dto.PartyBillNumber,
                        IsType = TransactionIsType.RoundOff,
                        Type = TransactionType.PrRt,
                        PurchaseSalesReturnType = "Purchase Return",
                        TotalDebit = dto.RoundOffAmount > 0 ? dto.RoundOffAmount.Value : 0,
                        TotalCredit = dto.RoundOffAmount < 0 ? Math.Abs(dto.RoundOffAmount.Value) : 0,
                        PaymentMode = paymentMode,
                        Date = purchaseReturn.TransactionDate,
                        BillDate = purchaseReturn.Date,
                        nepaliDate = dto.NepaliDate,
                        transactionDateNepali = dto.TransactionDateNepali,
                        FiscalYearId = fiscalYearId,
                        CreatedAt = DateTime.UtcNow,
                        Status = TransactionStatus.Active,
                        IsActive = true
                    };
                    await _context.Transactions.AddAsync(roundOffTransaction);
                }

                // 5. CASH TRANSACTION (Header) if payment mode is cash
                if (paymentMode == PaymentMode.Cash && cashAccountId.HasValue && dto.TotalAmount > 0)
                {
                    var cashTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        AccountId = cashAccountId.Value,
                        PurchaseReturnBillId = purchaseReturn.Id,
                        BillNumber = purchaseReturn.BillNumber,
                        PartyBillNumber = dto.PartyBillNumber,
                        Type = TransactionType.PrRt,
                        PurchaseSalesReturnType = "Purchase Return",
                        TotalDebit = 0,
                        TotalCredit = dto.TotalAmount.Value,
                        PaymentMode = PaymentMode.Cash,
                        Date = purchaseReturn.TransactionDate,
                        BillDate = purchaseReturn.Date,
                        nepaliDate = dto.NepaliDate,
                        transactionDateNepali = dto.TransactionDateNepali,
                        FiscalYearId = fiscalYearId,
                        CreatedAt = DateTime.UtcNow,
                        Status = TransactionStatus.Active,
                        IsActive = true
                    };
                    await _context.Transactions.AddAsync(cashTransaction);
                }

                // SINGLE SAVE CHANGES CALL
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return purchaseReturn;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating purchase return");
                await transaction.RollbackAsync();
                throw;
            }
        }

        // Helper class for purchase return item calculations
        private class PurchaseReturnItemCalculation
        {
            public Guid ItemId { get; set; }
            public Guid UnitId { get; set; }
            public decimal WsUnit { get; set; }
            public decimal Quantity { get; set; }
            public decimal Bonus { get; set; }
            public decimal Price { get; set; }
            public decimal PuPrice { get; set; }
            public decimal DiscountPercentagePerItem { get; set; }
            public decimal DiscountAmountPerItem { get; set; }
            public decimal NetPuPrice { get; set; }
            public decimal TaxableAmount { get; set; }
            public decimal VatPercentage { get; set; }
            public decimal VatAmount { get; set; }
            public decimal ItemValueAfterDiscount { get; set; }
        }

        private async Task ReduceStockBatchWise(Item item, string batchNumber, decimal quantity, string uniqueUuid)
        {
            // Reload the item with stock entries to ensure we have the latest data
            var freshItem = await _context.Items
                .Include(i => i.StockEntries)
                .FirstOrDefaultAsync(i => i.Id == item.Id);

            if (freshItem == null)
                throw new ArgumentException($"Item not found");

            // Find the specific batch entry
            if (freshItem.StockEntries == null || !freshItem.StockEntries.Any())
                throw new ArgumentException($"No stock entries found for item: {freshItem.Name}");

            var batchEntry = freshItem.StockEntries
                .FirstOrDefault(e => e.BatchNumber == batchNumber &&
                                    e.UniqueUuid == uniqueUuid);

            if (batchEntry == null)
            {
                var availableBatches = string.Join("; ", freshItem.StockEntries.Select(e =>
                    $"Batch: '{e.BatchNumber}', UUID: '{e.UniqueUuid}', Qty: {e.Quantity}"));

                throw new ArgumentException(
                    $"Batch number '{batchNumber}' with UUID '{uniqueUuid}' not found for item: {freshItem.Name}. " +
                    $"Available batches: {availableBatches}");
            }

            // Check if there's enough stock
            if (batchEntry.Quantity < quantity)
                throw new ArgumentException(
                    $"Not enough stock in batch '{batchNumber}'. Available: {batchEntry.Quantity}, Required: {quantity}");

            // Reduce the quantity
            batchEntry.Quantity -= quantity;

            // Update the entry
            _context.StockEntries.Update(batchEntry);

            // If quantity becomes zero, you might want to mark it
            if (batchEntry.Quantity == 0)
            {
                batchEntry.UpdatedAt = DateTime.UtcNow;
            }

            // DO NOT call SaveChangesAsync here - let the main transaction handle it
            // await _context.SaveChangesAsync();  // REMOVE THIS LINE
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


        public async Task<PurchaseReturnResponseDTO> GetPurchaseReturnAsync(Guid companyId, Guid fiscalYearId, Guid userId)
        {
            try
            {
                _logger.LogInformation("GetPurchaseReturnDataAsync called for Company: {CompanyId}, User: {UserId}", companyId, userId);

                // Get company with all required fields
                var company = await _context.Companies
                    .Where(c => c.Id == companyId)
                    .Select(c => new CompanyInfoDTO
                    {
                        Id = c.Id,
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
                        Name = u.Name
                    })
                    .ToListAsync();

                // Get account groups (instead of company groups)
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
                var nepaliDate = today.ToString("yyyy-MM-dd");
                var transactionDateNepali = today.ToString("yyyy-MM-dd");
                var companyDateFormat = company.DateFormat?.ToLower() ?? "english";

                var currentBillNumber = await _billNumberService.GetCurrentBillNumberAsync(companyId, fiscalYearId, "purchaseReturn");

                // Prepare response
                var response = new PurchaseReturnResponseDTO
                {
                    Company = company,
                    Dates = new DateInfoDTO
                    {
                        NepaliDate = nepaliDate,
                        TransactionDateNepali = transactionDateNepali,
                        CompanyDateFormat = companyDateFormat
                    },
                    CurrentFiscalYear = currentFiscalYear,
                    NextPurchaseReturnBillNumber = currentBillNumber,
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

                _logger.LogInformation("Successfully fetched purchase return data for Company: {CompanyId}", companyId);
                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetPurchaseReturnDataAsync for Company: {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<string> GetNextBillNumberAsync(Guid companyId, Guid fiscalYearId)
        {
            return await _billNumberService.GetNextBillNumberAsync(companyId, fiscalYearId, "purchaseReturn");
        }
        public async Task<string> GetCurrentBillNumberAsync(Guid companyId, Guid fiscalYearId)
        {
            return await _billNumberService.GetCurrentBillNumberAsync(companyId, fiscalYearId, "purchaseReturn");
        }

        public async Task<PurchaseReturnRegisterDataDTO> GetPurchaseReturnRegisterAsync(Guid companyId, Guid fiscalYearId, string? fromDate = null, string? toDate = null)
        {
            try
            {
                _logger.LogInformation("GetPurchaseReturnRegisterAsync called with companyId: {CompanyId}, fiscalYearId: {FiscalYearId}, fromDate: {FromDate}, toDate: {ToDate}",
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
                    return new PurchaseReturnRegisterDataDTO
                    {
                        Company = company,
                        CurrentFiscalYear = fiscalYear,
                        Bills = new List<PurchaseReturnResponseDTO>(),
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
                var totalBillsCount = await _context.PurchaseReturns
                    .CountAsync(pb => pb.CompanyId == companyId && pb.FiscalYearId == fiscalYearId);

                _logger.LogInformation("Total bills for company {CompanyId} and fiscal year {FiscalYearId}: {Count}",
                    companyId, fiscalYearId, totalBillsCount);

                // Build query with date filter based on company date format
                var query = _context.PurchaseReturns
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
                var PurchaseReturns = await query
                    .OrderBy(pb => pb.Date)
                    .ThenBy(pb => pb.BillNumber)
                    .ToListAsync();

                _logger.LogInformation("Found {Count} bills matching the criteria", PurchaseReturns.Count);

                // If no bills found, log sample of all bills to debug
                if (PurchaseReturns.Count == 0)
                {
                    var sampleBills = await _context.PurchaseReturns
                        .Where(pb => pb.CompanyId == companyId)
                        .OrderByDescending(pb => pb.Date)
                        .Take(5)
                        .Select(pb => new { pb.Id, pb.BillNumber, pb.Date, pb.nepaliDate })
                        .ToListAsync();

                    _logger.LogInformation("Sample of recent bills (Date vs NepaliDate): {SampleBills}",
                        string.Join(", ", sampleBills.Select(b => $"{b.BillNumber} - Date: {b.Date}, NepaliDate: {b.nepaliDate}")));
                }

                // Map to response DTOs
                var billDtos = PurchaseReturns.Select(bill => MapToResponseDTO(bill, company.DateFormat)).ToList();

                return new PurchaseReturnRegisterDataDTO
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


        public async Task<PurchaseReturnEntryDataDTO> GetPurchaseReturnEntryDataAsync(Guid companyId, Guid fiscalYearId, Guid userId)
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
            var data = new PurchaseReturnEntryDataDTO
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

        private PurchaseReturnResponseDTO MapToResponseDTO(PurchaseReturn purchaseReturn, string companyDateFormat)
        {
            bool isNepaliFormat = companyDateFormat?.ToLower() == "nepali";

            return new PurchaseReturnResponseDTO
            {
                Id = purchaseReturn.Id,
                CompanyId = purchaseReturn.CompanyId,
                CompanyName = purchaseReturn.Company?.Name,
                FirstPrinted = purchaseReturn.FirstPrinted,
                PrintCount = purchaseReturn.PrintCount,
                PurchaseSalesReturnType = "Purchase Return",
                OriginalCopies = purchaseReturn.OriginalCopies,
                UserId = purchaseReturn.UserId,
                UserName = purchaseReturn.User?.Name,
                BillNumber = purchaseReturn.BillNumber,
                PartyBillNumber = purchaseReturn.PartyBillNumber,
                AccountId = purchaseReturn.AccountId,
                AccountName = purchaseReturn.Account?.Name,
                PurchaseReturnAccountId = purchaseReturn.AccountId,
                PurchaseReturnAccountName = purchaseReturn.Account?.Name,
                SettingsId = purchaseReturn.SettingsId,
                FiscalYearId = purchaseReturn.FiscalYearId,
                FiscalYearName = purchaseReturn.FiscalYear?.Name,
                Items = purchaseReturn.Items.Select(i => new PurchaseReturnItemResponseDTO
                {
                    Id = i.Id,
                    PurchaseReturnId = i.PurchaseReturnId,
                    ItemId = i.ItemId,
                    ItemName = i.Item?.Name,
                    Hscode = i.Item?.Hscode,
                    UniqueNumber = i.Item?.UniqueNumber,
                    UnitId = i.Item?.UnitId ?? i.UnitId,
                    UnitName = i.Item?.Unit?.Name ?? i.Unit?.Name ?? "",
                    WsUnit = i.WsUnit,
                    Quantity = i.Quantity,
                    Price = i.Price,
                    PuPrice = i.PuPrice,
                    DiscountPercentagePerItem = i.DiscountPercentagePerItem,
                    DiscountAmountPerItem = i.DiscountAmountPerItem,
                    NetPuPrice = i.NetPuPrice,
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
                SubTotal = purchaseReturn.SubTotal,
                NonVatPurchaseReturn = purchaseReturn.NonVatPurchaseReturn,
                TaxableAmount = purchaseReturn.TaxableAmount,
                DiscountPercentage = purchaseReturn.DiscountPercentage,
                DiscountAmount = purchaseReturn.DiscountAmount,
                VatPercentage = purchaseReturn.VatPercentage,
                VatAmount = purchaseReturn.VatAmount,
                TotalAmount = purchaseReturn.TotalAmount,
                IsVatExempt = purchaseReturn.IsVatExempt,
                IsVatAll = purchaseReturn.IsVatAll,
                RoundOffAmount = purchaseReturn.RoundOffAmount,
                PaymentMode = purchaseReturn.PaymentMode,
                nepaliDate = purchaseReturn.nepaliDate,
                Date = isNepaliFormat ? purchaseReturn.nepaliDate : purchaseReturn.Date,
                transactionDateNepali = purchaseReturn.transactionDateNepali,
                TransactionDate = purchaseReturn.TransactionDate,
                CreatedAt = purchaseReturn.CreatedAt,
                UpdatedAt = purchaseReturn.UpdatedAt
            };
        }

        public async Task<PurchaseReturnFindsDTO> GetPurchaseReturnFindsAsync(Guid companyId, Guid fiscalYearId, Guid userId)
        {
            try
            {
                _logger.LogInformation("GetPurchaseReturnFindsAsync called for Company: {CompanyId}, FiscalYear: {FiscalYearId}, User: {UserId}",
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
                var latestBillQuery = _context.PurchaseReturns
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
                var response = new PurchaseReturnFindsDTO
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

                _logger.LogInformation("Successfully retrieved purchase return finds data for Company: {CompanyId}", companyId);

                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetPurchaseReturnFindsAsync for Company: {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<PurchaseReturnPartyInfoDTO?> GetPurchaseReturnPartyInfoAsync(string billNumber, Guid companyId, Guid fiscalYearId)
        {
            try
            {
                _logger.LogInformation($"Getting party info for purchase bill: {billNumber}, Company: {companyId}, FiscalYear: {fiscalYearId}");

                // Find the purchase bill with account information
                var purchaseReturnBill = await _context.PurchaseReturns
                    .Include(pb => pb.Account)
                    .Where(pb => pb.BillNumber == billNumber &&
                                pb.CompanyId == companyId &&
                                pb.FiscalYearId == fiscalYearId)
                    .Select(pb => new PurchaseReturnPartyInfoDTO
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

                if (purchaseReturnBill == null)
                {
                    _logger.LogWarning($"Purchase return bill not found: {billNumber}");
                    return null;
                }

                _logger.LogInformation($"Successfully retrieved party info for bill: {billNumber}");
                return purchaseReturnBill;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting purchase return party info for bill: {billNumber}");
                throw;
            }
        }

        // public async Task<ChangePurchaseReturnPartyResponseDTO> ChangePurchaseReturnPartyAsync(string billNumber, Guid newAccountId, Guid companyId, Guid fiscalYearId, Guid userId)
        // {
        //     _logger.LogInformation($"Changing party for purchase bill: {billNumber} to new account: {newAccountId}");

        //     // Start a database transaction to ensure data consistency
        //     using var dbTransaction = await _context.Database.BeginTransactionAsync();

        //     try
        //     {
        //         // 1. Verify the new account exists, is active, and is a party account
        //         var newAccount = await VerifyAndGetPartyAccountAsync(newAccountId, companyId);

        //         // 2. Get the original purchase bill with account
        //         var originalBill = await _context.PurchaseReturns
        //             .Include(pb => pb.Account)
        //             .Include(pb => pb.Items)
        //             .FirstOrDefaultAsync(pb => pb.BillNumber == billNumber &&
        //                                        pb.CompanyId == companyId &&
        //                                        pb.FiscalYearId == fiscalYearId);

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
        //         var totalAmount = originalBill.TotalAmount ?? 0;
        //         var taxableAmount = originalBill.TaxableAmount ?? 0;
        //         var NonVatPurchaseReturn = originalBill.NonVatPurchaseReturn ?? 0;
        //         var vatAmount = originalBill.VatAmount ?? 0;
        //         var roundOffAmount = originalBill.RoundOffAmount ?? 0;
        //         var purchaseReturnAmount = taxableAmount + NonVatPurchaseReturn;

        //         // 4. Get purchase account ID
        //         var purchaseReturnAccountId = await GetDefaultAccountIdAsync("Purchase", companyId);
        //         var vatAccountId = await GetDefaultAccountIdAsync("VAT", companyId);
        //         var roundOffAccountId = await GetDefaultAccountIdAsync("Rounded Off", companyId);

        //         // Parse payment mode
        //         var paymentMode = ParsePaymentMode(originalBill.PaymentMode ?? "Credit");

        //         // 5. Get all transactions linked to this purchase bill
        //         var transactions = await _context.Transactions
        //             .Where(t => t.PurchaseReturnBillId == originalBill.Id &&
        //                        t.CompanyId == companyId &&
        //                        t.FiscalYearId == fiscalYearId &&
        //                        t.Status == TransactionStatus.Active)
        //             .ToListAsync();

        //         _logger.LogInformation($"Found {transactions.Count} transactions for bill {billNumber}");

        //         // 6. Update purchase bill with new account
        //         originalBill.AccountId = newAccountId;
        //         originalBill.UpdatedAt = DateTime.UtcNow;
        //         originalBill.PurchaseSalesReturnType = "Purchase Return"; // Update purchase type with new party name

        //         // 7. Process each transaction
        //         foreach (var trans in transactions)
        //         {
        //             // Check if this is the main party transaction (old party)
        //             // Party transaction is identified by having AccountId = oldAccountId AND Debit = 0, Credit = totalAmount
        //             var isMainPartyTransaction = trans.AccountId == oldAccountId &&
        //                                          trans.Debit == totalAmount &&
        //                                          trans.Credit == 0 &&
        //                                          trans.Type == TransactionType.PrRt;

        //             if (isMainPartyTransaction)
        //             {
        //                 // Update to new party - Party account should be CREDIT side
        //                 trans.AccountId = newAccountId;
        //                 trans.PurchaseSalesReturnType = "Purchase Return";
        //                 trans.UpdatedAt = DateTime.UtcNow;

        //                 _logger.LogInformation($"Updated main party transaction {trans.Id} from account {oldAccountId} to {newAccountId}");
        //             }
        //             // Check if this is a purchase account transaction
        //             else if (purchaseReturnAccountId.HasValue && trans.AccountId == purchaseReturnAccountId.Value)
        //             {
        //                 // Purchase account should be DEBIT side (purchase expense)
        //                 trans.PurchaseSalesReturnType = "Purchase Return";
        //                 trans.UpdatedAt = DateTime.UtcNow;

        //                 _logger.LogInformation($"Updated purchase return account transaction {trans.Id} with new party name: {newAccount.Name}");
        //             }
        //             // Check if this is a VAT transaction
        //             else if (vatAccountId.HasValue && trans.AccountId == vatAccountId.Value && trans.IsType == TransactionIsType.VAT)
        //             {
        //                 trans.PurchaseSalesReturnType = "Purchase Return";
        //                 trans.UpdatedAt = DateTime.UtcNow;

        //                 _logger.LogInformation($"Updated VAT transaction {trans.Id} with new party name: {newAccount.Name}");
        //             }
        //             // Check if this is a RoundOff transaction
        //             else if (roundOffAccountId.HasValue && trans.AccountId == roundOffAccountId.Value && trans.IsType == TransactionIsType.RoundOff)
        //             {
        //                 trans.PurchaseSalesReturnType = "Purchase Return";
        //                 trans.UpdatedAt = DateTime.UtcNow;

        //                 _logger.LogInformation($"Updated RoundOff transaction {trans.Id} with new party name: {newAccount.Name}");
        //             }
        //             // Check if this is a cash transaction (if payment mode was cash)
        //             else if (trans.PaymentMode == PaymentMode.Cash && trans.Debit == 0 && trans.Credit == totalAmount)
        //             {
        //                 trans.PurchaseSalesReturnType = "Purchase Return";
        //                 trans.UpdatedAt = DateTime.UtcNow;

        //                 _logger.LogInformation($"Updated cash transaction {trans.Id} with new party name: {newAccount.Name}");
        //             }
        //             // For any other transactions linked to items (item-level party transactions)
        //             else if (trans.ItemId.HasValue && trans.Type == TransactionType.Purc)
        //             {
        //                 // These are the item-level party transactions created in CreatepurchaseReturnBillAsync
        //                 trans.AccountId = newAccountId; // Update the account to new party
        //                 trans.PurchaseSalesReturnType = "Purchase Return";
        //                 trans.UpdatedAt = DateTime.UtcNow;

        //                 _logger.LogInformation($"Updated item-level party transaction {trans.Id} for item {trans.ItemId}");
        //             }
        //         }

        //         // 8. Save changes
        //         await _context.SaveChangesAsync();

        //         // 9. Commit transaction
        //         await dbTransaction.CommitAsync();

        //         _logger.LogInformation($"Successfully changed party for bill: {billNumber} from {oldAccountName} to {newAccount.Name}");

        //         return new ChangePurchaseReturnPartyResponseDTO
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

        public async Task<ChangePurchaseReturnPartyResponseDTO> ChangePurchaseReturnPartyAsync(string billNumber, Guid newAccountId, Guid companyId, Guid fiscalYearId, Guid userId)
        {
            _logger.LogInformation($"Changing party for purchase return bill: {billNumber} to new account: {newAccountId}");

            // Start a database transaction to ensure data consistency
            using var dbTransaction = await _context.Database.BeginTransactionAsync();

            try
            {
                // 1. Verify the new account exists, is active, and is a party account
                var newAccount = await VerifyAndGetPartyAccountAsync(newAccountId, companyId);

                // 2. Get the original purchase return bill with account and items
                var originalBill = await _context.PurchaseReturns
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
                var nonVatPurchaseReturn = originalBill.NonVatPurchaseReturn ?? 0;
                var vatAmount = originalBill.VatAmount ?? 0;
                var roundOffAmount = originalBill.RoundOffAmount ?? 0;
                var purchaseReturnAmount = taxableAmount + nonVatPurchaseReturn;

                // 4. Get default account IDs
                var purchaseReturnAccountId = await GetDefaultAccountIdAsync("Purchase", companyId);
                var vatAccountId = await GetDefaultAccountIdAsync("VAT", companyId);
                var roundOffAccountId = await GetDefaultAccountIdAsync("Rounded Off", companyId);

                // Parse payment mode
                var paymentMode = ParsePaymentMode(originalBill.PaymentMode ?? "Credit");

                // 5. Get all transactions linked to this purchase return bill WITH their transaction items
                var transactions = await _context.Transactions
                    .Where(t => t.PurchaseReturnBillId == originalBill.Id &&
                               t.CompanyId == companyId &&
                               t.FiscalYearId == fiscalYearId &&
                               t.Status == TransactionStatus.Active)
                    .Include(t => t.TransactionItems) // Include transaction items
                    .ToListAsync();

                _logger.LogInformation($"Found {transactions.Count} transactions for bill {billNumber}");

                // 6. Update purchase return bill with new account
                originalBill.AccountId = newAccountId;
                originalBill.UpdatedAt = DateTime.UtcNow;
                originalBill.PurchaseSalesReturnType = "Purchase Return";

                // 7. Process each transaction
                foreach (var trans in transactions)
                {
                    // Check if this is the main party transaction (old party)
                    // Party transaction is identified by having AccountId = oldAccountId AND TotalDebit = totalAmount, TotalCredit = 0
                    var isMainPartyTransaction = trans.AccountId == oldAccountId &&
                                                 trans.TotalDebit == totalAmount &&
                                                 trans.TotalCredit == 0 &&
                                                 trans.Type == TransactionType.PrRt;

                    if (isMainPartyTransaction)
                    {
                        // Update to new party - Party account should be DEBIT side (amount receivable back)
                        trans.AccountId = newAccountId;
                        trans.PurchaseSalesReturnType = "Purchase Return";
                        trans.UpdatedAt = DateTime.UtcNow;

                        _logger.LogInformation($"Updated main party transaction {trans.Id} from account {oldAccountId} to {newAccountId}");

                        // Update all transaction items under this transaction
                        foreach (var transactionItem in trans.TransactionItems)
                        {
                            transactionItem.UpdatedAt = DateTime.UtcNow;
                            _logger.LogInformation($"Updated transaction item {transactionItem.Id} under party transaction {trans.Id}");
                        }
                    }
                    // Check if this is a purchase account transaction (Credit to Purchase account)
                    else if (purchaseReturnAccountId.HasValue && trans.AccountId == purchaseReturnAccountId.Value)
                    {
                        // Purchase account should be CREDIT side (reduction in expense)
                        trans.PurchaseSalesReturnType = "Purchase Return";
                        trans.UpdatedAt = DateTime.UtcNow;

                        // Update transaction items if any
                        foreach (var transactionItem in trans.TransactionItems)
                        {
                            transactionItem.UpdatedAt = DateTime.UtcNow;
                        }

                        _logger.LogInformation($"Updated purchase return account transaction {trans.Id} with new party name: {newAccount.Name}");
                    }
                    // Check if this is a VAT transaction (Credit to VAT account)
                    else if (vatAccountId.HasValue && trans.AccountId == vatAccountId.Value && trans.IsType == TransactionIsType.VAT)
                    {
                        trans.PurchaseSalesReturnType = "Purchase Return";
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
                        trans.PurchaseSalesReturnType = "Purchase Return";
                        trans.UpdatedAt = DateTime.UtcNow;

                        _logger.LogInformation($"Updated RoundOff transaction {trans.Id} with new party name: {newAccount.Name}");
                    }
                    // Check if this is a cash transaction (if payment mode was cash)
                    else if (trans.PaymentMode == PaymentMode.Cash && trans.TotalDebit == 0 && trans.TotalCredit == totalAmount)
                    {
                        trans.PurchaseSalesReturnType = "Purchase Return";
                        trans.UpdatedAt = DateTime.UtcNow;

                        _logger.LogInformation($"Updated cash transaction {trans.Id} with new party name: {newAccount.Name}");
                    }
                    // For any other transactions that might have items
                    else if (trans.TransactionItems.Any() && trans.Type == TransactionType.PrRt)
                    {
                        // Update the transaction header
                        trans.PurchaseSalesReturnType = "Purchase Return";
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

                return new ChangePurchaseReturnPartyResponseDTO
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

        public async Task<BillIdResponseDTO> GetPurchaseReturnBillIdByNumberAsync(string billNumber, Guid companyId, Guid fiscalYearId)
        {
            try
            {
                _logger.LogInformation($"Getting purchase bill ID for number: {billNumber}, Company: {companyId}, FiscalYear: {fiscalYearId}");

                var purchaseReturnBill = await _context.PurchaseReturns
                    .Where(pb => pb.BillNumber == billNumber &&
                                pb.CompanyId == companyId &&
                                pb.FiscalYearId == fiscalYearId)
                    .Select(pb => new BillIdResponseDTO
                    {
                        Id = pb.Id,
                        BillNumber = pb.BillNumber
                    })
                    .FirstOrDefaultAsync();

                if (purchaseReturnBill == null)
                {
                    _logger.LogWarning($"Purchase return not found for number: {billNumber}");
                    throw new ArgumentException("Voucher not found");
                }

                _logger.LogInformation($"Successfully retrieved bill ID for number: {billNumber}");
                return purchaseReturnBill;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting purchase return ID for number: {billNumber}");
                throw;
            }
        }

        // Add this method to your PurchaseReturnService class
        public async Task<PurchaseReturnEditDataDTO> GetPurchaseReturnEditDataAsync(Guid billId, Guid companyId, Guid fiscalYearId, Guid userId)
        {
            try
            {
                _logger.LogInformation("GetPurchaseReturnEditDataAsync called for Bill ID: {BillId}, Company: {CompanyId}, FiscalYear: {FiscalYearId}",
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

                // Fetch purchase return with all related data
                var purchaseReturn = await _context.PurchaseReturns
                    .Include(pr => pr.Account)
                    .Include(pr => pr.Items)
                        .ThenInclude(i => i.Item)
                            .ThenInclude(it => it.Unit)
                    .Include(pr => pr.Items)
                        .ThenInclude(i => i.Item)
                            .ThenInclude(it => it.Category)
                    .Include(pr => pr.Items)
                        .ThenInclude(i => i.Unit)
                    .FirstOrDefaultAsync(pr => pr.Id == billId &&
                                              pr.CompanyId == companyId &&
                                              pr.FiscalYearId == fiscalYearId);

                if (purchaseReturn == null)
                    throw new ArgumentException("Purchase return not found or does not belong to the selected company/fiscal year");

                // Process items to include stock and latest price
                var processedItems = new List<PurchaseReturnItemResponseDTO>();

                foreach (var item in purchaseReturn.Items)
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

                    // Map to response DTO
                    var itemDto = new PurchaseReturnItemResponseDTO
                    {
                        Id = item.Id,
                        PurchaseReturnId = item.PurchaseReturnId,
                        ItemId = item.ItemId,
                        ItemName = item.Item?.Name,
                        Hscode = item.Item?.Hscode,
                        UniqueNumber = item.Item?.UniqueNumber,
                        UnitId = item.Item?.UnitId ?? item.UnitId,  // Current unit ID
                        UnitName = item.Item?.Unit?.Name ?? item.Unit?.Name ?? "",  // Current unit name
                        WsUnit = item.WsUnit,
                        Quantity = item.Quantity,
                        Price = item.Price,
                        PuPrice = item.PuPrice,
                        DiscountPercentagePerItem = item.DiscountPercentagePerItem,
                        DiscountAmountPerItem = item.DiscountAmountPerItem,
                        NetPuPrice = item.NetPuPrice,
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
                        UpdatedAt = item.UpdatedAt,
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
                        VatStatus = item.VatStatus,
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

                // Fetch relevant accounts (Sundry Creditors only for purchase returns)
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

                // Map purchase return to response DTO
                var purchaseReturnDto = MapToResponseDTO(purchaseReturn, companyDateFormat);

                // Add the processed items with additional edit properties
                purchaseReturnDto.Items = processedItems;

                // Create response following the same pattern as PurchaseRegisterDataDTO
                var response = new PurchaseReturnEditDataDTO
                {
                    Company = company,
                    PurchaseReturn = purchaseReturnDto,
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

                _logger.LogInformation("Successfully retrieved purchase return edit data for Bill ID: {BillId}", billId);

                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting purchase return edit data for Bill ID: {BillId}", billId);
                throw;
            }
        }

        // public async Task<PurchaseReturn> UpdatePurchaseReturnAsync(Guid id, UpdatePurchaseReturnDTO dto, Guid companyId, Guid fiscalYearId, Guid userId)
        // {
        //     using var transaction = await _context.Database.BeginTransactionAsync();
        //     try
        //     {
        //         _logger.LogInformation("=== Starting UpdatePurchaseReturnAsync for Bill ID: {BillId} ===", id);

        //         // Validate required fields
        //         if (dto.AccountId == Guid.Empty)
        //             throw new ArgumentException("Account ID is required");

        //         if (dto.Items == null || !dto.Items.Any())
        //             throw new ArgumentException("At least one item is required");

        //         // Get the existing purchase return with ALL related data
        //         var existingBill = await _context.PurchaseReturns
        //             .Include(pr => pr.Items)
        //             .FirstOrDefaultAsync(pr => pr.Id == id && pr.CompanyId == companyId);

        //         if (existingBill == null)
        //             throw new ArgumentException("Purchase return not found");

        //         // Get related data
        //         var company = await _context.Companies.FindAsync(companyId);
        //         var fiscalYear = await _context.FiscalYears.FindAsync(fiscalYearId);
        //         var account = await _context.Accounts.FindAsync(dto.AccountId);

        //         if (company == null || fiscalYear == null || account == null)
        //             throw new ArgumentException("Required data not found");

        //         bool isNepaliFormat = company.DateFormat == DateFormatEnum.Nepali;

        //         // STEP 1: RESTORE STOCK for all existing items (reverse the previous return)
        //         await RestoreStockForPurchaseReturnItemsAsync(existingBill, companyId);

        //         // STEP 2: Delete all associated transactions FIRST
        //         var existingTransactions = await _context.Transactions
        //             .Where(t => t.PurchaseReturnBillId == id)
        //             .ToListAsync();

        //         if (existingTransactions.Any())
        //         {
        //             _context.Transactions.RemoveRange(existingTransactions);
        //             _logger.LogInformation("Deleted {Count} existing transactions", existingTransactions.Count);

        //             // Save changes to delete transactions
        //             await _context.SaveChangesAsync();
        //         }

        //         // STEP 3: Delete existing items
        //         if (existingBill.Items.Any())
        //         {
        //             _context.PurchaseReturnItems.RemoveRange(existingBill.Items);
        //             existingBill.Items.Clear();

        //             // Save changes to delete items
        //             await _context.SaveChangesAsync();
        //         }

        //         // Get default accounts
        //         var purchaseReturnAccount = await _context.Accounts
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

        //         // Get previous balance for account
        //         decimal previousBalance = 0;
        //         var lastTransaction = await _context.Transactions
        //             .Where(t => t.AccountId == dto.AccountId)
        //             .OrderByDescending(t => t.CreatedAt)
        //             .FirstOrDefaultAsync();

        //         if (lastTransaction != null)
        //             previousBalance = lastTransaction.Balance ?? 0;

        //         // STEP 4: UPDATE BILL PROPERTIES
        //         existingBill.AccountId = dto.AccountId;
        //         existingBill.IsVatExempt = isVatExempt;
        //         existingBill.VatPercentage = isVatExempt ? 0 : dto.VatPercentage;
        //         existingBill.PartyBillNumber = dto.PartyBillNumber;
        //         existingBill.SubTotal = dto.SubTotal;
        //         existingBill.DiscountAmount = dto.DiscountAmount;
        //         existingBill.DiscountPercentage = dto.DiscountPercentage;
        //         existingBill.NonVatPurchaseReturn = dto.NonVatPurchaseReturn;
        //         existingBill.TaxableAmount = dto.TaxableAmount;
        //         existingBill.VatAmount = dto.VatAmount;
        //         existingBill.IsVatAll = isVatAll ? "all" : (isVatExempt ? "true" : "false");
        //         existingBill.TotalAmount = dto.TotalAmount;
        //         existingBill.RoundOffAmount = dto.RoundOffAmount;
        //         existingBill.PaymentMode = dto.PaymentMode;

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

        //         // Update the bill
        //         _context.PurchaseReturns.Update(existingBill);
        //         await _context.SaveChangesAsync();

        //         // STEP 5: PROCESS NEW ITEMS - Create new items and reduce stock
        //         foreach (var itemDto in dto.Items)
        //         {
        //             var product = await _context.Items
        //                 .Include(i => i.StockEntries)
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

        //             decimal discountPercentage = dto.DiscountPercentage ?? 0;
        //             decimal discountAmountPerItem = (itemDto.PuPrice * quantity * discountPercentage) / 100m;
        //             decimal netPuPrice = itemDto.PuPrice - (itemDto.PuPrice * discountPercentage / 100m);

        //             decimal mrpForStock = itemDto.Currency == "INR"
        //                 ? (itemDto.Mrp ?? 0) * 1.6m
        //                 : (itemDto.Mrp ?? 0);

        //             decimal mrpPerUnit = wsUnit > 0 ? mrpForStock / wsUnit : 0m;

        //             string uniqueUuid = itemDto.UniqueUuid ?? Guid.NewGuid().ToString();

        //             // REDUCE STOCK for this item (this is the return - removing stock)
        //             await ReduceStockForPurchaseReturnItemAsync(product, itemDto.BatchNumber ?? "XXX", quantity, uniqueUuid);

        //             // Create new purchase return item
        //             var newItem = new PurchaseReturnItem
        //             {
        //                 Id = Guid.NewGuid(),
        //                 PurchaseReturnId = existingBill.Id,
        //                 ItemId = itemDto.ItemId,
        //                 UnitId = itemDto.UnitId,
        //                 WsUnit = wsUnit,
        //                 Quantity = quantity,
        //                 Price = itemDto.Price ?? 0,
        //                 PuPrice = itemDto.PuPrice,
        //                 DiscountPercentagePerItem = discountPercentage,
        //                 DiscountAmountPerItem = discountAmountPerItem,
        //                 NetPuPrice = netPuPrice,
        //                 Currency = itemDto.Currency ?? "NPR",
        //                 AltQuantity = quantity,
        //                 AltPrice = itemDto.Price ?? 0,
        //                 AltPuPrice = itemDto.PuPrice,
        //                 BatchNumber = itemDto.BatchNumber ?? "XXX",
        //                 ExpiryDate = itemDto.ExpiryDate ?? DateOnly.FromDateTime(DateTime.UtcNow.AddYears(2)),
        //                 VatStatus = itemDto.VatStatus ?? product.VatStatus ?? "vatable",
        //                 UniqueUuid = uniqueUuid,
        //                 CreatedAt = DateTime.UtcNow,
        //                 UpdatedAt = DateTime.UtcNow
        //             };

        //             existingBill.Items.Add(newItem);
        //             await _context.PurchaseReturnItems.AddAsync(newItem);
        //         }

        //         // Save items
        //         await _context.SaveChangesAsync();

        //         // STEP 6: CREATE NEW TRANSACTIONS
        //         var transactions = new List<Transaction>();

        //         // 1. Party account transaction (Debit to party - they are getting money back)
        //         var partyTransaction = new Transaction
        //         {
        //             Id = Guid.NewGuid(),
        //             CompanyId = companyId,
        //             AccountId = dto.AccountId,
        //             PurchaseReturnBillId = existingBill.Id,
        //             BillNumber = existingBill.BillNumber,
        //             PartyBillNumber = dto.PartyBillNumber,
        //             Type = TransactionType.PrRt,
        //             PurchaseSalesReturnType = "Purchase Return",
        //             IsType = TransactionIsType.PrRt,
        //             Debit = dto.TotalAmount ?? 0, // Party gets debit (money back)
        //             Credit = 0,
        //             PaymentMode = paymentMode,
        //             Balance = previousBalance + (dto.TotalAmount ?? 0), // Balance increases (money coming in)
        //             Date = isNepaliFormat ? dto.NepaliDate : dto.Date,
        //             BillDate = isNepaliFormat ? dto.NepaliDate : dto.Date,
        //             nepaliDate = dto.NepaliDate,
        //             transactionDateNepali = dto.TransactionDateNepali,
        //             FiscalYearId = fiscalYearId,
        //             CreatedAt = DateTime.UtcNow,
        //             Status = TransactionStatus.Active,
        //             IsActive = true,
        //         };
        //         transactions.Add(partyTransaction);

        //         // 2. Purchase account transaction (Credit to Purchase account - reducing purchase expense)
        //         if (purchaseReturnAccount != null)
        //         {
        //             var purchaseAmount = (dto.TaxableAmount + dto.NonVatPurchaseReturn);
        //             if (purchaseAmount > 0)
        //             {
        //                 var purchaseTransaction = new Transaction
        //                 {
        //                     Id = Guid.NewGuid(),
        //                     CompanyId = companyId,
        //                     AccountId = purchaseReturnAccount.Id,
        //                     PurchaseReturnBillId = existingBill.Id,
        //                     BillNumber = existingBill.BillNumber,
        //                     PartyBillNumber = dto.PartyBillNumber,
        //                     Type = TransactionType.PrRt,
        //                     PurchaseSalesReturnType = "Purchase Return",
        //                     Debit = 0,
        //                     Credit = purchaseAmount, // Credit to purchase account (reducing expense)
        //                     PaymentMode = paymentMode,
        //                     Date = isNepaliFormat ? dto.NepaliDate : dto.Date,
        //                     BillDate = isNepaliFormat ? dto.NepaliDate : dto.Date,
        //                     nepaliDate = dto.NepaliDate,
        //                     transactionDateNepali = dto.TransactionDateNepali,
        //                     FiscalYearId = fiscalYearId,
        //                     CreatedAt = DateTime.UtcNow,
        //                     Status = TransactionStatus.Active,
        //                     IsActive = true,
        //                     Balance = previousBalance - purchaseAmount
        //                 };
        //                 transactions.Add(purchaseTransaction);
        //             }
        //         }

        //         // 3. VAT transaction if applicable (Credit to VAT account - reducing VAT liability)
        //         if ((dto.VatAmount ?? 0) > 0 && vatAccount != null && !isVatExempt)
        //         {
        //             var vatTransaction = new Transaction
        //             {
        //                 Id = Guid.NewGuid(),
        //                 CompanyId = companyId,
        //                 AccountId = vatAccount.Id,
        //                 PurchaseReturnBillId = existingBill.Id,
        //                 BillNumber = existingBill.BillNumber,
        //                 PartyBillNumber = dto.PartyBillNumber,
        //                 IsType = TransactionIsType.VAT,
        //                 Type = TransactionType.PrRt,
        //                 PurchaseSalesReturnType = "Purchase Return",
        //                 Debit = 0,
        //                 Credit = dto.VatAmount ?? 0, // Credit to VAT account (reducing liability)
        //                 PaymentMode = paymentMode,
        //                 Date = isNepaliFormat ? dto.NepaliDate : dto.Date,
        //                 BillDate = isNepaliFormat ? dto.NepaliDate : dto.Date,
        //                 nepaliDate = dto.NepaliDate,
        //                 transactionDateNepali = dto.TransactionDateNepali,
        //                 FiscalYearId = fiscalYearId,
        //                 CreatedAt = DateTime.UtcNow,
        //                 Status = TransactionStatus.Active,
        //                 IsActive = true,
        //                 Balance = previousBalance - (dto.VatAmount ?? 0)
        //             };
        //             transactions.Add(vatTransaction);
        //         }

        //         // 4. Round-off transaction if applicable
        //         if ((dto.RoundOffAmount ?? 0) != 0 && roundOffAccount != null)
        //         {
        //             var roundOffTransaction = new Transaction
        //             {
        //                 Id = Guid.NewGuid(),
        //                 CompanyId = companyId,
        //                 AccountId = roundOffAccount.Id,
        //                 PurchaseReturnBillId = existingBill.Id,
        //                 BillNumber = existingBill.BillNumber,
        //                 PartyBillNumber = dto.PartyBillNumber,
        //                 IsType = TransactionIsType.RoundOff,
        //                 Type = TransactionType.PrRt,
        //                 PurchaseSalesReturnType = "Purchase Return",
        //                 Debit = dto.RoundOffAmount > 0 ? dto.RoundOffAmount.Value : 0,
        //                 Credit = dto.RoundOffAmount < 0 ? Math.Abs(dto.RoundOffAmount.Value) : 0,
        //                 PaymentMode = paymentMode,
        //                 Date = isNepaliFormat ? dto.NepaliDate : dto.Date,
        //                 BillDate = isNepaliFormat ? dto.NepaliDate : dto.Date,
        //                 nepaliDate = dto.NepaliDate,
        //                 transactionDateNepali = dto.TransactionDateNepali,
        //                 FiscalYearId = fiscalYearId,
        //                 CreatedAt = DateTime.UtcNow,
        //                 Status = TransactionStatus.Active,
        //                 IsActive = true,
        //                 Balance = previousBalance + (dto.RoundOffAmount ?? 0)
        //             };
        //             transactions.Add(roundOffTransaction);
        //         }

        //         // 5. Cash transaction if payment mode is cash (Credit to Cash account - cash going out)
        //         if (paymentMode == PaymentMode.Cash && cashAccount != null)
        //         {
        //             var cashTransaction = new Transaction
        //             {
        //                 Id = Guid.NewGuid(),
        //                 CompanyId = companyId,
        //                 AccountId = cashAccount.Id,
        //                 PurchaseReturnBillId = existingBill.Id,
        //                 BillNumber = existingBill.BillNumber,
        //                 PartyBillNumber = dto.PartyBillNumber,
        //                 IsType = TransactionIsType.PrRt,
        //                 Type = TransactionType.PrRt,
        //                 PurchaseSalesReturnType = "Purchase Return",
        //                 Debit = 0,
        //                 Credit = dto.TotalAmount ?? 0, // Credit to cash account (cash going out)
        //                 PaymentMode = paymentMode,
        //                 Balance = previousBalance - (dto.TotalAmount ?? 0),
        //                 Date = isNepaliFormat ? dto.NepaliDate : dto.Date,
        //                 BillDate = isNepaliFormat ? dto.NepaliDate : dto.Date,
        //                 nepaliDate = dto.NepaliDate,
        //                 transactionDateNepali = dto.TransactionDateNepali,
        //                 FiscalYearId = fiscalYearId,
        //                 CreatedAt = DateTime.UtcNow,
        //                 Status = TransactionStatus.Active,
        //                 IsActive = true,
        //             };
        //             transactions.Add(cashTransaction);
        //         }

        //         // Add all transactions
        //         await _context.Transactions.AddRangeAsync(transactions);
        //         await _context.SaveChangesAsync();

        //         await transaction.CommitAsync();
        //         _logger.LogInformation("=== Successfully updated purchase return: {BillId} ===", id);

        //         return existingBill;
        //     }
        //     catch (Exception ex)
        //     {
        //         _logger.LogError(ex, "Error updating purchase return: {BillId}", id);
        //         await transaction.RollbackAsync();
        //         throw;
        //     }
        // }

        public async Task<PurchaseReturn> UpdatePurchaseReturnAsync(Guid id, UpdatePurchaseReturnDTO dto, Guid companyId, Guid fiscalYearId, Guid userId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                _logger.LogInformation("=== Starting UpdatePurchaseReturnAsync for Bill ID: {BillId} ===", id);

                // Validate required fields
                if (dto.AccountId == Guid.Empty)
                    throw new ArgumentException("Account ID is required");

                if (dto.Items == null || !dto.Items.Any())
                    throw new ArgumentException("At least one item is required");

                // Get the existing purchase return with ALL related data
                var existingBill = await _context.PurchaseReturns
                    .Include(pr => pr.Items)
                    .FirstOrDefaultAsync(pr => pr.Id == id && pr.CompanyId == companyId);

                if (existingBill == null)
                    throw new ArgumentException("Purchase return not found");

                // Get related data
                var company = await _context.Companies.FindAsync(companyId);
                var fiscalYear = await _context.FiscalYears.FindAsync(fiscalYearId);
                var account = await _context.Accounts.FindAsync(dto.AccountId);

                if (company == null || fiscalYear == null || account == null)
                    throw new ArgumentException("Required data not found");

                bool isNepaliFormat = company.DateFormat == DateFormatEnum.Nepali;

                // STEP 1: RESTORE STOCK for all existing items (reverse the previous return)
                await RestoreStockForPurchaseReturnItemsAsync(existingBill, companyId);

                // STEP 2: Delete all associated transactions AND their transaction items
                var existingTransactions = await _context.Transactions
                    .Where(t => t.PurchaseReturnBillId == id)
                    .Include(t => t.TransactionItems)
                    .ToListAsync();

                if (existingTransactions.Any())
                {
                    // TransactionItems will be deleted automatically due to Cascade delete
                    _context.Transactions.RemoveRange(existingTransactions);
                    _logger.LogInformation("Deleted {Count} existing transactions with their items", existingTransactions.Count);

                    // Save changes to delete transactions
                    await _context.SaveChangesAsync();
                }

                // STEP 3: Delete existing items
                if (existingBill.Items.Any())
                {
                    _context.PurchaseReturnItems.RemoveRange(existingBill.Items);
                    existingBill.Items.Clear();

                    // Save changes to delete items
                    await _context.SaveChangesAsync();
                }

                // Get default accounts
                var purchaseReturnAccount = await _context.Accounts
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

                // STEP 4: UPDATE BILL PROPERTIES
                existingBill.AccountId = dto.AccountId;
                existingBill.IsVatExempt = isVatExempt;
                existingBill.VatPercentage = isVatExempt ? 0 : dto.VatPercentage;
                existingBill.PartyBillNumber = dto.PartyBillNumber;
                existingBill.SubTotal = dto.SubTotal;
                existingBill.DiscountAmount = dto.DiscountAmount;
                existingBill.DiscountPercentage = dto.DiscountPercentage;
                existingBill.NonVatPurchaseReturn = dto.NonVatPurchaseReturn;
                existingBill.TaxableAmount = dto.TaxableAmount;
                existingBill.VatAmount = dto.VatAmount;
                existingBill.IsVatAll = isVatAll ? "all" : (isVatExempt ? "true" : "false");
                existingBill.TotalAmount = dto.TotalAmount;
                existingBill.RoundOffAmount = dto.RoundOffAmount;
                existingBill.PaymentMode = dto.PaymentMode;

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

                // Update the bill
                _context.PurchaseReturns.Update(existingBill);
                await _context.SaveChangesAsync();

                // Track totals for header transactions
                decimal totalPartyDebit = 0;
                decimal totalPurchaseCredit = 0;
                decimal totalVatCredit = 0;

                // Store item calculations for transaction items
                var itemCalculations = new List<PurchaseReturnItemCalculation>();

                // STEP 5: PROCESS NEW ITEMS - Create new items and reduce stock
                decimal overallDiscountPercentage = dto.DiscountPercentage ?? 0m;

                foreach (var itemDto in dto.Items)
                {
                    var product = await _context.Items
                        .Include(i => i.StockEntries)
                        .FirstOrDefaultAsync(i => i.Id == itemDto.ItemId && i.CompanyId == companyId);

                    if (product == null)
                        throw new ArgumentException($"Item with id {itemDto.ItemId} not found");

                    // Calculate values
                    decimal wsUnit = itemDto.WsUnit ?? 1m;
                    decimal quantity = itemDto.Quantity;
                    decimal bonus = itemDto.Bonus ?? 0m;

                    decimal totalQuantityWithBonus = quantity + bonus;
                    decimal netQuantity = totalQuantityWithBonus * wsUnit;

                    decimal totalPurchaseValueBeforeDiscount = itemDto.PuPrice * quantity;
                    decimal discountAmountForItem = (totalPurchaseValueBeforeDiscount * overallDiscountPercentage) / 100m;
                    decimal itemValueAfterDiscount = totalPurchaseValueBeforeDiscount - discountAmountForItem;
                    decimal netPuPrice = itemDto.PuPrice - (itemDto.PuPrice * overallDiscountPercentage / 100m);

                    // Calculate item-wise VAT
                    decimal itemTaxableAmount = 0m;
                    decimal itemVatPercentage = dto.VatPercentage;
                    decimal itemVatAmount = 0m;

                    if (!isVatExempt && itemVatPercentage > 0)
                    {
                        itemTaxableAmount = itemValueAfterDiscount;
                        itemVatAmount = (itemTaxableAmount * itemVatPercentage) / 100m;
                    }

                    // Update totals
                    totalPartyDebit += itemValueAfterDiscount + itemVatAmount;  // Party gets DEBIT (amount receivable back)
                    totalPurchaseCredit += itemValueAfterDiscount;              // Purchase account gets CREDIT (reduction in expense)
                    totalVatCredit += itemVatAmount;                            // VAT account gets CREDIT (input VAT reduction)

                    decimal mrpForStock = itemDto.Currency == "INR"
                        ? (itemDto.Mrp ?? 0) * 1.6m
                        : (itemDto.Mrp ?? 0);

                    decimal mrpPerUnit = wsUnit > 0 ? mrpForStock / wsUnit : 0m;

                    string uniqueUuid = itemDto.UniqueUuid ?? Guid.NewGuid().ToString();

                    // REDUCE STOCK for this item (this is the return - removing stock)
                    await ReduceStockForPurchaseReturnItemAsync(product, itemDto.BatchNumber ?? "XXX", quantity, uniqueUuid);

                    // Create new purchase return item
                    var newItem = new PurchaseReturnItem
                    {
                        Id = Guid.NewGuid(),
                        PurchaseReturnId = existingBill.Id,
                        ItemId = itemDto.ItemId,
                        UnitId = itemDto.UnitId,
                        WsUnit = wsUnit,
                        Quantity = quantity,
                        Price = itemDto.Price ?? 0,
                        PuPrice = itemDto.PuPrice,
                        DiscountPercentagePerItem = overallDiscountPercentage,
                        DiscountAmountPerItem = discountAmountForItem,
                        NetPuPrice = netPuPrice,
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
                    await _context.PurchaseReturnItems.AddAsync(newItem);

                    // Store calculation for transaction items
                    itemCalculations.Add(new PurchaseReturnItemCalculation
                    {
                        ItemId = itemDto.ItemId,
                        UnitId = itemDto.UnitId,
                        WsUnit = wsUnit,
                        Quantity = quantity,
                        Bonus = bonus,
                        Price = itemDto.Price ?? 0,
                        PuPrice = itemDto.PuPrice,
                        DiscountPercentagePerItem = overallDiscountPercentage,
                        DiscountAmountPerItem = discountAmountForItem,
                        NetPuPrice = netPuPrice,
                        TaxableAmount = itemTaxableAmount,
                        VatPercentage = itemVatPercentage,
                        VatAmount = itemVatAmount,
                        ItemValueAfterDiscount = itemValueAfterDiscount
                    });
                }

                // Save items
                await _context.SaveChangesAsync();

                // STEP 6: CREATE NEW TRANSACTIONS WITH TRANSACTION ITEMS

                // 1. PARTY ACCOUNT TRANSACTION (Header - Debit to party - amount receivable back)
                if (dto.AccountId != Guid.Empty && totalPartyDebit > 0)
                {
                    var partyTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        AccountId = dto.AccountId,
                        PurchaseReturnBillId = existingBill.Id,
                        BillNumber = existingBill.BillNumber,
                        PartyBillNumber = dto.PartyBillNumber,
                        Type = TransactionType.PrRt,
                        PurchaseSalesReturnType = "Purchase Return",
                        IsType = TransactionIsType.PrRt,
                        TotalDebit = dto.TotalAmount ?? 0,
                        TotalCredit = 0,
                        TaxableAmount = dto.TaxableAmount,
                        VatPercentage = dto.VatPercentage,
                        VatAmount = dto.VatAmount,
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

                    // Add Transaction Items for Party Transaction
                    foreach (var calc in itemCalculations)
                    {
                        var transactionItem = new TransactionItem
                        {
                            Id = Guid.NewGuid(),
                            TransactionId = partyTransaction.Id,
                            ItemId = calc.ItemId,
                            UnitId = calc.UnitId,
                            WSUnit = (int?)calc.WsUnit,
                            Quantity = calc.Quantity,
                            Bonus = calc.Bonus,
                            Price = calc.Price,
                            PuPrice = calc.PuPrice,
                            DiscountPercentagePerItem = calc.DiscountPercentagePerItem,
                            DiscountAmountPerItem = calc.DiscountAmountPerItem,
                            NetPuPrice = calc.NetPuPrice,
                            TaxableAmount = calc.TaxableAmount,
                            VatPercentage = calc.VatPercentage,
                            VatAmount = calc.VatAmount,
                            Debit = calc.ItemValueAfterDiscount + calc.VatAmount,
                            Credit = 0,
                            CreatedAt = DateTime.UtcNow
                        };
                        await _context.TransactionItems.AddAsync(transactionItem);
                    }
                }

                // 2. PURCHASE ACCOUNT TRANSACTION (Header - Credit to Purchase account - reduction in expense)
                if (purchaseReturnAccount != null && totalPurchaseCredit > 0)
                {
                    var purchaseTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        AccountId = purchaseReturnAccount.Id,
                        PurchaseReturnBillId = existingBill.Id,
                        BillNumber = existingBill.BillNumber,
                        PartyBillNumber = dto.PartyBillNumber,
                        Type = TransactionType.PrRt,
                        PurchaseSalesReturnType = "Purchase Return",
                        TotalDebit = 0,
                        TotalCredit = totalPurchaseCredit,
                        TaxableAmount = dto.TaxableAmount,
                        VatPercentage = dto.VatPercentage,
                        VatAmount = dto.VatAmount,
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
                    await _context.Transactions.AddAsync(purchaseTransaction);

                    // Add Transaction Items for Purchase Transaction
                    foreach (var calc in itemCalculations)
                    {
                        var transactionItem = new TransactionItem
                        {
                            Id = Guid.NewGuid(),
                            TransactionId = purchaseTransaction.Id,
                            ItemId = calc.ItemId,
                            UnitId = calc.UnitId,
                            WSUnit = (int?)calc.WsUnit,
                            Quantity = calc.Quantity,
                            Bonus = calc.Bonus,
                            Price = calc.Price,
                            PuPrice = calc.PuPrice,
                            DiscountPercentagePerItem = calc.DiscountPercentagePerItem,
                            DiscountAmountPerItem = calc.DiscountAmountPerItem,
                            NetPuPrice = calc.NetPuPrice,
                            TaxableAmount = calc.TaxableAmount,
                            VatPercentage = calc.VatPercentage,
                            VatAmount = calc.VatAmount,
                            Debit = 0,
                            Credit = calc.ItemValueAfterDiscount,
                            CreatedAt = DateTime.UtcNow
                        };
                        await _context.TransactionItems.AddAsync(transactionItem);
                    }
                }

                // 3. VAT TRANSACTION (Header - Credit to VAT account - reduction in input VAT)
                if (totalVatCredit > 0 && vatAccount != null && !isVatExempt)
                {
                    var vatTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        AccountId = vatAccount.Id,
                        PurchaseReturnBillId = existingBill.Id,
                        BillNumber = existingBill.BillNumber,
                        PartyBillNumber = dto.PartyBillNumber,
                        IsType = TransactionIsType.VAT,
                        Type = TransactionType.PrRt,
                        PurchaseSalesReturnType = "Purchase Return",
                        TotalDebit = 0,
                        TotalCredit = totalVatCredit,
                        TaxableAmount = dto.TaxableAmount,
                        VatPercentage = dto.VatPercentage,
                        VatAmount = totalVatCredit,
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
                            WSUnit = (int?)calc.WsUnit,
                            Quantity = calc.Quantity,
                            Bonus = calc.Bonus,
                            Price = calc.Price,
                            PuPrice = calc.PuPrice,
                            DiscountPercentagePerItem = calc.DiscountPercentagePerItem,
                            DiscountAmountPerItem = calc.DiscountAmountPerItem,
                            NetPuPrice = calc.NetPuPrice,
                            TaxableAmount = calc.TaxableAmount,
                            VatPercentage = calc.VatPercentage,
                            VatAmount = calc.VatAmount,
                            Debit = 0,
                            Credit = calc.VatAmount,
                            CreatedAt = DateTime.UtcNow
                        };
                        await _context.TransactionItems.AddAsync(transactionItem);
                    }
                }

                // 4. ROUND-OFF TRANSACTION (Header) if applicable
                if ((dto.RoundOffAmount ?? 0) != 0 && roundOffAccount != null)
                {
                    var roundOffTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        AccountId = roundOffAccount.Id,
                        PurchaseReturnBillId = existingBill.Id,
                        BillNumber = existingBill.BillNumber,
                        PartyBillNumber = dto.PartyBillNumber,
                        IsType = TransactionIsType.RoundOff,
                        Type = TransactionType.PrRt,
                        PurchaseSalesReturnType = "Purchase Return",
                        TotalDebit = dto.RoundOffAmount > 0 ? dto.RoundOffAmount.Value : 0,
                        TotalCredit = dto.RoundOffAmount < 0 ? Math.Abs(dto.RoundOffAmount.Value) : 0,
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
                    await _context.Transactions.AddAsync(roundOffTransaction);
                }

                // 5. CASH TRANSACTION (Header) if payment mode is cash
                if (paymentMode == PaymentMode.Cash && cashAccount != null && dto.TotalAmount > 0)
                {
                    var cashTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = companyId,
                        AccountId = cashAccount.Id,
                        PurchaseReturnBillId = existingBill.Id,
                        BillNumber = existingBill.BillNumber,
                        PartyBillNumber = dto.PartyBillNumber,
                        Type = TransactionType.PrRt,
                        PurchaseSalesReturnType = "Purchase Return",
                        TotalDebit = 0,
                        TotalCredit = dto.TotalAmount.Value,
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
                    await _context.Transactions.AddAsync(cashTransaction);
                }

                // Save all changes
                await _context.SaveChangesAsync();

                await transaction.CommitAsync();
                _logger.LogInformation("=== Successfully updated purchase return: {BillId} ===", id);

                return existingBill;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating purchase return: {BillId}", id);
                await transaction.RollbackAsync();
                throw;
            }
        }

        private async Task RestoreStockForPurchaseReturnItemsAsync(PurchaseReturn purchaseReturn, Guid companyId)
        {
            foreach (var item in purchaseReturn.Items)
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
                    // RESTORE stock - this reverses the previous return
                    batchEntry.Quantity += item.Quantity ?? 0;
                    batchEntry.UpdatedAt = DateTime.UtcNow;
                    _context.StockEntries.Update(batchEntry);
                    _logger.LogInformation($"Restored {item.Quantity} stock for item {product.Name}, batch {item.BatchNumber}");
                }
                else
                {
                    // If batch doesn't exist, we need to create it? This shouldn't happen for returns
                    _logger.LogWarning($"Batch entry not found for item {product.Name}, batch {item.BatchNumber}, UUID {item.UniqueUuid}");
                }
            }

            await _context.SaveChangesAsync();
        }

        private async Task ReduceStockForPurchaseReturnItemAsync(Item product, string batchNumber, decimal quantity, string uniqueUuid)
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

            // Check if there's enough stock (we're reducing stock for the return)
            if (batchEntry.Quantity < quantity)
                throw new ArgumentException(
                    $"Not enough stock to process return for batch '{batchNumber}'. Available: {batchEntry.Quantity}, Required: {quantity}");

            // REDUCE the quantity (this is the actual return - removing stock)
            batchEntry.Quantity -= quantity;
            batchEntry.UpdatedAt = DateTime.UtcNow;

            _context.StockEntries.Update(batchEntry);
            _logger.LogInformation($"Reduced {quantity} stock for item {product.Name}, batch {batchNumber}");
        }


        // public async Task<PurchaseReturnPrintDTO> GetPurchaseReturnForPrintAsync(Guid id, Guid companyId, Guid userId, Guid fiscalYearId)
        // {
        //     try
        //     {
        //         _logger.LogInformation("GetPurchaseReturnForPrintAsync called for Bill ID: {BillId}, Company: {CompanyId}", id, companyId);

        //         // Get company details - materialize first
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

        //         // Create DTO manually
        //         var company = new CompanyPrintDTO
        //         {
        //             Id = companyEntity.Id,
        //             RenewalDate = renewalDate,
        //             DateFormat = companyEntity.DateFormat.ToString(),
        //             FiscalYear = null
        //         };
        //         if (company == null)
        //             throw new ArgumentException("Company not found");

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

        //         // Get current company info
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

        //         // Get the purchase bill with all related data
        //         var purchaseReturnBill = await _context.PurchaseReturns
        //             .Include(pb => pb.Account)
        //             .Include(pb => pb.User)
        //             .Include(pb => pb.Items)
        //                 .ThenInclude(i => i.Item)
        //                     .ThenInclude(it => it.Unit)
        //             .FirstOrDefaultAsync(pb => pb.Id == id && pb.CompanyId == companyId);

        //         if (purchaseReturnBill == null)
        //             throw new ArgumentException("Bill not found");

        //         // Check and update first printed status
        //         bool firstBill = !purchaseReturnBill.FirstPrinted;
        //         if (firstBill)
        //         {
        //             purchaseReturnBill.FirstPrinted = true;
        //             purchaseReturnBill.PrintCount += 1;
        //             await _context.SaveChangesAsync();
        //         }

        //         // Calculate last balance for credit bills
        //         decimal? finalBalance = null;
        //         string balanceLabel = "";

        //         if (purchaseReturnBill.PaymentMode?.ToLower() == "credit")
        //         {
        //             // Fix: Use Date instead of TransactionDate
        //             var latestTransaction = await _context.Transactions
        //                 .Where(t => t.CompanyId == companyId &&
        //                            t.PurchaseReturnBillId == id)
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
        //             if (purchaseReturnBill.Account != null && purchaseReturnBill.Account.OpeningBalance != null)
        //             {
        //                 var openingBalance = purchaseReturnBill.Account.OpeningBalance;
        //                 lastBalance += openingBalance.Type == "Dr" ? openingBalance.Amount : -openingBalance.Amount;
        //                 balanceLabel = openingBalance.Type;
        //             }

        //             finalBalance = lastBalance;
        //         }

        //         // Get user with roles
        //         var user = await _context.Users
        //             .Include(u => u.UserRoles)
        //                 .ThenInclude(ur => ur.Role)
        //             .FirstOrDefaultAsync(u => u.Id == userId);

        //         // Create user preferences DTO
        //         var userPreferences = new UserPreferencesDTO
        //         {
        //             Theme = user?.Preferences.Theme.ToString() ?? "Light"
        //         };

        //         // Determine if user is admin or supervisor
        //         bool isAdminOrSupervisor = user?.IsAdmin == true ||
        //                                   (user?.UserRoles?.Any(ur => ur.Role?.Name == "Supervisor" &&
        //                                                              (ur.ExpiresAt == null || ur.ExpiresAt > DateTime.UtcNow)) ?? false);

        //         // Get company date format
        //         bool isNepaliFormat = company.DateFormat?.ToLower() == "nepali";

        //         // Map to response DTO
        //         var response = new PurchaseReturnPrintDTO
        //         {
        //             Company = company,
        //             CurrentFiscalYear = currentFiscalYear,
        //             Bill = new PurchaseReturnPrintBillDTO
        //             {
        //                 Id = purchaseReturnBill.Id,
        //                 BillNumber = purchaseReturnBill.BillNumber,
        //                 PartyBillNumber = purchaseReturnBill.PartyBillNumber,
        //                 FirstPrinted = purchaseReturnBill.FirstPrinted,
        //                 PrintCount = purchaseReturnBill.PrintCount,
        //                 PaymentMode = purchaseReturnBill.PaymentMode,
        //                 Date = isNepaliFormat ? purchaseReturnBill.nepaliDate : purchaseReturnBill.Date,
        //                 TransactionDate = isNepaliFormat ? purchaseReturnBill.transactionDateNepali : purchaseReturnBill.TransactionDate,
        //                 SubTotal = purchaseReturnBill.SubTotal,
        //                 NonVatPurchaseReturn = purchaseReturnBill.NonVatPurchaseReturn,
        //                 TaxableAmount = purchaseReturnBill.TaxableAmount,
        //                 DiscountPercentage = purchaseReturnBill.DiscountPercentage,
        //                 DiscountAmount = purchaseReturnBill.DiscountAmount,
        //                 VatPercentage = purchaseReturnBill.VatPercentage,
        //                 VatAmount = purchaseReturnBill.VatAmount,
        //                 TotalAmount = purchaseReturnBill.TotalAmount,
        //                 IsVatExempt = purchaseReturnBill.IsVatExempt,
        //                 RoundOffAmount = purchaseReturnBill.RoundOffAmount,
        //                 Account = purchaseReturnBill.Account != null ? new AccountPrintDTO
        //                 {
        //                     Id = purchaseReturnBill.Account.Id,
        //                     Name = purchaseReturnBill.Account.Name,
        //                     Pan = purchaseReturnBill.Account.Pan,
        //                     Address = purchaseReturnBill.Account.Address,
        //                     Email = purchaseReturnBill.Account.Email,
        //                     Phone = purchaseReturnBill.Account.Phone,
        //                 } : null,
        //                 User = purchaseReturnBill.User != null ? new UserPrintDTO
        //                 {
        //                     Id = purchaseReturnBill.User.Id,
        //                     Name = purchaseReturnBill.User.Name,
        //                     IsAdmin = purchaseReturnBill.User.IsAdmin,
        //                     Role = purchaseReturnBill.User.UserRoles?
        //                         .FirstOrDefault(ur => ur.IsPrimary)?.Role?.Name ?? "User"
        //                 } : null,
        //                 Items = purchaseReturnBill.Items.Select(i => new PurchaseReturnItemPrintDTO
        //                 {
        //                     Id = i.Id,
        //                     ItemId = i.ItemId,
        //                     ItemName = i.Item?.Name,
        //                     Hscode = i.Item?.Hscode,  // Add this
        //                     UniqueNumber = i.Item?.UniqueNumber,  // Add this
        //                     UnitId = i.UnitId,
        //                     UnitName = i.Item?.Unit?.Name,
        //                     WsUnit = i.WsUnit,
        //                     Quantity = i.Quantity ?? 0,
        //                     Price = i.Price,
        //                     PuPrice = i.PuPrice ?? 0,
        //                     DiscountPercentagePerItem = i.DiscountPercentagePerItem,
        //                     DiscountAmountPerItem = i.DiscountAmountPerItem,
        //                     NetPuPrice = i.NetPuPrice,
        //                     Mrp = i.Mrp,
        //                     MarginPercentage = i.MarginPercentage,
        //                     Currency = i.Currency,
        //                     BatchNumber = i.BatchNumber,
        //                     ExpiryDate = i.ExpiryDate,
        //                     VatStatus = i.VatStatus
        //                 }).ToList()
        //             },
        //             CurrentCompanyName = currentCompany?.Name ?? string.Empty,
        //             CurrentCompany = currentCompany ?? new CompanyPrintInfoDTO(),
        //             FirstBill = firstBill,
        //             LastBalance = finalBalance,
        //             BalanceLabel = balanceLabel,
        //             PaymentMode = purchaseReturnBill.PaymentMode ?? string.Empty,
        //             NepaliDate = purchaseReturnBill.nepaliDate.ToString("yyyy-MM-dd"),
        //             TransactionDateNepali = purchaseReturnBill.transactionDateNepali.ToString("yyyy-MM-dd"),
        //             EnglishDate = purchaseReturnBill.Date,
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
        //         _logger.LogError(ex, "Error getting purchase bill for print: {BillId}", id);
        //         throw;
        //     }
        // }

public async Task<PurchaseReturnPrintDTO> GetPurchaseReturnForPrintAsync(Guid id, Guid companyId, Guid userId, Guid fiscalYearId)
{
    try
    {
        _logger.LogInformation("GetPurchaseReturnForPrintAsync called for Bill ID: {BillId}, Company: {CompanyId}", id, companyId);

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

        // Get the purchase return bill with all related data
        var purchaseReturnBill = await _context.PurchaseReturns
            .Include(pr => pr.Account)
            .Include(pr => pr.User)
            .Include(pr => pr.Items)
                .ThenInclude(i => i.Item)
                    .ThenInclude(it => it.Unit)
            .FirstOrDefaultAsync(pr => pr.Id == id && pr.CompanyId == companyId);

        if (purchaseReturnBill == null)
            throw new ArgumentException("Bill not found");

        // Get the party transaction for this purchase return bill
        var partyTransaction = await _context.Transactions
            .Where(t => t.CompanyId == companyId &&
                       t.PurchaseReturnBillId == id &&
                       t.Type == TransactionType.PrRt &&
                       t.TotalDebit > 0) // Party transaction has TotalDebit for purchase return
            .Include(t => t.TransactionItems)
            .OrderByDescending(t => t.Date)
            .FirstOrDefaultAsync();

        // Create a dictionary for quick lookup of item-wise VAT
        var itemVatDictionary = new Dictionary<Guid, (decimal? TaxableAmount, decimal? VatPercentage, decimal? VatAmount)>();
        
        if (partyTransaction?.TransactionItems != null)
        {
            foreach (var ti in partyTransaction.TransactionItems)
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
        bool firstBill = !purchaseReturnBill.FirstPrinted;
        if (firstBill)
        {
            purchaseReturnBill.FirstPrinted = true;
            purchaseReturnBill.PrintCount += 1;
            await _context.SaveChangesAsync();
        }

        // Calculate last balance for credit bills
        decimal? finalBalance = null;
        string balanceLabel = "";

        if (purchaseReturnBill.PaymentMode?.ToLower() == "credit")
        {
            decimal lastBalance = 0;

            if (partyTransaction != null)
            {
                // Use TotalDebit for party transaction (amount receivable from party)
                lastBalance = Math.Abs(partyTransaction.TotalDebit);
                
                // Determine if it's Debit or Credit balance
                if (partyTransaction.TotalDebit > partyTransaction.TotalCredit)
                    balanceLabel = "Dr";
                else if (partyTransaction.TotalCredit > partyTransaction.TotalDebit)
                    balanceLabel = "Cr";
                else
                    balanceLabel = "";
            }

            // Get opening balance from account
            if (purchaseReturnBill.Account != null && purchaseReturnBill.Account.OpeningBalance != null)
            {
                var openingBalance = purchaseReturnBill.Account.OpeningBalance;
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

        // Map to response DTO with item-wise VAT from TransactionItems
        var response = new PurchaseReturnPrintDTO
        {
            Company = company,
            CurrentFiscalYear = currentFiscalYear,
            Bill = new PurchaseReturnPrintBillDTO
            {
                Id = purchaseReturnBill.Id,
                BillNumber = purchaseReturnBill.BillNumber,
                PartyBillNumber = purchaseReturnBill.PartyBillNumber,
                FirstPrinted = purchaseReturnBill.FirstPrinted,
                PrintCount = purchaseReturnBill.PrintCount,
                PaymentMode = purchaseReturnBill.PaymentMode,
                Date = isNepaliFormat ? purchaseReturnBill.nepaliDate : purchaseReturnBill.Date,
                TransactionDate = isNepaliFormat ? purchaseReturnBill.transactionDateNepali : purchaseReturnBill.TransactionDate,
                SubTotal = purchaseReturnBill.SubTotal,
                NonVatPurchaseReturn = purchaseReturnBill.NonVatPurchaseReturn,
                TaxableAmount = purchaseReturnBill.TaxableAmount,
                DiscountPercentage = purchaseReturnBill.DiscountPercentage,
                DiscountAmount = purchaseReturnBill.DiscountAmount,
                VatPercentage = purchaseReturnBill.VatPercentage,
                VatAmount = purchaseReturnBill.VatAmount,
                TotalAmount = purchaseReturnBill.TotalAmount,
                IsVatExempt = purchaseReturnBill.IsVatExempt,
                RoundOffAmount = purchaseReturnBill.RoundOffAmount,
                Account = purchaseReturnBill.Account != null ? new AccountPrintDTO
                {
                    Id = purchaseReturnBill.Account.Id,
                    Name = purchaseReturnBill.Account.Name,
                    Pan = purchaseReturnBill.Account.Pan,
                    Address = purchaseReturnBill.Account.Address,
                    Email = purchaseReturnBill.Account.Email,
                    Phone = purchaseReturnBill.Account.Phone,
                } : null,
                User = purchaseReturnBill.User != null ? new UserPrintDTO
                {
                    Id = purchaseReturnBill.User.Id,
                    Name = purchaseReturnBill.User.Name,
                    IsAdmin = purchaseReturnBill.User.IsAdmin,
                    Role = purchaseReturnBill.User.UserRoles?
                        .FirstOrDefault(ur => ur.IsPrimary)?.Role?.Name ?? "User"
                } : null,
                Items = purchaseReturnBill.Items.Select(i => {
                    // Get item-wise VAT from dictionary if available
                    itemVatDictionary.TryGetValue(i.ItemId, out var vatInfo);
                    
                    return new PurchaseReturnItemPrintDTO
                    {
                        Id = i.Id,
                        ItemId = i.ItemId,
                        ItemName = i.Item?.Name,
                        Hscode = i.Item?.Hscode,
                        UniqueNumber = i.Item?.UniqueNumber,
                        UnitId = i.UnitId,
                        UnitName = i.Item?.Unit?.Name,
                        WsUnit = i.WsUnit,
                        Quantity = i.Quantity ?? 0,
                        Price = i.Price,
                        PuPrice = i.PuPrice ?? 0,
                        DiscountPercentagePerItem = i.DiscountPercentagePerItem,
                        DiscountAmountPerItem = i.DiscountAmountPerItem,
                        NetPuPrice = i.NetPuPrice,
                        Mrp = i.Mrp,
                        MarginPercentage = i.MarginPercentage,
                        Currency = i.Currency,
                        BatchNumber = i.BatchNumber,
                        ExpiryDate = i.ExpiryDate,
                        VatStatus = i.VatStatus,
                    };
                }).ToList()
            },
            CurrentCompanyName = currentCompany?.Name ?? string.Empty,
            CurrentCompany = currentCompany ?? new CompanyPrintInfoDTO(),
            FirstBill = firstBill,
            LastBalance = finalBalance,
            BalanceLabel = balanceLabel,
            PaymentMode = purchaseReturnBill.PaymentMode ?? string.Empty,
            NepaliDate = purchaseReturnBill.nepaliDate.ToString("yyyy-MM-dd"),
            TransactionDateNepali = purchaseReturnBill.transactionDateNepali.ToString("yyyy-MM-dd"),
            EnglishDate = purchaseReturnBill.Date,
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
        _logger.LogError(ex, "Error getting purchase return for print: {BillId}", id);
        throw;
    }
}
    }
}

