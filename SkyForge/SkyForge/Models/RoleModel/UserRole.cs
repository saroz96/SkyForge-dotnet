using SkyForge.Models.UserModel;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SkyForge.Models.RoleModel
{
    [Table("UserRoles")]
    public class UserRole
    {
        // Constructor to initialize properties
        public UserRole()
        {
            CustomPermissions = new Dictionary<string, bool>();
            CreatedAt = DateTime.UtcNow;
            AssignedAt = DateTime.UtcNow;
        }

        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid Id { get; set; }

        [Required]
        [ForeignKey("User")]
        public Guid UserId { get; set; }
        public virtual User User { get; set; } = null!;

        [Required]
        [ForeignKey("Role")]
        public Guid RoleId { get; set; }
        public virtual Role Role { get; set; } = null!;

        // Who assigned this role?
        [ForeignKey("AssignedBy")]
        public Guid? AssignedById { get; set; }
        public virtual User? AssignedBy { get; set; }

        // When was this role assigned?
        public DateTime AssignedAt { get; set; }

        // Is this the primary role for the user?
        public bool IsPrimary { get; set; } = false;

        // Optional: Role expiration
        public DateTime? ExpiresAt { get; set; }

        // Optional: Custom permissions override
        [Column(TypeName = "jsonb")]
        public Dictionary<string, bool> CustomPermissions { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}