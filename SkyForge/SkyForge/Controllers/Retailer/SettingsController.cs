

// using Microsoft.AspNetCore.Authorization;
// using Microsoft.AspNetCore.Mvc;
// using SkyForge.Data;
// using SkyForge.Dto.RetailerDto;
// using SkyForge.Models.CompanyModel;
// using SkyForge.Models.Retailer.SettingsModel;
// using SkyForge.Services.Retailer.SettingsServices;
// using System;
// using System.Security.Claims;
// using System.Threading.Tasks;

// namespace SkyForge.Controllers.Retailer
// {
//     [ApiController]
//     [Route("api/retailer")]
//     [Authorize]
//     public class SettingsController : ControllerBase
//     {
//         private readonly ApplicationDbContext _context;
//         private readonly ILogger<SettingsController> _logger;
//         private readonly ISettingsService _settingsService;

//         public SettingsController(
//             ApplicationDbContext context,
//             ILogger<SettingsController> logger,
//             ISettingsService settingsService)
//         {
//             _context = context;
//             _logger = logger;
//             _settingsService = settingsService;
//         }

//         [HttpGet("roundoff-sales")]
//         public async Task<IActionResult> GetRoundOffSalesSettings()
//         {
//             try
//             {
//                 _logger.LogInformation("=== GetRoundOffSalesSettings Started ===");

//                 // Extract claims from JWT token
//                 var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
//                 var companyId = User.FindFirst("currentCompany")?.Value;
//                 var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
//                 var tradeTypeClaim = User.FindFirst("tradeType")?.Value;
//                 var currentCompanyName = User.FindFirst("currentCompanyName")?.Value;

//                 // Validate user ID
//                 if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
//                 {
//                     return Unauthorized(new
//                     {
//                         success = false,
//                         error = "Invalid user token. Please login again."
//                     });
//                 }

//                 // Validate company ID
//                 if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
//                 {
//                     return BadRequest(new
//                     {
//                         success = false,
//                         error = "No company selected. Please select a company first."
//                     });
//                 }

//                 // Validate trade type
//                 if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
//                 {
//                     return StatusCode(403, new
//                     {
//                         success = false,
//                         error = "Access forbidden for this trade type"
//                     });
//                 }

//                 // Handle fiscal year - get from claims first, then fallback to active fiscal year
//                 Guid fiscalYearIdGuid;
//                 if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
//                 {
//                     // If not in claims, get active fiscal year for the company
//                     var activeFiscalYear = await _context.FiscalYears
//                         .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

//                     if (activeFiscalYear == null)
//                     {
//                         // Try to get any fiscal year as fallback
//                         activeFiscalYear = await _context.FiscalYears
//                             .Where(f => f.CompanyId == companyIdGuid)
//                             .OrderByDescending(f => f.StartDate)
//                             .FirstOrDefaultAsync();

//                         if (activeFiscalYear == null)
//                         {
//                             return BadRequest(new
//                             {
//                                 success = false,
//                                 error = "No fiscal year found for this company. Please select a fiscal year first."
//                             });
//                         }
//                     }
//                     fiscalYearIdGuid = activeFiscalYear.Id;

//                     _logger.LogInformation($"Using active fiscal year: {fiscalYearIdGuid}");
//                 }

//                 // Get settings using the service
//                 var settingsData = await _settingsService.GetRoundOffSalesSettingsAsync(companyIdGuid, fiscalYearIdGuid, userIdGuid);

//                 // Return JSON response matching Node.js structure
//                 return Ok(new
//                 {
//                     success = true,
//                     data = settingsData
//                 });
//             }
//             catch (Exception ex)
//             {
//                 _logger.LogError(ex, "Error fetching settings");
//                 return StatusCode(500, new
//                 {
//                     success = false,
//                     error = "Error fetching settings",
//                     details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
//                 });
//             }
//         }

//         // POST: api/Settings/roundoff-sales
//         // [HttpPost("roundoff-sales")]
//         // public async Task<IActionResult> UpdateRoundOffSalesSettings([FromBody] UpdateRoundOffSalesRequest request)
//         // {
//         //     try
//         //     {
//         //         _logger.LogInformation("=== UpdateRoundOffSalesSettings Started ===");

//         //         // Extract claims from JWT token
//         //         var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
//         //         var companyId = User.FindFirst("currentCompany")?.Value;
//         //         var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
//         //         var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

//         //         // Validate user ID
//         //         if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
//         //         {
//         //             return Unauthorized(new
//         //             {
//         //                 success = false,
//         //                 error = "Invalid user token. Please login again."
//         //             });
//         //         }

//         //         // Validate company ID
//         //         if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
//         //         {
//         //             return BadRequest(new
//         //             {
//         //                 success = false,
//         //                 error = "No company selected. Please select a company first."
//         //             });
//         //         }

//         //         // Validate trade type
//         //         if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
//         //         {
//         //             return StatusCode(403, new
//         //             {
//         //                 success = false,
//         //                 error = "Access forbidden for this trade type"
//         //             });
//         //         }

//         //         // Convert roundOffSales to boolean (handle various input types)
//         //         bool roundOffBoolean = false;

//         //         // Check if RoundOffSales is not null
//         //         if (request.RoundOffSales != null)
//         //         {
//         //             // Handle different types
//         //             if (request.RoundOffSales is bool boolValue)
//         //             {
//         //                 roundOffBoolean = boolValue;
//         //             }
//         //             else if (request.RoundOffSales is string stringValue)
//         //             {
//         //                 roundOffBoolean = stringValue.Equals("true", StringComparison.OrdinalIgnoreCase) ||
//         //                                  stringValue.Equals("on", StringComparison.OrdinalIgnoreCase);
//         //             }
//         //             else if (request.RoundOffSales is int intValue)
//         //             {
//         //                 roundOffBoolean = intValue == 1;
//         //             }
//         //             else
//         //             {
//         //                 // Try to convert using Convert.ToBoolean as fallback
//         //                 try
//         //                 {
//         //                     roundOffBoolean = Convert.ToBoolean(request.RoundOffSales);
//         //                 }
//         //                 catch
//         //                 {
//         //                     roundOffBoolean = false;
//         //                 }
//         //             }
//         //         }

//         //         _logger.LogInformation($"RoundOffSales value converted: {request.RoundOffSales} -> {roundOffBoolean}");

//         //         // Handle fiscal year - get from claims first, then fallback to active fiscal year
//         //         Guid fiscalYearIdGuid;
//         //         if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
//         //         {
//         //             // If not in claims, get active fiscal year for the company
//         //             var activeFiscalYear = await _context.FiscalYears
//         //                 .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

//         //             if (activeFiscalYear == null)
//         //             {
//         //                 // Try to get any fiscal year as fallback
//         //                 activeFiscalYear = await _context.FiscalYears
//         //                     .Where(f => f.CompanyId == companyIdGuid)
//         //                     .OrderByDescending(f => f.StartDate)
//         //                     .FirstOrDefaultAsync();

//         //                 if (activeFiscalYear == null)
//         //                 {
//         //                     return BadRequest(new
//         //                     {
//         //                         success = false,
//         //                         error = "No fiscal year found for this company. Please select a fiscal year first."
//         //                     });
//         //                 }
//         //             }
//         //             fiscalYearIdGuid = activeFiscalYear.Id;

//         //             _logger.LogInformation($"Using active fiscal year: {fiscalYearIdGuid}");
//         //         }

//         //         // Update settings using the service
//         //         var updatedSettings = await _settingsService.UpdateRoundOffSalesSettingsAsync(
//         //             companyIdGuid,
//         //             fiscalYearIdGuid,
//         //             userIdGuid,
//         //             roundOffBoolean);

//         //         // Return JSON response matching Node.js structure
//         //         return Ok(new
//         //         {
//         //             success = true,
//         //             message = "Settings updated successfully",
//         //             data = new
//         //             {
//         //                 roundOffSales = updatedSettings.RoundOffSales
//         //             }
//         //         });
//         //     }
//         //     catch (Exception ex)
//         //     {
//         //         _logger.LogError(ex, "Error updating settings");
//         //         return StatusCode(500, new
//         //         {
//         //             success = false,
//         //             error = "Server Error",
//         //             details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
//         //         });
//         //     }
//         // }

//         // Change this in your SettingsController
//         [HttpPost("roundoff-sales")]
//         public async Task<IActionResult> UpdateRoundOffSalesSettings([FromBody] UpdateRoundOffSalesRequestDTO request)
//         {
//             try
//             {
//                 _logger.LogInformation("=== CONTROLLER: UpdateRoundOffSalesSettings START ===");

//                 // Log the request
//                 _logger.LogInformation($"RoundOffSales value: {request.RoundOffSales}");
//                 _logger.LogInformation($"RoundOffSales type: {request.RoundOffSales.GetType().Name}");

//                 // Extract claims
//                 var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
//                 var companyId = User.FindFirst("currentCompany")?.Value;
//                 var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
//                 var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

//                 // Validate user ID
//                 if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
//                 {
//                     return Unauthorized(new { success = false, error = "Invalid user token" });
//                 }

//                 // Validate company ID
//                 if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
//                 {
//                     return BadRequest(new { success = false, error = "No company selected" });
//                 }

//                 // Validate trade type
//                 if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
//                 {
//                     return StatusCode(403, new { success = false, error = "Access forbidden" });
//                 }

//                 // Use the boolean directly - no conversion needed!
//                 bool roundOffBoolean = request.RoundOffSales;
//                 _logger.LogInformation($"Using value: {roundOffBoolean}");

//                 // Handle fiscal year
//                 Guid fiscalYearIdGuid;
//                 if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
//                 {
//                     var activeFiscalYear = await _context.FiscalYears
//                         .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

//                     if (activeFiscalYear == null)
//                     {
//                         return BadRequest(new { success = false, error = "No active fiscal year found" });
//                     }
//                     fiscalYearIdGuid = activeFiscalYear.Id;
//                     _logger.LogInformation($"Using active fiscal year from DB: {fiscalYearIdGuid}");
//                 }

//                 // Call service with the boolean value
//                 var updatedSettings = await _settingsService.UpdateRoundOffSalesSettingsAsync(
//                     companyIdGuid, fiscalYearIdGuid, userIdGuid, roundOffBoolean);

//                 return Ok(new
//                 {
//                     success = true,
//                     message = "Settings updated successfully",
//                     data = new
//                     {
//                         roundOffSales = updatedSettings.RoundOffSales,
//                         fiscalYearId = fiscalYearIdGuid
//                     }
//                 });
//             }
//             catch (Exception ex)
//             {
//                 _logger.LogError(ex, "Error updating settings");
//                 return StatusCode(500, new
//                 {
//                     success = false,
//                     error = "Server Error",
//                     details = ex.Message
//                 });
//             }
//         }

//         // GET: api/Settings/roundoff-sales-return
//         [HttpGet("roundoff-sales-return")]
//         public async Task<IActionResult> GetRoundOffSalesReturnSettings()
//         {
//             try
//             {
//                 _logger.LogInformation("=== GetRoundOffSalesReturnSettings Started ===");

//                 // Extract claims from JWT token
//                 var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
//                 var companyId = User.FindFirst("currentCompany")?.Value;
//                 var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
//                 var tradeTypeClaim = User.FindFirst("tradeType")?.Value;
//                 var currentCompanyName = User.FindFirst("currentCompanyName")?.Value;

//                 // Validate user ID
//                 if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
//                 {
//                     return Unauthorized(new
//                     {
//                         success = false,
//                         error = "Invalid user token. Please login again."
//                     });
//                 }

//                 // Validate company ID
//                 if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
//                 {
//                     return BadRequest(new
//                     {
//                         success = false,
//                         error = "No company selected. Please select a company first."
//                     });
//                 }

//                 // Validate trade type
//                 if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
//                 {
//                     return StatusCode(403, new
//                     {
//                         success = false,
//                         error = "Access forbidden for this trade type"
//                     });
//                 }

//                 // Handle fiscal year - get from claims first, then fallback to active fiscal year
//                 Guid fiscalYearIdGuid;
//                 if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
//                 {
//                     // If not in claims, get active fiscal year for the company
//                     var activeFiscalYear = await _context.FiscalYears
//                         .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

//                     if (activeFiscalYear == null)
//                     {
//                         // Try to get any fiscal year as fallback
//                         activeFiscalYear = await _context.FiscalYears
//                             .Where(f => f.CompanyId == companyIdGuid)
//                             .OrderByDescending(f => f.StartDate)
//                             .FirstOrDefaultAsync();

