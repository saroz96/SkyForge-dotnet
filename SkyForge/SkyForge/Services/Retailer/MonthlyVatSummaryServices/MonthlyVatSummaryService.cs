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
// using NepDate;

// namespace SkyForge.Services.Retailer.MonthlyVatSummaryServices
// {
//     public class MonthlyVatSummaryService : IMonthlyVatSummaryService
//     {
//         private readonly ApplicationDbContext _context;
//         private readonly ILogger<MonthlyVatSummaryService> _logger;

//         // Nepali month names
//         private readonly string[] NepaliMonthNames = { "Baisakh", "Jestha", "Ashad", "Shrawan", "Bhadra", "Ashoj",
//             "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra" };

//         // Nepali month days: Baisakh(1)=31, Jestha(2)=31, Ashad(3)=31, Shrawan(4)=32, Bhadra(5)=31, Ashoj(6)=30,
//         // Kartik(7)=29, Mangsir(8)=30, Poush(9)=29, Magh(10)=30, Falgun(11)=30, Chaitra(12)=30
//         private readonly int[] NepaliMonthDays = { 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30, 30 };

//         // Leap years in Nepali calendar (Falgun has 31 days)
//         private readonly int[] LeapYears = { 2072, 2076, 2080, 2084, 2088, 2092, 2096, 2100, 2104, 2108 };

//         public MonthlyVatSummaryService(
//             ApplicationDbContext context,
//             ILogger<MonthlyVatSummaryService> logger)
//         {
//             _context = context;
//             _logger = logger;
//         }

//         private int GetLastDayOfNepaliMonth(int year, int month)
//         {
//             if (month == 11 && LeapYears.Contains(year))
//             {
//                 return 31;
//             }
//             return NepaliMonthDays[month - 1];
//         }

//         // Helper to convert Nepali date to English DateTime
//         private DateTime? ConvertNepaliToEnglish(int year, int month, int day)
//         {
//             try
//             {
//                 // Create NepaliDate - month is 1-indexed (1-12)
//                 var nepaliDate = new NepaliDate(year, month, day);

//                 // Use the EnglishDate property (not ToEnglishDate() method)
//                 return nepaliDate.EnglishDate;
//             }
//             catch (Exception ex)
//             {
//                 _logger.LogError(ex, $"Failed to convert Nepali date: {year}-{month}-{day}");
//                 return null;
//             }
//         }
//         public async Task<MonthlyVatSummaryDTO> GetMonthlyVatSummaryAsync(
//             Guid companyId,
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
//                 .Where(f => f.CompanyId == companyId)
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
//                     if (isNepali)
//                     {
//                         int monthInt = int.Parse(nepaliMonth!);
//                         int yearInt = int.Parse(nepaliYear!);

//                         var firstDayAd = ConvertNepaliToEnglish(yearInt, monthInt, 1);
//                         var lastDayNum = GetLastDayOfNepaliMonth(yearInt, monthInt);
//                         var lastDayAd = ConvertNepaliToEnglish(yearInt, monthInt, lastDayNum);

//                         if (firstDayAd == null || lastDayAd == null)
//                         {
//                             throw new ArgumentException("Invalid Nepali date");
//                         }

//                         startDateTime = firstDayAd.Value;
//                         endDateTime = lastDayAd.Value.Date.AddDays(1).AddTicks(-1);
//                     }
//                     else
//                     {
//                         int monthInt = int.Parse(month!);
//                         int yearInt = int.Parse(year!);
//                         startDateTime = new DateTime(yearInt, monthInt, 1);
//                         endDateTime = startDateTime.AddMonths(1).AddDays(-1).Date.AddDays(1).AddTicks(-1);
//                     }
//                 }

//                 _logger.LogInformation($"Querying month with AD date range: {startDateTime} to {endDateTime}");

//                 var monthData = await GetMonthDataByAdDatesAsync(companyId, startDateTime, endDateTime, isNepali, month, year, nepaliMonth, nepaliYear);

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

