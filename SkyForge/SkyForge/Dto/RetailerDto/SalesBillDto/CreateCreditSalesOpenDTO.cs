using SkyForge.Dto.AccountDto;
using System.ComponentModel.DataAnnotations;

namespace SkyForge.Dto.RetailerDto.SalesBillDto
{
    // DTO for CreateCreditSalesOpen endpoint
    public class CreateCreditSalesOpenDTO
    {
        public Guid AccountId { get; set; }
        public List<SalesBillItemDTO> Items { get; set; }
        public decimal? VatPercentage { get; set; }

        public DateTime NepaliDate { get; set; }
        public DateTime Date { get; set; }

        public DateTime TransactionDateNepali { get; set; }
        public DateTime TransactionDate { get; set; }
        public string IsVatExempt { get; set; } // "true", "false", or "all"
        public decimal? DiscountPercentage { get; set; }
        public decimal? DiscountAmount { get; set; }
        public string PaymentMode { get; set; }
        public decimal? RoundOffAmount { get; set; }
        public decimal? SubTotal { get; set; }
        public decimal? TaxableAmount { get; set; }
        public decimal? NonTaxableAmount { get; set; }
        public decimal? VatAmount { get; set; }
        public decimal? TotalAmount { get; set; }
    }

    public class CreditSalesOpenResponseDTO
    {
        public CreditSalesOpenCompanyDTO Company { get; set; }
        public List<CreditSalesOpenAccountDTO> Accounts { get; set; }
        public DatesDTO Dates { get; set; }
        public FiscalYearInfoDTO CurrentFiscalYear { get; set; }
        public List<CategoryInfoDTO> Categories { get; set; }
        public List<UnitInfoDTO> Units { get; set; }
        public List<CompanyGroupInfoDTO> CompanyGroups { get; set; }
        public CurrentCompanyInfoDTO CurrentCompany { get; set; }
        public UserPreferencesDTO UserPreferences { get; set; }
        public PermissionsDTO Permissions { get; set; }
    }

    public class CreditSalesOpenCompanyDTO
    {
        public Guid Id { get; set; }
        public DateTime? RenewalDate { get; set; }
        public string DateFormat { get; set; }
        public bool VatEnabled { get; set; }
        public Guid? FiscalYearId { get; set; }
        public string Name { get; set; }
        public string Address { get; set; }
        public string Phone { get; set; }
        public string Pan { get; set; }
    }

    public class CreditSalesOpenAccountDTO
    {
        public Guid Id { get; set; }
        public string UniqueNumber { get; set; }
        public string Name { get; set; }
        public string Address { get; set; }
        public string Pan { get; set; }
        public string Phone { get; set; }
        public string Email { get; set; }
        public decimal Balance { get; set; }
        public bool IsActive { get; set; }
        public List<Guid> AccountGroupIds { get; set; }
    }

    public class CurrentCompanyInfoDTO
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public string Address { get; set; }
        public string City { get; set; }
        public string Phone { get; set; }
        public string Pan { get; set; }
        public DateTime? RenewalDate { get; set; }
        public string DateFormat { get; set; }
        public bool VatEnabled { get; set; }
        public FiscalYearDTO FiscalYear { get; set; }
    }
}