//                         if (activeFiscalYear == null)
//                         {
//                             return BadRequest(new
//                             {
//                                 success = false,
//                                 error = "No fiscal year found for this company. Please select a fiscal year first."
//                             });
//                         }
//                     }
//                     fiscalYearIdGuid = activeFiscalYear.Id;

//                     _logger.LogInformation($"Using active fiscal year: {fiscalYearIdGuid}");
//                 }

//                 // Get settings using the service
//                 var settingsData = await _settingsService.GetRoundOffSalesReturnSettingsAsync(companyIdGuid, fiscalYearIdGuid, userIdGuid);

//                 // Return JSON response matching Node.js structure
//                 return Ok(new
//                 {
//                     success = true,
//                     data = settingsData
//                 });
//             }
//             catch (Exception ex)
//             {
//                 _logger.LogError(ex, "Error fetching sales return settings");
//                 return StatusCode(500, new
//                 {
//                     success = false,
//                     error = "Error fetching settings",
//                     details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
//                 });
//             }
//         }

//         // POST: api/Settings/roundoff-sales-return
//         [HttpPost("roundoff-sales-return")]
//         public async Task<IActionResult> UpdateRoundOffSalesReturnSettings([FromBody] UpdateRoundOffSalesReturnRequest request)
//         {
//             try
//             {
//                 _logger.LogInformation("=== UpdateRoundOffSalesReturnSettings Started ===");

//                 // Extract claims from JWT token
//                 var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
//                 var companyId = User.FindFirst("currentCompany")?.Value;
//                 var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
//                 var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

//                 // Validate user ID
//                 if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
//                 {
//                     return Unauthorized(new
//                     {
//                         success = false,
//                         error = "Invalid user token. Please login again."
//                     });
//                 }

//                 // Validate company ID
//                 if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
//                 {
//                     return BadRequest(new
//                     {
//                         success = false,
//                         error = "No company selected. Please select a company first."
//                     });
//                 }

//                 // Validate trade type
//                 if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
//                 {
//                     return StatusCode(403, new
//                     {
//                         success = false,
//                         error = "Access forbidden for this trade type"
//                     });
//                 }

//                 // Convert roundOffSalesReturn to boolean (handle various input types)
//                 bool roundOffBoolean = false;

//                 // Check if RoundOffSalesReturn is not null
//                 if (request.RoundOffSalesReturn != null)
//                 {
//                     // Handle different types
//                     if (request.RoundOffSalesReturn is bool boolValue)
//                     {
//                         roundOffBoolean = boolValue;
//                     }
//                     else if (request.RoundOffSalesReturn is string stringValue)
//                     {
//                         roundOffBoolean = stringValue.Equals("true", StringComparison.OrdinalIgnoreCase) ||
//                                          stringValue.Equals("on", StringComparison.OrdinalIgnoreCase);
//                     }
//                     else if (request.RoundOffSalesReturn is int intValue)
//                     {
//                         roundOffBoolean = intValue == 1;
//                     }
//                     else
//                     {
//                         // Try to convert using Convert.ToBoolean as fallback
//                         try
//                         {
//                             roundOffBoolean = Convert.ToBoolean(request.RoundOffSalesReturn);
//                         }
//                         catch
//                         {
//                             roundOffBoolean = false;
//                         }
//                     }
//                 }

//                 _logger.LogInformation($"RoundOffSalesReturn value converted: {request.RoundOffSalesReturn} -> {roundOffBoolean}");

//                 // Handle fiscal year - get from claims first, then fallback to active fiscal year
//                 Guid fiscalYearIdGuid;
//                 if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
//                 {
//                     // If not in claims, get active fiscal year for the company
//                     var activeFiscalYear = await _context.FiscalYears
//                         .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

//                     if (activeFiscalYear == null)
//                     {
//                         // Try to get any fiscal year as fallback
//                         activeFiscalYear = await _context.FiscalYears
//                             .Where(f => f.CompanyId == companyIdGuid)
//                             .OrderByDescending(f => f.StartDate)
//                             .FirstOrDefaultAsync();

//                         if (activeFiscalYear == null)
//                         {
//                             return BadRequest(new
//                             {
//                                 success = false,
//                                 error = "No fiscal year found for this company. Please select a fiscal year first."
//                             });
//                         }
//                     }
//                     fiscalYearIdGuid = activeFiscalYear.Id;

//                     _logger.LogInformation($"Using active fiscal year: {fiscalYearIdGuid}");
//                 }

//                 // Update settings using the service
//                 var updatedSettings = await _settingsService.UpdateRoundOffSalesReturnSettingsAsync(
//                     companyIdGuid,
//                     fiscalYearIdGuid,
//                     userIdGuid,
//                     roundOffBoolean);

//                 // Return JSON response matching Node.js structure
//                 return Ok(new
//                 {
//                     success = true,
//                     message = "Settings updated successfully",
//                     data = new
//                     {
//                         roundOffSalesReturn = updatedSettings.RoundOffSalesReturn
//                     }
//                 });
//             }
//             catch (Exception ex)
//             {
//                 _logger.LogError(ex, "Error updating sales return settings");
//                 return StatusCode(500, new
//                 {
//                     success = false,
//                     error = "Server Error",
//                     details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
//                 });
//             }
//         }

//         // GET: api/Settings/roundoff-purchase
//         [HttpGet("roundoff-purchase")]
//         public async Task<IActionResult> GetRoundOffPurchaseSettings()
//         {
//             try
//             {
//                 _logger.LogInformation("=== GetRoundOffPurchaseSettings Started ===");

//                 // Extract claims from JWT token
//                 var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
//                 var companyId = User.FindFirst("currentCompany")?.Value;
//                 var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
//                 var tradeTypeClaim = User.FindFirst("tradeType")?.Value;
//                 var currentCompanyName = User.FindFirst("currentCompanyName")?.Value;

//                 // Validate user ID
//                 if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
//                 {
//                     return Unauthorized(new
//                     {
//                         success = false,
//                         error = "Invalid user token. Please login again."
//                     });
//                 }

//                 // Validate company ID
//                 if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
//                 {
//                     return BadRequest(new
//                     {
//                         success = false,
//                         error = "No company selected. Please select a company first."
//                     });
//                 }

//                 // Validate trade type
//                 if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
//                 {
//                     return StatusCode(403, new
//                     {
//                         success = false,
//                         error = "Access forbidden for this trade type"
//                     });
//                 }

//                 // Handle fiscal year - get from claims first, then fallback to active fiscal year
//                 Guid fiscalYearIdGuid;
//                 if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
//                 {
//                     // If not in claims, get active fiscal year for the company
//                     var activeFiscalYear = await _context.FiscalYears
//                         .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

//                     if (activeFiscalYear == null)
//                     {
//                         // Try to get any fiscal year as fallback
//                         activeFiscalYear = await _context.FiscalYears
//                             .Where(f => f.CompanyId == companyIdGuid)
//                             .OrderByDescending(f => f.StartDate)
//                             .FirstOrDefaultAsync();

//                         if (activeFiscalYear == null)
//                         {
//                             return BadRequest(new
//                             {
//                                 success = false,
//                                 error = "No fiscal year found for this company. Please select a fiscal year first."
//                             });
//                         }
//                     }
//                     fiscalYearIdGuid = activeFiscalYear.Id;

//                     _logger.LogInformation($"Using active fiscal year: {fiscalYearIdGuid}");
//                 }

//                 // Get settings using the service
//                 var settingsData = await _settingsService.GetRoundOffPurchaseSettingsAsync(companyIdGuid, fiscalYearIdGuid, userIdGuid);

//                 // Return JSON response matching Node.js structure
//                 return Ok(new
//                 {
//                     success = true,
//                     data = settingsData
//                 });
//             }
//             catch (Exception ex)
//             {
//                 _logger.LogError(ex, "Error fetching purchase settings");
//                 return StatusCode(500, new
//                 {
//                     success = false,
//                     error = "Error fetching settings",
//                     details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
//                 });
//             }
//         }

//         // POST: api/Settings/roundoff-purchase
//         [HttpPost("roundoff-purchase")]
//         public async Task<IActionResult> UpdateRoundOffPurchaseSettings([FromBody] UpdateRoundOffPurchaseRequest request)
//         {
//             try
//             {
//                 _logger.LogInformation("=== UpdateRoundOffPurchaseSettings Started ===");

//                 // Extract claims from JWT token
//                 var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
//                 var companyId = User.FindFirst("currentCompany")?.Value;
//                 var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
//                 var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

//                 // Validate user ID
//                 if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
//                 {
//                     return Unauthorized(new
//                     {
//                         success = false,
//                         error = "Invalid user token. Please login again."
//                     });
//                 }

//                 // Validate company ID
//                 if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
//                 {
//                     return BadRequest(new
//                     {
//                         success = false,
//                         error = "No company selected. Please select a company first."
//                     });
//                 }

//                 // Validate trade type
//                 if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
//                 {
//                     return StatusCode(403, new
//                     {
//                         success = false,
//                         error = "Access forbidden for this trade type"
//                     });
//                 }

//                 // Convert roundOffPurchase to boolean (handle various input types)
//                 bool roundOffBoolean = false;

//                 // Check if RoundOffPurchase is not null
//                 if (request.RoundOffPurchase != null)
//                 {
//                     // Handle different types
//                     if (request.RoundOffPurchase is bool boolValue)
//                     {
//                         roundOffBoolean = boolValue;
//                     }
//                     else if (request.RoundOffPurchase is string stringValue)
//                     {
//                         roundOffBoolean = stringValue.Equals("true", StringComparison.OrdinalIgnoreCase) ||
//                                          stringValue.Equals("on", StringComparison.OrdinalIgnoreCase);
//                     }
//                     else if (request.RoundOffPurchase is int intValue)
//                     {
//                         roundOffBoolean = intValue == 1;
//                     }
//                     else
//                     {
//                         // Try to convert using Convert.ToBoolean as fallback
//                         try
//                         {
//                             roundOffBoolean = Convert.ToBoolean(request.RoundOffPurchase);
//                         }
//                         catch
//                         {
//                             roundOffBoolean = false;
//                         }
//                     }
//                 }

//                 _logger.LogInformation($"RoundOffPurchase value converted: {request.RoundOffPurchase} -> {roundOffBoolean}");

//                 // Handle fiscal year - get from claims first, then fallback to active fiscal year
//                 Guid fiscalYearIdGuid;
//                 if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
//                 {
//                     // If not in claims, get active fiscal year for the company
//                     var activeFiscalYear = await _context.FiscalYears
//                         .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

//                     if (activeFiscalYear == null)
//                     {
//                         // Try to get any fiscal year as fallback
//                         activeFiscalYear = await _context.FiscalYears
//                             .Where(f => f.CompanyId == companyIdGuid)
//                             .OrderByDescending(f => f.StartDate)
//                             .FirstOrDefaultAsync();

//                         if (activeFiscalYear == null)
//                         {
//                             return BadRequest(new
//                             {
//                                 success = false,
//                                 error = "No fiscal year found for this company. Please select a fiscal year first."
//                             });
//                         }
//                     }
//                     fiscalYearIdGuid = activeFiscalYear.Id;

//                     _logger.LogInformation($"Using active fiscal year: {fiscalYearIdGuid}");
//                 }

//                 // Update settings using the service
//                 var updatedSettings = await _settingsService.UpdateRoundOffPurchaseSettingsAsync(
//                     companyIdGuid,
//                     fiscalYearIdGuid,
//                     userIdGuid,
//                     roundOffBoolean);

//                 // Return JSON response matching Node.js structure
//                 return Ok(new
//                 {
//                     success = true,
//                     message = "Settings updated successfully",
//                     data = new
//                     {
//                         roundOffPurchase = updatedSettings.RoundOffPurchase
//                     }
//                 });
//             }
//             catch (Exception ex)
//             {
//                 _logger.LogError(ex, "Error updating purchase settings");
//                 return StatusCode(500, new
//                 {
//                     success = false,
//                     error = "Server Error",
//                     details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
//                 });
//             }
//         }

//         // GET: api/Settings/roundoff-purchase-return
//         [HttpGet("roundoff-purchase-return")]
//         public async Task<IActionResult> GetRoundOffPurchaseReturnSettings()
//         {
//             try
//             {
//                 _logger.LogInformation("=== GetRoundOffPurchaseReturnSettings Started ===");

//                 // Extract claims from JWT token
//                 var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
//                 var companyId = User.FindFirst("currentCompany")?.Value;
//                 var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
//                 var tradeTypeClaim = User.FindFirst("tradeType")?.Value;
//                 var currentCompanyName = User.FindFirst("currentCompanyName")?.Value;

//                 // Validate user ID
//                 if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
//                 {
//                     return Unauthorized(new
//                     {
//                         success = false,
//                         error = "Invalid user token. Please login again."
//                     });
//                 }

