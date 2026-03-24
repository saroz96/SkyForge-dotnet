using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Dto.RetailerDto.ReceiptDto;
using SkyForge.Dto.AccountDto;
using SkyForge.Models.Retailer.ReceiptModel;
using SkyForge.Services.BillNumberServices;
using SkyForge.Models.Retailer.TransactionModel;
using SkyForge.Dto.RetailerDto;

namespace SkyForge.Services.Retailer.ReceiptServices
{
    public class ReceiptService : IReceiptService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<ReceiptService> _logger;
        private readonly IBillNumberService _billNumberService;


        public ReceiptService(
            ApplicationDbContext context,
             ILogger<ReceiptService> logger,
                         IBillNumberService billNumberService)
        {
            _context = context;
            _logger = logger;
            _billNumberService = billNumberService;
        }

        public async Task<ReceiptFormDataResponseDTO> GetReceiptFormDataAsync(Guid companyId, Guid fiscalYearId, Guid userId)
        {
            try
            {
                _logger.LogInformation("GetReceiptFormDataAsync called for Company: {CompanyId}, User: {UserId}", companyId, userId);

                // Get company with all required fields
                var company = await _context.Companies
                    .Where(c => c.Id == companyId)
                    .Select(c => new CompanyInfoDTO
                    {
                        Id = c.Id,
                        Name = c.Name,
                        DateFormat = c.DateFormat.ToString(),
                        RenewalDate = c.RenewalDate
                    })
                    .FirstOrDefaultAsync();

                if (company == null)
                    return null;

                // Get current date
                var today = DateTime.UtcNow;

                // Get Nepali date (you'll need to implement Nepali date conversion service)
                var nepaliDate = today.ToString("yyyy-MM-dd"); // Placeholder - implement actual conversion

                // Get fiscal year with bill prefixes
                var currentFiscalYear = await _context.FiscalYears
                    .Where(fy => fy.Id == fiscalYearId && fy.CompanyId == companyId)
                    .Select(fy => new FiscalYearDTO
                    {
                        Id = fy.Id,
                        Name = fy.Name,
                        StartDate = fy.StartDate,
                        EndDate = fy.EndDate,
                        IsActive = fy.IsActive,
                        DateFormat = fy.DateFormat.ToString(),
                    })
                    .FirstOrDefaultAsync();

                // Get groups to exclude (Cash in Hand, Bank Accounts, Bank O/D Account)
                var groupsToInclude = await _context.AccountGroups
                     .Where(ag => ag.CompanyId == companyId &&
                            (ag.Name == "Cash in Hand" || ag.Name == "Bank Accounts" || ag.Name == "Bank O/D Account"))
                     .Select(ag => ag.Id)
                     .ToListAsync();

                // Get groups to exclude from regular accounts list
                var groupsToExclude = groupsToInclude; // Same groups to exclude from regular accounts


                // Fetch cash accounts (Cash in Hand group)
                var cashAccounts = await _context.Accounts
                    .Where(a => a.CompanyId == companyId &&
                           a.IsActive &&
                           a.OriginalFiscalYearId == fiscalYearId &&
                           groupsToInclude.Contains(a.AccountGroupsId) &&
                           _context.AccountGroups.Any(ag => ag.Id == a.AccountGroupsId && ag.Name == "Cash in Hand"))
                    .Select(a => new AccountInfoDTO
                    {
                        Id = a.Id,
                        Name = a.Name,
                        UniqueNumber = a.UniqueNumber,
                        Address = a.Address,
                        Phone = a.Phone,
                        Pan = a.Pan,
                    })
                    .ToListAsync();

                // Fetch bank accounts (Bank Accounts and Bank O/D Account groups)
                // Fetch bank accounts (Bank Accounts and Bank O/D Account groups)
                var bankAccounts = await _context.Accounts
                    .Where(a => a.CompanyId == companyId &&
                           a.IsActive &&
                           a.OriginalFiscalYearId == fiscalYearId &&
                           groupsToInclude.Contains(a.AccountGroupsId) &&
                           _context.AccountGroups.Any(ag => ag.Id == a.AccountGroupsId &&
                               (ag.Name == "Bank Accounts" || ag.Name == "Bank O/D Account")))
                    .Select(a => new AccountInfoDTO
                    {
                        Id = a.Id,
                        Name = a.Name,
                        UniqueNumber = a.UniqueNumber,
                        Address = a.Address,
                        Phone = a.Phone,
                        Pan = a.Pan,
                    })
                    .ToListAsync();

                // Fetch regular accounts (excluding cash and bank accounts)
                var accounts = await _context.Accounts
                    .Where(a => a.CompanyId == companyId &&
                           a.IsActive &&
                           a.OriginalFiscalYearId == fiscalYearId &&
                           !groupsToExclude.Contains(a.AccountGroupsId))
                    .Select(a => new AccountInfoDTO
                    {
                        Id = a.Id,
                        Name = a.Name,
                        UniqueNumber = a.UniqueNumber,
                        Address = a.Address,
                        Phone = a.Phone,
                        Pan = a.Pan,
                    })
                    .ToListAsync();

                // Get user with preferences and roles
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

                // Prepare response
                var response = new ReceiptFormDataResponseDTO
                {
                    Company = company,
                    CurrentFiscalYear = currentFiscalYear,
                    Accounts = accounts,
                    CashAccounts = cashAccounts,
                    BankAccounts = bankAccounts,
                    NepaliDate = nepaliDate,
                    CompanyDateFormat = company.DateFormat?.ToLower() ?? "english",
                    CurrentCompanyName = company.Name,
                    CurrentDate = today,
                    User = new UserInfoDTO
                    {
                        Id = user?.Id ?? userId,
                        Name = user?.Name ?? "Unknown",
                        IsAdmin = isAdmin,
                        Role = userRole
                    },
                    UserPreferences = new UserPreferencesDTO
                    {
                        Theme = user?.Preferences?.Theme.ToString() ?? "light"
                    },
                    Permissions = new PermissionsDTO
                    {
                        IsAdminOrSupervisor = isAdmin || userRole == "Supervisor"
                    },
                    IsAdminOrSupervisor = isAdmin || userRole == "Supervisor"
                };

                _logger.LogInformation("Successfully fetched receipt form data for Company: {CompanyId}", companyId);
                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetReceiptFormDataAsync for Company: {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<string> GetNextBillNumberAsync(Guid companyId, Guid fiscalYearId)
        {
            return await _billNumberService.GetNextBillNumberAsync(companyId, fiscalYearId, "receipt");
        }
        public async Task<string> GetCurrentBillNumberAsync(Guid companyId, Guid fiscalYearId)
        {
            return await _billNumberService.GetCurrentBillNumberAsync(companyId, fiscalYearId, "receipt");
        }

        public async Task<Receipt> CreateReceiptAsync(CreateReceiptDTO dto, Guid userId, Guid companyId, Guid fiscalYearId)
        {
            // Start a transaction
            var executionStrategy = _context.Database.CreateExecutionStrategy();

            return await executionStrategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();

                try
                {
                    _logger.LogInformation("CreateReceiptAsync started for Company: {CompanyId}, User: {UserId}", companyId, userId);

                    // Validation
                    if (dto.AccountId == Guid.Empty)
                    {
                        throw new ArgumentException("Account ID is required.");
                    }

                    if (dto.ReceiptAccountId == Guid.Empty)
                    {
                        throw new ArgumentException("Receipt account ID is required.");
                    }

                    if (dto.Credit <= 0)
                    {
                        throw new ArgumentException("Credit amount must be greater than 0.");
                    }

                    // Get bill number
                    var billNumber = await _billNumberService.GetNextBillNumberAsync(companyId, fiscalYearId, "receipt");

                    // Verify accounts exist
                    var creditedAccount = await _context.Accounts
                        .FirstOrDefaultAsync(a => a.Id == dto.AccountId && a.CompanyId == companyId);

                    if (creditedAccount == null)
                    {
                        throw new ArgumentException("Credited account not found.");
                    }

                    var debitAccount = await _context.Accounts
                        .FirstOrDefaultAsync(a => a.Id == dto.ReceiptAccountId && a.CompanyId == companyId);

                    if (debitAccount == null)
                    {
                        throw new ArgumentException("Receipt account not found.");
                    }

                    // Create receipt record
                    var receipt = new Receipt
                    {
                        Id = Guid.NewGuid(),
                        BillNumber = billNumber,
                        AccountId = dto.AccountId,
                        Credit = dto.Credit,
                        Debit = 0,
                        ReceiptAccountId = dto.ReceiptAccountId,
                        InstType = dto.InstType,
                        InstNo = dto.InstNo ?? string.Empty,
                        BankAcc = dto.BankAcc ?? string.Empty,
                        Description = dto.Description,
                        UserId = userId,
                        CompanyId = companyId,
                        FiscalYearId = fiscalYearId,
                        IsActive = true,
                        Status = ReceiptStatus.Active,
                        Date = dto.Date,
                        NepaliDate = dto.NepaliDate,
                        CreatedAt = DateTime.UtcNow
                    };

                    await _context.Receipts.AddAsync(receipt);

                    // Create credit transaction (for the account being credited)
                    var creditTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        AccountId = dto.AccountId,
                        ReceiptAccountId = receipt.Id,
                        Type = TransactionType.Rcpt,
                        DrCrNoteAccountTypes = "Credit",
                        BillNumber = billNumber,
                        AccountTypeId = dto.ReceiptAccountId, // Store receipt account as string
                        InstType = (SkyForge.Models.Retailer.TransactionModel.InstrumentType)(int)dto.InstType,
                        InstNo = dto.InstNo,
                        BankAcc = dto.BankAcc,
                        Credit = dto.Credit,
                        Debit = 0,
                        PaymentMode = PaymentMode.Receipt,
                        PaymentReceiptType = "Receipt",
                        Date = receipt.Date,
                        nepaliDate = receipt.NepaliDate,
                        IsActive = true,
                        CompanyId = companyId,
                        FiscalYearId = fiscalYearId,
                        CreatedAt = DateTime.UtcNow
                    };

                    await _context.Transactions.AddAsync(creditTransaction);

                    // Create debit transaction (for the receipt account)
                    var debitTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        AccountId = dto.ReceiptAccountId,
                        ReceiptAccountId = receipt.Id,
                        Type = TransactionType.Rcpt,
                        DrCrNoteAccountTypes = "Debit",
                        BillNumber = billNumber,
                        AccountTypeId = dto.AccountId, // Store credited account as string
                        InstType = (SkyForge.Models.Retailer.TransactionModel.InstrumentType)(int)dto.InstType,
                        InstNo = dto.InstNo,
                        BankAcc = dto.BankAcc,
                        Credit = 0,
                        Debit = dto.Credit,
                        PaymentMode = PaymentMode.Receipt,
                        PaymentReceiptType = "Payment",
                        Date = receipt.Date,
                        nepaliDate = receipt.NepaliDate,
                        IsActive = true,
                        CompanyId = companyId,
                        FiscalYearId = fiscalYearId,
                        CreatedAt = DateTime.UtcNow
                    };

                    await _context.Transactions.AddAsync(debitTransaction);

                    // Save all changes
                    await _context.SaveChangesAsync();

                    // Commit transaction
                    await transaction.CommitAsync();

                    _logger.LogInformation("Receipt created successfully. ID: {ReceiptId}, BillNumber: {BillNumber}",
                        receipt.Id, receipt.BillNumber);

                    return receipt;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in CreateReceiptAsync for Company: {CompanyId}", companyId);
                    await transaction.RollbackAsync();
                    throw;
                }
            });
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


