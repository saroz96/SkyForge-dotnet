using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SkyForge.Data;
using SkyForge.Models.FiscalYearModel;

namespace SkyForge.Services
{
    public interface IBillPrefixService
    {
        Task<BillPrefixes> GenerateUniqueBillPrefixesAsync(Guid companyId);
        bool IsPrefixUnique(string prefix, Guid companyId);
        string GenerateRandomPrefix();
    }

    public class BillPrefixService : IBillPrefixService
    {
        private readonly ApplicationDbContext _context;
        private readonly Random _random = new Random();
        private static readonly object _lock = new object();

        public BillPrefixService(ApplicationDbContext context)
        {
            _context = context;
        }

        // Generate a random 4-character uppercase string
        public string GenerateRandomPrefix()
        {
            lock (_lock)
            {
                const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
                return new string(Enumerable.Repeat(chars, 4)
                    .Select(s => s[_random.Next(s.Length)])
                    .ToArray());
            }
        }

        // Check if a prefix is unique for a company
        public bool IsPrefixUnique(string prefix, Guid companyId)
        {
            // Check if this prefix already exists in any fiscal year for any company
            return !_context.FiscalYears
                .Where(f => f.CompanyId != companyId) // Exclude current company
                .Any(f => f.BillPrefixes.Sales == prefix ||
                         f.BillPrefixes.SalesQuotation == prefix ||
                         f.BillPrefixes.SalesReturn == prefix ||
                         f.BillPrefixes.Purchase == prefix ||
                         f.BillPrefixes.PurchaseReturn == prefix ||
                         f.BillPrefixes.Payment == prefix ||
                         f.BillPrefixes.Receipt == prefix ||
                         f.BillPrefixes.StockAdjustment == prefix ||
                         f.BillPrefixes.DebitNote == prefix ||
                         f.BillPrefixes.CreditNote == prefix ||
                         f.BillPrefixes.JournalVoucher == prefix);
        }

        // Generate unique prefixes for all bill types
        public async Task<BillPrefixes> GenerateUniqueBillPrefixesAsync(Guid companyId)
        {
            var prefixes = new BillPrefixes();
            var usedPrefixes = new HashSet<string>();

            // Generate unique prefix for each bill type
            prefixes.Sales = await GenerateUniquePrefixAsync(companyId, usedPrefixes);
            prefixes.SalesQuotation = await GenerateUniquePrefixAsync(companyId, usedPrefixes);
            prefixes.SalesReturn = await GenerateUniquePrefixAsync(companyId, usedPrefixes);
            prefixes.Purchase = await GenerateUniquePrefixAsync(companyId, usedPrefixes);
            prefixes.PurchaseReturn = await GenerateUniquePrefixAsync(companyId, usedPrefixes);
            prefixes.Payment = await GenerateUniquePrefixAsync(companyId, usedPrefixes);
            prefixes.Receipt = await GenerateUniquePrefixAsync(companyId, usedPrefixes);
            prefixes.StockAdjustment = await GenerateUniquePrefixAsync(companyId, usedPrefixes);
            prefixes.DebitNote = await GenerateUniquePrefixAsync(companyId, usedPrefixes);
            prefixes.CreditNote = await GenerateUniquePrefixAsync(companyId, usedPrefixes);
            prefixes.JournalVoucher = await GenerateUniquePrefixAsync(companyId, usedPrefixes);

            return prefixes;
        }

        private async Task<string> GenerateUniquePrefixAsync(Guid companyId, HashSet<string> usedPrefixes)
        {
            string prefix;
            int maxAttempts = 100; // Prevent infinite loop

            do
            {
                prefix = GenerateRandomPrefix();
                maxAttempts--;

                if (maxAttempts <= 0)
                {
                    throw new InvalidOperationException("Unable to generate unique bill prefix after multiple attempts");
                }

            } while (usedPrefixes.Contains(prefix) || !IsPrefixUnique(prefix, companyId));

            usedPrefixes.Add(prefix);
            return prefix;
        }
    }
}