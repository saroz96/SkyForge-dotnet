//using SkyForge.Models.Retailer.StoreModel;
//using System.Collections.Generic;
//using System.Threading.Tasks;

//namespace SkyForge.Services.StoreServices
//{
//    public interface IStoreService
//    {
//        Task<Store> CreateStoreAsync(Store store);
//        Task<Store> GetStoreByIdAsync(int id);
//        Task<List<Store>> GetStoresByCompanyAsync(int companyId);
//        Task<Store> UpdateStoreAsync(int id, Store store);
//        Task<bool> DeleteStoreAsync(int id);
//        Task<Store> CreateDefaultStoreAsync(int companyId);
//        Task<Store> GetStoreByNameAsync(int companyId, string name);
//        Task<List<Store>> SearchStoresAsync(int companyId, string searchTerm);
//        Task<Store> GetOrCreateStoreAsync(int companyId, string name, string? description = null);
//        Task<int> GetStoreCountAsync(int companyId);
//        Task<List<Store>> GetActiveStoresAsync(int companyId);
//        Task<bool> ToggleStoreStatusAsync(int storeId, bool isActive);
//    }
//}

using SkyForge.Models.Retailer.StoreModel;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace SkyForge.Services.StoreServices
{
    public interface IStoreService
    {
        Task<Store> CreateStoreAsync(Store store);
        Task<Store> GetStoreByIdAsync(Guid id);
        Task<List<Store>> GetStoresByCompanyAsync(Guid companyId);
        Task<Store> UpdateStoreAsync(Guid id, Store store);
        Task<bool> DeleteStoreAsync(Guid id);
        Task<Store> CreateDefaultStoreAsync(Guid companyId);
        Task<Store> GetStoreByNameAsync(Guid companyId, string name);
        Task<List<Store>> SearchStoresAsync(Guid companyId, string searchTerm);
        Task<Store> GetOrCreateStoreAsync(Guid companyId, string name, string? description = null);
        Task<int> GetStoreCountAsync(Guid companyId);
        Task<List<Store>> GetActiveStoresAsync(Guid companyId);
        Task<bool> ToggleStoreStatusAsync(Guid storeId, bool isActive);
    }
}
