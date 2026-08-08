
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SkyForge.Data;
using SkyForge.Dto.RetailerDto.TransactionDto;
using SkyForge.Models.CompanyModel;
using SkyForge.Models.Retailer.TransactionModel;
using SkyForge.Models.Shared;
using SkyForge.Services.Retailer.StatementServices;
using System.Security.Claims;

namespace SkyForge.Controllers.Retailer
{
    [ApiController]
    [Route("api/retailer")]
    [Authorize]
    public class StatementController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<StatementController> _logger;
        private readonly IStatementService _statementService;

        public StatementController(
            ApplicationDbContext context,
            ILogger<StatementController> logger,
            IStatementService statementService)
        {
            _context = context;
            _logger = logger;
            _statementService = statementService;
        }

        // GET: api/retailer/statement
        [HttpGet("statement")]
        public async Task<IActionResult> GetStatement(
            [FromQuery] Guid? account,
            [FromQuery] DateTime? fromDate,
            [FromQuery] DateTime? toDate,
            [FromQuery] string? paymentMode = "all",
            [FromQuery] bool includeItems = false,
            [FromQuery] string? dateFormat = "english")
        {
            try
            {
                _logger.LogInformation("=== GetStatement Started ===");
                _logger.LogInformation("DateFormat: {DateFormat}, FromDate: {FromDate}, ToDate: {ToDate}",
                    dateFormat, fromDate, toDate);

                // Extract claims from JWT
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                // Validate user
                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                {
                    return Unauthorized(new
                    {
                        success = false,
                        error = "Invalid user token. Please login again."
                    });
                }

                // Validate company
                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "No company selected. Please select a company first."
                    });
                }

                // Validate trade type
                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new
                    {
                        success = false,
                        error = "Access restricted to retailer accounts"
                    });
                }

                // Handle fiscal year - get from claims first, then fallback
                Guid fiscalYearIdGuid;
                if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
                {
                    var activeFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

                    if (activeFiscalYear == null)
                    {
                        activeFiscalYear = await _context.FiscalYears
                            .Where(f => f.CompanyId == companyIdGuid)
                            .OrderByDescending(f => f.StartDate)
                            .FirstOrDefaultAsync();

                        if (activeFiscalYear == null)
                        {
                            return BadRequest(new
                            {
                                success = false,
                                error = "No fiscal year found for this company."
                            });
                        }
                    }
                    fiscalYearIdGuid = activeFiscalYear.Id;
                }

                // Build request DTO with dateFormat
                var request = new StatementRequestDTO
                {
                    AccountId = account,
                    FromDate = fromDate,
                    ToDate = toDate,
                    PaymentMode = paymentMode,
                    IncludeItems = includeItems,
                    DateFormat = dateFormat
                };

                // Get statement data from service
                var response = await _statementService.GetStatementAsync(
                    companyIdGuid,
                    fiscalYearIdGuid,
                    userIdGuid,
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
                _logger.LogError(ex, "Error in GetStatement");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching statement",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }
        
        [HttpPut("transaction/{id}/cash-settlement")]
        public async Task<IActionResult> UpdateCashSettlement(Guid id, [FromBody] CashSettlementRequest request)
        {
            try
            {
                // Extract company ID from JWT claims
                var companyIdClaim = User.FindFirst("currentCompany")?.Value;
                if (string.IsNullOrEmpty(companyIdClaim) || !Guid.TryParse(companyIdClaim, out Guid companyIdGuid))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "No company selected. Please select a company first."
                    });
                }

                // Try to find the transaction by direct ID first
                var transaction = await _context.Transactions
                    .Include(t => t.Account)
                    .Include(t => t.CashSettlementUser) // Include the user navigation
                    .FirstOrDefaultAsync(t => t.Id == id && t.CompanyId == companyIdGuid);

                // If not found by direct ID, try to find by related bill IDs
                if (transaction == null)
                {
                    transaction = await _context.Transactions
                        .Include(t => t.Account)
                        .Include(t => t.CashSettlementUser)
                        .FirstOrDefaultAsync(t =>
                            t.CompanyId == companyIdGuid &&
                            (t.SalesBillId == id ||
                             t.PurchaseBillId == id ||
                             t.SalesReturnBillId == id ||
                             t.PurchaseReturnBillId == id ||
                             t.PaymentAccountId == id ||
                             t.ReceiptAccountId == id ||
                             t.JournalBillId == id ||
                             t.DebitNoteId == id ||
                             t.CreditNoteId == id));
                }

                if (transaction == null)
                {
                    _logger.LogWarning($"Transaction not found for ID: {id} in company: {companyIdGuid}");
                    return NotFound(new
                    {
                        success = false,
                        error = "Transaction not found. Please refresh the page and try again."
                    });
                }

                // Only allow cash transactions
                if (transaction.PaymentMode != PaymentMode.Cash)
                {
                    return BadRequest(new { success = false, error = "Cash settlement only available for cash transactions" });
                }

                // Only allow specific transaction types
                var allowedTypes = new[] { TransactionType.Sale, TransactionType.Purc, TransactionType.SlRt, TransactionType.PrRt };
                if (!allowedTypes.Contains(transaction.Type))
                {
                    return BadRequest(new { success = false, error = "Cash settlement only available for Sales, Purchases, Sales Return, and Purchase Return" });
                }

                // Validate the status based on transaction type
                bool isValidStatus = false;
                switch (transaction.Type)
                {
                    case TransactionType.Sale:
                        isValidStatus = request.Status == "Received" || request.Status == "Pending";
                        break;
                    case TransactionType.Purc:
                        isValidStatus = request.Status == "Paid" || request.Status == "Pending";
                        break;
                    case TransactionType.SlRt:
                        isValidStatus = request.Status == "Refunded" || request.Status == "Pending";
                        break;
                    case TransactionType.PrRt:
                        isValidStatus = request.Status == "Returned" || request.Status == "Pending";
                        break;
                    default:
                        isValidStatus = false;
                        break;
                }

                if (!isValidStatus)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = $"Invalid status '{request.Status}' for transaction type '{transaction.Type}'. Valid statuses: " +
                               (transaction.Type == TransactionType.Sale ? "Received, Pending" :
                                transaction.Type == TransactionType.Purc ? "Paid, Pending" :
                                transaction.Type == TransactionType.SlRt ? "Refunded, Pending" :
                                transaction.Type == TransactionType.PrRt ? "Returned, Pending" : "")
                    });
                }

                // Get user ID from claims
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                {
                    return Unauthorized(new { success = false, error = "Invalid user token" });
                }

                // Get user for the settlement record
                var user = await _context.Users
                    .Where(u => u.Id == userIdGuid)
                    .Select(u => new { u.Id, u.Name })
                    .FirstOrDefaultAsync();

                // Update transaction with settlement information
                transaction.CashSettlementStatus = request.Status;
                transaction.CashSettlementDate = DateTime.UtcNow;
                transaction.CashSettlementUserId = userIdGuid;
                transaction.CashSettlementRemarks = request.Remarks;
                transaction.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    success = true,
                    message = $"Cash settlement status updated to {request.Status}",
                    data = new
                    {
                        status = transaction.CashSettlementStatus,
                        date = transaction.CashSettlementDate,
                        user = user?.Name ?? "Unknown User",
                        remarks = transaction.CashSettlementRemarks
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating cash settlement for transaction {TransactionId}", id);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while updating cash settlement"
                });
            }
        }

        public class CashSettlementRequest
        {
            public string Status { get; set; } = string.Empty; // "Received", "Paid", "Refunded","Returned","Pending"
            public string? Remarks { get; set; }
        }

    }
}