//                 // Validate company ID
//                 if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
//                 {
//                     return BadRequest(new
//                     {
//                         success = false,
//                         error = "No company selected. Please select a company first."
//                     });
//                 }

//                 // Validate trade type
//                 if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
//                 {
//                     return StatusCode(403, new
//                     {
//                         success = false,
//                         error = "Access forbidden for this trade type"
//                     });
//                 }

//                 // Handle fiscal year - get from claims first, then fallback to active fiscal year
//                 Guid fiscalYearIdGuid;
//                 if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
//                 {
//                     // If not in claims, get active fiscal year for the company
//                     var activeFiscalYear = await _context.FiscalYears
//                         .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

//                     if (activeFiscalYear == null)
//                     {
//                         // Try to get any fiscal year as fallback
//                         activeFiscalYear = await _context.FiscalYears
//                             .Where(f => f.CompanyId == companyIdGuid)
//                             .OrderByDescending(f => f.StartDate)
//                             .FirstOrDefaultAsync();

//                         if (activeFiscalYear == null)
//                         {
//                             return BadRequest(new
//                             {
//                                 success = false,
//                                 error = "No fiscal year found for this company. Please select a fiscal year first."
//                             });
//                         }
//                     }
//                     fiscalYearIdGuid = activeFiscalYear.Id;

//                     _logger.LogInformation($"Using active fiscal year: {fiscalYearIdGuid}");
//                 }

//                 // Get settings using the service
//                 var settingsData = await _settingsService.GetRoundOffPurchaseReturnSettingsAsync(companyIdGuid, fiscalYearIdGuid, userIdGuid);

//                 // Return JSON response matching Node.js structure
//                 return Ok(new
//                 {
//                     success = true,
//                     data = settingsData
//                 });
//             }
//             catch (Exception ex)
//             {
//                 _logger.LogError(ex, "Error fetching purchase return settings");
//                 return StatusCode(500, new
//                 {
//                     success = false,
//                     error = "Error fetching settings",
//                     details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
//                 });
//             }
//         }

//         // POST: api/Settings/roundoff-purchase-return
//         [HttpPost("roundoff-purchase-return")]
//         public async Task<IActionResult> UpdateRoundOffPurchaseReturnSettings([FromBody] UpdateRoundOffPurchaseReturnRequest request)
//         {
//             try
//             {
//                 _logger.LogInformation("=== UpdateRoundOffPurchaseReturnSettings Started ===");

//                 // Extract claims from JWT token
//                 var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
//                 var companyId = User.FindFirst("currentCompany")?.Value;
//                 var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
//                 var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

//                 // Validate user ID
//                 if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
//                 {
//                     return Unauthorized(new
//                     {
//                         success = false,
//                         error = "Invalid user token. Please login again."
//                     });
//                 }

//                 // Validate company ID
//                 if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
//                 {
//                     return BadRequest(new
//                     {
//                         success = false,
//                         error = "No company selected. Please select a company first."
//                     });
//                 }

//                 // Validate trade type
//                 if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
//                 {
//                     return StatusCode(403, new
//                     {
//                         success = false,
//                         error = "Access forbidden for this trade type"
//                     });
//                 }

//                 // Convert roundOffPurchaseReturn to boolean (handle various input types)
//                 bool roundOffBoolean = false;

//                 // Check if RoundOffPurchaseReturn is not null
//                 if (request.RoundOffPurchaseReturn != null)
//                 {
//                     // Handle different types
//                     if (request.RoundOffPurchaseReturn is bool boolValue)
//                     {
//                         roundOffBoolean = boolValue;
//                     }
//                     else if (request.RoundOffPurchaseReturn is string stringValue)
//                     {
//                         roundOffBoolean = stringValue.Equals("true", StringComparison.OrdinalIgnoreCase) ||
//                                          stringValue.Equals("on", StringComparison.OrdinalIgnoreCase);
//                     }
//                     else if (request.RoundOffPurchaseReturn is int intValue)
//                     {
//                         roundOffBoolean = intValue == 1;
//                     }
//                     else
//                     {
//                         // Try to convert using Convert.ToBoolean as fallback
//                         try
//                         {
//                             roundOffBoolean = Convert.ToBoolean(request.RoundOffPurchaseReturn);
//                         }
//                         catch
//                         {
//                             roundOffBoolean = false;
//                         }
//                     }
//                 }

//                 _logger.LogInformation($"RoundOffPurchaseReturn value converted: {request.RoundOffPurchaseReturn} -> {roundOffBoolean}");

//                 // Handle fiscal year - get from claims first, then fallback to active fiscal year
//                 Guid fiscalYearIdGuid;
//                 if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
//                 {
//                     // If not in claims, get active fiscal year for the company
//                     var activeFiscalYear = await _context.FiscalYears
//                         .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

//                     if (activeFiscalYear == null)
//                     {
//                         // Try to get any fiscal year as fallback
//                         activeFiscalYear = await _context.FiscalYears
//                             .Where(f => f.CompanyId == companyIdGuid)
//                             .OrderByDescending(f => f.StartDate)
//                             .FirstOrDefaultAsync();

//                         if (activeFiscalYear == null)
//                         {
//                             return BadRequest(new
//                             {
//                                 success = false,
//                                 error = "No fiscal year found for this company. Please select a fiscal year first."
//                             });
//                         }
//                     }
//                     fiscalYearIdGuid = activeFiscalYear.Id;

//                     _logger.LogInformation($"Using active fiscal year: {fiscalYearIdGuid}");
//                 }

//                 // Update settings using the service
//                 var updatedSettings = await _settingsService.UpdateRoundOffPurchaseReturnSettingsAsync(
//                     companyIdGuid,
//                     fiscalYearIdGuid,
//                     userIdGuid,
//                     roundOffBoolean);

//                 // Prepare updated settings object for response
//                 var updatedSettingsObject = new
//                 {
//                     id = updatedSettings.Id,
//                     companyId = updatedSettings.CompanyId,
//                     userId = updatedSettings.UserId,
//                     fiscalYearId = updatedSettings.FiscalYearId,
//                     roundOffSales = updatedSettings.RoundOffSales,
//                     roundOffPurchase = updatedSettings.RoundOffPurchase,
//                     roundOffSalesReturn = updatedSettings.RoundOffSalesReturn,
//                     roundOffPurchaseReturn = updatedSettings.RoundOffPurchaseReturn,
//                     displayTransactions = updatedSettings.DisplayTransactions,
//                     displayTransactionsForPurchase = updatedSettings.DisplayTransactionsForPurchase,
//                     displayTransactionsForSalesReturn = updatedSettings.DisplayTransactionsForSalesReturn,
//                     displayTransactionsForPurchaseReturn = updatedSettings.DisplayTransactionsForPurchaseReturn,
//                     storeManagement = updatedSettings.StoreManagement,
//                     createdAt = updatedSettings.CreatedAt,
//                     updatedAt = updatedSettings.UpdatedAt
//                 };

//                 // Return JSON response matching Node.js structure
//                 return Ok(new
//                 {
//                     success = true,
//                     message = "Settings updated successfully",
//                     data = new
//                     {
//                         roundOffPurchaseReturn = updatedSettings.RoundOffPurchaseReturn,
//                         updatedSettings = updatedSettingsObject
//                     }
//                 });
//             }
//             catch (Exception ex)
//             {
//                 _logger.LogError(ex, "Error updating purchase return settings");
//                 return StatusCode(500, new
//                 {
//                     success = false,
//                     error = "Server Error",
//                     details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
//                 });
//             }
//         }

//         // Controllers/Retailer/SettingsController.cs - Add these new endpoints

//         // GET: api/Settings/get-display-sales-transactions
//         [HttpGet("get-display-sales-transactions")]
//         public async Task<IActionResult> GetDisplaySalesTransactions()
//         {
//             try
//             {
//                 _logger.LogInformation("=== GetDisplaySalesTransactions Started ===");

//                 // Extract claims from JWT token
//                 var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
//                 var companyId = User.FindFirst("currentCompany")?.Value;
//                 var tradeTypeClaim = User.FindFirst("tradeType")?.Value;
//                 var currentCompanyName = User.FindFirst("currentCompanyName")?.Value;

//                 // Validate user ID
//                 if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
//                 {
//                     return Unauthorized(new
//                     {
//                         success = false,
//                         error = "Invalid user token. Please login again."
//                     });
//                 }

//                 // Validate company ID
//                 if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
//                 {
//                     return BadRequest(new
//                     {
//                         success = false,
//                         error = "No company selected. Please select a company first."
//                     });
//                 }

//                 // Validate trade type
//                 if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
//                 {
//                     return StatusCode(403, new
//                     {
//                         success = false,
//                         error = "Access forbidden for this trade type"
//                     });
//                 }

//                 // Validate company and user
//                 if (companyIdGuid == Guid.Empty || userIdGuid == Guid.Empty)
//                 {
//                     return BadRequest(new
//                     {
//                         success = false,
//                         error = "Invalid company or user information."
//                     });
//                 }

//                 // Get settings using the service
//                 var settingsData = await _settingsService.GetDisplaySalesTransactionsAsync(companyIdGuid, userIdGuid);

//                 // Return JSON response matching Node.js structure
//                 return Ok(new
//                 {
//                     success = true,
//                     data = settingsData
//                 });
//             }
//             catch (Exception ex)
//             {
//                 _logger.LogError(ex, "Error fetching display transactions settings");
//                 return StatusCode(500, new
//                 {
//                     success = false,
//                     error = "Internal Server Error",
//                     details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
//                 });
//             }
//         }

//         // // POST: api/Settings/updateDisplayTransactionsForSales
//         // [HttpPost("updateDisplayTransactionsForSales")]
//         // public async Task<IActionResult> UpdateDisplayTransactionsForSales([FromBody] UpdateDisplayTransactionsRequest request)
//         // {
//         //     try
//         //     {
//         //         _logger.LogInformation("=== UpdateDisplayTransactionsForSales Started ===");

//         //         // Log the request body
//         //         _logger.LogInformation("Request Body: {@Request}", request);

//         //         // Extract claims from JWT token
//         //         var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
//         //         var companyId = User.FindFirst("currentCompany")?.Value;
//         //         var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
//         //         var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

//         //         // Validate user ID
//         //         if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
//         //         {
//         //             return Unauthorized(new
//         //             {
//         //                 success = false,
//         //                 error = "Invalid user token. Please login again."
//         //             });
//         //         }

//         //         // Validate company ID
//         //         if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
//         //         {
//         //             return BadRequest(new
//         //             {
//         //                 success = false,
//         //                 error = "No company selected. Please select a company first."
//         //             });
//         //         }

//         //         // Validate trade type
//         //         if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
//         //         {
//         //             return StatusCode(403, new
//         //             {
//         //                 success = false,
//         //                 error = "Access forbidden for this trade type"
//         //             });
//         //         }

//         //         // Validate company and user
//         //         if (companyIdGuid == Guid.Empty || userIdGuid == Guid.Empty)
//         //         {
//         //             return BadRequest(new
//         //             {
//         //                 success = false,
//         //                 error = "Company ID and User ID are required"
//         //             });
//         //         }

//         //         // Convert displayTransactions to boolean (handle various input types)
//         //         bool displayTransactionsBoolean = false;

//         //         // Check if DisplayTransactions is not null
//         //         if (request.DisplayTransactions != null)
//         //         {
//         //             // Handle different types
//         //             if (request.DisplayTransactions is bool boolValue)
//         //             {
//         //                 displayTransactionsBoolean = boolValue;
//         //             }
//         //             else if (request.DisplayTransactions is string stringValue)
//         //             {
//         //                 displayTransactionsBoolean = stringValue.Equals("true", StringComparison.OrdinalIgnoreCase) ||
//         //                                             stringValue.Equals("on", StringComparison.OrdinalIgnoreCase);
//         //             }
//         //             else if (request.DisplayTransactions is int intValue)
//         //             {
//         //                 displayTransactionsBoolean = intValue == 1;
//         //             }
//         //             else
//         //             {
//         //                 // Try to convert using Convert.ToBoolean as fallback
//         //                 try
//         //                 {
//         //                     displayTransactionsBoolean = Convert.ToBoolean(request.DisplayTransactions);
//         //                 }
//         //                 catch
//         //                 {
//         //                     displayTransactionsBoolean = false;
//         //                 }
//         //             }
//         //         }

//         //         _logger.LogInformation($"DisplayTransactions value converted: {request.DisplayTransactions} -> {displayTransactionsBoolean}");

