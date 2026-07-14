// // Controllers/Retailer/AccountImportController.cs
// using Microsoft.AspNetCore.Authorization;
// using Microsoft.AspNetCore.Mvc;
// using Microsoft.EntityFrameworkCore;
// using OfficeOpenXml;
// using SkyForge.Data;
// using SkyForge.Dto.AccountDto;
// using SkyForge.Models.AccountModel;
// using SkyForge.Models.AccountGroupModel;
// using SkyForge.Models.Shared;
// using System.Security.Claims;
// using SkyForge.Models.CompanyModel;

// namespace SkyForge.Controllers.Retailer
// {
//     [ApiController]
//     [Route("api/retailer")]
//     [Authorize]
//     public class AccountImportController : ControllerBase
//     {
//         private readonly ApplicationDbContext _context;
//         private readonly ILogger<AccountImportController> _logger;

//         public AccountImportController(
//             ApplicationDbContext context,
//             ILogger<AccountImportController> logger)
//         {
//             _context = context;
//             _logger = logger;
//         }

//         [HttpGet("accounts-import")]
//         public async Task<IActionResult> GetAccountsImportData()
//         {
//             try
//             {
//                 var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
//                 var companyId = User.FindFirst("currentCompany")?.Value;
//                 var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

//                 if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out _))
//                 {
//                     return Unauthorized(new { success = false, error = "Invalid user token" });
//                 }

//                 if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
//                 {
//                     return BadRequest(new { success = false, error = "No company selected" });
//                 }

//                 if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
//                 {
//                     return StatusCode(403, new { success = false, error = "Access restricted to retailer accounts" });
//                 }

//                 // Get company
//                 var company = await _context.Companies
//                     .FirstOrDefaultAsync(c => c.Id == companyIdGuid);

//                 if (company == null)
//                 {
//                     return NotFound(new { success = false, error = "Company not found" });
//                 }

//                 // Get current fiscal year
//                 var currentFiscalYear = await _context.FiscalYears
//                     .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

//                 if (currentFiscalYear == null)
//                 {
//                     return BadRequest(new { success = false, error = "No active fiscal year found" });
//                 }

//                 // Get account groups
//                 var accountGroups = await _context.AccountGroups
//                     .Where(g => g.CompanyId == companyIdGuid)
//                     .Select(g => new { g.Id, g.Name })
//                     .ToListAsync();

//                 return Ok(new
//                 {
//                     success = true,
//                     data = new
//                     {
//                         company = new
//                         {
//                             id = company.Id,
//                             name = company.Name,
//                             renewalDate = company.RenewalDate,
//                             dateFormat = company.DateFormat
//                         },
//                         currentCompany = new
//                         {
//                             id = company.Id,
//                             name = company.Name,
//                             renewalDate = company.RenewalDate,
//                             dateFormat = company.DateFormat
//                         },
//                         currentCompanyName = company.Name,
//                         currentFiscalYear = new
//                         {
//                             id = currentFiscalYear.Id,
//                             name = currentFiscalYear.Name,
//                             startDate = currentFiscalYear.StartDate,
//                             endDate = currentFiscalYear.EndDate,
//                             dateFormat = currentFiscalYear.DateFormat,
//                             isActive = currentFiscalYear.IsActive
//                         },
//                         fiscalYear = currentFiscalYear.Id,
//                         companyGroups = accountGroups.Select(g => new { id = g.Id, name = g.Name }),
//                         user = new
//                         {
//                             preferences = new { theme = "light" },
//                             isAdminOrSupervisor = User.IsInRole("Admin") || User.IsInRole("Supervisor"),
//                             role = User.FindFirst(ClaimTypes.Role)?.Value ?? "User",
//                             isAdmin = User.IsInRole("Admin")
//                         }
//                     },
//                     metadata = new
//                     {
//                         title = "Import Accounts",
//                         timestamp = DateTime.UtcNow,
//                         tradeType = tradeTypeClaim
//                     }
//                 });
//             }
//             catch (Exception ex)
//             {
//                 _logger.LogError(ex, "Error in GetAccountsImportData");
//                 return StatusCode(500, new
//                 {
//                     success = false,
//                     error = "SERVER_ERROR",
//                     message = "Failed to load import page data.",
//                     code = "LOAD_ERROR",
//                     details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
//                 });
//             }
//         }

//         [HttpPost("accounts-import")]
//         public async Task<IActionResult> ImportAccounts([FromForm] IFormFile excelFile)
//         {
//             try
//             {
//                 var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
//                 var companyId = User.FindFirst("currentCompany")?.Value;
//                 var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

//                 if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
//                 {
//                     return Unauthorized(new { success = false, error = "Invalid user token" });
//                 }

//                 if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
//                 {
//                     return BadRequest(new { success = false, error = "No company selected" });
//                 }

//                 if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
//                 {
//                     return StatusCode(403, new { success = false, error = "Access restricted to retailer accounts" });
//                 }

//                 // Validate file
//                 if (excelFile == null || excelFile.Length == 0)
//                 {
//                     return BadRequest(new AccountImportResponseDto
//                     {
//                         Success = false,
//                         Message = "No file uploaded",
//                         Code = "NO_FILE"
//                     });
//                 }

//                 if (excelFile.Length > 5 * 1024 * 1024) // 5MB limit
//                 {
//                     return BadRequest(new AccountImportResponseDto
//                     {
//                         Success = false,
//                         Message = "File size exceeds 5MB limit",
//                         Code = "FILE_TOO_LARGE"
//                     });
//                 }

