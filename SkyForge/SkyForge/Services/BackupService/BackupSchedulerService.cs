using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Services;

namespace SkyForge.Services.BackupService
{
    public class BackupSchedulerService : BackgroundService
    {
        private readonly IServiceProvider _services;
        private readonly ILogger<BackupSchedulerService> _logger;

        public BackupSchedulerService(IServiceProvider services, ILogger<BackupSchedulerService> logger)
        {
            _services = services;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    // Check current time and schedule next run
                    var now = DateTime.Now;
                    var nextRun = GetNextRunTime(now);
                    
                    _logger.LogInformation($"Next automatic backup scheduled at: {nextRun}");
                    
                    var delay = nextRun - now;
                    if (delay > TimeSpan.Zero)
                    {
                        await Task.Delay(delay, stoppingToken);
                    }
                    
                    await PerformBackups(stoppingToken);
                }
                catch (TaskCanceledException)
                {
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in backup scheduler");
                    await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);
                }
            }
        }

        private DateTime GetNextRunTime(DateTime now)
        {
            // Default: Run at 2 AM daily
            var next = now.Date.AddDays(1).AddHours(2);
            
            // If it's before 2 AM today, run today at 2 AM
            if (now.Hour < 2)
            {
                next = now.Date.AddHours(2);
            }
            
            return next;
        }

        private async Task PerformBackups(CancellationToken stoppingToken)
        {
            using (var scope = _services.CreateScope())
            {
                var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                var backupService = scope.ServiceProvider.GetRequiredService<BackupService>();
                var googleDriveService = scope.ServiceProvider.GetRequiredService<GoogleDriveService>();
                
                // Get users with automatic backup enabled
                var users = await dbContext.Users
                    .Where(u => u.IsActive && u.AutoBackupEnabled)
                    .ToListAsync(stoppingToken);
                
                _logger.LogInformation($"Found {users.Count} users with automatic backup enabled");
                
                foreach (var user in users)
                {
                    if (stoppingToken.IsCancellationRequested)
                        break;

                    try
                    {
                        var userId = user.Id.ToString();
                        var userEmail = user.Email;
                        
                        // Check if user has Google Drive connected
                        var isConnected = await googleDriveService.IsUserAuthenticatedAsync(userId);
                        if (!isConnected)
                        {
                            _logger.LogWarning($"User {userEmail} has auto-backup enabled but not connected to Google Drive");
                            continue;
                        }
                        
                        _logger.LogInformation($"Starting automatic backup for user: {userEmail}");
                        
                        // Determine backup format from user settings
                        var format = user.BackupFormat?.ToLower() switch
                        {
                            "sql" => BackupFormat.Sql,
                            "csv" => BackupFormat.Csv,
                            _ => BackupFormat.JsonCompressed
                        };
                        
                        var result = await backupService.BackupAllUserCompanies(userId, userEmail, format);
                        
                        if (result.IsSuccess)
                        {
                            _logger.LogInformation($"Automatic backup completed for user: {userEmail}");
                        }
                        else
                        {
                            _logger.LogError($"Automatic backup failed for user {userEmail}: {result.ErrorMessage}");
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, $"Error backing up user: {user.Email}");
                    }
                }
                
                _logger.LogInformation("Automatic backup cycle completed");
            }
        }
    }
}