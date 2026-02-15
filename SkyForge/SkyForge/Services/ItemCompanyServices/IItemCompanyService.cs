using SkyForge.Models.Retailer.ItemCompanyModel;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace SkyForge.Services.ItemCompanyServices
{
    public interface IItemCompanyService
    {
        Task<ItemCompany> CreateItemCompanyAsync(ItemCompany itemCompany);
        Task<ItemCompany> GetItemCompanyByIdAsync(Guid id);
        Task<List<ItemCompany>> GetItemCompaniesByCompanyAsync(Guid companyId);
        Task<ItemCompany> UpdateItemCompanyAsync(Guid id, ItemCompany itemCompany);
        Task<bool> DeleteItemCompanyAsync(Guid id);
        Task<bool> AddDefaultItemCompanyAsync(Guid companyId);
        Task<ItemCompany> GetItemCompanyByNameAsync(Guid companyId, string name);
        Task<List<ItemCompany>> SearchItemCompaniesAsync(Guid companyId, string searchTerm);
        Task<ItemCompany> GetOrCreateItemCompanyAsync(Guid companyId, string name);
        Task<bool> BulkCreateItemCompaniesAsync(Guid companyId, List<string> companyNames);
        Task<int> GenerateUniqueItemCompanyNumberAsync();
        Task<bool> AddMultipleDefaultItemCompaniesAsync(Guid companyId);
    }
}