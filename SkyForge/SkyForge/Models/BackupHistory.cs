using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using SkyForge.Models.CompanyModel;

namespace SkyForge.Models
{
    public class BackupHistory
    {
        [Key]
        public int Id { get; set; }
        
        public Guid CompanyId { get; set; }
        
        public string UserId { get; set; }
        
        public string GoogleDriveFileId { get; set; }
        
        public string FileName { get; set; }
        
        public long FileSize { get; set; }
        
        public DateTime BackupDate { get; set; }
        
        public bool IsSuccess { get; set; }
        
        [Column(TypeName = "text")]
        public string? ErrorMessage { get; set; }  // Make this nullable
        
        [ForeignKey("CompanyId")]
        public virtual Company Company { get; set; }
    }
}