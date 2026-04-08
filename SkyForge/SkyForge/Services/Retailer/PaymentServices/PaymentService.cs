// using SkyForge.Data;
// using SkyForge.Services.BillNumberServices;
// using SkyForge.Models.Retailer.PaymentModel;
// using SkyForge.Dto.RetailerDto.PaymentDto;
// using SkyForge.Models.Retailer.TransactionModel;
// using SkyForge.Dto.RetailerDto;
// using SkyForge.Dto.AccountDto;

// namespace SkyForge.Services.Retailer.PaymentServices
// {
//     public class PaymentService : IPaymentService
//     {
//         private readonly ApplicationDbContext _context;
//         private readonly ILogger<PaymentService> _logger;
//         private readonly IBillNumberService _billNumberService;

//         public PaymentService(
//             ApplicationDbContext context,
//             ILogger<PaymentService> logger,
//             IBillNumberService billNumberService)
//         {
//             _context = context;
//             _logger = logger;
//             _billNumberService = billNumberService;
//         }


//         public async Task<PaymentFormDataResponseDTO> GetPaymentFormDataAsync(Guid companyId, Guid fiscalYearId, Guid userId)
//         {
//             try
//             {
//                 _logger.LogInformation("GetPaymentFormDataAsync called for Company: {CompanyId}, User: {UserId}", companyId, userId);

//                 // Get company with all required fields
//                 var company = await _context.Companies
//                     .Where(c => c.Id == companyId)
//                     .Select(c => new CompanyInfoDTO
//                     {
//                         Id = c.Id,
//                         DateFormat = c.DateFormat.ToString(),
//                         VatEnabled = c.VatEnabled,
//                     })
//                     .FirstOrDefaultAsync();

//                 if (company == null)
//                     return null;

//                 // Get current date in Nepali format (you'll need to implement Nepali date conversion)
//                 var today = DateTime.UtcNow;
//                 var nepaliDate = today.ToString("yyyy-MM-dd");

//                 // Get fiscal year with bill prefixes
//                 var currentFiscalYear = await _context.FiscalYears
//                     .Where(fy => fy.Id == fiscalYearId && fy.CompanyId == companyId)
//                     .Select(fy => new FiscalYearDTO
//                     {
//                         Id = fy.Id,
//                         Name = fy.Name,
//                         StartDate = fy.StartDate,
//                         EndDate = fy.EndDate,
//                         IsActive = fy.IsActive,
//                         DateFormat = fy.DateFormat.ToString()
//                     })
//                     .FirstOrDefaultAsync();

//                 var groupsToInclude = await _context.AccountGroups
//                  .Where(ag => ag.CompanyId == companyId &&
//                         (ag.Name == "Cash in Hand" || ag.Name == "Bank Accounts" || ag.Name == "Bank O/D Account"))
//                  .Select(ag => ag.Id)
//                  .ToListAsync();

//                 // Get groups to exclude from regular accounts list
//                 var groupsToExclude = groupsToInclude; // Same groups to exclude from regular accounts

//                 // Fetch cash accounts (Cash in Hand group)
//                 var cashAccounts = await _context.Accounts
//                     .Where(a => a.CompanyId == companyId &&
//                            a.IsActive &&
//                            a.OriginalFiscalYearId == fiscalYearId &&
//                            groupsToInclude.Contains(a.AccountGroupsId) &&
//                            _context.AccountGroups.Any(ag => ag.Id == a.AccountGroupsId && ag.Name == "Cash in Hand"))
//                     .Select(a => new AccountInfoDTO
//                     {
//                         Id = a.Id,
//                         Name = a.Name,
//                         UniqueNumber = a.UniqueNumber,
//                         Address = a.Address,
//                         Phone = a.Phone,
//                         Pan = a.Pan,
//                     })
//                     .ToListAsync();

//                 // Fetch bank accounts (Bank Accounts and Bank O/D Account groups)
//                 var bankAccounts = await _context.Accounts
//                     .Where(a => a.CompanyId == companyId &&
//                            a.IsActive &&
//                            a.OriginalFiscalYearId == fiscalYearId &&
//                            groupsToInclude.Contains(a.AccountGroupsId) &&
//                            _context.AccountGroups.Any(ag => ag.Id == a.AccountGroupsId &&
//                                (ag.Name == "Bank Accounts" || ag.Name == "Bank O/D Account")))
//                     .Select(a => new AccountInfoDTO
//                     {
//                         Id = a.Id,
//                         Name = a.Name,
//                         UniqueNumber = a.UniqueNumber,
//                         Address = a.Address,
//                         Phone = a.Phone,
//                         Pan = a.Pan,
//                     })
//                     .ToListAsync();

//                 // Fetch regular accounts (excluding cash and bank accounts)
//                 var accounts = await _context.Accounts
//                     .Where(a => a.CompanyId == companyId &&
//                            a.IsActive &&
//                            a.OriginalFiscalYearId == fiscalYearId &&
//                            !groupsToExclude.Contains(a.AccountGroupsId))
//                     .Select(a => new AccountInfoDTO
//                     {
//                         Id = a.Id,
//                         Name = a.Name,
//                         UniqueNumber = a.UniqueNumber,
//                         Address = a.Address,
//                         Phone = a.Phone,
//                         Pan = a.Pan,
//                     })
//                     .ToListAsync();

//                 // Get user with preferences and roles
//                 var user = await _context.Users
//                     .Include(u => u.UserRoles)
//                         .ThenInclude(ur => ur.Role)
//                     .FirstOrDefaultAsync(u => u.Id == userId);

//                 bool isAdmin = user?.IsAdmin ?? false;
//                 string userRole = "User";

//                 if (isAdmin)
//                 {
//                     userRole = "Admin";
//                 }
//                 else if (user?.UserRoles != null)
//                 {
//                     var primaryRole = user.UserRoles.FirstOrDefault(ur => ur.IsPrimary);
//                     if (primaryRole?.Role != null)
//                     {
//                         userRole = primaryRole.Role.Name;
//                     }
//                 }

//                 // Prepare response
//                 var response = new PaymentFormDataResponseDTO
//                 {
//                     Company = company,
//                     CurrentFiscalYear = currentFiscalYear,
//                     Accounts = accounts,
//                     CashAccounts = cashAccounts,
//                     BankAccounts = bankAccounts,
//                     NepaliDate = nepaliDate,
//                     CompanyDateFormat = company.DateFormat?.ToLower() ?? "english",
//                     CurrentDate = today,
//                     UserPreferences = new UserPreferencesDTO
//                     {
//                         Theme = user?.Preferences?.Theme.ToString() ?? "light"
//                     },
//                     Permissions = new PermissionsDTO
//                     {
//                         IsAdminOrSupervisor = isAdmin || userRole == "Supervisor"
//                     },
//                 };

//                 _logger.LogInformation("Successfully fetched payment form data for Company: {CompanyId}", companyId);
//                 return response;
//             }
//             catch (Exception ex)
//             {
//                 _logger.LogError(ex, "Error in GetPaymentFormDataAsync for Company: {CompanyId}", companyId);
//                 throw;
//             }
//         }

//         public async Task<string> GetNextBillNumberAsync(Guid companyId, Guid fiscalYearId)
//         {
//             return await _billNumberService.GetNextBillNumberAsync(companyId, fiscalYearId, "payment");
//         }
//         public async Task<string> GetCurrentBillNumberAsync(Guid companyId, Guid fiscalYearId)
//         {
//             return await _billNumberService.GetCurrentBillNumberAsync(companyId, fiscalYearId, "payment");
//         }

//         public async Task<Payment> CreatePaymentAsync(CreatePaymentDTO dto, Guid userId, Guid companyId, Guid fiscalYearId)
//         {
//             // Start a transaction
//             var executionStrategy = _context.Database.CreateExecutionStrategy();

//             return await executionStrategy.ExecuteAsync(async () =>
//             {
//                 using var transaction = await _context.Database.BeginTransactionAsync();

//                 try
//                 {
//                     _logger.LogInformation("CreatePaymentAsync started for Company: {CompanyId}, User: {UserId}", companyId, userId);

//                     // Validation
//                     if (dto.AccountId == Guid.Empty)
//                     {
//                         throw new ArgumentException("Account ID is required.");
//                     }

//                     if (dto.PaymentAccountId == Guid.Empty)
//                     {
//                         throw new ArgumentException("Payment account ID is required.");
//                     }

