// using Microsoft.EntityFrameworkCore;
// using SkyForge.Data;
// using SkyForge.Dto.RetailerDto;
// using SkyForge.Models.CompanyModel;
// using SkyForge.Models.FiscalYearModel;
// using SkyForge.Models.Retailer.Purchase;
// using SkyForge.Models.Retailer.PurchaseReturnModel;
// using SkyForge.Models.Retailer.Sales;
// using SkyForge.Models.Retailer.SalesReturnModel;
// using SkyForge.Models.UserModel;

// namespace SkyForge.Services.Retailer.MonthlyVatSummaryServices
// {
//     public class MonthlyVatSummaryService : IMonthlyVatSummaryService
//     {
//         private readonly ApplicationDbContext _context;
//         private readonly ILogger<MonthlyVatSummaryService> _logger;

//         public MonthlyVatSummaryService(
//             ApplicationDbContext context,
//             ILogger<MonthlyVatSummaryService> logger)
//         {
//             _context = context;
//             _logger = logger;
//         }

//         public async Task<MonthlyVatSummaryDTO> GetMonthlyVatSummaryAsync(
//             Guid companyId,
//             Guid fiscalYearId,
//             string? month,
//             string? year,
//             string? nepaliMonth,
//             string? nepaliYear,
//             string? periodType,
//             string dateFormat)
//         {
//             var company = await _context.Companies
//                      .Where(c => c.Id == companyId)
//                      .Select(c => new CompanyInfoDTO
//                      {
//                          Id = c.Id,
//                          Name = c.Name,
//                          Address = c.Address,
//                          City = c.City,
//                          Phone = c.Phone,
//                          Pan = c.Pan,
//                          RenewalDate = c.RenewalDate,
//                          DateFormat = c.DateFormat.ToString(),
//                          VatEnabled = c.VatEnabled
//                      })
//                      .FirstOrDefaultAsync();

//             var currentFiscalYear = await _context.FiscalYears
//                 .Where(f => f.Id == fiscalYearId && f.CompanyId == companyId)
//                 .Select(f => new FiscalYearDTO
//                 {
//                     Id = f.Id,
//                     Name = f.Name,
//                     StartDate = f.StartDate,
//                     EndDate = f.EndDate,
//                     StartDateNepali = f.StartDateNepali,
//                     EndDateNepali = f.EndDateNepali,
//                     IsActive = f.IsActive,
//                 })
//                 .FirstOrDefaultAsync();

//             var currentNepaliDate = DateTime.UtcNow.ToString("yyyy-MM-dd");
//             var currentNepaliYear = DateTime.UtcNow.Year;

//             // If no parameters provided, return empty data
//             if (string.IsNullOrEmpty(periodType) ||
//                 (periodType == "monthly" && dateFormat == "english" && (string.IsNullOrEmpty(month) || string.IsNullOrEmpty(year))) ||
//                 (periodType == "monthly" && dateFormat == "nepali" && (string.IsNullOrEmpty(nepaliMonth) || string.IsNullOrEmpty(nepaliYear))) ||
//                 (periodType == "yearly" && dateFormat == "english" && string.IsNullOrEmpty(year)) ||
//                 (periodType == "yearly" && dateFormat == "nepali" && string.IsNullOrEmpty(nepaliYear)))
//             {
//                 return new MonthlyVatSummaryDTO
//                 {
//                     CompanyDateFormat = dateFormat,
//                     NepaliDate = currentNepaliDate,
//                     Company = company,
//                     CurrentFiscalYear = currentFiscalYear,
//                     CurrentNepaliYear = currentNepaliYear,
//                     CurrentCompany = company,
//                     Totals = null,
//                     MonthlyData = null,
//                     Month = month ?? "",
//                     Year = year ?? "",
//                     NepaliMonth = nepaliMonth ?? "",
//                     NepaliYear = nepaliYear ?? "",
//                     ReportDateRange = "",
//                     CurrentCompanyName = company?.Name ?? "",
//                 };
//             }

//             bool isNepali = dateFormat == "nepali";

//             if (periodType == "monthly")
//             {
//                 int monthInt, yearInt;
//                 if (isNepali)
//                 {
//                     monthInt = int.Parse(nepaliMonth!);
//                     yearInt = int.Parse(nepaliYear!);
//                 }
//                 else
//                 {
//                     monthInt = int.Parse(month!);
//                     yearInt = int.Parse(year!);
//                 }

//                 var monthData = await GetMonthDataAsync(companyId, fiscalYearId, monthInt, yearInt, isNepali);

//                 if (monthData == null)
//                 {
//                     throw new ArgumentException("Invalid month or year");
//                 }

//                 return new MonthlyVatSummaryDTO
//                 {
//                     CompanyDateFormat = dateFormat,
//                     NepaliDate = currentNepaliDate,
//                     Company = company,
//                     CurrentFiscalYear = currentFiscalYear,
//                     CurrentNepaliYear = currentNepaliYear,
//                     CurrentCompany = company,
//                     Totals = monthData.Totals,
//                     MonthlyData = null,
//                     Month = month,
//                     Year = year,
//                     NepaliMonth = nepaliMonth,
//                     NepaliYear = nepaliYear,
//                     ReportDateRange = monthData.ReportDateRange,
//                     CurrentCompanyName = company?.Name ?? "",
//                 };
//             }
//             else // Yearly report
//             {
//                 List<MonthlyVatDataDTO> monthlyDataList = new();

//                 if (dateFormat == "english")
//                 {
//                     // English calendar year (Jan-Dec)
//                     int yearInt = int.Parse(year!);

//                     for (int monthInt = 1; monthInt <= 12; monthInt++)
//                     {
//                         var monthData = await GetMonthDataAsync(companyId, fiscalYearId, monthInt, yearInt, false);
//                         if (monthData != null)
//                         {
//                             monthlyDataList.Add(new MonthlyVatDataDTO
//                             {
//                                 ReportDateRange = monthData.ReportDateRange,
//                                 Totals = monthData.Totals
//                             });
//                         }
//                     }

//                     return new MonthlyVatSummaryDTO
//                     {
//                         CompanyDateFormat = dateFormat,
//                         NepaliDate = currentNepaliDate,
//                         Company = company,
//                         CurrentFiscalYear = currentFiscalYear,
//                         CurrentNepaliYear = currentNepaliYear,
//                         CurrentCompany = company,
//                         Totals = null,
//                         MonthlyData = monthlyDataList,
//                         Month = null,
//                         Year = yearInt.ToString(),
//                         NepaliMonth = null,
//                         NepaliYear = null,
//                         ReportDateRange = $"{yearInt} (All Months)",
//                         CurrentCompanyName = company?.Name ?? "",
//                     };
//                 }
//                 else
//                 {
//                     // Nepali fiscal year (Shrawan to Ashad)
//                     string fiscalYearStr = nepaliYear!;
//                     var years = fiscalYearStr.Split('/');
//                     if (years.Length != 2)
//                     {
//                         throw new ArgumentException("Invalid fiscal year format. Use format: YYYY/YYYY");
//                     }

