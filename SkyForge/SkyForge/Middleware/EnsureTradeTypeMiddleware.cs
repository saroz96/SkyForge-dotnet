using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using SkyForge.Data;
using SkyForge.Models.CompanyModel;
using System;
using System.Threading.Tasks;

public static class EnsureTradeTypeMiddlewareExtensions
{
    public static IApplicationBuilder UseEnsureTradeTypeMiddleware(this IApplicationBuilder app)
    {
        return app.UseMiddleware<EnsureTradeTypeMiddleware>();
    }
}

public class EnsureTradeTypeMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<EnsureTradeTypeMiddleware> _logger;

    public EnsureTradeTypeMiddleware(RequestDelegate next, ILogger<EnsureTradeTypeMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, ApplicationDbContext dbContext)
    {
        // Skip middleware for specific paths
        if (ShouldSkipMiddleware(context))
        {
            await _next(context);
            return;
        }

        // Check if user is authenticated
        if (!context.User.Identity?.IsAuthenticated ?? true)
        {
            await _next(context);
            return;
        }

        // Check if company is selected from JWT claims
        var companyIdClaim = context.User.FindFirst("currentCompanyId")?.Value;
        if (string.IsNullOrEmpty(companyIdClaim) || !Guid.TryParse(companyIdClaim, out Guid companyId))
        {
            await HandleNoCompanySelected(context);
            return;
        }

        try
        {
            // Check if trade type is already in HttpContext.Items (from AuthMiddleware)
            var tradeType = context.Items["TradeType"] as TradeType?;

            if (!tradeType.HasValue)
            {
                // Get company from database
                var company = await dbContext.Companies.FindAsync(companyId);

                if (company == null)
                {
                    await HandleCompanyNotFound(context);
                    return;
                }

                tradeType = company.TradeType;

                // Store in HttpContext.Items for this request
                context.Items["TradeType"] = tradeType;
                context.Items["CompanyName"] = company.Name;

                _logger.LogDebug("Trade type set for company {CompanyId}: {TradeType}", companyId, tradeType);
            }

            // Store trade type in HttpContext.Items for controllers to use
            context.Items["TradeType"] = tradeType;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error ensuring trade type for company: {CompanyId}", companyId);

            // For API requests, return error
            if (context.Request.Path.StartsWithSegments("/api"))
            {
                await HandleApiError(context, "Server error while checking trade type");
                return;
            }
        }

        await _next(context);
    }

    private bool ShouldSkipMiddleware(HttpContext context)
    {
        var path = context.Request.Path.Value?.ToLower() ?? "";

        // Skip for auth endpoints, company selection, etc.
        return path.Contains("/api/auth") ||
               path.Contains("/api/company/select") ||
               path.Contains("/api/company/create") ||
               path.Contains("/swagger") ||
               path.StartsWith("/health");
    }

    private async Task HandleNoCompanySelected(HttpContext context)
    {
        if (context.Request.Path.StartsWithSegments("/api"))
        {
            context.Response.StatusCode = 400;
            context.Response.ContentType = "application/json";

            var response = new
            {
                success = false,
                error = "Please select a company first",
                redirectTo = "/api/company/select"
            };

            await context.Response.WriteAsJsonAsync(response);
        }
        else
        {
            // For MVC/views (if you have them)
            context.Response.Redirect("/select-company");
        }
    }

    private async Task HandleCompanyNotFound(HttpContext context)
    {
        if (context.Request.Path.StartsWithSegments("/api"))
        {
            context.Response.StatusCode = 404;
            context.Response.ContentType = "application/json";

            var response = new
            {
                success = false,
                error = "Company not found",
                redirectTo = "/api/company/select"
            };

            await context.Response.WriteAsJsonAsync(response);
        }
        else
        {
            // For MVC/views (if you have them)
            context.Response.Redirect("/select-company");
        }
    }

    private async Task HandleApiError(HttpContext context, string message)
    {
        context.Response.StatusCode = 500;
        context.Response.ContentType = "application/json";

        var response = new
        {
            success = false,
            error = message
        };

        await context.Response.WriteAsJsonAsync(response);
    }
}