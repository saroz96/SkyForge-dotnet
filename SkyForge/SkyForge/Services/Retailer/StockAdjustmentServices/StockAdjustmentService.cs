using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Dto.RetailerDto.StockAdjustmentDto;
using SkyForge.Models.CompanyModel;
using SkyForge.Models.FiscalYearModel;
using SkyForge.Models.UserModel;
using SkyForge.Services.BillNumberServices;
using SkyForge.Dto.AccountDto;
using SkyForge.Dto.RetailerDto;
using SkyForge.Models.Retailer.StockAdjustmentModel;
using SkyForge.Models.Retailer.Items;


namespace SkyForge.Services.Retailer.StockAdjustmentServices
{
    public class StockAdjustmentService : IStockAdjustmentService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<StockAdjustmentService> _logger;
        private readonly IBillNumberService _billNumberService;

        public StockAdjustmentService(
            ApplicationDbContext context,
            ILogger<StockAdjustmentService> logger,
            IBillNumberService billNumberService)
        {
            _context = context;
            _logger = logger;
            _billNumberService = billNumberService;
        }

        public async Task<StockAdjustmentResponseDTO?> GetNewStockAdjustmentDataAsync(Guid companyId, Guid fiscalYearId, Guid userId)
        {
            try
            {
                _logger.LogInformation("GetNewStockAdjustmentDataAsync called for Company: {CompanyId}, User: {UserId}", companyId, userId);

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

                // Get categories
                var categories = await _context.Categories
                    .Where(c => c.CompanyId == companyId)
                    .Select(c => new CategoryInfoDTO
                    {
                        Id = c.Id,
                        Name = c.Name
                    })
                    .ToListAsync();

                // Date handling
                var today = DateTime.UtcNow;
                var nepaliDate = today.ToString("yyyy-MM-dd"); // You might want to use a proper Nepali date converter
                var transactionDateNepali = today.ToString("yyyy-MM-dd");
                var companyDateFormat = company.DateFormat?.ToLower() ?? "english";

                // Get user info
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

                // Prepare response
                var response = new StockAdjustmentResponseDTO
                {
                    Company = new CompanyInfoDTO
                    {
                        Id = company.Id,
                        Name = company.Name,
                        RenewalDate = company.RenewalDate,
                        DateFormat = company.DateFormat,
                        VatEnabled = company.VatEnabled
                    },
                    FiscalYear = currentFiscalYear,
                    Categories = categories,
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

                _logger.LogInformation("Successfully fetched stock adjustment data for Company: {CompanyId}", companyId);
                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetNewStockAdjustmentDataAsync for Company: {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<string> GetNextStockAdjustmentBillNumberAsync(Guid companyId, Guid fiscalYearId)
        {
            return await _billNumberService.GetNextBillNumberAsync(companyId, fiscalYearId, "stockAdjustment");
        }
        public async Task<string> GetCurrentStockAdjustmentBillNumberAsync(Guid companyId, Guid fiscalYearId)
        {
            return await _billNumberService.GetCurrentBillNumberAsync(companyId, fiscalYearId, "stockAdjustment");
        }

        // public async Task<StockAdjustment> CreateStockAdjustmentAsync(CreateStockAdjustmentDTO dto, Guid userId, Guid companyId, Guid fiscalYearId)
        // {
        //     using var transaction = await _context.Database.BeginTransactionAsync();
        //     try
        //     {
        //         _logger.LogInformation("CreateStockAdjustmentAsync started for Company: {CompanyId}, User: {UserId}", companyId, userId);

        //         // Validate company and fiscal year
        //         var company = await _context.Companies.FindAsync(companyId);
        //         if (company == null)
        //             throw new ArgumentException("Company not found");

        //         var fiscalYear = await _context.FiscalYears.FindAsync(fiscalYearId);
        //         if (fiscalYear == null || fiscalYear.CompanyId != companyId)
        //             throw new ArgumentException("Invalid fiscal year");

        //         // Parse VAT exemption
        //         bool isVatExemptBool = dto.IsVatExempt == "true" || dto.IsVatExempt == "True" || dto.IsVatExempt == "1";
        //         bool isVatAll = dto.IsVatExempt == "all";

        //         decimal discount = dto.DiscountPercentage;

        //         decimal subTotal = 0;
        //         decimal totalTaxableAmount = 0;
        //         decimal totalNonTaxableAmount = 0;
        //         bool hasVatableItems = false;
        //         bool hasNonVatableItems = false;

        //         var itemsList = new List<StockAdjustmentItem>();

        //         // Validate and process each item
        //         foreach (var itemDto in dto.Items)
        //         {
        //             var item = await _context.Items
        //                 .Include(i => i.StockEntries)
        //                 .FirstOrDefaultAsync(i => i.Id == itemDto.ItemId && i.CompanyId == companyId);

        //             if (item == null)
        //                 throw new ArgumentException($"Item not found: {itemDto.ItemId}");

        //             // Use values from DTO
        //             decimal puPrice = itemDto.PuPrice;           // Cost price from DTO (e.g., 500)
        //             decimal price = itemDto.Price;                // Selling price from DTO
        //             decimal mrp = itemDto.Mrp ?? 0;                // MRP from DTO
        //             decimal marginPercentage = itemDto.MarginPercentage ?? 0;
        //             string batchNumber = itemDto.BatchNumber ?? "XXX";
        //             DateOnly? expiryDate = itemDto.ExpiryDate.HasValue
        //                 ? DateOnly.FromDateTime(itemDto.ExpiryDate.Value)
        //                 : null;

        //             // Try to find the latest purchase bill item with the EXACT PuPrice provided
        //             var matchingPurchaseItem = await _context.PurchaseBillItems
        //                 .Include(pbi => pbi.PurchaseBill)
        //                 .Where(pbi => pbi.ItemId == itemDto.ItemId
        //                     && pbi.AltPuPrice == puPrice  // Match exactly the provided cost price (500)
        //                     && pbi.PurchaseBill.CompanyId == companyId)
        //                 .OrderByDescending(pbi => pbi.CreatedAt) // Get the most recent one
        //                 .FirstOrDefaultAsync();

        //             if (matchingPurchaseItem != null)
        //             {
        //                 // Found a purchase with matching PuPrice - restore its data
        //                 // But keep the original PuPrice from DTO since that's what we matched on
        //                 marginPercentage = matchingPurchaseItem.MarginPercentage;   // Restore margin % from purchase
        //                 mrp = matchingPurchaseItem.AltMrp ?? 0;                             // Restore MRP from purchase
        //                 price = matchingPurchaseItem.AltPrice ?? 0;                         // Restore selling price from purchase

        //                 // Also restore batch and expiry from purchase if not provided
        //                 if (string.IsNullOrEmpty(batchNumber) || batchNumber == "XXX")
        //                     batchNumber = matchingPurchaseItem.BatchNumber ?? batchNumber;

        //                 if (!expiryDate.HasValue)
        //                     expiryDate = matchingPurchaseItem.ExpiryDate;

        //                 _logger.LogInformation("Found matching purchase for item {ItemId} with PuPrice={PuPrice}: Selling Price={Price}, Margin={MarginPercentage}%, MRP={Mrp}, Batch={BatchNumber}, Expiry={ExpiryDate} from PurchaseBill: {BillNumber}",
        //                     itemDto.ItemId, puPrice, price, marginPercentage, mrp, batchNumber, expiryDate, matchingPurchaseItem.PurchaseBill?.BillNumber);
        //             }
        //             else
        //             {
        //                 _logger.LogInformation("No matching purchase found for item {ItemId} with PuPrice={PuPrice}, using provided values: Selling Price={Price}, MRP={Mrp}",
        //                     itemDto.ItemId, puPrice, price, mrp);
        //             }

        //             decimal itemTotal = price * itemDto.Quantity;
        //             subTotal += itemTotal;

        //             if (item.VatStatus?.ToLower() == "vatable")
        //             {
        //                 hasVatableItems = true;
        //                 totalTaxableAmount += itemTotal;
        //             }
        //             else
        //             {
        //                 hasNonVatableItems = true;
        //                 totalNonTaxableAmount += itemTotal;
        //             }

        //             decimal parsedQuantity = itemDto.Quantity;

        //             // Generate a unique UUID for this stock adjustment batch
        //             var uniqueUuid = Guid.NewGuid().ToString();

        //             // Handle excess adjustment
        //             if (dto.AdjustmentType == "xcess")
        //             {
        //                 // Check if batch exists with SAME ItemId, BatchNumber, AND PuPrice (cost price)
        //                 var existingBatch = await _context.StockEntries
        //                     .FirstOrDefaultAsync(e =>
        //                         e.ItemId == item.Id &&
        //                         e.BatchNumber == batchNumber &&
        //                         e.PuPrice == puPrice &&  // CRITICAL: Match exact cost price
        //                         e.FiscalYearId == fiscalYearId);

        //                 if (existingBatch != null)
        //                 {
        //                     // Update existing batch with restored values
        //                     existingBatch.Quantity += parsedQuantity;
        //                     existingBatch.Price = price;                          // Selling price (from DTO or restored)
        //                     existingBatch.PuPrice = puPrice;                       // Cost price from DTO (500)
        //                     existingBatch.Mrp = mrp;                               // MRP (from DTO or restored)
        //                     existingBatch.MarginPercentage = marginPercentage;     // Margin % (from DTO or restored)
        //                                                                            // Don't change the UniqueUuid of existing batch

        //                     _context.StockEntries.Update(existingBatch);

        //                     _logger.LogInformation("Updated existing batch for item {ItemId} with PuPrice={PuPrice}, new quantity={Quantity}, UUID={Uuid}",
        //                         item.Id, puPrice, existingBatch.Quantity, existingBatch.UniqueUuid);
        //                 }
        //                 else
        //                 {
        //                     // Create new batch with its own unique UUID
        //                     var stockEntry = new StockEntry
        //                     {
        //                         Id = Guid.NewGuid(),
        //                         ItemId = item.Id,
        //                         Date = DateTime.UtcNow,
        //                         BatchNumber = batchNumber,
        //                         ExpiryDate = expiryDate ?? DateOnly.FromDateTime(DateTime.Now.AddYears(2)),
        //                         Quantity = parsedQuantity,
        //                         Price = price,                                     // Selling price (from DTO or restored)
        //                         PuPrice = puPrice,                                  // Cost price from DTO (500)
        //                         Mrp = mrp,                                          // MRP (from DTO or restored)
        //                         MarginPercentage = marginPercentage,                // Margin % (from DTO or restored)
        //                         UniqueUuid = uniqueUuid,                            // New unique UUID for this batch
        //                         FiscalYearId = fiscalYearId
        //                     };

        //                     await _context.StockEntries.AddAsync(stockEntry);

        //                     _logger.LogInformation("Created new batch for item {ItemId} with PuPrice={PuPrice}, quantity={Quantity}, UUID={Uuid}",
        //                         item.Id, puPrice, parsedQuantity, uniqueUuid);
        //                 }
        //             }

        //             // Handle short adjustment
        //             if (dto.AdjustmentType == "short")
        //             {
        //                 decimal remainingQuantity = parsedQuantity;

        //                 // Get fresh stock entries from database - match by ItemId AND PuPrice
        //                 var stockEntries = await _context.StockEntries
        //                     .Where(e => e.ItemId == item.Id
        //                         && e.PuPrice == puPrice  // CRITICAL: Match exact cost price
        //                         && e.Quantity > 0)
        //                     .OrderBy(e => e.Date) // FIFO
        //                     .ToListAsync();

        //                 var batchesToProcess = stockEntries
        //                     .Where(e => e.BatchNumber == batchNumber)
        //                     .ToList();

        //                 // If specific UUID provided, filter by it
        //                 if (!string.IsNullOrEmpty(itemDto.UniqueUuid))
        //                 {
        //                     batchesToProcess = batchesToProcess
        //                         .Where(e => e.UniqueUuid == itemDto.UniqueUuid)
        //                         .ToList();
        //                 }

        //                 if (!batchesToProcess.Any())
        //                 {
        //                     throw new ArgumentException($"No matching batch found for item: {item.Name} with cost price: {puPrice}, batch: {batchNumber}");
        //                 }

        //                 foreach (var batch in batchesToProcess)
        //                 {
        //                     if (remainingQuantity <= 0) break;

        //                     if (batch.Quantity >= remainingQuantity)
        //                     {
        //                         batch.Quantity -= remainingQuantity;
        //                         remainingQuantity = 0;

        //                         if (batch.Quantity == 0)
        //                         {
        //                             _context.StockEntries.Remove(batch);
        //                             _logger.LogInformation("Removed batch for item {ItemId} with PuPrice={PuPrice}, UUID={Uuid} as quantity became 0",
        //                                 item.Id, puPrice, batch.UniqueUuid);
        //                         }
        //                         else
        //                         {
        //                             _context.StockEntries.Update(batch);
        //                             _logger.LogInformation("Updated batch for item {ItemId} with PuPrice={PuPrice}, new quantity={Quantity}, UUID={Uuid}",
        //                                 item.Id, puPrice, batch.Quantity, batch.UniqueUuid);
        //                         }
        //                     }
        //                     else
        //                     {
        //                         remainingQuantity -= batch.Quantity;
        //                         batch.Quantity = 0;
        //                         _context.StockEntries.Remove(batch);
        //                         _logger.LogInformation("Removed batch for item {ItemId} with PuPrice={PuPrice}, UUID={Uuid} as it was fully consumed",
        //                             item.Id, puPrice, batch.UniqueUuid);
        //                     }
        //                 }

        //                 if (remainingQuantity > 0)
        //                 {
        //                     throw new InvalidOperationException(
        //                         $"Insufficient batch stock for item: {item.Name} with cost price: {puPrice}. " +
        //                         $"Requested: {parsedQuantity}, Available in selected batch: {parsedQuantity - remainingQuantity}");
        //                 }
        //             }

        //             // Add to items list for the adjustment with restored values
        //             itemsList.Add(new StockAdjustmentItem
        //             {
        //                 Id = Guid.NewGuid(),
        //                 ItemId = itemDto.ItemId,
        //                 UnitId = itemDto.UnitId,
        //                 Quantity = parsedQuantity,
        //                 PuPrice = puPrice,                    // Cost price from DTO (500)
        //                 BatchNumber = batchNumber,             // Restored batch number
        //                 ExpiryDate = expiryDate,                // Restored expiry date
        //                 Reason = itemDto.Reason?.ToArray() ?? Array.Empty<string>(),
        //                 VatStatus = itemDto.VatStatus
        //             });
        //         }

        //         // Validate VAT consistency
        //         if (!isVatAll)
        //         {
        //             if (isVatExemptBool && hasVatableItems)
        //                 throw new InvalidOperationException("Cannot save VAT exempt adjustment with vatable items");

        //             if (!isVatExemptBool && hasNonVatableItems)
        //                 throw new InvalidOperationException("Cannot save adjustment with non-vatable items when VAT is applied");
        //         }

        //         // Calculate financials
        //         decimal discountForTaxable = (totalTaxableAmount * discount) / 100;
        //         decimal discountForNonTaxable = (totalNonTaxableAmount * discount) / 100;
        //         decimal finalTaxableAmount = totalTaxableAmount - discountForTaxable;
        //         decimal finalNonTaxableAmount = totalNonTaxableAmount - discountForNonTaxable;

        //         decimal vatAmount = (!isVatExemptBool || isVatAll)
        //             ? (finalTaxableAmount * dto.VatPercentage) / 100
        //             : 0;

        //         decimal totalAmount = finalTaxableAmount + finalNonTaxableAmount + vatAmount;

        //         // Get next bill number
        //         var billNumber = await GetNextStockAdjustmentBillNumberAsync(companyId, fiscalYearId);

        //         // Create stock adjustment
        //         var stockAdjustment = new StockAdjustment
        //         {
        //             Id = Guid.NewGuid(),
        //             BillNumber = billNumber,
        //             Note = dto.Note,
        //             AdjustmentType = dto.AdjustmentType,
        //             SubTotal = subTotal,
        //             NonVatAdjustment = finalNonTaxableAmount,
        //             TaxableAmount = finalTaxableAmount,
        //             DiscountPercentage = discount,
        //             DiscountAmount = discountForTaxable + discountForNonTaxable,
        //             VatPercentage = isVatExemptBool ? 0 : dto.VatPercentage,
        //             VatAmount = vatAmount,
        //             TotalAmount = totalAmount,
        //             IsVatExempt = isVatExemptBool,
        //             IsVatAll = isVatAll ? "all" : null,
        //             RoundOffAmount = 0,
        //             Status = "active",
        //             IsActive = true,
        //             CompanyId = companyId,
        //             UserId = userId,
        //             FiscalYearId = fiscalYearId,
        //             Date = dto.NepaliDate,
        //             NepaliDate = dto.NepaliDate,
        //             CreatedAt = DateTime.UtcNow,
        //             UpdatedAt = DateTime.UtcNow,
        //             Items = itemsList
        //         };

        //         await _context.StockAdjustments.AddAsync(stockAdjustment);

        //         // Save ALL changes at once
        //         await _context.SaveChangesAsync();

        //         await transaction.CommitAsync();

        //         _logger.LogInformation("Stock adjustment created successfully with ID: {AdjustmentId}, Number: {BillNumber}",
        //             stockAdjustment.Id, stockAdjustment.BillNumber);

        //         return stockAdjustment;
        //     }
        //     catch (Exception ex)
        //     {
        //         await transaction.RollbackAsync();
        //         _logger.LogError(ex, "Error creating stock adjustment");
        //         throw;
        //     }
        // }

        // public async Task<StockAdjustment> CreateStockAdjustmentAsync(CreateStockAdjustmentDTO dto, Guid userId, Guid companyId, Guid fiscalYearId)
        // {
        //     using var transaction = await _context.Database.BeginTransactionAsync();
        //     try
        //     {
        //         _logger.LogInformation("CreateStockAdjustmentAsync started for Company: {CompanyId}, User: {UserId}", companyId, userId);

        //         // Validate company and fiscal year
        //         var company = await _context.Companies.FindAsync(companyId);
        //         if (company == null)
        //             throw new ArgumentException("Company not found");

        //         var fiscalYear = await _context.FiscalYears.FindAsync(fiscalYearId);
        //         if (fiscalYear == null || fiscalYear.CompanyId != companyId)
        //             throw new ArgumentException("Invalid fiscal year");

        //         // Parse VAT exemption
        //         bool isVatExemptBool = dto.IsVatExempt == "true" || dto.IsVatExempt == "True" || dto.IsVatExempt == "1";
        //         bool isVatAll = dto.IsVatExempt == "all";

        //         decimal discount = dto.DiscountPercentage;

        //         decimal subTotal = 0;
        //         decimal totalTaxableAmount = 0;
        //         decimal totalNonTaxableAmount = 0;
        //         bool hasVatableItems = false;
        //         bool hasNonVatableItems = false;

        //         var itemsList = new List<StockAdjustmentItem>();

        //         // Validate and process each item
        //         foreach (var itemDto in dto.Items)
        //         {
        //             var item = await _context.Items
        //                 .Include(i => i.StockEntries)
        //                 .FirstOrDefaultAsync(i => i.Id == itemDto.ItemId && i.CompanyId == companyId);

        //             if (item == null)
        //                 throw new ArgumentException($"Item not found: {itemDto.ItemId}");

        //             // Use values from DTO
        //             decimal puPrice = itemDto.PuPrice;           // Cost price from DTO (e.g., 400)
        //             decimal price = itemDto.Price;                // Selling price from DTO
        //             decimal mrp = itemDto.Mrp ?? 0;                // MRP from DTO
        //             decimal marginPercentage = itemDto.MarginPercentage ?? 0;
        //             string batchNumber = itemDto.BatchNumber ?? "XXX";
        //             DateOnly? expiryDate = itemDto.ExpiryDate.HasValue
        //                 ? DateOnly.FromDateTime(itemDto.ExpiryDate.Value)
        //                 : null;

        //             // Try to find the latest purchase bill item with the EXACT AltPuPrice provided
        //             var matchingPurchaseItem = await _context.PurchaseBillItems
        //                 .Include(pbi => pbi.PurchaseBill)
        //                 .Where(pbi => pbi.ItemId == itemDto.ItemId
        //                     && pbi.AltPuPrice == puPrice  // Match exactly the provided cost price (400)
        //                     && pbi.PurchaseBill.CompanyId == companyId)
        //                 .OrderByDescending(pbi => pbi.CreatedAt) // Get the most recent one
        //                 .FirstOrDefaultAsync();

        //             if (matchingPurchaseItem != null)
        //             {
        //                 // Found a purchase with matching AltPuPrice - restore its data
        //                 // But keep the original PuPrice from DTO since that's what we matched on
        //                 marginPercentage = matchingPurchaseItem.MarginPercentage;   // Restore margin % from purchase
        //                 mrp = matchingPurchaseItem.AltMrp ?? 0;                     // Restore MRP from purchase
        //                 price = matchingPurchaseItem.AltPrice ?? 0;                 // Restore selling price from purchase

        //                 // Also restore batch and expiry from purchase if not provided
        //                 if (string.IsNullOrEmpty(batchNumber) || batchNumber == "XXX")
        //                     batchNumber = matchingPurchaseItem.BatchNumber ?? batchNumber;

        //                 if (!expiryDate.HasValue)
        //                     expiryDate = matchingPurchaseItem.ExpiryDate;

        //                 _logger.LogInformation("Found matching purchase for item {ItemId} with AltPuPrice={AltPuPrice}: Selling Price={Price}, Margin={MarginPercentage}%, MRP={Mrp}, Batch={BatchNumber}, Expiry={ExpiryDate} from PurchaseBill: {BillNumber}",
        //                     itemDto.ItemId, puPrice, price, marginPercentage, mrp, batchNumber, expiryDate, matchingPurchaseItem.PurchaseBill?.BillNumber);
        //             }
        //             else
        //             {
        //                 _logger.LogInformation("No matching purchase found for item {ItemId} with AltPuPrice={AltPuPrice}, using provided values: Selling Price={Price}, MRP={Mrp}",
        //                     itemDto.ItemId, puPrice, price, mrp);
        //             }

        //             decimal itemTotal = price * itemDto.Quantity;
        //             subTotal += itemTotal;

        //             if (item.VatStatus?.ToLower() == "vatable")
        //             {
        //                 hasVatableItems = true;
        //                 totalTaxableAmount += itemTotal;
        //             }
        //             else
        //             {
        //                 hasNonVatableItems = true;
        //                 totalNonTaxableAmount += itemTotal;
        //             }

        //             decimal parsedQuantity = itemDto.Quantity;

        //             // Generate a unique UUID for this stock adjustment batch (only used for new batches)
        //             var uniqueUuid = Guid.NewGuid().ToString();

        //             // Handle excess adjustment
        //             if (dto.AdjustmentType == "xcess")
        //             {
        //                 // Check if batch exists with SAME ItemId, BatchNumber, AND PuPrice (cost price)
        //                 var existingBatch = await _context.StockEntries
        //                     .FirstOrDefaultAsync(e =>
        //                         e.ItemId == item.Id &&
        //                         e.BatchNumber == batchNumber &&
        //                         e.PuPrice == puPrice &&  // CRITICAL: Match exact cost price
        //                         e.FiscalYearId == fiscalYearId);

        //                 if (existingBatch != null)
        //                 {
        //                     // CRITICAL FIX: Only update the quantity - preserve all other values!
        //                     // This prevents overwriting existing batch's selling price, MRP, margin %
        //                     decimal originalPrice = existingBatch.Price;
        //                     decimal originalMrp = existingBatch.Mrp;
        //                     decimal originalMargin = existingBatch.MarginPercentage;

        //                     existingBatch.Quantity += parsedQuantity;

        //                     // DO NOT update these fields - preserve the original values from the purchase
        //                     // existingBatch.Price = price;                          // DON'T overwrite selling price
        //                     // existingBatch.PuPrice = puPrice;                       // This is already matching
        //                     // existingBatch.Mrp = mrp;                               // DON'T overwrite MRP
        //                     // existingBatch.MarginPercentage = marginPercentage;     // DON'T overwrite margin %

        //                     _context.StockEntries.Update(existingBatch);

        //                     _logger.LogInformation("UPDATED existing batch for item {ItemId} with PuPrice={PuPrice}, new quantity={Quantity}, UUID={Uuid}. " +
        //                         "PRESERVED original Price={OriginalPrice} (was NOT overwritten with new Price={NewPrice}), " +
        //                         "Mrp={OriginalMrp}, Margin={OriginalMargin}",
        //                         item.Id, puPrice, existingBatch.Quantity, existingBatch.UniqueUuid,
        //                         originalPrice, price, originalMrp, originalMargin);
        //                 }
        //                 else
        //                 {
        //                     // Create new batch with its own unique UUID using the DTO values
        //                     var stockEntry = new StockEntry
        //                     {
        //                         Id = Guid.NewGuid(),
        //                         ItemId = item.Id,
        //                         Date = DateTime.UtcNow,
        //                         BatchNumber = batchNumber,
        //                         ExpiryDate = expiryDate ?? DateOnly.FromDateTime(DateTime.Now.AddYears(2)),
        //                         Quantity = parsedQuantity,
        //                         Price = price,                                     // Selling price from DTO (e.g., 400 for new batch)
        //                         PuPrice = puPrice,                                  // Cost price from DTO (400)
        //                         Mrp = mrp,                                          // MRP from DTO
        //                         MarginPercentage = marginPercentage,                // Margin % from DTO
        //                         UniqueUuid = uniqueUuid,                            // New unique UUID for this batch
        //                         FiscalYearId = fiscalYearId
        //                     };

        //                     await _context.StockEntries.AddAsync(stockEntry);

        //                     _logger.LogInformation("CREATED new batch for item {ItemId} with PuPrice={PuPrice}, quantity={Quantity}, UUID={Uuid}, Price={Price}, Mrp={Mrp}",
        //                         item.Id, puPrice, parsedQuantity, uniqueUuid, price, mrp);
        //                 }
        //             }

        //             // Handle short adjustment
        //             if (dto.AdjustmentType == "short")
        //             {
        //                 decimal remainingQuantity = parsedQuantity;

        //                 // Get fresh stock entries from database - match by ItemId AND PuPrice
        //                 var stockEntries = await _context.StockEntries
        //                     .Where(e => e.ItemId == item.Id
        //                         && e.PuPrice == puPrice  // CRITICAL: Match exact cost price
        //                         && e.Quantity > 0)
        //                     .OrderBy(e => e.Date) // FIFO
        //                     .ToListAsync();

        //                 var batchesToProcess = stockEntries
        //                     .Where(e => e.BatchNumber == batchNumber)
        //                     .ToList();

        //                 // If specific UUID provided, filter by it
        //                 if (!string.IsNullOrEmpty(itemDto.UniqueUuid))
        //                 {
        //                     batchesToProcess = batchesToProcess
        //                         .Where(e => e.UniqueUuid == itemDto.UniqueUuid)
        //                         .ToList();
        //                 }

        //                 if (!batchesToProcess.Any())
        //                 {
        //                     throw new ArgumentException($"No matching batch found for item: {item.Name} with cost price: {puPrice}, batch: {batchNumber}");
        //                 }

        //                 foreach (var batch in batchesToProcess)
        //                 {
        //                     if (remainingQuantity <= 0) break;

        //                     if (batch.Quantity >= remainingQuantity)
        //                     {
        //                         batch.Quantity -= remainingQuantity;
        //                         remainingQuantity = 0;

        //                         if (batch.Quantity == 0)
        //                         {
        //                             _context.StockEntries.Remove(batch);
        //                             _logger.LogInformation("Removed batch for item {ItemId} with PuPrice={PuPrice}, UUID={Uuid} as quantity became 0",
        //                                 item.Id, puPrice, batch.UniqueUuid);
        //                         }
        //                         else
        //                         {
        //                             _context.StockEntries.Update(batch);
        //                             _logger.LogInformation("Updated batch for item {ItemId} with PuPrice={PuPrice}, new quantity={Quantity}, UUID={Uuid}",
        //                                 item.Id, puPrice, batch.Quantity, batch.UniqueUuid);
        //                         }
        //                     }
        //                     else
        //                     {
        //                         remainingQuantity -= batch.Quantity;
        //                         batch.Quantity = 0;
        //                         _context.StockEntries.Remove(batch);
        //                         _logger.LogInformation("Removed batch for item {ItemId} with PuPrice={PuPrice}, UUID={Uuid} as it was fully consumed",
        //                             item.Id, puPrice, batch.UniqueUuid);
        //                     }
        //                 }

        //                 if (remainingQuantity > 0)
        //                 {
        //                     throw new InvalidOperationException(
        //                         $"Insufficient batch stock for item: {item.Name} with cost price: {puPrice}. " +
        //                         $"Requested: {parsedQuantity}, Available in selected batch: {parsedQuantity - remainingQuantity}");
        //                 }
        //             }

        //             // Add to items list for the adjustment with restored values
        //             itemsList.Add(new StockAdjustmentItem
        //             {
        //                 Id = Guid.NewGuid(),
        //                 ItemId = itemDto.ItemId,
        //                 UnitId = itemDto.UnitId,
        //                 Quantity = parsedQuantity,
        //                 PuPrice = puPrice,                    // Cost price from DTO (400)
        //                 BatchNumber = batchNumber,             // Restored batch number
        //                 ExpiryDate = expiryDate,                // Restored expiry date
        //                 Reason = itemDto.Reason?.ToArray() ?? Array.Empty<string>(),
        //                 VatStatus = itemDto.VatStatus
        //             });
        //         }

        //         // Validate VAT consistency
        //         if (!isVatAll)
        //         {
        //             if (isVatExemptBool && hasVatableItems)
        //                 throw new InvalidOperationException("Cannot save VAT exempt adjustment with vatable items");

        //             if (!isVatExemptBool && hasNonVatableItems)
        //                 throw new InvalidOperationException("Cannot save adjustment with non-vatable items when VAT is applied");
        //         }

        //         // Calculate financials
        //         decimal discountForTaxable = (totalTaxableAmount * discount) / 100;
        //         decimal discountForNonTaxable = (totalNonTaxableAmount * discount) / 100;
        //         decimal finalTaxableAmount = totalTaxableAmount - discountForTaxable;
        //         decimal finalNonTaxableAmount = totalNonTaxableAmount - discountForNonTaxable;

        //         decimal vatAmount = (!isVatExemptBool || isVatAll)
        //             ? (finalTaxableAmount * dto.VatPercentage) / 100
        //             : 0;

        //         decimal totalAmount = finalTaxableAmount + finalNonTaxableAmount + vatAmount;

        //         // Get next bill number
        //         var billNumber = await GetNextStockAdjustmentBillNumberAsync(companyId, fiscalYearId);

        //         // Create stock adjustment
        //         var stockAdjustment = new StockAdjustment
        //         {
        //             Id = Guid.NewGuid(),
        //             BillNumber = billNumber,
        //             Note = dto.Note,
        //             AdjustmentType = dto.AdjustmentType,
        //             SubTotal = subTotal,
        //             NonVatAdjustment = finalNonTaxableAmount,
        //             TaxableAmount = finalTaxableAmount,
        //             DiscountPercentage = discount,
        //             DiscountAmount = discountForTaxable + discountForNonTaxable,
        //             VatPercentage = isVatExemptBool ? 0 : dto.VatPercentage,
        //             VatAmount = vatAmount,
        //             TotalAmount = totalAmount,
        //             IsVatExempt = isVatExemptBool,
        //             IsVatAll = isVatAll ? "all" : null,
        //             RoundOffAmount = 0,
        //             Status = "active",
        //             IsActive = true,
        //             CompanyId = companyId,
        //             UserId = userId,
        //             FiscalYearId = fiscalYearId,
        //             Date = dto.NepaliDate,
        //             NepaliDate = dto.NepaliDate,
        //             CreatedAt = DateTime.UtcNow,
        //             UpdatedAt = DateTime.UtcNow,
        //             Items = itemsList
        //         };

        //         await _context.StockAdjustments.AddAsync(stockAdjustment);

        //         // Save ALL changes at once
        //         await _context.SaveChangesAsync();

        //         await transaction.CommitAsync();

        //         _logger.LogInformation("Stock adjustment created successfully with ID: {AdjustmentId}, Number: {BillNumber}",
        //             stockAdjustment.Id, stockAdjustment.BillNumber);

        //         return stockAdjustment;
        //     }
        //     catch (Exception ex)
        //     {
        //         await transaction.RollbackAsync();
        //         _logger.LogError(ex, "Error creating stock adjustment");
        //         throw;
        //     }
        // }

        public async Task<StockAdjustment> CreateStockAdjustmentAsync(CreateStockAdjustmentDTO dto, Guid userId, Guid companyId, Guid fiscalYearId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                _logger.LogInformation("CreateStockAdjustmentAsync started for Company: {CompanyId}, User: {UserId}", companyId, userId);

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

                decimal discount = dto.DiscountPercentage;

                decimal subTotal = 0;
                decimal totalTaxableAmount = 0;
                decimal totalNonTaxableAmount = 0;
                bool hasVatableItems = false;
                bool hasNonVatableItems = false;

                var itemsList = new List<StockAdjustmentItem>();

                // Validate and process each item
                foreach (var itemDto in dto.Items)
                {
                    var item = await _context.Items
                        .Include(i => i.StockEntries)
                        .FirstOrDefaultAsync(i => i.Id == itemDto.ItemId && i.CompanyId == companyId);

                    if (item == null)
                        throw new ArgumentException($"Item not found: {itemDto.ItemId}");

                    // Use values from DTO
                    decimal puPrice = itemDto.PuPrice;           // Cost price from DTO (e.g., 400)
                    decimal price = itemDto.Price;                // Selling price from DTO
                    decimal mrp = itemDto.Mrp ?? 0;                // MRP from DTO
                    decimal marginPercentage = itemDto.MarginPercentage ?? 0;
                    string batchNumber = itemDto.BatchNumber ?? "XXX";
                    DateOnly? expiryDate = itemDto.ExpiryDate.HasValue
                        ? DateOnly.FromDateTime(itemDto.ExpiryDate.Value)
                        : null;

                    // Try to find the latest purchase bill item with the EXACT AltPuPrice provided
                    var matchingPurchaseItem = await _context.PurchaseBillItems
                        .Include(pbi => pbi.PurchaseBill)
                        .Where(pbi => pbi.ItemId == itemDto.ItemId
                            && pbi.AltPuPrice == puPrice  // Match exactly the provided cost price (400)
                            && pbi.PurchaseBill.CompanyId == companyId)
                        .OrderByDescending(pbi => pbi.CreatedAt) // Get the most recent one
                        .FirstOrDefaultAsync();

                    if (matchingPurchaseItem != null)
                    {
                        // Found a purchase with matching AltPuPrice - restore its data
                        // But keep the original PuPrice from DTO since that's what we matched on
                        marginPercentage = matchingPurchaseItem.MarginPercentage;   // Restore margin % from purchase
                        mrp = matchingPurchaseItem.AltMrp ?? 0;                     // Restore MRP from purchase
                        price = matchingPurchaseItem.AltPrice ?? 0;                 // Restore selling price from purchase

                        // Also restore batch and expiry from purchase if not provided
                        if (string.IsNullOrEmpty(batchNumber) || batchNumber == "XXX")
                            batchNumber = matchingPurchaseItem.BatchNumber ?? batchNumber;

                        if (!expiryDate.HasValue)
                            expiryDate = matchingPurchaseItem.ExpiryDate;

                        _logger.LogInformation("Found matching purchase for item {ItemId} with AltPuPrice={AltPuPrice}: Selling Price={Price}, Margin={MarginPercentage}%, MRP={Mrp}, Batch={BatchNumber}, Expiry={ExpiryDate} from PurchaseBill: {BillNumber}",
                            itemDto.ItemId, puPrice, price, marginPercentage, mrp, batchNumber, expiryDate, matchingPurchaseItem.PurchaseBill?.BillNumber);
                    }
                    else
                    {
                        _logger.LogInformation("No matching purchase found for item {ItemId} with AltPuPrice={AltPuPrice}, using provided values: Selling Price={Price}, MRP={Mrp}",
                            itemDto.ItemId, puPrice, price, mrp);
                    }

                    decimal itemTotal = price * itemDto.Quantity;
                    subTotal += itemTotal;

                    if (item.VatStatus?.ToLower() == "vatable")
                    {
                        hasVatableItems = true;
                        totalTaxableAmount += itemTotal;
                    }
                    else
                    {
                        hasNonVatableItems = true;
                        totalNonTaxableAmount += itemTotal;
                    }

                    decimal parsedQuantity = itemDto.Quantity;

                    // Generate a unique UUID for this stock adjustment batch
                    var uniqueUuid = Guid.NewGuid().ToString();

                    // Handle excess adjustment - ALWAYS CREATE NEW ENTRY
                    if (dto.AdjustmentType == "xcess")
                    {
                        // ALWAYS create a new batch with its own unique UUID using the restored values
                        var stockEntry = new StockEntry
                        {
                            Id = Guid.NewGuid(),
                            ItemId = item.Id,
                            Date = DateTime.UtcNow,
                            BatchNumber = batchNumber,
                            ExpiryDate = expiryDate ?? DateOnly.FromDateTime(DateTime.Now.AddYears(2)),
                            Quantity = parsedQuantity,
                            Price = price,                                     // Restored selling price from purchase (500)
                            PuPrice = puPrice,                                  // Cost price from DTO (400)
                            Mrp = mrp,                                          // Restored MRP from purchase
                            MarginPercentage = marginPercentage,                // Restored margin % from purchase
                            UniqueUuid = uniqueUuid,                            // New unique UUID for this batch
                            FiscalYearId = fiscalYearId
                        };

                        await _context.StockEntries.AddAsync(stockEntry);

                        _logger.LogInformation("CREATED new separate batch for item {ItemId} with PuPrice={PuPrice}, quantity={Quantity}, UUID={Uuid}, " +
                            "RESTORED Price={Price}, Mrp={Mrp}, Margin={MarginPercentage}%",
                            item.Id, puPrice, parsedQuantity, uniqueUuid, price, mrp, marginPercentage);
                    }

                    // Handle short adjustment
                    if (dto.AdjustmentType == "short")
                    {
                        decimal remainingQuantity = parsedQuantity;

                        // Get fresh stock entries from database - match by ItemId AND PuPrice
                        var stockEntries = await _context.StockEntries
                            .Where(e => e.ItemId == item.Id
                                && e.PuPrice == puPrice  // CRITICAL: Match exact cost price
                                && e.Quantity > 0)
                            .OrderBy(e => e.Date) // FIFO
                            .ToListAsync();

                        var batchesToProcess = stockEntries
                            .Where(e => e.BatchNumber == batchNumber)
                            .ToList();

                        // If specific UUID provided, filter by it
                        if (!string.IsNullOrEmpty(itemDto.UniqueUuid))
                        {
                            batchesToProcess = batchesToProcess
                                .Where(e => e.UniqueUuid == itemDto.UniqueUuid)
                                .ToList();
                        }

                        if (!batchesToProcess.Any())
                        {
                            throw new ArgumentException($"No matching batch found for item: {item.Name} with cost price: {puPrice}, batch: {batchNumber}");
                        }

                        foreach (var batch in batchesToProcess)
                        {
                            if (remainingQuantity <= 0) break;

                            if (batch.Quantity >= remainingQuantity)
                            {
                                batch.Quantity -= remainingQuantity;
                                remainingQuantity = 0;

                                if (batch.Quantity == 0)
                                {
                                    _context.StockEntries.Remove(batch);
                                    _logger.LogInformation("Removed batch for item {ItemId} with PuPrice={PuPrice}, UUID={Uuid} as quantity became 0",
                                        item.Id, puPrice, batch.UniqueUuid);
                                }
                                else
                                {
                                    _context.StockEntries.Update(batch);
                                    _logger.LogInformation("Updated batch for item {ItemId} with PuPrice={PuPrice}, new quantity={Quantity}, UUID={Uuid}",
                                        item.Id, puPrice, batch.Quantity, batch.UniqueUuid);
                                }
                            }
                            else
                            {
                                remainingQuantity -= batch.Quantity;
                                batch.Quantity = 0;
                                _context.StockEntries.Remove(batch);
                                _logger.LogInformation("Removed batch for item {ItemId} with PuPrice={PuPrice}, UUID={Uuid} as it was fully consumed",
                                    item.Id, puPrice, batch.UniqueUuid);
                            }
                        }

                        if (remainingQuantity > 0)
                        {
                            throw new InvalidOperationException(
                                $"Insufficient batch stock for item: {item.Name} with cost price: {puPrice}. " +
                                $"Requested: {parsedQuantity}, Available in selected batch: {parsedQuantity - remainingQuantity}");
                        }
                    }

                    // Add to items list for the adjustment with restored values
                    itemsList.Add(new StockAdjustmentItem
                    {
                        Id = Guid.NewGuid(),
                        ItemId = itemDto.ItemId,
                        UnitId = itemDto.UnitId,
                        Quantity = parsedQuantity,
                        PuPrice = puPrice,                    // Cost price from DTO (400)
                        BatchNumber = batchNumber,             // Restored batch number
                        ExpiryDate = expiryDate,                // Restored expiry date
                        Reason = itemDto.Reason?.ToArray() ?? Array.Empty<string>(),
                        VatStatus = itemDto.VatStatus
                    });
                }

                // Validate VAT consistency
                if (!isVatAll)
                {
                    if (isVatExemptBool && hasVatableItems)
                        throw new InvalidOperationException("Cannot save VAT exempt adjustment with vatable items");

                    if (!isVatExemptBool && hasNonVatableItems)
                        throw new InvalidOperationException("Cannot save adjustment with non-vatable items when VAT is applied");
                }

                // Calculate financials
                decimal discountForTaxable = (totalTaxableAmount * discount) / 100;
                decimal discountForNonTaxable = (totalNonTaxableAmount * discount) / 100;
                decimal finalTaxableAmount = totalTaxableAmount - discountForTaxable;
                decimal finalNonTaxableAmount = totalNonTaxableAmount - discountForNonTaxable;

                decimal vatAmount = (!isVatExemptBool || isVatAll)
                    ? (finalTaxableAmount * dto.VatPercentage) / 100
                    : 0;

                decimal totalAmount = finalTaxableAmount + finalNonTaxableAmount + vatAmount;

                // Get next bill number
                var billNumber = await GetNextStockAdjustmentBillNumberAsync(companyId, fiscalYearId);

                // Create stock adjustment
                var stockAdjustment = new StockAdjustment
                {
                    Id = Guid.NewGuid(),
                    BillNumber = billNumber,
                    Note = dto.Note,
                    AdjustmentType = dto.AdjustmentType,
                    SubTotal = subTotal,
                    NonVatAdjustment = finalNonTaxableAmount,
                    TaxableAmount = finalTaxableAmount,
                    DiscountPercentage = discount,
                    DiscountAmount = discountForTaxable + discountForNonTaxable,
                    VatPercentage = isVatExemptBool ? 0 : dto.VatPercentage,
                    VatAmount = vatAmount,
                    TotalAmount = totalAmount,
                    IsVatExempt = isVatExemptBool,
                    IsVatAll = isVatAll ? "all" : null,
                    RoundOffAmount = 0,
                    Status = "active",
                    IsActive = true,
                    CompanyId = companyId,
                    UserId = userId,
                    FiscalYearId = fiscalYearId,
                    Date = dto.NepaliDate,
                    NepaliDate = dto.NepaliDate,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    Items = itemsList
                };

                await _context.StockAdjustments.AddAsync(stockAdjustment);

                // Save ALL changes at once
                await _context.SaveChangesAsync();

                await transaction.CommitAsync();

                _logger.LogInformation("Stock adjustment created successfully with ID: {AdjustmentId}, Number: {BillNumber}",
                    stockAdjustment.Id, stockAdjustment.BillNumber);

                return stockAdjustment;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Error creating stock adjustment");
                throw;
            }
        }
        public async Task<StockAdjustmentsRegisterDataDTO> GetStockAdjustmentsRegisterAsync(Guid companyId, Guid fiscalYearId, string? fromDate = null, string? toDate = null)
        {
            try
            {
                _logger.LogInformation("GetStockAdjustmentsRegisterAsync called with companyId: {CompanyId}, fiscalYearId: {FiscalYearId}, fromDate: {FromDate}, toDate: {ToDate}",
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

                // Get current Nepali date
                var today = DateTime.UtcNow;
                var nepaliDate = today.ToString("yyyy-MM-dd"); // You might want to use a proper Nepali date converter here

                // If no date range provided, return basic info without adjustments
                if (string.IsNullOrEmpty(fromDate) || string.IsNullOrEmpty(toDate))
                {
                    // Get all items for the dropdown
                    var items = await _context.Items
                        .Where(i => i.CompanyId == companyId)
                        .Select(i => new ItemInfoDTO
                        {
                            Id = i.Id,
                            Name = i.Name,
                            VatStatus = i.VatStatus ?? "vatable"
                        })
                        .ToListAsync();

                    return new StockAdjustmentsRegisterDataDTO
                    {
                        Company = company,
                        CurrentFiscalYear = fiscalYear,
                        StockAdjustments = new List<StockAdjustmentItemDetailDTO>(),
                        Items = items,
                        FromDate = fromDate,
                        ToDate = toDate,
                        CurrentCompanyName = company.Name,
                        CompanyDateFormat = company.DateFormat,
                        NepaliDate = nepaliDate,
                        UserPreferences = new UserPreferencesDTO { Theme = "light" }
                    };
                }

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

                _logger.LogInformation("Searching for stock adjustments between {StartDate} and {EndDate} using {DateFormat} format",
                    startDateTime, endDateTime, isNepaliFormat ? "Nepali" : "English");

                // Build query for stock adjustments
                var query = _context.StockAdjustments
                    .Include(sa => sa.Company)
                    .Include(sa => sa.User)
                    .Include(sa => sa.FiscalYear)
                    .Include(sa => sa.Items)
                        .ThenInclude(i => i.Item)
                    .Include(sa => sa.Items)
                        .ThenInclude(i => i.Unit)
                    .Where(sa => sa.CompanyId == companyId &&
                                sa.FiscalYearId == fiscalYearId);

                // Apply date filter based on company's date format
                if (isNepaliFormat)
                {
                    // Use NepaliDate field for filtering
                    query = query.Where(sa => sa.NepaliDate >= startDateTime && sa.NepaliDate <= endDateTime);
                    _logger.LogInformation("Using NepaliDate field for filtering");
                }
                else
                {
                    // Use Date field for filtering
                    query = query.Where(sa => sa.Date >= startDateTime && sa.Date <= endDateTime);
                    _logger.LogInformation("Using Date field for filtering");
                }

                // Log the SQL query (optional - for debugging)
                var sql = query.ToQueryString();
                _logger.LogDebug("SQL Query: {Sql}", sql);

                // Get adjustments ordered by date and bill number
                var stockAdjustments = await query
                    .OrderBy(sa => sa.Date)
                    .ThenBy(sa => sa.BillNumber)
                    .ToListAsync();

                _logger.LogInformation("Found {Count} stock adjustments matching the criteria", stockAdjustments.Count);

                // Map to flattened item details (matching Express.js structure)
                var itemDetails = new List<StockAdjustmentItemDetailDTO>();

                foreach (var adjustment in stockAdjustments)
                {
                    foreach (var item in adjustment.Items)
                    {
                        itemDetails.Add(new StockAdjustmentItemDetailDTO
                        {
                            Date = adjustment.Date,
                            NepaliDate = adjustment.NepaliDate,
                            BillNumber = adjustment.BillNumber,
                            ItemId = item.ItemId,
                            ItemName = item.Item?.Name ?? "N/A",
                            Quantity = item.Quantity,
                            UnitId = item.UnitId,
                            UnitName = item.Unit?.Name ?? "N/A",
                            PuPrice = item.PuPrice,
                            AdjustmentType = adjustment.AdjustmentType,
                            Reason = string.Join(" ", item.Reason ?? Array.Empty<string>()),
                            VatStatus = item.VatStatus,
                            UserId = adjustment.UserId,
                            UserName = adjustment.User?.Name ?? "N/A",
                            AdjustmentId = adjustment.Id,
                            Note = adjustment.Note
                        });
                    }
                }

                // Get all items for the dropdown
                var allItems = await _context.Items
                    .Where(i => i.CompanyId == companyId)
                    .Select(i => new ItemInfoDTO
                    {
                        Id = i.Id,
                        Name = i.Name,
                        VatStatus = i.VatStatus ?? "vatable"
                    })
                    .ToListAsync();

                return new StockAdjustmentsRegisterDataDTO
                {
                    Company = company,
                    CurrentFiscalYear = fiscalYear,
                    StockAdjustments = itemDetails,
                    Items = allItems,
                    FromDate = fromDate,
                    ToDate = toDate,
                    CurrentCompanyName = company.Name,
                    CompanyDateFormat = company.DateFormat,
                    NepaliDate = nepaliDate,
                    UserPreferences = new UserPreferencesDTO { Theme = "light" }
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting stock adjustments register for company {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<StockAdjustmentsEntryDataDTO> GetStockAdjustmentsRegisterEntryDataAsync(Guid companyId, Guid fiscalYearId, Guid userId)
        {
            try
            {
                _logger.LogInformation("GetStockAdjustmentsRegisterEntryDataAsync called for Company: {CompanyId}, FiscalYear: {FiscalYearId}, User: {UserId}",
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

                // Get all items
                var items = await _context.Items
                    .Where(i => i.CompanyId == companyId)
                    .Select(i => new ItemInfoDTO
                    {
                        Id = i.Id,
                        Name = i.Name,
                        VatStatus = i.VatStatus ?? "vatable",
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

                // Get current Nepali date
                var today = DateTime.UtcNow;
                var nepaliDate = today.ToString("yyyy-MM-dd"); // You might want to use a proper Nepali date converter here

                // Create the response
                var data = new StockAdjustmentsEntryDataDTO
                {
                    Company = company,
                    Items = items,
                    Categories = categories,
                    Units = units,
                    Dates = new DateInfoDTO
                    {
                        NepaliDate = nepaliDate,
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

                _logger.LogInformation("Successfully retrieved stock adjustments entry data for company {CompanyName}", company.Name);

                return data;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting stock adjustments entry data for company {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<StockAdjustmentPrintDTO> GetStockAdjustmentForPrintAsync(Guid id, Guid companyId, Guid userId, Guid fiscalYearId)
        {
            try
            {
                _logger.LogInformation("GetStockAdjustmentForPrintAsync called for Adjustment ID: {AdjustmentId}, Company: {CompanyId}", id, companyId);

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


                // Get the stock adjustment with all related data
                var stockAdjustment = await _context.StockAdjustments
                    .Include(sa => sa.User)
                    .Include(sa => sa.Items)
                        .ThenInclude(i => i.Item)
                    .Include(sa => sa.Items)
                        .ThenInclude(i => i.Unit)
                    .FirstOrDefaultAsync(sa => sa.Id == id && sa.CompanyId == companyId);

                if (stockAdjustment == null)
                    throw new ArgumentException("Stock adjustment not found");

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

                // Calculate totals
                var totals = stockAdjustment.Items.Aggregate(
                    new { TotalQuantity = 0m, TotalValue = 0m },
                    (acc, item) => new
                    {
                        TotalQuantity = acc.TotalQuantity + (item.Quantity),
                        TotalValue = acc.TotalValue + (item.Quantity * item.PuPrice)
                    });

                // Map to response DTO
                var response = new StockAdjustmentPrintDTO
                {
                    Company = company,
                    CurrentFiscalYear = currentFiscalYear,
                    Adjustment = new StockAdjustmentPrintAdjustmentDTO
                    {
                        Id = stockAdjustment.Id,
                        BillNumber = stockAdjustment.BillNumber,
                        Note = stockAdjustment.Note,
                        AdjustmentType = stockAdjustment.AdjustmentType,
                        Status = stockAdjustment.Status,
                        IsActive = stockAdjustment.IsActive,
                        Date = isNepaliFormat ? stockAdjustment.NepaliDate : stockAdjustment.Date,
                        NepaliDate = stockAdjustment.NepaliDate,
                        EnglishDate = stockAdjustment.Date,
                        SubTotal = stockAdjustment.SubTotal,
                        NonVatAdjustment = stockAdjustment.NonVatAdjustment,
                        TaxableAmount = stockAdjustment.TaxableAmount,
                        DiscountPercentage = stockAdjustment.DiscountPercentage,
                        DiscountAmount = stockAdjustment.DiscountAmount,
                        VatPercentage = stockAdjustment.VatPercentage,
                        VatAmount = stockAdjustment.VatAmount,
                        TotalAmount = stockAdjustment.TotalAmount,
                        IsVatExempt = stockAdjustment.IsVatExempt,
                        IsVatAll = stockAdjustment.IsVatAll,
                        RoundOffAmount = stockAdjustment.RoundOffAmount,
                        User = stockAdjustment.User != null ? new UserPrintDTO
                        {
                            Id = stockAdjustment.User.Id,
                            Name = stockAdjustment.User.Name,
                            IsAdmin = stockAdjustment.User.IsAdmin,
                            Role = stockAdjustment.User.UserRoles?
                                .FirstOrDefault(ur => ur.IsPrimary)?.Role?.Name ?? "User"
                        } : null,
                        Items = stockAdjustment.Items.Select(i => new StockAdjustmentItemPrintDTO
                        {
                            Id = i.Id,
                            ItemId = i.ItemId,
                            ItemName = i.Item?.Name,
                            Hscode = i.Item?.Hscode,
                            UniqueNumber = i.Item?.UniqueNumber ?? 0,
                            UnitId = i.UnitId,
                            UnitName = i.Unit?.Name,
                            Quantity = i.Quantity,
                            PuPrice = i.PuPrice,
                            BatchNumber = i.BatchNumber,
                            ExpiryDate = i.ExpiryDate,
                            Reason = i.Reason,
                            VatStatus = i.VatStatus ?? "vatable"
                        }).ToList()
                    },
                    Totals = new StockAdjustmentTotalsDTO
                    {
                        TotalQuantity = totals.TotalQuantity,
                        TotalValue = totals.TotalValue
                    },
                    CurrentCompanyName = currentCompany?.Name ?? string.Empty,
                    CurrentCompany = currentCompany ?? new CompanyPrintInfoDTO(),
                    NepaliDate = stockAdjustment.NepaliDate.ToString("yyyy-MM-dd"),
                    EnglishDate = stockAdjustment.Date,
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
                _logger.LogError(ex, "Error getting stock adjustment for print: {AdjustmentId}", id);
                throw;
            }
        }

    }
}