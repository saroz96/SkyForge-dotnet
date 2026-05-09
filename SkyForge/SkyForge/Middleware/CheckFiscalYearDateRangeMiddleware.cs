// // Middleware/CheckFiscalYearDateRangeMiddleware.cs
// using Microsoft.AspNetCore.Http;
// using Microsoft.Extensions.DependencyInjection;
// using SkyForge.Data;
// using SkyForge.Models.FiscalYearModel;
// using SkyForge.Models.Shared;
// using System;
// using System.Threading.Tasks;

// public static class CheckFiscalYearDateRangeMiddlewareExtensions
// {
//     public static IApplicationBuilder UseCheckFiscalYearDateRangeMiddleware(this IApplicationBuilder app)
//     {
//         return app.UseMiddleware<CheckFiscalYearDateRangeMiddleware>();
//     }
// }

// public class CheckFiscalYearDateRangeMiddleware
// {
//     private readonly RequestDelegate _next;
//     private readonly ILogger<CheckFiscalYearDateRangeMiddleware> _logger;

//     public CheckFiscalYearDateRangeMiddleware(RequestDelegate next, ILogger<CheckFiscalYearDateRangeMiddleware> logger)
//     {
//         _next = next;
//         _logger = logger;
//     }

//     public async Task InvokeAsync(HttpContext context, ApplicationDbContext dbContext)
//     {
//         // Skip middleware for specific paths
//         if (ShouldSkipMiddleware(context))
//         {
//             await _next(context);
//             return;
//         }

//         // Check if user is authenticated
//         if (!context.User.Identity?.IsAuthenticated ?? true)
//         {
//             await _next(context);
//             return;
//         }

//         // Check if company is selected
//         var companyIdClaim = context.User.FindFirst("currentCompanyId")?.Value;
//         if (string.IsNullOrEmpty(companyIdClaim) || !Guid.TryParse(companyIdClaim, out Guid companyId))
//         {
//             await _next(context);
//             return;
//         }

//         // Check if this is a POST/PUT request for creating/updating transactions
//         if (IsTransactionRequest(context))
//         {
//             try
//             {
//                 // Check if fiscal year date range is valid for the entry
//                 var validationResult = await ValidateEntryDateAgainstFiscalYear(context, dbContext, companyId);

//                 if (!validationResult.IsValid)
//                 {
//                     // Don't proceed with the request if validation fails
//                     await HandleValidationFailure(context, validationResult);
//                     return;
//                 }
//             }
//             catch (Exception ex)
//             {
//                 _logger.LogError(ex, "Error checking fiscal year date range for company: {CompanyId}", companyId);

//                 // For API requests, return error
//                 if (context.Request.Path.StartsWithSegments("/api"))
//                 {
//                     await HandleApiError(context, "Server error while checking fiscal year date range");
//                     return;
//                 }
//             }
//         }

//         await _next(context);
//     }

//     private bool ShouldSkipMiddleware(HttpContext context)
//     {
//         var path = context.Request.Path.Value?.ToLower() ?? "";

//         // Skip for non-transaction endpoints, auth, company selection, etc.
//         return !IsTransactionRequest(context) ||
//                path.Contains("/api/auth") ||
//                path.Contains("/api/company") ||
//                path.Contains("/api/fiscal-year") ||
//                path.Contains("/swagger") ||
//                path.StartsWith("/health");
//     }

//     private bool IsTransactionRequest(HttpContext context)
//     {
//         var path = context.Request.Path.Value?.ToLower() ?? "";

//         // Check if this is a transaction creation/update endpoint
//         return (path.Contains("/api/sales") ||
//                 path.Contains("/api/purchases") ||
//                 path.Contains("/api/invoices") ||
//                 path.Contains("/api/payments") ||
//                 path.Contains("/api/receipts") ||
//                 path.Contains("/api/journal") ||
//                 path.Contains("/api/transactions")) &&
//                (context.Request.Method == HttpMethods.Post ||
//                 context.Request.Method == HttpMethods.Put);
//     }

//     private async Task<FiscalYearValidationResult> ValidateEntryDateAgainstFiscalYear(
//         HttpContext context, ApplicationDbContext dbContext, Guid companyId)
//     {
//         // Get active fiscal year from HttpContext.Items (set by EnsureFiscalYearMiddleware)
//         var fiscalYearObj = context.Items["CurrentFiscalYear"];