//                     if (dto.Debit <= 0)
//                     {
//                         throw new ArgumentException("Debit amount must be greater than 0.");
//                     }

//                     var paymentMode = ParsePaymentMode(dto.PaymentMode);

//                     // Get bill number
//                     var billNumber = await _billNumberService.GetNextBillNumberAsync(companyId, fiscalYearId, "payment");

//                     // Verify accounts exist
//                     var debitedAccount = await _context.Accounts
//                         .FirstOrDefaultAsync(a => a.Id == dto.AccountId && a.CompanyId == companyId);

//                     if (debitedAccount == null)
//                     {
//                         throw new ArgumentException("Debited account not found.");
//                     }

//                     var creditAccount = await _context.Accounts
//                         .FirstOrDefaultAsync(a => a.Id == dto.PaymentAccountId && a.CompanyId == companyId);

//                     if (creditAccount == null)
//                     {
//                         throw new ArgumentException("Payment account not found.");
//                     }

//                     // Create payment record
//                     var payment = new Payment
//                     {
//                         Id = Guid.NewGuid(),
//                         BillNumber = billNumber,
//                         AccountId = dto.AccountId,
//                         Debit = dto.Debit,
//                         Credit = 0,
//                         PaymentAccountId = dto.PaymentAccountId,
//                         InstType = dto.InstType,
//                         InstNo = dto.InstNo ?? string.Empty,
//                         Description = dto.Description,
//                         UserId = userId,
//                         CompanyId = companyId,
//                         FiscalYearId = fiscalYearId,
//                         IsActive = true,
//                         Status = PaymentStatus.Active,
//                         NepaliDate = dto.NepaliDate,
//                         Date = dto.Date,
//                         CreatedAt = DateTime.UtcNow
//                     };

//                     await _context.Payments.AddAsync(payment);

//                     // Create debit transaction
//                     var debitTransaction = new Transaction
//                     {
//                         Id = Guid.NewGuid(),
//                         AccountId = dto.AccountId,
//                         PaymentAccountId = payment.Id,
//                         Type = TransactionType.Pymt,
//                         DrCrNoteAccountTypes = "Debit",
//                         BillNumber = billNumber,
//                         AccountTypeId = dto.PaymentAccountId, // Store as string
//                         InstType = (Models.Retailer.TransactionModel.InstrumentType)(int)dto.InstType,
//                         InstNo = dto.InstNo,
//                         Debit = dto.Debit,
//                         Credit = 0,
//                         PaymentReceiptType = "Payment",
//                         PaymentMode = PaymentMode.Payment,
//                         Date = payment.Date,
//                         nepaliDate = payment.NepaliDate,
//                         IsActive = true,
//                         CompanyId = companyId,
//                         FiscalYearId = fiscalYearId,
//                         CreatedAt = DateTime.UtcNow
//                     };

//                     await _context.Transactions.AddAsync(debitTransaction);

//                     // Create credit transaction
//                     var creditTransaction = new Transaction
//                     {
//                         Id = Guid.NewGuid(),
//                         // ReceiptAccountId = dto.PaymentAccountId,
//                         PaymentAccountId = payment.Id,
//                         AccountId = dto.PaymentAccountId,
//                         Type = TransactionType.Pymt,
//                         DrCrNoteAccountTypes = "Credit",
//                         BillNumber = billNumber,
//                         AccountTypeId = dto.AccountId, // Store as string
//                         InstType = (Models.Retailer.TransactionModel.InstrumentType)(int)dto.InstType,
//                         InstNo = dto.InstNo,
//                         Debit = 0,
//                         Credit = dto.Debit,
//                         PaymentMode = PaymentMode.Payment,
//                         PaymentReceiptType = "Receipt",
//                         Date = payment.Date,
//                         nepaliDate = payment.NepaliDate,
//                         IsActive = true,
//                         CompanyId = companyId,
//                         FiscalYearId = fiscalYearId,
//                         CreatedAt = DateTime.UtcNow
//                     };

//                     await _context.Transactions.AddAsync(creditTransaction);

//                     // Save all changes
//                     await _context.SaveChangesAsync();

//                     // Commit transaction
//                     await transaction.CommitAsync();

//                     _logger.LogInformation("Payment created successfully. ID: {PaymentId}, BillNumber: {BillNumber}",
//                         payment.Id, payment.BillNumber);

//                     return payment;
//                 }
//                 catch (Exception ex)
//                 {
//                     _logger.LogError(ex, "Error in CreatePaymentAsync for Company: {CompanyId}", companyId);
//                     await transaction.RollbackAsync();
//                     throw;
//                 }
//             });
//         }

//         private PaymentMode ParsePaymentMode(string? paymentMode)
//         {
//             return paymentMode?.ToLower() switch
//             {
//                 "cash" => PaymentMode.Cash,
//                 "credit" => PaymentMode.Credit,
//                 "payment" => PaymentMode.Payment,
//                 "receipt" => PaymentMode.Receipt,
//                 "journal" => PaymentMode.Journal,
//                 "drnote" => PaymentMode.DrNote,
//                 "crnote" => PaymentMode.CrNote,
//                 _ => PaymentMode.Credit // Default to Credit
//             };
//         }

//         public async Task<PaymentFindsDTO> GetPaymentFindsAsync(Guid companyId, Guid fiscalYearId, Guid userId)
//         {
//             try
//             {
//                 _logger.LogInformation("GetPaymentFindsAsync called for Company: {CompanyId}, FiscalYear: {FiscalYearId}, User: {UserId}",
//                     companyId, fiscalYearId, userId);

//                 // Get company information
//                 var company = await _context.Companies
//                     .Where(c => c.Id == companyId)
//                     .Select(c => new CompanyInfoDTO
//                     {
//                         Id = c.Id,
//                         Name = c.Name,
//                         Address = c.Address,
//                         City = c.City,
//                         Phone = c.Phone,
//                         Pan = c.Pan,
//                         RenewalDate = c.RenewalDate,
//                         DateFormat = c.DateFormat.ToString(),
//                         VatEnabled = c.VatEnabled,
//                     })
//                     .FirstOrDefaultAsync();

//                 if (company == null)
//                 {
//                     _logger.LogWarning("Company not found with ID: {CompanyId}", companyId);
//                     throw new ArgumentException("Company not found");
//                 }

//                 // Determine if company uses Nepali date format
//                 bool isNepaliFormat = company.DateFormat?.ToLower() == "nepali";

//                 _logger.LogInformation("Company date format: {DateFormat}, IsNepaliFormat: {IsNepaliFormat}",
//                     company.DateFormat, isNepaliFormat);

//                 // Get fiscal year information
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
//                         IsActive = f.IsActive,
//                     })
//                     .FirstOrDefaultAsync();

//                 if (currentFiscalYear == null)
//                 {
//                     _logger.LogWarning("Fiscal year not found with ID: {FiscalYearId} for Company: {CompanyId}",
//                         fiscalYearId, companyId);
//                     throw new ArgumentException("Fiscal year not found");
//                 }

//                 // Get company date format string
//                 string companyDateFormat = company.DateFormat?.ToLower() ?? "english";

//                 // Fetch the latest purchase bill for this company and fiscal year
//                 // Order by the appropriate date field based on company format
//                 var latestBillQuery = _context.Payments
//                     .Where(p => p.CompanyId == companyId && p.FiscalYearId == fiscalYearId);

//                 if (isNepaliFormat)
//                 {
//                     // For Nepali format, order by nepaliDate descending
//                     latestBillQuery = latestBillQuery.OrderByDescending(p => p.NepaliDate)
//                                                      .ThenByDescending(p => p.BillNumber);
//                 }
//                 else
//                 {
//                     // For English format, order by Date descending
//                     latestBillQuery = latestBillQuery.OrderByDescending(p => p.Date)
//                                                      .ThenByDescending(p => p.BillNumber);
//                 }

//                 var latestBill = await latestBillQuery
//                     .Select(p => new
//                     {
//                         p.BillNumber,
//                         p.Date,
//                         p.NepaliDate
//                     })
//                     .FirstOrDefaultAsync();

//                 _logger.LogInformation("Latest bill query result: BillNumber: {BillNumber}, Date: {Date}, NepaliDate: {NepaliDate}",
//                     latestBill?.BillNumber, latestBill?.Date, latestBill?.NepaliDate);

