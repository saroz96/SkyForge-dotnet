using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Dto.RetailerDto.TransactionDto;
using SkyForge.Models.AccountModel;
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
                        // NepaliDate=transaction.nepaliDate,
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
                        //   NepaliDate = transaction.nepaliDate,
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


        public async Task<PartyTurnoverResponseDto> GetPartyTurnoverAsync(
            Guid companyId,
            Guid fiscalYearId,
            PartyTurnoverRequestDto request)
        {
            try
            {
                _logger.LogInformation("GetPartyTurnoverAsync called - CompanyId: {CompanyId}, Amount: {Amount}, Type: {Type}, FromDate: {FromDate}, ToDate: {ToDate}",
                    companyId, request.Amount, request.TransactionType, request.FromDate, request.ToDate);

                // Validate request
                if (request.Amount <= 0)
                {
                    return new PartyTurnoverResponseDto
                    {
                        Success = false,
                        Error = "Amount must be greater than 0"
                    };
                }

                // Get all party accounts (Sundry Debtors, Sundry Creditors, Customers, Suppliers)
                var partyAccounts = await GetPartyAccountsAsync(companyId);

                if (!partyAccounts.Any())
                {
                    return new PartyTurnoverResponseDto
                    {
                        Success = true,
                        Data = new PartyTurnoverAllDataDto
                        {
                            ThresholdAmount = request.Amount,
                            TransactionType = request.TransactionType,
                            Parties = new List<PartyTurnoverPartyDto>(),
                            Summary = new PartyTurnoverSummaryDto(),
                            GeneratedDate = DateTime.UtcNow,
                            GeneratedDateNepali = GetCurrentNepaliDate()
                        }
                    };
                }

                // Get party IDs
                List<Guid> partyIds = partyAccounts.Select(a => a.Id).ToList();

                // Build transaction query - using AD dates for filtering
                var query = BuildTurnoverQuery(companyId, fiscalYearId, request, partyIds);

                // Get all transactions with related data
                var transactions = await query
                    .Include(t => t.TransactionItems)
                        .ThenInclude(ti => ti.Item)
                    .Include(t => t.TransactionItems)
                        .ThenInclude(ti => ti.Unit)
                    .Include(t => t.Account)
                    .Include(t => t.PaymentAccount)
                    .Include(t => t.ReceiptAccount)
                    .Include(t => t.DebitAccount)
                    .Include(t => t.CreditAccount)
                    .OrderByDescending(t => t.Date)  // AD date for sorting
                    .ThenByDescending(t => t.CreatedAt)
                    .ToListAsync();

                // Group transactions by party and calculate turnover
                var partiesWithTurnover = CalculatePartyTurnover(
                    partyAccounts,
                    transactions,
                    request.TransactionType,
                    request.Amount);

                // Calculate summary
                var summary = CalculateSummary(partiesWithTurnover);

                var nepaliDate = GetCurrentNepaliDate();

                return new PartyTurnoverResponseDto
                {
                    Success = true,
                    Data = new PartyTurnoverAllDataDto
                    {
                        ThresholdAmount = request.Amount,
                        TransactionType = request.TransactionType,
                        Parties = partiesWithTurnover,
                        Summary = summary,
                        GeneratedDate = DateTime.UtcNow,
                        GeneratedDateNepali = nepaliDate
                    }
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetPartyTurnoverAsync");
                return new PartyTurnoverResponseDto
                {
                    Success = false,
                    Error = "An error occurred while fetching party turnover"
                };
            }
        }

        private async Task<List<Account>> GetPartyAccountsAsync(Guid companyId)
        {
            return await _context.Accounts
                .Include(a => a.AccountGroup)
                .Where(a => a.CompanyId == companyId &&
                           a.IsActive &&
                           (a.AccountGroup != null &&
                            (a.AccountGroup.Name == "Sundry Debtors" ||
                             a.AccountGroup.Name == "Sundry Creditors" ||
                             a.AccountGroup.Name == "Customers" ||
                             a.AccountGroup.Name == "Suppliers")))
                .OrderBy(a => a.Name)
                .ToListAsync();
        }

        private IQueryable<Transaction> BuildTurnoverQuery(
            Guid companyId,
            Guid fiscalYearId,
            PartyTurnoverRequestDto request,
            List<Guid> partyIds)
        {
            // Start with base query
            var query = _context.Transactions
                .Where(t => t.CompanyId == companyId &&
                           t.FiscalYearId == fiscalYearId &&
                           t.IsActive &&
                           t.Status == TransactionStatus.Active &&
                           t.AccountId.HasValue &&
                           partyIds.Contains(t.AccountId.Value));

            // Filter by transaction type (Sale or Purchase)
            if (request.TransactionType?.ToLower() == "sales")
            {
                query = query.Where(t => t.Type == TransactionType.Sale ||
                                        t.Type == TransactionType.SlRt);
            }
            else if (request.TransactionType?.ToLower() == "purchase")
            {
                query = query.Where(t => t.Type == TransactionType.Purc ||
                                        t.Type == TransactionType.PrRt);
            }
            else
            {
                // Default to sales if not specified
                query = query.Where(t => t.Type == TransactionType.Sale ||
                                        t.Type == TransactionType.SlRt);
            }

            // Date filtering using AD dates (Date property)
            if (request.FromDate.HasValue)
            {
                var fromDateOnly = request.FromDate.Value.Date;
                query = query.Where(t => t.Date.Date >= fromDateOnly);
            }

            if (request.ToDate.HasValue)
            {
                var toDateOnly = request.ToDate.Value.Date;
                query = query.Where(t => t.Date.Date <= toDateOnly);
            }

            // Payment mode filtering
            if (!string.IsNullOrEmpty(request.PaymentMode))
            {
                if (request.PaymentMode == "exclude-cash")
                {
                    query = query.Where(t => t.PaymentMode != PaymentMode.Cash);
                }
                else if (request.PaymentMode != "all")
                {
                    var paymentMode = ParsePaymentMode(request.PaymentMode);
                    query = query.Where(t => t.PaymentMode == paymentMode);
                }
            }

            return query;
        }

        private List<PartyTurnoverPartyDto> CalculatePartyTurnover(
            List<Account> partyAccounts,
            List<Transaction> transactions,
            string transactionType,
            decimal thresholdAmount)
        {
            var result = new List<PartyTurnoverPartyDto>();

            // Group transactions by account
            var groupedTransactions = transactions
                .GroupBy(t => t.AccountId)
                .ToDictionary(g => g.Key, g => g.ToList());

            foreach (var account in partyAccounts)
            {
                if (!groupedTransactions.TryGetValue(account.Id, out var accountTransactions))
                    continue;

                // Calculate total amount based on transaction type
                decimal totalAmount = 0;
                var transactionDetails = new List<PartyTurnoverTransactionDto>();

                foreach (var tx in accountTransactions)
                {
                    // Use TotalDebit for Sales, TotalCredit for Purchase
                    decimal amount = transactionType.ToLower() == "sales"
                        ? tx.TotalDebit
                        : tx.TotalCredit;

                    totalAmount += amount;

                    // Calculate VAT from items
                    decimal vatAmount = tx.TransactionItems?
                        .Where(ti => ti.VatAmount.HasValue)
                        .Sum(ti => ti.VatAmount.Value) ?? 0;

                    transactionDetails.Add(new PartyTurnoverTransactionDto
                    {
                        Id = tx.Id,
                        Date = tx.Date,  // AD date
                        NepaliDate = tx.NepaliDate,  // BS date for display
                        BillNumber = tx.BillNumber,
                        PartyBillNumber = tx.PartyBillNumber,
                        TransactionType = tx.Type.ToString(),
                        PaymentMode = tx.PaymentMode.ToString(),
                        TotalAmount = amount,
                        TotalDebit = tx.TotalDebit,
                        TotalCredit = tx.TotalCredit,
                        VatAmount = vatAmount,
                        InstrumentType = tx.InstType.ToString(),
                        InstrumentNumber = tx.InstNo,
                        Items = tx.TransactionItems?.Select(ti => new PartyTurnoverItemDto
                        {
                            ItemId = ti.ItemId,
                            ItemName = ti.Item != null ? ti.Item.Name : null,
                            ItemCode = ti.Item != null ? ti.Item.UniqueNumber.ToString() : null,
                            Quantity = ti.Quantity,
                            UnitName = ti.Unit != null ? ti.Unit.Name : null,
                            Price = ti.Price,
                            PuPrice = ti.PuPrice,
                            TotalAmount = ti.Debit + ti.Credit,
                            DiscountAmount = ti.DiscountAmountPerItem,
                            VatAmount = ti.VatAmount
                        }).ToList() ?? new List<PartyTurnoverItemDto>()
                    });
                }

                // Only include if total amount meets threshold
                if (totalAmount < thresholdAmount)
                    continue;

                var amounts = transactionDetails.Select(t => t.TotalAmount).ToList();

                result.Add(new PartyTurnoverPartyDto
                {
                    PartyId = account.Id,
                    PartyName = account.Name,
                    Pan = account.Pan,
                    Phone = account.Phone,
                    Address = account.Address,
                    AccountGroup = account.AccountGroup?.Name,
                    TransactionCount = transactionDetails.Count,
                    TotalAmount = totalAmount,
                    AverageAmount = transactionDetails.Any() ? totalAmount / transactionDetails.Count : 0,
                    MinAmount = amounts.Any() ? amounts.Min() : 0,
                    MaxAmount = amounts.Any() ? amounts.Max() : 0,
                    Transactions = transactionDetails
                        .OrderByDescending(t => t.Date)  // Sort by AD date
                        .Take(10) // Show last 10 transactions for each party
                        .ToList()
                });
            }

            // Sort by total amount descending (highest turnover first)
            return result.OrderByDescending(p => p.TotalAmount).ToList();
        }

        private PartyTurnoverSummaryDto CalculateSummary(List<PartyTurnoverPartyDto> parties)
        {
            if (!parties.Any())
            {
                return new PartyTurnoverSummaryDto();
            }

            var totalTransactions = parties.Sum(p => p.TransactionCount);
            var totalAmount = parties.Sum(p => p.TotalAmount);
            var totalVat = parties.Sum(p => p.Transactions.Sum(t => t.VatAmount));

            var allAmounts = parties.SelectMany(p => p.Transactions.Select(t => t.TotalAmount)).ToList();

            return new PartyTurnoverSummaryDto
            {
                TotalParties = parties.Count,
                TotalTransactions = totalTransactions,
                TotalAmount = totalAmount,
                TotalVatAmount = totalVat,
                AverageTransactionAmount = totalTransactions > 0 ? totalAmount / totalTransactions : 0,
                MinTransactionAmount = allAmounts.Any() ? allAmounts.Min() : 0,
                MaxTransactionAmount = allAmounts.Any() ? allAmounts.Max() : 0,
                FirstTransactionDate = parties.SelectMany(p => p.Transactions).Min(t => t.Date),  // AD date
                LastTransactionDate = parties.SelectMany(p => p.Transactions).Max(t => t.Date)   // AD date
            };
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
                _ => PaymentMode.Credit
            };
        }

        private string GetCurrentNepaliDate()
        {
            // TODO: Implement proper Nepali date conversion
            return DateTime.UtcNow.ToString("yyyy-MM-dd");
        }
    }
}

