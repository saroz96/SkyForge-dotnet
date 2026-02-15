//using SkyForge.Models.AccountGroupModel;
//using System.Collections.Generic;
//using System.Threading.Tasks;

//namespace SkyForge.Services.AccountGroupServices
//{
//    public interface IAccountGroupService
//    {
//        Task<AccountGroup> CreateAccountGroupAsync(AccountGroup accountGroup);
//        Task<AccountGroup> GetAccountGroupByIdAsync(int id);
//        Task<List<AccountGroup>> GetAccountGroupsByCompanyAsync(int companyId);
//        Task<AccountGroup> UpdateAccountGroupAsync(int id, AccountGroup accountGroup);
//        Task<bool> DeleteAccountGroupAsync(int id);
//        Task<bool> AddDefaultAccountGroupsAsync(int companyId);
//        Task<AccountGroup> GetAccountGroupByNameAsync(int companyId, string name);
//        Task<List<AccountGroup>> GetAccountGroupsByTypeAsync(int companyId, string type);
//    }
//}
using SkyForge.Models.AccountGroupModel;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace SkyForge.Services.AccountGroupServices
{
    public interface IAccountGroupService
    {
        Task<AccountGroup> CreateAccountGroupAsync(AccountGroup accountGroup);
        Task<AccountGroup> GetAccountGroupByIdAsync(Guid id);
        Task<List<AccountGroup>> GetAccountGroupsByCompanyAsync(Guid companyId);
        Task<AccountGroup> UpdateAccountGroupAsync(Guid id, AccountGroup accountGroup);
        Task<bool> DeleteAccountGroupAsync(Guid id);
        Task<bool> AddDefaultAccountGroupsAsync(Guid companyId);
        Task<AccountGroup> GetAccountGroupByNameAsync(Guid companyId, string name);
        Task<List<AccountGroup>> GetAccountGroupsByTypeAsync(Guid companyId, string type);
    }
}