namespace SkyForge.Dto.RetailerDto.ItemDto
{
    public class UpdateBatchByNumberDTO
    {
        public string OldBatchNumber { get; set; } = string.Empty;
        public string NewBatchNumber { get; set; } = string.Empty;
        public DateOnly? ExpiryDate { get; set; }
        public decimal Price { get; set; }
        public decimal Mrp { get; set; }
        public decimal MarginPercentage { get; set; }
    }
}