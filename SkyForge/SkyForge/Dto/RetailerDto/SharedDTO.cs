using System;
using System.ComponentModel.DataAnnotations;

namespace SkyForge.Dto.RetailerDto
{
    public class CompanyInfoDTO
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Pan { get; set; } = string.Empty;
        public string? RenewalDate { get; set; }
        public string DateFormat { get; set; } = string.Empty; // Make sure this is string
        public bool VatEnabled { get; set; }

        public FiscalYearDTO FiscalYear { get; set; }
    }

    public class FiscalYearDTO
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string? StartDateNepali { get; set; }
        public string? EndDateNepali { get; set; }
        public bool IsActive { get; set; }
        public string DateFormat { get; set; } = "English";
    }
    public class DateInfoDTO
    {
        public string NepaliDate { get; set; } = string.Empty;
        public string TransactionDateNepali { get; set; } = string.Empty;
        public string CompanyDateFormat { get; set; } = string.Empty;
    }
    public class UserInfoDTO
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public bool IsAdmin { get; set; }
        public string Role { get; set; } = string.Empty;
        public UserPreferencesDTO Preferences { get; set; } = new();
        public bool RoundOffSales { get; set; }
        public bool RoundOffSalesReturn { get; set; }
        public bool RoundOffPurchase { get; set; }
         public bool RoundOffPurchaseReturn { get; set; }
        public bool DisplayTransactions { get; set; }
        public bool DisplayTransactionsForSalesReturn { get; set; }
        public bool DisplayTransactionsForPurchase { get; set; }
        public bool DisplayTransactionsForPurchaseReturn { get; set; }
        public bool StoreManagement { get; set; }
    }
    public class UserPreferencesDTO
    {
        public string Theme { get; set; } = "light";
    }
    public class PermissionsDTO
    {
        public bool IsAdminOrSupervisor { get; set; }
        public bool StoreManagementEnabled { get; set; }
    }

    public class CompanyPrintDTO
    {
        public Guid Id { get; set; }

        public DateTime? RenewalDate { get; set; }

        public string DateFormat { get; set; } = string.Empty;
        public FiscalYearDTO? FiscalYear { get; set; }
    }

    public class CompanyPrintInfoDTO
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public string? Pan { get; set; }
        public string? Address { get; set; }
    }

    public class UserPrintDTO
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public bool IsAdmin { get; set; }
        public string? Role { get; set; }
        public UserPreferencesDTO? Preferences { get; set; }
    }

    public class CompanyGroupInfoDTO
    {
        public Guid Id { get; set; }
        public string? Name { get; set; }
    }

    public class CategoryInfoDTO
    {
        public Guid Id { get; set; }
        public string? Name { get; set; }
    }
    public class UnitInfoDTO
    {
        public Guid Id { get; set; }
        public string? Name { get; set; }
        public string? Code { get; set; }
    }

}