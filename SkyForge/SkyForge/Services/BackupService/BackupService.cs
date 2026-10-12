using Google.Apis.Drive.v3;
using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Models.CompanyModel;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using SkyForge.Models;
using System.IO.Compression;
using Npgsql;

namespace SkyForge.Services.BackupService
{
    public enum BackupFormat
    {
        JsonCompressed, // GZipped JSON (smaller file size)
        Sql,            // SQL dump (requires pg_dump)
        Csv             // CSV format for spreadsheet compatibility
    }

    public class BackupService
    {
        private readonly ApplicationDbContext _dbContext;
        private readonly GoogleDriveService _googleDriveService;
        private readonly IConfiguration _configuration;

        public BackupService(ApplicationDbContext dbContext, GoogleDriveService googleDriveService, IConfiguration configuration)
        {
            _dbContext = dbContext;
            _googleDriveService = googleDriveService;
            _configuration = configuration;
        }

        /// <summary>
        /// Backup ALL companies for a specific user with specified format
        /// </summary>
        public async Task<BackupInfo> BackupAllUserCompanies(string userId, string userEmail, BackupFormat format = BackupFormat.JsonCompressed)
        {
            var result = new BackupInfo
            {
                UserId = userId,
                UserEmail = userEmail,
                BackupTime = DateTime.Now
            };

            try
            {
                var driveService = await _googleDriveService.GetDriveServiceAsync(userId);

                List<Company> companies = new List<Company>();

                if (Guid.TryParse(userId, out Guid ownerGuid))
                {
                    companies = await _dbContext.Companies
                        .Where(c => c.OwnerId == ownerGuid)
                        .ToListAsync();
                }
                else
                {
                    var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Email == userId);
                    if (user != null)
                    {
                        companies = await _dbContext.Companies
                            .Where(c => c.OwnerId == user.Id)
                            .ToListAsync();
                    }
                }

                if (!companies.Any())
                {
                    result.ErrorMessage = "No companies found for this user";
                    result.IsSuccess = false;
                    // await LogBackupToDatabase(Guid.Empty, userId, null, "Backup_Failed", 0, false, result.ErrorMessage);
                    return result;
                }

                string mainFolderId = await GetOrCreateFolder(driveService, "Ams_Backups");

                foreach (var company in companies)
                {
                    await BackupSingleCompanyInternal(driveService, mainFolderId, company, userId, format);
                }

                result.IsSuccess = true;
                result.BackupFileName = $"{DateTime.Now:yyyy-MM-dd}_BatchBackup";
            }
            catch (Exception ex)
            {
                result.IsSuccess = false;
                result.ErrorMessage = ex.Message;
                await LogBackupToDatabase(Guid.Empty, userId, null, "Backup_Failed", 0, false, ex.Message);
            }

            return result;
        }

        /// <summary>
        /// Backup a single company with specified format
        /// </summary>
        public async Task<BackupInfo> BackupSingleCompany(string userId, string userEmail, Guid companyId, BackupFormat format = BackupFormat.JsonCompressed)
        {
            var result = new BackupInfo
            {
                UserId = userId,
                UserEmail = userEmail,
                BackupTime = DateTime.Now,
                CompanyId = companyId
            };

            try
            {
                var driveService = await _googleDriveService.GetDriveServiceAsync(userId);
                var company = await _dbContext.Companies.FindAsync(companyId);

                if (company == null)
                {
                    result.ErrorMessage = "Company not found";
                    result.IsSuccess = false;
                    await LogBackupToDatabase(companyId, userId, null, "Backup_Failed", 0, false, "Company not found");
                    return result;
                }

                string mainFolderId = await GetOrCreateFolder(driveService, "Ams_Backups");
                await BackupSingleCompanyInternal(driveService, mainFolderId, company, userId, format);

                result.IsSuccess = true;
                result.BackupFileName = $"{company.Name}_Backup_{DateTime.Now:yyyy-MM-dd}";
            }
            catch (Exception ex)
            {
                result.IsSuccess = false;
                result.ErrorMessage = ex.Message;
                await LogBackupToDatabase(companyId, userId, null, "Backup_Failed", 0, false, ex.Message);
            }

            return result;
        }

