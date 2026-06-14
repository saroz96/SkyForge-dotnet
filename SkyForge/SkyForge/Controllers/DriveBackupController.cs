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

                var redirectUri = $"{Request.Scheme}://{Request.Host}/api/drivebackup/auth-callback";
                var authUrl = $"https://accounts.google.com/o/oauth2/v2/auth?" +
                              $"client_id={Uri.EscapeDataString(_clientId)}&" +
                              $"redirect_uri={Uri.EscapeDataString(redirectUri)}&" +
                              $"response_type=code&" +
                              $"scope={Uri.EscapeDataString(DriveService.Scope.DriveFile)}&" +
                              $"access_type=offline&" +
                              $"prompt=consent&" +
                              $"state={Uri.EscapeDataString(userId)}";

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
                var code = Request.Query["code"].ToString();
                var state = Request.Query["state"].ToString();
                var error = Request.Query["error"].ToString();
                var errorDescription = Request.Query["error_description"].ToString();

                Console.WriteLine($"Auth Callback - Code received: {(string.IsNullOrEmpty(code) ? "NO" : "YES")}, State: {state}");

                if (!string.IsNullOrEmpty(error))
                {
                    var errorHtml = $@"
                    <html>
                    <body>
                        <script>
                            if(window.opener){{
                                window.opener.postMessage({{ type: 'google-auth-error', error: '{error}' }}, '*');
                                window.close();
                            }}
                        </script>
                        <h3>Error: {error}</h3>
                        <p>{errorDescription}</p>
                    </body>
                    </html>";
                    return Content(errorHtml, "text/html");
                }

                if (string.IsNullOrEmpty(code))
                {
                    var errorHtml = @"
                    <html>
                    <body>
                        <script>
                            if(window.opener){{
                                window.opener.postMessage({{ type: 'google-auth-error', error: 'No code received' }}, '*');
                                window.close();
                            }}
                        </script>
                        <h3>No authorization code received</h3>
                    </body>
                    </html>";
                    return Content(errorHtml, "text/html");
                }

                var userId = state;
                var redirectUri = $"{Request.Scheme}://{Request.Host}/api/drivebackup/auth-callback";

                Console.WriteLine($"Exchanging code for tokens. Redirect URI: {redirectUri}");

                var tokenUrl = "https://oauth2.googleapis.com/token";

                using (var httpClient = new HttpClient())
                {
                    var tokenRequest = new FormUrlEncodedContent(new[]
                    {
                        new KeyValuePair<string, string>("code", code),
                        new KeyValuePair<string, string>("client_id", _clientId),
                        new KeyValuePair<string, string>("client_secret", _clientSecret),
                        new KeyValuePair<string, string>("redirect_uri", redirectUri),
                        new KeyValuePair<string, string>("grant_type", "authorization_code")
                    });

                    var response = await httpClient.PostAsync(tokenUrl, tokenRequest);
                    var responseContent = await response.Content.ReadAsStringAsync();

                    Console.WriteLine($"Token exchange response status: {response.StatusCode}");

                    if (!response.IsSuccessStatusCode)
                    {
                        var errorHtml = $@"
                        <html>
                        <body>
                            <script>
                                if(window.opener){{
                                    window.opener.postMessage({{ type: 'google-auth-error', error: 'Token exchange failed' }}, '*');
                                    window.close();
                                }}
                            </script>
                            <h3>Token exchange failed</h3>
                            <pre>{responseContent}</pre>
                        </body>
                        </html>";
                        return Content(errorHtml, "text/html");
                    }

                    try
                    {
                        Console.WriteLine($"Saving token for user: {userId}");
                        var driveService = await _googleDriveService.GetDriveServiceAsync(userId);
                        Console.WriteLine("Token saved successfully!");
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Error saving token: {ex.Message}");
                    }

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
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Auth callback error: {ex.Message}");

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
                </body>
                </html>";
                return Content(errorHtml, "text/html");
            }
        }

        // [HttpPost("backup-all-with-format")]
        // public async Task<IActionResult> BackupAllUserCompaniesWithFormat([FromQuery] string format = "json")
        // {
        //     try
        //     {
        //         var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        //         var userEmail = User.FindFirst(ClaimTypes.Email)?.Value;

        //         if (string.IsNullOrEmpty(userId))
        //         {
        //             return Unauthorized(new { success = false, message = "User not authenticated" });
        //         }

        //         BackupFormat backupFormat = format.ToLower() switch
        //         {
        //             "json" => BackupFormat.Json,
        //             "compressed" => BackupFormat.JsonCompressed,
        //             "sql" => BackupFormat.Sql,
        //             "csv" => BackupFormat.Csv,
        //             _ => BackupFormat.Json
        //         };

        //         var result = await _backupService.BackupAllUserCompanies(userId, userEmail, backupFormat);

        //         if (result.IsSuccess)
        //         {
        //             return Ok(new
        //             {
        //                 success = true,
        //                 message = $"All companies backed up successfully in {format} format!",
        //                 backupTime = result.BackupTime,
        //                 format = format
        //             });
        //         }
        //         else
        //         {
        //             return BadRequest(new { success = false, error = result.ErrorMessage });
        //         }
        //     }
        //     catch (Exception ex)
        //     {
        //         return BadRequest(new { success = false, error = ex.Message });
        //     }
        // }


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