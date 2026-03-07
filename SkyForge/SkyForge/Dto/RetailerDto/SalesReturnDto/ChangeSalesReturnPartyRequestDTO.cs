namespace SkyForge.Dto.RetailerDto.SalesReturnDto
{
    public class ChangeSalesReturnPartyRequestDTO
    {
        public Guid AccountId { get; set; }
    }

    public class ChangeSalesReturnPartyResponseDTO
    {
        public string BillNumber { get; set; } = string.Empty;
        public Guid AccountId { get; set; }
        public string AccountName { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
    }
}