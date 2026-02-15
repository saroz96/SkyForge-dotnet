using SkyForge.Models.AccountModel;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace SkyForge.Services.AccountServices
{
    public interface IAccountService
    {
        Task<Account> CreateAccountAsync(Account account);
        Task<Account> GetAccountByIdAsync(Guid id);
        Task<List<Account>> GetAccountsByCompanyAsync(Guid companyId);
        Task<List<Account>> GetAccountsByCompanyGroupAsync(Guid companyId, Guid companyGroupsId);
        Task<Account> UpdateAccountAsync(Guid id, Account account);
        Task<bool> DeleteAccountAsync(Guid id);
        Task<int> GenerateUniqueAccountNumberAsync();
        Task<Account> GetAccountByUniqueNumberAsync(int uniqueNumber);
        Task<List<Account>> SearchAccountsAsync(Guid companyId, string searchTerm);

        // Default account creation methods
        Task<Account> AddDefaultCashAccountAsync(Guid companyId);
        Task<Account> AddDefaultVatAccountAsync(Guid companyId);
        Task<bool> AddOtherDefaultAccountsAsync(Guid companyId);
    }
}