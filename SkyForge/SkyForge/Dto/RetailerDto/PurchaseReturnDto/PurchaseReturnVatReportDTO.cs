namespace SkyForge.Dto.RetailerDto.PurchaseReturnDto
{
    public class PurchaseReturnVatReportDTO
    {
        public CompanyInfoDTO Company { get; set; }
        public FiscalYearDTO CurrentFiscalYear { get; set; }
        public List<PurchaseReturnVatEntryDTO> PurchaseReturnVatReport { get; set; } = new List<PurchaseReturnVatEntryDTO>();
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

    public class PurchaseReturnVatEntryDTO
    {
        public string BillNumber { get; set; }
        public string PartyBillNumber { get; set; }
        public DateTime Date { get; set; }
        public DateTime NepaliDate { get; set; }
        public string AccountName { get; set; }
        public string PanNumber { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal NonVatPurchaseReturn { get; set; }
        public decimal TaxableAmount { get; set; }
        public decimal VatAmount { get; set; }
    }
}