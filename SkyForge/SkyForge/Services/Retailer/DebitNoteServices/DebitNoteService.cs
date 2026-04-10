using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Dto.AccountDto;
using SkyForge.Dto.RetailerDto;
using SkyForge.Services.BillNumberServices;
using SkyForge.Models.Retailer.TransactionModel;
using SkyForge.Services.Retailer.DebitNoteServices;
using SkyForge.Dto.RetailerDto.DebitNoteDto;
using SkyForge.Models.Retailer.DebitNoteModel;


namespace SkyForge.Services.Retailer.DebitNoteServices
{
    public class DebitNoteService : IDebitNoteService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<DebitNoteService> _logger;

        private readonly IBillNumberService _billNumberService;

        public DebitNoteService(
            ApplicationDbContext context,
            ILogger<DebitNoteService> logger,
            IBillNumberService billNumberService)
        {
            _context = context;
            _logger = logger;
            _billNumberService = billNumberService;
        }

        public async Task<DebitNoteFormDataResponseDTO> GetDebitNoteFormDataAsync(Guid companyId, Guid fiscalYearId, Guid userId)
        {
            try
            {
                _logger.LogInformation("GetDebitNoteFormDataAsync called for Company: {CompanyId}, User: {UserId}", companyId, userId);

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
                var response = new DebitNoteFormDataResponseDTO
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

                _logger.LogInformation("Successfully fetched debit note form data for Company: {CompanyId}", companyId);
                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetDebitNoteFormDataAsync for Company: {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<string> GetNextBillNumberAsync(Guid companyId, Guid fiscalYearId)
        {
            return await _billNumberService.GetNextBillNumberAsync(companyId, fiscalYearId, "debitNote");
        }

        public async Task<string> GetCurrentBillNumberAsync(Guid companyId, Guid fiscalYearId)
        {
            return await _billNumberService.GetCurrentBillNumberAsync(companyId, fiscalYearId, "debitNote");
        }

        public async Task<DebitNote> CreateDebitNoteAsync(CreateDebitNoteDTO dto, Guid userId, Guid companyId, Guid fiscalYearId)
        {
            var executionStrategy = _context.Database.CreateExecutionStrategy();

            return await executionStrategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();

                try
                {
                    _logger.LogInformation("CreateDebitNoteAsync started for Company: {CompanyId}, User: {UserId}", companyId, userId);

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
                    foreach (var entry in dto.Entries)
                    {
                        var account = await _context.Accounts
                            .FirstOrDefaultAsync(a => a.Id == entry.AccountId && a.CompanyId == companyId);

                        if (account == null)
                        {
                            throw new ArgumentException($"Account with ID {entry.AccountId} not found");
                        }
                    }

                    // Get bill number
                    var billNumber = await _billNumberService.GetNextBillNumberAsync(companyId, fiscalYearId, "debitNote");

                    // Create Debit Note master record
                    var debitNote = new DebitNote
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
                        Status = DebitNoteStatus.Active,
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    };

                    await _context.DebitNotes.AddAsync(debitNote);

                    // Create debit note entries and transactions
                    var transactions = new List<Transaction>();
                    int lineNumber = 1;

                    foreach (var entryDto in dto.Entries.OrderBy(e => e.LineNumber))
                    {
                        // Create debit note entry
                        var debitNoteEntry = new DebitNoteEntry
                        {
                            Id = Guid.NewGuid(),
                            DebitNoteId = debitNote.Id,
                            AccountId = entryDto.AccountId,
                            EntryType = entryDto.EntryType,
                            Amount = entryDto.Amount,
                            Description = entryDto.Description,
                            LineNumber = lineNumber++,
                            ReferenceNumber = entryDto.ReferenceNumber,
                            CreatedAt = DateTime.UtcNow
                        };

                        await _context.DebitNoteEntries.AddAsync(debitNoteEntry);

                        // Get previous balance for account
                        decimal previousBalance = 0;
                        var lastTransaction = await _context.Transactions
                            .Where(t => t.AccountId == entryDto.AccountId && t.CompanyId == companyId)
                            .OrderByDescending(t => t.CreatedAt)
                            .FirstOrDefaultAsync();

                        if (lastTransaction != null)
                        {
                            previousBalance = lastTransaction.Balance ?? 0;
                        }

                        // Calculate new balance
                        decimal newBalance = entryDto.EntryType == "Debit"
                            ? previousBalance + entryDto.Amount
                            : previousBalance - entryDto.Amount;

                        // Get opposite entry type names for DrCrNoteAccountType field
                        var oppositeEntries = dto.Entries.Where(e => e.EntryType != entryDto.EntryType).ToList();
                        var oppositeAccountNames = string.Join(", ", oppositeEntries.Select(async e =>
                        {
                            var account = await _context.Accounts.FindAsync(e.AccountId);
                            return account?.Name ?? (entryDto.EntryType == "Debit" ? "Credit Note" : "Debit Note");
                        }).Select(t => t.Result));

                        // Create transaction
                        var transactionEntry = new Transaction
                        {
                            Id = Guid.NewGuid(),
                            DebitNoteId = debitNote.Id,
                            AccountId = entryDto.AccountId,
                            Type = TransactionType.DrNt, // Debit Note type
                            DrCrNoteAccountTypes = entryDto.EntryType,
                            DrCrNoteAccountType = oppositeAccountNames.Length > 1900 ? oppositeAccountNames.Substring(0, 1897) + "..." : oppositeAccountNames,
                            BillNumber = billNumber,
                            Debit = entryDto.EntryType == "Debit" ? entryDto.Amount : 0,
                            Credit = entryDto.EntryType == "Credit" ? entryDto.Amount : 0,
                            PaymentMode = PaymentMode.DrNote,
                            Balance = newBalance,
                            Date = debitNote.Date,
                            nepaliDate = debitNote.NepaliDate,
                            IsActive = true,
                            CompanyId = companyId,
                            FiscalYearId = fiscalYearId,
                            CreatedAt = DateTime.UtcNow
                        };

                        transactions.Add(transactionEntry);
                    }

                    await _context.Transactions.AddRangeAsync(transactions);
                    await _context.SaveChangesAsync();

                    await transaction.CommitAsync();

                    _logger.LogInformation("Debit Note created successfully. ID: {DebitNoteId}, BillNumber: {BillNumber}, Total: {TotalAmount}, Entries: {EntryCount}",
                        debitNote.Id, debitNote.BillNumber, totalCredit, dto.Entries.Count);

                    return debitNote;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in CreateDebitNoteAsync for Company: {CompanyId}", companyId);
                    await transaction.RollbackAsync();
                    throw;
                }
            });
        }

