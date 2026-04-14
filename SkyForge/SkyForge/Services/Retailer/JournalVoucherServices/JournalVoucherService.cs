using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Dto.RetailerDto.JournalVoucherDto;
using SkyForge.Dto.AccountDto;
using SkyForge.Models.Retailer.JournalVoucherModel;
using SkyForge.Dto.RetailerDto;
using SkyForge.Services.BillNumberServices;
using SkyForge.Models.Retailer.TransactionModel;
using SkyForge.Models.AccountModel;


namespace SkyForge.Services.Retailer.JournalVoucherServices
{
    public class JournalVoucherService : IJournalVoucherService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<JournalVoucherService> _logger;

        private readonly IBillNumberService _billNumberService;

        public JournalVoucherService(
            ApplicationDbContext context,
            ILogger<JournalVoucherService> logger,
            IBillNumberService billNumberService)
        {
            _context = context;
            _logger = logger;
            _billNumberService = billNumberService;
        }

        public async Task<JournalVoucherFormDataResponseDTO> GetJournalVoucherFormDataAsync(Guid companyId, Guid fiscalYearId, Guid userId)
        {
            try
            {
                _logger.LogInformation("GetJournalVoucherFormDataAsync called for Company: {CompanyId}, User: {UserId}", companyId, userId);

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
                var nepaliDate = today.ToString("yyyy-MM-dd");

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

                // Prepare response
                var response = new JournalVoucherFormDataResponseDTO
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
                    UserPreferences = new UserPreferencesDTO
                    {
                        Theme = user?.Preferences?.Theme.ToString() ?? "light"
                    },
                    Permissions = new PermissionsDTO
                    {
                        IsAdminOrSupervisor = isAdminOrSupervisor
                    },
                    IsAdminOrSupervisor = isAdminOrSupervisor
                };

                _logger.LogInformation("Successfully fetched journal voucher form data for Company: {CompanyId}", companyId);
                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetJournalVoucherFormDataAsync for Company: {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<string> GetNextBillNumberAsync(Guid companyId, Guid fiscalYearId)
        {
            return await _billNumberService.GetNextBillNumberAsync(companyId, fiscalYearId, "journalVoucher");
        }

        public async Task<string> GetCurrentBillNumberAsync(Guid companyId, Guid fiscalYearId)
        {
            return await _billNumberService.GetCurrentBillNumberAsync(companyId, fiscalYearId, "journalVoucher");
        }

        // public async Task<JournalVoucher> CreateJournalVoucherAsync(CreateJournalVoucherDTO dto, Guid userId, Guid companyId, Guid fiscalYearId)
        // {
        //     var executionStrategy = _context.Database.CreateExecutionStrategy();

        //     return await executionStrategy.ExecuteAsync(async () =>
        //     {
        //         using var transaction = await _context.Database.BeginTransactionAsync();

        //         try
        //         {
        //             _logger.LogInformation("CreateJournalVoucherAsync started for Company: {CompanyId}, User: {UserId}", companyId, userId);

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
        //             var billNumber = await _billNumberService.GetNextBillNumberAsync(companyId, fiscalYearId, "journalVoucher");

        //             // Create Journal Voucher master record
        //             var journalVoucher = new JournalVoucher
        //             {
        //                 Id = Guid.NewGuid(),
        //                 BillNumber = billNumber,
        //                 TotalAmount = totalCredit,
        //                 Date = dto.Date,
        //                 NepaliDate = dto.NepaliDate,
        //                 Description = dto.Description,
        //                 UserId = userId,
        //                 CompanyId = companyId,
        //                 FiscalYearId = fiscalYearId,
        //                 Status = VoucherStatus.Active,
        //                 IsActive = true,
        //                 CreatedAt = DateTime.UtcNow
        //             };

        //             await _context.JournalVouchers.AddAsync(journalVoucher);

        //             // Create journal entries and transactions
        //             var transactions = new List<Transaction>();
        //             int lineNumber = 1;

        //             foreach (var entryDto in dto.Entries.OrderBy(e => e.LineNumber))
        //             {
        //                 // Create journal entry
        //                 var journalEntry = new JournalEntry
        //                 {
        //                     Id = Guid.NewGuid(),
        //                     JournalVoucherId = journalVoucher.Id,
        //                     AccountId = entryDto.AccountId,
        //                     EntryType = entryDto.EntryType,
        //                     Amount = entryDto.Amount,
        //                     Description = entryDto.Description,
        //                     LineNumber = lineNumber++,
        //                     ReferenceNumber = entryDto.ReferenceNumber,
        //                     CreatedAt = DateTime.UtcNow
        //                 };

        //                 await _context.JournalEntries.AddAsync(journalEntry);

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
        //                 decimal newBalance = entryDto.EntryType == "Debit"
        //                     ? previousBalance + entryDto.Amount
        //                     : previousBalance - entryDto.Amount;

        //                 // Get opposite entry type names for JournalAccountType field
        //                 var oppositeEntries = dto.Entries.Where(e => e.EntryType != entryDto.EntryType).ToList();
        //                 var oppositeAccountNames = string.Join(", ", oppositeEntries.Select(async e =>
        //                 {
        //                     var account = await _context.Accounts.FindAsync(e.AccountId);
        //                     return account?.Name ?? (entryDto.EntryType == "Debit" ? "Credit Note" : "Debit Note");
        //                 }).Select(t => t.Result));

        //                 // Create transaction
        //                 var transactionEntry = new Transaction
        //                 {
        //                     Id = Guid.NewGuid(),
        //                     JournalBillId = journalVoucher.Id,
        //                     AccountId = entryDto.AccountId,
        //                     Type = TransactionType.Jrnl,
        //                     JournalAccountDrCrType = entryDto.EntryType,
        //                     JournalAccountType = oppositeAccountNames.Length > 1900 ? oppositeAccountNames.Substring(0, 1897) + "..." : oppositeAccountNames,
        //                     BillNumber = billNumber,
        //                     Debit = entryDto.EntryType == "Debit" ? entryDto.Amount : 0,
        //                     Credit = entryDto.EntryType == "Credit" ? entryDto.Amount : 0,
        //                     PaymentMode = PaymentMode.Journal,
        //                     Balance = newBalance,
        //                     Date = journalVoucher.Date,
        //                     nepaliDate = journalVoucher.NepaliDate,
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

        //             _logger.LogInformation("Journal Voucher created successfully. ID: {JournalVoucherId}, BillNumber: {BillNumber}, Total: {TotalAmount}, Entries: {EntryCount}",
        //                 journalVoucher.Id, journalVoucher.BillNumber, totalCredit, dto.Entries.Count);

        //             return journalVoucher;
        //         }
        //         catch (Exception ex)
        //         {
        //             _logger.LogError(ex, "Error in CreateJournalVoucherAsync for Company: {CompanyId}", companyId);
        //             await transaction.RollbackAsync();
        //             throw;
        //         }
        //     });
        // }

        // public async Task<JournalVoucher> CreateJournalVoucherAsync(CreateJournalVoucherDTO dto, Guid userId, Guid companyId, Guid fiscalYearId)
        // {
        //     var executionStrategy = _context.Database.CreateExecutionStrategy();

        //     return await executionStrategy.ExecuteAsync(async () =>
        //     {
        //         using var transaction = await _context.Database.BeginTransactionAsync();

        //         try
        //         {
        //             _logger.LogInformation("CreateJournalVoucherAsync started for Company: {CompanyId}, User: {UserId}", companyId, userId);

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
        //             var billNumber = await _billNumberService.GetNextBillNumberAsync(companyId, fiscalYearId, "journalVoucher");

        //             // Create Journal Voucher master record
        //             var journalVoucher = new JournalVoucher
        //             {
        //                 Id = Guid.NewGuid(),
        //                 BillNumber = billNumber,
        //                 TotalAmount = totalCredit,
        //                 Date = dto.Date,
        //                 NepaliDate = dto.NepaliDate,
        //                 Description = dto.Description,
        //                 UserId = userId,
        //                 CompanyId = companyId,
        //                 FiscalYearId = fiscalYearId,
        //                 Status = VoucherStatus.Active,
        //                 IsActive = true,
        //                 CreatedAt = DateTime.UtcNow
        //             };

        //             await _context.JournalVouchers.AddAsync(journalVoucher);

        //             // Create journal entries and transactions
        //             var transactions = new List<Transaction>();
        //             int lineNumber = 1;

        //             foreach (var entryDto in dto.Entries.OrderBy(e => e.LineNumber))
        //             {
        //                 // Create journal entry
        //                 var journalEntry = new JournalEntry
        //                 {
        //                     Id = Guid.NewGuid(),
        //                     JournalVoucherId = journalVoucher.Id,
        //                     AccountId = entryDto.AccountId,
        //                     EntryType = entryDto.EntryType,
        //                     Amount = entryDto.Amount,
        //                     Description = entryDto.Description,
        //                     LineNumber = lineNumber++,
        //                     ReferenceNumber = entryDto.ReferenceNumber,
        //                     CreatedAt = DateTime.UtcNow
        //                 };

        //                 await _context.JournalEntries.AddAsync(journalEntry);

        //                 // Get opposite entry type names for JournalAccountType field
        //                 var oppositeEntries = dto.Entries.Where(e => e.EntryType != entryDto.EntryType).ToList();
        //                 var oppositeAccountNames = string.Join(", ", oppositeEntries.Select(async e =>
        //                 {
        //                     var account = await _context.Accounts.FindAsync(e.AccountId);
        //                     return account?.Name ?? (entryDto.EntryType == "Debit" ? "Credit Note" : "Debit Note");
        //                 }).Select(t => t.Result));

        //                 // Create transaction using TotalDebit/TotalCredit (updated for new model)
        //                 var transactionEntry = new Transaction
        //                 {
        //                     Id = Guid.NewGuid(),
        //                     JournalBillId = journalVoucher.Id,
        //                     AccountId = entryDto.AccountId,
        //                     Type = TransactionType.Jrnl,
        //                     JournalAccountDrCrType = entryDto.EntryType,
        //                     JournalAccountType = oppositeAccountNames.Length > 1900 ? oppositeAccountNames.Substring(0, 1897) + "..." : oppositeAccountNames,
        //                     BillNumber = billNumber,
        //                     TotalDebit = entryDto.EntryType == "Debit" ? entryDto.Amount : 0,
        //                     TotalCredit = entryDto.EntryType == "Credit" ? entryDto.Amount : 0,
        //                     PaymentMode = PaymentMode.Journal,
        //                     Date = journalVoucher.Date,
        //                     nepaliDate = journalVoucher.NepaliDate,
        //                     IsActive = true,
        //                     CompanyId = companyId,
        //                     FiscalYearId = fiscalYearId,
        //                     CreatedAt = DateTime.UtcNow,
        //                     Status = TransactionStatus.Active
        //                 };

        //                 transactions.Add(transactionEntry);
        //             }

        //             await _context.Transactions.AddRangeAsync(transactions);
        //             await _context.SaveChangesAsync();

        //             await transaction.CommitAsync();

        //             _logger.LogInformation("Journal Voucher created successfully. ID: {JournalVoucherId}, BillNumber: {BillNumber}, Total: {TotalAmount}, Entries: {EntryCount}",
        //                 journalVoucher.Id, journalVoucher.BillNumber, totalCredit, dto.Entries.Count);

        //             return journalVoucher;
        //         }
        //         catch (Exception ex)
        //         {
        //             _logger.LogError(ex, "Error in CreateJournalVoucherAsync for Company: {CompanyId}", companyId);
        //             await transaction.RollbackAsync();
        //             throw;
        //         }
        //     });
        // }

        public async Task<JournalVoucher> CreateJournalVoucherAsync(CreateJournalVoucherDTO dto, Guid userId, Guid companyId, Guid fiscalYearId)
        {
            var executionStrategy = _context.Database.CreateExecutionStrategy();

            return await executionStrategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();

                try
                {
                    _logger.LogInformation("CreateJournalVoucherAsync started for Company: {CompanyId}, User: {UserId}", companyId, userId);

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

                    // Verify all accounts exist and belong to company
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
                    var billNumber = await _billNumberService.GetNextBillNumberAsync(companyId, fiscalYearId, "journalVoucher");

                    // Create Journal Voucher master record
                    var journalVoucher = new JournalVoucher
                    {
                        Id = Guid.NewGuid(),
                        BillNumber = billNumber,
                        TotalAmount = totalCredit,
                        Date = dto.Date,
                        NepaliDate = dto.NepaliDate,
                        Description = dto.Description,
                        UserId = userId,
                        CompanyId = companyId,
                        FiscalYearId = fiscalYearId,
                        Status = VoucherStatus.Active,
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    };

                    await _context.JournalVouchers.AddAsync(journalVoucher);

                    // Create journal entries and transactions
                    var transactions = new List<Transaction>();
                    int lineNumber = 1;

                    foreach (var entryDto in dto.Entries.OrderBy(e => e.LineNumber))
                    {
                        // Create journal entry
                        var journalEntry = new JournalEntry
                        {
                            Id = Guid.NewGuid(),
                            JournalVoucherId = journalVoucher.Id,
                            AccountId = entryDto.AccountId,
                            EntryType = entryDto.EntryType,
                            Amount = entryDto.Amount,
                            Description = entryDto.Description,
                            LineNumber = lineNumber++,
                            ReferenceNumber = entryDto.ReferenceNumber,
                            CreatedAt = DateTime.UtcNow
                        };

                        await _context.JournalEntries.AddAsync(journalEntry);

                        // Get opposite entry type names for JournalAccountType field
                        var oppositeEntries = dto.Entries.Where(e => e.EntryType != entryDto.EntryType).ToList();
                        var oppositeAccountNames = string.Join(", ", oppositeEntries.Select(e =>
                        {
                            accountCache.TryGetValue(e.AccountId, out var account);
                            return account?.Name ?? (entryDto.EntryType == "Debit" ? "Credit Note" : "Debit Note");
                        }));

                        // Create transaction using TotalDebit/TotalCredit
                        var transactionEntry = new Transaction
                        {
                            Id = Guid.NewGuid(),
                            JournalBillId = journalVoucher.Id,
                            AccountId = entryDto.AccountId,
                            Type = TransactionType.Jrnl,
                            JournalAccountDrCrType = entryDto.EntryType,
                            JournalAccountType = oppositeAccountNames.Length > 1900 ? oppositeAccountNames.Substring(0, 1897) + "..." : oppositeAccountNames,
                            BillNumber = billNumber,
                            TotalDebit = entryDto.EntryType == "Debit" ? entryDto.Amount : 0,
                            TotalCredit = entryDto.EntryType == "Credit" ? entryDto.Amount : 0,
                            PaymentMode = PaymentMode.Journal,
                            Date = journalVoucher.Date,
                            nepaliDate = journalVoucher.NepaliDate,
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

                    _logger.LogInformation("Journal Voucher created successfully. ID: {JournalVoucherId}, BillNumber: {BillNumber}, Total: {TotalAmount}, Entries: {EntryCount}",
                        journalVoucher.Id, journalVoucher.BillNumber, totalCredit, dto.Entries.Count);

                    return journalVoucher;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in CreateJournalVoucherAsync for Company: {CompanyId}", companyId);
                    await transaction.RollbackAsync();
                    throw;
                }
            });
        }
        public async Task<JournalVoucherFindsDTO> GetJournalVoucherFindsAsync(Guid companyId, Guid fiscalYearId, Guid userId)
        {
            try
            {
                _logger.LogInformation("GetJournalVoucherFindsAsync called for Company: {CompanyId}, FiscalYear: {FiscalYearId}, User: {UserId}",
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

                var latestBillQuery = _context.JournalVouchers
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

                var response = new JournalVoucherFindsDTO
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

                _logger.LogInformation("Successfully retrieved journal voucher finds data for Company: {CompanyId}", companyId);
                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetJournalVoucherFindsAsync for Company: {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<BillIdResponseDTO> GetJournalBillIdByNumberAsync(string billNumber, Guid companyId, Guid fiscalYearId)
        {
            try
            {
                _logger.LogInformation($"Getting journal ID for number: {billNumber}, Company: {companyId}, FiscalYear: {fiscalYearId}");

                var journalBill = await _context.JournalVouchers
                    .Where(pb => pb.BillNumber == billNumber &&
                                pb.CompanyId == companyId &&
                                pb.FiscalYearId == fiscalYearId)
                    .Select(pb => new BillIdResponseDTO
                    {
                        Id = pb.Id,
                        BillNumber = pb.BillNumber
                    })
                    .FirstOrDefaultAsync();

                if (journalBill == null)
                {
                    _logger.LogWarning($"Journal voucher not found for number: {billNumber}");
                    throw new ArgumentException("Voucher not found");
                }

                _logger.LogInformation($"Successfully retrieved bill ID for number: {billNumber}");
                return journalBill;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting journal ID for number: {billNumber}");
                throw;
            }
        }

        public async Task<JournalVoucherEditDataDTO> GetJournalVoucherEditDataAsync(Guid journalId, Guid companyId, Guid fiscalYearId, Guid userId)
        {
            try
            {
                _logger.LogInformation("GetJournalVoucherEditDataAsync called for Journal ID: {JournalId}, Company: {CompanyId}, FiscalYear: {FiscalYearId}",
                    journalId, companyId, fiscalYearId);

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

                // Fetch journal voucher with all related data (including entries and accounts)
                var journalVoucher = await _context.JournalVouchers
                    .Include(j => j.JournalEntries)
                        .ThenInclude(e => e.Account)
                    .Include(j => j.User)
                    .FirstOrDefaultAsync(j => j.Id == journalId &&
                                              j.CompanyId == companyId &&
                                              j.FiscalYearId == fiscalYearId);

                if (journalVoucher == null)
                    throw new ArgumentException("Journal voucher not found or does not belong to the selected company/fiscal year");

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
                var journalVoucherDto = MapToJournalVoucherEditDTO(journalVoucher);
                var entriesDto = MapToJournalEntryEditDTO(journalVoucher.JournalEntries);

                var response = new JournalVoucherEditDataDTO
                {
                    Company = company,
                    JournalVoucher = journalVoucherDto,
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

                _logger.LogInformation("Successfully retrieved journal voucher edit data for Journal ID: {JournalId} with {EntryCount} entries",
                    journalId, entriesDto.Count);

                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting journal voucher edit data for Journal ID: {JournalId}", journalId);
                throw;
            }
        }

        private JournalVoucherEditDTO MapToJournalVoucherEditDTO(JournalVoucher journalVoucher)
        {
            return new JournalVoucherEditDTO
            {
                Id = journalVoucher.Id,
                BillNumber = journalVoucher.BillNumber,
                Date = journalVoucher.Date,
                NepaliDate = journalVoucher.NepaliDate,
                TotalAmount = journalVoucher.TotalAmount,
                Description = journalVoucher.Description,
                UserName = journalVoucher.User?.Name ?? string.Empty,
                UserEmail = journalVoucher.User?.Email ?? string.Empty,
                Status = journalVoucher.Status.ToString(),
                CreatedAt = journalVoucher.CreatedAt,
                UpdatedAt = journalVoucher.UpdatedAt
            };
        }

        private List<JournalEntryEditDTO> MapToJournalEntryEditDTO(ICollection<JournalEntry> entries)
        {
            return entries.OrderBy(e => e.LineNumber).Select(e => new JournalEntryEditDTO
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

        // public async Task<JournalVoucher> UpdateJournalVoucherAsync(Guid id, UpdateJournalVoucherDTO dto, Guid companyId, Guid fiscalYearId, Guid userId)
        // {
        //     var executionStrategy = _context.Database.CreateExecutionStrategy();

        //     return await executionStrategy.ExecuteAsync(async () =>
        //     {
        //         using var transaction = await _context.Database.BeginTransactionAsync();

        //         try
        //         {
        //             _logger.LogInformation("=== Starting UpdateJournalVoucherAsync for Journal ID: {JournalId} ===", id);

        //             // Validate entries
        //             if (dto.Entries == null || dto.Entries.Count < 2)
        //                 throw new ArgumentException("At least 2 entries required (one debit and one credit)");

        //             decimal totalDebit = dto.Entries.Where(e => e.EntryType == "Debit").Sum(e => e.Amount);
        //             decimal totalCredit = dto.Entries.Where(e => e.EntryType == "Credit").Sum(e => e.Amount);

        //             if (totalDebit != totalCredit)
        //                 throw new ArgumentException($"Total Debit ({totalDebit}) must equal Total Credit ({totalCredit})");

        //             // Find existing journal voucher
        //             var existingJournal = await _context.JournalVouchers
        //                 .Include(j => j.JournalEntries)
        //                 .FirstOrDefaultAsync(j => j.Id == id && j.CompanyId == companyId);

        //             if (existingJournal == null)
        //                 throw new ArgumentException("Journal voucher not found");

        //             // Check if voucher is canceled
        //             if (existingJournal.Status == VoucherStatus.Canceled)
        //                 throw new ArgumentException("Cannot update a canceled journal voucher");

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

        //             // Delete existing transactions associated with this journal voucher
        //             var existingTransactions = await _context.Transactions
        //                 .Where(t => t.JournalBillId == id)
        //                 .ToListAsync();

        //             if (existingTransactions.Any())
        //             {
        //                 _context.Transactions.RemoveRange(existingTransactions);
        //                 _logger.LogInformation("Deleted {Count} existing transactions", existingTransactions.Count);
        //             }

        //             // Delete existing journal entries
        //             if (existingJournal.JournalEntries.Any())
        //             {
        //                 _context.JournalEntries.RemoveRange(existingJournal.JournalEntries);
        //                 _logger.LogInformation("Deleted {Count} existing entries", existingJournal.JournalEntries.Count);
        //             }

        //             await _context.SaveChangesAsync();

        //             // Update journal voucher properties
        //             existingJournal.TotalAmount = totalDebit;
        //             existingJournal.Description = dto.Description;
        //             existingJournal.NepaliDate = dto.NepaliDate;
        //             existingJournal.Date = dto.Date;
        //             existingJournal.UpdatedAt = DateTime.UtcNow;

        //             _context.JournalVouchers.Update(existingJournal);
        //             await _context.SaveChangesAsync();

        //             // Create new entries and transactions
        //             var newEntries = new List<JournalEntry>();
        //             var newTransactions = new List<Transaction>();
        //             int lineNumber = 1;

        //             foreach (var entryDto in dto.Entries.OrderBy(e => e.LineNumber))
        //             {
        //                 var journalEntry = new JournalEntry
        //                 {
        //                     Id = Guid.NewGuid(),
        //                     JournalVoucherId = existingJournal.Id,
        //                     AccountId = entryDto.AccountId,
        //                     EntryType = entryDto.EntryType,
        //                     Amount = entryDto.Amount,
        //                     Description = entryDto.Description,
        //                     LineNumber = lineNumber++,
        //                     ReferenceNumber = entryDto.ReferenceNumber,
        //                     CreatedAt = DateTime.UtcNow
        //                 };

        //                 newEntries.Add(journalEntry);

        //                 // Get previous balance for account
        //                 decimal previousBalance = 0;
        //                 var lastTransaction = await _context.Transactions
        //                     .Where(t => t.AccountId == entryDto.AccountId && t.CompanyId == companyId)
        //                     .OrderByDescending(t => t.CreatedAt)
        //                     .FirstOrDefaultAsync();

        //                 if (lastTransaction != null)
        //                     previousBalance = lastTransaction.Balance ?? 0;

        //                 // Calculate new balance
        //                 decimal newBalance = entryDto.EntryType == "Debit"
        //                     ? previousBalance + entryDto.Amount
        //                     : previousBalance - entryDto.Amount;

        //                 // Get opposite entry type names for JournalAccountType field
        //                 var oppositeEntries = dto.Entries.Where(e => e.EntryType != entryDto.EntryType).ToList();
        //                 var oppositeAccountNames = string.Join(", ", oppositeEntries.Select(async e =>
        //                 {
        //                     var account = await _context.Accounts.FindAsync(e.AccountId);
        //                     return account?.Name ?? (entryDto.EntryType == "Debit" ? "Credit Note" : "Debit Note");
        //                 }).Select(t => t.Result));

        //                 // Truncate if too long (max 2000 characters for SQL Server)
        //                 if (oppositeAccountNames.Length > 1900)
        //                     oppositeAccountNames = oppositeAccountNames.Substring(0, 1897) + "...";

        //                 // Create transaction
        //                 var journalTransaction = new Transaction
        //                 {
        //                     Id = Guid.NewGuid(),
        //                     JournalBillId = existingJournal.Id,
        //                     AccountId = entryDto.AccountId,
        //                     Type = TransactionType.Jrnl,
        //                     JournalAccountDrCrType = entryDto.EntryType,
        //                     JournalAccountType = oppositeAccountNames,
        //                     BillNumber = existingJournal.BillNumber,
        //                     Debit = entryDto.EntryType == "Debit" ? entryDto.Amount : 0,
        //                     Credit = entryDto.EntryType == "Credit" ? entryDto.Amount : 0,
        //                     PaymentMode = PaymentMode.Journal,
        //                     Balance = newBalance,
        //                     Date = existingJournal.Date,
        //                     nepaliDate = existingJournal.NepaliDate,
        //                     IsActive = true,
        //                     CompanyId = companyId,
        //                     FiscalYearId = fiscalYearId,
        //                     CreatedAt = DateTime.UtcNow
        //                 };

        //                 newTransactions.Add(journalTransaction);
        //             }

        //             await _context.JournalEntries.AddRangeAsync(newEntries);
        //             await _context.Transactions.AddRangeAsync(newTransactions);

        //             var saveResult = await _context.SaveChangesAsync();
        //             _logger.LogInformation("SaveChangesAsync completed. {RowCount} rows affected.", saveResult);

        //             await transaction.CommitAsync();
        //             _logger.LogInformation("Transaction committed successfully");

        //             _logger.LogInformation("=== Successfully updated journal voucher: {JournalId} with {EntryCount} entries ===",
        //                 id, newEntries.Count);

        //             // Return the updated journal with entries
        //             var updatedJournal = await _context.JournalVouchers
        //                 .Include(j => j.JournalEntries)
        //                     .ThenInclude(e => e.Account)
        //                 .FirstOrDefaultAsync(j => j.Id == id);

        //             return updatedJournal ?? existingJournal;
        //         }
        //         catch (Exception ex)
        //         {
        //             _logger.LogError(ex, "Error updating journal voucher: {JournalId}", id);
        //             await transaction.RollbackAsync();
        //             throw;
        //         }
        //     });
        // }

        // public async Task<JournalVoucher> UpdateJournalVoucherAsync(Guid id, UpdateJournalVoucherDTO dto, Guid companyId, Guid fiscalYearId, Guid userId)
        // {
        //     var executionStrategy = _context.Database.CreateExecutionStrategy();

        //     return await executionStrategy.ExecuteAsync(async () =>
        //     {
        //         using var transaction = await _context.Database.BeginTransactionAsync();

        //         try
        //         {
        //             _logger.LogInformation("=== Starting UpdateJournalVoucherAsync for Journal ID: {JournalId} ===", id);

        //             // Validate entries
        //             if (dto.Entries == null || dto.Entries.Count < 2)
        //                 throw new ArgumentException("At least 2 entries required (one debit and one credit)");

        //             decimal totalDebit = dto.Entries.Where(e => e.EntryType == "Debit").Sum(e => e.Amount);
        //             decimal totalCredit = dto.Entries.Where(e => e.EntryType == "Credit").Sum(e => e.Amount);

        //             if (totalDebit != totalCredit)
        //                 throw new ArgumentException($"Total Debit ({totalDebit}) must equal Total Credit ({totalCredit})");

        //             // Find existing journal voucher
        //             var existingJournal = await _context.JournalVouchers
        //                 .Include(j => j.JournalEntries)
        //                 .FirstOrDefaultAsync(j => j.Id == id && j.CompanyId == companyId);

        //             if (existingJournal == null)
        //                 throw new ArgumentException("Journal voucher not found");

        //             // Check if voucher is canceled
        //             if (existingJournal.Status == VoucherStatus.Canceled)
        //                 throw new ArgumentException("Cannot update a canceled journal voucher");

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

        //             // Delete existing transactions associated with this journal voucher
        //             var existingTransactions = await _context.Transactions
        //                 .Where(t => t.JournalBillId == id)
        //                 .ToListAsync();

        //             if (existingTransactions.Any())
        //             {
        //                 _context.Transactions.RemoveRange(existingTransactions);
        //                 _logger.LogInformation("Deleted {Count} existing transactions", existingTransactions.Count);
        //             }

        //             // Delete existing journal entries
        //             if (existingJournal.JournalEntries.Any())
        //             {
        //                 _context.JournalEntries.RemoveRange(existingJournal.JournalEntries);
        //                 _logger.LogInformation("Deleted {Count} existing entries", existingJournal.JournalEntries.Count);
        //             }

        //             await _context.SaveChangesAsync();

        //             // Update journal voucher properties
        //             existingJournal.TotalAmount = totalDebit;
        //             existingJournal.Description = dto.Description;
        //             existingJournal.NepaliDate = dto.NepaliDate;
        //             existingJournal.Date = dto.Date;
        //             existingJournal.UpdatedAt = DateTime.UtcNow;

        //             _context.JournalVouchers.Update(existingJournal);
        //             await _context.SaveChangesAsync();

        //             // Create new entries and transactions
        //             var newEntries = new List<JournalEntry>();
        //             var newTransactions = new List<Transaction>();
        //             int lineNumber = 1;

        //             foreach (var entryDto in dto.Entries.OrderBy(e => e.LineNumber))
        //             {
        //                 var journalEntry = new JournalEntry
        //                 {
        //                     Id = Guid.NewGuid(),
        //                     JournalVoucherId = existingJournal.Id,
        //                     AccountId = entryDto.AccountId,
        //                     EntryType = entryDto.EntryType,
        //                     Amount = entryDto.Amount,
        //                     Description = entryDto.Description,
        //                     LineNumber = lineNumber++,
        //                     ReferenceNumber = entryDto.ReferenceNumber,
        //                     CreatedAt = DateTime.UtcNow
        //                 };

        //                 newEntries.Add(journalEntry);

        //                 // Get previous balance for account (keeping original logic)
        //                 decimal previousBalance = 0;
        //                 var lastTransaction = await _context.Transactions
        //                     .Where(t => t.AccountId == entryDto.AccountId && t.CompanyId == companyId)
        //                     .OrderByDescending(t => t.CreatedAt)
        //                     .FirstOrDefaultAsync();

        //                 // if (lastTransaction != null)
        //                 //     previousBalance = lastTransaction.Balance ?? 0;

        //                 // Calculate new balance (keeping original logic)
        //                 decimal newBalance = entryDto.EntryType == "Debit"
        //                     ? previousBalance + entryDto.Amount
        //                     : previousBalance - entryDto.Amount;

        //                 // Get opposite entry type names for JournalAccountType field
        //                 var oppositeEntries = dto.Entries.Where(e => e.EntryType != entryDto.EntryType).ToList();
        //                 var oppositeAccountNames = string.Join(", ", oppositeEntries.Select(async e =>
        //                 {
        //                     var account = await _context.Accounts.FindAsync(e.AccountId);
        //                     return account?.Name ?? (entryDto.EntryType == "Debit" ? "Credit Note" : "Debit Note");
        //                 }).Select(t => t.Result));

        //                 // Truncate if too long (max 2000 characters for SQL Server)
        //                 if (oppositeAccountNames.Length > 1900)
        //                     oppositeAccountNames = oppositeAccountNames.Substring(0, 1897) + "...";

        //                 // Create transaction - ONLY CHANGED: Debit/Credit to TotalDebit/TotalCredit
        //                 var journalTransaction = new Transaction
        //                 {
        //                     Id = Guid.NewGuid(),
        //                     JournalBillId = existingJournal.Id,
        //                     AccountId = entryDto.AccountId,
        //                     Type = TransactionType.Jrnl,
        //                     JournalAccountDrCrType = entryDto.EntryType,
        //                     JournalAccountType = oppositeAccountNames,
        //                     BillNumber = existingJournal.BillNumber,
        //                     TotalDebit = entryDto.EntryType == "Debit" ? entryDto.Amount : 0,
        //                     TotalCredit = entryDto.EntryType == "Credit" ? entryDto.Amount : 0,
        //                     PaymentMode = PaymentMode.Journal,
        //                     // Balance = newBalance,
        //                     Date = existingJournal.Date,
        //                     nepaliDate = existingJournal.NepaliDate,
        //                     IsActive = true,
        //                     CompanyId = companyId,
        //                     FiscalYearId = fiscalYearId,
        //                     CreatedAt = DateTime.UtcNow,
        //                     Status = TransactionStatus.Active
        //                 };

        //                 newTransactions.Add(journalTransaction);
        //             }

        //             await _context.JournalEntries.AddRangeAsync(newEntries);
        //             await _context.Transactions.AddRangeAsync(newTransactions);

        //             var saveResult = await _context.SaveChangesAsync();
        //             _logger.LogInformation("SaveChangesAsync completed. {RowCount} rows affected.", saveResult);

        //             await transaction.CommitAsync();
        //             _logger.LogInformation("Transaction committed successfully");

        //             _logger.LogInformation("=== Successfully updated journal voucher: {JournalId} with {EntryCount} entries ===",
        //                 id, newEntries.Count);

        //             // Return the updated journal with entries
        //             var updatedJournal = await _context.JournalVouchers
        //                 .Include(j => j.JournalEntries)
        //                     .ThenInclude(e => e.Account)
        //                 .FirstOrDefaultAsync(j => j.Id == id);

        //             return updatedJournal ?? existingJournal;
        //         }
        //         catch (Exception ex)
        //         {
        //             _logger.LogError(ex, "Error updating journal voucher: {JournalId}", id);
        //             await transaction.RollbackAsync();
        //             throw;
        //         }
        //     });
        // }


        public async Task<JournalVoucher> UpdateJournalVoucherAsync(Guid id, UpdateJournalVoucherDTO dto, Guid companyId, Guid fiscalYearId, Guid userId)
        {
            var executionStrategy = _context.Database.CreateExecutionStrategy();

            return await executionStrategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();

                try
                {
                    _logger.LogInformation("=== Starting UpdateJournalVoucherAsync for Journal ID: {JournalId} ===", id);

                    // Validate entries
                    if (dto.Entries == null || dto.Entries.Count < 2)
                        throw new ArgumentException("At least 2 entries required (one debit and one credit)");

                    decimal totalDebit = dto.Entries.Where(e => e.EntryType == "Debit").Sum(e => e.Amount);
                    decimal totalCredit = dto.Entries.Where(e => e.EntryType == "Credit").Sum(e => e.Amount);

                    if (totalDebit != totalCredit)
                        throw new ArgumentException($"Total Debit ({totalDebit}) must equal Total Credit ({totalCredit})");

                    // Find existing journal voucher
                    var existingJournal = await _context.JournalVouchers
                        .Include(j => j.JournalEntries)
                        .FirstOrDefaultAsync(j => j.Id == id && j.CompanyId == companyId);

                    if (existingJournal == null)
                        throw new ArgumentException("Journal voucher not found");

                    // Check if voucher is canceled
                    if (existingJournal.Status == VoucherStatus.Canceled)
                        throw new ArgumentException("Cannot update a canceled journal voucher");

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

                    // Delete existing transactions AND their transaction items associated with this journal voucher
                    var existingTransactions = await _context.Transactions
                        .Where(t => t.JournalBillId == id)
                        .Include(t => t.TransactionItems) // Include transaction items for cascade delete
                        .ToListAsync();

                    if (existingTransactions.Any())
                    {
                        // TransactionItems will be deleted automatically due to Cascade delete
                        _context.Transactions.RemoveRange(existingTransactions);
                        _logger.LogInformation("Deleted {Count} existing transactions with their items", existingTransactions.Count);
                    }

                    // Delete existing journal entries
                    if (existingJournal.JournalEntries.Any())
                    {
                        _context.JournalEntries.RemoveRange(existingJournal.JournalEntries);
                        _logger.LogInformation("Deleted {Count} existing entries", existingJournal.JournalEntries.Count);
                    }

                    await _context.SaveChangesAsync();

                    // Update journal voucher properties
                    existingJournal.TotalAmount = totalDebit;
                    existingJournal.Description = dto.Description;
                    existingJournal.NepaliDate = dto.NepaliDate;
                    existingJournal.Date = dto.Date;
                    existingJournal.UpdatedAt = DateTime.UtcNow;

                    _context.JournalVouchers.Update(existingJournal);
                    await _context.SaveChangesAsync();

                    // Create new entries and transactions
                    var newEntries = new List<JournalEntry>();
                    var newTransactions = new List<Transaction>();
                    int lineNumber = 1;

                    foreach (var entryDto in dto.Entries.OrderBy(e => e.LineNumber))
                    {
                        var journalEntry = new JournalEntry
                        {
                            Id = Guid.NewGuid(),
                            JournalVoucherId = existingJournal.Id,
                            AccountId = entryDto.AccountId,
                            EntryType = entryDto.EntryType,
                            Amount = entryDto.Amount,
                            Description = entryDto.Description,
                            LineNumber = lineNumber++,
                            ReferenceNumber = entryDto.ReferenceNumber,
                            CreatedAt = DateTime.UtcNow
                        };

                        newEntries.Add(journalEntry);

                        // Get opposite entry type names for JournalAccountType field using cached accounts
                        var oppositeEntries = dto.Entries.Where(e => e.EntryType != entryDto.EntryType).ToList();
                        var oppositeAccountNames = string.Join(", ", oppositeEntries.Select(e =>
                        {
                            accountCache.TryGetValue(e.AccountId, out var account);
                            return account?.Name ?? (entryDto.EntryType == "Debit" ? "Credit Note" : "Debit Note");
                        }));

                        // Truncate if too long (max 2000 characters for SQL Server)
                        if (oppositeAccountNames.Length > 1900)
                            oppositeAccountNames = oppositeAccountNames.Substring(0, 1897) + "...";

                        // Create transaction using TotalDebit/TotalCredit (updated for new model)
                        var journalTransaction = new Transaction
                        {
                            Id = Guid.NewGuid(),
                            JournalBillId = existingJournal.Id,
                            AccountId = entryDto.AccountId,
                            Type = TransactionType.Jrnl,
                            JournalAccountDrCrType = entryDto.EntryType,
                            JournalAccountType = oppositeAccountNames,
                            BillNumber = existingJournal.BillNumber,
                            TotalDebit = entryDto.EntryType == "Debit" ? entryDto.Amount : 0,
                            TotalCredit = entryDto.EntryType == "Credit" ? entryDto.Amount : 0,
                            PaymentMode = PaymentMode.Journal,
                            Date = existingJournal.Date,
                            nepaliDate = existingJournal.NepaliDate,
                            IsActive = true,
                            CompanyId = companyId,
                            FiscalYearId = fiscalYearId,
                            CreatedAt = DateTime.UtcNow,
                            Status = TransactionStatus.Active
                        };

                        newTransactions.Add(journalTransaction);
                    }

                    await _context.JournalEntries.AddRangeAsync(newEntries);
                    await _context.Transactions.AddRangeAsync(newTransactions);

                    var saveResult = await _context.SaveChangesAsync();
                    _logger.LogInformation("SaveChangesAsync completed. {RowCount} rows affected.", saveResult);

                    await transaction.CommitAsync();
                    _logger.LogInformation("Transaction committed successfully");

                    _logger.LogInformation("=== Successfully updated journal voucher: {JournalId} with {EntryCount} entries ===",
                        id, newEntries.Count);

                    // Return the updated journal with entries
                    var updatedJournal = await _context.JournalVouchers
                        .Include(j => j.JournalEntries)
                            .ThenInclude(e => e.Account)
                        .FirstOrDefaultAsync(j => j.Id == id);

                    return updatedJournal ?? existingJournal;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error updating journal voucher: {JournalId}", id);
                    await transaction.RollbackAsync();
                    throw;
                }
            });
        }
        public async Task<JournalVoucherRegisterDataDTO> GetJournalVouchersRegisterAsync(Guid companyId, Guid fiscalYearId, string? fromDate = null, string? toDate = null)
        {
            try
            {
                _logger.LogInformation("GetJournalVouchersRegisterAsync called with companyId: {CompanyId}, fiscalYearId: {FiscalYearId}, fromDate: {FromDate}, toDate: {ToDate}",
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

                // If no date range provided, return basic info with empty journal vouchers
                if (string.IsNullOrEmpty(fromDate) || string.IsNullOrEmpty(toDate))
                {
                    _logger.LogInformation("No date range provided, returning basic info with empty journal vouchers list");
                    return new JournalVoucherRegisterDataDTO
                    {
                        Company = company,
                        CurrentFiscalYear = fiscalYear,
                        JournalVouchers = new List<JournalVoucherResponseItemDTO>(),
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

                _logger.LogInformation("Searching for journal vouchers between {StartDate} and {EndDate} using {DateFormat} format",
                    startDateTime, endDateTime, isNepaliFormat ? "Nepali" : "English");

                var query = _context.JournalVouchers
                    .Include(j => j.JournalEntries)
                        .ThenInclude(e => e.Account)
                    .Include(j => j.User)
                    .Where(j => j.CompanyId == companyId && j.FiscalYearId == fiscalYearId);

                if (isNepaliFormat)
                {
                    query = query.Where(j => j.NepaliDate >= startDateTime && j.NepaliDate <= endDateTime);
                    _logger.LogInformation("Using NepaliDate field for filtering");
                }
                else
                {
                    query = query.Where(j => j.Date >= startDateTime && j.Date <= endDateTime);
                    _logger.LogInformation("Using Date field for filtering");
                }

                var journalVouchers = await query
                    .OrderBy(j => j.Date)
                    .ThenBy(j => j.BillNumber)
                    .ToListAsync();

                _logger.LogInformation("Found {Count} journal vouchers matching the criteria", journalVouchers.Count);

                var journalVoucherDtos = journalVouchers.Select(journal => MapToResponseItemDTO(journal, company.DateFormat)).ToList();

                return new JournalVoucherRegisterDataDTO
                {
                    Company = company,
                    CurrentFiscalYear = fiscalYear,
                    JournalVouchers = journalVoucherDtos,
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
                _logger.LogError(ex, "Error getting journal vouchers register for company {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<JournalVoucherEntryDataDTO> GetJournalVoucherEntryDataAsync(Guid companyId, Guid fiscalYearId, Guid userId)
        {
            try
            {
                _logger.LogInformation("GetJournalVoucherEntryDataAsync called with companyId: {CompanyId}, fiscalYearId: {FiscalYearId}, userId: {UserId}",
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

                var data = new JournalVoucherEntryDataDTO
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

                _logger.LogInformation("Successfully retrieved journal voucher entry data for company {CompanyId}", companyId);
                return data;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting journal voucher entry data for company {CompanyId}", companyId);
                throw;
            }
        }

        private JournalVoucherResponseItemDTO MapToResponseItemDTO(JournalVoucher journal, string companyDateFormat)
        {
            bool isNepaliFormat = companyDateFormat?.ToLower() == "nepali";

            var entries = journal.JournalEntries?.ToList() ?? new List<JournalEntry>();

            var debitEntries = entries.Where(e => e.EntryType == "Debit").ToList();
            var creditEntries = entries.Where(e => e.EntryType == "Credit").ToList();

            var debitAccountNames = debitEntries.Select(e => e.Account?.Name ?? string.Empty).ToList();
            var creditAccountNames = creditEntries.Select(e => e.Account?.Name ?? string.Empty).ToList();

            var debitAmounts = debitEntries.Select(e => e.Amount).ToList();
            var creditAmounts = creditEntries.Select(e => e.Amount).ToList();

            return new JournalVoucherResponseItemDTO
            {
                Id = journal.Id,
                BillNumber = journal.BillNumber,
                Date = isNepaliFormat ? journal.NepaliDate : journal.Date,
                NepaliDate = journal.NepaliDate,
                Description = journal.Description ?? string.Empty,
                TotalAmount = journal.TotalAmount,
                UserName = journal.User?.Name ?? string.Empty,
                Status = journal.Status.ToString(),
                CreatedAt = journal.CreatedAt,
                DebitAccountNames = debitAccountNames,
                CreditAccountNames = creditAccountNames,
                DebitAmounts = debitAmounts,
                CreditAmounts = creditAmounts
            };
        }

        // public async Task<JournalVoucherPrintDTO> GetJournalVoucherForPrintAsync(Guid id, Guid companyId, Guid userId, Guid fiscalYearId)
        // {
        //     try
        //     {
        //         _logger.LogInformation("GetJournalVoucherForPrintAsync called for Journal ID: {JournalId}", id);

        //         var companyEntity = await _context.Companies
        //             .FirstOrDefaultAsync(c => c.Id == companyId);

        //         if (companyEntity == null)
        //             throw new ArgumentException("Company not found");

        //         var journalVoucher = await _context.JournalVouchers
        //             .Include(j => j.JournalEntries)
        //                 .ThenInclude(e => e.Account)
        //             .Include(j => j.User)
        //             .FirstOrDefaultAsync(j => j.Id == id && j.CompanyId == companyId);

        //         if (journalVoucher == null)
        //             throw new ArgumentException("Journal voucher not found");

        //         var entries = journalVoucher.JournalEntries.ToList();
        //         var debitEntries = entries.Where(e => e.EntryType == "Debit")
        //             .OrderBy(e => e.LineNumber)
        //             .ToList();
        //         var creditEntries = entries.Where(e => e.EntryType == "Credit")
        //             .OrderBy(e => e.LineNumber)
        //             .ToList();

        //         var currentFiscalYear = await _context.FiscalYears
        //             .Where(f => f.Id == fiscalYearId && f.CompanyId == companyId)
        //             .Select(f => new FiscalYearDTO
        //             {
        //                 Id = f.Id,
        //                 Name = f.Name,
        //                 StartDate = f.StartDate,
        //                 EndDate = f.EndDate,
        //                 IsActive = f.IsActive
        //             })
        //             .FirstOrDefaultAsync();

        //         var currentCompany = new CompanyPrintInfoDTO
        //         {
        //             Id = companyEntity.Id,
        //             Name = companyEntity.Name,
        //             Phone = companyEntity.Phone,
        //             Pan = companyEntity.Pan,
        //             Address = companyEntity.Address,
        //         };

        //         var user = await _context.Users
        //             .Include(u => u.UserRoles)
        //                 .ThenInclude(ur => ur.Role)
        //             .FirstOrDefaultAsync(u => u.Id == userId);

        //         bool isAdminOrSupervisor = user?.IsAdmin == true ||
        //                                   (user?.UserRoles?.Any(ur => ur.Role?.Name == "Supervisor") ?? false);

        //         var response = new JournalVoucherPrintDTO
        //         {
        //             Company = new CompanyPrintDTO
        //             {
        //                 Id = companyEntity.Id,
        //                 DateFormat = companyEntity.DateFormat.ToString(),
        //                 FiscalYear = null
        //             },
        //             CurrentFiscalYear = currentFiscalYear,
        //             JournalVoucher = new JournalVoucherPrintDataDTO
        //             {
        //                 Id = journalVoucher.Id,
        //                 BillNumber = journalVoucher.BillNumber,
        //                 Date = journalVoucher.Date,
        //                 NepaliDate = journalVoucher.NepaliDate,
        //                 TotalAmount = journalVoucher.TotalAmount,
        //                 Description = journalVoucher.Description,
        //                 Status = journalVoucher.Status.ToString(),
        //                 CreatedAt = journalVoucher.CreatedAt,
        //                 UpdatedAt = journalVoucher.UpdatedAt,
        //                 User = journalVoucher.User != null ? new UserPrintDTO
        //                 {
        //                     Id = journalVoucher.User.Id,
        //                     Name = journalVoucher.User.Name,
        //                     Role = journalVoucher.User.UserRoles?
        //                         .FirstOrDefault(ur => ur.IsPrimary)?.Role?.Name ?? "User"
        //                 } : null
        //             },
        //             DebitEntries = debitEntries.Select(e => new JournalEntryPrintDTO
        //             {
        //                 Id = e.Id,
        //                 AccountId = e.AccountId,
        //                 AccountName = e.Account?.Name ?? string.Empty,
        //                 EntryType = e.EntryType,
        //                 Amount = e.Amount,
        //                 Description = e.Description,
        //                 ReferenceNumber = e.ReferenceNumber,
        //                 LineNumber = e.LineNumber
        //             }).ToList(),
        //             CreditEntries = creditEntries.Select(e => new JournalEntryPrintDTO
        //             {
        //                 Id = e.Id,
        //                 AccountId = e.AccountId,
        //                 AccountName = e.Account?.Name ?? string.Empty,
        //                 EntryType = e.EntryType,
        //                 Amount = e.Amount,
        //                 Description = e.Description,
        //                 ReferenceNumber = e.ReferenceNumber,
        //                 LineNumber = e.LineNumber
        //             }).ToList(),
        //             CurrentCompanyName = currentCompany.Name ?? string.Empty,
        //             CurrentCompany = currentCompany,
        //             NepaliDate = DateTime.UtcNow.ToString("yyyy-MM-dd"),
        //             EnglishDate = DateTime.UtcNow,
        //             CompanyDateFormat = companyEntity.DateFormat?.ToString().ToLower() ?? "english",
        //             User = new UserPrintDTO
        //             {
        //                 Id = userId,
        //                 Name = user?.Name ?? string.Empty,
        //                 IsAdmin = user?.IsAdmin ?? false,
        //                 Role = user?.UserRoles?.FirstOrDefault(ur => ur.IsPrimary)?.Role?.Name ?? "User"
        //             },
        //             IsAdminOrSupervisor = isAdminOrSupervisor
        //         };

        //         _logger.LogInformation("Successfully retrieved journal voucher print data for Journal ID: {JournalId} with {DebitCount} debit and {CreditCount} credit entries",
        //             id, debitEntries.Count, creditEntries.Count);

        //         return response;
        //     }
        //     catch (Exception ex)
        //     {
        //         _logger.LogError(ex, "Error getting journal voucher for print: {JournalId}", id);
        //         throw;
        //     }
        // }

        public async Task<JournalVoucherPrintDTO> GetJournalVoucherForPrintAsync(Guid id, Guid companyId, Guid userId, Guid fiscalYearId)
        {
            try
            {
                _logger.LogInformation("GetJournalVoucherForPrintAsync called for Journal ID: {JournalId}", id);

                var companyEntity = await _context.Companies
                    .FirstOrDefaultAsync(c => c.Id == companyId);

                if (companyEntity == null)
                    throw new ArgumentException("Company not found");

                // Determine if company uses Nepali date format
                bool isNepaliFormat = companyEntity.DateFormat?.ToString().ToLower() == "nepali";

                var journalVoucher = await _context.JournalVouchers
                    .Include(j => j.JournalEntries)
                        .ThenInclude(e => e.Account)
                    .Include(j => j.User)
                    .FirstOrDefaultAsync(j => j.Id == id && j.CompanyId == companyId);

                if (journalVoucher == null)
                    throw new ArgumentException("Journal voucher not found");

                var entries = journalVoucher.JournalEntries.ToList();
                var debitEntries = entries.Where(e => e.EntryType == "Debit")
                    .OrderBy(e => e.LineNumber)
                    .ToList();
                var creditEntries = entries.Where(e => e.EntryType == "Credit")
                    .OrderBy(e => e.LineNumber)
                    .ToList();

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

                var currentCompany = new CompanyPrintInfoDTO
                {
                    Id = companyEntity.Id,
                    Name = companyEntity.Name,
                    Phone = companyEntity.Phone,
                    Pan = companyEntity.Pan,
                    Address = companyEntity.Address,
                };

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

                var response = new JournalVoucherPrintDTO
                {
                    Company = new CompanyPrintDTO
                    {
                        Id = companyEntity.Id,
                        DateFormat = companyEntity.DateFormat.ToString(),
                        FiscalYear = currentFiscalYear
                    },
                    CurrentFiscalYear = currentFiscalYear,
                    JournalVoucher = new JournalVoucherPrintDataDTO
                    {
                        Id = journalVoucher.Id,
                        BillNumber = journalVoucher.BillNumber,
                        // FIX: Return the correct date based on company format
                        Date = isNepaliFormat ? journalVoucher.NepaliDate : journalVoucher.Date,
                        NepaliDate = journalVoucher.NepaliDate,
                        TotalAmount = journalVoucher.TotalAmount,
                        Description = journalVoucher.Description,
                        Status = journalVoucher.Status.ToString(),
                        CreatedAt = journalVoucher.CreatedAt,
                        UpdatedAt = journalVoucher.UpdatedAt,
                        User = journalVoucher.User != null ? new UserPrintDTO
                        {
                            Id = journalVoucher.User.Id,
                            Name = journalVoucher.User.Name,
                            IsAdmin = journalVoucher.User.IsAdmin,
                            Role = journalVoucher.User.UserRoles?
                                .FirstOrDefault(ur => ur.IsPrimary)?.Role?.Name ?? "User"
                        } : null
                    },
                    DebitEntries = debitEntries.Select(e => new JournalEntryPrintDTO
                    {
                        Id = e.Id,
                        AccountId = e.AccountId,
                        AccountName = e.Account?.Name ?? string.Empty,
                        EntryType = e.EntryType,
                        Amount = e.Amount,
                        Description = e.Description,
                        ReferenceNumber = e.ReferenceNumber,
                        LineNumber = e.LineNumber
                    }).ToList(),
                    CreditEntries = creditEntries.Select(e => new JournalEntryPrintDTO
                    {
                        Id = e.Id,
                        AccountId = e.AccountId,
                        AccountName = e.Account?.Name ?? string.Empty,
                        EntryType = e.EntryType,
                        Amount = e.Amount,
                        Description = e.Description,
                        ReferenceNumber = e.ReferenceNumber,
                        LineNumber = e.LineNumber
                    }).ToList(),
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

                _logger.LogInformation("Successfully retrieved journal voucher print data for Journal ID: {JournalId} with {DebitCount} debit and {CreditCount} credit entries",
                    id, debitEntries.Count, creditEntries.Count);

                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting journal voucher for print: {JournalId}", id);
                throw;
            }
        }
    }
}