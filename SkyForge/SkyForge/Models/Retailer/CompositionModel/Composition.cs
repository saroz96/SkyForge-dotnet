using SkyForge.Models.CompanyModel;
using SkyForge.Models.Retailer.Items;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SkyForge.Models.Retailer.CompositionModel
{
    [Table("compositions")]
    public class Composition
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Required]
        [Column("name")]
        [StringLength(255)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [Column("unique_number")]
        public int UniqueNumber { get; set; }

        [Required]
        [Column("company_id")]
        public Guid CompanyId { get; set; }

        [ForeignKey("CompanyId")]
        public Company Company { get; set; } = null!;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public virtual ICollection<ItemComposition> ItemCompositions { get; set; } = new List<ItemComposition>();

        // Navigation property for items (many-to-many)
        [NotMapped]
        public virtual ICollection<Item> Items
        {
            get => ItemCompositions?.Select(ic => ic.Item).ToList() ?? new List<Item>();
            set
            {
                ItemCompositions = value?.Select(i => new ItemComposition
                {
                    ItemId = i.Id,
                    CompositionId = Id,
                    Item = i
                }).ToList() ?? new List<ItemComposition>();
            }
        }

        //public virtual ICollection<Item> Items { get; set; } = new List<Item>();

        // Index for unique constraint
        [Index("IX_Composition_Name_Company", IsUnique = true,
            Name = "IX_Composition_Name_Company")]
        public class CompositionIndex
        {
            [Column("name")]
            public string Name { get; set; } = string.Empty;

            [Column("company_id")]
            public Guid CompanyId { get; set; }
        }

        [Index("IX_Composition_UniqueNumber", IsUnique = true,
            Name = "IX_Composition_UniqueNumber")]
        public class UniqueNumberIndex
        {
            [Column("unique_number")]
            public int UniqueNumber { get; set; }
        }
    }
}
