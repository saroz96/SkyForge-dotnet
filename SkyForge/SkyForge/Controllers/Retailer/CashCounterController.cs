using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SkyForge.Data;
using SkyForge.Models.Retailer.CashCounterModel;
using SkyForge.Services.Retailer.CashCounterServices;
using System;
using System.Threading.Tasks;

namespace SkyForge.Controllers.Retailer
{
    [ApiController]
    [Route("api/retailer/cash-counter")]
    [Authorize]
    public class CashCounterController : ControllerBase
    {
        private readonly ICashCounterService _cashCounterService;
        private readonly ILogger<CashCounterController> _logger;
        private readonly ApplicationDbContext _context;

        public CashCounterController(
            ICashCounterService cashCounterService,
            ILogger<CashCounterController> logger,
            ApplicationDbContext context)
        {
            _cashCounterService = cashCounterService;
            _logger = logger;
            _context = context;
        }

        // POST: api/retailer/cash-counter/open
        [HttpPost("open")]
        public async Task<IActionResult> OpenCounter([FromBody] OpenCounterRequest request)
        {
            try
            {
                var userId = User.FindFirst("userId")?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearId = User.FindFirst("fiscalYearId")?.Value;

                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                    return Unauthorized(new { success = false, error = "Invalid user" });

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                    return BadRequest(new { success = false, error = "Company not found" });

                if (string.IsNullOrEmpty(fiscalYearId) || !Guid.TryParse(fiscalYearId, out Guid fiscalYearIdGuid))
                    return BadRequest(new { success = false, error = "Fiscal year not found" });

                var session = await _cashCounterService.OpenCounterAsync(
                    userIdGuid,
                    companyIdGuid,
                    fiscalYearIdGuid,
                    request.OpeningBalance,
                    request.Notes);

                return Ok(new
                {
                    success = true,
                    message = "Counter opened successfully",
                    data = session
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error opening counter");
                return StatusCode(500, new { success = false, error = ex.Message });
            }
        }

        // POST: api/retailer/cash-counter/close
        [HttpPost("close")]
        public async Task<IActionResult> CloseCounter([FromBody] CloseCounterRequest request)
        {
            try
            {
                var session = await _cashCounterService.CloseCounterAsync(
                    request.SessionId,
                    request.ClosingBalance,
                    request.Notes);

                return Ok(new
                {
                    success = true,
                    message = "Counter closed successfully",
                    data = session
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error closing counter");
                return StatusCode(500, new { success = false, error = ex.Message });
            }
        }

        // GET: api/retailer/cash-counter/current
        [HttpGet("current-session")]
        public async Task<IActionResult> GetCurrentSessionForCashSummary([FromQuery] Guid? userId = null)
        {
            try
            {
                // If userId is provided (admin viewing another user's session)
                // Otherwise use the logged-in user
                var targetUserId = userId ?? GetUserIdFromClaims();

                if (targetUserId == Guid.Empty)
                    return Unauthorized(new { success = false, error = "Invalid user" });

                var companyId = User.FindFirst("currentCompany")?.Value;
                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                    return BadRequest(new { success = false, error = "Company not found" });

                var session = await _cashCounterService.GetCurrentSessionAsync(targetUserId, companyIdGuid);

                return Ok(new
                {
                    success = true,
                    data = session
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting current session");
                return StatusCode(500, new { success = false, error = ex.Message });
            }
        }

        // Helper method to get userId from claims
        private Guid GetUserIdFromClaims()
        {
            var userId = User.FindFirst("userId")?.Value;
            if (!string.IsNullOrEmpty(userId) && Guid.TryParse(userId, out Guid userIdGuid))
                return userIdGuid;
            return Guid.Empty;
        }


        // GET: api/retailer/cash-counter/user-summary
        [HttpGet("user-summary")]
        public async Task<IActionResult> GetUserCashSummary(
            [FromQuery] Guid? userId = null,
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null)
        {
            try
            {
                // Use provided userId or fallback to claims
                var targetUserId = userId ?? GetUserIdFromClaims();

                if (targetUserId == Guid.Empty)
                    return Unauthorized(new { success = false, error = "Invalid user" });

                var companyId = User.FindFirst("currentCompany")?.Value;
                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                    return BadRequest(new { success = false, error = "Company not found" });

                var totalCash = await _cashCounterService.GetUserCashSummaryAsync(targetUserId, companyIdGuid, fromDate, toDate);
                var sessions = await _cashCounterService.GetUserSessionsAsync(targetUserId, companyIdGuid, fromDate, toDate);

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        totalCash,
                        sessions,
                        sessionCount = sessions.Count
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting user cash summary");
                return StatusCode(500, new { success = false, error = ex.Message });
            }
        }
        // GET: api/retailer/cash-counter/all-sessions
        [HttpGet("all-sessions")]
        public async Task<IActionResult> GetAllSessions(
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null)
        {
            try
            {
                var companyId = User.FindFirst("currentCompany")?.Value;

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                    return BadRequest(new { success = false, error = "Company not found" });

                var sessions = await _cashCounterService.GetAllSessionsAsync(companyIdGuid, fromDate, toDate);

                return Ok(new
                {
                    success = true,
                    data = sessions
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting all sessions");
                return StatusCode(500, new { success = false, error = ex.Message });
            }
        }

        // POST: api/retailer/cash-counter/transaction
        [HttpPost("transaction")]
        public async Task<IActionResult> AddTransaction([FromBody] AddTransactionRequest request)
        {
            try
            {
                var transaction = await _cashCounterService.AddTransactionAsync(
                    request.SessionId,
                    Enum.Parse<CashTransactionType>(request.TransactionType),
                    request.Amount,
                    request.Description,
                    request.ReferenceNumber);

                return Ok(new
                {
                    success = true,
                    message = "Transaction added successfully",
                    data = transaction
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding transaction");
                return StatusCode(500, new { success = false, error = ex.Message });
            }
        }

        [HttpPost("open-with-denominations")]
        public async Task<IActionResult> OpenCounterWithDenominations([FromBody] OpenCounterWithDenominationsRequest request)
        {
            try
            {
                _logger.LogInformation("=== OpenCounterWithDenominations Started ===");

                var userId = User.FindFirst("userId")?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;

                // Log claims for debugging
                _logger.LogInformation($"UserId claim: {userId}");
                _logger.LogInformation($"CompanyId claim: {companyId}");
                _logger.LogInformation($"FiscalYearId claim: {fiscalYearIdClaim}");

                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                    return Unauthorized(new { success = false, error = "Invalid user" });

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                    return BadRequest(new { success = false, error = "Company not found" });

                // Get fiscal year - try claim first, then get active fiscal year
                Guid fiscalYearIdGuid;
                if (!string.IsNullOrEmpty(fiscalYearIdClaim) && Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
                {
                    _logger.LogInformation($"Using fiscal year from claim: {fiscalYearIdGuid}");
                }
                else
                {
                    // If not in claims, get active fiscal year for the company
                    var activeFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

                    if (activeFiscalYear == null)
                    {
                        // Try to get any fiscal year as fallback
                        activeFiscalYear = await _context.FiscalYears
                            .Where(f => f.CompanyId == companyIdGuid)
                            .OrderByDescending(f => f.StartDate)
                            .FirstOrDefaultAsync();

                        if (activeFiscalYear == null)
                        {
                            return BadRequest(new { success = false, error = "No fiscal year found for this company. Please select a fiscal year first." });
                        }
                    }
                    fiscalYearIdGuid = activeFiscalYear.Id;
                    _logger.LogInformation($"Using active fiscal year: {fiscalYearIdGuid}");
                }

                var session = await _cashCounterService.OpenCounterWithDenominationsAsync(
                    request.UserId,
                    companyIdGuid,
                    fiscalYearIdGuid,
                    request.Denominations,
                    request.Notes);

                return Ok(new
                {
                    success = true,
                    message = "Counter opened successfully",
                    data = session
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error opening counter with denominations");
                return StatusCode(500, new { success = false, error = ex.Message });
            }
        }
        // GET: api/retailer/cash-counter/denominations/{sessionId}
        [HttpGet("denominations/{sessionId}")]
        public async Task<IActionResult> GetSessionDenominations(Guid sessionId)
        {
            try
            {
                var denominations = await _cashCounterService.GetSessionDenominationsAsync(sessionId);
                return Ok(new
                {
                    success = true,
                    data = denominations
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting session denominations");
                return StatusCode(500, new { success = false, error = ex.Message });
            }
        }

        // POST: api/retailer/cash-counter/close-with-denominations
        [HttpPost("close-with-denominations")]
        public async Task<IActionResult> CloseCounterWithDenominations([FromBody] CloseCounterWithDenominationsRequest request)
        {
            try
            {
                var session = await _cashCounterService.CloseCounterWithDenominationsAsync(
                    request.SessionId,
                    request.ClosingDenominations,
                    request.Notes);

                return Ok(new
                {
                    success = true,
                    message = "Counter closed successfully",
                    data = session
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error closing counter with denominations");
                return StatusCode(500, new { success = false, error = ex.Message });
            }
        }
    }


    // Request DTOs
    public class OpenCounterRequest
    {
        public decimal OpeningBalance { get; set; }
        public string? Notes { get; set; }
    }

    public class CloseCounterRequest
    {
        public Guid SessionId { get; set; }
        public decimal ClosingBalance { get; set; }
        public string? Notes { get; set; }
    }

    public class AddTransactionRequest
    {
        public Guid SessionId { get; set; }
        public string TransactionType { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string? Description { get; set; }
        public string? ReferenceNumber { get; set; }
    }

    public class OpenCounterWithDenominationsRequest
    {
        public Guid UserId { get; set; }
        public Dictionary<int, int> Denominations { get; set; } = new Dictionary<int, int>();
        public string? Notes { get; set; }
    }

    public class CloseCounterWithDenominationsRequest
    {
        public Guid SessionId { get; set; }
        public Dictionary<int, int> ClosingDenominations { get; set; } = new Dictionary<int, int>();
        public string? Notes { get; set; }
    }
}