//                     int startYear = int.Parse(years[0]);
//                     int endYear = int.Parse(years[1]);

//                     if (endYear != startYear + 1)
//                     {
//                         throw new ArgumentException("Invalid fiscal year. Second year should be one more than first year");
//                     }

//                     // Months from Shrawan (4) to Falgun (12) of start year
//                     for (int monthInt = 4; monthInt <= 12; monthInt++)
//                     {
//                         var monthData = await GetMonthDataAsync(companyId, fiscalYearId, monthInt, startYear, true);
//                         if (monthData != null)
//                         {
//                             monthlyDataList.Add(new MonthlyVatDataDTO
//                             {
//                                 ReportDateRange = monthData.ReportDateRange,
//                                 Totals = monthData.Totals
//                             });
//                         }
//                     }

//                     // Months from Baisakh (1) to Ashad (3) of end year
//                     for (int monthInt = 1; monthInt <= 3; monthInt++)
//                     {
//                         var monthData = await GetMonthDataAsync(companyId, fiscalYearId, monthInt, endYear, true);
//                         if (monthData != null)
//                         {
//                             monthlyDataList.Add(new MonthlyVatDataDTO
//                             {
//                                 ReportDateRange = monthData.ReportDateRange,
//                                 Totals = monthData.Totals
//                             });
//                         }
//                     }

//                     return new MonthlyVatSummaryDTO
//                     {
//                         CompanyDateFormat = dateFormat,
//                         NepaliDate = currentNepaliDate,
//                         Company = company,
//                         CurrentFiscalYear = currentFiscalYear,
//                         CurrentNepaliYear = currentNepaliYear,
//                         CurrentCompany = company,
//                         Totals = null,
//                         MonthlyData = monthlyDataList,
//                         Month = null,
//                         Year = null,
//                         NepaliMonth = null,
//                         NepaliYear = fiscalYearStr,
//                         ReportDateRange = $"{fiscalYearStr} (Shrawan - Ashad)",
//                         CurrentCompanyName = company?.Name ?? "",
//                     };
//                 }
//             }
//         }

//         private async Task<MonthDataResult?> GetMonthDataAsync(
//             Guid companyId,
//             Guid fiscalYearId,
//             int monthInt,
//             int yearInt,
//             bool isNepali)
//         {
//             string reportDateRange;

//             if (isNepali)
//             {
//                 // Validate inputs
//                 if (monthInt < 1 || monthInt > 12 || yearInt < 2000 || yearInt > 2100)
//                 {
//                     return null;
//                 }

//                 string[] monthNames = { "Baisakh", "Jestha", "Ashad", "Shrawan", "Bhadra", "Ashoj",
//                     "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra" };
//                 reportDateRange = $"{monthNames[monthInt - 1]}, {yearInt}";

//                 // Create the date pattern to match (e.g., "2082-04" for Shrawan)
//                 string datePattern = $"{yearInt}-{monthInt:D2}";

//                 _logger.LogInformation($"Querying Nepali month: {reportDateRange} with pattern: {datePattern}");

//                 // For Nepali dates - use string matching with StartsWith or Contains
//                 // This will match all records where nepali_date starts with "2082-04"
//                 var salesBills = await _context.SalesBills
//                     .Where(s => s.CompanyId == companyId &&
//                                s.FiscalYearId == fiscalYearId &&
//                                s.Date.ToString().StartsWith(datePattern))
//                     .ToListAsync();

//                 var salesReturns = await _context.SalesReturns
//                     .Where(s => s.CompanyId == companyId &&
//                                s.FiscalYearId == fiscalYearId &&
//                                s.Date.ToString().StartsWith(datePattern))
//                     .ToListAsync();

//                 var purchaseBills = await _context.PurchaseBills
//                     .Where(p => p.CompanyId == companyId &&
//                                p.FiscalYearId == fiscalYearId &&
//                                p.Date.ToString().StartsWith(datePattern))
//                     .ToListAsync();

//                 var purchaseReturns = await _context.PurchaseReturns
//                     .Where(p => p.CompanyId == companyId &&
//                                p.FiscalYearId == fiscalYearId &&
//                                p.Date.ToString().StartsWith(datePattern))
//                     .ToListAsync();

//                 // Aggregate data
//                 var totals = new VatTotalsDTO
//                 {
//                     Sales = new VatCategoryDTO
//                     {
//                         TaxableAmount = salesBills.Sum(s => s.TaxableAmount),
//                         NonVatAmount = salesBills.Sum(s => s.NonVatSales),
//                         VatAmount = salesBills.Sum(s => s.VatAmount)
//                     },
//                     SalesReturn = new VatCategoryDTO
//                     {
//                         TaxableAmount = salesReturns.Sum(s => s.TaxableAmount ?? 0),
//                         NonVatAmount = salesReturns.Sum(s => s.NonVatSalesReturn ?? 0),
//                         VatAmount = salesReturns.Sum(s => s.VatAmount ?? 0)
//                     },
//                     Purchase = new VatCategoryDTO
//                     {
//                         TaxableAmount = purchaseBills.Sum(p => p.TaxableAmount ?? 0),
//                         NonVatAmount = purchaseBills.Sum(p => p.NonVatPurchase ?? 0),
//                         VatAmount = purchaseBills.Sum(p => p.VatAmount ?? 0)
//                     },
//                     PurchaseReturn = new VatCategoryDTO
//                     {
//                         TaxableAmount = purchaseReturns.Sum(p => p.TaxableAmount ?? 0),
//                         NonVatAmount = purchaseReturns.Sum(p => p.NonVatPurchaseReturn ?? 0),
//                         VatAmount = purchaseReturns.Sum(p => p.VatAmount ?? 0)
//                     }
//                 };

//                 // Calculate net values
//                 totals.NetSalesVat = totals.Sales.VatAmount - totals.SalesReturn.VatAmount;
//                 totals.NetPurchaseVat = totals.Purchase.VatAmount - totals.PurchaseReturn.VatAmount;
//                 totals.NetVat = totals.NetSalesVat - totals.NetPurchaseVat;