//         if (fiscalYearObj == null)
//         {
//             // Fallback: Get active fiscal year from database
//             var fiscalYears = await dbContext.FiscalYears
//                 .FirstOrDefaultAsync(f => f.CompanyId == companyId && f.IsActive);

//             if (fiscalYears == null)
//             {
//                 return FiscalYearValidationResult.Error("No active fiscal year found");
//             }

//             // Store in HttpContext.Items for this request
//             context.Items["CurrentFiscalYear"] = fiscalYears;
//             fiscalYearObj = fiscalYears;
//         }

//         // Ensure fiscalYearObj is FiscalYear type
//         if (!(fiscalYearObj is FiscalYear fiscalYear))
//         {
//             return FiscalYearValidationResult.Error("Invalid fiscal year data");
//         }

//         // Get date format with default value
//         var dateFormat = fiscalYear.DateFormat ?? DateFormatEnum.English;

//         // Read request body to get entry date
//         var entryDateResult = await GetEntryDateFromRequest(context, dateFormat);

//         if (!entryDateResult.HasValue)
//         {
//             return FiscalYearValidationResult.Valid(); // No date to validate
//         }

//         // Validate based on fiscal year date format
//         return ValidateDateAgainstFiscalYear(fiscalYear, entryDateResult.Value);
//     }

//     private async Task<(DateTime? Date, string NepaliDate)?> GetEntryDateFromRequest(
//         HttpContext context, DateFormatEnum dateFormat)
//     {
//         // Enable buffering to read request body
//         context.Request.EnableBuffering();

//         try
//         {
//             // Read request body
//             string requestBody;
//             using (var reader = new StreamReader(context.Request.Body, leaveOpen: true))
//             {
//                 requestBody = await reader.ReadToEndAsync();
//                 context.Request.Body.Position = 0; // Reset stream position
//             }

//             if (string.IsNullOrEmpty(requestBody))
//             {
//                 return null;
//             }

//             // Parse JSON to get entry date
//             var jsonDocument = System.Text.Json.JsonDocument.Parse(requestBody);

//             DateTime? date = null;
//             string nepaliDate = null;

//             // Try different property names for date
//             string[] datePropertyNames = { "billDate", "invoiceDate", "transactionDate", "date", "entryDate", "postingDate" };

//             foreach (var propertyName in datePropertyNames)
//             {
//                 if (jsonDocument.RootElement.TryGetProperty(propertyName, out var dateElement))
//                 {
//                     if (dateElement.ValueKind == System.Text.Json.JsonValueKind.String)
//                     {
//                         if (DateTime.TryParse(dateElement.GetString(), out DateTime parsedDate))
//                         {
//                             date = parsedDate;
//                         }
//                     }
//                     else if (dateElement.ValueKind == System.Text.Json.JsonValueKind.Number)
//                     {
//                         // Handle timestamp
//                         var timestamp = dateElement.GetInt64();
//                         date = DateTimeOffset.FromUnixTimeMilliseconds(timestamp).DateTime;
//                     }
//                     break;
//                 }
//             }

//             // Try to get Nepali date
//             if (jsonDocument.RootElement.TryGetProperty("nepaliDate", out var nepaliDateElement))
//             {
//                 if (nepaliDateElement.ValueKind == System.Text.Json.JsonValueKind.String)
//                 {
//                     nepaliDate = nepaliDateElement.GetString();
//                 }
//             }

//             return (date, nepaliDate);
//         }
//         catch (Exception ex)
//         {
//             _logger.LogError(ex, "Error reading entry date from request");
//             return null;
//         }
//     }

//     private FiscalYearValidationResult ValidateDateAgainstFiscalYear(
//         FiscalYear fiscalYear, (DateTime? Date, string NepaliDate) entryDate)
//     {
//         var dateFormat = fiscalYear.DateFormat ?? DateFormatEnum.English;
//         var fiscalYearName = fiscalYear.Name;

//         _logger.LogDebug("Validating entry date against fiscal year: {FiscalYearName}, DateFormat: {DateFormat}",
//             fiscalYearName, dateFormat);

//         try
//         {
//             if (dateFormat == DateFormatEnum.Nepali)
//             {
//                 return ValidateNepaliDate(fiscalYear, entryDate);
//             }
//             else if (dateFormat == DateFormatEnum.English)
//             {
//                 return ValidateEnglishDate(fiscalYear, entryDate);
//             }
//         }
//         catch (Exception ex)
//         {
//             _logger.LogError(ex, "Error validating date against fiscal year");
//             return FiscalYearValidationResult.Error("Error validating date");
//         }

