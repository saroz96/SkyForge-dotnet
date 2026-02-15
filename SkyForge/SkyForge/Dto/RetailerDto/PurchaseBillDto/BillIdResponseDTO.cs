namespace SkyForge.Dto.RetailerDto.PurchaseBillDto
{
    public class BillIdResponseDTO
    {
        public Guid Id { get; set; }
        public string BillNumber { get; set; } = string.Empty;
    }
}