//         //         // Handle fiscal year - get from claims first, then fallback to active fiscal year
//         //         Guid fiscalYearIdGuid;
//         //         if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
//         //         {
//         //             // If not in claims, get active fiscal year for the company
//         //             var activeFiscalYear = await _context.FiscalYears
//         //                 .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

//         //             if (activeFiscalYear == null)
//         //             {
//         //                 // Try to get any fiscal year as fallback
//         //                 activeFiscalYear = await _context.FiscalYears
//         //                     .Where(f => f.CompanyId == companyIdGuid)
//         //                     .OrderByDescending(f => f.StartDate)
//         //                     .FirstOrDefaultAsync();

//         //                 if (activeFiscalYear == null)
//         //                 {
//         //                     return BadRequest(new
//         //                     {
//         //                         success = false,
//         //                         error = "No fiscal year found for this company. Please select a fiscal year first."
//         //                     });
//         //                 }
//         //             }
//         //             fiscalYearIdGuid = activeFiscalYear.Id;

//         //             _logger.LogInformation($"Using active fiscal year: {fiscalYearIdGuid}");
//         //         }

//         //         // Update settings using the service
//         //         var updatedSettings = await _settingsService.UpdateDisplayTransactionsForSalesAsync(
//         //             companyIdGuid,
//         //             userIdGuid,
//         //             fiscalYearIdGuid,
//         //             displayTransactionsBoolean);

//         //         // Prepare updated settings object for response
//         //         var updatedSettingsObject = new
//         //         {
//         //             id = updatedSettings.Id,
//         //             companyId = updatedSettings.CompanyId,
//         //             userId = updatedSettings.UserId,
//         //             fiscalYearId = updatedSettings.FiscalYearId,
//         //             roundOffSales = updatedSettings.RoundOffSales,
//         //             roundOffPurchase = updatedSettings.RoundOffPurchase,
//         //             roundOffSalesReturn = updatedSettings.RoundOffSalesReturn,
//         //             roundOffPurchaseReturn = updatedSettings.RoundOffPurchaseReturn,
//         //             displayTransactions = updatedSettings.DisplayTransactions,
//         //             displayTransactionsForPurchase = updatedSettings.DisplayTransactionsForPurchase,
//         //             displayTransactionsForSalesReturn = updatedSettings.DisplayTransactionsForSalesReturn,
//         //             displayTransactionsForPurchaseReturn = updatedSettings.DisplayTransactionsForPurchaseReturn,
//         //             storeManagement = updatedSettings.StoreManagement,
//         //             createdAt = updatedSettings.CreatedAt,
//         //             updatedAt = updatedSettings.UpdatedAt
//         //         };

//         //         // Log the updated settings
//         //         _logger.LogInformation("Updated Settings: {@UpdatedSettings}", updatedSettingsObject);

//         //         // Return JSON response matching Node.js structure
//         //         return Ok(new
//         //         {
//         //             success = true,
//         //             message = "Settings updated successfully",
//         //             data = new
//         //             {
//         //                 displayTransactions = updatedSettings.DisplayTransactions,
//         //                 updatedSettings = updatedSettingsObject
//         //             }
//         //         });
//         //     }
//         //     catch (Exception ex)
//         //     {
//         //         _logger.LogError(ex, "Error updating display transactions settings");
//         //         return StatusCode(500, new
//         //         {
//         //             success = false,
//         //             error = "Internal Server Error",
//         //             details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
//         //         });
//         //     }
//         // }

//         [HttpPost("updateDisplayTransactionsForSales")]
//         public async Task<IActionResult> UpdateDisplayTransactionsForSales([FromBody] UpdateDisplayTransactionsRequest request)
//         {
//             try
//             {
//                 _logger.LogInformation("=== UpdateDisplayTransactionsForSales Started ===");
//                 _logger.LogInformation("Request Body: {@Request}", request);

//                 // Extract claims from JWT token
//                 var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
//                 var companyId = User.FindFirst("currentCompany")?.Value;
//                 var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
//                 var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

//                 _logger.LogInformation($"Claims - UserId: {userId}, CompanyId: {companyId}, FiscalYearIdClaim: {fiscalYearIdClaim}, TradeType: {tradeTypeClaim}");

//                 // Validate user ID
//                 if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
//                 {
//                     return Unauthorized(new { success = false, error = "Invalid user token. Please login again." });
//                 }

//                 // Validate company ID
//                 if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
//                 {
//                     return BadRequest(new { success = false, error = "No company selected. Please select a company first." });
//                 }

//                 // Validate trade type
//                 if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
//                 {
//                     return StatusCode(403, new { success = false, error = "Access forbidden for this trade type" });
//                 }

//                 // Convert displayTransactions to boolean
//                 bool displayTransactionsBoolean = false;
//                 if (request.DisplayTransactions != null)
//                 {
//                     if (request.DisplayTransactions is bool boolValue)
//                         displayTransactionsBoolean = boolValue;
//                     else if (request.DisplayTransactions is string stringValue)
//                         displayTransactionsBoolean = stringValue.Equals("true", StringComparison.OrdinalIgnoreCase) ||
//                                                     stringValue.Equals("on", StringComparison.OrdinalIgnoreCase);
//                     else if (request.DisplayTransactions is int intValue)
//                         displayTransactionsBoolean = intValue == 1;
//                     else
//                     {
//                         try { displayTransactionsBoolean = Convert.ToBoolean(request.DisplayTransactions); }
//                         catch { displayTransactionsBoolean = false; }
//                     }
//                 }

//                 _logger.LogInformation($"DisplayTransactions value converted: {request.DisplayTransactions} -> {displayTransactionsBoolean}");

//                 // CRITICAL: Ensure fiscal year ID is always provided
//                 Guid fiscalYearIdGuid;
//                 if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
//                 {
//                     _logger.LogWarning("No fiscal year in claims, fetching active fiscal year from database...");

//                     // Get active fiscal year from database
//                     var activeFiscalYear = await _context.FiscalYears
//                         .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

//                     if (activeFiscalYear == null)
//                     {
//                         activeFiscalYear = await _context.FiscalYears
//                             .Where(f => f.CompanyId == companyIdGuid)
//                             .OrderByDescending(f => f.StartDate)
//                             .FirstOrDefaultAsync();
//                     }

//                     if (activeFiscalYear == null)
//                     {
//                         return BadRequest(new { success = false, message = "No fiscal year found for this company." });
//                     }

//                     fiscalYearIdGuid = activeFiscalYear.Id;
//                     _logger.LogInformation($"Using fiscal year from database: {fiscalYearIdGuid}");
//                 }
//                 else
//                 {
//                     _logger.LogInformation($"Using fiscal year from claims: {fiscalYearIdGuid}");
//                 }

//                 // Update settings using the service
//                 var updatedSettings = await _settingsService.UpdateDisplayTransactionsForSalesAsync(
//                     companyIdGuid,
//                     userIdGuid,
//                     fiscalYearIdGuid,
//                     displayTransactionsBoolean);

//                 // Return response
//                 return Ok(new
//                 {
//                     success = true,
//                     message = "Settings updated successfully",
//                     data = new
//                     {
//                         displayTransactions = updatedSettings.DisplayTransactions,
//                         updatedSettings = new
//                         {
//                             id = updatedSettings.Id,
//                             fiscalYearId = updatedSettings.FiscalYearId,
//                             displayTransactions = updatedSettings.DisplayTransactions,
//                             updatedAt = updatedSettings.UpdatedAt
//                         }
//                     }
//                 });
//             }
//             catch (Exception ex)
//             {
//                 _logger.LogError(ex, "Error updating display transactions settings");
//                 return StatusCode(500, new
//                 {
//                     success = false,
//                     error = "Internal Server Error",
//                     details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
//                 });
//             }
//         }

//         // GET: api/Settings/get-display-sales-return-transactions
//         [HttpGet("get-display-sales-return-transactions")]
//         public async Task<IActionResult> GetDisplaySalesReturnTransactions()
//         {
//             try
//             {
//                 _logger.LogInformation("=== GetDisplaySalesReturnTransactions Started ===");

//                 // Extract claims from JWT token
//                 var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
//                 var companyId = User.FindFirst("currentCompany")?.Value;
//                 var tradeTypeClaim = User.FindFirst("tradeType")?.Value;
//                 var currentCompanyName = User.FindFirst("currentCompanyName")?.Value;

//                 // Validate user ID
//                 if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
//                 {
//                     return Unauthorized(new
//                     {
//                         success = false,
//                         error = "Invalid user token. Please login again."
//                     });
//                 }

//                 // Validate company ID
//                 if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
//                 {
//                     return BadRequest(new
//                     {
//                         success = false,
//                         error = "No company selected. Please select a company first."
//                     });
//                 }

//                 // Validate trade type
//                 if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
//                 {
//                     return StatusCode(403, new
//                     {
//                         success = false,
//                         error = "Access forbidden for this trade type"
//                     });
//                 }

//                 // Validate company and user
//                 if (companyIdGuid == Guid.Empty || userIdGuid == Guid.Empty)
//                 {
//                     return BadRequest(new
//                     {
//                         success = false,
//                         error = "Invalid company or user information."
//                     });
//                 }

//                 // Get settings using the service
//                 var settingsData = await _settingsService.GetDisplaySalesReturnTransactionsAsync(companyIdGuid, userIdGuid);

//                 // Return JSON response matching Node.js structure
//                 return Ok(new
//                 {
//                     success = true,
//                     data = settingsData
//                 });
//             }
//             catch (Exception ex)
//             {
//                 _logger.LogError(ex, "Error fetching display sales return transactions settings");
//                 return StatusCode(500, new
//                 {
//                     success = false,
//                     error = "Internal Server Error",
//                     details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
//                 });
//             }
//         }

//         // POST: api/Settings/updateDisplayTransactionsForSalesReturn
//         [HttpPost("updateDisplayTransactionsForSalesReturn")]
//         public async Task<IActionResult> UpdateDisplayTransactionsForSalesReturn([FromBody] UpdateDisplayTransactionsForSalesReturnRequest request)
//         {
//             try
//             {
//                 _logger.LogInformation("=== UpdateDisplayTransactionsForSalesReturn Started ===");

//                 // Extract claims from JWT token
//                 var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
//                 var companyId = User.FindFirst("currentCompany")?.Value;
//                 var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
//                 var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

//                 // Validate user ID
//                 if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
//                 {
//                     return Unauthorized(new
//                     {
//                         success = false,
//                         error = "Invalid user token. Please login again."
//                     });
//                 }

//                 // Validate company ID
//                 if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
//                 {
//                     return BadRequest(new
//                     {
//                         success = false,
//                         error = "No company selected. Please select a company first."
//                     });
//                 }

//                 // Validate trade type
//                 if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
//                 {
//                     return StatusCode(403, new
//                     {
//                         success = false,
//                         error = "Access forbidden for this trade type"
//                     });
//                 }

//                 // Validate input
//                 if (request.DisplayTransactionsForSalesReturn == null)
//                 {
//                     return BadRequest(new
//                     {
//                         success = false,
//                         message = "displayTransactionsForSalesReturn is required in request body"
//                     });
//                 }

//                 // Validate company and user
//                 if (companyIdGuid == Guid.Empty || userIdGuid == Guid.Empty)
//                 {
//                     return BadRequest(new
//                     {
//                         success = false,
//                         message = "Company ID and User ID are required"
//                     });
//                 }

//                 // Convert displayTransactionsForSalesReturn to boolean (handle various input types)
//                 bool displayTransactionsBoolean = false;

//                 // Check if DisplayTransactionsForSalesReturn is not null
//                 if (request.DisplayTransactionsForSalesReturn != null)
//                 {
//                     // Handle different types
//                     if (request.DisplayTransactionsForSalesReturn is bool boolValue)
//                     {
//                         displayTransactionsBoolean = boolValue;
//                     }
//                     else if (request.DisplayTransactionsForSalesReturn is string stringValue)
//                     {
//                         displayTransactionsBoolean = stringValue.Equals("true", StringComparison.OrdinalIgnoreCase) ||
//                                                     stringValue.Equals("on", StringComparison.OrdinalIgnoreCase);
//                     }
//                     else if (request.DisplayTransactionsForSalesReturn is int intValue)
//                     {
//                         displayTransactionsBoolean = intValue == 1;
//                     }
//                     else
//                     {
//                         // Try to convert using Convert.ToBoolean as fallback
//                         try
//                         {
//                             displayTransactionsBoolean = Convert.ToBoolean(request.DisplayTransactionsForSalesReturn);
//                         }
//                         catch
//                         {
//                             displayTransactionsBoolean = false;
//                         }
//                     }
//                 }

//                 _logger.LogInformation($"DisplayTransactionsForSalesReturn value converted: {request.DisplayTransactionsForSalesReturn} -> {displayTransactionsBoolean}");

