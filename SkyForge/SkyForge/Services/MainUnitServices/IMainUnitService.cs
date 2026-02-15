using SkyForge.Models.Retailer.MainUnitModel;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace SkyForge.Services
{
    public interface IMainUnitService
    {
        Task<MainUnit> CreateMainUnitAsync(MainUnit mainUnit);
        Task<MainUnit> GetMainUnitByIdAsync(Guid id);
        Task<List<MainUnit>> GetMainUnitsByCompanyAsync(Guid companyId);
        Task<MainUnit> UpdateMainUnitAsync(Guid id, MainUnit mainUnit);
        Task<bool> DeleteMainUnitAsync(Guid id);
        Task<bool> AddDefaultMainUnitsAsync(Guid companyId);
        Task<MainUnit> GetMainUnitByNameAsync(Guid companyId, string name);
        Task<List<MainUnit>> SearchMainUnitsAsync(Guid companyId, string searchTerm);
        Task<MainUnit> GetOrCreateMainUnitAsync(Guid companyId, string name);
        Task<bool> BulkCreateMainUnitsAsync(Guid companyId, List<string> mainUnitNames);
        List<string> GetDefaultMainUnitNames();
        Task<Dictionary<string, List<MainUnit>>> GetMainUnitsGroupedByCategoryAsync(Guid companyId);
        Task<int> GenerateUniqueMainUnitNumberAsync();
    }
}