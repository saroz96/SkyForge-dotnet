// using System;
// using System.Collections.Generic;
// using System.ComponentModel.DataAnnotations;


// namespace SkyForge.Dto.RetailerDto.SalesBillDto
// {
//     // Response DTO for GetCashSalesOpenData
//     public class CashSalesOpenResponseDTO
//     {
//         public CashSalesOpenCompanyDTO Company { get; set; }
//         public DatesDTO Dates { get; set; }
//         public FiscalYearInfoDTO CurrentFiscalYear { get; set; }
//         public List<CategoryInfoDTO> Categories { get; set; }
//         public List<UnitInfoDTO> Units { get; set; }
//         public List<CompanyGroupInfoDTO> CompanyGroups { get; set; }
//         public CurrentCompanyInfoDTO CurrentCompany { get; set; }
//         public UserPreferencesDTO UserPreferences { get; set; }
//         public PermissionsDTO Permissions { get; set; }
//     }

//     public class CashSalesOpenCompanyDTO
//     {
//         public Guid Id { get; set; }
//         public DateTime? RenewalDate { get; set; }
//         public string DateFormat { get; set; }
//         public bool VatEnabled { get; set; }
//         public Guid? FiscalYearId { get; set; }
//         public string Name { get; set; }
//         public string Address { get; set; }
//         public string Phone { get; set; }
//         public string Pan { get; set; }
//     }

//     // DTO for CreateCashSalesOpen endpoint
//     public class CreateCashSalesOpenDTO
//     {
//         [StringLength(255)]
//         public string? CashAccount { get; set; }

//         [StringLength(500)]
//         public string? CashAccountAddress { get; set; }

//         [StringLength(50)]
//         public string? CashAccountPan { get; set; }

//         [EmailAddress]
//         [StringLength(255)]
//         public string? CashAccountEmail { get; set; }

//         [Phone]
//         [StringLength(20)]
//         public string? CashAccountPhone { get; set; }

//         public List<SalesBillItemDTO> Items { get; set; }
//         public decimal? VatPercentage { get; set; }
//         public DateTime NepaliDate { get; set; }
//         public DateTime Date { get; set; }
//         public DateTime TransactionDateNepali { get; set; }
//         public DateTime TransactionDate { get; set; }
//         public string IsVatExempt { get; set; } // "true", "false", or "all"
//         public decimal? DiscountPercentage { get; set; }
//         public decimal? DiscountAmount { get; set; }
//         public string PaymentMode { get; set; }
//         public decimal? RoundOffAmount { get; set; }
//         public decimal? SubTotal { get; set; }
//         public decimal? TaxableAmount { get; set; }
//         public decimal? NonTaxableAmount { get; set; }
//         public decimal? VatAmount { get; set; }
//         public decimal? TotalAmount { get; set; }
//     }

// }
