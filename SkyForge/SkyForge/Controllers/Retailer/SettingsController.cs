using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SkyForge.Data;
using SkyForge.Dto.RetailerDto;
using SkyForge.Models.CompanyModel;
using SkyForge.Models.Retailer.SettingsModel;
using SkyForge.Services.Retailer.SettingsServices;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

namespace SkyForge.Controllers.Retailer
{
    [ApiController]
    [Route("api/retailer")]
    [Authorize]
    public class SettingsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<SettingsController> _logger;
        private readonly ISettingsService _settingsService;

        public SettingsController(
            ApplicationDbContext context,
            ILogger<SettingsController> logger,
            ISettingsService settingsService)
        {
            _context = context;
            _logger = logger;
            _settingsService = settingsService;
        }

        [HttpGet("roundoff-sales")]
        public async Task<IActionResult> GetRoundOffSalesSettings()
        {
            try
            {
                _logger.LogInformation("=== GetRoundOffSalesSettings Started ===");

                // Extract claims from JWT token
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;
                var currentCompanyName = User.FindFirst("currentCompanyName")?.Value;

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

                // Validate trade type
                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new
                    {
                        success = false,
                        error = "Access forbidden for this trade type"
                    });
                }

                // Handle fiscal year - get from claims first, then fallback to active fiscal year
                Guid fiscalYearIdGuid;
                if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
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
                            return BadRequest(new
                            {
                                success = false,
                                error = "No fiscal year found for this company. Please select a fiscal year first."
                            });
                        }
                    }
                    fiscalYearIdGuid = activeFiscalYear.Id;

                    _logger.LogInformation($"Using active fiscal year: {fiscalYearIdGuid}");
                }

                // Get settings using the service
                var settingsData = await _settingsService.GetRoundOffSalesSettingsAsync(companyIdGuid, fiscalYearIdGuid, userIdGuid);

                // Return JSON response matching Node.js structure
                return Ok(new
                {
                    success = true,
                    data = settingsData
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching settings");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Error fetching settings",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        [HttpPost("roundoff-sales")]
        public async Task<IActionResult> UpdateRoundOffSalesSettings([FromBody] UpdateRoundOffSalesRequestDTO request)
        {
            try
            {
                _logger.LogInformation("=== UpdateRoundOffSalesSettings START ===");
                _logger.LogInformation($"RoundOffSales value: {request.RoundOffSales}");

                // Extract claims
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                // Validate user ID
                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                {
                    return Unauthorized(new { success = false, error = "Invalid user token" });
                }

                // Validate company ID
                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new { success = false, error = "No company selected" });
                }

                // Validate trade type
                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new { success = false, error = "Access forbidden" });
                }

                bool roundOffBoolean = request.RoundOffSales;
                _logger.LogInformation($"Using value: {roundOffBoolean}");

                // Handle fiscal year
                Guid fiscalYearIdGuid;
                if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
                {
                    var activeFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

                    if (activeFiscalYear == null)
                    {
                        return BadRequest(new { success = false, error = "No active fiscal year found" });
                    }
                    fiscalYearIdGuid = activeFiscalYear.Id;
                }

                var updatedSettings = await _settingsService.UpdateRoundOffSalesSettingsAsync(
                    companyIdGuid, fiscalYearIdGuid, userIdGuid, roundOffBoolean);

                return Ok(new
                {
                    success = true,
                    message = "Settings updated successfully",
                    data = new
                    {
                        roundOffSales = updatedSettings.RoundOffSales,
                        fiscalYearId = fiscalYearIdGuid
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating settings");
                return StatusCode(500, new { success = false, error = "Server Error", details = ex.Message });
            }
        }

        [HttpGet("roundoff-sales-return")]
        public async Task<IActionResult> GetRoundOffSalesReturnSettings()
        {
            // Your existing GET method here
            try
            {
                _logger.LogInformation("=== GetRoundOffSalesReturnSettings Started ===");

                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                {
                    return Unauthorized(new { success = false, error = "Invalid user token" });
                }

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new { success = false, error = "No company selected" });
                }

                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new { success = false, error = "Access forbidden" });
                }

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
                            return BadRequest(new { success = false, error = "No fiscal year found" });
                        }
                    }
                    fiscalYearIdGuid = activeFiscalYear.Id;
                }

                var settingsData = await _settingsService.GetRoundOffSalesReturnSettingsAsync(companyIdGuid, fiscalYearIdGuid, userIdGuid);

                return Ok(new { success = true, data = settingsData });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching sales return settings");
                return StatusCode(500, new { success = false, error = "Error fetching settings" });
            }
        }

        [HttpPost("roundoff-sales-return")]
        public async Task<IActionResult> UpdateRoundOffSalesReturnSettings([FromBody] UpdateRoundOffSalesReturnRequestDTO request)
        {
            try
            {
                _logger.LogInformation("=== UpdateRoundOffSalesReturnSettings START ===");
                _logger.LogInformation($"RoundOffSalesReturn value: {request.RoundOffSalesReturn}");

                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                {
                    return Unauthorized(new { success = false, error = "Invalid user token" });
                }

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new { success = false, error = "No company selected" });
                }

                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new { success = false, error = "Access forbidden" });
                }

                bool roundOffBoolean = request.RoundOffSalesReturn;

                Guid fiscalYearIdGuid;
                if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
                {
                    var activeFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

                    if (activeFiscalYear == null)
                    {
                        return BadRequest(new { success = false, error = "No active fiscal year found" });
                    }
                    fiscalYearIdGuid = activeFiscalYear.Id;
                }

                var updatedSettings = await _settingsService.UpdateRoundOffSalesReturnSettingsAsync(
                    companyIdGuid, fiscalYearIdGuid, userIdGuid, roundOffBoolean);

                return Ok(new
                {
                    success = true,
                    message = "Settings updated successfully",
                    data = new { roundOffSalesReturn = updatedSettings.RoundOffSalesReturn }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating sales return settings");
                return StatusCode(500, new { success = false, error = "Server Error", details = ex.Message });
            }
        }

        [HttpGet("roundoff-purchase")]
        public async Task<IActionResult> GetRoundOffPurchaseSettings()
        {
            // Similar to GET above
            try
            {
                _logger.LogInformation("=== GetRoundOffPurchaseSettings Started ===");

                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                {
                    return Unauthorized(new { success = false, error = "Invalid user token" });
                }

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new { success = false, error = "No company selected" });
                }

                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new { success = false, error = "Access forbidden" });
                }

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
                            return BadRequest(new { success = false, error = "No fiscal year found" });
                        }
                    }
                    fiscalYearIdGuid = activeFiscalYear.Id;
                }

                var settingsData = await _settingsService.GetRoundOffPurchaseSettingsAsync(companyIdGuid, fiscalYearIdGuid, userIdGuid);

                return Ok(new { success = true, data = settingsData });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching purchase settings");
                return StatusCode(500, new { success = false, error = "Error fetching settings" });
            }
        }

        [HttpPost("roundoff-purchase")]
        public async Task<IActionResult> UpdateRoundOffPurchaseSettings([FromBody] UpdateRoundOffPurchaseRequestDTO request)
        {
            try
            {
                _logger.LogInformation("=== UpdateRoundOffPurchaseSettings START ===");
                _logger.LogInformation($"RoundOffPurchase value: {request.RoundOffPurchase}");

                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                {
                    return Unauthorized(new { success = false, error = "Invalid user token" });
                }

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new { success = false, error = "No company selected" });
                }

                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new { success = false, error = "Access forbidden" });
                }

                bool roundOffBoolean = request.RoundOffPurchase;

                Guid fiscalYearIdGuid;
                if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
                {
                    var activeFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

                    if (activeFiscalYear == null)
                    {
                        return BadRequest(new { success = false, error = "No active fiscal year found" });
                    }
                    fiscalYearIdGuid = activeFiscalYear.Id;
                }

                var updatedSettings = await _settingsService.UpdateRoundOffPurchaseSettingsAsync(
                    companyIdGuid, fiscalYearIdGuid, userIdGuid, roundOffBoolean);

                return Ok(new
                {
                    success = true,
                    message = "Settings updated successfully",
                    data = new { roundOffPurchase = updatedSettings.RoundOffPurchase }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating purchase settings");
                return StatusCode(500, new { success = false, error = "Server Error", details = ex.Message });
            }
        }

        [HttpGet("roundoff-purchase-return")]
        public async Task<IActionResult> GetRoundOffPurchaseReturnSettings()
        {
            // Similar to GET above
            try
            {
                _logger.LogInformation("=== GetRoundOffPurchaseReturnSettings Started ===");

                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                {
                    return Unauthorized(new { success = false, error = "Invalid user token" });
                }

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new { success = false, error = "No company selected" });
                }

                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new { success = false, error = "Access forbidden" });
                }

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
                            return BadRequest(new { success = false, error = "No fiscal year found" });
                        }
                    }
                    fiscalYearIdGuid = activeFiscalYear.Id;
                }

                var settingsData = await _settingsService.GetRoundOffPurchaseReturnSettingsAsync(companyIdGuid, fiscalYearIdGuid, userIdGuid);

                return Ok(new { success = true, data = settingsData });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching purchase return settings");
                return StatusCode(500, new { success = false, error = "Error fetching settings" });
            }
        }

        [HttpPost("roundoff-purchase-return")]
        public async Task<IActionResult> UpdateRoundOffPurchaseReturnSettings([FromBody] UpdateRoundOffPurchaseReturnRequestDTO request)
        {
            try
            {
                _logger.LogInformation("=== UpdateRoundOffPurchaseReturnSettings START ===");
                _logger.LogInformation($"RoundOffPurchaseReturn value: {request.RoundOffPurchaseReturn}");

                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                {
                    return Unauthorized(new { success = false, error = "Invalid user token" });
                }

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new { success = false, error = "No company selected" });
                }

                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new { success = false, error = "Access forbidden" });
                }

                bool roundOffBoolean = request.RoundOffPurchaseReturn;

                Guid fiscalYearIdGuid;
                if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
                {
                    var activeFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

                    if (activeFiscalYear == null)
                    {
                        return BadRequest(new { success = false, error = "No active fiscal year found" });
                    }
                    fiscalYearIdGuid = activeFiscalYear.Id;
                }

                var updatedSettings = await _settingsService.UpdateRoundOffPurchaseReturnSettingsAsync(
                    companyIdGuid, fiscalYearIdGuid, userIdGuid, roundOffBoolean);

                return Ok(new
                {
                    success = true,
                    message = "Settings updated successfully",
                    data = new { roundOffPurchaseReturn = updatedSettings.RoundOffPurchaseReturn }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating purchase return settings");
                return StatusCode(500, new { success = false, error = "Server Error", details = ex.Message });
            }
        }

        [HttpGet("get-display-sales-transactions")]
        public async Task<IActionResult> GetDisplaySalesTransactions()
        {
            // Your existing GET method
            try
            {
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                {
                    return Unauthorized(new { success = false, error = "Invalid user token" });
                }

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new { success = false, error = "No company selected" });
                }

                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new { success = false, error = "Access forbidden" });
                }

                var settingsData = await _settingsService.GetDisplaySalesTransactionsAsync(companyIdGuid, userIdGuid);

                return Ok(new { success = true, data = settingsData });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching display sales transactions");
                return StatusCode(500, new { success = false, error = "Internal Server Error" });
            }
        }

        [HttpPost("updateDisplayTransactionsForSales")]
        public async Task<IActionResult> UpdateDisplayTransactionsForSales([FromBody] UpdateDisplayTransactionsRequestDTO request)
        {
            try
            {
                _logger.LogInformation("=== UpdateDisplayTransactionsForSales START ===");
                _logger.LogInformation($"DisplayTransactions value: {request.DisplayTransactions}");

                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                {
                    return Unauthorized(new { success = false, error = "Invalid user token" });
                }

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new { success = false, error = "No company selected" });
                }

                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new { success = false, error = "Access forbidden" });
                }

                bool displayTransactionsBoolean = request.DisplayTransactions;

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
                            return BadRequest(new { success = false, message = "No fiscal year found" });
                        }
                    }
                    fiscalYearIdGuid = activeFiscalYear.Id;
                }

                var updatedSettings = await _settingsService.UpdateDisplayTransactionsForSalesAsync(
                    companyIdGuid, userIdGuid, fiscalYearIdGuid, displayTransactionsBoolean);

                return Ok(new
                {
                    success = true,
                    message = "Settings updated successfully",
                    data = new
                    {
                        displayTransactions = updatedSettings.DisplayTransactions,
                        updatedSettings = new
                        {
                            id = updatedSettings.Id,
                            fiscalYearId = updatedSettings.FiscalYearId,
                            displayTransactions = updatedSettings.DisplayTransactions,
                            updatedAt = updatedSettings.UpdatedAt
                        }
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating display transactions");
                return StatusCode(500, new { success = false, error = "Internal Server Error", details = ex.Message });
            }
        }

        [HttpGet("get-display-sales-return-transactions")]
        public async Task<IActionResult> GetDisplaySalesReturnTransactions()
        {
            // Your existing GET method
            try
            {
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                {
                    return Unauthorized(new { success = false, error = "Invalid user token" });
                }

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new { success = false, error = "No company selected" });
                }

                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new { success = false, error = "Access forbidden" });
                }

                var settingsData = await _settingsService.GetDisplaySalesReturnTransactionsAsync(companyIdGuid, userIdGuid);

                return Ok(new { success = true, data = settingsData });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching display sales return transactions");
                return StatusCode(500, new { success = false, error = "Internal Server Error" });
            }
        }

        [HttpPost("updateDisplayTransactionsForSalesReturn")]
        public async Task<IActionResult> UpdateDisplayTransactionsForSalesReturn([FromBody] UpdateDisplayTransactionsForSalesReturnRequestDTO request)
        {
            try
            {
                _logger.LogInformation("=== UpdateDisplayTransactionsForSalesReturn START ===");
                _logger.LogInformation($"DisplayTransactionsForSalesReturn value: {request.DisplayTransactionsForSalesReturn}");

                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                {
                    return Unauthorized(new { success = false, error = "Invalid user token" });
                }

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new { success = false, error = "No company selected" });
                }

                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new { success = false, error = "Access forbidden" });
                }

                bool displayTransactionsBoolean = request.DisplayTransactionsForSalesReturn;

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
                            return BadRequest(new { success = false, message = "No fiscal year found" });
                        }
                    }
                    fiscalYearIdGuid = activeFiscalYear.Id;
                }

                var updatedSettings = await _settingsService.UpdateDisplayTransactionsForSalesReturnAsync(
                    companyIdGuid, userIdGuid, fiscalYearIdGuid, displayTransactionsBoolean);

                return Ok(new
                {
                    success = true,
                    message = "Settings updated successfully",
                    data = new
                    {
                        displayTransactionsForSalesReturn = updatedSettings.DisplayTransactionsForSalesReturn,
                        settingsId = updatedSettings.Id,
                        updatedAt = updatedSettings.UpdatedAt
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating display transactions for sales return");
                return StatusCode(500, new { success = false, error = "Internal Server Error", details = ex.Message });
            }
        }

        [HttpGet("get-display-purchase-transactions")]
        public async Task<IActionResult> GetDisplayPurchaseTransactions()
        {
            // Your existing GET method
            try
            {
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                {
                    return Unauthorized(new { success = false, error = "Invalid user token" });
                }

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new { success = false, error = "No company selected" });
                }

                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new { success = false, error = "Access forbidden" });
                }

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
                            return BadRequest(new { success = false, error = "No fiscal year found" });
                        }
                    }
                    fiscalYearIdGuid = activeFiscalYear.Id;
                }

                var settingsData = await _settingsService.GetDisplayPurchaseTransactionsAsync(companyIdGuid, userIdGuid, fiscalYearIdGuid);

                return Ok(new { success = true, data = settingsData });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching display purchase transactions");
                return StatusCode(500, new { success = false, error = "Internal Server Error" });
            }
        }

        [HttpPost("PurchaseTransactionDisplayUpdate")]
        public async Task<IActionResult> UpdateDisplayTransactionsForPurchase([FromBody] UpdateDisplayTransactionsForPurchaseRequestDTO request)
        {
            try
            {
                _logger.LogInformation("=== UpdateDisplayTransactionsForPurchase START ===");
                _logger.LogInformation($"DisplayTransactionsForPurchase value: {request.DisplayTransactionsForPurchase}");

                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;
                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new { success = false, message = "Access denied. Retailer trade type required." });
                }

                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;

                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                {
                    return Unauthorized(new { success = false, error = "Invalid user token" });
                }

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new { success = false, error = "No company selected" });
                }

                bool displayTransactionsBoolean = request.DisplayTransactionsForPurchase;

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
                            return BadRequest(new { success = false, message = "No fiscal year found" });
                        }
                    }
                    fiscalYearIdGuid = activeFiscalYear.Id;
                }

                var updatedSettings = await _settingsService.UpdateDisplayTransactionsForPurchaseAsync(
                    companyIdGuid, userIdGuid, fiscalYearIdGuid, displayTransactionsBoolean);

                return Ok(new
                {
                    success = true,
                    message = "Settings updated successfully",
                    data = new
                    {
                        displayTransactionsForPurchase = updatedSettings.DisplayTransactionsForPurchase,
                        settingsId = updatedSettings.Id,
                        updatedAt = updatedSettings.UpdatedAt
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating display transactions for purchase");
                return StatusCode(500, new { success = false, message = "Internal Server Error", error = ex.Message });
            }
        }

        [HttpGet("get-display-purchase-return-transactions")]
        public async Task<IActionResult> GetDisplayPurchaseReturnTransactions()
        {
            // Your existing GET method (similar to above)
            try
            {
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                {
                    return Unauthorized(new { success = false, error = "Invalid user token" });
                }

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new { success = false, error = "No company selected" });
                }

                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new { success = false, error = "Access forbidden" });
                }

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
                            return BadRequest(new { success = false, error = "No fiscal year found" });
                        }
                    }
                    fiscalYearIdGuid = activeFiscalYear.Id;
                }

                var settingsData = await _settingsService.GetDisplayPurchaseReturnTransactionsAsync(companyIdGuid, userIdGuid, fiscalYearIdGuid);

                return Ok(new { success = true, data = settingsData });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching display purchase return transactions");
                return StatusCode(500, new { success = false, error = "Internal Server Error" });
            }
        }

        [HttpPost("PurchaseReturnTransactionDisplayUpdate")]
        public async Task<IActionResult> UpdateDisplayTransactionsForPurchaseReturn([FromBody] UpdateDisplayTransactionsForPurchaseReturnRequestDTO request)
        {
            try
            {
                _logger.LogInformation("=== UpdateDisplayTransactionsForPurchaseReturn START ===");
                _logger.LogInformation($"DisplayTransactionsForPurchaseReturn value: {request.DisplayTransactionsForPurchaseReturn}");

                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;
                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new { success = false, message = "Access denied. Retailer trade type required." });
                }

                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;

                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                {
                    return Unauthorized(new { success = false, error = "Invalid user token" });
                }

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new { success = false, error = "No company selected" });
                }

                bool displayTransactionsBoolean = request.DisplayTransactionsForPurchaseReturn;

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
                            return BadRequest(new { success = false, message = "No fiscal year found" });
                        }
                    }
                    fiscalYearIdGuid = activeFiscalYear.Id;
                }

                var updatedSettings = await _settingsService.UpdateDisplayTransactionsForPurchaseReturnAsync(
                    companyIdGuid, userIdGuid, fiscalYearIdGuid, displayTransactionsBoolean);

                return Ok(new
                {
                    success = true,
                    message = "Settings updated successfully",
                    data = new
                    {
                        displayTransactionsForPurchaseReturn = updatedSettings.DisplayTransactionsForPurchaseReturn,
                        settingsId = updatedSettings.Id,
                        updatedAt = updatedSettings.UpdatedAt
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating display transactions for purchase return");
                return StatusCode(500, new { success = false, message = "Internal Server Error", error = ex.Message });
            }
        }

        // Purchase Date Preference
        [HttpGet("date-preference/purchase")]
        public async Task<IActionResult> GetDatePreferenceForPurchase()
        {
            try
            {
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;

                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                    return Unauthorized(new { success = false, error = "Invalid user token" });

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                    return BadRequest(new { success = false, error = "No company selected" });

                Guid fiscalYearIdGuid;
                if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
                {
                    var activeFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);
                    if (activeFiscalYear == null)
                        return BadRequest(new { success = false, error = "No fiscal year found" });
                    fiscalYearIdGuid = activeFiscalYear.Id;
                }

                var result = await _settingsService.GetDatePreferenceForPurchaseAsync(companyIdGuid, fiscalYearIdGuid, userIdGuid);

                return Ok(new { success = true, data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting date preference for purchase");
                return StatusCode(500, new { success = false, error = "Internal Server Error" });
            }
        }

        [HttpPost("date-preference/purchase")]
        public async Task<IActionResult> UpdateDatePreferenceForPurchase([FromBody] UpdateDatePreferenceRequest request)
        {
            try
            {
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                    return Unauthorized(new { success = false, error = "Invalid user token" });

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                    return BadRequest(new { success = false, error = "No company selected" });

                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                    return StatusCode(403, new { success = false, error = "Access forbidden" });

                Guid fiscalYearIdGuid;
                if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
                {
                    var activeFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);
                    if (activeFiscalYear == null)
                        return BadRequest(new { success = false, error = "No fiscal year found" });
                    fiscalYearIdGuid = activeFiscalYear.Id;
                }

                var updatedSettings = await _settingsService.UpdateDatePreferenceForPurchaseAsync(
                    companyIdGuid, fiscalYearIdGuid, userIdGuid, request.UseVoucherLastDate);

                return Ok(new
                {
                    success = true,
                    message = "Date preference updated successfully",
                    data = new { useVoucherLastDate = updatedSettings.UseVoucherLastDateForPurchase }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating date preference for purchase");
                return StatusCode(500, new { success = false, error = "Internal Server Error" });
            }
        }

        // Sales Date Preference
        [HttpGet("date-preference/sales")]
        public async Task<IActionResult> GetDatePreferenceForSales()
        {
            try
            {
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;

                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                    return Unauthorized(new { success = false, error = "Invalid user token" });

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                    return BadRequest(new { success = false, error = "No company selected" });

                Guid fiscalYearIdGuid;
                if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
                {
                    var activeFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);
                    if (activeFiscalYear == null)
                        return BadRequest(new { success = false, error = "No fiscal year found" });
                    fiscalYearIdGuid = activeFiscalYear.Id;
                }

                var result = await _settingsService.GetDatePreferenceForSalesAsync(companyIdGuid, fiscalYearIdGuid, userIdGuid);

                return Ok(new { success = true, data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting date preference for sales");
                return StatusCode(500, new { success = false, error = "Internal Server Error" });
            }
        }

        [HttpPost("date-preference/sales")]
        public async Task<IActionResult> UpdateDatePreferenceForSales([FromBody] UpdateDatePreferenceRequest request)
        {
            try
            {
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                    return Unauthorized(new { success = false, error = "Invalid user token" });

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                    return BadRequest(new { success = false, error = "No company selected" });

                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                    return StatusCode(403, new { success = false, error = "Access forbidden" });

                Guid fiscalYearIdGuid;
                if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
                {
                    var activeFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);
                    if (activeFiscalYear == null)
                        return BadRequest(new { success = false, error = "No fiscal year found" });
                    fiscalYearIdGuid = activeFiscalYear.Id;
                }

                var updatedSettings = await _settingsService.UpdateDatePreferenceForSalesAsync(
                    companyIdGuid, fiscalYearIdGuid, userIdGuid, request.UseVoucherLastDate);

                return Ok(new
                {
                    success = true,
                    message = "Date preference updated successfully",
                    data = new { useVoucherLastDate = updatedSettings.UseVoucherLastDateForSales }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating date preference for sales");
                return StatusCode(500, new { success = false, error = "Internal Server Error" });
            }
        }

        // Sales Return Date Preference
        [HttpGet("date-preference/sales-return")]
        public async Task<IActionResult> GetDatePreferenceForSalesReturn()
        {
            try
            {
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;

                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                    return Unauthorized(new { success = false, error = "Invalid user token" });

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                    return BadRequest(new { success = false, error = "No company selected" });

                Guid fiscalYearIdGuid;
                if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
                {
                    var activeFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);
                    if (activeFiscalYear == null)
                        return BadRequest(new { success = false, error = "No fiscal year found" });
                    fiscalYearIdGuid = activeFiscalYear.Id;
                }

                var result = await _settingsService.GetDatePreferenceForSalesReturnAsync(companyIdGuid, fiscalYearIdGuid, userIdGuid);

                return Ok(new { success = true, data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting date preference for sales return");
                return StatusCode(500, new { success = false, error = "Internal Server Error" });
            }
        }

        [HttpPost("date-preference/sales-return")]
        public async Task<IActionResult> UpdateDatePreferenceForSalesReturn([FromBody] UpdateDatePreferenceRequest request)
        {
            try
            {
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                    return Unauthorized(new { success = false, error = "Invalid user token" });

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                    return BadRequest(new { success = false, error = "No company selected" });

                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                    return StatusCode(403, new { success = false, error = "Access forbidden" });

                Guid fiscalYearIdGuid;
                if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
                {
                    var activeFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);
                    if (activeFiscalYear == null)
                        return BadRequest(new { success = false, error = "No fiscal year found" });
                    fiscalYearIdGuid = activeFiscalYear.Id;
                }

                var updatedSettings = await _settingsService.UpdateDatePreferenceForSalesReturnAsync(
                    companyIdGuid, fiscalYearIdGuid, userIdGuid, request.UseVoucherLastDate);

                return Ok(new
                {
                    success = true,
                    message = "Date preference updated successfully",
                    data = new { useVoucherLastDate = updatedSettings.UseVoucherLastDateForSalesReturn }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating date preference for sales return");
                return StatusCode(500, new { success = false, error = "Internal Server Error" });
            }
        }

        // Purchase Return Date Preference
        [HttpGet("date-preference/purchase-return")]
        public async Task<IActionResult> GetDatePreferenceForPurchaseReturn()
        {
            try
            {
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;

                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                    return Unauthorized(new { success = false, error = "Invalid user token" });

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                    return BadRequest(new { success = false, error = "No company selected" });

                Guid fiscalYearIdGuid;
                if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
                {
                    var activeFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);
                    if (activeFiscalYear == null)
                        return BadRequest(new { success = false, error = "No fiscal year found" });
                    fiscalYearIdGuid = activeFiscalYear.Id;
                }

                var result = await _settingsService.GetDatePreferenceForPurchaseReturnAsync(companyIdGuid, fiscalYearIdGuid, userIdGuid);

                return Ok(new { success = true, data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting date preference for purchase return");
                return StatusCode(500, new { success = false, error = "Internal Server Error" });
            }
        }

        [HttpPost("date-preference/purchase-return")]
        public async Task<IActionResult> UpdateDatePreferenceForPurchaseReturn([FromBody] UpdateDatePreferenceRequest request)
        {
            try
            {
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                    return Unauthorized(new { success = false, error = "Invalid user token" });

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                    return BadRequest(new { success = false, error = "No company selected" });

                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                    return StatusCode(403, new { success = false, error = "Access forbidden" });

                Guid fiscalYearIdGuid;
                if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
                {
                    var activeFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);
                    if (activeFiscalYear == null)
                        return BadRequest(new { success = false, error = "No fiscal year found" });
                    fiscalYearIdGuid = activeFiscalYear.Id;
                }

                var updatedSettings = await _settingsService.UpdateDatePreferenceForPurchaseReturnAsync(
                    companyIdGuid, fiscalYearIdGuid, userIdGuid, request.UseVoucherLastDate);

                return Ok(new
                {
                    success = true,
                    message = "Date preference updated successfully",
                    data = new { useVoucherLastDate = updatedSettings.UseVoucherLastDateForPurchaseReturn }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating date preference for purchase return");
                return StatusCode(500, new { success = false, error = "Internal Server Error" });
            }
        }


        // Payment Date Preference
        [HttpGet("date-preference/payment")]
        public async Task<IActionResult> GetDatePreferenceForPayment()
        {
            try
            {
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;

                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                    return Unauthorized(new { success = false, error = "Invalid user token" });

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                    return BadRequest(new { success = false, error = "No company selected" });

                Guid fiscalYearIdGuid;
                if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
                {
                    var activeFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);
                    if (activeFiscalYear == null)
                        return BadRequest(new { success = false, error = "No fiscal year found" });
                    fiscalYearIdGuid = activeFiscalYear.Id;
                }

                var result = await _settingsService.GetDatePreferenceForPaymentAsync(companyIdGuid, fiscalYearIdGuid, userIdGuid);

                return Ok(new { success = true, data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting date preference for payment");
                return StatusCode(500, new { success = false, error = "Internal Server Error" });
            }
        }

        [HttpPost("date-preference/payment")]
        public async Task<IActionResult> UpdateDatePreferenceForPayment([FromBody] UpdateDatePreferenceRequest request)
        {
            try
            {
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                    return Unauthorized(new { success = false, error = "Invalid user token" });

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                    return BadRequest(new { success = false, error = "No company selected" });

                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                    return StatusCode(403, new { success = false, error = "Access forbidden" });

                Guid fiscalYearIdGuid;
                if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
                {
                    var activeFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);
                    if (activeFiscalYear == null)
                        return BadRequest(new { success = false, error = "No fiscal year found" });
                    fiscalYearIdGuid = activeFiscalYear.Id;
                }

                var updatedSettings = await _settingsService.UpdateDatePreferenceForPaymentAsync(
                    companyIdGuid, fiscalYearIdGuid, userIdGuid, request.UseVoucherLastDate);

                return Ok(new
                {
                    success = true,
                    message = "Date preference updated successfully",
                    data = new { useVoucherLastDate = updatedSettings.UseVoucherLastDateForPayment }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating date preference for payment");
                return StatusCode(500, new { success = false, error = "Internal Server Error" });
            }
        }

        // Receipt Date Preference
        [HttpGet("date-preference/receipt")]
        public async Task<IActionResult> GetDatePreferenceForReceipt()
        {
            try
            {
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;

                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                    return Unauthorized(new { success = false, error = "Invalid user token" });

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                    return BadRequest(new { success = false, error = "No company selected" });

                Guid fiscalYearIdGuid;
                if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
                {
                    var activeFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);
                    if (activeFiscalYear == null)
                        return BadRequest(new { success = false, error = "No fiscal year found" });
                    fiscalYearIdGuid = activeFiscalYear.Id;
                }

                var result = await _settingsService.GetDatePreferenceForReceiptAsync(companyIdGuid, fiscalYearIdGuid, userIdGuid);

                return Ok(new { success = true, data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting date preference for receipt");
                return StatusCode(500, new { success = false, error = "Internal Server Error" });
            }
        }

        [HttpPost("date-preference/receipt")]
        public async Task<IActionResult> UpdateDatePreferenceForReceipt([FromBody] UpdateDatePreferenceRequest request)
        {
            try
            {
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                    return Unauthorized(new { success = false, error = "Invalid user token" });

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                    return BadRequest(new { success = false, error = "No company selected" });

                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                    return StatusCode(403, new { success = false, error = "Access forbidden" });

                Guid fiscalYearIdGuid;
                if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
                {
                    var activeFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);
                    if (activeFiscalYear == null)
                        return BadRequest(new { success = false, error = "No fiscal year found" });
                    fiscalYearIdGuid = activeFiscalYear.Id;
                }

                var updatedSettings = await _settingsService.UpdateDatePreferenceForReceiptAsync(
                    companyIdGuid, fiscalYearIdGuid, userIdGuid, request.UseVoucherLastDate);

                return Ok(new
                {
                    success = true,
                    message = "Date preference updated successfully",
                    data = new { useVoucherLastDate = updatedSettings.UseVoucherLastDateForReceipt }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating date preference for receipt");
                return StatusCode(500, new { success = false, error = "Internal Server Error" });
            }
        }


        // Journal Date Preference
        [HttpGet("date-preference/journal")]
        public async Task<IActionResult> GetDatePreferenceForJournal()
        {
            try
            {
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;

                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                    return Unauthorized(new { success = false, error = "Invalid user token" });

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                    return BadRequest(new { success = false, error = "No company selected" });

                Guid fiscalYearIdGuid;
                if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
                {
                    var activeFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);
                    if (activeFiscalYear == null)
                        return BadRequest(new { success = false, error = "No fiscal year found" });
                    fiscalYearIdGuid = activeFiscalYear.Id;
                }

                var result = await _settingsService.GetDatePreferenceForJournalAsync(companyIdGuid, fiscalYearIdGuid, userIdGuid);

                return Ok(new { success = true, data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting date preference for journal");
                return StatusCode(500, new { success = false, error = "Internal Server Error" });
            }
        }

        [HttpPost("date-preference/journal")]
        public async Task<IActionResult> UpdateDatePreferenceForJournal([FromBody] UpdateDatePreferenceRequest request)
        {
            try
            {
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                    return Unauthorized(new { success = false, error = "Invalid user token" });

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                    return BadRequest(new { success = false, error = "No company selected" });

                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                    return StatusCode(403, new { success = false, error = "Access forbidden" });

                Guid fiscalYearIdGuid;
                if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
                {
                    var activeFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);
                    if (activeFiscalYear == null)
                        return BadRequest(new { success = false, error = "No fiscal year found" });
                    fiscalYearIdGuid = activeFiscalYear.Id;
                }

                var updatedSettings = await _settingsService.UpdateDatePreferenceForJournalAsync(
                    companyIdGuid, fiscalYearIdGuid, userIdGuid, request.UseVoucherLastDate);

                return Ok(new
                {
                    success = true,
                    message = "Date preference updated successfully",
                    data = new { useVoucherLastDate = updatedSettings.UseVoucherLastDateForJournal }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating date preference for journal");
                return StatusCode(500, new { success = false, error = "Internal Server Error" });
            }
        }

        // DebitNote Date Preference
        [HttpGet("date-preference/debit-note")]
        public async Task<IActionResult> GetDatePreferenceForDebitNote()
        {
            try
            {
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;

                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                    return Unauthorized(new { success = false, error = "Invalid user token" });

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                    return BadRequest(new { success = false, error = "No company selected" });

                Guid fiscalYearIdGuid;
                if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
                {
                    var activeFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);
                    if (activeFiscalYear == null)
                        return BadRequest(new { success = false, error = "No fiscal year found" });
                    fiscalYearIdGuid = activeFiscalYear.Id;
                }

                var result = await _settingsService.GetDatePreferenceForDebitNoteAsync(companyIdGuid, fiscalYearIdGuid, userIdGuid);

                return Ok(new { success = true, data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting date preference for debit note");
                return StatusCode(500, new { success = false, error = "Internal Server Error" });
            }
        }

        [HttpPost("date-preference/debit-note")]
        public async Task<IActionResult> UpdateDatePreferenceForDebitNote([FromBody] UpdateDatePreferenceRequest request)
        {
            try
            {
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                    return Unauthorized(new { success = false, error = "Invalid user token" });

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                    return BadRequest(new { success = false, error = "No company selected" });

                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                    return StatusCode(403, new { success = false, error = "Access forbidden" });

                Guid fiscalYearIdGuid;
                if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
                {
                    var activeFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);
                    if (activeFiscalYear == null)
                        return BadRequest(new { success = false, error = "No fiscal year found" });
                    fiscalYearIdGuid = activeFiscalYear.Id;
                }

                var updatedSettings = await _settingsService.UpdateDatePreferenceForDebitNoteAsync(
                    companyIdGuid, fiscalYearIdGuid, userIdGuid, request.UseVoucherLastDate);

                return Ok(new
                {
                    success = true,
                    message = "Date preference updated successfully",
                    data = new { useVoucherLastDate = updatedSettings.UseVoucherLastDateForDebitNote }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating date preference for debit note");
                return StatusCode(500, new { success = false, error = "Internal Server Error" });
            }
        }

        // CreditNote Date Preference
        [HttpGet("date-preference/credit-note")]
        public async Task<IActionResult> GetDatePreferenceForCreditNote()
        {
            try
            {
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;

                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                    return Unauthorized(new { success = false, error = "Invalid user token" });

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                    return BadRequest(new { success = false, error = "No company selected" });

                Guid fiscalYearIdGuid;
                if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
                {
                    var activeFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);
                    if (activeFiscalYear == null)
                        return BadRequest(new { success = false, error = "No fiscal year found" });
                    fiscalYearIdGuid = activeFiscalYear.Id;
                }

                var result = await _settingsService.GetDatePreferenceForCreditNoteAsync(companyIdGuid, fiscalYearIdGuid, userIdGuid);

                return Ok(new { success = true, data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting date preference for credit note");
                return StatusCode(500, new { success = false, error = "Internal Server Error" });
            }
        }

        [HttpPost("date-preference/credit-note")]
        public async Task<IActionResult> UpdateDatePreferenceForCreditNote([FromBody] UpdateDatePreferenceRequest request)
        {
            try
            {
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                    return Unauthorized(new { success = false, error = "Invalid user token" });

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                    return BadRequest(new { success = false, error = "No company selected" });

                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                    return StatusCode(403, new { success = false, error = "Access forbidden" });

                Guid fiscalYearIdGuid;
                if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
                {
                    var activeFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);
                    if (activeFiscalYear == null)
                        return BadRequest(new { success = false, error = "No fiscal year found" });
                    fiscalYearIdGuid = activeFiscalYear.Id;
                }

                var updatedSettings = await _settingsService.UpdateDatePreferenceForCreditNoteAsync(
                    companyIdGuid, fiscalYearIdGuid, userIdGuid, request.UseVoucherLastDate);

                return Ok(new
                {
                    success = true,
                    message = "Date preference updated successfully",
                    data = new { useVoucherLastDate = updatedSettings.UseVoucherLastDateForCreditNote }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating date preference for credit note");
                return StatusCode(500, new { success = false, error = "Internal Server Error" });
            }
        }

        // Sales Quotation Date Preference
        [HttpGet("date-preference/sales-quotation")]
        public async Task<IActionResult> GetDatePreferenceForSalesQuotation()
        {
            try
            {
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;

                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                    return Unauthorized(new { success = false, error = "Invalid user token" });

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                    return BadRequest(new { success = false, error = "No company selected" });

                Guid fiscalYearIdGuid;
                if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
                {
                    var activeFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);
                    if (activeFiscalYear == null)
                        return BadRequest(new { success = false, error = "No fiscal year found" });
                    fiscalYearIdGuid = activeFiscalYear.Id;
                }

                var result = await _settingsService.GetDatePreferenceForSalesQuotationAsync(companyIdGuid, fiscalYearIdGuid, userIdGuid);

                return Ok(new { success = true, data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting date preference for sales quotation");
                return StatusCode(500, new { success = false, error = "Internal Server Error" });
            }
        }

        [HttpPost("date-preference/sales-quotation")]
        public async Task<IActionResult> UpdateDatePreferenceForSalesQuotation([FromBody] UpdateDatePreferenceRequest request)
        {
            try
            {
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                    return Unauthorized(new { success = false, error = "Invalid user token" });

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                    return BadRequest(new { success = false, error = "No company selected" });

                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                    return StatusCode(403, new { success = false, error = "Access forbidden" });

                Guid fiscalYearIdGuid;
                if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
                {
                    var activeFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);
                    if (activeFiscalYear == null)
                        return BadRequest(new { success = false, error = "No fiscal year found" });
                    fiscalYearIdGuid = activeFiscalYear.Id;
                }

                var updatedSettings = await _settingsService.UpdateDatePreferenceForSalesQuotationAsync(
                    companyIdGuid, fiscalYearIdGuid, userIdGuid, request.UseVoucherLastDate);

                return Ok(new
                {
                    success = true,
                    message = "Date preference updated successfully",
                    data = new { useVoucherLastDate = updatedSettings.UseVoucherLastDateForSalesQuotation }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating date preference for sales quotation");
                return StatusCode(500, new { success = false, error = "Internal Server Error" });
            }
        }

        // Stock Adjustment Date Preference
        [HttpGet("date-preference/stock-adjustment")]
        public async Task<IActionResult> GetDatePreferenceForStockAdjustment()
        {
            try
            {
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;

                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                    return Unauthorized(new { success = false, error = "Invalid user token" });

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                    return BadRequest(new { success = false, error = "No company selected" });

                Guid fiscalYearIdGuid;
                if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
                {
                    var activeFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);
                    if (activeFiscalYear == null)
                        return BadRequest(new { success = false, error = "No fiscal year found" });
                    fiscalYearIdGuid = activeFiscalYear.Id;
                }

                var result = await _settingsService.GetDatePreferenceForStockAdjustmentAsync(companyIdGuid, fiscalYearIdGuid, userIdGuid);

                return Ok(new { success = true, data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting date preference for stock adjustment");
                return StatusCode(500, new { success = false, error = "Internal Server Error" });
            }
        }

        [HttpPost("date-preference/stock-adjustment")]
        public async Task<IActionResult> UpdateDatePreferenceForStockAdjustment([FromBody] UpdateDatePreferenceRequest request)
        {
            try
            {
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                    return Unauthorized(new { success = false, error = "Invalid user token" });

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                    return BadRequest(new { success = false, error = "No company selected" });

                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                    return StatusCode(403, new { success = false, error = "Access forbidden" });

                Guid fiscalYearIdGuid;
                if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
                {
                    var activeFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);
                    if (activeFiscalYear == null)
                        return BadRequest(new { success = false, error = "No fiscal year found" });
                    fiscalYearIdGuid = activeFiscalYear.Id;
                }

                var updatedSettings = await _settingsService.UpdateDatePreferenceForStockAdjustmentAsync(
                    companyIdGuid, fiscalYearIdGuid, userIdGuid, request.UseVoucherLastDate);

                return Ok(new
                {
                    success = true,
                    message = "Date preference updated successfully",
                    data = new { useVoucherLastDate = updatedSettings.UseVoucherLastDateForStockAdjustment }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating date preference for stock adjustment");
                return StatusCode(500, new { success = false, error = "Internal Server Error" });
            }
        }

        [HttpGet("company/{companyId}")]
        public async Task<IActionResult> GetCompanySettings(Guid companyId)
        {
            var settings = await _settingsService.GetCompanySettingsAsync(companyId);
            if (settings == null)
                return NotFound(new { message = "Settings not found" });

            return Ok(settings);
        }

        [HttpGet("company/{companyId}/user/{userId}")]
        public async Task<IActionResult> GetUserSettings(Guid companyId, Guid userId, [FromQuery] Guid? fiscalYearId)
        {
            var settings = await _settingsService.GetSettingsByCompanyAndUserAsync(companyId, userId, fiscalYearId);
            if (settings == null)
                return NotFound(new { message = "Settings not found" });

            return Ok(settings);
        }

        [HttpPost]
        public async Task<IActionResult> CreateOrUpdateSettings([FromBody] SettingsRequest request)
        {
            try
            {
                var settings = new Settings
                {
                    Id = Guid.NewGuid(),
                    CompanyId = request.CompanyId,
                    UserId = request.UserId,
                    RoundOffSales = request.RoundOffSales,
                    RoundOffPurchase = request.RoundOffPurchase,
                    RoundOffSalesReturn = request.RoundOffSalesReturn,
                    RoundOffPurchaseReturn = request.RoundOffPurchaseReturn,
                    DisplayTransactions = request.DisplayTransactions,
                    DisplayTransactionsForPurchase = request.DisplayTransactionsForPurchase,
                    DisplayTransactionsForSalesReturn = request.DisplayTransactionsForSalesReturn,
                    DisplayTransactionsForPurchaseReturn = request.DisplayTransactionsForPurchaseReturn,
                    StoreManagement = request.StoreManagement,
                    Value = request.Value ?? string.Empty,
                    FiscalYearId = request.FiscalYearId,
                    CreatedAt = DateTime.UtcNow
                };

                var result = await _settingsService.CreateOrUpdateSettingsAsync(settings);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpGet("company/{companyId}/value/{key}")]
        public async Task<IActionResult> GetValue(Guid companyId, string key)
        {
            try
            {
                var value = await _settingsService.GetValueAsync<object>(companyId, key);
                return Ok(new { key, value });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpPost("company/{companyId}/value/{key}")]
        public async Task<IActionResult> SetValue(Guid companyId, string key, [FromBody] object value)
        {
            try
            {
                await _settingsService.SetValueAsync(companyId, key, value);
                return Ok(new { message = "Value set successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }
    }



    public class SettingsRequest
    {
        public Guid CompanyId { get; set; }
        public Guid UserId { get; set; }
        public bool RoundOffSales { get; set; } = false;
        public bool RoundOffPurchase { get; set; } = false;
        public bool RoundOffSalesReturn { get; set; } = false;
        public bool RoundOffPurchaseReturn { get; set; } = false;
        public bool DisplayTransactions { get; set; } = false;
        public bool DisplayTransactionsForPurchase { get; set; } = false;
        public bool DisplayTransactionsForSalesReturn { get; set; } = false;
        public bool DisplayTransactionsForPurchaseReturn { get; set; } = false;
        public bool StoreManagement { get; set; } = false;
        public string? Value { get; set; }
        public Guid FiscalYearId { get; set; }
    }
}