            public async Task<ReceiptFindsDTO> GetReceiptFindsAsync(Guid companyId, Guid fiscalYearId, Guid userId)
        {
            try
            {
                _logger.LogInformation("GetReceiptFindsAsync called for Company: {CompanyId}, FiscalYear: {FiscalYearId}, User: {UserId}",
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

                var latestBillQuery = _context.Receipts
                    .Where(p => p.CompanyId == companyId && p.FiscalYearId == fiscalYearId);

                if (isNepaliFormat)
                {
                    // For Nepali format, order by nepaliDate descending
                    latestBillQuery = latestBillQuery.OrderByDescending(p => p.NepaliDate)
                                                     .ThenByDescending(p => p.BillNumber);
                }
                else
                {
                    // For English format, order by Date descending
                    latestBillQuery = latestBillQuery.OrderByDescending(p => p.Date)
                                                     .ThenByDescending(p => p.BillNumber);
                }

                var latestBill = await latestBillQuery
                    .Select(p => new
                    {
                        p.BillNumber,
                        p.Date,
                        p.NepaliDate
                    })
                    .FirstOrDefaultAsync();

                _logger.LogInformation("Latest bill query result: BillNumber: {BillNumber}, Date: {Date}, NepaliDate: {NepaliDate}",
                    latestBill?.BillNumber, latestBill?.Date, latestBill?.NepaliDate);

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
                var response = new ReceiptFindsDTO
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

                _logger.LogInformation("Successfully retrieved receipt finds data for Company: {CompanyId}", companyId);

                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetReceiptFindsAsync for Company: {CompanyId}", companyId);
                throw;
            }
        }

     public async Task<BillIdResponseDTO> GetReceiptBillIdByNumberAsync(string billNumber, Guid companyId, Guid fiscalYearId)
        {
            try
            {
                _logger.LogInformation($"Getting receipt ID for number: {billNumber}, Company: {companyId}, FiscalYear: {fiscalYearId}");

                var receiptBill = await _context.Receipts
                    .Where(pb => pb.BillNumber == billNumber &&
                                pb.CompanyId == companyId &&
                                pb.FiscalYearId == fiscalYearId)
                    .Select(pb => new BillIdResponseDTO
                    {
                        Id = pb.Id,
                        BillNumber = pb.BillNumber
                    })
                    .FirstOrDefaultAsync();

                if (receiptBill == null)
                {
                    _logger.LogWarning($"Receipt not found for number: {billNumber}");
                    throw new ArgumentException("Voucher not found");
                }

                _logger.LogInformation($"Successfully retrieved bill ID for number: {billNumber}");
                return receiptBill;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting receipt ID for number: {billNumber}");
                throw;
            }
        }






public async Task<ReceiptEditDataDTO> GetReceiptEditDataAsync(Guid receiptId, Guid companyId, Guid fiscalYearId, Guid userId)
{
    try
    {
        _logger.LogInformation("GetReceiptEditDataAsync called for Receipt ID: {ReceiptId}, Company: {CompanyId}, FiscalYear: {FiscalYearId}",
            receiptId, companyId, fiscalYearId);

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
                DateFormat = f.DateFormat.ToString(),
            })
            .FirstOrDefaultAsync();

        if (currentFiscalYear == null)
            throw new ArgumentException("Fiscal year not found");

        // Get company date format
        string companyDateFormat = company.DateFormat?.ToLower() ?? "english";

        // Get today's date
        var today = DateTime.UtcNow;
        var nepaliDate = today.ToString("yyyy-MM-dd");

        // Fetch receipt with all related data
        var receipt = await _context.Receipts
            .Include(r => r.Account)
            .Include(r => r.ReceiptAccount)
            .Include(r => r.User)
            .FirstOrDefaultAsync(r => r.Id == receiptId &&
                                     r.CompanyId == companyId &&
                                     r.FiscalYearId == fiscalYearId);

        if (receipt == null)
            throw new ArgumentException("Receipt voucher not found or does not belong to the selected company/fiscal year");

        // Get account groups to include/exclude
        var groupsToInclude = await _context.AccountGroups
            .Where(ag => ag.CompanyId == companyId &&
                   (ag.Name == "Cash in Hand" || ag.Name == "Bank Accounts" || ag.Name == "Bank O/D Account"))
            .Select(ag => ag.Id)
            .ToListAsync();

        // Get groups to exclude from regular accounts list
        var groupsToExclude = groupsToInclude;

        // Fetch cash accounts (Cash in Hand group)
        var cashAccounts = await _context.Accounts
            .Where(a => a.CompanyId == companyId &&
                   a.IsActive &&
                   a.OriginalFiscalYearId == fiscalYearId &&
                   groupsToInclude.Contains(a.AccountGroupsId) &&
                   _context.AccountGroups.Any(ag => ag.Id == a.AccountGroupsId && ag.Name == "Cash in Hand"))
            .Select(a => new AccountInfoDTO
            {
                Id = a.Id,
                Name = a.Name,
                UniqueNumber = a.UniqueNumber,
                Address = a.Address,
                Phone = a.Phone,
                Pan = a.Pan,
            })
            .ToListAsync();

        // Fetch bank accounts (Bank Accounts and Bank O/D Account groups)
        var bankAccounts = await _context.Accounts
            .Where(a => a.CompanyId == companyId &&
                   a.IsActive &&
                   a.OriginalFiscalYearId == fiscalYearId &&
                   groupsToInclude.Contains(a.AccountGroupsId) &&
                   _context.AccountGroups.Any(ag => ag.Id == a.AccountGroupsId &&
                       (ag.Name == "Bank Accounts" || ag.Name == "Bank O/D Account")))
            .Select(a => new AccountInfoDTO
            {
                Id = a.Id,
                Name = a.Name,
                UniqueNumber = a.UniqueNumber,
                Address = a.Address,
                Phone = a.Phone,
                Pan = a.Pan,
            })
            .ToListAsync();

        // Combine cash and bank accounts for receipt accounts dropdown
        var receiptAccounts = cashAccounts.Concat(bankAccounts).ToList();

        // Fetch regular accounts (excluding cash and bank accounts)
        var accounts = await _context.Accounts
            .Where(a => a.CompanyId == companyId &&
                   a.IsActive &&
                   a.OriginalFiscalYearId == fiscalYearId &&
                   !groupsToExclude.Contains(a.AccountGroupsId))
            .Select(a => new AccountInfoDTO
            {
                Id = a.Id,
                Name = a.Name,
                UniqueNumber = a.UniqueNumber,
                Address = a.Address,
                Phone = a.Phone,
                Pan = a.Pan,
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

        bool isAdminOrSupervisor = isAdmin || userRole == "Supervisor";

        // Create user info DTO
        var userInfo = new UserEditInfoDTO
        {
            Id = user?.Id ?? userId,
            Name = user?.Name ?? "Unknown",
            Email = user?.Email ?? string.Empty,
            IsAdmin = isAdmin,
            Role = userRole,
            Preferences = new UserPreferencesDTO
            {
                Theme = user?.Preferences?.Theme.ToString() ?? "light"
            }
        };

        // Map receipt to edit DTO
        var receiptDto = MapToReceiptEditDTO(receipt, companyDateFormat);

        // Create response
        var response = new ReceiptEditDataDTO
        {
            Company = company,
            Receipt = receiptDto,
            Accounts = accounts,
            CashAccounts = cashAccounts,
            BankAccounts = bankAccounts,
            ReceiptAccounts = receiptAccounts,
            CurrentFiscalYear = currentFiscalYear,
            NepaliDate = nepaliDate,
            CompanyDateFormat = companyDateFormat,
            CurrentCompanyName = company.Name,
            CurrentDate = today,
            User = userInfo,
            IsAdminOrSupervisor = isAdminOrSupervisor
        };

        _logger.LogInformation("Successfully retrieved receipt edit data for Receipt ID: {ReceiptId}", receiptId);

        return response;
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error getting receipt edit data for Receipt ID: {ReceiptId}", receiptId);
        throw;
    }
}

private ReceiptEditDTO MapToReceiptEditDTO(Receipt receipt, string companyDateFormat)
{
    bool isNepaliFormat = companyDateFormat?.ToLower() == "nepali";

    return new ReceiptEditDTO
    {
        Id = receipt.Id,
        BillNumber = receipt.BillNumber,
        Date = isNepaliFormat ? receipt.NepaliDate : receipt.Date,
        NepaliDate = receipt.NepaliDate,
        AccountId = receipt.AccountId?? Guid.Empty,
        AccountName = receipt.Account?.Name ?? string.Empty,
        AccountPan = receipt.Account?.Pan ?? string.Empty,
        AccountAddress = receipt.Account?.Address ?? string.Empty,
        Credit = receipt.Credit,
        ReceiptAccountId = receipt.ReceiptAccountId?? Guid.Empty,
        ReceiptAccountName = receipt.ReceiptAccount?.Name ?? string.Empty,
        InstType = receipt.InstType.ToString(),
        InstNo = receipt.InstNo,
        BankAcc = receipt.BankAcc,
        Description = receipt.Description,
        UserName = receipt.User?.Name ?? string.Empty,
        UserEmail = receipt.User?.Email ?? string.Empty,
        Status = receipt.Status.ToString(),
        CreatedAt = receipt.CreatedAt,
        UpdatedAt = receipt.UpdatedAt
    };
}

public async Task<Receipt> UpdateReceiptAsync(Guid id, UpdateReceiptDTO dto, Guid companyId, Guid fiscalYearId, Guid userId)
{
    // Use execution strategy for transaction handling
    var executionStrategy = _context.Database.CreateExecutionStrategy();

    return await executionStrategy.ExecuteAsync(async () =>
    {
        using var transaction = await _context.Database.BeginTransactionAsync();

        try
        {
            _logger.LogInformation("=== Starting UpdateReceiptAsync for Receipt ID: {ReceiptId} ===", id);

            // Validate required fields
            if (dto.AccountId == Guid.Empty)
                throw new ArgumentException("Account ID is required");

            if (dto.ReceiptAccountId == Guid.Empty)
                throw new ArgumentException("Receipt account ID is required");

            if (dto.Credit <= 0)
                throw new ArgumentException("Credit amount must be greater than 0");

            // Get the existing receipt
            var existingReceipt = await _context.Receipts
                .FirstOrDefaultAsync(r => r.Id == id && r.CompanyId == companyId);

            if (existingReceipt == null)
                throw new ArgumentException("Receipt voucher not found");

            // Get company to check date format
            var company = await _context.Companies.FindAsync(companyId);
            if (company == null)
                throw new ArgumentException("Company not found");

            var fiscalYear = await _context.FiscalYears
                .FirstOrDefaultAsync(f => f.Id == fiscalYearId && f.CompanyId == companyId);

            if (fiscalYear == null)
                throw new ArgumentException("Fiscal year not found");

            // Verify accounts exist and belong to company
            var creditedAccount = await _context.Accounts
                .FirstOrDefaultAsync(a => a.Id == dto.AccountId && a.CompanyId == companyId);

            if (creditedAccount == null)
                throw new ArgumentException("Credited account not found.");

            var debitAccount = await _context.Accounts
                .FirstOrDefaultAsync(a => a.Id == dto.ReceiptAccountId && a.CompanyId == companyId);

            if (debitAccount == null)
                throw new ArgumentException("Receipt account not found.");

            // Get payment mode
            var paymentMode = ParsePaymentMode(dto.PaymentMode);

            // STEP 1: Delete existing transactions for this receipt
            var existingTransactions = await _context.Transactions
                .Where(t => t.ReceiptAccountId == id)
                .ToListAsync();

            if (existingTransactions.Any())
            {
                _context.Transactions.RemoveRange(existingTransactions);
                _logger.LogInformation("Deleted {Count} existing transactions", existingTransactions.Count);
            }

            // Save changes after deletions
            await _context.SaveChangesAsync();

            // STEP 2: UPDATE RECEIPT PROPERTIES
            existingReceipt.AccountId = dto.AccountId;
            existingReceipt.ReceiptAccountId = dto.ReceiptAccountId;
            existingReceipt.Credit = dto.Credit;
            existingReceipt.Debit = 0; // Receipt always has debit 0
            existingReceipt.InstType = dto.InstType;
            existingReceipt.InstNo = dto.InstNo ?? string.Empty;
            existingReceipt.BankAcc = dto.BankAcc ?? string.Empty;
            existingReceipt.Description = dto.Description;
            existingReceipt.NepaliDate = dto.NepaliDate;
            existingReceipt.Date = dto.Date;
            existingReceipt.UpdatedAt = DateTime.UtcNow;

            // Update the receipt
            _context.Receipts.Update(existingReceipt);
            await _context.SaveChangesAsync();

            // Get previous balances for accounts
            decimal previousCreditBalance = 0;
            var lastCreditTransaction = await _context.Transactions
                .Where(t => t.AccountId == dto.AccountId)
                .OrderByDescending(t => t.CreatedAt)
                .FirstOrDefaultAsync();

            if (lastCreditTransaction != null)
                previousCreditBalance = lastCreditTransaction.Balance ?? 0;

            decimal previousDebitBalance = 0;
            var lastDebitTransaction = await _context.Transactions
                .Where(t => t.AccountId == dto.ReceiptAccountId)
                .OrderByDescending(t => t.CreatedAt)
                .FirstOrDefaultAsync();

            if (lastDebitTransaction != null)
                previousDebitBalance = lastDebitTransaction.Balance ?? 0;

            // STEP 3: CREATE NEW TRANSACTIONS

            // Create credit transaction (for the account being credited)
            var creditTransaction = new Transaction
            {
                Id = Guid.NewGuid(),
                AccountId = dto.AccountId,
                ReceiptAccountId = existingReceipt.Id,
                Type = TransactionType.Rcpt,
                DrCrNoteAccountTypes = "Credit",
                BillNumber = existingReceipt.BillNumber,
                AccountTypeId = dto.ReceiptAccountId,
                InstType = (Models.Retailer.TransactionModel.InstrumentType)(int)dto.InstType,
                InstNo = dto.InstNo,
                BankAcc = dto.BankAcc,
                Credit = dto.Credit,
                Debit = 0,
                PaymentMode = PaymentMode.Receipt,
                PaymentReceiptType = "Receipt",
                Balance = previousCreditBalance + dto.Credit,
                Date = existingReceipt.Date,
                nepaliDate = existingReceipt.NepaliDate,
                IsActive = true,
                CompanyId = companyId,
                FiscalYearId = fiscalYearId,
                CreatedAt = DateTime.UtcNow
            };

            await _context.Transactions.AddAsync(creditTransaction);

            // Create debit transaction (for the receipt account)
            var debitTransaction = new Transaction
            {
                Id = Guid.NewGuid(),
                AccountId = dto.ReceiptAccountId,
                ReceiptAccountId = existingReceipt.Id,
                Type = TransactionType.Rcpt,
                DrCrNoteAccountTypes = "Debit",
                BillNumber = existingReceipt.BillNumber,
                AccountTypeId = dto.AccountId,
                InstType = (Models.Retailer.TransactionModel.InstrumentType)(int)dto.InstType,
                InstNo = dto.InstNo,
                BankAcc = dto.BankAcc,
                Credit = 0,
                Debit = dto.Credit,
                PaymentMode = PaymentMode.Receipt,
                PaymentReceiptType = "Payment",
                Balance = previousDebitBalance - dto.Credit,
                Date = existingReceipt.Date,
                nepaliDate = existingReceipt.NepaliDate,
                IsActive = true,
                CompanyId = companyId,
                FiscalYearId = fiscalYearId,
                CreatedAt = DateTime.UtcNow
            };

            await _context.Transactions.AddAsync(debitTransaction);

            // Save all changes
            var saveResult = await _context.SaveChangesAsync();
            _logger.LogInformation("SaveChangesAsync completed. {RowCount} rows affected.", saveResult);

            await transaction.CommitAsync();
            _logger.LogInformation("Transaction committed successfully");

            _logger.LogInformation("=== Successfully updated receipt: {ReceiptId} ===", id);

            return existingReceipt;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating receipt: {ReceiptId}", id);
            await transaction.RollbackAsync();
            throw;
        }
    });
}

public async Task<ReceiptsRegisterDataDTO> GetReceiptsRegisterAsync(Guid companyId, Guid fiscalYearId, string? fromDate = null, string? toDate = null)
{
    try
    {
        _logger.LogInformation("GetReceiptsRegisterAsync called with companyId: {CompanyId}, fiscalYearId: {FiscalYearId}, fromDate: {FromDate}, toDate: {ToDate}",
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

        // Get today's date in Nepali format
        var today = DateTime.UtcNow;
        var nepaliDate = today.ToString("yyyy-MM-dd");

        // Determine if company uses Nepali date format
        bool isNepaliFormat = company.DateFormat?.ToLower() == "nepali";

        _logger.LogInformation("Company date format: {DateFormat}, IsNepaliFormat: {IsNepaliFormat}",
            company.DateFormat, isNepaliFormat);

        // Get fiscal year
        var fiscalYear = await _context.FiscalYears
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

        // If no date range provided, return basic info with empty receipts list
        if (string.IsNullOrEmpty(fromDate) || string.IsNullOrEmpty(toDate))
        {
            _logger.LogInformation("No date range provided, returning basic info with empty receipts list");
            return new ReceiptsRegisterDataDTO
            {
                Company = company,
                CurrentFiscalYear = fiscalYear,
                Receipts = new List<ReceiptResponseItemDTO>(),
                FromDate = fromDate,
                ToDate = toDate,
                CurrentCompanyName = company.Name,
                CompanyDateFormat = company.DateFormat,
                NepaliDate = nepaliDate,
                UserPreferences = new UserPreferencesDTO { Theme = "light" }
            };
        }

        // Parse dates based on company format
        DateTime startDateTime;
        DateTime endDateTime;

        if (isNepaliFormat)
        {
            // For Nepali dates, parse to DateTime
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

        _logger.LogInformation("Searching for receipts between {StartDate} and {EndDate} using {DateFormat} format",
            startDateTime, endDateTime, isNepaliFormat ? "Nepali" : "English");

        // Build query with date filter based on company date format
        var query = _context.Receipts
            .Include(r => r.Account)
            .Include(r => r.ReceiptAccount)
            .Include(r => r.User)
            .Include(r => r.Company)
            .Include(r => r.FiscalYear)
            .Where(r => r.CompanyId == companyId &&
                       r.FiscalYearId == fiscalYearId);

        // Apply date filter based on company's date format
        if (isNepaliFormat)
        {
            // Use NepaliDate field for filtering
            query = query.Where(r => r.NepaliDate >= startDateTime && r.NepaliDate <= endDateTime);
            _logger.LogInformation("Using NepaliDate field for filtering");
        }
        else
        {
            // Use Date field for filtering
            query = query.Where(r => r.Date >= startDateTime && r.Date <= endDateTime);
            _logger.LogInformation("Using Date field for filtering");
        }

        // Log the SQL query (optional - for debugging)
        var sql = query.ToQueryString();
        _logger.LogDebug("SQL Query: {Sql}", sql);

        // Get receipts ordered by date and bill number
        var receipts = await query
            .OrderBy(r => r.Date)
            .ThenBy(r => r.BillNumber)
            .ToListAsync();

        _logger.LogInformation("Found {Count} receipts matching the criteria", receipts.Count);

        // If no receipts found, log sample of all receipts to debug
        if (receipts.Count == 0)
        {
            var sampleReceipts = await _context.Receipts
                .Where(r => r.CompanyId == companyId)
                .OrderByDescending(r => r.Date)
                .Take(5)
                .Select(r => new { r.Id, r.BillNumber, r.Date, r.NepaliDate })
                .ToListAsync();

            _logger.LogInformation("Sample of recent receipts (Date vs NepaliDate): {SampleReceipts}",
                string.Join(", ", sampleReceipts.Select(r => $"{r.BillNumber} - Date: {r.Date}, NepaliDate: {r.NepaliDate}")));
        }

        // Map to response DTOs
        var receiptDtos = receipts.Select(receipt => MapToResponseItemDTO(receipt, company.DateFormat)).ToList();

        return new ReceiptsRegisterDataDTO
        {
            Company = company,
            CurrentFiscalYear = fiscalYear,
            Receipts = receiptDtos,
            FromDate = fromDate,
            ToDate = toDate,
            CurrentCompanyName = company.Name,
            CompanyDateFormat = company.DateFormat,
            NepaliDate = nepaliDate,
            UserPreferences = new UserPreferencesDTO { Theme = "light" }
        };
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error getting receipts register for company {CompanyId}", companyId);
        throw;
    }
}

public async Task<ReceiptEntryDataDTO> GetReceiptEntryDataAsync(Guid companyId, Guid fiscalYearId, Guid userId)
{
    try
    {
        _logger.LogInformation("GetReceiptEntryDataAsync called with companyId: {CompanyId}, fiscalYearId: {FiscalYearId}, userId: {UserId}",
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
                VatEnabled = c.VatEnabled
            })
            .FirstOrDefaultAsync();

        if (company == null)
            throw new ArgumentException("Company not found");

        // Get fiscal year
        var fiscalYear = await _context.FiscalYears
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

        if (fiscalYear == null)
            throw new ArgumentException("Fiscal year not found");

        // Get account groups to include/exclude
        var groupsToInclude = await _context.AccountGroups
            .Where(ag => ag.CompanyId == companyId &&
                   (ag.Name == "Cash in Hand" || ag.Name == "Bank Accounts" || ag.Name == "Bank O/D Account"))
            .Select(ag => ag.Id)
            .ToListAsync();

        // Get groups to exclude from regular accounts list
        var groupsToExclude = groupsToInclude;

        // Fetch cash accounts (Cash in Hand group)
        var cashAccounts = await _context.Accounts
            .Where(a => a.CompanyId == companyId &&
                   a.IsActive &&
                   a.OriginalFiscalYearId == fiscalYearId &&
                   _context.AccountGroups.Any(ag => ag.Id == a.AccountGroupsId && ag.Name == "Cash in Hand"))
            .Select(a => new AccountInfoDTO
            {
                Id = a.Id,
                Name = a.Name,
                UniqueNumber = a.UniqueNumber,
                Address = a.Address,
                Phone = a.Phone,
                Pan = a.Pan,
            })
            .ToListAsync();

        // Fetch bank accounts (Bank Accounts and Bank O/D Account groups)
        var bankAccounts = await _context.Accounts
            .Where(a => a.CompanyId == companyId &&
                   a.IsActive &&
                   a.OriginalFiscalYearId == fiscalYearId &&
                   _context.AccountGroups.Any(ag => ag.Id == a.AccountGroupsId &&
                       (ag.Name == "Bank Accounts" || ag.Name == "Bank O/D Account")))
            .Select(a => new AccountInfoDTO
            {
                Id = a.Id,
                Name = a.Name,
                UniqueNumber = a.UniqueNumber,
                Address = a.Address,
                Phone = a.Phone,
                Pan = a.Pan,
            })
            .ToListAsync();

        // Fetch regular accounts (excluding cash and bank accounts)
        var accounts = await _context.Accounts
            .Where(a => a.CompanyId == companyId &&
                   a.IsActive &&
                   a.OriginalFiscalYearId == fiscalYearId &&
                   !_context.AccountGroups.Any(ag => ag.Id == a.AccountGroupsId &&
                       (ag.Name == "Cash in Hand" || ag.Name == "Bank Accounts" || ag.Name == "Bank O/D Account")))
            .Select(a => new AccountInfoDTO
            {
                Id = a.Id,
                Name = a.Name,
                UniqueNumber = a.UniqueNumber,
                Address = a.Address,
                Phone = a.Phone,
                Pan = a.Pan,
            })
            .ToListAsync();

        // Get user with roles to check permissions
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

        bool isAdminOrSupervisor = isAdmin || userRole == "Supervisor";

        // Get next bill number
        var nextBillNumber = await GetNextBillNumberAsync(companyId, fiscalYearId);

        // Create the response
        var data = new ReceiptEntryDataDTO
        {
            Company = company,
            Accounts = accounts,
            CashAccounts = cashAccounts,
            BankAccounts = bankAccounts,
            Dates = new DateInfoDTO
            {
                NepaliDate = DateTime.UtcNow.ToString("yyyy-MM-dd"),
                TransactionDateNepali = DateTime.UtcNow.ToString("yyyy-MM-dd"),
                CompanyDateFormat = company.DateFormat
            },
            CurrentFiscalYear = fiscalYear,
            NextReceiptBillNumber = nextBillNumber,
            UserPreferences = new UserPreferencesDTO 
            { 
                Theme = user?.Preferences?.Theme.ToString() ?? "light" 
            },
            Permissions = new PermissionsDTO
            {
                IsAdminOrSupervisor = isAdminOrSupervisor,
                StoreManagementEnabled = false
            },
            CurrentCompanyName = company.Name
        };

        _logger.LogInformation("Successfully retrieved receipt entry data for company {CompanyId}", companyId);
        return data;
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error getting receipt entry data for company {CompanyId}", companyId);
        throw;
    }
}

private ReceiptResponseItemDTO MapToResponseItemDTO(Receipt receipt, string companyDateFormat)
{
    bool isNepaliFormat = companyDateFormat?.ToLower() == "nepali";

    return new ReceiptResponseItemDTO
    {
        Id = receipt.Id,
        BillNumber = receipt.BillNumber,
        Date = isNepaliFormat ? receipt.NepaliDate : receipt.Date,
        NepaliDate = receipt.NepaliDate,
        AccountId = receipt.AccountId?? Guid.Empty,
        AccountName = receipt.Account?.Name ?? string.Empty,
        Credit = receipt.Credit,
        Debit = receipt.Debit,
        ReceiptAccountId = receipt.ReceiptAccountId?? Guid.Empty,
        ReceiptAccountName = receipt.ReceiptAccount?.Name ?? string.Empty,
        InstType = receipt.InstType.ToString(),
        InstNo = receipt.InstNo,
        BankAcc = receipt.BankAcc,
        Description = receipt.Description,
        UserName = receipt.User?.Name ?? string.Empty,
        Status = receipt.Status.ToString(),
        CreatedAt = receipt.CreatedAt
    };
}
    }
}