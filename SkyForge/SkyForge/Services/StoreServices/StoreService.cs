//using Microsoft.EntityFrameworkCore;
//using SkyForge.Data;
//using SkyForge.Models.Retailer.StoreModel;
//using SkyForge.Services.StoreServices;
//using System;
//using System.Collections.Generic;
//using System.Linq;
//using System.Threading.Tasks;

//namespace SkyForge.Services
//{
//    public class StoreService : IStoreService
//    {
//        private readonly ApplicationDbContext _context;
//        private readonly ILogger<StoreService> _logger;

//        public StoreService(ApplicationDbContext context, ILogger<StoreService> logger)
//        {
//            _context = context;
//            _logger = logger;
//        }

//        public async Task<Store> CreateStoreAsync(Store store)
//        {
//            try
//            {
//                // Validate company exists
//                var company = await _context.Companies.FindAsync(store.CompanyId);
//                if (company == null)
//                {
//                    throw new KeyNotFoundException($"Company with ID {store.CompanyId} not found");
//                }

//                // Check if store with same name already exists for this company
//                var existingStore = await _context.Stores
//                    .FirstOrDefaultAsync(s => s.CompanyId == store.CompanyId &&
//                                              s.Name.ToLower() == store.Name.ToLower());

//                if (existingStore != null)
//                {
//                    throw new InvalidOperationException($"Store '{store.Name}' already exists for this company");
//                }

//                store.CreatedAt = DateTime.UtcNow;
//                store.UpdatedAt = null;
//                store.IsActive = store.IsActive;

//                _context.Stores.Add(store);
//                await _context.SaveChangesAsync();

//                _logger.LogInformation("Store '{StoreName}' created with ID {StoreId} for company {CompanyId}",
//                    store.Name, store.Id, store.CompanyId);

//                return store;
//            }
//            catch (Exception ex)
//            {
//                _logger.LogError(ex, "Error creating store '{StoreName}' for company {CompanyId}",
//                    store.Name, store.CompanyId);
//                throw;
//            }
//        }

//        public async Task<Store> GetStoreByIdAsync(int id)
//        {
//            try
//            {
//                var store = await _context.Stores
//                    .Include(s => s.Company)
//                    .Include(s => s.Racks)
//                    .FirstOrDefaultAsync(s => s.Id == id);

//                if (store == null)
//                {
//                    _logger.LogWarning("Store {StoreId} not found", id);
//                }

//                return store;
//            }
//            catch (Exception ex)
//            {
//                _logger.LogError(ex, "Error getting store {StoreId}", id);
//                throw;
//            }
//        }

//        public async Task<List<Store>> GetStoresByCompanyAsync(int companyId)
//        {
//            try
//            {
//                var stores = await _context.Stores
//                    .Where(s => s.CompanyId == companyId)
//                    .Include(s => s.Company)
//                    .Include(s => s.Racks)
//                    .OrderBy(s => s.Name)
//                    .ToListAsync();

//                _logger.LogInformation("Retrieved {Count} stores for company {CompanyId}",
//                    stores.Count, companyId);

//                return stores;
//            }
//            catch (Exception ex)
//            {
//                _logger.LogError(ex, "Error getting stores for company {CompanyId}", companyId);
//                throw;
//            }
//        }

//        public async Task<Store> UpdateStoreAsync(int id, Store store)
//        {
//            try
//            {
//                var existingStore = await _context.Stores.FindAsync(id);
//                if (existingStore == null)
//                {
//                    throw new KeyNotFoundException($"Store with ID {id} not found");
//                }

//                // Check if new name conflicts with another store in the same company
//                if (existingStore.Name.ToLower() != store.Name.ToLower())
//                {
//                    var duplicate = await _context.Stores
//                        .FirstOrDefaultAsync(s => s.CompanyId == existingStore.CompanyId &&
//                                                 s.Id != id &&
//                                                 s.Name.ToLower() == store.Name.ToLower());

//                    if (duplicate != null)
//                    {
//                        throw new InvalidOperationException($"Store '{store.Name}' already exists for this company");
//                    }
//                }

