// using Microsoft.EntityFrameworkCore;
// using SkyForge.Data;
// using SkyForge.Dto.RetailerDto;
// using SkyForge.Models.Shared;
// using System.Text.RegularExpressions;

// namespace SkyForge.Services.Retailer.ProfitLossServices
// {
//     public class ProfitLossService : IProfitLossService
//     {
//         private readonly ApplicationDbContext _context;
//         private readonly ILogger<ProfitLossService> _logger;

//         public ProfitLossService(
//             ApplicationDbContext context,
//             ILogger<ProfitLossService> logger)
//         {
//             _context = context;
//             _logger = logger;
//         }

//         public async Task<InvoiceWiseProfitLossDataDto> GetInvoiceWiseProfitLossAsync(
//             Guid companyId,
//             Guid fiscalYearId,
//             DateTime? fromDate,
//             DateTime? toDate,
//             string? billNumber)
//         {
//             try
//             {
//                 _logger.LogInformation("GetInvoiceWiseProfitLossAsync called for Company: {CompanyId}, FiscalYear: {FiscalYearId}",
//                     companyId, fiscalYearId);

//                 // Get company details
//                 var company = await _context.Companies
//                     .Where(c => c.Id == companyId)
//                     .Select(c => new CompanyInfoDTO
//                     {
//                         Id = c.Id,
//                         Name = c.Name,
//                         RenewalDate = c.RenewalDate,
//                         DateFormat = c.DateFormat.ToString(),
//                         VatEnabled = c.VatEnabled
//                     })
//                     .FirstOrDefaultAsync();

//                 if (company == null)
//                     throw new ArgumentException("Company not found");

//                 // Get fiscal year
//                 var currentFiscalYear = await _context.FiscalYears
//                     .Where(f => f.Id == fiscalYearId && f.CompanyId == companyId)
//                     .Select(f => new FiscalYearDTO
//                     {
//                         Id = f.Id,
//                         Name = f.Name,
//                         StartDate = f.StartDate,
//                         EndDate = f.EndDate,
//                         StartDateNepali = f.StartDateNepali,
//                         EndDateNepali = f.EndDateNepali,
//                         DateFormat = f.DateFormat.ToString(),
//                         IsActive = f.IsActive
//                     })
//                     .FirstOrDefaultAsync();

//                 // If no date range provided, return empty results
//                 if (!fromDate.HasValue || !toDate.HasValue)
//                 {
//                     return new InvoiceWiseProfitLossDataDto
//                     {
//                         Results = new List<InvoiceProfitLossDto>(),
//                         Summary = new ProfitLossSummaryDto(),
//                         FromDate = fromDate?.ToString("yyyy-MM-dd") ?? "",
//                         ToDate = toDate?.ToString("yyyy-MM-dd") ?? "",
//                         BillNumber = billNumber ?? "",
//                         Company = company,
//                         CurrentFiscalYear = currentFiscalYear,
//                         CurrentCompany = new CompanyInfoDTO
//                         {
//                             Id = company.Id,
//                             Name = company.Name,
//                             DateFormat = company.DateFormat
//                         },
//                         CurrentCompanyName = company.Name,
//                         CompanyDateFormat = company.DateFormat?.ToLower() ?? "english",
//                         User = new UserInfoDto()
//                     };
//                 }

//                 var startDate = fromDate.Value.Date;
//                 var endDate = toDate.Value.Date.AddDays(1).AddSeconds(-1);

//                 // Get sales results (positive profit)
//                 var salesResults = await GetSalesProfitLossItems(companyId, fiscalYearId, startDate, endDate, billNumber);

//                 // Get sales return results (negative profit)
//                 var salesReturnResults = await GetSalesReturnProfitLossItems(companyId, fiscalYearId, startDate, endDate, billNumber);

//                 // Combine and sort results
//                 var combinedResults = salesResults
//                     .Concat(salesReturnResults)
//                     .OrderBy(x => x.Date)
//                     .ThenBy(x => x.BillNumber)
//                     .ToList();

