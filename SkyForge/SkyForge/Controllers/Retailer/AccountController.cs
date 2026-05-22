using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Dto.AccountDto;
using SkyForge.Models.AccountGroupModel;
using SkyForge.Models.AccountModel;
using SkyForge.Models.CompanyModel;
using SkyForge.Models.FiscalYearModel;
using SkyForge.Models.Shared;
using SkyForge.Models.UserModel;
using SkyForge.Services.AccountServices;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace SkyForge.Controllers.Retailer
{
    [ApiController]
    [Route("api/retailer")]
    [Authorize]
    public class AccountController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<AccountController> _logger;
        private readonly IAccountService _accountService;
        private readonly IAccountBalanceService _accountBalanceService;

        public AccountController(
            ApplicationDbContext context,
            ILogger<AccountController> logger,
            IAccountService accountService,
            IAccountBalanceService accountBalanceService
            )
        {
            _context = context;
            _logger = logger;
            _accountService = accountService;
            _accountBalanceService = accountBalanceService;
        }

        [HttpGet("accounts/search")]
        public async Task<IActionResult> SearchAccounts([FromQuery] AccountSearchDTO searchDto)
        {
            try
            {
                _logger.LogInformation("=== SearchAccounts Started ===");

                // 1. Extract user and company info from JWT claims
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                // 2. Validate required claims exist
                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                {
                    return Unauthorized(new
                    {
                        success = false,
                        error = "Invalid user token. Please login again."
                    });
                }

                // 3. Check if company is selected
                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "No company selected. Please select a company first."
                    });
                }

                // 4. Check if trade type is Retailer
                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new
                    {
                        success = false,
                        error = "Access restricted to retailer accounts"
                    });
                }

                // 5. Get fiscal year
                var fiscalYearId = searchDto.FiscalYear;
                if (!fiscalYearId.HasValue)
                {
                    // Get current active fiscal year
                    var currentFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

                    if (currentFiscalYear == null)
                    {
                        return BadRequest(new
                        {
                            success = false,
                            error = "No fiscal year found"
                        });
                    }
                    fiscalYearId = currentFiscalYear.Id;
                }

                // 6. Get relevant account groups (Sundry Debtors, Sundry Creditors, Cash in Hand)
                var relevantGroupNames = new[] { "Sundry Debtors", "Sundry Creditors" };
                var relevantGroups = await _context.AccountGroups
                    .Where(ag => ag.CompanyId == companyIdGuid &&
                                relevantGroupNames.Contains(ag.Name))
                    .Select(ag => ag.Id)
                    .ToListAsync();

                if (!relevantGroups.Any())
                {
                    return Ok(new AccountSearchResponseDTO
                    {
                        Success = true,
                        Accounts = new List<AccountSearchResultDTO>(),
                        Pagination = new PaginationDTO
                        {
                            CurrentPage = searchDto.Page,
                            TotalPages = 0,
                            TotalAccounts = 0,
                            AccountsPerPage = searchDto.Limit,
                            HasNextPage = false,
                            HasPreviousPage = false
                        }
                    });
                }

                // 7. Build base query
                var baseQuery = _context.Accounts
                    .Where(a => a.CompanyId == companyIdGuid &&
                               a.IsActive &&
                               relevantGroups.Contains(a.AccountGroupsId) &&
                               (a.OriginalFiscalYearId == fiscalYearId ||
                                _context.FiscalYears.Any(f => f.Id == fiscalYearId && f.Id > a.OriginalFiscalYearId)));

                // 8. Apply search if provided
                if (!string.IsNullOrWhiteSpace(searchDto.Search))
                {
                    var searchString = searchDto.Search.Trim();
                    baseQuery = baseQuery.Where(a =>
                        EF.Functions.ILike(a.Name, $"%{searchString}%") ||
                        EF.Functions.ILike(a.Address, $"%{searchString}%") ||
                        EF.Functions.ILike(a.Phone, $"%{searchString}%") ||
                        EF.Functions.ILike(a.Email, $"%{searchString}%") ||
                        EF.Functions.ILike(a.ContactPerson, $"%{searchString}%") ||
                        EF.Functions.ILike(a.Pan, $"%{searchString}%") ||
                        a.UniqueNumber.ToString().Contains(searchString));
                }

                // 9. Get total count for pagination
                var totalAccounts = await baseQuery.CountAsync();

                // 10. Apply pagination
                var skip = (searchDto.Page - 1) * searchDto.Limit;
                var accounts = await baseQuery
                    .OrderBy(a => a.Name)
                    .Skip(skip)
                    .Take(searchDto.Limit)
                    .Select(a => new AccountSearchResultDTO
                    {
                        Id = a.Id,
                        Name = a.Name,
                        UniqueNumber = a.UniqueNumber,
                        Address = a.Address,
                        Pan = a.Pan,
                        ContactPerson = a.ContactPerson,
                        Email = a.Email,
                        Phone = a.Phone,
                        CreditLimit = a.CreditLimit,
                        CreatedAt = a.CreatedAt
                    })
                    .ToListAsync();

                // In the SearchAccounts method, update the response mapping
                var accountsWithBalances = new List<AccountSearchResultDTO>();

                foreach (var account in accounts)
                {
                    var balanceData = await _accountBalanceService.CalculateAccountBalanceAsync(
                        account.Id, companyIdGuid, fiscalYearId.Value);

                    accountsWithBalances.Add(new AccountSearchResultDTO
                    {
                        Id = account.Id,
                        Name = account.Name,
                        UniqueNumber = account.UniqueNumber,
                        Address = account.Address,
                        Pan = account.Pan,
                        ContactPerson = account.ContactPerson,
                        Email = account.Email,
                        Phone = account.Phone,
                        CreditLimit = account.CreditLimit,
                        CreatedAt = account.CreatedAt,
                        Balance = balanceData.Balance,
                        BalanceType = balanceData.BalanceType,
                        RawBalance = balanceData.RawBalance
                    });
                }

                // 12. Prepare response
                var response = new AccountSearchResponseDTO
                {
                    Success = true,
                    Accounts = accountsWithBalances,
                    Pagination = new PaginationDTO
                    {
                        CurrentPage = searchDto.Page,
                        TotalPages = (int)Math.Ceiling(totalAccounts / (double)searchDto.Limit),
                        TotalAccounts = totalAccounts,
                        AccountsPerPage = searchDto.Limit,
                        HasNextPage = (searchDto.Page * searchDto.Limit) < totalAccounts,
                        HasPreviousPage = searchDto.Page > 1
                    }
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in SearchAccounts");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while searching accounts",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        [HttpGet("accounts/cash/search")]
        public async Task<IActionResult> SearchCashAccounts([FromQuery] AccountSearchDTO searchDto)
        {
            try
            {
                _logger.LogInformation("=== SearchAccounts Started ===");

                // 1. Extract user and company info from JWT claims
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                // 2. Validate required claims exist
                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                {
                    return Unauthorized(new
                    {
                        success = false,
                        error = "Invalid user token. Please login again."
                    });
                }

                // 3. Check if company is selected
                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "No company selected. Please select a company first."
                    });
                }

                // 4. Check if trade type is Retailer
                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new
                    {
                        success = false,
                        error = "Access restricted to retailer accounts"
                    });
                }

                // 5. Get fiscal year
                var fiscalYearId = searchDto.FiscalYear;
                if (!fiscalYearId.HasValue)
                {
                    // Get current active fiscal year
                    var currentFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

                    if (currentFiscalYear == null)
                    {
                        return BadRequest(new
                        {
                            success = false,
                            error = "No fiscal year found"
                        });
                    }
                    fiscalYearId = currentFiscalYear.Id;
                }

                // 6. Get relevant account groups (Sundry Debtors, Sundry Creditors, Cash in Hand)
                var relevantGroupNames = new[] { "Cash in Hand" };
                var relevantGroups = await _context.AccountGroups
                    .Where(ag => ag.CompanyId == companyIdGuid &&
                                relevantGroupNames.Contains(ag.Name))
                    .Select(ag => ag.Id)
                    .ToListAsync();

                if (!relevantGroups.Any())
                {
                    return Ok(new AccountSearchResponseDTO
                    {
                        Success = true,
                        Accounts = new List<AccountSearchResultDTO>(),
                        Pagination = new PaginationDTO
                        {
                            CurrentPage = searchDto.Page,
                            TotalPages = 0,
                            TotalAccounts = 0,
                            AccountsPerPage = searchDto.Limit,
                            HasNextPage = false,
                            HasPreviousPage = false
                        }
                    });
                }

                // 7. Build base query
                var baseQuery = _context.Accounts
                    .Where(a => a.CompanyId == companyIdGuid &&
                               a.IsActive &&
                               relevantGroups.Contains(a.AccountGroupsId) &&
                               (a.OriginalFiscalYearId == fiscalYearId ||
                                _context.FiscalYears.Any(f => f.Id == fiscalYearId && f.Id > a.OriginalFiscalYearId)));

                // 8. Apply search if provided
                if (!string.IsNullOrWhiteSpace(searchDto.Search))
                {
                    var searchString = searchDto.Search.Trim();
                    baseQuery = baseQuery.Where(a =>
                        EF.Functions.ILike(a.Name, $"%{searchString}%") ||
                        EF.Functions.ILike(a.Address, $"%{searchString}%") ||
                        EF.Functions.ILike(a.Phone, $"%{searchString}%") ||
                        EF.Functions.ILike(a.Email, $"%{searchString}%") ||
                        EF.Functions.ILike(a.ContactPerson, $"%{searchString}%") ||
                        EF.Functions.ILike(a.Pan, $"%{searchString}%") ||
                        a.UniqueNumber.ToString().Contains(searchString));
                }

                // 9. Get total count for pagination
                var totalAccounts = await baseQuery.CountAsync();

                // 10. Apply pagination
                var skip = (searchDto.Page - 1) * searchDto.Limit;
                var accounts = await baseQuery
                    .OrderBy(a => a.Name)
                    .Skip(skip)
                    .Take(searchDto.Limit)
                    .Select(a => new AccountSearchResultDTO
                    {
                        Id = a.Id,
                        Name = a.Name,
                        UniqueNumber = a.UniqueNumber,
                        Address = a.Address,
                        Pan = a.Pan,
                        ContactPerson = a.ContactPerson,
                        Email = a.Email,
                        Phone = a.Phone,
                        CreditLimit = a.CreditLimit,
                        CreatedAt = a.CreatedAt
                    })
                    .ToListAsync();

                // In the SearchAccounts method, update the response mapping
                var accountsWithBalances = new List<AccountSearchResultDTO>();

                foreach (var account in accounts)
                {
                    var balanceData = await _accountBalanceService.CalculateAccountBalanceAsync(
                        account.Id, companyIdGuid, fiscalYearId.Value);

                    accountsWithBalances.Add(new AccountSearchResultDTO
                    {
                        Id = account.Id,
                        Name = account.Name,
                        UniqueNumber = account.UniqueNumber,
                        Address = account.Address,
                        Pan = account.Pan,
                        ContactPerson = account.ContactPerson,
                        Email = account.Email,
                        Phone = account.Phone,
                        CreditLimit = account.CreditLimit,
                        CreatedAt = account.CreatedAt,
                        Balance = balanceData.Balance,
                        BalanceType = balanceData.BalanceType,
                        RawBalance = balanceData.RawBalance
                    });
                }

                // 12. Prepare response
                var response = new AccountSearchResponseDTO
                {
                    Success = true,
                    Accounts = accountsWithBalances,
                    Pagination = new PaginationDTO
                    {
                        CurrentPage = searchDto.Page,
                        TotalPages = (int)Math.Ceiling(totalAccounts / (double)searchDto.Limit),
                        TotalAccounts = totalAccounts,
                        AccountsPerPage = searchDto.Limit,
                        HasNextPage = (searchDto.Page * searchDto.Limit) < totalAccounts,
                        HasPreviousPage = searchDto.Page > 1
                    }
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in SearchAccounts");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while searching accounts",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        [HttpGet("all/accounts/search/except-cash/bank")]
        public async Task<IActionResult> SearchAllAccountsExceptCashBank([FromQuery] AccountSearchDTO searchDto)
        {
            try
            {
                _logger.LogInformation("=== SearchAllAccounts Started ===");

                // 1. Extract user and company info from JWT claims
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;

                // 2. Validate required claims exist
                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                {
                    return Unauthorized(new
                    {
                        success = false,
                        error = "Invalid user token. Please login again."
                    });
                }

                // 3. Check if company is selected
                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "No company selected. Please select a company first."
                    });
                }

                // 4. Check if trade type is Retailer
                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new
                    {
                        success = false,
                        error = "Access restricted to retailer accounts"
                    });
                }

                // 5. Get fiscal year
                Guid fiscalYearIdGuid;
                if (searchDto.FiscalYear.HasValue)
                {
                    fiscalYearIdGuid = searchDto.FiscalYear.Value;
                }
                else if (!string.IsNullOrEmpty(fiscalYearIdClaim) && Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
                {
                    // Use from claims
                }
                else
                {
                    // Get current active fiscal year
                    var currentFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

                    if (currentFiscalYear == null)
                    {
                        return BadRequest(new
                        {
                            success = false,
                            error = "No fiscal year found"
                        });
                    }
                    fiscalYearIdGuid = currentFiscalYear.Id;
                }

                // 6. Get groups to EXCLUDE (Bank Accounts, Bank O/D Account, Cash in Hand)
                var groupsToExclude = await _context.AccountGroups
                    .Where(ag => ag.CompanyId == companyIdGuid &&
                           (ag.Name == "Bank Accounts" ||
                            ag.Name == "Bank O/D Account" ||
                            ag.Name == "Cash in Hand"))
                    .Select(ag => ag.Id)
                    .ToListAsync();

                // 7. Build base query
                var baseQuery = _context.Accounts
                    .Where(a => a.CompanyId == companyIdGuid &&
                               a.IsActive);

                // 8. Exclude the specified groups
                if (groupsToExclude.Any())
                {
                    baseQuery = baseQuery.Where(a => !groupsToExclude.Contains(a.AccountGroupsId));
                }

                // 9. Apply search if provided
                if (!string.IsNullOrWhiteSpace(searchDto.Search))
                {
                    var searchString = searchDto.Search.Trim();

                    // Try to parse as number for numeric fields
                    bool isNumeric = decimal.TryParse(searchString, out decimal numericValue);

                    // Build search conditions
                    var searchQuery = baseQuery.Where(a =>
                        EF.Functions.ILike(a.Name, $"%{searchString}%") ||
                        EF.Functions.ILike(a.Address ?? "", $"%{searchString}%") ||
                        EF.Functions.ILike(a.Phone ?? "", $"%{searchString}%") ||
                        EF.Functions.ILike(a.Email ?? "", $"%{searchString}%") ||
                        EF.Functions.ILike(a.ContactPerson ?? "", $"%{searchString}%") ||
                        EF.Functions.ILike(a.Pan ?? "", $"%{searchString}%"));

                    // Add numeric search if applicable
                    if (isNumeric)
                    {
                        searchQuery = searchQuery.Union(baseQuery.Where(a =>
                            a.UniqueNumber == (int)numericValue ||
                            a.Pan == searchString)); // Pan is string, not numeric
                    }

                    baseQuery = searchQuery;
                }

                // 10. Get total count for pagination
                var totalAccounts = await baseQuery.CountAsync();

                // 11. Apply pagination
                var page = searchDto.Page < 1 ? 1 : searchDto.Page;
                var limit = searchDto.Limit < 1 ? 25 : searchDto.Limit;
                var skip = (page - 1) * limit;

                var accounts = await baseQuery
                    .Include(a => a.AccountGroup)
                    .OrderBy(a => a.Name)
                    .Skip(skip)
                    .Take(limit)
                    .Select(a => new
                    {
                        a.Id,
                        a.Name,
                        a.UniqueNumber,
                        a.Address,
                        a.Pan,
                        a.ContactPerson,
                        a.Email,
                        a.Phone,
                        a.CreditLimit,
                        a.CreatedAt,
                        a.AccountGroupsId,
                        AccountGroupName = a.AccountGroup != null ? a.AccountGroup.Name : ""
                    })
                    .ToListAsync();

                // 12. Calculate balances for all accounts
                var accountsWithBalances = new List<AccountSearchResultDTO>();

                foreach (var account in accounts)
                {
                    var balanceData = await _accountBalanceService.CalculateAccountBalanceAsync(
                        account.Id, companyIdGuid, fiscalYearIdGuid);

                    accountsWithBalances.Add(new AccountSearchResultDTO
                    {
                        Id = account.Id,
                        Name = account.Name,
                        UniqueNumber = account.UniqueNumber,
                        Address = account.Address ?? "",
                        Pan = account.Pan,
                        ContactPerson = account.ContactPerson ?? "",
                        Email = account.Email,
                        Phone = account.Phone,
                        CreditLimit = account.CreditLimit,
                        CreatedAt = account.CreatedAt,
                        Balance = balanceData.Balance,
                        BalanceType = balanceData.BalanceType,
                        RawBalance = balanceData.RawBalance,
                    });
                }

                // 13. Prepare pagination response
                var pagination = new PaginationDTO
                {
                    CurrentPage = page,
                    TotalPages = (int)Math.Ceiling(totalAccounts / (double)limit),
                    TotalAccounts = totalAccounts,
                    AccountsPerPage = limit,
                    HasNextPage = (page * limit) < totalAccounts,
                    HasPreviousPage = page > 1
                };

                // 14. Return response
                var response = new AccountSearchResponseDTO
                {
                    Success = true,
                    Accounts = accountsWithBalances,
                    Pagination = pagination
                };

                _logger.LogInformation("Successfully fetched {Count} accounts for search: {Search}",
                    accountsWithBalances.Count, searchDto.Search ?? "all");

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in SearchAllAccounts");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while searching accounts",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        [HttpGet("all/accounts/search")]
        public async Task<IActionResult> SearchAllAccounts([FromQuery] AccountSearchDTO searchDto)
        {
            try
            {
                _logger.LogInformation("=== SearchAllAccounts Started ===");

                // 1. Extract user and company info from JWT claims
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;
                var fiscalYearIdClaim = User.FindFirst("fiscalYearId")?.Value;

                // 2. Validate required claims exist
                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                {
                    return Unauthorized(new
                    {
                        success = false,
                        error = "Invalid user token. Please login again."
                    });
                }

                // 3. Check if company is selected
                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "No company selected. Please select a company first."
                    });
                }

                // 4. Check if trade type is Retailer
                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new
                    {
                        success = false,
                        error = "Access restricted to retailer accounts"
                    });
                }

                // 5. Get fiscal year
                Guid fiscalYearIdGuid;
                if (searchDto.FiscalYear.HasValue)
                {
                    fiscalYearIdGuid = searchDto.FiscalYear.Value;
                }
                else if (!string.IsNullOrEmpty(fiscalYearIdClaim) && Guid.TryParse(fiscalYearIdClaim, out fiscalYearIdGuid))
                {
                    // Use from claims
                }
                else
                {
                    // Get current active fiscal year
                    var currentFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

                    if (currentFiscalYear == null)
                    {
                        return BadRequest(new
                        {
                            success = false,
                            error = "No fiscal year found"
                        });
                    }
                    fiscalYearIdGuid = currentFiscalYear.Id;
                }

                // 6. Build base query - INCLUDE ALL ACCOUNTS (removed group exclusions)
                var baseQuery = _context.Accounts
                    .Where(a => a.CompanyId == companyIdGuid &&
                               a.IsActive &&
                               (a.OriginalFiscalYearId == fiscalYearIdGuid ||
                                _context.FiscalYears.Any(f => f.Id == fiscalYearIdGuid && f.Id > a.OriginalFiscalYearId)));

                // 7. Apply search if provided
                if (!string.IsNullOrWhiteSpace(searchDto.Search))
                {
                    var searchString = searchDto.Search.Trim();

                    // Try to parse as number for numeric fields
                    bool isNumeric = decimal.TryParse(searchString, out decimal numericValue);

                    // Build search conditions
                    var searchQuery = baseQuery.Where(a =>
                        EF.Functions.ILike(a.Name, $"%{searchString}%") ||
                        EF.Functions.ILike(a.Address ?? "", $"%{searchString}%") ||
                        EF.Functions.ILike(a.Phone ?? "", $"%{searchString}%") ||
                        EF.Functions.ILike(a.Email ?? "", $"%{searchString}%") ||
                        EF.Functions.ILike(a.ContactPerson ?? "", $"%{searchString}%") ||
                        EF.Functions.ILike(a.Pan ?? "", $"%{searchString}%"));

                    // Add numeric search if applicable
                    if (isNumeric)
                    {
                        searchQuery = searchQuery.Union(baseQuery.Where(a =>
                            a.UniqueNumber == (int)numericValue));
                    }

                    baseQuery = searchQuery;
                }

                // 8. Get total count for pagination
                var totalAccounts = await baseQuery.CountAsync();

                // 9. Apply pagination
                var page = searchDto.Page < 1 ? 1 : searchDto.Page;
                var limit = searchDto.Limit < 1 ? 25 : searchDto.Limit;
                var skip = (page - 1) * limit;

                var accounts = await baseQuery
                    .Include(a => a.AccountGroup)
                    .OrderBy(a => a.Name)
                    .Skip(skip)
                    .Take(limit)
                    .Select(a => new
                    {
                        a.Id,
                        a.Name,
                        a.UniqueNumber,
                        a.Address,
                        a.Pan,
                        a.ContactPerson,
                        a.Email,
                        a.Phone,
                        a.CreditLimit,
                        a.CreatedAt,
                        a.AccountGroupsId,
                        AccountGroupName = a.AccountGroup != null ? a.AccountGroup.Name : ""
                    })
                    .ToListAsync();

                // 10. Calculate balances for all accounts
                var accountsWithBalances = new List<AccountSearchResultDTO>();

                foreach (var account in accounts)
                {
                    var balanceData = await _accountBalanceService.CalculateAccountBalanceAsync(
                        account.Id, companyIdGuid, fiscalYearIdGuid);

                    accountsWithBalances.Add(new AccountSearchResultDTO
                    {
                        Id = account.Id,
                        Name = account.Name,
                        UniqueNumber = account.UniqueNumber,
                        Address = account.Address ?? "",
                        Pan = account.Pan,
                        ContactPerson = account.ContactPerson ?? "",
                        Email = account.Email,
                        Phone = account.Phone,
                        CreditLimit = account.CreditLimit,
                        CreatedAt = account.CreatedAt,
                        Balance = balanceData.Balance,
                        BalanceType = balanceData.BalanceType,
                        RawBalance = balanceData.RawBalance,
                    });
                }

                // 11. Prepare pagination response
                var pagination = new PaginationDTO
                {
                    CurrentPage = page,
                    TotalPages = (int)Math.Ceiling(totalAccounts / (double)limit),
                    TotalAccounts = totalAccounts,
                    AccountsPerPage = limit,
                    HasNextPage = (page * limit) < totalAccounts,
                    HasPreviousPage = page > 1
                };

                // 12. Return response
                var response = new AccountSearchResponseDTO
                {
                    Success = true,
                    Accounts = accountsWithBalances,
                    Pagination = pagination
                };

                _logger.LogInformation("Successfully fetched {Count} accounts for search: {Search} (including cash and bank accounts)",
                    accountsWithBalances.Count, searchDto.Search ?? "all");

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in SearchAllAccounts");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while searching accounts",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // GET: api/retailer/companies
        [HttpGet("companies")]
        public async Task<IActionResult> GetCompaniesData()
        {
            try
            {
                _logger.LogInformation("=== GetCompaniesData Started ===");

                // Debug: Log all claims from JWT token
                _logger.LogInformation("=== All JWT Claims ===");
                foreach (var claim in User.Claims)
                {
                    _logger.LogInformation($"Claim Type: {claim.Type}, Value: {claim.Value}");
                }

                // 1. Extract ALL user info from JWT claims
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var userName = User.FindFirst(ClaimTypes.Name)?.Value;
                var userEmail = User.FindFirst(ClaimTypes.Email)?.Value;
                var isAdminClaim = User.FindFirst("isAdmin")?.Value;
                var roleName = User.FindFirst(ClaimTypes.Role)?.Value;
                var roleId = User.FindFirst("roleId")?.Value;
                var isEmailVerifiedClaim = User.FindFirst("isEmailVerified")?.Value;

                // 2. Extract ALL company info from JWT claims
                var companyId = User.FindFirst("currentCompany")?.Value;
                var companyName = User.FindFirst("currentCompanyName")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                // 3. Parse boolean claims
                bool isAdmin = bool.TryParse(isAdminClaim, out bool admin) && admin;
                bool isEmailVerified = bool.TryParse(isEmailVerifiedClaim, out bool emailVerified) && emailVerified;

                // 4. Validate required claims exist
                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                {
                    _logger.LogError("Invalid or missing userId claim");
                    return Unauthorized(new
                    {
                        success = false,
                        error = "Invalid user token. Please login again.",
                        redirectTo = "/login"
                    });
                }

                // 5. Check if company claim exists - THIS IS THE CRITICAL CHECK
                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    _logger.LogError("No company selected in JWT token. Missing 'currentCompany' claim.");
                    _logger.LogInformation("Available claims with 'current':");
                    foreach (var claim in User.Claims.Where(c => c.Type.Contains("current", StringComparison.OrdinalIgnoreCase)))
                    {
                        _logger.LogInformation($"  {claim.Type}: {claim.Value}");
                    }

                    return BadRequest(new
                    {
                        success = false,
                        error = "No company selected. Please select a company first.",
                        redirectTo = "/user-dashboard" // Changed from /api/company/select to match frontend
                    });
                }

                // 6. Check if trade type claim exists and validate it's Retailer
                TradeType? tradeType = null;
                if (string.IsNullOrEmpty(tradeTypeClaim))
                {
                    _logger.LogError("Missing 'tradeType' claim in JWT token");

                    // Try to get trade type from database as fallback
                    var company = await _context.Companies
                        .Where(c => c.Id == companyIdGuid)
                        .Select(c => new { c.TradeType })
                        .FirstOrDefaultAsync();

                    if (company != null)
                    {
                        tradeType = company.TradeType;
                        _logger.LogInformation($"Fetched TradeType from DB: {tradeType}");
                    }
                    else
                    {
                        _logger.LogError($"Company not found in database: {companyIdGuid}");
                        return BadRequest(new
                        {
                            success = false,
                            error = "Company not found",
                            redirectTo = "/user-dashboard"
                        });
                    }
                }
                else
                {
                    if (Enum.TryParse<TradeType>(tradeTypeClaim, out var parsedTradeType))
                    {
                        tradeType = parsedTradeType;
                        _logger.LogInformation($"Parsed TradeType from JWT: {tradeType}");
                    }
                    else
                    {
                        _logger.LogError($"Invalid TradeType in JWT: {tradeTypeClaim}");
                        return BadRequest(new
                        {
                            success = false,
                            error = "Invalid trade type in token",
                            redirectTo = "/user-dashboard"
                        });
                    }
                }

                // 7. Validate trade type is Retailer
                if (tradeType.HasValue && tradeType.Value != TradeType.Retailer)
                {
                    _logger.LogWarning($"Access denied: TradeType is {tradeType.Value}, not Retailer");
                    return StatusCode(403, new
                    {
                        success = false,
                        error = "Access denied for this trade type. This is a Retailer-only feature.",
                        redirectTo = "/user-dashboard"
                    });
                }

                // 8. Get company details from database (for response, not for validation)
                var companyDetails = await _context.Companies
                    .Where(c => c.Id == companyIdGuid)
                    .Select(c => new
                    {
                        c.Id,
                        c.Name,
                        c.RenewalDate,
                        c.DateFormat
                    })
                    .FirstOrDefaultAsync();

                if (companyDetails == null)
                {
                    _logger.LogError($"Company not found in database: {companyIdGuid}");
                    return NotFound(new
                    {
                        success = false,
                        error = "Company not found",
                        redirectTo = "/user-dashboard"
                    });
                }

                // 9. Get active fiscal year for the company
                var fiscalYear = await _context.FiscalYears
                    .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

                if (fiscalYear == null)
                {
                    // Try to get any fiscal year as fallback
                    fiscalYear = await _context.FiscalYears
                        .Where(f => f.CompanyId == companyIdGuid)
                        .OrderByDescending(f => f.StartDate)
                        .FirstOrDefaultAsync();

                    if (fiscalYear == null)
                    {
                        return BadRequest(new
                        {
                            success = false,
                            error = "No fiscal year found for this company",
                            redirectTo = "/fiscal-years"
                        });
                    }
                }

                // 10. Check if current fiscal year is the initial fiscal year
                var initialFiscalYear = await _context.FiscalYears
                    .Where(f => f.CompanyId == companyIdGuid)
                    .OrderBy(f => f.CreatedAt)
                    .FirstOrDefaultAsync();

                bool isInitialFiscalYear = fiscalYear.Id == initialFiscalYear?.Id;

                // 11. Get accounts for this company and fiscal year
                var accounts = await _context.Accounts
                    .Where(a => a.CompanyId == companyIdGuid)
                    .Include(a => a.AccountGroup)
                    .Include(a => a.OriginalFiscalYear)
                    .Select(a => new
                    {
                        _id = a.Id,
                        name = a.Name,
                        address = a.Address,
                        phone = a.Phone,
                        ward = a.Ward,
                        pan = a.Pan,
                        email = a.Email,
                        creditLimit = a.CreditLimit,
                        contactPerson = a.ContactPerson,
                        openingBalance = new
                        {
                            amount = a.OpeningBalance != null ? a.OpeningBalance.Amount : 0,
                            type = a.OpeningBalanceType
                        },
                        accountGroups = a.AccountGroup == null ? null : new
                        {
                            _id = a.AccountGroup.Id,
                            name = a.AccountGroup.Name
                        },
                        originalFiscalYear = a.OriginalFiscalYear == null ? null : new
                        {
                            _id = a.OriginalFiscalYear.Id,
                            name = a.OriginalFiscalYear.Name
                        },
                        createdAt = a.CreatedAt,
                    })
                    .ToListAsync();

                // 12. Get company groups
                var accountGroups = await _context.AccountGroups
                    .Where(ag => ag.CompanyId == companyIdGuid)
                    .Select(ag => new
                    {
                        _id = ag.Id,
                        name = ag.Name,
                        description = "",
                        uniqueNumber = ag.UniqueNumber,
                        primaryGroup = ag.PrimaryGroup,
                        type = ag.Type,
                        isActive = true,
                        companyId = ag.CompanyId,
                        createdAt = ag.CreatedAt,
                        updatedAt = ag.UpdatedAt
                    })
                    .ToListAsync();

                // 13. Determine if user is admin or supervisor
                // Check role from JWT claims first, then fallback to database
                var userRole = roleName ?? "User";
                bool isAdminOrSupervisor = isAdmin || (userRole == "Supervisor" || userRole == "Admin");

                // 14. Prepare user info for response (from JWT claims, not database)
                var userInfo = new
                {
                    _id = userId,
                    name = userName ?? "User",
                    email = userEmail ?? "",
                    isAdmin = isAdmin,
                    role = userRole,
                    roleId = roleId,
                    isEmailVerified = isEmailVerified,
                    preferences = new { theme = "light" }
                };

                // 15. Prepare response
                var responseData = new
                {
                    success = true,
                    data = new
                    {
                        accounts = accounts,
                        accountGroups = accountGroups,
                        company = new
                        {
                            _id = companyDetails.Id,
                            companyName = companyDetails.Name,
                            renewalDate = companyDetails.RenewalDate,
                            dateFormat = companyDetails.DateFormat?.ToString()?.ToLower() ?? "english",
                            fiscalYear = new
                            {
                                _id = fiscalYear.Id,
                                id = fiscalYear.Id,
                                name = fiscalYear.Name,
                                startDate = fiscalYear.StartDate,
                                endDate = fiscalYear.EndDate,
                                startDateNepali = fiscalYear.StartDateNepali,
                                endDateNepali = fiscalYear.EndDateNepali,
                                dateFormat = fiscalYear.DateFormat?.ToString()?.ToLower() ?? "english",
                                isActive = fiscalYear.IsActive
                            }
                        },
                        currentFiscalYear = new
                        {
                            _id = fiscalYear.Id,
                            id = fiscalYear.Id,
                            name = fiscalYear.Name,
                            startDate = fiscalYear.StartDate,
                            endDate = fiscalYear.EndDate,
                            dateFormat = fiscalYear.DateFormat?.ToString()?.ToLower() ?? "english",
                            isActive = fiscalYear.IsActive
                        },
                        isInitialFiscalYear = isInitialFiscalYear,
                        companyId = companyIdGuid.ToString(),
                        currentCompanyName = companyName ?? companyDetails.Name,
                        companyDateFormat = companyDetails.DateFormat?.ToString()?.ToLower() ?? "english",
                        nepaliDate = "",
                        fiscalYear = fiscalYear.Name,
                        user = userInfo,
                        theme = "light",
                        isAdminOrSupervisor = isAdminOrSupervisor
                    }
                };

                _logger.LogInformation($"Successfully fetched {accounts.Count} accounts for company {companyDetails.Name}");
                _logger.LogInformation($"JWT Claims used - CompanyId: {companyId}, TradeType: {tradeTypeClaim}, UserId: {userId}");

                return Ok(responseData);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetCompaniesData");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        [HttpPost("companies")]
        public async Task<IActionResult> CreateAccount([FromBody] CreateAccountDTO request)
        {
            try
            {
                _logger.LogInformation("=== CreateAccount Started ===");

                // 1. Extract user and company info from JWT claims
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;
                var fiscalYearIdClaim = User.FindFirst("currentFiscalYear")?.Value;

                // 2. Validate required claims exist
                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                {
                    return Unauthorized(new
                    {
                        success = false,
                        error = "Invalid user token. Please login again."
                    });
                }

                // 3. Check if company is selected
                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "No company selected. Please select a company first."
                    });
                }

                // 4. Check if trade type is Retailer
                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new
                    {
                        success = false,
                        error = "Access denied for this trade type"
                    });
                }

                // 5. Validate required fields
                if (string.IsNullOrEmpty(request.Name))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Name is required"
                    });
                }

                if (request.AccountGroups == Guid.Empty)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Account group is required"
                    });
                }

                // 6. Get the company with date format
                var company = await _context.Companies
                    .FirstOrDefaultAsync(c => c.Id == companyIdGuid);

                if (company == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        error = "Company not found"
                    });
                }

                // Determine date format
                bool isNepaliFormat = (company.DateFormat ?? DateFormatEnum.English) == DateFormatEnum.Nepali;

                // 7. Get the initial fiscal year
                var initialFiscalYear = await _context.FiscalYears
                    .Where(f => f.CompanyId == companyIdGuid)
                    .OrderBy(f => f.StartDate)
                    .FirstOrDefaultAsync();

                if (initialFiscalYear == null)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Initial fiscal year not found"
                    });
                }

                // 8. Get current active fiscal year
                var currentFiscalYear = await _context.FiscalYears
                    .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

                if (currentFiscalYear == null)
                {
                    // Get any fiscal year as fallback
                    currentFiscalYear = await _context.FiscalYears
                        .Where(f => f.CompanyId == companyIdGuid)
                        .OrderByDescending(f => f.StartDate)
                        .FirstOrDefaultAsync();

                    if (currentFiscalYear == null)
                    {
                        return BadRequest(new
                        {
                            success = false,
                            error = "No fiscal year found"
                        });
                    }
                }

                // 9. Validate account group
                var accountGroup = await _context.AccountGroups
                    .FirstOrDefaultAsync(ag => ag.Id == request.AccountGroups && ag.CompanyId == companyIdGuid);

                if (accountGroup == null)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Invalid account group for this company"
                    });
                }

                // 10. Check if opening balance is only set in initial fiscal year
                bool isInitialYear = currentFiscalYear.Id == initialFiscalYear.Id;

                if (!isInitialYear && request.OpeningBalance != null && request.OpeningBalance.Amount > 0)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Opening balance can only be set in the initial fiscal year"
                    });
                }

                // 11. Check if account with same name already exists in this company
                var existingAccount = await _context.Accounts
                    .FirstOrDefaultAsync(a => a.CompanyId == companyIdGuid &&
                                              a.Name.ToLower() == request.Name.ToLower());

                if (existingAccount != null)
                {
                    return Conflict(new
                    {
                        success = false,
                        error = "An account with this name already exists within the selected company"
                    });
                }

                // 12. Prepare opening balance data
                decimal openingBalanceAmount = 0;
                string openingBalanceType = "Dr";

                if (isInitialYear && request.OpeningBalance != null)
                {
                    openingBalanceAmount = request.OpeningBalance.Amount ?? 0;
                    openingBalanceType = request.OpeningBalance.Type ?? "Dr";
                }

                Guid fiscalYearId;

                // Check if request.FiscalYearId is provided (add to DTO if needed)
                if (request.FiscalYearId != Guid.Empty)
                {
                    fiscalYearId = request.FiscalYearId;
                }
                else if (!string.IsNullOrEmpty(fiscalYearIdClaim) && Guid.TryParse(fiscalYearIdClaim, out Guid parsedFiscalYearId))
                {
                    fiscalYearId = parsedFiscalYearId;
                }
                else
                {
                    // Get active fiscal year for the company
                    var activeFiscalYear = await _context.FiscalYears
                        .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

                    if (activeFiscalYear == null)
                    {
                        return BadRequest(new
                        {
                            success = false,
                            error = "No active fiscal year found for this company"
                        });
                    }

                    fiscalYearId = activeFiscalYear.Id;
                }

                // *** Validate fiscal year exists and belongs to company ***
                var fiscalYear = await _context.FiscalYears
                    .FirstOrDefaultAsync(f => f.Id == fiscalYearId && f.CompanyId == companyIdGuid);

                if (fiscalYear == null)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = $"Fiscal year {fiscalYearId} not found for this company"
                    });
                }

                // 13. Create new account object
                var newAccount = new Account
                {
                    Id = Guid.NewGuid(),
                    Name = request.Name.Trim(),
                    Address = request.Address?.Trim() ?? string.Empty,
                    Phone = request.Phone?.Trim() ?? string.Empty,
                    Ward = request.Ward,
                    Pan = !string.IsNullOrWhiteSpace(request.Pan) ? request.Pan.Trim() : null,
                    Email = request.Email?.Trim()?.ToLower() ?? string.Empty,
                    ContactPerson = request.ContactPerson?.Trim() ?? string.Empty,
                    CreditLimit = request.CreditLimit ?? 0,
                    AccountGroupsId = request.AccountGroups,
                    OpeningBalanceType = openingBalanceType,
                    CompanyId = companyIdGuid,
                    // OriginalFiscalYearId = currentFiscalYear.Id,
                    // FiscalYearId = fiscalYearId,
                    OriginalFiscalYearId = fiscalYearId,
                    Date = fiscalYear.StartDate.HasValue
                ? fiscalYear.StartDate.Value.ToUniversalTime()
                : DateTime.UtcNow,
                    NepaliDate = !string.IsNullOrEmpty(fiscalYear.StartDateNepali)
                ? fiscalYear.StartDateNepali
                : DateTime.UtcNow.ToString("yyyy-MM-dd"),
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    IsActive = true
                };

                // 14. Set Date and NepaliDate on Account based on company format
                if (isNepaliFormat)
                {
                    // For Nepali format: English date is MinValue, Nepali date is parsed from fiscal year start
                    newAccount.Date = currentFiscalYear.StartDate ?? DateTime.UtcNow;
                    newAccount.NepaliDate = currentFiscalYear.StartDateNepali;
                }
                else
                {
                    // For English format: Use fiscal year start date or current date
                    newAccount.Date = currentFiscalYear.StartDate ?? DateTime.UtcNow;
                    newAccount.NepaliDate = currentFiscalYear.StartDateNepali;
                }

                // // Set OpeningBalanceDate based on fiscal year start date and company format
                // if (isNepaliFormat)
                // {
                //     newAccount.OpeningBalanceDate = DateTime.MinValue; // Placeholder for Nepali date
                //     newAccount.OpeningBalanceDateNepali = currentFiscalYear.StartDateNepali;
                // }
                // else
                // {
                //     newAccount.OpeningBalanceDate = currentFiscalYear.StartDate ?? DateTime.UtcNow;
                //     newAccount.OpeningBalanceDateNepali = null;
                // }

                // 14. Set opening balance entities if amount is not zero
                if (openingBalanceAmount != 0)
                {
                    // Create OpeningBalance entity
                    newAccount.OpeningBalance = new OpeningBalance
                    {
                        Id = Guid.NewGuid(),
                        Amount = openingBalanceAmount,
                        Type = openingBalanceType,
                        FiscalYearId = currentFiscalYear.Id,
                        AccountId = newAccount.Id,
                        CompanyId = companyIdGuid,
                        Date = currentFiscalYear.StartDate.HasValue
                             ? currentFiscalYear.StartDate.Value.ToUniversalTime()
                                : DateTime.UtcNow,
                        NepaliDate = !string.IsNullOrEmpty(currentFiscalYear.StartDateNepali)
                             ? currentFiscalYear.StartDateNepali
                                : DateTime.UtcNow.ToString("yyyy-MM-dd")
                    };

                    // Set date based on company format
                    if (isNepaliFormat)
                    {
                        newAccount.Date = currentFiscalYear.StartDate ?? DateTime.UtcNow;
                        newAccount.NepaliDate = currentFiscalYear.StartDateNepali;
                    }
                    else
                    {
                        newAccount.OpeningBalance.Date = currentFiscalYear.StartDate ?? DateTime.UtcNow;
                        newAccount.OpeningBalance.NepaliDate = null;
                    }

                    // Create InitialOpeningBalance for initial fiscal year
                    if (isInitialYear)
                    {
                        newAccount.InitialOpeningBalance = new InitialOpeningBalance
                        {
                            Id = Guid.NewGuid(),
                            Amount = openingBalanceAmount,
                            Type = openingBalanceType,
                            InitialFiscalYearId = initialFiscalYear.Id,
                            AccountId = newAccount.Id,
                            CompanyId = companyIdGuid,
                            Date = currentFiscalYear.StartDate.HasValue
                             ? currentFiscalYear.StartDate.Value.ToUniversalTime()
                                : DateTime.UtcNow,
                            NepaliDate = !string.IsNullOrEmpty(currentFiscalYear.StartDateNepali)
                             ? currentFiscalYear.StartDateNepali
                                : DateTime.UtcNow.ToString("yyyy-MM-dd")

                        };

                        // Set date based on company format
                        if (isNepaliFormat)
                        {
                            newAccount.InitialOpeningBalance.Date = initialFiscalYear.StartDate ?? DateTime.UtcNow;
                            newAccount.InitialOpeningBalance.NepaliDate = initialFiscalYear.StartDateNepali;
                        }
                        else
                        {
                            newAccount.InitialOpeningBalance.Date = initialFiscalYear.StartDate ?? DateTime.UtcNow;
                            newAccount.InitialOpeningBalance.NepaliDate = initialFiscalYear.StartDateNepali;
                        }
                    }

                    // Create OpeningBalanceByFiscalYear record
                    var openingBalanceByFiscalYear = new OpeningBalanceByFiscalYear
                    {
                        Id = Guid.NewGuid(),
                        Amount = openingBalanceAmount,
                        Type = openingBalanceType,
                        FiscalYearId = currentFiscalYear.Id,
                        AccountId = newAccount.Id,
                        CompanyId = companyIdGuid,
                        Date = currentFiscalYear.StartDate.HasValue
                             ? currentFiscalYear.StartDate.Value.ToUniversalTime()
                                : DateTime.UtcNow,
                        NepaliDate = !string.IsNullOrEmpty(currentFiscalYear.StartDateNepali)
                             ? currentFiscalYear.StartDateNepali
                                : DateTime.UtcNow.ToString("yyyy-MM-dd")

                    };

                    // Set date based on company format
                    if (isNepaliFormat)
                    {
                        openingBalanceByFiscalYear.Date = currentFiscalYear.StartDate ?? DateTime.UtcNow;
                        openingBalanceByFiscalYear.NepaliDate = currentFiscalYear.StartDateNepali;
                    }
                    else
                    {
                        openingBalanceByFiscalYear.Date = currentFiscalYear.StartDate ?? DateTime.UtcNow;
                        openingBalanceByFiscalYear.NepaliDate = currentFiscalYear.StartDateNepali;
                    }

                    newAccount.OpeningBalanceByFiscalYear.Add(openingBalanceByFiscalYear);
                }

                // 15. Save the account
                _context.Accounts.Add(newAccount);
                await _context.SaveChangesAsync();

                // 16. Generate unique number if not set (in case the service didn't set it)
                if (!newAccount.UniqueNumber.HasValue)
                {
                    var uniqueNumber = await _accountService.GenerateUniqueAccountNumberAsync();
                    newAccount.UniqueNumber = uniqueNumber;
                    await _context.SaveChangesAsync();
                }

                // 17. Load related data for response
                await _context.Entry(newAccount)
                    .Reference(a => a.AccountGroup)
                    .LoadAsync();

                await _context.Entry(newAccount)
                    .Reference(a => a.OriginalFiscalYear)
                    .LoadAsync();

                // Load OpeningBalanceByFiscalYear collection
                await _context.Entry(newAccount)
                    .Collection(a => a.OpeningBalanceByFiscalYear)
                    .Query()
                    .Include(ob => ob.FiscalYear)
                    .LoadAsync();

                // 18. Prepare response
                var response = new
                {
                    success = true,
                    message = "Successfully created a new account",
                    data = new
                    {
                        account = new
                        {
                            _id = newAccount.Id,
                            name = newAccount.Name,
                            address = newAccount.Address,
                            phone = newAccount.Phone,
                            ward = newAccount.Ward,
                            pan = newAccount.Pan,
                            email = newAccount.Email,
                            creditLimit = newAccount.CreditLimit,
                            contactperson = newAccount.ContactPerson,
                            openingBalance = new
                            {
                                amount = newAccount.OpeningBalance?.Amount ?? 0,
                                type = newAccount.OpeningBalanceType
                            },
                            openingBalanceByFiscalYear = newAccount.OpeningBalanceByFiscalYear.Select(ob => new
                            {
                                _id = ob.Id,
                                date = ob.Date,
                                amount = ob.Amount,
                                type = ob.Type,
                                fiscalYear = ob.FiscalYear == null ? null : new
                                {
                                    _id = ob.FiscalYear.Id,
                                    name = ob.FiscalYear.Name
                                }
                            }).ToList(),
                            accountGroups = newAccount.AccountGroup == null ? null : new
                            {
                                _id = newAccount.AccountGroup.Id,
                                name = newAccount.AccountGroup.Name
                            },
                            originalFiscalYear = newAccount.OriginalFiscalYear == null ? null : new
                            {
                                _id = newAccount.OriginalFiscalYear.Id,
                                name = newAccount.OriginalFiscalYear.Name
                            },
                            createdAt = newAccount.CreatedAt,
                            updatedAt = newAccount.UpdatedAt,
                            isActive = newAccount.IsActive,
                            uniqueNumber = newAccount.UniqueNumber,
                        }
                    }
                };

                _logger.LogInformation($"Successfully created account '{newAccount.Name}' for company {company.Name}");

                return Ok(response);
            }
            catch (DbUpdateException dbEx)
            {
                _logger.LogError(dbEx, "Database error while creating account");

                // Check for unique constraint violations
                if (dbEx.InnerException?.Message.Contains("IX_Account_Name_CompanyId") == true ||
                    dbEx.InnerException?.Message.Contains("duplicate key") == true)
                {
                    return Conflict(new
                    {
                        success = false,
                        error = "An account with this name already exists"
                    });
                }

                return StatusCode(500, new
                {
                    success = false,
                    error = "Database error while creating account"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in CreateAccount");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while creating account",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        [HttpPut("companies/{id}")]
        public async Task<IActionResult> UpdateAccount(Guid id, [FromBody] UpdateAccountDTO request)
        {
            try
            {
                _logger.LogInformation("=== UpdateAccount Started ===");

                // 1. Extract user and company info from JWT claims
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                // 2. Validate required claims exist
                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                {
                    return Unauthorized(new { success = false, error = "Invalid user token. Please login again." });
                }

                // 3. Check if company is selected
                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new { success = false, error = "No company selected. Please select a company first." });
                }

                // 4. Check if trade type is Retailer
                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new { success = false, error = "Access denied for this trade type" });
                }

                // 5. Validate required fields
                if (string.IsNullOrEmpty(request.Name))
                {
                    return BadRequest(new { success = false, error = "Name is required" });
                }

                if (!request.AccountGroups.HasValue || request.AccountGroups.Value == Guid.Empty)
                {
                    return BadRequest(new { success = false, error = "Account group is required" });
                }

                // 6. Get the company
                var company = await _context.Companies.FirstOrDefaultAsync(c => c.Id == companyIdGuid);
                if (company == null)
                {
                    return NotFound(new { success = false, error = "Company not found" });
                }

                // Determine date format
                bool isNepaliFormat = (company.DateFormat ?? DateFormatEnum.English) == DateFormatEnum.Nepali;

                // 7. Get the initial fiscal year
                var initialFiscalYear = await _context.FiscalYears
                    .Where(f => f.CompanyId == companyIdGuid)
                    .OrderBy(f => f.StartDate)
                    .FirstOrDefaultAsync();

                if (initialFiscalYear == null)
                {
                    return BadRequest(new { success = false, error = "Initial fiscal year not found" });
                }

                // 8. Get current active fiscal year
                var currentFiscalYear = await _context.FiscalYears
                    .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

                if (currentFiscalYear == null)
                {
                    currentFiscalYear = await _context.FiscalYears
                        .Where(f => f.CompanyId == companyIdGuid)
                        .OrderByDescending(f => f.StartDate)
                        .FirstOrDefaultAsync();

                    if (currentFiscalYear == null)
                    {
                        return BadRequest(new { success = false, error = "No fiscal year found" });
                    }
                }

                // 9. Validate account group
                var accountGroup = await _context.AccountGroups
                    .FirstOrDefaultAsync(ag => ag.Id == request.AccountGroups && ag.CompanyId == companyIdGuid);

                if (accountGroup == null)
                {
                    return BadRequest(new { success = false, error = "Invalid account group for this company" });
                }

                // 10. Check if opening balance is only set in initial fiscal year
                bool isInitialYear = currentFiscalYear.Id == initialFiscalYear.Id;

                if (!isInitialYear && request.OpeningBalance != null && request.OpeningBalance.Amount > 0)
                {
                    return BadRequest(new { success = false, error = "Opening balance can only be set in the initial fiscal year" });
                }

                // 11. Find the existing account WITH tracking (NO AsNoTracking)
                var existingAccount = await _context.Accounts
                    .Include(a => a.OpeningBalance)
                    .Include(a => a.InitialOpeningBalance)
                    .Include(a => a.OpeningBalanceByFiscalYear)
                    .FirstOrDefaultAsync(a => a.Id == id && a.CompanyId == companyIdGuid);

                if (existingAccount == null)
                {
                    return NotFound(new { success = false, error = "Account not found" });
                }

                // 12. Check for duplicate name
                var duplicateAccount = await _context.Accounts
                    .AnyAsync(a => a.CompanyId == companyIdGuid &&
                                  a.Id != id &&
                                  a.Name.ToLower() == request.Name.ToLower());

                if (duplicateAccount)
                {
                    return Conflict(new { success = false, error = "An account with this name already exists within the selected company" });
                }

                // 13. Prepare opening balance data
                decimal openingBalanceAmount = 0;
                string openingBalanceType = "Dr";

                if (isInitialYear && request.OpeningBalance != null)
                {
                    openingBalanceAmount = request.OpeningBalance.Amount ?? 0;
                    openingBalanceType = request.OpeningBalance.Type ?? "Dr";
                }

                // 14. Update basic account properties
                existingAccount.Name = request.Name.Trim();
                existingAccount.Address = request.Address?.Trim() ?? string.Empty;
                existingAccount.Phone = request.Phone?.Trim() ?? string.Empty;
                existingAccount.Ward = request.Ward;
                existingAccount.Pan = !string.IsNullOrWhiteSpace(request.Pan) ? request.Pan.Trim() : null;
                existingAccount.Email = request.Email?.Trim()?.ToLower() ?? string.Empty;
                existingAccount.ContactPerson = request.ContactPerson?.Trim() ?? string.Empty;
                existingAccount.CreditLimit = request.CreditLimit ?? 0;
                existingAccount.AccountGroupsId = request.AccountGroups.Value;
                existingAccount.IsActive = request.IsActive;
                existingAccount.OpeningBalanceType = openingBalanceType;
                existingAccount.UpdatedAt = DateTime.UtcNow;

                // Preserve fiscal year fields (don't change them)
                // existingAccount.FiscalYearId stays the same
                // existingAccount.OriginalFiscalYearId stays the same
                // existingAccount.Date stays the same
                // existingAccount.NepaliDate stays the same

                // 15. Handle OpeningBalance - UPDATE instead of Remove/Add
                if (openingBalanceAmount != 0)
                {
                    if (existingAccount.OpeningBalance != null)
                    {
                        // UPDATE existing OpeningBalance
                        existingAccount.OpeningBalance.Amount = openingBalanceAmount;
                        existingAccount.OpeningBalance.Type = openingBalanceType;
                        existingAccount.OpeningBalance.Date = currentFiscalYear.StartDate ?? DateTime.UtcNow;
                        existingAccount.OpeningBalance.NepaliDate = currentFiscalYear.StartDateNepali;
                        existingAccount.OpeningBalance.FiscalYearId = currentFiscalYear.Id;

                        _context.Entry(existingAccount.OpeningBalance).State = EntityState.Modified;
                    }
                    else
                    {
                        // ADD new OpeningBalance
                        existingAccount.OpeningBalance = new OpeningBalance
                        {
                            Id = Guid.NewGuid(),
                            Amount = openingBalanceAmount,
                            Type = openingBalanceType,
                            FiscalYearId = currentFiscalYear.Id,
                            AccountId = id,
                            Date = currentFiscalYear.StartDate ?? DateTime.UtcNow,
                            NepaliDate = currentFiscalYear.StartDateNepali
                        };
                        _context.OpeningBalances.Add(existingAccount.OpeningBalance);
                    }
                }
                else
                {
                    // Remove OpeningBalance if amount is 0
                    if (existingAccount.OpeningBalance != null)
                    {
                        _context.OpeningBalances.Remove(existingAccount.OpeningBalance);
                        existingAccount.OpeningBalance = null;
                    }
                }

                // 16. Handle InitialOpeningBalance - UPDATE instead of Remove/Add
                if (isInitialYear && openingBalanceAmount != 0)
                {
                    if (existingAccount.InitialOpeningBalance != null)
                    {
                        // UPDATE existing InitialOpeningBalance
                        existingAccount.InitialOpeningBalance.Amount = openingBalanceAmount;
                        existingAccount.InitialOpeningBalance.Type = openingBalanceType;
                        existingAccount.InitialOpeningBalance.Date = initialFiscalYear.StartDate ?? DateTime.UtcNow;
                        existingAccount.InitialOpeningBalance.NepaliDate = initialFiscalYear.StartDateNepali;
                        existingAccount.InitialOpeningBalance.InitialFiscalYearId = initialFiscalYear.Id;

                        _context.Entry(existingAccount.InitialOpeningBalance).State = EntityState.Modified;
                    }
                    else
                    {
                        // ADD new InitialOpeningBalance
                        existingAccount.InitialOpeningBalance = new InitialOpeningBalance
                        {
                            Id = Guid.NewGuid(),
                            Amount = openingBalanceAmount,
                            Type = openingBalanceType,
                            InitialFiscalYearId = initialFiscalYear.Id,
                            AccountId = id,
                            Date = initialFiscalYear.StartDate ?? DateTime.UtcNow,
                            NepaliDate = initialFiscalYear.StartDateNepali
                        };
                        _context.InitialOpeningBalances.Add(existingAccount.InitialOpeningBalance);
                    }
                }
                else
                {
                    // Remove InitialOpeningBalance if not initial year or amount is 0
                    if (existingAccount.InitialOpeningBalance != null)
                    {
                        _context.InitialOpeningBalances.Remove(existingAccount.InitialOpeningBalance);
                        existingAccount.InitialOpeningBalance = null;
                    }
                }

                // 17. Handle OpeningBalanceByFiscalYear - UPDATE instead of Remove/Add
                var existingOpeningBalanceByFY = existingAccount.OpeningBalanceByFiscalYear
                    .FirstOrDefault(ob => ob.FiscalYearId == currentFiscalYear.Id);

                if (openingBalanceAmount != 0)
                {
                    if (existingOpeningBalanceByFY != null)
                    {
                        // UPDATE existing OpeningBalanceByFiscalYear
                        existingOpeningBalanceByFY.Amount = openingBalanceAmount;
                        existingOpeningBalanceByFY.Type = openingBalanceType;
                        existingOpeningBalanceByFY.Date = currentFiscalYear.StartDate ?? DateTime.UtcNow;
                        existingOpeningBalanceByFY.NepaliDate = currentFiscalYear.StartDateNepali;

                        _context.Entry(existingOpeningBalanceByFY).State = EntityState.Modified;
                    }
                    else
                    {
                        // ADD new OpeningBalanceByFiscalYear
                        var newOpeningBalanceByFY = new OpeningBalanceByFiscalYear
                        {
                            Id = Guid.NewGuid(),
                            Amount = openingBalanceAmount,
                            Type = openingBalanceType,
                            FiscalYearId = currentFiscalYear.Id,
                            AccountId = id,
                            Date = currentFiscalYear.StartDate ?? DateTime.UtcNow,
                            NepaliDate = currentFiscalYear.StartDateNepali
                        };
                        existingAccount.OpeningBalanceByFiscalYear.Add(newOpeningBalanceByFY);
                        _context.OpeningBalanceByFiscalYear.Add(newOpeningBalanceByFY);
                    }
                }
                else
                {
                    // Remove OpeningBalanceByFiscalYear if amount is 0
                    if (existingOpeningBalanceByFY != null)
                    {
                        _context.OpeningBalanceByFiscalYear.Remove(existingOpeningBalanceByFY);
                        existingAccount.OpeningBalanceByFiscalYear.Remove(existingOpeningBalanceByFY);
                    }
                }

                // 18. Save changes
                await _context.SaveChangesAsync();

                // 19. Load the updated account for response
                var updatedAccount = await _context.Accounts
                    .Include(a => a.AccountGroup)
                    .Include(a => a.OpeningBalance)
                    .Include(a => a.OriginalFiscalYear)
                    .Include(a => a.OpeningBalanceByFiscalYear)
                        .ThenInclude(ob => ob.FiscalYear)
                    .FirstOrDefaultAsync(a => a.Id == id);

                // 20. Prepare response
                var response = new
                {
                    success = true,
                    message = "Account updated successfully",
                    data = new
                    {
                        account = new
                        {
                            _id = updatedAccount.Id,
                            name = updatedAccount.Name,
                            address = updatedAccount.Address,
                            phone = updatedAccount.Phone,
                            ward = updatedAccount.Ward,
                            pan = updatedAccount.Pan,
                            email = updatedAccount.Email,
                            creditLimit = updatedAccount.CreditLimit,
                            contactperson = updatedAccount.ContactPerson,
                            date = updatedAccount.Date,
                            nepaliDate = updatedAccount.NepaliDate,
                            openingBalance = new
                            {
                                amount = updatedAccount.OpeningBalance?.Amount ?? 0,
                                type = updatedAccount.OpeningBalanceType
                            },
                            openingBalanceByFiscalYear = updatedAccount.OpeningBalanceByFiscalYear.Select(ob => new
                            {
                                _id = ob.Id,
                                date = ob.Date,
                                amount = ob.Amount,
                                type = ob.Type,
                                fiscalYear = ob.FiscalYear == null ? null : new
                                {
                                    _id = ob.FiscalYear.Id,
                                    name = ob.FiscalYear.Name
                                }
                            }).ToList(),
                            accountGroups = updatedAccount.AccountGroup == null ? null : new
                            {
                                _id = updatedAccount.AccountGroup.Id,
                                name = updatedAccount.AccountGroup.Name
                            },
                            originalFiscalYear = updatedAccount.OriginalFiscalYear == null ? null : new
                            {
                                _id = updatedAccount.OriginalFiscalYear.Id,
                                name = updatedAccount.OriginalFiscalYear.Name
                            },
                            createdAt = updatedAccount.CreatedAt,
                            updatedAt = updatedAccount.UpdatedAt,
                            isActive = updatedAccount.IsActive,
                            uniqueNumber = updatedAccount.UniqueNumber
                        }
                    }
                };

                _logger.LogInformation($"Successfully updated account '{updatedAccount.Name}' for company {company.Name}");

                return Ok(response);
            }
            catch (DbUpdateConcurrencyException concurrencyEx)
            {
                _logger.LogError(concurrencyEx, "Concurrency error while updating account");

                // Refresh the entity to see what changed
                var entry = concurrencyEx.Entries.First();
                var databaseValues = await entry.GetDatabaseValuesAsync();

                if (databaseValues == null)
                {
                    return NotFound(new { success = false, error = "Account was deleted during the update operation" });
                }

                // Log the differences for debugging
                var currentValues = entry.CurrentValues;
                foreach (var property in currentValues.Properties)
                {
                    var currentValue = currentValues[property];
                    var databaseValue = databaseValues[property];
                    if (!Equals(currentValue, databaseValue))
                    {
                        _logger.LogWarning($"Property '{property.Name}' changed from '{databaseValue}' to '{currentValue}'");
                    }
                }

                return StatusCode(409, new
                {
                    success = false,
                    error = "The account was modified by another user. Please refresh and try again.",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? concurrencyEx.Message : null
                });
            }
            catch (DbUpdateException dbEx)
            {
                _logger.LogError(dbEx, "Database error while updating account");

                // Check for specific constraint violations
                if (dbEx.InnerException?.Message?.Contains("unique constraint") == true ||
                    dbEx.InnerException?.Message?.Contains("23505") == true)
                {
                    return Conflict(new { success = false, error = "An account with this name already exists" });
                }

                return StatusCode(500, new { success = false, error = "Database error while updating account" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in UpdateAccount");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while updating account",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // GET: api/retailer/companies/{id}
        [HttpGet("companies/{id}")]
        public async Task<IActionResult> GetAccount(Guid id)
        {
            try
            {
                _logger.LogInformation("=== GetAccount Started ===");

                // 1. Extract user and company info from JWT claims
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                // 2. Validate required claims exist
                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                {
                    return Unauthorized(new
                    {
                        success = false,
                        error = "Invalid user token. Please login again."
                    });
                }

                // 3. Check if company is selected
                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "No company selected. Please select a company first."
                    });
                }

                // 4. Check if trade type is Retailer
                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new
                    {
                        success = false,
                        error = "Access restricted to retailer accounts"
                    });
                }

                // 5. Get the company with fiscal year
                var company = await _context.Companies
                    .Include(c => c.FiscalYears)
                    .FirstOrDefaultAsync(c => c.Id == companyIdGuid);

                if (company == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        error = "Company not found"
                    });
                }

                // 6. Get current active fiscal year
                var currentFiscalYear = await _context.FiscalYears
                    .FirstOrDefaultAsync(f => f.CompanyId == companyIdGuid && f.IsActive);

                if (currentFiscalYear == null)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "No active fiscal year found"
                    });
                }

                // 7. Get account with all related data
                var account = await _context.Accounts
                    .Include(a => a.AccountGroup)
                    .Include(a => a.Company)
                    .Include(a => a.OpeningBalanceByFiscalYear)
                        .ThenInclude(ob => ob.FiscalYear)
                    .Include(a => a.FiscalYears)
                    .FirstOrDefaultAsync(a => a.Id == id && a.CompanyId == companyIdGuid);

                if (account == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        error = "Account not found"
                    });
                }

                // 8. Get company groups (account groups in your schema)
                var companyGroups = await _context.AccountGroups
                    .Where(ag => ag.CompanyId == companyIdGuid)
                    .ToListAsync();

                // 9. Find opening balance for current fiscal year
                var currentOpeningBalance = account.OpeningBalanceByFiscalYear
                    .FirstOrDefault(ob => ob.FiscalYearId == currentFiscalYear.Id);

                // 10. Prepare company information
                var companyInfo = new
                {
                    id = company.Id,
                    renewalDate = company.RenewalDate, // Make sure this property exists in your Company model
                    dateFormat = company.DateFormat // Make sure this property exists
                };

                // 11. Prepare account groups response
                var accountGroupsResponse = account.AccountGroup != null
                    ? new[]
                    {
                new
                {
                    id = account.AccountGroup.Id,
                    name = account.AccountGroup.Name
                }
                    }
                    : Array.Empty<object>();

                // 12. Prepare fiscal year information
                var fiscalYearInfo = new
                {
                    id = currentFiscalYear.Id,
                    name = currentFiscalYear.Name,
                    startDate = currentFiscalYear.StartDate,
                    endDate = currentFiscalYear.EndDate,
                    isActive = currentFiscalYear.IsActive,
                    dateFormat = currentFiscalYear.DateFormat
                };

                // 13. Prepare company groups list
                var companyGroupsResponse = companyGroups.Select(g => new
                {
                    id = g.Id,
                    name = g.Name
                }).ToList();

                // 14. Prepare the main response
                var response = new
                {
                    success = true,
                    data = new
                    {
                        company = companyInfo,
                        account = new
                        {
                            _id = account.Id,
                            name = account.Name,
                            address = account.Address,
                            phone = account.Phone,
                            ward = account.Ward,
                            pan = account.Pan,
                            email = account.Email,
                            contactPerson = account.ContactPerson,
                            creditLimit = account.CreditLimit,
                            companyGroups = accountGroupsResponse,
                            openingBalance = currentOpeningBalance != null
                                ? new
                                {
                                    amount = currentOpeningBalance.Amount,
                                    type = currentOpeningBalance.Type,
                                    date = currentOpeningBalance.Date
                                }
                                : null,
                            openingBalanceType = account.OpeningBalanceType,
                            // openingBalanceDate = account.OpeningBalanceDate,
                            defaultCashAccount = account.DefaultCashAccount,
                            defaultVatAccount = account.DefaultVatAccount,
                            isDefaultAccount = account.IsDefaultAccount,
                            isActive = account.IsActive,
                            createdAt = account.CreatedAt,
                            updatedAt = account.UpdatedAt,
                            // Include additional properties from your Account model if needed
                            uniqueNumber = account.UniqueNumber,
                            originalFiscalYearId = account.OriginalFiscalYearId,
                            accountGroupsId = account.AccountGroupsId
                        },
                        financialInfo = new
                        {
                            currentOpeningBalance = currentOpeningBalance != null
                                ? new
                                {
                                    id = currentOpeningBalance.Id,
                                    amount = currentOpeningBalance.Amount,
                                    type = currentOpeningBalance.Type,
                                    date = currentOpeningBalance.Date,
                                    fiscalYearId = currentOpeningBalance.FiscalYearId,
                                    fiscalYear = currentOpeningBalance.FiscalYear != null
                                        ? new
                                        {
                                            id = currentOpeningBalance.FiscalYear.Id,
                                            name = currentOpeningBalance.FiscalYear.Name
                                        }
                                        : null
                                }
                                : null,
                            fiscalYear = fiscalYearInfo
                        },
                        companyGroups = companyGroupsResponse,
                        currentCompanyName = company.Name, // Assuming Company has a Name property
                        user = new
                        {
                            id = userIdGuid,
                            // You'll need to fetch user details from database or claims
                            role = User.FindFirst(ClaimTypes.Role)?.Value ?? "User",
                            isAdmin = User.IsInRole("Admin"),
                            preferences = new object() // Add user preferences if available
                        },
                        isAdminOrSupervisor = User.IsInRole("Admin") || User.IsInRole("Supervisor")
                    }
                };

                _logger.LogInformation($"Successfully retrieved account '{account.Name}'");

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetAccount");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while fetching account",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }

        // DELETE: api/retailer/companies/{id}
        [HttpDelete("companies/{id}")]
        public async Task<IActionResult> DeleteAccount(Guid id)
        {
            try
            {
                _logger.LogInformation("=== DeleteAccount Started ===");

                // 1. Extract user and company info from JWT claims
                var userId = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var companyId = User.FindFirst("currentCompany")?.Value;
                var tradeTypeClaim = User.FindFirst("tradeType")?.Value;

                // 2. Validate required claims exist
                if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out Guid userIdGuid))
                {
                    return Unauthorized(new
                    {
                        success = false,
                        error = "Invalid user token. Please login again."
                    });
                }

                // 3. Check if company is selected
                if (string.IsNullOrEmpty(companyId) || !Guid.TryParse(companyId, out Guid companyIdGuid))
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "No company selected. Please select a company first."
                    });
                }

                // 4. Check if trade type is Retailer
                if (string.IsNullOrEmpty(tradeTypeClaim) || !Enum.TryParse<TradeType>(tradeTypeClaim, out var tradeType) || tradeType != TradeType.Retailer)
                {
                    return StatusCode(403, new
                    {
                        success = false,
                        error = "Access denied for this trade type"
                    });
                }

                // 5. Find the account
                var account = await _context.Accounts
                    .FirstOrDefaultAsync(a => a.Id == id && a.CompanyId == companyIdGuid);

                if (account == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        error = "Account not found or does not belong to your company"
                    });
                }

                // 6. Check if it's a default cash account
                if (account.DefaultCashAccount)
                {
                    return StatusCode(403, new
                    {
                        success = false,
                        error = "Cannot delete default cash account"
                    });
                }

                // 7. Check for associated transactions
                // Assuming you have a Transaction model with AccountId foreign key
                var hasTransactions = await _context.Transactions
                    .AnyAsync(t => t.AccountId == id);

                // Also check for other related entities if they exist
                // For example: OpeningBalanceByFiscalYear, ClosingBalanceByFiscalYear, etc.
                var hasOpeningBalances = await _context.Set<OpeningBalanceByFiscalYear>()
                    .AnyAsync(ob => ob.AccountId == id);

                var hasClosingBalances = await _context.Set<ClosingBalanceByFiscalYear>()
                    .AnyAsync(cb => cb.AccountId == id);

                if (hasTransactions || hasOpeningBalances || hasClosingBalances)
                {
                    return BadRequest(new
                    {
                        success = false,
                        error = "Cannot delete account with associated records (transactions, opening balances, or closing balances)"
                    });
                }

                // 8. Begin transaction for safe deletion
                using var transaction = await _context.Database.BeginTransactionAsync();

                try
                {
                    // Delete related OpeningBalance if exists
                    if (account.OpeningBalance != null)
                    {
                        _context.OpeningBalances.Remove(account.OpeningBalance);
                    }

                    // Delete related InitialOpeningBalance if exists
                    if (account.InitialOpeningBalance != null)
                    {
                        _context.InitialOpeningBalances.Remove(account.InitialOpeningBalance);
                    }

                    // Remove from FiscalYears collection
                    await _context.Entry(account)
                        .Collection(a => a.FiscalYears)
                        .LoadAsync();
                    account.FiscalYears.Clear();

                    // Delete the account
                    _context.Accounts.Remove(account);

                    // Save all changes
                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();

                    _logger.LogInformation($"Successfully deleted account '{account.Name}' with ID: {id}");

                    return Ok(new
                    {
                        success = true,
                        message = "Account deleted successfully",
                        data = new
                        {
                            id = account.Id,
                            name = account.Name
                        }
                    });
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            }
            catch (DbUpdateException dbEx)
            {
                _logger.LogError(dbEx, "Database error while deleting account");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Database error while deleting account"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in DeleteAccount");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Internal server error while deleting account",
                    details = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development" ? ex.Message : null
                });
            }
        }
    }
}