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
                        Address = c.Address,      // Add this
                        City = c.City,            // Add this
                        Pan = c.Pan,              // Add this
                        Phone = c.Phone,          // Add this
                        RenewalDate = c.RenewalDate,
                        DateFormat = c.DateFormat.ToString(),
                        VatEnabled = c.VatEnabled
                    })
                    .FirstOrDefaultAsync();

                if (company == null)
                    throw new ArgumentException("Company not found");

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

                // Parse dates as AD dates (frontend sends AD dates)
                DateTime startDateTime = fromDate.Value.Date;
                DateTime endDateTime = toDate.Value.Date.AddDays(1).AddTicks(-1);

                _logger.LogInformation("Searching for bills between {StartDate} and {EndDate} (AD dates)",
                    startDateTime, endDateTime);

                // Get sales results (positive profit) - ALWAYS use Date field
                var salesResults = await GetSalesProfitLossItems(companyId, startDateTime, endDateTime, billNumber);

                // Get sales return results (negative profit) - ALWAYS use Date field
                var salesReturnResults = await GetSalesReturnProfitLossItems(companyId, startDateTime, endDateTime, billNumber);

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
            DateTime startDate,
            DateTime endDate,
            string? billNumber)
        {
            // Build query - ALWAYS use Date field for filtering
            var query = _context.SalesBillItems
                .Include(sbi => sbi.SalesBill)
                .Include(sbi => sbi.Item)
                .Where(sbi => sbi.SalesBill.CompanyId == companyId &&
                              sbi.SalesBill.Date >= startDate &&
                              sbi.SalesBill.Date <= endDate);

            _logger.LogInformation("Using Date field for sales filtering between {StartDate} and {EndDate}", startDate, endDate);

            if (!string.IsNullOrEmpty(billNumber))
            {
                query = query.Where(sbi => EF.Functions.Like(sbi.SalesBill.BillNumber, $"%{billNumber}%"));
            }

            // Get the data
            var items = await query
                .Select(sbi => new
                {
                    Date = sbi.SalesBill.Date,
                    NepaliDate = sbi.SalesBill.NepaliDate,
                    sbi.SalesBill.Id,
                    sbi.SalesBill.BillNumber,
                    sbi.SalesBill.AccountId,
                    AccountName = sbi.SalesBill.Account != null ? sbi.SalesBill.Account.Name : null,
                    sbi.SalesBill.CashAccount,
                    sbi.Quantity,
                    SellingPrice = sbi.NetPrice > 0 ? sbi.NetPrice : sbi.Price,
                    CostPrice = sbi.PuPrice ?? 0,
                    ItemName = sbi.Item != null ? sbi.Item.Name : null
                })
                .ToListAsync();

            // Group and calculate in memory
            var groupedResults = items
                .GroupBy(x => new { x.Id, x.BillNumber, x.Date, x.NepaliDate, x.AccountId, x.AccountName, x.CashAccount })
                .Select(g => new InvoiceProfitLossDto
                {
                    Id = g.Key.Id,
                    BillNumber = g.Key.BillNumber,
                    Date = g.Key.Date,
                    NepaliDate = g.Key.NepaliDate,
                    AccountId = g.Key.AccountId,
                    AccountName = g.Key.AccountName,
                    CashAccount = g.Key.CashAccount,
                    // Profit = (Selling Price - Cost Price) * Quantity
                    TotalProfit = g.Sum(x => (x.SellingPrice - x.CostPrice) * x.Quantity),
                    TotalSales = g.Sum(x => x.SellingPrice * x.Quantity),
                    TotalCost = g.Sum(x => x.CostPrice * x.Quantity),
                    IsReturn = false,
                    Items = g.Select(x => new InvoiceItemDto
                    {
                        Quantity = x.Quantity,
                        Price = x.SellingPrice,
                        PuPrice = x.CostPrice,
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
            DateTime startDate,
            DateTime endDate,
            string? billNumber)
        {
            // Build query - ALWAYS use Date field for filtering
            var query = _context.SalesReturnItems
                .Include(sri => sri.SalesReturn)
                .Include(sri => sri.Item)
                .Where(sri => sri.SalesReturn.CompanyId == companyId &&
                              sri.SalesReturn.Date >= startDate &&
                              sri.SalesReturn.Date <= endDate);

            _logger.LogInformation("Using Date field for sales return filtering between {StartDate} and {EndDate}", startDate, endDate);

            if (!string.IsNullOrEmpty(billNumber))
            {
                query = query.Where(sri => EF.Functions.Like(sri.SalesReturn.BillNumber, $"%{billNumber}%"));
            }

            // Get the data
            var items = await query
                .Select(sri => new
                {
                    Date = sri.SalesReturn.Date,
                    NepaliDate = sri.SalesReturn.NepaliDate,
                    sri.SalesReturn.Id,
                    sri.SalesReturn.BillNumber,
                    sri.SalesReturn.AccountId,
                    AccountName = sri.SalesReturn.Account != null ? sri.SalesReturn.Account.Name : null,
                    sri.SalesReturn.CashAccount,
                    sri.Quantity,
                    SellingPrice = sri.NetPrice ?? sri.Price,
                    CostPrice = sri.PuPrice,
                    ItemName = sri.Item != null ? sri.Item.Name : null
                })
                .ToListAsync();

            // Group and calculate in memory
            // FOR RETURNS: They reduce profit, so values should be negative
            var groupedResults = items
                .GroupBy(x => new { x.Id, x.BillNumber, x.Date, x.NepaliDate, x.AccountId, x.AccountName, x.CashAccount })
                .Select(g => new InvoiceProfitLossDto
                {
                    Id = g.Key.Id,
                    BillNumber = g.Key.BillNumber,
                    Date = g.Key.Date,
                    NepaliDate = g.Key.NepaliDate,
                    AccountId = g.Key.AccountId,
                    AccountName = g.Key.AccountName,
                    CashAccount = g.Key.CashAccount,
                    // This represents the loss of profit from the return
                    TotalProfit = g.Sum(x => (x.CostPrice - x.SellingPrice) * x.Quantity ?? 0),
                    // Sales amount is negative (reducing sales)
                    TotalSales = g.Sum(x => -(x.SellingPrice * x.Quantity)),
                    // Cost amount is negative (reducing cost)
                    TotalCost = g.Sum(x => -(x.CostPrice * x.Quantity) ?? 0),
                    IsReturn = true,
                    Items = g.Select(x => new InvoiceItemDto
                    {
                        Quantity = x.Quantity,
                        Price = x.SellingPrice,
                        PuPrice = x.CostPrice??0,
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