//                 // Get user with roles
//                 var user = await _context.Users
//                     .Include(u => u.UserRoles)
//                         .ThenInclude(ur => ur.Role)
//                     .FirstOrDefaultAsync(u => u.Id == userId);

//                 if (user == null)
//                 {
//                     _logger.LogWarning("User not found with ID: {UserId}", userId);
//                     throw new ArgumentException("User not found");
//                 }

//                 bool isAdmin = user?.IsAdmin ?? false;
//                 string userRole = "User";

//                 if (isAdmin)
//                 {
//                     userRole = "Admin";
//                 }
//                 else if (user?.UserRoles != null)
//                 {
//                     var primaryRole = user.UserRoles.FirstOrDefault(ur => ur.IsPrimary);
//                     if (primaryRole?.Role != null)
//                     {
//                         userRole = primaryRole.Role.Name;
//                     }
//                 }

//                 // Determine if user is admin or supervisor
//                 bool isAdminOrSupervisor = isAdmin || userRole == "Supervisor";

//                 // Create user info DTO
//                 var userInfo = new UserInfoDTO
//                 {
//                     Id = user.Id,
//                     Name = user.Name,
//                     Email = user.Email,
//                     IsAdmin = isAdmin,
//                     Role = userRole,
//                     Preferences = new UserPreferencesDTO
//                     {
//                         Theme = user.Preferences?.Theme.ToString() ?? "light"
//                     }
//                 };

//                 // Create response DTO
//                 var response = new PaymentFindsDTO
//                 {
//                     Company = company,
//                     BillNumber = latestBill?.BillNumber ?? string.Empty,
//                     CurrentFiscalYear = currentFiscalYear,
//                     CompanyDateFormat = companyDateFormat,
//                     CurrentCompanyName = company.Name,
//                     Date = DateTime.UtcNow.Date,
//                     Title = string.Empty,
//                     Body = string.Empty,
//                     User = userInfo,
//                     Theme = userInfo.Preferences?.Theme ?? "light",
//                     IsAdminOrSupervisor = isAdminOrSupervisor
//                 };

//                 _logger.LogInformation("Successfully retrieved payment finds data for Company: {CompanyId}", companyId);

//                 return response;
//             }
//             catch (Exception ex)
//             {
//                 _logger.LogError(ex, "Error in GetPaymentFindsAsync for Company: {CompanyId}", companyId);
//                 throw;
//             }
//         }

//         public async Task<BillIdResponseDTO> GetPaymentBillIdByNumberAsync(string billNumber, Guid companyId, Guid fiscalYearId)
//         {
//             try
//             {
//                 _logger.LogInformation($"Getting payment ID for number: {billNumber}, Company: {companyId}, FiscalYear: {fiscalYearId}");

//                 var paymentBill = await _context.Payments
//                     .Where(pb => pb.BillNumber == billNumber &&
//                                 pb.CompanyId == companyId &&
//                                 pb.FiscalYearId == fiscalYearId)
//                     .Select(pb => new BillIdResponseDTO
//                     {
//                         Id = pb.Id,
//                         BillNumber = pb.BillNumber
//                     })
//                     .FirstOrDefaultAsync();

//                 if (paymentBill == null)
//                 {
//                     _logger.LogWarning($"Payment not found for number: {billNumber}");
//                     throw new ArgumentException("Voucher not found");
//                 }

//                 _logger.LogInformation($"Successfully retrieved bill ID for number: {billNumber}");
//                 return paymentBill;
//             }
//             catch (Exception ex)
//             {
//                 _logger.LogError(ex, $"Error getting payment ID for number: {billNumber}");
//                 throw;
//             }
//         }

//         public async Task<PaymentEditDataDTO> GetPaymentEditDataAsync(Guid paymentId, Guid companyId, Guid fiscalYearId, Guid userId)
//         {
//             try
//             {
//                 _logger.LogInformation("GetPaymentEditDataAsync called for Payment ID: {PaymentId}, Company: {CompanyId}, FiscalYear: {FiscalYearId}",
//                     paymentId, companyId, fiscalYearId);

//                 // Get company information
//                 var company = await _context.Companies
//                     .Where(c => c.Id == companyId)
//                     .Select(c => new CompanyInfoDTO
//                     {
//                         Id = c.Id,
//                         Name = c.Name,
//                         Address = c.Address,
//                         City = c.City,
//                         Phone = c.Phone,
//                         Pan = c.Pan,
//                         RenewalDate = c.RenewalDate,
//                         DateFormat = c.DateFormat.ToString(),
//                         VatEnabled = c.VatEnabled,
//                     })
//                     .FirstOrDefaultAsync();

//                 if (company == null)
//                     throw new ArgumentException("Company not found");

//                 // Determine if company uses Nepali date format
//                 bool isNepaliFormat = company.DateFormat?.ToLower() == "nepali";

//                 _logger.LogInformation("Company date format: {DateFormat}, IsNepaliFormat: {IsNepaliFormat}",
//                     company.DateFormat, isNepaliFormat);

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
//                         IsActive = f.IsActive,
//                     })
//                     .FirstOrDefaultAsync();

//                 if (currentFiscalYear == null)
//                     throw new ArgumentException("Fiscal year not found");

//                 // Get company date format
//                 string companyDateFormat = company.DateFormat?.ToLower() ?? "english";

//                 // Get today's date
//                 var today = DateTime.UtcNow;
//                 var nepaliDate = today.ToString("yyyy-MM-dd");

//                 // Fetch payment with all related data
//                 var payment = await _context.Payments
//                     .Include(p => p.Account)
//                     .Include(p => p.PaymentAccount)
//                     .Include(p => p.User)
//                     .FirstOrDefaultAsync(p => p.Id == paymentId &&
//                                              p.CompanyId == companyId &&
//                                              p.FiscalYearId == fiscalYearId);

//                 if (payment == null)
//                     throw new ArgumentException("Payment voucher not found or does not belong to the selected company/fiscal year");

//                 // Get account groups to include/exclude
//                 var groupsToInclude = await _context.AccountGroups
//                     .Where(ag => ag.CompanyId == companyId &&
//                            (ag.Name == "Cash in Hand" || ag.Name == "Bank Accounts" || ag.Name == "Bank O/D Account"))
//                     .Select(ag => ag.Id)
//                     .ToListAsync();

//                 // Get groups to exclude from regular accounts list
//                 var groupsToExclude = groupsToInclude;

//                 // Fetch cash accounts (Cash in Hand group)
//                 var cashAccounts = await _context.Accounts
//                     .Where(a => a.CompanyId == companyId &&
//                            a.IsActive &&
//                            a.OriginalFiscalYearId == fiscalYearId &&
//                            groupsToInclude.Contains(a.AccountGroupsId) &&
//                            _context.AccountGroups.Any(ag => ag.Id == a.AccountGroupsId && ag.Name == "Cash in Hand"))
//                     .Select(a => new AccountInfoDTO
//                     {
//                         Id = a.Id,
//                         Name = a.Name,
//                         UniqueNumber = a.UniqueNumber,
//                         Address = a.Address,
//                         Phone = a.Phone,
//                         Pan = a.Pan,
//                     })
//                     .ToListAsync();

//                 // Fetch bank accounts (Bank Accounts and Bank O/D Account groups)
//                 var bankAccounts = await _context.Accounts
//                     .Where(a => a.CompanyId == companyId &&
//                            a.IsActive &&
//                            a.OriginalFiscalYearId == fiscalYearId &&
//                            groupsToInclude.Contains(a.AccountGroupsId) &&
//                            _context.AccountGroups.Any(ag => ag.Id == a.AccountGroupsId &&
//                                (ag.Name == "Bank Accounts" || ag.Name == "Bank O/D Account")))
//                     .Select(a => new AccountInfoDTO
//                     {
//                         Id = a.Id,
//                         Name = a.Name,
//                         UniqueNumber = a.UniqueNumber,
//                         Address = a.Address,
//                         Phone = a.Phone,
//                         Pan = a.Pan,
//                     })
//                     .ToListAsync();

//                 // Combine cash and bank accounts for payment accounts dropdown
//                 var paymentAccounts = cashAccounts.Concat(bankAccounts).ToList();

