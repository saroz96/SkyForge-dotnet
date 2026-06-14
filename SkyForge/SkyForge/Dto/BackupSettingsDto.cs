namespace SkyForge.Dto
{
    public class BackupSettingsDto
    {
        public bool AutoBackupEnabled { get; set; }
        public string BackupSchedule { get; set; } = "daily";
        public string BackupFormat { get; set; } = "json";
    }
}