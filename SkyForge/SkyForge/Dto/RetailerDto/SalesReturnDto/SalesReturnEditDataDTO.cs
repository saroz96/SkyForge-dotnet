using SkyForge.Dto.AccountDto;
using SkyForge.Dto.RetailerDto.SalesBillDto;

namespace SkyForge.Dto.RetailerDto.SalesReturnDto
{
    public class SalesReturnEditDataDTO
    {
        public CompanyInfoDTO Company { get; set; }
        public SalesReturnResponseDTO SalesReturnInvoice { get; set; } = new();
        public List<ItemEditDTO> Items { get; set; }
        public List<AccountInfoDTO> Accounts { get; set; }
        public UserEditInfoDTO User { get; set; }
    }

    public class SalesReturnItemEditDTO : SalesReturnItemResponseDTO
    {
        public decimal Stock { get; set; }
        public decimal LatestPuPrice { get; set; }
        public decimal Mrp { get; set; }
        public string Hscode { get; set; }
        public int UniqueNumber { get; set; }
        public List<StockEntryInfoDTO> StockEntries { get; set; }
        public CategoryInfoDTO Category { get; set; }
        public UnitInfoDTO Unit { get; set; }
        public string BatchNumber { get; set; }
        public DateOnly? ExpiryDate { get; set; }
        public decimal Bonus { get; set; }
        public decimal PuPrice { get; set; }
    }
}