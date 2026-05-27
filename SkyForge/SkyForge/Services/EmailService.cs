using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System;
using System.IO;
using System.Net;
using System.Net.Mail;
using System.Threading.Tasks;

namespace SkyForge.Services
{
    public interface IEmailService
    {
        Task SendEmailAsync(string toEmail, string subject, string body);
        Task SendVerificationEmailAsync(string toEmail, string userName, string verificationToken);
        Task SendWelcomeEmailAsync(string toEmail, string userName);
        Task SendPasswordResetEmailAsync(string toEmail, string resetToken);
    }

    public class EmailService : IEmailService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<EmailService> _logger;

        public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
        {
            _configuration = configuration;
            _logger = logger;
        }

        public async Task SendEmailAsync(string toEmail, string subject, string body)
        {
            // For development, log email instead of sending
            if (_configuration.GetValue<bool>("EmailSettings:UseFileLog", false))
            {
                LogEmailToFile(toEmail, subject, body);
                return;
            }

            try
            {
                var smtpSettings = _configuration.GetSection("EmailSettings:Smtp");

                using (var client = new SmtpClient(smtpSettings["Host"], int.Parse(smtpSettings["Port"])))
                {
                    client.EnableSsl = bool.Parse(smtpSettings["EnableSsl"]);
                    client.Credentials = new NetworkCredential(
                        smtpSettings["Username"],
                        smtpSettings["Password"]);
                    client.Timeout = 10000;

                    var mailMessage = new MailMessage
                    {
                        From = new MailAddress(smtpSettings["FromEmail"], smtpSettings["FromName"]),
                        Subject = subject,
                        Body = body,
                        IsBodyHtml = true
                    };

                    mailMessage.To.Add(toEmail);

                    await client.SendMailAsync(mailMessage);
                    _logger.LogInformation($"Email sent successfully to {toEmail}");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Email sending failed to {toEmail}");
                throw;
            }
        }

        public async Task SendVerificationEmailAsync(string toEmail, string userName, string verificationToken)
        {
            var appUrl = _configuration["AppUrl"] ?? "https://localhost:7142";
            var verificationLink = $"{appUrl}/api/user/verify-email?token={verificationToken}";
            var loginLink = $"{appUrl}/auth/login";

            var body = GetVerificationEmailTemplate(userName, verificationLink, loginLink);
            await SendEmailAsync(toEmail, "Verify Your Email - Ams Software", body);
        }

        public async Task SendWelcomeEmailAsync(string toEmail, string userName)
        {
            var appUrl = _configuration["AppUrl"] ?? "https://localhost:5142";
            var loginLink = $"{appUrl}/auth/login";

            var body = GetWelcomeEmailTemplate(userName, loginLink);
            await SendEmailAsync(toEmail, "Welcome to Ams Software!", body);
        }

        public async Task SendPasswordResetEmailAsync(string toEmail, string resetToken)
        {
            // IMPORTANT: Use the new PUBLIC endpoint instead of the old one
            var appUrl = _configuration["AppUrl"] ?? "https://localhost:3000";
            var resetLink = $"{appUrl}/reset-password/{resetToken}";

            // Also add a direct API link for testing
            var apiUrl = "http://localhost:5142/api/public/reset-password";

            var body = GetPasswordResetEmailTemplate(resetLink);
            await SendEmailAsync(toEmail, "Reset Your Password", body);
        }

        private string GetVerificationEmailTemplate(string userName, string verificationLink, string loginLink)
        {
            return $@"
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset='UTF-8'>
                <title>Verify Your Email</title>
                <style>
                    body {{ font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f7fa; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
                    .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                    .header h1 {{ margin: 0; font-size: 24px; }}
                    .content {{ padding: 30px; }}
                    .button {{ display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }}
                    .button:hover {{ transform: translateY(-2px); box-shadow: 0 5px 15px rgba(102,126,234,0.4); }}
                    .footer {{ text-align: center; padding: 20px; font-size: 12px; color: #666; border-top: 1px solid #eee; }}
                    .info-box {{ background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }}
                    .text-muted {{ color: #6c757d; font-size: 12px; }}
                </style>
            </head>
            <body>
                <div class='container'>
                    <div class='header'>
                        <h1>Verify Your Email</h1>
                    </div>
                    <div class='content'>
                        <h2>Hello {userName},</h2>
                        <p>Thank you for joining Ams Software! Please verify your email address to get started.</p>
                        <div style='text-align: center;'>
                            <a href='{verificationLink}' class='button'>Verify Email Address</a>
                        </div>
                        <p>Or copy and paste this link:</p>
                        <p><small>{verificationLink}</small></p>
                        <p class='text-muted'>This link will expire in 24 hours.</p>
                        <p>Already verified? <a href='{loginLink}'>Click here to login</a></p>
                    </div>
                    <div class='footer'>
                        <p>&copy; {DateTime.Now.Year} Ams Software. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>";
        }

        private string GetWelcomeEmailTemplate(string userName, string loginLink)
        {
            return $@"
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset='UTF-8'>
                <title>Welcome to Ams Software</title>
                <style>
                    body {{ font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f7fa; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
                    .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                    .header h1 {{ margin: 0; font-size: 24px; }}
                    .content {{ padding: 30px; }}
                    .button {{ display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }}
                    .footer {{ text-align: center; padding: 20px; font-size: 12px; color: #666; border-top: 1px solid #eee; }}
                </style>
            </head>
            <body>
                <div class='container'>
                    <div class='header'>
                        <h1>Welcome to Ams Software!</h1>
                    </div>
                    <div class='content'>
                        <h2>Hello {userName},</h2>
                        <p>Your account has been successfully created in Ams Software.</p>
                        <p>You can now log in to access all features:</p>
                        <div style='text-align: center;'>
                            <a href='{loginLink}' class='button'>Login to Your Account</a>
                        </div>
                        <p>If you have any questions, please contact our support team.</p>
                    </div>
                    <div class='footer'>
                        <p>&copy; {DateTime.Now.Year} Ams Software. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>";
        }

        private string GetPasswordResetEmailTemplate(string resetLink)
        {
            return $@"
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset='UTF-8'>
                <title>Reset Your Password</title>
                <style>
                    body {{ font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f7fa; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
                    .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                    .button {{ display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }}
                    .footer {{ text-align: center; padding: 20px; font-size: 12px; color: #666; border-top: 1px solid #eee; }}
                </style>
            </head>
            <body>
                <div class='container'>
                    <div class='header'>
                        <h1>Reset Your Password</h1>
                    </div>
                    <div class='content'>
                        <p>We received a request to reset your password. Click the button below to create a new password:</p>
                        <div style='text-align: center;'>
                            <a href='{resetLink}' class='button'>Reset Password</a>
                        </div>
                        <p>This link will expire in 10 minutes.</p>
                        <p>If you didn't request this, please ignore this email.</p>
                    </div>
                    <div class='footer'>
                        <p>&copy; {DateTime.Now.Year} Ams Software. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>";
        }

        private void LogEmailToFile(string toEmail, string subject, string body)
        {
            var logPath = Path.Combine(Directory.GetCurrentDirectory(), "EmailLogs");
            Directory.CreateDirectory(logPath);

            var fileName = $"email_{DateTime.Now:yyyyMMdd_HHmmss}_{Guid.NewGuid()}.html";
            var filePath = Path.Combine(logPath, fileName);

            File.WriteAllText(filePath, body);
            _logger.LogInformation($"Email logged to file: {filePath} (To: {toEmail}, Subject: {subject})");
        }
    }
}