//                 // Handle fiscal year - get from claims first, then fallback to active fiscal year
//                 Guid fiscalYearIdGuid;
//                 if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
//                 {
//                     // If not in claims, get active fiscal year for the company
//                     var activeFiscalYear = await _context.FiscalYears
//                         .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

//                     if (activeFiscalYear == null)
//                     {
//                         // Try to get any fiscal year as fallback
//                         activeFiscalYear = await _context.FiscalYears
//                             .Where(f => f.CompanyId == companyIdGuid)
//                             .OrderByDescending(f => f.StartDate)
//                             .FirstOrDefaultAsync();

//                         if (activeFiscalYear == null)
//                         {
//                             return BadRequest(new
//                             {
//                                 success = false,
//                                 message = "No fiscal year found for this company. Please select a fiscal year first."
//                             });
//                         }
//                     }
//                     fiscalYearIdGuid = activeFiscalYear.Id;

//                     _logger.LogInformation($"Using active fiscal year: {fiscalYearIdGuid}");
//                 }

//                 // Update settings using the service
//                 var updatedSettings = await _settingsService.UpdateDisplayTransactionsForSalesReturnAsync(
//                     companyIdGuid,
//                     userIdGuid,
//                     fiscalYearIdGuid,
//                     displayTransactionsBoolean);

//                 // Return JSON response matching Node.js structure
//                 return Ok(new
//                 {
//                     success = true,
//                     message = "Settings updated successfully",
//                     data = new
//                     {
//                         displayTransactionsForSalesReturn = updatedSettings.DisplayTransactionsForSalesReturn,
//                         settingsId = updatedSettings.Id,
//                         updatedAt = updatedSettings.UpdatedAt
//                     }
//                 });
//             }
//             catch (Exception ex)
//             {
//                 _logger.LogError(ex, "Error updating display transactions for sales return settings");
//                 return StatusCode(500, new
//                 {
//                     success = false,
//                     message = "Internal Server Error",
//                     error = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
//                 });
//             }
//         }

//         // GET: api/Settings/get-display-purchase-transactions
//         [HttpGet("get-display-purchase-transactions")]
//         public async Task<IActionResult> GetDisplayPurchaseTransactions()
//         {
//             try
//             {
//                 _logger.LogInformation("=== GetDisplayPurchaseTransactions Started ===");

//                 // Extract claims from JWT token
//                 var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
//                 var companyId = User.FindFirst("currentCompany")?.Value;
//                 var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
//                 var tradeTypeClaim = User.FindFirst("tradeType")?.Value;
//                 var currentCompanyName = User.FindFirst("currentCompanyName")?.Value;

//                 // Validate user ID
//                 if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
//                 {
//                     return Unauthorized(new
//                     {
//                         success = false,
//                         error = "Invalid user token. Please login again."
//                     });
//                 }

//                 // Validate company ID
//                 if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
//                 {
//                     return BadRequest(new
//                     {
//                         success = false,
//                         error = "No company selected. Please select a company first."
//                     });
//                 }

//                 // Validate trade type
//                 if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
//                 {
//                     return StatusCode(403, new
//                     {
//                         success = false,
//                         error = "Access forbidden for this trade type"
//                     });
//                 }

//                 // Validate company and user
//                 if (companyIdGuid == Guid.Empty || userIdGuid == Guid.Empty)
//                 {
//                     return BadRequest(new
//                     {
//                         success = false,
//                         error = "Invalid company or user information."
//                     });
//                 }

//                 // Handle fiscal year - get from claims first, then fallback to active fiscal year
//                 Guid fiscalYearIdGuid;
//                 if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
//                 {
//                     // If not in claims, get active fiscal year for the company
//                     var activeFiscalYear = await _context.FiscalYears
//                         .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

//                     if (activeFiscalYear == null)
//                     {
//                         // Try to get any fiscal year as fallback
//                         activeFiscalYear = await _context.FiscalYears
//                             .Where(f => f.CompanyId == companyIdGuid)
//                             .OrderByDescending(f => f.StartDate)
//                             .FirstOrDefaultAsync();

//                         if (activeFiscalYear == null)
//                         {
//                             return BadRequest(new
//                             {
//                                 success = false,
//                                 error = "No fiscal year found for this company. Please select a fiscal year first."
//                             });
//                         }
//                     }
//                     fiscalYearIdGuid = activeFiscalYear.Id;

//                     _logger.LogInformation($"Using active fiscal year: {fiscalYearIdGuid}");
//                 }

//                 // Get settings using the service
//                 var settingsData = await _settingsService.GetDisplayPurchaseTransactionsAsync(companyIdGuid, userIdGuid, fiscalYearIdGuid);

//                 // Return JSON response matching Node.js structure
//                 return Ok(new
//                 {
//                     success = true,
//                     data = settingsData
//                 });
//             }
//             catch (Exception ex)
//             {
//                 _logger.LogError(ex, "Error fetching display purchase transactions settings");
//                 return StatusCode(500, new
//                 {
//                     success = false,
//                     error = "Internal Server Error",
//                     details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
//                 });
//             }
//         }

//         // POST: api/Settings/PurchaseTransactionDisplayUpdate
//         [HttpPost("PurchaseTransactionDisplayUpdate")]
//         public async Task<IActionResult> UpdateDisplayTransactionsForPurchase([FromBody] UpdateDisplayTransactionsForPurchaseRequest request)
//         {
//             // Check trade type first
//             var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

//             if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
//             {
//                 return StatusCode(403, new
//                 {
//                     success = false,
//                     message = "Access denied. Retailer trade type required."
//                 });
//             }

//             try
//             {
//                 _logger.LogInformation("=== UpdateDisplayTransactionsForPurchase Started ===");

//                 // Extract claims from JWT token
//                 var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
//                 var companyId = User.FindFirst("currentCompany")?.Value;
//                 var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;

//                 // Validate user ID
//                 if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
//                 {
//                     return Unauthorized(new
//                     {
//                         success = false,
//                         error = "Invalid user token. Please login again."
//                     });
//                 }

//                 // Validate company ID
//                 if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
//                 {
//                     return BadRequest(new
//                     {
//                         success = false,
//                         error = "No company selected. Please select a company first."
//                     });
//                 }

//                 // Validate input
//                 if (request.DisplayTransactionsForPurchase == null)
//                 {
//                     return BadRequest(new
//                     {
//                         success = false,
//                         message = "displayTransactionsForPurchase is required in request body"
//                     });
//                 }

//                 // Validate company and user
//                 if (companyIdGuid == Guid.Empty || userIdGuid == Guid.Empty)
//                 {
//                     return BadRequest(new
//                     {
//                         success = false,
//                         message = "Company ID and User ID are required"
//                     });
//                 }

//                 // Convert displayTransactionsForPurchase to boolean (handle various input types)
//                 bool displayTransactionsBoolean = false;

//                 // Check if DisplayTransactionsForPurchase is not null
//                 if (request.DisplayTransactionsForPurchase != null)
//                 {
//                     // Handle different types
//                     if (request.DisplayTransactionsForPurchase is bool boolValue)
//                     {
//                         displayTransactionsBoolean = boolValue;
//                     }
//                     else if (request.DisplayTransactionsForPurchase is string stringValue)
//                     {
//                         displayTransactionsBoolean = stringValue.Equals("true", StringComparison.OrdinalIgnoreCase) ||
//                                                     stringValue.Equals("on", StringComparison.OrdinalIgnoreCase);
//                     }
//                     else if (request.DisplayTransactionsForPurchase is int intValue)
//                     {
//                         displayTransactionsBoolean = intValue == 1;
//                     }
//                     else
//                     {
//                         // Try to convert using Convert.ToBoolean as fallback
//                         try
//                         {
//                             displayTransactionsBoolean = Convert.ToBoolean(request.DisplayTransactionsForPurchase);
//                         }
//                         catch
//                         {
//                             displayTransactionsBoolean = false;
//                         }
//                     }
//                 }

//                 _logger.LogInformation($"DisplayTransactionsForPurchase value converted: {request.DisplayTransactionsForPurchase} -> {displayTransactionsBoolean}");

//                 // Handle fiscal year - get from claims first, then fallback to active fiscal year
//                 Guid fiscalYearIdGuid;
//                 FiscalYearDTO fiscalYearInfo = null;

//                 if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
//                 {
//                     // If not in claims, get active fiscal year for the company
//                     var activeFiscalYear = await _context.FiscalYears
//                         .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

//                     if (activeFiscalYear == null)
//                     {
//                         // Try to get any fiscal year as fallback
//                         activeFiscalYear = await _context.FiscalYears
//                             .Where(f => f.CompanyId == companyIdGuid)
//                             .OrderByDescending(f => f.StartDate)
//                             .FirstOrDefaultAsync();

//                         if (activeFiscalYear == null)
//                         {
//                             return BadRequest(new
//                             {
//                                 success = false,
//                                 message = "No fiscal year found for this company. Please select a fiscal year first."
//                             });
//                         }
//                     }
//                     fiscalYearIdGuid = activeFiscalYear.Id;

//                     fiscalYearInfo = new FiscalYearDTO
//                     {
//                         Id = activeFiscalYear.Id,
//                         Name = activeFiscalYear.Name,
//                         StartDate = activeFiscalYear.StartDate,
//                         EndDate = activeFiscalYear.EndDate
//                     };

//                     _logger.LogInformation($"Using active fiscal year: {fiscalYearIdGuid}");
//                 }

//                 // Update settings using the service
//                 var updatedSettings = await _settingsService.UpdateDisplayTransactionsForPurchaseAsync(
//                     companyIdGuid,
//                     userIdGuid,
//                     fiscalYearIdGuid,
//                     displayTransactionsBoolean);

//                 // Return JSON response matching Node.js structure
//                 return Ok(new
//                 {
//                     success = true,
//                     message = "Settings updated successfully",
//                     data = new
//                     {
//                         displayTransactionsForPurchase = updatedSettings.DisplayTransactionsForPurchase,
//                         settingsId = updatedSettings.Id,
//                         updatedAt = updatedSettings.UpdatedAt,
//                         fiscalYear = new
//                         {
//                             id = fiscalYearIdGuid,
//                             name = fiscalYearInfo?.Name ?? string.Empty
//                         }
//                     }
//                 });
//             }
//             catch (Exception ex)
//             {
//                 _logger.LogError(ex, "Error updating display transactions for purchase settings");
//                 return StatusCode(500, new
//                 {
//                     success = false,
//                     message = "Internal Server Error",
//                     error = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
//                 });
//             }
//         }

//         // GET: api/Settings/get-display-purchase-return-transactions
//         [HttpGet("get-display-purchase-return-transactions")]
//         public async Task<IActionResult> GetDisplayPurchaseReturnTransactions()
//         {
//             try
//             {
//                 _logger.LogInformation("=== GetDisplayPurchaseReturnTransactions Started ===");

//                 // Extract claims from JWT token
//                 var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
//                 var companyId = User.FindFirst("currentCompany")?.Value;
//                 var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
//                 var tradeTypeClaim = User.FindFirst("tradeType")?.Value;
//                 var currentCompanyName = User.FindFirst("currentCompanyName")?.Value;

//                 // Validate user ID
//                 if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
//                 {
//                     return Unauthorized(new
//                     {
//                         success = false,
//                         error = "Invalid user token. Please login again."
//                     });
//                 }

//                 // Validate company ID
//                 if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
//                 {
//                     return BadRequest(new
//                     {
//                         success = false,
//                         error = "No company selected. Please select a company first."
//                     });
//                 }

//                 // Validate trade type
//                 if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
//                 {
//                     return StatusCode(403, new
//                     {
//                         success = false,
//                         error = "Access forbidden for this trade type"
//                     });
//                 }

//                 // Validate company and user
//                 if (companyIdGuid == Guid.Empty || userIdGuid == Guid.Empty)
//                 {
//                     return BadRequest(new
//                     {
//                         success = false,
//                         error = "Invalid company or user information."
//                     });
//                 }

//                 // Handle fiscal year - get from claims first, then fallback to active fiscal year
//                 Guid fiscalYearIdGuid;
//                 if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
//                 {
//                     // If not in claims, get active fiscal year for the company
//                     var activeFiscalYear = await _context.FiscalYears
//                         .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

//                     if (activeFiscalYear == null)
//                     {
//                         // Try to get any fiscal year as fallback
//                         activeFiscalYear = await _context.FiscalYears
//                             .Where(f => f.CompanyId == companyIdGuid)
//                             .OrderByDescending(f => f.StartDate)
//                             .FirstOrDefaultAsync();

