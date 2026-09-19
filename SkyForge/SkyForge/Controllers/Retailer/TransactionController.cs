using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Models.Shared;
using SkyForge.Services.Retailer.TransactionServices;
using SkyForge.Dto.RetailerDto.TransactionDto;
using System.Security.Claims;
using SkyForge.Models.CompanyModel;
using SkyForge.Models.Retailer.TransactionModel;

namespace SkyForge.Controllers.Retailer
{
    [ApiController]
    [Route("api/retailer")]
    [Authorize]
    public class TransactionController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<TransactionController> _logger;
        private readonly ITransactionService _transactionService;

        public TransactionController(
            ApplicationDbContext context,
            ILogger<TransactionController> logger,
            ITransactionService transactionService)
        {
            _context = context;
            _logger = logger;
            _transactionService = transactionService;
        }

        /// <summary>
        /// GET: api/retailer/transactions/{itemId}/{accountId}/{purchaseSalesType}
        /// Fetches transactions filtered by item, account, and purchase/sales type
        /// </summary>
        [HttpGet("transactions/{itemId}/{accountId}/{purchaseSalesType}")]
        public async Task<IActionResult> GetTransactions(
            Guid itemId,
            Guid accountId,
            string purchaseSalesType)
        {
            try
            {
                _logger.LogInformation("=== GetTransactions Started ===");
                _logger.LogInformation("Parameters - ItemId: {ItemId}, AccountId: {AccountId}, PurchaseSalesType: {PurchaseSalesType}",
                    itemId, accountId, purchaseSalesType);

                // Extract claims from JWT
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                // Validate user ID
                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                {
                    return Unauthorized(new
                    {
                        success = false,
                        error = "Invalid user token. Please login again."
                    });
                }

                // Validate company ID
                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "No company selected. Please select a company first."
                    });
                }

                // Handle fiscal year - get from claims first, then fallback
                Guid fiscalYearIdGuid;
                if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
                {
                    // If not in claims, get active fiscal year for the company
                    var activeFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

                    if (activeFiscalYear == null)
                    {
                        return BadRequest(new
                        {
                            success = false,
                            error = "No active fiscal year found for this company."
                        });
                    }
                    fiscalYearIdGuid = activeFiscalYear.Id;
                }

                // Check trade type - only retailer has access
                if (string.IsNullOrEmpty(tradeTypeClaim) ||
                    !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) ||
                    tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new
                    {
                        success = false,
                        error = "Access denied for this trade type"
                    });
                }

                // Fetch settings (without fiscal year filter as per original Node.js code)
                var settings = await _context.CompanySettings
                    .Where(s => s.CompanyId == companyIdGuid && s.UserId == userIdGuid)
                    .Select(s => new
                    {
                        s.DisplayTransactions,
                        s.DisplayTransactionsForPurchase,
                        s.DisplayTransactionsForSalesReturn,
                        s.DisplayTransactionsForPurchaseReturn
                    })
                    .FirstOrDefaultAsync();

                // Get company date format
                var company = await _context.Companies
                    .Where(c => c.Id == companyIdGuid)
                    .Select(c => c.DateFormat)
                    .FirstOrDefaultAsync();

                var companyDateFormat = company?.ToString()?.ToLower() ?? "english";

                if (settings == null)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "User settings not found"
                    });
                }

                // Specific checks for transaction types
                var displayConditions = new Dictionary<string, bool>
                {
                    { "Sales", settings.DisplayTransactions },
                    { "Purchase", settings.DisplayTransactionsForPurchase },
                    { "SalesReturn", settings.DisplayTransactionsForSalesReturn },
                    { "PurchaseReturn", settings.DisplayTransactionsForPurchaseReturn }
                };

                if (!displayConditions.ContainsKey(purchaseSalesType) || !displayConditions[purchaseSalesType])
                {
                    var nepaliDate = GetCurrentNepaliDate();

                    return Ok(new
                    {
                        success = true,
                        data = new
                        {
                            transactions = new List<object>(),
                            dateFormat = companyDateFormat,
                            nepaliDate = nepaliDate,
                            displayEnabled = false
                        },
                        message = "Transaction display is disabled for this type"
                    });
                }

                // Fetch transactions with optimized query including fiscal year
                var transactions = await _transactionService.GetTransactionsAsync(
                    itemId,
                    accountId,
                    purchaseSalesType,
                    companyIdGuid,
                    fiscalYearIdGuid);  // Pass fiscal year

                var currentNepaliDate = GetCurrentNepaliDate();

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        transactions = transactions,
                        dateFormat = companyDateFormat,
                        nepaliDate = currentNepaliDate,
                        displayEnabled = true
                    },
                    message = "Transactions fetched successfully"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching transactions");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error",
                    message = ex.Message
                });
            }
        }


        /// <summary>
        /// GET: api/retailer/transactions/sales-by-item-account
        /// Fetches sales transactions filtered by item and account
        /// </summary>
        [HttpGet("transactions/sales-by-item-account")]
        public async Task<IActionResult> GetSalesTransactionsByItemAndAccount(
            [FromQuery] Guid itemId,
            [FromQuery] Guid accountId)
        {
            try
            {
                _logger.LogInformation("=== GetSalesTransactionsByItemAndAccount Started ===");
                _logger.LogInformation("Parameters - ItemId: {ItemId}, AccountId: {AccountId}", itemId, accountId);

                // Validate required parameters
                if (itemId == Guid.Empty || accountId == Guid.Empty)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "Both itemId and accountId are required",
                        data = (object?)null
                    });
                }

                // Extract claims from JWT
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                // Validate user ID
                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                {
                    return Unauthorized(new
                    {
                        success = false,
                        error = "Invalid user token. Please login again."
                    });
                }

                // Validate company ID
                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "No company selected. Please select a company first."
                    });
                }

                // Handle fiscal year
                Guid fiscalYearIdGuid;
                if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
                {
                    var activeFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

                    if (activeFiscalYear == null)
                    {
                        return BadRequest(new
                        {
                            success = false,
                            error = "No active fiscal year found for this company."
                        });
                    }
                    fiscalYearIdGuid = activeFiscalYear.Id;
                }

                // Check trade type
                if (string.IsNullOrEmpty(tradeTypeClaim) ||
                    !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) ||
                    tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new
                    {
                        success = false,
                        message = "Access denied for this trade type",
                        data = (object?)null
                    });
                }

                // Fetch sales transactions
                var result = await _transactionService.GetSalesTransactionsByItemAndAccountAsync(
                    itemId,
                    accountId,
                    companyIdGuid,
                    fiscalYearIdGuid);

                if (result.Transactions != null && result.Transactions.Count > 0)
                {
                    return Ok(new
                    {
                        success = true,
                        message = "Transactions retrieved successfully",
                        data = new
                        {
                            transactions = result.Transactions,
                            count = result.Count
                        }
                    });
                }
                else
                {
                    return Ok(new
                    {
                        success = true,
                        message = "No transactions found for the specified criteria",
                        data = new
                        {
                            transactions = new List<TransactionResponseDto>(),
                            count = 0
                        }
                    });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching sales transactions");
                return StatusCode(500, new
                {
                    success = false,
                    message = "Internal server error",
                    data = (object?)null,
                    error = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        /// <summary>
        /// GET: api/retailer/transactions/purchase-by-item-account
        /// Fetches purchase transactions filtered by item and account
        /// </summary>
        [HttpGet("transactions/purchase-by-item-account")]
        public async Task<IActionResult> GetPurchaseTransactionsByItemAndAccount(
            [FromQuery] Guid itemId,
            [FromQuery] Guid accountId)
        {
            try
            {
                _logger.LogInformation("=== GetPurchaseTransactionsByItemAndAccount Started ===");
                _logger.LogInformation("Parameters - ItemId: {ItemId}, AccountId: {AccountId}", itemId, accountId);

                if (itemId == Guid.Empty || accountId == Guid.Empty)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "Both itemId and accountId are required",
                        data = (object?)null
                    });
                }

                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new { success = false, error = "No company selected." });
                }

                Guid fiscalYearIdGuid;
                if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
                {
                    var activeFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);
                    if (activeFiscalYear == null)
                    {
                        return BadRequest(new { success = false, error = "No active fiscal year found." });
                    }
                    fiscalYearIdGuid = activeFiscalYear.Id;
                }

                if (string.IsNullOrEmpty(tradeTypeClaim) ||
                    !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) ||
                    tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new { success = false, message = "Access denied for this trade type" });
                }

                // Fetch purchase transactions using the existing method
                var transactions = await _transactionService.GetTransactionsAsync(
                    itemId,
                    accountId,
                    "Purchase",
                    companyIdGuid,
                    fiscalYearIdGuid);

                return Ok(new
                {
                    success = true,
                    message = transactions.Any() ? "Transactions retrieved successfully" : "No transactions found",
                    data = new
                    {
                        transactions = transactions,
                        count = transactions.Count
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching purchase transactions");
                return StatusCode(500, new
                {
                    success = false,
                    message = "Internal server error",
                    data = (object?)null
                });
            }
        }

        private string GetCurrentNepaliDate()
        {
            // TODO: Implement proper Nepali date conversion
            return DateTime.UtcNow.ToString("yyyy-MM-dd");
        }

        [HttpGet("cash-transactions")]
        public async Task<IActionResult> GetCashTransactions(
[FromQuery] string fromDate,
[FromQuery] string toDate,
[FromQuery] Guid? accountId = null)
        {
            try
            {
                _logger.LogInformation("=== GetCashTransactions Started ===");

                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                    return BadRequest(new { success = false, error = "Company not found" });

                // Get fiscal year
                Guid fiscalYearIdGuid;
                if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
                {
                    var activeFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);
                    if (activeFiscalYear == null)
                        return BadRequest(new { success = false, error = "No active fiscal year found" });
                    fiscalYearIdGuid = activeFiscalYear.Id;
                }

                // Parse dates
                if (!DateTime.TryParse(fromDate, out DateTime fromDateParsed))
                    return BadRequest(new { success = false, error = "Invalid from date format" });

                if (!DateTime.TryParse(toDate, out DateTime toDateParsed))
                    return BadRequest(new { success = false, error = "Invalid to date format" });

                toDateParsed = toDateParsed.Date.AddDays(1).AddTicks(-1);

                _logger.LogInformation($"Fetching cash transactions from {fromDateParsed} to {toDateParsed}");

                // Get the Cash in Hand account ID for this company
                var cashAccount = await _context.Accounts
                    .FirstOrDefaultAsync(a => a.CompanyId == companyIdGuid &&
                                             a.Name == "Cash in Hand" &&
                                             a.IsActive == true);

                if (cashAccount == null)
                {
                    _logger.LogWarning("Cash in Hand account not found for company: {CompanyId}", companyIdGuid);
                    return BadRequest(new { success = false, error = "Cash in Hand account not found" });
                }

                // FIX: Build query for ALL Cash account transactions - check multiple fields
                var cashTransactionsQuery = _context.Transactions
                    .Where(t => t.CompanyId == companyIdGuid &&
                               t.Date >= fromDateParsed &&
                               t.Date <= toDateParsed &&
                               t.Status == TransactionStatus.Active &&
                               t.IsActive == true)
                    .Where(t =>
                        // Cash account can be in any of these fields
                        t.AccountId == cashAccount.Id ||
                        t.PaymentAccountId2 == cashAccount.Id ||
                        t.ReceiptAccountId2 == cashAccount.Id ||
                        t.DebitAccountId == cashAccount.Id ||
                        t.CreditAccountId == cashAccount.Id ||
                        t.PaymentAccountId == cashAccount.Id ||
                        t.ReceiptAccountId == cashAccount.Id
                    );

                // Filter by account if provided (for sales/returns, account is the party)
                if (accountId.HasValue && accountId.Value != Guid.Empty)
                {
                    cashTransactionsQuery = cashTransactionsQuery.Where(t =>
                        // Check if the transaction is related to the specified account
                        t.AccountId == accountId.Value ||
                        (t.SalesBillId != null && _context.SalesBills.Any(sb => sb.Id == t.SalesBillId && sb.AccountId == accountId.Value)) ||
                        (t.SalesReturnBillId != null && _context.SalesReturns.Any(sr => sr.Id == t.SalesReturnBillId && sr.AccountId == accountId.Value)) ||
                        (t.PurchaseBillId != null && _context.PurchaseBills.Any(pb => pb.Id == t.PurchaseBillId && pb.AccountId == accountId.Value)) ||
                        (t.PurchaseReturnBillId != null && _context.PurchaseReturns.Any(pr => pr.Id == t.PurchaseReturnBillId && pr.AccountId == accountId.Value)) ||
                        (t.PaymentAccountId2 != null && _context.PaymentEntries.Any(pe => pe.PaymentId == t.PaymentAccountId && pe.AccountId == accountId.Value)) ||
                        (t.ReceiptAccountId2 != null && _context.ReceiptEntries.Any(re => re.ReceiptId == t.ReceiptAccountId && re.AccountId == accountId.Value))
                    );
                }

                var cashTransactions = await cashTransactionsQuery
                    .Include(t => t.Account)
                    .Include(t => t.PaymentAccount)
                    .Include(t => t.ReceiptAccount)
                    .Include(t => t.DebitAccount)
                    .Include(t => t.CreditAccount)
                    .Include(t => t.Payment)  // Include Payment for PaymentAccountId
                    .Include(t => t.Receipt)  // Include Receipt for ReceiptAccountId
                    .OrderByDescending(t => t.Date)
                    .ThenByDescending(t => t.BillNumber)
                    .ToListAsync();

                _logger.LogInformation($"Found {cashTransactions.Count} cash transactions");

                // Calculate totals
                decimal totalCashInflow = 0;
                decimal totalCashOutflow = 0;
                decimal netCash = 0;

                var transactions = new List<object>();

                foreach (var transaction in cashTransactions)
                {
                    string transactionType = "";
                    string transactionDescription = "";
                    decimal amount = 0;
                    string accountName = "";
                    bool isInflow = false;
                    string billNumber = transaction.BillNumber ?? "";
                    string partyName = "";

                    // Get the source document information
                    string sourceType = "";
                    string sourceParty = "";

                    // Determine transaction type and amount based on TransactionType
                    switch (transaction.Type)
                    {
                        case TransactionType.Sale:
                            transactionType = "Sale";
                            transactionDescription = "Cash Sale";
                            // For Cash account, Debit = Inflow (cash received)
                            amount = transaction.TotalDebit;
                            // FIX: Get the party name from SalesBill
                            if (transaction.SalesBillId.HasValue)
                            {
                                var salesBill = await _context.SalesBills
                                    .Include(sb => sb.Account)
                                    .FirstOrDefaultAsync(sb => sb.Id == transaction.SalesBillId);
                                if (salesBill != null)
                                {
                                    partyName = salesBill.Account?.Name ?? salesBill.CashAccount ?? "Cash Sale";
                                    billNumber = salesBill.BillNumber ?? billNumber;
                                    accountName = partyName;
                                }
                            }
                            if (string.IsNullOrEmpty(accountName))
                                accountName = transaction.Account?.Name ?? "Cash Sale";
                            isInflow = amount > 0;
                            break;

                        case TransactionType.SlRt:
                            transactionType = "Sale Return";
                            transactionDescription = "Cash Sale Return";
                            amount = transaction.TotalCredit;
                            if (transaction.SalesReturnBillId.HasValue)
                            {
                                var returnBill = await _context.SalesReturns
                                    .Include(sr => sr.Account)
                                    .FirstOrDefaultAsync(sr => sr.Id == transaction.SalesReturnBillId);
                                if (returnBill != null)
                                {
                                    partyName = returnBill.Account?.Name ?? returnBill.CashAccount ?? "Cash Return";
                                    billNumber = returnBill.BillNumber ?? billNumber;
                                    accountName = partyName;
                                }
                            }
                            if (string.IsNullOrEmpty(accountName))
                                accountName = transaction.Account?.Name ?? "Cash Return";
                            isInflow = false;
                            break;

                        case TransactionType.Purc:
                            transactionType = "Purchase";
                            transactionDescription = "Cash Purchase";
                            amount = transaction.TotalCredit;
                            if (transaction.PurchaseBillId.HasValue)
                            {
                                var purchaseBill = await _context.PurchaseBills
                                    .Include(pb => pb.Account)
                                    .FirstOrDefaultAsync(pb => pb.Id == transaction.PurchaseBillId);
                                if (purchaseBill != null)
                                {
                                    partyName = purchaseBill.Account?.Name ?? "Cash Purchase";
                                    billNumber = purchaseBill.BillNumber ?? billNumber;
                                    accountName = partyName;
                                }
                            }
                            if (string.IsNullOrEmpty(accountName))
                                accountName = transaction.Account?.Name ?? "Cash Purchase";
                            isInflow = false;
                            break;

                        case TransactionType.PrRt:
                            transactionType = "Purchase Return";
                            transactionDescription = "Cash Purchase Return";
                            amount = transaction.TotalDebit;
                            if (transaction.PurchaseReturnBillId.HasValue)
                            {
                                var returnBill = await _context.PurchaseReturns
                                    .Include(pr => pr.Account)
                                    .FirstOrDefaultAsync(pr => pr.Id == transaction.PurchaseReturnBillId);
                                if (returnBill != null)
                                {
                                    partyName = returnBill.Account?.Name ?? "Purchase Return";
                                    billNumber = returnBill.BillNumber ?? billNumber;
                                    accountName = partyName;
                                }
                            }
                            if (string.IsNullOrEmpty(accountName))
                                accountName = transaction.Account?.Name ?? "Purchase Return";
                            isInflow = true;
                            break;

                        case TransactionType.Pymt:
                            transactionType = "Payment";
                            transactionDescription = "Cash Payment";
                            // For Payment: Cash account is Credit (money going out)
                            amount = transaction.TotalCredit;

                            // FIX: Get party name from Payment entries
                            if (transaction.PaymentAccountId.HasValue)
                            {
                                var payment = await _context.Payments
                                    .Include(p => p.PaymentEntries)
                                        .ThenInclude(pe => pe.Account)
                                    .FirstOrDefaultAsync(p => p.Id == transaction.PaymentAccountId);
                                if (payment != null && payment.PaymentEntries != null)
                                {
                                    // Get the Debit entry (party account)
                                    var debitEntry = payment.PaymentEntries.FirstOrDefault(pe => pe.EntryType == "Debit");
                                    if (debitEntry != null)
                                    {
                                        partyName = debitEntry.Account?.Name ?? "Payment Party";
                                        accountName = partyName;
                                    }
                                    billNumber = payment.BillNumber ?? billNumber;
                                }
                            }
                            if (string.IsNullOrEmpty(accountName))
                            {
                                accountName = transaction.PaymentAccount?.Name ??
                                             transaction.DebitAccount?.Name ??
                                             "Cash Payment";
                            }
                            isInflow = false;
                            break;

                        case TransactionType.Rcpt:
                            transactionType = "Receipt";
                            transactionDescription = "Cash Receipt";
                            // For Receipt: Cash account is Debit (money coming in)
                            amount = transaction.TotalDebit;

                            // FIX: Get party name from Receipt entries
                            if (transaction.ReceiptAccountId.HasValue)
                            {
                                var receipt = await _context.Receipts
                                    .Include(r => r.ReceiptEntries)
                                        .ThenInclude(re => re.Account)
                                    .FirstOrDefaultAsync(r => r.Id == transaction.ReceiptAccountId);
                                if (receipt != null && receipt.ReceiptEntries != null)
                                {
                                    // Get the Credit entry (party account)
                                    var creditEntry = receipt.ReceiptEntries.FirstOrDefault(re => re.EntryType == "Credit");
                                    if (creditEntry != null)
                                    {
                                        partyName = creditEntry.Account?.Name ?? "Receipt Party";
                                        accountName = partyName;
                                    }
                                    billNumber = receipt.BillNumber ?? billNumber;
                                }
                            }
                            if (string.IsNullOrEmpty(accountName))
                            {
                                accountName = transaction.ReceiptAccount?.Name ??
                                             transaction.CreditAccount?.Name ??
                                             "Cash Receipt";
                            }
                            isInflow = true;
                            break;

                        case TransactionType.Jrnl:
                            transactionType = "Journal";
                            transactionDescription = "Cash Journal";
                            if (transaction.TotalDebit > 0 && transaction.TotalCredit > 0)
                            {
                                if (transaction.TotalDebit > transaction.TotalCredit)
                                {
                                    amount = transaction.TotalDebit - transaction.TotalCredit;
                                    isInflow = true;
                                }
                                else
                                {
                                    amount = transaction.TotalCredit - transaction.TotalDebit;
                                    isInflow = false;
                                }
                            }
                            else if (transaction.TotalDebit > 0)
                            {
                                amount = transaction.TotalDebit;
                                isInflow = true;
                            }
                            else
                            {
                                amount = transaction.TotalCredit;
                                isInflow = false;
                            }
                            accountName = transaction.JournalAccountType ?? "Cash Journal";
                            break;

                        case TransactionType.DrNt:
                            transactionType = "Debit Note";
                            transactionDescription = "Cash Debit Note";
                            amount = transaction.TotalDebit;
                            accountName = transaction.DrCrNoteAccountType ?? "Debit Note";
                            isInflow = true;
                            break;

                        case TransactionType.CrNt:
                            transactionType = "Credit Note";
                            transactionDescription = "Cash Credit Note";
                            amount = transaction.TotalCredit;
                            accountName = transaction.DrCrNoteAccountType ?? "Credit Note";
                            isInflow = false;
                            break;

                        case TransactionType.OpeningBalance:
                            transactionType = "Opening Balance";
                            transactionDescription = "Cash Opening Balance";
                            amount = transaction.TotalDebit > 0 ? transaction.TotalDebit : transaction.TotalCredit;
                            accountName = transaction.Account?.Name ?? "Opening Balance";
                            isInflow = transaction.TotalDebit > 0;
                            break;

                        default:
                            transactionType = "Unknown";
                            transactionDescription = "Unknown Cash Transaction";
                            amount = transaction.TotalDebit > 0 ? transaction.TotalDebit : transaction.TotalCredit;
                            accountName = transaction.Account?.Name ?? "Unknown";
                            isInflow = transaction.TotalDebit > 0;
                            break;
                    }

                    // Only add transaction if amount is not zero
                    if (amount == 0) continue;

                    // Update totals
                    if (isInflow)
                    {
                        totalCashInflow += amount;
                    }
                    else
                    {
                        totalCashOutflow += amount;
                    }

                    // Use party name as account name if available, otherwise use existing accountName
                    string displayAccountName = !string.IsNullOrEmpty(partyName) ? partyName : accountName;

                    // Add to transaction list
                    transactions.Add(new
                    {
                        transaction.Id,
                        BillNumber = billNumber,
                        transaction.Date,
                        transaction.NepaliDate,
                        transaction.TransactionDate,
                        transaction.TransactionDateNepali,
                        AccountName = displayAccountName,
                        transaction.PaymentMode,
                        Type = transactionType,
                        Description = transactionDescription,
                        Amount = isInflow ? amount : -amount,
                        Inflow = isInflow,
                        Outflow = !isInflow,
                        transaction.PartyBillNumber,
                        transaction.PaymentReceiptType,
                        transaction.PurchaseSalesType,
                        transaction.PurchaseSalesReturnType,
                    });
                }

                // Calculate net cash
                netCash = totalCashInflow - totalCashOutflow;

                var response = new
                {
                    success = true,
                    data = new
                    {
                        totalCashInflow,
                        totalCashOutflow,
                        netCash,
                        transactions
                    }
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting cash transactions");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }


        [HttpGet("bank-transactions")]
        public async Task<IActionResult> GetBankTransactions(
            [FromQuery] string fromDate,
            [FromQuery] string toDate,
            [FromQuery] Guid? accountId = null)
        {
            try
            {
                _logger.LogInformation("=== GetBankTransactions Started ===");

                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                    return BadRequest(new { success = false, error = "Company not found" });

                // Get fiscal year
                Guid fiscalYearIdGuid;
                if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
                {
                    var activeFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);
                    if (activeFiscalYear == null)
                        return BadRequest(new { success = false, error = "No active fiscal year found" });
                    fiscalYearIdGuid = activeFiscalYear.Id;
                }

                // Parse dates
                if (!DateTime.TryParse(fromDate, out DateTime fromDateParsed))
                    return BadRequest(new { success = false, error = "Invalid from date format" });

                if (!DateTime.TryParse(toDate, out DateTime toDateParsed))
                    return BadRequest(new { success = false, error = "Invalid to date format" });

                toDateParsed = toDateParsed.Date.AddDays(1).AddTicks(-1);

                _logger.LogInformation($"Fetching bank transactions from {fromDateParsed} to {toDateParsed}");

                // Get ALL bank accounts for this company
                var bankAccounts = await _context.Accounts
                    .Where(a => a.CompanyId == companyIdGuid &&
                               a.IsActive == true &&
                               (a.AccountGroup != null &&
                                (a.AccountGroup.Name == "Bank Accounts" || a.AccountGroup.Name == "Bank O/D Account" ||
                                 a.AccountGroup.Name == "Bank")))
                    .Select(a => new { a.Id, a.Name })
                    .ToListAsync();

                var bankAccountIds = bankAccounts.Select(a => a.Id).ToList();

                if (!bankAccountIds.Any())
                {
                    _logger.LogWarning("No bank accounts found for company: {CompanyId}", companyIdGuid);
                    return Ok(new
                    {
                        success = true,
                        data = new
                        {
                            totalBankInflow = 0,
                            totalBankOutflow = 0,
                            netBank = 0,
                            bankAccounts = new List<object>(),
                            transactions = new List<object>()
                        }
                    });
                }

                // FIX: Build query for ALL bank account transactions - check multiple fields
                var bankTransactionsQuery = _context.Transactions
                    .Where(t => t.CompanyId == companyIdGuid &&
                               t.Date >= fromDateParsed &&
                               t.Date <= toDateParsed &&
                               t.Status == TransactionStatus.Active &&
                               t.IsActive == true)
                    .Where(t =>
                        // Bank account can be in any of these fields
                        bankAccountIds.Contains(t.AccountId ?? Guid.Empty) ||
                        bankAccountIds.Contains(t.PaymentAccountId2 ?? Guid.Empty) ||
                        bankAccountIds.Contains(t.ReceiptAccountId2 ?? Guid.Empty) ||
                        bankAccountIds.Contains(t.DebitAccountId ?? Guid.Empty) ||
                        bankAccountIds.Contains(t.CreditAccountId ?? Guid.Empty) ||
                        bankAccountIds.Contains(t.PaymentAccountId ?? Guid.Empty) ||
                        bankAccountIds.Contains(t.ReceiptAccountId ?? Guid.Empty)
                    );

                // Filter by specific bank account if provided
                if (accountId.HasValue && accountId.Value != Guid.Empty)
                {
                    bankTransactionsQuery = bankTransactionsQuery.Where(t =>
                        t.AccountId == accountId.Value ||
                        t.PaymentAccountId2 == accountId.Value ||
                        t.ReceiptAccountId2 == accountId.Value ||
                        t.DebitAccountId == accountId.Value ||
                        t.CreditAccountId == accountId.Value ||
                        t.PaymentAccountId == accountId.Value ||
                        t.ReceiptAccountId == accountId.Value
                    );
                }

                var bankTransactions = await bankTransactionsQuery
                    .Include(t => t.Account)
                    .Include(t => t.PaymentAccount)
                    .Include(t => t.ReceiptAccount)
                    .Include(t => t.DebitAccount)
                    .Include(t => t.CreditAccount)
                    .Include(t => t.Payment)  // Include Payment for PaymentAccountId
                    .Include(t => t.Receipt)  // Include Receipt for ReceiptAccountId
                    .OrderByDescending(t => t.Date)
                    .ThenByDescending(t => t.BillNumber)
                    .ToListAsync();

                _logger.LogInformation($"Found {bankTransactions.Count} bank transactions");

                // Calculate totals per bank account
                var bankAccountTotals = new Dictionary<Guid, (string Name, decimal Inflow, decimal Outflow)>();
                foreach (var account in bankAccounts)
                {
                    bankAccountTotals[account.Id] = (account.Name, 0, 0);
                }

                decimal totalBankInflow = 0;
                decimal totalBankOutflow = 0;
                decimal netBank = 0;

                var transactions = new List<object>();

                foreach (var transaction in bankTransactions)
                {
                    string transactionType = "";
                    string transactionDescription = "";
                    decimal amount = 0;
                    string accountName = "Bank Account";
                    string bankAccountName = "";
                    bool isInflow = false;
                    string billNumber = transaction.BillNumber ?? "";
                    string partyName = "";

                    // Determine which bank account is involved
                    if (transaction.AccountId.HasValue && bankAccountIds.Contains(transaction.AccountId.Value))
                    {
                        var bankAcc = bankAccounts.FirstOrDefault(b => b.Id == transaction.AccountId.Value);
                        bankAccountName = bankAcc?.Name ?? "Bank Account";
                    }
                    else if (transaction.PaymentAccountId2.HasValue && bankAccountIds.Contains(transaction.PaymentAccountId2.Value))
                    {
                        var bankAcc = bankAccounts.FirstOrDefault(b => b.Id == transaction.PaymentAccountId2.Value);
                        bankAccountName = bankAcc?.Name ?? "Bank Account";
                    }
                    else if (transaction.ReceiptAccountId2.HasValue && bankAccountIds.Contains(transaction.ReceiptAccountId2.Value))
                    {
                        var bankAcc = bankAccounts.FirstOrDefault(b => b.Id == transaction.ReceiptAccountId2.Value);
                        bankAccountName = bankAcc?.Name ?? "Bank Account";
                    }
                    else if (transaction.DebitAccountId.HasValue && bankAccountIds.Contains(transaction.DebitAccountId.Value))
                    {
                        var bankAcc = bankAccounts.FirstOrDefault(b => b.Id == transaction.DebitAccountId.Value);
                        bankAccountName = bankAcc?.Name ?? "Bank Account";
                    }
                    else if (transaction.CreditAccountId.HasValue && bankAccountIds.Contains(transaction.CreditAccountId.Value))
                    {
                        var bankAcc = bankAccounts.FirstOrDefault(b => b.Id == transaction.CreditAccountId.Value);
                        bankAccountName = bankAcc?.Name ?? "Bank Account";
                    }

                    // Determine transaction type and amount based on TransactionType
                    switch (transaction.Type)
                    {
                        case TransactionType.Sale:
                            transactionType = "Sale";
                            transactionDescription = "Bank Sale";
                            amount = transaction.TotalDebit;
                            isInflow = amount > 0;
                            if (transaction.SalesBillId.HasValue)
                            {
                                var salesBill = await _context.SalesBills
                                    .Include(sb => sb.Account)
                                    .FirstOrDefaultAsync(sb => sb.Id == transaction.SalesBillId);
                                if (salesBill != null)
                                {
                                    partyName = salesBill.Account?.Name ?? "Bank Sale";
                                    billNumber = salesBill.BillNumber ?? billNumber;
                                    accountName = partyName;
                                }
                            }
                            if (string.IsNullOrEmpty(accountName))
                                accountName = transaction.Account?.Name ?? "Bank Sale";
                            break;

                        case TransactionType.SlRt:
                            transactionType = "Sale Return";
                            transactionDescription = "Bank Sale Return";
                            amount = transaction.TotalCredit;
                            isInflow = false;
                            if (transaction.SalesReturnBillId.HasValue)
                            {
                                var returnBill = await _context.SalesReturns
                                    .Include(sr => sr.Account)
                                    .FirstOrDefaultAsync(sr => sr.Id == transaction.SalesReturnBillId);
                                if (returnBill != null)
                                {
                                    partyName = returnBill.Account?.Name ?? "Bank Return";
                                    billNumber = returnBill.BillNumber ?? billNumber;
                                    accountName = partyName;
                                }
                            }
                            if (string.IsNullOrEmpty(accountName))
                                accountName = transaction.Account?.Name ?? "Bank Return";
                            break;

                        case TransactionType.Purc:
                            transactionType = "Purchase";
                            transactionDescription = "Bank Purchase";
                            amount = transaction.TotalCredit;
                            isInflow = false;
                            if (transaction.PurchaseBillId.HasValue)
                            {
                                var purchaseBill = await _context.PurchaseBills
                                    .Include(pb => pb.Account)
                                    .FirstOrDefaultAsync(pb => pb.Id == transaction.PurchaseBillId);
                                if (purchaseBill != null)
                                {
                                    partyName = purchaseBill.Account?.Name ?? "Bank Purchase";
                                    billNumber = purchaseBill.BillNumber ?? billNumber;
                                    accountName = partyName;
                                }
                            }
                            if (string.IsNullOrEmpty(accountName))
                                accountName = transaction.Account?.Name ?? "Bank Purchase";
                            break;

                        case TransactionType.PrRt:
                            transactionType = "Purchase Return";
                            transactionDescription = "Bank Purchase Return";
                            amount = transaction.TotalDebit;
                            isInflow = true;
                            if (transaction.PurchaseReturnBillId.HasValue)
                            {
                                var returnBill = await _context.PurchaseReturns
                                    .Include(pr => pr.Account)
                                    .FirstOrDefaultAsync(pr => pr.Id == transaction.PurchaseReturnBillId);
                                if (returnBill != null)
                                {
                                    partyName = returnBill.Account?.Name ?? "Bank Purchase Return";
                                    billNumber = returnBill.BillNumber ?? billNumber;
                                    accountName = partyName;
                                }
                            }
                            if (string.IsNullOrEmpty(accountName))
                                accountName = transaction.Account?.Name ?? "Bank Purchase Return";
                            break;

                        case TransactionType.Pymt:
                            transactionType = "Payment";
                            transactionDescription = "Bank Payment";
                            amount = transaction.TotalCredit;
                            isInflow = false;

                            // FIX: Get party name from Payment entries
                            if (transaction.PaymentAccountId.HasValue)
                            {
                                var payment = await _context.Payments
                                    .Include(p => p.PaymentEntries)
                                        .ThenInclude(pe => pe.Account)
                                    .FirstOrDefaultAsync(p => p.Id == transaction.PaymentAccountId);
                                if (payment != null && payment.PaymentEntries != null)
                                {
                                    // Get the Debit entry (party account)
                                    var debitEntry = payment.PaymentEntries.FirstOrDefault(pe => pe.EntryType == "Debit");
                                    if (debitEntry != null)
                                    {
                                        partyName = debitEntry.Account?.Name ?? "Payment Party";
                                        accountName = partyName;
                                    }
                                    billNumber = payment.BillNumber ?? billNumber;
                                }
                            }
                            if (string.IsNullOrEmpty(accountName))
                            {
                                accountName = transaction.PaymentAccount?.Name ??
                                             transaction.DebitAccount?.Name ??
                                             "Bank Payment";
                            }
                            break;

                        case TransactionType.Rcpt:
                            transactionType = "Receipt";
                            transactionDescription = "Bank Receipt";
                            amount = transaction.TotalDebit;
                            isInflow = true;

                            // FIX: Get party name from Receipt entries
                            if (transaction.ReceiptAccountId.HasValue)
                            {
                                var receipt = await _context.Receipts
                                    .Include(r => r.ReceiptEntries)
                                        .ThenInclude(re => re.Account)
                                    .FirstOrDefaultAsync(r => r.Id == transaction.ReceiptAccountId);
                                if (receipt != null && receipt.ReceiptEntries != null)
                                {
                                    // Get the Credit entry (party account)
                                    var creditEntry = receipt.ReceiptEntries.FirstOrDefault(re => re.EntryType == "Credit");
                                    if (creditEntry != null)
                                    {
                                        partyName = creditEntry.Account?.Name ?? "Receipt Party";
                                        accountName = partyName;
                                    }
                                    billNumber = receipt.BillNumber ?? billNumber;
                                }
                            }
                            if (string.IsNullOrEmpty(accountName))
                            {
                                accountName = transaction.ReceiptAccount?.Name ??
                                             transaction.CreditAccount?.Name ??
                                             "Bank Receipt";
                            }
                            break;

                        case TransactionType.Jrnl:
                            transactionType = "Journal";
                            transactionDescription = "Bank Journal";
                            if (transaction.TotalDebit > 0 && transaction.TotalCredit > 0)
                            {
                                if (transaction.TotalDebit > transaction.TotalCredit)
                                {
                                    amount = transaction.TotalDebit - transaction.TotalCredit;
                                    isInflow = true;
                                }
                                else
                                {
                                    amount = transaction.TotalCredit - transaction.TotalDebit;
                                    isInflow = false;
                                }
                            }
                            else if (transaction.TotalDebit > 0)
                            {
                                amount = transaction.TotalDebit;
                                isInflow = true;
                            }
                            else
                            {
                                amount = transaction.TotalCredit;
                                isInflow = false;
                            }
                            accountName = transaction.JournalAccountType ?? "Bank Journal";
                            break;

                        case TransactionType.DrNt:
                            transactionType = "Debit Note";
                            transactionDescription = "Bank Debit Note";
                            amount = transaction.TotalDebit;
                            accountName = transaction.DrCrNoteAccountType ?? "Debit Note";
                            isInflow = true;
                            break;

                        case TransactionType.CrNt:
                            transactionType = "Credit Note";
                            transactionDescription = "Bank Credit Note";
                            amount = transaction.TotalCredit;
                            accountName = transaction.DrCrNoteAccountType ?? "Credit Note";
                            isInflow = false;
                            break;

                        case TransactionType.OpeningBalance:
                            transactionType = "Opening Balance";
                            transactionDescription = "Bank Opening Balance";
                            amount = transaction.TotalDebit > 0 ? transaction.TotalDebit : transaction.TotalCredit;
                            accountName = transaction.Account?.Name ?? "Opening Balance";
                            isInflow = transaction.TotalDebit > 0;
                            break;

                        default:
                            transactionType = "Unknown";
                            transactionDescription = "Bank Transaction";
                            amount = transaction.TotalDebit > 0 ? transaction.TotalDebit : transaction.TotalCredit;
                            accountName = transaction.Account?.Name ?? "Unknown";
                            isInflow = transaction.TotalDebit > 0;
                            break;
                    }

                    // Skip zero amount transactions
                    if (amount == 0) continue;

                    // Update bank account totals
                    var accountIdKey = transaction.AccountId ?? Guid.Empty;
                    if (bankAccountTotals.ContainsKey(accountIdKey))
                    {
                        var current = bankAccountTotals[accountIdKey];
                        if (isInflow)
                        {
                            bankAccountTotals[accountIdKey] = (current.Name, current.Inflow + amount, current.Outflow);
                        }
                        else
                        {
                            bankAccountTotals[accountIdKey] = (current.Name, current.Inflow, current.Outflow + amount);
                        }
                    }

                    // Update totals
                    if (isInflow)
                    {
                        totalBankInflow += amount;
                    }
                    else
                    {
                        totalBankOutflow += amount;
                    }

                    // Use party name as account name if available
                    string displayAccountName = !string.IsNullOrEmpty(partyName) ? partyName : accountName;

                    // Add to transaction list
                    transactions.Add(new
                    {
                        transaction.Id,
                        BillNumber = billNumber,
                        transaction.Date,
                        transaction.NepaliDate,
                        transaction.TransactionDate,
                        transaction.TransactionDateNepali,
                        AccountName = displayAccountName,
                        BankAccount = bankAccountName,
                        transaction.PaymentMode,
                        Type = transactionType,
                        Description = transactionDescription,
                        Amount = isInflow ? amount : -amount,
                        Inflow = isInflow,
                        Outflow = !isInflow,
                        transaction.PartyBillNumber,
                        transaction.PaymentReceiptType,
                        transaction.PurchaseSalesType,
                        transaction.PurchaseSalesReturnType
                    });
                }

                // Calculate net bank
                netBank = totalBankInflow - totalBankOutflow;

                // Build bank account summary
                var bankAccountSummary = bankAccountTotals
                    .Where(b => b.Value.Inflow > 0 || b.Value.Outflow > 0)
                    .Select(b => new
                    {
                        AccountId = b.Key,
                        AccountName = b.Value.Name,
                        Inflow = b.Value.Inflow,
                        Outflow = b.Value.Outflow,
                        Net = b.Value.Inflow - b.Value.Outflow
                    })
                    .OrderByDescending(b => b.Net)
                    .ToList();

                var response = new
                {
                    success = true,
                    data = new
                    {
                        totalBankInflow,
                        totalBankOutflow,
                        netBank,
                        bankAccounts = bankAccountSummary,
                        transactions
                    }
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting bank transactions");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        /// <summary>
        /// GET: api/retailer/party-turnover
        /// Fetches all parties with turnover exceeding the threshold
        /// </summary>
        [HttpGet("party-turnover")]
        public async Task<IActionResult> GetPartyTurnover(
          [FromQuery] decimal amount,
          [FromQuery] string transactionType,
          [FromQuery] DateTime? fromDate = null,
          [FromQuery] DateTime? toDate = null,
          [FromQuery] string? paymentMode = "all")
        {
            try
            {
                _logger.LogInformation("=== GetPartyTurnover Started ===");
                _logger.LogInformation("Parameters - Amount: {Amount}, TransactionType: {TransactionType}, FromDate: {FromDate}, ToDate: {ToDate}",
                    amount, transactionType, fromDate, toDate);

                // Validate required parameters
                if (amount <= 0)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Amount must be greater than 0"
                    });
                }

                if (string.IsNullOrEmpty(transactionType) ||
                    (transactionType.ToLower() != "sales" && transactionType.ToLower() != "purchase"))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Transaction type must be either 'Sales' or 'Purchase'"
                    });
                }

                // Extract claims from JWT
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                // Validate user ID
                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                {
                    return Unauthorized(new
                    {
                        success = false,
                        error = "Invalid user token. Please login again."
                    });
                }

                // Validate company ID
                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "No company selected. Please select a company first."
                    });
                }

                // Handle fiscal year
                Guid fiscalYearIdGuid;
                if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
                {
                    var activeFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

                    if (activeFiscalYear == null)
                    {
                        return BadRequest(new
                        {
                            success = false,
                            error = "No active fiscal year found for this company."
                        });
                    }
                    fiscalYearIdGuid = activeFiscalYear.Id;
                }

                // Check trade type
                if (string.IsNullOrEmpty(tradeTypeClaim) ||
                    !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) ||
                    tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new
                    {
                        success = false,
                        message = "Access denied for this trade type"
                    });
                }

                // Build request
                var request = new PartyTurnoverRequestDto
                {
                    Amount = amount,
                    TransactionType = transactionType,
                    FromDate = fromDate,
                    ToDate = toDate,
                    PaymentMode = paymentMode
                };

                // Get party turnover data
                var response = await _transactionService.GetPartyTurnoverAsync(
                    companyIdGuid,
                    fiscalYearIdGuid,
                    request);

                if (!response.Success)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = response.Error
                    });
                }

                return Ok(new
                {
                    success = true,
                    data = response.Data
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetPartyTurnover");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching party turnover",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }


        // ============================================================================
        // DAY BOOK — aggregated Sales / Purchase / Payment / Receipt transactions
        // ============================================================================

        [HttpGet("day-book/entry-data")]
        public async Task<IActionResult> GetDayBookEntryData()
        {
            try
            {
                _logger.LogInformation("=== GetDayBookEntryData Started ===");

                var companyId = User.FindFirst("currentCompany")?.Value;
                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                    return BadRequest(new { success = false, error = "Company not found" });

                var company = await _context.Companies
                    .Where(c => c.Id == companyIdGuid)
                    .Select(c => new
                    {
                        c.Name,
                        c.Address,
                        c.Pan,
                        DateFormat = c.DateFormat.ToString(),
                        c.VatEnabled
                    })
                    .FirstOrDefaultAsync();

                if (company == null)
                    return BadRequest(new { success = false, error = "Company not found" });

                var fiscalYear = await _context.FiscalYears
                    .Where(f => f.CompanyId == companyIdGuid && f.IsActive)
                    .Select(f => new
                    {
                        f.Id,
                        f.StartDate,
                        StartDateNepali = f.StartDateNepali,
                        f.EndDate
                    })
                    .FirstOrDefaultAsync();

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        company,
                        currentFiscalYear = fiscalYear,
                        isAdminOrSupervisor = true
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetDayBookEntryData");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // [HttpGet("day-book")]
        // public async Task<IActionResult> GetDayBook(
        //     [FromQuery] string fromDate,
        //     [FromQuery] string toDate,
        //     [FromQuery] string? type = "all")
        // {
        //     try
        //     {
        //         _logger.LogInformation("=== GetDayBook Started ===");

        //         var companyId = User.FindFirst("currentCompany")?.Value;
        //         var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;

        //         if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
        //             return BadRequest(new { success = false, error = "Company not found" });

        //         // Resolve fiscal year
        //         Guid fiscalYearIdGuid;
        //         if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
        //         {
        //             var activeFiscalYear = await _context.FiscalYears
        //                 .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);
        //             if (activeFiscalYear == null)
        //                 return BadRequest(new { success = false, error = "No active fiscal year found" });
        //             fiscalYearIdGuid = activeFiscalYear.Id;
        //         }

        //         // Parse date range (inclusive end-of-day for To)
        //         if (!DateTime.TryParse(fromDate, out DateTime fromParsed))
        //             return BadRequest(new { success = false, error = "Invalid from date format" });
        //         if (!DateTime.TryParse(toDate, out DateTime toParsed))
        //             return BadRequest(new { success = false, error = "Invalid to date format" });

        //         toParsed = toParsed.Date.AddDays(1).AddTicks(-1);

        //         // Resolve which types to include
        //         bool includeAll = string.IsNullOrEmpty(type) || type.Equals("all", StringComparison.OrdinalIgnoreCase);
        //         bool includeSales = includeAll || type.Equals("Sales", StringComparison.OrdinalIgnoreCase);
        //         bool includePurchase = includeAll || type.Equals("Purchase", StringComparison.OrdinalIgnoreCase);
        //         bool includePayment = includeAll || type.Equals("Payment", StringComparison.OrdinalIgnoreCase);
        //         bool includeReceipt = includeAll || type.Equals("Receipt", StringComparison.OrdinalIgnoreCase);

        //         // ---------------------------------------------------------------
        //         // 1. Base query — all active transactions in range for this company
        //         // ---------------------------------------------------------------
        //         var baseQuery = _context.Transactions
        //             .Where(t => t.CompanyId == companyIdGuid
        //                      && t.FiscalYearId == fiscalYearIdGuid
        //                      && t.Date >= fromParsed
        //                      && t.Date <= toParsed
        //                      && t.Status == TransactionStatus.Active
        //                      && t.IsActive);

        //         // ---------------------------------------------------------------
        //         // 2. Build a whitelist of types we care about
        //         // ---------------------------------------------------------------
        //         var wantedTypes = new List<TransactionType>();

        //         if (includeSales)
        //         {
        //             wantedTypes.Add(TransactionType.Sale);
        //             wantedTypes.Add(TransactionType.SlRt);
        //         }
        //         if (includePurchase)
        //         {
        //             wantedTypes.Add(TransactionType.Purc);
        //             wantedTypes.Add(TransactionType.PrRt);
        //         }
        //         if (includePayment)
        //         {
        //             wantedTypes.Add(TransactionType.Pymt);
        //         }
        //         if (includeReceipt)
        //         {
        //             wantedTypes.Add(TransactionType.Rcpt);
        //         }

        //         if (wantedTypes.Count == 0)
        //         {
        //             return Ok(new
        //             {
        //                 success = true,
        //                 data = new { transactions = new List<object>() }
        //             });
        //         }

        //         var query = baseQuery.Where(t => wantedTypes.Contains(t.Type));

        //         // ---------------------------------------------------------------
        //         // 3. Materialize with includes we need for party names / bill no.
        //         // ---------------------------------------------------------------
        //         var rawTransactions = await query
        //             .Include(t => t.Account).ThenInclude(a => a.AccountGroup)
        //             .Include(t => t.PurchaseBill).ThenInclude(pb => pb.Account)
        //             .Include(t => t.PurchaseReturn).ThenInclude(pr => pr.Account)
        //             .Include(t => t.SalesBill).ThenInclude(sb => sb.Account)
        //             .Include(t => t.SalesReturn).ThenInclude(sr => sr.Account)
        //             .Include(t => t.Payment).ThenInclude(p => p.PaymentEntries).ThenInclude(pe => pe.Account)
        //             .Include(t => t.Receipt).ThenInclude(r => r.ReceiptEntries).ThenInclude(re => re.Account)
        //             .Include(t => t.DebitAccount)
        //             .Include(t => t.CreditAccount)
        //             .OrderBy(t => t.Date).ThenBy(t => t.BillNumber)
        //             .ToListAsync();

        //         _logger.LogInformation("DayBook — found {Count} raw transactions in range", rawTransactions.Count);

        //         // ---------------------------------------------------------------
        //         // 4. Group by voucher so multiple rows (party + VAT + round-off)
        //         //    collapse into one entry per voucher.
        //         // ---------------------------------------------------------------
        //         var grouped = rawTransactions
        //             .GroupBy(t => new
        //             {
        //                 t.Type,
        //                 VoucherId = t.Type switch
        //                 {
        //                     TransactionType.Purc => t.PurchaseBillId,
        //                     TransactionType.PrRt => t.PurchaseReturnBillId,
        //                     TransactionType.Sale => t.SalesBillId,
        //                     TransactionType.SlRt => t.SalesReturnBillId,
        //                     TransactionType.Pymt => t.PaymentAccountId,
        //                     TransactionType.Rcpt => t.ReceiptAccountId,
        //                     _ => null
        //                 }
        //             })
        //             .Select(g =>
        //             {
        //                 // Prefer the "party" row from the group:
        //                 //   Purchase / Purchase Return → Sundry Creditors
        //                 //   Sales / Sales Return       → Sundry Debtors
        //                 //   Payment / Receipt          → any row with AccountId set
        //                 var primary =
        //                     g.FirstOrDefault(x => x.Type == TransactionType.Purc &&
        //                                           x.Account != null &&
        //                                           x.Account.AccountGroup != null &&
        //                                           x.Account.AccountGroup.Name == "Sundry Creditors")
        //                     ?? g.FirstOrDefault(x => x.Type == TransactionType.PrRt &&
        //                                              x.Account != null &&
        //                                              x.Account.AccountGroup != null &&
        //                                              x.Account.AccountGroup.Name == "Sundry Creditors")
        //                     ?? g.FirstOrDefault(x => x.Type == TransactionType.Sale &&
        //                                              x.Account != null &&
        //                                              x.Account.AccountGroup != null &&
        //                                              x.Account.AccountGroup.Name == "Sundry Debtors")
        //                     ?? g.FirstOrDefault(x => x.Type == TransactionType.SlRt &&
        //                                              x.Account != null &&
        //                                              x.Account.AccountGroup != null &&
        //                                              x.Account.AccountGroup.Name == "Sundry Debtors")
        //                     ?? g.FirstOrDefault(x => x.AccountId != null)
        //                     ?? g.First();

        //                 string? billNumber = primary.BillNumber;
        //                 string? partyName = primary.Account?.Name;

        //                 switch (primary.Type)
        //                 {
        //                     case TransactionType.Sale:
        //                         billNumber = primary.SalesBill?.BillNumber ?? billNumber;
        //                         partyName = primary.SalesBill?.Account?.Name ?? partyName;
        //                         break;
        //                     case TransactionType.SlRt:
        //                         billNumber = primary.SalesReturn?.BillNumber ?? billNumber;
        //                         partyName = primary.SalesReturn?.Account?.Name ?? partyName;
        //                         break;
        //                     case TransactionType.Purc:
        //                         billNumber = primary.PurchaseBill?.BillNumber ?? billNumber;
        //                         partyName = primary.PurchaseBill?.Account?.Name ?? partyName;
        //                         break;
        //                     case TransactionType.PrRt:
        //                         billNumber = primary.PurchaseReturn?.BillNumber ?? billNumber;
        //                         partyName = primary.PurchaseReturn?.Account?.Name ?? partyName;
        //                         break;
        //                     case TransactionType.Pymt:
        //                         var pDebitEntry = primary.Payment?.PaymentEntries?.FirstOrDefault(pe => pe.EntryType == "Debit");
        //                         partyName = pDebitEntry?.Account?.Name
        //                                     ?? primary.PaymentAccount?.Name
        //                                     ?? primary.DebitAccount?.Name
        //                                     ?? partyName;
        //                         billNumber = primary.Payment?.BillNumber ?? billNumber;
        //                         break;
        //                     case TransactionType.Rcpt:
        //                         var rCreditEntry = primary.Receipt?.ReceiptEntries?.FirstOrDefault(re => re.EntryType == "Credit");
        //                         partyName = rCreditEntry?.Account?.Name
        //                                     ?? primary.ReceiptAccount?.Name
        //                                     ?? primary.CreditAccount?.Name
        //                                     ?? partyName;
        //                         billNumber = primary.Receipt?.BillNumber ?? billNumber;
        //                         break;
        //                 }

        //                 // ---------------------------------------------------------
        //                 // Compute the voucher's total amount ONCE.
        //                 // Nullable decimals on the parent bill → use ?? 0m.
        //                 // ---------------------------------------------------------
        //                 decimal amount = 0m;
        //                 switch (primary.Type)
        //                 {
        //                     case TransactionType.Sale:
        //                         amount = primary.SalesBill?.TotalAmount
        //                                  ?? (primary.TotalDebit > primary.TotalCredit ? primary.TotalDebit : primary.TotalCredit);
        //                         break;

        //                     case TransactionType.SlRt:
        //                         amount = primary.SalesReturn?.TotalAmount
        //                                  ?? (primary.TotalDebit > primary.TotalCredit ? primary.TotalDebit : primary.TotalCredit);
        //                         break;

        //                     case TransactionType.Purc:
        //                         amount = primary.PurchaseBill != null
        //                             ? ((primary.PurchaseBill.TaxableAmount ?? 0m) + (primary.PurchaseBill.NonVatPurchase ?? 0m))
        //                             : (primary.TotalDebit > primary.TotalCredit ? primary.TotalDebit : primary.TotalCredit);
        //                         break;

        //                     case TransactionType.PrRt:
        //                         amount = primary.PurchaseReturn != null
        //                             ? ((primary.PurchaseReturn.TaxableAmount ?? 0m) + (primary.PurchaseReturn.NonVatPurchaseReturn ?? 0m))
        //                             : (primary.TotalDebit > primary.TotalCredit ? primary.TotalDebit : primary.TotalCredit);
        //                         break;

        //                     case TransactionType.Pymt:
        //                         amount = primary.TotalDebit > 0 ? primary.TotalDebit : primary.TotalCredit;
        //                         break;

        //                     case TransactionType.Rcpt:
        //                         amount = primary.TotalCredit > 0 ? primary.TotalCredit : primary.TotalDebit;
        //                         break;
        //                 }

        //                 return new
        //                 {
        //                     VoucherDate = g.Min(x => x.Date),
        //                     NepaliDate = g.Where(x => !string.IsNullOrEmpty(x.NepaliDate))
        //                                    .OrderBy(x => x.Date)
        //                                    .Select(x => x.NepaliDate)
        //                                    .FirstOrDefault(),
        //                     Type = primary.Type,
        //                     BillNumber = billNumber ?? "",
        //                     AccountName = partyName ?? "N/A",
        //                     PaymentMode = primary.PaymentMode.ToString(),
        //                     Amount = amount,
        //                     Id = primary.Id
        //                 };
        //             })
        //             .Where(x => x.Amount != 0)
        //             .OrderBy(x => x.VoucherDate)
        //             .ThenBy(x => x.BillNumber)
        //             .ToList();

        //         // ---------------------------------------------------------------
        //         // 5. Build DTOs with running balance
        //         // ---------------------------------------------------------------
        //         var result = new List<DayBookEntryDto>();
        //         decimal runningBalance = 0m;

        //         foreach (var g in grouped)
        //         {
        //             string typeLabel = g.Type switch
        //             {
        //                 TransactionType.Sale => "Sales",
        //                 TransactionType.SlRt => "Sales Return",
        //                 TransactionType.Purc => "Purchase",
        //                 TransactionType.PrRt => "Purchase Return",
        //                 TransactionType.Pymt => "Payment",
        //                 TransactionType.Rcpt => "Receipt",
        //                 _ => "Unknown"
        //             };

        //             decimal debit = 0m;
        //             decimal credit = 0m;

        //             switch (g.Type)
        //             {
        //                 case TransactionType.Sale: credit = g.Amount; break;
        //                 case TransactionType.SlRt: debit = g.Amount; break;
        //                 case TransactionType.Purc: debit = g.Amount; break;
        //                 case TransactionType.PrRt: credit = g.Amount; break;
        //                 case TransactionType.Pymt: debit = g.Amount; break;
        //                 case TransactionType.Rcpt: credit = g.Amount; break;
        //             }

        //             runningBalance += debit - credit;

        //             result.Add(new DayBookEntryDto
        //             {
        //                 Id = g.Id,
        //                 Date = g.VoucherDate,
        //                 NepaliDate = g.NepaliDate,
        //                 BillNumber = g.BillNumber,
        //                 AccountName = g.AccountName,
        //                 PaymentMode = g.PaymentMode,
        //                 Description = typeLabel switch
        //                 {
        //                     "Sales" => "Sales invoice",
        //                     "Sales Return" => "Sales return",
        //                     "Purchase" => "Purchase bill",
        //                     "Purchase Return" => "Purchase return",
        //                     "Payment" => "Payment",
        //                     "Receipt" => "Receipt",
        //                     _ => ""
        //                 },
        //                 Debit = debit,
        //                 Credit = credit,
        //                 Balance = runningBalance,
        //                 UserName = null,
        //                 Type = typeLabel
        //             });
        //         }

        //         return Ok(new
        //         {
        //             success = true,
        //             data = new
        //             {
        //                 transactions = result
        //             }
        //         });
        //     }
        //     catch (Exception ex)
        //     {
        //         _logger.LogError(ex, "Error in GetDayBook");
        //         return StatusCode(500, new
        //         {
        //             success = false,
        //             error = "Internal server error",
        //             details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
        //         });
        //     }
        // }


        [HttpGet("day-book")]
        public async Task<IActionResult> GetDayBook(
            [FromQuery] string fromDate,
            [FromQuery] string toDate,
            [FromQuery] string? type = "all")
        {
            try
            {
                _logger.LogInformation("=== GetDayBook Started ===");

                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                    return BadRequest(new { success = false, error = "Company not found" });

                // Resolve fiscal year
                Guid fiscalYearIdGuid;
                if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
                {
                    var activeFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);
                    if (activeFiscalYear == null)
                        return BadRequest(new { success = false, error = "No active fiscal year found" });
                    fiscalYearIdGuid = activeFiscalYear.Id;
                }

                // Parse date range (inclusive end-of-day for To)
                if (!DateTime.TryParse(fromDate, out DateTime fromParsed))
                    return BadRequest(new { success = false, error = "Invalid from date format" });
                if (!DateTime.TryParse(toDate, out DateTime toParsed))
                    return BadRequest(new { success = false, error = "Invalid to date format" });

                toParsed = toParsed.Date.AddDays(1).AddTicks(-1);

                // Resolve which types to include
                bool includeAll = string.IsNullOrEmpty(type) || type.Equals("all", StringComparison.OrdinalIgnoreCase);
                bool includeSales = includeAll || type.Equals("Sales", StringComparison.OrdinalIgnoreCase);
                bool includePurchase = includeAll || type.Equals("Purchase", StringComparison.OrdinalIgnoreCase);
                bool includePayment = includeAll || type.Equals("Payment", StringComparison.OrdinalIgnoreCase);
                bool includeReceipt = includeAll || type.Equals("Receipt", StringComparison.OrdinalIgnoreCase);

                // ---------------------------------------------------------------
                // 1. Base query — all active transactions in range for this company
                // ---------------------------------------------------------------
                var baseQuery = _context.Transactions
                    .Where(t => t.CompanyId == companyIdGuid
                             && t.FiscalYearId == fiscalYearIdGuid
                             && t.Date >= fromParsed
                             && t.Date <= toParsed
                             && t.Status == TransactionStatus.Active
                             && t.IsActive);

                // ---------------------------------------------------------------
                // 2. Build a whitelist of types we care about
                // ---------------------------------------------------------------
                var wantedTypes = new List<TransactionType>();

                if (includeSales)
                {
                    wantedTypes.Add(TransactionType.Sale);
                    wantedTypes.Add(TransactionType.SlRt);
                }
                if (includePurchase)
                {
                    wantedTypes.Add(TransactionType.Purc);
                    wantedTypes.Add(TransactionType.PrRt);
                }
                if (includePayment)
                {
                    wantedTypes.Add(TransactionType.Pymt);
                }
                if (includeReceipt)
                {
                    wantedTypes.Add(TransactionType.Rcpt);
                }

                if (wantedTypes.Count == 0)
                {
                    return Ok(new
                    {
                        success = true,
                        data = new { transactions = new List<object>() }
                    });
                }

                var query = baseQuery.Where(t => wantedTypes.Contains(t.Type));

                // ---------------------------------------------------------------
                // 3. Materialize with includes we need for party names / bill no.
                // ---------------------------------------------------------------
                var rawTransactions = await query
                    .Include(t => t.Account).ThenInclude(a => a.AccountGroup)
                    .Include(t => t.PurchaseBill).ThenInclude(pb => pb.Account)
                    .Include(t => t.PurchaseReturn).ThenInclude(pr => pr.Account)
                    .Include(t => t.SalesBill).ThenInclude(sb => sb.Account)
                    .Include(t => t.SalesReturn).ThenInclude(sr => sr.Account)
                    .Include(t => t.Payment).ThenInclude(p => p.PaymentEntries).ThenInclude(pe => pe.Account)
                    .Include(t => t.Receipt).ThenInclude(r => r.ReceiptEntries).ThenInclude(re => re.Account)
                    .Include(t => t.DebitAccount)
                    .Include(t => t.CreditAccount)
                    .OrderBy(t => t.Date).ThenBy(t => t.BillNumber)
                    .ToListAsync();

                _logger.LogInformation("DayBook — found {Count} raw transactions in range", rawTransactions.Count);

                // ---------------------------------------------------------------
                // 4. Group by voucher so multiple rows (party + VAT + round-off)
                //    collapse into one entry per voucher.
                // ---------------------------------------------------------------
                var grouped = rawTransactions
                    .GroupBy(t => new
                    {
                        t.Type,
                        VoucherId = t.Type switch
                        {
                            TransactionType.Purc => t.PurchaseBillId,
                            TransactionType.PrRt => t.PurchaseReturnBillId,
                            TransactionType.Sale => t.SalesBillId,
                            TransactionType.SlRt => t.SalesReturnBillId,
                            TransactionType.Pymt => t.PaymentAccountId,
                            TransactionType.Rcpt => t.ReceiptAccountId,
                            _ => null
                        }
                    })
                    .Select(g =>
                    {
                        // Prefer the "party" row from the group:
                        //   Purchase / Purchase Return → Sundry Creditors
                        //   Sales / Sales Return       → Sundry Debtors
                        //   Payment / Receipt          → any row with AccountId set
                        var primary =
                            g.FirstOrDefault(x => x.Type == TransactionType.Purc &&
                                                  x.Account != null &&
                                                  x.Account.AccountGroup != null &&
                                                  x.Account.AccountGroup.Name == "Sundry Creditors")
                            ?? g.FirstOrDefault(x => x.Type == TransactionType.PrRt &&
                                                     x.Account != null &&
                                                     x.Account.AccountGroup != null &&
                                                     x.Account.AccountGroup.Name == "Sundry Creditors")
                            ?? g.FirstOrDefault(x => x.Type == TransactionType.Sale &&
                                                     x.Account != null &&
                                                     x.Account.AccountGroup != null &&
                                                     x.Account.AccountGroup.Name == "Sundry Debtors")
                            ?? g.FirstOrDefault(x => x.Type == TransactionType.SlRt &&
                                                     x.Account != null &&
                                                     x.Account.AccountGroup != null &&
                                                     x.Account.AccountGroup.Name == "Sundry Debtors")
                            ?? g.FirstOrDefault(x => x.AccountId != null)
                            ?? g.First();

                        string? billNumber = primary.BillNumber;
                        string? partyName = primary.Account?.Name;

                        switch (primary.Type)
                        {
                            case TransactionType.Sale:
                                billNumber = primary.SalesBill?.BillNumber ?? billNumber;
                                partyName = primary.SalesBill?.Account?.Name ?? partyName;
                                break;
                            case TransactionType.SlRt:
                                billNumber = primary.SalesReturn?.BillNumber ?? billNumber;
                                partyName = primary.SalesReturn?.Account?.Name ?? partyName;
                                break;
                            case TransactionType.Purc:
                                billNumber = primary.PurchaseBill?.BillNumber ?? billNumber;
                                partyName = primary.PurchaseBill?.Account?.Name ?? partyName;
                                break;
                            case TransactionType.PrRt:
                                billNumber = primary.PurchaseReturn?.BillNumber ?? billNumber;
                                partyName = primary.PurchaseReturn?.Account?.Name ?? partyName;
                                break;
                            case TransactionType.Pymt:
                                var pDebitEntry = primary.Payment?.PaymentEntries?.FirstOrDefault(pe => pe.EntryType == "Debit");
                                partyName = pDebitEntry?.Account?.Name
                                            ?? primary.PaymentAccount?.Name
                                            ?? primary.DebitAccount?.Name
                                            ?? partyName;
                                billNumber = primary.Payment?.BillNumber ?? billNumber;
                                break;
                            case TransactionType.Rcpt:
                                var rCreditEntry = primary.Receipt?.ReceiptEntries?.FirstOrDefault(re => re.EntryType == "Credit");
                                partyName = rCreditEntry?.Account?.Name
                                            ?? primary.ReceiptAccount?.Name
                                            ?? primary.CreditAccount?.Name
                                            ?? partyName;
                                billNumber = primary.Receipt?.BillNumber ?? billNumber;
                                break;
                        }

                        // ---------------------------------------------------------
                        // Compute the voucher's total amount ONCE.
                        // For Sale / Purchase we use the SALES/PURCHASE ACCOUNT side
                        // (Taxable + Non-Taxable / Non-VAT) rather than the party total,
                        // so amounts match the ledgers and exclude VAT.
                        // ---------------------------------------------------------
                        decimal amount = 0m;
                        switch (primary.Type)
                        {
                            case TransactionType.Sale:
                                amount = primary.SalesBill != null
                                    ? ((primary.SalesBill.TaxableAmount) + (primary.SalesBill.NonVatSales))
                                    : (primary.TotalDebit > primary.TotalCredit ? primary.TotalDebit : primary.TotalCredit);
                                break;

                            case TransactionType.SlRt:
                                amount = primary.SalesReturn != null
                                    ? ((primary.SalesReturn.TaxableAmount ?? 0m) + (primary.SalesReturn.NonVatSalesReturn ?? 0m))
                                    : (primary.TotalDebit > primary.TotalCredit ? primary.TotalDebit : primary.TotalCredit);
                                break;

                            case TransactionType.Purc:
                                amount = primary.PurchaseBill != null
                                    ? ((primary.PurchaseBill.TaxableAmount ?? 0m) + (primary.PurchaseBill.NonVatPurchase ?? 0m))
                                    : (primary.TotalDebit > primary.TotalCredit ? primary.TotalDebit : primary.TotalCredit);
                                break;

                            case TransactionType.PrRt:
                                amount = primary.PurchaseReturn != null
                                    ? ((primary.PurchaseReturn.TaxableAmount ?? 0m) + (primary.PurchaseReturn.NonVatPurchaseReturn ?? 0m))
                                    : (primary.TotalDebit > primary.TotalCredit ? primary.TotalDebit : primary.TotalCredit);
                                break;

                            case TransactionType.Pymt:
                                amount = primary.TotalDebit > 0 ? primary.TotalDebit : primary.TotalCredit;
                                break;

                            case TransactionType.Rcpt:
                                amount = primary.TotalCredit > 0 ? primary.TotalCredit : primary.TotalDebit;
                                break;
                        }

                        return new
                        {
                            VoucherDate = g.Min(x => x.Date),
                            NepaliDate = g.Where(x => !string.IsNullOrEmpty(x.NepaliDate))
                                           .OrderBy(x => x.Date)
                                           .Select(x => x.NepaliDate)
                                           .FirstOrDefault(),
                            Type = primary.Type,
                            BillNumber = billNumber ?? "",
                            AccountName = partyName ?? "N/A",
                            PaymentMode = primary.PaymentMode.ToString(),
                            Amount = amount,
                            Id = primary.Id
                        };
                    })
                    .Where(x => x.Amount != 0)
                    .OrderBy(x => x.VoucherDate)
                    .ThenBy(x => x.BillNumber)
                    .ToList();

                // ---------------------------------------------------------------
                // 5. Build DTOs with running balance
                // ---------------------------------------------------------------
                var result = new List<DayBookEntryDto>();
                decimal runningBalance = 0m;

                foreach (var g in grouped)
                {
                    string typeLabel = g.Type switch
                    {
                        TransactionType.Sale => "Sales",
                        TransactionType.SlRt => "Sales Return",
                        TransactionType.Purc => "Purchase",
                        TransactionType.PrRt => "Purchase Return",
                        TransactionType.Pymt => "Payment",
                        TransactionType.Rcpt => "Receipt",
                        _ => "Unknown"
                    };

                    decimal debit = 0m;
                    decimal credit = 0m;

                    switch (g.Type)
                    {
                        case TransactionType.Sale: credit = g.Amount; break;
                        case TransactionType.SlRt: debit = g.Amount; break;
                        case TransactionType.Purc: debit = g.Amount; break;
                        case TransactionType.PrRt: credit = g.Amount; break;
                        case TransactionType.Pymt: debit = g.Amount; break;
                        case TransactionType.Rcpt: credit = g.Amount; break;
                    }

                    runningBalance += debit - credit;

                    result.Add(new DayBookEntryDto
                    {
                        Id = g.Id,
                        Date = g.VoucherDate,
                        NepaliDate = g.NepaliDate,
                        BillNumber = g.BillNumber,
                        AccountName = g.AccountName,
                        PaymentMode = g.PaymentMode,
                        Description = typeLabel switch
                        {
                            "Sales" => "Sales invoice",
                            "Sales Return" => "Sales return",
                            "Purchase" => "Purchase bill",
                            "Purchase Return" => "Purchase return",
                            "Payment" => "Payment",
                            "Receipt" => "Receipt",
                            _ => ""
                        },
                        Debit = debit,
                        Credit = credit,
                        Balance = runningBalance,
                        UserName = null,
                        Type = typeLabel
                    });
                }

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        transactions = result
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetDayBook");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

    }

    internal static class TransactionAmountExtensions
    {
        /// <summary>
        /// For most transaction types the meaningful amount is whichever of
        /// TotalDebit/TotalCredit is non-zero. For Sale/Purchase it's usually
        /// the side opposite the party account, so we take the max side.
        /// </summary>
        public static decimal TotalAmountSafe(this SkyForge.Models.Retailer.TransactionModel.Transaction t)
        {
            if (t == null) return 0m;
            // If both are populated (rare), prefer the larger
            return t.TotalDebit >= t.TotalCredit ? t.TotalDebit : t.TotalCredit;
        }
    }

}