//                         var monthData = await GetMonthDataByAdDatesAsync(companyId, startDateTime, endDateTime, false, monthInt.ToString(), year, null, null);
//                         if (monthData != null)
//                         {
//                             monthlyDataList.Add(new MonthlyVatDataDTO
//                             {
//                                 ReportDateRange = monthData.ReportDateRange,
//                                 Totals = monthData.Totals
//                             });
//                         }
//                     }
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

//                     _logger.LogInformation($"Processing fiscal year: {startYear}/{endYear}");

//                     // Months from Shrawan (4) to Falgun (12) of start year
//                     for (int monthInt = 4; monthInt <= 12; monthInt++)
//                     {
//                         try
//                         {
//                             var firstDayAd = ConvertNepaliToEnglish(startYear, monthInt, 1);
//                             var lastDayNum = GetLastDayOfNepaliMonth(startYear, monthInt);
//                             var lastDayAd = ConvertNepaliToEnglish(startYear, monthInt, lastDayNum);

//                             if (firstDayAd == null || lastDayAd == null)
//                             {
//                                 _logger.LogWarning($"Skipping month {monthInt} of {startYear} - invalid date conversion");
//                                 continue;
//                             }

//                             var startDateTime = firstDayAd.Value;
//                             var endDateTime = lastDayAd.Value.Date.AddDays(1).AddTicks(-1);

//                             _logger.LogInformation($"Processing month {monthInt} ({NepaliMonthNames[monthInt - 1]}), {startYear}: {startDateTime} to {endDateTime}");

//                             var monthData = await GetMonthDataByAdDatesAsync(companyId, startDateTime, endDateTime, true, null, null, monthInt.ToString(), startYear.ToString());
//                             if (monthData != null && (monthData.Totals.Sales.TaxableAmount > 0 || monthData.Totals.Purchase.TaxableAmount > 0))
//                             {
//                                 monthlyDataList.Add(new MonthlyVatDataDTO
//                                 {
//                                     ReportDateRange = monthData.ReportDateRange,
//                                     Totals = monthData.Totals
//                                 });
//                             }
//                         }
//                         catch (Exception ex)
//                         {
//                             _logger.LogError(ex, $"Error processing month {monthInt} of {startYear}");
//                         }
//                     }

//                     // Months from Baisakh (1) to Ashad (3) of end year
//                     for (int monthInt = 1; monthInt <= 3; monthInt++)
//                     {
//                         try
//                         {
//                             var firstDayAd = ConvertNepaliToEnglish(endYear, monthInt, 1);
//                             var lastDayNum = GetLastDayOfNepaliMonth(endYear, monthInt);
//                             var lastDayAd = ConvertNepaliToEnglish(endYear, monthInt, lastDayNum);

//                             if (firstDayAd == null || lastDayAd == null)
//                             {
//                                 _logger.LogWarning($"Skipping month {monthInt} of {endYear} - invalid date conversion");
//                                 continue;
//                             }

//                             var startDateTime = firstDayAd.Value;
//                             var endDateTime = lastDayAd.Value.Date.AddDays(1).AddTicks(-1);

//                             _logger.LogInformation($"Processing month {monthInt} ({NepaliMonthNames[monthInt - 1]}), {endYear}: {startDateTime} to {endDateTime}");

//                             var monthData = await GetMonthDataByAdDatesAsync(companyId, startDateTime, endDateTime, true, null, null, monthInt.ToString(), endYear.ToString());
//                             if (monthData != null && (monthData.Totals.Sales.TaxableAmount > 0 || monthData.Totals.Purchase.TaxableAmount > 0))
//                             {
//                                 monthlyDataList.Add(new MonthlyVatDataDTO
//                                 {
//                                     ReportDateRange = monthData.ReportDateRange,
//                                     Totals = monthData.Totals
//                                 });
//                             }
//                         }
//                         catch (Exception ex)
//                         {
//                             _logger.LogError(ex, $"Error processing month {monthInt} of {endYear}");
//                         }
//                     }
//                 }