//                 _logger.LogInformation($"Found {salesBills.Count} sales, {salesReturns.Count} returns, {purchaseBills.Count} purchases, {purchaseReturns.Count} purchase returns for {reportDateRange}");

//                 return new MonthDataResult
//                 {
//                     ReportDateRange = reportDateRange,
//                     Totals = totals
//                 };
//             }
//             else
//             {
//                 // English dates - use Date field with DateTime range
//                 var fromDateTime = new DateTime(yearInt, monthInt, 1);
//                 var toDateTime = fromDateTime.AddMonths(1).AddDays(-1).Date.AddDays(1).AddTicks(-1);

//                 string[] monthNames = { "January", "February", "March", "April", "May", "June",
//                     "July", "August", "September", "October", "November", "December" };
//                 reportDateRange = $"{monthNames[monthInt - 1]}, {yearInt}";

//                 _logger.LogInformation($"Querying English month: {reportDateRange}");

//                 var salesBills = await _context.SalesBills
//                     .Where(s => s.CompanyId == companyId &&
//                                s.FiscalYearId == fiscalYearId &&
//                                s.Date >= fromDateTime &&
//                                s.Date <= toDateTime)
//                     .ToListAsync();

//                 var salesReturns = await _context.SalesReturns
//                     .Where(s => s.CompanyId == companyId &&
//                                s.FiscalYearId == fiscalYearId &&
//                                s.Date >= fromDateTime &&
//                                s.Date <= toDateTime)
//                     .ToListAsync();

//                 var purchaseBills = await _context.PurchaseBills
//                     .Where(p => p.CompanyId == companyId &&
//                                p.FiscalYearId == fiscalYearId &&
//                                p.Date >= fromDateTime &&
//                                p.Date <= toDateTime)
//                     .ToListAsync();

//                 var purchaseReturns = await _context.PurchaseReturns
//                     .Where(p => p.CompanyId == companyId &&
//                                p.FiscalYearId == fiscalYearId &&
//                                p.Date >= fromDateTime &&
//                                p.Date <= toDateTime)
//                     .ToListAsync();

//                 // Aggregate data
//                 var totals = new VatTotalsDTO
//                 {
//                     Sales = new VatCategoryDTO
//                     {
//                         TaxableAmount = salesBills.Sum(s => s.TaxableAmount),
//                         NonVatAmount = salesBills.Sum(s => s.NonVatSales),
//                         VatAmount = salesBills.Sum(s => s.VatAmount)
//                     },
//                     SalesReturn = new VatCategoryDTO
//                     {
//                         TaxableAmount = salesReturns.Sum(s => s.TaxableAmount ?? 0),
//                         NonVatAmount = salesReturns.Sum(s => s.NonVatSalesReturn ?? 0),
//                         VatAmount = salesReturns.Sum(s => s.VatAmount ?? 0)
//                     },
//                     Purchase = new VatCategoryDTO
//                     {
//                         TaxableAmount = purchaseBills.Sum(p => p.TaxableAmount ?? 0),
//                         NonVatAmount = purchaseBills.Sum(p => p.NonVatPurchase ?? 0),
//                         VatAmount = purchaseBills.Sum(p => p.VatAmount ?? 0)
//                     },
//                     PurchaseReturn = new VatCategoryDTO
//                     {
//                         TaxableAmount = purchaseReturns.Sum(p => p.TaxableAmount ?? 0),
//                         NonVatAmount = purchaseReturns.Sum(p => p.NonVatPurchaseReturn ?? 0),
//                         VatAmount = purchaseReturns.Sum(p => p.VatAmount ?? 0)
//                     }
//                 };

//                 // Calculate net values
//                 totals.NetSalesVat = totals.Sales.VatAmount - totals.SalesReturn.VatAmount;
//                 totals.NetPurchaseVat = totals.Purchase.VatAmount - totals.PurchaseReturn.VatAmount;
//                 totals.NetVat = totals.NetSalesVat - totals.NetPurchaseVat;

//                 return new MonthDataResult
//                 {
//                     ReportDateRange = reportDateRange,
//                     Totals = totals
//                 };
//             }
//         }
//     }
// }

//----------------------------------------------------------end

// using Microsoft.EntityFrameworkCore;
// using SkyForge.Data;
// using SkyForge.Dto.RetailerDto;
// using SkyForge.Models.CompanyModel;
// using SkyForge.Models.FiscalYearModel;
// using SkyForge.Models.Retailer.Purchase;
// using SkyForge.Models.Retailer.PurchaseReturnModel;
// using SkyForge.Models.Retailer.Sales;
// using SkyForge.Models.Retailer.SalesReturnModel;
// using SkyForge.Models.UserModel;

// namespace SkyForge.Services.Retailer.MonthlyVatSummaryServices
// {
//     public class MonthlyVatSummaryService : IMonthlyVatSummaryService
//     {
//         private readonly ApplicationDbContext _context;
//         private readonly ILogger<MonthlyVatSummaryService> _logger;

//         public MonthlyVatSummaryService(
//             ApplicationDbContext context,
//             ILogger<MonthlyVatSummaryService> logger)
//         {
//             _context = context;
//             _logger = logger;
//         }

//         public async Task<MonthlyVatSummaryDTO> GetMonthlyVatSummaryAsync(
//             Guid companyId,
//             Guid fiscalYearId,
//             string? month,
//             string? year,
//             string? nepaliMonth,
//             string? nepaliYear,
//             string? periodType,
//             string dateFormat,
//             string? fromDate,  // AD from date
//             string? toDate)    // AD to date
//         {
//             var company = await _context.Companies
//                      .Where(c => c.Id == companyId)
//                      .Select(c => new CompanyInfoDTO
//                      {
//                          Id = c.Id,
//                          Name = c.Name,
//                          Address = c.Address,
//                          City = c.City,
//                          Phone = c.Phone,
//                          Pan = c.Pan,
//                          RenewalDate = c.RenewalDate,
//                          DateFormat = c.DateFormat.ToString(),
//                          VatEnabled = c.VatEnabled
//                      })
//                      .FirstOrDefaultAsync();

//             var currentFiscalYear = await _context.FiscalYears
//                 .Where(f => f.Id == fiscalYearId && f.CompanyId == companyId)
//                 .Select(f => new FiscalYearDTO
//                 {
//                     Id = f.Id,
//                     Name = f.Name,
//                     StartDate = f.StartDate,
//                     EndDate = f.EndDate,
//                     StartDateNepali = f.StartDateNepali,
//                     EndDateNepali = f.EndDateNepali,
//                     IsActive = f.IsActive,
//                 })
//                 .FirstOrDefaultAsync();

