using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using SkyForge.Data;
using SkyForge.Models.CompanyModel;
using SkyForge.Models.FiscalYearModel;
using SkyForge.Models.Shared;
using System;
using System.Text.Json;
using System.Threading.Tasks;

namespace SkyForge.Middleware
{
    public static class CheckFiscalYearDateRangeMiddlewareExtensions
    {
        public static IApplicationBuilder UseCheckFiscalYearDateRangeMiddleware(this IApplicationBuilder app)
        {
            return app.UseMiddleware<CheckFiscalYearDateRangeMiddleware>();
        }
    }

    public class CheckFiscalYearDateRangeMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<CheckFiscalYearDateRangeMiddleware> _logger;

        public CheckFiscalYearDateRangeMiddleware(RequestDelegate next, ILogger<CheckFiscalYearDateRangeMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context, ApplicationDbContext dbContext)
        {
            var path = context.Request.Path.Value?.ToLower() ?? "";
            var method = context.Request.Method;

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

            // Get company ID from claims
            var companyIdClaim = context.User.FindFirst("currentCompany")?.Value;
            if (string.IsNullOrEmpty(companyIdClaim) || !Guid.TryParse(companyIdClaim, out Guid companyId))
            {
                await _next(context);
                return;
            }

            // Check if this is a transaction POST/PUT request
            if (IsTransactionRequest(context))
            {
                _logger.LogInformation("Transaction request detected for company {CompanyId}", companyId);

                try
                {
                    // Get current fiscal year from database
                    var fiscalYear = await GetCurrentFiscalYear(dbContext, companyId);
                    if (fiscalYear == null)
                    {
                        _logger.LogWarning("No fiscal year found for company {CompanyId}", companyId);
                        await _next(context);
                        return;
                    }

                    _logger.LogInformation("Fiscal Year: {Name}, DateFormat: {DateFormat}, StartDateNepali: {StartDateNepali}, EndDateNepali: {EndDateNepali}",
                        fiscalYear.Name, fiscalYear.DateFormat, fiscalYear.StartDateNepali, fiscalYear.EndDateNepali);

                    // Read the request body to get the entry date
                    context.Request.EnableBuffering();
                    string requestBody;
                    using (var reader = new StreamReader(context.Request.Body, leaveOpen: true))
                    {
                        requestBody = await reader.ReadToEndAsync();
                        context.Request.Body.Position = 0;
                    }

                    if (string.IsNullOrEmpty(requestBody))
                    {
                        await _next(context);
                        return;
                    }

                    using var jsonDocument = JsonDocument.Parse(requestBody);
                    var root = jsonDocument.RootElement;

                    // Get the entry date based on fiscal year's date format
                    string entryDate = null;
                    string entryDateNepali = null;

                    if (fiscalYear.DateFormat == DateFormatEnum.Nepali)
                    {
                        // For Nepali format, look for Nepali date fields
                        string[] nepaliDateFields = { "nepaliDate", "transactionDateNepali", "billDateNepali", "startDateNepali", "dateNepali" };

                        foreach (var field in nepaliDateFields)
                        {
                            if (root.TryGetProperty(field, out var dateElement) && dateElement.ValueKind == JsonValueKind.String)
                            {
                                entryDateNepali = dateElement.GetString();
                                if (!string.IsNullOrEmpty(entryDateNepali))
                                {
                                    // Clean the date string - remove time component if present
                                    entryDateNepali = CleanNepaliDateString(entryDateNepali);
                                    _logger.LogInformation("Found Nepali date in field '{Field}': {Date}", field, entryDateNepali);
                                    break;
                                }
                            }
                        }

                        if (string.IsNullOrEmpty(entryDateNepali))
                        {
                            _logger.LogWarning("No Nepali date found in request for fiscal year with Nepali format");
                            await _next(context);
                            return;
                        }
                    }
                    else // English format
                    {
                        // For English format, look for English date fields
                        string[] englishDateFields = { "transactionDate", "billDate", "date", "entryDate", "postingDate", "startDate", "invoiceDate" };

                        foreach (var field in englishDateFields)
                        {
                            if (root.TryGetProperty(field, out var dateElement) && dateElement.ValueKind == JsonValueKind.String)
                            {
                                entryDate = dateElement.GetString();
                                if (!string.IsNullOrEmpty(entryDate))
                                {
                                    _logger.LogInformation("Found English date in field '{Field}': {Date}", field, entryDate);
                                    break;
                                }
                            }
                        }

                        if (string.IsNullOrEmpty(entryDate))
                        {
                            _logger.LogWarning("No English date found in request for fiscal year with English format");
                            await _next(context);
                            return;
                        }
                    }

                    // Validate the date against fiscal year
                    bool isValid = ValidateDateAgainstFiscalYear(fiscalYear, entryDate, entryDateNepali);

                    if (!isValid)
                    {
                        string fiscalYearRange = GetFiscalYearRangeDisplay(fiscalYear);
                        string errorMessage = $"Transaction date is outside the active fiscal year ({fiscalYear.Name}) range: {fiscalYearRange}";

                        _logger.LogWarning("FISCAL YEAR VALIDATION FAILED: {ErrorMessage}", errorMessage);

                        context.Response.StatusCode = 400;
                        context.Response.ContentType = "application/json";

                        var response = new
                        {
                            success = false,
                            error = errorMessage,
                            type = "fiscal_year_range_error",
                            fiscalYear = fiscalYear.Name,
                            allowedRange = fiscalYearRange
                        };

                        await context.Response.WriteAsJsonAsync(response);
                        return;
                    }

                    _logger.LogInformation("Fiscal year validation passed, continuing with request");
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error checking fiscal year date range for company: {CompanyId}", companyId);
                }
            }

            await _next(context);
        }

