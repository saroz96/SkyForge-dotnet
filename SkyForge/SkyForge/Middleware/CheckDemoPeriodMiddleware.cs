using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using SkyForge.Data;
using SkyForge.Models.CompanyModel;
using SkyForge.Models.Shared;
using System;
using System.Text.Json;
using System.Threading.Tasks;

namespace SkyForge.Middleware
{
    public static class CheckDemoPeriodMiddlewareExtensions
    {
        public static IApplicationBuilder UseCheckDemoPeriodMiddleware(this IApplicationBuilder app)
        {
            return app.UseMiddleware<CheckDemoPeriodMiddleware>();
        }
    }

    public class CheckDemoPeriodMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<CheckDemoPeriodMiddleware> _logger;

        public CheckDemoPeriodMiddleware(RequestDelegate next, ILogger<CheckDemoPeriodMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context, ApplicationDbContext dbContext)
        {
            var path = context.Request.Path.Value?.ToLower() ?? "";
            var method = context.Request.Method;

            // _logger.LogInformation("=== CheckDemoPeriodMiddleware ===");
            // _logger.LogInformation("Path: {Path}, Method: {Method}", path, method);

            // Skip middleware for specific paths
            if (ShouldSkipMiddleware(context))
            {
                _logger.LogInformation("Skipping middleware for path: {Path}", path);
                await _next(context);
                return;
            }

            // Get company ID from claims
            var companyIdClaim = context.User.FindFirst("currentCompany")?.Value;
            if (string.IsNullOrEmpty(companyIdClaim) || !Guid.TryParse(companyIdClaim, out Guid companyId))
            {
                // _logger.LogInformation("No company selected, skipping middleware");
                await _next(context);
                return;
            }

            // Check if this is a POST request for purchase bill creation
            if (IsPurchaseBillRequest(context))
            {
                _logger.LogInformation("Purchase bill request detected for company {CompanyId}", companyId);

                try
                {
                    var company = await dbContext.Companies.FindAsync(companyId);
                    if (company == null)
                    {
                        _logger.LogWarning("Company not found: {CompanyId}", companyId);
                        await _next(context);
                        return;
                    }

                    _logger.LogInformation("Company: {Name}, DateFormat: {DateFormat}, RenewalDate: '{RenewalDate}', FiscalYearStartDate: '{FiscalYearStartDate}'",
                        company.Name, company.DateFormat, company.RenewalDate ?? "NULL", company.FiscalYearStartDate ?? "NULL");

                    // Read the request body to get the bill date
                    context.Request.EnableBuffering();
                    string requestBody;
                    using (var reader = new StreamReader(context.Request.Body, leaveOpen: true))
                    {
                        requestBody = await reader.ReadToEndAsync();
                        context.Request.Body.Position = 0;
                    }

                    if (string.IsNullOrEmpty(requestBody))
                    {
                        _logger.LogInformation("No request body to validate");
                        await _next(context);
                        return;
                    }

                    using var jsonDocument = JsonDocument.Parse(requestBody);
                    var root = jsonDocument.RootElement;

                    // Get the bill date based on company's date format
                    string billDate = null;

                    if (company.DateFormat == DateFormatEnum.Nepali)
                    {
                        // Get Nepali date from request
                        if (root.TryGetProperty("nepaliDate", out var nepaliDateElement))
                        {
                            billDate = nepaliDateElement.GetString();
                            _logger.LogInformation("Found nepaliDate: {NepaliDate}", billDate);
                        }

                        if (string.IsNullOrEmpty(billDate) && root.TryGetProperty("transactionDateNepali", out var transNepaliDateElement))
                        {
                            billDate = transNepaliDateElement.GetString();
                            _logger.LogInformation("Found transactionDateNepali: {NepaliDate}", billDate);
                        }

                        if (string.IsNullOrEmpty(billDate))
                        {
                            _logger.LogWarning("No Nepali date found in request");
                            await _next(context);
                            return;
                        }
                    }
                    else // English format
                    {
                        // Get English date from request
                        if (root.TryGetProperty("transactionDate", out var transDateElement))
                        {
                            billDate = transDateElement.GetString();
                            _logger.LogInformation("Found transactionDate: {Date}", billDate);
                        }

                        if (string.IsNullOrEmpty(billDate) && root.TryGetProperty("date", out var dateElement))
                        {
                            billDate = dateElement.GetString();
                            _logger.LogInformation("Found date: {Date}", billDate);
                        }

                        if (string.IsNullOrEmpty(billDate) && root.TryGetProperty("billDate", out var billDateElement))
                        {
                            billDate = billDateElement.GetString();
                            _logger.LogInformation("Found billDate: {Date}", billDate);
                        }

                        if (string.IsNullOrEmpty(billDate))
                        {
                            _logger.LogWarning("No English date found in request");
                            await _next(context);
                            return;
                        }
                    }

                    // Check if company is in demo period (no renewal date)
                    if (string.IsNullOrEmpty(company.RenewalDate))
                    {
                        _logger.LogInformation("Company is in DEMO PERIOD");

                        // Get the company's start date based on date format
                        string startDate;
                        if (company.DateFormat == DateFormatEnum.Nepali)
                        {
                            if (string.IsNullOrEmpty(company.FiscalYearStartDate))
                            {
                                _logger.LogError("Company fiscal year start date is not set");
                                await _next(context);
                                return;
                            }
                            startDate = company.FiscalYearStartDate;
                        }
                        else
                        {
                            startDate = company.CreatedAt.ToString("yyyy-MM-dd");
                        }

                        _logger.LogInformation("Company start date: {StartDate}", startDate);

                        // Calculate one month after start date
                        string oneMonthLater;
                        if (company.DateFormat == DateFormatEnum.Nepali)
                        {
                            // Parse Nepali date to add one month
                            var parts = startDate.Split('-');
                            if (parts.Length == 3 &&
                                int.TryParse(parts[0], out int startYear) &&
                                int.TryParse(parts[1], out int startMonth) &&
                                int.TryParse(parts[2], out int startDay))
                            {
                                int newYear = startYear;
                                int newMonth = startMonth + 1;

                                if (newMonth > 12)
                                {
                                    newMonth = 1;
                                    newYear++;
                                }

                                oneMonthLater = $"{newYear:D4}-{newMonth:D2}-{startDay:D2}";
                            }
                            else
                            {
                                _logger.LogError("Invalid start date format: {StartDate}", startDate);
                                await _next(context);
                                return;
                            }
                        }
                        else
                        {
                            if (DateTime.TryParse(startDate, out DateTime startDateTime))
                            {
                                oneMonthLater = startDateTime.AddMonths(1).ToString("yyyy-MM-dd");
                            }
                            else
                            {
                                _logger.LogError("Invalid start date format: {StartDate}", startDate);
                                await _next(context);
                                return;
                            }
                        }

                        _logger.LogInformation("Demo period ends at: {OneMonthLater}", oneMonthLater);

                        // Compare dates
                        if (string.Compare(billDate, oneMonthLater) > 0)
                        {
                            _logger.LogWarning("DEMO PERIOD EXPIRED: Bill date {BillDate} is after {OneMonthLater}",
                                billDate, oneMonthLater);

                            context.Response.StatusCode = 403;
                            context.Response.ContentType = "application/json";

                            var response = new
                            {
                                success = false,
                                error = "Demo period has expired. Please upgrade to the full version.",
                                type = "demo_expired",
                                redirectUrl = "/subscription/upgrade"
                            };

                            await context.Response.WriteAsJsonAsync(response);
                            return;
                        }
                    }
                    else // Has renewal date
                    {
                        _logger.LogInformation("Company has RENEWAL DATE: {RenewalDate}", company.RenewalDate);

                        // Compare bill date with renewal date
                        if (string.Compare(billDate, company.RenewalDate) > 0)
                        {
                            _logger.LogWarning("RENEWAL EXPIRED: Bill date {BillDate} is after renewal date {RenewalDate}",
                                billDate, company.RenewalDate);

                            context.Response.StatusCode = 403;
                            context.Response.ContentType = "application/json";

                            var response = new
                            {
                                success = false,
                                error = "Renewal period has expired. Please renew to continue making entries.",
                                type = "renewal_expired",
                                redirectUrl = "/subscription/renew"
                            };

                            await context.Response.WriteAsJsonAsync(response);
                            return;
                        }
                    }

                    _logger.LogInformation("Validation passed, continuing with request");
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error checking demo period for company: {CompanyId}", companyId);
                }
            }

            await _next(context);
        }