//                 // Fetch regular accounts (excluding cash and bank accounts)
//                 var accounts = await _context.Accounts
//                     .Where(a => a.CompanyId == companyId &&
//                            a.IsActive &&
//                            a.OriginalFiscalYearId == fiscalYearId &&
//                            !groupsToExclude.Contains(a.AccountGroupsId))
//                     .Select(a => new AccountInfoDTO
//                     {
//                         Id = a.Id,
//                         Name = a.Name,
//                         UniqueNumber = a.UniqueNumber,
//                         Address = a.Address,
//                         Phone = a.Phone,
//                         Pan = a.Pan,
//                     })
//                     .ToListAsync();

//                 // Get user with roles
//                 var user = await _context.Users
//                     .Include(u => u.UserRoles)
//                         .ThenInclude(ur => ur.Role)
//                     .FirstOrDefaultAsync(u => u.Id == userId);

//                 bool isAdmin = user?.IsAdmin ?? false;
//                 string userRole = "User";

//                 if (isAdmin)
//                 {
//                     userRole = "Admin";
//                 }
//                 else if (user?.UserRoles != null)
//                 {
//                     var primaryRole = user.UserRoles.FirstOrDefault(ur => ur.IsPrimary);
//                     if (primaryRole?.Role != null)
//                     {
//                         userRole = primaryRole.Role.Name;
//                     }
//                 }

//                 bool isAdminOrSupervisor = isAdmin || userRole == "Supervisor";

//                 // Create user info DTO
//                 var userInfo = new UserEditInfoDTO
//                 {
//                     Id = user.Id,
//                     Name = user.Name,
//                     Email = user.Email,
//                     IsAdmin = isAdmin,
//                     Role = userRole,
//                     Preferences = new UserPreferencesDTO
//                     {
//                         Theme = user?.Preferences?.Theme.ToString() ?? "light"
//                     }
//                 };

//                 // Map payment to edit DTO
//                 var paymentDto = MapToPaymentEditDTO(payment, companyDateFormat);

//                 // Create response
//                 var response = new PaymentEditDataDTO
//                 {
//                     Company = company,
//                     Payment = paymentDto,
//                     Accounts = accounts,
//                     CashAccounts = cashAccounts,
//                     BankAccounts = bankAccounts,
//                     PaymentAccounts = paymentAccounts,
//                     CurrentFiscalYear = currentFiscalYear,
//                     NepaliDate = nepaliDate,
//                     CompanyDateFormat = companyDateFormat,
//                     CurrentCompanyName = company.Name,
//                     CurrentDate = today,
//                     User = userInfo,
//                     IsAdminOrSupervisor = isAdminOrSupervisor
//                 };

//                 _logger.LogInformation("Successfully retrieved payment edit data for Payment ID: {PaymentId}", paymentId);

//                 return response;
//             }
//             catch (Exception ex)
//             {
//                 _logger.LogError(ex, "Error getting payment edit data for Payment ID: {PaymentId}", paymentId);
//                 throw;
//             }
//         }

//         private PaymentEditDTO MapToPaymentEditDTO(Payment payment, string companyDateFormat)
//         {
//             bool isNepaliFormat = companyDateFormat?.ToLower() == "nepali";

//             return new PaymentEditDTO
//             {
//                 Id = payment.Id,
//                 BillNumber = payment.BillNumber,
//                 Date = isNepaliFormat ? payment.NepaliDate : payment.Date,
//                 NepaliDate = payment.NepaliDate,
//                 AccountId = payment.AccountId ?? Guid.Empty,
//                 AccountName = payment.Account?.Name ?? string.Empty,
//                 Debit = payment.Debit,
//                 PaymentAccountId = payment.PaymentAccountId ?? Guid.Empty,
//                 PaymentAccountName = payment.PaymentAccount?.Name ?? string.Empty,
//                 InstType = payment.InstType.ToString(),
//                 InstNo = payment.InstNo,
//                 Description = payment.Description,
//                 UserName = payment.User?.Name ?? string.Empty,
//                 Status = payment.Status.ToString(),
//                 CreatedAt = payment.CreatedAt,
//                 UpdatedAt = payment.UpdatedAt
//             };
//         }

//         public async Task<Payment> UpdatePaymentAsync(Guid id, UpdatePaymentDTO dto, Guid companyId, Guid fiscalYearId, Guid userId)
//         {
//             // Use execution strategy for transaction handling
//             var executionStrategy = _context.Database.CreateExecutionStrategy();

//             return await executionStrategy.ExecuteAsync(async () =>
//             {
//                 using var transaction = await _context.Database.BeginTransactionAsync();

//                 try
//                 {
//                     _logger.LogInformation("=== Starting UpdatePaymentAsync for Payment ID: {PaymentId} ===", id);

//                     // Validate required fields
//                     if (dto.AccountId == Guid.Empty)
//                         throw new ArgumentException("Account ID is required");

//                     if (dto.PaymentAccountId == Guid.Empty)
//                         throw new ArgumentException("Payment account ID is required");

//                     if (dto.Debit <= 0)
//                         throw new ArgumentException("Debit amount must be greater than 0");

//                     // Get the existing payment
//                     var existingPayment = await _context.Payments
//                         .FirstOrDefaultAsync(p => p.Id == id && p.CompanyId == companyId);

//                     if (existingPayment == null)
//                         throw new ArgumentException("Payment voucher not found");

//                     // Get company to check date format
//                     var company = await _context.Companies.FindAsync(companyId);
//                     if (company == null)
//                         throw new ArgumentException("Company not found");

//                     var fiscalYear = await _context.FiscalYears
//                         .FirstOrDefaultAsync(f => f.Id == fiscalYearId && f.CompanyId == companyId);

//                     if (fiscalYear == null)
//                         throw new ArgumentException("Fiscal year not found");

//                     // Verify accounts exist and belong to company
//                     var debitedAccount = await _context.Accounts
//                         .FirstOrDefaultAsync(a => a.Id == dto.AccountId && a.CompanyId == companyId);

//                     if (debitedAccount == null)
//                         throw new ArgumentException("Debited account not found.");

//                     var creditAccount = await _context.Accounts
//                         .FirstOrDefaultAsync(a => a.Id == dto.PaymentAccountId && a.CompanyId == companyId);

//                     if (creditAccount == null)
//                         throw new ArgumentException("Payment account not found.");

//                     // Get payment mode
//                     var paymentMode = ParsePaymentMode(dto.PaymentMode);

//                     // STEP 1: Delete existing transactions for this payment
//                     var existingTransactions = await _context.Transactions
//                         .Where(t => t.PaymentAccountId == id)
//                         .ToListAsync();

//                     if (existingTransactions.Any())
//                     {
//                         _context.Transactions.RemoveRange(existingTransactions);
//                         _logger.LogInformation("Deleted {Count} existing transactions", existingTransactions.Count);
//                     }

//                     // Save changes after deletions
//                     await _context.SaveChangesAsync();

//                     // STEP 2: UPDATE PAYMENT PROPERTIES
//                     existingPayment.AccountId = dto.AccountId;
//                     existingPayment.PaymentAccountId = dto.PaymentAccountId;
//                     existingPayment.Debit = dto.Debit;
//                     existingPayment.InstType = dto.InstType;
//                     existingPayment.InstNo = dto.InstNo ?? string.Empty;
//                     existingPayment.Description = dto.Description;
//                     existingPayment.NepaliDate = dto.NepaliDate;
//                     existingPayment.Date = dto.Date;
//                     existingPayment.UpdatedAt = DateTime.UtcNow;

//                     // Update the payment
//                     _context.Payments.Update(existingPayment);
//                     await _context.SaveChangesAsync();

//                     // Get previous balances for accounts
//                     decimal previousDebitBalance = 0;
//                     var lastDebitTransaction = await _context.Transactions
//                         .Where(t => t.AccountId == dto.AccountId)
//                         .OrderByDescending(t => t.CreatedAt)
//                         .FirstOrDefaultAsync();

//                     if (lastDebitTransaction != null)
//                         previousDebitBalance = lastDebitTransaction.Balance ?? 0;

//                     decimal previousCreditBalance = 0;
//                     var lastCreditTransaction = await _context.Transactions
//                         .Where(t => t.AccountId == dto.PaymentAccountId)
//                         .OrderByDescending(t => t.CreatedAt)
//                         .FirstOrDefaultAsync();

//                     if (lastCreditTransaction != null)
//                         previousCreditBalance = lastCreditTransaction.Balance ?? 0;

//                     // STEP 3: CREATE NEW TRANSACTIONS

