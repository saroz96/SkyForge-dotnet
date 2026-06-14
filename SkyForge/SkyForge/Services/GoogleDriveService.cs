using Google.Apis.Auth.OAuth2;
using Google.Apis.Drive.v3;
using Google.Apis.Services;
using Google.Apis.Util.Store;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;
using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using System.Text.Json;

namespace SkyForge.Services
{
    public class GoogleDriveService
    {
        private static readonly string[] Scopes = { DriveService.Scope.DriveFile };
        private static readonly string ApplicationName = "Ams Backup Service";

        private static readonly string DesktopCredentialsFile = "credentials.json";
        private static readonly string WebCredentialsFile = "credentials_web.json";
        private static readonly string TokenFolderPath = "GoogleDriveTokens";

        private readonly IWebHostEnvironment _environment;

        public string ClientId { get; private set; }
        public string ClientSecret { get; private set; }

        public GoogleDriveService(IWebHostEnvironment environment)
        {
            _environment = environment;
            LoadClientCredentials();
        }

        private void LoadClientCredentials()
        {
            var credentialsPath = GetCredentialsFilePath();

            if (!File.Exists(credentialsPath))
            {
                throw new FileNotFoundException($"Credentials file not found at: {credentialsPath}");
            }

            var jsonContent = File.ReadAllText(credentialsPath);

            using var document = JsonDocument.Parse(jsonContent);
            var root = document.RootElement;

            if (root.TryGetProperty("installed", out var installed))
            {
                ClientId = installed.GetProperty("client_id").GetString();
                ClientSecret = installed.GetProperty("client_secret").GetString();
            }
            else if (root.TryGetProperty("web", out var web))
            {
                ClientId = web.GetProperty("client_id").GetString();
                ClientSecret = web.GetProperty("client_secret").GetString();
            }
            else
            {
                throw new Exception("Invalid credentials file format. Expected 'installed' or 'web' section.");
            }
        }

        public string GetCredentialsFilePath()
        {
            if (_environment.IsProduction())
            {
                var webCredsPath = Path.Combine(_environment.ContentRootPath, WebCredentialsFile);
                if (File.Exists(webCredsPath))
                {
                    return webCredsPath;
                }
                return Path.Combine(_environment.ContentRootPath, DesktopCredentialsFile);
            }

            return Path.Combine(_environment.ContentRootPath, DesktopCredentialsFile);
        }

        // public async Task<DriveService> GetDriveServiceAsync(string userId)
        // {
        //     if (string.IsNullOrEmpty(userId))
        //     {
        //         throw new ArgumentException("UserId cannot be null or empty");
        //     }

        //     UserCredential credential;

        //     var tokenPath = Path.Combine(_environment.ContentRootPath, TokenFolderPath, userId);
        //     Directory.CreateDirectory(tokenPath);

        //     var credentialsPath = GetCredentialsFilePath();

        //     if (!File.Exists(credentialsPath))
        //     {
        //         throw new FileNotFoundException($"Credentials file not found at: {credentialsPath}");
        //     }

        //     using (var stream = new FileStream(credentialsPath, FileMode.Open, FileAccess.Read))
        //     {
        //         try
        //         {
        //             credential = await GoogleWebAuthorizationBroker.AuthorizeAsync(
        //                 GoogleClientSecrets.Load(stream).Secrets,
        //                 Scopes,
        //                 userId,
        //                 CancellationToken.None,
        //                 new FileDataStore(tokenPath, true)
        //             );
        //         }
        //         catch (InvalidOperationException ex) when (ex.Message.Contains("redirect_uri_mismatch"))
        //         {
        //             throw new Exception(
        //                 "OAuth configuration error: Please ensure you're using the correct credentials type.\n" +
        //                 "- For local development: Use 'Desktop app' credentials (credentials.json)\n" +
        //                 "- For production website: Use 'Web application' credentials (credentials_web.json)\n" +
        //                 "See Google Cloud Console → Credentials → OAuth 2.0 Client IDs",
        //                 ex
        //             );
        //         }
        //     }

        //     var service = new DriveService(new BaseClientService.Initializer()
        //     {
        //         HttpClientInitializer = credential,
        //         ApplicationName = ApplicationName,
        //     });

        //     return service;
        // }