        /// <summary>
        /// Internal method to backup a single company
        /// </summary>
        private async Task BackupSingleCompanyInternal(DriveService driveService, string parentFolderId, Company company, string userId, BackupFormat format)
        {
            try
            {
                string companyFolderId = await GetOrCreateFolder(driveService, $"{company.Name}_Backups", parentFolderId);

                byte[] backupData;
                string fileName;
                string mimeType;

                switch (format)
                {
                    case BackupFormat.JsonCompressed:
                        (backupData, fileName, mimeType) = await GenerateCompressedJsonBackup(company.Id, company.Name);
                        break;
                    case BackupFormat.Sql:
                        (backupData, fileName, mimeType) = await GenerateSqlBackup(company.Id, company.Name);
                        break;
                    case BackupFormat.Csv:
                        (backupData, fileName, mimeType) = await GenerateCsvBackup(company.Id, company.Name);
                        break;
                    default:
                        (backupData, fileName, mimeType) = await GenerateCompressedJsonBackup(company.Id, company.Name);
                        break;
                }

                var fileMetadata = new Google.Apis.Drive.v3.Data.File()
                {
                    Name = fileName,
                    Parents = new List<string> { companyFolderId }
                };

                using (var stream = new MemoryStream(backupData))
                {
                    var request = driveService.Files.Create(fileMetadata, stream, mimeType);
                    request.Fields = "id";

                    var uploadProgress = await request.UploadAsync();

                    if (uploadProgress.Status == Google.Apis.Upload.UploadStatus.Completed)
                    {
                        var uploadedFile = request.ResponseBody;
                        string fileId = uploadedFile?.Id;

                        Console.WriteLine($"Backup successful! Format: {format}, File ID: {fileId}, Size: {backupData.Length} bytes");
                        await LogBackupToDatabase(company.Id, userId, fileId, fileName, backupData.Length, true, null);
                    }
                    else
                    {
                        Console.WriteLine($"Upload failed: {uploadProgress.Status}");
                        await LogBackupToDatabase(company.Id, userId, null, fileName, 0, false, "Upload failed: " + uploadProgress.Status);
                    }
                }

                await CleanupOldBackups(driveService, companyFolderId, company.Id, 10);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Backup error: {ex.Message}");
                await LogBackupToDatabase(company.Id, userId, null, $"Backup_{company.Id}", 0, false, ex.Message);
                throw;
            }
        }

        /// <summary>
        /// Generate compressed JSON backup (Smaller file size)
        /// </summary>
        private async Task<(byte[] Data, string FileName, string MimeType)> GenerateCompressedJsonBackup(Guid companyId, string companyName)
        {
            var backupData = await GetCompanyBackupData(companyId);

            var options = new System.Text.Json.JsonSerializerOptions
            {
                WriteIndented = false,
                PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase
            };

            var json = System.Text.Json.JsonSerializer.Serialize(backupData, options);
            var jsonBytes = System.Text.Encoding.UTF8.GetBytes(json);

            using (var outputStream = new MemoryStream())
            {
                using (var gzipStream = new GZipStream(outputStream, CompressionLevel.Optimal))
                {
                    await gzipStream.WriteAsync(jsonBytes, 0, jsonBytes.Length);
                }
                byte[] compressedData = outputStream.ToArray();

                string fileName = $"{DateTime.Now:yyyy-MM-dd_HHmmss}_{companyName.Replace(" ", "_")}_Backup.json.gz";
                string mimeType = "application/gzip";

                return (compressedData, fileName, mimeType);
            }
        }