//                     // Create debit transaction
//                     var debitTransaction = new Transaction
//                     {
//                         Id = Guid.NewGuid(),
//                         AccountId = dto.AccountId,
//                         PaymentAccountId = existingPayment.Id,
//                         Type = TransactionType.Pymt,
//                         DrCrNoteAccountTypes = "Debit",
//                         BillNumber = existingPayment.BillNumber,
//                         AccountTypeId = dto.PaymentAccountId,
//                         InstType = (Models.Retailer.TransactionModel.InstrumentType)(int)dto.InstType,
//                         InstNo = dto.InstNo,
//                         Debit = dto.Debit,
//                         Credit = 0,
//                         PaymentReceiptType = "Payment",
//                         PaymentMode = PaymentMode.Payment,
//                         Balance = previousDebitBalance + dto.Debit,
//                         Date = existingPayment.Date,
//                         nepaliDate = existingPayment.NepaliDate,
//                         IsActive = true,
//                         CompanyId = companyId,
//                         FiscalYearId = fiscalYearId,
//                         CreatedAt = DateTime.UtcNow
//                     };

//                     await _context.Transactions.AddAsync(debitTransaction);

//                     // Create credit transaction
//                     var creditTransaction = new Transaction
//                     {
//                         Id = Guid.NewGuid(),
//                         AccountId = dto.PaymentAccountId,
//                         PaymentAccountId = existingPayment.Id,
//                         Type = TransactionType.Pymt,
//                         DrCrNoteAccountTypes = "Credit",
//                         BillNumber = existingPayment.BillNumber,
//                         AccountTypeId = dto.AccountId,
//                         InstType = (Models.Retailer.TransactionModel.InstrumentType)(int)dto.InstType,
//                         InstNo = dto.InstNo,
//                         Debit = 0,
//                         Credit = dto.Debit,
//                         PaymentReceiptType = "Payment",
//                         PaymentMode = PaymentMode.Payment,
//                         Balance = previousCreditBalance - dto.Debit,
//                         Date = existingPayment.Date,
//                         nepaliDate = existingPayment.NepaliDate,
//                         IsActive = true,
//                         CompanyId = companyId,
//                         FiscalYearId = fiscalYearId,
//                         CreatedAt = DateTime.UtcNow
//                     };

//                     await _context.Transactions.AddAsync(creditTransaction);

//                     // Save all changes
//                     var saveResult = await _context.SaveChangesAsync();
//                     _logger.LogInformation("SaveChangesAsync completed. {RowCount} rows affected.", saveResult);

//                     await transaction.CommitAsync();
//                     _logger.LogInformation("Transaction committed successfully");

//                     _logger.LogInformation("=== Successfully updated payment: {PaymentId} ===", id);

//                     return existingPayment;
//                 }
//                 catch (Exception ex)
//                 {
//                     _logger.LogError(ex, "Error updating payment: {PaymentId}", id);
//                     await transaction.RollbackAsync();
//                     throw;
//                 }
//             });
//         }

//         public async Task<PaymentsRegisterDataDTO> GetPaymentsRegisterAsync(Guid companyId, Guid fiscalYearId, string? fromDate = null, string? toDate = null)
//         {
//             try
//             {
//                 _logger.LogInformation("GetPaymentsRegisterAsync called with companyId: {CompanyId}, fiscalYearId: {FiscalYearId}, fromDate: {FromDate}, toDate: {ToDate}",
//                     companyId, fiscalYearId, fromDate, toDate);

//                 // Get company information including date format
//                 var company = await _context.Companies
//                     .Where(c => c.Id == companyId)
//                     .Select(c => new CompanyInfoDTO
//                     {
//                         Id = c.Id,
//                         Name = c.Name,
//                         Address = c.Address,
//                         City = c.City,
//                         Phone = c.Phone,
//                         Pan = c.Pan,
//                         RenewalDate = c.RenewalDate,
//                         DateFormat = c.DateFormat.ToString(),
//                         VatEnabled = c.VatEnabled,
//                     })
//                     .FirstOrDefaultAsync();

//                 if (company == null)
//                     throw new ArgumentException("Company not found");

//                 // Get today's date in Nepali format
//                 var today = DateTime.UtcNow;
//                 var nepaliDate = today.ToString("yyyy-MM-dd"); // You might want to use a proper Nepali date converter here

//                 // Determine if company uses Nepali date format
//                 bool isNepaliFormat = company.DateFormat?.ToLower() == "nepali";

//                 _logger.LogInformation("Company date format: {DateFormat}, IsNepaliFormat: {IsNepaliFormat}",
//                     company.DateFormat, isNepaliFormat);

//                 // Get fiscal year
//                 var fiscalYear = await _context.FiscalYears
//                     .Where(f => f.Id == fiscalYearId && f.CompanyId == companyId)
//                     .Select(f => new FiscalYearDTO
//                     {
//                         Id = f.Id,
//                         Name = f.Name,
//                         StartDate = f.StartDate,
//                         EndDate = f.EndDate,
//                         StartDateNepali = f.StartDateNepali,
//                         EndDateNepali = f.EndDateNepali,
//                         IsActive = f.IsActive,
//                     })
//                     .FirstOrDefaultAsync();

//                 // If no date range provided, return basic info with empty payments list
//                 if (string.IsNullOrEmpty(fromDate) || string.IsNullOrEmpty(toDate))
//                 {
//                     _logger.LogInformation("No date range provided, returning basic info with empty payments list");
//                     return new PaymentsRegisterDataDTO
//                     {
//                         Company = company,
//                         CurrentFiscalYear = fiscalYear,
//                         Payments = new List<PaymentResponseItemDTO>(),
//                         FromDate = fromDate,
//                         ToDate = toDate,
//                         CurrentCompanyName = company.Name,
//                         CompanyDateFormat = company.DateFormat,
//                         NepaliDate = nepaliDate,
//                         UserPreferences = new UserPreferencesDTO { Theme = "light" }
//                     };
//                 }

//                 // Parse dates based on company format
//                 DateTime startDateTime;
//                 DateTime endDateTime;

//                 if (isNepaliFormat)
//                 {
//                     // For Nepali dates, parse to DateTime
//                     if (!DateTime.TryParse(fromDate, out startDateTime))
//                     {
//                         _logger.LogWarning("Invalid fromDate format for Nepali date: {FromDate}", fromDate);
//                         startDateTime = DateTime.MinValue;
//                     }

//                     if (!DateTime.TryParse(toDate, out endDateTime))
//                     {
//                         _logger.LogWarning("Invalid toDate format for Nepali date: {ToDate}", toDate);
//                         endDateTime = DateTime.MaxValue;
//                     }
//                 }
//                 else
//                 {
//                     // For English dates, parse normally
//                     if (!DateTime.TryParse(fromDate, out startDateTime))
//                     {
//                         _logger.LogWarning("Invalid fromDate format: {FromDate}", fromDate);
//                         startDateTime = DateTime.MinValue;
//                     }

//                     if (!DateTime.TryParse(toDate, out endDateTime))
//                     {
//                         _logger.LogWarning("Invalid toDate format: {ToDate}", toDate);
//                         endDateTime = DateTime.MaxValue;
//                     }
//                 }

//                 // Set end date to end of day
//                 endDateTime = endDateTime.Date.AddDays(1).AddTicks(-1);

//                 _logger.LogInformation("Searching for payments between {StartDate} and {EndDate} using {DateFormat} format",
//                     startDateTime, endDateTime, isNepaliFormat ? "Nepali" : "English");

//                 // Build query with date filter based on company date format
//                 var query = _context.Payments
//                     .Include(p => p.Account)
//                     .Include(p => p.PaymentAccount)
//                     .Include(p => p.User)
//                     .Include(p => p.Company)
//                     .Include(p => p.FiscalYear)
//                     .Where(p => p.CompanyId == companyId &&
//                                p.FiscalYearId == fiscalYearId);

//                 // Apply date filter based on company's date format
//                 if (isNepaliFormat)
//                 {
//                     // Use NepaliDate field for filtering
//                     query = query.Where(p => p.NepaliDate >= startDateTime && p.NepaliDate <= endDateTime);
//                     _logger.LogInformation("Using NepaliDate field for filtering");
//                 }
//                 else
//                 {
//                     // Use Date field for filtering
//                     query = query.Where(p => p.Date >= startDateTime && p.Date <= endDateTime);
//                     _logger.LogInformation("Using Date field for filtering");
//                 }