        public async Task<DebitNoteFindsDTO> GetDebitNoteFindsAsync(Guid companyId, Guid fiscalYearId, Guid userId)
        {
            try
            {
                _logger.LogInformation("GetDebitNoteFindsAsync called for Company: {CompanyId}, FiscalYear: {FiscalYearId}, User: {UserId}",
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

                var latestBillQuery = _context.DebitNotes
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

                var response = new DebitNoteFindsDTO
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

                _logger.LogInformation("Successfully retrieved debit note finds data for Company: {CompanyId}", companyId);
                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetDebitNoteFindsAsync for Company: {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<BillIdResponseDTO> GetDebitNoteBillIdByNumberAsync(string billNumber, Guid companyId, Guid fiscalYearId)
        {
            try
            {
                _logger.LogInformation($"Getting debit note ID for number: {billNumber}, Company: {companyId}, FiscalYear: {fiscalYearId}");

                var debitNoteBill = await _context.DebitNotes
                    .Where(pb => pb.BillNumber == billNumber &&
                                pb.CompanyId == companyId &&
                                pb.FiscalYearId == fiscalYearId)
                    .Select(pb => new BillIdResponseDTO
                    {
                        Id = pb.Id,
                        BillNumber = pb.BillNumber
                    })
                    .FirstOrDefaultAsync();

                if (debitNoteBill == null)
                {
                    _logger.LogWarning($"Debit note not found for number: {billNumber}");
                    throw new ArgumentException("Voucher not found");
                }

                _logger.LogInformation($"Successfully retrieved bill ID for number: {billNumber}");
                return debitNoteBill;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting debit note ID for number: {billNumber}");
                throw;
            }
        }

        public async Task<DebitNoteEditDataDTO> GetDebitNoteEditDataAsync(Guid debitNoteId, Guid companyId, Guid fiscalYearId, Guid userId)
        {
            try
            {
                _logger.LogInformation("GetDebitNoteEditDataAsync called for Debit Note ID: {DebitNoteId}, Company: {CompanyId}, FiscalYear: {FiscalYearId}",
                    debitNoteId, companyId, fiscalYearId);

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

                // Fetch debit note with all related data (including entries and accounts)
                var debitNote = await _context.DebitNotes
                    .Include(d => d.DebitNoteEntries)
                        .ThenInclude(e => e.Account)
                    .Include(d => d.User)
                    .FirstOrDefaultAsync(d => d.Id == debitNoteId &&
                                              d.CompanyId == companyId &&
                                              d.FiscalYearId == fiscalYearId);

                if (debitNote == null)
                    throw new ArgumentException("Debit note not found or does not belong to the selected company/fiscal year");

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
                var debitNoteDto = MapToDebitNoteEditDTO(debitNote);
                var entriesDto = MapToDebitNoteEntryEditDTO(debitNote.DebitNoteEntries);

                var response = new DebitNoteEditDataDTO
                {
                    Company = company,
                    DebitNote = debitNoteDto,
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

                _logger.LogInformation("Successfully retrieved debit note edit data for Debit Note ID: {DebitNoteId} with {EntryCount} entries",
                    debitNoteId, entriesDto.Count);

                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting debit note edit data for Debit Note ID: {DebitNoteId}", debitNoteId);
                throw;
            }
        }

        private DebitNoteEditDTO MapToDebitNoteEditDTO(DebitNote debitNote)
        {
            return new DebitNoteEditDTO
            {
                Id = debitNote.Id,
                BillNumber = debitNote.BillNumber,
                Date = debitNote.Date,
                NepaliDate = debitNote.NepaliDate,
                TotalAmount = debitNote.TotalAmount,
                Description = debitNote.Description ?? string.Empty,
                UserName = debitNote.User?.Name ?? string.Empty,
                UserEmail = debitNote.User?.Email ?? string.Empty,
                Status = debitNote.Status.ToString(),
                CreatedAt = debitNote.CreatedAt,
                UpdatedAt = debitNote.UpdatedAt
            };
        }

        private List<DebitNoteEntryEditDTO> MapToDebitNoteEntryEditDTO(ICollection<DebitNoteEntry> entries)
        {
            return entries.OrderBy(e => e.LineNumber).Select(e => new DebitNoteEntryEditDTO
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

        public async Task<DebitNote> UpdateDebitNoteAsync(Guid id, UpdateDebitNoteDTO dto, Guid companyId, Guid fiscalYearId, Guid userId)
        {
            var executionStrategy = _context.Database.CreateExecutionStrategy();

            return await executionStrategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();

                try
                {
                    _logger.LogInformation("=== Starting UpdateDebitNoteAsync for Debit Note ID: {DebitNoteId} ===", id);

                    // Validate entries
                    if (dto.Entries == null || dto.Entries.Count < 2)
                        throw new ArgumentException("At least 2 entries required (one debit and one credit)");

                    decimal totalDebit = dto.Entries.Where(e => e.EntryType == "Debit").Sum(e => e.Amount);
                    decimal totalCredit = dto.Entries.Where(e => e.EntryType == "Credit").Sum(e => e.Amount);

                    if (totalDebit != totalCredit)
                        throw new ArgumentException($"Total Debit ({totalDebit}) must equal Total Credit ({totalCredit})");

                    // Find existing debit note
                    var existingDebitNote = await _context.DebitNotes
                        .Include(d => d.DebitNoteEntries)
                        .FirstOrDefaultAsync(d => d.Id == id && d.CompanyId == companyId);

                    if (existingDebitNote == null)
                        throw new ArgumentException("Debit note not found");

                    // Check if debit note is canceled
                    if (existingDebitNote.Status == DebitNoteStatus.Canceled)
                        throw new ArgumentException("Cannot update a canceled debit note");

                    // Validate all accounts exist
                    foreach (var entryDto in dto.Entries)
                    {
                        var account = await _context.Accounts
                            .FirstOrDefaultAsync(a => a.Id == entryDto.AccountId && a.CompanyId == companyId);

                        if (account == null)
                            throw new ArgumentException($"Account with ID {entryDto.AccountId} not found");
                    }

                    var company = await _context.Companies.FindAsync(companyId);
                    if (company == null)
                        throw new ArgumentException("Company not found");

                    var fiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.Id == fiscalYearId && f.CompanyId == companyId);

                    if (fiscalYear == null)
                        throw new ArgumentException("Fiscal year not found");

                    // Delete existing transactions associated with this debit note
                    var existingTransactions = await _context.Transactions
                        .Where(t => t.DebitNoteId == id)
                        .ToListAsync();

                    if (existingTransactions.Any())
                    {
                        _context.Transactions.RemoveRange(existingTransactions);
                        _logger.LogInformation("Deleted {Count} existing transactions", existingTransactions.Count);
                    }

                    // Delete existing debit note entries
                    if (existingDebitNote.DebitNoteEntries.Any())
                    {
                        _context.DebitNoteEntries.RemoveRange(existingDebitNote.DebitNoteEntries);
                        _logger.LogInformation("Deleted {Count} existing entries", existingDebitNote.DebitNoteEntries.Count);
                    }

                    await _context.SaveChangesAsync();

                    // Update debit note properties
                    existingDebitNote.TotalAmount = totalDebit;
                    existingDebitNote.Description = dto.Description;
                    existingDebitNote.NepaliDate = dto.NepaliDate;
                    existingDebitNote.Date = dto.Date;
                    existingDebitNote.UpdatedAt = DateTime.UtcNow;

                    _context.DebitNotes.Update(existingDebitNote);
                    await _context.SaveChangesAsync();

                    // Create new entries and transactions
                    var newEntries = new List<DebitNoteEntry>();
                    var newTransactions = new List<Transaction>();
                    int lineNumber = 1;

                    foreach (var entryDto in dto.Entries.OrderBy(e => e.LineNumber))
                    {
                        var debitNoteEntry = new DebitNoteEntry
                        {
                            Id = Guid.NewGuid(),
                            DebitNoteId = existingDebitNote.Id,
                            AccountId = entryDto.AccountId,
                            EntryType = entryDto.EntryType,
                            Amount = entryDto.Amount,
                            Description = entryDto.Description,
                            LineNumber = lineNumber++,
                            ReferenceNumber = entryDto.ReferenceNumber,
                            CreatedAt = DateTime.UtcNow
                        };

                        newEntries.Add(debitNoteEntry);

                        // Get previous balance for account
                        decimal previousBalance = 0;
                        var lastTransaction = await _context.Transactions
                            .Where(t => t.AccountId == entryDto.AccountId && t.CompanyId == companyId)
                            .OrderByDescending(t => t.CreatedAt)
                            .FirstOrDefaultAsync();

                        if (lastTransaction != null)
                            previousBalance = lastTransaction.Balance ?? 0;

                        // Calculate new balance
                        decimal newBalance = entryDto.EntryType == "Debit"
                            ? previousBalance + entryDto.Amount
                            : previousBalance - entryDto.Amount;

                        // Get opposite entry type names for DrCrNoteAccountType field
                        var oppositeEntries = dto.Entries.Where(e => e.EntryType != entryDto.EntryType).ToList();
                        var oppositeAccountNames = string.Join(", ", oppositeEntries.Select(async e =>
                        {
                            var account = await _context.Accounts.FindAsync(e.AccountId);
                            return account?.Name ?? (entryDto.EntryType == "Debit" ? "Credit Note" : "Debit Note");
                        }).Select(t => t.Result));

                        // Truncate if too long (max 2000 characters for SQL Server)
                        if (oppositeAccountNames.Length > 1900)
                            oppositeAccountNames = oppositeAccountNames.Substring(0, 1897) + "...";

                        // Create transaction
                        var debitNoteTransaction = new Transaction
                        {
                            Id = Guid.NewGuid(),
                            DebitNoteId = existingDebitNote.Id,
                            AccountId = entryDto.AccountId,
                            Type = TransactionType.DrNt,
                            DrCrNoteAccountTypes = entryDto.EntryType,
                            DrCrNoteAccountType = oppositeAccountNames,
                            BillNumber = existingDebitNote.BillNumber,
                            Debit = entryDto.EntryType == "Debit" ? entryDto.Amount : 0,
                            Credit = entryDto.EntryType == "Credit" ? entryDto.Amount : 0,
                            PaymentMode = PaymentMode.DrNote,
                            Balance = newBalance,
                            Date = existingDebitNote.Date,
                            nepaliDate = existingDebitNote.NepaliDate,
                            IsActive = true,
                            CompanyId = companyId,
                            FiscalYearId = fiscalYearId,
                            CreatedAt = DateTime.UtcNow
                        };

                        newTransactions.Add(debitNoteTransaction);
                    }

                    await _context.DebitNoteEntries.AddRangeAsync(newEntries);
                    await _context.Transactions.AddRangeAsync(newTransactions);

                    var saveResult = await _context.SaveChangesAsync();
                    _logger.LogInformation("SaveChangesAsync completed. {RowCount} rows affected.", saveResult);

                    await transaction.CommitAsync();
                    _logger.LogInformation("Transaction committed successfully");

                    _logger.LogInformation("=== Successfully updated debit note: {DebitNoteId} with {EntryCount} entries ===",
                        id, newEntries.Count);

                    // Return the updated debit note with entries
                    var updatedDebitNote = await _context.DebitNotes
                        .Include(d => d.DebitNoteEntries)
                            .ThenInclude(e => e.Account)
                        .FirstOrDefaultAsync(d => d.Id == id);

                    return updatedDebitNote ?? existingDebitNote;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error updating debit note: {DebitNoteId}", id);
                    await transaction.RollbackAsync();
                    throw;
                }
            });
        }

        public async Task<DebitNoteRegisterDataDTO> GetDebitNotesRegisterAsync(Guid companyId, Guid fiscalYearId, string? fromDate = null, string? toDate = null)
        {
            try
            {
                _logger.LogInformation("GetDebitNotesRegisterAsync called with companyId: {CompanyId}, fiscalYearId: {FiscalYearId}, fromDate: {FromDate}, toDate: {ToDate}",
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

                // If no date range provided, return basic info with empty debit notes
                if (string.IsNullOrEmpty(fromDate) || string.IsNullOrEmpty(toDate))
                {
                    _logger.LogInformation("No date range provided, returning basic info with empty debit notes list");
                    return new DebitNoteRegisterDataDTO
                    {
                        Company = company,
                        CurrentFiscalYear = fiscalYear,
                        DebitNotes = new List<DebitNoteResponseItemDTO>(),
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

                _logger.LogInformation("Searching for debit notes between {StartDate} and {EndDate} using {DateFormat} format",
                    startDateTime, endDateTime, isNepaliFormat ? "Nepali" : "English");

                var query = _context.DebitNotes
                    .Include(d => d.DebitNoteEntries)
                        .ThenInclude(e => e.Account)
                    .Include(d => d.User)
                    .Where(d => d.CompanyId == companyId && d.FiscalYearId == fiscalYearId);

                if (isNepaliFormat)
                {
                    query = query.Where(d => d.NepaliDate >= startDateTime && d.NepaliDate <= endDateTime);
                    _logger.LogInformation("Using NepaliDate field for filtering");
                }
                else
                {
                    query = query.Where(d => d.Date >= startDateTime && d.Date <= endDateTime);
                    _logger.LogInformation("Using Date field for filtering");
                }

                var debitNotes = await query
                    .OrderBy(d => d.Date)
                    .ThenBy(d => d.BillNumber)
                    .ToListAsync();

                _logger.LogInformation("Found {Count} debit notes matching the criteria", debitNotes.Count);

                var debitNoteDtos = debitNotes.Select(debitNote => MapToResponseItemDTO(debitNote, company.DateFormat)).ToList();

                return new DebitNoteRegisterDataDTO
                {
                    Company = company,
                    CurrentFiscalYear = fiscalYear,
                    DebitNotes = debitNoteDtos,
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
                _logger.LogError(ex, "Error getting debit notes register for company {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<DebitNoteEntryDataDTO> GetDebitNoteEntryDataAsync(Guid companyId, Guid fiscalYearId, Guid userId)
        {
            try
            {
                _logger.LogInformation("GetDebitNoteEntryDataAsync called with companyId: {CompanyId}, fiscalYearId: {FiscalYearId}, userId: {UserId}",
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
                        IsActive = f.IsActive,
                    })
                    .FirstOrDefaultAsync();

                if (fiscalYear == null)
                    throw new ArgumentException("Fiscal year not found");

                // Get next bill number for display
                var nextBillNumber = await GetNextBillNumberAsync(companyId, fiscalYearId);

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

                var data = new DebitNoteEntryDataDTO
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
                    NextDebitNoteBillNumber = nextBillNumber,
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

                _logger.LogInformation("Successfully retrieved debit note entry data for company {CompanyId}", companyId);
                return data;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting debit note entry data for company {CompanyId}", companyId);
                throw;
            }
        }

        private DebitNoteResponseItemDTO MapToResponseItemDTO(DebitNote debitNote, string companyDateFormat)
        {
            bool isNepaliFormat = companyDateFormat?.ToLower() == "nepali";

            var entries = debitNote.DebitNoteEntries?.ToList() ?? new List<DebitNoteEntry>();

            var debitEntries = entries.Where(e => e.EntryType == "Debit").ToList();
            var creditEntries = entries.Where(e => e.EntryType == "Credit").ToList();

            var debitAccountNames = debitEntries.Select(e => e.Account?.Name ?? string.Empty).ToList();
            var creditAccountNames = creditEntries.Select(e => e.Account?.Name ?? string.Empty).ToList();

            var debitAmounts = debitEntries.Select(e => e.Amount).ToList();
            var creditAmounts = creditEntries.Select(e => e.Amount).ToList();

            return new DebitNoteResponseItemDTO
            {
                Id = debitNote.Id,
                BillNumber = debitNote.BillNumber,
                Date = isNepaliFormat ? debitNote.NepaliDate : debitNote.Date,
                NepaliDate = debitNote.NepaliDate,
                Description = debitNote.Description ?? string.Empty,
                TotalAmount = debitNote.TotalAmount,
                UserName = debitNote.User?.Name ?? string.Empty,
                Status = debitNote.Status.ToString(),
                CreatedAt = debitNote.CreatedAt,
                DebitAccountNames = debitAccountNames,
                CreditAccountNames = creditAccountNames,
                DebitAmounts = debitAmounts,
                CreditAmounts = creditAmounts
            };
        }

        // public async Task<DebitNotePrintDTO> GetDebitNoteForPrintAsync(Guid id, Guid companyId, Guid userId, Guid fiscalYearId)
        // {
        //     try
        //     {
        //         _logger.LogInformation("GetDebitNoteForPrintAsync called for Debit Note ID: {DebitNoteId}", id);

        //         var companyEntity = await _context.Companies
        //             .FirstOrDefaultAsync(c => c.Id == companyId);

        //         if (companyEntity == null)
        //             throw new ArgumentException("Company not found");

        //         var debitNote = await _context.DebitNotes
        //             .Include(d => d.DebitNoteEntries)
        //                 .ThenInclude(e => e.Account)
        //             .Include(d => d.User)
        //             .FirstOrDefaultAsync(d => d.Id == id && d.CompanyId == companyId);

        //         if (debitNote == null)
        //             throw new ArgumentException("Debit note not found");

        //         var entries = debitNote.DebitNoteEntries.ToList();
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
        //                 IsActive = f.IsActive,
        //                 StartDateNepali = f.StartDateNepali,
        //                 EndDateNepali = f.EndDateNepali
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

        //         // Get user role string
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

        //         var response = new DebitNotePrintDTO
        //         {
        //             Company = new CompanyPrintDTO
        //             {
        //                 Id = companyEntity.Id,
        //                 DateFormat = companyEntity.DateFormat.ToString(),
        //                 FiscalYear = null
        //             },
        //             CurrentFiscalYear = currentFiscalYear,
        //             DebitNote = new DebitNotePrintDataDTO
        //             {
        //                 Id = debitNote.Id,
        //                 BillNumber = debitNote.BillNumber,
        //                 Date = debitNote.Date,
        //                 NepaliDate = debitNote.NepaliDate,
        //                 TotalAmount = debitNote.TotalAmount,
        //                 Description = debitNote.Description,
        //                 Status = debitNote.Status.ToString(),
        //                 CreatedAt = debitNote.CreatedAt,
        //                 UpdatedAt = debitNote.UpdatedAt,
        //                 User = debitNote.User != null ? new UserPrintDTO
        //                 {
        //                     Id = debitNote.User.Id,
        //                     Name = debitNote.User.Name,
        //                     Role = debitNote.User.UserRoles?
        //                         .FirstOrDefault(ur => ur.IsPrimary)?.Role?.Name ?? "User",
        //                     IsAdmin = debitNote.User.IsAdmin
        //                 } : null
        //             },
        //             DebitEntries = debitEntries.Select(e => new DebitNoteEntryPrintDTO
        //             {
        //                 Id = e.Id,
        //                 AccountId = e.AccountId,
        //                 AccountName = e.Account?.Name ?? string.Empty,
        //                 EntryType = e.EntryType,
        //                 Amount = e.Amount,
        //                 Description = e.Description ?? string.Empty,
        //                 ReferenceNumber = e.ReferenceNumber ?? string.Empty,
        //                 LineNumber = e.LineNumber
        //             }).ToList(),
        //             CreditEntries = creditEntries.Select(e => new DebitNoteEntryPrintDTO
        //             {
        //                 Id = e.Id,
        //                 AccountId = e.AccountId,
        //                 AccountName = e.Account?.Name ?? string.Empty,
        //                 EntryType = e.EntryType,
        //                 Amount = e.Amount,
        //                 Description = e.Description ?? string.Empty,
        //                 ReferenceNumber = e.ReferenceNumber ?? string.Empty,
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
        //                 Role = userRole
        //             },
        //             IsAdminOrSupervisor = isAdminOrSupervisor
        //         };

        //         _logger.LogInformation("Successfully retrieved debit note print data for Debit Note ID: {DebitNoteId} with {DebitCount} debit and {CreditCount} credit entries",
        //             id, debitEntries.Count, creditEntries.Count);

        //         return response;
        //     }
        //     catch (Exception ex)
        //     {
        //         _logger.LogError(ex, "Error getting debit note for print: {DebitNoteId}", id);
        //         throw;
        //     }
        // }

        public async Task<DebitNotePrintDTO> GetDebitNoteForPrintAsync(Guid id, Guid companyId, Guid userId, Guid fiscalYearId)
        {
            try
            {
                _logger.LogInformation("GetDebitNoteForPrintAsync called for Debit Note ID: {DebitNoteId}", id);

                var companyEntity = await _context.Companies
                    .FirstOrDefaultAsync(c => c.Id == companyId);

                if (companyEntity == null)
                    throw new ArgumentException("Company not found");

                // Determine if company uses Nepali date format
                bool isNepaliFormat = companyEntity.DateFormat?.ToString().ToLower() == "nepali";

                var debitNote = await _context.DebitNotes
                    .Include(d => d.DebitNoteEntries)
                        .ThenInclude(e => e.Account)
                    .Include(d => d.User)
                    .FirstOrDefaultAsync(d => d.Id == id && d.CompanyId == companyId);

                if (debitNote == null)
                    throw new ArgumentException("Debit note not found");

                var entries = debitNote.DebitNoteEntries.ToList();
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

                // Get user role string
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

                var response = new DebitNotePrintDTO
                {
                    Company = new CompanyPrintDTO
                    {
                        Id = companyEntity.Id,
                        DateFormat = companyEntity.DateFormat.ToString(),
                        FiscalYear = currentFiscalYear
                    },
                    CurrentFiscalYear = currentFiscalYear,
                    DebitNote = new DebitNotePrintDataDTO
                    {
                        Id = debitNote.Id,
                        BillNumber = debitNote.BillNumber,
                        // FIX: Return the correct date based on company format
                        Date = isNepaliFormat ? debitNote.NepaliDate : debitNote.Date,
                        NepaliDate = debitNote.NepaliDate,
                        TotalAmount = debitNote.TotalAmount,
                        Description = debitNote.Description,
                        Status = debitNote.Status.ToString(),
                        CreatedAt = debitNote.CreatedAt,
                        UpdatedAt = debitNote.UpdatedAt,
                        User = debitNote.User != null ? new UserPrintDTO
                        {
                            Id = debitNote.User.Id,
                            Name = debitNote.User.Name,
                            Role = debitNote.User.UserRoles?
                                .FirstOrDefault(ur => ur.IsPrimary)?.Role?.Name ?? "User",
                            IsAdmin = debitNote.User.IsAdmin
                        } : null
                    },
                    DebitEntries = debitEntries.Select(e => new DebitNoteEntryPrintDTO
                    {
                        Id = e.Id,
                        AccountId = e.AccountId,
                        AccountName = e.Account?.Name ?? string.Empty,
                        EntryType = e.EntryType,
                        Amount = e.Amount,
                        Description = e.Description ?? string.Empty,
                        ReferenceNumber = e.ReferenceNumber ?? string.Empty,
                        LineNumber = e.LineNumber
                    }).ToList(),
                    CreditEntries = creditEntries.Select(e => new DebitNoteEntryPrintDTO
                    {
                        Id = e.Id,
                        AccountId = e.AccountId,
                        AccountName = e.Account?.Name ?? string.Empty,
                        EntryType = e.EntryType,
                        Amount = e.Amount,
                        Description = e.Description ?? string.Empty,
                        ReferenceNumber = e.ReferenceNumber ?? string.Empty,
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

                _logger.LogInformation("Successfully retrieved debit note print data for Debit Note ID: {DebitNoteId} with {DebitCount} debit and {CreditCount} credit entries",
                    id, debitEntries.Count, creditEntries.Count);

                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting debit note for print: {DebitNoteId}", id);
                throw;
            }
        }
    }
}