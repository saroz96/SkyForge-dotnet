// Dto/RetailerDto/PurchaseBillDto/ChangePartyDto.cs
namespace SkyForge.Dto.RetailerDto.PurchaseBillDto
{
    public class ChangePartyRequestDto
    {
        public Guid AccountId { get; set; }
    }

    public class ChangePartyResponseDto
    {
        public string BillNumber { get; set; } = string.Empty;
        public Guid AccountId { get; set; }
        public string AccountName { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
    }
}