//                         if (activeFiscalYear == null)
//                         {
//                             return BadRequest(new
//                             {
//                                 success = false,
//                                 error = "No fiscal year found for this company. Please select a fiscal year first."
//                             });
//                         }
//                     }
//                     fiscalYearIdGuid = activeFiscalYear.Id;

//                     _logger.LogInformation($"Using active fiscal year: {fiscalYearIdGuid}");
//                 }

//                 // Get settings using the service
//                 var settingsData = await _settingsService.GetDisplayPurchaseReturnTransactionsAsync(companyIdGuid, userIdGuid, fiscalYearIdGuid);

//                 // Return JSON response matching Node.js structure
//                 return Ok(new
//                 {
//                     success = true,
//                     data = settingsData
//                 });
//             }
//             catch (Exception ex)
//             {
//                 _logger.LogError(ex, "Error fetching display purchase return transactions settings");
//                 return StatusCode(500, new
//                 {
//                     success = false,
//                     error = "Internal Server Error",
//                     details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
//                 });
//             }
//         }

//         // POST: api/Settings/PurchaseReturnTransactionDisplayUpdate
//         [HttpPost("PurchaseReturnTransactionDisplayUpdate")]
//         public async Task<IActionResult> UpdateDisplayTransactionsForPurchaseReturn([FromBody] UpdateDisplayTransactionsForPurchaseReturnRequest request)
//         {
//             // Check trade type first
//             var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

//             if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
//             {
//                 return StatusCode(403, new
//                 {
//                     success = false,
//                     message = "Access denied. Retailer trade type required."
//                 });
//             }

//             try
//             {
//                 _logger.LogInformation("=== UpdateDisplayTransactionsForPurchaseReturn Started ===");

//                 // Extract claims from JWT token
//                 var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
//                 var companyId = User.FindFirst("currentCompany")?.Value;
//                 var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;

//                 // Validate user ID
//                 if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
//                 {
//                     return Unauthorized(new
//                     {
//                         success = false,
//                         error = "Invalid user token. Please login again."
//                     });
//                 }

//                 // Validate company ID
//                 if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
//                 {
//                     return BadRequest(new
//                     {
//                         success = false,
//                         error = "No company selected. Please select a company first."
//                     });
//                 }

//                 // Validate input
//                 if (request.DisplayTransactionsForPurchaseReturn == null)
//                 {
//                     return BadRequest(new
//                     {
//                         success = false,
//                         message = "displayTransactionsForPurchaseReturn is required in request body"
//                     });
//                 }

//                 // Validate company and user
//                 if (companyIdGuid == Guid.Empty || userIdGuid == Guid.Empty)
//                 {
//                     return BadRequest(new
//                     {
//                         success = false,
//                         message = "Company ID and User ID are required"
//                     });
//                 }

//                 // Convert displayTransactionsForPurchaseReturn to boolean (handle various input types)
//                 bool displayTransactionsBoolean = false;

//                 // Check if DisplayTransactionsForPurchaseReturn is not null
//                 if (request.DisplayTransactionsForPurchaseReturn != null)
//                 {
//                     // Handle different types
//                     if (request.DisplayTransactionsForPurchaseReturn is bool boolValue)
//                     {
//                         displayTransactionsBoolean = boolValue;
//                     }
//                     else if (request.DisplayTransactionsForPurchaseReturn is string stringValue)
//                     {
//                         displayTransactionsBoolean = stringValue.Equals("true", StringComparison.OrdinalIgnoreCase) ||
//                                                     stringValue.Equals("on", StringComparison.OrdinalIgnoreCase);
//                     }
//                     else if (request.DisplayTransactionsForPurchaseReturn is int intValue)
//                     {
//                         displayTransactionsBoolean = intValue == 1;
//                     }
//                     else
//                     {
//                         // Try to convert using Convert.ToBoolean as fallback
//                         try
//                         {
//                             displayTransactionsBoolean = Convert.ToBoolean(request.DisplayTransactionsForPurchaseReturn);
//                         }
//                         catch
//                         {
//                             displayTransactionsBoolean = false;
//                         }
//                     }
//                 }

//                 _logger.LogInformation($"DisplayTransactionsForPurchaseReturn value converted: {request.DisplayTransactionsForPurchaseReturn} -> {displayTransactionsBoolean}");

//                 // Handle fiscal year - get from claims first, then fallback to active fiscal year
//                 Guid fiscalYearIdGuid;
//                 FiscalYearDTO fiscalYearInfo = null;

//                 if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
//                 {
//                     // If not in claims, get active fiscal year for the company
//                     var activeFiscalYear = await _context.FiscalYears
//                         .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

//                     if (activeFiscalYear == null)
//                     {
//                         // Try to get any fiscal year as fallback
//                         activeFiscalYear = await _context.FiscalYears
//                             .Where(f => f.CompanyId == companyIdGuid)
//                             .OrderByDescending(f => f.StartDate)
//                             .FirstOrDefaultAsync();

//                         if (activeFiscalYear == null)
//                         {
//                             return BadRequest(new
//                             {
//                                 success = false,
//                                 message = "No fiscal year found for this company. Please select a fiscal year first."
//                             });
//                         }
//                     }
//                     fiscalYearIdGuid = activeFiscalYear.Id;

//                     fiscalYearInfo = new FiscalYearDTO
//                     {
//                         Id = activeFiscalYear.Id,
//                         Name = activeFiscalYear.Name,
//                         StartDate = activeFiscalYear.StartDate,
//                         EndDate = activeFiscalYear.EndDate
//                     };

//                     _logger.LogInformation($"Using active fiscal year: {fiscalYearIdGuid}");
//                 }

//                 // Update settings using the service
//                 var updatedSettings = await _settingsService.UpdateDisplayTransactionsForPurchaseReturnAsync(
//                     companyIdGuid,
//                     userIdGuid,
//                     fiscalYearIdGuid,
//                     displayTransactionsBoolean);

//                 // Return JSON response matching Node.js structure
//                 return Ok(new
//                 {
//                     success = true,
//                     message = "Settings updated successfully",
//                     data = new
//                     {
//                         displayTransactionsForPurchaseReturn = updatedSettings.DisplayTransactionsForPurchaseReturn,
//                         settingsId = updatedSettings.Id,
//                         updatedAt = updatedSettings.UpdatedAt,
//                         fiscalYear = new
//                         {
//                             id = fiscalYearIdGuid,
//                             name = fiscalYearInfo?.Name ?? string.Empty
//                         }
//                     }
//                 });
//             }
//             catch (Exception ex)
//             {
//                 _logger.LogError(ex, "Error updating display transactions for purchase return settings");
//                 return StatusCode(500, new
//                 {
//                     success = false,
//                     message = "Internal Server Error",
//                     error = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
//                 });
//             }
//         }

//         [HttpGet("company/{companyId}")]
//         public async Task<IActionResult> GetCompanySettings(Guid companyId)
//         {
//             var settings = await _settingsService.GetCompanySettingsAsync(companyId);
//             if (settings == null)
//                 return NotFound(new { message = "Settings not found" });

//             return Ok(settings);
//         }

//         [HttpGet("company/{companyId}/user/{userId}")]
//         public async Task<IActionResult> GetUserSettings(Guid companyId, Guid userId, [FromQuery] Guid? fiscalYearId)
//         {
//             var settings = await _settingsService.GetSettingsByCompanyAndUserAsync(companyId, userId, fiscalYearId);
//             if (settings == null)
//                 return NotFound(new { message = "Settings not found" });

//             return Ok(settings);
//         }

//         [HttpPost]
//         public async Task<IActionResult> CreateOrUpdateSettings([FromBody] SettingsRequest request)
//         {
//             try
//             {
//                 var settings = new Settings
//                 {
//                     Id = Guid.NewGuid(),
//                     CompanyId = request.CompanyId,
//                     UserId = request.UserId,
//                     RoundOffSales = request.RoundOffSales,
//                     RoundOffPurchase = request.RoundOffPurchase,
//                     RoundOffSalesReturn = request.RoundOffSalesReturn,
//                     RoundOffPurchaseReturn = request.RoundOffPurchaseReturn,
//                     DisplayTransactions = request.DisplayTransactions,
//                     DisplayTransactionsForPurchase = request.DisplayTransactionsForPurchase,
//                     DisplayTransactionsForSalesReturn = request.DisplayTransactionsForSalesReturn,
//                     DisplayTransactionsForPurchaseReturn = request.DisplayTransactionsForPurchaseReturn,
//                     StoreManagement = request.StoreManagement,
//                     Value = request.Value ?? string.Empty,
//                     FiscalYearId = request.FiscalYearId,
//                     CreatedAt = DateTime.UtcNow
//                 };

//                 var result = await _settingsService.CreateOrUpdateSettingsAsync(settings);
//                 return Ok(result);
//             }
//             catch (Exception ex)
//             {
//                 return BadRequest(new { error = ex.Message });
//             }
//         }

//         [HttpGet("company/{companyId}/value/{key}")]
//         public async Task<IActionResult> GetValue(Guid companyId, string key)
//         {
//             try
//             {
//                 var value = await _settingsService.GetValueAsync<object>(companyId, key);
//                 return Ok(new { key, value });
//             }
//             catch (Exception ex)
//             {
//                 return BadRequest(new { error = ex.Message });
//             }
//         }

//         [HttpPost("company/{companyId}/value/{key}")]
//         public async Task<IActionResult> SetValue(Guid companyId, string key, [FromBody] object value)
//         {
//             try
//             {
//                 await _settingsService.SetValueAsync(companyId, key, value);
//                 return Ok(new { message = "Value set successfully" });
//             }
//             catch (Exception ex)
//             {
//                 return BadRequest(new { error = ex.Message });
//             }
//         }
//     }

//     public class SettingsRequest
//     {
//         public Guid CompanyId { get; set; }
//         public Guid UserId { get; set; }
//         public bool RoundOffSales { get; set; } = false;
//         public bool RoundOffPurchase { get; set; } = false;
//         public bool RoundOffSalesReturn { get; set; } = false;
//         public bool RoundOffPurchaseReturn { get; set; } = false;
//         public bool DisplayTransactions { get; set; } = false;
//         public bool DisplayTransactionsForPurchase { get; set; } = false;
//         public bool DisplayTransactionsForSalesReturn { get; set; } = false;
//         public bool DisplayTransactionsForPurchaseReturn { get; set; } = false;
//         public bool StoreManagement { get; set; } = false;
//         public string? Value { get; set; }
//         public Guid FiscalYearId { get; set; }
//     }
// }

//--------------------------------------------------------end

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SkyForge.Data;
using SkyForge.Dto.RetailerDto;
using SkyForge.Models.CompanyModel;
using SkyForge.Models.Retailer.SettingsModel;
using SkyForge.Services.Retailer.SettingsServices;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

namespace SkyForge.Controllers.Retailer
{
    [ApiController]
    [Route("api/retailer")]
    [Authorize]
    public class SettingsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<SettingsController> _logger;
        private readonly ISettingsService _settingsService;

        public SettingsController(
            ApplicationDbContext context,
            ILogger<SettingsController> logger,
            ISettingsService settingsService)
        {
            _context = context;
            _logger = logger;
            _settingsService = settingsService;
        }

