
// using Microsoft.AspNetCore.Http;
// using Microsoft.Extensions.DependencyInjection;
// using SkyForge.Data;
// using SkyForge.Models.CompanyModel;
// using SkyForge.Models.Shared;
// using System;
// using System.Text.Json;
// using System.Threading.Tasks;

// namespace SkyForge.Middleware
// {
//     public static class CheckDemoPeriodMiddlewareExtensions
//     {
//         public static IApplicationBuilder UseCheckDemoPeriodMiddleware(this IApplicationBuilder app)
//         {
//             return app.UseMiddleware<CheckDemoPeriodMiddleware>();
//         }
//     }

//     public class CheckDemoPeriodMiddleware
//     {
//         private readonly RequestDelegate _next;
//         private readonly ILogger<CheckDemoPeriodMiddleware> _logger;

//         public CheckDemoPeriodMiddleware(RequestDelegate next, ILogger<CheckDemoPeriodMiddleware> logger)
//         {
//             _next = next;
//             _logger = logger;
//         }

//         public async Task InvokeAsync(HttpContext context, ApplicationDbContext dbContext)
//         {
//             var path = context.Request.Path.Value?.ToLower() ?? "";
//             var method = context.Request.Method;

//             _logger.LogInformation("=== CheckDemoPeriodMiddleware ===");
//             _logger.LogInformation("Path: {Path}, Method: {Method}", path, method);

//             // Skip middleware for specific paths
//             if (ShouldSkipMiddleware(context))
//             {
//                 _logger.LogInformation("Skipping middleware for path: {Path}", path);
//                 await _next(context);
//                 return;
//             }

//             // Check if user is authenticated
//             if (!context.User.Identity?.IsAuthenticated ?? true)
//             {
//                 _logger.LogInformation("User not authenticated, skipping middleware");
//                 await _next(context);
//                 return;
//             }

//             // Get company ID from claims
//             var companyIdClaim = context.User.FindFirst("currentCompany")?.Value;
//             if (string.IsNullOrEmpty(companyIdClaim) || !Guid.TryParse(companyIdClaim, out Guid companyId))
//             {
//                 _logger.LogInformation("No company selected, skipping middleware");
//                 await _next(context);
//                 return;
//             }

//             // Check if this is a POST request for purchase bill creation
//             if (IsPurchaseBillRequest(context))
//             {
//                 _logger.LogInformation("Purchase bill request detected for company {CompanyId}", companyId);

//                 try
//                 {
//                     var company = await dbContext.Companies.FindAsync(companyId);
//                     if (company == null)
//                     {
//                         _logger.LogWarning("Company not found: {CompanyId}", companyId);
//                         await _next(context);
//                         return;
//                     }

//                     _logger.LogInformation("Company: {Name}, DateFormat: {DateFormat}, RenewalDate: '{RenewalDate}', FiscalYearStartDate: '{FiscalYearStartDate}'",
//                         company.Name, company.DateFormat, company.RenewalDate ?? "NULL", company.FiscalYearStartDate ?? "NULL");

//                     // Check if company has no renewal date (demo period)
//                     if (string.IsNullOrEmpty(company.RenewalDate))
//                     {
//                         _logger.LogInformation("Company is in demo period");

//                         var validationResult = await ValidateDemoPeriodDate(context, company);

//                         if (!validationResult.IsValid)
//                         {
//                             _logger.LogWarning("Demo period validation failed: {ErrorMessage}", validationResult.ErrorMessage);
//                             await HandleValidationFailure(context, validationResult);
//                             return;
//                         }
//                     }
//                     else
//                     {
//                         _logger.LogInformation("Company has renewal date: {RenewalDate}", company.RenewalDate);

//                         var validationResult = await ValidateRenewalDate(context, company);

//                         if (!validationResult.IsValid)
//                         {
//                             _logger.LogWarning("Renewal validation failed: {ErrorMessage}", validationResult.ErrorMessage);
//                             await HandleValidationFailure(context, validationResult);
//                             return;
//                         }
//                     }

//                     _logger.LogInformation("Validation passed, continuing with request");
//                 }
//                 catch (Exception ex)
//                 {
//                     _logger.LogError(ex, "Error checking demo period for company: {CompanyId}", companyId);

//                     if (context.Request.Path.StartsWithSegments("/api"))
//                     {
//                         await HandleApiError(context, "Server error while checking demo period");
//                         return;
//                     }
//                 }
//             }

//             await _next(context);
//         }