//                 return new MonthlyVatSummaryDTO
//                 {
//                     CompanyDateFormat = dateFormat,
//                     NepaliDate = currentNepaliDate,
//                     Company = company,
//                     CurrentFiscalYear = currentFiscalYear,
//                     CurrentNepaliYear = currentNepaliYear,
//                     CurrentCompany = company,
//                     Totals = null,
//                     MonthlyData = monthlyDataList,
//                     Month = null,
//                     Year = dateFormat == "english" ? year : null,
//                     NepaliMonth = null,
//                     NepaliYear = dateFormat == "nepali" ? nepaliYear : null,
//                     ReportDateRange = dateFormat == "english" ? $"{year} (All Months)" : $"{nepaliYear} (Shrawan - Ashad)",
//                     CurrentCompanyName = company?.Name ?? "",
//                 };
//             }
//         }

//         private async Task<MonthDataResult?> GetMonthDataByAdDatesAsync(
//             Guid companyId,
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
//                 int monthInt = int.Parse(nepaliMonth);
//                 reportDateRange = $"{NepaliMonthNames[monthInt - 1]}, {nepaliYear}";
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
//                            s.Date >= startDateTime &&
//                            s.Date <= endDateTime)
//                 .ToListAsync();

//             var salesReturns = await _context.SalesReturns
//                 .Where(s => s.CompanyId == companyId &&
//                            s.Date >= startDateTime &&
//                            s.Date <= endDateTime)
//                 .ToListAsync();

//             var purchaseBills = await _context.PurchaseBills
//                 .Where(p => p.CompanyId == companyId &&
//                            p.Date >= startDateTime &&
//                            p.Date <= endDateTime)
//                 .ToListAsync();

//             var purchaseReturns = await _context.PurchaseReturns
//                 .Where(p => p.CompanyId == companyId &&
//                            p.Date >= startDateTime &&
//                            p.Date <= endDateTime)
//                 .ToListAsync();

//             // If no data found for any category, still return zeros
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
//     }
// }

//--------------------------------------------------------------end

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
// using NepDate;

// namespace SkyForge.Services.Retailer.MonthlyVatSummaryServices
// {
//     public class MonthlyVatSummaryService : IMonthlyVatSummaryService
//     {
//         private readonly ApplicationDbContext _context;
//         private readonly ILogger<MonthlyVatSummaryService> _logger;

//         // Nepali month names (1-indexed) - FIXED: Added proper mapping
//         private readonly Dictionary<int, string> NepaliMonthNames = new Dictionary<int, string>
//         {
//             {1, "Baisakh"},
//             {2, "Jestha"},
//             {3, "Ashad"},
//             {4, "Shrawan"},
//             {5, "Bhadra"},
//             {6, "Ashoj"},
//             {7, "Kartik"},
//             {8, "Mangsir"},
//             {9, "Poush"},
//             {10, "Magh"},
//             {11, "Falgun"},
//             {12, "Chaitra"}
//         };

//         // Nepali month days (1-indexed)
//         private readonly Dictionary<int, int> NepaliMonthDays = new Dictionary<int, int>
//         {
//             {1, 31},  // Baisakh
//             {2, 31},  // Jestha
//             {3, 31},  // Ashad
//             {4, 31},  // Shrawan
//             {5, 31},  // Bhadra
//             {6, 30},  // Ashoj
//             {7, 29},  // Kartik
//             {8, 29},  // Mangsir
//             {9, 29},  // Poush
//             {10, 29}, // Magh
//             {11, 30}, // Falgun
//             {12, 30}  // Chaitra
//         };

//         // Leap years in Nepali calendar (Falgun has 31 days)
//         private readonly HashSet<int> LeapYears = new HashSet<int> { 2072, 2076, 2080, 2084, 2088, 2092, 2096, 2100, 2104, 2108 };

//         public MonthlyVatSummaryService(
//             ApplicationDbContext context,
//             ILogger<MonthlyVatSummaryService> logger)
//         {
//             _context = context;
//             _logger = logger;
//         }

