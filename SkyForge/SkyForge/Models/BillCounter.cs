using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using SkyForge.Models.CompanyModel;
using SkyForge.Models.FiscalYearModel;

namespace SkyForge.Models
{
    [Table("BillCounters")]
    public class BillCounter
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid Id { get; set; }

        [Required]
        [ForeignKey("Company")]
        public Guid CompanyId { get; set; }
        public virtual Company Company { get; set; } = null!;

        [Required]
        [ForeignKey("FiscalYear")]
        public Guid FiscalYearId { get; set; }
        public virtual FiscalYear FiscalYear { get; set; } = null!;

        [Required]
        [MaxLength(50)]
        public string TransactionType { get; set; } = string.Empty; // e.g., 'purchase', 'sales', etc.

        [Required]
        public long CurrentBillNumber { get; set; } = 0;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Composite unique constraint
        public class BillCounterKey
        {
            public Guid CompanyId { get; set; }
            public Guid FiscalYearId { get; set; }
            public string TransactionType { get; set; } = string.Empty;
        }
    }
}