//             var currentNepaliDate = DateTime.UtcNow.ToString("yyyy-MM-dd");
//             var currentNepaliYear = DateTime.UtcNow.Year;

//             // If no parameters provided, return empty data
//             if (string.IsNullOrEmpty(periodType) ||
//                 (periodType == "monthly" && dateFormat == "english" && (string.IsNullOrEmpty(month) || string.IsNullOrEmpty(year))) ||
//                 (periodType == "monthly" && dateFormat == "nepali" && (string.IsNullOrEmpty(nepaliMonth) || string.IsNullOrEmpty(nepaliYear))) ||
//                 (periodType == "yearly" && dateFormat == "english" && string.IsNullOrEmpty(year)) ||
//                 (periodType == "yearly" && dateFormat == "nepali" && string.IsNullOrEmpty(nepaliYear)))
//             {
//                 return new MonthlyVatSummaryDTO
//                 {
//                     CompanyDateFormat = dateFormat,
//                     NepaliDate = currentNepaliDate,
//                     Company = company,
//                     CurrentFiscalYear = currentFiscalYear,
//                     CurrentNepaliYear = currentNepaliYear,
//                     CurrentCompany = company,
//                     Totals = null,
//                     MonthlyData = null,
//                     Month = month ?? "",
//                     Year = year ?? "",
//                     NepaliMonth = nepaliMonth ?? "",
//                     NepaliYear = nepaliYear ?? "",
//                     ReportDateRange = "",
//                     CurrentCompanyName = company?.Name ?? "",
//                 };
//             }

//             bool isNepali = dateFormat == "nepali";

//             if (periodType == "monthly")
//             {
//                 // Parse AD dates from frontend
//                 DateTime startDateTime;
//                 DateTime endDateTime;

//                 if (!string.IsNullOrEmpty(fromDate) && !string.IsNullOrEmpty(toDate))
//                 {
//                     if (!DateTime.TryParse(fromDate, out startDateTime))
//                         startDateTime = DateTime.MinValue;
//                     if (!DateTime.TryParse(toDate, out endDateTime))
//                         endDateTime = DateTime.MaxValue;

//                     endDateTime = endDateTime.Date.AddDays(1).AddTicks(-1);
//                 }
//                 else
//                 {
//                     // Fallback: Calculate AD dates from month/year
//                     int monthInt, yearInt;
//                     if (isNepali)
//                     {
//                         monthInt = int.Parse(nepaliMonth!);
//                         yearInt = int.Parse(nepaliYear!);
//                         var firstDayNepali = new NepaliDate(yearInt, monthInt - 1, 1);
//                         var lastDayNepali = new NepaliDate(yearInt, monthInt, 0);
//                         startDateTime = DateTime.Parse(firstDayNepali.ToEnglishDate().ToString("yyyy-MM-dd"));
//                         endDateTime = DateTime.Parse(lastDayNepali.ToEnglishDate().ToString("yyyy-MM-dd")).Date.AddDays(1).AddTicks(-1);
//                     }
//                     else
//                     {
//                         monthInt = int.Parse(month!);
//                         yearInt = int.Parse(year!);
//                         startDateTime = new DateTime(yearInt, monthInt, 1);
//                         endDateTime = startDateTime.AddMonths(1).AddDays(-1).Date.AddDays(1).AddTicks(-1);
//                     }
//                 }

//                 _logger.LogInformation($"Querying month with AD date range: {startDateTime} to {endDateTime}");

//                 var monthData = await GetMonthDataByAdDatesAsync(companyId, fiscalYearId, startDateTime, endDateTime, isNepali, month, year, nepaliMonth, nepaliYear);

//                 if (monthData == null)
//                 {
//                     throw new ArgumentException("Invalid month or year");
//                 }

//                 return new MonthlyVatSummaryDTO
//                 {
//                     CompanyDateFormat = dateFormat,
//                     NepaliDate = currentNepaliDate,
//                     Company = company,
//                     CurrentFiscalYear = currentFiscalYear,
//                     CurrentNepaliYear = currentNepaliYear,
//                     CurrentCompany = company,
//                     Totals = monthData.Totals,
//                     MonthlyData = null,
//                     Month = month,
//                     Year = year,
//                     NepaliMonth = nepaliMonth,
//                     NepaliYear = nepaliYear,
//                     ReportDateRange = monthData.ReportDateRange,
//                     CurrentCompanyName = company?.Name ?? "",
//                 };
//             }
//             else // Yearly report
//             {
//                 List<MonthlyVatDataDTO> monthlyDataList = new();

//                 if (dateFormat == "english")
//                 {
//                     // English calendar year (Jan-Dec)
//                     int yearInt = int.Parse(year!);

//                     for (int monthInt = 1; monthInt <= 12; monthInt++)
//                     {
//                         var startDateTime = new DateTime(yearInt, monthInt, 1);
//                         var endDateTime = startDateTime.AddMonths(1).AddDays(-1).Date.AddDays(1).AddTicks(-1);

//                         var monthData = await GetMonthDataByAdDatesAsync(companyId, fiscalYearId, startDateTime, endDateTime, false, monthInt.ToString(), year, null, null);
//                         if (monthData != null)
//                         {
//                             monthlyDataList.Add(new MonthlyVatDataDTO
//                             {
//                                 ReportDateRange = monthData.ReportDateRange,
//                                 Totals = monthData.Totals
//                             });
//                         }
//                     }

//                     return new MonthlyVatSummaryDTO
//                     {
//                         CompanyDateFormat = dateFormat,
//                         NepaliDate = currentNepaliDate,
//                         Company = company,
//                         CurrentFiscalYear = currentFiscalYear,
//                         CurrentNepaliYear = currentNepaliYear,
//                         CurrentCompany = company,
//                         Totals = null,
//                         MonthlyData = monthlyDataList,
//                         Month = null,
//                         Year = yearInt.ToString(),
//                         NepaliMonth = null,
//                         NepaliYear = null,
//                         ReportDateRange = $"{yearInt} (All Months)",
//                         CurrentCompanyName = company?.Name ?? "",
//                     };
//                 }
//                 else
//                 {
//                     // Nepali fiscal year (Shrawan to Ashad)
//                     string fiscalYearStr = nepaliYear!;
//                     var years = fiscalYearStr.Split('/');
//                     if (years.Length != 2)
//                     {
//                         throw new ArgumentException("Invalid fiscal year format. Use format: YYYY/YYYY");
//                     }

//                     int startYear = int.Parse(years[0]);
//                     int endYear = int.Parse(years[1]);

//                     if (endYear != startYear + 1)
//                     {
//                         throw new ArgumentException("Invalid fiscal year. Second year should be one more than first year");
//                     }

