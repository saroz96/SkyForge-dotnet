using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SkyForge.Services;
using Google.Apis.Drive.v3;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using SkyForge.Models;
using SkyForge.Dto;
using SkyForge.Data;
using System.IO;

namespace SkyForge.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DriveBackupController : ControllerBase
    {
        private readonly GoogleDriveService _googleDriveService;
        private readonly BackupService _backupService;
        private readonly ApplicationDbContext _dbContext;
        private readonly IConfiguration _configuration;
        private readonly IWebHostEnvironment _environment;

        private readonly string _clientId;
        private readonly string _clientSecret;

        public DriveBackupController(
            GoogleDriveService googleDriveService,
            BackupService backupService,
            ApplicationDbContext dbContext,
            IConfiguration configuration,
            IWebHostEnvironment environment)
        {
            _googleDriveService = googleDriveService;
            _backupService = backupService;
            _dbContext = dbContext;
            _configuration = configuration;
            _environment = environment;

            _clientId = _googleDriveService.ClientId;
            _clientSecret = _googleDriveService.ClientSecret;
        }

        [HttpGet("connect")]
        public async Task<IActionResult> ConnectAndTest()
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { success = false, message = "User not authenticated" });
                }

                var driveService = await _googleDriveService.GetDriveServiceAsync(userId);

                var listRequest = driveService.Files.List();
                listRequest.PageSize = 5;
                var files = await listRequest.ExecuteAsync();

                return Ok(new
                {
                    success = true,
                    message = "Connected to Google Drive successfully!",
                    filesFound = files.Files?.Count ?? 0,
                    environment = _environment?.EnvironmentName ?? "Development"
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message,
                    stackTrace = _environment.IsDevelopment() ? ex.StackTrace : null
                });
            }
        }

        [HttpGet("create-folder")]
        public async Task<IActionResult> CreateBackupFolder(string folderName = "SkyForge_Backups")
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { success = false, message = "User not authenticated" });
                }

                var folderId = await _googleDriveService.GetOrCreateBackupFolderAsync(userId, folderName);

                return Ok(new
                {
                    success = true,
                    message = $"Folder '{folderName}' created/found!",
                    folderId = folderId,
                    viewLink = $"https://drive.google.com/drive/folders/{folderId}"
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, error = ex.Message });
            }
        }

        [HttpGet("status")]
        public async Task<IActionResult> GetConnectionStatus()
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                if (string.IsNullOrEmpty(userId))
                {
                    return Ok(new { success = true, isConnected = false });
                }

                var isAuthenticated = await _googleDriveService.IsUserAuthenticatedAsync(userId);

                return Ok(new
                {
                    success = true,
                    isConnected = isAuthenticated
                });
            }
            catch (Exception ex)
            {
                return Ok(new { success = true, isConnected = false });
            }
        }

        [HttpGet("history")]
        public async Task<IActionResult> GetBackupHistory()
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { success = false, message = "User not authenticated" });
                }

                var backups = await _dbContext.BackupHistories
                    .Include(b => b.Company)
                    .Where(b => b.UserId == userId)
                    .OrderByDescending(b => b.BackupDate)
                    .Take(50)
                    .Select(b => new
                    {
                        b.Id,
                        b.BackupDate,
                        b.FileName,
                        b.FileSize,
                        b.IsSuccess,
                        b.GoogleDriveFileId,
                        CompanyName = b.Company != null ? b.Company.Name : "Unknown"
                    })
                    .ToListAsync();

                return Ok(new { success = true, backups });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, error = ex.Message });
            }
        }

        [HttpGet("settings")]
        public async Task<IActionResult> GetBackupSettings()
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { success = false, message = "User not authenticated" });
                }

                var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id.ToString() == userId);

                return Ok(new
                {
                    success = true,
                    settings = new
                    {
                        autoBackupEnabled = user?.AutoBackupEnabled ?? false,
                        backupSchedule = user?.BackupSchedule ?? "daily",
                        backupFormat = user?.BackupFormat ?? "json"
                    }
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, error = ex.Message });
            }
        }

        [HttpPost("settings")]
        public async Task<IActionResult> SaveBackupSettings([FromBody] BackupSettingsDto settings)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { success = false, message = "User not authenticated" });
                }

                var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id.ToString() == userId);
                if (user != null)
                {
                    user.AutoBackupEnabled = settings.AutoBackupEnabled;
                    user.BackupSchedule = settings.BackupSchedule;
                    user.BackupFormat = settings.BackupFormat ?? "json";
                    await _dbContext.SaveChangesAsync();
                }

                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, error = ex.Message });
            }
        }

        [HttpPost("backup-all")]
        public async Task<IActionResult> BackupAllUserCompanies()
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var userEmail = User.FindFirst(ClaimTypes.Email)?.Value;

                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { success = false, message = "User not authenticated" });
                }

                var result = await _backupService.BackupAllUserCompanies(userId, userEmail);

                if (result.IsSuccess)
                {
                    return Ok(new
                    {
                        success = true,
                        message = "All companies backed up successfully!",
                        backupTime = result.BackupTime
                    });
                }
                else
                {
                    return BadRequest(new { success = false, error = result.ErrorMessage });
                }
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, error = ex.Message });
            }
        }

        [HttpPost("backup-company/{companyId}")]
        public async Task<IActionResult> BackupSingleCompany(string companyId)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var userEmail = User.FindFirst(ClaimTypes.Email)?.Value;

                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { success = false, message = "User not authenticated" });
                }

                if (!Guid.TryParse(companyId, out Guid companyGuid))
                {
                    return BadRequest(new { success = false, error = "Invalid company ID format" });
                }

                var result = await _backupService.BackupSingleCompany(userId, userEmail, companyGuid);

                if (result.IsSuccess)
                {
                    return Ok(new
                    {
                        success = true,
                        message = $"Company backup completed successfully!",
                        backupTime = result.BackupTime
                    });
                }
                else
                {
                    return BadRequest(new { success = false, error = result.ErrorMessage });
                }
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, error = ex.Message });
            }
        }

        [HttpPost("disconnect")]
        public async Task<IActionResult> Disconnect()
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { success = false, message = "User not authenticated" });
                }

                await _googleDriveService.RevokeAccessAsync(userId);

                return Ok(new { success = true, message = "Disconnected from Google Drive" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, error = ex.Message });
            }
        }

        // [HttpGet("auth-url")]
        // public IActionResult GetAuthUrl()
        // {
        //     try
        //     {
        //         var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        //         if (string.IsNullOrEmpty(userId))
        //         {
        //             return Unauthorized(new { success = false, message = "User not authenticated" });
        //         }

        //         var redirectUri = $"{Request.Scheme}://{Request.Host}/api/drivebackup/auth-callback";
        //         var authUrl = $"https://accounts.google.com/o/oauth2/v2/auth?" +
        //                       $"client_id={Uri.EscapeDataString(_clientId)}&" +
        //                       $"redirect_uri={Uri.EscapeDataString(redirectUri)}&" +
        //                       $"response_type=code&" +
        //                       $"scope={Uri.EscapeDataString(DriveService.Scope.DriveFile)}&" +
        //                       $"access_type=offline&" +
        //                       $"prompt=consent&" +
        //                       $"state={Uri.EscapeDataString(userId)}";

        //         return Ok(new { success = true, authUrl });
        //     }
        //     catch (Exception ex)
        //     {
        //         return BadRequest(new { success = false, error = ex.Message });
        //     }
        // }

        //----------------------for vps

        [HttpGet("auth-url")]
        public IActionResult GetAuthUrl()
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { success = false, message = "User not authenticated" });
                }

                var redirectUri = "https://api.amsacc.com/api/drivebackup/auth-callback";

                var authUrl = _googleDriveService.GetAuthorizationUrl(userId, redirectUri);

                return Ok(new { success = true, authUrl });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, error = ex.Message });
            }
        }

        [HttpGet("auth-callback")]
        public async Task<IActionResult> AuthCallback()
        {
            try
            {
                // Read parameters directly from the query string
                var code = Request.Query["code"].ToString();
                var state = Request.Query["state"].ToString();
                var error = Request.Query["error"].ToString();
                var errorDescription = Request.Query["error_description"].ToString();

                Console.WriteLine($"=== AUTH CALLBACK RECEIVED ===");
                Console.WriteLine($"Code: {(string.IsNullOrEmpty(code) ? "NO" : "YES")}");
                Console.WriteLine($"State: {state}");
                Console.WriteLine($"Error: {error}");

                // Handle error from Google
                if (!string.IsNullOrEmpty(error))
                {
                    Console.WriteLine($"Google returned error: {error} - {errorDescription}");
                    var errorHtml = $@"
            <html>
            <body>
                <script>
                    if(window.opener){{
                        window.opener.postMessage({{ 
                            type: 'google-auth-error', 
                            error: '{error}',
                            description: '{errorDescription}'
                        }}, '*');
                        window.close();
                    }}
                </script>
                <h3>Authentication Error</h3>
                <p>Error: {error}</p>
                <p>Description: {errorDescription}</p>
                <p>Please close this window and try again.</p>
            </body>
            </html>";
                    return Content(errorHtml, "text/html");
                }

                // Check for missing code
                if (string.IsNullOrEmpty(code))
                {
                    Console.WriteLine("No authorization code received");
                    var errorHtml = @"
            <html>
            <body>
                <script>
                    if(window.opener){{
                        window.opener.postMessage({ type: 'google-auth-error', error: 'No authorization code received' }, '*');
                        window.close();
                    }}
                </script>
                <h3>No authorization code received</h3>
                <p>Please close this window and try again.</p>
            </body>
            </html>";
                    return Content(errorHtml, "text/html");
                }

                // Check for missing state (user ID)
                if (string.IsNullOrEmpty(state))
                {
                    Console.WriteLine("No user ID in state parameter");
                    var errorHtml = @"
            <html>
            <body>
                <script>
                    if(window.opener){{
                        window.opener.postMessage({ type: 'google-auth-error', error: 'No user ID found' }, '*');
                        window.close();
                    }}
                </script>
                <h3>No user ID found</h3>
                <p>Please close this window and try again.</p>
            </body>
            </html>";
                    return Content(errorHtml, "text/html");
                }

                var userId = state;
                var redirectUri = "https://api.amsacc.com/api/drivebackup/auth-callback";

                Console.WriteLine($"Exchanging code for user: {userId}");
                var success = await _googleDriveService.ExchangeCodeForTokensAsync(userId, code, redirectUri);

                if (success)
                {
                    Console.WriteLine($"Token exchange successful for user: {userId}");
                    var successHtml = @"
            <html>
            <body>
                <script>
                    if(window.opener){
                        window.opener.postMessage({ type: 'google-auth-success' }, '*');
                        window.close();
                    }
                </script>
                <h3>Authentication Successful!</h3>
                <p>You have successfully connected your Google Drive.</p>
                <p>You can close this window.</p>
            </body>
            </html>";
                    return Content(successHtml, "text/html");
                }

                Console.WriteLine($"Token exchange failed for user: {userId}");
                var failHtml = @"
        <html>
        <body>
            <script>
                if(window.opener){
                    window.opener.postMessage({ type: 'google-auth-error', error: 'Token exchange failed' }, '*');
                    window.close();
                }
            </script>
            <h3>Authentication Failed</h3>
            <p>Token exchange failed. Please try again.</p>
        </body>
        </html>";
                return Content(failHtml, "text/html");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"EXCEPTION in AuthCallback: {ex.Message}");
                Console.WriteLine($"Stack trace: {ex.StackTrace}");
                var errorHtml = $@"
        <html>
        <body>
            <script>
                if(window.opener){{
                    window.opener.postMessage({{ type: 'google-auth-error', error: '{ex.Message.Replace("'", "\\'")}' }}, '*');
                    window.close();
                }}
            </script>
            <h3>Error: {ex.Message}</h3>
            <p>Please close this window and try again.</p>
        </body>
        </html>";
                return Content(errorHtml, "text/html");
            }
        }

        [HttpPost("backup-all-with-format")]
        public async Task<IActionResult> BackupAllUserCompaniesWithFormat([FromQuery] string format = "compressed")
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var userEmail = User.FindFirst(ClaimTypes.Email)?.Value;

                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { success = false, message = "User not authenticated" });
                }

                BackupFormat backupFormat = format.ToLower() switch
                {
                    "compressed" => BackupFormat.JsonCompressed,
                    "sql" => BackupFormat.Sql,
                    "csv" => BackupFormat.Csv,
                    _ => BackupFormat.JsonCompressed
                };

                var result = await _backupService.BackupAllUserCompanies(userId, userEmail, backupFormat);

                if (result.IsSuccess)
                {
                    return Ok(new
                    {
                        success = true,
                        message = $"All companies backed up successfully in {format} format!",
                        backupTime = result.BackupTime,
                        format = format
                    });
                }
                else
                {
                    return BadRequest(new { success = false, error = result.ErrorMessage });
                }
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, error = ex.Message });
            }
        }

        [HttpGet("debug-auth")]
        public IActionResult DebugAuth()
        {
            var allParams = Request.Query.ToDictionary(x => x.Key, x => x.Value.ToString());
            return Ok(new
            {
                success = true,
                queryString = Request.QueryString.ToString(),
                parameters = allParams,
                clientId = _clientId,
                environment = _environment.EnvironmentName
            });
        }

        [HttpGet("debug-token")]
        public IActionResult DebugToken()
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                if (string.IsNullOrEmpty(userId))
                {
                    return Ok(new { success = false, message = "No user ID found" });
                }

                var tokenPath = Path.Combine(_environment.ContentRootPath, "GoogleDriveTokens", userId);
                var folderExists = Directory.Exists(tokenPath);

                string[] files = new string[0];
                if (folderExists)
                {
                    files = Directory.GetFiles(tokenPath);
                }

                return Ok(new
                {
                    success = true,
                    userId = userId,
                    tokenFolderPath = tokenPath,
                    folderExists = folderExists,
                    files = files,
                    environment = _environment.EnvironmentName,
                    credentialsFile = _googleDriveService.GetCredentialsFilePath()
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }
    }

    public class BackupSettingsDto
    {
        public bool AutoBackupEnabled { get; set; }
        public string BackupSchedule { get; set; } = "daily";
        public string BackupFormat { get; set; } = "json";
    }
}