        /// <summary>
        /// Generate SQL backup using pg_dump (Complete database restore)
        /// </summary>
        private async Task<(byte[] Data, string FileName, string MimeType)> GenerateSqlBackup(Guid companyId, string companyName)
        {
            try
            {
                Console.WriteLine($"=== Starting SQL Backup for {companyName} ===");

                string pgDumpPath = FindPgDumpPath();
                Console.WriteLine($"pg_dump path: {pgDumpPath}");

                if (string.IsNullOrEmpty(pgDumpPath))
                {
                    throw new Exception("pg_dump not found. Please ensure PostgreSQL is installed and added to PATH.");
                }

                var connectionString = _configuration.GetConnectionString("DefaultConnection");
                Console.WriteLine($"Connection string: {connectionString}");

                if (string.IsNullOrEmpty(connectionString))
                {
                    throw new Exception("Connection string not found in appsettings.json");
                }

                var host = "localhost";
                var port = "5432";
                var database = "SkyForge";
                var username = "postgres";
                var password = "";

                var parts = connectionString.Split(';');
                foreach (var part in parts)
                {
                    var trimmed = part.Trim();
                    if (trimmed.StartsWith("Server=", StringComparison.OrdinalIgnoreCase) ||
                        trimmed.StartsWith("Host=", StringComparison.OrdinalIgnoreCase))
                        host = trimmed.Split('=')[1];
                    else if (trimmed.StartsWith("Port=", StringComparison.OrdinalIgnoreCase))
                        port = trimmed.Split('=')[1];
                    else if (trimmed.StartsWith("Database=", StringComparison.OrdinalIgnoreCase))
                        database = trimmed.Split('=')[1];
                    else if (trimmed.StartsWith("User Id=", StringComparison.OrdinalIgnoreCase) ||
                             trimmed.StartsWith("Username=", StringComparison.OrdinalIgnoreCase))
                        username = trimmed.Split('=')[1];
                    else if (trimmed.StartsWith("Password=", StringComparison.OrdinalIgnoreCase))
                        password = trimmed.Split('=')[1];
                }

                Console.WriteLine($"Database: {database}, Host: {host}, Port: {port}, Username: {username}");

                var backupFileName = $"{companyName.Replace(" ", "_")}_Backup_{DateTime.Now:yyyyMMdd_HHmmss}.dump";
                var backupPath = Path.Combine(Path.GetTempPath(), backupFileName);
                Console.WriteLine($"Backup path: {backupPath}");

                var connectionStringForPgDump = $"host={host} port={port} dbname={database} user={username} password={password}";
                var arguments = $"\"{connectionStringForPgDump}\" --file=\"{backupPath}\" --format=custom --compress=9";
                Console.WriteLine($"Arguments: {arguments}");

                var startInfo = new System.Diagnostics.ProcessStartInfo
                {
                    FileName = pgDumpPath,
                    Arguments = arguments,
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    RedirectStandardError = true,
                    RedirectStandardOutput = true
                };

                using (var process = new System.Diagnostics.Process())
                {
                    process.StartInfo = startInfo;

                    var output = new System.Text.StringBuilder();
                    var error = new System.Text.StringBuilder();

                    process.OutputDataReceived += (sender, e) =>
                    {
                        if (e.Data != null)
                        {
                            output.AppendLine(e.Data);
                            Console.WriteLine($"pg_dump output: {e.Data}");
                        }
                    };

                    process.ErrorDataReceived += (sender, e) =>
                    {
                        if (e.Data != null)
                        {
                            error.AppendLine(e.Data);
                            Console.WriteLine($"pg_dump error: {e.Data}");
                        }
                    };

                    process.Start();
                    process.BeginOutputReadLine();
                    process.BeginErrorReadLine();

                    var completed = await Task.Run(() => process.WaitForExit(300000));

                    if (!completed)
                    {
                        process.Kill();
                        throw new Exception("pg_dump timed out after 5 minutes");
                    }

                    Console.WriteLine($"pg_dump exit code: {process.ExitCode}");

                    if (process.ExitCode != 0)
                    {
                        throw new Exception($"pg_dump failed with exit code {process.ExitCode}. Error: {error.ToString()}");
                    }
                }

                if (!File.Exists(backupPath))
                {
                    throw new Exception("Backup file was not created");
                }

                var fileInfo = new FileInfo(backupPath);
                if (fileInfo.Length == 0)
                {
                    throw new Exception("Backup file is empty");
                }

                Console.WriteLine($"Backup successful! File size: {fileInfo.Length} bytes");

                var backupData = await File.ReadAllBytesAsync(backupPath);
                File.Delete(backupPath);

                string fileName = $"{DateTime.Now:yyyy-MM-dd_HHmmss}_{companyName.Replace(" ", "_")}_Backup.dump";
                string mimeType = "application/octet-stream";

                return (backupData, fileName, mimeType);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"SQL backup failed: {ex.Message}");
                Console.WriteLine($"Stack trace: {ex.StackTrace}");
                throw;
            }
        }

        /// <summary>
        /// Find pg_dump.exe path on the system
        /// </summary>
        private string FindPgDumpPath()
        {
            Console.WriteLine("=== FindPgDumpPath called ===");

            // Check if running on Linux/Unix (Docker)
            if (Environment.OSVersion.Platform == PlatformID.Unix)
            {
                Console.WriteLine("Detected Linux/Unix environment");

                // Linux paths for pg_dump
                var linuxPaths = new List<string>
        {
            "/usr/bin/pg_dump",
            "/usr/local/bin/pg_dump",
            "/usr/lib/postgresql/15/bin/pg_dump",
            "/usr/lib/postgresql/16/bin/pg_dump",
            "/usr/lib/postgresql/17/bin/pg_dump",
            "/usr/lib/postgresql/18/bin/pg_dump"
        };

                foreach (var path in linuxPaths)
                {
                    if (File.Exists(path))
                    {
                        Console.WriteLine($"Found pg_dump at: {path}");
                        return path;
                    }
                }

                // Try using 'which' command on Linux
                try
                {
                    var startInfo = new System.Diagnostics.ProcessStartInfo
                    {
                        FileName = "which",
                        Arguments = "pg_dump",
                        UseShellExecute = false,
                        CreateNoWindow = true,
                        RedirectStandardOutput = true,
                        RedirectStandardError = true
                    };

                    using (var process = System.Diagnostics.Process.Start(startInfo))
                    {
                        if (process != null)
                        {
                            string output = process.StandardOutput.ReadToEnd();
                            process.WaitForExit();
                            if (!string.IsNullOrEmpty(output))
                            {
                                var path = output.Trim();
                                if (File.Exists(path))
                                {
                                    Console.WriteLine($"Found pg_dump via 'which': {path}");
                                    return path;
                                }
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error using 'which': {ex.Message}");
                }
            }
            else
            {
                Console.WriteLine("Detected Windows environment");

                // Windows paths for pg_dump
                var windowsPaths = new List<string>
        {
            @"C:\Program Files\PostgreSQL\18\bin\pg_dump.exe",
            @"C:\Program Files\PostgreSQL\17\bin\pg_dump.exe",
            @"C:\Program Files\PostgreSQL\16\bin\pg_dump.exe",
            @"C:\Program Files\PostgreSQL\15\bin\pg_dump.exe",
            @"C:\Program Files\PostgreSQL\14\bin\pg_dump.exe",
            @"C:\Program Files\PostgreSQL\13\bin\pg_dump.exe",
            @"C:\Program Files (x86)\PostgreSQL\18\bin\pg_dump.exe",
        };

                foreach (var path in windowsPaths)
                {
                    if (File.Exists(path))
                    {
                        Console.WriteLine($"Found pg_dump at: {path}");
                        return path;
                    }
                }

                // Try using 'where' command on Windows
                try
                {
                    var startInfo = new System.Diagnostics.ProcessStartInfo
                    {
                        FileName = "where",
                        Arguments = "pg_dump",
                        UseShellExecute = false,
                        CreateNoWindow = true,
                        RedirectStandardOutput = true,
                        RedirectStandardError = true
                    };

                    using (var process = System.Diagnostics.Process.Start(startInfo))
                    {
                        if (process != null)
                        {
                            string output = process.StandardOutput.ReadToEnd();
                            process.WaitForExit();
                            if (!string.IsNullOrEmpty(output))
                            {
                                var path = output.Trim().Split('\n')[0];
                                if (File.Exists(path))
                                {
                                    Console.WriteLine($"Found pg_dump via 'where': {path}");
                                    return path;
                                }
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error finding pg_dump: {ex.Message}");
                }
            }

            Console.WriteLine("pg_dump NOT found!");
            return null;
        }
        /// <summary>
        /// Generate CSV backup for spreadsheet compatibility
        /// </summary>
        private async Task<(byte[] Data, string FileName, string MimeType)> GenerateCsvBackup(Guid companyId, string companyName)
        {
            using (var memoryStream = new MemoryStream())
            using (var writer = new StreamWriter(memoryStream))
            {
                var backupData = await GetCompanyBackupData(companyId);

                await writer.WriteLineAsync("# Company Information");
                await writer.WriteLineAsync($"ID,{backupData.Company.Id}");
                await writer.WriteLineAsync($"Name,{backupData.Company.Name}");
                await writer.WriteLineAsync($"Address,{backupData.Company.Address}");
                await writer.WriteLineAsync($"PAN,{backupData.Company.Pan}");
                await writer.WriteLineAsync($"Phone,{backupData.Company.Phone}");
                await writer.WriteLineAsync($"Email,{backupData.Company.Email}");
                await writer.WriteLineAsync($"Trade Type,{backupData.Company.TradeType}");
                await writer.WriteLineAsync($"VAT Enabled,{backupData.Company.VatEnabled}");
                await writer.WriteLineAsync("");

                await writer.WriteLineAsync("# Fiscal Years");
                await writer.WriteLineAsync("ID,Name,StartDate,EndDate,IsActive");
                foreach (var fy in backupData.FiscalYears)
                {
                    await writer.WriteLineAsync($"{fy.Id},{fy.Name},{fy.StartDate},{fy.EndDate},{fy.IsActive}");
                }
                await writer.WriteLineAsync("");

                await writer.WriteLineAsync("# Accounts");
                await writer.WriteLineAsync("ID,Name,UniqueNumber");
                foreach (var acc in backupData.Accounts)
                {
                    await writer.WriteLineAsync($"{acc.Id},{acc.Name},{acc.UniqueNumber}");
                }
                await writer.WriteLineAsync("");

                await writer.WriteLineAsync("# Items");
                await writer.WriteLineAsync("ID,Name,UniqueNumber,BarcodeNumber");
                foreach (var item in backupData.Items)
                {
                    await writer.WriteLineAsync($"{item.Id},{item.Name},{item.UniqueNumber},{item.BarcodeNumber}");
                }
                await writer.WriteLineAsync("");

                await writer.WriteLineAsync($"# Backup Time,{DateTime.Now}");
                await writer.WriteLineAsync($"# Backup Version,1.0");

                await writer.FlushAsync();

                byte[] data = memoryStream.ToArray();
                string fileName = $"{DateTime.Now:yyyy-MM-dd_HHmmss}_{companyName.Replace(" ", "_")}_Backup.csv";
                string mimeType = "text/csv";

                return (data, fileName, mimeType);
            }
        }

        /// <summary>
        /// Get complete company backup data
        /// </summary>
        private async Task<dynamic> GetCompanyBackupData(Guid companyId)
        {
            var company = await _dbContext.Companies.FirstOrDefaultAsync(c => c.Id == companyId);

            var fiscalYears = await _dbContext.FiscalYears
                .Where(f => f.CompanyId == companyId)
                .Select(f => new { f.Id, f.Name, f.StartDate, f.EndDate, f.IsActive })
                .ToListAsync();

            var accounts = await _dbContext.Accounts
                .Where(a => a.CompanyId == companyId)
                .Select(a => new { a.Id, a.Name, a.UniqueNumber })
                .Take(500)
                .ToListAsync();

            var items = await _dbContext.Items
                .Where(i => i.CompanyId == companyId)
                .Select(i => new { i.Id, i.Name, i.UniqueNumber, i.BarcodeNumber })
                .Take(500)
                .ToListAsync();

            return new
            {
                Company = new
                {
                    company.Id,
                    company.Name,
                    company.Address,
                    company.Pan,
                    company.Phone,
                    company.Email,
                    TradeType = company.TradeType.ToString(),
                    company.VatEnabled,
                    DateFormat = company.DateFormat.ToString()
                },
                FiscalYears = fiscalYears,
                Accounts = accounts,
                Items = items,
                BackupTime = DateTime.Now,
                BackupVersion = "1.0"
            };
        }

        /// <summary>
        /// Get or create a folder in Google Drive
        /// </summary>
        private async Task<string> GetOrCreateFolder(DriveService driveService, string folderName, string parentId = null)
        {
            var searchQuery = $"name='{folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false";
            if (!string.IsNullOrEmpty(parentId))
            {
                searchQuery += $" and '{parentId}' in parents";
            }

            var listRequest = driveService.Files.List();
            listRequest.Q = searchQuery;
            listRequest.Fields = "files(id, name)";
            var folders = await listRequest.ExecuteAsync();

            if (folders.Files != null && folders.Files.Any())
            {
                return folders.Files.First().Id;
            }

            var fileMetadata = new Google.Apis.Drive.v3.Data.File()
            {
                Name = folderName,
                MimeType = "application/vnd.google-apps.folder"
            };

            if (!string.IsNullOrEmpty(parentId))
            {
                fileMetadata.Parents = new List<string> { parentId };
            }

            var request = driveService.Files.Create(fileMetadata);
            request.Fields = "id";
            var folder = await request.ExecuteAsync();

            return folder.Id;
        }


        /// <summary>
        /// Log backup information to database
        /// </summary>
        private async Task LogBackupToDatabase(Guid companyId, string userId, string driveFileId, string fileName, long fileSize, bool isSuccess, string errorMessage)
        {
            try
            {
                // Only log if CompanyId is valid (not empty)
                if (companyId == Guid.Empty)
                {
                    Console.WriteLine($"Skipping backup log - Invalid CompanyId (Empty)");
                    return;
                }

                // Verify the company actually exists in the database
                var companyExists = await _dbContext.Companies.AnyAsync(c => c.Id == companyId);
                if (!companyExists)
                {
                    Console.WriteLine($"Skipping backup log - Company {companyId} not found");
                    return;
                }

                Console.WriteLine($"Logging backup to database - CompanyId: {companyId}, UserId: {userId}, Success: {isSuccess}");

                var backupLog = new BackupHistory
                {
                    CompanyId = companyId,
                    UserId = userId,
                    GoogleDriveFileId = driveFileId,
                    FileName = fileName,
                    FileSize = fileSize,
                    BackupDate = DateTime.Now,
                    IsSuccess = isSuccess,
                    ErrorMessage = errorMessage ?? string.Empty
                };

                _dbContext.BackupHistories.Add(backupLog);
                int result = await _dbContext.SaveChangesAsync();
                Console.WriteLine($"Backup history saved. Rows affected: {result}, ID: {backupLog.Id}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to log backup: {ex.Message}");
                Console.WriteLine($"Stack trace: {ex.StackTrace}");
            }
        }


        /// <summary>
        /// Clean up old backups (keep only recent ones)
        /// </summary>
        // private async Task CleanupOldBackups(DriveService driveService, string folderId, int keepCount)
        // {
        //     try
        //     {
        //         var listRequest = driveService.Files.List();
        //         listRequest.Q = $"'{folderId}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed=false";
        //         listRequest.OrderBy = "createdTime desc";
        //         listRequest.Fields = "files(id, name, createdTime)";
        //         var files = await listRequest.ExecuteAsync();

        //         if (files.Files != null && files.Files.Count > keepCount)
        //         {
        //             var oldFiles = files.Files.Skip(keepCount);
        //             foreach (var file in oldFiles)
        //             {
        //                 await driveService.Files.Delete(file.Id).ExecuteAsync();
        //                 Console.WriteLine($"Deleted old backup: {file.Name}");
        //             }
        //         }
        //     }
        //     catch (Exception ex)
        //     {
        //         Console.WriteLine($"Failed to cleanup old backups: {ex.Message}");
        //     }
        // }

        /// <summary>
        /// Clean up old backups (keep only recent ones) - deletes both Drive files AND DB records
        /// </summary>
        private async Task CleanupOldBackups(DriveService driveService, string folderId, Guid companyId, int keepCount)
        {
            try
            {
                // 1. Get all files in the Drive folder (newest first)
                var listRequest = driveService.Files.List();
                listRequest.Q = $"'{folderId}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed=false";
                listRequest.OrderBy = "createdTime desc";
                listRequest.Fields = "files(id, name, createdTime)";
                var files = await listRequest.ExecuteAsync();

                if (files.Files == null || files.Files.Count <= keepCount)
                    return;

                // 2. Files to remove (older than the newest `keepCount`)
                var oldFiles = files.Files.Skip(keepCount).ToList();
                var oldFileIds = oldFiles.Select(f => f.Id).ToList();

                // 3. Delete from Google Drive
                foreach (var file in oldFiles)
                {
                    try
                    {
                        await driveService.Files.Delete(file.Id).ExecuteAsync();
                        Console.WriteLine($"Deleted old Drive file: {file.Name}");
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Failed to delete Drive file {file.Name}: {ex.Message}");
                    }
                }

                // 4. Delete matching DB records
                var dbRecordsToDelete = await _dbContext.BackupHistories
                    .Where(b => b.CompanyId == companyId && oldFileIds.Contains(b.GoogleDriveFileId))
                    .ToListAsync();

                if (dbRecordsToDelete.Any())
                {
                    _dbContext.BackupHistories.RemoveRange(dbRecordsToDelete);
                    await _dbContext.SaveChangesAsync();
                    Console.WriteLine($"Deleted {dbRecordsToDelete.Count} backup history records from DB.");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to cleanup old backups: {ex.Message}");
            }
        }


    }

    public class BackupInfo
    {
        public Guid CompanyId { get; set; }
        public string CompanyName { get; set; }
        public string UserId { get; set; }
        public string UserEmail { get; set; }
        public string BackupFileName { get; set; }
        public string GoogleDriveFileId { get; set; }
        public DateTime BackupTime { get; set; }
        public long FileSizeBytes { get; set; }
        public bool IsSuccess { get; set; }
        public string ErrorMessage { get; set; }
    }
}