//         return FiscalYearValidationResult.Valid();
//     }

//     private FiscalYearValidationResult ValidateNepaliDate(
//         FiscalYear fiscalYear, (DateTime? Date, string NepaliDate) entryDate)
//     {
//         // Validate Nepali date
//         if (!string.IsNullOrEmpty(entryDate.NepaliDate))
//         {
//             // Parse Nepali dates for comparison
//             if (!TryParseNepaliDate(fiscalYear.StartDateNepali, out DateTime? fiscalStartDate) ||
//                 !TryParseNepaliDate(fiscalYear.EndDateNepali, out DateTime? fiscalEndDate) ||
//                 !TryParseNepaliDate(entryDate.NepaliDate, out DateTime? entryDateEnglish))
//             {
//                 return FiscalYearValidationResult.Error("Invalid Nepali date format");
//             }

//             if (fiscalStartDate.HasValue && fiscalEndDate.HasValue && entryDateEnglish.HasValue)
//             {
//                 if (entryDateEnglish.Value < fiscalStartDate.Value || entryDateEnglish.Value > fiscalEndDate.Value)
//                 {
//                     _logger.LogWarning(
//                         "Entry date {NepaliDate} is outside fiscal year {FiscalYearName} range: {StartDate} to {EndDate}",
//                         entryDate.NepaliDate, fiscalYear.Name, fiscalYear.StartDateNepali, fiscalYear.EndDateNepali);

//                     return FiscalYearValidationResult.OutOfRange(fiscalYear.Name,
//                         $"{fiscalYear.StartDateNepali} to {fiscalYear.EndDateNepali}");
//                 }
//             }
//         }
//         else if (entryDate.Date.HasValue)
//         {
//             // Fallback: Use English date if Nepali date not provided
//             var startDate = fiscalYear.StartDate ?? DateTime.MinValue;
//             var endDate = fiscalYear.EndDate ?? DateTime.MaxValue;

//             if (entryDate.Date.Value < startDate || entryDate.Date.Value > endDate)
//             {
//                 _logger.LogWarning(
//                     "Entry date {EntryDate} is outside fiscal year {FiscalYearName} range: {StartDate} to {EndDate}",
//                     entryDate.Date.Value, fiscalYear.Name, startDate, endDate);

//                 return FiscalYearValidationResult.OutOfRange(fiscalYear.Name,
//                     $"{startDate:yyyy-MM-dd} to {endDate:yyyy-MM-dd}");
//             }
//         }

//         return FiscalYearValidationResult.Valid();
//     }

//     private FiscalYearValidationResult ValidateEnglishDate(
//         FiscalYear fiscalYear, (DateTime? Date, string NepaliDate) entryDate)
//     {
//         // Validate English date
//         if (entryDate.Date.HasValue)
//         {
//             var startDate = fiscalYear.StartDate ?? DateTime.MinValue;
//             var endDate = fiscalYear.EndDate ?? DateTime.MaxValue;

//             if (entryDate.Date.Value < startDate || entryDate.Date.Value > endDate)
//             {
//                 _logger.LogWarning(
//                     "Entry date {EntryDate} is outside fiscal year {FiscalYearName} range: {StartDate} to {EndDate}",
//                     entryDate.Date.Value, fiscalYear.Name, startDate, endDate);

//                 return FiscalYearValidationResult.OutOfRange(fiscalYear.Name,
//                     $"{startDate:yyyy-MM-dd} to {endDate:yyyy-MM-dd}");
//             }
//         }
//         else
//         {
//             return FiscalYearValidationResult.Error("Entry date is required");
//         }

//         return FiscalYearValidationResult.Valid();
//     }

//     private bool TryParseNepaliDate(string? nepaliDate, out DateTime? englishDate)
//     {
//         englishDate = null;

//         if (string.IsNullOrEmpty(nepaliDate))
//             return false;

//         try
//         {
//             // Parse Nepali date (assuming format like "2081-04-15")
//             var parts = nepaliDate.Split('-');
//             if (parts.Length == 3 &&
//                 int.TryParse(parts[0], out int year) &&
//                 int.TryParse(parts[1], out int month) &&
//                 int.TryParse(parts[2], out int day))
//             {
//                 // Convert Nepali date to approximate English date
//                 // BS to AD conversion: Subtract 57 years
//                 var englishYear = year - 57;