//                 // Calculate summary
//                 var summary = new ProfitLossSummaryDto
//                 {
//                     TotalProfit = combinedResults.Sum(x => x.TotalProfit),
//                     TotalSales = combinedResults.Sum(x => x.TotalSales),
//                     TotalCost = combinedResults.Sum(x => x.TotalCost),
//                     TotalInvoices = combinedResults.Count
//                 };

//                 return new InvoiceWiseProfitLossDataDto
//                 {
//                     Results = combinedResults,
//                     Summary = summary,
//                     FromDate = fromDate.Value.ToString("yyyy-MM-dd"),
//                     ToDate = toDate.Value.ToString("yyyy-MM-dd"),
//                     BillNumber = billNumber ?? "",
//                     Company = company,
//                     CurrentFiscalYear = currentFiscalYear,
//                     CurrentCompany = new CompanyInfoDTO
//                     {
//                         Id = company.Id,
//                         Name = company.Name,
//                         DateFormat = company.DateFormat
//                     },
//                     CurrentCompanyName = company.Name,
//                     CompanyDateFormat = company.DateFormat?.ToLower() ?? "english",
//                     User = new UserInfoDto()
//                 };
//             }
//             catch (Exception ex)
//             {
//                 _logger.LogError(ex, "Error in GetInvoiceWiseProfitLossAsync for Company: {CompanyId}", companyId);
//                 throw;
//             }
//         }

//         private async Task<List<InvoiceProfitLossDto>> GetSalesProfitLossItems(
//             Guid companyId,
//             Guid fiscalYearId,
//             DateTime startDate,
//             DateTime endDate,
//             string? billNumber)
//         {
//             // Step 1: Get the base query with filtered data
//             var query = _context.SalesBillItems
//                 .Include(sbi => sbi.SalesBill)
//                 .Include(sbi => sbi.Item)
//                 .Where(sbi => sbi.SalesBill.CompanyId == companyId &&
//                               sbi.SalesBill.FiscalYearId == fiscalYearId &&
//                               sbi.SalesBill.Date >= startDate &&
//                               sbi.SalesBill.Date <= endDate);

//             if (!string.IsNullOrEmpty(billNumber))
//             {
//                 query = query.Where(sbi => EF.Functions.Like(sbi.SalesBill.BillNumber, $"%{billNumber}%"));
//             }

//             // Step 2: Get the data first (execute the query)
//             var items = await query
//                 .Select(sbi => new
//                 {
//                     sbi.SalesBill.Id,
//                     sbi.SalesBill.BillNumber,
//                     sbi.SalesBill.Date,
//                     sbi.SalesBill.AccountId,
//                     AccountName = sbi.SalesBill.Account != null ? sbi.SalesBill.Account.Name : null,
//                     sbi.SalesBill.CashAccount,
//                     sbi.Quantity,
//                     NetPrice = sbi.NetPrice > 0 ? sbi.NetPrice : sbi.Price,
//                     NetPuPrice = sbi.NetPuPrice ?? 0,
//                     ItemName = sbi.Item != null ? sbi.Item.Name : null
//                 })
//                 .ToListAsync();

//             // Step 3: Group and calculate in memory
//             var groupedResults = items
//                 .GroupBy(x => new { x.Id, x.BillNumber, x.Date, x.AccountId, x.AccountName, x.CashAccount })
//                 .Select(g => new InvoiceProfitLossDto
//                 {
//                     Id = g.Key.Id,
//                     BillNumber = g.Key.BillNumber,
//                     Date = g.Key.Date,
//                     AccountId = g.Key.AccountId,
//                     AccountName = g.Key.AccountName,
//                     CashAccount = g.Key.CashAccount,
//                     TotalProfit = g.Sum(x => (x.NetPrice - x.NetPuPrice) * x.Quantity),
//                     TotalSales = g.Sum(x => x.NetPrice * x.Quantity),
//                     TotalCost = g.Sum(x => x.NetPuPrice * x.Quantity),
//                     IsReturn = false,
//                     Items = g.Select(x => new InvoiceItemDto
//                     {
//                         Quantity = x.Quantity,
//                         Price = x.NetPrice,
//                         PuPrice = x.NetPuPrice,
//                         ItemName = x.ItemName,
//                         IsReturn = false
//                     }).ToList()
//                 })
//                 .OrderBy(x => x.Date)
//                 .ThenBy(x => x.BillNumber)
//                 .ToList();

