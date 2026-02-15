
namespace SkyForge.Dto.AccountDto
{
    public class OpeningBalanceDTO
    {
        public decimal? Amount { get; set; }
        public string Type { get; set; } = "Dr";
    }
}