//                // Update properties
//                existingStore.Name = store.Name;
//                existingStore.Description = store.Description;
//                existingStore.IsActive = store.IsActive;
//                existingStore.UpdatedAt = DateTime.UtcNow;

//                await _context.SaveChangesAsync();

//                _logger.LogInformation("Store {StoreId} updated to '{StoreName}'", id, existingStore.Name);

//                return existingStore;
//            }
//            catch (Exception ex)
//            {
//                _logger.LogError(ex, "Error updating store {StoreId}", id);
//                throw;
//            }
//        }

//        public async Task<bool> DeleteStoreAsync(int id)
//        {
//            try
//            {
//                var store = await _context.Stores
//                    .Include(s => s.Racks)
//                    .FirstOrDefaultAsync(s => s.Id == id);

//                if (store == null)
//                {
//                    _logger.LogWarning("Store {StoreId} not found for deletion", id);
//                    return false;
//                }

//                // Check if store has racks
//                if (store.Racks.Any())
//                {
//                    throw new InvalidOperationException(
//                        $"Cannot delete store '{store.Name}' because it contains {store.Racks.Count} racks. " +
//                        "Please delete the racks first or move them to another store.");
//                }

//                _context.Stores.Remove(store);
//                await _context.SaveChangesAsync();

//                _logger.LogInformation("Store {StoreId} '{StoreName}' deleted", id, store.Name);
//                return true;
//            }
//            catch (Exception ex)
//            {
//                _logger.LogError(ex, "Error deleting store {StoreId}", id);
//                throw;
//            }
//        }

//        public async Task<Store> CreateDefaultStoreAsync(int companyId)
//        {
//            try
//            {
//                _logger.LogInformation("Creating default store for company {CompanyId}", companyId);

//                // Check if company exists
//                var company = await _context.Companies.FindAsync(companyId);
//                if (company == null)
//                {
//                    throw new KeyNotFoundException($"Company with ID {companyId} not found");
//                }

//                // Check if default store already exists
//                var existingStore = await _context.Stores
//                    .FirstOrDefaultAsync(s => s.CompanyId == companyId &&
//                                              s.Name.ToLower() == "main");

//                if (existingStore != null)
//                {
//                    _logger.LogInformation("Default store already exists for company {CompanyId}", companyId);
//                    return existingStore;
//                }

//                // Create default store
//                var defaultStore = new Store
//                {
//                    Name = "Main",
//                    Description = "Default main store",
//                    CompanyId = companyId,
//                    IsActive = true,
//                    CreatedAt = DateTime.UtcNow
//                };

//                _context.Stores.Add(defaultStore);
//                await _context.SaveChangesAsync();

//                _logger.LogInformation("Default store '{StoreName}' created with ID {StoreId} for company {CompanyId}",
//                    defaultStore.Name, defaultStore.Id, companyId);

//                return defaultStore;
//            }
//            catch (Exception ex)
//            {
//                _logger.LogError(ex, "Error creating default store for company {CompanyId}", companyId);
//                throw;
//            }
//        }

//        public async Task<Store> GetStoreByNameAsync(int companyId, string name)
//        {
//            try
//            {
//                var store = await _context.Stores
//                    .Include(s => s.Company)
//                    .FirstOrDefaultAsync(s => s.CompanyId == companyId &&
//                                              s.Name.ToLower() == name.ToLower());

//                if (store == null)
//                {
//                    _logger.LogDebug("Store '{StoreName}' not found for company {CompanyId}", name, companyId);
//                }

//                return store;
//            }
//            catch (Exception ex)
//            {
//                _logger.LogError(ex, "Error getting store '{StoreName}' for company {CompanyId}", name, companyId);
//                throw;
//            }
//        }

//        public async Task<List<Store>> SearchStoresAsync(int companyId, string searchTerm)
//        {
//            try
//            {
//                if (string.IsNullOrWhiteSpace(searchTerm))
//                {
//                    return await GetStoresByCompanyAsync(companyId);
//                }

//                var stores = await _context.Stores
//                    .Where(s => s.CompanyId == companyId &&
//                               (s.Name.ToLower().Contains(searchTerm.ToLower()) ||
//                                (s.Description != null && s.Description.ToLower().Contains(searchTerm.ToLower()))))
//                    .Include(s => s.Company)
//                    .Include(s => s.Racks)
//                    .OrderBy(s => s.Name)
//                    .Take(50)
//                    .ToListAsync();