//             return groupedResults;
//         }

//         private async Task<List<InvoiceProfitLossDto>> GetSalesReturnProfitLossItems(
//             Guid companyId,
//             Guid fiscalYearId,
//             DateTime startDate,
//             DateTime endDate,
//             string? billNumber)
//         {
//             // Step 1: Get the base query with filtered data
//             var query = _context.SalesReturnItems
//                 .Include(sri => sri.SalesReturn)
//                 .Include(sri => sri.Item)
//                 .Where(sri => sri.SalesReturn.CompanyId == companyId &&
//                               sri.SalesReturn.FiscalYearId == fiscalYearId &&
//                               sri.SalesReturn.Date >= startDate &&
//                               sri.SalesReturn.Date <= endDate);

//             if (!string.IsNullOrEmpty(billNumber))
//             {
//                 query = query.Where(sri => EF.Functions.Like(sri.SalesReturn.BillNumber, $"%{billNumber}%"));
//             }

//             // Step 2: Get the data first (execute the query)
//             var items = await query
//                 .Select(sri => new
//                 {
//                     sri.SalesReturn.Id,
//                     sri.SalesReturn.BillNumber,
//                     sri.SalesReturn.Date,
//                     sri.SalesReturn.AccountId,
//                     AccountName = sri.SalesReturn.Account != null ? sri.SalesReturn.Account.Name : null,
//                     sri.SalesReturn.CashAccount,
//                     sri.Quantity,
//                     NetPrice = sri.NetPrice ?? sri.Price,
//                     NetPuPrice = sri.NetPuPrice,
//                     ItemName = sri.Item != null ? sri.Item.Name : null
//                 })
//                 .ToListAsync();

//             // Step 3: Group and calculate in memory
//             var groupedResults = items
//                 .GroupBy(x => new { x.Id, x.BillNumber, x.Date, x.AccountId, x.AccountName, x.CashAccount })
//                 .Select(g => new InvoiceProfitLossDto
//                 {
//                     Id = g.Key.Id,
//                     BillNumber = g.Key.BillNumber,
//                     Date = g.Key.Date,
//                     AccountId = g.Key.AccountId,
//                     AccountName = g.Key.AccountName,
//                     CashAccount = g.Key.CashAccount,
//                     TotalProfit = g.Sum(x => (x.NetPuPrice - x.NetPrice) * -1 * x.Quantity),
//                     TotalSales = g.Sum(x => x.NetPrice * x.Quantity * -1),
//                     TotalCost = g.Sum(x => x.NetPuPrice * x.Quantity * -1),
//                     IsReturn = true,
//                     Items = g.Select(x => new InvoiceItemDto
//                     {
//                         Quantity = x.Quantity,
//                         Price = x.NetPrice,
//                         PuPrice = x.NetPuPrice,
//                         ItemName = x.ItemName,
//                         IsReturn = true
//                     }).ToList()
//                 })
//                 .OrderBy(x => x.Date)
//                 .ThenBy(x => x.BillNumber)
//                 .ToList();

//             return groupedResults;
//         }
//     }
// }

//---------------------------------------------------------end

using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Dto.RetailerDto;
using SkyForge.Models.Shared;
using System.Text.RegularExpressions;

namespace SkyForge.Services.Retailer.ProfitLossServices
{
    public class ProfitLossService : IProfitLossService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<ProfitLossService> _logger;