//                 // Create DateTime (keeping month and day same)
//                 englishDate = new DateTime(englishYear, month, day);
//                 return true;
//             }
//         }
//         catch (Exception ex)
//         {
//             _logger.LogError(ex, "Error parsing Nepali date: {NepaliDate}", nepaliDate);
//         }

//         return false;
//     }

//     private async Task HandleValidationFailure(HttpContext context, FiscalYearValidationResult result)
//     {
//         if (context.Request.Path.StartsWithSegments("/api"))
//         {
//             context.Response.StatusCode = result.IsOutOfRange ? 400 : 500;
//             context.Response.ContentType = "application/json";

//             var response = new
//             {
//                 success = false,
//                 error = result.ErrorMessage,
//                 type = "fiscal_year_range",
//                 fiscalYear = result.FiscalYearName,
//                 allowedRange = result.DateRange
//             };

//             await context.Response.WriteAsJsonAsync(response);
//         }
//         else
//         {
//             // For MVC/views (if you have them)
//             context.Response.Redirect($"/error/validation?error={Uri.EscapeDataString(result.ErrorMessage)}");
//         }
//     }

//     private async Task HandleApiError(HttpContext context, string message)
//     {
//         context.Response.StatusCode = 500;
//         context.Response.ContentType = "application/json";

//         var response = new
//         {
//             success = false,
//             error = message
//         };

//         await context.Response.WriteAsJsonAsync(response);
//     }

//     // Helper class for validation results
//     private class FiscalYearValidationResult
//     {
//         public bool IsValid { get; set; }
//         public bool IsOutOfRange { get; set; }
//         public string ErrorMessage { get; set; }
//         public string FiscalYearName { get; set; }
//         public string DateRange { get; set; }

//         public static FiscalYearValidationResult Valid() => new FiscalYearValidationResult
//         {
//             IsValid = true
//         };

//         public static FiscalYearValidationResult OutOfRange(string fiscalYearName, string dateRange) =>
//             new FiscalYearValidationResult
//             {
//                 IsValid = false,
//                 IsOutOfRange = true,
//                 ErrorMessage = "Entries are not allowed outside the active fiscal year date range.",
//                 FiscalYearName = fiscalYearName,
//                 DateRange = dateRange
//             };

//         public static FiscalYearValidationResult Error(string message) => new FiscalYearValidationResult
//         {
//             IsValid = false,
//             ErrorMessage = message,
//             FiscalYearName = string.Empty,
//             DateRange = string.Empty
//         };
//     }
// }

//------------------------------------------------------------------end1

// using Microsoft.AspNetCore.Http;
// using Microsoft.Extensions.DependencyInjection;
// using SkyForge.Data;
// using SkyForge.Models.CompanyModel;
// using SkyForge.Models.FiscalYearModel;
// using SkyForge.Models.Shared;
// using System;
// using System.Text.Json;
// using System.Threading.Tasks;

// namespace SkyForge.Middleware
// {
//     public static class CheckFiscalYearDateRangeMiddlewareExtensions
//     {
//         public static IApplicationBuilder UseCheckFiscalYearDateRangeMiddleware(this IApplicationBuilder app)
//         {
//             return app.UseMiddleware<CheckFiscalYearDateRangeMiddleware>();
//         }
//     }

//     public class CheckFiscalYearDateRangeMiddleware
//     {
//         private readonly RequestDelegate _next;
//         private readonly ILogger<CheckFiscalYearDateRangeMiddleware> _logger;

//         public CheckFiscalYearDateRangeMiddleware(RequestDelegate next, ILogger<CheckFiscalYearDateRangeMiddleware> logger)
//         {
//             _next = next;
//             _logger = logger;
//         }

//         public async Task InvokeAsync(HttpContext context, ApplicationDbContext dbContext)
//         {
//             var path = context.Request.Path.Value?.ToLower() ?? "";
//             var method = context.Request.Method;

//             // Skip middleware for specific paths
//             if (ShouldSkipMiddleware(context))
//             {
//                 await _next(context);
//                 return;
//             }

//             // Check if user is authenticated
//             if (!context.User.Identity?.IsAuthenticated ?? true)
//             {
//                 await _next(context);
//                 return;
//             }

