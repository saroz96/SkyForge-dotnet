using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Dto.RetailerDto.TransactionDto;
using SkyForge.Models.Retailer.TransactionModel;

namespace SkyForge.Services.Retailer.TransactionServices
{
    public class TransactionService : ITransactionService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<TransactionService> _logger;

        public TransactionService(
            ApplicationDbContext context,
            ILogger<TransactionService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<List<TransactionResponseDto>> GetTransactionsAsync(
            Guid itemId,
            Guid accountId,
            string purchaseSalesType,
            Guid companyId,
            Guid fiscalYearId)
        {
            try
            {
                _logger.LogInformation("GetTransactionsAsync called - ItemId: {ItemId}, AccountId: {AccountId}, Type: {Type}, Company: {CompanyId}, FiscalYear: {FiscalYearId}",
                    itemId, accountId, purchaseSalesType, companyId, fiscalYearId);

                // First, get all TransactionItems matching the item
                // This gives us transaction IDs that contain the specific item
                var transactionIdsWithItem = await _context.TransactionItems
                    .Where(ti => ti.ItemId == itemId)
                    .Select(ti => ti.TransactionId)
                    .Distinct()
                    .ToListAsync();

                if (!transactionIdsWithItem.Any())
                {
                    _logger.LogInformation("No transactions found for item {ItemId}", itemId);
                    return new List<TransactionResponseDto>();
                }

                // Build the query with all filters
                IQueryable<Transaction> query = _context.Transactions
                    .Include(t => t.TransactionItems)
                        .ThenInclude(ti => ti.Unit)
                    .Include(t => t.PurchaseBill)
                    .Include(t => t.SalesBill)
                    .Include(t => t.PurchaseReturn)
                    .Include(t => t.SalesReturn)
                    .Include(t => t.Account)
                    .Where(t => t.CompanyId == companyId &&
                               t.FiscalYearId == fiscalYearId &&  // Fiscal year filter
                               t.Status == TransactionStatus.Active &&
                               t.IsActive &&
                               transactionIdsWithItem.Contains(t.Id) &&  // Must have the specific item
                               t.AccountId == accountId);  // Must have the specific account

                // Apply type-specific filters based on purchaseSalesType
                query = purchaseSalesType.ToLower() switch
                {
                    "purchase" => query.Where(t => t.Type == TransactionType.Purc &&
                                                   t.PurchaseSalesType == "Purchase"),

                    "sales" => query.Where(t => t.Type == TransactionType.Sale &&
                                                t.PurchaseSalesType == "Sales"),

                    "purchasereturn" => query.Where(t => t.Type == TransactionType.PrRt &&
                                                         t.PurchaseSalesReturnType == "PurchaseReturn"),

                    "salesreturn" => query.Where(t => t.Type == TransactionType.SlRt &&
                                                      t.PurchaseSalesReturnType == "SalesReturn"),

                    _ => query.Where(t => false)
                };

                // Apply sorting and limit
                var transactions = await query
                    .OrderByDescending(t => t.Date)
                    .ThenByDescending(t => t.BillNumber)
                    .Take(20)
                    .ToListAsync();

                _logger.LogInformation("Found {Count} transactions before filtering by specific item", transactions.Count);

                // Map to DTO - get the specific transaction item for each transaction
                var result = new List<TransactionResponseDto>();

                foreach (var transaction in transactions)
                {
                    // Find the specific transaction item that matches our itemId
                    var transactionItem = transaction.TransactionItems?
                        .FirstOrDefault(ti => ti.ItemId == itemId);

                    if (transactionItem == null) continue;  // Skip if item not found (shouldn't happen but safe)

                    // Determine bill ID and bill number based on transaction type
                    Guid? billId = null;
                    string? purchaseBillNumber = null;

                    switch (transaction.Type)
                    {
                        case TransactionType.Purc:
                            billId = transaction.PurchaseBillId;
                            purchaseBillNumber = transaction.PurchaseBill?.BillNumber;
                            break;
                        case TransactionType.PrRt:
                            billId = transaction.PurchaseReturnBillId;
                            purchaseBillNumber = transaction.PurchaseReturn?.BillNumber;
                            break;
                        case TransactionType.Sale:
                            billId = transaction.SalesBillId;
                            purchaseBillNumber = transaction.SalesBill?.BillNumber;
                            break;
                        case TransactionType.SlRt:
                            billId = transaction.SalesReturnBillId;
                            purchaseBillNumber = transaction.SalesReturn?.BillNumber;
                            break;
                    }

                    result.Add(new TransactionResponseDto
                    {
                        Id = transaction.Id,
                        Date = transaction.Date,
                        NepaliDate=transaction.nepaliDate,
                        BillNumber = transaction.BillNumber,
                        Type = transaction.Type.ToString(),
                        PurchaseSalesType = transaction.PurchaseSalesType ?? transaction.PurchaseSalesReturnType,
                        PaymentMode = transaction.PaymentMode.ToString(),
                        Quantity = transactionItem.Quantity ?? 0,
                        Bonus = transactionItem.Bonus ?? 0,
                        Price = transactionItem.Price,
                        PuPrice = transactionItem.PuPrice,
                        Amount = transactionItem.Debit + transactionItem.Credit,
                        UnitName = transactionItem.Unit?.Name ?? string.Empty,
                        BillId = billId,
                        PurchaseBillNumber = purchaseBillNumber
                    });
                }

                _logger.LogInformation("Successfully fetched {Count} transactions after mapping", result.Count);
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetTransactionsAsync");
                throw;
            }
        }

        public async Task<SalesTransactionsResponseDto> GetSalesTransactionsByItemAndAccountAsync(
                Guid itemId,
                Guid accountId,
                Guid companyId,
                Guid fiscalYearId)
        {
            try
            {
                _logger.LogInformation("GetSalesTransactionsByItemAndAccountAsync called - ItemId: {ItemId}, AccountId: {AccountId}, Company: {CompanyId}, FiscalYear: {FiscalYearId}",
                    itemId, accountId, companyId, fiscalYearId);

                // Get all TransactionItems matching the item
                var transactionIdsWithItem = await _context.TransactionItems
                    .Where(ti => ti.ItemId == itemId)
                    .Select(ti => ti.TransactionId)
                    .Distinct()
                    .ToListAsync();

                if (!transactionIdsWithItem.Any())
                {
                    _logger.LogInformation("No transactions found for item {ItemId}", itemId);
                    return new SalesTransactionsResponseDto
                    {
                        Transactions = new List<TransactionResponseDto>(),
                        Count = 0
                    };
                }

                // Build query for sales transactions
                var query = _context.Transactions
                    .Include(t => t.TransactionItems)
                        .ThenInclude(ti => ti.Unit)
                    .Include(t => t.SalesBill)
                    .Include(t => t.Account)
                    .Where(t => t.CompanyId == companyId &&
                               t.FiscalYearId == fiscalYearId &&
                               t.Status == TransactionStatus.Active &&
                               t.IsActive &&
                               t.Type == TransactionType.Sale &&
                               t.PurchaseSalesType == "Sales" &&
                               transactionIdsWithItem.Contains(t.Id) &&
                               t.AccountId == accountId);

                // Apply sorting and limit
                var transactions = await query
                    .OrderByDescending(t => t.Date)
                    .ThenByDescending(t => t.BillNumber)
                    .Take(20)
                    .ToListAsync();

                _logger.LogInformation("Found {Count} sales transactions", transactions.Count);

                // Map to DTO
                var result = new List<TransactionResponseDto>();

                foreach (var transaction in transactions)
                {
                    var transactionItem = transaction.TransactionItems?
                        .FirstOrDefault(ti => ti.ItemId == itemId);

                    if (transactionItem == null) continue;

                    result.Add(new TransactionResponseDto
                    {
                        Id = transaction.Id,
                        Date = transaction.Date,
                          NepaliDate = transaction.nepaliDate,
                        BillNumber = transaction.BillNumber,
                        Type = transaction.Type.ToString(),
                        PurchaseSalesType = transaction.PurchaseSalesType,
                        PaymentMode = transaction.PaymentMode.ToString(),
                        Quantity = transactionItem.Quantity ?? 0,
                        Bonus = transactionItem.Bonus ?? 0,
                        Price = transactionItem.Price,
                        PuPrice = transactionItem.PuPrice ?? 0,
                        Amount = transactionItem.Debit + transactionItem.Credit,
                        UnitName = transactionItem.Unit?.Name ?? string.Empty,
                        Unit = transactionItem.Unit?.Name ?? string.Empty, 
                        BillId = transaction.SalesBillId,
                        SalesBillId = transaction.SalesBillId,
                        PurchaseBillNumber = transaction.SalesBill?.BillNumber
                    });
                }

                return new SalesTransactionsResponseDto
                {
                    Transactions = result,
                    Count = result.Count
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetSalesTransactionsByItemAndAccountAsync");
                throw;
            }
        }
    }
}