//                _logger.LogInformation("Found {Count} stores matching '{SearchTerm}' for company {CompanyId}",
//                    stores.Count, searchTerm, companyId);

//                return stores;
//            }
//            catch (Exception ex)
//            {
//                _logger.LogError(ex, "Error searching stores with term '{SearchTerm}' for company {CompanyId}",
//                    searchTerm, companyId);
//                throw;
//            }
//        }

//        public async Task<Store> GetOrCreateStoreAsync(int companyId, string name, string? description = null)
//        {
//            try
//            {
//                var store = await GetStoreByNameAsync(companyId, name);

//                if (store == null)
//                {
//                    store = new Store
//                    {
//                        Name = name,
//                        Description = description,
//                        CompanyId = companyId,
//                        IsActive = true,
//                        CreatedAt = DateTime.UtcNow
//                    };

//                    store = await CreateStoreAsync(store);
//                    _logger.LogInformation("Created store '{StoreName}' for company {CompanyId}", name, companyId);
//                }

//                return store;
//            }
//            catch (Exception ex)
//            {
//                _logger.LogError(ex, "Error getting or creating store '{StoreName}' for company {CompanyId}",
//                    name, companyId);
//                throw;
//            }
//        }

//        public async Task<int> GetStoreCountAsync(int companyId)
//        {
//            try
//            {
//                var count = await _context.Stores
//                    .CountAsync(s => s.CompanyId == companyId);

//                _logger.LogDebug("Store count for company {CompanyId}: {Count}", companyId, count);
//                return count;
//            }
//            catch (Exception ex)
//            {
//                _logger.LogError(ex, "Error getting store count for company {CompanyId}", companyId);
//                throw;
//            }
//        }

//        public async Task<List<Store>> GetActiveStoresAsync(int companyId)
//        {
//            try
//            {
//                var activeStores = await _context.Stores
//                    .Where(s => s.CompanyId == companyId && s.IsActive)
//                    .Include(s => s.Company)
//                    .Include(s => s.Racks)
//                    .OrderBy(s => s.Name)
//                    .ToListAsync();

//                _logger.LogInformation("Retrieved {Count} active stores for company {CompanyId}",
//                    activeStores.Count, companyId);

//                return activeStores;
//            }
//            catch (Exception ex)
//            {
//                _logger.LogError(ex, "Error getting active stores for company {CompanyId}", companyId);
//                throw;
//            }
//        }

//        public async Task<bool> ToggleStoreStatusAsync(int storeId, bool isActive)
//        {
//            try
//            {
//                var store = await _context.Stores.FindAsync(storeId);
//                if (store == null)
//                {
//                    _logger.LogWarning("Store {StoreId} not found for status toggle", storeId);
//                    return false;
//                }

//                store.IsActive = isActive;
//                store.UpdatedAt = DateTime.UtcNow;

//                await _context.SaveChangesAsync();

//                _logger.LogInformation("Store {StoreId} status changed to {Status}",
//                    storeId, isActive ? "Active" : "Inactive");

//                return true;
//            }
//            catch (Exception ex)
//            {
//                _logger.LogError(ex, "Error toggling store status for store {StoreId}", storeId);
//                throw;
//            }
//        }

//        // Additional helper methods

//        public async Task<bool> HasDefaultStoreAsync(int companyId)
//        {
//            try
//            {
//                return await _context.Stores
//                    .AnyAsync(s => s.CompanyId == companyId && s.Name.ToLower() == "main");
//            }
//            catch (Exception ex)
//            {
//                _logger.LogError(ex, "Error checking if company {CompanyId} has default store", companyId);
//                throw;
//            }
//        }

//        public async Task<Store> GetPrimaryStoreAsync(int companyId)
//        {
//            try
//            {
//                // Try to get the default "Main" store
//                var mainStore = await GetStoreByNameAsync(companyId, "Main");
//                if (mainStore != null)
//                {
//                    return mainStore;
//                }

