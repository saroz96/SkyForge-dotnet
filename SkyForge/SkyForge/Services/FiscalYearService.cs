using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Models.FiscalYearModel;
using SkyForge.Models.Shared;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SkyForge.Services
{
    public interface IFiscalYearService
    {
        Task<FiscalYear> CreateFiscalYearAsync(FiscalYear fiscalYear);
        Task<FiscalYear> GetActiveFiscalYearAsync(Guid companyId);
        Task<List<FiscalYear>> GetCompanyFiscalYearsAsync(Guid companyId);
        Task<bool> ActivateFiscalYearAsync(Guid fiscalYearId, Guid companyId);
    }

    public class FiscalYearService : IFiscalYearService
    {
        private readonly ApplicationDbContext _context;
        private readonly Random _random;

        public FiscalYearService(ApplicationDbContext context)
        {
            _context = context;
            _random = new Random();
        }

        public async Task<FiscalYear> CreateFiscalYearAsync(FiscalYear fiscalYear)
        {
            // Check if fiscal year already exists
            var existingFiscalYear = await _context.FiscalYears
                .FirstOrDefaultAsync(f => f.CompanyId == fiscalYear.CompanyId && f.Name == fiscalYear.Name);

            if (existingFiscalYear != null)
            {
                return existingFiscalYear; // Return existing one
            }

            if (fiscalYear.DateFormat == DateFormatEnum.Nepali)
            {
                if (!fiscalYear.StartDate.HasValue)
                    fiscalYear.StartDate = DateTime.MinValue;
                if (!fiscalYear.EndDate.HasValue)
                    fiscalYear.EndDate = DateTime.MinValue;
            }

            // Generate bill prefixes if not provided
            if (fiscalYear.BillPrefixes == null)
                fiscalYear.BillPrefixes = new BillPrefixes();

            var generatedPrefixes = new HashSet<string>();

            // Define transaction types
            var transactionTypes = new Dictionary<string, Action<string>>
            {
                ["Sales"] = (prefix) => fiscalYear.BillPrefixes.Sales = prefix,
                ["SalesQuotation"] = (prefix) => fiscalYear.BillPrefixes.SalesQuotation = prefix,
                ["SalesReturn"] = (prefix) => fiscalYear.BillPrefixes.SalesReturn = prefix,
                ["Purchase"] = (prefix) => fiscalYear.BillPrefixes.Purchase = prefix,
                ["PurchaseReturn"] = (prefix) => fiscalYear.BillPrefixes.PurchaseReturn = prefix,
                ["Payment"] = (prefix) => fiscalYear.BillPrefixes.Payment = prefix,
                ["Receipt"] = (prefix) => fiscalYear.BillPrefixes.Receipt = prefix,
                ["StockAdjustment"] = (prefix) => fiscalYear.BillPrefixes.StockAdjustment = prefix,
                ["DebitNote"] = (prefix) => fiscalYear.BillPrefixes.DebitNote = prefix,
                ["CreditNote"] = (prefix) => fiscalYear.BillPrefixes.CreditNote = prefix,
                ["JournalVoucher"] = (prefix) => fiscalYear.BillPrefixes.JournalVoucher = prefix
            };

            // Generate unique prefixes
            foreach (var transactionType in transactionTypes)
            {
                var currentPrefix = GetTransactionPrefix(fiscalYear.BillPrefixes, transactionType.Key);
                if (string.IsNullOrEmpty(currentPrefix))
                {
                    string prefix;
                    do
                    {
                        prefix = GenerateRandomPrefix();
                    } while (generatedPrefixes.Contains(prefix));

                    transactionType.Value(prefix);
                    generatedPrefixes.Add(prefix);
                }
                else
                {
                    generatedPrefixes.Add(currentPrefix);
                }
            }

            // Generate new Guid if not provided
            if (fiscalYear.Id == Guid.Empty)
            {
                fiscalYear.Id = Guid.NewGuid();
            }

            // Set default dates if not provided
            if (fiscalYear.CreatedAt == default)
            {
                fiscalYear.CreatedAt = DateTime.UtcNow;
            }

            var existingFiscalYears = await _context.FiscalYears
                .CountAsync(f => f.CompanyId == fiscalYear.CompanyId);

            if (existingFiscalYears == 0)
                fiscalYear.IsActive = true;

            _context.FiscalYears.Add(fiscalYear);
            await _context.SaveChangesAsync();

            return fiscalYear;
        }

        public async Task<FiscalYear> GetActiveFiscalYearAsync(Guid companyId)
        {
            return await _context.FiscalYears
                .FirstOrDefaultAsync(f => f.CompanyId == companyId && f.IsActive);
        }

        public async Task<List<FiscalYear>> GetCompanyFiscalYearsAsync(Guid companyId)
        {
            return await _context.FiscalYears
                .Where(f => f.CompanyId == companyId)
                .OrderByDescending(f => f.StartDate)
                .ToListAsync();
        }

        public async Task<bool> ActivateFiscalYearAsync(Guid fiscalYearId, Guid companyId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                // Deactivate all other fiscal years for this company
                var fiscalYears = await _context.FiscalYears
                    .Where(f => f.CompanyId == companyId)
                    .ToListAsync();

                foreach (var fy in fiscalYears)
                {
                    fy.IsActive = (fy.Id == fiscalYearId);
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                return true;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        private string GetTransactionPrefix(BillPrefixes prefixes, string transactionType)
        {
            return transactionType switch
            {
                "Sales" => prefixes.Sales,
                "SalesQuotation" => prefixes.SalesQuotation,
                "SalesReturn" => prefixes.SalesReturn,
                "Purchase" => prefixes.Purchase,
                "PurchaseReturn" => prefixes.PurchaseReturn,
                "Payment" => prefixes.Payment,
                "Receipt" => prefixes.Receipt,
                "StockAdjustment" => prefixes.StockAdjustment,
                "DebitNote" => prefixes.DebitNote,
                "CreditNote" => prefixes.CreditNote,
                "JournalVoucher" => prefixes.JournalVoucher,
                _ => null
            };
        }

        private string GenerateRandomPrefix()
        {
            const string letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
            return new string(Enumerable.Range(0, 4)
                .Select(_ => letters[_random.Next(letters.Length)])
                .ToArray());
        }
    }
}
