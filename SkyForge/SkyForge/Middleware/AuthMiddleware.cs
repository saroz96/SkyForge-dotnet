using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using SkyForge.Models.CompanyModel;
using SkyForge.Models.FiscalYearModel;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Threading.Tasks;

public static class AuthMiddlewareExtensions
{
    public static IApplicationBuilder UseAuthMiddleware(this IApplicationBuilder app)
    {
        return app.UseMiddleware<AuthMiddleware>();
    }
}

public class AuthMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<AuthMiddleware> _logger;

    public AuthMiddleware(RequestDelegate next, ILogger<AuthMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Clear previous items
        context.Items.Remove("UserId");
        context.Items.Remove("UserName");
        context.Items.Remove("UserEmail");
        context.Items.Remove("CurrentCompany");
        context.Items.Remove("CurrentCompanyName");
        context.Items.Remove("CurrentFiscalYear");
        context.Items.Remove("TradeType");
        context.Items.Remove("IsActive");
        context.Items.Remove("IsAdmin");
        context.Items.Remove("ReturnUrl");

        try
        {
            // Get return URL from query string (not session)
            var returnTo = context.Request.Query["returnTo"].FirstOrDefault();
            if (!string.IsNullOrEmpty(returnTo))
            {
                context.Items["ReturnUrl"] = returnTo;
                _logger.LogDebug($"Return URL set from query: {returnTo}");
            }

            // Check if request has Authorization header
            var authHeader = context.Request.Headers["Authorization"].FirstOrDefault();

            if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer "))
            {
                await ProcessAuthenticatedRequest(context);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in AuthMiddleware");
        }

        await _next(context);
    }

    private async Task ProcessAuthenticatedRequest(HttpContext context)
    {
        var user = context.User;

        if (user.Identity?.IsAuthenticated == true)
        {
            // Extract claims from JWT token
            var userId = user.FindFirst(ClaimTypes.NameIdentifier)?.Value
                       ?? user.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
            var userName = user.FindFirst(ClaimTypes.Name)?.Value;
            var userEmail = user.FindFirst(ClaimTypes.Email)?.Value;

            // Get IsAdmin from claims (adjust based on your JWT token structure)
            var isAdminClaim = user.FindFirst("isAdmin")?.Value ?? "false";
            bool.TryParse(isAdminClaim, out bool isAdmin);

            // Get IsActive from claims
            var isActiveClaim = user.FindFirst("isActive")?.Value ?? "true";
            bool.TryParse(isActiveClaim, out bool isActive);

            var tradeTypeClaim = user.FindFirst("tradeType")?.Value;
            TradeType? tradeType = null;
            if (!string.IsNullOrEmpty(tradeTypeClaim) &&
                Enum.TryParse<TradeType>(tradeTypeClaim, out TradeType parsedTradeType))
            {
                tradeType = parsedTradeType;
            }

            // Extract company info if available
            var companyId = user.FindFirst("currentCompanyId")?.Value;
            var companyName = user.FindFirst("currentCompanyName")?.Value;
            var fiscalYear = user.FindFirst("currentFiscalYear")?.Value;
            var fiscalYearId = user.FindFirst("currentFiscalYearId")?.Value;
            var fiscalYearName = user.FindFirst("currentFiscalYearName")?.Value;


            // Set in HttpContext.Items
            if (!string.IsNullOrEmpty(userId))
            {
                context.Items["UserId"] = userId;
                context.Items["UserName"] = userName;
                context.Items["UserEmail"] = userEmail;
                context.Items["IsActive"] = isActive;
                context.Items["IsAdmin"] = isAdmin;

                _logger.LogDebug($"User authenticated: {userName} ({userId})");
            }

            // Set company info if available
            if (!string.IsNullOrEmpty(companyId))
            {
                context.Items["CurrentCompany"] = companyId;
                context.Items["CurrentCompanyName"] = companyName;
                context.Items["CurrentFiscalYear"] = fiscalYear;

                _logger.LogDebug($"Company selected: {companyName} ({companyId})");
            }

            if (tradeType.HasValue)
            {
                context.Items["TradeType"] = tradeType.Value;
                _logger.LogDebug($"Trade type from JWT: {tradeType.Value}");
            }

            if (!string.IsNullOrEmpty(fiscalYearId))
            {
                context.Items["CurrentFiscalYearId"] = fiscalYearId;
                context.Items["CurrentFiscalYearName"] = fiscalYearName;

                _logger.LogDebug($"Fiscal year selected: {fiscalYearName} ({fiscalYearId})");
            }
        }
    }
}