//                 var extension = Path.GetExtension(excelFile.FileName).ToLower();
//                 if (extension != ".xlsx" && extension != ".xls")
//                 {
//                     return BadRequest(new AccountImportResponseDto
//                     {
//                         Success = false,
//                         Message = "Invalid file format. Please upload .xlsx or .xls file",
//                         Code = "INVALID_FORMAT"
//                     });
//                 }

//                 // Get fiscal year
//                 var currentFiscalYear = await _context.FiscalYears
//                     .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

//                 if (currentFiscalYear == null)
//                 {
//                     return BadRequest(new AccountImportResponseDto
//                     {
//                         Success = false,
//                         Message = "No active fiscal year found",
//                         Code = "FISCAL_YEAR_MISSING"
//                     });
//                 }

//                 // Process the file
//                 var result = await ProcessAccountImport(excelFile, companyIdGuid, currentFiscalYear.Id, userIdGuid);

//                 return Ok(new AccountImportResponseDto
//                 {
//                     Success = result.SuccessCount > 0,
//                     Message = $"Imported {result.SuccessCount} accounts successfully",
//                     Warning = result.Warnings.Any() ? string.Join("; ", result.Warnings) : null,
//                     Code = result.SuccessCount > 0 ? "IMPORT_SUCCESS" : "IMPORT_FAILED",
//                     Data = result
//                 });
//             }
//             catch (Exception ex)
//             {
//                 _logger.LogError(ex, "Error in ImportAccounts");
//                 return StatusCode(500, new AccountImportResponseDto
//                 {
//                     Success = false,
//                     Message = "Server error during import",
//                     Code = "SERVER_ERROR",
//                     Data = new AccountImportResultData
//                     {
//                         Errors = new List<string> { ex.Message }
//                     }
//                 });
//             }
//         }

//         [HttpGet("accounts-import-template")]
//         public async Task<IActionResult> DownloadTemplate()
//         {
//             try
//             {
//                 // ✅ Set license BEFORE creating any ExcelPackage instance
//                 ExcelPackage.LicenseContext = LicenseContext.NonCommercial;

//                 // Now create the package
//                 using var package = new ExcelPackage();
//                 var worksheet = package.Workbook.Worksheets.Add("Accounts Template");

//                 // Headers
//                 var headers = new[]
//                 {
//             "Account Name*", "Group Name*", "Address", "Ward", "Phone",
//             "PAN", "Contact Person", "Email", "Credit Limit",
//             "Opening Balance", "Opening Balance Type (Dr/Cr)", "Is Active (Yes/No)"
//         };

//                 for (int i = 0; i < headers.Length; i++)
//                 {
//                     worksheet.Cells[1, i + 1].Value = headers[i];
//                     worksheet.Cells[1, i + 1].Style.Font.Bold = true;
//                     worksheet.Cells[1, i + 1].Style.Fill.PatternType = OfficeOpenXml.Style.ExcelFillStyle.Solid;
//                     worksheet.Cells[1, i + 1].Style.Fill.BackgroundColor.SetColor(System.Drawing.Color.LightGray);
//                     worksheet.Cells[1, i + 1].Style.Border.BorderAround(OfficeOpenXml.Style.ExcelBorderStyle.Thin);
//                 }

//                 // Sample data
//                 var sampleData = new object[]
//                 {
//             "ABC Traders", "Sundry Debtors", "Kathmandu", 1, "9841234567",
//             "123456789", "Ram Sharma", "ram@abc.com", 100000,
//             5000, "Dr", "Yes"
//                 };

//                 for (int i = 0; i < sampleData.Length; i++)
//                 {
//                     worksheet.Cells[2, i + 1].Value = sampleData[i];
//                     worksheet.Cells[2, i + 1].Style.Border.BorderAround(OfficeOpenXml.Style.ExcelBorderStyle.Thin);
//                 }

//                 // Set column widths
//                 worksheet.Column(1).Width = 25;  // Account Name
//                 worksheet.Column(2).Width = 25;  // Group Name
//                 worksheet.Column(3).Width = 30;  // Address
//                 worksheet.Column(4).Width = 10;  // Ward
//                 worksheet.Column(5).Width = 15;  // Phone
//                 worksheet.Column(6).Width = 15;  // PAN
//                 worksheet.Column(7).Width = 20;  // Contact Person
//                 worksheet.Column(8).Width = 30;  // Email
//                 worksheet.Column(9).Width = 15;  // Credit Limit
//                 worksheet.Column(10).Width = 15; // Opening Balance
//                 worksheet.Column(11).Width = 20; // Opening Balance Type
//                 worksheet.Column(12).Width = 15; // Is Active

//                 var stream = new MemoryStream();
//                 package.SaveAs(stream);
//                 stream.Position = 0;

//                 _logger.LogInformation("Template downloaded successfully");

//                 return File(stream, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Accounts-Import-Template.xlsx");
//             }
//             catch (Exception ex)
//             {
//                 _logger.LogError(ex, "Error downloading template");
//                 return StatusCode(500, new
//                 {
//                     success = false,
//                     error = "Failed to generate template. Please try again.",
//                     details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
//                 });
//             }
//         }
//         private async Task<AccountImportResultData> ProcessAccountImport(
//             IFormFile file,
//             Guid companyId,
//             Guid fiscalYearId,
//             Guid userId)
//         {
//             var result = new AccountImportResultData();
//             var accountGroups = await _context.AccountGroups
//                 .Where(g => g.CompanyId == companyId)
//                 .ToDictionaryAsync(g => g.Name, g => g);

//             using var stream = new MemoryStream();
//             await file.CopyToAsync(stream);
//             stream.Position = 0;

//             using var package = new ExcelPackage(stream);
//             var worksheet = package.Workbook.Worksheets[0];

