namespace SkyForge.Dto.RetailerDto.SalesQuotationDto
{
    public class ChangeSalesQuotationPartyRequestDTO
    {
        public Guid AccountId { get; set; }
    }

    public class ChangeSalesQuotationPartyResponseDTO
    {
        public string BillNumber { get; set; } = string.Empty;
        public Guid AccountId { get; set; }
        public string AccountName { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
    }
}