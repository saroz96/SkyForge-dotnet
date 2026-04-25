using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Models.Shared;
using SkyForge.Services.Retailer.TransactionServices;
using SkyForge.Dto.RetailerDto.TransactionDto;
using System.Security.Claims;
using SkyForge.Models.CompanyModel;

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
    }
}