//                     // Months from Shrawan (4) to Falgun (12) of start year
//                     for (int monthInt = 4; monthInt <= 12; monthInt++)
//                     {
//                         var firstDayNepali = new NepaliDate(startYear, monthInt - 1, 1);
//                         var lastDayNepali = new NepaliDate(startYear, monthInt, 0);
//                         var startDateTime = DateTime.Parse(firstDayNepali.ToEnglishDate().ToString("yyyy-MM-dd"));
//                         var endDateTime = DateTime.Parse(lastDayNepali.ToEnglishDate().ToString("yyyy-MM-dd")).Date.AddDays(1).AddTicks(-1);

//                         var monthData = await GetMonthDataByAdDatesAsync(companyId, fiscalYearId, startDateTime, endDateTime, true, null, null, monthInt.ToString(), startYear.ToString());
//                         if (monthData != null)
//                         {
//                             monthlyDataList.Add(new MonthlyVatDataDTO
//                             {
//                                 ReportDateRange = monthData.ReportDateRange,
//                                 Totals = monthData.Totals
//                             });
//                         }
//                     }

//                     // Months from Baisakh (1) to Ashad (3) of end year
//                     for (int monthInt = 1; monthInt <= 3; monthInt++)
//                     {
//                         var firstDayNepali = new NepaliDate(endYear, monthInt - 1, 1);
//                         var lastDayNepali = new NepaliDate(endYear, monthInt, 0);
//                         var startDateTime = DateTime.Parse(firstDayNepali.ToEnglishDate().ToString("yyyy-MM-dd"));
//                         var endDateTime = DateTime.Parse(lastDayNepali.ToEnglishDate().ToString("yyyy-MM-dd")).Date.AddDays(1).AddTicks(-1);

//                         var monthData = await GetMonthDataByAdDatesAsync(companyId, fiscalYearId, startDateTime, endDateTime, true, null, null, monthInt.ToString(), endYear.ToString());
//                         if (monthData != null)
//                         {
//                             monthlyDataList.Add(new MonthlyVatDataDTO
//                             {
//                                 ReportDateRange = monthData.ReportDateRange,
//                                 Totals = monthData.Totals
//                             });
//                         }
//                     }

//                     return new MonthlyVatSummaryDTO
//                     {
//                         CompanyDateFormat = dateFormat,
//                         NepaliDate = currentNepaliDate,
//                         Company = company,
//                         CurrentFiscalYear = currentFiscalYear,
//                         CurrentNepaliYear = currentNepaliYear,
//                         CurrentCompany = company,
//                         Totals = null,
//                         MonthlyData = monthlyDataList,
//                         Month = null,
//                         Year = null,
//                         NepaliMonth = null,
//                         NepaliYear = fiscalYearStr,
//                         ReportDateRange = $"{fiscalYearStr} (Shrawan - Ashad)",
//                         CurrentCompanyName = company?.Name ?? "",
//                     };
//                 }
//             }
//         }

//         private async Task<MonthDataResult?> GetMonthDataByAdDatesAsync(
//             Guid companyId,
//             Guid fiscalYearId,
//             DateTime startDateTime,
//             DateTime endDateTime,
//             bool isNepali,
//             string? month = null,
//             string? year = null,
//             string? nepaliMonth = null,
//             string? nepaliYear = null)
//         {
//             string reportDateRange;

//             if (isNepali && nepaliMonth != null && nepaliYear != null)
//             {
//                 string[] monthNames = { "Baisakh", "Jestha", "Ashad", "Shrawan", "Bhadra", "Ashoj",
//                     "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra" };
//                 int monthInt = int.Parse(nepaliMonth);
//                 reportDateRange = $"{monthNames[monthInt - 1]}, {nepaliYear}";
//             }
//             else if (month != null && year != null)
//             {
//                 string[] monthNames = { "January", "February", "March", "April", "May", "June",
//                     "July", "August", "September", "October", "November", "December" };
//                 int monthInt = int.Parse(month);
//                 reportDateRange = $"{monthNames[monthInt - 1]}, {year}";
//             }
//             else
//             {
//                 reportDateRange = $"{startDateTime:MMMM yyyy}";
//             }

//             _logger.LogInformation($"Querying with AD date range: {startDateTime} to {endDateTime} for {reportDateRange}");

//             // Query using AD dates (Date field)
//             var salesBills = await _context.SalesBills
//                 .Where(s => s.CompanyId == companyId &&
//                            s.FiscalYearId == fiscalYearId &&
//                            s.Date >= startDateTime &&
//                            s.Date <= endDateTime)
//                 .ToListAsync();

//             var salesReturns = await _context.SalesReturns
//                 .Where(s => s.CompanyId == companyId &&
//                            s.FiscalYearId == fiscalYearId &&
//                            s.Date >= startDateTime &&
//                            s.Date <= endDateTime)
//                 .ToListAsync();

//             var purchaseBills = await _context.PurchaseBills
//                 .Where(p => p.CompanyId == companyId &&
//                            p.FiscalYearId == fiscalYearId &&
//                            p.Date >= startDateTime &&
//                            p.Date <= endDateTime)
//                 .ToListAsync();

//             var purchaseReturns = await _context.PurchaseReturns
//                 .Where(p => p.CompanyId == companyId &&
//                            p.FiscalYearId == fiscalYearId &&
//                            p.Date >= startDateTime &&
//                            p.Date <= endDateTime)
//                 .ToListAsync();

//             // Aggregate data
//             var totals = new VatTotalsDTO
//             {
//                 Sales = new VatCategoryDTO
//                 {
//                     TaxableAmount = salesBills.Sum(s => s.TaxableAmount),
//                     NonVatAmount = salesBills.Sum(s => s.NonVatSales),
//                     VatAmount = salesBills.Sum(s => s.VatAmount)
//                 },
//                 SalesReturn = new VatCategoryDTO
//                 {
//                     TaxableAmount = salesReturns.Sum(s => s.TaxableAmount ?? 0),
//                     NonVatAmount = salesReturns.Sum(s => s.NonVatSalesReturn ?? 0),
//                     VatAmount = salesReturns.Sum(s => s.VatAmount ?? 0)
//                 },
//                 Purchase = new VatCategoryDTO
//                 {
//                     TaxableAmount = purchaseBills.Sum(p => p.TaxableAmount ?? 0),
//                     NonVatAmount = purchaseBills.Sum(p => p.NonVatPurchase ?? 0),
//                     VatAmount = purchaseBills.Sum(p => p.VatAmount ?? 0)
//                 },
//                 PurchaseReturn = new VatCategoryDTO
//                 {
//                     TaxableAmount = purchaseReturns.Sum(p => p.TaxableAmount ?? 0),
//                     NonVatAmount = purchaseReturns.Sum(p => p.NonVatPurchaseReturn ?? 0),
//                     VatAmount = purchaseReturns.Sum(p => p.VatAmount ?? 0)
//                 }
//             };

