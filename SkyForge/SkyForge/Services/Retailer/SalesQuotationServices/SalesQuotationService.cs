using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Dto.RetailerDto.SalesQuotationDto;
using SkyForge.Services.Retailer.SalesQuotationServices;
using SkyForge.Services.BillNumberServices;
using SkyForge.Dto.AccountDto;
using SkyForge.Models.AccountModel;
using SkyForge.Models.Shared;
using SkyForge.Models.Retailer.TransactionModel;



using SkyForge.Models.Retailer.SalesQuotationModel;

namespace SkyForge.Services.Retailer.SalesQuotationServices
{
    public class SalesQuotationService : ISalesQuotationService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<SalesQuotationService> _logger;
        private readonly IBillNumberService _billNumberService;

        public SalesQuotationService(
            ApplicationDbContext context,
            ILogger<SalesQuotationService> logger,
            IBillNumberService billNumberService)
        {
            _context = context;
            _logger = logger;
            _billNumberService = billNumberService;
        }
        public async Task<SalesQuotation> CreateSalesQuotationAsync(CreateSalesQuotationDTO dto, Guid userId, Guid companyId, Guid fiscalYearId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                _logger.LogInformation("Creating sales quotation for Company: {CompanyId}, User: {UserId}", companyId, userId);

                // Validate company and fiscal year
                var company = await _context.Companies.FindAsync(companyId);
                if (company == null)
                    throw new ArgumentException("Company not found");

                var fiscalYear = await _context.FiscalYears.FindAsync(fiscalYearId);
                if (fiscalYear == null || fiscalYear.CompanyId != companyId)
                    throw new ArgumentException("Invalid fiscal year");

                // Parse VAT exemption status
                bool isVatExemptBool = dto.IsVatExempt == "true" || dto.IsVatExempt == "True" || dto.IsVatExempt == "1";
                bool isVatAll = dto.IsVatExempt == "all";

                // Generate bill number
                var billNumber = await _billNumberService.GetNextBillNumberAsync(companyId, fiscalYearId, "salesQuotation");

                // Validate account
                var account = await _context.Accounts
                    .FirstOrDefaultAsync(a => a.Id == dto.AccountId && a.CompanyId == companyId);
                if (account == null)
                    throw new ArgumentException("Invalid account for this company");

                // Validate items
                foreach (var itemDto in dto.Items)
                {
                    var item = await _context.Items
                        .FirstOrDefaultAsync(i => i.Id == itemDto.ItemId && i.CompanyId == companyId);

                    if (item == null)
                        throw new ArgumentException($"Item with id {itemDto.ItemId} not found");

                    // Validate unit belongs to company
                    var unit = await _context.Units
                        .FirstOrDefaultAsync(u => u.Id == itemDto.UnitId && u.CompanyId == companyId);
                    if (unit == null)
                        throw new ArgumentException($"Invalid unit for item: {item.Name}");
                }

                // Create sales quotation - directly using values from DTO
                var salesQuotation = new SalesQuotation
                {
                    Id = Guid.NewGuid(),
                    CompanyId = companyId,
                    UserId = userId,
                    BillNumber = billNumber,
                    AccountId = dto.AccountId,
                    SettingsId = dto.SettingsId, // Directly from DTO
                    FiscalYearId = fiscalYearId,
                    PurchaseSalesType = "SalesQuotation",
                    Items = new List<SalesQuotationItem>(),
                    SubTotal = dto.SubTotal ?? 0,
                    NonVatSales = dto.NonVatSales ?? 0,
                    TaxableAmount = dto.TaxableAmount ?? 0,
                    DiscountPercentage = dto.DiscountPercentage ?? 0,
                    DiscountAmount = dto.DiscountAmount ?? 0,
                    VatPercentage = isVatExemptBool ? 0 : dto.VatPercentage,
                    VatAmount = dto.VatAmount ?? 0,
                    TotalAmount = dto.TotalAmount ?? 0,
                    IsVatExempt = isVatExemptBool,
                    IsVatAll = isVatAll ? "all" : null,
                    RoundOffAmount = dto.RoundOffAmount ?? 0,
                    PaymentMode = dto.PaymentMode,
                    Description = dto.Description,
                    nepaliDate = dto.NepaliDate,
                    transactionDateNepali = dto.TransactionDateNepali,
                    Date = dto.Date,
                    TransactionDate = dto.TransactionDate,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                // Add sales quotation to context
                await _context.SalesQuotations.AddAsync(salesQuotation);

                // Process items
                foreach (var itemDto in dto.Items)
                {
                    var item = await _context.Items
                        .FirstOrDefaultAsync(i => i.Id == itemDto.ItemId);

                    if (item == null)
                        throw new ArgumentException($"Item with id {itemDto.ItemId} not found");

                    // Create quotation item - directly using values from DTO
                    var quotationItem = new SalesQuotationItem
                    {
                        Id = Guid.NewGuid(),
                        SalesQuotationId = salesQuotation.Id,
                        ItemId = itemDto.ItemId,
                        UnitId = itemDto.UnitId,
                        Quantity = itemDto.Quantity,
                        Price = itemDto.Price,
                        VatStatus = item.VatStatus ?? "vatable",
                        Description = itemDto.Description,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };

                    salesQuotation.Items.Add(quotationItem);
                    await _context.SalesQuotationItems.AddAsync(quotationItem);
                }

                // Save everything at once
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                _logger.LogInformation("Successfully created sales quotation with ID: {QuotationId}, Number: {BillNumber}",
                    salesQuotation.Id, salesQuotation.BillNumber);

                return salesQuotation;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Error creating sales quotation");
                throw;
            }
        }

        private async Task<Guid?> GetDefaultAccountIdAsync(string accountName, Guid companyId)
        {
            var account = await _context.Accounts
                .FirstOrDefaultAsync(a => a.Name == accountName && a.CompanyId == companyId);
            return account?.Id;
        }
        private PaymentMode ParsePaymentMode(string? paymentMode)
        {
            return paymentMode?.ToLower() switch
            {
                "cash" => PaymentMode.Cash,
                "credit" => PaymentMode.Credit,
                "payment" => PaymentMode.Payment,
                "receipt" => PaymentMode.Receipt,
                "journal" => PaymentMode.Journal,
                "drnote" => PaymentMode.DrNote,
                "crnote" => PaymentMode.CrNote,
                _ => PaymentMode.Credit // Default to Credit
            };
        }