        private async Task<FiscalYear?> GetCurrentFiscalYear(ApplicationDbContext dbContext, Guid companyId)
        {
            // First, try to get the active fiscal year
            var activeFiscalYear = await dbContext.FiscalYears
                .FirstOrDefaultAsync(f => f.CompanyId == companyId && f.IsActive);

            if (activeFiscalYear != null)
            {
                return activeFiscalYear;
            }

            // If no active fiscal year, get the latest one by StartDate
            var latestFiscalYear = await dbContext.FiscalYears
                .Where(f => f.CompanyId == companyId)
                .OrderByDescending(f => f.StartDate)
                .ThenByDescending(f => f.CreatedAt)
                .FirstOrDefaultAsync();

            return latestFiscalYear;
        }

        private string CleanNepaliDateString(string dateString)
        {
            if (string.IsNullOrEmpty(dateString))
                return dateString;

            // Remove time component if present (e.g., "2083-02-13T00:00:00.000Z" -> "2083-02-13")
            if (dateString.Contains('T'))
            {
                dateString = dateString.Substring(0, dateString.IndexOf('T'));
            }

            // Also handle other possible separators
            dateString = dateString.Trim();

            return dateString;
        }

        private bool ValidateDateAgainstFiscalYear(FiscalYear fiscalYear, string? englishDate, string? nepaliDate)
        {
            if (fiscalYear.DateFormat == DateFormatEnum.Nepali)
            {
                return ValidateNepaliDate(fiscalYear, nepaliDate);
            }
            else
            {
                return ValidateEnglishDate(fiscalYear, englishDate);
            }
        }

        private bool ValidateNepaliDate(FiscalYear fiscalYear, string? nepaliDate)
        {
            if (string.IsNullOrEmpty(nepaliDate))
            {
                _logger.LogWarning("No Nepali date provided for validation");
                return false;
            }

            try
            {
                // Clean the date string
                nepaliDate = CleanNepaliDateString(nepaliDate);

                // Parse fiscal year Nepali dates
                if (string.IsNullOrEmpty(fiscalYear.StartDateNepali) || string.IsNullOrEmpty(fiscalYear.EndDateNepali))
                {
                    _logger.LogWarning("Fiscal year has no Nepali dates defined. StartDateNepali: {Start}, EndDateNepali: {End}",
                        fiscalYear.StartDateNepali, fiscalYear.EndDateNepali);
                    return false;
                }

                _logger.LogDebug("Comparing - Fiscal Start: {Start}, Fiscal End: {End}, Entry: {Entry}",
                    fiscalYear.StartDateNepali, fiscalYear.EndDateNepali, nepaliDate);

                // Convert Nepali dates to numeric format for comparison (YYYYMMDD)
                // This works for Nepali dates because they're just numbers
                long fiscalStartNumeric = ConvertNepaliDateToNumeric(fiscalYear.StartDateNepali);
                long fiscalEndNumeric = ConvertNepaliDateToNumeric(fiscalYear.EndDateNepali);
                long entryDateNumeric = ConvertNepaliDateToNumeric(nepaliDate);

                _logger.LogDebug("Numeric comparison - Start: {Start}, End: {End}, Entry: {Entry}",
                    fiscalStartNumeric, fiscalEndNumeric, entryDateNumeric);

                bool isValid = entryDateNumeric >= fiscalStartNumeric && entryDateNumeric <= fiscalEndNumeric;

                if (!isValid)
                {
                    _logger.LogWarning("Nepali date {NepaliDate} is outside fiscal year range {Start} to {End}",
                        nepaliDate, fiscalYear.StartDateNepali, fiscalYear.EndDateNepali);
                }

                return isValid;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error validating Nepali date {NepaliDate}", nepaliDate);
                return false;
            }
        }