//         private bool IsLeapYearNepali(int year)
//         {
//             return LeapYears.Contains(year);
//         }

//         private int GetLastDayOfNepaliMonth(int year, int month)
//         {
//             if (month < 1 || month > 12)
//                 return 30;

//             // For Falgun (month 11) in leap years
//             if (month == 11 && IsLeapYearNepali(year))
//             {
//                 return 31;
//             }

//             return NepaliMonthDays[month];
//         }

//         private string GetNepaliMonthName(int month)
//         {
//             return NepaliMonthNames.ContainsKey(month) ? NepaliMonthNames[month] : $"Month {month}";
//         }

//         // Helper to convert Nepali date to English DateTime
//         private DateTime? ConvertNepaliToEnglish(int year, int month, int day)
//         {
//             try
//             {
//                 var nepaliDate = new NepaliDate(year, month, day);
//                 return nepaliDate.EnglishDate;
//             }
//             catch (Exception ex)
//             {
//                 _logger.LogError(ex, $"Failed to convert Nepali date: {year}-{month}-{day}");
//                 return null;
//             }
//         }

//         public async Task<MonthlyVatSummaryDTO> GetMonthlyVatSummaryAsync(
//             Guid companyId,
//             string? month,
//             string? year,
//             string? nepaliMonth,
//             string? nepaliYear,
//             string? periodType,
//             string dateFormat,
//             string? fromDate,
//             string? toDate)
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
//                 .Where(f => f.CompanyId == companyId)
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
//                     if (isNepali)
//                     {
//                         int monthInt = int.Parse(nepaliMonth!);
//                         int yearInt = int.Parse(nepaliYear!);

//                         var firstDayAd = ConvertNepaliToEnglish(yearInt, monthInt, 1);
//                         var lastDayNum = GetLastDayOfNepaliMonth(yearInt, monthInt);
//                         var lastDayAd = ConvertNepaliToEnglish(yearInt, monthInt, lastDayNum);

//                         if (firstDayAd == null || lastDayAd == null)
//                         {
//                             throw new ArgumentException("Invalid Nepali date");
//                         }

//                         startDateTime = firstDayAd.Value;
//                         endDateTime = lastDayAd.Value.Date.AddDays(1).AddTicks(-1);
//                     }
//                     else
//                     {
//                         int monthInt = int.Parse(month!);
//                         int yearInt = int.Parse(year!);
//                         startDateTime = new DateTime(yearInt, monthInt, 1);
//                         endDateTime = startDateTime.AddMonths(1).AddDays(-1).Date.AddDays(1).AddTicks(-1);
//                     }
//                 }

//                 _logger.LogInformation($"Querying month with AD date range: {startDateTime} to {endDateTime}");

//                 var monthData = await GetMonthDataByAdDatesAsync(companyId, startDateTime, endDateTime, isNepali, month, year, nepaliMonth, nepaliYear);

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

//                         var monthData = await GetMonthDataByAdDatesAsync(companyId, startDateTime, endDateTime, false, monthInt.ToString(), year, null, null);
//                         if (monthData != null)
//                         {
//                             monthlyDataList.Add(new MonthlyVatDataDTO
//                             {
//                                 ReportDateRange = monthData.ReportDateRange,
//                                 Totals = monthData.Totals
//                             });
//                         }
//                     }
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

//                     _logger.LogInformation($"Processing fiscal year: {startYear}/{endYear}");

//                     // FIXED: Process ALL 12 months in correct order
//                     // Months from Shrawan (4) to Chaitra (12) of startYear
//                     for (int monthInt = 4; monthInt <= 12; monthInt++)
//                     {
//                         try
//                         {
//                             var firstDayAd = ConvertNepaliToEnglish(startYear, monthInt, 1);
//                             var lastDayNum = GetLastDayOfNepaliMonth(startYear, monthInt);
//                             var lastDayAd = ConvertNepaliToEnglish(startYear, monthInt, lastDayNum);

//                             if (firstDayAd == null || lastDayAd == null)
//                             {
//                                 _logger.LogWarning($"Skipping month {monthInt} of {startYear} - invalid date conversion");
//                                 continue;
//                             }

