using SkyForge.Dto.RetailerDto.ItemDto;
using SkyForge.Dto.CompositionDto;
using SkyForge.Models.Retailer.Items;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace SkyForge.Services.Retailer.ItemServices
{
    public interface IItemService
    {
        Task<int> GenerateUniqueItemNumberAsync(Guid companyId);
        Task<long> GenerateBarcodeNumberAsync(Guid companyId);
        Task<Item> CreateItemAsync(CreateItemDTO createItemDto, Guid companyId, Guid fiscalYearId);
        Task<Item> GetItemByIdAsync(Guid itemId);
        Task<List<Item>> GetItemsByCompanyAsync(Guid companyId, Guid fiscalYearId);

        // Update this method signature to include currentFiscalYearId parameter
        Task<Item> UpdateItemAsync(Guid itemId, UpdateItemDTO updateItemDto, Guid currentFiscalYearId);

        Task<bool> DeleteItemAsync(Guid itemId, Guid companyId);
        Task<List<Item>> SearchItemsAsync(Guid companyId, string searchTerm);
        Task<ItemDetailsDTO> GetItemDetailsAsync(Guid itemId);
        Task<List<Item>> GetItemsWithLowStockAsync(Guid companyId, decimal threshold = 10);

        // You might also want to add these helper methods to the interface:
        Task<bool> CheckItemHasTransactionsAsync(Guid itemId);
        Task<Guid> GetCurrentFiscalYearIdAsync(Guid companyId);

        Task<bool> UpdateBatchByNumberAsync(Guid itemId, string oldBatchNumber, UpdateBatchByNumberDTO updateDto, Guid companyId);
    }
}