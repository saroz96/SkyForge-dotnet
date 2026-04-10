// Services/Retailer/StatementServices/StatementService.cs
using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Dto.RetailerDto.TransactionDto;
using SkyForge.Models.Retailer.TransactionModel;
using SkyForge.Models.AccountModel;
using System.Text.Json;

namespace SkyForge.Services.Retailer.StatementServices
{
    public class StatementService : IStatementService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<StatementService> _logger;

        public StatementService(
            ApplicationDbContext context,
            ILogger<StatementService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<StatementResponseDTO> GetStatementAsync(
            Guid companyId,
            Guid fiscalYearId,
            Guid userId,
            StatementRequestDTO request)
        {
            try
            {
                _logger.LogInformation("GetStatementAsync called for Company: {CompanyId}, Account: {AccountId}",
                    companyId, request.AccountId);

                // Get company details
                var company = await _context.Companies
                    .Where(c => c.Id == companyId)
                    .Select(c => new CompanyStatementDTO
                    {
                        Id = c.Id,
                        DateFormat = c.DateFormat.ToString(),
                        Address = c.Address ?? string.Empty,
                        Ward = c.Ward,
                        Pan = c.Pan ?? string.Empty,
                        City = c.City ?? string.Empty,
                        Country = c.Country ?? string.Empty,
                        Email = c.Email ?? string.Empty,
                        Phone = c.Phone ?? string.Empty
                    })
                    .FirstOrDefaultAsync();

                if (company == null)
                {
                    return new StatementResponseDTO
                    {
                        Success = false,
                        Error = "Company not found"
                    };
                }

                // Get current fiscal year
                var currentFiscalYear = await _context.FiscalYears
                    .Where(f => f.Id == fiscalYearId && f.CompanyId == companyId)
                    .Select(f => new FiscalYearStatementDTO
                    {
                        Id = f.Id,
                        Name = f.Name,
                        DateFormat = f.DateFormat.ToString(),
                        IsActive = f.IsActive
                    })
                    .FirstOrDefaultAsync();

                if (currentFiscalYear == null)
                {
                    return new StatementResponseDTO
                    {
                        Success = false,
                        Error = "Fiscal year not found"
                    };
                }

                string companyDateFormat = company.DateFormat?.ToLower() ?? "english";
                string nepaliDate = DateTime.UtcNow.ToString("yyyy-MM-dd");

                // Get user info
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

                // Get all accounts for the fiscal year
                var accounts = await GetAccountsAsync(companyId, fiscalYearId);

                // If no account selected, return basic data
                if (!request.AccountId.HasValue || request.AccountId.Value == Guid.Empty)
                {
                    return new StatementResponseDTO
                    {
                        Success = true,
                        Data = new StatementDataDTO
                        {
                            Company = company,
                            CurrentFiscalYear = currentFiscalYear,
                            Statement = new List<StatementEntryDTO>(),
                            ItemwiseStatement = new List<ItemwiseStatementDTO>(),
                            Accounts = accounts,
                            SelectedCompany = null,
                            FromDate = request.FromDate?.ToString("yyyy-MM-dd") ?? string.Empty,
                            ToDate = request.ToDate?.ToString("yyyy-MM-dd") ?? string.Empty,
                            PaymentMode = request.PaymentMode ?? "all",
                            CompanyDateFormat = companyDateFormat,
                            NepaliDate = nepaliDate,
                            User = new UserStatementDTO
                            {
                                Preferences = new UserPreferencesDTO
                                {
                                    Theme = user?.Preferences?.Theme.ToString() ?? "light"
                                },
                                IsAdmin = isAdmin,
                                Role = userRole
                            },
                            TotalDebit = 0,
                            TotalCredit = 0,
                            OpeningBalance = 0
                        }
                    };
                }

                // Get selected account
                var account = await GetAccountDetailsAsync(companyId, fiscalYearId, request.AccountId.Value);
                if (account == null)
                {
                    return new StatementResponseDTO
                    {
                        Success = false,
                        Error = "Account not found for the current fiscal year"
                    };
                }

                // Build transaction query
                var query = BuildTransactionQuery(companyId, request);

                // Calculate opening balance
                var openingBalance = await CalculateOpeningBalanceAsync(
                    companyId,
                    request.AccountId.Value,
                    request.FromDate,
                    account.InitialOpeningBalance);

                // Get filtered transactions
                var transactions = await GetFilteredTransactionsAsync(query);

                // Process transactions and prepare statement
                var (statement, totalDebit, totalCredit) = PrepareStatementWithOpeningBalanceAndTotals(
                    openingBalance,
                    transactions,
                    request.FromDate,
                    request.PaymentMode);

                // Prepare itemwise statement if requested
                var itemwiseStatement = new List<ItemwiseStatementDTO>();
                if (request.IncludeItems)
                {
                    itemwiseStatement = await PrepareItemwiseStatementAsync(
                        companyId,
                        request.AccountId.Value,
                        request.FromDate,
                        request.ToDate,
                        request.PaymentMode);
                }

                var partyName = account.Name;

                return new StatementResponseDTO
                {
                    Success = true,
                    Data = new StatementDataDTO
                    {
                        CurrentFiscalYear = currentFiscalYear,
                        Statement = statement,
                        ItemwiseStatement = itemwiseStatement,
                        Accounts = accounts,
                        PartyName = partyName,
                        SelectedCompany = request.AccountId,
                        Account = account,
                        FromDate = request.FromDate?.ToString("yyyy-MM-dd") ?? string.Empty,
                        ToDate = request.ToDate?.ToString("yyyy-MM-dd") ?? string.Empty,
                        PaymentMode = request.PaymentMode ?? "all",
                        Company = company,
                        TotalDebit = totalDebit,
                        TotalCredit = totalCredit,
                        OpeningBalance = openingBalance,
                        CompanyDateFormat = companyDateFormat,
                        NepaliDate = nepaliDate,
                        User = new UserStatementDTO
                        {
                            Preferences = new UserPreferencesDTO
                            {
                                Theme = user?.Preferences?.Theme.ToString() ?? "light"
                            },
                            IsAdmin = isAdmin,
                            Role = userRole
                        }
                    }
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetStatementAsync");
                return new StatementResponseDTO
                {
                    Success = false,
                    Error = "Error fetching statement"
                };
            }
        }

        private async Task<List<AccountStatementDTO>> GetAccountsAsync(Guid companyId, Guid fiscalYearId)
        {
            return await _context.Accounts
                .Where(a => a.CompanyId == companyId &&
                           a.IsActive &&
                           (a.OriginalFiscalYearId == fiscalYearId ||
                            a.FiscalYears.Any(fy => fy.Id == fiscalYearId)))
                .OrderBy(a => a.Name)
                .Select(a => new AccountStatementDTO
                {
                    Id = a.Id,
                    Name = a.Name,
                    UniqueNumber = a.UniqueNumber.ToString() ?? string.Empty,
                    Address = a.Address,
                    Phone = a.Phone,
                    Pan = a.Pan,
                    InitialOpeningBalance = new InitialOpeningBalanceDTO
                    {
                        Type = a.OpeningBalanceType == "Dr" ? "Dr" : "Cr",
                        Amount = a.InitialOpeningBalance != null ? a.InitialOpeningBalance.Amount : 0
                    }
                })
                .ToListAsync();
        }

        private async Task<AccountStatementDTO?> GetAccountDetailsAsync(Guid companyId, Guid fiscalYearId, Guid accountId)
        {
            var account = await _context.Accounts
                .Where(a => a.Id == accountId &&
                           a.CompanyId == companyId &&
                           a.IsActive &&
                           (a.OriginalFiscalYearId == fiscalYearId ||
                            a.FiscalYears.Any(fy => fy.Id == fiscalYearId)))
                .Select(a => new AccountStatementDTO
                {
                    Id = a.Id,
                    Name = a.Name,
                    UniqueNumber = a.UniqueNumber.ToString() ?? string.Empty,
                    Address = a.Address,
                    Phone = a.Phone,
                    Pan = a.Pan,
                    InitialOpeningBalance = new InitialOpeningBalanceDTO
                    {
                        Type = a.OpeningBalanceType == "Dr" ? "Dr" : "Cr",
                        Amount = a.InitialOpeningBalance != null ? a.InitialOpeningBalance.Amount : 0
                    },
                    CompanyGroups = a.AccountGroup != null ? new List<CompanyGroupDTO>
                    {
                new CompanyGroupDTO { Name = a.AccountGroup.Name }
                    } : new List<CompanyGroupDTO>()
                })
                .FirstOrDefaultAsync();

            return account;
        }
        private IQueryable<Transaction> BuildTransactionQuery(Guid companyId, StatementRequestDTO request)
        {
            var query = _context.Transactions
                .Where(t => t.CompanyId == companyId && t.IsActive);

            // Date filtering
            if (request.FromDate.HasValue && request.ToDate.HasValue)
            {
                query = query.Where(t => t.Date >= request.FromDate.Value && t.Date <= request.ToDate.Value);
            }
            else if (request.FromDate.HasValue)
            {
                query = query.Where(t => t.Date >= request.FromDate.Value);
            }
            else if (request.ToDate.HasValue)
            {
                query = query.Where(t => t.Date <= request.ToDate.Value);
            }

            // Account filtering
            if (request.AccountId.HasValue)
            {
                query = query.Where(t =>
                    t.AccountId == request.AccountId.Value ||
                    t.PaymentAccountId == request.AccountId.Value ||
                    t.ReceiptAccountId == request.AccountId.Value ||
                    t.DebitAccountId == request.AccountId.Value ||
                    t.CreditAccountId == request.AccountId.Value);
            }

            // Payment mode filtering
            if (!string.IsNullOrEmpty(request.PaymentMode))
            {
                if (request.PaymentMode == "exclude-cash")
                {
                    query = query.Where(t => t.PaymentMode != PaymentMode.Cash);
                }
                else if (request.PaymentMode != "all")
                {
                    var paymentModeEnum = ParsePaymentMode(request.PaymentMode);
                    query = query.Where(t => t.PaymentMode == paymentModeEnum);
                }
            }

            return query;
        }

        private async Task<decimal> CalculateOpeningBalanceAsync(
            Guid companyId,
            Guid accountId,
            DateTime? fromDate,
            InitialOpeningBalanceDTO initialOpeningBalance)
        {
            decimal openingBalance = initialOpeningBalance.Type == "Dr"
                ? initialOpeningBalance.Amount
                : -initialOpeningBalance.Amount;

            if (fromDate.HasValue)
            {
                var openingBalanceQuery = _context.Transactions
                    .Where(t => t.CompanyId == companyId &&
                               t.IsActive &&
                               (t.AccountId == accountId ||
                                t.PaymentAccountId == accountId ||
                                t.ReceiptAccountId == accountId ||
                                t.DebitAccountId == accountId ||
                                t.CreditAccountId == accountId) &&
                               t.Date < fromDate.Value)
                    .OrderBy(t => t.Date)
                    .ThenBy(t => t.CreatedAt);

                var transactionsBeforeFromDate = await openingBalanceQuery.ToListAsync();

                var processedTransactions = new HashSet<string>();

                foreach (var tx in transactionsBeforeFromDate)
                {
                    var txIdentifier = $"{tx.Date}-{tx.Type}-{tx.BillNumber}-{tx.Debit}-{tx.Credit}";

                    if (!processedTransactions.Contains(txIdentifier))
                    {
                        processedTransactions.Add(txIdentifier);

                        decimal amount = 0;

                        if (tx.AccountId == accountId)
                        {
                            amount = tx.Debit - tx.Credit;
                        }
                        else if (tx.PaymentAccountId == accountId)
                        {
                            amount = -tx.Credit;
                        }
                        else if (tx.ReceiptAccountId == accountId)
                        {
                            amount = tx.Debit;
                        }
                        else if (tx.DebitAccountId == accountId)
                        {
                            amount = tx.Debit;
                        }
                        else if (tx.CreditAccountId == accountId)
                        {
                            amount = -tx.Credit;
                        }

                        openingBalance += amount;
                    }
                }
            }

            return openingBalance;
        }

        private async Task<List<Transaction>> GetFilteredTransactionsAsync(IQueryable<Transaction> query)
        {
            return await query
                .OrderBy(t => t.Date)
                .Include(t => t.PaymentAccount)
                .Include(t => t.ReceiptAccount)
                .Include(t => t.DebitAccount)
                .Include(t => t.CreditAccount)
                .Include(t => t.Account)
                .Include(t => t.AccountType)
                .Include(t => t.Item)
                .Include(t => t.Unit)
                .ToListAsync();
        }

        private (List<StatementEntryDTO> statement, decimal totalDebit, decimal totalCredit)
            PrepareStatementWithOpeningBalanceAndTotals(
                decimal openingBalance,
                List<Transaction> transactions,
                DateTime? fromDate,
                string? paymentMode)
        {
            decimal balance = openingBalance;
            decimal totalDebit = 0;
            decimal totalCredit = 0;

            var statement = new List<StatementEntryDTO>();

            // Add opening balance entry if not cash mode
            if (paymentMode != "cash")
            {
                statement.Add(new StatementEntryDTO
                {
                    Date = fromDate,
                    Type = string.Empty,
                    BillNumber = string.Empty,
                    PaymentMode = string.Empty,
                    AccountType = "Opening Balance",
                    Debit = 0,
                    Credit = 0,
                    Balance = openingBalance
                });
            }

            // Group transactions by bill ID to avoid duplicates
            var transactionsByBill = new Dictionary<string, Transaction>();

            foreach (var tx in transactions)
            {
                string billId = tx.PaymentAccountId?.ToString() ??
                               tx.ReceiptAccountId?.ToString() ??
                               tx.JournalBillId?.ToString() ??
                               tx.DebitNoteId?.ToString() ??
                               tx.PurchaseBillId?.ToString() ??
                               tx.PurchaseReturnBillId?.ToString() ??
                               tx.SalesBillId?.ToString() ??
                               tx.SalesReturnBillId?.ToString() ??
                               tx.CreditNoteId?.ToString() ??
                               tx.Id.ToString();

                if (!transactionsByBill.ContainsKey(billId))
                {
                    transactionsByBill[billId] = tx;
                }
                else
                {
                    var existing = transactionsByBill[billId];
                    existing.Debit = existing.Debit + tx.Debit;
                    existing.Credit = existing.Credit + tx.Credit;
                }
            }

            // Process grouped transactions
            foreach (var tx in transactionsByBill.Values)
            {
                balance += tx.Debit - tx.Credit;
                totalDebit += tx.Debit;
                totalCredit += tx.Credit;

                statement.Add(new StatementEntryDTO
                {
                    Date = tx.Date,
                    Type = tx.Type.ToString(),
                    BillNumber = tx.BillNumber,
                    PaymentMode = tx.PaymentMode.ToString(),
                    PartyBillNumber = tx.PartyBillNumber,
                    PaymentAccount = tx.PaymentAccount != null ? new PaymentAccountDTO { Name = tx.PaymentAccount.Name } : null,
                    ReceiptAccount = tx.ReceiptAccount != null ? new ReceiptAccountDTO { Name = tx.ReceiptAccount.Name } : null,
                    DebitAccount = tx.DebitAccount != null ? new DebitAccountDTO { Name = tx.DebitAccount.Name } : null,
                    CreditAccount = tx.CreditAccount != null ? new CreditAccountDTO { Name = tx.CreditAccount.Name } : null,
                    AccountType = tx.AccountType?.Name ?? "Opening Balance",
                    PurchaseSalesType = tx.PurchaseSalesType,
                    PurchaseSalesReturnType = tx.PurchaseSalesReturnType,
                    JournalAccountType = tx.JournalAccountType,
                    DrCrNoteAccountType = tx.DrCrNoteAccountType,
                    InstType = tx.InstType.ToString(),
                    InstNo = tx.InstNo,
                    Account = tx.Account != null ? new AccountReferenceDTO
                    {
                        Id = tx.Account.Id,
                        Name = tx.Account.Name
                    } : null,
                    Debit = tx.Debit,
                    Credit = tx.Credit,
                    Balance = balance,
                    BillId = tx.PaymentAccountId ?? tx.ReceiptAccountId ?? tx.JournalBillId ?? tx.DebitNoteId,
                    PurchaseBillId = tx.PurchaseBillId,
                    PurchaseReturnBillId = tx.PurchaseReturnBillId,
                    PaymentAccountId = tx.PaymentAccountId,
                    ReceiptAccountId = tx.ReceiptAccountId,
                    JournalBillId = tx.JournalBillId,
                    DebitNoteId = tx.DebitNoteId
                });
            }

            return (statement, totalDebit, totalCredit);
        }

        private async Task<List<ItemwiseStatementDTO>> PrepareItemwiseStatementAsync(
            Guid companyId,
            Guid accountId,
            DateTime? fromDate,
            DateTime? toDate,
            string? paymentMode)
        {
            // Build query for transactions with items
            var query = _context.Transactions
                .Where(t => t.CompanyId == companyId &&
                           t.IsActive &&
                           t.ItemId != null);

            // Date filtering
            if (fromDate.HasValue && toDate.HasValue)
            {
                query = query.Where(t => t.Date >= fromDate.Value && t.Date <= toDate.Value);
            }
            else if (fromDate.HasValue)
            {
                query = query.Where(t => t.Date >= fromDate.Value);
            }
            else if (toDate.HasValue)
            {
                query = query.Where(t => t.Date <= toDate.Value);
            }

            // Account filtering - include transactions where account matches
            query = query.Where(t => t.AccountId == accountId);

            // Payment mode filtering
            if (!string.IsNullOrEmpty(paymentMode))
            {
                if (paymentMode == "exclude-cash")
                {
                    query = query.Where(t => t.PaymentMode != PaymentMode.Cash);
                }
                else if (paymentMode != "all")
                {
                    var paymentModeEnum = ParsePaymentMode(paymentMode);
                    query = query.Where(t => t.PaymentMode == paymentModeEnum);
                }
            }

            var transactions = await query
                .Include(t => t.Item)
                .Include(t => t.Unit)
                .OrderBy(t => t.Date)
                .ToListAsync();

            // Get VAT transactions
            var vatTransactions = await _context.Transactions
                .Where(t => t.CompanyId == companyId &&
                           t.IsActive &&
                           t.IsType == TransactionIsType.VAT)
                .ToListAsync();

            // Build maps for VAT and total amounts
            var vatAmountMap = new Dictionary<string, decimal>();
            var totalAmountMap = new Dictionary<string, decimal>();

            // Process VAT transactions
            foreach (var tx in vatTransactions)
            {
                if (!string.IsNullOrEmpty(tx.BillNumber))
                {
                    decimal vatAmount = (tx.Type == TransactionType.Purc || tx.Type == TransactionType.SlRt)
                        ? tx.Debit
                        :tx.Credit;
                    vatAmountMap[tx.BillNumber] = vatAmount;
                }
            }

            // Process main transactions for total amounts
            foreach (var tx in transactions)
            {
                if (!string.IsNullOrEmpty(tx.BillNumber) && tx.AccountId == accountId)
                {
                    decimal totalAmount = 0;
                    switch (tx.Type)
                    {
                        case TransactionType.Purc:
                            totalAmount = tx.Credit;
                            break;
                        case TransactionType.Sale:
                            totalAmount = tx.Debit;
                            break;
                        case TransactionType.PrRt:
                            totalAmount = tx.Debit;
                            break;
                        case TransactionType.SlRt:
                            totalAmount = tx.Credit;
                            break;
                    }
                    if (totalAmount > 0)
                    {
                        totalAmountMap[tx.BillNumber] = totalAmount;
                    }
                }
            }

            // Group items by bill number
            var billItemsMap = new Dictionary<string, ItemwiseStatementDTO>();

            foreach (var tx in transactions.Where(t => t.Item != null))
            {
                if (string.IsNullOrEmpty(tx.BillNumber)) continue;

                if (!billItemsMap.ContainsKey(tx.BillNumber))
                {
                    billItemsMap[tx.BillNumber] = new ItemwiseStatementDTO
                    {
                        Date = tx.Date,
                        BillNumber = tx.BillNumber,
                        Type = tx.Type.ToString(),
                        PaymentMode = tx.PaymentMode.ToString(),
                        PartyBillNumber = tx.PartyBillNumber,
                        Items = new List<ItemDetailDTO>(),
                        VatAmount = vatAmountMap.GetValueOrDefault(tx.BillNumber, 0),
                        TotalAmount = totalAmountMap.GetValueOrDefault(tx.BillNumber, 0)
                    };
                }

                billItemsMap[tx.BillNumber].Items.Add(new ItemDetailDTO
                {
                    Item = tx.Item != null ? new ItemInfoDTO { Name = tx.Item.Name } : null,
                    Quantity = tx.Quantity,
                    Unit = tx.Unit != null ? new UnitInfoDTO { Name = tx.Unit.Name } : null,
                    Price = tx.Price,
                    PuPrice = tx.PuPrice,
                    NetPrice = tx.NetPrice,
                    DiscountPercentagePerItem = tx.DiscountPercentagePerItem,
                    DiscountAmountPerItem = tx.DiscountAmountPerItem,
                    NetPuPrice = tx.NetPuPrice
                });
            }

            return billItemsMap.Values.ToList();
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
    }
}