//             // Get company ID from claims
//             var companyIdClaim = context.User.FindFirst("currentCompany")?.Value;
//             if (string.IsNullOrEmpty(companyIdClaim) || !Guid.TryParse(companyIdClaim, out Guid companyId))
//             {
//                 await _next(context);
//                 return;
//             }

//             // Check if this is a transaction POST/PUT request
//             if (IsTransactionRequest(context))
//             {
//                 _logger.LogInformation("Transaction request detected for company {CompanyId}", companyId);

//                 try
//                 {
//                     var company = await dbContext.Companies.FindAsync(companyId);
//                     if (company == null)
//                     {
//                         _logger.LogWarning("Company not found: {CompanyId}", companyId);
//                         await _next(context);
//                         return;
//                     }

//                     // Get current fiscal year from database
//                     var fiscalYear = await GetCurrentFiscalYear(dbContext, companyId);
//                     if (fiscalYear == null)
//                     {
//                         _logger.LogWarning("No fiscal year found for company {CompanyId}", companyId);
//                         await _next(context);
//                         return;
//                     }

//                     _logger.LogInformation("Fiscal Year: {Name}, DateFormat: {DateFormat}, StartDate: {StartDate}, EndDate: {EndDate}",
//                         fiscalYear.Name, fiscalYear.DateFormat, fiscalYear.StartDate, fiscalYear.EndDate);

//                     // Read the request body to get the entry date
//                     context.Request.EnableBuffering();
//                     string requestBody;
//                     using (var reader = new StreamReader(context.Request.Body, leaveOpen: true))
//                     {
//                         requestBody = await reader.ReadToEndAsync();
//                         context.Request.Body.Position = 0;
//                     }

//                     if (string.IsNullOrEmpty(requestBody))
//                     {
//                         await _next(context);
//                         return;
//                     }

//                     using var jsonDocument = JsonDocument.Parse(requestBody);
//                     var root = jsonDocument.RootElement;

//                     // Get the entry date based on fiscal year's date format
//                     string entryDate = null;
//                     string entryDateNepali = null;

//                     if (fiscalYear.DateFormat == DateFormatEnum.Nepali)
//                     {
//                         // For Nepali format, look for Nepali date fields
//                         string[] nepaliDateFields = { "nepaliDate", "transactionDateNepali", "NepaliDate"};

//                         foreach (var field in nepaliDateFields)
//                         {
//                             if (root.TryGetProperty(field, out var dateElement) && dateElement.ValueKind == JsonValueKind.String)
//                             {
//                                 entryDateNepali = dateElement.GetString();
//                                 if (!string.IsNullOrEmpty(entryDateNepali))
//                                 {
//                                     _logger.LogInformation("Found Nepali date in field '{Field}': {Date}", field, entryDateNepali);
//                                     break;
//                                 }
//                             }
//                         }

//                         if (string.IsNullOrEmpty(entryDateNepali))
//                         {
//                             _logger.LogWarning("No Nepali date found in request for fiscal year with Nepali format");
//                             await _next(context);
//                             return;
//                         }
//                     }
//                     else // English format
//                     {
//                         // For English format, look for English date fields
//                         string[] englishDateFields = { "transactionDate", "billDate", "date", "entryDate", "postingDate", "startDate", "invoiceDate" };

//                         foreach (var field in englishDateFields)
//                         {
//                             if (root.TryGetProperty(field, out var dateElement) && dateElement.ValueKind == JsonValueKind.String)
//                             {
//                                 entryDate = dateElement.GetString();
//                                 if (!string.IsNullOrEmpty(entryDate))
//                                 {
//                                     _logger.LogInformation("Found English date in field '{Field}': {Date}", field, entryDate);
//                                     break;
//                                 }
//                             }
//                         }

//                         if (string.IsNullOrEmpty(entryDate))
//                         {
//                             _logger.LogWarning("No English date found in request for fiscal year with English format");
//                             await _next(context);
//                             return;
//                         }
//                     }

//                     // Validate the date against fiscal year
//                     bool isValid = ValidateDateAgainstFiscalYear(fiscalYear, entryDate, entryDateNepali);

//                     if (!isValid)
//                     {
//                         string fiscalYearRange = GetFiscalYearRangeDisplay(fiscalYear);
//                         string errorMessage = $"Transaction date is outside the active fiscal year ({fiscalYear.Name}) range: {fiscalYearRange}";