//             if (worksheet == null || worksheet.Dimension == null)
//             {
//                 result.Errors.Add("The uploaded file is empty or invalid");
//                 return result;
//             }

//             int rowCount = worksheet.Dimension.Rows;
//             var errors = new List<string>();
//             var warnings = new List<string>();

//             // Process rows (skip header row)
//             for (int row = 2; row <= rowCount; row++)
//             {
//                 var importResult = new AccountImportResult
//                 {
//                     RowNumber = row - 1
//                 };

//                 try
//                 {
//                     var accountName = worksheet.Cells[row, 1]?.Text?.Trim();
//                     var groupName = worksheet.Cells[row, 2]?.Text?.Trim();

//                     // Validate required fields
//                     if (string.IsNullOrEmpty(accountName))
//                     {
//                         importResult.Status = "Failed";
//                         importResult.ErrorMessage = "Account Name is required";
//                         result.Results.Add(importResult);
//                         result.FailedCount++;
//                         continue;
//                     }

//                     if (string.IsNullOrEmpty(groupName))
//                     {
//                         importResult.Status = "Failed";
//                         importResult.ErrorMessage = "Group Name is required";
//                         result.Results.Add(importResult);
//                         result.FailedCount++;
//                         continue;
//                     }

//                     // Check if group exists
//                     if (!accountGroups.TryGetValue(groupName, out var accountGroup))
//                     {
//                         importResult.Status = "Failed";
//                         importResult.ErrorMessage = $"Group '{groupName}' not found. Available groups: {string.Join(", ", accountGroups.Keys)}";
//                         result.Results.Add(importResult);
//                         result.FailedCount++;
//                         continue;
//                     }

//                     // Check for duplicate account in same company
//                     var existingAccount = await _context.Accounts
//                         .FirstOrDefaultAsync(a => a.CompanyId == companyId &&
//                                                   a.Name == accountName);

//                     if (existingAccount != null)
//                     {
//                         importResult.Status = "Skipped";
//                         importResult.ErrorMessage = "Account already exists";
//                         result.Results.Add(importResult);
//                         result.SkippedCount++;
//                         continue;
//                     }

//                     // Parse values
//                     var address = worksheet.Cells[row, 3]?.Text?.Trim();
//                     var ward = ParseInt(worksheet.Cells[row, 4]?.Text);
//                     var phone = worksheet.Cells[row, 5]?.Text?.Trim();
//                     var pan = worksheet.Cells[row, 6]?.Text?.Trim();
//                     var contactPerson = worksheet.Cells[row, 7]?.Text?.Trim();
//                     var email = worksheet.Cells[row, 8]?.Text?.Trim();
//                     var creditLimit = ParseDecimal(worksheet.Cells[row, 9]?.Text);
//                     var openingBalance = ParseDecimal(worksheet.Cells[row, 10]?.Text);
//                     var openingBalanceType = worksheet.Cells[row, 11]?.Text?.Trim()?.ToUpper();
//                     var isActive = ParseBool(worksheet.Cells[row, 12]?.Text);

//                     // Validate opening balance type
//                     if (!string.IsNullOrEmpty(openingBalanceType) && openingBalanceType != "Dr" && openingBalanceType != "Cr")
//                     {
//                         openingBalanceType = "Dr";
//                         warnings.Add($"Row {row - 1}: Invalid opening balance type, defaulting to 'Dr'");
//                     }

//                     // Validate email format
//                     if (!string.IsNullOrEmpty(email) && !IsValidEmail(email))
//                     {
//                         warnings.Add($"Row {row - 1}: Invalid email format for '{email}'");
//                     }

//                     // Validate PAN format (9 digits)
//                     if (!string.IsNullOrEmpty(pan) && !System.Text.RegularExpressions.Regex.IsMatch(pan, @"^\d{9}$"))
//                     {
//                         warnings.Add($"Row {row - 1}: PAN should be 9 digits");
//                     }

//                     // Generate unique number
//                     var uniqueNumber = await GenerateUniqueNumberAsync();

//                     // Create the account
//                     var account = new Account
//                     {
//                         Id = Guid.NewGuid(),
//                         Name = accountName,
//                         Address = address,
//                         Ward = ward,
//                         Phone = phone,
//                         Pan = pan,
//                         ContactPerson = contactPerson,
//                         Email = email,
//                         CreditLimit = creditLimit,
//                         UniqueNumber = uniqueNumber,
//                         AccountGroupsId = accountGroup.Id,
//                         CompanyId = companyId,
//                         OriginalFiscalYearId = fiscalYearId,
//                         OpeningBalanceType = openingBalanceType ?? "Dr",
//                         IsActive = isActive ?? true,
//                         Date = DateTime.UtcNow,
//                         NepaliDate = DateTime.UtcNow.ToString("yyyy-MM-dd"),
//                         CreatedAt = DateTime.UtcNow,
//                         UpdatedAt = DateTime.UtcNow
//                     };

//                     // Add opening balance if provided
//                     if (openingBalance.HasValue && openingBalance.Value > 0)
//                     {
//                         account.OpeningBalanceByFiscalYear = new List<OpeningBalanceByFiscalYear>
//                         {
//                             new OpeningBalanceByFiscalYear
//                             {
//                                 Id = Guid.NewGuid(),
//                                 AccountId = account.Id,
//                                 FiscalYearId = fiscalYearId,
//                                 CompanyId = companyId,
//                                 Amount = openingBalance.Value,
//                                 Type = openingBalanceType ?? "Dr",
//                                 Date = DateTime.UtcNow,
//                                 NepaliDate = DateTime.UtcNow.ToString("yyyy-MM-dd"),
//                             }
//                         };
//                     }

//                     _context.Accounts.Add(account);
//                     await _context.SaveChangesAsync();

