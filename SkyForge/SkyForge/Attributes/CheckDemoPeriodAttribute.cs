
// using Microsoft.AspNetCore.Mvc.Filters;
// using Microsoft.AspNetCore.Mvc;
// using SkyForge.Data;
// using SkyForge.Models.Shared;
// using System.Text.Json;

// namespace SkyForge.Attributes
// {
//     public class CheckDemoPeriodAttribute : Attribute, IAsyncActionFilter
//     {
//         public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
//         {
//             var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<CheckDemoPeriodAttribute>>();
//             var dbContext = context.HttpContext.RequestServices.GetRequiredService<ApplicationDbContext>();

//             try
//             {
//                 // Get company ID from claims
//                 var companyIdClaim = context.HttpContext.User.FindFirst("currentCompany")?.Value;
//                 if (string.IsNullOrEmpty(companyIdClaim) || !Guid.TryParse(companyIdClaim, out Guid companyId))
//                 {
//                     logger.LogWarning("No company selected");
//                     await next();
//                     return;
//                 }

//                 // Get the company
//                 var company = await dbContext.Companies.FindAsync(companyId);
//                 if (company == null)
//                 {
//                     logger.LogWarning("Company not found: {CompanyId}", companyId);
//                     await next();
//                     return;
//                 }

//                 logger.LogInformation("Checking demo period for company: {CompanyName}, DateFormat: {DateFormat}, RenewalDate: '{RenewalDate}', CreatedAt: {CreatedAt}",
//                     company.Name, company.DateFormat, company.RenewalDate ?? "NULL", company.CreatedAt);

//                 // Read the request body
//                 context.HttpContext.Request.EnableBuffering();
//                 string requestBody;
//                 using (var reader = new StreamReader(context.HttpContext.Request.Body, leaveOpen: true))
//                 {
//                     requestBody = await reader.ReadToEndAsync();
//                     context.HttpContext.Request.Body.Position = 0;
//                 }

//                 if (string.IsNullOrEmpty(requestBody))
//                 {
//                     logger.LogInformation("No request body to validate");
//                     await next();
//                     return;
//                 }

//                 // Parse the request body
//                 using var jsonDocument = JsonDocument.Parse(requestBody);
//                 var root = jsonDocument.RootElement;

//                 // Check if company is in demo period (no renewal date)
//                 if (string.IsNullOrEmpty(company.RenewalDate))
//                 {
//                     logger.LogInformation("Company is in demo period");

//                     // Calculate one month after company creation
//                     var oneMonthLater = company.CreatedAt.AddMonths(1);
//                     logger.LogInformation("One month later: {OneMonthLater}", oneMonthLater);

//                     if (company.DateFormat == DateFormatEnum.Nepali)
//                     {
//                         // Get Nepali date
//                         string nepaliDate = null;
//                         if (root.TryGetProperty("nepaliDate", out var nepaliDateElement))
//                         {
//                             nepaliDate = nepaliDateElement.GetString();
//                         }
//                         else if (root.TryGetProperty("transactionDateNepali", out var transNepaliElement))
//                         {
//                             nepaliDate = transNepaliElement.GetString();
//                         }

//                         logger.LogInformation("Nepali date from request: {NepaliDate}", nepaliDate);

//                         if (!string.IsNullOrEmpty(nepaliDate))
//                         {
//                             // Parse Nepali date to Gregorian for comparison
//                             var parts = nepaliDate.Split('-');
//                             if (parts.Length == 3 &&
//                                 int.TryParse(parts[0], out int nepaliYear) &&
//                                 int.TryParse(parts[1], out int nepaliMonth) &&
//                                 int.TryParse(parts[2], out int nepaliDay))
//                             {
//                                 // Convert Nepali to Gregorian (approximate)
//                                 int gregorianYear = nepaliYear - 57;

//                                 try
//                                 {
//                                     var nepaliDateTime = new DateTime(gregorianYear, nepaliMonth, nepaliDay);
//                                     logger.LogInformation("Converted Nepali date to Gregorian: {NepaliDateTime}", nepaliDateTime);

//                                     if (nepaliDateTime > oneMonthLater)
//                                     {
//                                         logger.LogWarning("DEMO PERIOD EXPIRED: Nepali date {NepaliDate} (converted to {NepaliDateTime}) is after {OneMonthLater}",
//                                             nepaliDate, nepaliDateTime, oneMonthLater);

