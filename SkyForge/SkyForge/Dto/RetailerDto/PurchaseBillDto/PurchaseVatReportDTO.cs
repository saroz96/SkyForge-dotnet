namespace SkyForge.Dto.RetailerDto.PurchaseBillDto
{
    public class PurchaseVatReportDTO
    {
        public CompanyInfoDTO Company { get; set; }
        public FiscalYearDTO CurrentFiscalYear { get; set; }
        public List<PurchaseVatEntryDTO> PurchaseVatReport { get; set; } = new List<PurchaseVatEntryDTO>();
        public string CompanyDateFormat { get; set; }
        public string NepaliDate { get; set; }
        public CompanyInfoDTO CurrentCompany { get; set; }
        public string FromDate { get; set; }
        public string ToDate { get; set; }
        public string CurrentCompanyName { get; set; }
        public UserInfoDTO User { get; set; }
        public string Theme { get; set; }
        public bool IsAdminOrSupervisor { get; set; }
    }

    public class PurchaseVatEntryDTO
    {
        public string BillNumber { get; set; }
        public string PartyBillNumber { get; set; }
        public DateTime Date { get; set; }
        public DateTime NepaliDate { get; set; }
        public string AccountName { get; set; }
        public string PanNumber { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal NonVatPurchase { get; set; }
        public decimal TaxableAmount { get; set; }
        public decimal VatAmount { get; set; }
    }
}