//                // If no main store, get the first active store
//                var firstStore = await _context.Stores
//                    .Where(s => s.CompanyId == companyId && s.IsActive)
//                    .FirstOrDefaultAsync();

//                if (firstStore == null)
//                {
//                    // If no active stores, get any store
//                    firstStore = await _context.Stores
//                        .Where(s => s.CompanyId == companyId)
//                        .FirstOrDefaultAsync();
//                }

//                return firstStore;
//            }
//            catch (Exception ex)
//            {
//                _logger.LogError(ex, "Error getting primary store for company {CompanyId}", companyId);
//                throw;
//            }
//        }

//        public async Task<List<Store>> GetStoresWithRackCountAsync(int companyId)
//        {
//            try
//            {
//                var stores = await _context.Stores
//                    .Where(s => s.CompanyId == companyId)
//                    .Include(s => s.Racks)
//                    .Select(s => new
//                    {
//                        Store = s,
//                        RackCount = s.Racks.Count
//                    })
//                    .OrderBy(s => s.Store.Name)
//                    .ToListAsync();

//                return stores.Select(s =>
//                {
//                    s.Store.Racks = s.Store.Racks; // Keep the racks
//                    return s.Store;
//                }).ToList();
//            }
//            catch (Exception ex)
//            {
//                _logger.LogError(ex, "Error getting stores with rack count for company {CompanyId}", companyId);
//                throw;
//            }
//        }

//        public async Task<bool> ValidateStoreAccessAsync(int storeId, int companyId)
//        {
//            try
//            {
//                return await _context.Stores
//                    .AnyAsync(s => s.Id == storeId && s.CompanyId == companyId);
//            }
//            catch (Exception ex)
//            {
//                _logger.LogError(ex, "Error validating store access for store {StoreId} and company {CompanyId}",
//                    storeId, companyId);
//                throw;
//            }
//        }
//    }
//}

