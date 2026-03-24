namespace SkyForge.Dto.RetailerDto.PaymentDto
{
    public class BillIdResponseDTO
    {
        public Guid Id { get; set; }
        public string BillNumber { get; set; } = string.Empty;
    }
}