//                 // Log the SQL query (optional - for debugging)
//                 var sql = query.ToQueryString();
//                 _logger.LogDebug("SQL Query: {Sql}", sql);

//                 // Get payments ordered by date and bill number
//                 var payments = await query
//                     .OrderBy(p => p.Date)
//                     .ThenBy(p => p.BillNumber)
//                     .ToListAsync();

//                 _logger.LogInformation("Found {Count} payments matching the criteria", payments.Count);

//                 // If no payments found, log sample of all payments to debug
//                 if (payments.Count == 0)
//                 {
//                     var samplePayments = await _context.Payments
//                         .Where(p => p.CompanyId == companyId)
//                         .OrderByDescending(p => p.Date)
//                         .Take(5)
//                         .Select(p => new { p.Id, p.BillNumber, p.Date, p.NepaliDate })
//                         .ToListAsync();

//                     _logger.LogInformation("Sample of recent payments (Date vs NepaliDate): {SamplePayments}",
//                         string.Join(", ", samplePayments.Select(p => $"{p.BillNumber} - Date: {p.Date}, NepaliDate: {p.NepaliDate}")));
//                 }

//                 // Map to response DTOs
//                 var paymentDtos = payments.Select(payment => MapToResponseItemDTO(payment, company.DateFormat)).ToList();

//                 return new PaymentsRegisterDataDTO
//                 {
//                     Company = company,
//                     CurrentFiscalYear = fiscalYear,
//                     Payments = paymentDtos,
//                     FromDate = fromDate,
//                     ToDate = toDate,
//                     CurrentCompanyName = company.Name,
//                     CompanyDateFormat = company.DateFormat,
//                     NepaliDate = nepaliDate,
//                     UserPreferences = new UserPreferencesDTO { Theme = "light" }
//                 };
//             }
//             catch (Exception ex)
//             {
//                 _logger.LogError(ex, "Error getting payments register for company {CompanyId}", companyId);
//                 throw;
//             }
//         }

//         public async Task<PaymentEntryDataDTO> GetPaymentEntryDataAsync(Guid companyId, Guid fiscalYearId, Guid userId)
//         {
//             try
//             {
//                 _logger.LogInformation("GetPaymentEntryDataAsync called with companyId: {CompanyId}, fiscalYearId: {FiscalYearId}, userId: {UserId}",
//                     companyId, fiscalYearId, userId);

//                 // Get company information
//                 var company = await _context.Companies
//                     .Where(c => c.Id == companyId)
//                     .Select(c => new CompanyInfoDTO
//                     {
//                         Id = c.Id,
//                         Name = c.Name,
//                         Address = c.Address,
//                         City = c.City,
//                         Phone = c.Phone,
//                         Pan = c.Pan,
//                         RenewalDate = c.RenewalDate,
//                         DateFormat = c.DateFormat.ToString(),
//                         VatEnabled = c.VatEnabled
//                     })
//                     .FirstOrDefaultAsync();

//                 if (company == null)
//                     throw new ArgumentException("Company not found");

//                 // Get fiscal year
//                 var fiscalYear = await _context.FiscalYears
//                     .Where(f => f.Id == fiscalYearId && f.CompanyId == companyId)
//                     .Select(f => new FiscalYearDTO
//                     {
//                         Id = f.Id,
//                         Name = f.Name,
//                         StartDate = f.StartDate,
//                         EndDate = f.EndDate,
//                         StartDateNepali = f.StartDateNepali,
//                         EndDateNepali = f.EndDateNepali,
//                         IsActive = f.IsActive
//                     })
//                     .FirstOrDefaultAsync();

//                 if (fiscalYear == null)
//                     throw new ArgumentException("Fiscal year not found");

//                 // Create the response matching PurchaseReturnEntryDataDTO pattern
//                 var data = new PaymentEntryDataDTO
//                 {
//                     Company = company,
//                     Dates = new DateInfoDTO
//                     {
//                         NepaliDate = DateTime.UtcNow.ToString("yyyy-MM-dd"),
//                         TransactionDateNepali = DateTime.UtcNow.ToString("yyyy-MM-dd"),
//                         CompanyDateFormat = company.DateFormat
//                     },
//                     CurrentFiscalYear = fiscalYear,
//                     UserPreferences = new UserPreferencesDTO { Theme = "light" },
//                     Permissions = new PermissionsDTO
//                     {
//                         IsAdminOrSupervisor = true,
//                         StoreManagementEnabled = false
//                     },
//                     CurrentCompanyName = company.Name
//                 };

//                 _logger.LogInformation("Successfully retrieved payment entry data for company {CompanyId}", companyId);
//                 return data;
//             }
//             catch (Exception ex)
//             {
//                 _logger.LogError(ex, "Error getting payment entry data for company {CompanyId}", companyId);
//                 throw;
//             }
//         }

//         private PaymentResponseItemDTO MapToResponseItemDTO(Payment payment, string companyDateFormat)
//         {
//             bool isNepaliFormat = companyDateFormat?.ToLower() == "nepali";

//             return new PaymentResponseItemDTO
//             {
//                 Id = payment.Id,
//                 BillNumber = payment.BillNumber,
//                 Date = isNepaliFormat ? payment.NepaliDate : payment.Date,
//                 NepaliDate = payment.NepaliDate,
//                 AccountId = payment.AccountId ?? Guid.Empty,
//                 AccountName = payment.Account?.Name ?? string.Empty,
//                 Debit = payment.Debit,
//                 Credit = payment.Credit,
//                 PaymentAccountId = payment.PaymentAccountId ?? Guid.Empty,
//                 PaymentAccountName = payment.PaymentAccount?.Name ?? string.Empty,
//                 InstType = payment.InstType.ToString(),
//                 InstNo = payment.InstNo,
//                 Description = payment.Description,
//                 UserName = payment.User?.Name ?? string.Empty,
//                 Status = payment.Status.ToString(),
//                 CreatedAt = payment.CreatedAt
//             };
//         }


//         public async Task<PaymentPrintDTO> GetPaymentForPrintAsync(Guid id, Guid companyId, Guid userId, Guid fiscalYearId)
//         {
//             try
//             {
//                 _logger.LogInformation("GetPaymentForPrintAsync called for Payment ID: {PaymentId}, Company: {CompanyId}", id, companyId);

//                 // Get company details
//                 var companyEntity = await _context.Companies
//                     .Where(c => c.Id == companyId)
//                     .FirstOrDefaultAsync();

//                 if (companyEntity == null)
//                     throw new ArgumentException("Company not found");

//                 // Parse renewal date
//                 DateTime? renewalDate = null;
//                 if (DateTime.TryParse(companyEntity.RenewalDate, out var parsedDate))
//                 {
//                     renewalDate = parsedDate;
//                 }

//                 // Create company DTO
//                 var company = new CompanyPrintDTO
//                 {
//                     Id = companyEntity.Id,
//                     RenewalDate = renewalDate,
//                     DateFormat = companyEntity.DateFormat.ToString(),
//                     FiscalYear = null
//                 };

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
//                         IsActive = f.IsActive
//                     })
//                     .FirstOrDefaultAsync();

//                 // Get current company info for display
//                 var currentCompany = await _context.Companies
//                     .Where(c => c.Id == companyId)
//                     .Select(c => new CompanyPrintInfoDTO
//                     {
//                         Id = c.Id,
//                         Name = c.Name,
//                         Phone = c.Phone,
//                         Pan = c.Pan,
//                         Address = c.Address,
//                     })
//                     .FirstOrDefaultAsync();

//                 // Get the payment with all related data
//                 var payment = await _context.Payments
//                     .Include(p => p.Account)
//                     .Include(p => p.PaymentAccount)
//                     .Include(p => p.User)
//                     .FirstOrDefaultAsync(p => p.Id == id && p.CompanyId == companyId);

//                 if (payment == null)
//                     throw new ArgumentException("Payment voucher not found");

//                 // Get related transactions
//                 var transactions = await _context.Transactions
//                     .Where(t => t.PaymentAccountId == id && t.Type == TransactionType.Pymt)
//                     .Include(t => t.Account)
//                     .OrderBy(t => t.CreatedAt)
//                     .Select(t => new TransactionPrintDTO
//                     {
//                         Id = t.Id,
//                         AccountId = t.AccountId ?? Guid.Empty,
//                         AccountName = t.Account != null ? t.Account.Name : string.Empty,
//                         DrCrNoteAccountTypes = t.DrCrNoteAccountTypes ?? string.Empty,
//                         Debit = t.Debit,
//                         Credit = t.Credit,
//                         Balance = t.Balance,
//                         Date = t.Date
//                     })
//                     .ToListAsync();