//             // Calculate net values
//             totals.NetSalesVat = totals.Sales.VatAmount - totals.SalesReturn.VatAmount;
//             totals.NetPurchaseVat = totals.Purchase.VatAmount - totals.PurchaseReturn.VatAmount;
//             totals.NetVat = totals.NetSalesVat - totals.NetPurchaseVat;

//             _logger.LogInformation($"Found {salesBills.Count} sales, {salesReturns.Count} returns, {purchaseBills.Count} purchases, {purchaseReturns.Count} purchase returns for {reportDateRange}");

//             return new MonthDataResult
//             {
//                 ReportDateRange = reportDateRange,
//                 Totals = totals
//             };
//         }

//         // Keep the old method for backward compatibility (marked as obsolete)
//         [Obsolete("Use GetMonthDataByAdDatesAsync instead")]
//         private async Task<MonthDataResult?> GetMonthDataAsync(
//             Guid companyId,
//             Guid fiscalYearId,
//             int monthInt,
//             int yearInt,
//             bool isNepali)
//         {
//             // This method is kept for backward compatibility but is no longer used
//             // The new method uses AD dates for accurate querying
//             throw new NotImplementedException("Use GetMonthDataByAdDatesAsync instead");
//         }
//     }

//     // Helper class for Nepali date conversion if not already available
//     public class NepaliDate
//     {
//         private readonly DateTime _englishDate;

//         public NepaliDate(int year, int month, int day)
//         {
//             // This is a simplified version - you should use your existing NepaliDate implementation
//             // For now, we'll create a date manually
//             _englishDate = new DateTime(year, month + 1, day);
//         }

//         public DateTime ToEnglishDate() => _englishDate;
//     }
// }

//----------------------------------------------------------end

using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Dto.RetailerDto;
using SkyForge.Models.CompanyModel;
using SkyForge.Models.FiscalYearModel;
using SkyForge.Models.Retailer.Purchase;
using SkyForge.Models.Retailer.PurchaseReturnModel;
using SkyForge.Models.Retailer.Sales;
using SkyForge.Models.Retailer.SalesReturnModel;
using SkyForge.Models.UserModel;
using NepDate;

namespace SkyForge.Services.Retailer.MonthlyVatSummaryServices
{
    public class MonthlyVatSummaryService : IMonthlyVatSummaryService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<MonthlyVatSummaryService> _logger;

        // Nepali month names
        private readonly string[] NepaliMonthNames = { "Baisakh", "Jestha", "Ashad", "Shrawan", "Bhadra", "Ashoj",
            "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra" };

        // Nepali month days: Baisakh(1)=31, Jestha(2)=31, Ashad(3)=31, Shrawan(4)=32, Bhadra(5)=31, Ashoj(6)=30,
        // Kartik(7)=29, Mangsir(8)=30, Poush(9)=29, Magh(10)=30, Falgun(11)=30, Chaitra(12)=30
        private readonly int[] NepaliMonthDays = { 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30, 30 };

        // Leap years in Nepali calendar (Falgun has 31 days)
        private readonly int[] LeapYears = { 2072, 2076, 2080, 2084, 2088, 2092, 2096, 2100, 2104, 2108 };

        public MonthlyVatSummaryService(
            ApplicationDbContext context,
            ILogger<MonthlyVatSummaryService> logger)
        {
            _context = context;
            _logger = logger;
        }

        private int GetLastDayOfNepaliMonth(int year, int month)
        {
            if (month == 11 && LeapYears.Contains(year))
            {
                return 31;
            }
            return NepaliMonthDays[month - 1];
        }