        public ProfitLossService(
            ApplicationDbContext context,
            ILogger<ProfitLossService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<InvoiceWiseProfitLossDataDto> GetInvoiceWiseProfitLossAsync(
            Guid companyId,
            Guid fiscalYearId,
            DateTime? fromDate,
            DateTime? toDate,
            string? billNumber)
        {
            try
            {
                _logger.LogInformation("GetInvoiceWiseProfitLossAsync called for Company: {CompanyId}, FiscalYear: {FiscalYearId}",
                    companyId, fiscalYearId);

                // Get company details
                var company = await _context.Companies
                    .Where(c => c.Id == companyId)
                    .Select(c => new CompanyInfoDTO
                    {
                        Id = c.Id,
                        Name = c.Name,
                        RenewalDate = c.RenewalDate,
                        DateFormat = c.DateFormat.ToString(),
                        VatEnabled = c.VatEnabled
                    })
                    .FirstOrDefaultAsync();

                if (company == null)
                    throw new ArgumentException("Company not found");

                // Determine if company uses Nepali date format
                bool isNepaliFormat = company.DateFormat?.ToLower() == "nepali";

                // Get fiscal year
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
                        DateFormat = f.DateFormat.ToString(),
                        IsActive = f.IsActive
                    })
                    .FirstOrDefaultAsync();

                // If no date range provided, return empty results
                if (!fromDate.HasValue || !toDate.HasValue)
                {
                    return new InvoiceWiseProfitLossDataDto
                    {
                        Results = new List<InvoiceProfitLossDto>(),
                        Summary = new ProfitLossSummaryDto(),
                        FromDate = fromDate?.ToString("yyyy-MM-dd") ?? "",
                        ToDate = toDate?.ToString("yyyy-MM-dd") ?? "",
                        BillNumber = billNumber ?? "",
                        Company = company,
                        CurrentFiscalYear = currentFiscalYear,
                        CurrentCompany = new CompanyInfoDTO
                        {
                            Id = company.Id,
                            Name = company.Name,
                            DateFormat = company.DateFormat
                        },
                        CurrentCompanyName = company.Name,
                        CompanyDateFormat = company.DateFormat?.ToLower() ?? "english",
                        User = new UserInfoDto()
                    };
                }

                // Parse dates - they come as strings from frontend
                // For Nepali format, the dates are Nepali date strings
                // For English format, they are English date strings
                DateTime startDateTime;
                DateTime endDateTime;

                if (isNepaliFormat)
                {
                    // For Nepali dates, parse the date string as DateTime
                    // The frontend sends Nepali date string in YYYY-MM-DD format
                    if (!DateTime.TryParse(fromDate.Value.ToString("yyyy-MM-dd"), out startDateTime))
                    {
                        startDateTime = DateTime.MinValue;
                    }
                    if (!DateTime.TryParse(toDate.Value.ToString("yyyy-MM-dd"), out endDateTime))
                    {
                        endDateTime = DateTime.MaxValue;
                    }
                }
                else
                {
                    startDateTime = fromDate.Value.Date;
                    endDateTime = toDate.Value.Date.AddDays(1).AddSeconds(-1);
                }

                _logger.LogInformation("Searching for bills between {StartDate} and {EndDate} using {DateFormat} format",
                    startDateTime, endDateTime, isNepaliFormat ? "Nepali" : "English");

                // Get sales results (positive profit) - Pass isNepaliFormat flag
                var salesResults = await GetSalesProfitLossItems(companyId, fiscalYearId, startDateTime, endDateTime, billNumber, isNepaliFormat);

                // Get sales return results (negative profit) - Pass isNepaliFormat flag
                var salesReturnResults = await GetSalesReturnProfitLossItems(companyId, fiscalYearId, startDateTime, endDateTime, billNumber, isNepaliFormat);

                // Combine and sort results
                var combinedResults = salesResults
                    .Concat(salesReturnResults)
                    .OrderBy(x => x.Date)
                    .ThenBy(x => x.BillNumber)
                    .ToList();

                // Calculate summary
                var summary = new ProfitLossSummaryDto
                {
                    TotalProfit = combinedResults.Sum(x => x.TotalProfit),
                    TotalSales = combinedResults.Sum(x => x.TotalSales),
                    TotalCost = combinedResults.Sum(x => x.TotalCost),
                    TotalInvoices = combinedResults.Count
                };

                return new InvoiceWiseProfitLossDataDto
                {
                    Results = combinedResults,
                    Summary = summary,
                    FromDate = fromDate.Value.ToString("yyyy-MM-dd"),
                    ToDate = toDate.Value.ToString("yyyy-MM-dd"),
                    BillNumber = billNumber ?? "",
                    Company = company,
                    CurrentFiscalYear = currentFiscalYear,
                    CurrentCompany = new CompanyInfoDTO
                    {
                        Id = company.Id,
                        Name = company.Name,
                        DateFormat = company.DateFormat
                    },
                    CurrentCompanyName = company.Name,
                    CompanyDateFormat = company.DateFormat?.ToLower() ?? "english",
                    User = new UserInfoDto()
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetInvoiceWiseProfitLossAsync for Company: {CompanyId}", companyId);
                throw;
            }
        }

