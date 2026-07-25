using SkyForge.Models.CompanyModel;
using SkyForge.Models.UserModel;
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SkyForge.Models
{
    [Table("DutySchedules")]
    public class DutySchedule
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid Id { get; set; }

        [Required]
        public Guid UserId { get; set; }

        [ForeignKey("UserId")]
        public virtual User User { get; set; } = null!;

        [Required]
        public Guid CompanyId { get; set; }

        [ForeignKey("CompanyId")]
        public virtual Company Company { get; set; } = null!;

        [MaxLength(50)]
        public string ScheduleType { get; set; } = "regular";

        [Column(TypeName = "jsonb")]
        public DutyHours DutyHours { get; set; } = new DutyHours();

        public Guid? OfficeLocationId { get; set; }

        public bool IsActive { get; set; } = true;

        // Schedule validity period
        public DateTime? ValidFrom { get; set; }
        public DateTime? ValidTo { get; set; }

        // Days of week this schedule applies to (0=Sunday, 1=Monday, etc.)
        [Column(TypeName = "integer[]")]
        public int[]? DaysOfWeek { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }

    [ComplexType]
    public class DutyHours
    {
        public string StartTime { get; set; } = "09:00";
        public string EndTime { get; set; } = "17:00";
        public int GracePeriod { get; set; } = 15;
    }
}