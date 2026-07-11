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
                               (a.Name.Contains("Bank") ||
                                a.Name.Contains("bank") ||
                                a.AccountGroup != null &&
                                (a.AccountGroup.Name == "Bank Accounts"||a.AccountGroup.Name == "Bank O/D Account" ||
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

                // Build query for ALL bank account transactions
                var bankTransactionsQuery = _context.Transactions
                    .Where(t => t.CompanyId == companyIdGuid &&
                               t.FiscalYearId == fiscalYearIdGuid &&
                               bankAccountIds.Contains(t.AccountId.Value) &&
                               t.Date >= fromDateParsed &&
                               t.Date <= toDateParsed &&
                               t.IsActive == true);

                // Filter by specific bank account if provided
                if (accountId.HasValue && accountId.Value != Guid.Empty)
                {
                    bankTransactionsQuery = bankTransactionsQuery.Where(t => t.AccountId == accountId.Value);
                }

                var bankTransactions = await bankTransactionsQuery
                    .Include(t => t.Account)
                    .Include(t => t.PaymentAccount)
                    .Include(t => t.ReceiptAccount)
                    .Include(t => t.DebitAccount)
                    .Include(t => t.CreditAccount)
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
                    string accountName = transaction.Account?.Name ?? "Bank Account";
                    bool isInflow = false;
                    string billNumber = transaction.BillNumber ?? "";

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
                                    accountName = salesBill.Account?.Name ?? "Bank Sale";
                                    billNumber = salesBill.BillNumber ?? billNumber;
                                }
                            }
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
                                    accountName = returnBill.Account?.Name ?? "Bank Return";
                                    billNumber = returnBill.BillNumber ?? billNumber;
                                }
                            }
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
                                    accountName = purchaseBill.Account?.Name ?? "Bank Purchase";
                                    billNumber = purchaseBill.BillNumber ?? billNumber;
                                }
                            }
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
                                    accountName = returnBill.Account?.Name ?? "Bank Purchase Return";
                                    billNumber = returnBill.BillNumber ?? billNumber;
                                }
                            }
                            break;

                        case TransactionType.Pymt:
                            transactionType = "Payment";
                            transactionDescription = "Bank Payment";
                            amount = transaction.TotalCredit;
                            accountName = transaction.PaymentAccount?.Name ?? "Bank Payment";
                            isInflow = false;
                            break;

                        case TransactionType.Rcpt:
                            transactionType = "Receipt";
                            transactionDescription = "Bank Receipt";
                            amount = transaction.TotalDebit;
                            accountName = transaction.ReceiptAccount?.Name ?? "Bank Receipt";
                            isInflow = true;
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

                        default:
                            transactionType = "Unknown";
                            transactionDescription = "Bank Transaction";
                            amount = transaction.TotalDebit > 0 ? transaction.TotalDebit : transaction.TotalCredit;
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

                    // Add to transaction list
                    transactions.Add(new
                    {
                        transaction.Id,
                        BillNumber = billNumber,
                        transaction.Date,
                        transaction.NepaliDate,
                        transaction.TransactionDate,
                        transaction.TransactionDateNepali,
                        AccountName = accountName,
                        BankAccount = transaction.Account?.Name ?? "Bank Account",
                        transaction.PaymentMode,
                        Type = transactionType,
                        Description = transactionDescription,
                        Amount = isInflow ? amount : -amount,
                        Inflow = isInflow,
                        Outflow = !isInflow
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
    }
}