        public async Task<SalesQuotationResponseDTO> GetSalesQuotationAsync(Guid companyId, Guid fiscalYearId, Guid userId)
        {
            try
            {
                _logger.LogInformation("GetSalesQuotationAsync called for Company: {CompanyId}, User: {UserId}", companyId, userId);

                // Get company with all required fields
                var company = await _context.Companies
                    .Where(c => c.Id == companyId)
                    .Select(c => new CompanyInfoDTO
                    {
                        Id = c.Id,
                        DateFormat = c.DateFormat.ToString(),
                        VatEnabled = c.VatEnabled,
                    })
                    .FirstOrDefaultAsync();

                if (company == null)
                    return null;

                // Get fiscal year
                var currentFiscalYear = await _context.FiscalYears
                    .Where(fy => fy.Id == fiscalYearId && fy.CompanyId == companyId)
                    .Select(fy => new FiscalYearInfoDTO
                    {
                        Id = fy.Id,
                        Name = fy.Name,
                        StartDate = fy.StartDate,
                        EndDate = fy.EndDate,
                        IsActive = fy.IsActive,
                        DateFormat = fy.DateFormat.ToString()
                    })
                    .FirstOrDefaultAsync();

                // Get relevant company groups (Sundry Debtors for sales)
                var relevantGroupNames = new[] { "Sundry Debtors" };
                var relevantGroups = await _context.AccountGroups
                    .Where(cg => cg.CompanyId == companyId && relevantGroupNames.Contains(cg.Name))
                    .Select(cg => cg.Id)
                    .ToListAsync();

                // Get categories
                var categories = await _context.Categories
                    .Where(c => c.CompanyId == companyId)
                    .Select(c => new CategoryInfoDTO
                    {
                        Id = c.Id,
                        Name = c.Name
                    })
                    .ToListAsync();

                // Get units
                var units = await _context.Units
                    .Where(u => u.CompanyId == companyId)
                    .Select(u => new UnitInfoDTO
                    {
                        Id = u.Id,
                        Name = u.Name
                    })
                    .ToListAsync();

                // Get all company groups (not just Sundry Debtors)
                var companyGroups = await _context.AccountGroups
                    .Where(ag => ag.CompanyId == companyId)
                    .Select(ag => new CompanyGroupInfoDTO
                    {
                        Id = ag.Id,
                        Name = ag.Name
                    })
                    .ToListAsync();

                // Get user for preferences and permissions
                var user = await _context.Users
                    .Include(u => u.UserRoles)
                        .ThenInclude(ur => ur.Role)
                    .FirstOrDefaultAsync(u => u.Id == userId);

                bool isAdmin = user?.IsAdmin ?? false;
                string userRole = "User";

                if (isAdmin)
                {
                    userRole = "Admin";
                }
                else if (user?.UserRoles != null)
                {
                    var primaryRole = user.UserRoles.FirstOrDefault(ur => ur.IsPrimary);
                    if (primaryRole?.Role != null)
                    {
                        userRole = primaryRole.Role.Name;
                    }
                }

                // Date handling
                var today = DateTime.UtcNow;
                var nepaliDate = today.ToString("yyyy-MM-dd");
                var transactionDateNepali = today.ToString("yyyy-MM-dd");
                var companyDateFormat = company.DateFormat?.ToLower() ?? "english";

                // Get next quotation number from bill counter
                var currentBillNumber = await _billNumberService.GetCurrentBillNumberAsync(
                    companyId,
                    fiscalYearId,
                    "salesQuotation");

                // Prepare response
                var response = new SalesQuotationResponseDTO
                {
                    Company = company,
                    Dates = new DatesDTO
                    {
                        NepaliDate = nepaliDate,
                        TransactionDateNepali = transactionDateNepali,
                        CompanyDateFormat = companyDateFormat
                    },
                    CurrentFiscalYear = currentFiscalYear,
                    NextQuotationNumber = currentBillNumber,
                    Categories = categories,
                    Units = units,
                    CompanyGroups = companyGroups,
                    UserPreferences = new UserPreferencesDTO
                    {
                        Theme = user?.Preferences?.Theme.ToString() ?? "light"
                    },
                    Permissions = new PermissionsDTO
                    {
                        IsAdminOrSupervisor = isAdmin || userRole == "Supervisor"
                    },
                    CompanyId = companyId,
                    UserId = userId,
                    FiscalYearId = fiscalYearId,
                    Date = today,
                    TransactionDate = today,
                    CreatedAt = today,
                    UpdatedAt = today
                };

                _logger.LogInformation("Successfully fetched sales quotation data for Company: {CompanyId}", companyId);
                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetSalesQuotationAsync for Company: {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<string> GetNextBillNumberAsync(Guid companyId, Guid fiscalYearId)
        {
            return await _billNumberService.GetNextBillNumberAsync(companyId, fiscalYearId, "salesQuotation");
        }

        public async Task<string> GetCurrentBillNumberAsync(Guid companyId, Guid fiscalYearId)
        {
            return await _billNumberService.GetCurrentBillNumberAsync(companyId, fiscalYearId, "salesQuotation");
        }


        public async Task<SalesQuotationRegisterDataDTO> GetSalesQuotationRegisterAsync(Guid companyId, Guid fiscalYearId, string? fromDate = null, string? toDate = null)
        {
            try
            {
                _logger.LogInformation("GetSalesQuotationRegisterAsync called with companyId: {CompanyId}, fiscalYearId: {FiscalYearId}, fromDate: {FromDate}, toDate: {ToDate}",
                    companyId, fiscalYearId, fromDate, toDate);

                // Get company information including date format
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
                        VatEnabled = c.VatEnabled,
                    })
                    .FirstOrDefaultAsync();

                if (company == null)
                    throw new ArgumentException("Company not found");

                // Determine if company uses Nepali date format
                bool isNepaliFormat = company.DateFormat?.ToLower() == "nepali";

                _logger.LogInformation("Company date format: {DateFormat}, IsNepaliFormat: {IsNepaliFormat}",
                    company.DateFormat, isNepaliFormat);

                // Get fiscal year
                var fiscalYear = await _context.FiscalYears
                    .Where(f => f.Id == fiscalYearId && f.CompanyId == companyId)
                    .Select(f => new FiscalYearInfoDTO
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

                // If no date range provided, return empty bill list
                if (string.IsNullOrEmpty(fromDate) || string.IsNullOrEmpty(toDate))
                {
                    _logger.LogInformation("No date range provided, returning empty bill list");
                    return new SalesQuotationRegisterDataDTO
                    {
                        Company = company,
                        CurrentFiscalYear = fiscalYear,
                        Bills = new List<SalesQuotationResponseDTO>(),
                        FromDate = fromDate,
                        ToDate = toDate,
                        CurrentCompanyName = company.Name,
                        CompanyDateFormat = company.DateFormat,
                        VatEnabled = company.VatEnabled,
                    };
                }

                // Parse dates based on company format
                DateTime startDateTime;
                DateTime endDateTime;

                if (isNepaliFormat)
                {
                    // For Nepali dates, we need to convert the Nepali date string to DateTime for comparison
                    // Note: This assumes the Nepali date is stored as DateTime in the database
                    // You might need to adjust this based on how you store Nepali dates
                    if (!DateTime.TryParse(fromDate, out startDateTime))
                    {
                        _logger.LogWarning("Invalid fromDate format for Nepali date: {FromDate}", fromDate);
                        startDateTime = DateTime.MinValue;
                    }

                    if (!DateTime.TryParse(toDate, out endDateTime))
                    {
                        _logger.LogWarning("Invalid toDate format for Nepali date: {ToDate}", toDate);
                        endDateTime = DateTime.MaxValue;
                    }
                }
                else
                {
                    // For English dates, parse normally
                    if (!DateTime.TryParse(fromDate, out startDateTime))
                    {
                        _logger.LogWarning("Invalid fromDate format: {FromDate}", fromDate);
                        startDateTime = DateTime.MinValue;
                    }

                    if (!DateTime.TryParse(toDate, out endDateTime))
                    {
                        _logger.LogWarning("Invalid toDate format: {ToDate}", toDate);
                        endDateTime = DateTime.MaxValue;
                    }
                }

                // Set end date to end of day
                endDateTime = endDateTime.Date.AddDays(1).AddTicks(-1);

                _logger.LogInformation("Searching for bills between {StartDate} and {EndDate} using {DateFormat} format",
                    startDateTime, endDateTime, isNepaliFormat ? "Nepali" : "English");

                // First, check if there are any purchase bills for this company and fiscal year
                var totalBillsCount = await _context.SalesQuotations
                    .CountAsync(pb => pb.CompanyId == companyId && pb.FiscalYearId == fiscalYearId);

                _logger.LogInformation("Total bills for company {CompanyId} and fiscal year {FiscalYearId}: {Count}",
                    companyId, fiscalYearId, totalBillsCount);

                // Build query with date filter based on company date format
                var query = _context.SalesQuotations
                    .Include(pb => pb.Company)
                    .Include(pb => pb.Account)
                    .Include(pb => pb.User)
                    .Include(pb => pb.FiscalYear)
                    .Include(pb => pb.Items)
                        .ThenInclude(i => i.Item)
                    .Where(pb => pb.CompanyId == companyId &&
                                pb.FiscalYearId == fiscalYearId);

                // Apply date filter based on company's date format
                if (isNepaliFormat)
                {
                    // Use nepaliDate field for filtering
                    query = query.Where(pb => pb.nepaliDate >= startDateTime && pb.nepaliDate <= endDateTime);
                    _logger.LogInformation("Using nepaliDate field for filtering");
                }
                else
                {
                    // Use Date field for filtering
                    query = query.Where(pb => pb.Date >= startDateTime && pb.Date <= endDateTime);
                    _logger.LogInformation("Using Date field for filtering");
                }

                // Log the SQL query (optional - for debugging)
                var sql = query.ToQueryString();
                _logger.LogDebug("SQL Query: {Sql}", sql);

                // Get bills ordered by date and bill number
                var SalesQuotations = await query
                    .OrderBy(pb => pb.Date)
                    .ThenBy(pb => pb.BillNumber)
                    .ToListAsync();

                _logger.LogInformation("Found {Count} bills matching the criteria", SalesQuotations.Count);

                // If no bills found, log sample of all bills to debug
                if (SalesQuotations.Count == 0)
                {
                    var sampleBills = await _context.SalesQuotations
                        .Where(pb => pb.CompanyId == companyId)
                        .OrderByDescending(pb => pb.Date)
                        .Take(5)
                        .Select(pb => new { pb.Id, pb.BillNumber, pb.Date, pb.nepaliDate })
                        .ToListAsync();

                    _logger.LogInformation("Sample of recent bills (Date vs NepaliDate): {SampleBills}",
                        string.Join(", ", sampleBills.Select(b => $"{b.BillNumber} - Date: {b.Date}, NepaliDate: {b.nepaliDate}")));
                }

                // Map to response DTOs
                var billDtos = SalesQuotations.Select(bill => MapToResponseDTO(bill, company.DateFormat)).ToList();

                return new SalesQuotationRegisterDataDTO
                {
                    Company = company,
                    CurrentFiscalYear = fiscalYear,
                    Bills = billDtos,
                    FromDate = fromDate,
                    ToDate = toDate,
                    CurrentCompanyName = company.Name,
                    CompanyDateFormat = company.DateFormat,
                    VatEnabled = company.VatEnabled,
                    IsAdminOrSupervisor = true
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting purchase register for company {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<SalesQuotationRegisterDataDTO> GetSalesQuotationEntryDataAsync(Guid companyId, Guid fiscalYearId, Guid userId)
        {
            // Get company
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

            if (company == null)
                throw new ArgumentException("Company not found");

            // Get fiscal year
            var fiscalYear = await _context.FiscalYears
                .Where(f => f.Id == fiscalYearId && f.CompanyId == companyId)
                .Select(f => new FiscalYearInfoDTO
                {
                    Id = f.Id,
                    Name = f.Name,
                    StartDate = f.StartDate,
                    EndDate = f.EndDate,
                    StartDateNepali = f.StartDateNepali,
                    EndDateNepali = f.EndDateNepali,
                    IsActive = f.IsActive
                })
                .FirstOrDefaultAsync();

            if (fiscalYear == null)
                throw new ArgumentException("Fiscal year not found");

            // Create the response
            var data = new SalesQuotationRegisterDataDTO
            {
                Company = company,
                // Accounts = accounts, // This should now work with AccountInfoDTO
                Dates = new DateInfoDTO
                {
                    NepaliDate = DateTime.UtcNow.ToString("yyyy-MM-dd"),
                    TransactionDateNepali = DateTime.UtcNow.ToString("yyyy-MM-dd"),
                    CompanyDateFormat = company.DateFormat
                },
                CurrentFiscalYear = fiscalYear,
                UserPreferences = new UserPreferencesDTO { Theme = "light" },
                Permissions = new PermissionsDTO
                {
                    IsAdminOrSupervisor = true,
                },
                CurrentCompanyName = company.Name
            };

            return data;
        }

        private SalesQuotationResponseDTO MapToResponseDTO(SalesQuotation salesQuotation, string companyDateFormat)
        {
            bool isNepaliFormat = companyDateFormat?.ToLower() == "nepali";

            return new SalesQuotationResponseDTO
            {
                Id = salesQuotation.Id,
                CompanyId = salesQuotation.CompanyId,
                CompanyName = salesQuotation.Company?.Name,
                PurchaseSalesType = salesQuotation.PurchaseSalesType,
                UserId = salesQuotation.UserId,
                UserName = salesQuotation.User?.Name,
                BillNumber = salesQuotation.BillNumber,
                AccountId = salesQuotation.AccountId,
                AccountName = salesQuotation.Account?.Name,
                SettingsId = salesQuotation.SettingsId,
                FiscalYearId = salesQuotation.FiscalYearId,
                FiscalYearName = salesQuotation.FiscalYear?.Name,
                Items = salesQuotation.Items.Select(i => new SalesQuotationItemResponseDTO
                {
                    Id = i.Id,
                    SalesQuotationId = i.SalesQuotationId,
                    ItemId = i.ItemId,
                    ItemName = i.Item?.Name,
                    Hscode = i.Item?.Hscode,
                    UniqueNumber = i.Item?.UniqueNumber,
                    UnitId = i.UnitId,
                    UnitName = i.Unit?.Name,
                    Quantity = i.Quantity,
                    Price = i.Price,
                    DiscountPercentagePerItem = i.DiscountPercentagePerItem,
                    DiscountAmountPerItem = i.DiscountAmountPerItem,
                    VatStatus = i.VatStatus,
                    CreatedAt = i.CreatedAt,
                    UpdatedAt = i.UpdatedAt
                }).ToList(),
                SubTotal = salesQuotation.SubTotal,
                NonVatSales = salesQuotation.NonVatSales,
                TaxableAmount = salesQuotation.TaxableAmount,
                DiscountPercentage = salesQuotation.DiscountPercentage,
                DiscountAmount = salesQuotation.DiscountAmount,
                VatPercentage = salesQuotation.VatPercentage,
                VatAmount = salesQuotation.VatAmount,
                TotalAmount = salesQuotation.TotalAmount,
                Description = salesQuotation.Description,
                IsVatExempt = salesQuotation.IsVatExempt,
                IsVatAll = salesQuotation.IsVatAll,
                RoundOffAmount = salesQuotation.RoundOffAmount,
                PaymentMode = salesQuotation.PaymentMode,
                nepaliDate = salesQuotation.nepaliDate,
                Date = isNepaliFormat ? salesQuotation.nepaliDate : salesQuotation.Date,
                transactionDateNepali = salesQuotation.transactionDateNepali,
                TransactionDate = salesQuotation.TransactionDate,
                CreatedAt = salesQuotation.CreatedAt,
                UpdatedAt = salesQuotation.UpdatedAt
            };
        }


        public async Task<SalesQuotationFindsDTO> GetSalesQuotationFindsAsync(Guid companyId, Guid fiscalYearId, Guid userId)
        {
            try
            {
                _logger.LogInformation("GetSalesQuotationFindsAsync called for Company: {CompanyId}, FiscalYear: {FiscalYearId}, User: {UserId}",
                    companyId, fiscalYearId, userId);

                // Get company information
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
                        VatEnabled = c.VatEnabled,
                    })
                    .FirstOrDefaultAsync();

                if (company == null)
                {
                    _logger.LogWarning("Company not found with ID: {CompanyId}", companyId);
                    throw new ArgumentException("Company not found");
                }

                // Determine if company uses Nepali date format
                bool isNepaliFormat = company.DateFormat?.ToLower() == "nepali";

                _logger.LogInformation("Company date format: {DateFormat}, IsNepaliFormat: {IsNepaliFormat}",
                    company.DateFormat, isNepaliFormat);

                // Get fiscal year information
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

                if (currentFiscalYear == null)
                {
                    _logger.LogWarning("Fiscal year not found with ID: {FiscalYearId} for Company: {CompanyId}",
                        fiscalYearId, companyId);
                    throw new ArgumentException("Fiscal year not found");
                }

                // Get company date format string
                string companyDateFormat = company.DateFormat?.ToLower() ?? "english";

                // Fetch the latest purchase bill for this company and fiscal year
                // Order by the appropriate date field based on company format
                var latestBillQuery = _context.SalesQuotations
                    .Where(pb => pb.CompanyId == companyId && pb.FiscalYearId == fiscalYearId);

                if (isNepaliFormat)
                {
                    // For Nepali format, order by nepaliDate descending
                    latestBillQuery = latestBillQuery.OrderByDescending(pb => pb.nepaliDate)
                                                     .ThenByDescending(pb => pb.BillNumber);
                }
                else
                {
                    // For English format, order by Date descending
                    latestBillQuery = latestBillQuery.OrderByDescending(pb => pb.Date)
                                                     .ThenByDescending(pb => pb.BillNumber);
                }

                var latestBill = await latestBillQuery
                    .Select(pb => new
                    {
                        pb.BillNumber,
                        pb.Date,
                        pb.nepaliDate
                    })
                    .FirstOrDefaultAsync();

                _logger.LogInformation("Latest bill query result: BillNumber: {BillNumber}, Date: {Date}, NepaliDate: {NepaliDate}",
                    latestBill?.BillNumber, latestBill?.Date, latestBill?.nepaliDate);

                // Get user with roles
                var user = await _context.Users
                    .Include(u => u.UserRoles)
                        .ThenInclude(ur => ur.Role)
                    .FirstOrDefaultAsync(u => u.Id == userId);

                if (user == null)
                {
                    _logger.LogWarning("User not found with ID: {UserId}", userId);
                    throw new ArgumentException("User not found");
                }

                bool isAdmin = user?.IsAdmin ?? false;
                string userRole = "User";

                if (isAdmin)
                {
                    userRole = "Admin";
                }
                else if (user?.UserRoles != null)
                {
                    var primaryRole = user.UserRoles.FirstOrDefault(ur => ur.IsPrimary);
                    if (primaryRole?.Role != null)
                    {
                        userRole = primaryRole.Role.Name;
                    }
                }

                // Determine if user is admin or supervisor
                bool isAdminOrSupervisor = isAdmin || userRole == "Supervisor";

                // Create user info DTO
                var userInfo = new UserInfoDTO
                {
                    Id = user.Id,
                    Name = user.Name,
                    Email = user.Email,
                    IsAdmin = isAdmin,
                    Role = userRole,
                    Preferences = new UserPreferencesDTO
                    {
                        Theme = user.Preferences?.Theme.ToString() ?? "light"
                    }
                };

                // Create response DTO
                var response = new SalesQuotationFindsDTO
                {
                    Company = company,
                    BillNumber = latestBill?.BillNumber ?? string.Empty,
                    CurrentFiscalYear = currentFiscalYear,
                    CompanyDateFormat = companyDateFormat,
                    CurrentCompanyName = company.Name,
                    Date = DateTime.UtcNow.Date,
                    Title = string.Empty,
                    Body = string.Empty,
                    User = userInfo,
                    Theme = userInfo.Preferences?.Theme ?? "light",
                    IsAdminOrSupervisor = isAdminOrSupervisor
                };

                _logger.LogInformation("Successfully retrieved sales quotation finds data for Company: {CompanyId}", companyId);

                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetPurchaseReturnFindsAsync for Company: {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<SalesQuotationPartyInfoDTO?> GetSalesQuotationPartyInfoAsync(string billNumber, Guid companyId, Guid fiscalYearId)
        {
            try
            {
                _logger.LogInformation($"Getting party info for sales quotation: {billNumber}, Company: {companyId}, FiscalYear: {fiscalYearId}");

                // Find the purchase bill with account information
                var salesQuotations = await _context.SalesQuotations
                    .Include(pb => pb.Account)
                    .Where(pb => pb.BillNumber == billNumber &&
                                pb.CompanyId == companyId &&
                                pb.FiscalYearId == fiscalYearId)
                    .Select(pb => new SalesQuotationPartyInfoDTO
                    {
                        BillNumber = pb.BillNumber,
                        Date = pb.Date,
                        PaymentMode = pb.PaymentMode,
                        AccountId = pb.AccountId ?? Guid.Empty,
                        AccountName = pb.Account != null ? pb.Account.Name : string.Empty,
                        AccountAddress = pb.Account != null ? pb.Account.Address : string.Empty,
                        AccountPan = pb.Account != null ? pb.Account.Pan : string.Empty,
                        AccountUniqueNumber = pb.Account != null ? pb.Account.UniqueNumber : null
                    })
                    .FirstOrDefaultAsync();

                if (salesQuotations == null)
                {
                    _logger.LogWarning($"Sales quotation not found: {billNumber}");
                    return null;
                }

                _logger.LogInformation($"Successfully retrieved party info for bill: {billNumber}");
                return salesQuotations;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting sales quotation party info for bill: {billNumber}");
                throw;
            }
        }
        public async Task<ChangeSalesQuotationPartyResponseDTO> ChangeSalesQuotationPartyAsync(string billNumber, Guid newAccountId, Guid companyId, Guid fiscalYearId, Guid userId)
        {
            _logger.LogInformation($"Changing party for sales quotation: {billNumber} to new account: {newAccountId}");

            // Start a database transaction to ensure data consistency
            using var dbTransaction = await _context.Database.BeginTransactionAsync();

            try
            {
                // 1. Verify the new account exists, is active, and is a party account
                var newAccount = await VerifyAndGetPartyAccountAsync(newAccountId, companyId);

                // 2. Get the original purchase bill with account
                var originalBill = await _context.SalesQuotations
                    .Include(pb => pb.Account)
                    .Include(pb => pb.Items)
                    .FirstOrDefaultAsync(pb => pb.BillNumber == billNumber &&
                                               pb.CompanyId == companyId &&
                                               pb.FiscalYearId == fiscalYearId);

                if (originalBill == null)
                {
                    throw new Exception("Voucher not found");
                }

                // Check if party is actually changed
                if (originalBill.AccountId == newAccountId)
                {
                    throw new Exception("Selected party is same as current party");
                }

                var oldAccountId = originalBill.AccountId;
                var oldAccountName = originalBill.Account?.Name ?? "Unknown";

                // 3. Calculate amounts
                var totalAmount = originalBill.TotalAmount;
                var taxableAmount = originalBill.TaxableAmount;
                var NonVatSales = originalBill.NonVatSales;
                var vatAmount = originalBill.VatAmount;
                var roundOffAmount = originalBill.RoundOffAmount;
                var salesQuotationAmount = taxableAmount + NonVatSales;

                // 4. Get purchase account ID
                var salesQuotationAccountId = await GetDefaultAccountIdAsync("salesQuotation", companyId);
                var roundOffAccountId = await GetDefaultAccountIdAsync("Rounded Off", companyId);

                // Parse payment mode
                var paymentMode = ParsePaymentMode(originalBill.PaymentMode ?? "Credit");

                // 6. Update purchase bill with new account
                originalBill.AccountId = newAccountId;
                originalBill.UpdatedAt = DateTime.UtcNow;
                originalBill.PurchaseSalesType = newAccount.Name; // Update purchase type with new party name
                // 8. Save changes
                await _context.SaveChangesAsync();

                // 9. Commit transaction
                await dbTransaction.CommitAsync();

                _logger.LogInformation($"Successfully changed party for bill: {billNumber} from {oldAccountName} to {newAccount.Name}");

                return new ChangeSalesQuotationPartyResponseDTO
                {
                    BillNumber = billNumber,
                    AccountId = newAccountId,
                    AccountName = newAccount.Name,
                    Message = $"Party changed successfully from \"{oldAccountName}\" to \"{newAccount.Name}\""
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error changing party for bill: {billNumber}");
                await dbTransaction.RollbackAsync();
                throw;
            }
        }
        private async Task<Account> VerifyAndGetPartyAccountAsync(Guid accountId, Guid companyId)
        {
            var account = await _context.Accounts
                .Include(a => a.AccountGroup)
                .FirstOrDefaultAsync(a => a.Id == accountId &&
                                          a.CompanyId == companyId &&
                                          a.IsActive);

            if (account == null)
            {
                throw new Exception($"Account with ID {accountId} not found or inactive");
            }

            // Verify account is a party account (Sundry Debtors or Sundry Creditors)
            if (account.AccountGroup != null)
            {
                var accountGroupName = account.AccountGroup.Name;
                if (accountGroupName != "Sundry Debtors" && accountGroupName != "Sundry Creditors")
                {
                    _logger.LogWarning($"Account {account.Name} is in group {accountGroupName}, not a typical party account");
                }
            }

            return account;
        }

        public async Task<BillIdResponseDTO> GetSalesQuotationVoucherIdByNumberAsync(string billNumber, Guid companyId, Guid fiscalYearId)
        {
            try
            {
                _logger.LogInformation($"Getting sales quotation ID for number: {billNumber}, Company: {companyId}, FiscalYear: {fiscalYearId}");

                var salesQuotations = await _context.SalesQuotations
                    .Where(pb => pb.BillNumber == billNumber &&
                                pb.CompanyId == companyId &&
                                pb.FiscalYearId == fiscalYearId)
                    .Select(pb => new BillIdResponseDTO
                    {
                        Id = pb.Id,
                        BillNumber = pb.BillNumber
                    })
                    .FirstOrDefaultAsync();

                if (salesQuotations == null)
                {
                    _logger.LogWarning($"sales quotation not found for number: {billNumber}");
                    throw new ArgumentException("Voucher not found");
                }

                _logger.LogInformation($"Successfully retrieved bill ID for number: {billNumber}");
                return salesQuotations;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting sales quotation ID for number: {billNumber}");
                throw;
            }
        }


        public async Task<SalesQuotationEditDataDTO> GetSalesQuotationEditDataAsync(Guid billId, Guid companyId, Guid fiscalYearId, Guid userId)
        {
            try
            {
                _logger.LogInformation("GetSalesQuotationEditDataAsync called for Bill ID: {BillId}, Company: {CompanyId}, FiscalYear: {FiscalYearId}",
                    billId, companyId, fiscalYearId);

                // Get company information including date format
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
                        VatEnabled = c.VatEnabled,
                    })
                    .FirstOrDefaultAsync();

                if (company == null)
                    throw new ArgumentException("Company not found");

                // Determine if company uses Nepali date format
                bool isNepaliFormat = company.DateFormat?.ToLower() == "nepali";

                _logger.LogInformation("Company date format: {DateFormat}, IsNepaliFormat: {IsNepaliFormat}",
                    company.DateFormat, isNepaliFormat);

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
                        IsActive = f.IsActive,
                    })
                    .FirstOrDefaultAsync();

                if (currentFiscalYear == null)
                    throw new ArgumentException("Fiscal year not found");

                // Get company date format
                string companyDateFormat = company.DateFormat?.ToLower() ?? "english";

                // Fetch purchase return with all related data
                var salesQuotations = await _context.SalesQuotations
                    .Include(pr => pr.Account)
                    .Include(pr => pr.Items)
                        .ThenInclude(i => i.Item)
                            .ThenInclude(it => it.Unit)
                    .Include(pr => pr.Items)
                        .ThenInclude(i => i.Item)
                            .ThenInclude(it => it.Category)
                    .Include(pr => pr.Items)
                        .ThenInclude(i => i.Unit)
                    .FirstOrDefaultAsync(pr => pr.Id == billId &&
                                              pr.CompanyId == companyId &&
                                              pr.FiscalYearId == fiscalYearId);

                if (salesQuotations == null)
                    throw new ArgumentException("Purchase return not found or does not belong to the selected company/fiscal year");

                // Process items to include stock and latest price
                var processedItems = new List<SalesQuotationItemResponseDTO>();

                foreach (var item in salesQuotations.Items)
                {
                    // Get stock entries for this item
                    var stockEntries = await _context.StockEntries
                        .Where(se => se.ItemId == item.ItemId)
                        .OrderByDescending(se => se.Date)
                        .ToListAsync();

                    // Calculate total stock
                    decimal totalStock = stockEntries.Sum(se => se.Quantity);

                    // Get latest purchase price
                    var latestStockEntry = stockEntries.FirstOrDefault();
                    decimal latestPuPrice = latestStockEntry?.PuPrice ?? item.Item?.PuPrice ?? 0;

                    // Round to 2 decimal places
                    latestPuPrice = Math.Round(latestPuPrice * 100) / 100;

                    // Get unit info
                    UnitInfoDTO unitInfo = null;
                    if (item.Unit != null)
                    {
                        unitInfo = new UnitInfoDTO
                        {
                            Id = item.Unit.Id,
                            Name = item.Unit.Name
                        };
                    }
                    else if (item.Item?.Unit != null)
                    {
                        unitInfo = new UnitInfoDTO
                        {
                            Id = item.Item.Unit.Id,
                            Name = item.Item.Unit.Name
                        };
                    }

                    // Get category info
                    CategoryInfoDTO categoryInfo = null;
                    if (item.Item?.Category != null)
                    {
                        categoryInfo = new CategoryInfoDTO
                        {
                            Id = item.Item.Category.Id,
                            Name = item.Item.Category.Name
                        };
                    }

                    // Map stock entries to DTO
                    var stockEntryDtos = stockEntries.Select(se => new StockEntryInfoDTO
                    {
                        Id = se.Id,
                        Quantity = se.Quantity,
                        PuPrice = se.PuPrice,
                        Date = se.Date
                    }).ToList();

                    // Map to response DTO
                    var itemDto = new SalesQuotationItemResponseDTO
                    {
                        Id = item.Id,
                        SalesQuotationId = item.SalesQuotationId,
                        ItemId = item.ItemId,
                        ItemName = item.Item?.Name,
                        Hscode = item.Item?.Hscode,
                        UniqueNumber = item.Item?.UniqueNumber,
                        UnitId = item.Item?.UnitId ?? item.UnitId,  // Current unit ID
                        UnitName = item.Item?.Unit?.Name ?? item.Unit?.Name ?? "",  // Current unit name
                        WsUnit = item.WsUnit,
                        Quantity = item.Quantity,
                        Price = item.Price,
                        PuPrice = item.PuPrice,
                        Description = item.Description,
                        DiscountPercentagePerItem = item.DiscountPercentagePerItem,
                        DiscountAmountPerItem = item.DiscountAmountPerItem,
                        VatStatus = item.VatStatus,
                        UniqueUuid = item.UniqueUuid,
                        CreatedAt = item.CreatedAt,
                        UpdatedAt = item.UpdatedAt,
                    };

                    processedItems.Add(itemDto);
                }

                // Fetch all items for the company (for dropdown) with stock and latest price
                var allItems = await _context.Items
                    .Include(i => i.Unit)
                    .Include(i => i.Category)
                    .Where(i => i.CompanyId == companyId && i.Status == "active")
                    .ToListAsync();

                var processedAllItems = new List<ItemEditDTO>();

                foreach (var item in allItems)
                {
                    // Get stock entries for this item
                    var stockEntries = await _context.StockEntries
                        .Where(se => se.ItemId == item.Id)
                        .OrderByDescending(se => se.Date)
                        .Select(se => new StockEntryInfoDTO
                        {
                            Id = se.Id,
                            Quantity = se.Quantity,
                            PuPrice = se.PuPrice,
                            Date = se.Date
                        })
                        .ToListAsync();

                    // Calculate total stock
                    decimal totalStock = stockEntries.Sum(se => se.Quantity ?? 0);

                    // Get latest purchase price
                    var latestStockEntry = stockEntries.FirstOrDefault();
                    decimal latestPuPrice = latestStockEntry?.PuPrice ?? item.PuPrice ?? 0;
                    latestPuPrice = Math.Round(latestPuPrice * 100) / 100;

                    // Get unit info
                    UnitInfoDTO unitInfo = null;
                    if (item.Unit != null)
                    {
                        unitInfo = new UnitInfoDTO
                        {
                            Id = item.Unit.Id,
                            Name = item.Unit.Name
                        };
                    }

                    // Get category info
                    CategoryInfoDTO categoryInfo = null;
                    if (item.Category != null)
                    {
                        categoryInfo = new CategoryInfoDTO
                        {
                            Id = item.Category.Id,
                            Name = item.Category.Name
                        };
                    }

                    var itemDto = new ItemEditDTO
                    {
                        Id = item.Id,
                        Name = item.Name,
                        Hscode = item.Hscode,
                        UniqueNumber = item.UniqueNumber,
                        VatStatus = item.VatStatus,
                        Unit = unitInfo,
                        Category = categoryInfo,
                        PuPrice = item.PuPrice ?? 0,
                        Quantity = 0,
                        Stock = totalStock,
                        LatestPuPrice = latestPuPrice,
                        StockEntries = stockEntries
                    };

                    processedAllItems.Add(itemDto);
                }

                // Sort items by name
                processedAllItems = processedAllItems.OrderBy(i => i.Name).ToList();

                var accounts = await _context.Accounts
                    .Where(a => a.CompanyId == companyId && a.IsActive == true)
                    .Select(a => new AccountInfoDTO
                    {
                        Id = a.Id,
                        Name = a.Name,
                        Address = a.Address,
                        Pan = a.Pan,
                        UniqueNumber = a.UniqueNumber,
                    })
                    .ToListAsync();

                // Get user with roles
                var user = await _context.Users
                    .Include(u => u.UserRoles)
                        .ThenInclude(ur => ur.Role)
                    .FirstOrDefaultAsync(u => u.Id == userId);

                bool isAdmin = user?.IsAdmin ?? false;
                string userRole = "User";

                if (isAdmin)
                {
                    userRole = "Admin";
                }
                else if (user?.UserRoles != null)
                {
                    var primaryRole = user.UserRoles.FirstOrDefault(ur => ur.IsPrimary);
                    if (primaryRole?.Role != null)
                    {
                        userRole = primaryRole.Role.Name;
                    }
                }

                // Map purchase return to response DTO
                var salesQuotationDto = MapToResponseDTO(salesQuotations, companyDateFormat);

                // Add the processed items with additional edit properties
                salesQuotationDto.Items = processedItems;

                // Create response following the same pattern as PurchaseRegisterDataDTO
                var response = new SalesQuotationEditDataDTO
                {
                    Company = company,
                    SalesQuotation = salesQuotationDto,
                    Items = processedAllItems,
                    Accounts = accounts,
                    User = new UserEditInfoDTO
                    {
                        IsAdmin = isAdmin,
                        Role = userRole,
                        Preferences = new UserPreferencesDTO
                        {
                            Theme = user?.Preferences?.Theme.ToString() ?? "light"
                        }
                    }
                };

                _logger.LogInformation("Successfully retrieved sales quotation edit data for Bill ID: {BillId}", billId);

                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting sales quotation edit data for Bill ID: {BillId}", billId);
                throw;
            }
        }

        public async Task<SalesQuotation> UpdateSalesQuotationAsync(Guid id, UpdateSalesQuotationDTO dto, Guid userId, Guid companyId, Guid fiscalYearId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                _logger.LogInformation("Updating sales quotation ID: {QuotationId} for Company: {CompanyId}", id, companyId);

                // Find the existing quotation
                var existingQuotation = await _context.SalesQuotations
                    .Include(sq => sq.Items)
                    .FirstOrDefaultAsync(sq => sq.Id == id &&
                                              sq.CompanyId == companyId &&
                                              sq.FiscalYearId == fiscalYearId);

                if (existingQuotation == null)
                    throw new ArgumentException("Sales quotation not found or does not belong to the selected company/fiscal year");

                // Validate company and fiscal year
                var company = await _context.Companies.FindAsync(companyId);
                if (company == null)
                    throw new ArgumentException("Company not found");

                var fiscalYear = await _context.FiscalYears.FindAsync(fiscalYearId);
                if (fiscalYear == null || fiscalYear.CompanyId != companyId)
                    throw new ArgumentException("Invalid fiscal year");

                // Parse VAT exemption status
                bool isVatExemptBool = dto.IsVatExempt == "true" || dto.IsVatExempt == "True" || dto.IsVatExempt == "1";
                bool isVatAll = dto.IsVatExempt == "all";

                // Validate account
                var account = await _context.Accounts
                    .FirstOrDefaultAsync(a => a.Id == dto.AccountId && a.CompanyId == companyId);
                if (account == null)
                    throw new ArgumentException("Invalid account for this company");

                // Validate items
                foreach (var itemDto in dto.Items)
                {
                    var item = await _context.Items
                        .FirstOrDefaultAsync(i => i.Id == itemDto.ItemId && i.CompanyId == companyId);

                    if (item == null)
                        throw new ArgumentException($"Item with id {itemDto.ItemId} not found");

                    // Validate unit belongs to company
                    var unit = await _context.Units
                        .FirstOrDefaultAsync(u => u.Id == itemDto.UnitId && u.CompanyId == companyId);
                    if (unit == null)
                        throw new ArgumentException($"Invalid unit for item: {item.Name}");
                }

                // Process items and validate VAT rules
                bool hasVatableItems = false;
                bool hasNonVatableItems = false;

                foreach (var itemDto in dto.Items)
                {
                    var item = await _context.Items.FindAsync(itemDto.ItemId);
                    if (item?.VatStatus == "vatable")
                        hasVatableItems = true;
                    else
                        hasNonVatableItems = true;
                }

                // Apply VAT validation rules (matching Express.js logic)
                if (dto.IsVatExempt != "all")
                {
                    if (isVatExemptBool && hasVatableItems)
                    {
                        throw new ArgumentException("Cannot save VAT exempt bill with vatable items");
                    }

                    if (!isVatExemptBool && hasNonVatableItems)
                    {
                        throw new ArgumentException("Cannot save bill with non-vatable items when VAT is applied");
                    }
                }

                // Store original items for removal
                var originalItems = existingQuotation.Items.ToList();

                // Update quotation properties
                existingQuotation.AccountId = dto.AccountId;
                existingQuotation.SettingsId = dto.SettingsId;
                existingQuotation.PurchaseSalesType = "SalesQuotation";

                // Update financial fields
                existingQuotation.SubTotal = dto.SubTotal ?? 0;
                existingQuotation.NonVatSales = dto.NonVatSales ?? 0;
                existingQuotation.TaxableAmount = dto.TaxableAmount ?? 0;
                existingQuotation.DiscountPercentage = dto.DiscountPercentage ?? 0;
                existingQuotation.DiscountAmount = dto.DiscountAmount ?? 0;
                existingQuotation.VatPercentage = isVatExemptBool ? 0 : dto.VatPercentage;
                existingQuotation.VatAmount = dto.VatAmount ?? 0;
                existingQuotation.TotalAmount = dto.TotalAmount ?? 0;
                existingQuotation.IsVatExempt = isVatExemptBool;
                existingQuotation.IsVatAll = isVatAll ? "all" : null;
                existingQuotation.RoundOffAmount = dto.RoundOffAmount ?? 0;
                existingQuotation.PaymentMode = dto.PaymentMode;
                existingQuotation.Description = dto.Description;

                // Update dates
                existingQuotation.nepaliDate = dto.NepaliDate;
                existingQuotation.transactionDateNepali = dto.TransactionDateNepali;
                existingQuotation.Date = dto.Date;
                existingQuotation.TransactionDate = dto.TransactionDate;
                existingQuotation.UpdatedAt = DateTime.UtcNow;
                existingQuotation.UserId = userId; // Track who updated

                // Remove existing items
                foreach (var item in originalItems)
                {
                    _context.SalesQuotationItems.Remove(item);
                }

                // Add new items
                foreach (var itemDto in dto.Items)
                {
                    var item = await _context.Items.FindAsync(itemDto.ItemId);

                    var quotationItem = new SalesQuotationItem
                    {
                        Id = Guid.NewGuid(),
                        SalesQuotationId = existingQuotation.Id,
                        ItemId = itemDto.ItemId,
                        UnitId = itemDto.UnitId,
                        Quantity = itemDto.Quantity,
                        Price = itemDto.Price,
                        VatStatus = item?.VatStatus ?? "vatable",
                        Description = itemDto.Description,
                        CreatedAt = existingQuotation.CreatedAt, // Keep original creation date
                        UpdatedAt = DateTime.UtcNow
                    };

                    existingQuotation.Items.Add(quotationItem);
                    await _context.SalesQuotationItems.AddAsync(quotationItem);
                }

                // Save changes
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                _logger.LogInformation("Successfully updated sales quotation ID: {QuotationId}, Number: {BillNumber}",
                    existingQuotation.Id, existingQuotation.BillNumber);

                return existingQuotation;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Error updating sales quotation ID: {QuotationId}", id);
                throw;
            }
        }

        public async Task<SalesQuotationPrintDTO> GetSalesQuotationForPrintAsync(Guid id, Guid companyId, Guid userId, Guid fiscalYearId)
        {
            try
            {
                _logger.LogInformation("GetSalesQuotationForPrintAsync called for Bill ID: {BillId}, Company: {CompanyId}", id, companyId);

                // Get company details - materialize first
                var companyEntity = await _context.Companies
                    .Where(c => c.Id == companyId)
                    .FirstOrDefaultAsync();

                if (companyEntity == null)
                    throw new ArgumentException("Company not found");

                // Parse renewal date
                DateTime? renewalDate = null;
                if (DateTime.TryParse(companyEntity.RenewalDate, out var parsedDate))
                {
                    renewalDate = parsedDate;
                }

                // Create DTO manually
                var company = new CompanyPrintDTO
                {
                    Id = companyEntity.Id,
                    RenewalDate = renewalDate,
                    DateFormat = companyEntity.DateFormat.ToString(),
                    FiscalYear = null
                };
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
                        IsActive = f.IsActive
                    })
                    .FirstOrDefaultAsync();

                // Get current company info
                var currentCompany = await _context.Companies
                    .Where(c => c.Id == companyId)
                    .Select(c => new CompanyPrintInfoDTO
                    {
                        Id = c.Id,
                        Name = c.Name,
                        Phone = c.Phone,
                        Pan = c.Pan,
                        Address = c.Address
                    })
                    .FirstOrDefaultAsync();

                // Get the purchase bill with all related data
                var salesQuotations = await _context.SalesQuotations
                    .Include(pb => pb.Account)
                    .Include(pb => pb.User)
                    .Include(pb => pb.Items)
                        .ThenInclude(i => i.Item)
                            .ThenInclude(it => it.Unit)
                    .FirstOrDefaultAsync(pb => pb.Id == id && pb.CompanyId == companyId);

                if (salesQuotations == null)
                    throw new ArgumentException("Bill not found");

                // Get user with roles
                var user = await _context.Users
                    .Include(u => u.UserRoles)
                        .ThenInclude(ur => ur.Role)
                    .FirstOrDefaultAsync(u => u.Id == userId);

                // Create user preferences DTO
                var userPreferences = new UserPreferencesDTO
                {
                    Theme = user?.Preferences.Theme.ToString() ?? "Light"
                };

                // Determine if user is admin or supervisor
                bool isAdminOrSupervisor = user?.IsAdmin == true ||
                                          (user?.UserRoles?.Any(ur => ur.Role?.Name == "Supervisor" &&
                                                                     (ur.ExpiresAt == null || ur.ExpiresAt > DateTime.UtcNow)) ?? false);

                // Get company date format
                bool isNepaliFormat = company.DateFormat?.ToLower() == "nepali";

                // Map to response DTO
                var response = new SalesQuotationPrintDTO
                {
                    Company = company,
                    CurrentFiscalYear = currentFiscalYear,
                    Bill = new SalesQuotationPrintBillDTO
                    {
                        Id = salesQuotations.Id,
                        BillNumber = salesQuotations.BillNumber,
                        PaymentMode = salesQuotations.PaymentMode,
                        Date = isNepaliFormat ? salesQuotations.nepaliDate : salesQuotations.Date,
                        EnglishDate = salesQuotations.Date,
                        TransactionDate = isNepaliFormat ? salesQuotations.transactionDateNepali : salesQuotations.TransactionDate,
                        SubTotal = salesQuotations.SubTotal,
                        NonVatSales = salesQuotations.NonVatSales,
                        TaxableAmount = salesQuotations.TaxableAmount,
                        DiscountPercentage = salesQuotations.DiscountPercentage,
                        DiscountAmount = salesQuotations.DiscountAmount,
                        VatPercentage = salesQuotations.VatPercentage,
                        VatAmount = salesQuotations.VatAmount,
                        TotalAmount = salesQuotations.TotalAmount,
                        IsVatExempt = salesQuotations.IsVatExempt,
                        RoundOffAmount = salesQuotations.RoundOffAmount,
                        Account = salesQuotations.Account != null ? new AccountPrintDTO
                        {
                            Id = salesQuotations.Account.Id,
                            Name = salesQuotations.Account.Name,
                            Pan = salesQuotations.Account.Pan,
                            Address = salesQuotations.Account.Address,
                            Email = salesQuotations.Account.Email,
                            Phone = salesQuotations.Account.Phone,
                        } : null,
                        User = salesQuotations.User != null ? new UserPrintDTO
                        {
                            Id = salesQuotations.User.Id,
                            Name = salesQuotations.User.Name,
                            IsAdmin = salesQuotations.User.IsAdmin,
                            Role = salesQuotations.User.UserRoles?
                                .FirstOrDefault(ur => ur.IsPrimary)?.Role?.Name ?? "User"
                        } : null,
                        Items = salesQuotations.Items.Select(i => new SalesQuotationItemPrintDTO
                        {
                            Id = i.Id,
                            ItemId = i.ItemId,
                            ItemName = i.Item?.Name,
                            Description = i.Description,
                            Hscode = i.Item?.Hscode,  // Add this
                            UniqueNumber = i.Item?.UniqueNumber,  // Add this
                            UnitId = i.UnitId,
                            UnitName = i.Item?.Unit?.Name,
                            WsUnit = i.WsUnit,
                            Quantity = i.Quantity,
                            Price = i.Price,
                            PuPrice = i.PuPrice ?? 0,
                            DiscountPercentagePerItem = i.DiscountPercentagePerItem,
                            DiscountAmountPerItem = i.DiscountAmountPerItem,
                            VatStatus = i.VatStatus
                        }).ToList()
                    },
                    CurrentCompanyName = currentCompany?.Name ?? string.Empty,
                    CurrentCompany = currentCompany ?? new CompanyPrintInfoDTO(),
                    PaymentMode = salesQuotations.PaymentMode ?? string.Empty,
                    NepaliDate = salesQuotations.nepaliDate.ToString("yyyy-MM-dd"),
                    TransactionDateNepali = salesQuotations.transactionDateNepali.ToString("yyyy-MM-dd"),
                    EnglishDate = salesQuotations.Date,
                    CompanyDateFormat = company.DateFormat?.ToString()?.ToLower() ?? "english",
                    User = new UserPrintDTO
                    {
                        Id = userId,
                        Name = user?.Name ?? string.Empty,
                        IsAdmin = user?.IsAdmin ?? false,
                        Role = user?.UserRoles?
                            .FirstOrDefault(ur => ur.IsPrimary)?.Role?.Name ??
                               (user?.IsAdmin == true ? "Admin" : "User"),
                        Preferences = userPreferences
                    },
                    IsAdminOrSupervisor = isAdminOrSupervisor
                };

                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting purchase bill for print: {BillId}", id);
                throw;
            }
        }

    }
}

