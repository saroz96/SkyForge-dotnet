using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Dto.RetailerDto.PaymentDto;
using SkyForge.Dto.AccountDto;
using SkyForge.Models.Retailer.PaymentModel;
using SkyForge.Services.BillNumberServices;
using SkyForge.Models.Retailer.TransactionModel;
using SkyForge.Dto.RetailerDto;
using SkyForge.Models.AccountModel;

namespace SkyForge.Services.Retailer.PaymentServices
{
    public class PaymentService : IPaymentService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<PaymentService> _logger;
        private readonly IBillNumberService _billNumberService;

        public PaymentService(
            ApplicationDbContext context,
            ILogger<PaymentService> logger,
            IBillNumberService billNumberService)
        {
            _context = context;
            _logger = logger;
            _billNumberService = billNumberService;
        }

        public async Task<PaymentFormDataResponseDTO> GetPaymentFormDataAsync(Guid companyId, Guid fiscalYearId, Guid userId)
        {
            try
            {
                _logger.LogInformation("GetPaymentFormDataAsync called for Company: {CompanyId}, User: {UserId}", companyId, userId);

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

                // Get groups to include
                var groupsToInclude = await _context.AccountGroups
                    .Where(ag => ag.CompanyId == companyId &&
                           (ag.Name == "Cash in Hand" || ag.Name == "Bank Accounts" || ag.Name == "Bank O/D Account"))
                    .Select(ag => ag.Id)
                    .ToListAsync();

                var groupsToExclude = groupsToInclude;

                // Fetch cash accounts
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

                // Fetch bank accounts
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

                // Fetch regular accounts
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
                var response = new PaymentFormDataResponseDTO
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

                _logger.LogInformation("Successfully fetched payment form data for Company: {CompanyId}", companyId);
                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetPaymentFormDataAsync for Company: {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<string> GetNextBillNumberAsync(Guid companyId, Guid fiscalYearId)
        {
            return await _billNumberService.GetNextBillNumberAsync(companyId, fiscalYearId, "payment");
        }

        public async Task<string> GetCurrentBillNumberAsync(Guid companyId, Guid fiscalYearId)
        {
            return await _billNumberService.GetCurrentBillNumberAsync(companyId, fiscalYearId, "payment");
        }


        // public async Task<Payment> CreatePaymentAsync(CreatePaymentDTO dto, Guid userId, Guid companyId, Guid fiscalYearId)
        // {
        //     var executionStrategy = _context.Database.CreateExecutionStrategy();

        //     return await executionStrategy.ExecuteAsync(async () =>
        //     {
        //         using var transaction = await _context.Database.BeginTransactionAsync();

        //         try
        //         {
        //             _logger.LogInformation("CreatePaymentAsync started for Company: {CompanyId}, User: {UserId}", companyId, userId);

        //             // Validate entries
        //             if (dto.Entries == null || dto.Entries.Count < 2)
        //             {
        //                 throw new ArgumentException("At least 2 entries required (one debit and one credit)");
        //             }

        //             // Identify which entry is debit and which is credit
        //             var debitEntry = dto.Entries.FirstOrDefault(e => e.EntryType == "Debit");
        //             var creditEntry = dto.Entries.FirstOrDefault(e => e.EntryType == "Credit");

        //             if (debitEntry == null || creditEntry == null)
        //             {
        //                 throw new ArgumentException("Both debit and credit entries are required");
        //             }

        //             if (debitEntry.Amount != creditEntry.Amount)
        //             {
        //                 throw new ArgumentException($"Debit amount ({debitEntry.Amount}) must equal Credit amount ({creditEntry.Amount})");
        //             }

        //             // Store accounts for setting navigation properties
        //             var accountCache = new Dictionary<Guid, Account>();

        //             // Debit account - Money going OUT (Party Account - Sundry Debtors/Creditors)
        //             var debitAccount = await _context.Accounts
        //                 .FirstOrDefaultAsync(a => a.Id == debitEntry.AccountId && a.CompanyId == companyId);
        //             if (debitAccount == null)
        //             {
        //                 throw new ArgumentException($"Debit account with ID {debitEntry.AccountId} not found");
        //             }
        //             accountCache[debitEntry.AccountId] = debitAccount;

        //             // Credit account - Money coming IN (Payment Account - Cash in Hand/Bank)
        //             var creditAccount = await _context.Accounts
        //                 .FirstOrDefaultAsync(a => a.Id == creditEntry.AccountId && a.CompanyId == companyId);
        //             if (creditAccount == null)
        //             {
        //                 throw new ArgumentException($"Credit account with ID {creditEntry.AccountId} not found");
        //             }
        //             accountCache[creditEntry.AccountId] = creditAccount;

        //             // Get bill number
        //             var billNumber = await _billNumberService.GetNextBillNumberAsync(companyId, fiscalYearId, "payment");

        //             // Create payment master record
        //             var payment = new Payment
        //             {
        //                 Id = Guid.NewGuid(),
        //                 BillNumber = billNumber,
        //                 TotalAmount = debitEntry.Amount,
        //                 Date = dto.Date,
        //                 NepaliDate = dto.NepaliDate,
        //                 Description = dto.Description,
        //                 UserId = userId,
        //                 CompanyId = companyId,
        //                 FiscalYearId = fiscalYearId,
        //                 Status = PaymentStatus.Active,
        //                 IsActive = true,
        //                 CreatedAt = DateTime.UtcNow
        //             };

        //             await _context.Payments.AddAsync(payment);

        //             var transactions = new List<Transaction>();

        //             // 1. Create DEBIT transaction (Money going OUT to Party Account)
        //             // This is for the Party Account (Sundry Debtors/Creditors)
        //             decimal previousDebitBalance = 0;
        //             var lastDebitTransaction = await _context.Transactions
        //                 .Where(t => t.AccountId == debitEntry.AccountId && t.CompanyId == companyId)
        //                 .OrderByDescending(t => t.CreatedAt)
        //                 .FirstOrDefaultAsync();
        //             if (lastDebitTransaction != null)
        //             {
        //                 previousDebitBalance = lastDebitTransaction.Balance ?? 0;
        //             }
        //             decimal newDebitBalance = previousDebitBalance + debitEntry.Amount;

        //             var debitTransaction = new Transaction
        //             {
        //                 Id = Guid.NewGuid(),
        //                 PaymentAccountId = payment.Id,
        //                 AccountId = debitEntry.AccountId,
        //                 Account = debitAccount,
        //                 Type = TransactionType.Pymt,
        //                 DrCrNoteAccountTypes = "Debit",
        //                 PaymentReceiptType = creditAccount.Name,  // Store the payment account name
        //                 BillNumber = billNumber,
        //                 InstType = debitEntry.InstType.HasValue
        //                     ? (Models.Retailer.TransactionModel.InstrumentType)(int)debitEntry.InstType.Value
        //                     : Models.Retailer.TransactionModel.InstrumentType.NA,
        //                 InstNo = debitEntry.InstNo,
        //                 BankAcc = debitEntry.BankAcc,
        //                 Debit = debitEntry.Amount,
        //                 Credit = 0,
        //                 Balance = newDebitBalance,
        //                 PaymentMode = PaymentMode.Payment,
        //                 Date = payment.Date,
        //                 nepaliDate = payment.NepaliDate,
        //                 IsActive = true,
        //                 CompanyId = companyId,
        //                 FiscalYearId = fiscalYearId,
        //                 CreatedAt = DateTime.UtcNow
        //             };
        //             transactions.Add(debitTransaction);

        //             // 2. Create CREDIT transaction (Money coming IN to Payment Account)
        //             // This is for the Payment Account (Cash in Hand/Bank)
        //             decimal previousCreditBalance = 0;
        //             var lastCreditTransaction = await _context.Transactions
        //                 .Where(t => t.AccountId == creditEntry.AccountId && t.CompanyId == companyId)
        //                 .OrderByDescending(t => t.CreatedAt)
        //                 .FirstOrDefaultAsync();
        //             if (lastCreditTransaction != null)
        //             {
        //                 previousCreditBalance = lastCreditTransaction.Balance ?? 0;
        //             }
        //             decimal newCreditBalance = previousCreditBalance - creditEntry.Amount;

        //             var creditTransaction = new Transaction
        //             {
        //                 Id = Guid.NewGuid(),
        //                 PaymentAccountId = payment.Id,
        //                 AccountId = creditEntry.AccountId,
        //                 Account = creditAccount,
        //                 Type = TransactionType.Pymt,
        //                 DrCrNoteAccountTypes = "Credit",
        //                 PaymentReceiptType = debitAccount.Name,  // Store the party account name
        //                 BillNumber = billNumber,
        //                 InstType = creditEntry.InstType.HasValue
        //                     ? (Models.Retailer.TransactionModel.InstrumentType)(int)creditEntry.InstType.Value
        //                     : Models.Retailer.TransactionModel.InstrumentType.NA,
        //                 InstNo = creditEntry.InstNo,
        //                 BankAcc = creditEntry.BankAcc,
        //                 Debit = 0,
        //                 Credit = creditEntry.Amount,
        //                 Balance = newCreditBalance,
        //                 PaymentMode = PaymentMode.Payment,
        //                 Date = payment.Date,
        //                 nepaliDate = payment.NepaliDate,
        //                 IsActive = true,
        //                 CompanyId = companyId,
        //                 FiscalYearId = fiscalYearId,
        //                 CreatedAt = DateTime.UtcNow
        //             };
        //             transactions.Add(creditTransaction);

        //             // Create payment entries
        //             var debitPaymentEntry = new PaymentEntry
        //             {
        //                 Id = Guid.NewGuid(),
        //                 PaymentId = payment.Id,
        //                 AccountId = debitEntry.AccountId,
        //                 EntryType = "Debit",
        //                 Amount = debitEntry.Amount,
        //                 Description = debitEntry.Description,
        //                 InstType = debitEntry.InstType,
        //                 BankAcc = debitEntry.BankAcc,
        //                 InstNo = debitEntry.InstNo,
        //                 ReferenceNumber = debitEntry.ReferenceNumber,
        //                 CreatedAt = DateTime.UtcNow
        //             };

        //             var creditPaymentEntry = new PaymentEntry
        //             {
        //                 Id = Guid.NewGuid(),
        //                 PaymentId = payment.Id,
        //                 AccountId = creditEntry.AccountId,
        //                 EntryType = "Credit",
        //                 Amount = creditEntry.Amount,
        //                 Description = creditEntry.Description,
        //                 InstType = creditEntry.InstType,
        //                 BankAcc = creditEntry.BankAcc,
        //                 InstNo = creditEntry.InstNo,
        //                 ReferenceNumber = creditEntry.ReferenceNumber,
        //                 CreatedAt = DateTime.UtcNow
        //             };

        //             await _context.PaymentEntries.AddRangeAsync(new[] { debitPaymentEntry, creditPaymentEntry });
        //             await _context.Transactions.AddRangeAsync(transactions);
        //             await _context.SaveChangesAsync();

        //             await transaction.CommitAsync();

        //             _logger.LogInformation("Payment created successfully. ID: {PaymentId}, BillNumber: {BillNumber}, Amount: {Amount}, From: {FromAccount}, To: {ToAccount}",
        //                 payment.Id, payment.BillNumber, debitEntry.Amount, debitAccount.Name, creditAccount.Name);

        //             return payment;
        //         }
        //         catch (Exception ex)
        //         {
        //             _logger.LogError(ex, "Error in CreatePaymentAsync for Company: {CompanyId}", companyId);
        //             await transaction.RollbackAsync();
        //             throw;
        //         }
        //     });
        // }

        public async Task<Payment> CreatePaymentAsync(CreatePaymentDTO dto, Guid userId, Guid companyId, Guid fiscalYearId)
        {
            var executionStrategy = _context.Database.CreateExecutionStrategy();

            return await executionStrategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();

                try
                {
                    _logger.LogInformation("CreatePaymentAsync started for Company: {CompanyId}, User: {UserId}", companyId, userId);

                    // Validate entries
                    if (dto.Entries == null || dto.Entries.Count < 2)
                    {
                        throw new ArgumentException("At least 2 entries required (one debit and one credit)");
                    }

                    // Identify which entry is debit and which is credit
                    var debitEntry = dto.Entries.FirstOrDefault(e => e.EntryType == "Debit");
                    var creditEntry = dto.Entries.FirstOrDefault(e => e.EntryType == "Credit");

                    if (debitEntry == null || creditEntry == null)
                    {
                        throw new ArgumentException("Both debit and credit entries are required");
                    }

                    if (debitEntry.Amount != creditEntry.Amount)
                    {
                        throw new ArgumentException($"Debit amount ({debitEntry.Amount}) must equal Credit amount ({creditEntry.Amount})");
                    }

                    // Store accounts for setting navigation properties
                    var accountCache = new Dictionary<Guid, Account>();

                    // Debit account - Money going OUT (Party Account - Sundry Debtors/Creditors)
                    var debitAccount = await _context.Accounts
                        .FirstOrDefaultAsync(a => a.Id == debitEntry.AccountId && a.CompanyId == companyId);
                    if (debitAccount == null)
                    {
                        throw new ArgumentException($"Debit account with ID {debitEntry.AccountId} not found");
                    }
                    accountCache[debitEntry.AccountId] = debitAccount;

                    // Credit account - Money coming IN (Payment Account - Cash in Hand/Bank)
                    var creditAccount = await _context.Accounts
                        .FirstOrDefaultAsync(a => a.Id == creditEntry.AccountId && a.CompanyId == companyId);
                    if (creditAccount == null)
                    {
                        throw new ArgumentException($"Credit account with ID {creditEntry.AccountId} not found");
                    }
                    accountCache[creditEntry.AccountId] = creditAccount;

                    // Get bill number
                    var billNumber = await _billNumberService.GetNextBillNumberAsync(companyId, fiscalYearId, "payment");

                    // Create payment master record
                    var payment = new Payment
                    {
                        Id = Guid.NewGuid(),
                        BillNumber = billNumber,
                        TotalAmount = debitEntry.Amount,
                        Date = dto.Date,
                        NepaliDate = dto.NepaliDate,
                        Description = dto.Description,
                        UserId = userId,
                        CompanyId = companyId,
                        FiscalYearId = fiscalYearId,
                        Status = PaymentStatus.Active,
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    };

                    await _context.Payments.AddAsync(payment);

                    var transactions = new List<Transaction>();

                    // 1. Create DEBIT transaction (Money going OUT to Party Account)
                    // This is for the Party Account (Sundry Debtors/Creditors)
                    var debitTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        PaymentAccountId = payment.Id,
                        AccountId = debitEntry.AccountId,
                        Account = debitAccount,
                        Type = TransactionType.Pymt,
                        DrCrNoteAccountTypes = "Debit",
                        PaymentReceiptType = creditAccount.Name,  // Store the payment account name
                        BillNumber = billNumber,
                        InstType = debitEntry.InstType.HasValue
                            ? (Models.Retailer.TransactionModel.InstrumentType)(int)debitEntry.InstType.Value
                            : Models.Retailer.TransactionModel.InstrumentType.NA,
                        InstNo = debitEntry.InstNo,
                        BankAcc = debitEntry.BankAcc,
                        TotalDebit = debitEntry.Amount,
                        TotalCredit = 0,
                        PaymentMode = PaymentMode.Payment,
                        Date = payment.Date,
                        nepaliDate = payment.NepaliDate,
                        IsActive = true,
                        CompanyId = companyId,
                        FiscalYearId = fiscalYearId,
                        CreatedAt = DateTime.UtcNow,
                        Status = TransactionStatus.Active
                    };
                    transactions.Add(debitTransaction);

                    // 2. Create CREDIT transaction (Money coming IN to Payment Account)
                    // This is for the Payment Account (Cash in Hand/Bank)
                    var creditTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        PaymentAccountId = payment.Id,
                        AccountId = creditEntry.AccountId,
                        Account = creditAccount,
                        Type = TransactionType.Pymt,
                        DrCrNoteAccountTypes = "Credit",
                        PaymentReceiptType = debitAccount.Name,  // Store the party account name
                        BillNumber = billNumber,
                        InstType = creditEntry.InstType.HasValue
                            ? (Models.Retailer.TransactionModel.InstrumentType)(int)creditEntry.InstType.Value
                            : Models.Retailer.TransactionModel.InstrumentType.NA,
                        InstNo = creditEntry.InstNo,
                        BankAcc = creditEntry.BankAcc,
                        TotalDebit = 0,
                        TotalCredit = creditEntry.Amount,
                        PaymentMode = PaymentMode.Payment,
                        Date = payment.Date,
                        nepaliDate = payment.NepaliDate,
                        IsActive = true,
                        CompanyId = companyId,
                        FiscalYearId = fiscalYearId,
                        CreatedAt = DateTime.UtcNow,
                        Status = TransactionStatus.Active
                    };
                    transactions.Add(creditTransaction);

                    // Create payment entries
                    var debitPaymentEntry = new PaymentEntry
                    {
                        Id = Guid.NewGuid(),
                        PaymentId = payment.Id,
                        AccountId = debitEntry.AccountId,
                        EntryType = "Debit",
                        Amount = debitEntry.Amount,
                        Description = debitEntry.Description,
                        InstType = debitEntry.InstType,
                        BankAcc = debitEntry.BankAcc,
                        InstNo = debitEntry.InstNo,
                        ReferenceNumber = debitEntry.ReferenceNumber,
                        CreatedAt = DateTime.UtcNow
                    };

                    var creditPaymentEntry = new PaymentEntry
                    {
                        Id = Guid.NewGuid(),
                        PaymentId = payment.Id,
                        AccountId = creditEntry.AccountId,
                        EntryType = "Credit",
                        Amount = creditEntry.Amount,
                        Description = creditEntry.Description,
                        InstType = creditEntry.InstType,
                        BankAcc = creditEntry.BankAcc,
                        InstNo = creditEntry.InstNo,
                        ReferenceNumber = creditEntry.ReferenceNumber,
                        CreatedAt = DateTime.UtcNow
                    };

                    await _context.PaymentEntries.AddRangeAsync(new[] { debitPaymentEntry, creditPaymentEntry });
                    await _context.Transactions.AddRangeAsync(transactions);
                    await _context.SaveChangesAsync();

                    await transaction.CommitAsync();

                    _logger.LogInformation("Payment created successfully. ID: {PaymentId}, BillNumber: {BillNumber}, Amount: {Amount}, From: {FromAccount}, To: {ToAccount}",
                        payment.Id, payment.BillNumber, debitEntry.Amount, debitAccount.Name, creditAccount.Name);

                    return payment;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in CreatePaymentAsync for Company: {CompanyId}", companyId);
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
                _ => PaymentMode.Credit
            };
        }

        public async Task<PaymentFindsDTO> GetPaymentFindsAsync(Guid companyId, Guid fiscalYearId, Guid userId)
        {
            try
            {
                _logger.LogInformation("GetPaymentFindsAsync called for Company: {CompanyId}, FiscalYear: {FiscalYearId}, User: {UserId}",
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

                var latestBillQuery = _context.Payments
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

                var response = new PaymentFindsDTO
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

                _logger.LogInformation("Successfully retrieved payment finds data for Company: {CompanyId}", companyId);
                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetPaymentFindsAsync for Company: {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<BillIdResponseDTO> GetPaymentBillIdByNumberAsync(string billNumber, Guid companyId, Guid fiscalYearId)
        {
            try
            {
                _logger.LogInformation($"Getting payment ID for number: {billNumber}, Company: {companyId}, FiscalYear: {fiscalYearId}");

                var paymentBill = await _context.Payments
                    .Where(pb => pb.BillNumber == billNumber &&
                                pb.CompanyId == companyId &&
                                pb.FiscalYearId == fiscalYearId)
                    .Select(pb => new BillIdResponseDTO
                    {
                        Id = pb.Id,
                        BillNumber = pb.BillNumber
                    })
                    .FirstOrDefaultAsync();

                if (paymentBill == null)
                {
                    _logger.LogWarning($"Payment not found for number: {billNumber}");
                    throw new ArgumentException("Voucher not found");
                }

                _logger.LogInformation($"Successfully retrieved bill ID for number: {billNumber}");
                return paymentBill;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting payment ID for number: {billNumber}");
                throw;
            }
        }

        public async Task<PaymentEditDataDTO> GetPaymentEditDataAsync(Guid paymentId, Guid companyId, Guid fiscalYearId, Guid userId)
        {
            try
            {
                _logger.LogInformation("GetPaymentEditDataAsync called for Payment ID: {PaymentId}, Company: {CompanyId}, FiscalYear: {FiscalYearId}",
                    paymentId, companyId, fiscalYearId);

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

                // Fetch payment with all related data (including entries and accounts)
                var payment = await _context.Payments
                    .Include(p => p.PaymentEntries)
                        .ThenInclude(e => e.Account)
                    .Include(p => p.User)
                    .FirstOrDefaultAsync(p => p.Id == paymentId &&
                                             p.CompanyId == companyId &&
                                             p.FiscalYearId == fiscalYearId);

                if (payment == null)
                    throw new ArgumentException("Payment voucher not found or does not belong to the selected company/fiscal year");

                var groupsToInclude = await _context.AccountGroups
                    .Where(ag => ag.CompanyId == companyId &&
                           (ag.Name == "Cash in Hand" || ag.Name == "Bank Accounts" || ag.Name == "Bank O/D Account"))
                    .Select(ag => ag.Id)
                    .ToListAsync();

                var groupsToExclude = groupsToInclude;

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

                var paymentAccounts = cashAccounts.Concat(bankAccounts).ToList();

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

                var paymentDto = MapToPaymentEditDTO(payment, companyDateFormat);
                var entriesDto = MapToPaymentEntryEditDTO(payment.PaymentEntries);

                var response = new PaymentEditDataDTO
                {
                    Company = company,
                    Payment = paymentDto,
                    Entries = entriesDto,
                    Accounts = accounts,
                    CashAccounts = cashAccounts,
                    BankAccounts = bankAccounts,
                    PaymentAccounts = paymentAccounts,
                    CurrentFiscalYear = currentFiscalYear,
                    NepaliDate = nepaliDate,
                    CompanyDateFormat = companyDateFormat,
                    CurrentCompanyName = company.Name,
                    CurrentDate = today,
                    User = userInfo,
                    IsAdminOrSupervisor = isAdminOrSupervisor
                };

                _logger.LogInformation("Successfully retrieved payment edit data for Payment ID: {PaymentId} with {EntryCount} entries",
                    paymentId, entriesDto.Count);

                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting payment edit data for Payment ID: {PaymentId}", paymentId);
                throw;
            }
        }

        private PaymentEditDTO MapToPaymentEditDTO(Payment payment, string companyDateFormat)
        {
            bool isNepaliFormat = companyDateFormat?.ToLower() == "nepali";

            return new PaymentEditDTO
            {
                Id = payment.Id,
                BillNumber = payment.BillNumber,
                Date = isNepaliFormat ? payment.NepaliDate : payment.Date,
                NepaliDate = payment.NepaliDate,
                TotalAmount = payment.TotalAmount,
                Description = payment.Description,
                UserName = payment.User?.Name ?? string.Empty,
                UserEmail = payment.User?.Email ?? string.Empty,
                Status = payment.Status.ToString(),
                CreatedAt = payment.CreatedAt,
                UpdatedAt = payment.UpdatedAt
            };
        }

        private List<PaymentEntryEditDTO> MapToPaymentEntryEditDTO(ICollection<PaymentEntry> entries)
        {
            return entries.Select(e => new PaymentEntryEditDTO
            {
                Id = e.Id,
                AccountId = e.AccountId,
                AccountName = e.Account?.Name ?? string.Empty,
                EntryType = e.EntryType,
                Amount = e.Amount,
                Description = e.Description,
                InstType = e.InstType?.ToString(),
                BankAcc = e.BankAcc,
                InstNo = e.InstNo,
                ReferenceNumber = e.ReferenceNumber
            }).ToList();
        }

        // public async Task<Payment> UpdatePaymentAsync(Guid id, UpdatePaymentDTO dto, Guid companyId, Guid fiscalYearId, Guid userId)
        // {
        //     var executionStrategy = _context.Database.CreateExecutionStrategy();

        //     return await executionStrategy.ExecuteAsync(async () =>
        //     {
        //         using var transaction = await _context.Database.BeginTransactionAsync();

        //         try
        //         {
        //             _logger.LogInformation("=== Starting UpdatePaymentAsync for Payment ID: {PaymentId} ===", id);

        //             // Validate entries
        //             if (dto.Entries == null || dto.Entries.Count < 2)
        //                 throw new ArgumentException("At least 2 entries required (one debit and one credit)");

        //             // Identify debit and credit entries
        //             var debitEntry = dto.Entries.FirstOrDefault(e => e.EntryType == "Debit");
        //             var creditEntry = dto.Entries.FirstOrDefault(e => e.EntryType == "Credit");

        //             if (debitEntry == null || creditEntry == null)
        //                 throw new ArgumentException("Both debit and credit entries are required");

        //             if (debitEntry.Amount != creditEntry.Amount)
        //                 throw new ArgumentException($"Debit amount ({debitEntry.Amount}) must equal Credit amount ({creditEntry.Amount})");

        //             var existingPayment = await _context.Payments
        //                 .Include(p => p.PaymentEntries)
        //                 .FirstOrDefaultAsync(p => p.Id == id && p.CompanyId == companyId);

        //             if (existingPayment == null)
        //                 throw new ArgumentException("Payment voucher not found");

        //             // Validate accounts exist
        //             var debitAccount = await _context.Accounts
        //                 .FirstOrDefaultAsync(a => a.Id == debitEntry.AccountId && a.CompanyId == companyId);
        //             if (debitAccount == null)
        //                 throw new ArgumentException($"Debit account with ID {debitEntry.AccountId} not found");

        //             var creditAccount = await _context.Accounts
        //                 .FirstOrDefaultAsync(a => a.Id == creditEntry.AccountId && a.CompanyId == companyId);
        //             if (creditAccount == null)
        //                 throw new ArgumentException($"Credit account with ID {creditEntry.AccountId} not found");

        //             var company = await _context.Companies.FindAsync(companyId);
        //             if (company == null)
        //                 throw new ArgumentException("Company not found");

        //             var fiscalYear = await _context.FiscalYears
        //                 .FirstOrDefaultAsync(f => f.Id == fiscalYearId && f.CompanyId == companyId);
        //             if (fiscalYear == null)
        //                 throw new ArgumentException("Fiscal year not found");

        //             // Delete existing transactions
        //             var existingTransactions = await _context.Transactions
        //                 .Where(t => t.PaymentAccountId == id)
        //                 .ToListAsync();

        //             if (existingTransactions.Any())
        //             {
        //                 _context.Transactions.RemoveRange(existingTransactions);
        //                 _logger.LogInformation("Deleted {Count} existing transactions", existingTransactions.Count);
        //             }

        //             // Delete existing entries
        //             if (existingPayment.PaymentEntries.Any())
        //             {
        //                 _context.PaymentEntries.RemoveRange(existingPayment.PaymentEntries);
        //                 _logger.LogInformation("Deleted {Count} existing entries", existingPayment.PaymentEntries.Count);
        //             }

        //             await _context.SaveChangesAsync();

        //             // Update payment properties
        //             existingPayment.TotalAmount = debitEntry.Amount;
        //             existingPayment.Description = dto.Description;
        //             existingPayment.NepaliDate = dto.NepaliDate;
        //             existingPayment.Date = dto.Date;
        //             existingPayment.UpdatedAt = DateTime.UtcNow;

        //             _context.Payments.Update(existingPayment);
        //             await _context.SaveChangesAsync();

        //             // Create new entries and transactions
        //             var newEntries = new List<PaymentEntry>();
        //             var newTransactions = new List<Transaction>();

        //             // 1. Create DEBIT Payment Entry and Transaction (Party Account - Money going OUT)
        //             var debitPaymentEntry = new PaymentEntry
        //             {
        //                 Id = Guid.NewGuid(),
        //                 PaymentId = existingPayment.Id,
        //                 AccountId = debitEntry.AccountId,
        //                 EntryType = "Debit",
        //                 Amount = debitEntry.Amount,
        //                 Description = debitEntry.Description,
        //                 InstType = debitEntry.InstType,
        //                 BankAcc = debitEntry.BankAcc,
        //                 InstNo = debitEntry.InstNo,
        //                 ReferenceNumber = debitEntry.ReferenceNumber,
        //                 CreatedAt = DateTime.UtcNow
        //             };
        //             newEntries.Add(debitPaymentEntry);

        //             // Calculate balance for debit account (Party Account)
        //             decimal previousDebitBalance = 0;
        //             var lastDebitTransaction = await _context.Transactions
        //                 .Where(t => t.AccountId == debitEntry.AccountId && t.CompanyId == companyId)
        //                 .OrderByDescending(t => t.CreatedAt)
        //                 .FirstOrDefaultAsync();
        //             if (lastDebitTransaction != null)
        //                 previousDebitBalance = lastDebitTransaction.Balance ?? 0;
        //             decimal newDebitBalance = previousDebitBalance + debitEntry.Amount;

        //             var debitTransaction = new Transaction
        //             {
        //                 Id = Guid.NewGuid(),
        //                 PaymentAccountId = existingPayment.Id,
        //                 AccountId = debitEntry.AccountId,
        //                 Type = TransactionType.Pymt,
        //                 DrCrNoteAccountTypes = "Debit",
        //                 PaymentReceiptType = creditAccount.Name,  // Store the payment account name (Credit account name)
        //                 BillNumber = existingPayment.BillNumber,
        //                 InstType = debitEntry.InstType.HasValue
        //                     ? (Models.Retailer.TransactionModel.InstrumentType)(int)debitEntry.InstType.Value
        //                     : Models.Retailer.TransactionModel.InstrumentType.NA,
        //                 InstNo = debitEntry.InstNo,
        //                 BankAcc = debitEntry.BankAcc,
        //                 Debit = debitEntry.Amount,
        //                 Credit = 0,
        //                 Balance = newDebitBalance,
        //                 PaymentMode = PaymentMode.Payment,
        //                 Date = existingPayment.Date,
        //                 nepaliDate = existingPayment.NepaliDate,
        //                 IsActive = true,
        //                 CompanyId = companyId,
        //                 FiscalYearId = fiscalYearId,
        //                 CreatedAt = DateTime.UtcNow
        //             };
        //             newTransactions.Add(debitTransaction);

        //             // 2. Create CREDIT Payment Entry and Transaction (Payment Account - Money coming IN)
        //             var creditPaymentEntry = new PaymentEntry
        //             {
        //                 Id = Guid.NewGuid(),
        //                 PaymentId = existingPayment.Id,
        //                 AccountId = creditEntry.AccountId,
        //                 EntryType = "Credit",
        //                 Amount = creditEntry.Amount,
        //                 Description = creditEntry.Description,
        //                 InstType = creditEntry.InstType,
        //                 BankAcc = creditEntry.BankAcc,
        //                 InstNo = creditEntry.InstNo,
        //                 ReferenceNumber = creditEntry.ReferenceNumber,
        //                 CreatedAt = DateTime.UtcNow
        //             };
        //             newEntries.Add(creditPaymentEntry);

        //             // Calculate balance for credit account (Payment Account - Cash/Bank)
        //             decimal previousCreditBalance = 0;
        //             var lastCreditTransaction = await _context.Transactions
        //                 .Where(t => t.AccountId == creditEntry.AccountId && t.CompanyId == companyId)
        //                 .OrderByDescending(t => t.CreatedAt)
        //                 .FirstOrDefaultAsync();
        //             if (lastCreditTransaction != null)
        //                 previousCreditBalance = lastCreditTransaction.Balance ?? 0;
        //             decimal newCreditBalance = previousCreditBalance - creditEntry.Amount;

        //             var creditTransaction = new Transaction
        //             {
        //                 Id = Guid.NewGuid(),
        //                 PaymentAccountId = existingPayment.Id,
        //                 AccountId = creditEntry.AccountId,
        //                 Type = TransactionType.Pymt,
        //                 DrCrNoteAccountTypes = "Credit",
        //                 PaymentReceiptType = debitAccount.Name,  // Store the party account name (Debit account name)
        //                 BillNumber = existingPayment.BillNumber,
        //                 InstType = creditEntry.InstType.HasValue
        //                     ? (Models.Retailer.TransactionModel.InstrumentType)(int)creditEntry.InstType.Value
        //                     : Models.Retailer.TransactionModel.InstrumentType.NA,
        //                 InstNo = creditEntry.InstNo,
        //                 BankAcc = creditEntry.BankAcc,
        //                 Debit = 0,
        //                 Credit = creditEntry.Amount,
        //                 Balance = newCreditBalance,
        //                 PaymentMode = PaymentMode.Payment,
        //                 Date = existingPayment.Date,
        //                 nepaliDate = existingPayment.NepaliDate,
        //                 IsActive = true,
        //                 CompanyId = companyId,
        //                 FiscalYearId = fiscalYearId,
        //                 CreatedAt = DateTime.UtcNow
        //             };
        //             newTransactions.Add(creditTransaction);

        //             await _context.PaymentEntries.AddRangeAsync(newEntries);
        //             await _context.Transactions.AddRangeAsync(newTransactions);

        //             var saveResult = await _context.SaveChangesAsync();
        //             _logger.LogInformation("SaveChangesAsync completed. {RowCount} rows affected.", saveResult);

        //             await transaction.CommitAsync();
        //             _logger.LogInformation("Transaction committed successfully");

        //             _logger.LogInformation("=== Successfully updated payment: {PaymentId} with {EntryCount} entries ===",
        //                 id, newEntries.Count);

        //             var updatedPayment = await _context.Payments
        //                 .Include(p => p.PaymentEntries)
        //                     .ThenInclude(e => e.Account)
        //                 .FirstOrDefaultAsync(p => p.Id == id);

        //             return updatedPayment ?? existingPayment;
        //         }
        //         catch (Exception ex)
        //         {
        //             _logger.LogError(ex, "Error updating payment: {PaymentId}", id);
        //             await transaction.RollbackAsync();
        //             throw;
        //         }
        //     });
        // }

        public async Task<Payment> UpdatePaymentAsync(Guid id, UpdatePaymentDTO dto, Guid companyId, Guid fiscalYearId, Guid userId)
        {
            var executionStrategy = _context.Database.CreateExecutionStrategy();

            return await executionStrategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();

                try
                {
                    _logger.LogInformation("=== Starting UpdatePaymentAsync for Payment ID: {PaymentId} ===", id);

                    // Validate entries
                    if (dto.Entries == null || dto.Entries.Count < 2)
                        throw new ArgumentException("At least 2 entries required (one debit and one credit)");

                    // Identify debit and credit entries
                    var debitEntry = dto.Entries.FirstOrDefault(e => e.EntryType == "Debit");
                    var creditEntry = dto.Entries.FirstOrDefault(e => e.EntryType == "Credit");

                    if (debitEntry == null || creditEntry == null)
                        throw new ArgumentException("Both debit and credit entries are required");

                    if (debitEntry.Amount != creditEntry.Amount)
                        throw new ArgumentException($"Debit amount ({debitEntry.Amount}) must equal Credit amount ({creditEntry.Amount})");

                    var existingPayment = await _context.Payments
                        .Include(p => p.PaymentEntries)
                        .FirstOrDefaultAsync(p => p.Id == id && p.CompanyId == companyId);

                    if (existingPayment == null)
                        throw new ArgumentException("Payment voucher not found");

                    // Validate accounts exist
                    var debitAccount = await _context.Accounts
                        .FirstOrDefaultAsync(a => a.Id == debitEntry.AccountId && a.CompanyId == companyId);
                    if (debitAccount == null)
                        throw new ArgumentException($"Debit account with ID {debitEntry.AccountId} not found");

                    var creditAccount = await _context.Accounts
                        .FirstOrDefaultAsync(a => a.Id == creditEntry.AccountId && a.CompanyId == companyId);
                    if (creditAccount == null)
                        throw new ArgumentException($"Credit account with ID {creditEntry.AccountId} not found");

                    var company = await _context.Companies.FindAsync(companyId);
                    if (company == null)
                        throw new ArgumentException("Company not found");

                    var fiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.Id == fiscalYearId && f.CompanyId == companyId);
                    if (fiscalYear == null)
                        throw new ArgumentException("Fiscal year not found");

                    // Delete existing transactions AND their transaction items
                    var existingTransactions = await _context.Transactions
                        .Where(t => t.PaymentAccountId == id)
                        .Include(t => t.TransactionItems) // Include transaction items for cascade delete
                        .ToListAsync();

                    if (existingTransactions.Any())
                    {
                        // TransactionItems will be deleted automatically due to Cascade delete
                        _context.Transactions.RemoveRange(existingTransactions);
                        _logger.LogInformation("Deleted {Count} existing transactions with their items", existingTransactions.Count);
                    }

                    // Delete existing entries
                    if (existingPayment.PaymentEntries.Any())
                    {
                        _context.PaymentEntries.RemoveRange(existingPayment.PaymentEntries);
                        _logger.LogInformation("Deleted {Count} existing entries", existingPayment.PaymentEntries.Count);
                    }

                    await _context.SaveChangesAsync();

                    // Update payment properties
                    existingPayment.TotalAmount = debitEntry.Amount;
                    existingPayment.Description = dto.Description;
                    existingPayment.NepaliDate = dto.NepaliDate;
                    existingPayment.Date = dto.Date;
                    existingPayment.UpdatedAt = DateTime.UtcNow;

                    _context.Payments.Update(existingPayment);
                    await _context.SaveChangesAsync();

                    // Create new entries and transactions
                    var newEntries = new List<PaymentEntry>();
                    var newTransactions = new List<Transaction>();

                    // 1. Create DEBIT Payment Entry and Transaction (Party Account - Money going OUT)
                    var debitPaymentEntry = new PaymentEntry
                    {
                        Id = Guid.NewGuid(),
                        PaymentId = existingPayment.Id,
                        AccountId = debitEntry.AccountId,
                        EntryType = "Debit",
                        Amount = debitEntry.Amount,
                        Description = debitEntry.Description,
                        InstType = debitEntry.InstType,
                        BankAcc = debitEntry.BankAcc,
                        InstNo = debitEntry.InstNo,
                        ReferenceNumber = debitEntry.ReferenceNumber,
                        CreatedAt = DateTime.UtcNow
                    };
                    newEntries.Add(debitPaymentEntry);

                    var debitTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        PaymentAccountId = existingPayment.Id,
                        AccountId = debitEntry.AccountId,
                        Type = TransactionType.Pymt,
                        DrCrNoteAccountTypes = "Debit",
                        PaymentReceiptType = creditAccount.Name,  // Store the payment account name (Credit account name)
                        BillNumber = existingPayment.BillNumber,
                        InstType = debitEntry.InstType.HasValue
                            ? (Models.Retailer.TransactionModel.InstrumentType)(int)debitEntry.InstType.Value
                            : Models.Retailer.TransactionModel.InstrumentType.NA,
                        InstNo = debitEntry.InstNo,
                        BankAcc = debitEntry.BankAcc,
                        TotalDebit = debitEntry.Amount,
                        TotalCredit = 0,
                        PaymentMode = PaymentMode.Payment,
                        Date = existingPayment.Date,
                        nepaliDate = existingPayment.NepaliDate,
                        IsActive = true,
                        CompanyId = companyId,
                        FiscalYearId = fiscalYearId,
                        CreatedAt = DateTime.UtcNow,
                        Status = TransactionStatus.Active
                    };
                    newTransactions.Add(debitTransaction);

                    // 2. Create CREDIT Payment Entry and Transaction (Payment Account - Money coming IN)
                    var creditPaymentEntry = new PaymentEntry
                    {
                        Id = Guid.NewGuid(),
                        PaymentId = existingPayment.Id,
                        AccountId = creditEntry.AccountId,
                        EntryType = "Credit",
                        Amount = creditEntry.Amount,
                        Description = creditEntry.Description,
                        InstType = creditEntry.InstType,
                        BankAcc = creditEntry.BankAcc,
                        InstNo = creditEntry.InstNo,
                        ReferenceNumber = creditEntry.ReferenceNumber,
                        CreatedAt = DateTime.UtcNow
                    };
                    newEntries.Add(creditPaymentEntry);

                    var creditTransaction = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        PaymentAccountId = existingPayment.Id,
                        AccountId = creditEntry.AccountId,
                        Type = TransactionType.Pymt,
                        DrCrNoteAccountTypes = "Credit",
                        PaymentReceiptType = debitAccount.Name,  // Store the party account name (Debit account name)
                        BillNumber = existingPayment.BillNumber,
                        InstType = creditEntry.InstType.HasValue
                            ? (Models.Retailer.TransactionModel.InstrumentType)(int)creditEntry.InstType.Value
                            : Models.Retailer.TransactionModel.InstrumentType.NA,
                        InstNo = creditEntry.InstNo,
                        BankAcc = creditEntry.BankAcc,
                        TotalDebit = 0,
                        TotalCredit = creditEntry.Amount,
                        PaymentMode = PaymentMode.Payment,
                        Date = existingPayment.Date,
                        nepaliDate = existingPayment.NepaliDate,
                        IsActive = true,
                        CompanyId = companyId,
                        FiscalYearId = fiscalYearId,
                        CreatedAt = DateTime.UtcNow,
                        Status = TransactionStatus.Active
                    };
                    newTransactions.Add(creditTransaction);

                    await _context.PaymentEntries.AddRangeAsync(newEntries);
                    await _context.Transactions.AddRangeAsync(newTransactions);

                    var saveResult = await _context.SaveChangesAsync();
                    _logger.LogInformation("SaveChangesAsync completed. {RowCount} rows affected.", saveResult);

                    await transaction.CommitAsync();
                    _logger.LogInformation("Transaction committed successfully");

                    _logger.LogInformation("=== Successfully updated payment: {PaymentId} with {EntryCount} entries ===",
                        id, newEntries.Count);

                    var updatedPayment = await _context.Payments
                        .Include(p => p.PaymentEntries)
                            .ThenInclude(e => e.Account)
                        .FirstOrDefaultAsync(p => p.Id == id);

                    return updatedPayment ?? existingPayment;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error updating payment: {PaymentId}", id);
                    await transaction.RollbackAsync();
                    throw;
                }
            });
        }
        public async Task<PaymentsRegisterDataDTO> GetPaymentsRegisterAsync(Guid companyId, Guid fiscalYearId, string? fromDate = null, string? toDate = null)
        {
            try
            {
                _logger.LogInformation("GetPaymentsRegisterAsync called with companyId: {CompanyId}, fiscalYearId: {FiscalYearId}, fromDate: {FromDate}, toDate: {ToDate}",
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

                if (string.IsNullOrEmpty(fromDate) || string.IsNullOrEmpty(toDate))
                {
                    _logger.LogInformation("No date range provided, returning basic info with empty payments list");
                    return new PaymentsRegisterDataDTO
                    {
                        Company = company,
                        CurrentFiscalYear = fiscalYear,
                        Payments = new List<PaymentResponseItemDTO>(),
                        FromDate = fromDate,
                        ToDate = toDate,
                        CurrentCompanyName = company.Name,
                        CompanyDateFormat = company.DateFormat,
                        NepaliDate = nepaliDate,
                        UserPreferences = new UserPreferencesDTO { Theme = "light" }
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

                _logger.LogInformation("Searching for payments between {StartDate} and {EndDate} using {DateFormat} format",
                    startDateTime, endDateTime, isNepaliFormat ? "Nepali" : "English");

                var query = _context.Payments
                    .Include(p => p.PaymentEntries)
                        .ThenInclude(e => e.Account)
                    .Include(p => p.User)
                    .Include(p => p.Company)
                    .Include(p => p.FiscalYear)
                    .Where(p => p.CompanyId == companyId &&
                               p.FiscalYearId == fiscalYearId);

                if (isNepaliFormat)
                {
                    query = query.Where(p => p.NepaliDate >= startDateTime && p.NepaliDate <= endDateTime);
                    _logger.LogInformation("Using NepaliDate field for filtering");
                }
                else
                {
                    query = query.Where(p => p.Date >= startDateTime && p.Date <= endDateTime);
                    _logger.LogInformation("Using Date field for filtering");
                }

                var sql = query.ToQueryString();
                _logger.LogDebug("SQL Query: {Sql}", sql);

                var payments = await query
                    .OrderBy(p => p.Date)
                    .ThenBy(p => p.BillNumber)
                    .ToListAsync();

                _logger.LogInformation("Found {Count} payments matching the criteria", payments.Count);

                if (payments.Count == 0)
                {
                    var samplePayments = await _context.Payments
                        .Where(p => p.CompanyId == companyId)
                        .OrderByDescending(p => p.Date)
                        .Take(5)
                        .Select(p => new { p.Id, p.BillNumber, p.Date, p.NepaliDate })
                        .ToListAsync();

                    _logger.LogInformation("Sample of recent payments (Date vs NepaliDate): {SamplePayments}",
                        string.Join(", ", samplePayments.Select(p => $"{p.BillNumber} - Date: {p.Date}, NepaliDate: {p.NepaliDate}")));
                }

                var paymentDtos = payments.Select(payment => MapToResponseItemDTO(payment, company.DateFormat)).ToList();

                return new PaymentsRegisterDataDTO
                {
                    Company = company,
                    CurrentFiscalYear = fiscalYear,
                    Payments = paymentDtos,
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
                _logger.LogError(ex, "Error getting payments register for company {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<PaymentEntryDataDTO> GetPaymentEntryDataAsync(Guid companyId, Guid fiscalYearId, Guid userId)
        {
            try
            {
                _logger.LogInformation("GetPaymentEntryDataAsync called with companyId: {CompanyId}, fiscalYearId: {FiscalYearId}, userId: {UserId}",
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

                var groupsToInclude = await _context.AccountGroups
                    .Where(ag => ag.CompanyId == companyId &&
                           (ag.Name == "Cash in Hand" || ag.Name == "Bank Accounts" || ag.Name == "Bank O/D Account"))
                    .Select(ag => ag.Id)
                    .ToListAsync();

                var groupsToExclude = groupsToInclude;

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

                var data = new PaymentEntryDataDTO
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

                _logger.LogInformation("Successfully retrieved payment entry data for company {CompanyId}", companyId);
                return data;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting payment entry data for company {CompanyId}", companyId);
                throw;
            }
        }

        private PaymentResponseItemDTO MapToResponseItemDTO(Payment payment, string companyDateFormat)
        {
            bool isNepaliFormat = companyDateFormat?.ToLower() == "nepali";

            var entries = payment.PaymentEntries?.ToList() ?? new List<PaymentEntry>();

            // Debit entry = Party Account (Sundry Debtors/Creditors) - Money going OUT
            var debitEntry = entries.FirstOrDefault(e => e.EntryType == "Debit");
            // Credit entry = Payment Account (Cash in Hand/Bank) - Money coming IN
            var creditEntry = entries.FirstOrDefault(e => e.EntryType == "Credit");

            return new PaymentResponseItemDTO
            {
                Id = payment.Id,
                BillNumber = payment.BillNumber,
                Date = isNepaliFormat ? payment.NepaliDate : payment.Date,
                NepaliDate = payment.NepaliDate,
                // Account column should show Party Account (Debit entry)
                AccountId = debitEntry?.AccountId ?? Guid.Empty,
                AccountName = debitEntry?.Account?.Name ?? string.Empty,
                // Debit column should show the amount from Debit entry
                Debit = debitEntry?.Amount ?? 0,
                Credit = creditEntry?.Amount ?? 0,
                // Payment Account column should show Payment Account (Credit entry)
                PaymentAccountId = creditEntry?.AccountId ?? Guid.Empty,
                PaymentAccountName = creditEntry?.Account?.Name ?? string.Empty,
                InstType = creditEntry?.InstType?.ToString() ?? "NA",
                InstNo = creditEntry?.InstNo,
                BankAcc = creditEntry?.BankAcc,
                Description = payment.Description,
                UserName = payment.User?.Name ?? string.Empty,
                Status = payment.Status.ToString(),
                CreatedAt = payment.CreatedAt
            };
        }

        // private PaymentResponseItemDTO MapToResponseItemDTO(Payment payment, string companyDateFormat)
        // {
        //     bool isNepaliFormat = companyDateFormat?.ToLower() == "nepali";

        //     var entries = payment.PaymentEntries?.ToList() ?? new List<PaymentEntry>();
        //     var debitTotal = entries.Where(e => e.EntryType == "Debit").Sum(e => e.Amount);
        //     var creditTotal = entries.Where(e => e.EntryType == "Credit").Sum(e => e.Amount);

        //     var debitAccountNames = entries.Where(e => e.EntryType == "Debit")
        //         .Select(e => e.Account?.Name ?? string.Empty)
        //         .ToList();
        //     var creditAccountNames = entries.Where(e => e.EntryType == "Credit")
        //         .Select(e => e.Account?.Name ?? string.Empty)
        //         .ToList();

        //     return new PaymentResponseItemDTO
        //     {
        //         Id = payment.Id,
        //         BillNumber = payment.BillNumber,
        //         Date = isNepaliFormat ? payment.NepaliDate : payment.Date,
        //         NepaliDate = payment.NepaliDate,
        //         AccountId = entries.FirstOrDefault(e => e.EntryType == "Credit")?.AccountId ?? Guid.Empty,
        //         AccountName = string.Join(", ", creditAccountNames),
        //         // AccountUniqueNumber = entries.FirstOrDefault(e => e.EntryType == "Credit")?.Account?.UniqueNumber ?? string.Empty,
        //         Debit = debitTotal,
        //         Credit = creditTotal,
        //         PaymentAccountId = entries.FirstOrDefault(e => e.EntryType == "Debit")?.AccountId ?? Guid.Empty,
        //         PaymentAccountName = string.Join(", ", debitAccountNames),
        //         InstType = entries.FirstOrDefault(e => e.EntryType == "Credit" && e.InstType.HasValue)?.InstType?.ToString() ?? "NA",
        //         InstNo = entries.FirstOrDefault(e => e.EntryType == "Credit")?.InstNo,
        //         BankAcc = entries.FirstOrDefault(e => e.EntryType == "Credit")?.BankAcc,
        //         Description = payment.Description,
        //         UserName = payment.User?.Name ?? string.Empty,
        //         Status = payment.Status.ToString(),
        //         CreatedAt = payment.CreatedAt
        //     };
        // }

        // public async Task<PaymentPrintDTO> GetPaymentForPrintAsync(Guid id, Guid companyId, Guid userId, Guid fiscalYearId)
        // {
        //     try
        //     {
        //         _logger.LogInformation("GetPaymentForPrintAsync called for Payment ID: {PaymentId}", id);

        //         var companyEntity = await _context.Companies
        //             .FirstOrDefaultAsync(c => c.Id == companyId);

        //         if (companyEntity == null)
        //             throw new ArgumentException("Company not found");

        //         var payment = await _context.Payments
        //             .Include(p => p.PaymentEntries)
        //                 .ThenInclude(e => e.Account)
        //             .Include(p => p.User)
        //             .FirstOrDefaultAsync(p => p.Id == id && p.CompanyId == companyId);

        //         if (payment == null)
        //             throw new ArgumentException("Payment voucher not found");

        //         var entries = payment.PaymentEntries.ToList();
        //         var debitEntries = entries.Where(e => e.EntryType == "Debit").ToList();
        //         var creditEntries = entries.Where(e => e.EntryType == "Credit").ToList();

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

        //         var response = new PaymentPrintDTO
        //         {
        //             Company = new CompanyPrintDTO
        //             {
        //                 Id = companyEntity.Id,
        //                 DateFormat = companyEntity.DateFormat.ToString(),
        //                 FiscalYear = null
        //             },
        //             CurrentFiscalYear = currentFiscalYear,
        //             Payment = new PaymentPrintPaymentDTO
        //             {
        //                 Id = payment.Id,
        //                 BillNumber = payment.BillNumber,
        //                 Date = payment.Date,
        //                 NepaliDate = payment.NepaliDate,
        //                 TotalAmount = payment.TotalAmount,
        //                 Description = payment.Description,
        //                 Status = payment.Status.ToString(),
        //                 CreatedAt = payment.CreatedAt,
        //                 UpdatedAt = payment.UpdatedAt,
        //                 User = payment.User != null ? new UserPrintDTO
        //                 {
        //                     Id = payment.User.Id,
        //                     Name = payment.User.Name,
        //                     Role = payment.User.UserRoles?
        //                         .FirstOrDefault(ur => ur.IsPrimary)?.Role?.Name ?? "User"
        //                 } : null
        //             },
        //             DebitEntries = debitEntries.Select(e => new PaymentEntryPrintDTO
        //             {
        //                 Id = e.Id,
        //                 AccountId = e.AccountId,
        //                 AccountName = e.Account?.Name ?? string.Empty,
        //                 Amount = e.Amount,
        //                 Description = e.Description,
        //                 ReferenceNumber = e.ReferenceNumber
        //             }).ToList(),
        //             CreditEntries = creditEntries.Select(e => new PaymentEntryPrintDTO
        //             {
        //                 Id = e.Id,
        //                 AccountId = e.AccountId,
        //                 AccountName = e.Account?.Name ?? string.Empty,
        //                 Amount = e.Amount,
        //                 Description = e.Description,
        //                 InstType = e.InstType?.ToString() ?? "N/A",
        //                 BankAcc = e.BankAcc,
        //                 InstNo = e.InstNo,
        //                 ReferenceNumber = e.ReferenceNumber
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

        //         return response;
        //     }
        //     catch (Exception ex)
        //     {
        //         _logger.LogError(ex, "Error getting payment for print: {PaymentId}", id);
        //         throw;
        //     }
        // }

        public async Task<PaymentPrintDTO> GetPaymentForPrintAsync(Guid id, Guid companyId, Guid userId, Guid fiscalYearId)
        {
            try
            {
                _logger.LogInformation("GetPaymentForPrintAsync called for Payment ID: {PaymentId}", id);

                var companyEntity = await _context.Companies
                    .FirstOrDefaultAsync(c => c.Id == companyId);

                if (companyEntity == null)
                    throw new ArgumentException("Company not found");

                // Determine if company uses Nepali date format
                bool isNepaliFormat = companyEntity.DateFormat?.ToString().ToLower() == "nepali";

                var payment = await _context.Payments
                    .Include(p => p.PaymentEntries)
                        .ThenInclude(e => e.Account)
                    .Include(p => p.User)
                    .FirstOrDefaultAsync(p => p.Id == id && p.CompanyId == companyId);

                if (payment == null)
                    throw new ArgumentException("Payment voucher not found");

                var entries = payment.PaymentEntries.ToList();
                var debitEntries = entries.Where(e => e.EntryType == "Debit").ToList();
                var creditEntries = entries.Where(e => e.EntryType == "Credit").ToList();

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

                var response = new PaymentPrintDTO
                {
                    Company = new CompanyPrintDTO
                    {
                        Id = companyEntity.Id,
                        DateFormat = companyEntity.DateFormat.ToString(),
                        FiscalYear = currentFiscalYear
                    },
                    CurrentFiscalYear = currentFiscalYear,
                    Payment = new PaymentPrintPaymentDTO
                    {
                        Id = payment.Id,
                        BillNumber = payment.BillNumber,
                        // FIX: Return the correct date based on company format
                        Date = isNepaliFormat ? payment.NepaliDate : payment.Date,
                        NepaliDate = payment.NepaliDate,
                        TotalAmount = payment.TotalAmount,
                        Description = payment.Description,
                        Status = payment.Status.ToString(),
                        CreatedAt = payment.CreatedAt,
                        UpdatedAt = payment.UpdatedAt,
                        User = payment.User != null ? new UserPrintDTO
                        {
                            Id = payment.User.Id,
                            Name = payment.User.Name,
                            IsAdmin = payment.User.IsAdmin,
                            Role = payment.User.UserRoles?
                                .FirstOrDefault(ur => ur.IsPrimary)?.Role?.Name ?? "User"
                        } : null
                    },
                    DebitEntries = debitEntries.Select(e => new PaymentEntryPrintDTO
                    {
                        Id = e.Id,
                        AccountId = e.AccountId,
                        AccountName = e.Account?.Name ?? string.Empty,
                        Amount = e.Amount,
                        Description = e.Description,
                        ReferenceNumber = e.ReferenceNumber
                    }).ToList(),
                    CreditEntries = creditEntries.Select(e => new PaymentEntryPrintDTO
                    {
                        Id = e.Id,
                        AccountId = e.AccountId,
                        AccountName = e.Account?.Name ?? string.Empty,
                        Amount = e.Amount,
                        Description = e.Description,
                        InstType = e.InstType?.ToString() ?? "N/A",
                        BankAcc = e.BankAcc,
                        InstNo = e.InstNo,
                        ReferenceNumber = e.ReferenceNumber
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

                _logger.LogInformation("Successfully retrieved payment print data for Payment ID: {PaymentId} with {DebitCount} debit and {CreditCount} credit entries",
                    id, debitEntries.Count, creditEntries.Count);

                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting payment for print: {PaymentId}", id);
                throw;
            }
        }
    }
}