// Middleware/CheckFiscalYearDateRangeMiddleware.cs
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using SkyForge.Data;
using SkyForge.Models.FiscalYearModel;
using SkyForge.Models.Shared;
using System;
using System.Threading.Tasks;

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

        // Check if company is selected
        var companyIdClaim = context.User.FindFirst("currentCompanyId")?.Value;
        if (string.IsNullOrEmpty(companyIdClaim) || !Guid.TryParse(companyIdClaim, out Guid companyId))
        {
            await _next(context);
            return;
        }

        // Check if this is a POST/PUT request for creating/updating transactions
        if (IsTransactionRequest(context))
        {
            try
            {
                // Check if fiscal year date range is valid for the entry
                var validationResult = await ValidateEntryDateAgainstFiscalYear(context, dbContext, companyId);

                if (!validationResult.IsValid)
                {
                    // Don't proceed with the request if validation fails
                    await HandleValidationFailure(context, validationResult);
                    return;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking fiscal year date range for company: {CompanyId}", companyId);

                // For API requests, return error
                if (context.Request.Path.StartsWithSegments("/api"))
                {
                    await HandleApiError(context, "Server error while checking fiscal year date range");
                    return;
                }
            }
        }

        await _next(context);
    }

    private bool ShouldSkipMiddleware(HttpContext context)
    {
        var path = context.Request.Path.Value?.ToLower() ?? "";

        // Skip for non-transaction endpoints, auth, company selection, etc.
        return !IsTransactionRequest(context) ||
               path.Contains("/api/auth") ||
               path.Contains("/api/company") ||
               path.Contains("/api/fiscal-year") ||
               path.Contains("/swagger") ||
               path.StartsWith("/health");
    }

    private bool IsTransactionRequest(HttpContext context)
    {
        var path = context.Request.Path.Value?.ToLower() ?? "";

        // Check if this is a transaction creation/update endpoint
        return (path.Contains("/api/sales") ||
                path.Contains("/api/purchases") ||
                path.Contains("/api/invoices") ||
                path.Contains("/api/payments") ||
                path.Contains("/api/receipts") ||
                path.Contains("/api/journal") ||
                path.Contains("/api/transactions")) &&
               (context.Request.Method == HttpMethods.Post ||
                context.Request.Method == HttpMethods.Put);
    }

    private async Task<FiscalYearValidationResult> ValidateEntryDateAgainstFiscalYear(
        HttpContext context, ApplicationDbContext dbContext, Guid companyId)
    {
        // Get active fiscal year from HttpContext.Items (set by EnsureFiscalYearMiddleware)
        var fiscalYearObj = context.Items["CurrentFiscalYear"];

        if (fiscalYearObj == null)
        {
            // Fallback: Get active fiscal year from database
            var fiscalYears = await dbContext.FiscalYears
                .FirstOrDefaultAsync(f => f.CompanyId == companyId && f.IsActive);

            if (fiscalYears == null)
            {
                return FiscalYearValidationResult.Error("No active fiscal year found");
            }

            // Store in HttpContext.Items for this request
            context.Items["CurrentFiscalYear"] = fiscalYears;
            fiscalYearObj = fiscalYears;
        }

        // Ensure fiscalYearObj is FiscalYear type
        if (!(fiscalYearObj is FiscalYear fiscalYear))
        {
            return FiscalYearValidationResult.Error("Invalid fiscal year data");
        }

        // Get date format with default value
        var dateFormat = fiscalYear.DateFormat ?? DateFormatEnum.English;

        // Read request body to get entry date
        var entryDateResult = await GetEntryDateFromRequest(context, dateFormat);

        if (!entryDateResult.HasValue)
        {
            return FiscalYearValidationResult.Valid(); // No date to validate
        }

        // Validate based on fiscal year date format
        return ValidateDateAgainstFiscalYear(fiscalYear, entryDateResult.Value);
    }

    private async Task<(DateTime? Date, string NepaliDate)?> GetEntryDateFromRequest(
        HttpContext context, DateFormatEnum dateFormat)
    {
        // Enable buffering to read request body
        context.Request.EnableBuffering();

        try
        {
            // Read request body
            string requestBody;
            using (var reader = new StreamReader(context.Request.Body, leaveOpen: true))
            {
                requestBody = await reader.ReadToEndAsync();
                context.Request.Body.Position = 0; // Reset stream position
            }

            if (string.IsNullOrEmpty(requestBody))
            {
                return null;
            }

            // Parse JSON to get entry date
            var jsonDocument = System.Text.Json.JsonDocument.Parse(requestBody);

            DateTime? date = null;
            string nepaliDate = null;

            // Try different property names for date
            string[] datePropertyNames = { "billDate", "invoiceDate", "transactionDate", "date", "entryDate", "postingDate" };

            foreach (var propertyName in datePropertyNames)
            {
                if (jsonDocument.RootElement.TryGetProperty(propertyName, out var dateElement))
                {
                    if (dateElement.ValueKind == System.Text.Json.JsonValueKind.String)
                    {
                        if (DateTime.TryParse(dateElement.GetString(), out DateTime parsedDate))
                        {
                            date = parsedDate;
                        }
                    }
                    else if (dateElement.ValueKind == System.Text.Json.JsonValueKind.Number)
                    {
                        // Handle timestamp
                        var timestamp = dateElement.GetInt64();
                        date = DateTimeOffset.FromUnixTimeMilliseconds(timestamp).DateTime;
                    }
                    break;
                }
            }

            // Try to get Nepali date
            if (jsonDocument.RootElement.TryGetProperty("nepaliDate", out var nepaliDateElement))
            {
                if (nepaliDateElement.ValueKind == System.Text.Json.JsonValueKind.String)
                {
                    nepaliDate = nepaliDateElement.GetString();
                }
            }

            return (date, nepaliDate);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reading entry date from request");
            return null;
        }
    }

    private FiscalYearValidationResult ValidateDateAgainstFiscalYear(
        FiscalYear fiscalYear, (DateTime? Date, string NepaliDate) entryDate)
    {
        var dateFormat = fiscalYear.DateFormat ?? DateFormatEnum.English;
        var fiscalYearName = fiscalYear.Name;

        _logger.LogDebug("Validating entry date against fiscal year: {FiscalYearName}, DateFormat: {DateFormat}",
            fiscalYearName, dateFormat);

        try
        {
            if (dateFormat == DateFormatEnum.Nepali)
            {
                return ValidateNepaliDate(fiscalYear, entryDate);
            }
            else if (dateFormat == DateFormatEnum.English)
            {
                return ValidateEnglishDate(fiscalYear, entryDate);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating date against fiscal year");
            return FiscalYearValidationResult.Error("Error validating date");
        }

        return FiscalYearValidationResult.Valid();
    }

    private FiscalYearValidationResult ValidateNepaliDate(
        FiscalYear fiscalYear, (DateTime? Date, string NepaliDate) entryDate)
    {
        // Validate Nepali date
        if (!string.IsNullOrEmpty(entryDate.NepaliDate))
        {
            // Parse Nepali dates for comparison
            if (!TryParseNepaliDate(fiscalYear.StartDateNepali, out DateTime? fiscalStartDate) ||
                !TryParseNepaliDate(fiscalYear.EndDateNepali, out DateTime? fiscalEndDate) ||
                !TryParseNepaliDate(entryDate.NepaliDate, out DateTime? entryDateEnglish))
            {
                return FiscalYearValidationResult.Error("Invalid Nepali date format");
            }

            if (fiscalStartDate.HasValue && fiscalEndDate.HasValue && entryDateEnglish.HasValue)
            {
                if (entryDateEnglish.Value < fiscalStartDate.Value || entryDateEnglish.Value > fiscalEndDate.Value)
                {
                    _logger.LogWarning(
                        "Entry date {NepaliDate} is outside fiscal year {FiscalYearName} range: {StartDate} to {EndDate}",
                        entryDate.NepaliDate, fiscalYear.Name, fiscalYear.StartDateNepali, fiscalYear.EndDateNepali);

                    return FiscalYearValidationResult.OutOfRange(fiscalYear.Name,
                        $"{fiscalYear.StartDateNepali} to {fiscalYear.EndDateNepali}");
                }
            }
        }
        else if (entryDate.Date.HasValue)
        {
            // Fallback: Use English date if Nepali date not provided
            var startDate = fiscalYear.StartDate ?? DateTime.MinValue;
            var endDate = fiscalYear.EndDate ?? DateTime.MaxValue;

            if (entryDate.Date.Value < startDate || entryDate.Date.Value > endDate)
            {
                _logger.LogWarning(
                    "Entry date {EntryDate} is outside fiscal year {FiscalYearName} range: {StartDate} to {EndDate}",
                    entryDate.Date.Value, fiscalYear.Name, startDate, endDate);

                return FiscalYearValidationResult.OutOfRange(fiscalYear.Name,
                    $"{startDate:yyyy-MM-dd} to {endDate:yyyy-MM-dd}");
            }
        }

        return FiscalYearValidationResult.Valid();
    }

    private FiscalYearValidationResult ValidateEnglishDate(
        FiscalYear fiscalYear, (DateTime? Date, string NepaliDate) entryDate)
    {
        // Validate English date
        if (entryDate.Date.HasValue)
        {
            var startDate = fiscalYear.StartDate ?? DateTime.MinValue;
            var endDate = fiscalYear.EndDate ?? DateTime.MaxValue;

            if (entryDate.Date.Value < startDate || entryDate.Date.Value > endDate)
            {
                _logger.LogWarning(
                    "Entry date {EntryDate} is outside fiscal year {FiscalYearName} range: {StartDate} to {EndDate}",
                    entryDate.Date.Value, fiscalYear.Name, startDate, endDate);

                return FiscalYearValidationResult.OutOfRange(fiscalYear.Name,
                    $"{startDate:yyyy-MM-dd} to {endDate:yyyy-MM-dd}");
            }
        }
        else
        {
            return FiscalYearValidationResult.Error("Entry date is required");
        }

        return FiscalYearValidationResult.Valid();
    }

    private bool TryParseNepaliDate(string? nepaliDate, out DateTime? englishDate)
    {
        englishDate = null;

        if (string.IsNullOrEmpty(nepaliDate))
            return false;

        try
        {
            // Parse Nepali date (assuming format like "2081-04-15")
            var parts = nepaliDate.Split('-');
            if (parts.Length == 3 &&
                int.TryParse(parts[0], out int year) &&
                int.TryParse(parts[1], out int month) &&
                int.TryParse(parts[2], out int day))
            {
                // Convert Nepali date to approximate English date
                // BS to AD conversion: Subtract 57 years
                var englishYear = year - 57;

                // Create DateTime (keeping month and day same)
                englishDate = new DateTime(englishYear, month, day);
                return true;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error parsing Nepali date: {NepaliDate}", nepaliDate);
        }

        return false;
    }

    private async Task HandleValidationFailure(HttpContext context, FiscalYearValidationResult result)
    {
        if (context.Request.Path.StartsWithSegments("/api"))
        {
            context.Response.StatusCode = result.IsOutOfRange ? 400 : 500;
            context.Response.ContentType = "application/json";

            var response = new
            {
                success = false,
                error = result.ErrorMessage,
                type = "fiscal_year_range",
                fiscalYear = result.FiscalYearName,
                allowedRange = result.DateRange
            };

            await context.Response.WriteAsJsonAsync(response);
        }
        else
        {
            // For MVC/views (if you have them)
            context.Response.Redirect($"/error/validation?error={Uri.EscapeDataString(result.ErrorMessage)}");
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

    // Helper class for validation results
    private class FiscalYearValidationResult
    {
        public bool IsValid { get; set; }
        public bool IsOutOfRange { get; set; }
        public string ErrorMessage { get; set; }
        public string FiscalYearName { get; set; }
        public string DateRange { get; set; }

        public static FiscalYearValidationResult Valid() => new FiscalYearValidationResult
        {
            IsValid = true
        };

        public static FiscalYearValidationResult OutOfRange(string fiscalYearName, string dateRange) =>
            new FiscalYearValidationResult
            {
                IsValid = false,
                IsOutOfRange = true,
                ErrorMessage = "Entries are not allowed outside the active fiscal year date range.",
                FiscalYearName = fiscalYearName,
                DateRange = dateRange
            };

        public static FiscalYearValidationResult Error(string message) => new FiscalYearValidationResult
        {
            IsValid = false,
            ErrorMessage = message,
            FiscalYearName = string.Empty,
            DateRange = string.Empty
        };
    }
}