namespace SkyForge.Dto.RetailerDto.SalesReturnDto
{
    public class SalesReturnPartyInfoDTO
    {
        public string BillNumber { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public string? PaymentMode { get; set; }
        public Guid AccountId { get; set; }
        public string AccountName { get; set; } = string.Empty;
        public string? AccountAddress { get; set; }
        public string? AccountPan { get; set; }
        public int? AccountUniqueNumber { get; set; }
    }
}