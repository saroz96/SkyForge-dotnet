using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SkyForge.Models.RoleModel
{
    public enum RoleType
    {
        System,      // System roles
        Department,  // Department roles (Account, Sales, Purchase)
        Custom       // Custom roles
    }

    [Table("Roles")]
    public class Role
    {
        // Constructor to initialize properties
        public Role()
        {
            Name = string.Empty;
            Description = string.Empty;
            DefaultPermissions = new Dictionary<string, bool>();
            UserRoles = new List<UserRole>();
            CreatedAt = DateTime.UtcNow;
            IsActive = true;
            IsAssignable = true;
            IsSystemRole = false;
        }

        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid Id { get; set; }

        [Required]
        [MaxLength(50)]
        public string Name { get; set; }

        [Required]
        [MaxLength(200)]
        public string Description { get; set; }

        // Role type (for grouping)
        public RoleType Type { get; set; } = RoleType.Custom;

        // Permission level (for hierarchy)
        public int PermissionLevel { get; set; } = 1;

        // Default menu permissions for this role (JSON)
        [Column(TypeName = "jsonb")]
        public Dictionary<string, bool> DefaultPermissions { get; set; }

        // Is this a system role that can't be deleted?
        public bool IsSystemRole { get; set; }

        // Can users be assigned this role?
        public bool IsAssignable { get; set; }

        // Is role active?
        public bool IsActive { get; set; }

        // Navigation property
        public virtual ICollection<UserRole> UserRoles { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}