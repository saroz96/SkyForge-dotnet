using SkyForge.Models.CompanyModel;
using SkyForge.Models.Shared;
using SkyForge.Models.UserModel;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace SkyForge.Models.FiscalYearModel   
{
    [Table("FiscalYears")]
    public class FiscalYear
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; }= string.Empty;

        // For English dates (nullable)
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }

        // For Nepali dates (as strings)
        [MaxLength(20)]
        public string? StartDateNepali { get; set; }

        [MaxLength(20)]
        public string? EndDateNepali { get; set; }

        public bool IsActive { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Required]
        [Column(TypeName = "varchar(20)")]
        public DateFormatEnum? DateFormat { get; set; } = DateFormatEnum.English;

        // Company relationship
        [ForeignKey("Company")]
        public Guid CompanyId { get; set; }
        public virtual Company Company { get; set; } = null!;

        // Bill Prefixes as JSON
        [Column(TypeName = "jsonb")]
        public BillPrefixes BillPrefixes { get; set; } = new BillPrefixes();

        // Navigation property for Users
        public virtual ICollection<User> Users { get; set; } = new List<User>();

        internal object? FirstOrDefault(Func<object, object> value)
        {
            throw new NotImplementedException();
        }
    }

    [Serializable]
    [ComplexType]
    public class BillPrefixes
    {
        [StringLength(4, MinimumLength = 4)]
        [RegularExpression(@"^[A-Z]{4}$", ErrorMessage = "Must be 4 uppercase letters")]
        [JsonPropertyName("sales")]
        public string Sales { get; set; } = string.Empty;

        [StringLength(4, MinimumLength = 4)]
        [RegularExpression(@"^[A-Z]{4}$", ErrorMessage = "Must be 4 uppercase letters")]
        [JsonPropertyName("salesQuotation")]
        public string SalesQuotation { get; set; } = string.Empty;

        [StringLength(4, MinimumLength = 4)]
        [RegularExpression(@"^[A-Z]{4}$", ErrorMessage = "Must be 4 uppercase letters")]
        [JsonPropertyName("salesReturn")]
        public string SalesReturn { get; set; } = string.Empty;

        [StringLength(4, MinimumLength = 4)]
        [RegularExpression(@"^[A-Z]{4}$", ErrorMessage = "Must be 4 uppercase letters")]
        [JsonPropertyName("purchase")]
        public string Purchase { get; set; } = string.Empty;

        [StringLength(4, MinimumLength = 4)]
        [RegularExpression(@"^[A-Z]{4}$", ErrorMessage = "Must be 4 uppercase letters")]
        [JsonPropertyName("purchaseReturn")]
        public string PurchaseReturn { get; set; } = string.Empty;

        [StringLength(4, MinimumLength = 4)]
        [RegularExpression(@"^[A-Z]{4}$", ErrorMessage = "Must be 4 uppercase letters")]
        [JsonPropertyName("payment")]
        public string Payment { get; set; } = string.Empty;

        [StringLength(4, MinimumLength = 4)]
        [RegularExpression(@"^[A-Z]{4}$", ErrorMessage = "Must be 4 uppercase letters")]
        [JsonPropertyName("receipt")]
        public string Receipt { get; set; } = string.Empty;

        [StringLength(4, MinimumLength = 4)]
        [RegularExpression(@"^[A-Z]{4}$", ErrorMessage = "Must be 4 uppercase letters")]
        [JsonPropertyName("stockAdjustment")]
        public string StockAdjustment { get; set; } = string.Empty;

        [StringLength(4, MinimumLength = 4)]
        [RegularExpression(@"^[A-Z]{4}$", ErrorMessage = "Must be 4 uppercase letters")]
        [JsonPropertyName("debitNote")]
        public string DebitNote { get; set; } = string.Empty;

        [StringLength(4, MinimumLength = 4)]
        [RegularExpression(@"^[A-Z]{4}$", ErrorMessage = "Must be 4 uppercase letters")]
        [JsonPropertyName("creditNote")]
        public string CreditNote { get; set; } = string.Empty;

        [StringLength(4, MinimumLength = 4)]
        [RegularExpression(@"^[A-Z]{4}$", ErrorMessage = "Must be 4 uppercase letters")]
        [JsonPropertyName("journalVoucher")]
        public string JournalVoucher { get; set; } = string.Empty;
    }
}