//                 // Calculate last balance for the account
//                 decimal? finalBalance = null;
//                 string balanceLabel = "";

//                 // Get the last transaction for this account
//                 if (payment.AccountId.HasValue)
//                 {
//                     var latestTransaction = await _context.Transactions
//                         .Where(t => t.CompanyId == companyId &&
//                                    t.AccountId == payment.AccountId)
//                         .OrderByDescending(t => t.CreatedAt)
//                         .FirstOrDefaultAsync();

//                     if (latestTransaction != null)
//                     {
//                         finalBalance = Math.Abs(latestTransaction.Balance ?? 0);
//                         if (latestTransaction.Debit > 0)
//                             balanceLabel = "Dr";
//                         else if (latestTransaction.Credit > 0)
//                             balanceLabel = "Cr";
//                     }

//                     // Get opening balance from account
//                     if (payment.Account != null && payment.Account.OpeningBalance != null)
//                     {
//                         var openingBalance = payment.Account.OpeningBalance;
//                         finalBalance = (finalBalance ?? 0) + (openingBalance.Type == "Dr" ? openingBalance.Amount : -openingBalance.Amount);
//                         balanceLabel = openingBalance.Type;
//                     }
//                 }

//                 // Get user with roles
//                 var user = await _context.Users
//                     .Include(u => u.UserRoles)
//                         .ThenInclude(ur => ur.Role)
//                     .FirstOrDefaultAsync(u => u.Id == userId);

//                 // Create user preferences DTO
//                 var userPreferences = new UserPreferencesDTO
//                 {
//                     Theme = user?.Preferences?.Theme.ToString() ?? "Light"
//                 };

//                 // Determine if user is admin or supervisor
//                 bool isAdminOrSupervisor = user?.IsAdmin == true ||
//                                           (user?.UserRoles?.Any(ur => ur.Role?.Name == "Supervisor" &&
//                                                                      (ur.ExpiresAt == null || ur.ExpiresAt > DateTime.UtcNow)) ?? false);

//                 // Get company date format
//                 bool isNepaliFormat = company.DateFormat?.ToLower() == "nepali";

//                 // Get today's Nepali date
//                 var today = DateTime.UtcNow;
//                 var nepaliDate = today.ToString("yyyy-MM-dd");

//                 // Map to response DTO
//                 var response = new PaymentPrintDTO
//                 {
//                     Company = company,
//                     CurrentFiscalYear = currentFiscalYear,
//                     Payment = new PaymentPrintPaymentDTO
//                     {
//                         Id = payment.Id,
//                         BillNumber = payment.BillNumber,
//                         Date = isNepaliFormat ? payment.NepaliDate : payment.Date,
//                         NepaliDate = payment.NepaliDate,
//                         Debit = payment.Debit,
//                         Description = payment.Description,
//                         InstNo = payment.InstNo,
//                         Status = payment.Status.ToString(),
//                         CreatedAt = payment.CreatedAt,
//                         UpdatedAt = payment.UpdatedAt,
//                         Account = payment.Account != null ? new AccountPrintDTO
//                         {
//                             Id = payment.Account.Id,
//                             Name = payment.Account.Name,
//                             Pan = payment.Account.Pan,
//                             Address = payment.Account.Address,
//                             Email = payment.Account.Email,
//                             Phone = payment.Account.Phone,
//                         } : null,
//                         PaymentAccount = payment.PaymentAccount != null ? new AccountPrintDTO
//                         {
//                             Id = payment.PaymentAccount.Id,
//                             Name = payment.PaymentAccount.Name,
//                             Pan = payment.PaymentAccount.Pan,
//                             Address = payment.PaymentAccount.Address,
//                             Email = payment.PaymentAccount.Email,
//                             Phone = payment.PaymentAccount.Phone
//                         } : null,
//                         User = payment.User != null ? new UserPrintDTO
//                         {
//                             Id = payment.User.Id,
//                             Name = payment.User.Name,
//                             IsAdmin = payment.User.IsAdmin,
//                             Role = payment.User.UserRoles?
//                                 .FirstOrDefault(ur => ur.IsPrimary)?.Role?.Name ?? "User"
//                         } : null
//                     },
//                     CurrentCompanyName = currentCompany?.Name ?? string.Empty,
//                     CurrentCompany = currentCompany ?? new CompanyPrintInfoDTO(),
//                     LastBalance = finalBalance,
//                     BalanceLabel = balanceLabel,
//                     NepaliDate = nepaliDate,
//                     EnglishDate = today,
//                     CompanyDateFormat = company.DateFormat?.ToLower() ?? "english",
//                     User = new UserPrintDTO
//                     {
//                         Id = userId,
//                         Name = user?.Name ?? string.Empty,
//                         IsAdmin = user?.IsAdmin ?? false,
//                         Role = user?.UserRoles?
//                             .FirstOrDefault(ur => ur.IsPrimary)?.Role?.Name ??
//                                (user?.IsAdmin == true ? "Admin" : "User"),
//                         Preferences = userPreferences
//                     },
//                     IsAdminOrSupervisor = isAdminOrSupervisor,
//                     Transactions = transactions
//                 };

//                 return response;
//             }
//             catch (Exception ex)
//             {
//                 _logger.LogError(ex, "Error getting payment for print: {PaymentId}", id);
//                 throw;
//             }
//         }

//     }
// }


//-------------------------------------------------------------end

