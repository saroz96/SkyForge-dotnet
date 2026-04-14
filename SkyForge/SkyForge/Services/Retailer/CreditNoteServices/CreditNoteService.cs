using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Dto.AccountDto;
using SkyForge.Dto.RetailerDto;
using SkyForge.Services.BillNumberServices;
using SkyForge.Models.Retailer.TransactionModel;
using SkyForge.Services.Retailer.DebitNoteServices;
using SkyForge.Dto.RetailerDto.CreditNoteDto;
using SkyForge.Models.Retailer.CreditNoteModel;
using SkyForge.Models.AccountModel;


namespace SkyForge.Services.Retailer.CreditNoteServices
{
    public class CreditNoteService : ICreditNoteService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<CreditNoteService> _logger;

        private readonly IBillNumberService _billNumberService;

        public CreditNoteService(
            ApplicationDbContext context,
            ILogger<CreditNoteService> logger,
            IBillNumberService billNumberService)
        {
            _context = context;
            _logger = logger;
            _billNumberService = billNumberService;
        }

        public async Task<CreditNoteFormDataResponseDTO> GetCreditNoteFormDataAsync(Guid companyId, Guid fiscalYearId, Guid userId)
        {
            try
            {
                _logger.LogInformation("GetCreditNoteFormDataAsync called for Company: {CompanyId}, User: {UserId}", companyId, userId);

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
                var nepaliDate = today.ToString("yyyy-MM-dd"); // You may want to use a proper Nepali date converter

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

                if (currentFiscalYear == null)
                {
                    _logger.LogWarning("Fiscal year not found with ID: {FiscalYearId} for Company: {CompanyId}",
                        fiscalYearId, companyId);
                    throw new ArgumentException("Fiscal year not found");
                }

                // Fetch all active accounts for the company and fiscal year
                var accounts = await _context.Accounts
                    .Where(a => a.CompanyId == companyId &&
                           a.IsActive &&
                           a.OriginalFiscalYearId == fiscalYearId)
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

                bool isAdminOrSupervisor = isAdmin || userRole == "Supervisor";

                // Get user permissions
                var permissions = new PermissionsDTO
                {
                    IsAdminOrSupervisor = isAdminOrSupervisor
                };

                // Prepare response
                var response = new CreditNoteFormDataResponseDTO
                {
                    Company = company,
                    CurrentFiscalYear = currentFiscalYear,
                    Accounts = accounts,
                    NepaliDate = nepaliDate,
                    CompanyDateFormat = company.DateFormat?.ToLower() ?? "english",
                    CurrentCompanyName = company.Name,
                    CurrentDate = today.ToString("yyyy-MM-dd"),
                    User = new UserInfoDTO
                    {
                        Id = user?.Id ?? userId,
                        Name = user?.Name ?? "Unknown",
                        Email = user?.Email ?? string.Empty,
                        IsAdmin = isAdmin,
                        Role = userRole
                    },
                    UserPreferences = user?.Preferences != null ? new UserPreferencesDTO
                    {
                        Theme = user.Preferences.Theme.ToString()
                    } : new UserPreferencesDTO(),
                    Permissions = permissions,
                    IsAdminOrSupervisor = isAdminOrSupervisor
                };

                _logger.LogInformation("Successfully fetched credit note form data for Company: {CompanyId}", companyId);
                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetCreditNoteFormDataAsync for Company: {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<string> GetNextBillNumberAsync(Guid companyId, Guid fiscalYearId)
        {
            return await _billNumberService.GetNextBillNumberAsync(companyId, fiscalYearId, "creditNote");
        }

        public async Task<string> GetCurrentBillNumberAsync(Guid companyId, Guid fiscalYearId)
        {
            return await _billNumberService.GetCurrentBillNumberAsync(companyId, fiscalYearId, "creditNote");
        }

        // public async Task<CreditNote> CreateCreditNoteAsync(CreateCreditNoteDTO dto, Guid userId, Guid companyId, Guid fiscalYearId)
        // {
        //     var executionStrategy = _context.Database.CreateExecutionStrategy();

        //     return await executionStrategy.ExecuteAsync(async () =>
        //     {
        //         using var transaction = await _context.Database.BeginTransactionAsync();

        //         try
        //         {
        //             _logger.LogInformation("CreateCreditNoteAsync started for Company: {CompanyId}, User: {UserId}", companyId, userId);

        //             // Validate entries
        //             if (dto.Entries == null || dto.Entries.Count < 2)
        //             {
        //                 throw new ArgumentException("At least 2 entries required (one debit and one credit)");
        //             }

        //             // Calculate totals and validate
        //             decimal totalDebit = dto.Entries.Where(e => e.EntryType == "Debit").Sum(e => e.Amount);
        //             decimal totalCredit = dto.Entries.Where(e => e.EntryType == "Credit").Sum(e => e.Amount);

        //             if (totalDebit != totalCredit)
        //             {
        //                 throw new ArgumentException($"Total Debit ({totalDebit}) must equal Total Credit ({totalCredit})");
        //             }

        //             // Verify all accounts exist and belong to company
        //             foreach (var entry in dto.Entries)
        //             {
        //                 var account = await _context.Accounts
        //                     .FirstOrDefaultAsync(a => a.Id == entry.AccountId && a.CompanyId == companyId);

        //                 if (account == null)
        //                 {
        //                     throw new ArgumentException($"Account with ID {entry.AccountId} not found");
        //                 }
        //             }

        //             // Get bill number
        //             var billNumber = await _billNumberService.GetNextBillNumberAsync(companyId, fiscalYearId, "creditNote");

        //             // Create Credit Note master record
        //             var creditNote = new CreditNote
        //             {
        //                 Id = Guid.NewGuid(),
        //                 TotalAmount = totalCredit, // or totalDebit, they're equal
        //                 BillNumber = billNumber,
        //                 Date = dto.Date,
        //                 NepaliDate = dto.NepaliDate,
        //                 Description = dto.Description,
        //                 UserId = userId,
        //                 CompanyId = companyId,
        //                 FiscalYearId = fiscalYearId,
        //                 Status = CreditNoteStatus.Active,
        //                 IsActive = true,
        //                 CreatedAt = DateTime.UtcNow
        //             };

        //             await _context.CreditNotes.AddAsync(creditNote);

        //             // Create credit note entries and transactions
        //             var transactions = new List<Transaction>();
        //             int lineNumber = 1;

        //             foreach (var entryDto in dto.Entries.OrderBy(e => e.LineNumber))
        //             {
        //                 // Create credit note entry
        //                 var creditNoteEntry = new CreditNoteEntry
        //                 {
        //                     Id = Guid.NewGuid(),
        //                     CreditNoteId = creditNote.Id,
        //                     AccountId = entryDto.AccountId,
        //                     EntryType = entryDto.EntryType,
        //                     Amount = entryDto.Amount,
        //                     Description = entryDto.Description,
        //                     LineNumber = lineNumber++,
        //                     ReferenceNumber = entryDto.ReferenceNumber,
        //                     CreatedAt = DateTime.UtcNow
        //                 };

        //                 await _context.CreditNoteEntries.AddAsync(creditNoteEntry);

        //                 // Get previous balance for account
        //                 decimal previousBalance = 0;
        //                 var lastTransaction = await _context.Transactions
        //                     .Where(t => t.AccountId == entryDto.AccountId && t.CompanyId == companyId)
        //                     .OrderByDescending(t => t.CreatedAt)
        //                     .FirstOrDefaultAsync();

        //                 if (lastTransaction != null)
        //                 {
        //                     previousBalance = lastTransaction.Balance ?? 0;
        //                 }

        //                 // Calculate new balance
        //                 // For Credit Note: Debit increases balance, Credit decreases balance
        //                 decimal newBalance = entryDto.EntryType == "Debit"
        //                     ? previousBalance + entryDto.Amount
        //                     : previousBalance - entryDto.Amount;

        //                 // Get opposite entry type names for DrCrNoteAccountType field
        //                 var oppositeEntries = dto.Entries.Where(e => e.EntryType != entryDto.EntryType).ToList();
        //                 var oppositeAccountNames = new List<string>();

        //                 foreach (var oppositeEntry in oppositeEntries)
        //                 {
        //                     var account = await _context.Accounts.FindAsync(oppositeEntry.AccountId);
        //                     if (account != null)
        //                     {
        //                         oppositeAccountNames.Add(account.Name);
        //                     }
        //                 }

        //                 var oppositeAccountNamesStr = string.Join(", ", oppositeAccountNames);
        //                 if (oppositeAccountNamesStr.Length > 500)
        //                 {
        //                     oppositeAccountNamesStr = oppositeAccountNamesStr.Substring(0, 497) + "...";
        //                 }

        //                 // Create transaction
        //                 var transactionEntry = new Transaction
        //                 {
        //                     Id = Guid.NewGuid(),
        //                     CreditNoteId = creditNote.Id,
        //                     AccountId = entryDto.AccountId,
        //                     Type = TransactionType.CrNt, // Credit Note
        //                     DrCrNoteAccountTypes = entryDto.EntryType, // "Debit" or "Credit"
        //                     DrCrNoteAccountType = oppositeAccountNamesStr,
        //                     Debit = entryDto.EntryType == "Debit" ? entryDto.Amount : 0,
        //                     Credit = entryDto.EntryType == "Credit" ? entryDto.Amount : 0,
        //                     PaymentMode = PaymentMode.CrNote, // Credit Note payment mode
        //                     Balance = newBalance,
        //                     Date = creditNote.Date,
        //                     nepaliDate = creditNote.NepaliDate,
        //                     IsActive = true,
        //                     CompanyId = companyId,
        //                     FiscalYearId = fiscalYearId,
        //                     CreatedAt = DateTime.UtcNow
        //                 };

        //                 transactions.Add(transactionEntry);
        //             }

        //             await _context.Transactions.AddRangeAsync(transactions);

        //             await _context.SaveChangesAsync();
        //             await transaction.CommitAsync();

        //             _logger.LogInformation("Credit Note created successfully. ID: {CreditNoteId}, BillNumber: {BillNumber}, Total: {TotalAmount}, Entries: {EntryCount}",
        //                 creditNote.Id, creditNote.BillNumber, totalCredit, dto.Entries.Count);

        //             return creditNote;
        //         }
        //         catch (Exception ex)
        //         {
        //             _logger.LogError(ex, "Error in CreateCreditNoteAsync for Company: {CompanyId}", companyId);
        //             await transaction.RollbackAsync();
        //             throw;
        //         }
        //     });
        // }

        public async Task<CreditNote> CreateCreditNoteAsync(CreateCreditNoteDTO dto, Guid userId, Guid companyId, Guid fiscalYearId)
        {
            var executionStrategy = _context.Database.CreateExecutionStrategy();

            return await executionStrategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();

                try
                {
                    _logger.LogInformation("CreateCreditNoteAsync started for Company: {CompanyId}, User: {UserId}", companyId, userId);

                    // Validate entries
                    if (dto.Entries == null || dto.Entries.Count < 2)
                    {
                        throw new ArgumentException("At least 2 entries required (one debit and one credit)");
                    }

                    // Calculate totals and validate
                    decimal totalDebit = dto.Entries.Where(e => e.EntryType == "Debit").Sum(e => e.Amount);
                    decimal totalCredit = dto.Entries.Where(e => e.EntryType == "Credit").Sum(e => e.Amount);

                    if (totalDebit != totalCredit)
                    {
                        throw new ArgumentException($"Total Debit ({totalDebit}) must equal Total Credit ({totalCredit})");
                    }

                    // Verify all accounts exist and belong to company - cache them
                    var accountCache = new Dictionary<Guid, Account>();
                    foreach (var entry in dto.Entries)
                    {
                        var account = await _context.Accounts
                            .FirstOrDefaultAsync(a => a.Id == entry.AccountId && a.CompanyId == companyId);

                        if (account == null)
                        {
                            throw new ArgumentException($"Account with ID {entry.AccountId} not found");
                        }
                        accountCache[entry.AccountId] = account;
                    }

                    // Get bill number
                    var billNumber = await _billNumberService.GetNextBillNumberAsync(companyId, fiscalYearId, "creditNote");

                    // Create Credit Note master record
                    var creditNote = new CreditNote
                    {
                        Id = Guid.NewGuid(),
                        TotalAmount = totalCredit,
                        BillNumber = billNumber,
                        Date = dto.Date,
                        NepaliDate = dto.NepaliDate,
                        Description = dto.Description,
                        UserId = userId,
                        CompanyId = companyId,
                        FiscalYearId = fiscalYearId,
                        Status = CreditNoteStatus.Active,
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    };

                    await _context.CreditNotes.AddAsync(creditNote);

                    // Create credit note entries and transactions
                    var transactions = new List<Transaction>();
                    int lineNumber = 1;

                    foreach (var entryDto in dto.Entries.OrderBy(e => e.LineNumber))
                    {
                        // Create credit note entry
                        var creditNoteEntry = new CreditNoteEntry
                        {
                            Id = Guid.NewGuid(),
                            CreditNoteId = creditNote.Id,
                            AccountId = entryDto.AccountId,
                            EntryType = entryDto.EntryType,
                            Amount = entryDto.Amount,
                            Description = entryDto.Description,
                            LineNumber = lineNumber++,
                            ReferenceNumber = entryDto.ReferenceNumber,
                            CreatedAt = DateTime.UtcNow
                        };

                        await _context.CreditNoteEntries.AddAsync(creditNoteEntry);

                        // Get opposite entry type names for DrCrNoteAccountType field
                        var oppositeEntries = dto.Entries.Where(e => e.EntryType != entryDto.EntryType).ToList();
                        var oppositeAccountNames = new List<string>();

                        foreach (var oppositeEntry in oppositeEntries)
                        {
                            if (accountCache.TryGetValue(oppositeEntry.AccountId, out var account))
                            {
                                oppositeAccountNames.Add(account.Name);
                            }
                        }

                        var oppositeAccountNamesStr = string.Join(", ", oppositeAccountNames);
                        if (oppositeAccountNamesStr.Length > 500)
                        {
                            oppositeAccountNamesStr = oppositeAccountNamesStr.Substring(0, 497) + "...";
                        }

                        // Create transaction using TotalDebit/TotalCredit
                        var transactionEntry = new Transaction
                        {
                            Id = Guid.NewGuid(),
                            CreditNoteId = creditNote.Id,
                            AccountId = entryDto.AccountId,
                            Type = TransactionType.CrNt, // Credit Note
                            DrCrNoteAccountTypes = entryDto.EntryType, // "Debit" or "Credit"
                            DrCrNoteAccountType = oppositeAccountNamesStr,
                            TotalDebit = entryDto.EntryType == "Debit" ? entryDto.Amount : 0,
                            TotalCredit = entryDto.EntryType == "Credit" ? entryDto.Amount : 0,
                            PaymentMode = PaymentMode.CrNote,
                            Date = creditNote.Date,
                            nepaliDate = creditNote.NepaliDate,
                            IsActive = true,
                            CompanyId = companyId,
                            FiscalYearId = fiscalYearId,
                            CreatedAt = DateTime.UtcNow,
                            Status = TransactionStatus.Active
                        };

                        transactions.Add(transactionEntry);
                    }

                    await _context.Transactions.AddRangeAsync(transactions);

                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();

                    _logger.LogInformation("Credit Note created successfully. ID: {CreditNoteId}, BillNumber: {BillNumber}, Total: {TotalAmount}, Entries: {EntryCount}",
                        creditNote.Id, creditNote.BillNumber, totalCredit, dto.Entries.Count);

                    return creditNote;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in CreateCreditNoteAsync for Company: {CompanyId}", companyId);
                    await transaction.RollbackAsync();
                    throw;
                }
            });
        }

        public async Task<CreditNoteFindsDTO> GetCreditNoteFindsAsync(Guid companyId, Guid fiscalYearId, Guid userId)
        {
            try
            {
                _logger.LogInformation("GetCreditNoteFindsAsync called for Company: {CompanyId}, FiscalYear: {FiscalYearId}, User: {UserId}",
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

                var latestBillQuery = _context.CreditNotes
                    .Where(p => p.CompanyId == companyId && p.FiscalYearId == fiscalYearId);

                if (isNepaliFormat)
                {
                    latestBillQuery = latestBillQuery.OrderByDescending(p => p.NepaliDate)
                                                     .ThenByDescending(p => p.BillNumber);
                }
                else
                {
                    latestBillQuery = latestBillQuery.OrderByDescending(p => p.Date)
                                                     .ThenByDescending(p => p.BillNumber);
                }

                var latestBill = await latestBillQuery
                    .Select(p => new { p.BillNumber, p.Date, p.NepaliDate })
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

                bool isAdminOrSupervisor = isAdmin || userRole == "Supervisor";

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

                var response = new CreditNoteFindsDTO
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

                _logger.LogInformation("Successfully retrieved credit note finds data for Company: {CompanyId}", companyId);
                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetCreditNoteFindsAsync for Company: {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<BillIdResponseDTO> GetCreditNoteBillIdByNumberAsync(string billNumber, Guid companyId, Guid fiscalYearId)
        {
            try
            {
                _logger.LogInformation($"Getting credit note ID for number: {billNumber}, Company: {companyId}, FiscalYear: {fiscalYearId}");

                var creditNoteBill = await _context.CreditNotes
                    .Where(pb => pb.BillNumber == billNumber &&
                                pb.CompanyId == companyId &&
                                pb.FiscalYearId == fiscalYearId)
                    .Select(pb => new BillIdResponseDTO
                    {
                        Id = pb.Id,
                        BillNumber = pb.BillNumber
                    })
                    .FirstOrDefaultAsync();

                if (creditNoteBill == null)
                {
                    _logger.LogWarning($"Credit note not found for number: {billNumber}");
                    throw new ArgumentException("Voucher not found");
                }

                _logger.LogInformation($"Successfully retrieved bill ID for number: {billNumber}");
                return creditNoteBill;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting credit note ID for number: {billNumber}");
                throw;
            }
        }
        public async Task<CreditNoteEditDataDTO> GetCreditNoteEditDataAsync(Guid creditNoteId, Guid companyId, Guid fiscalYearId, Guid userId)
        {
            try
            {
                _logger.LogInformation("GetCreditNoteEditDataAsync called for Credit Note ID: {CreditNoteId}, Company: {CompanyId}, FiscalYear: {FiscalYearId}",
                    creditNoteId, companyId, fiscalYearId);

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
                        DateFormat = f.DateFormat.ToString(),
                    })
                    .FirstOrDefaultAsync();

                if (currentFiscalYear == null)
                    throw new ArgumentException("Fiscal year not found");

                string companyDateFormat = company.DateFormat?.ToLower() ?? "english";
                var today = DateTime.UtcNow;
                var nepaliDate = today.ToString("yyyy-MM-dd");

                // Fetch credit note with all related data (including entries and accounts)
                var creditNote = await _context.CreditNotes
                    .Include(c => c.CreditNoteEntries)
                        .ThenInclude(e => e.Account)
                    .Include(c => c.User)
                    .FirstOrDefaultAsync(c => c.Id == creditNoteId &&
                                              c.CompanyId == companyId &&
                                              c.FiscalYearId == fiscalYearId);

                if (creditNote == null)
                    throw new ArgumentException("Credit note not found or does not belong to the selected company/fiscal year");

                // Fetch all active accounts for the company and fiscal year
                var accounts = await _context.Accounts
                    .Where(a => a.CompanyId == companyId &&
                           a.IsActive &&
                           a.OriginalFiscalYearId == fiscalYearId)
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

                // Get user with roles and preferences
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

                // Map to DTOs
                var creditNoteDto = MapToCreditNoteEditDTO(creditNote);
                var entriesDto = MapToCreditNoteEntryEditDTO(creditNote.CreditNoteEntries);

                var response = new CreditNoteEditDataDTO
                {
                    Company = company,
                    CreditNote = creditNoteDto,
                    Entries = entriesDto,
                    Accounts = accounts,
                    CurrentFiscalYear = currentFiscalYear,
                    NepaliDate = nepaliDate,
                    CompanyDateFormat = companyDateFormat,
                    CurrentCompanyName = company.Name,
                    CurrentDate = today,
                    User = userInfo,
                    IsAdminOrSupervisor = isAdminOrSupervisor
                };

                _logger.LogInformation("Successfully retrieved credit note edit data for Credit Note ID: {CreditNoteId} with {EntryCount} entries",
                    creditNoteId, entriesDto.Count);

                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting credit note edit data for Credit Note ID: {CreditNoteId}", creditNoteId);
                throw;
            }
        }

        private CreditNoteEditDTO MapToCreditNoteEditDTO(CreditNote creditNote)
        {
            return new CreditNoteEditDTO
            {
                Id = creditNote.Id,
                BillNumber = creditNote.BillNumber,
                Date = creditNote.Date,
                NepaliDate = creditNote.NepaliDate,
                TotalAmount = creditNote.TotalAmount,
                Description = creditNote.Description,
                UserName = creditNote.User?.Name ?? string.Empty,
                UserEmail = creditNote.User?.Email ?? string.Empty,
                Status = creditNote.Status.ToString(),
                CreatedAt = creditNote.CreatedAt,
                UpdatedAt = creditNote.UpdatedAt
            };
        }

        private List<CreditNoteEntryEditDTO> MapToCreditNoteEntryEditDTO(ICollection<CreditNoteEntry> entries)
        {
            return entries.OrderBy(e => e.LineNumber).Select(e => new CreditNoteEntryEditDTO
            {
                Id = e.Id,
                AccountId = e.AccountId,
                AccountName = e.Account?.Name ?? string.Empty,
                EntryType = e.EntryType,
                Amount = e.Amount,
                Description = e.Description,
                LineNumber = e.LineNumber,
                ReferenceNumber = e.ReferenceNumber
            }).ToList();
        }

        // public async Task<CreditNote> UpdateCreditNoteAsync(Guid id, UpdateCreditNoteDTO dto, Guid companyId, Guid fiscalYearId, Guid userId)
        // {
        //     var executionStrategy = _context.Database.CreateExecutionStrategy();

        //     return await executionStrategy.ExecuteAsync(async () =>
        //     {
        //         using var transaction = await _context.Database.BeginTransactionAsync();

        //         try
        //         {
        //             _logger.LogInformation("=== Starting UpdateCreditNoteAsync for Credit Note ID: {CreditNoteId} ===", id);

        //             // Validate entries
        //             if (dto.Entries == null || dto.Entries.Count < 2)
        //                 throw new ArgumentException("At least 2 entries required (one debit and one credit)");

        //             decimal totalDebit = dto.Entries.Where(e => e.EntryType == "Debit").Sum(e => e.Amount);
        //             decimal totalCredit = dto.Entries.Where(e => e.EntryType == "Credit").Sum(e => e.Amount);

        //             if (totalDebit != totalCredit)
        //                 throw new ArgumentException($"Total Debit ({totalDebit}) must equal Total Credit ({totalCredit})");

        //             // Find existing credit note
        //             var existingCreditNote = await _context.CreditNotes
        //                 .Include(c => c.CreditNoteEntries)
        //                 .FirstOrDefaultAsync(c => c.Id == id && c.CompanyId == companyId);

        //             if (existingCreditNote == null)
        //                 throw new ArgumentException("Credit note not found");

        //             // Check if credit note is canceled
        //             if (existingCreditNote.Status == CreditNoteStatus.Canceled)
        //                 throw new ArgumentException("Cannot update a canceled credit note");

        //             // Validate all accounts exist
        //             foreach (var entryDto in dto.Entries)
        //             {
        //                 var account = await _context.Accounts
        //                     .FirstOrDefaultAsync(a => a.Id == entryDto.AccountId && a.CompanyId == companyId);

        //                 if (account == null)
        //                     throw new ArgumentException($"Account with ID {entryDto.AccountId} not found");
        //             }

        //             var company = await _context.Companies.FindAsync(companyId);
        //             if (company == null)
        //                 throw new ArgumentException("Company not found");

        //             var fiscalYear = await _context.FiscalYears
        //                 .FirstOrDefaultAsync(f => f.Id == fiscalYearId && f.CompanyId == companyId);

        //             if (fiscalYear == null)
        //                 throw new ArgumentException("Fiscal year not found");

        //             // Delete existing transactions associated with this credit note
        //             var existingTransactions = await _context.Transactions
        //                 .Where(t => t.CreditNoteId == id)
        //                 .ToListAsync();

        //             if (existingTransactions.Any())
        //             {
        //                 _context.Transactions.RemoveRange(existingTransactions);
        //                 _logger.LogInformation("Deleted {Count} existing transactions", existingTransactions.Count);
        //             }

        //             // Delete existing credit note entries
        //             if (existingCreditNote.CreditNoteEntries.Any())
        //             {
        //                 _context.CreditNoteEntries.RemoveRange(existingCreditNote.CreditNoteEntries);
        //                 _logger.LogInformation("Deleted {Count} existing entries", existingCreditNote.CreditNoteEntries.Count);
        //             }

        //             await _context.SaveChangesAsync();

        //             // Update credit note properties
        //             existingCreditNote.TotalAmount = totalDebit;
        //             existingCreditNote.Description = dto.Description;
        //             existingCreditNote.NepaliDate = dto.NepaliDate;
        //             existingCreditNote.Date = dto.Date;
        //             existingCreditNote.UpdatedAt = DateTime.UtcNow;

        //             _context.CreditNotes.Update(existingCreditNote);
        //             await _context.SaveChangesAsync();

        //             // Create new entries and transactions
        //             var newEntries = new List<CreditNoteEntry>();
        //             var newTransactions = new List<Transaction>();
        //             int lineNumber = 1;

        //             foreach (var entryDto in dto.Entries.OrderBy(e => e.LineNumber))
        //             {
        //                 var creditNoteEntry = new CreditNoteEntry
        //                 {
        //                     Id = Guid.NewGuid(),
        //                     CreditNoteId = existingCreditNote.Id,
        //                     AccountId = entryDto.AccountId,
        //                     EntryType = entryDto.EntryType,
        //                     Amount = entryDto.Amount,
        //                     Description = entryDto.Description,
        //                     LineNumber = lineNumber++,
        //                     ReferenceNumber = entryDto.ReferenceNumber,
        //                     CreatedAt = DateTime.UtcNow
        //                 };

        //                 newEntries.Add(creditNoteEntry);

        //                 // Get previous balance for account
        //                 decimal previousBalance = 0;
        //                 var lastTransaction = await _context.Transactions
        //                     .Where(t => t.AccountId == entryDto.AccountId && t.CompanyId == companyId)
        //                     .OrderByDescending(t => t.CreatedAt)
        //                     .FirstOrDefaultAsync();

        //                 if (lastTransaction != null)
        //                     previousBalance = lastTransaction.Balance ?? 0;

        //                 // Calculate new balance
        //                 // For Credit Note: Debit increases balance, Credit decreases balance
        //                 decimal newBalance = entryDto.EntryType == "Debit"
        //                     ? previousBalance + entryDto.Amount
        //                     : previousBalance - entryDto.Amount;

        //                 // Get opposite entry type names for DrCrNoteAccountType field
        //                 var oppositeEntries = dto.Entries.Where(e => e.EntryType != entryDto.EntryType).ToList();
        //                 var oppositeAccountNames = new List<string>();

        //                 foreach (var oppositeEntry in oppositeEntries)
        //                 {
        //                     var account = await _context.Accounts.FindAsync(oppositeEntry.AccountId);
        //                     if (account != null)
        //                     {
        //                         oppositeAccountNames.Add(account.Name);
        //                     }
        //                 }

        //                 var oppositeAccountNamesStr = string.Join(", ", oppositeAccountNames);

        //                 // Truncate if too long (max 500 characters for SQL Server)
        //                 if (oppositeAccountNamesStr.Length > 497)
        //                     oppositeAccountNamesStr = oppositeAccountNamesStr.Substring(0, 494) + "...";

        //                 // Create transaction
        //                 var creditNoteTransaction = new Transaction
        //                 {
        //                     Id = Guid.NewGuid(),
        //                     CreditNoteId = existingCreditNote.Id,
        //                     AccountId = entryDto.AccountId,
        //                     Type = TransactionType.CrNt, // Credit Note
        //                     DrCrNoteAccountTypes = entryDto.EntryType, // "Debit" or "Credit"
        //                     DrCrNoteAccountType = oppositeAccountNamesStr,
        //                     BillNumber = existingCreditNote.BillNumber,
        //                     Debit = entryDto.EntryType == "Debit" ? entryDto.Amount : 0,
        //                     Credit = entryDto.EntryType == "Credit" ? entryDto.Amount : 0,
        //                     PaymentMode = PaymentMode.CrNote, // Credit Note payment mode
        //                     Balance = newBalance,
        //                     Date = existingCreditNote.Date,
        //                     nepaliDate = existingCreditNote.NepaliDate,
        //                     IsActive = true,
        //                     CompanyId = companyId,
        //                     FiscalYearId = fiscalYearId,
        //                     CreatedAt = DateTime.UtcNow
        //                 };

        //                 newTransactions.Add(creditNoteTransaction);
        //             }

        //             await _context.CreditNoteEntries.AddRangeAsync(newEntries);
        //             await _context.Transactions.AddRangeAsync(newTransactions);

        //             var saveResult = await _context.SaveChangesAsync();
        //             _logger.LogInformation("SaveChangesAsync completed. {RowCount} rows affected.", saveResult);

        //             await transaction.CommitAsync();
        //             _logger.LogInformation("Transaction committed successfully");

        //             _logger.LogInformation("=== Successfully updated credit note: {CreditNoteId} with {EntryCount} entries ===",
        //                 id, newEntries.Count);

        //             // Return the updated credit note with entries
        //             var updatedCreditNote = await _context.CreditNotes
        //                 .Include(c => c.CreditNoteEntries)
        //                     .ThenInclude(e => e.Account)
        //                 .FirstOrDefaultAsync(c => c.Id == id);

        //             return updatedCreditNote ?? existingCreditNote;
        //         }
        //         catch (Exception ex)
        //         {
        //             _logger.LogError(ex, "Error updating credit note: {CreditNoteId}", id);
        //             await transaction.RollbackAsync();
        //             throw;
        //         }
        //     });
        // }

        public async Task<CreditNote> UpdateCreditNoteAsync(Guid id, UpdateCreditNoteDTO dto, Guid companyId, Guid fiscalYearId, Guid userId)
        {
            var executionStrategy = _context.Database.CreateExecutionStrategy();

            return await executionStrategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();

                try
                {
                    _logger.LogInformation("=== Starting UpdateCreditNoteAsync for Credit Note ID: {CreditNoteId} ===", id);

                    // Validate entries
                    if (dto.Entries == null || dto.Entries.Count < 2)
                        throw new ArgumentException("At least 2 entries required (one debit and one credit)");

                    decimal totalDebit = dto.Entries.Where(e => e.EntryType == "Debit").Sum(e => e.Amount);
                    decimal totalCredit = dto.Entries.Where(e => e.EntryType == "Credit").Sum(e => e.Amount);

                    if (totalDebit != totalCredit)
                        throw new ArgumentException($"Total Debit ({totalDebit}) must equal Total Credit ({totalCredit})");

                    // Find existing credit note
                    var existingCreditNote = await _context.CreditNotes
                        .Include(c => c.CreditNoteEntries)
                        .FirstOrDefaultAsync(c => c.Id == id && c.CompanyId == companyId);

                    if (existingCreditNote == null)
                        throw new ArgumentException("Credit note not found");

                    // Check if credit note is canceled
                    if (existingCreditNote.Status == CreditNoteStatus.Canceled)
                        throw new ArgumentException("Cannot update a canceled credit note");

                    // Validate all accounts exist and cache them
                    var accountCache = new Dictionary<Guid, Account>();
                    foreach (var entryDto in dto.Entries)
                    {
                        var account = await _context.Accounts
                            .FirstOrDefaultAsync(a => a.Id == entryDto.AccountId && a.CompanyId == companyId);

                        if (account == null)
                            throw new ArgumentException($"Account with ID {entryDto.AccountId} not found");

                        accountCache[entryDto.AccountId] = account;
                    }

                    var company = await _context.Companies.FindAsync(companyId);
                    if (company == null)
                        throw new ArgumentException("Company not found");

                    var fiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.Id == fiscalYearId && f.CompanyId == companyId);

                    if (fiscalYear == null)
                        throw new ArgumentException("Fiscal year not found");

                    // Delete existing transactions AND their transaction items
                    var existingTransactions = await _context.Transactions
                        .Where(t => t.CreditNoteId == id)
                        .Include(t => t.TransactionItems) // Include transaction items for cascade delete
                        .ToListAsync();

                    if (existingTransactions.Any())
                    {
                        // TransactionItems will be deleted automatically due to Cascade delete
                        _context.Transactions.RemoveRange(existingTransactions);
                        _logger.LogInformation("Deleted {Count} existing transactions with their items", existingTransactions.Count);
                    }

                    // Delete existing credit note entries
                    if (existingCreditNote.CreditNoteEntries.Any())
                    {
                        _context.CreditNoteEntries.RemoveRange(existingCreditNote.CreditNoteEntries);
                        _logger.LogInformation("Deleted {Count} existing entries", existingCreditNote.CreditNoteEntries.Count);
                    }

                    await _context.SaveChangesAsync();

                    // Update credit note properties
                    existingCreditNote.TotalAmount = totalDebit;
                    existingCreditNote.Description = dto.Description;
                    existingCreditNote.NepaliDate = dto.NepaliDate;
                    existingCreditNote.Date = dto.Date;
                    existingCreditNote.UpdatedAt = DateTime.UtcNow;

                    _context.CreditNotes.Update(existingCreditNote);
                    await _context.SaveChangesAsync();

                    // Create new entries and transactions
                    var newEntries = new List<CreditNoteEntry>();
                    var newTransactions = new List<Transaction>();
                    int lineNumber = 1;

                    foreach (var entryDto in dto.Entries.OrderBy(e => e.LineNumber))
                    {
                        var creditNoteEntry = new CreditNoteEntry
                        {
                            Id = Guid.NewGuid(),
                            CreditNoteId = existingCreditNote.Id,
                            AccountId = entryDto.AccountId,
                            EntryType = entryDto.EntryType,
                            Amount = entryDto.Amount,
                            Description = entryDto.Description,
                            LineNumber = lineNumber++,
                            ReferenceNumber = entryDto.ReferenceNumber,
                            CreatedAt = DateTime.UtcNow
                        };

                        newEntries.Add(creditNoteEntry);

                        // Get opposite entry type names for DrCrNoteAccountType field
                        var oppositeEntries = dto.Entries.Where(e => e.EntryType != entryDto.EntryType).ToList();
                        var oppositeAccountNames = new List<string>();

                        foreach (var oppositeEntry in oppositeEntries)
                        {
                            if (accountCache.TryGetValue(oppositeEntry.AccountId, out var account))
                            {
                                oppositeAccountNames.Add(account.Name);
                            }
                        }

                        var oppositeAccountNamesStr = string.Join(", ", oppositeAccountNames);

                        // Truncate if too long (max 500 characters for SQL Server)
                        if (oppositeAccountNamesStr.Length > 497)
                            oppositeAccountNamesStr = oppositeAccountNamesStr.Substring(0, 494) + "...";

                        // Create transaction using TotalDebit/TotalCredit
                        var creditNoteTransaction = new Transaction
                        {
                            Id = Guid.NewGuid(),
                            CreditNoteId = existingCreditNote.Id,
                            AccountId = entryDto.AccountId,
                            Type = TransactionType.CrNt, // Credit Note
                            DrCrNoteAccountTypes = entryDto.EntryType, // "Debit" or "Credit"
                            DrCrNoteAccountType = oppositeAccountNamesStr,
                            BillNumber = existingCreditNote.BillNumber,
                            TotalDebit = entryDto.EntryType == "Debit" ? entryDto.Amount : 0,
                            TotalCredit = entryDto.EntryType == "Credit" ? entryDto.Amount : 0,
                            PaymentMode = PaymentMode.CrNote,
                            Date = existingCreditNote.Date,
                            nepaliDate = existingCreditNote.NepaliDate,
                            IsActive = true,
                            CompanyId = companyId,
                            FiscalYearId = fiscalYearId,
                            CreatedAt = DateTime.UtcNow,
                            Status = TransactionStatus.Active
                        };

                        newTransactions.Add(creditNoteTransaction);
                    }

                    await _context.CreditNoteEntries.AddRangeAsync(newEntries);
                    await _context.Transactions.AddRangeAsync(newTransactions);

                    var saveResult = await _context.SaveChangesAsync();
                    _logger.LogInformation("SaveChangesAsync completed. {RowCount} rows affected.", saveResult);

                    await transaction.CommitAsync();
                    _logger.LogInformation("Transaction committed successfully");

                    _logger.LogInformation("=== Successfully updated credit note: {CreditNoteId} with {EntryCount} entries ===",
                        id, newEntries.Count);

                    // Return the updated credit note with entries
                    var updatedCreditNote = await _context.CreditNotes
                        .Include(c => c.CreditNoteEntries)
                            .ThenInclude(e => e.Account)
                        .FirstOrDefaultAsync(c => c.Id == id);

                    return updatedCreditNote ?? existingCreditNote;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error updating credit note: {CreditNoteId}", id);
                    await transaction.RollbackAsync();
                    throw;
                }
            });
        }