        // public async Task<bool> IsUserAuthenticatedAsync(string userId)
        // {
        //     try
        //     {
        //         var tokenPath = Path.Combine(_environment.ContentRootPath, TokenFolderPath, userId);
        //         var dataStore = new FileDataStore(tokenPath, true);
        //         var tokens = await dataStore.GetAsync<Google.Apis.Auth.OAuth2.Responses.TokenResponse>(userId);
        //         return tokens != null && !string.IsNullOrEmpty(tokens.RefreshToken);
        //     }
        //     catch
        //     {
        //         return false;
        //     }
        // }


        public async Task<DriveService> GetDriveServiceAsync(string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                throw new ArgumentException("UserId cannot be null or empty");
            }

            UserCredential credential;

            var tokenPath = Path.Combine(_environment.ContentRootPath, TokenFolderPath, userId);
            Console.WriteLine($"Token path: {tokenPath}");

            Directory.CreateDirectory(tokenPath);

            var credentialsPath = GetCredentialsFilePath();
            Console.WriteLine($"Using credentials file: {credentialsPath}");

            if (!File.Exists(credentialsPath))
            {
                throw new FileNotFoundException($"Credentials file not found at: {credentialsPath}");
            }

            using (var stream = new FileStream(credentialsPath, FileMode.Open, FileAccess.Read))
            {
                var secrets = GoogleClientSecrets.Load(stream).Secrets;
                Console.WriteLine($"Loaded credentials - Client ID: {secrets.ClientId}");

                credential = await GoogleWebAuthorizationBroker.AuthorizeAsync(
                    secrets,
                    Scopes,
                    userId,
                    CancellationToken.None,
                    new FileDataStore(tokenPath, true)
                );

                Console.WriteLine($"Authorization complete - Has token: {credential.Token != null}");
            }

            var service = new DriveService(new BaseClientService.Initializer()
            {
                HttpClientInitializer = credential,
                ApplicationName = ApplicationName,
            });

            return service;
        }

        public async Task<bool> IsUserAuthenticatedAsync(string userId)
        {
            try
            {
                if (string.IsNullOrEmpty(userId))
                {
                    Console.WriteLine("IsUserAuthenticatedAsync: userId is null or empty");
                    return false;
                }

                var tokenPath = Path.Combine(_environment.ContentRootPath, TokenFolderPath, userId);
                Console.WriteLine($"Checking token path: {tokenPath}");

                if (!Directory.Exists(tokenPath))
                {
                    Console.WriteLine($"Token folder does not exist: {tokenPath}");
                    return false;
                }

                var dataStore = new FileDataStore(tokenPath, true);
                var tokens = await dataStore.GetAsync<Google.Apis.Auth.OAuth2.Responses.TokenResponse>(userId);

                Console.WriteLine($"Token found: {tokens != null}, HasRefreshToken: {tokens?.RefreshToken != null}");

                return tokens != null && !string.IsNullOrEmpty(tokens.RefreshToken);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in IsUserAuthenticatedAsync: {ex.Message}");
                return false;
            }
        }

        public async Task RevokeAccessAsync(string userId)
        {
            try
            {
                var tokenPath = Path.Combine(_environment.ContentRootPath, TokenFolderPath, userId);
                if (Directory.Exists(tokenPath))
                {
                    Directory.Delete(tokenPath, true);
                }
            }
            catch (Exception ex)
            {
                throw new Exception($"Failed to revoke access for user {userId}: {ex.Message}", ex);
            }

            await Task.CompletedTask;
        }

        public async Task<string> GetOrCreateBackupFolderAsync(string userId, string folderName = "SkyForge_Backups")
        {
            var service = await GetDriveServiceAsync(userId);

            var searchQuery = $"name='{folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false";
            var listRequest = service.Files.List();
            listRequest.Q = searchQuery;
            listRequest.Fields = "files(id, name)";
            var folders = await listRequest.ExecuteAsync();

            if (folders.Files != null && folders.Files.Count > 0)
            {
                return folders.Files[0].Id;
            }

            var fileMetadata = new Google.Apis.Drive.v3.Data.File()
            {
                Name = folderName,
                MimeType = "application/vnd.google-apps.folder"
            };

            var request = service.Files.Create(fileMetadata);
            request.Fields = "id";
            var folder = await request.ExecuteAsync();

            return folder.Id;
        }
    }
}