        // Helper to convert Nepali date to English DateTime
        private DateTime? ConvertNepaliToEnglish(int year, int month, int day)
        {
            try
            {
                // Create NepaliDate - month is 1-indexed (1-12)
                var nepaliDate = new NepaliDate(year, month, day);

                // Use the EnglishDate property (not ToEnglishDate() method)
                return nepaliDate.EnglishDate;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to convert Nepali date: {year}-{month}-{day}");
                return null;
            }
        }
        public async Task<MonthlyVatSummaryDTO> GetMonthlyVatSummaryAsync(
            Guid companyId,
            Guid fiscalYearId,
            string? month,
            string? year,
            string? nepaliMonth,
            string? nepaliYear,
            string? periodType,
            string dateFormat,
            string? fromDate,  // AD from date
            string? toDate)    // AD to date
        {
            var company = await _context.Companies
                     .Where(c => c.Id == companyId)
                     .Select(c => new CompanyInfoDTO
                     {
                         Id = c.Id,
                         Name = c.Name,
                         Address = c.Address,
                         City = c.City,
                         Phone = c.Phone,
                         Pan = c.Pan,
                         RenewalDate = c.RenewalDate,
                         DateFormat = c.DateFormat.ToString(),
                         VatEnabled = c.VatEnabled
                     })
                     .FirstOrDefaultAsync();

            var currentFiscalYear = await _context.FiscalYears
                .Where(f => f.Id == fiscalYearId && f.CompanyId == companyId)
                .Select(f => new FiscalYearDTO
                {
                    Id = f.Id,
                    Name = f.Name,
                    StartDate = f.StartDate,
                    EndDate = f.EndDate,
                    StartDateNepali = f.StartDateNepali,
                    EndDateNepali = f.EndDateNepali,
                    IsActive = f.IsActive,
                })
                .FirstOrDefaultAsync();

            var currentNepaliDate = DateTime.UtcNow.ToString("yyyy-MM-dd");
            var currentNepaliYear = DateTime.UtcNow.Year;

            // If no parameters provided, return empty data
            if (string.IsNullOrEmpty(periodType) ||
                (periodType == "monthly" && dateFormat == "english" && (string.IsNullOrEmpty(month) || string.IsNullOrEmpty(year))) ||
                (periodType == "monthly" && dateFormat == "nepali" && (string.IsNullOrEmpty(nepaliMonth) || string.IsNullOrEmpty(nepaliYear))) ||
                (periodType == "yearly" && dateFormat == "english" && string.IsNullOrEmpty(year)) ||
                (periodType == "yearly" && dateFormat == "nepali" && string.IsNullOrEmpty(nepaliYear)))
            {
                return new MonthlyVatSummaryDTO
                {
                    CompanyDateFormat = dateFormat,
                    NepaliDate = currentNepaliDate,
                    Company = company,
                    CurrentFiscalYear = currentFiscalYear,
                    CurrentNepaliYear = currentNepaliYear,
                    CurrentCompany = company,
                    Totals = null,
                    MonthlyData = null,
                    Month = month ?? "",
                    Year = year ?? "",
                    NepaliMonth = nepaliMonth ?? "",
                    NepaliYear = nepaliYear ?? "",
                    ReportDateRange = "",
                    CurrentCompanyName = company?.Name ?? "",
                };
            }

            bool isNepali = dateFormat == "nepali";

            if (periodType == "monthly")
            {
                // Parse AD dates from frontend
                DateTime startDateTime;
                DateTime endDateTime;

                if (!string.IsNullOrEmpty(fromDate) && !string.IsNullOrEmpty(toDate))
                {
                    if (!DateTime.TryParse(fromDate, out startDateTime))
                        startDateTime = DateTime.MinValue;
                    if (!DateTime.TryParse(toDate, out endDateTime))
                        endDateTime = DateTime.MaxValue;

                    endDateTime = endDateTime.Date.AddDays(1).AddTicks(-1);
                }
                else
                {
                    // Fallback: Calculate AD dates from month/year
                    if (isNepali)
                    {
                        int monthInt = int.Parse(nepaliMonth!);
                        int yearInt = int.Parse(nepaliYear!);

                        var firstDayAd = ConvertNepaliToEnglish(yearInt, monthInt, 1);
                        var lastDayNum = GetLastDayOfNepaliMonth(yearInt, monthInt);
                        var lastDayAd = ConvertNepaliToEnglish(yearInt, monthInt, lastDayNum);

                        if (firstDayAd == null || lastDayAd == null)
                        {
                            throw new ArgumentException("Invalid Nepali date");
                        }

                        startDateTime = firstDayAd.Value;
                        endDateTime = lastDayAd.Value.Date.AddDays(1).AddTicks(-1);
                    }
                    else
                    {
                        int monthInt = int.Parse(month!);
                        int yearInt = int.Parse(year!);
                        startDateTime = new DateTime(yearInt, monthInt, 1);
                        endDateTime = startDateTime.AddMonths(1).AddDays(-1).Date.AddDays(1).AddTicks(-1);
                    }
                }

                _logger.LogInformation($"Querying month with AD date range: {startDateTime} to {endDateTime}");

                var monthData = await GetMonthDataByAdDatesAsync(companyId, fiscalYearId, startDateTime, endDateTime, isNepali, month, year, nepaliMonth, nepaliYear);

                if (monthData == null)
                {
                    throw new ArgumentException("Invalid month or year");
                }

                return new MonthlyVatSummaryDTO
                {
                    CompanyDateFormat = dateFormat,
                    NepaliDate = currentNepaliDate,
                    Company = company,
                    CurrentFiscalYear = currentFiscalYear,
                    CurrentNepaliYear = currentNepaliYear,
                    CurrentCompany = company,
                    Totals = monthData.Totals,
                    MonthlyData = null,
                    Month = month,
                    Year = year,
                    NepaliMonth = nepaliMonth,
                    NepaliYear = nepaliYear,
                    ReportDateRange = monthData.ReportDateRange,
                    CurrentCompanyName = company?.Name ?? "",
                };
            }
            else // Yearly report
            {
                List<MonthlyVatDataDTO> monthlyDataList = new();

                if (dateFormat == "english")
                {
                    // English calendar year (Jan-Dec)
                    int yearInt = int.Parse(year!);

                    for (int monthInt = 1; monthInt <= 12; monthInt++)
                    {
                        var startDateTime = new DateTime(yearInt, monthInt, 1);
                        var endDateTime = startDateTime.AddMonths(1).AddDays(-1).Date.AddDays(1).AddTicks(-1);

                        var monthData = await GetMonthDataByAdDatesAsync(companyId, fiscalYearId, startDateTime, endDateTime, false, monthInt.ToString(), year, null, null);
                        if (monthData != null)
                        {
                            monthlyDataList.Add(new MonthlyVatDataDTO
                            {
                                ReportDateRange = monthData.ReportDateRange,
                                Totals = monthData.Totals
                            });
                        }
                    }
                }
                else
                {
                    // Nepali fiscal year (Shrawan to Ashad)
                    string fiscalYearStr = nepaliYear!;
                    var years = fiscalYearStr.Split('/');
                    if (years.Length != 2)
                    {
                        throw new ArgumentException("Invalid fiscal year format. Use format: YYYY/YYYY");
                    }

                    int startYear = int.Parse(years[0]);
                    int endYear = int.Parse(years[1]);

                    if (endYear != startYear + 1)
                    {
                        throw new ArgumentException("Invalid fiscal year. Second year should be one more than first year");
                    }

                    _logger.LogInformation($"Processing fiscal year: {startYear}/{endYear}");

                    // Months from Shrawan (4) to Falgun (12) of start year
                    for (int monthInt = 4; monthInt <= 12; monthInt++)
                    {
                        try
                        {
                            var firstDayAd = ConvertNepaliToEnglish(startYear, monthInt, 1);
                            var lastDayNum = GetLastDayOfNepaliMonth(startYear, monthInt);
                            var lastDayAd = ConvertNepaliToEnglish(startYear, monthInt, lastDayNum);

                            if (firstDayAd == null || lastDayAd == null)
                            {
                                _logger.LogWarning($"Skipping month {monthInt} of {startYear} - invalid date conversion");
                                continue;
                            }

                            var startDateTime = firstDayAd.Value;
                            var endDateTime = lastDayAd.Value.Date.AddDays(1).AddTicks(-1);

                            _logger.LogInformation($"Processing month {monthInt} ({NepaliMonthNames[monthInt - 1]}), {startYear}: {startDateTime} to {endDateTime}");

                            var monthData = await GetMonthDataByAdDatesAsync(companyId, fiscalYearId, startDateTime, endDateTime, true, null, null, monthInt.ToString(), startYear.ToString());
                            if (monthData != null && (monthData.Totals.Sales.TaxableAmount > 0 || monthData.Totals.Purchase.TaxableAmount > 0))
                            {
                                monthlyDataList.Add(new MonthlyVatDataDTO
                                {
                                    ReportDateRange = monthData.ReportDateRange,
                                    Totals = monthData.Totals
                                });
                            }
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, $"Error processing month {monthInt} of {startYear}");
                        }
                    }

                    // Months from Baisakh (1) to Ashad (3) of end year
                    for (int monthInt = 1; monthInt <= 3; monthInt++)
                    {
                        try
                        {
                            var firstDayAd = ConvertNepaliToEnglish(endYear, monthInt, 1);
                            var lastDayNum = GetLastDayOfNepaliMonth(endYear, monthInt);
                            var lastDayAd = ConvertNepaliToEnglish(endYear, monthInt, lastDayNum);

                            if (firstDayAd == null || lastDayAd == null)
                            {
                                _logger.LogWarning($"Skipping month {monthInt} of {endYear} - invalid date conversion");
                                continue;
                            }

                            var startDateTime = firstDayAd.Value;
                            var endDateTime = lastDayAd.Value.Date.AddDays(1).AddTicks(-1);

                            _logger.LogInformation($"Processing month {monthInt} ({NepaliMonthNames[monthInt - 1]}), {endYear}: {startDateTime} to {endDateTime}");

                            var monthData = await GetMonthDataByAdDatesAsync(companyId, fiscalYearId, startDateTime, endDateTime, true, null, null, monthInt.ToString(), endYear.ToString());
                            if (monthData != null && (monthData.Totals.Sales.TaxableAmount > 0 || monthData.Totals.Purchase.TaxableAmount > 0))
                            {
                                monthlyDataList.Add(new MonthlyVatDataDTO
                                {
                                    ReportDateRange = monthData.ReportDateRange,
                                    Totals = monthData.Totals
                                });
                            }
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, $"Error processing month {monthInt} of {endYear}");
                        }
                    }
                }