        private async Task<List<InvoiceProfitLossDto>> GetSalesProfitLossItems(
            Guid companyId,
            Guid fiscalYearId,
            DateTime startDate,
            DateTime endDate,
            string? billNumber,
            bool isNepaliFormat)
        {
            // Build query based on date format
            var query = _context.SalesBillItems
                .Include(sbi => sbi.SalesBill)
                .Include(sbi => sbi.Item)
                .Where(sbi => sbi.SalesBill.CompanyId == companyId &&
                              sbi.SalesBill.FiscalYearId == fiscalYearId);

            // Apply date filter based on company's date format
            if (isNepaliFormat)
            {
                // Use nepaliDate field for filtering
                query = query.Where(sbi => sbi.SalesBill.nepaliDate >= startDate && sbi.SalesBill.nepaliDate <= endDate);
                _logger.LogInformation("Using nepaliDate field for sales filtering");
            }
            else
            {
                // Use Date field for filtering
                query = query.Where(sbi => sbi.SalesBill.Date >= startDate && sbi.SalesBill.Date <= endDate);
                _logger.LogInformation("Using Date field for sales filtering");
            }

            if (!string.IsNullOrEmpty(billNumber))
            {
                query = query.Where(sbi => EF.Functions.Like(sbi.SalesBill.BillNumber, $"%{billNumber}%"));
            }

            // Get the data
            var items = await query
                .Select(sbi => new
                {
                    // Use the appropriate date field for the output
                    Date = isNepaliFormat ? sbi.SalesBill.nepaliDate : sbi.SalesBill.Date,
                    sbi.SalesBill.Id,
                    sbi.SalesBill.BillNumber,
                    sbi.SalesBill.AccountId,
                    AccountName = sbi.SalesBill.Account != null ? sbi.SalesBill.Account.Name : null,
                    sbi.SalesBill.CashAccount,
                    sbi.Quantity,
                    NetPrice = sbi.NetPrice > 0 ? sbi.NetPrice : sbi.Price,
                    NetPuPrice = sbi.NetPuPrice ?? 0,
                    ItemName = sbi.Item != null ? sbi.Item.Name : null
                })
                .ToListAsync();

            // Group and calculate in memory
            var groupedResults = items
                .GroupBy(x => new { x.Id, x.BillNumber, x.Date, x.AccountId, x.AccountName, x.CashAccount })
                .Select(g => new InvoiceProfitLossDto
                {
                    Id = g.Key.Id,
                    BillNumber = g.Key.BillNumber,
                    Date = g.Key.Date,
                    AccountId = g.Key.AccountId,
                    AccountName = g.Key.AccountName,
                    CashAccount = g.Key.CashAccount,
                    TotalProfit = g.Sum(x => (x.NetPrice - x.NetPuPrice) * x.Quantity),
                    TotalSales = g.Sum(x => x.NetPrice * x.Quantity),
                    TotalCost = g.Sum(x => x.NetPuPrice * x.Quantity),
                    IsReturn = false,
                    Items = g.Select(x => new InvoiceItemDto
                    {
                        Quantity = x.Quantity,
                        Price = x.NetPrice,
                        PuPrice = x.NetPuPrice,
                        ItemName = x.ItemName,
                        IsReturn = false
                    }).ToList()
                })
                .OrderBy(x => x.Date)
                .ThenBy(x => x.BillNumber)
                .ToList();

            return groupedResults;
        }

