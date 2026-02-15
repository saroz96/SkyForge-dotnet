// Middleware/EnsureFiscalYearMiddleware.cs
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using SkyForge.Services;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

public static class EnsureFiscalYearMiddlewareExtensions
{
    public static IApplicationBuilder UseEnsureFiscalYearMiddleware(this IApplicationBuilder app)
    {
        return app.UseMiddleware<EnsureFiscalYearMiddleware>();
    }
}

public class EnsureFiscalYearMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<EnsureFiscalYearMiddleware> _logger;

    public EnsureFiscalYearMiddleware(RequestDelegate next, ILogger<EnsureFiscalYearMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, IFiscalYearService fiscalYearService)
    {
        // Skip middleware for specific paths (login, register, etc.)
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

        // Check if company is selected (from JWT claims)
        var companyIdClaim = context.User.FindFirst("currentCompanyId")?.Value;
        if (string.IsNullOrEmpty(companyIdClaim) || !Guid.TryParse(companyIdClaim, out Guid companyId))
        {
            _logger.LogWarning("No company selected in JWT claims for user: {User}", context.User.Identity.Name);
            await _next(context);
            return;
        }

        // Check if fiscal year is already in HttpContext.Items (set by AuthMiddleware)
        var currentFiscalYear = context.Items["CurrentFiscalYear"];
        if (currentFiscalYear == null)
        {
            try
            {
                // Get active fiscal year for the company
                var fiscalYear = await fiscalYearService.GetActiveFiscalYearAsync(companyId);

                if (fiscalYear == null)
                {
                    _logger.LogWarning("No active fiscal year found for company: {CompanyId}", companyId);

                    // Store in HttpContext.Items to indicate no fiscal year
                    context.Items["HasActiveFiscalYear"] = false;

                    // Check if it's an API request
                    if (context.Request.Path.StartsWithSegments("/api"))
                    {
                        await HandleApiNoFiscalYear(context);
                        return; // Don't continue to next middleware
                    }
                }
                else
                {
                    // Store fiscal year info in HttpContext.Items
                    context.Items["CurrentFiscalYear"] = new
                    {
                        Id = fiscalYear.Id,
                        Name = fiscalYear.Name,
                        StartDate = fiscalYear.StartDate,
                        EndDate = fiscalYear.EndDate,
                        StartDateNepali = fiscalYear.StartDateNepali,
                        EndDateNepali = fiscalYear.EndDateNepali,
                        DateFormat = fiscalYear.DateFormat,
                        IsActive = fiscalYear.IsActive,
                        CompanyId = fiscalYear.CompanyId
                    };

                    context.Items["HasActiveFiscalYear"] = true;

                    _logger.LogDebug("Active fiscal year set: {FiscalYearName} for company: {CompanyId}",
                        fiscalYear.Name, companyId);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting active fiscal year for company: {CompanyId}", companyId);

                // For API requests, return error
                if (context.Request.Path.StartsWithSegments("/api"))
                {
                    await HandleApiError(context, ex);
                    return;
                }
            }
        }

        await _next(context);
    }

    private bool ShouldSkipMiddleware(HttpContext context)
    {
        var path = context.Request.Path.Value?.ToLower() ?? "";

        // Skip for auth endpoints, swagger, etc.
        return path.StartsWith("/api/auth") ||
               path.StartsWith("/api/company/select") ||
               path.StartsWith("/api/fiscal-year") ||
               path.StartsWith("/swagger") ||
               path.StartsWith("/health");
    }

    private async Task HandleApiNoFiscalYear(HttpContext context)
    {
        context.Response.StatusCode = 400;
        context.Response.ContentType = "application/json";

        var response = new
        {
            success = false,
            error = "No active fiscal year set",
            message = "Please select or create a fiscal year",
            action = "selectFiscalYear",
            redirectTo = "/api/fiscal-year/select"
        };

        await context.Response.WriteAsJsonAsync(response);
    }

    private async Task HandleApiError(HttpContext context, Exception ex)
    {
        context.Response.StatusCode = 500;
        context.Response.ContentType = "application/json";

        var response = new
        {
            success = false,
            error = "Failed to get fiscal year information",
            message = ex.Message
        };

        await context.Response.WriteAsJsonAsync(response);
    }
}