using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Dto.RetailerDto.PaymentDto;
using SkyForge.Dto.AccountDto;
using SkyForge.Models.Retailer.PaymentModel;
using SkyForge.Services.BillNumberServices;
using SkyForge.Models.Retailer.TransactionModel;
using SkyForge.Dto.RetailerDto;

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
                    var billNumber = await _billNumberService.GetNextBillNumberAsync(companyId, fiscalYearId, "payment");

                    // Create payment master record
                    var payment = new Payment
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
                        Status = PaymentStatus.Active,
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    };

                    await _context.Payments.AddAsync(payment);

                    // Create payment entries and transactions
                    var transactions = new List<Transaction>();

                    foreach (var entryDto in dto.Entries)
                    {
                        // Create payment entry
                        var paymentEntry = new PaymentEntry
                        {
                            Id = Guid.NewGuid(),
                            PaymentId = payment.Id,
                            AccountId = entryDto.AccountId,
                            EntryType = entryDto.EntryType,
                            Amount = entryDto.Amount,
                            Description = entryDto.Description,
                            InstType = entryDto.InstType,
                            BankAcc = entryDto.BankAcc,
                            InstNo = entryDto.InstNo,
                            ReferenceNumber = entryDto.ReferenceNumber,
                            CreatedAt = DateTime.UtcNow
                        };

                        await _context.PaymentEntries.AddAsync(paymentEntry);

                        // Create corresponding transaction
                        var paymentTransaction = new Transaction
                        {
                            Id = Guid.NewGuid(),
                            PaymentAccountId = payment.Id,
                            AccountId = entryDto.AccountId,
                            Type = TransactionType.Pymt,
                            DrCrNoteAccountTypes = entryDto.EntryType,
                            BillNumber = billNumber,
                            InstType = entryDto.InstType.HasValue
                                ? (Models.Retailer.TransactionModel.InstrumentType)(int)entryDto.InstType.Value
                                : Models.Retailer.TransactionModel.InstrumentType.NA,
                            InstNo = entryDto.InstNo,
                            BankAcc = entryDto.BankAcc,
                            Debit = entryDto.EntryType == "Debit" ? entryDto.Amount : 0,
                            Credit = entryDto.EntryType == "Credit" ? entryDto.Amount : 0,
                            PaymentMode = PaymentMode.Payment,
                            PaymentReceiptType = entryDto.EntryType == "Debit" ? "Payment" : "Receipt",
                            Date = payment.Date,
                            nepaliDate = payment.NepaliDate,
                            IsActive = true,
                            CompanyId = companyId,
                            FiscalYearId = fiscalYearId,
                            CreatedAt = DateTime.UtcNow
                        };

                        transactions.Add(paymentTransaction);
                    }

                    await _context.Transactions.AddRangeAsync(transactions);
                    await _context.SaveChangesAsync();

                    await transaction.CommitAsync();

                    _logger.LogInformation("Payment created successfully. ID: {PaymentId}, BillNumber: {BillNumber}, Total: {TotalAmount}",
                        payment.Id, payment.BillNumber, payment.TotalAmount);

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

                    decimal totalDebit = dto.Entries.Where(e => e.EntryType == "Debit").Sum(e => e.Amount);
                    decimal totalCredit = dto.Entries.Where(e => e.EntryType == "Credit").Sum(e => e.Amount);

                    if (totalDebit != totalCredit)
                        throw new ArgumentException($"Total Debit ({totalDebit}) must equal Total Credit ({totalCredit})");

                    var existingPayment = await _context.Payments
                        .Include(p => p.PaymentEntries)
                        .FirstOrDefaultAsync(p => p.Id == id && p.CompanyId == companyId);

                    if (existingPayment == null)
                        throw new ArgumentException("Payment voucher not found");

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

                    // Delete existing transactions
                    var existingTransactions = await _context.Transactions
                        .Where(t => t.PaymentAccountId == id)
                        .ToListAsync();

                    if (existingTransactions.Any())
                    {
                        _context.Transactions.RemoveRange(existingTransactions);
                        _logger.LogInformation("Deleted {Count} existing transactions", existingTransactions.Count);
                    }

                    // Delete existing entries
                    if (existingPayment.PaymentEntries.Any())
                    {
                        _context.PaymentEntries.RemoveRange(existingPayment.PaymentEntries);
                        _logger.LogInformation("Deleted {Count} existing entries", existingPayment.PaymentEntries.Count);
                    }

                    await _context.SaveChangesAsync();

                    // Update payment properties
                    existingPayment.TotalAmount = totalDebit;
                    existingPayment.Description = dto.Description;
                    existingPayment.NepaliDate = dto.NepaliDate;
                    existingPayment.Date = dto.Date;
                    existingPayment.UpdatedAt = DateTime.UtcNow;

                    _context.Payments.Update(existingPayment);
                    await _context.SaveChangesAsync();

                    // Create new entries and transactions
                    var newEntries = new List<PaymentEntry>();
                    var newTransactions = new List<Transaction>();

                    foreach (var entryDto in dto.Entries)
                    {
                        var paymentEntry = new PaymentEntry
                        {
                            Id = Guid.NewGuid(),
                            PaymentId = existingPayment.Id,
                            AccountId = entryDto.AccountId,
                            EntryType = entryDto.EntryType,
                            Amount = entryDto.Amount,
                            Description = entryDto.Description,
                            InstType = entryDto.InstType,
                            BankAcc = entryDto.BankAcc,
                            InstNo = entryDto.InstNo,
                            ReferenceNumber = entryDto.ReferenceNumber,
                            CreatedAt = DateTime.UtcNow
                        };

                        newEntries.Add(paymentEntry);

                        decimal previousBalance = 0;
                        var lastTransaction = await _context.Transactions
                            .Where(t => t.AccountId == entryDto.AccountId && t.CompanyId == companyId)
                            .OrderByDescending(t => t.CreatedAt)
                            .FirstOrDefaultAsync();

                        if (lastTransaction != null)
                            previousBalance = lastTransaction.Balance ?? 0;

                        decimal newBalance = entryDto.EntryType == "Debit"
                            ? previousBalance + entryDto.Amount
                            : previousBalance - entryDto.Amount;

                        var paymentTransaction = new Transaction
                        {
                            Id = Guid.NewGuid(),
                            PaymentAccountId = existingPayment.Id,
                            AccountId = entryDto.AccountId,
                            Type = TransactionType.Pymt,
                            DrCrNoteAccountTypes = entryDto.EntryType,
                            BillNumber = existingPayment.BillNumber,
                            InstType = entryDto.InstType.HasValue
                                ? (Models.Retailer.TransactionModel.InstrumentType)(int)entryDto.InstType.Value
                                : Models.Retailer.TransactionModel.InstrumentType.NA,
                            InstNo = entryDto.InstNo,
                            BankAcc = entryDto.BankAcc,
                            Debit = entryDto.EntryType == "Debit" ? entryDto.Amount : 0,
                            Credit = entryDto.EntryType == "Credit" ? entryDto.Amount : 0,
                            PaymentMode = PaymentMode.Payment,
                            PaymentReceiptType = entryDto.EntryType == "Debit" ? "Payment" : "Receipt",
                            Balance = newBalance,
                            Date = existingPayment.Date,
                            nepaliDate = existingPayment.NepaliDate,
                            IsActive = true,
                            CompanyId = companyId,
                            FiscalYearId = fiscalYearId,
                            CreatedAt = DateTime.UtcNow
                        };

                        newTransactions.Add(paymentTransaction);
                    }

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
            var debitTotal = entries.Where(e => e.EntryType == "Debit").Sum(e => e.Amount);
            var creditTotal = entries.Where(e => e.EntryType == "Credit").Sum(e => e.Amount);

            var debitAccountNames = entries.Where(e => e.EntryType == "Debit")
                .Select(e => e.Account?.Name ?? string.Empty)
                .ToList();
            var creditAccountNames = entries.Where(e => e.EntryType == "Credit")
                .Select(e => e.Account?.Name ?? string.Empty)
                .ToList();

            return new PaymentResponseItemDTO
            {
                Id = payment.Id,
                BillNumber = payment.BillNumber,
                Date = isNepaliFormat ? payment.NepaliDate : payment.Date,
                NepaliDate = payment.NepaliDate,
                AccountId = entries.FirstOrDefault(e => e.EntryType == "Credit")?.AccountId ?? Guid.Empty,
                AccountName = string.Join(", ", creditAccountNames),
                // AccountUniqueNumber = entries.FirstOrDefault(e => e.EntryType == "Credit")?.Account?.UniqueNumber ?? string.Empty,
                Debit = debitTotal,
                Credit = creditTotal,
                PaymentAccountId = entries.FirstOrDefault(e => e.EntryType == "Debit")?.AccountId ?? Guid.Empty,
                PaymentAccountName = string.Join(", ", debitAccountNames),
                InstType = entries.FirstOrDefault(e => e.EntryType == "Credit" && e.InstType.HasValue)?.InstType?.ToString() ?? "NA",
                InstNo = entries.FirstOrDefault(e => e.EntryType == "Credit")?.InstNo,
                BankAcc = entries.FirstOrDefault(e => e.EntryType == "Credit")?.BankAcc,
                Description = payment.Description,
                UserName = payment.User?.Name ?? string.Empty,
                Status = payment.Status.ToString(),
                CreatedAt = payment.CreatedAt
            };
        }

        public async Task<PaymentPrintDTO> GetPaymentForPrintAsync(Guid id, Guid companyId, Guid userId, Guid fiscalYearId)
        {
            try
            {
                _logger.LogInformation("GetPaymentForPrintAsync called for Payment ID: {PaymentId}", id);

                var companyEntity = await _context.Companies
                    .FirstOrDefaultAsync(c => c.Id == companyId);

                if (companyEntity == null)
                    throw new ArgumentException("Company not found");

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
                        IsActive = f.IsActive
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

                var response = new PaymentPrintDTO
                {
                    Company = new CompanyPrintDTO
                    {
                        Id = companyEntity.Id,
                        DateFormat = companyEntity.DateFormat.ToString(),
                        FiscalYear = null
                    },
                    CurrentFiscalYear = currentFiscalYear,
                    Payment = new PaymentPrintPaymentDTO
                    {
                        Id = payment.Id,
                        BillNumber = payment.BillNumber,
                        Date = payment.Date,
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
                    NepaliDate = DateTime.UtcNow.ToString("yyyy-MM-dd"),
                    EnglishDate = DateTime.UtcNow,
                    CompanyDateFormat = companyEntity.DateFormat?.ToString().ToLower() ?? "english",
                    User = new UserPrintDTO
                    {
                        Id = userId,
                        Name = user?.Name ?? string.Empty,
                        IsAdmin = user?.IsAdmin ?? false,
                        Role = user?.UserRoles?.FirstOrDefault(ur => ur.IsPrimary)?.Role?.Name ?? "User"
                    },
                    IsAdminOrSupervisor = isAdminOrSupervisor
                };

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