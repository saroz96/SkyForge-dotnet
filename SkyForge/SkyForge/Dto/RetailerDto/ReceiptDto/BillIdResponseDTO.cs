namespace SkyForge.Dto.RetailerDto.ReceiptDto
{
    public class BillIdResponseDTO
    {
        public Guid Id { get; set; }
        public string BillNumber { get; set; } = string.Empty;
    }
}