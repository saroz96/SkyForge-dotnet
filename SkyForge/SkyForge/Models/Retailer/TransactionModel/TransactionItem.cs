using SkyForge.Models.AccountModel;
using SkyForge.Models.Retailer.Items;
using SkyForge.Models.Retailer.TransactionModel;
using SkyForge.Models.UnitModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SkyForge.Models.Retailer.TransactionModel
{
    [Table("transaction_items")]
    public class TransactionItem
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid Id { get; set; }

        [Required]
        [ForeignKey("Transaction")]
        public Guid TransactionId { get; set; }
        public virtual Transaction Transaction { get; set; } = null!;

        // Item details
        [ForeignKey("Item")]
        public Guid? ItemId { get; set; }
        public virtual Item? Item { get; set; }

        [ForeignKey("Unit")]
        public Guid? UnitId { get; set; }
        public virtual Unit? Unit { get; set; }

        // Quantity details
        public int? WSUnit { get; set; }
        
        private decimal? _quantity;
        public decimal? Quantity
        {
            get => _quantity;
            set
            {
                if (value.HasValue)
                {
                    var wsUnit = WSUnit ?? 1;
                    _quantity = wsUnit * value.Value;
                }
                else
                {
                    _quantity = null;
                }
            }
        }

        private decimal? _bonus;
        public decimal? Bonus
        {
            get => _bonus;
            set
            {
                if (value.HasValue)
                {
                    var wsUnit = WSUnit ?? 1;
                    _bonus = wsUnit * value.Value;
                }
                else
                {
                    _bonus = null;
                }
            }
        }

        public decimal Price { get; set; } = 0;
        
        private decimal? _puPrice;
        public decimal? PuPrice
        {
            get => _puPrice;
            set
            {
                if (value.HasValue)
                {
                    var wsUnit = WSUnit ?? 1;
                    _puPrice = value.Value / wsUnit;
                }
                else
                {
                    _puPrice = null;
                }
            }
        }

        public decimal DiscountPercentagePerItem { get; set; } = 0;
        public decimal DiscountAmountPerItem { get; set; } = 0;
        public decimal NetPuPrice { get; set; } = 0;

        // VAT fields for this item
        [Column("taxable_amount")]
        [Precision(18, 2)]
        public decimal? TaxableAmount { get; set; }
        
        public decimal? VatPercentage { get; set; }
        
        [Precision(18, 2)]
        public decimal? VatAmount { get; set; }

        // Accounting amounts for this specific item
        [Precision(18, 2)]
        public decimal Debit { get; set; } = 0;
        
        [Precision(18, 2)]
        public decimal Credit { get; set; } = 0;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }
}