//                     importResult.Status = "Success";
//                     importResult.AccountId = account.Id.ToString();
//                     result.SuccessCount++;
//                 }
//                 catch (Exception ex)
//                 {
//                     _logger.LogError(ex, $"Error processing row {row}");
//                     importResult.Status = "Failed";
//                     importResult.ErrorMessage = ex.Message;
//                     result.FailedCount++;
//                 }

//                 result.Results.Add(importResult);
//                 result.TotalProcessed++;
//             }

//             result.Errors = errors;
//             result.Warnings = warnings;

//             return result;
//         }

//         private async Task<int> GenerateUniqueNumberAsync()
//         {
//             int uniqueNumber;
//             bool exists;
//             do
//             {
//                 uniqueNumber = new Random().Next(1000, 9999);
//                 exists = await _context.Accounts.AnyAsync(a => a.UniqueNumber == uniqueNumber);
//             } while (exists);

//             return uniqueNumber;
//         }

//         private int? ParseInt(string? value)
//         {
//             if (string.IsNullOrEmpty(value)) return null;
//             if (int.TryParse(value, out int result)) return result;
//             return null;
//         }

//         private decimal? ParseDecimal(string? value)
//         {
//             if (string.IsNullOrEmpty(value)) return null;
//             if (decimal.TryParse(value, out decimal result)) return result;
//             return null;
//         }

//         private bool? ParseBool(string? value)
//         {
//             if (string.IsNullOrEmpty(value)) return null;
//             if (bool.TryParse(value, out bool result)) return result;
//             if (value.Equals("Yes", StringComparison.OrdinalIgnoreCase)) return true;
//             if (value.Equals("No", StringComparison.OrdinalIgnoreCase)) return false;
//             return null;
//         }

//         private bool IsValidEmail(string email)
//         {
//             try
//             {
//                 var addr = new System.Net.Mail.MailAddress(email);
//                 return addr.Address == email;
//             }
//             catch
//             {
//                 return false;
//             }
//         }
//     }
// }

//---------------------------------------------------end

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OfficeOpenXml;
using SkyForge.Data;
using SkyForge.Dto.AccountDto;
using SkyForge.Models.AccountModel;
using SkyForge.Models.AccountGroupModel;
using SkyForge.Models.Shared;
using System.Security.Claims;
using SkyForge.Models.CompanyModel;