//                             var startDateTime = firstDayAd.Value;
//                             var endDateTime = lastDayAd.Value.Date.AddDays(1).AddTicks(-1);

//                             string monthName = GetNepaliMonthName(monthInt);
//                             _logger.LogInformation($"Processing month {monthInt} ({monthName}), {startYear}: {startDateTime} to {endDateTime}");

//                             var monthData = await GetMonthDataByAdDatesAsync(companyId, startDateTime, endDateTime, true, null, null, monthInt.ToString(), startYear.ToString());
//                             if (monthData != null)
//                             {
//                                 monthlyDataList.Add(new MonthlyVatDataDTO
//                                 {
//                                     ReportDateRange = monthData.ReportDateRange,
//                                     Totals = monthData.Totals
//                                 });
//                             }
//                         }
//                         catch (Exception ex)
//                         {
//                             _logger.LogError(ex, $"Error processing month {monthInt} of {startYear}");
//                         }
//                     }

//                     // FIXED: Months from Baisakh (1) to Ashad (3) of endYear
//                     for (int monthInt = 1; monthInt <= 3; monthInt++)
//                     {
//                         try
//                         {
//                             var firstDayAd = ConvertNepaliToEnglish(endYear, monthInt, 1);
//                             var lastDayNum = GetLastDayOfNepaliMonth(endYear, monthInt);
//                             var lastDayAd = ConvertNepaliToEnglish(endYear, monthInt, lastDayNum);

//                             if (firstDayAd == null || lastDayAd == null)
//                             {
//                                 _logger.LogWarning($"Skipping month {monthInt} of {endYear} - invalid date conversion");
//                                 continue;
//                             }

//                             var startDateTime = firstDayAd.Value;
//                             var endDateTime = lastDayAd.Value.Date.AddDays(1).AddTicks(-1);

//                             string monthName = GetNepaliMonthName(monthInt);
//                             _logger.LogInformation($"Processing month {monthInt} ({monthName}), {endYear}: {startDateTime} to {endDateTime}");

//                             var monthData = await GetMonthDataByAdDatesAsync(companyId, startDateTime, endDateTime, true, null, null, monthInt.ToString(), endYear.ToString());
//                             if (monthData != null)
//                             {
//                                 monthlyDataList.Add(new MonthlyVatDataDTO
//                                 {
//                                     ReportDateRange = monthData.ReportDateRange,
//                                     Totals = monthData.Totals
//                                 });
//                             }
//                         }
//                         catch (Exception ex)
//                         {
//                             _logger.LogError(ex, $"Error processing month {monthInt} of {endYear}");
//                         }
//                     }

//                     _logger.LogInformation($"Total months processed: {monthlyDataList.Count}");
//                 }

//                 return new MonthlyVatSummaryDTO
//                 {
//                     CompanyDateFormat = dateFormat,
//                     NepaliDate = currentNepaliDate,
//                     Company = company,
//                     CurrentFiscalYear = currentFiscalYear,
//                     CurrentNepaliYear = currentNepaliYear,
//                     CurrentCompany = company,
//                     Totals = null,
//                     MonthlyData = monthlyDataList,
//                     Month = null,
//                     Year = dateFormat == "english" ? year : null,
//                     NepaliMonth = null,
//                     NepaliYear = dateFormat == "nepali" ? nepaliYear : null,
//                     ReportDateRange = dateFormat == "english" ? $"{year} (All Months)" : $"{nepaliYear} (Shrawan - Ashad)",
//                     CurrentCompanyName = company?.Name ?? "",
//                 };
//             }
//         }

//         private async Task<MonthDataResult?> GetMonthDataByAdDatesAsync(
//             Guid companyId,
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
//                 int monthInt = int.Parse(nepaliMonth);
//                 reportDateRange = $"{GetNepaliMonthName(monthInt)}, {nepaliYear}";
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

//             _logger.LogInformation($"Querying with AD date range: {startDateTime:yyyy-MM-dd} to {endDateTime:yyyy-MM-dd} for {reportDateRange}");

