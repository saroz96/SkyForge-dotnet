// Controllers/Retailer/ItemImportController.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OfficeOpenXml;
using SkyForge.Data;
using SkyForge.Dto.RetailerDto.ItemDto;
using SkyForge.Models.Shared;
using SkyForge.Models.Retailer.Items;
using SkyForge.Models.Retailer.CategoryModel;
using SkyForge.Models.Retailer.ItemCompanyModel;
using SkyForge.Models.Retailer.MainUnitModel;
using SkyForge.Models.UnitModel;
using System.Security.Claims;
using SkyForge.Services.Retailer.ItemServices;
using SkyForge.Models.CompanyModel;

namespace SkyForge.Controllers.Retailer
{
    [ApiController]
    [Route("api/retailer")]
    [Authorize]
    public class ItemImportController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<ItemImportController> _logger;
        private readonly IItemService _itemService;

        public ItemImportController(
            ApplicationDbContext context,
            ILogger<ItemImportController> logger,
            IItemService itemService)
        {
            _context = context;
            _logger = logger;
            _itemService = itemService;
        }

        [HttpGet("items-import")]
        public async Task<IActionResult> GetItemsImportData()
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

                // Get categories
                var categories = await _context.Categories
                    .Where(c => c.CompanyId == companyIdGuid)
                    .Select(c => new { c.Id, c.Name })
                    .ToListAsync();

                // Get item companies
                var itemCompanies = await _context.ItemCompanies
                    .Where(ic => ic.CompanyId == companyIdGuid)
                    .Select(ic => new { ic.Id, ic.Name })
                    .ToListAsync();

                // Get units
                var units = await _context.Units
                    .Where(u => u.CompanyId == companyIdGuid)
                    .Select(u => new { u.Id, u.Name })
                    .ToListAsync();

                // Get main units
                var mainUnits = await _context.MainUnits
                    .Where(mu => mu.CompanyId == companyIdGuid)
                    .Select(mu => new { mu.Id, mu.Name })
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
                        categories = categories,
                        itemCompanies = itemCompanies,
                        units = units,
                        mainUnits = mainUnits,
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
                        title = "Import Items",
                        timestamp = DateTime.UtcNow,
                        tradeType = tradeTypeClaim
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetItemsImportData");
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