namespace SkyForge.Controllers.Retailer
{
    [ApiController]
    [Route("api/retailer")]
    [Authorize]
    public class AccountImportController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<AccountImportController> _logger;
        public AccountImportController(
            ApplicationDbContext context,
            ILogger<AccountImportController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpGet("accounts-import")]
        public async Task<IActionResult> GetAccountsImportData()
        {
            try
            {
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out _))
                {
                    return Unauthorized(new { success = false, error = "Invalid user token" });
                }

                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new { success = false, error = "No company selected" });
                }

                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new { success = false, error = "Access restricted to retailer accounts" });
                }

                // Get company
                var company = await _context.Companies
                    .FirstOrDefaultAsync(c => c.Id == companyIdGuid);

                if (company == null)
                {
                    return NotFound(new { success = false, error = "Company not found" });
                }

                // Get current fiscal year
                var currentFiscalYear = await _context.FiscalYears
                    .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

                if (currentFiscalYear == null)
                {
                    return BadRequest(new { success = false, error = "No active fiscal year found" });
                }

                // Get account groups
                var accountGroups = await _context.AccountGroups
                    .Where(g => g.CompanyId == companyIdGuid)
                    .Select(g => new { g.Id, g.Name })
                    .ToListAsync();

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        company = new
                        {
                            id = company.Id,
                            name = company.Name,
                            renewalDate = company.RenewalDate,
                            dateFormat = company.DateFormat
                        },
                        currentCompany = new
                        {
                            id = company.Id,
                            name = company.Name,
                            renewalDate = company.RenewalDate,
                            dateFormat = company.DateFormat
                        },
                        currentCompanyName = company.Name,
                        currentFiscalYear = new
                        {
                            id = currentFiscalYear.Id,
                            name = currentFiscalYear.Name,
                            startDate = currentFiscalYear.StartDate,
                            endDate = currentFiscalYear.EndDate,
                            dateFormat = currentFiscalYear.DateFormat,
                            isActive = currentFiscalYear.IsActive
                        },
                        fiscalYear = currentFiscalYear.Id,
                        companyGroups = accountGroups.Select(g => new { id = g.Id, name = g.Name }),
                        user = new
                        {
                            preferences = new { theme = "light" },
                            isAdminOrSupervisor = User.IsInRole("Admin") || User.IsInRole("Supervisor"),
                            role = User.FindFirst(ClaimTypes.Role)?.Value ?? "User",
                            isAdmin = User.IsInRole("Admin")
                        }
                    },
                    metadata = new
                    {
                        title = "Import Accounts",
                        timestamp = DateTime.UtcNow,
                        tradeType = tradeTypeClaim
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetAccountsImportData");
                return StatusCode(500, new
                {
                    success = false,
                    error = "SERVER_ERROR",
                    message = "Failed to load import page data.",
                    code = "LOAD_ERROR",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        [HttpPost("accounts-import")]
        public async Task<IActionResult> ImportAccounts([FromForm] IFormFile excelFile)
        {
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
                    return StatusCode(403, new { success = false, error = "Access restricted to retailer accounts" });
                }

                // Validate file
                if (excelFile == null || excelFile.Length == 0)
                {
                    return BadRequest(new AccountImportResponseDto
                    {
                        Success = false,
                        Message = "No file uploaded",
                        Code = "NO_FILE"
                    });
                }

                if (excelFile.Length > 5 * 1024 * 1024) // 5MB limit
                {
                    return BadRequest(new AccountImportResponseDto
                    {
                        Success = false,
                        Message = "File size exceeds 5MB limit",
                        Code = "FILE_TOO_LARGE"
                    });
                }

                var extension = Path.GetExtension(excelFile.FileName).ToLower();
                if (extension != ".xlsx" && extension != ".xls")
                {
                    return BadRequest(new AccountImportResponseDto
                    {
                        Success = false,
                        Message = "Invalid file format. Please upload .xlsx or .xls file",
                        Code = "INVALID_FORMAT"
                    });
                }

                // Get fiscal year
                var currentFiscalYear = await _context.FiscalYears
                    .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

                if (currentFiscalYear == null)
                {
                    return BadRequest(new AccountImportResponseDto
                    {
                        Success = false,
                        Message = "No active fiscal year found",
                        Code = "FISCAL_YEAR_MISSING"
                    });
                }

                // Process the file
                var result = await ProcessAccountImport(excelFile, companyIdGuid, currentFiscalYear.Id, userIdGuid);

                return Ok(new AccountImportResponseDto
                {
                    Success = result.SuccessCount > 0,
                    Message = $"Imported {result.SuccessCount} accounts successfully",
                    Warning = result.Warnings.Any() ? string.Join("; ", result.Warnings) : null,
                    Code = result.SuccessCount > 0 ? "IMPORT_SUCCESS" : "IMPORT_FAILED",
                    Data = result
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in ImportAccounts");
                return StatusCode(500, new AccountImportResponseDto
                {
                    Success = false,
                    Message = "Server error during import",
                    Code = "SERVER_ERROR",
                    Data = new AccountImportResultData
                    {
                        Errors = new List<string> { ex.Message }
                    }
                });
            }
        }

        [HttpGet("accounts-import-template")]
        public async Task<IActionResult> DownloadTemplate()
        {
            try
            {
                // ✅ License is already set in the static constructor
                // We don't need to set it again here

                using var package = new ExcelPackage();
                var worksheet = package.Workbook.Worksheets.Add("Accounts Template");

                // Headers
                var headers = new[]
                {
                    "Account Name*", "Group Name*", "Address", "Ward", "Phone",
                    "PAN", "Contact Person", "Email", "Credit Limit",
                    "Opening Balance", "Opening Balance Type (Dr/Cr)", "Is Active (Yes/No)"
                };

                for (int i = 0; i < headers.Length; i++)
                {
                    worksheet.Cells[1, i + 1].Value = headers[i];
                    worksheet.Cells[1, i + 1].Style.Font.Bold = true;
                    worksheet.Cells[1, i + 1].Style.Fill.PatternType = OfficeOpenXml.Style.ExcelFillStyle.Solid;
                    worksheet.Cells[1, i + 1].Style.Fill.BackgroundColor.SetColor(System.Drawing.Color.LightGray);
                    worksheet.Cells[1, i + 1].Style.Border.BorderAround(OfficeOpenXml.Style.ExcelBorderStyle.Thin);
                }

                // Sample data
                var sampleData = new object[]
                {
                    "ABC Traders", "Sundry Debtors", "Kathmandu", 1, "9841234567",
                    "123456789", "Ram Sharma", "ram@abc.com", 100000,
                    5000, "Dr", "Yes"
                };

                for (int i = 0; i < sampleData.Length; i++)
                {
                    worksheet.Cells[2, i + 1].Value = sampleData[i];
                    worksheet.Cells[2, i + 1].Style.Border.BorderAround(OfficeOpenXml.Style.ExcelBorderStyle.Thin);
                }

                // Set column widths
                worksheet.Column(1).Width = 25;
                worksheet.Column(2).Width = 25;
                worksheet.Column(3).Width = 30;
                worksheet.Column(4).Width = 10;
                worksheet.Column(5).Width = 15;
                worksheet.Column(6).Width = 15;
                worksheet.Column(7).Width = 20;
                worksheet.Column(8).Width = 30;
                worksheet.Column(9).Width = 15;
                worksheet.Column(10).Width = 15;
                worksheet.Column(11).Width = 20;
                worksheet.Column(12).Width = 15;

                // Add instruction sheet
                var instructionSheet = package.Workbook.Worksheets.Add("Instructions");
                instructionSheet.Cells[1, 1].Value = "Instructions for Importing Accounts";
                instructionSheet.Cells[1, 1].Style.Font.Bold = true;
                instructionSheet.Cells[1, 1].Style.Font.Size = 14;

                var instructions = new[]
                {
                    "1. Do not modify or delete the header row (Row 1)",
                    "2. Enter your data starting from Row 2",
                    "3. Required fields: Account Name and Group Name",
                    "4. Group Name must exist in the system",
                    "5. Opening Balance Type must be either 'Dr' or 'Cr'",
                    "6. Is Active must be 'Yes' or 'No'",
                    "7. Maximum file size: 5MB",
                    "8. Save the file in .xlsx format before uploading"
                };

                for (int i = 0; i < instructions.Length; i++)
                {
                    instructionSheet.Cells[i + 3, 1].Value = instructions[i];
                }
                instructionSheet.Column(1).Width = 60;

                var stream = new MemoryStream();
                package.SaveAs(stream);
                stream.Position = 0;

                _logger.LogInformation("Template downloaded successfully");

                return File(stream, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Accounts-Import-Template.xlsx");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error downloading template");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Failed to generate template. Please try again.",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // private async Task<AccountImportResultData> ProcessAccountImport(
        //             IFormFile file,
        //             Guid companyId,
        //             Guid fiscalYearId,
        //             Guid userId)
        // {
        //     var result = new AccountImportResultData();

        //     // ✅ Get fiscal year details FIRST
        //     var fiscalYear = await _context.FiscalYears
        //         .FirstOrDefaultAsync(f => f.Id == fiscalYearId && f.CompanyId == companyId);

        //     if (fiscalYear == null)
        //     {
        //         result.Errors.Add("Fiscal year not found");
        //         return result;
        //     }

        //     // ✅ Get fiscal year start dates
        //     var fiscalYearStartDate = fiscalYear.StartDate ?? DateTime.UtcNow;
        //     var fiscalYearStartDateNepali = fiscalYear.StartDateNepali ?? DateTime.UtcNow.ToString("yyyy-MM-dd");

        //     var accountGroups = await _context.AccountGroups
        //         .Where(g => g.CompanyId == companyId)
        //         .ToDictionaryAsync(g => g.Name, g => g);

        //     using var stream = new MemoryStream();
        //     await file.CopyToAsync(stream);
        //     stream.Position = 0;

        //     using var package = new ExcelPackage(stream);
        //     var worksheet = package.Workbook.Worksheets[0];

        //     if (worksheet == null || worksheet.Dimension == null)
        //     {
        //         result.Errors.Add("The uploaded file is empty or invalid");
        //         return result;
        //     }

        //     int rowCount = worksheet.Dimension.Rows;
        //     var errors = new List<string>();
        //     var warnings = new List<string>();

        //     // Process rows (skip header row)
        //     for (int row = 2; row <= rowCount; row++)
        //     {
        //         var importResult = new AccountImportResult
        //         {
        //             RowNumber = row - 1
        //         };

        //         try
        //         {
        //             var accountName = worksheet.Cells[row, 1]?.Text?.Trim();
        //             var groupName = worksheet.Cells[row, 2]?.Text?.Trim();

        //             // Validate required fields
        //             if (string.IsNullOrEmpty(accountName))
        //             {
        //                 importResult.Status = "Failed";
        //                 importResult.ErrorMessage = "Account Name is required";
        //                 result.Results.Add(importResult);
        //                 result.FailedCount++;
        //                 continue;
        //             }

        //             if (string.IsNullOrEmpty(groupName))
        //             {
        //                 importResult.Status = "Failed";
        //                 importResult.ErrorMessage = "Group Name is required";
        //                 result.Results.Add(importResult);
        //                 result.FailedCount++;
        //                 continue;
        //             }

        //             // Check if group exists
        //             if (!accountGroups.TryGetValue(groupName, out var accountGroup))
        //             {
        //                 importResult.Status = "Failed";
        //                 importResult.ErrorMessage = $"Group '{groupName}' not found. Available groups: {string.Join(", ", accountGroups.Keys)}";
        //                 result.Results.Add(importResult);
        //                 result.FailedCount++;
        //                 continue;
        //             }

        //             // Check for duplicate account in same company
        //             var existingAccount = await _context.Accounts
        //                 .FirstOrDefaultAsync(a => a.CompanyId == companyId &&
        //                                           a.Name == accountName);

        //             if (existingAccount != null)
        //             {
        //                 importResult.Status = "Skipped";
        //                 importResult.ErrorMessage = "Account already exists";
        //                 result.Results.Add(importResult);
        //                 result.SkippedCount++;
        //                 continue;
        //             }

        //             // Parse values
        //             var address = worksheet.Cells[row, 3]?.Text?.Trim();
        //             var ward = ParseInt(worksheet.Cells[row, 4]?.Text);
        //             var phone = worksheet.Cells[row, 5]?.Text?.Trim();
        //             var pan = worksheet.Cells[row, 6]?.Text?.Trim();
        //             var contactPerson = worksheet.Cells[row, 7]?.Text?.Trim();
        //             var email = worksheet.Cells[row, 8]?.Text?.Trim();
        //             var creditLimit = ParseDecimal(worksheet.Cells[row, 9]?.Text);
        //             var openingBalance = ParseDecimal(worksheet.Cells[row, 10]?.Text);
        //             var openingBalanceType = worksheet.Cells[row, 11]?.Text?.Trim()?.ToUpper();
        //             var isActive = ParseBool(worksheet.Cells[row, 12]?.Text);

        //             // Validate opening balance type
        //             if (!string.IsNullOrEmpty(openingBalanceType) && openingBalanceType != "Dr" && openingBalanceType != "Cr")
        //             {
        //                 openingBalanceType = "Dr";
        //                 warnings.Add($"Row {row - 1}: Invalid opening balance type, defaulting to 'Dr'");
        //             }

        //             // Validate email format
        //             if (!string.IsNullOrEmpty(email) && !IsValidEmail(email))
        //             {
        //                 warnings.Add($"Row {row - 1}: Invalid email format for '{email}'");
        //             }

        //             // Validate PAN format (9 digits)
        //             if (!string.IsNullOrEmpty(pan) && !System.Text.RegularExpressions.Regex.IsMatch(pan, @"^\d{9}$"))
        //             {
        //                 warnings.Add($"Row {row - 1}: PAN should be 9 digits");
        //             }

        //             // Generate unique number
        //             var uniqueNumber = await GenerateUniqueNumberAsync();

        //             // ✅ Create the account with fiscal year start dates
        //             var account = new Account
        //             {
        //                 Id = Guid.NewGuid(),
        //                 Name = accountName,
        //                 Address = address,
        //                 Ward = ward,
        //                 Phone = phone,
        //                 Pan = pan,
        //                 ContactPerson = contactPerson,
        //                 Email = email,
        //                 CreditLimit = creditLimit,
        //                 UniqueNumber = uniqueNumber,
        //                 AccountGroupsId = accountGroup.Id,
        //                 CompanyId = companyId,
        //                 OriginalFiscalYearId = fiscalYearId,
        //                 OpeningBalanceType = openingBalanceType ?? "Dr",
        //                 IsActive = isActive ?? true,

        //                 // ✅ Use fiscal year start dates instead of current date
        //                 Date = fiscalYearStartDate,
        //                 NepaliDate = fiscalYearStartDateNepali,

        //                 CreatedAt = DateTime.UtcNow,
        //                 UpdatedAt = DateTime.UtcNow
        //             };

        //             // ✅ Add opening balance with fiscal year start dates
        //             if (openingBalance.HasValue && openingBalance.Value > 0)
        //             {
        //                 account.OpeningBalanceByFiscalYear = new List<OpeningBalanceByFiscalYear>
        //                 {
        //                     new OpeningBalanceByFiscalYear
        //                     {
        //                         Id = Guid.NewGuid(),
        //                         AccountId = account.Id,
        //                         FiscalYearId = fiscalYearId,
        //                         CompanyId = companyId,
        //                         Amount = openingBalance.Value,
        //                         Type = openingBalanceType ?? "Dr",

        //                         // ✅ Use fiscal year start dates for opening balance
        //                         Date = fiscalYearStartDate,
        //                         NepaliDate = fiscalYearStartDateNepali,
        //                     }
        //                 };
        //             }

        //             _context.Accounts.Add(account);
        //             await _context.SaveChangesAsync();

        //             importResult.Status = "Success";
        //             importResult.AccountId = account.Id.ToString();
        //             result.SuccessCount++;
        //         }
        //         catch (Exception ex)
        //         {
        //             _logger.LogError(ex, $"Error processing row {row}");
        //             importResult.Status = "Failed";
        //             importResult.ErrorMessage = ex.Message;
        //             result.FailedCount++;
        //         }

        //         result.Results.Add(importResult);
        //         result.TotalProcessed++;
        //     }

        //     result.Errors = errors;
        //     result.Warnings = warnings;

        //     return result;
        // }

        private async Task<AccountImportResultData> ProcessAccountImport(
            IFormFile file,
            Guid companyId,
            Guid fiscalYearId,
            Guid userId)
        {
            var result = new AccountImportResultData();

            // ✅ Get fiscal year details FIRST
            var fiscalYear = await _context.FiscalYears
                .FirstOrDefaultAsync(f => f.Id == fiscalYearId && f.CompanyId == companyId);

            if (fiscalYear == null)
            {
                result.Errors.Add("Fiscal year not found");
                return result;
            }

            // ✅ Get fiscal year start dates
            var fiscalYearStartDate = fiscalYear.StartDate ?? DateTime.UtcNow;
            var fiscalYearStartDateNepali = fiscalYear.StartDateNepali ?? DateTime.UtcNow.ToString("yyyy-MM-dd");

            var accountGroups = await _context.AccountGroups
                .Where(g => g.CompanyId == companyId)
                .ToDictionaryAsync(g => g.Name, g => g);

            using var stream = new MemoryStream();
            await file.CopyToAsync(stream);
            stream.Position = 0;

            using var package = new ExcelPackage(stream);
            var worksheet = package.Workbook.Worksheets[0];

            if (worksheet == null || worksheet.Dimension == null)
            {
                result.Errors.Add("The uploaded file is empty or invalid");
                return result;
            }

            int rowCount = worksheet.Dimension.Rows;
            var errors = new List<string>();
            var warnings = new List<string>();

            // Process rows (skip header row)
            for (int row = 2; row <= rowCount; row++)
            {
                var importResult = new AccountImportResult
                {
                    RowNumber = row - 1
                };

                try
                {
                    var accountName = worksheet.Cells[row, 1]?.Text?.Trim();
                    var groupName = worksheet.Cells[row, 2]?.Text?.Trim();

                    // Validate required fields
                    if (string.IsNullOrEmpty(accountName))
                    {
                        importResult.Status = "Failed";
                        importResult.ErrorMessage = "Account Name is required";
                        result.Results.Add(importResult);
                        result.FailedCount++;
                        continue;
                    }

                    if (string.IsNullOrEmpty(groupName))
                    {
                        importResult.Status = "Failed";
                        importResult.ErrorMessage = "Group Name is required";
                        result.Results.Add(importResult);
                        result.FailedCount++;
                        continue;
                    }

                    // Check if group exists
                    if (!accountGroups.TryGetValue(groupName, out var accountGroup))
                    {
                        importResult.Status = "Failed";
                        importResult.ErrorMessage = $"Group '{groupName}' not found. Available groups: {string.Join(", ", accountGroups.Keys)}";
                        result.Results.Add(importResult);
                        result.FailedCount++;
                        continue;
                    }

                    // Check for duplicate account in same company
                    var existingAccount = await _context.Accounts
                        .FirstOrDefaultAsync(a => a.CompanyId == companyId &&
                                                  a.Name == accountName);

                    if (existingAccount != null)
                    {
                        importResult.Status = "Skipped";
                        importResult.ErrorMessage = "Account already exists";
                        result.Results.Add(importResult);
                        result.SkippedCount++;
                        continue;
                    }

                    // Parse values
                    var address = worksheet.Cells[row, 3]?.Text?.Trim();
                    var ward = ParseInt(worksheet.Cells[row, 4]?.Text);
                    var phone = worksheet.Cells[row, 5]?.Text?.Trim();
                    var pan = worksheet.Cells[row, 6]?.Text?.Trim();
                    var contactPerson = worksheet.Cells[row, 7]?.Text?.Trim();
                    var email = worksheet.Cells[row, 8]?.Text?.Trim();
                    var creditLimit = ParseDecimal(worksheet.Cells[row, 9]?.Text);
                    var openingBalanceAmount = ParseDecimal(worksheet.Cells[row, 10]?.Text);
                    var openingBalanceType = worksheet.Cells[row, 11]?.Text?.Trim()?.ToUpper();
                    var isActive = ParseBool(worksheet.Cells[row, 12]?.Text);

                    // Validate opening balance type
                    if (!string.IsNullOrEmpty(openingBalanceType) && openingBalanceType != "Dr" && openingBalanceType != "Cr")
                    {
                        openingBalanceType = "Dr";
                        warnings.Add($"Row {row - 1}: Invalid opening balance type, defaulting to 'Dr'");
                    }

                    // Validate email format
                    if (!string.IsNullOrEmpty(email) && !IsValidEmail(email))
                    {
                        warnings.Add($"Row {row - 1}: Invalid email format for '{email}'");
                    }

                    // Validate PAN format (9 digits)
                    if (!string.IsNullOrEmpty(pan) && !System.Text.RegularExpressions.Regex.IsMatch(pan, @"^\d{9}$"))
                    {
                        warnings.Add($"Row {row - 1}: PAN should be 9 digits");
                    }

                    // Generate unique number
                    var uniqueNumber = await GenerateUniqueNumberAsync();

                    // ✅ Create the account with fiscal year start dates
                    var account = new Account
                    {
                        Id = Guid.NewGuid(),
                        Name = accountName,
                        Address = address,
                        Ward = ward,
                        Phone = phone,
                        Pan = pan,
                        ContactPerson = contactPerson,
                        Email = email,
                        CreditLimit = creditLimit,
                        UniqueNumber = uniqueNumber,
                        AccountGroupsId = accountGroup.Id,
                        CompanyId = companyId,
                        OriginalFiscalYearId = fiscalYearId,
                        OpeningBalanceType = openingBalanceType ?? "Dr",
                        IsActive = isActive ?? true,

                        // Use fiscal year start dates
                        Date = fiscalYearStartDate,
                        NepaliDate = fiscalYearStartDateNepali,

                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };

                    // ✅ Add opening balances if provided
                    if (openingBalanceAmount.HasValue && openingBalanceAmount.Value > 0)
                    {
                        // 1. OpeningBalanceByFiscalYear (fiscal year specific)
                        account.OpeningBalanceByFiscalYear = new List<OpeningBalanceByFiscalYear>
                {
                    new OpeningBalanceByFiscalYear
                    {
                        Id = Guid.NewGuid(),
                        AccountId = account.Id,
                        FiscalYearId = fiscalYearId,
                        CompanyId = companyId,
                        Amount = openingBalanceAmount.Value,
                        Type = openingBalanceType ?? "Dr",
                        Date = fiscalYearStartDate,
                        NepaliDate = fiscalYearStartDateNepali,
                    }
                };

                        // 2. InitialOpeningBalance (master initial balance)
                        account.InitialOpeningBalance = new InitialOpeningBalance
                        {
                            Id = Guid.NewGuid(),
                            AccountId = account.Id,
                            CompanyId = companyId,
                            InitialFiscalYearId = fiscalYearId,
                            Amount = openingBalanceAmount.Value,
                            Type = openingBalanceType ?? "Dr",
                            Date = fiscalYearStartDate,
                            NepaliDate = fiscalYearStartDateNepali,
                        };

                        // 3. OpeningBalance (current/master opening balance)
                        account.OpeningBalance = new OpeningBalance
                        {
                            Id = Guid.NewGuid(),
                            AccountId = account.Id,
                            CompanyId = companyId,
                            FiscalYearId = fiscalYearId,
                            Amount = openingBalanceAmount.Value,
                            Type = openingBalanceType ?? "Dr",
                            Date = fiscalYearStartDate,
                            NepaliDate = fiscalYearStartDateNepali,
                        };
                    }

                    _context.Accounts.Add(account);
                    await _context.SaveChangesAsync();

                    importResult.Status = "Success";
                    importResult.AccountId = account.Id.ToString();
                    result.SuccessCount++;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, $"Error processing row {row}");
                    importResult.Status = "Failed";
                    importResult.ErrorMessage = ex.Message;
                    result.FailedCount++;
                }

                result.Results.Add(importResult);
                result.TotalProcessed++;
            }

            result.Errors = errors;
            result.Warnings = warnings;

            return result;
        }

        private async Task<int> GenerateUniqueNumberAsync()
        {
            int uniqueNumber;
            bool exists;
            do
            {
                uniqueNumber = new Random().Next(1000, 9999);
                exists = await _context.Accounts.AnyAsync(a => a.UniqueNumber == uniqueNumber);
            } while (exists);

            return uniqueNumber;
        }

        private int? ParseInt(string? value)
        {
            if (string.IsNullOrEmpty(value)) return null;
            if (int.TryParse(value, out int result)) return result;
            return null;
        }

        private decimal? ParseDecimal(string? value)
        {
            if (string.IsNullOrEmpty(value)) return null;
            if (decimal.TryParse(value, out decimal result)) return result;
            return null;
        }

        private bool? ParseBool(string? value)
        {
            if (string.IsNullOrEmpty(value)) return null;
            if (bool.TryParse(value, out bool result)) return result;
            if (value.Equals("Yes", StringComparison.OrdinalIgnoreCase)) return true;
            if (value.Equals("No", StringComparison.OrdinalIgnoreCase)) return false;
            return null;
        }

        private bool IsValidEmail(string email)
        {
            try
            {
                var addr = new System.Net.Mail.MailAddress(email);
                return addr.Address == email;
            }
            catch
            {
                return false;
            }
        }
    }
}


