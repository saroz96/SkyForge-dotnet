using SkyForge.Models.CompanyModel;
using SkyForge.Models.FiscalYearModel;
using SkyForge.Models.UserModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SkyForge.Models.Retailer.SettingsModel
{
    [Table("Settings")]
    public class Settings
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid Id { get; set; }

        // Company relationship (One company has one settings)
        [ForeignKey("Company")]
        public Guid CompanyId { get; set; }
        public virtual Company Company { get; set; }

        // User relationship (User who created/modified settings)
        [ForeignKey("User")]
        public Guid UserId { get; set; }
        public virtual User User { get; set; }

        // Round off settings
        public bool RoundOffSales { get; set; } = false;
        public bool RoundOffPurchase { get; set; } = false;
        public bool RoundOffSalesReturn { get; set; } = false;
        public bool RoundOffPurchaseReturn { get; set; } = false;

        // Display transactions settings
        public bool DisplayTransactions { get; set; } = false;
        public bool DisplayTransactionsForPurchase { get; set; } = false;
        public bool DisplayTransactionsForSalesReturn { get; set; } = false;
        public bool DisplayTransactionsForPurchaseReturn { get; set; } = false;

        public bool StoreManagement { get; set; } = false;

        // Value can be any JSON data
        [Column(TypeName = "jsonb")]
        public string Value { get; set; } // Will store JSON data

        // FiscalYear relationship
        [ForeignKey("FiscalYear")]
        public Guid? FiscalYearId { get; set; }
        public virtual FiscalYear? FiscalYear { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }
}
