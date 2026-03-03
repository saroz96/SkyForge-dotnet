
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

    }
}