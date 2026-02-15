namespace SkyForge.Dto.RetailerDto.PurchaseBillDto
{
    public class LastPurchaseDataDTO
    {
        public Guid? PurchaseBillId { get; set; }
        public string? BillNumber { get; set; }
        public DateTime? Date { get; set; }
        public string? NepaliDate { get; set; }
        public decimal Quantity { get; set; }
        public decimal Bonus { get; set; }
        public decimal PuPrice { get; set; }  // This matches
        public decimal NetPuPrice { get; set; }
        public decimal Price{get; set;}
        public decimal Mrp { get; set; }
        public decimal MarginPercentage { get; set; }
        public decimal CcPercentage { get; set; }  // Your React uses ccPercentage (lowercase)
        public decimal ItemCcAmount { get; set; }  // Your React uses itemCcAmount (lowercase)
        public string Currency { get; set; } = "NPR";
        public decimal WsUnit { get; set; } = 1;  // This should be WSUnit? Your React uses wsUnit
        public Guid? UnitId { get; set; }
        public string? UnitName { get; set; }
        public string? BatchNumber { get; set; }  // This matches
        public DateOnly? ExpiryDate { get; set; }  // This matches
        public string VatStatus { get; set; } = "vatable";
    }
}