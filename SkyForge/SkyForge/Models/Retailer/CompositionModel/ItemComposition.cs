
using SkyForge.Models.Retailer.CompositionModel;
using SkyForge.Models.Retailer.Items;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SkyForge.Models.Retailer.CompositionModel
{
    [Table("item_compositions")]
    public class ItemComposition
    {
        [Column("item_id")]
        public Guid ItemId { get; set; }

        [Column("composition_id")]
        public Guid CompositionId { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        [ForeignKey("ItemId")]
        public virtual Item Item { get; set; } = null!;

        [ForeignKey("CompositionId")]
        public virtual Composition Composition { get; set; } = null!;
    }
}