//                         _logger.LogWarning("FISCAL YEAR VALIDATION FAILED: {ErrorMessage}", errorMessage);

//                         context.Response.StatusCode = 400;
//                         context.Response.ContentType = "application/json";

//                         var response = new
//                         {
//                             success = false,
//                             error = errorMessage,
//                             type = "fiscal_year_range_error",
//                             fiscalYear = fiscalYear.Name,
//                             allowedRange = fiscalYearRange
//                         };

//                         await context.Response.WriteAsJsonAsync(response);
//                         return;
//                     }

//                     _logger.LogInformation("Fiscal year validation passed, continuing with request");
//                 }
//                 catch (Exception ex)
//                 {
//                     _logger.LogError(ex, "Error checking fiscal year date range for company: {CompanyId}", companyId);
//                 }
//             }

//             await _next(context);
//         }

//         private async Task<FiscalYear?> GetCurrentFiscalYear(ApplicationDbContext dbContext, Guid companyId)
//         {
//             // First, try to get the active fiscal year
//             var activeFiscalYear = await dbContext.FiscalYears
//                 .FirstOrDefaultAsync(f => f.CompanyId == companyId && f.IsActive);

//             if (activeFiscalYear != null)
//             {
//                 return activeFiscalYear;
//             }

//             // If no active fiscal year, get the latest one by StartDate
//             var latestFiscalYear = await dbContext.FiscalYears
//                 .Where(f => f.CompanyId == companyId)
//                 .OrderByDescending(f => f.StartDate)
//                 .ThenByDescending(f => f.CreatedAt)
//                 .FirstOrDefaultAsync();

//             return latestFiscalYear;
//         }

//         private bool ValidateDateAgainstFiscalYear(FiscalYear fiscalYear, string? englishDate, string? nepaliDate)
//         {
//             if (fiscalYear.DateFormat == DateFormatEnum.Nepali)
//             {
//                 return ValidateNepaliDate(fiscalYear, nepaliDate);
//             }
//             else
//             {
//                 return ValidateEnglishDate(fiscalYear, englishDate);
//             }
//         }

//         private bool ValidateNepaliDate(FiscalYear fiscalYear, string? nepaliDate)
//         {
//             if (string.IsNullOrEmpty(nepaliDate))
//             {
//                 _logger.LogWarning("No Nepali date provided for validation");
//                 return false;
//             }

//             try
//             {
//                 // Parse fiscal year Nepali dates
//                 if (string.IsNullOrEmpty(fiscalYear.StartDateNepali) || string.IsNullOrEmpty(fiscalYear.EndDateNepali))
//                 {
//                     _logger.LogWarning("Fiscal year has no Nepali dates defined");
//                     return false;
//                 }

//                 // Convert Nepali dates to comparable format (YYYYMMDD)
//                 long fiscalStartNumeric = ConvertNepaliDateToNumeric(fiscalYear.StartDateNepali);
//                 long fiscalEndNumeric = ConvertNepaliDateToNumeric(fiscalYear.EndDateNepali);
//                 long entryDateNumeric = ConvertNepaliDateToNumeric(nepaliDate);

//                 _logger.LogDebug("Nepali date comparison - Fiscal Start: {Start}, Fiscal End: {End}, Entry: {Entry}",
//                     fiscalStartNumeric, fiscalEndNumeric, entryDateNumeric);

//                 bool isValid = entryDateNumeric >= fiscalStartNumeric && entryDateNumeric <= fiscalEndNumeric;

//                 if (!isValid)
//                 {
//                     _logger.LogWarning("Nepali date {NepaliDate} is outside fiscal year range {Start} to {End}",
//                         nepaliDate, fiscalYear.StartDateNepali, fiscalYear.EndDateNepali);
//                 }

//                 return isValid;
//             }
//             catch (Exception ex)
//             {
//                 _logger.LogError(ex, "Error validating Nepali date {NepaliDate}", nepaliDate);
//                 return false;
//             }
//         }

//         private bool ValidateEnglishDate(FiscalYear fiscalYear, string? englishDate)
//         {
//             if (string.IsNullOrEmpty(englishDate))
//             {
//                 _logger.LogWarning("No English date provided for validation");
//                 return false;
//             }

//             try
//             {
//                 if (!DateTime.TryParse(englishDate, out DateTime entryDateTime))
//                 {
//                     _logger.LogWarning("Invalid English date format: {EnglishDate}", englishDate);
//                     return false;
//                 }