//             // Query using AD dates (Date field)
//             var salesBills = await _context.SalesBills
//                 .Where(s => s.CompanyId == companyId &&
//                            s.Date >= startDateTime &&
//                            s.Date <= endDateTime)
//                 .ToListAsync();

//             var salesReturns = await _context.SalesReturns
//                 .Where(s => s.CompanyId == companyId &&
//                            s.Date >= startDateTime &&
//                            s.Date <= endDateTime)
//                 .ToListAsync();

//             var purchaseBills = await _context.PurchaseBills
//                 .Where(p => p.CompanyId == companyId &&
//                            p.Date >= startDateTime &&
//                            p.Date <= endDateTime)
//                 .ToListAsync();

//             var purchaseReturns = await _context.PurchaseReturns
//                 .Where(p => p.CompanyId == companyId &&
//                            p.Date >= startDateTime &&
//                            p.Date <= endDateTime)
//                 .ToListAsync();

//             // Calculate totals
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

//         private class MonthDataResult
//         {
//             public string ReportDateRange { get; set; } = string.Empty;
//             public VatTotalsDTO Totals { get; set; } = new VatTotalsDTO();
//         }
//     }
// }

//----------------------------------------------------------------end

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

        // Nepali month names (1-indexed)
        private readonly Dictionary<int, string> NepaliMonthNames = new Dictionary<int, string>
        {
            {1, "Baisakh"},
            {2, "Jestha"},
            {3, "Ashad"},
            {4, "Shrawan"},
            {5, "Bhadra"},
            {6, "Ashoj"},
            {7, "Kartik"},
            {8, "Mangsir"},
            {9, "Poush"},
            {10, "Magh"},
            {11, "Falgun"},
            {12, "Chaitra"}
        };

        public MonthlyVatSummaryService(
            ApplicationDbContext context,
            ILogger<MonthlyVatSummaryService> logger)
        {
            _context = context;
            _logger = logger;
        }

        private string GetNepaliMonthName(int month)
        {
            return NepaliMonthNames.ContainsKey(month) ? NepaliMonthNames[month] : $"Month {month}";
        }

        // Helper to convert Nepali date to English DateTime
        private DateTime? ConvertNepaliToEnglish(int year, int month, int day)
        {
            try
            {
                var nepaliDate = new NepaliDate(year, month, day);
                return nepaliDate.EnglishDate;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to convert Nepali date: {year}-{month}-{day}");
                return null;
            }
        }

        // Helper to get the last day of a Nepali month dynamically
        private int GetLastDayOfNepaliMonthDynamic(int year, int month)
        {
            try
            {
                // Try day 32 first (maximum possible days in any Nepali month)
                for (int day = 32; day >= 28; day--)
                {
                    try
                    {
                        var testDate = new NepaliDate(year, month, day);
                        // If we get here, the date is valid
                        if (testDate.EnglishDate != null)
                        {
                            return day;
                        }
                    }
                    catch
                    {
                        // Invalid date, try next day
                        continue;
                    }
                }
                return 30; // Default fallback
            }
            catch
            {
                return 30; // Default fallback
            }
        }

        // Helper to get the next month's first day
        private DateTime? GetNextMonthFirstDay(DateTime currentDate)
        {
            try
            {
                var nextMonth = currentDate.AddMonths(1);
                return new DateTime(nextMonth.Year, nextMonth.Month, 1);
            }
            catch
            {
                return null;
            }
        }

        public async Task<MonthlyVatSummaryDTO> GetMonthlyVatSummaryAsync(
            Guid companyId,
            string? month,
            string? year,
            string? nepaliMonth,
            string? nepaliYear,
            string? periodType,
            string dateFormat,
            string? fromDate,
            string? toDate)
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
                .Where(f => f.CompanyId == companyId)
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
                        if (firstDayAd == null)
                        {
                            throw new ArgumentException("Invalid Nepali date");
                        }

                        // Calculate last day by finding the first day of next month
                        DateTime startDate = firstDayAd.Value;
                        DateTime? endDateAd = null;
                        
                        // Try to get next month's first day
                        if (monthInt == 12)
                        {
                            // For Chaitra, next month is Baisakh of next year
                            var nextMonthFirstDay = ConvertNepaliToEnglish(yearInt + 1, 1, 1);
                            if (nextMonthFirstDay != null)
                            {
                                endDateAd = nextMonthFirstDay.Value.AddDays(-1);
                            }
                        }
                        else
                        {
                            var nextMonthFirstDay = ConvertNepaliToEnglish(yearInt, monthInt + 1, 1);
                            if (nextMonthFirstDay != null)
                            {
                                endDateAd = nextMonthFirstDay.Value.AddDays(-1);
                            }
                        }

                        if (endDateAd == null)
                        {
                            throw new ArgumentException("Invalid Nepali date - cannot calculate month end");
                        }

                        startDateTime = startDate;
                        endDateTime = endDateAd.Value.Date.AddDays(1).AddTicks(-1);
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

                var monthData = await GetMonthDataByAdDatesAsync(companyId, startDateTime, endDateTime, isNepali, month, year, nepaliMonth, nepaliYear);

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

                        var monthData = await GetMonthDataByAdDatesAsync(companyId, startDateTime, endDateTime, false, monthInt.ToString(), year, null, null);
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

                    // Process months from Shrawan (4) to Chaitra (12) of startYear
                    for (int monthInt = 4; monthInt <= 12; monthInt++)
                    {
                        try
                        {
                            _logger.LogInformation($"Processing month {monthInt} ({GetNepaliMonthName(monthInt)}) of year {startYear}");
                            
                            // Get first day of Nepali month
                            var firstDayAd = ConvertNepaliToEnglish(startYear, monthInt, 1);
                            if (firstDayAd == null)
                            {
                                _logger.LogWarning($"Failed to convert first day of month {monthInt}/{startYear}");
                                continue;
                            }
                            
                            // Calculate last day by finding the first day of next month
                            DateTime startDate = firstDayAd.Value;
                            DateTime? endDateAd = null;
                            
                            if (monthInt == 12)
                            {
                                // For Chaitra, next month is Baisakh of next year
                                var nextMonthFirstDay = ConvertNepaliToEnglish(startYear + 1, 1, 1);
                                if (nextMonthFirstDay != null)
                                {
                                    endDateAd = nextMonthFirstDay.Value.AddDays(-1);
                                }
                            }
                            else
                            {
                                var nextMonthFirstDay = ConvertNepaliToEnglish(startYear, monthInt + 1, 1);
                                if (nextMonthFirstDay != null)
                                {
                                    endDateAd = nextMonthFirstDay.Value.AddDays(-1);
                                }
                            }

                            if (endDateAd == null)
                            {
                                _logger.LogWarning($"Failed to calculate last day of month {monthInt}/{startYear}");
                                continue;
                            }

                            var startDateTime = startDate;
                            var endDateTime = endDateAd.Value.Date.AddDays(1).AddTicks(-1);

                            _logger.LogInformation($"Date range: {startDateTime:yyyy-MM-dd} to {endDateTime:yyyy-MM-dd}");

                            var monthData = await GetMonthDataByAdDatesAsync(companyId, startDateTime, endDateTime, true, null, null, monthInt.ToString(), startYear.ToString());
                            if (monthData != null)
                            {
                                monthlyDataList.Add(new MonthlyVatDataDTO
                                {
                                    ReportDateRange = monthData.ReportDateRange,
                                    Totals = monthData.Totals
                                });
                                _logger.LogInformation($"Successfully added data for {monthData.ReportDateRange}");
                            }
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, $"Error processing month {monthInt} of {startYear}");
                        }
                    }

                    // Process months from Baisakh (1) to Ashad (3) of endYear
                    for (int monthInt = 1; monthInt <= 3; monthInt++)
                    {
                        try
                        {
                            _logger.LogInformation($"Processing month {monthInt} ({GetNepaliMonthName(monthInt)}) of year {endYear}");
                            
                            // Get first day of Nepali month
                            var firstDayAd = ConvertNepaliToEnglish(endYear, monthInt, 1);
                            if (firstDayAd == null)
                            {
                                _logger.LogWarning($"Failed to convert first day of month {monthInt}/{endYear}");
                                continue;
                            }
                            
                            // Calculate last day by finding the first day of next month
                            DateTime startDate = firstDayAd.Value;
                            DateTime? endDateAd = null;
                            
                            if (monthInt == 3)
                            {
                                // For Ashad, next month is Shrawan of same year
                                var nextMonthFirstDay = ConvertNepaliToEnglish(endYear, 4, 1);
                                if (nextMonthFirstDay != null)
                                {
                                    endDateAd = nextMonthFirstDay.Value.AddDays(-1);
                                }
                            }
                            else
                            {
                                var nextMonthFirstDay = ConvertNepaliToEnglish(endYear, monthInt + 1, 1);
                                if (nextMonthFirstDay != null)
                                {
                                    endDateAd = nextMonthFirstDay.Value.AddDays(-1);
                                }
                            }

                            if (endDateAd == null)
                            {
                                _logger.LogWarning($"Failed to calculate last day of month {monthInt}/{endYear}");
                                continue;
                            }

                            var startDateTime = startDate;
                            var endDateTime = endDateAd.Value.Date.AddDays(1).AddTicks(-1);

                            _logger.LogInformation($"Date range: {startDateTime:yyyy-MM-dd} to {endDateTime:yyyy-MM-dd}");

                            var monthData = await GetMonthDataByAdDatesAsync(companyId, startDateTime, endDateTime, true, null, null, monthInt.ToString(), endYear.ToString());
                            if (monthData != null)
                            {
                                monthlyDataList.Add(new MonthlyVatDataDTO
                                {
                                    ReportDateRange = monthData.ReportDateRange,
                                    Totals = monthData.Totals
                                });
                                _logger.LogInformation($"Successfully added data for {monthData.ReportDateRange}");
                            }
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, $"Error processing month {monthInt} of {endYear}");
                        }
                    }
                }

                _logger.LogInformation($"Total months processed: {monthlyDataList.Count}");
                
                // Log which months were successfully added
                foreach (var item in monthlyDataList)
                {
                    _logger.LogInformation($"Month in result: {item.ReportDateRange}");
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
                reportDateRange = $"{GetNepaliMonthName(monthInt)}, {nepaliYear}";
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

            _logger.LogInformation($"Querying with AD date range: {startDateTime:yyyy-MM-dd} to {endDateTime:yyyy-MM-dd} for {reportDateRange}");

            try
            {
                // Query using AD dates (Date field)
                var salesBills = await _context.SalesBills
                    .Where(s => s.CompanyId == companyId &&
                               s.Date >= startDateTime &&
                               s.Date <= endDateTime)
                    .ToListAsync();

                var salesReturns = await _context.SalesReturns
                    .Where(s => s.CompanyId == companyId &&
                               s.Date >= startDateTime &&
                               s.Date <= endDateTime)
                    .ToListAsync();

                var purchaseBills = await _context.PurchaseBills
                    .Where(p => p.CompanyId == companyId &&
                               p.Date >= startDateTime &&
                               p.Date <= endDateTime)
                    .ToListAsync();

                var purchaseReturns = await _context.PurchaseReturns
                    .Where(p => p.CompanyId == companyId &&
                               p.Date >= startDateTime &&
                               p.Date <= endDateTime)
                    .ToListAsync();

                // Calculate totals
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
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error querying data for {reportDateRange}");
                return new MonthDataResult
                {
                    ReportDateRange = reportDateRange,
                    Totals = new VatTotalsDTO()
                };
            }
        }

        private class MonthDataResult
        {
            public string ReportDateRange { get; set; } = string.Empty;
            public VatTotalsDTO Totals { get; set; } = new VatTotalsDTO();
        }
    }
}