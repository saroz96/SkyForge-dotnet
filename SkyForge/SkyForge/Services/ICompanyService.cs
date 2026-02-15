using SkyForge.Data;
using SkyForge.Models.CompanyModel;
using SkyForge.Models.FiscalYearModel;
using SkyForge.Models.RackModel;
using SkyForge.Models.Retailer.StoreModel;
using SkyForge.Models.Shared;
using SkyForge.Services.AccountGroupServices;
using SkyForge.Services.AccountServices;
using SkyForge.Services.CategoryServices;
using SkyForge.Services.ItemCompanyServices;
using SkyForge.Services.Retailer.SettingsServices;
using SkyForge.Services.UnitServices;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace SkyForge.Services
{
    public interface ICompanyService
    {
        Task<Company> CreateCompanyAsync(Company company, Guid ownerId);
        Task<Company> GetCompanyByIdAsync(Guid id);
        Task<Company> GetCompanyByNameAsync(string name);
        Task<List<Company>> GetUserCompaniesAsync(Guid userId);
        Task<List<Company>> GetCompaniesByOwnerAsync(Guid ownerId);
        Task<List<Company>> GetCompaniesByUserAsync(Guid userId);
        Task<bool> AddUserToCompanyAsync(Guid companyId, Guid userId, Guid addedByUserId);
        Task<bool> RemoveUserFromCompanyAsync(Guid companyId, Guid userId);
        Task<bool> DeleteCompanyAsync(Guid companyId);
        Task<Company> UpdateCompanyAsync(Guid companyId, Company updatedCompany);
        Task<List<string>> GetNotificationEmailsAsync(Guid companyId);
    }
}