                return new MonthlyVatSummaryDTO
                {
                    CompanyDateFormat = dateFormat,
                    NepaliDate = currentNepaliDate,
                    Company = company,
                    CurrentFiscalYear = currentFiscalYear,
                    CurrentNepaliYear = currentNepaliYear,
                    CurrentCompany = company,
                    Totals = null,
                    MonthlyData = monthlyDataList,
                    Month = null,
                    Year = dateFormat == "english" ? year : null,
                    NepaliMonth = null,
                    NepaliYear = dateFormat == "nepali" ? nepaliYear : null,
                    ReportDateRange = dateFormat == "english" ? $"{year} (All Months)" : $"{nepaliYear} (Shrawan - Ashad)",
                    CurrentCompanyName = company?.Name ?? "",
                };
            }
        }

        private async Task<MonthDataResult?> GetMonthDataByAdDatesAsync(
            Guid companyId,
            Guid fiscalYearId,
            DateTime startDateTime,
            DateTime endDateTime,
            bool isNepali,
            string? month = null,
            string? year = null,
            string? nepaliMonth = null,
            string? nepaliYear = null)
        {
            string reportDateRange;

            if (isNepali && nepaliMonth != null && nepaliYear != null)
            {
                int monthInt = int.Parse(nepaliMonth);
                reportDateRange = $"{NepaliMonthNames[monthInt - 1]}, {nepaliYear}";
            }
            else if (month != null && year != null)
            {
                string[] monthNames = { "January", "February", "March", "April", "May", "June",
                    "July", "August", "September", "October", "November", "December" };
                int monthInt = int.Parse(month);
                reportDateRange = $"{monthNames[monthInt - 1]}, {year}";
            }
            else
            {
                reportDateRange = $"{startDateTime:MMMM yyyy}";
            }

            _logger.LogInformation($"Querying with AD date range: {startDateTime} to {endDateTime} for {reportDateRange}");

            // Query using AD dates (Date field)
            var salesBills = await _context.SalesBills
                .Where(s => s.CompanyId == companyId &&
                           s.FiscalYearId == fiscalYearId &&
                           s.Date >= startDateTime &&
                           s.Date <= endDateTime)
                .ToListAsync();

            var salesReturns = await _context.SalesReturns
                .Where(s => s.CompanyId == companyId &&
                           s.FiscalYearId == fiscalYearId &&
                           s.Date >= startDateTime &&
                           s.Date <= endDateTime)
                .ToListAsync();

            var purchaseBills = await _context.PurchaseBills
                .Where(p => p.CompanyId == companyId &&
                           p.FiscalYearId == fiscalYearId &&
                           p.Date >= startDateTime &&
                           p.Date <= endDateTime)
                .ToListAsync();

            var purchaseReturns = await _context.PurchaseReturns
                .Where(p => p.CompanyId == companyId &&
                           p.FiscalYearId == fiscalYearId &&
                           p.Date >= startDateTime &&
                           p.Date <= endDateTime)
                .ToListAsync();

            // If no data found for any category, still return zeros
            var totals = new VatTotalsDTO
            {
                Sales = new VatCategoryDTO
                {
                    TaxableAmount = salesBills.Sum(s => s.TaxableAmount),
                    NonVatAmount = salesBills.Sum(s => s.NonVatSales),
                    VatAmount = salesBills.Sum(s => s.VatAmount)
                },
                SalesReturn = new VatCategoryDTO
                {
                    TaxableAmount = salesReturns.Sum(s => s.TaxableAmount ?? 0),
                    NonVatAmount = salesReturns.Sum(s => s.NonVatSalesReturn ?? 0),
                    VatAmount = salesReturns.Sum(s => s.VatAmount ?? 0)
                },
                Purchase = new VatCategoryDTO
                {
                    TaxableAmount = purchaseBills.Sum(p => p.TaxableAmount ?? 0),
                    NonVatAmount = purchaseBills.Sum(p => p.NonVatPurchase ?? 0),
                    VatAmount = purchaseBills.Sum(p => p.VatAmount ?? 0)
                },
                PurchaseReturn = new VatCategoryDTO
                {
                    TaxableAmount = purchaseReturns.Sum(p => p.TaxableAmount ?? 0),
                    NonVatAmount = purchaseReturns.Sum(p => p.NonVatPurchaseReturn ?? 0),
                    VatAmount = purchaseReturns.Sum(p => p.VatAmount ?? 0)
                }
            };

            // Calculate net values
            totals.NetSalesVat = totals.Sales.VatAmount - totals.SalesReturn.VatAmount;
            totals.NetPurchaseVat = totals.Purchase.VatAmount - totals.PurchaseReturn.VatAmount;
            totals.NetVat = totals.NetSalesVat - totals.NetPurchaseVat;

            _logger.LogInformation($"Found {salesBills.Count} sales, {salesReturns.Count} returns, {purchaseBills.Count} purchases, {purchaseReturns.Count} purchase returns for {reportDateRange}");

            return new MonthDataResult
            {
                ReportDateRange = reportDateRange,
                Totals = totals
            };
        }
    }
}