        public async Task<CreditNoteRegisterDataDTO> GetCreditNotesRegisterAsync(Guid companyId, Guid fiscalYearId, string? fromDate = null, string? toDate = null)
        {
            try
            {
                _logger.LogInformation("GetCreditNotesRegisterAsync called with companyId: {CompanyId}, fiscalYearId: {FiscalYearId}, fromDate: {FromDate}, toDate: {ToDate}",
                    companyId, fiscalYearId, fromDate, toDate);

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

                var today = DateTime.UtcNow;
                var nepaliDate = today.ToString("yyyy-MM-dd");
                bool isNepaliFormat = company.DateFormat?.ToLower() == "nepali";

                _logger.LogInformation("Company date format: {DateFormat}, IsNepaliFormat: {IsNepaliFormat}",
                    company.DateFormat, isNepaliFormat);

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

                // If no date range provided, return basic info with empty credit notes
                if (string.IsNullOrEmpty(fromDate) || string.IsNullOrEmpty(toDate))
                {
                    _logger.LogInformation("No date range provided, returning basic info with empty credit notes list");
                    return new CreditNoteRegisterDataDTO
                    {
                        Company = company,
                        CurrentFiscalYear = fiscalYear,
                        CreditNotes = new List<CreditNoteResponseItemDTO>(),
                        FromDate = fromDate,
                        ToDate = toDate,
                        CurrentCompanyName = company.Name,
                        CompanyDateFormat = company.DateFormat,
                        NepaliDate = nepaliDate,
                        UserPreferences = new UserPreferencesDTO { Theme = "light" },
                        IsAdminOrSupervisor = false
                    };
                }

                DateTime startDateTime;
                DateTime endDateTime;

                if (isNepaliFormat)
                {
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

                endDateTime = endDateTime.Date.AddDays(1).AddTicks(-1);

                _logger.LogInformation("Searching for credit notes between {StartDate} and {EndDate} using {DateFormat} format",
                    startDateTime, endDateTime, isNepaliFormat ? "Nepali" : "English");

                var query = _context.CreditNotes
                    .Include(c => c.CreditNoteEntries)
                        .ThenInclude(e => e.Account)
                    .Include(c => c.User)
                    .Where(c => c.CompanyId == companyId && c.FiscalYearId == fiscalYearId);

                if (isNepaliFormat)
                {
                    query = query.Where(c => c.NepaliDate >= startDateTime && c.NepaliDate <= endDateTime);
                    _logger.LogInformation("Using NepaliDate field for filtering");
                }
                else
                {
                    query = query.Where(c => c.Date >= startDateTime && c.Date <= endDateTime);
                    _logger.LogInformation("Using Date field for filtering");
                }

                var creditNotes = await query
                    .OrderBy(c => c.Date)
                    .ThenBy(c => c.BillNumber)
                    .ToListAsync();

                _logger.LogInformation("Found {Count} credit notes matching the criteria", creditNotes.Count);

                var creditNoteDtos = creditNotes.Select(creditNote => MapToResponseItemDTO(creditNote, company.DateFormat)).ToList();

                return new CreditNoteRegisterDataDTO
                {
                    Company = company,
                    CurrentFiscalYear = fiscalYear,
                    CreditNotes = creditNoteDtos,
                    FromDate = fromDate,
                    ToDate = toDate,
                    CurrentCompanyName = company.Name,
                    CompanyDateFormat = company.DateFormat,
                    NepaliDate = nepaliDate,
                    UserPreferences = new UserPreferencesDTO { Theme = "light" },
                    IsAdminOrSupervisor = false
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting credit notes register for company {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<CreditNoteEntryDataDTO> GetCreditNoteEntryDataAsync(Guid companyId, Guid fiscalYearId, Guid userId)
        {
            try
            {
                _logger.LogInformation("GetCreditNoteEntryDataAsync called with companyId: {CompanyId}, fiscalYearId: {FiscalYearId}, userId: {UserId}",
                    companyId, fiscalYearId, userId);

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

                // Fetch all active accounts for the company and fiscal year
                var accounts = await _context.Accounts
                    .Where(a => a.CompanyId == companyId &&
                           a.IsActive &&
                           a.OriginalFiscalYearId == fiscalYearId)
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

                var data = new CreditNoteEntryDataDTO
                {
                    Company = company,
                    Accounts = accounts,
                    Dates = new DateInfoDTO
                    {
                        NepaliDate = DateTime.UtcNow.ToString("yyyy-MM-dd"),
                        TransactionDateNepali = DateTime.UtcNow.ToString("yyyy-MM-dd"),
                        CompanyDateFormat = company.DateFormat
                    },
                    CurrentFiscalYear = fiscalYear,
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

                _logger.LogInformation("Successfully retrieved credit note entry data for company {CompanyId}", companyId);
                return data;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting credit note entry data for company {CompanyId}", companyId);
                throw;
            }
        }

        private CreditNoteResponseItemDTO MapToResponseItemDTO(CreditNote creditNote, string companyDateFormat)
        {
            bool isNepaliFormat = companyDateFormat?.ToLower() == "nepali";

            var entries = creditNote.CreditNoteEntries?.ToList() ?? new List<CreditNoteEntry>();

            var debitEntries = entries.Where(e => e.EntryType == "Debit").ToList();
            var creditEntries = entries.Where(e => e.EntryType == "Credit").ToList();

            var debitAccountNames = debitEntries.Select(e => e.Account?.Name ?? string.Empty).ToList();
            var creditAccountNames = creditEntries.Select(e => e.Account?.Name ?? string.Empty).ToList();

            var debitAmounts = debitEntries.Select(e => e.Amount).ToList();
            var creditAmounts = creditEntries.Select(e => e.Amount).ToList();

            return new CreditNoteResponseItemDTO
            {
                Id = creditNote.Id,
                BillNumber = creditNote.BillNumber,
                Date = isNepaliFormat ? creditNote.NepaliDate : creditNote.Date,
                NepaliDate = creditNote.NepaliDate,
                Description = creditNote.Description ?? string.Empty,
                TotalAmount = creditNote.TotalAmount,
                UserName = creditNote.User?.Name ?? string.Empty,
                Status = creditNote.Status.ToString(),
                CreatedAt = creditNote.CreatedAt,
                DebitAccountNames = debitAccountNames,
                CreditAccountNames = creditAccountNames,
                DebitAmounts = debitAmounts,
                CreditAmounts = creditAmounts
            };
        }

        // public async Task<CreditNotePrintDTO> GetCreditNoteForPrintAsync(Guid id, Guid companyId, Guid userId, Guid fiscalYearId)
        // {
        //     try
        //     {
        //         _logger.LogInformation("GetCreditNoteForPrintAsync called for Credit Note ID: {CreditNoteId}", id);

        //         var companyEntity = await _context.Companies
        //             .FirstOrDefaultAsync(c => c.Id == companyId);

        //         if (companyEntity == null)
        //             throw new ArgumentException("Company not found");

        //         // Fetch credit note with entries and accounts
        //         var creditNote = await _context.CreditNotes
        //             .Include(c => c.CreditNoteEntries)
        //                 .ThenInclude(e => e.Account)
        //             .Include(c => c.User)
        //             .FirstOrDefaultAsync(c => c.Id == id && c.CompanyId == companyId);

        //         if (creditNote == null)
        //             throw new ArgumentException("Credit note not found");

        //         var entries = creditNote.CreditNoteEntries.ToList();

        //         // Get debit and credit entries from unified entries
        //         var debitEntries = entries.Where(e => e.EntryType == "Debit")
        //             .OrderBy(e => e.LineNumber)
        //             .Select(e => new CreditNoteEntryPrintDTO
        //             {
        //                 Id = e.Id,
        //                 AccountId = e.AccountId,
        //                 AccountName = e.Account?.Name ?? string.Empty,
        //                 EntryType = e.EntryType,
        //                 Amount = e.Amount,
        //                 Description = e.Description,
        //                 ReferenceNumber = e.ReferenceNumber,
        //                 LineNumber = e.LineNumber
        //             }).ToList();

        //         var creditEntries = entries.Where(e => e.EntryType == "Credit")
        //             .OrderBy(e => e.LineNumber)
        //             .Select(e => new CreditNoteEntryPrintDTO
        //             {
        //                 Id = e.Id,
        //                 AccountId = e.AccountId,
        //                 AccountName = e.Account?.Name ?? string.Empty,
        //                 EntryType = e.EntryType,
        //                 Amount = e.Amount,
        //                 Description = e.Description,
        //                 ReferenceNumber = e.ReferenceNumber,
        //                 LineNumber = e.LineNumber
        //             }).ToList();

        //         // Get fiscal year
        //         var currentFiscalYear = await _context.FiscalYears
        //             .Where(f => f.Id == fiscalYearId && f.CompanyId == companyId)
        //             .Select(f => new FiscalYearDTO
        //             {
        //                 Id = f.Id,
        //                 Name = f.Name,
        //                 StartDate = f.StartDate,
        //                 EndDate = f.EndDate,
        //                 IsActive = f.IsActive,
        //                 StartDateNepali = f.StartDateNepali,
        //                 EndDateNepali = f.EndDateNepali
        //             })
        //             .FirstOrDefaultAsync();

        //         // Get current company for print details
        //         var currentCompany = new CompanyPrintInfoDTO
        //         {
        //             Id = companyEntity.Id,
        //             Name = companyEntity.Name,
        //             Phone = companyEntity.Phone,
        //             Pan = companyEntity.Pan,
        //             Address = companyEntity.Address,
        //         };

        //         // Get user with roles
        //         var user = await _context.Users
        //             .Include(u => u.UserRoles)
        //                 .ThenInclude(ur => ur.Role)
        //             .FirstOrDefaultAsync(u => u.Id == userId);

        //         bool isAdminOrSupervisor = user?.IsAdmin == true ||
        //                                   (user?.UserRoles?.Any(ur => ur.Role?.Name == "Supervisor") ?? false);

        //         string userRole = "User";
        //         if (user?.IsAdmin == true)
        //         {
        //             userRole = "Admin";
        //         }
        //         else if (user?.UserRoles != null)
        //         {
        //             var primaryRole = user.UserRoles.FirstOrDefault(ur => ur.IsPrimary);
        //             if (primaryRole?.Role != null)
        //             {
        //                 userRole = primaryRole.Role.Name;
        //             }
        //         }

        //         var today = DateTime.UtcNow;
        //         var nepaliDate = today.ToString("yyyy-MM-dd");

        //         var response = new CreditNotePrintDTO
        //         {
        //             Company = new CompanyPrintDTO
        //             {
        //                 Id = companyEntity.Id,
        //                 DateFormat = companyEntity.DateFormat.ToString(),
        //                 FiscalYear = currentFiscalYear
        //             },
        //             CurrentFiscalYear = currentFiscalYear,
        //             CreditNote = new CreditNotePrintDataDTO
        //             {
        //                 Id = creditNote.Id,
        //                 BillNumber = creditNote.BillNumber,
        //                 Date = creditNote.Date,
        //                 NepaliDate = creditNote.NepaliDate,
        //                 TotalAmount = creditNote.TotalAmount,
        //                 Description = creditNote.Description,
        //                 Status = creditNote.Status.ToString(),
        //                 CreatedAt = creditNote.CreatedAt,
        //                 UpdatedAt = creditNote.UpdatedAt,
        //                 User = creditNote.User != null ? new UserPrintDTO
        //                 {
        //                     Id = creditNote.User.Id,
        //                     Name = creditNote.User.Name,
        //                     IsAdmin = creditNote.User.IsAdmin,
        //                     Role = creditNote.User.UserRoles?
        //                         .FirstOrDefault(ur => ur.IsPrimary)?.Role?.Name ?? "User"
        //                 } : null
        //             },
        //             DebitEntries = debitEntries,
        //             CreditEntries = creditEntries,
        //             CurrentCompanyName = currentCompany.Name ?? string.Empty,
        //             CurrentCompany = currentCompany,
        //             NepaliDate = nepaliDate,
        //             EnglishDate = today,
        //             CompanyDateFormat = companyEntity.DateFormat?.ToString().ToLower() ?? "english",
        //             User = new UserPrintDTO
        //             {
        //                 Id = userId,
        //                 Name = user?.Name ?? string.Empty,
        //                 IsAdmin = user?.IsAdmin ?? false,
        //                 Role = userRole
        //             },
        //             IsAdminOrSupervisor = isAdminOrSupervisor
        //         };

        //         _logger.LogInformation("Successfully retrieved credit note print data for Credit Note ID: {CreditNoteId} with {DebitCount} debit and {CreditCount} credit entries",
        //             id, debitEntries.Count, creditEntries.Count);

        //         return response;
        //     }
        //     catch (Exception ex)
        //     {
        //         _logger.LogError(ex, "Error getting credit note for print: {CreditNoteId}", id);
        //         throw;
        //     }
        // }
        public async Task<CreditNotePrintDTO> GetCreditNoteForPrintAsync(Guid id, Guid companyId, Guid userId, Guid fiscalYearId)
        {
            try
            {
                _logger.LogInformation("GetCreditNoteForPrintAsync called for Credit Note ID: {CreditNoteId}", id);

                var companyEntity = await _context.Companies
                    .FirstOrDefaultAsync(c => c.Id == companyId);

                if (companyEntity == null)
                    throw new ArgumentException("Company not found");

                // Determine if company uses Nepali date format
                bool isNepaliFormat = companyEntity.DateFormat?.ToString().ToLower() == "nepali";

                // Fetch credit note with entries and accounts
                var creditNote = await _context.CreditNotes
                    .Include(c => c.CreditNoteEntries)
                        .ThenInclude(e => e.Account)
                    .Include(c => c.User)
                    .FirstOrDefaultAsync(c => c.Id == id && c.CompanyId == companyId);

                if (creditNote == null)
                    throw new ArgumentException("Credit note not found");

                var entries = creditNote.CreditNoteEntries.ToList();

                // Get debit and credit entries from unified entries
                var debitEntries = entries.Where(e => e.EntryType == "Debit")
                    .OrderBy(e => e.LineNumber)
                    .Select(e => new CreditNoteEntryPrintDTO
                    {
                        Id = e.Id,
                        AccountId = e.AccountId,
                        AccountName = e.Account?.Name ?? string.Empty,
                        EntryType = e.EntryType,
                        Amount = e.Amount,
                        Description = e.Description,
                        ReferenceNumber = e.ReferenceNumber,
                        LineNumber = e.LineNumber
                    }).ToList();

                var creditEntries = entries.Where(e => e.EntryType == "Credit")
                    .OrderBy(e => e.LineNumber)
                    .Select(e => new CreditNoteEntryPrintDTO
                    {
                        Id = e.Id,
                        AccountId = e.AccountId,
                        AccountName = e.Account?.Name ?? string.Empty,
                        EntryType = e.EntryType,
                        Amount = e.Amount,
                        Description = e.Description,
                        ReferenceNumber = e.ReferenceNumber,
                        LineNumber = e.LineNumber
                    }).ToList();

                // Get fiscal year
                var currentFiscalYear = await _context.FiscalYears
                    .Where(f => f.Id == fiscalYearId && f.CompanyId == companyId)
                    .Select(f => new FiscalYearDTO
                    {
                        Id = f.Id,
                        Name = f.Name,
                        StartDate = f.StartDate,
                        EndDate = f.EndDate,
                        IsActive = f.IsActive,
                        StartDateNepali = f.StartDateNepali,
                        EndDateNepali = f.EndDateNepali
                    })
                    .FirstOrDefaultAsync();

                // Get current company for print details
                var currentCompany = new CompanyPrintInfoDTO
                {
                    Id = companyEntity.Id,
                    Name = companyEntity.Name,
                    Phone = companyEntity.Phone,
                    Pan = companyEntity.Pan,
                    Address = companyEntity.Address,
                };

                // Get user with roles
                var user = await _context.Users
                    .Include(u => u.UserRoles)
                        .ThenInclude(ur => ur.Role)
                    .FirstOrDefaultAsync(u => u.Id == userId);

                bool isAdminOrSupervisor = user?.IsAdmin == true ||
                                          (user?.UserRoles?.Any(ur => ur.Role?.Name == "Supervisor") ?? false);

                string userRole = "User";
                if (user?.IsAdmin == true)
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

                var today = DateTime.UtcNow;
                var nepaliDate = today.ToString("yyyy-MM-dd");

                var response = new CreditNotePrintDTO
                {
                    Company = new CompanyPrintDTO
                    {
                        Id = companyEntity.Id,
                        DateFormat = companyEntity.DateFormat.ToString(),
                        FiscalYear = currentFiscalYear
                    },
                    CurrentFiscalYear = currentFiscalYear,
                    CreditNote = new CreditNotePrintDataDTO
                    {
                        Id = creditNote.Id,
                        BillNumber = creditNote.BillNumber,
                        // FIX: Return the correct date based on company format
                        Date = isNepaliFormat ? creditNote.NepaliDate : creditNote.Date,
                        NepaliDate = creditNote.NepaliDate,
                        TotalAmount = creditNote.TotalAmount,
                        Description = creditNote.Description,
                        Status = creditNote.Status.ToString(),
                        CreatedAt = creditNote.CreatedAt,
                        UpdatedAt = creditNote.UpdatedAt,
                        User = creditNote.User != null ? new UserPrintDTO
                        {
                            Id = creditNote.User.Id,
                            Name = creditNote.User.Name,
                            IsAdmin = creditNote.User.IsAdmin,
                            Role = creditNote.User.UserRoles?
                                .FirstOrDefault(ur => ur.IsPrimary)?.Role?.Name ?? "User"
                        } : null
                    },
                    DebitEntries = debitEntries,
                    CreditEntries = creditEntries,
                    CurrentCompanyName = currentCompany.Name ?? string.Empty,
                    CurrentCompany = currentCompany,
                    NepaliDate = nepaliDate,
                    EnglishDate = today,
                    CompanyDateFormat = companyEntity.DateFormat?.ToString().ToLower() ?? "english",
                    User = new UserPrintDTO
                    {
                        Id = userId,
                        Name = user?.Name ?? string.Empty,
                        IsAdmin = user?.IsAdmin ?? false,
                        Role = userRole
                    },
                    IsAdminOrSupervisor = isAdminOrSupervisor
                };

                _logger.LogInformation("Successfully retrieved credit note print data for Credit Note ID: {CreditNoteId} with {DebitCount} debit and {CreditCount} credit entries",
                    id, debitEntries.Count, creditEntries.Count);

                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting credit note for print: {CreditNoteId}", id);
                throw;
            }
        }
    }
}