//         private bool ShouldSkipMiddleware(HttpContext context)
//         {
//             var path = context.Request.Path.Value?.ToLower() ?? "";

//             return path.Contains("/api/auth") ||
//                 path.Contains("/api/subscription") ||
//                 path.Contains("/api/company") ||
//                 path.Contains("/swagger") ||
//                 path.StartsWith("/health");
//         }

//         private bool IsPurchaseBillRequest(HttpContext context)
//         {
//             var path = context.Request.Path.Value?.ToLower() ?? "";
//             var method = context.Request.Method;

//             // Check for purchase bill creation endpoint
//             bool isPurchaseEndpoint = path == "/api/retailer/purchase" ||
//                                       path.Contains("/api/retailer/purchase") ||
//                                       path.EndsWith("/purchase");

//             return isPurchaseEndpoint && method == HttpMethods.Post;
//         }

//         private async Task<BillDateValidationResult> ValidateDemoPeriodDate(HttpContext context, Company company)
//         {
//             // Enable buffering to read request body
//             context.Request.EnableBuffering();

//             // Read request body
//             string requestBody;
//             using (var reader = new StreamReader(context.Request.Body, leaveOpen: true))
//             {
//                 requestBody = await reader.ReadToEndAsync();
//                 context.Request.Body.Position = 0; // Reset stream position
//             }

//             _logger.LogInformation("Request body: {RequestBody}", requestBody);

//             if (string.IsNullOrEmpty(requestBody))
//             {
//                 return BillDateValidationResult.Valid();
//             }

//             try
//             {
//                 using var jsonDocument = JsonDocument.Parse(requestBody);
//                 var root = jsonDocument.RootElement;

//                 // Get the bill date based on company's date format
//                 string billDate = null;

//                 if (company.DateFormat == DateFormatEnum.Nepali)
//                 {
//                     // Get Nepali date from request
//                     if (root.TryGetProperty("nepaliDate", out var nepaliDateElement))
//                     {
//                         billDate = nepaliDateElement.GetString();
//                         _logger.LogInformation("Found nepaliDate: {NepaliDate}", billDate);
//                     }

//                     if (string.IsNullOrEmpty(billDate) && root.TryGetProperty("transactionDateNepali", out var transNepaliDateElement))
//                     {
//                         billDate = transNepaliDateElement.GetString();
//                         _logger.LogInformation("Found transactionDateNepali: {NepaliDate}", billDate);
//                     }

//                     if (string.IsNullOrEmpty(billDate))
//                     {
//                         return BillDateValidationResult.Error("Nepali date is required for validation");
//                     }
//                 }
//                 else // English format
//                 {
//                     // Get English date as string
//                     if (root.TryGetProperty("transactionDate", out var transDateElement))
//                     {
//                         billDate = transDateElement.GetString();
//                         _logger.LogInformation("Found transactionDate: {Date}", billDate);
//                     }

//                     if (string.IsNullOrEmpty(billDate) && root.TryGetProperty("date", out var dateElement))
//                     {
//                         billDate = dateElement.GetString();
//                         _logger.LogInformation("Found date: {Date}", billDate);
//                     }

//                     if (string.IsNullOrEmpty(billDate) && root.TryGetProperty("billDate", out var billDateElement))
//                     {
//                         billDate = billDateElement.GetString();
//                         _logger.LogInformation("Found billDate: {Date}", billDate);
//                     }

//                     if (string.IsNullOrEmpty(billDate))
//                     {
//                         return BillDateValidationResult.Error("English date is required for validation");
//                     }
//                 }

//                 // Get the company's start date (FiscalYearStartDate for Nepali, CreatedAt for English)
//                 string companyStartDate;
//                 if (company.DateFormat == DateFormatEnum.Nepali)
//                 {
//                     if (string.IsNullOrEmpty(company.FiscalYearStartDate))
//                     {
//                         return BillDateValidationResult.Error("Company fiscal year start date is not set");
//                     }
//                     companyStartDate = company.FiscalYearStartDate;
//                     _logger.LogInformation("Company start date (Nepali): {CompanyStartDate}", companyStartDate);
//                 }
//                 else
//                 {
//                     companyStartDate = company.CreatedAt.ToString("yyyy-MM-dd");
//                     _logger.LogInformation("Company start date (English): {CompanyStartDate}", companyStartDate);
//                 }