        [HttpPost("items-import")]
        public async Task<IActionResult> ImportItems([FromForm] IFormFile excelFile)
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
                    return BadRequest(new ItemImportResponseDto
                    {
                        Success = false,
                        Message = "No file uploaded",
                        Code = "NO_FILE"
                    });
                }

                if (excelFile.Length > 5 * 1024 * 1024) // 5MB limit
                {
                    return BadRequest(new ItemImportResponseDto
                    {
                        Success = false,
                        Message = "File size exceeds 5MB limit",
                        Code = "FILE_TOO_LARGE"
                    });
                }

                var extension = Path.GetExtension(excelFile.FileName).ToLower();
                if (extension != ".xlsx" && extension != ".xls")
                {
                    return BadRequest(new ItemImportResponseDto
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
                    return BadRequest(new ItemImportResponseDto
                    {
                        Success = false,
                        Message = "No active fiscal year found",
                        Code = "FISCAL_YEAR_MISSING"
                    });
                }

                // Process the file
                var result = await ProcessItemImport(excelFile, companyIdGuid, currentFiscalYear.Id, userIdGuid);

                return Ok(new ItemImportResponseDto
                {
                    Success = result.SuccessCount > 0,
                    Message = $"Imported {result.SuccessCount} items successfully",
                    Warning = result.Warnings.Any() ? string.Join("; ", result.Warnings) : null,
                    Code = result.SuccessCount > 0 ? "IMPORT_SUCCESS" : "IMPORT_FAILED",
                    Data = result
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in ImportItems");
                return StatusCode(500, new ItemImportResponseDto
                {
                    Success = false,
                    Message = "Server error during import",
                    Code = "SERVER_ERROR",
                    Data = new ItemImportResultData
                    {
                        Errors = new List<string> { ex.Message }
                    }
                });
            }
        }

        [HttpGet("items-import-template")]
        public async Task<IActionResult> DownloadTemplate()
        {
            try
            {
                // ✅ License is already set in the static constructor
                // We don't need to set it again here

                using var package = new ExcelPackage();
                var worksheet = package.Workbook.Worksheets.Add("Items Template");

                // Headers
                var headers = new[]
                {
            "Item Name*", "HSCode", "Category Name*", "Items Company Name*",
            "Price", "Purchase Price", "Main Unit Pu Price", "Main Unit Name",
            "WS Unit", "Unit Name*", "VAT Status*", "Opening Stock",
            "Min Stock", "Max Stock", "Reorder Level", "Status"
        };

                for (int i = 0; i < headers.Length; i++)
                {
                    worksheet.Cells[1, i + 1].Value = headers[i];
                    worksheet.Cells[1, i + 1].Style.Font.Bold = true;
                    worksheet.Cells[1, i + 1].Style.Fill.PatternType = OfficeOpenXml.Style.ExcelFillStyle.Solid;
                    worksheet.Cells[1, i + 1].Style.Fill.BackgroundColor.SetColor(System.Drawing.Color.LightGray);
                    worksheet.Cells[1, i + 1].Style.Border.BorderAround(OfficeOpenXml.Style.ExcelBorderStyle.Thin);
                }

                // Sample data - Row 1: Vatable item
                var sampleData1 = new object[]
                {
            "Laptop Dell", "123456", "General", "General",
            75000, 65000, 65000, "Pcs",
            1, "Pcs", "13", 50,
            10, 200, 20, "active"
                };

                // Sample data - Row 2: VAT Exempt item
                var sampleData2 = new object[]
                {
            "Rice 5kg", "789012", "General", "General",
            500, 450, 450, "Pcs",
            5, "Pcs", "vatExempt", 100,
            20, 500, 30, "active"
                };

                // Add sample rows
                for (int i = 0; i < sampleData1.Length; i++)
                {
                    worksheet.Cells[2, i + 1].Value = sampleData1[i];
                    worksheet.Cells[2, i + 1].Style.Border.BorderAround(OfficeOpenXml.Style.ExcelBorderStyle.Thin);
                }

                for (int i = 0; i < sampleData2.Length; i++)
                {
                    worksheet.Cells[3, i + 1].Value = sampleData2[i];
                    worksheet.Cells[3, i + 1].Style.Border.BorderAround(OfficeOpenXml.Style.ExcelBorderStyle.Thin);
                }

                // Set column widths
                worksheet.Column(1).Width = 25;  // Item Name
                worksheet.Column(2).Width = 15;  // HSCode
                worksheet.Column(3).Width = 25;  // Category Name
                worksheet.Column(4).Width = 25;  // Items Company Name
                worksheet.Column(5).Width = 15;  // Price
                worksheet.Column(6).Width = 15;  // Purchase Price
                worksheet.Column(7).Width = 15;  // Main Unit Pu Price
                worksheet.Column(8).Width = 20;  // Main Unit Name
                worksheet.Column(9).Width = 10;  // WS Unit
                worksheet.Column(10).Width = 15; // Unit Name
                worksheet.Column(11).Width = 15; // VAT Status
                worksheet.Column(12).Width = 12; // Opening Stock
                worksheet.Column(13).Width = 12; // Min Stock
                worksheet.Column(14).Width = 12; // Max Stock
                worksheet.Column(15).Width = 12; // Reorder Level
                worksheet.Column(16).Width = 15; // Status

                // Add instruction sheet
                var instructionSheet = package.Workbook.Worksheets.Add("Instructions");
                instructionSheet.Cells[1, 1].Value = "Instructions for Importing Items";
                instructionSheet.Cells[1, 1].Style.Font.Bold = true;
                instructionSheet.Cells[1, 1].Style.Font.Size = 14;

                var instructions = new[]
                {
            "1. Do not modify or delete the header row (Row 1)",
            "2. Enter your data starting from Row 2",
            "3. Required fields: Item Name, Category Name, Items Company Name, Unit Name, VAT Status",
            "4. Category Name must exist in the system",
            "5. Items Company Name must exist in the system",
            "6. Unit Name must exist in the system",
            "7. Main Unit Name must exist in the system (if provided)",
            "8. VAT Status must be: 'vatable' (13% VAT) or 'vatExempt' (0% VAT)",
            "9. Status must be: 'active' or 'inactive' (defaults to 'active')",
            "10. Maximum file size: 5MB",
            "11. Save the file in .xlsx format before uploading",
            "12. Sample data provided: Row 2 shows Vatable item, Row 3 shows VAT Exempt item"
        };

                for (int i = 0; i < instructions.Length; i++)
                {
                    instructionSheet.Cells[i + 3, 1].Value = instructions[i];
                }
                instructionSheet.Column(1).Width = 70;

                var stream = new MemoryStream();
                package.SaveAs(stream);
                stream.Position = 0;

                _logger.LogInformation("Item template downloaded successfully");

                return File(stream, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Items-Import-Template.xlsx");
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


        // private async Task<ItemImportResultData> ProcessItemImport(
        //     IFormFile file,
        //     Guid companyId,
        //     Guid fiscalYearId,
        //     Guid userId)
        // {
        //     var result = new ItemImportResultData();

        //     // Get fiscal year details
        //     var fiscalYear = await _context.FiscalYears
        //         .FirstOrDefaultAsync(f => f.Id == fiscalYearId && f.CompanyId == companyId);

        //     if (fiscalYear == null)
        //     {
        //         result.Errors.Add("Fiscal year not found");
        //         return result;
        //     }

        //     // Get all reference data with case-insensitive comparison
        //     var categories = await _context.Categories
        //         .Where(c => c.CompanyId == companyId)
        //         .ToDictionaryAsync(c => c.Name.ToLower(), c => c);

        //     var itemCompanies = await _context.ItemCompanies
        //         .Where(ic => ic.CompanyId == companyId)
        //         .ToDictionaryAsync(ic => ic.Name.ToLower(), ic => ic);

        //     var units = await _context.Units
        //         .Where(u => u.CompanyId == companyId)
        //         .ToDictionaryAsync(u => u.Name.ToLower(), u => u);

        //     var mainUnits = await _context.MainUnits
        //         .Where(mu => mu.CompanyId == companyId)
        //         .ToDictionaryAsync(mu => mu.Name.ToLower(), mu => mu);

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
        //         var importResult = new ItemImportResult
        //         {
        //             RowNumber = row - 1
        //         };

        //         try
        //         {
        //             var itemName = worksheet.Cells[row, 1]?.Text?.Trim();
        //             var hscode = worksheet.Cells[row, 2]?.Text?.Trim();
        //             var categoryName = worksheet.Cells[row, 3]?.Text?.Trim();
        //             var itemsCompanyName = worksheet.Cells[row, 4]?.Text?.Trim();
        //             var price = ParseDecimal(worksheet.Cells[row, 5]?.Text);
        //             var puPrice = ParseDecimal(worksheet.Cells[row, 6]?.Text);
        //             var mainUnitPuPrice = ParseDecimal(worksheet.Cells[row, 7]?.Text);
        //             var mainUnitName = worksheet.Cells[row, 8]?.Text?.Trim();
        //             var wsUnit = ParseDecimal(worksheet.Cells[row, 9]?.Text);
        //             var unitName = worksheet.Cells[row, 10]?.Text?.Trim();
        //             var vatStatus = worksheet.Cells[row, 11]?.Text?.Trim()?.ToLower();
        //             var openingStock = ParseDecimal(worksheet.Cells[row, 12]?.Text);
        //             var minStock = ParseDecimal(worksheet.Cells[row, 13]?.Text);
        //             var maxStock = ParseDecimal(worksheet.Cells[row, 14]?.Text);
        //             var reorderLevel = ParseDecimal(worksheet.Cells[row, 15]?.Text);
        //             var status = worksheet.Cells[row, 16]?.Text?.Trim()?.ToLower();

        //             importResult.ItemName = itemName ?? "";

        //             // Validate required fields
        //             if (string.IsNullOrEmpty(itemName))
        //             {
        //                 importResult.Status = "Failed";
        //                 importResult.ErrorMessage = "Item Name is required";
        //                 result.Results.Add(importResult);
        //                 result.FailedCount++;
        //                 continue;
        //             }

        //             if (string.IsNullOrEmpty(categoryName))
        //             {
        //                 importResult.Status = "Failed";
        //                 importResult.ErrorMessage = "Category Name is required";
        //                 result.Results.Add(importResult);
        //                 result.FailedCount++;
        //                 continue;
        //             }

        //             if (string.IsNullOrEmpty(itemsCompanyName))
        //             {
        //                 importResult.Status = "Failed";
        //                 importResult.ErrorMessage = "Items Company Name is required";
        //                 result.Results.Add(importResult);
        //                 result.FailedCount++;
        //                 continue;
        //             }

        //             if (string.IsNullOrEmpty(unitName))
        //             {
        //                 importResult.Status = "Failed";
        //                 importResult.ErrorMessage = "Unit Name is required";
        //                 result.Results.Add(importResult);
        //                 result.FailedCount++;
        //                 continue;
        //             }

        //             if (string.IsNullOrEmpty(vatStatus) || (vatStatus != "13" && vatStatus != "vatexempt"))
        //             {
        //                 importResult.Status = "Failed";
        //                 importResult.ErrorMessage = "VAT Status must be '13' or 'vatExempt'";
        //                 result.Results.Add(importResult);
        //                 result.FailedCount++;
        //                 continue;
        //             }

        //             // Validate reference data exists
        //             if (!categories.TryGetValue(categoryName.ToLower(), out var category))
        //             {
        //                 importResult.Status = "Failed";
        //                 importResult.ErrorMessage = $"Category '{categoryName}' not found. Available categories: {string.Join(", ", categories.Keys)}";
        //                 result.Results.Add(importResult);
        //                 result.FailedCount++;
        //                 continue;
        //             }

        //             if (!itemCompanies.TryGetValue(itemsCompanyName.ToLower(), out var itemCompany))
        //             {
        //                 importResult.Status = "Failed";
        //                 importResult.ErrorMessage = $"Items Company '{itemsCompanyName}' not found. Available companies: {string.Join(", ", itemCompanies.Keys)}";
        //                 result.Results.Add(importResult);
        //                 result.FailedCount++;
        //                 continue;
        //             }

        //             if (!units.TryGetValue(unitName.ToLower(), out var unit))
        //             {
        //                 importResult.Status = "Failed";
        //                 importResult.ErrorMessage = $"Unit '{unitName}' not found. Available units: {string.Join(", ", units.Keys)}";
        //                 result.Results.Add(importResult);
        //                 result.FailedCount++;
        //                 continue;
        //             }

        //             // Validate main unit if provided - FIXED: Use the correct type
        //             MainUnit? mainUnit = null;
        //             if (!string.IsNullOrEmpty(mainUnitName))
        //             {
        //                 if (!mainUnits.TryGetValue(mainUnitName.ToLower(), out mainUnit))
        //                 {
        //                     warnings.Add($"Row {row - 1}: Main Unit '{mainUnitName}' not found. Available main units: {string.Join(", ", mainUnits.Keys)}");
        //                 }
        //             }

        //             // Check for duplicate item
        //             var existingItem = await _context.Items
        //                 .FirstOrDefaultAsync(i => i.CompanyId == companyId &&
        //                                           i.Name.ToLower() == itemName.ToLower());

        //             if (existingItem != null)
        //             {
        //                 importResult.Status = "Skipped";
        //                 importResult.ErrorMessage = "Item already exists";
        //                 result.Results.Add(importResult);
        //                 result.SkippedCount++;
        //                 continue;
        //             }

        //             // Prepare values with defaults
        //             decimal finalOpeningStock = openingStock ?? 0;
        //             decimal finalMinStock = minStock ?? 0;
        //             decimal finalMaxStock = maxStock ?? 100;
        //             decimal finalReorderLevel = reorderLevel ?? 0;
        //             string finalStatus = string.IsNullOrEmpty(status) ? "active" : status;

        //             // Generate unique numbers
        //             var uniqueNumber = await _itemService.GenerateUniqueItemNumberAsync(companyId);
        //             var barcodeNumber = await _itemService.GenerateBarcodeNumberAsync(companyId);

        //             // Create the item
        //             var item = new Item
        //             {
        //                 Id = Guid.NewGuid(),
        //                 Name = itemName,
        //                 Hscode = hscode,
        //                 CategoryId = category.Id,
        //                 ItemsCompanyId = itemCompany.Id,
        //                 Price = price ?? 0,
        //                 PuPrice = puPrice ?? 0,
        //                 MainUnitPuPrice = mainUnitPuPrice ?? 0,
        //                 MainUnitId = mainUnit?.Id,
        //                 WsUnit = wsUnit ?? 0,
        //                 UnitId = unit.Id,
        //                 VatStatus = vatStatus,
        //                 OpeningStock = finalOpeningStock,
        //                 MinStock = finalMinStock,
        //                 MaxStock = finalMaxStock,
        //                 ReorderLevel = finalReorderLevel,
        //                 UniqueNumber = uniqueNumber,
        //                 BarcodeNumber = barcodeNumber,
        //                 CompanyId = companyId,
        //                 Status = finalStatus,
        //                 CreatedAt = DateTime.UtcNow,
        //                 OriginalFiscalYearId = fiscalYearId,
        //                 Date = fiscalYear.StartDate.HasValue ? fiscalYear.StartDate.Value.ToUniversalTime() : DateTime.UtcNow,
        //                 NepaliDate = !string.IsNullOrEmpty(fiscalYear.StartDateNepali) ? fiscalYear.StartDateNepali : DateTime.UtcNow.ToString("yyyy-MM-dd"),
        //                 UpdatedAt = DateTime.UtcNow
        //             };

        //             // Create initial opening stock record
        //             if (finalOpeningStock > 0)
        //             {
        //                 var initialOpeningStock = new ItemInitialOpeningStock
        //                 {
        //                     Id = Guid.NewGuid(),
        //                     ItemId = item.Id,
        //                     InitialFiscalYearId = fiscalYearId,
        //                     OpeningStock = finalOpeningStock,
        //                     OpeningStockValue = finalOpeningStock * (puPrice ?? 0),
        //                     PurchasePrice = puPrice ?? 0,
        //                     SalesPrice = price ?? 0,
        //                     Date = fiscalYear.StartDate.HasValue ? fiscalYear.StartDate.Value.ToUniversalTime() : DateTime.UtcNow,
        //                     NepaliDate = !string.IsNullOrEmpty(fiscalYear.StartDateNepali) ? fiscalYear.StartDateNepali : DateTime.UtcNow.ToString("yyyy-MM-dd"),
        //                     CreatedAt = DateTime.UtcNow,
        //                     UpdatedAt = DateTime.UtcNow
        //                 };
        //                 item.InitialOpeningStock = initialOpeningStock;

        //                 // Create opening stock by fiscal year
        //                 var openingStockByFiscalYear = new ItemOpeningStockByFiscalYear
        //                 {
        //                     Id = Guid.NewGuid(),
        //                     ItemId = item.Id,
        //                     FiscalYearId = fiscalYearId,
        //                     CompanyId = companyId,
        //                     OpeningStock = finalOpeningStock,
        //                     OpeningStockValue = finalOpeningStock * (puPrice ?? 0),
        //                     PurchasePrice = puPrice ?? 0,
        //                     SalesPrice = price ?? 0,
        //                     Date = fiscalYear.StartDate.HasValue ? fiscalYear.StartDate.Value.ToUniversalTime() : DateTime.UtcNow,
        //                     NepaliDate = !string.IsNullOrEmpty(fiscalYear.StartDateNepali) ? fiscalYear.StartDateNepali : DateTime.UtcNow.ToString("yyyy-MM-dd"),
        //                     CreatedAt = DateTime.UtcNow,
        //                     UpdatedAt = DateTime.UtcNow
        //                 };
        //                 item.OpeningStocksByFiscalYear = new List<ItemOpeningStockByFiscalYear> { openingStockByFiscalYear };

        //                 // Create stock entry
        //                 var stockEntry = new StockEntry
        //                 {
        //                     Id = Guid.NewGuid(),
        //                     ItemId = item.Id,
        //                     Quantity = finalOpeningStock,
        //                     Price = price ?? 0,
        //                     NetPrice = price ?? 0,
        //                     PuPrice = puPrice ?? 0,
        //                     NetPuPrice = puPrice ?? 0,
        //                     MainUnitPuPrice = mainUnitPuPrice ?? 0,
        //                     Mrp = price ?? 0,
        //                     WsUnit = wsUnit ?? 0,
        //                     BatchNumber = "XXX",
        //                     ExpiryDate = DateOnly.FromDateTime(DateTime.UtcNow.AddYears(2)),
        //                     ExpiryStatus = "safe",
        //                     DaysUntilExpiry = 730,
        //                     CompanyId = companyId,
        //                     FiscalYearId = fiscalYearId,
        //                     UniqueUuid = Guid.NewGuid().ToString(),
        //                     Date = fiscalYear.StartDate.HasValue ? fiscalYear.StartDate.Value.ToUniversalTime() : DateTime.UtcNow,
        //                     NepaliDate = !string.IsNullOrEmpty(fiscalYear.StartDateNepali) ? fiscalYear.StartDateNepali : DateTime.UtcNow.ToString("yyyy-MM-dd"),
        //                     CreatedAt = DateTime.UtcNow,
        //                     UpdatedAt = DateTime.UtcNow
        //                 };
        //                 item.StockEntries = new List<StockEntry> { stockEntry };
        //             }

        //             _context.Items.Add(item);
        //             await _context.SaveChangesAsync();

        //             importResult.Status = "Success";
        //             importResult.ItemId = item.Id.ToString();
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

        private async Task<ItemImportResultData> ProcessItemImport(
          IFormFile file,
          Guid companyId,
          Guid fiscalYearId,
          Guid userId)
        {
            var result = new ItemImportResultData();

            // Get fiscal year details
            var fiscalYear = await _context.FiscalYears
                .FirstOrDefaultAsync(f => f.Id == fiscalYearId && f.CompanyId == companyId);

            if (fiscalYear == null)
            {
                result.Errors.Add("Fiscal year not found");
                return result;
            }

            // Get all reference data with case-insensitive comparison
            var categories = await _context.Categories
                .Where(c => c.CompanyId == companyId)
                .ToDictionaryAsync(c => c.Name.ToLower(), c => c);

            var itemCompanies = await _context.ItemCompanies
                .Where(ic => ic.CompanyId == companyId)
                .ToDictionaryAsync(ic => ic.Name.ToLower(), ic => ic);

            var units = await _context.Units
                .Where(u => u.CompanyId == companyId)
                .ToDictionaryAsync(u => u.Name.ToLower(), u => u);

            var mainUnits = await _context.MainUnits
                .Where(mu => mu.CompanyId == companyId)
                .ToDictionaryAsync(mu => mu.Name.ToLower(), mu => mu);

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

            _logger.LogInformation($"Processing {rowCount - 1} rows from Excel file");

            // Process rows (skip header row)
            for (int row = 2; row <= rowCount; row++)
            {
                var importResult = new ItemImportResult
                {
                    RowNumber = row - 1
                };

                try
                {
                    // Read all cells with proper handling
                    var itemName = worksheet.Cells[row, 1]?.Value?.ToString()?.Trim();
                    var hscode = worksheet.Cells[row, 2]?.Value?.ToString()?.Trim();
                    var categoryName = worksheet.Cells[row, 3]?.Value?.ToString()?.Trim();
                    var itemsCompanyName = worksheet.Cells[row, 4]?.Value?.ToString()?.Trim();

                    // Handle decimal values properly
                    decimal? price = null;
                    if (worksheet.Cells[row, 5]?.Value != null)
                    {
                        if (decimal.TryParse(worksheet.Cells[row, 5].Value.ToString(), out decimal priceVal))
                            price = priceVal;
                    }

                    decimal? puPrice = null;
                    if (worksheet.Cells[row, 6]?.Value != null)
                    {
                        if (decimal.TryParse(worksheet.Cells[row, 6].Value.ToString(), out decimal puPriceVal))
                            puPrice = puPriceVal;
                    }

                    decimal? mainUnitPuPrice = null;
                    if (worksheet.Cells[row, 7]?.Value != null)
                    {
                        if (decimal.TryParse(worksheet.Cells[row, 7].Value.ToString(), out decimal mainUnitPuPriceVal))
                            mainUnitPuPrice = mainUnitPuPriceVal;
                    }

                    var mainUnitName = worksheet.Cells[row, 8]?.Value?.ToString()?.Trim();

                    decimal? wsUnit = null;
                    if (worksheet.Cells[row, 9]?.Value != null)
                    {
                        if (decimal.TryParse(worksheet.Cells[row, 9].Value.ToString(), out decimal wsUnitVal))
                            wsUnit = wsUnitVal;
                    }

                    var unitName = worksheet.Cells[row, 10]?.Value?.ToString()?.Trim();

                    // 🔥 VAT STATUS: Only accept "13" or "vatExempt"
                    var vatStatusRaw = worksheet.Cells[row, 11]?.Value?.ToString()?.Trim();

                    decimal? openingStock = null;
                    if (worksheet.Cells[row, 12]?.Value != null)
                    {
                        if (decimal.TryParse(worksheet.Cells[row, 12].Value.ToString(), out decimal openingStockVal))
                            openingStock = openingStockVal;
                    }

                    decimal? minStock = null;
                    if (worksheet.Cells[row, 13]?.Value != null)
                    {
                        if (decimal.TryParse(worksheet.Cells[row, 13].Value.ToString(), out decimal minStockVal))
                            minStock = minStockVal;
                    }

                    decimal? maxStock = null;
                    if (worksheet.Cells[row, 14]?.Value != null)
                    {
                        if (decimal.TryParse(worksheet.Cells[row, 14].Value.ToString(), out decimal maxStockVal))
                            maxStock = maxStockVal;
                    }

                    decimal? reorderLevel = null;
                    if (worksheet.Cells[row, 15]?.Value != null)
                    {
                        if (decimal.TryParse(worksheet.Cells[row, 15].Value.ToString(), out decimal reorderLevelVal))
                            reorderLevel = reorderLevelVal;
                    }

                    var status = worksheet.Cells[row, 16]?.Value?.ToString()?.Trim()?.ToLower();

                    importResult.ItemName = itemName ?? "";

                    // Log the raw VAT status for debugging
                    _logger.LogInformation($"Row {row}: Raw VAT Status = '{vatStatusRaw}'");

                    // Validate required fields
                    if (string.IsNullOrEmpty(itemName))
                    {
                        importResult.Status = "Failed";
                        importResult.ErrorMessage = "Item Name is required";
                        result.Results.Add(importResult);
                        result.FailedCount++;
                        continue;
                    }

                    if (string.IsNullOrEmpty(categoryName))
                    {
                        importResult.Status = "Failed";
                        importResult.ErrorMessage = "Category Name is required";
                        result.Results.Add(importResult);
                        result.FailedCount++;
                        continue;
                    }

                    if (string.IsNullOrEmpty(itemsCompanyName))
                    {
                        importResult.Status = "Failed";
                        importResult.ErrorMessage = "Items Company Name is required";
                        result.Results.Add(importResult);
                        result.FailedCount++;
                        continue;
                    }

                    if (string.IsNullOrEmpty(unitName))
                    {
                        importResult.Status = "Failed";
                        importResult.ErrorMessage = "Unit Name is required";
                        result.Results.Add(importResult);
                        result.FailedCount++;
                        continue;
                    }

                    // 🔥 FIX: Validate VAT Status - Only accept "13" or "vatExempt"
                    string vatStatus;
                    if (string.IsNullOrEmpty(vatStatusRaw))
                    {
                        importResult.Status = "Failed";
                        importResult.ErrorMessage = "VAT Status is required";
                        result.Results.Add(importResult);
                        result.FailedCount++;
                        continue;
                    }
                    else if (vatStatusRaw == "13")
                    {
                        // ✅ KEEP AS "13" - Don't convert to "vatable"
                        vatStatus = "13";
                        _logger.LogInformation($"Row {row}: VAT Status set to '13'");
                    }
                    else if (vatStatusRaw.Equals("vatExempt", StringComparison.OrdinalIgnoreCase))
                    {
                        vatStatus = "vatExempt";
                        _logger.LogInformation($"Row {row}: VAT Status set to 'vatExempt'");
                    }
                    else
                    {
                        importResult.Status = "Failed";
                        importResult.ErrorMessage = $"VAT Status '{vatStatusRaw}' is invalid. Must be '13' (for Vatable) or 'vatExempt' (for VAT Exempt)";
                        result.Results.Add(importResult);
                        result.FailedCount++;
                        _logger.LogWarning($"Row {row}: Invalid VAT Status '{vatStatusRaw}'");
                        continue;
                    }

                    // Validate reference data exists
                    if (!categories.TryGetValue(categoryName.ToLower(), out var category))
                    {
                        importResult.Status = "Failed";
                        importResult.ErrorMessage = $"Category '{categoryName}' not found. Available categories: {string.Join(", ", categories.Keys.Take(5))}";
                        result.Results.Add(importResult);
                        result.FailedCount++;
                        continue;
                    }

                    if (!itemCompanies.TryGetValue(itemsCompanyName.ToLower(), out var itemCompany))
                    {
                        importResult.Status = "Failed";
                        importResult.ErrorMessage = $"Items Company '{itemsCompanyName}' not found. Available companies: {string.Join(", ", itemCompanies.Keys.Take(5))}";
                        result.Results.Add(importResult);
                        result.FailedCount++;
                        continue;
                    }

                    if (!units.TryGetValue(unitName.ToLower(), out var unit))
                    {
                        importResult.Status = "Failed";
                        importResult.ErrorMessage = $"Unit '{unitName}' not found. Available units: {string.Join(", ", units.Keys.Take(5))}";
                        result.Results.Add(importResult);
                        result.FailedCount++;
                        continue;
                    }

                    // Validate main unit if provided
                    MainUnit? mainUnit = null;
                    if (!string.IsNullOrEmpty(mainUnitName))
                    {
                        if (!mainUnits.TryGetValue(mainUnitName.ToLower(), out mainUnit))
                        {
                            warnings.Add($"Row {row - 1}: Main Unit '{mainUnitName}' not found. Available main units: {string.Join(", ", mainUnits.Keys.Take(5))}");
                        }
                    }

                    // Check for duplicate item
                    var existingItem = await _context.Items
                        .FirstOrDefaultAsync(i => i.CompanyId == companyId &&
                                                  i.Name.ToLower() == itemName.ToLower());

                    if (existingItem != null)
                    {
                        importResult.Status = "Skipped";
                        importResult.ErrorMessage = "Item already exists";
                        result.Results.Add(importResult);
                        result.SkippedCount++;
                        continue;
                    }

                    // Prepare values with defaults
                    decimal finalOpeningStock = openingStock ?? 0;
                    decimal finalMinStock = minStock ?? 0;
                    decimal finalMaxStock = maxStock ?? 100;
                    decimal finalReorderLevel = reorderLevel ?? 0;
                    string finalStatus = string.IsNullOrEmpty(status) ? "active" : status;

                    // Generate unique numbers
                    var uniqueNumber = await _itemService.GenerateUniqueItemNumberAsync(companyId);
                    var barcodeNumber = await _itemService.GenerateBarcodeNumberAsync(companyId);

                    // Create the item
                    var item = new Item
                    {
                        Id = Guid.NewGuid(),
                        Name = itemName,
                        Hscode = hscode,
                        CategoryId = category.Id,
                        ItemsCompanyId = itemCompany.Id,
                        Price = price ?? 0,
                        PuPrice = puPrice ?? 0,
                        MainUnitPuPrice = mainUnitPuPrice ?? 0,
                        MainUnitId = mainUnit?.Id,
                        WsUnit = wsUnit ?? 0,
                        UnitId = unit.Id,
                        VatStatus = vatStatus, // ✅ This will be "13" or "vatExempt"
                        OpeningStock = finalOpeningStock,
                        MinStock = finalMinStock,
                        MaxStock = finalMaxStock,
                        ReorderLevel = finalReorderLevel,
                        UniqueNumber = uniqueNumber,
                        BarcodeNumber = barcodeNumber,
                        CompanyId = companyId,
                        Status = finalStatus,
                        CreatedAt = DateTime.UtcNow,
                        OriginalFiscalYearId = fiscalYearId,
                        Date = fiscalYear.StartDate.HasValue ? fiscalYear.StartDate.Value.ToUniversalTime() : DateTime.UtcNow,
                        NepaliDate = !string.IsNullOrEmpty(fiscalYear.StartDateNepali) ? fiscalYear.StartDateNepali : DateTime.UtcNow.ToString("yyyy-MM-dd"),
                        UpdatedAt = DateTime.UtcNow
                    };

                    // Create initial opening stock record
                    if (finalOpeningStock > 0)
                    {
                        var initialOpeningStock = new ItemInitialOpeningStock
                        {
                            Id = Guid.NewGuid(),
                            ItemId = item.Id,
                            InitialFiscalYearId = fiscalYearId,
                            OpeningStock = finalOpeningStock,
                            OpeningStockValue = finalOpeningStock * (puPrice ?? 0),
                            PurchasePrice = puPrice ?? 0,
                            SalesPrice = price ?? 0,
                            Date = fiscalYear.StartDate.HasValue ? fiscalYear.StartDate.Value.ToUniversalTime() : DateTime.UtcNow,
                            NepaliDate = !string.IsNullOrEmpty(fiscalYear.StartDateNepali) ? fiscalYear.StartDateNepali : DateTime.UtcNow.ToString("yyyy-MM-dd"),
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        };
                        item.InitialOpeningStock = initialOpeningStock;

                        // Create opening stock by fiscal year
                        var openingStockByFiscalYear = new ItemOpeningStockByFiscalYear
                        {
                            Id = Guid.NewGuid(),
                            ItemId = item.Id,
                            FiscalYearId = fiscalYearId,
                            CompanyId = companyId,
                            OpeningStock = finalOpeningStock,
                            OpeningStockValue = finalOpeningStock * (puPrice ?? 0),
                            PurchasePrice = puPrice ?? 0,
                            SalesPrice = price ?? 0,
                            Date = fiscalYear.StartDate.HasValue ? fiscalYear.StartDate.Value.ToUniversalTime() : DateTime.UtcNow,
                            NepaliDate = !string.IsNullOrEmpty(fiscalYear.StartDateNepali) ? fiscalYear.StartDateNepali : DateTime.UtcNow.ToString("yyyy-MM-dd"),
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        };
                        item.OpeningStocksByFiscalYear = new List<ItemOpeningStockByFiscalYear> { openingStockByFiscalYear };

                        // Create stock entry
                        var stockEntry = new StockEntry
                        {
                            Id = Guid.NewGuid(),
                            ItemId = item.Id,
                            Quantity = finalOpeningStock,
                            Price = price ?? 0,
                            NetPrice = price ?? 0,
                            PuPrice = puPrice ?? 0,
                            NetPuPrice = puPrice ?? 0,
                            MainUnitPuPrice = mainUnitPuPrice ?? 0,
                            Mrp = price ?? 0,
                            WsUnit = wsUnit ?? 0,
                            BatchNumber = "XXX",
                            ExpiryDate = DateOnly.FromDateTime(DateTime.UtcNow.AddYears(2)),
                            ExpiryStatus = "safe",
                            DaysUntilExpiry = 730,
                            CompanyId = companyId,
                            FiscalYearId = fiscalYearId,
                            UniqueUuid = Guid.NewGuid().ToString(),
                            Date = fiscalYear.StartDate.HasValue ? fiscalYear.StartDate.Value.ToUniversalTime() : DateTime.UtcNow,
                            NepaliDate = !string.IsNullOrEmpty(fiscalYear.StartDateNepali) ? fiscalYear.StartDateNepali : DateTime.UtcNow.ToString("yyyy-MM-dd"),
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        };
                        item.StockEntries = new List<StockEntry> { stockEntry };
                    }

                    _context.Items.Add(item);
                    await _context.SaveChangesAsync();

                    importResult.Status = "Success";
                    importResult.ItemId = item.Id.ToString();
                    result.SuccessCount++;

                    _logger.LogInformation($"Row {row}: Successfully imported item '{itemName}' with VAT Status '{vatStatus}'");
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

            _logger.LogInformation($"Import completed: {result.SuccessCount} success, {result.FailedCount} failed, {result.SkippedCount} skipped");

            return result;
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