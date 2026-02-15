using SkyForge.Models.Retailer.CompositionModel;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace SkyForge.Services.Retailer.CompositionServices
{
    public interface ICompositionService
    {
        Task<IEnumerable<Composition>> GetCompositionsByCompanyAsync(Guid companyId);
        Task<Composition> GetCompositionByIdAsync(Guid id);
        Task<Composition> CreateCompositionAsync(Composition composition);
        Task<Composition> UpdateCompositionAsync(Guid id, Composition composition);
        Task<bool> DeleteCompositionAsync(Guid id);
        Task<bool> CheckCompositionExistsAsync(string name, Guid companyId);
        Task<int> GenerateUniqueCompositionNumberAsync();
        Task<IEnumerable<Composition>> SearchCompositionsAsync(Guid companyId, string searchTerm);
        Task<bool> AddItemsToCompositionAsync(Guid compositionId, IEnumerable<Guid> itemIds);
        Task<bool> RemoveItemsFromCompositionAsync(Guid compositionId, IEnumerable<Guid> itemIds);
        Task<IEnumerable<Composition>> GetCompositionsWithItemsAsync(Guid companyId);
    }
}