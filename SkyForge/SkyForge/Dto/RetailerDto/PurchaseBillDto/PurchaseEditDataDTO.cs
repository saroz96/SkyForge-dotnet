using SkyForge.Dto.AccountDto;
using SkyForge.Dto.RetailerDto;


namespace SkyForge.Dto.RetailerDto.PurchaseBillDto
{
    public class PurchaseEditDataDTO
    {
        public CompanyInfoDTO Company { get; set; }
        public PurchaseBillResponseDTO PurchaseInvoice { get; set; }
        public List<ItemEditDTO> Items { get; set; }
        public List<AccountInfoDTO> Accounts { get; set; }
        public UserEditInfoDTO User { get; set; }
    }

    public class ItemEditDTO
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public string Hscode { get; set; }
        public int UniqueNumber { get; set; }
        public string VatStatus { get; set; }
        public UnitInfoDTO Unit { get; set; }
        public CategoryInfoDTO Category { get; set; }
        public decimal PuPrice { get; set; }
        public decimal Quantity { get; set; }
        public decimal Stock { get; set; }
        public decimal LatestPuPrice { get; set; }
        public List<StockEntryInfoDTO> StockEntries { get; set; }
    }

    public class StockEntryInfoDTO
    {
        public Guid Id { get; set; }
        public decimal? Quantity { get; set; }
        public decimal? PuPrice { get; set; }
        public DateTime? Date { get; set; }
    }

    public class UserEditInfoDTO
    {
        public bool IsAdmin { get; set; }
        public string Role { get; set; }
        public UserPreferencesDTO Preferences { get; set; }
    }

    public class PurchaseBillItemEditDTO : PurchaseBillItemResponseDTO
    {
        public decimal Stock { get; set; }
        public decimal LatestPuPrice { get; set; }
        public decimal Amount { get; set; }
        public List<StockEntryInfoDTO> StockEntries { get; set; }
        public CategoryInfoDTO Category { get; set; }
        public UnitInfoDTO Unit { get; set; }
    }
}