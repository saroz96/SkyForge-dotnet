namespace SkyForge.Dto.RetailerDto.SalesBillDto
{
    public class ChangeCreditSalesPartyRequestDTO
    {
        public Guid AccountId { get; set; }
    }

    public class ChangeCreditSalesPartyResponseDTO
    {
        public string BillNumber { get; set; } = string.Empty;
        public Guid AccountId { get; set; }
        public string AccountName { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
    }
}