//                                         context.Result = new ObjectResult(new
//                                         {
//                                             success = false,
//                                             error = "Demo period has expired. Please upgrade to the full version.",
//                                             type = "demo_expired",
//                                             redirectUrl = "/subscription/upgrade"
//                                         })
//                                         {
//                                             StatusCode = 403
//                                         };
//                                         return;
//                                     }
//                                 }
//                                 catch (ArgumentOutOfRangeException ex)
//                                 {
//                                     logger.LogError(ex, "Invalid date conversion for Nepali date: {NepaliDate}", nepaliDate);
//                                 }
//                             }
//                         }
//                     }
//                     else // English format
//                     {
//                         // Get English date
//                         DateTime? englishDate = null;
//                         if (root.TryGetProperty("transactionDate", out var transDateElement))
//                         {
//                             if (DateTime.TryParse(transDateElement.GetString(), out DateTime parsedDate))
//                             {
//                                 englishDate = parsedDate;
//                             }
//                         }
//                         else if (root.TryGetProperty("date", out var dateElement))
//                         {
//                             if (DateTime.TryParse(dateElement.GetString(), out DateTime parsedDate))
//                             {
//                                 englishDate = parsedDate;
//                             }
//                         }

//                         logger.LogInformation("English date from request: {EnglishDate}", englishDate);

//                         if (englishDate.HasValue && englishDate.Value > oneMonthLater)
//                         {
//                             logger.LogWarning("DEMO PERIOD EXPIRED: English date {EnglishDate} is after {OneMonthLater}",
//                                 englishDate.Value, oneMonthLater);

//                             context.Result = new ObjectResult(new
//                             {
//                                 success = false,
//                                 error = "Demo period has expired. Please upgrade to the full version.",
//                                 type = "demo_expired",
//                                 redirectUrl = "/subscription/upgrade"
//                             })
//                             {
//                                 StatusCode = 403
//                             };
//                             return;
//                         }
//                     }
//                 }
//                 else // Has renewal date
//                 {
//                     logger.LogInformation("Company has renewal date: {RenewalDate}", company.RenewalDate);

//                     if (company.DateFormat == DateFormatEnum.Nepali)
//                     {
//                         // Get Nepali date
//                         string nepaliDate = null;
//                         if (root.TryGetProperty("nepaliDate", out var nepaliDateElement))
//                         {
//                             nepaliDate = nepaliDateElement.GetString();
//                         }
//                         else if (root.TryGetProperty("transactionDateNepali", out var transNepaliElement))
//                         {
//                             nepaliDate = transNepaliElement.GetString();
//                         }

//                         logger.LogInformation("Nepali date from request: {NepaliDate}", nepaliDate);

//                         if (!string.IsNullOrEmpty(nepaliDate) && string.Compare(nepaliDate, company.RenewalDate) > 0)
//                         {
//                             logger.LogWarning("RENEWAL EXPIRED: Nepali date {NepaliDate} is after renewal date {RenewalDate}",
//                                 nepaliDate, company.RenewalDate);

//                             context.Result = new ObjectResult(new
//                             {
//                                 success = false,
//                                 error = "Renewal period has expired. Please renew to continue making entries.",
//                                 type = "renewal_expired",
//                                 redirectUrl = "/subscription/renew"
//                             })
//                             {
//                                 StatusCode = 403
//                             };
//                             return;
//                         }
//                     }
//                     else // English format
//                     {
//                         // Get English date
//                         DateTime? englishDate = null;
//                         if (root.TryGetProperty("transactionDate", out var transDateElement))
//                         {
//                             if (DateTime.TryParse(transDateElement.GetString(), out DateTime parsedDate))
//                             {
//                                 englishDate = parsedDate;
//                             }
//                         }
//                         else if (root.TryGetProperty("date", out var dateElement))
//                         {
//                             if (DateTime.TryParse(dateElement.GetString(), out DateTime parsedDate))
//                             {
//                                 englishDate = parsedDate;
//                             }
//                         }

//                         logger.LogInformation("English date from request: {EnglishDate}", englishDate);

//                         if (englishDate.HasValue && DateTime.TryParse(company.RenewalDate, out DateTime renewalDateTime))
//                         {
//                             if (englishDate.Value > renewalDateTime)
//                             {
//                                 logger.LogWarning("RENEWAL EXPIRED: English date {EnglishDate} is after renewal date {RenewalDateTime}",
//                                     englishDate.Value, renewalDateTime);

//                                 context.Result = new ObjectResult(new
//                                 {
//                                     success = false,
//                                     error = "Renewal period has expired. Please renew to continue making entries.",
//                                     type = "renewal_expired",
//                                     redirectUrl = "/subscription/renew"
//                                 })
//                                 {
//                                     StatusCode = 403
//                                 };
//                                 return;
//                             }
//                         }
//                     }
//                 }

//                 // If validation passes, continue
//                 await next();
//             }
//             catch (Exception ex)
//             {
//                 logger.LogError(ex, "Error in demo period validation");
//                 await next();
//             }
//         }
//     }
// }