        private bool ShouldSkipMiddleware(HttpContext context)
        {
            var path = context.Request.Path.Value?.ToLower() ?? "";

            return path.Contains("/api/auth") ||
                path.Contains("/api/subscription") ||
                path.Contains("/api/company") ||
                path.Contains("/swagger") ||
                path.StartsWith("/health");
        }

        private bool IsPurchaseBillRequest(HttpContext context)
        {
            var path = context.Request.Path.Value?.ToLower() ?? "";
            var method = context.Request.Method;

            bool isPurchaseEndpoint = path == "/api/retailer/purchase" ||
                                      path.Contains("/api/retailer/purchase") ||
                                      path.EndsWith("/purchase");

            // Check for sales bill endpoints (credit-sales)
            bool isCreditSalesEndpoint = path == "/api/retailer/credit-sales" ||
                                   path.Contains("/api/retailer/credit-sales") ||
                                   path.EndsWith("/credit-sales");
            bool isCashSalesEndpoint = path == "/api/retailer/cash-sales" ||
                                    path.Contains("/api/retailer/cash-sales") ||
                                    path.EndsWith("/cash-sales");

            return (isPurchaseEndpoint || isCreditSalesEndpoint || isCashSalesEndpoint) && method == HttpMethods.Post;
        }
    }
}