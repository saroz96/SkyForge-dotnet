//namespace SkyForge.Services
//{
//    public class EmailService
//    {
//    }
//}

using System;
using System.Net;
using System.Net.Mail;
using System.Threading.Tasks;

namespace SkyForge.Services
{
    public interface IEmailService
    {
        Task SendEmailAsync(string toEmail, string subject, string body);
    }

    public class EmailService : IEmailService
    {
        private readonly IConfiguration _configuration;

        public EmailService(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public async Task SendEmailAsync(string toEmail, string subject, string body)
        {
            // For development, log email instead of sending
            if (_configuration.GetValue<bool>("EmailSettings:UseFileLog"))
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

                    var mailMessage = new MailMessage
                    {
                        From = new MailAddress(smtpSettings["FromEmail"], smtpSettings["FromName"]),
                        Subject = subject,
                        Body = body,
                        IsBodyHtml = true
                    };

                    mailMessage.To.Add(toEmail);

                    await client.SendMailAsync(mailMessage);
                }
            }
            catch (Exception ex)
            {
                // Log email sending error
                Console.Error.WriteLine($"Email sending failed: {ex.Message}");
                throw;
            }
        }

        private void LogEmailToFile(string toEmail, string subject, string body)
        {
            var logPath = Path.Combine(Directory.GetCurrentDirectory(), "EmailLogs");
            Directory.CreateDirectory(logPath);

            var fileName = $"email_{DateTime.Now:yyyyMMdd_HHmmss}_{Guid.NewGuid()}.html";
            var filePath = Path.Combine(logPath, fileName);

            var htmlContent = $@"
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Email Log: {subject}</title>
                    <style>
                        body {{ font-family: Arial, sans-serif; margin: 20px; }}
                        .header {{ background: #f0f0f0; padding: 10px; border-radius: 5px; }}
                        .content {{ margin-top: 20px; }}
                    </style>
                </head>
                <body>
                    <div class='header'>
                        <h3>To: {toEmail}</h3>
                        <h4>Subject: {subject}</h4>
                        <p>Sent: {DateTime.Now}</p>
                    </div>
                    <div class='content'>
                        {body}
                    </div>
                </body>
                </html>
            ";

            File.WriteAllText(filePath, htmlContent);
        }
    }
}
