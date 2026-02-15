using SkyForge.Models.CompanyModel;
using SkyForge.Models.FiscalYearModel;
using SkyForge.Models.RoleModel;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;

namespace SkyForge.Models.UserModel
{
    public enum ThemePreference
    {
        Light,
        Dark
    }

    [Table("Users")]
    public class User
    {
        // Constructor
        public User()
        {
            // Initialize collections
            OwnedCompanies = new List<Company>();
            AccessibleCompanies = new List<Company>();
            UserRoles = new List<UserRole>();
            MenuPermissions = new Dictionary<string, bool>();

            // Initialize complex types
            Preferences = new UserPreferences();
            AttendanceSettings = new AttendanceSettings();

            // Set default values
            CreatedAt = DateTime.UtcNow;
            IsActive = true;
            IsEmailVerified = false;
            IsAdmin = false;

            // Initialize required properties
            Name = string.Empty;
            Email = string.Empty;
            PasswordHash = string.Empty;
        }

        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid Id { get; set; }

        [Required]
        [MaxLength(200)]
        public string Name { get; set; }

        [Required]
        [EmailAddress]
        [MaxLength(100)]
        public string Email { get; set; }

        [Required]
        public string PasswordHash { get; set; }

        // Navigation properties
        public virtual ICollection<Company> OwnedCompanies { get; set; }
        public virtual ICollection<Company> AccessibleCompanies { get; set; }

        [ForeignKey("FiscalYear")]
        public Guid? FiscalYearId { get; set; }
        public virtual FiscalYear? FiscalYear { get; set; }

        public bool IsActive { get; set; }
        public bool IsAdmin { get; set; }

        // Many-to-many relationship with Roles
        public virtual ICollection<UserRole> UserRoles { get; set; }

        // Helper property to get primary role
        [NotMapped]
        public Role? PrimaryRole
        {
            get => UserRoles?.FirstOrDefault(ur => ur.IsPrimary)?.Role;
        }

        // Helper method to check if user has a specific role
        public bool IsInRole(string roleName)
        {
            return UserRoles?.Any(ur => ur.Role != null &&
                                        ur.Role.Name == roleName &&
                                        (ur.ExpiresAt == null || ur.ExpiresAt > DateTime.UtcNow)) ?? false;
        }

        public bool IsEmailVerified { get; set; }
        public string? EmailVerificationToken { get; set; }
        public DateTime? EmailVerificationExpires { get; set; }
        public string? ResetPasswordToken { get; set; }
        public DateTime? ResetPasswordExpires { get; set; }

        // MenuPermissions as JSON in PostgreSQL
        [Column(TypeName = "jsonb")]
        public Dictionary<string, bool> MenuPermissions { get; set; }

        [ForeignKey("GrantedBy")]
        public Guid? GrantedById { get; set; }
        public virtual User? GrantedBy { get; set; }

        public DateTime? LastPermissionUpdate { get; set; }

        // Preferences as complex type
        public UserPreferences Preferences { get; set; }

        // Attendance settings as complex type
        public AttendanceSettings AttendanceSettings { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }

    [ComplexType]
    public class UserPreferences
    {
        [Column(TypeName = "varchar(10)")]
        public ThemePreference Theme { get; set; } = ThemePreference.Light;
    }

    [ComplexType]
    public class AttendanceSettings
    {
        public bool AutoAttendance { get; set; } = true;
        public Location LastKnownLocation { get; set; } = new Location();
        public DateTime? LastAttendanceDate { get; set; }
    }

    [ComplexType]
    public class Location
    {
        public double? Lat { get; set; }
        public double? Lng { get; set; }
        public DateTime? Timestamp { get; set; }
    }
}