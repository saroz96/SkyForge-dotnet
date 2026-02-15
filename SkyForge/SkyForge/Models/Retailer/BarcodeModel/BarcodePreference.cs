using SkyForge.Models.UserModel;
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SkyForge.Models.Retailer.BarcodeModel
{
    [Table("barcode_preferences")]
    public class BarcodePreference
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Required]
        [Column("user_id")]
        public Guid UserId { get; set; }

        [ForeignKey("UserId")]
        public User User { get; set; } = null!;

        [Column("label_width")]
        [Range(20, 200)]
        public int LabelWidth { get; set; } = 70; // in millimeters

        [Column("label_height")]
        [Range(20, 200)]
        public int LabelHeight { get; set; } = 40; // in millimeters

        [Column("labels_per_row")]
        [Range(1, 6)]
        public int LabelsPerRow { get; set; } = 3;

        [Column("barcode_type")]
        [StringLength(20)]
        public string BarcodeType { get; set; } = "code128"; // 'code128', 'code39', 'qr'

        [Column("default_quantity")]
        [Range(1, 100)]
        public int DefaultQuantity { get; set; } = 1;

        [Column("save_settings")]
        public bool SaveSettings { get; set; } = false;

        [Column("include_item_name")]
        public bool IncludeItemName { get; set; } = true;

        [Column("include_price")]
        public bool IncludePrice { get; set; } = true;

        [Column("include_batch")]
        public bool IncludeBatch { get; set; } = true;

        [Column("include_expiry")]
        public bool IncludeExpiry { get; set; } = true;

        [Column("font_size")]
        [Range(8, 24)]
        public int FontSize { get; set; } = 12;

        [Column("border")]
        public bool Border { get; set; } = true;

        [Column("paper_size")]
        [StringLength(20)]
        public string PaperSize { get; set; } = "A4"; // 'A4', 'Letter', 'Legal', etc.

        [Column("orientation")]
        [StringLength(20)]
        public string Orientation { get; set; } = "portrait"; // 'portrait', 'landscape'

        [Column("margin")]
        [Range(0, 50)]
        public int Margin { get; set; } = 10; // in millimeters

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
