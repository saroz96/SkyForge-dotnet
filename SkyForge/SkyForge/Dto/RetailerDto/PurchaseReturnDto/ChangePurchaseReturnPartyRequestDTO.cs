namespace SkyForge.Dto.RetailerDto.PurchaseReturnDto
{
    public class ChangePurchaseReturnPartyRequestDTO
    {
        public Guid AccountId { get; set; }
    }

    public class ChangePurchaseReturnPartyResponseDTO
    {
        public string BillNumber { get; set; } = string.Empty;
        public Guid AccountId { get; set; }
        public string AccountName { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
    }
}