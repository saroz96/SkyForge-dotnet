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

namespace SkyForge.Services.Retailer.MonthlyVatSummaryServices
{
    public class MonthlyVatSummaryService : IMonthlyVatSummaryService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<MonthlyVatSummaryService> _logger;

        public MonthlyVatSummaryService(
            ApplicationDbContext context,
            ILogger<MonthlyVatSummaryService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<MonthlyVatSummaryDTO> GetMonthlyVatSummaryAsync(
            Guid companyId,
            Guid fiscalYearId,
            string? month,
            string? year,
            string? nepaliMonth,
            string? nepaliYear,
            string? periodType,
            string dateFormat)
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
                int monthInt, yearInt;
                if (isNepali)
                {
                    monthInt = int.Parse(nepaliMonth!);
                    yearInt = int.Parse(nepaliYear!);
                }
                else
                {
                    monthInt = int.Parse(month!);
                    yearInt = int.Parse(year!);
                }

                var monthData = await GetMonthDataAsync(companyId, fiscalYearId, monthInt, yearInt, isNepali);

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
                        var monthData = await GetMonthDataAsync(companyId, fiscalYearId, monthInt, yearInt, false);
                        if (monthData != null)
                        {
                            monthlyDataList.Add(new MonthlyVatDataDTO
                            {
                                ReportDateRange = monthData.ReportDateRange,
                                Totals = monthData.Totals
                            });
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
                        Year = yearInt.ToString(),
                        NepaliMonth = null,
                        NepaliYear = null,
                        ReportDateRange = $"{yearInt} (All Months)",
                        CurrentCompanyName = company?.Name ?? "",
                    };
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

                    // Months from Shrawan (4) to Falgun (12) of start year
                    for (int monthInt = 4; monthInt <= 12; monthInt++)
                    {
                        var monthData = await GetMonthDataAsync(companyId, fiscalYearId, monthInt, startYear, true);
                        if (monthData != null)
                        {
                            monthlyDataList.Add(new MonthlyVatDataDTO
                            {
                                ReportDateRange = monthData.ReportDateRange,
                                Totals = monthData.Totals
                            });
                        }
                    }

                    // Months from Baisakh (1) to Ashad (3) of end year
                    for (int monthInt = 1; monthInt <= 3; monthInt++)
                    {
                        var monthData = await GetMonthDataAsync(companyId, fiscalYearId, monthInt, endYear, true);
                        if (monthData != null)
                        {
                            monthlyDataList.Add(new MonthlyVatDataDTO
                            {
                                ReportDateRange = monthData.ReportDateRange,
                                Totals = monthData.Totals
                            });
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
                        Year = null,
                        NepaliMonth = null,
                        NepaliYear = fiscalYearStr,
                        ReportDateRange = $"{fiscalYearStr} (Shrawan - Ashad)",
                        CurrentCompanyName = company?.Name ?? "",
                    };
                }
            }
        }

        private async Task<MonthDataResult?> GetMonthDataAsync(
            Guid companyId,
            Guid fiscalYearId,
            int monthInt,
            int yearInt,
            bool isNepali)
        {
            string reportDateRange;

            if (isNepali)
            {
                // Validate inputs
                if (monthInt < 1 || monthInt > 12 || yearInt < 2000 || yearInt > 2100)
                {
                    return null;
                }

                string[] monthNames = { "Baisakh", "Jestha", "Ashad", "Shrawan", "Bhadra", "Ashoj",
                    "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra" };
                reportDateRange = $"{monthNames[monthInt - 1]}, {yearInt}";

                // Create the date pattern to match (e.g., "2082-04" for Shrawan)
                string datePattern = $"{yearInt}-{monthInt:D2}";

                _logger.LogInformation($"Querying Nepali month: {reportDateRange} with pattern: {datePattern}");

                // For Nepali dates - use string matching with StartsWith or Contains
                // This will match all records where nepali_date starts with "2082-04"
                var salesBills = await _context.SalesBills
                    .Where(s => s.CompanyId == companyId &&
                               s.FiscalYearId == fiscalYearId &&
                               s.nepaliDate.ToString().StartsWith(datePattern))
                    .ToListAsync();

                var salesReturns = await _context.SalesReturns
                    .Where(s => s.CompanyId == companyId &&
                               s.FiscalYearId == fiscalYearId &&
                               s.nepaliDate.ToString().StartsWith(datePattern))
                    .ToListAsync();

                var purchaseBills = await _context.PurchaseBills
                    .Where(p => p.CompanyId == companyId &&
                               p.FiscalYearId == fiscalYearId &&
                               p.nepaliDate.ToString().StartsWith(datePattern))
                    .ToListAsync();

                var purchaseReturns = await _context.PurchaseReturns
                    .Where(p => p.CompanyId == companyId &&
                               p.FiscalYearId == fiscalYearId &&
                               p.nepaliDate.ToString().StartsWith(datePattern))
                    .ToListAsync();

                // Aggregate data
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
            else
            {
                // English dates - use Date field with DateTime range
                var fromDateTime = new DateTime(yearInt, monthInt, 1);
                var toDateTime = fromDateTime.AddMonths(1).AddDays(-1).Date.AddDays(1).AddTicks(-1);

                string[] monthNames = { "January", "February", "March", "April", "May", "June",
                    "July", "August", "September", "October", "November", "December" };
                reportDateRange = $"{monthNames[monthInt - 1]}, {yearInt}";

                _logger.LogInformation($"Querying English month: {reportDateRange}");

                var salesBills = await _context.SalesBills
                    .Where(s => s.CompanyId == companyId &&
                               s.FiscalYearId == fiscalYearId &&
                               s.Date >= fromDateTime &&
                               s.Date <= toDateTime)
                    .ToListAsync();

                var salesReturns = await _context.SalesReturns
                    .Where(s => s.CompanyId == companyId &&
                               s.FiscalYearId == fiscalYearId &&
                               s.Date >= fromDateTime &&
                               s.Date <= toDateTime)
                    .ToListAsync();

                var purchaseBills = await _context.PurchaseBills
                    .Where(p => p.CompanyId == companyId &&
                               p.FiscalYearId == fiscalYearId &&
                               p.Date >= fromDateTime &&
                               p.Date <= toDateTime)
                    .ToListAsync();

                var purchaseReturns = await _context.PurchaseReturns
                    .Where(p => p.CompanyId == companyId &&
                               p.FiscalYearId == fiscalYearId &&
                               p.Date >= fromDateTime &&
                               p.Date <= toDateTime)
                    .ToListAsync();

                // Aggregate data
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

                return new MonthDataResult
                {
                    ReportDateRange = reportDateRange,
                    Totals = totals
                };
            }
        }
    }
}