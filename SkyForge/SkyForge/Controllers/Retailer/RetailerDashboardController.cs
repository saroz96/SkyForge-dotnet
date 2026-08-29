
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SkyForge.Models.Retailer;
using SkyForge.Services.Retailer.RetailerDashboardServices;
using System.Security.Claims;
using System.Text.Json;

namespace SkyForge.Controllers.Retailer
{
    [ApiController]
    [Route("api/retailer")]
    [Authorize]
    public class RetailerDashboardController : ControllerBase
    {
        private readonly IRetailerDashboardService _dashboardService;
        private readonly ILogger<RetailerDashboardController> _logger;

        public RetailerDashboardController(
            IRetailerDashboardService dashboardService,
            ILogger<RetailerDashboardController> logger)
        {
            _dashboardService = dashboardService;
            _logger = logger;
        }

        [HttpGet("retailerDashboard/indexv1")]
        public async Task<ActionResult<DashboardResponse>> GetRetailerDashboard()
        {
            try
            {
                // Get company ID from query parameters or user claims
                var companyIdClaim = User.FindFirst("CurrentCompanyId")?.Value;
                var companyIdQuery = HttpContext.Request.Query["companyId"].ToString();

                Guid companyId;

                // Try to get company ID from query parameter first
                if (!string.IsNullOrEmpty(companyIdQuery) && Guid.TryParse(companyIdQuery, out Guid parsedId))
                {
                    companyId = parsedId;
                }
                // Try to get from claim
                else if (!string.IsNullOrEmpty(companyIdClaim) && Guid.TryParse(companyIdClaim, out parsedId))
                {
                    companyId = parsedId;
                }
                else
                {
                    return BadRequest(new DashboardResponse
                    {
                        Success = false,
                        Error = "Company ID is required"
                    });
                }

                // Get current user ID from JWT
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new DashboardResponse
                    {
                        Success = false,
                        Error = "User not authenticated"
                    });
                }

                // Get fiscal year from query or use default
                var fiscalYearJson = HttpContext.Request.Query["fiscalYearJson"].ToString();

                // Get company name from user claim or query
                var companyNameClaim = User.FindFirst("CurrentCompanyName")?.Value;
                var companyNameQuery = HttpContext.Request.Query["companyName"].ToString();
                string companyName = !string.IsNullOrEmpty(companyNameQuery)
                    ? companyNameQuery
                    : !string.IsNullOrEmpty(companyNameClaim)
                        ? companyNameClaim
                        : "Company";

                // Use service to get dashboard data
                var result = await _dashboardService.GetDashboardDataAsync(
                    companyId,
                    companyName,
                    string.IsNullOrEmpty(fiscalYearJson) ? null : fiscalYearJson);

                if (!result.Success)
                {
                    return BadRequest(result);
                }

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Dashboard controller error");

                var response = new DashboardResponse
                {
                    Success = false,
                    Error = "Internal server error"
                };

                if (Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development")
                {
                    response.Details = ex.Message;
                }

                return StatusCode(500, response);
            }
        }

        [HttpGet("retailerDashboard/topitems")]
        public async Task<IActionResult> GetTopItems(
            [FromQuery] Guid companyId,
            [FromQuery] string? fiscalYearJson)
        {
            try
            {
                // Parse fiscal year
                FiscalYearInfo? fiscalYear = null;
                if (!string.IsNullOrEmpty(fiscalYearJson))
                {
                    try
                    {
                        fiscalYear = JsonSerializer.Deserialize<FiscalYearInfo>(fiscalYearJson);
                    }
                    catch (JsonException ex)
                    {
                        _logger.LogWarning(ex, "Failed to deserialize fiscal year JSON");
                    }
                }

                // Get date range from fiscal year or use default
                DateTime startDate;
                DateTime endDate;

                if (fiscalYear != null)
                {
                    startDate = fiscalYear.StartDate;
                    endDate = DateTime.Now <= fiscalYear.EndDate ? DateTime.Now : fiscalYear.EndDate;
                }
                else
                {
                    // Default to last 30 days if no fiscal year provided
                    endDate = DateTime.Now;
                    startDate = endDate.AddDays(-30);
                }

                _logger.LogInformation($"Getting top items for company {companyId} from {startDate} to {endDate}");

                // Call the service methods
                var topItemsByTransaction = await _dashboardService.GetTopItemsByTransactionAsync(companyId, startDate, endDate, 10);
                var topItemsByRevenue = await _dashboardService.GetTopItemsByRevenueAsync(companyId, startDate, endDate, 10);
                var topItemsByFrequency = await _dashboardService.GetTopItemsByFrequencyAsync(companyId, startDate, endDate, 10);

                _logger.LogInformation($"Found {topItemsByTransaction.Count} items by transaction, {topItemsByRevenue.Count} by revenue, {topItemsByFrequency.Count} by frequency");

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        topItemsByTransaction = topItemsByTransaction ?? new List<TopItemDto>(),
                        topItemsByRevenue = topItemsByRevenue ?? new List<TopItemDto>(),
                        topItemsByFrequency = topItemsByFrequency ?? new List<TopItemDto>()
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting top items for company {CompanyId}", companyId);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Failed to get top items",
                    details = ex.Message
                });
            }
        }

        [HttpGet("retailerDashboard/topcustomers")]
        public async Task<IActionResult> GetTopCustomers(
            [FromQuery] Guid companyId,
            [FromQuery] string? fiscalYearJson)
        {
            try
            {
                FiscalYearInfo? fiscalYear = null;
                if (!string.IsNullOrEmpty(fiscalYearJson))
                {
                    try
                    {
                        fiscalYear = JsonSerializer.Deserialize<FiscalYearInfo>(fiscalYearJson);
                    }
                    catch (JsonException ex)
                    {
                        _logger.LogWarning(ex, "Failed to deserialize fiscal year JSON");
                    }
                }

                DateTime startDate;
                DateTime endDate;

                if (fiscalYear != null)
                {
                    startDate = fiscalYear.StartDate;
                    endDate = DateTime.Now <= fiscalYear.EndDate ? DateTime.Now : fiscalYear.EndDate;
                }
                else
                {
                    endDate = DateTime.Now;
                    startDate = endDate.AddDays(-30);
                }

                var topByPurchase = await _dashboardService.GetTopCustomersByPurchaseAsync(companyId, startDate, endDate, 10);
                var topByFrequency = await _dashboardService.GetTopCustomersByFrequencyAsync(companyId, startDate, endDate, 10);
                var topByAverageValue = await _dashboardService.GetTopCustomersByAverageValueAsync(companyId, startDate, endDate, 10);
                var topByOutstanding = await _dashboardService.GetTopCustomersByOutstandingAsync(companyId, 10);

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        topByPurchase,
                        topByFrequency,
                        topByAverageValue,
                        topByOutstanding
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting top customers for company {CompanyId}", companyId);
                return StatusCode(500, new { success = false, error = ex.Message });
            }
        }
    }
}