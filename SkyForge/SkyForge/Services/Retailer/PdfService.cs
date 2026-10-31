using PuppeteerSharp;
using PuppeteerSharp.Media;
using System;
using System.Threading.Tasks;

namespace SkyForge.Services
{
    public interface IPdfService
    {
        Task<byte[]> GeneratePdfFromHtmlAsync(string htmlContent);
    }

    public class PdfService : IPdfService
    {
        public async Task<byte[]> GeneratePdfFromHtmlAsync(string htmlContent)
        {
            try
            {
                // 1. Download Chrome if not already installed (it caches it)
                var browserFetcher = new BrowserFetcher();
                await browserFetcher.DownloadAsync();

                // 2. Launch headless browser
                using var browser = await Puppeteer.LaunchAsync(new LaunchOptions
                {
                    Headless = true,
                    Args = new[] { "--no-sandbox", "--disable-setuid-sandbox" } // Needed for Linux/Docker servers
                });

                using var page = await browser.NewPageAsync();

                // 3. Set the HTML content
                await page.SetContentAsync(htmlContent);

                // 4. Generate the PDF
                var pdfBytes = await page.PdfDataAsync(new PdfOptions
                {
                    Format = PaperFormat.A4,
                    PrintBackground = true, // Ensures CSS colors/backgrounds show up
                    MarginOptions = new MarginOptions
                    {
                        Top = "10mm",
                        Bottom = "10mm",
                        Left = "10mm",
                        Right = "10mm"
                    }
                });

                return pdfBytes;
            }
            catch (Exception ex)
            {
                // Log the error so we know why it failed
                Console.WriteLine($"PDF Generation Error: {ex.Message}");
                return null; // Return null so the email can still send without the PDF
            }
        }
    }
}