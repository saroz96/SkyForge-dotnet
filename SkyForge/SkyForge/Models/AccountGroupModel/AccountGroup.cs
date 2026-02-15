using SkyForge.Models.CompanyModel;
using SkyForge.Models.AccountModel;
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Security.Principal;

namespace SkyForge.Models.AccountGroupModel
{
    public class AccountGroup
    {
        [Key]
        public Guid Id { get; set; }

        [Required(ErrorMessage = "Account group name is required")]
        [StringLength(200, ErrorMessage = "Name cannot exceed 200 characters")]
        public string Name { get; set; }

        [Range(1000, 9999, ErrorMessage = "Unique number must be 4 digits")]
        public int? UniqueNumber { get; set; }

        [Required(ErrorMessage = "Primary group field is required")]
        [StringLength(3, MinimumLength = 2, ErrorMessage = "PrimaryGroup must be 'Yes' or 'No'")]
        [RegularExpression("^(Yes|No)$", ErrorMessage = "PrimaryGroup must be 'Yes' or 'No'")]
        public string PrimaryGroup { get; set; } // Changed from bool to string to match "Yes"/"No"

        [Required(ErrorMessage = "Type is required")]
        [StringLength(50)]
        public string Type { get; set; }

        // Foreign key to Company
        [Required(ErrorMessage = "Company is required")]
        public Guid CompanyId { get; set; }

        // Navigation property
        [ForeignKey("CompanyId")]
        public virtual Company Company { get; set; }

        // Timestamps
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        // Navigation property for accounts in this group
        public virtual ICollection<Account> Accounts { get; set; } = new List<Account>();

        // Enum for Type property to ensure valid values
        public static class AccountGroupTypes
        {
            public const string CurrentAssets = "Current Assets";
            public const string CurrentLiabilities = "Current Liabilities";
            public const string FixedAssets = "Fixed Assets";
            public const string LoansLiability = "Loans(Liability)";
            public const string CapitalAccount = "Capital Account";
            public const string RevenueAccounts = "Revenue Accounts";
            public const string Primary = "Primary";
        }

        // Method to validate Type
        public static bool IsValidType(string type)
        {
            return type switch
            {
                AccountGroupTypes.CurrentAssets => true,
                AccountGroupTypes.CurrentLiabilities => true,
                AccountGroupTypes.FixedAssets => true,
                AccountGroupTypes.LoansLiability => true,
                AccountGroupTypes.CapitalAccount => true,
                AccountGroupTypes.RevenueAccounts => true,
                AccountGroupTypes.Primary => true,
                _ => false
            };
        }

        // Method to get all valid types
        public static List<string> GetValidTypes()
        {
            return new List<string>
            {
                AccountGroupTypes.CurrentAssets,
                AccountGroupTypes.CurrentLiabilities,
                AccountGroupTypes.FixedAssets,
                AccountGroupTypes.LoansLiability,
                AccountGroupTypes.CapitalAccount,
                AccountGroupTypes.RevenueAccounts,
                AccountGroupTypes.Primary
            };
        }
    }
}