        private long ConvertNepaliDateToNumeric(string nepaliDate)
        {
            if (string.IsNullOrEmpty(nepaliDate))
                throw new ArgumentException("Nepali date cannot be null or empty");

            // Clean the date string first
            nepaliDate = CleanNepaliDateString(nepaliDate);

            // Parse Nepali date format: "YYYY-MM-DD"
            var parts = nepaliDate.Split(new char[] { '-', '/' });
            if (parts.Length != 3)
            {
                throw new ArgumentException($"Invalid Nepali date format: {nepaliDate}. Expected format: YYYY-MM-DD");
            }

            int year = int.Parse(parts[0]);
            int month = int.Parse(parts[1]);
            int day = int.Parse(parts[2]);

            // Convert to YYYYMMDD numeric value for easy comparison
            // This works for Nepali dates because months can have 32 days
            return year * 10000 + month * 100 + day;
        }

        private bool ValidateEnglishDate(FiscalYear fiscalYear, string? englishDate)
        {
            if (string.IsNullOrEmpty(englishDate))
            {
                _logger.LogWarning("No English date provided for validation");
                return false;
            }

            try
            {
                if (!DateTime.TryParse(englishDate, out DateTime entryDateTime))
                {
                    _logger.LogWarning("Invalid English date format: {EnglishDate}", englishDate);
                    return false;
                }

                var startDate = fiscalYear.StartDate ?? DateTime.MinValue;
                var endDate = fiscalYear.EndDate ?? DateTime.MaxValue;

                bool isValid = entryDateTime >= startDate && entryDateTime <= endDate;

                if (!isValid)
                {
                    _logger.LogWarning("English date {EnglishDate} is outside fiscal year range {StartDate} to {EndDate}",
                        englishDate, startDate.ToString("yyyy-MM-dd"), endDate.ToString("yyyy-MM-dd"));
                }

                return isValid;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error validating English date {EnglishDate}", englishDate);
                return false;
            }
        }

        private string GetFiscalYearRangeDisplay(FiscalYear fiscalYear)
        {
            if (fiscalYear.DateFormat == DateFormatEnum.Nepali)
            {
                return $"{fiscalYear.StartDateNepali} to {fiscalYear.EndDateNepali} (Nepali BS)";
            }
            else
            {
                string startDate = fiscalYear.StartDate?.ToString("yyyy-MM-dd") ?? "N/A";
                string endDate = fiscalYear.EndDate?.ToString("yyyy-MM-dd") ?? "N/A";
                return $"{startDate} to {endDate} (English AD)";
            }
        }

        private bool ShouldSkipMiddleware(HttpContext context)
        {
            var path = context.Request.Path.Value?.ToLower() ?? "";

            // Skip for non-transaction endpoints, auth, company selection, etc.
            return !IsTransactionRequest(context) ||
                   path.Contains("/api/auth") ||
                   path.Contains("/api/company") ||
                   path.Contains("/api/fiscal-year") ||
                   path.Contains("/api/fiscalyears") ||
                   path.Contains("/api/subscription") ||
                   path.Contains("/swagger") ||
                   path.StartsWith("/health") ||
                   path.Contains("/api/companies/switch") ||
                   path.Contains("/api/fiscalyears/switch-fiscal-year");
        }

        private bool IsTransactionRequest(HttpContext context)
        {
            var path = context.Request.Path.Value?.ToLower() ?? "";
            var method = context.Request.Method;

            // Only validate POST and PUT requests
            if (method != HttpMethods.Post && method != HttpMethods.Put)
            {
                return false;
            }

            // Transaction endpoints
            string[] transactionEndpoints = {
                "/api/retailer/purchase",
                "/api/retailer/credit-sales",
                "/api/retailer/cash-sales",
                "/api/retailer/sales-return",
                "/api/retailer/cash/sales-return",
                "/api/retailer/purchase-return",
                "/api/retailer/payments",
                "/api/retailer/receipts",
                "/api/retailer/journal",
                "/api/retailer/debit-note",
                "/api/retailer/credit-note",
                "/api/accounts",
                "/api/transactions",
                "/api/invoices",
                "/api/retailer/stock-adjustments"
            };

            foreach (var endpoint in transactionEndpoints)
            {
                if (path.StartsWith(endpoint) || path == endpoint)
                {
                    return true;
                }
            }

            return false;
        }
    }
}