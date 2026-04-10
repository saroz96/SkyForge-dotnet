// Controllers/Retailer/StatementController.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SkyForge.Data;
using SkyForge.Dto.RetailerDto.TransactionDto;
using SkyForge.Models.CompanyModel;
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

                // Build request DTO
                var request = new StatementRequestDTO
                {
                    AccountId = account,
                    FromDate = fromDate,
                    ToDate = toDate,
                    PaymentMode = paymentMode,
                    IncludeItems = includeItems
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
   
   
    }
}