//                 // Calculate one month after start date (as string comparison for Nepali, or date calculation for English)
//                 if (company.DateFormat == DateFormatEnum.Nepali)
//                 {
//                     // For Nepali dates, we need to calculate one month later as a string
//                     // Parse the start date to add one month
//                     var parts = companyStartDate.Split('-');
//                     if (parts.Length == 3 &&
//                         int.TryParse(parts[0], out int startYear) &&
//                         int.TryParse(parts[1], out int startMonth) &&
//                         int.TryParse(parts[2], out int startDay))
//                     {
//                         // Add one month
//                         int newYear = startYear;
//                         int newMonth = startMonth + 1;

//                         if (newMonth > 12)
//                         {
//                             newMonth = 1;
//                             newYear++;
//                         }

//                         // Keep the same day (simplified)
//                         string oneMonthLater = $"{newYear:D4}-{newMonth:D2}-{startDay:D2}";
//                         _logger.LogInformation("One month later (Nepali): {OneMonthLater}", oneMonthLater);

//                         // Compare strings (YYYY-MM-DD format works for string comparison)
//                         if (string.Compare(billDate, oneMonthLater) > 0)
//                         {
//                             _logger.LogWarning("DEMO PERIOD EXPIRED: Bill date {BillDate} is after {OneMonthLater}",
//                                 billDate, oneMonthLater);
//                             return BillDateValidationResult.DemoExpired();
//                         }
//                     }
//                     else
//                     {
//                         return BillDateValidationResult.Error("Invalid company start date format");
//                     }
//                 }
//                 else // English format
//                 {
//                     // Parse English dates for comparison
//                     if (DateTime.TryParse(billDate, out DateTime billDateTime) &&
//                         DateTime.TryParse(companyStartDate, out DateTime startDateTime))
//                     {
//                         var oneMonthLater = startDateTime.AddMonths(1);
//                         _logger.LogInformation("One month later (English): {OneMonthLater}", oneMonthLater);

//                         if (billDateTime > oneMonthLater)
//                         {
//                             _logger.LogWarning("DEMO PERIOD EXPIRED: Bill date {BillDate} is after {OneMonthLater}",
//                                 billDateTime, oneMonthLater);
//                             return BillDateValidationResult.DemoExpired();
//                         }
//                     }
//                     else
//                     {
//                         return BillDateValidationResult.Error("Invalid date format");
//                     }
//                 }

//                 _logger.LogInformation("Demo period valid");
//                 return BillDateValidationResult.Valid();
//             }
//             catch (Exception ex)
//             {
//                 _logger.LogError(ex, "Error parsing request body for demo period check");
//                 return BillDateValidationResult.Error("Invalid request format");
//             }
//         }

//         private async Task<BillDateValidationResult> ValidateRenewalDate(HttpContext context, Company company)
//         {
//             // Enable buffering to read request body
//             context.Request.EnableBuffering();

//             // Read request body
//             string requestBody;
//             using (var reader = new StreamReader(context.Request.Body, leaveOpen: true))
//             {
//                 requestBody = await reader.ReadToEndAsync();
//                 context.Request.Body.Position = 0; // Reset stream position
//             }

//             _logger.LogInformation("Request body: {RequestBody}", requestBody);

//             if (string.IsNullOrEmpty(requestBody))
//             {
//                 return BillDateValidationResult.Valid();
//             }

//             try
//             {
//                 using var jsonDocument = JsonDocument.Parse(requestBody);
//                 var root = jsonDocument.RootElement;

//                 if (company.DateFormat == DateFormatEnum.Nepali)
//                 {
//                     // Get Nepali date from request
//                     string nepaliDate = null;

//                     if (root.TryGetProperty("nepaliDate", out var nepaliDateElement))
//                     {
//                         nepaliDate = nepaliDateElement.GetString();
//                     }

//                     if (string.IsNullOrEmpty(nepaliDate) && root.TryGetProperty("transactionDateNepali", out var transNepaliDateElement))
//                     {
//                         nepaliDate = transNepaliDateElement.GetString();
//                     }

//                     if (string.IsNullOrEmpty(nepaliDate))
//                     {
//                         return BillDateValidationResult.Valid();
//                     }

//                     _logger.LogInformation("Comparing Nepali date '{NepaliDate}' with renewal date '{RenewalDate}'",
//                         nepaliDate, company.RenewalDate);

//                     // String comparison works for YYYY-MM-DD format
//                     if (string.Compare(nepaliDate, company.RenewalDate) > 0)
//                     {
//                         _logger.LogWarning("RENEWAL EXPIRED: Nepali date {NepaliDate} is after renewal date {RenewalDate}",
//                             nepaliDate, company.RenewalDate);
//                         return BillDateValidationResult.RenewalExpired();
//                     }
//                 }
//                 else // English format
//                 {
//                     // Get English date from request
//                     DateTime? englishDate = null;

