using SkyForge.Models.UnitModel;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace SkyForge.Services.UnitServices
{
    public interface IUnitService
    {
        Task<Unit> CreateUnitAsync(Unit unit);
        Task<Unit> GetUnitByIdAsync(Guid id);
        Task<List<Unit>> GetUnitsByCompanyAsync(Guid companyId);
        Task<Unit> UpdateUnitAsync(Guid id, Unit unit);
        Task<bool> DeleteUnitAsync(Guid id);
        Task<bool> AddDefaultUnitsAsync(Guid companyId);
        Task<Unit> GetUnitByNameAsync(Guid companyId, string name);
        Task<List<Unit>> SearchUnitsAsync(Guid companyId, string searchTerm);
        Task<Unit> GetOrCreateUnitAsync(Guid companyId, string name);
        Task<bool> BulkCreateUnitsAsync(Guid companyId, List<string> unitNames);
        List<string> GetDefaultUnitNames();
        Task<int> GenerateUniqueUnitNumberAsync();
    }
}