        private async Task<List<InvoiceProfitLossDto>> GetSalesReturnProfitLossItems(
            Guid companyId,
            Guid fiscalYearId,
            DateTime startDate,
            DateTime endDate,
            string? billNumber,
            bool isNepaliFormat)
        {
            // Build query based on date format
            var query = _context.SalesReturnItems
                .Include(sri => sri.SalesReturn)
                .Include(sri => sri.Item)
                .Where(sri => sri.SalesReturn.CompanyId == companyId &&
                              sri.SalesReturn.FiscalYearId == fiscalYearId);

            // Apply date filter based on company's date format
            if (isNepaliFormat)
            {
                // Use nepaliDate field for filtering
                query = query.Where(sri => sri.SalesReturn.nepaliDate >= startDate && sri.SalesReturn.nepaliDate <= endDate);
                _logger.LogInformation("Using nepaliDate field for sales return filtering");
            }
            else
            {
                // Use Date field for filtering
                query = query.Where(sri => sri.SalesReturn.Date >= startDate && sri.SalesReturn.Date <= endDate);
                _logger.LogInformation("Using Date field for sales return filtering");
            }

            if (!string.IsNullOrEmpty(billNumber))
            {
                query = query.Where(sri => EF.Functions.Like(sri.SalesReturn.BillNumber, $"%{billNumber}%"));
            }

            // Get the data
            var items = await query
                .Select(sri => new
                {
                    // Use the appropriate date field for the output
                    Date = isNepaliFormat ? sri.SalesReturn.nepaliDate : sri.SalesReturn.Date,
                    sri.SalesReturn.Id,
                    sri.SalesReturn.BillNumber,
                    sri.SalesReturn.AccountId,
                    AccountName = sri.SalesReturn.Account != null ? sri.SalesReturn.Account.Name : null,
                    sri.SalesReturn.CashAccount,
                    sri.Quantity,
                    NetPrice = sri.NetPrice ?? sri.Price,
                    NetPuPrice = sri.NetPuPrice,
                    ItemName = sri.Item != null ? sri.Item.Name : null
                })
                .ToListAsync();

            // Group and calculate in memory
            var groupedResults = items
                .GroupBy(x => new { x.Id, x.BillNumber, x.Date, x.AccountId, x.AccountName, x.CashAccount })
                .Select(g => new InvoiceProfitLossDto
                {
                    Id = g.Key.Id,
                    BillNumber = g.Key.BillNumber,
                    Date = g.Key.Date,
                    AccountId = g.Key.AccountId,
                    AccountName = g.Key.AccountName,
                    CashAccount = g.Key.CashAccount,
                    TotalProfit = g.Sum(x => (x.NetPuPrice - x.NetPrice) * -1 * x.Quantity),
                    TotalSales = g.Sum(x => x.NetPrice * x.Quantity * -1),
                    TotalCost = g.Sum(x => x.NetPuPrice * x.Quantity * -1),
                    IsReturn = true,
                    Items = g.Select(x => new InvoiceItemDto
                    {
                        Quantity = x.Quantity,
                        Price = x.NetPrice,
                        PuPrice = x.NetPuPrice,
                        ItemName = x.ItemName,
                        IsReturn = true
                    }).ToList()
                })
                .OrderBy(x => x.Date)
                .ThenBy(x => x.BillNumber)
                .ToList();

            return groupedResults;
        }
    }
}