//                     if (root.TryGetProperty("transactionDate", out var transDateElement))
//                     {
//                         if (DateTime.TryParse(transDateElement.GetString(), out DateTime parsedDate))
//                         {
//                             englishDate = parsedDate;
//                         }
//                     }

//                     if (!englishDate.HasValue && root.TryGetProperty("date", out var dateElement))
//                     {
//                         if (DateTime.TryParse(dateElement.GetString(), out DateTime parsedDate))
//                         {
//                             englishDate = parsedDate;
//                         }
//                     }

//                     if (!englishDate.HasValue && root.TryGetProperty("billDate", out var billDateElement))
//                     {
//                         if (DateTime.TryParse(billDateElement.GetString(), out DateTime parsedDate))
//                         {
//                             englishDate = parsedDate;
//                         }
//                     }

//                     if (!englishDate.HasValue)
//                     {
//                         return BillDateValidationResult.Valid();
//                     }

//                     if (DateTime.TryParse(company.RenewalDate, out DateTime renewalDateTime))
//                     {
//                         _logger.LogInformation("Comparing English date {EnglishDate} with renewal date {RenewalDate}",
//                             englishDate.Value, renewalDateTime);

//                         if (englishDate.Value > renewalDateTime)
//                         {
//                             _logger.LogWarning("RENEWAL EXPIRED: English date {EnglishDate} is after renewal date {RenewalDate}",
//                                 englishDate.Value, renewalDateTime);
//                             return BillDateValidationResult.RenewalExpired();
//                         }
//                     }
//                     else
//                     {
//                         _logger.LogError("Invalid renewal date format: {RenewalDate}", company.RenewalDate);
//                     }
//                 }

//                 return BillDateValidationResult.Valid();
//             }
//             catch (Exception ex)
//             {
//                 _logger.LogError(ex, "Error parsing request body for renewal check");
//                 return BillDateValidationResult.Error("Invalid request format");
//             }
//         }

//         private async Task HandleValidationFailure(HttpContext context, BillDateValidationResult result)
//         {
//             _logger.LogWarning("Handling validation failure: {ErrorMessage}, Type: {Type}",
//                 result.ErrorMessage, result.IsDemoExpired ? "demo_expired" : "renewal_expired");

//             context.Response.StatusCode = 403; // Forbidden
//             context.Response.ContentType = "application/json";

//             var response = new
//             {
//                 success = false,
//                 error = result.ErrorMessage,
//                 type = result.IsDemoExpired ? "demo_expired" : "renewal_expired",
//                 redirectUrl = result.IsDemoExpired ? "/subscription/upgrade" : "/subscription/renew"
//             };

//             await context.Response.WriteAsJsonAsync(response);
//         }

//         private async Task HandleApiError(HttpContext context, string message)
//         {
//             context.Response.StatusCode = 500;
//             context.Response.ContentType = "application/json";

//             var response = new
//             {
//                 success = false,
//                 error = message
//             };

//             await context.Response.WriteAsJsonAsync(response);
//         }

//         private class BillDateValidationResult
//         {
//             public bool IsValid { get; set; }
//             public bool IsDemoExpired { get; set; }
//             public bool IsRenewalExpired { get; set; }
//             public string ErrorMessage { get; set; }

//             public static BillDateValidationResult Valid() => new BillDateValidationResult { IsValid = true };

//             public static BillDateValidationResult DemoExpired() => new BillDateValidationResult
//             {
//                 IsValid = false,
//                 IsDemoExpired = true,
//                 ErrorMessage = "Demo period has expired. Please upgrade to the full version."
//             };

//             public static BillDateValidationResult RenewalExpired() => new BillDateValidationResult
//             {
//                 IsValid = false,
//                 IsRenewalExpired = true,
//                 ErrorMessage = "Renewal period has expired. Please renew to continue making entries."
//             };

//             public static BillDateValidationResult Error(string message) => new BillDateValidationResult
//             {
//                 IsValid = false,
//                 ErrorMessage = message
//             };
//         }
//     }
// }

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

            // Check if user is authenticated
            // if (!context.User.Identity?.IsAuthenticated ?? true)
            // {
            //     _logger.LogInformation("User not authenticated, skipping middleware");
            //     await _next(context);
            //     return;
            // }

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

            return isPurchaseEndpoint && method == HttpMethods.Post;
        }
    }
}