using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Models.Retailer.StoreModel;
using SkyForge.Services.StoreServices;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SkyForge.Services
{
    public class StoreService : IStoreService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<StoreService> _logger;

        public StoreService(ApplicationDbContext context, ILogger<StoreService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<Store> CreateStoreAsync(Store store)
        {
            try
            {
                // Validate company exists
                var company = await _context.Companies.FindAsync(store.CompanyId);
                if (company == null)
                {
                    throw new KeyNotFoundException($"Company with ID {store.CompanyId} not found");
                }

                // Check if store with same name already exists for this company
                var existingStore = await _context.Stores
                    .FirstOrDefaultAsync(s => s.CompanyId == store.CompanyId &&
                                              s.Name.ToLower() == store.Name.ToLower());

                if (existingStore != null)
                {
                    throw new InvalidOperationException($"Store '{store.Name}' already exists for this company");
                }

                store.CreatedAt = DateTime.UtcNow;
                store.UpdatedAt = null;
                store.IsActive = store.IsActive;

                _context.Stores.Add(store);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Store '{StoreName}' created with ID {StoreId} for company {CompanyId}",
                    store.Name, store.Id, store.CompanyId);

                return store;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating store '{StoreName}' for company {CompanyId}",
                    store.Name, store.CompanyId);
                throw;
            }
        }

        public async Task<Store> GetStoreByIdAsync(Guid id)
        {
            try
            {
                var store = await _context.Stores
                    .Include(s => s.Company)
                    .Include(s => s.Racks)
                    .FirstOrDefaultAsync(s => s.Id == id);

                if (store == null)
                {
                    _logger.LogWarning("Store {StoreId} not found", id);
                }

                return store;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting store {StoreId}", id);
                throw;
            }
        }

        public async Task<List<Store>> GetStoresByCompanyAsync(Guid companyId)
        {
            try
            {
                var stores = await _context.Stores
                    .Where(s => s.CompanyId == companyId)
                    .Include(s => s.Company)
                    .Include(s => s.Racks)
                    .OrderBy(s => s.Name)
                    .ToListAsync();

                _logger.LogInformation("Retrieved {Count} stores for company {CompanyId}",
                    stores.Count, companyId);

                return stores;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting stores for company {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<Store> UpdateStoreAsync(Guid id, Store store)
        {
            try
            {
                var existingStore = await _context.Stores.FindAsync(id);
                if (existingStore == null)
                {
                    throw new KeyNotFoundException($"Store with ID {id} not found");
                }

                // Check if new name conflicts with another store in the same company
                if (existingStore.Name.ToLower() != store.Name.ToLower())
                {
                    var duplicate = await _context.Stores
                        .FirstOrDefaultAsync(s => s.CompanyId == existingStore.CompanyId &&
                                                 s.Id != id &&
                                                 s.Name.ToLower() == store.Name.ToLower());

                    if (duplicate != null)
                    {
                        throw new InvalidOperationException($"Store '{store.Name}' already exists for this company");
                    }
                }

                // Update properties
                existingStore.Name = store.Name;
                existingStore.Description = store.Description;
                existingStore.IsActive = store.IsActive;
                existingStore.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation("Store {StoreId} updated to '{StoreName}'", id, existingStore.Name);

                return existingStore;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating store {StoreId}", id);
                throw;
            }
        }

        public async Task<bool> DeleteStoreAsync(Guid id)
        {
            try
            {
                var store = await _context.Stores
                    .Include(s => s.Racks)
                    .FirstOrDefaultAsync(s => s.Id == id);

                if (store == null)
                {
                    _logger.LogWarning("Store {StoreId} not found for deletion", id);
                    return false;
                }

                // Check if store has racks
                if (store.Racks.Any())
                {
                    throw new InvalidOperationException(
                        $"Cannot delete store '{store.Name}' because it contains {store.Racks.Count} racks. " +
                        "Please delete the racks first or move them to another store.");
                }

                _context.Stores.Remove(store);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Store {StoreId} '{StoreName}' deleted", id, store.Name);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting store {StoreId}", id);
                throw;
            }
        }

        public async Task<Store> CreateDefaultStoreAsync(Guid companyId)
        {
            try
            {
                _logger.LogInformation("Creating default store for company {CompanyId}", companyId);

                // Check if company exists
                var company = await _context.Companies.FindAsync(companyId);
                if (company == null)
                {
                    throw new KeyNotFoundException($"Company with ID {companyId} not found");
                }

                // Check if default store already exists
                var existingStore = await _context.Stores
                    .FirstOrDefaultAsync(s => s.CompanyId == companyId &&
                                              s.Name.ToLower() == "main");

                if (existingStore != null)
                {
                    _logger.LogInformation("Default store already exists for company {CompanyId}", companyId);
                    return existingStore;
                }

                // Create default store
                var defaultStore = new Store
                {
                    Name = "Main",
                    Description = "Default main store",
                    CompanyId = companyId,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Stores.Add(defaultStore);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Default store '{StoreName}' created with ID {StoreId} for company {CompanyId}",
                    defaultStore.Name, defaultStore.Id, companyId);

                return defaultStore;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating default store for company {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<Store> GetStoreByNameAsync(Guid companyId, string name)
        {
            try
            {
                var store = await _context.Stores
                    .Include(s => s.Company)
                    .FirstOrDefaultAsync(s => s.CompanyId == companyId &&
                                              s.Name.ToLower() == name.ToLower());

                if (store == null)
                {
                    _logger.LogDebug("Store '{StoreName}' not found for company {CompanyId}", name, companyId);
                }

                return store;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting store '{StoreName}' for company {CompanyId}", name, companyId);
                throw;
            }
        }

        public async Task<List<Store>> SearchStoresAsync(Guid companyId, string searchTerm)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(searchTerm))
                {
                    return await GetStoresByCompanyAsync(companyId);
                }

                var stores = await _context.Stores
                    .Where(s => s.CompanyId == companyId &&
                               (s.Name.ToLower().Contains(searchTerm.ToLower()) ||
                                (s.Description != null && s.Description.ToLower().Contains(searchTerm.ToLower()))))
                    .Include(s => s.Company)
                    .Include(s => s.Racks)
                    .OrderBy(s => s.Name)
                    .Take(50)
                    .ToListAsync();

                _logger.LogInformation("Found {Count} stores matching '{SearchTerm}' for company {CompanyId}",
                    stores.Count, searchTerm, companyId);

                return stores;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error searching stores with term '{SearchTerm}' for company {CompanyId}",
                    searchTerm, companyId);
                throw;
            }
        }

        public async Task<Store> GetOrCreateStoreAsync(Guid companyId, string name, string? description = null)
        {
            try
            {
                var store = await GetStoreByNameAsync(companyId, name);

                if (store == null)
                {
                    store = new Store
                    {
                        Name = name,
                        Description = description,
                        CompanyId = companyId,
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    };

                    store = await CreateStoreAsync(store);
                    _logger.LogInformation("Created store '{StoreName}' for company {CompanyId}", name, companyId);
                }

                return store;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting or creating store '{StoreName}' for company {CompanyId}",
                    name, companyId);
                throw;
            }
        }

        public async Task<int> GetStoreCountAsync(Guid companyId)
        {
            try
            {
                var count = await _context.Stores
                    .CountAsync(s => s.CompanyId == companyId);

                _logger.LogDebug("Store count for company {CompanyId}: {Count}", companyId, count);
                return count;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting store count for company {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<List<Store>> GetActiveStoresAsync(Guid companyId)
        {
            try
            {
                var activeStores = await _context.Stores
                    .Where(s => s.CompanyId == companyId && s.IsActive)
                    .Include(s => s.Company)
                    .Include(s => s.Racks)
                    .OrderBy(s => s.Name)
                    .ToListAsync();

                _logger.LogInformation("Retrieved {Count} active stores for company {CompanyId}",
                    activeStores.Count, companyId);

                return activeStores;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting active stores for company {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<bool> ToggleStoreStatusAsync(Guid storeId, bool isActive)
        {
            try
            {
                var store = await _context.Stores.FindAsync(storeId);
                if (store == null)
                {
                    _logger.LogWarning("Store {StoreId} not found for status toggle", storeId);
                    return false;
                }

                store.IsActive = isActive;
                store.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation("Store {StoreId} status changed to {Status}",
                    storeId, isActive ? "Active" : "Inactive");

                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error toggling store status for store {StoreId}", storeId);
                throw;
            }
        }

        // Additional helper methods (not in interface but useful internally)

        public async Task<bool> HasDefaultStoreAsync(Guid companyId)
        {
            try
            {
                return await _context.Stores
                    .AnyAsync(s => s.CompanyId == companyId && s.Name.ToLower() == "main");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking if company {CompanyId} has default store", companyId);
                throw;
            }
        }

        public async Task<Store> GetPrimaryStoreAsync(Guid companyId)
        {
            try
            {
                // Try to get the default "Main" store
                var mainStore = await GetStoreByNameAsync(companyId, "Main");
                if (mainStore != null)
                {
                    return mainStore;
                }

                // If no main store, get the first active store
                var firstStore = await _context.Stores
                    .Where(s => s.CompanyId == companyId && s.IsActive)
                    .FirstOrDefaultAsync();

                if (firstStore == null)
                {
                    // If no active stores, get any store
                    firstStore = await _context.Stores
                        .Where(s => s.CompanyId == companyId)
                        .FirstOrDefaultAsync();
                }

                return firstStore;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting primary store for company {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<List<Store>> GetStoresWithRackCountAsync(Guid companyId)
        {
            try
            {
                var stores = await _context.Stores
                    .Where(s => s.CompanyId == companyId)
                    .Include(s => s.Racks)
                    .Select(s => new
                    {
                        Store = s,
                        RackCount = s.Racks.Count
                    })
                    .OrderBy(s => s.Store.Name)
                    .ToListAsync();

                return stores.Select(s =>
                {
                    s.Store.Racks = s.Store.Racks; // Keep the racks
                    return s.Store;
                }).ToList();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting stores with rack count for company {CompanyId}", companyId);
                throw;
            }
        }

        public async Task<bool> ValidateStoreAccessAsync(Guid storeId, Guid companyId)
        {
            try
            {
                return await _context.Stores
                    .AnyAsync(s => s.Id == storeId && s.CompanyId == companyId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error validating store access for store {StoreId} and company {CompanyId}",
                    storeId, companyId);
                throw;
            }
        }
    }
}