        [HttpGet("roundoff-sales")]
        public async Task<IActionResult> GetRoundOffSalesSettings()
        {
            try
            {
                _logger.LogInformation("=== GetRoundOffSalesSettings Started ===");

                // Extract claims from JWT token
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;
                var currentCompanyName = User.FindFirst("currentCompanyName")?.Value;

                // Validate user ID
                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                {
                    return Unauthorized(new
                    {
                        success = false,
                        error = "Invalid user token. Please login again."
                    });
                }

                // Validate company ID
                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "No company selected. Please select a company first."
                    });
                }

                // Validate trade type
                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new
                    {
                        success = false,
                        error = "Access forbidden for this trade type"
                    });
                }

                // Handle fiscal year - get from claims first, then fallback to active fiscal year
                Guid fiscalYearIdGuid;
                if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
                {
                    // If not in claims, get active fiscal year for the company
                    var activeFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

                    if (activeFiscalYear == null)
                    {
                        // Try to get any fiscal year as fallback
                        activeFiscalYear = await _context.FiscalYears
                            .Where(f => f.CompanyId == companyIdGuid)
                            .OrderByDescending(f => f.StartDate)
                            .FirstOrDefaultAsync();

                        if (activeFiscalYear == null)
                        {
                            return BadRequest(new
                            {
                                success = false,
                                error = "No fiscal year found for this company. Please select a fiscal year first."
                            });
                        }
                    }
                    fiscalYearIdGuid = activeFiscalYear.Id;

                    _logger.LogInformation($"Using active fiscal year: {fiscalYearIdGuid}");
                }

                // Get settings using the service
                var settingsData = await _settingsService.GetRoundOffSalesSettingsAsync(companyIdGuid, fiscalYearIdGuid, userIdGuid);

                // Return JSON response matching Node.js structure
                return Ok(new
                {
                    success = true,
                    data = settingsData
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching settings");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Error fetching settings",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        [HttpPost("roundoff-sales")]
        public async Task<IActionResult> UpdateRoundOffSalesSettings([FromBody] UpdateRoundOffSalesRequestDTO request)
        {
            try
            {
                _logger.LogInformation("=== UpdateRoundOffSalesSettings START ===");
                _logger.LogInformation($"RoundOffSales value: {request.RoundOffSales}");

                // Extract claims
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                // Validate user ID
                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                {
                    return Unauthorized(new { success = false, error = "Invalid user token" });
                }

                // Validate company ID
                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new { success = false, error = "No company selected" });
                }

                // Validate trade type
                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new { success = false, error = "Access forbidden" });
                }

                bool roundOffBoolean = request.RoundOffSales;
                _logger.LogInformation($"Using value: {roundOffBoolean}");

                // Handle fiscal year
                Guid fiscalYearIdGuid;
                if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
                {
                    var activeFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

                    if (activeFiscalYear == null)
                    {
                        return BadRequest(new { success = false, error = "No active fiscal year found" });
                    }
                    fiscalYearIdGuid = activeFiscalYear.Id;
                }

                var updatedSettings = await _settingsService.UpdateRoundOffSalesSettingsAsync(
                    companyIdGuid, fiscalYearIdGuid, userIdGuid, roundOffBoolean);

                return Ok(new
                {
                    success = true,
                    message = "Settings updated successfully",
                    data = new
                    {
                        roundOffSales = updatedSettings.RoundOffSales,
                        fiscalYearId = fiscalYearIdGuid
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating settings");
                return StatusCode(500, new { success = false, error = "Server Error", details = ex.Message });
            }
        }

        [HttpGet("roundoff-sales-return")]
        public async Task<IActionResult> GetRoundOffSalesReturnSettings()
        {
            // Your existing GET method here
            try
            {
                _logger.LogInformation("=== GetRoundOffSalesReturnSettings Started ===");

                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                {
                    return Unauthorized(new { success = false, error = "Invalid user token" });
                }

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new { success = false, error = "No company selected" });
                }

                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new { success = false, error = "Access forbidden" });
                }

                Guid fiscalYearIdGuid;
                if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
                {
                    var activeFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

                    if (activeFiscalYear == null)
                    {
                        activeFiscalYear = await _context.FiscalYears
                            .Where(f => f.CompanyId == companyIdGuid)
                            .OrderByDescending(f => f.StartDate)
                            .FirstOrDefaultAsync();

                        if (activeFiscalYear == null)
                        {
                            return BadRequest(new { success = false, error = "No fiscal year found" });
                        }
                    }
                    fiscalYearIdGuid = activeFiscalYear.Id;
                }

                var settingsData = await _settingsService.GetRoundOffSalesReturnSettingsAsync(companyIdGuid, fiscalYearIdGuid, userIdGuid);

                return Ok(new { success = true, data = settingsData });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching sales return settings");
                return StatusCode(500, new { success = false, error = "Error fetching settings" });
            }
        }

        [HttpPost("roundoff-sales-return")]
        public async Task<IActionResult> UpdateRoundOffSalesReturnSettings([FromBody] UpdateRoundOffSalesReturnRequestDTO request)
        {
            try
            {
                _logger.LogInformation("=== UpdateRoundOffSalesReturnSettings START ===");
                _logger.LogInformation($"RoundOffSalesReturn value: {request.RoundOffSalesReturn}");

                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                {
                    return Unauthorized(new { success = false, error = "Invalid user token" });
                }

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new { success = false, error = "No company selected" });
                }

                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new { success = false, error = "Access forbidden" });
                }

                bool roundOffBoolean = request.RoundOffSalesReturn;

                Guid fiscalYearIdGuid;
                if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
                {
                    var activeFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

                    if (activeFiscalYear == null)
                    {
                        return BadRequest(new { success = false, error = "No active fiscal year found" });
                    }
                    fiscalYearIdGuid = activeFiscalYear.Id;
                }

                var updatedSettings = await _settingsService.UpdateRoundOffSalesReturnSettingsAsync(
                    companyIdGuid, fiscalYearIdGuid, userIdGuid, roundOffBoolean);

                return Ok(new
                {
                    success = true,
                    message = "Settings updated successfully",
                    data = new { roundOffSalesReturn = updatedSettings.RoundOffSalesReturn }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating sales return settings");
                return StatusCode(500, new { success = false, error = "Server Error", details = ex.Message });
            }
        }

        [HttpGet("roundoff-purchase")]
        public async Task<IActionResult> GetRoundOffPurchaseSettings()
        {
            // Similar to GET above
            try
            {
                _logger.LogInformation("=== GetRoundOffPurchaseSettings Started ===");

                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                {
                    return Unauthorized(new { success = false, error = "Invalid user token" });
                }

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new { success = false, error = "No company selected" });
                }

                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new { success = false, error = "Access forbidden" });
                }

                Guid fiscalYearIdGuid;
                if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
                {
                    var activeFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

                    if (activeFiscalYear == null)
                    {
                        activeFiscalYear = await _context.FiscalYears
                            .Where(f => f.CompanyId == companyIdGuid)
                            .OrderByDescending(f => f.StartDate)
                            .FirstOrDefaultAsync();

                        if (activeFiscalYear == null)
                        {
                            return BadRequest(new { success = false, error = "No fiscal year found" });
                        }
                    }
                    fiscalYearIdGuid = activeFiscalYear.Id;
                }

                var settingsData = await _settingsService.GetRoundOffPurchaseSettingsAsync(companyIdGuid, fiscalYearIdGuid, userIdGuid);

                return Ok(new { success = true, data = settingsData });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching purchase settings");
                return StatusCode(500, new { success = false, error = "Error fetching settings" });
            }
        }

        [HttpPost("roundoff-purchase")]
        public async Task<IActionResult> UpdateRoundOffPurchaseSettings([FromBody] UpdateRoundOffPurchaseRequestDTO request)
        {
            try
            {
                _logger.LogInformation("=== UpdateRoundOffPurchaseSettings START ===");
                _logger.LogInformation($"RoundOffPurchase value: {request.RoundOffPurchase}");

                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                {
                    return Unauthorized(new { success = false, error = "Invalid user token" });
                }

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new { success = false, error = "No company selected" });
                }

                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new { success = false, error = "Access forbidden" });
                }

                bool roundOffBoolean = request.RoundOffPurchase;

                Guid fiscalYearIdGuid;
                if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
                {
                    var activeFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

                    if (activeFiscalYear == null)
                    {
                        return BadRequest(new { success = false, error = "No active fiscal year found" });
                    }
                    fiscalYearIdGuid = activeFiscalYear.Id;
                }

                var updatedSettings = await _settingsService.UpdateRoundOffPurchaseSettingsAsync(
                    companyIdGuid, fiscalYearIdGuid, userIdGuid, roundOffBoolean);

                return Ok(new
                {
                    success = true,
                    message = "Settings updated successfully",
                    data = new { roundOffPurchase = updatedSettings.RoundOffPurchase }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating purchase settings");
                return StatusCode(500, new { success = false, error = "Server Error", details = ex.Message });
            }
        }

        [HttpGet("roundoff-purchase-return")]
        public async Task<IActionResult> GetRoundOffPurchaseReturnSettings()
        {
            // Similar to GET above
            try
            {
                _logger.LogInformation("=== GetRoundOffPurchaseReturnSettings Started ===");

                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                {
                    return Unauthorized(new { success = false, error = "Invalid user token" });
                }

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new { success = false, error = "No company selected" });
                }

                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new { success = false, error = "Access forbidden" });
                }

                Guid fiscalYearIdGuid;
                if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
                {
                    var activeFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

                    if (activeFiscalYear == null)
                    {
                        activeFiscalYear = await _context.FiscalYears
                            .Where(f => f.CompanyId == companyIdGuid)
                            .OrderByDescending(f => f.StartDate)
                            .FirstOrDefaultAsync();

                        if (activeFiscalYear == null)
                        {
                            return BadRequest(new { success = false, error = "No fiscal year found" });
                        }
                    }
                    fiscalYearIdGuid = activeFiscalYear.Id;
                }

                var settingsData = await _settingsService.GetRoundOffPurchaseReturnSettingsAsync(companyIdGuid, fiscalYearIdGuid, userIdGuid);

                return Ok(new { success = true, data = settingsData });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching purchase return settings");
                return StatusCode(500, new { success = false, error = "Error fetching settings" });
            }
        }

        [HttpPost("roundoff-purchase-return")]
        public async Task<IActionResult> UpdateRoundOffPurchaseReturnSettings([FromBody] UpdateRoundOffPurchaseReturnRequestDTO request)
        {
            try
            {
                _logger.LogInformation("=== UpdateRoundOffPurchaseReturnSettings START ===");
                _logger.LogInformation($"RoundOffPurchaseReturn value: {request.RoundOffPurchaseReturn}");

                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                {
                    return Unauthorized(new { success = false, error = "Invalid user token" });
                }

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new { success = false, error = "No company selected" });
                }

                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new { success = false, error = "Access forbidden" });
                }

                bool roundOffBoolean = request.RoundOffPurchaseReturn;

                Guid fiscalYearIdGuid;
                if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
                {
                    var activeFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

                    if (activeFiscalYear == null)
                    {
                        return BadRequest(new { success = false, error = "No active fiscal year found" });
                    }
                    fiscalYearIdGuid = activeFiscalYear.Id;
                }

                var updatedSettings = await _settingsService.UpdateRoundOffPurchaseReturnSettingsAsync(
                    companyIdGuid, fiscalYearIdGuid, userIdGuid, roundOffBoolean);

                return Ok(new
                {
                    success = true,
                    message = "Settings updated successfully",
                    data = new { roundOffPurchaseReturn = updatedSettings.RoundOffPurchaseReturn }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating purchase return settings");
                return StatusCode(500, new { success = false, error = "Server Error", details = ex.Message });
            }
        }

        [HttpGet("get-display-sales-transactions")]
        public async Task<IActionResult> GetDisplaySalesTransactions()
        {
            // Your existing GET method
            try
            {
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                {
                    return Unauthorized(new { success = false, error = "Invalid user token" });
                }

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new { success = false, error = "No company selected" });
                }

                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new { success = false, error = "Access forbidden" });
                }

                var settingsData = await _settingsService.GetDisplaySalesTransactionsAsync(companyIdGuid, userIdGuid);

                return Ok(new { success = true, data = settingsData });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching display sales transactions");
                return StatusCode(500, new { success = false, error = "Internal Server Error" });
            }
        }

        [HttpPost("updateDisplayTransactionsForSales")]
        public async Task<IActionResult> UpdateDisplayTransactionsForSales([FromBody] UpdateDisplayTransactionsRequestDTO request)
        {
            try
            {
                _logger.LogInformation("=== UpdateDisplayTransactionsForSales START ===");
                _logger.LogInformation($"DisplayTransactions value: {request.DisplayTransactions}");

                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                {
                    return Unauthorized(new { success = false, error = "Invalid user token" });
                }

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new { success = false, error = "No company selected" });
                }

                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new { success = false, error = "Access forbidden" });
                }

                bool displayTransactionsBoolean = request.DisplayTransactions;

                Guid fiscalYearIdGuid;
                if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
                {
                    var activeFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

                    if (activeFiscalYear == null)
                    {
                        activeFiscalYear = await _context.FiscalYears
                            .Where(f => f.CompanyId == companyIdGuid)
                            .OrderByDescending(f => f.StartDate)
                            .FirstOrDefaultAsync();

                        if (activeFiscalYear == null)
                        {
                            return BadRequest(new { success = false, message = "No fiscal year found" });
                        }
                    }
                    fiscalYearIdGuid = activeFiscalYear.Id;
                }

                var updatedSettings = await _settingsService.UpdateDisplayTransactionsForSalesAsync(
                    companyIdGuid, userIdGuid, fiscalYearIdGuid, displayTransactionsBoolean);

                return Ok(new
                {
                    success = true,
                    message = "Settings updated successfully",
                    data = new
                    {
                        displayTransactions = updatedSettings.DisplayTransactions,
                        updatedSettings = new
                        {
                            id = updatedSettings.Id,
                            fiscalYearId = updatedSettings.FiscalYearId,
                            displayTransactions = updatedSettings.DisplayTransactions,
                            updatedAt = updatedSettings.UpdatedAt
                        }
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating display transactions");
                return StatusCode(500, new { success = false, error = "Internal Server Error", details = ex.Message });
            }
        }

        [HttpGet("get-display-sales-return-transactions")]
        public async Task<IActionResult> GetDisplaySalesReturnTransactions()
        {
            // Your existing GET method
            try
            {
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                {
                    return Unauthorized(new { success = false, error = "Invalid user token" });
                }

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new { success = false, error = "No company selected" });
                }

                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new { success = false, error = "Access forbidden" });
                }

                var settingsData = await _settingsService.GetDisplaySalesReturnTransactionsAsync(companyIdGuid, userIdGuid);

                return Ok(new { success = true, data = settingsData });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching display sales return transactions");
                return StatusCode(500, new { success = false, error = "Internal Server Error" });
            }
        }

        [HttpPost("updateDisplayTransactionsForSalesReturn")]
        public async Task<IActionResult> UpdateDisplayTransactionsForSalesReturn([FromBody] UpdateDisplayTransactionsForSalesReturnRequestDTO request)
        {
            try
            {
                _logger.LogInformation("=== UpdateDisplayTransactionsForSalesReturn START ===");
                _logger.LogInformation($"DisplayTransactionsForSalesReturn value: {request.DisplayTransactionsForSalesReturn}");

                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                {
                    return Unauthorized(new { success = false, error = "Invalid user token" });
                }

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new { success = false, error = "No company selected" });
                }

                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new { success = false, error = "Access forbidden" });
                }

                bool displayTransactionsBoolean = request.DisplayTransactionsForSalesReturn;

                Guid fiscalYearIdGuid;
                if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
                {
                    var activeFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

                    if (activeFiscalYear == null)
                    {
                        activeFiscalYear = await _context.FiscalYears
                            .Where(f => f.CompanyId == companyIdGuid)
                            .OrderByDescending(f => f.StartDate)
                            .FirstOrDefaultAsync();

                        if (activeFiscalYear == null)
                        {
                            return BadRequest(new { success = false, message = "No fiscal year found" });
                        }
                    }
                    fiscalYearIdGuid = activeFiscalYear.Id;
                }

                var updatedSettings = await _settingsService.UpdateDisplayTransactionsForSalesReturnAsync(
                    companyIdGuid, userIdGuid, fiscalYearIdGuid, displayTransactionsBoolean);

                return Ok(new
                {
                    success = true,
                    message = "Settings updated successfully",
                    data = new
                    {
                        displayTransactionsForSalesReturn = updatedSettings.DisplayTransactionsForSalesReturn,
                        settingsId = updatedSettings.Id,
                        updatedAt = updatedSettings.UpdatedAt
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating display transactions for sales return");
                return StatusCode(500, new { success = false, error = "Internal Server Error", details = ex.Message });
            }
        }

        [HttpGet("get-display-purchase-transactions")]
        public async Task<IActionResult> GetDisplayPurchaseTransactions()
        {
            // Your existing GET method
            try
            {
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                {
                    return Unauthorized(new { success = false, error = "Invalid user token" });
                }

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new { success = false, error = "No company selected" });
                }

                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new { success = false, error = "Access forbidden" });
                }

                Guid fiscalYearIdGuid;
                if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
                {
                    var activeFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

                    if (activeFiscalYear == null)
                    {
                        activeFiscalYear = await _context.FiscalYears
                            .Where(f => f.CompanyId == companyIdGuid)
                            .OrderByDescending(f => f.StartDate)
                            .FirstOrDefaultAsync();

                        if (activeFiscalYear == null)
                        {
                            return BadRequest(new { success = false, error = "No fiscal year found" });
                        }
                    }
                    fiscalYearIdGuid = activeFiscalYear.Id;
                }

                var settingsData = await _settingsService.GetDisplayPurchaseTransactionsAsync(companyIdGuid, userIdGuid, fiscalYearIdGuid);

                return Ok(new { success = true, data = settingsData });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching display purchase transactions");
                return StatusCode(500, new { success = false, error = "Internal Server Error" });
            }
        }

        [HttpPost("PurchaseTransactionDisplayUpdate")]
        public async Task<IActionResult> UpdateDisplayTransactionsForPurchase([FromBody] UpdateDisplayTransactionsForPurchaseRequestDTO request)
        {
            try
            {
                _logger.LogInformation("=== UpdateDisplayTransactionsForPurchase START ===");
                _logger.LogInformation($"DisplayTransactionsForPurchase value: {request.DisplayTransactionsForPurchase}");

                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;
                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new { success = false, message = "Access denied. Retailer trade type required." });
                }

                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;

                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                {
                    return Unauthorized(new { success = false, error = "Invalid user token" });
                }

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new { success = false, error = "No company selected" });
                }

                bool displayTransactionsBoolean = request.DisplayTransactionsForPurchase;

                Guid fiscalYearIdGuid;
                if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
                {
                    var activeFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

                    if (activeFiscalYear == null)
                    {
                        activeFiscalYear = await _context.FiscalYears
                            .Where(f => f.CompanyId == companyIdGuid)
                            .OrderByDescending(f => f.StartDate)
                            .FirstOrDefaultAsync();

                        if (activeFiscalYear == null)
                        {
                            return BadRequest(new { success = false, message = "No fiscal year found" });
                        }
                    }
                    fiscalYearIdGuid = activeFiscalYear.Id;
                }

                var updatedSettings = await _settingsService.UpdateDisplayTransactionsForPurchaseAsync(
                    companyIdGuid, userIdGuid, fiscalYearIdGuid, displayTransactionsBoolean);

                return Ok(new
                {
                    success = true,
                    message = "Settings updated successfully",
                    data = new
                    {
                        displayTransactionsForPurchase = updatedSettings.DisplayTransactionsForPurchase,
                        settingsId = updatedSettings.Id,
                        updatedAt = updatedSettings.UpdatedAt
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating display transactions for purchase");
                return StatusCode(500, new { success = false, message = "Internal Server Error", error = ex.Message });
            }
        }

        [HttpGet("get-display-purchase-return-transactions")]
        public async Task<IActionResult> GetDisplayPurchaseReturnTransactions()
        {
            // Your existing GET method (similar to above)
            try
            {
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                {
                    return Unauthorized(new { success = false, error = "Invalid user token" });
                }

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new { success = false, error = "No company selected" });
                }

                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new { success = false, error = "Access forbidden" });
                }

                Guid fiscalYearIdGuid;
                if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
                {
                    var activeFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

                    if (activeFiscalYear == null)
                    {
                        activeFiscalYear = await _context.FiscalYears
                            .Where(f => f.CompanyId == companyIdGuid)
                            .OrderByDescending(f => f.StartDate)
                            .FirstOrDefaultAsync();

                        if (activeFiscalYear == null)
                        {
                            return BadRequest(new { success = false, error = "No fiscal year found" });
                        }
                    }
                    fiscalYearIdGuid = activeFiscalYear.Id;
                }

                var settingsData = await _settingsService.GetDisplayPurchaseReturnTransactionsAsync(companyIdGuid, userIdGuid, fiscalYearIdGuid);

                return Ok(new { success = true, data = settingsData });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching display purchase return transactions");
                return StatusCode(500, new { success = false, error = "Internal Server Error" });
            }
        }

        [HttpPost("PurchaseReturnTransactionDisplayUpdate")]
        public async Task<IActionResult> UpdateDisplayTransactionsForPurchaseReturn([FromBody] UpdateDisplayTransactionsForPurchaseReturnRequestDTO request)
        {
            try
            {
                _logger.LogInformation("=== UpdateDisplayTransactionsForPurchaseReturn START ===");
                _logger.LogInformation($"DisplayTransactionsForPurchaseReturn value: {request.DisplayTransactionsForPurchaseReturn}");

                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;
                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new { success = false, message = "Access denied. Retailer trade type required." });
                }

                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;

                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                {
                    return Unauthorized(new { success = false, error = "Invalid user token" });
                }

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new { success = false, error = "No company selected" });
                }

                bool displayTransactionsBoolean = request.DisplayTransactionsForPurchaseReturn;

                Guid fiscalYearIdGuid;
                if (string.IsNullOrEmpty(fiscalYearIdClaim) || !Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
                {
                    var activeFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

                    if (activeFiscalYear == null)
                    {
                        activeFiscalYear = await _context.FiscalYears
                            .Where(f => f.CompanyId == companyIdGuid)
                            .OrderByDescending(f => f.StartDate)
                            .FirstOrDefaultAsync();

                        if (activeFiscalYear == null)
                        {
                            return BadRequest(new { success = false, message = "No fiscal year found" });
                        }
                    }
                    fiscalYearIdGuid = activeFiscalYear.Id;
                }

                var updatedSettings = await _settingsService.UpdateDisplayTransactionsForPurchaseReturnAsync(
                    companyIdGuid, userIdGuid, fiscalYearIdGuid, displayTransactionsBoolean);

                return Ok(new
                {
                    success = true,
                    message = "Settings updated successfully",
                    data = new
                    {
                        displayTransactionsForPurchaseReturn = updatedSettings.DisplayTransactionsForPurchaseReturn,
                        settingsId = updatedSettings.Id,
                        updatedAt = updatedSettings.UpdatedAt
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating display transactions for purchase return");
                return StatusCode(500, new { success = false, message = "Internal Server Error", error = ex.Message });
            }
        }

        
        [HttpGet("company/{companyId}")]
        public async Task<IActionResult> GetCompanySettings(Guid companyId)
        {
            var settings = await _settingsService.GetCompanySettingsAsync(companyId);
            if (settings == null)
                return NotFound(new { message = "Settings not found" });

            return Ok(settings);
        }

        [HttpGet("company/{companyId}/user/{userId}")]
        public async Task<IActionResult> GetUserSettings(Guid companyId, Guid userId, [FromQuery] Guid? fiscalYearId)
        {
            var settings = await _settingsService.GetSettingsByCompanyAndUserAsync(companyId, userId, fiscalYearId);
            if (settings == null)
                return NotFound(new { message = "Settings not found" });

            return Ok(settings);
        }

        [HttpPost]
        public async Task<IActionResult> CreateOrUpdateSettings([FromBody] SettingsRequest request)
        {
            try
            {
                var settings = new Settings
                {
                    Id = Guid.NewGuid(),
                    CompanyId = request.CompanyId,
                    UserId = request.UserId,
                    RoundOffSales = request.RoundOffSales,
                    RoundOffPurchase = request.RoundOffPurchase,
                    RoundOffSalesReturn = request.RoundOffSalesReturn,
                    RoundOffPurchaseReturn = request.RoundOffPurchaseReturn,
                    DisplayTransactions = request.DisplayTransactions,
                    DisplayTransactionsForPurchase = request.DisplayTransactionsForPurchase,
                    DisplayTransactionsForSalesReturn = request.DisplayTransactionsForSalesReturn,
                    DisplayTransactionsForPurchaseReturn = request.DisplayTransactionsForPurchaseReturn,
                    StoreManagement = request.StoreManagement,
                    Value = request.Value ?? string.Empty,
                    FiscalYearId = request.FiscalYearId,
                    CreatedAt = DateTime.UtcNow
                };

                var result = await _settingsService.CreateOrUpdateSettingsAsync(settings);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpGet("company/{companyId}/value/{key}")]
        public async Task<IActionResult> GetValue(Guid companyId, string key)
        {
            try
            {
                var value = await _settingsService.GetValueAsync<object>(companyId, key);
                return Ok(new { key, value });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpPost("company/{companyId}/value/{key}")]
        public async Task<IActionResult> SetValue(Guid companyId, string key, [FromBody] object value)
        {
            try
            {
                await _settingsService.SetValueAsync(companyId, key, value);
                return Ok(new { message = "Value set successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }
    }

    public class SettingsRequest
    {
        public Guid CompanyId { get; set; }
        public Guid UserId { get; set; }
        public bool RoundOffSales { get; set; } = false;
        public bool RoundOffPurchase { get; set; } = false;
        public bool RoundOffSalesReturn { get; set; } = false;
        public bool RoundOffPurchaseReturn { get; set; } = false;
        public bool DisplayTransactions { get; set; } = false;
        public bool DisplayTransactionsForPurchase { get; set; } = false;
        public bool DisplayTransactionsForSalesReturn { get; set; } = false;
        public bool DisplayTransactionsForPurchaseReturn { get; set; } = false;
        public bool StoreManagement { get; set; } = false;
        public string? Value { get; set; }
        public Guid FiscalYearId { get; set; }
    }
}