//                 var startDate = fiscalYear.StartDate ?? DateTime.MinValue;
//                 var endDate = fiscalYear.EndDate ?? DateTime.MaxValue;

//                 bool isValid = entryDateTime >= startDate && entryDateTime <= endDate;

//                 if (!isValid)
//                 {
//                     _logger.LogWarning("English date {EnglishDate} is outside fiscal year range {StartDate} to {EndDate}",
//                         englishDate, startDate.ToString("yyyy-MM-dd"), endDate.ToString("yyyy-MM-dd"));
//                 }

//                 return isValid;
//             }
//             catch (Exception ex)
//             {
//                 _logger.LogError(ex, "Error validating English date {EnglishDate}", englishDate);
//                 return false;
//             }
//         }

//         private long ConvertNepaliDateToNumeric(string nepaliDate)
//         {
//             // Parse Nepali date format: "YYYY-MM-DD" or "YYYY/MM/DD"
//             var parts = nepaliDate.Split(new char[] { '-', '/' });
//             if (parts.Length == 3)
//             {
//                 int year = int.Parse(parts[0]);
//                 int month = int.Parse(parts[1]);
//                 int day = int.Parse(parts[2]);

//                 // Convert to YYYYMMDD numeric value for easy comparison
//                 return year * 10000 + month * 100 + day;
//             }

//             throw new ArgumentException($"Invalid Nepali date format: {nepaliDate}");
//         }

//         private string GetFiscalYearRangeDisplay(FiscalYear fiscalYear)
//         {
//             if (fiscalYear.DateFormat == DateFormatEnum.Nepali)
//             {
//                 return $"{fiscalYear.StartDateNepali} to {fiscalYear.EndDateNepali} (Nepali BS)";
//             }
//             else
//             {
//                 string startDate = fiscalYear.StartDate?.ToString("yyyy-MM-dd") ?? "N/A";
//                 string endDate = fiscalYear.EndDate?.ToString("yyyy-MM-dd") ?? "N/A";
//                 return $"{startDate} to {endDate} (English AD)";
//             }
//         }

//         private bool ShouldSkipMiddleware(HttpContext context)
//         {
//             var path = context.Request.Path.Value?.ToLower() ?? "";

//             // Skip for non-transaction endpoints, auth, company selection, etc.
//             return !IsTransactionRequest(context) ||
//                    path.Contains("/api/auth") ||
//                    path.Contains("/api/company") ||
//                    path.Contains("/api/fiscal-year") ||
//                    path.Contains("/api/fiscalyears") ||
//                    path.Contains("/api/subscription") ||
//                    path.Contains("/swagger") ||
//                    path.StartsWith("/health") ||
//                    path.Contains("/api/companies/switch") ||
//                    path.Contains("/api/fiscalyears/switch-fiscal-year");
//         }

//         private bool IsTransactionRequest(HttpContext context)
//         {
//             var path = context.Request.Path.Value?.ToLower() ?? "";
//             var method = context.Request.Method;

//             // Only validate POST and PUT requests
//             if (method != HttpMethods.Post && method != HttpMethods.Put)
//             {
//                 return false;
//             }

//             // Transaction endpoints
//             string[] transactionEndpoints = {
//                 "/api/retailer/purchase",
//                 "/api/retailer/credit-sales",
//                 "/api/retailer/cash-sales",
//                 "/api/retailer/sales-return",
//                 "/api/retailer/purchase-return",
//                 "/api/retailer/payments",
//                 "/api/retailer/receipts",
//                 "/api/retailer/journal",
//                 "/api/retailer/debit-note",
//                 "/api/retailer/credit-note",
//                 "/api/accounts",
//                 "/api/transactions",
//                 "/api/invoices"
//             };

//             foreach (var endpoint in transactionEndpoints)
//             {
//                 if (path.StartsWith(endpoint) || path == endpoint)
//                 {
//                     return true;
//                 }
//             }

//             return false;
//         }
//     }
// }

//----------------------------------------------------------------end2

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
                "/api/retailer/purchase-return",
                "/api/retailer/payments",
                "/api/retailer/receipts",
                "/api/retailer/journal",
                "/api/retailer/debit-note",
                "/api/retailer/credit-note",
                "/api/accounts",
                "/api/transactions",
                "/api/invoices"
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