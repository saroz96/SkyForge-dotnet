using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using SkyForge.Models.AccountGroupModel;
using SkyForge.Models.AccountModel;
using SkyForge.Models.CompanyModel;
using SkyForge.Models.FiscalYearModel;
using SkyForge.Models.RackModel;
using SkyForge.Models;
using SkyForge.Models.Retailer.BarcodeModel;
using SkyForge.Models.Retailer.CategoryModel;
using SkyForge.Models.Retailer.CompositionModel;
using SkyForge.Models.Retailer.CreditNoteModel;
using SkyForge.Models.Retailer.DebitNoteModel;
using SkyForge.Models.Retailer.ItemCompanyModel;
using SkyForge.Models.Retailer.Items;
using SkyForge.Models.Retailer.JournalVoucherModel;
using SkyForge.Models.Retailer.MainUnitModel;
using SkyForge.Models.Retailer.PaymentModel;
using SkyForge.Models.Retailer.Purchase;
using SkyForge.Models.Retailer.PurchaseReturnModel;
using SkyForge.Models.Retailer.ReceiptModel;
using SkyForge.Models.Retailer.Sales;
using SkyForge.Models.Retailer.SalesReturnModel;
using SkyForge.Models.Retailer.SettingsModel;
using SkyForge.Models.Retailer.StoreModel;
using SkyForge.Models.Retailer.TransactionModel;
using SkyForge.Models.RoleModel;
using SkyForge.Models.UnitModel;
using SkyForge.Models.UserModel;
using SkyForge.Models.Retailer.StockAdjustmentModel;
using System.Text.Json;
using SkyForge.Models.Retailer.SalesQuotationModel;

namespace SkyForge.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
        {
        }

        public DbSet<User> Users { get; set; }
        public DbSet<Company> Companies { get; set; }
        public DbSet<Settings> CompanySettings { get; set; }
        public DbSet<FiscalYear> FiscalYears { get; set; }
        public DbSet<Role> Roles { get; set; }
        public DbSet<UserRole> UserRoles { get; set; }
        public DbSet<Account> Accounts { get; set; }
        public DbSet<AccountGroup> AccountGroups { get; set; }
        public DbSet<OpeningBalanceByFiscalYear> OpeningBalanceByFiscalYear { get; set; }
        public DbSet<ClosingBalanceByFiscalYear> ClosingBalanceByFiscalYear { get; set; }
        public DbSet<InitialOpeningBalance> InitialOpeningBalances { get; set; }
        public DbSet<OpeningBalance> OpeningBalances { get; set; }
        public DbSet<Category> Categories { get; set; } = null!;
        public DbSet<ItemCompany> ItemCompanies { get; set; } = null!;
        public DbSet<MainUnit> MainUnits { get; set; } = null!;
        public DbSet<Unit> Units { get; set; } = null!;
        public DbSet<Store> Stores { get; set; } = null!;
        public DbSet<Rack> Racks { get; set; } = null!;
        public DbSet<SalesBill> SalesBills { get; set; }
        public DbSet<SalesBillItem> SalesBillItems { get; set; }

        public DbSet<SalesQuotation> SalesQuotations { get; set; }
        public DbSet<SalesQuotationItem> SalesQuotationItems { get; set; }
        public DbSet<Item> Items { get; set; }
        public DbSet<StockEntry> StockEntries { get; set; }
        public DbSet<PurchaseBill> PurchaseBills { get; set; }
        public DbSet<PurchaseBillItem> PurchaseBillItems { get; set; }
        public DbSet<Composition> Compositions { get; set; }
        public DbSet<SalesReturn> SalesReturns { get; set; }
        public DbSet<SalesReturnItem> SalesReturnItems { get; set; }
        public DbSet<PurchaseReturn> PurchaseReturns { get; set; }
        public DbSet<PurchaseReturnItem> PurchaseReturnItems { get; set; }
        public DbSet<ItemComposition> ItemCompositions { get; set; }
        public DbSet<JournalVoucher> JournalVouchers { get; set; }
        public DbSet<Transaction> Transactions { get; set; }

        public DbSet<DebitNote> DebitNotes { get; set; }
        public DbSet<DebitNoteDebitEntry> DebitNoteDebitEntries { get; set; }
        public DbSet<DebitNoteCreditEntry> DebitNoteCreditEntries { get; set; }


        public DbSet<CreditNote> CreditNotes { get; set; }
        public DbSet<CreditNoteDebitEntry> CreditNoteDebitEntries { get; set; }
        public DbSet<CreditNoteCreditEntry> CreditNoteCreditEntries { get; set; }

        public DbSet<StockAdjustment> StockAdjustments { get; set; }
        public DbSet<StockAdjustmentItem> StockAdjustmentItems { get; set; }


        public DbSet<Payment> Payments { get; set; }
        public DbSet<Receipt> Receipts { get; set; }

        public DbSet<BarcodePreference> BarcodePreferences { get; set; }
        public DbSet<BillCounter> BillCounters { get; set; } = null!;


        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Create value comparers for JSON columns
            var listStringComparer = new ValueComparer<List<string>>(
                (c1, c2) => c1 != null && c2 != null && c1.SequenceEqual(c2),
                c => c == null ? 0 : c.Aggregate(0, (a, v) => HashCode.Combine(a, v == null ? 0 : v.GetHashCode())),
                c => c == null ? new List<string>() : c.ToList());

            var dictionaryStringBoolComparer = new ValueComparer<Dictionary<string, bool>>(
                (c1, c2) =>
                    c1 != null && c2 != null && c1.Count == c2.Count &&
                    c1.All(kvp => c2.ContainsKey(kvp.Key) && c2[kvp.Key] == kvp.Value),
                c => c != null ? c.Aggregate(0, (a, v) => HashCode.Combine(a, v.Key.GetHashCode(), v.Value.GetHashCode())) : 0,
                c => c != null ? c.ToDictionary(kvp => kvp.Key, kvp => kvp.Value) : new Dictionary<string, bool>());

            var stringComparer = new ValueComparer<string>(
                (c1, c2) => c1 == c2,
                c => c != null ? c.GetHashCode() : 0,
                c => c);

            // Configure BillCounter unique constraint
            modelBuilder.Entity<BillCounter>()
                .HasIndex(bc => new { bc.CompanyId, bc.FiscalYearId, bc.TransactionType })
                .IsUnique();

            // Receipt configuration
            modelBuilder.Entity<Receipt>(entity =>
            {
                // Unique constraint
                entity.HasIndex(r => new { r.BillNumber, r.CompanyId, r.FiscalYearId })
                      .IsUnique();

                // Enum conversions
                entity.Property(r => r.InstType)
                      .HasConversion<string>()
                      .HasMaxLength(20);

                entity.Property(r => r.Status)
                      .HasConversion<string>()
                      .HasMaxLength(20);

                // Relationships
                entity.HasOne(r => r.Account)
                      .WithMany()
                      .HasForeignKey(r => r.AccountId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(r => r.ReceiptAccount)
                      .WithMany()
                      .HasForeignKey(r => r.ReceiptAccountId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(r => r.User)
                      .WithMany()
                      .HasForeignKey(r => r.UserId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(r => r.AccountGroup)
                      .WithMany()
                      .HasForeignKey(r => r.AccountGroupId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(r => r.Company)
                      .WithMany()
                      .HasForeignKey(r => r.CompanyId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(r => r.FiscalYear)
                      .WithMany()
                      .HasForeignKey(r => r.FiscalYearId)
                      .OnDelete(DeleteBehavior.Restrict);

                // Property configurations
                entity.Property(r => r.BillNumber)
                      .HasMaxLength(50)
                      .IsRequired();

                entity.Property(r => r.BankAcc)
                      .HasMaxLength(100);

                entity.Property(r => r.InstNo)
                      .HasMaxLength(100);

                entity.Property(r => r.Description)
                      .HasMaxLength(500);

                // Decimal precision
                entity.Property(r => r.Debit)
                      .HasPrecision(18, 2);

                entity.Property(r => r.Credit)
                      .HasPrecision(18, 2);

                // Indexes for performance
                entity.HasIndex(r => r.Date);
                entity.HasIndex(r => r.BillDate);
                entity.HasIndex(r => r.AccountId);
                entity.HasIndex(r => r.ReceiptAccountId);
                entity.HasIndex(r => r.InstType);
                entity.HasIndex(r => r.Status);
                entity.HasIndex(r => r.IsActive);
                entity.HasIndex(r => r.AccountGroupId);
                entity.HasIndex(r => r.BankAcc);
                entity.HasIndex(r => r.InstNo);
                entity.HasIndex(r => new { r.CompanyId, r.FiscalYearId, r.Date });
                entity.HasIndex(r => new { r.CompanyId, r.Status, r.IsActive });
                entity.HasIndex(r => new { r.InstType, r.Status });
            });


            // Payment configuration
            modelBuilder.Entity<Payment>(entity =>
            {
                // Unique constraint
                entity.HasIndex(p => new { p.BillNumber, p.CompanyId, p.FiscalYearId })
                      .IsUnique();

                // Enum conversions
                entity.Property(p => p.InstType)
                      .HasConversion<string>()
                      .HasMaxLength(20);

                entity.Property(p => p.Status)
                      .HasConversion<string>()
                      .HasMaxLength(20);

                // Relationships
                entity.HasOne(p => p.FiscalYear)
                      .WithMany()
                      .HasForeignKey(p => p.FiscalYearId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(p => p.Account)
                      .WithMany()
                      .HasForeignKey(p => p.AccountId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(p => p.PaymentAccount)
                      .WithMany()
                      .HasForeignKey(p => p.PaymentAccountId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(p => p.User)
                      .WithMany()
                      .HasForeignKey(p => p.UserId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(p => p.AccountGroup)
                      .WithMany()
                      .HasForeignKey(p => p.AccountGroupId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(p => p.Company)
                      .WithMany()
                      .HasForeignKey(p => p.CompanyId)
                      .OnDelete(DeleteBehavior.Restrict);

                // Property configurations
                entity.Property(p => p.BillNumber)
                      .HasMaxLength(50)
                      .IsRequired();

                entity.Property(p => p.InstNo)
                      .HasMaxLength(100);

                entity.Property(p => p.Description)
                      .HasMaxLength(500);

                // Decimal precision
                entity.Property(p => p.Debit)
                      .HasPrecision(18, 2);

                entity.Property(p => p.Credit)
                      .HasPrecision(18, 2);

                // Indexes for performance
                entity.HasIndex(p => p.Date);
                entity.HasIndex(p => p.BillDate);
                entity.HasIndex(p => p.AccountId);
                entity.HasIndex(p => p.PaymentAccountId);
                entity.HasIndex(p => p.InstType);
                entity.HasIndex(p => p.Status);
                entity.HasIndex(p => p.IsActive);
                entity.HasIndex(p => p.AccountGroupId);
                entity.HasIndex(p => new { p.CompanyId, p.FiscalYearId, p.Date });
                entity.HasIndex(p => new { p.CompanyId, p.Status, p.IsActive });
            });

            // Credit Note configuration
            modelBuilder.Entity<CreditNote>(entity =>
            {
                entity.HasIndex(cn => new { cn.BillNumber, cn.CompanyId, cn.FiscalYearId })
                      .IsUnique();

                entity.Property(cn => cn.Status)
                      .HasConversion<string>()
                      .HasMaxLength(20);

                // Relationships
                entity.HasOne(cn => cn.User)
                      .WithMany()
                      .HasForeignKey(cn => cn.UserId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(cn => cn.Company)
                      .WithMany()
                      .HasForeignKey(cn => cn.CompanyId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(cn => cn.FiscalYear)
                      .WithMany()
                      .HasForeignKey(cn => cn.FiscalYearId)
                      .OnDelete(DeleteBehavior.Restrict);

                // Properties
                entity.Property(cn => cn.BillNumber)
                      .HasMaxLength(50);

                entity.Property(cn => cn.Description)
                      .HasMaxLength(500);

                // Indexes for performance
                entity.HasIndex(cn => cn.Date);
                entity.HasIndex(cn => cn.Status);
                entity.HasIndex(cn => cn.IsActive);
                entity.HasIndex(cn => new { cn.CompanyId, cn.FiscalYearId, cn.Date });
            });

            // Credit Note Debit Entry configuration
            modelBuilder.Entity<CreditNoteDebitEntry>(entity =>
            {
                entity.HasOne(cde => cde.CreditNote)
                      .WithMany(cn => cn.DebitAccounts)
                      .HasForeignKey(cde => cde.CreditNoteId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(cde => cde.Account)
                      .WithMany()
                      .HasForeignKey(cde => cde.AccountId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.Property(cde => cde.Debit)
                      .HasPrecision(18, 2);

                entity.HasIndex(cde => cde.AccountId);
                entity.HasIndex(cde => cde.CreditNoteId);
            });

            // Credit Note Credit Entry configuration
            modelBuilder.Entity<CreditNoteCreditEntry>(entity =>
            {
                entity.HasOne(cce => cce.CreditNote)
                      .WithMany(cn => cn.CreditAccounts)
                      .HasForeignKey(cce => cce.CreditNoteId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(cce => cce.Account)
                      .WithMany()
                      .HasForeignKey(cce => cce.AccountId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.Property(cce => cce.Credit)
                      .HasPrecision(18, 2);

                entity.HasIndex(cce => cce.AccountId);
                entity.HasIndex(cce => cce.CreditNoteId);
            });


            // Debit Note configuration
            modelBuilder.Entity<DebitNote>(entity =>
            {
                entity.HasIndex(dn => new { dn.BillNumber, dn.CompanyId, dn.FiscalYearId })
                      .IsUnique();

                entity.Property(dn => dn.Status)
                      .HasConversion<string>()
                      .HasMaxLength(20);

                // Relationships
                entity.HasOne(dn => dn.User)
                      .WithMany()
                      .HasForeignKey(dn => dn.UserId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(dn => dn.Company)
                      .WithMany()
                      .HasForeignKey(dn => dn.CompanyId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(dn => dn.FiscalYear)
                      .WithMany()
                      .HasForeignKey(dn => dn.FiscalYearId)
                      .OnDelete(DeleteBehavior.Restrict);

                // Properties
                entity.Property(dn => dn.BillNumber)
                      .HasMaxLength(50);

                entity.Property(dn => dn.Description)
                      .HasMaxLength(500);

                // Indexes for performance
                entity.HasIndex(dn => dn.Date);
                entity.HasIndex(dn => dn.Status);
                entity.HasIndex(dn => dn.IsActive);
                entity.HasIndex(dn => new { dn.CompanyId, dn.FiscalYearId, dn.Date });
            });

            // Debit Note Debit Entry configuration
            modelBuilder.Entity<DebitNoteDebitEntry>(entity =>
            {
                entity.HasOne(dde => dde.DebitNote)
                      .WithMany(dn => dn.DebitAccounts)
                      .HasForeignKey(dde => dde.DebitNoteId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(dde => dde.Account)
                      .WithMany()
                      .HasForeignKey(dde => dde.AccountId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.Property(dde => dde.Debit)
                      .HasPrecision(18, 2);

                entity.HasIndex(dde => dde.AccountId);
                entity.HasIndex(dde => dde.DebitNoteId);
            });

            // Debit Note Credit Entry configuration
            modelBuilder.Entity<DebitNoteCreditEntry>(entity =>
            {
                entity.HasOne(dce => dce.DebitNote)
                      .WithMany(dn => dn.CreditAccounts)
                      .HasForeignKey(dce => dce.DebitNoteId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(dce => dce.Account)
                      .WithMany()
                      .HasForeignKey(dce => dce.AccountId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.Property(dce => dce.Credit)
                      .HasPrecision(18, 2);

                entity.HasIndex(dce => dce.AccountId);
                entity.HasIndex(dce => dce.DebitNoteId);
            });

            // Unique constraint for SalesQuotation
            modelBuilder.Entity<SalesQuotation>()
                .HasIndex(sq => new { sq.Date, sq.BillNumber, sq.CompanyId, sq.FiscalYearId })
                .IsUnique()
                .HasDatabaseName("IX_SalesQuotation_Date_BillNumber_Company_FiscalYear");

            // Transaction configuration
            modelBuilder.Entity<Transaction>(entity =>
            {
                // Primary Key
                entity.HasKey(t => t.Id);

                // Company relationship
                entity.HasOne(t => t.Company)
                      .WithMany()
                      .HasForeignKey(t => t.CompanyId)
                      .OnDelete(DeleteBehavior.Restrict);

                // Item references
                entity.HasOne(t => t.Item)
                      .WithMany()
                      .HasForeignKey(t => t.ItemId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(t => t.Unit)
                      .WithMany()
                      .HasForeignKey(t => t.UnitId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(t => t.MainUnit)
                      .WithMany()
                      .HasForeignKey(t => t.MainUnitId)
                      .OnDelete(DeleteBehavior.Restrict);

                // Account references
                entity.HasOne(t => t.Account)
                      .WithMany()
                      .HasForeignKey(t => t.AccountId)
                      .OnDelete(DeleteBehavior.Restrict);

                // Bill references - each can be null
                entity.HasOne(t => t.SalesBill)
                      .WithMany()
                      .HasForeignKey(t => t.BillId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(t => t.PurchaseBill)
                      .WithMany()
                      .HasForeignKey(t => t.PurchaseBillId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(t => t.PurchaseReturn)
                      .WithMany()
                      .HasForeignKey(t => t.PurchaseReturnBillId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(t => t.JournalVoucher)
                      .WithMany()
                      .HasForeignKey(t => t.JournalBillId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(t => t.DebitNote)
                      .WithMany()
                      .HasForeignKey(t => t.DebitNoteId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(t => t.CreditNote)
                      .WithMany()
                      .HasForeignKey(t => t.CreditNoteId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(t => t.SalesReturn)
                      .WithMany()
                      .HasForeignKey(t => t.SalesReturnBillId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(t => t.Payment)
                      .WithMany()
                      .HasForeignKey(t => t.PaymentAccountId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(t => t.Receipt)
                      .WithMany()
                      .HasForeignKey(t => t.ReceiptAccountId)
                      .OnDelete(DeleteBehavior.Restrict);

                // Account type references
                entity.HasOne(t => t.AccountType)
                      .WithMany()
                      .HasForeignKey(t => t.AccountTypeId)
                      .OnDelete(DeleteBehavior.Restrict);

                // Account references for payment modes
                entity.HasOne(t => t.PaymentAccount)
                      .WithMany()
                      .HasForeignKey(t => t.PaymentAccountId2)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(t => t.ReceiptAccount)
                      .WithMany()
                      .HasForeignKey(t => t.ReceiptAccountId2)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(t => t.DebitAccount)
                      .WithMany()
                      .HasForeignKey(t => t.DebitAccountId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(t => t.CreditAccount)
                      .WithMany()
                      .HasForeignKey(t => t.CreditAccountId)
                      .OnDelete(DeleteBehavior.Restrict);

                // Fiscal Year relationship
                entity.HasOne(t => t.FiscalYear)
                      .WithMany()
                      .HasForeignKey(t => t.FiscalYearId)
                      .OnDelete(DeleteBehavior.Restrict);

                // Enum conversions to string
                entity.Property(t => t.Type)
                      .HasConversion<string>()
                      .HasMaxLength(50);

                entity.Property(t => t.IsType)
                      .HasConversion<string>()
                      .HasMaxLength(50);

                entity.Property(t => t.PaymentMode)
                      .HasConversion<string>()
                      .HasMaxLength(50);

                entity.Property(t => t.InstType)
                      .HasConversion<string>()
                      .HasMaxLength(50);

                entity.Property(t => t.Status)
                      .HasConversion<string>()
                      .HasMaxLength(20);

                // Column configurations
                entity.Property(t => t.BillNumber)
                      .HasMaxLength(100);

                entity.Property(t => t.PartyBillNumber)
                      .HasMaxLength(100);

                entity.Property(t => t.SalesBillNumber)
                      .HasMaxLength(100);

                entity.Property(t => t.PurchaseSalesType)
                      .HasMaxLength(50);

                entity.Property(t => t.PurchaseSalesReturnType)
                      .HasMaxLength(50);

                entity.Property(t => t.JournalAccountType)
                      .HasMaxLength(50);

                entity.Property(t => t.JournalAccountDrCrType)
                      .HasMaxLength(10);

                entity.Property(t => t.DrCrNoteAccountType)
                      .HasMaxLength(50);

                entity.Property(t => t.DrCrNoteAccountTypes)
                      .HasMaxLength(50);

                entity.Property(t => t.BankAcc)
                      .HasMaxLength(100);

                entity.Property(t => t.InstNo)
                      .HasMaxLength(100);

                // Decimal precision configurations
                entity.Property(t => t.Price)
                      .HasPrecision(18, 2);

                entity.Property(t => t.NetPrice)
                      .HasPrecision(18, 2);

                entity.Property(t => t.PuPrice)
                      .HasPrecision(18, 2);

                entity.Property(t => t.DiscountPercentagePerItem)
                      .HasPrecision(18, 2);

                entity.Property(t => t.DiscountAmountPerItem)
                      .HasPrecision(18, 2);

                entity.Property(t => t.NetPuPrice)
                      .HasPrecision(18, 2);

                entity.Property(t => t.Debit)
                      .HasPrecision(18, 2);

                entity.Property(t => t.Credit)
                      .HasPrecision(18, 2);

                entity.Property(t => t.Balance)
                      .HasPrecision(18, 2);

                entity.Property(t => t.Quantity)
                      .HasPrecision(18, 4); // Higher precision for quantities

                entity.Property(t => t.Bonus)
                      .HasPrecision(18, 4); // Higher precision for bonuses

                // Indexes for better query performance
                entity.HasIndex(t => new { t.CompanyId, t.FiscalYearId, t.Date });
                entity.HasIndex(t => t.AccountId);
                entity.HasIndex(t => t.ItemId);
                entity.HasIndex(t => t.BillNumber);
                entity.HasIndex(t => t.Type);
                entity.HasIndex(t => t.Status);
                entity.HasIndex(t => t.IsActive);
            });

            // Journal Voucher configuration
            modelBuilder.Entity<JournalVoucher>(entity =>
            {
                entity.HasIndex(jv => new { jv.BillNumber, jv.CompanyId, jv.FiscalYearId })
                      .IsUnique();

                entity.Property(jv => jv.Status)
                      .HasConversion<string>()
                      .HasMaxLength(20);

                // Relationships
                entity.HasOne(jv => jv.User)
                      .WithMany()
                      .HasForeignKey(jv => jv.UserId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(jv => jv.Company)
                      .WithMany()
                      .HasForeignKey(jv => jv.CompanyId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(jv => jv.FiscalYear)
                      .WithMany()
                      .HasForeignKey(jv => jv.FiscalYearId)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            // Configure User entity
            modelBuilder.Entity<User>(entity =>
            {
                entity.HasIndex(e => e.Email).IsUnique();
                entity.Property(e => e.Email).IsRequired().HasMaxLength(100);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(200);

                // Configure MenuPermissions JSON with value comparer
                entity.Property(e => e.MenuPermissions)
                    .HasDefaultValueSql("'{}'::jsonb")
                    .HasConversion(
                        v => JsonSerializer.Serialize(v, (JsonSerializerOptions)null),
                        v => JsonSerializer.Deserialize<Dictionary<string, bool>>(v, (JsonSerializerOptions)null) ?? new Dictionary<string, bool>())
                    .Metadata.SetValueComparer(dictionaryStringBoolComparer);

                // Configure self-referencing relationship (GrantedBy)
                entity.HasOne(u => u.GrantedBy)
                    .WithMany()
                    .HasForeignKey(u => u.GrantedById)
                    .OnDelete(DeleteBehavior.Restrict);

                // Configure complex types
                entity.OwnsOne(u => u.Preferences);
                entity.OwnsOne(u => u.AttendanceSettings, attendance =>
                {
                    attendance.OwnsOne(a => a.LastKnownLocation);
                });
            });

            modelBuilder.Entity<Role>(entity =>
            {
                entity.HasIndex(e => e.Name).IsUnique();
                entity.Property(e => e.Name).IsRequired().HasMaxLength(50);

                // Default permissions JSON
                entity.Property(e => e.DefaultPermissions)
                    .HasConversion(
                        v => JsonSerializer.Serialize(v, (JsonSerializerOptions)null),
                        v => JsonSerializer.Deserialize<Dictionary<string, bool>>(v, (JsonSerializerOptions)null) ?? new Dictionary<string, bool>())
                    .HasColumnType("jsonb")
                    .Metadata.SetValueComparer(dictionaryStringBoolComparer);
            });

            // Configure UserRole entity (junction table)
            modelBuilder.Entity<UserRole>(entity =>
            {
                // Relationship with User
                entity.HasOne(ur => ur.User)
                    .WithMany(u => u.UserRoles)
                    .HasForeignKey(ur => ur.UserId)
                    .OnDelete(DeleteBehavior.Cascade);

                // Relationship with Role
                entity.HasOne(ur => ur.Role)
                    .WithMany(r => r.UserRoles)
                    .HasForeignKey(ur => ur.RoleId)
                    .OnDelete(DeleteBehavior.Restrict);

                // AssignedBy relationship
                entity.HasOne(ur => ur.AssignedBy)
                    .WithMany()
                    .HasForeignKey(ur => ur.AssignedById)
                    .OnDelete(DeleteBehavior.SetNull);

                // Unique constraint: one primary role per user
                entity.HasIndex(ur => new { ur.UserId, ur.IsPrimary })
                    .HasFilter("\"IsPrimary\" = true")
                    .IsUnique();

                // Custom permissions JSON
                entity.Property(ur => ur.CustomPermissions)
                    .HasConversion(
                        v => v != null ? JsonSerializer.Serialize(v, (JsonSerializerOptions)null) : null,
                        v => v != null ? JsonSerializer.Deserialize<Dictionary<string, bool>>(v, (JsonSerializerOptions)null) : null)
                    .HasColumnType("jsonb")
                    .Metadata.SetValueComparer(dictionaryStringBoolComparer);
            });

            // Configure Company entity
            modelBuilder.Entity<Company>(entity =>
                    {
                        entity.HasIndex(e => e.Name).IsUnique();
                        entity.Property(e => e.Name).IsRequired().HasMaxLength(200);

                        // Owner relationship
                        entity.HasOne(c => c.Owner)
                            .WithMany(u => u.OwnedCompanies)
                            .HasForeignKey(c => c.OwnerId)
                            .OnDelete(DeleteBehavior.Restrict);

                        // Many-to-many with Users (AccessibleCompanies)
                        entity.HasMany(c => c.Users)
                            .WithMany(u => u.AccessibleCompanies)
                            .UsingEntity<Dictionary<string, object>>(
                                "CompanyUsers",
                                j => j.HasOne<User>().WithMany().HasForeignKey("UserId"),
                                j => j.HasOne<Company>().WithMany().HasForeignKey("CompanyId"),
                                j =>
                                {
                                    j.HasKey("UserId", "CompanyId");
                                    j.ToTable("CompanyUsers");
                                });

                        // One-to-many with FiscalYears
                        entity.HasMany(c => c.FiscalYears)
                            .WithOne(f => f.Company)
                            .HasForeignKey(f => f.CompanyId)
                            .OnDelete(DeleteBehavior.Cascade);

                        // NotificationEmails JSON array with value comparer
                        entity.Property(e => e.NotificationEmails)
                            .HasDefaultValueSql("'[]'::jsonb")
                            .HasConversion(
                                v => JsonSerializer.Serialize(v, (JsonSerializerOptions)null),
                                v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions)null) ?? new List<string>())
                            .Metadata.SetValueComparer(listStringComparer);

                        // Complex type configurations
                        entity.OwnsOne(c => c.AttendanceSettings, attendance =>
                        {
                            attendance.OwnsMany(a => a.OfficeLocations, location =>
                            {
                                location.OwnsOne(l => l.Coordinates);
                            });
                            attendance.OwnsOne(a => a.WorkingHours);
                            attendance.OwnsOne(a => a.AutoClockOut);
                        });
                    });

            // Configure FiscalYear entity
            modelBuilder.Entity<FiscalYear>(entity =>
            {
                entity.HasIndex(e => new { e.Name, e.CompanyId }).IsUnique();
                entity.Property(e => e.Name).IsRequired().HasMaxLength(100);

                // Company relationship
                entity.HasOne(f => f.Company)
                    .WithMany(c => c.FiscalYears)
                    .HasForeignKey(f => f.CompanyId)
                    .OnDelete(DeleteBehavior.Cascade);

                // Complex type for BillPrefixes
                entity.OwnsOne(f => f.BillPrefixes, prefixes =>
                {
                    prefixes.Property(p => p.Sales)
                        .HasMaxLength(4)
                        .IsRequired(false);
                    prefixes.Property(p => p.SalesQuotation)
                        .HasMaxLength(4)
                        .IsRequired(false);
                    prefixes.Property(p => p.SalesReturn)
                        .HasMaxLength(4)
                        .IsRequired(false);
                    prefixes.Property(p => p.Purchase)
                        .HasMaxLength(4)
                        .IsRequired(false);
                    prefixes.Property(p => p.PurchaseReturn)
                        .HasMaxLength(4)
                        .IsRequired(false);
                    prefixes.Property(p => p.Payment)
                        .HasMaxLength(4)
                        .IsRequired(false);
                    prefixes.Property(p => p.Receipt)
                        .HasMaxLength(4)
                        .IsRequired(false);
                    prefixes.Property(p => p.StockAdjustment)
                        .HasMaxLength(4)
                        .IsRequired(false);
                    prefixes.Property(p => p.DebitNote)
                        .HasMaxLength(4)
                        .IsRequired(false);
                    prefixes.Property(p => p.CreditNote)
                        .HasMaxLength(4)
                        .IsRequired(false);
                    prefixes.Property(p => p.JournalVoucher)
                        .HasMaxLength(4)
                        .IsRequired(false);
                });

                // Index for active fiscal years
                entity.HasIndex(f => f.IsActive);
            });

            // Configure Settings entity
            modelBuilder.Entity<Settings>(entity =>
            {
                // Ensure one-to-one relationship with Company
                entity.HasIndex(e => e.CompanyId).IsUnique();

                // Company relationship
                entity.HasOne(s => s.Company)
                    .WithOne(c => c.Settings)
                    .HasForeignKey<Settings>(s => s.CompanyId)
                    .OnDelete(DeleteBehavior.Cascade);

                // User relationship
                entity.HasOne(s => s.User)
                    .WithMany()
                    .HasForeignKey(s => s.UserId)
                    .OnDelete(DeleteBehavior.Restrict);

                // FiscalYear relationship
                entity.HasOne(s => s.FiscalYear)
                    .WithMany()
                    .HasForeignKey(s => s.FiscalYearId)
                    .OnDelete(DeleteBehavior.SetNull);

                // Unique constraint for company, user, and fiscal year
                entity.HasIndex(s => new { s.CompanyId, s.UserId, s.FiscalYearId })
                      .IsUnique();

                // Value JSON column with value comparer
                entity.Property(s => s.Value)
                    .HasColumnType("jsonb")
                    .Metadata.SetValueComparer(stringComparer);
            });
            // AccountGroup configuration
            modelBuilder.Entity<AccountGroup>(entity =>
            {
                entity.HasIndex(e => new { e.Name, e.CompanyId })
                      .IsUnique();

                entity.HasOne(e => e.Company)
                      .WithMany(c => c.AccountGroups)
                      .HasForeignKey(e => e.CompanyId)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            // Account configuration
            modelBuilder.Entity<Account>(entity =>
            {
                // Unique index for name + company + fiscalYear (via junction)
                entity.HasIndex(e => new { e.Name, e.CompanyId })
                      .IsUnique();

                // Generate unique 4-digit number
                entity.HasIndex(e => e.UniqueNumber)
                      .IsUnique();

                // Relationships
                entity.HasOne(e => e.AccountGroup)
                      .WithMany(g => g.Accounts)
                      .HasForeignKey(e => e.AccountGroupsId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.OriginalFiscalYear)
                      .WithMany()
                      .HasForeignKey(e => e.OriginalFiscalYearId)
                      .OnDelete(DeleteBehavior.Restrict);

                // Opening balance relationship
                entity.HasOne(e => e.OpeningBalance)
                      .WithOne(o => o.Account)
                      .HasForeignKey<OpeningBalance>(o => o.AccountId);

                // Initial opening balance relationship
                entity.HasOne(e => e.InitialOpeningBalance)
                      .WithOne(i => i.Account)
                      .HasForeignKey<InitialOpeningBalance>(i => i.AccountId);
            });

            // OpeningBalanceByFiscalYear configuration
            modelBuilder.Entity<OpeningBalanceByFiscalYear>(entity =>
            {
                entity.HasOne(e => e.Account)
                      .WithMany(a => a.OpeningBalanceByFiscalYear)
                      .HasForeignKey(e => e.AccountId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.FiscalYear)
                      .WithMany()
                      .HasForeignKey(e => e.FiscalYearId)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            // ClosingBalanceByFiscalYear configuration
            modelBuilder.Entity<ClosingBalanceByFiscalYear>(entity =>
            {
                entity.HasOne(e => e.Account)
                      .WithMany(a => a.ClosingBalanceByFiscalYear)
                      .HasForeignKey(e => e.AccountId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.FiscalYear)
                      .WithMany()
                      .HasForeignKey(e => e.FiscalYearId)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<Category>(entity =>
            {
                entity.HasIndex(e => new { e.Name, e.CompanyId })
                      .IsUnique();

                entity.HasOne(e => e.Company)
                      .WithMany()
                      .HasForeignKey(e => e.CompanyId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.Property(e => e.CreatedAt)
                      .HasDefaultValueSql("timezone('utc', now())");
            });

            // ItemCompany configuration
            modelBuilder.Entity<ItemCompany>(entity =>
            {
                entity.HasIndex(e => new { e.Name, e.CompanyId })
                      .IsUnique();

                entity.HasOne(e => e.Company)
                      .WithMany()
                      .HasForeignKey(e => e.CompanyId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.Property(e => e.CreatedAt)
                      .HasDefaultValueSql("timezone('utc', now())");
            });

            // MainUnit configuration
            modelBuilder.Entity<MainUnit>(entity =>
            {
                entity.HasIndex(e => new { e.Name, e.CompanyId })
                      .IsUnique();

                entity.HasOne(e => e.Company)
                      .WithMany()
                      .HasForeignKey(e => e.CompanyId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.Property(e => e.CreatedAt)
                      .HasDefaultValueSql("timezone('utc', now())");
            });

            // Unit configuration
            modelBuilder.Entity<Unit>(entity =>
            {
                entity.HasIndex(e => new { e.Name, e.CompanyId })
                      .IsUnique();

                entity.HasOne(e => e.Company)
                      .WithMany()
                      .HasForeignKey(e => e.CompanyId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.Property(e => e.CreatedAt)
                      .HasDefaultValueSql("timezone('utc', now())");
            });

            // Store configuration
            modelBuilder.Entity<Store>(entity =>
            {
                // Unique index for store name within company
                entity.HasIndex(e => new { e.Name, e.CompanyId })
                      .IsUnique();

                // Relationship with Company
                entity.HasOne(e => e.Company)
                      .WithMany()
                      .HasForeignKey(e => e.CompanyId)
                      .OnDelete(DeleteBehavior.Restrict);

                // Relationship with Racks (one-to-many)
                entity.HasMany(e => e.Racks)
                      .WithOne(r => r.Store)
                      .HasForeignKey(r => r.StoreId)
                      .OnDelete(DeleteBehavior.Cascade);

                // Default values
                entity.Property(e => e.CreatedAt)
                      .HasDefaultValueSql("timezone('utc', now())");

                entity.Property(e => e.IsActive)
                      .HasDefaultValue(true);
            });

            // Rack configuration
            modelBuilder.Entity<Rack>(entity =>
            {
                // Unique index for rack name within company
                entity.HasIndex(e => new { e.Name, e.CompanyId })
                      .IsUnique();

                // Relationship with Store
                entity.HasOne(e => e.Store)
                      .WithMany(s => s.Racks)
                      .HasForeignKey(e => e.StoreId)
                      .OnDelete(DeleteBehavior.Restrict);

                // Relationship with Company
                entity.HasOne(e => e.Company)
                      .WithMany()
                      .HasForeignKey(e => e.CompanyId)
                      .OnDelete(DeleteBehavior.Restrict);

                // Default values
                entity.Property(e => e.CreatedAt)
                      .HasDefaultValueSql("timezone('utc', now())");

                entity.Property(e => e.IsActive)
                      .HasDefaultValue(true);
            });

            // Configure SalesBill
            modelBuilder.Entity<SalesBill>(entity =>
            {
                entity.ToTable("sales_bills");

                // Composite unique index
                entity.HasIndex(e => new { e.BillNumber, e.CompanyId, e.FiscalYearId })
                    .IsUnique()
                    .HasDatabaseName("IX_SalesBill_BillNumber_Company_FiscalYear");

                // Relationships
                entity.HasOne(e => e.Company)
                    .WithMany()
                    .HasForeignKey(e => e.CompanyId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.User)
                    .WithMany()
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.Account)
                    .WithMany()
                    .HasForeignKey(e => e.AccountId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(e => e.Settings)
                    .WithMany()
                    .HasForeignKey(e => e.SettingsId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(e => e.FiscalYear)
                    .WithMany()
                    .HasForeignKey(e => e.FiscalYearId)
                    .OnDelete(DeleteBehavior.Restrict);

                // Default values
                entity.Property(e => e.FirstPrinted).HasDefaultValue(false);
                entity.Property(e => e.PrintCount).HasDefaultValue(0);
                entity.Property(e => e.OriginalCopies).HasDefaultValue(1);
                entity.Property(e => e.VatPercentage).HasDefaultValue(13);
                entity.Property(e => e.IsVatExempt).HasDefaultValue(false);
                entity.Property(e => e.Date).HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.TransactionDate).HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            });

            // Configure SalesBillItem
            modelBuilder.Entity<SalesBillItem>(entity =>
            {
                entity.ToTable("sales_bill_items");

                // Relationships
                entity.HasOne(e => e.SalesBill)
                    .WithMany(e => e.Items)
                    .HasForeignKey(e => e.SalesBillId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.Item)
                    .WithMany()
                    .HasForeignKey(e => e.ItemId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.Unit)
                    .WithMany()
                    .HasForeignKey(e => e.UnitId)
                    .OnDelete(DeleteBehavior.Restrict);

                // Default values
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            });

            modelBuilder.Entity<Item>(entity =>
            {
                entity.ToTable("items");

                // Composite unique index
                entity.HasIndex(e => new { e.Name, e.CompanyId, e.FiscalYearId })
                    .IsUnique()
                    .HasDatabaseName("IX_Item_Name_Company_FiscalYear");

                // Unique constraints
                entity.HasIndex(e => e.UniqueNumber)
                    .IsUnique()
                    .HasDatabaseName("IX_Item_UniqueNumber");

                entity.HasIndex(e => e.BarcodeNumber)
                    .IsUnique()
                    .HasDatabaseName("IX_Item_BarcodeNumber");

                // Text search index
                entity.HasIndex(e => e.Name)
                    .HasDatabaseName("IX_Item_Name");

                // Relationships
                entity.HasOne(e => e.Company)
                    .WithMany()
                    .HasForeignKey(e => e.CompanyId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.FiscalYear)
                    .WithMany()
                    .HasForeignKey(e => e.FiscalYearId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.OriginalFiscalYear)
                    .WithMany()
                    .HasForeignKey(e => e.OriginalFiscalYearId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(e => e.Category)
                    .WithMany()
                    .HasForeignKey(e => e.CategoryId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.ItemCompany)
                    .WithMany()
                    .HasForeignKey(e => e.ItemsCompanyId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.Unit)
                    .WithMany()
                    .HasForeignKey(e => e.UnitId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.MainUnit)
                    .WithMany()
                    .HasForeignKey(e => e.MainUnitId)
                    .OnDelete(DeleteBehavior.SetNull);

                // Default values
                entity.Property(e => e.WsUnit).HasDefaultValue(0);
                entity.Property(e => e.OpeningStock).HasDefaultValue(0);
                entity.Property(e => e.MinStock).HasDefaultValue(0);
                entity.Property(e => e.MaxStock).HasDefaultValue(100);
                entity.Property(e => e.ReorderLevel).HasDefaultValue(0);
                entity.Property(e => e.MainUnitPuPrice).HasDefaultValue(0);
                entity.Property(e => e.Status).HasDefaultValue("active");
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.Date).HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            });

            // Configuration for ItemInitialOpeningStock
            modelBuilder.Entity<ItemInitialOpeningStock>(entity =>
            {
                entity.ToTable("item_initial_opening_stocks");

                // Primary key
                entity.HasKey(e => e.Id);

                // Unique index for one-to-one relationship
                entity.HasIndex(e => e.ItemId)
                    .IsUnique()
                    .HasDatabaseName("IX_ItemInitialOpeningStock_ItemId");

                // Relationships
                entity.HasOne(e => e.Item)
                    .WithOne(i => i.InitialOpeningStock)
                    .HasForeignKey<ItemInitialOpeningStock>(e => e.ItemId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.InitialFiscalYear)
                    .WithMany()
                    .HasForeignKey(e => e.InitialFiscalYearId)
                    .OnDelete(DeleteBehavior.SetNull);

                // Default values
                entity.Property(e => e.OpeningStock).HasDefaultValue(0);
                entity.Property(e => e.OpeningStockValue).HasDefaultValue(0);
                entity.Property(e => e.PurchasePrice).HasDefaultValue(0);
                entity.Property(e => e.SalesPrice).HasDefaultValue(0);
                entity.Property(e => e.Date).HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            });

            // Configuration for ItemOpeningStockByFiscalYear
            modelBuilder.Entity<ItemOpeningStockByFiscalYear>(entity =>
            {
                entity.ToTable("item_opening_stock_by_fiscal_year");

                // Primary key
                entity.HasKey(e => e.Id);

                // Composite unique index - each item can have only one opening stock per fiscal year
                entity.HasIndex(e => new { e.ItemId, e.FiscalYearId })
                    .IsUnique()
                    .HasDatabaseName("IX_ItemOpeningStockByFiscalYear_ItemId_FiscalYearId");

                // Relationships
                entity.HasOne(e => e.Item)
                    .WithMany(i => i.OpeningStocksByFiscalYear)
                    .HasForeignKey(e => e.ItemId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.FiscalYear)
                    .WithMany()
                    .HasForeignKey(e => e.FiscalYearId)
                    .OnDelete(DeleteBehavior.Restrict);

                // Default values
                entity.Property(e => e.OpeningStock).HasDefaultValue(0);
                entity.Property(e => e.OpeningStockValue).HasDefaultValue(0);
                entity.Property(e => e.PurchasePrice).HasDefaultValue(0);
                entity.Property(e => e.SalesPrice).HasDefaultValue(0);
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            });

            // Configuration for ItemClosingStockByFiscalYear
            modelBuilder.Entity<ItemClosingStockByFiscalYear>(entity =>
            {
                entity.ToTable("item_closing_stock_by_fiscal_year");

                // Primary key
                entity.HasKey(e => e.Id);

                // Composite unique index - each item can have only one closing stock per fiscal year
                entity.HasIndex(e => new { e.ItemId, e.FiscalYearId })
                    .IsUnique()
                    .HasDatabaseName("IX_ItemClosingStockByFiscalYear_ItemId_FiscalYearId");

                // Relationships
                entity.HasOne(e => e.Item)
                    .WithMany(i => i.ClosingStocksByFiscalYear)
                    .HasForeignKey(e => e.ItemId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.FiscalYear)
                    .WithMany()
                    .HasForeignKey(e => e.FiscalYearId)
                    .OnDelete(DeleteBehavior.Restrict);

                // Default values
                entity.Property(e => e.ClosingStock).HasDefaultValue(0);
                entity.Property(e => e.ClosingStockValue).HasDefaultValue(0);
                entity.Property(e => e.PurchasePrice).HasDefaultValue(0);
                entity.Property(e => e.SalesPrice).HasDefaultValue(0);
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            });

            // Configuration for StockEntry
            modelBuilder.Entity<StockEntry>(entity =>
            {
                entity.ToTable("stock_entries");

                // Primary key
                entity.HasKey(e => e.Id);

                // Relationships
                entity.HasOne(e => e.Item)
                    .WithMany(i => i.StockEntries)
                    .HasForeignKey(e => e.ItemId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.FiscalYear)
                    .WithMany()
                    .HasForeignKey(e => e.FiscalYearId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(e => e.PurchaseBill)
                    .WithMany()
                    .HasForeignKey(e => e.PurchaseBillId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(e => e.Store)
                    .WithMany()
                    .HasForeignKey(e => e.StoreId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(e => e.Rack)
                    .WithMany()
                    .HasForeignKey(e => e.RackId)
                    .OnDelete(DeleteBehavior.SetNull);

                // Indexes
                entity.HasIndex(e => e.ItemId).HasDatabaseName("IX_StockEntry_ItemId");
                entity.HasIndex(e => e.BatchNumber).HasDatabaseName("IX_StockEntry_BatchNumber");
                entity.HasIndex(e => e.ExpiryDate).HasDatabaseName("IX_StockEntry_ExpiryDate");
                entity.HasIndex(e => new { e.ItemId, e.ExpiryDate }).HasDatabaseName("IX_StockEntry_ItemId_ExpiryDate");

                // Default values
                entity.Property(e => e.BatchNumber).HasDefaultValue("XXX");
                entity.Property(e => e.Price).HasDefaultValue(0);
                entity.Property(e => e.NetPrice).HasDefaultValue(0);
                entity.Property(e => e.PuPrice).HasDefaultValue(0);
                entity.Property(e => e.ItemCcAmount).HasDefaultValue(0);
                entity.Property(e => e.DiscountPercentagePerItem).HasDefaultValue(0);
                entity.Property(e => e.DiscountAmountPerItem).HasDefaultValue(0);
                entity.Property(e => e.MainUnitPuPrice).HasDefaultValue(0);
                entity.Property(e => e.Mrp).HasDefaultValue(0);
                entity.Property(e => e.MarginPercentage).HasDefaultValue(0);
                entity.Property(e => e.ExpiryStatus).HasDefaultValue("safe");
                entity.Property(e => e.DaysUntilExpiry).HasDefaultValue(730);
                entity.Property(e => e.Date).HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            });

            // Configure StockEntry
            modelBuilder.Entity<StockEntry>(entity =>
            {
                entity.ToTable("stock_entries");

                // Relationships
                entity.HasOne(e => e.Item)
                    .WithMany(e => e.StockEntries)
                    .HasForeignKey(e => e.ItemId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.FiscalYear)
                    .WithMany()
                    .HasForeignKey(e => e.FiscalYearId)
                    .OnDelete(DeleteBehavior.SetNull);

                // CORRECTED: Add PurchaseBill navigation property relationship
                entity.HasOne(e => e.PurchaseBill)
                    .WithMany() // Add if PurchaseBill has StockEntries collection, otherwise keep WithMany()
                    .HasForeignKey(e => e.PurchaseBillId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(e => e.Store)
                    .WithMany()
                    .HasForeignKey(e => e.StoreId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(e => e.Rack)
                    .WithMany()
                    .HasForeignKey(e => e.RackId)
                    .OnDelete(DeleteBehavior.SetNull);

                // Check constraint for expiry_status
                entity.HasCheckConstraint("CK_StockEntry_ExpiryStatus",
                    "expiry_status IN ('safe', 'warning', 'danger', 'expired')");

                // Default values
                entity.Property(e => e.BatchNumber).HasDefaultValue("XXX");
                entity.Property(e => e.Price).HasDefaultValue(0);
                entity.Property(e => e.NetPrice).HasDefaultValue(0);
                entity.Property(e => e.PuPrice).HasDefaultValue(0);
                entity.Property(e => e.ItemCcAmount).HasDefaultValue(0);
                entity.Property(e => e.DiscountPercentagePerItem).HasDefaultValue(0);
                entity.Property(e => e.DiscountAmountPerItem).HasDefaultValue(0);
                entity.Property(e => e.MainUnitPuPrice).HasDefaultValue(0);
                entity.Property(e => e.Mrp).HasDefaultValue(0);
                entity.Property(e => e.MarginPercentage).HasDefaultValue(0);
                entity.Property(e => e.ExpiryStatus).HasDefaultValue("safe");
                entity.Property(e => e.DaysUntilExpiry).HasDefaultValue(730);
                entity.Property(e => e.Date).HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

                // Calculate NetPuPrice based on WsUnit
                entity.Property(e => e.NetPuPrice)
                    .HasComputedColumnSql("CASE WHEN ws_unit IS NOT NULL AND ws_unit > 0 THEN net_price / ws_unit ELSE net_price END", stored: true);
            });

            // Add indexes for performance
            modelBuilder.Entity<Item>()
                .HasIndex(i => new { i.CompanyId, i.Name })
                .HasDatabaseName("IX_Item_Company_Name");

            modelBuilder.Entity<Item>()
                .HasIndex(i => new { i.CompanyId, i.UniqueNumber })
                .HasDatabaseName("IX_Item_Company_UniqueNumber");

            modelBuilder.Entity<Item>()
                .HasIndex(i => new { i.CompanyId, i.Hscode })
                .HasDatabaseName("IX_Item_Company_Hscode");

            modelBuilder.Entity<Item>()
                .HasIndex(i => new { i.CompanyId, i.VatStatus })
                .HasDatabaseName("IX_Item_Company_VatStatus");

            modelBuilder.Entity<Item>()
                .HasIndex(i => new { i.CompanyId, i.CategoryId })
                .HasDatabaseName("IX_Item_Company_Category");

            modelBuilder.Entity<StockEntry>()
                .HasIndex(se => se.ExpiryDate)
                .HasDatabaseName("IX_StockEntry_ExpiryDate");

            modelBuilder.Entity<StockEntry>()
                .HasIndex(se => new { se.ItemId, se.ExpiryDate })
                .HasDatabaseName("IX_StockEntry_Item_ExpiryDate");

            // Configure decimal precision for PostgreSQL
            //modelBuilder.HasPostgresExtension("postgis"); // Remove if not needed

            // Configure PurchaseBill
            modelBuilder.Entity<PurchaseBill>(entity =>
            {
                entity.ToTable("purchase_bills");

                // Composite unique index
                entity.HasIndex(e => new { e.BillNumber, e.CompanyId, e.FiscalYearId })
                    .IsUnique()
                    .HasDatabaseName("IX_PurchaseBill_BillNumber_Company_FiscalYear");

                // Relationships
                entity.HasOne(e => e.Company)
                    .WithMany()
                    .HasForeignKey(e => e.CompanyId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.User)
                    .WithMany()
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.Account)
                    .WithMany()
                    .HasForeignKey(e => e.AccountId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(e => e.VatAccount)
                    .WithMany()
                    .HasForeignKey(e => e.VatAccountId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(e => e.PurchaseAccount)
                    .WithMany()
                    .HasForeignKey(e => e.PurchaseAccountId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(e => e.RoundOffAccount)
                    .WithMany()
                    .HasForeignKey(e => e.RoundOffAccountId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(e => e.Unit)
                    .WithMany()
                    .HasForeignKey(e => e.UnitId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(e => e.Settings)
                    .WithMany()
                    .HasForeignKey(e => e.SettingsId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(e => e.FiscalYear)
                    .WithMany()
                    .HasForeignKey(e => e.FiscalYearId)
                    .OnDelete(DeleteBehavior.Restrict);

                // Default values
                entity.Property(e => e.FirstPrinted).HasDefaultValue(false);
                entity.Property(e => e.PrintCount).HasDefaultValue(0);
                entity.Property(e => e.OriginalCopies).HasDefaultValue(1);
                entity.Property(e => e.VatPercentage).HasDefaultValue(13);
                entity.Property(e => e.IsVatExempt).HasDefaultValue(false);
                entity.Property(e => e.Date).HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.TransactionDate).HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            });

            // Configure PurchaseBillItem
            modelBuilder.Entity<PurchaseBillItem>(entity =>
            {
                entity.ToTable("purchase_bill_items");

                // Relationships
                entity.HasOne(e => e.PurchaseBill)
                    .WithMany(e => e.Items)
                    .HasForeignKey(e => e.PurchaseBillId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.Item)
                    .WithMany()
                    .HasForeignKey(e => e.ItemId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.Unit)
                    .WithMany()
                    .HasForeignKey(e => e.UnitId)
                    .OnDelete(DeleteBehavior.Restrict);

                // Check constraint for vat_status
                entity.HasCheckConstraint("CK_PurchaseBillItem_VatStatus",
                    "vat_status IN ('vatable', 'vatExempt')");

                // Default values
                entity.Property(e => e.DiscountPercentagePerItem).HasDefaultValue(0);
                entity.Property(e => e.DiscountAmountPerItem).HasDefaultValue(0);
                entity.Property(e => e.CcPercentage).HasDefaultValue(0);
                entity.Property(e => e.ItemCcAmount).HasDefaultValue(0);
                entity.Property(e => e.Mrp).HasDefaultValue(0);
                entity.Property(e => e.MarginPercentage).HasDefaultValue(0);
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            });

            // Add indexes for performance
            modelBuilder.Entity<PurchaseBill>()
                .HasIndex(pb => pb.CompanyId)
                .HasDatabaseName("IX_PurchaseBill_Company");

            modelBuilder.Entity<PurchaseBill>()
                .HasIndex(pb => pb.UserId)
                .HasDatabaseName("IX_PurchaseBill_User");

            modelBuilder.Entity<PurchaseBill>()
                .HasIndex(pb => pb.FiscalYearId)
                .HasDatabaseName("IX_PurchaseBill_FiscalYear");

            modelBuilder.Entity<PurchaseBill>()
                .HasIndex(pb => pb.Date)
                .HasDatabaseName("IX_PurchaseBill_Date");

            modelBuilder.Entity<PurchaseBillItem>()
                .HasIndex(pbi => pbi.PurchaseBillId)
                .HasDatabaseName("IX_PurchaseBillItem_PurchaseBill");

            modelBuilder.Entity<PurchaseBillItem>()
                .HasIndex(pbi => pbi.ItemId)
                .HasDatabaseName("IX_PurchaseBillItem_Item");

            // Configure Composition
            // Configure ItemComposition entity
            modelBuilder.Entity<ItemComposition>(entity =>
            {
                // Composite key
                entity.HasKey(e => new { e.ItemId, e.CompositionId });

                // Configure properties
                entity.Property(e => e.CreatedAt)
                      .HasDefaultValueSql("CURRENT_TIMESTAMP");

                // Configure relationships
                entity.HasOne(e => e.Item)
                      .WithMany(i => i.ItemCompositions)
                      .HasForeignKey(e => e.ItemId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.Composition)
                      .WithMany(c => c.ItemCompositions)
                      .HasForeignKey(e => e.CompositionId)
                      .OnDelete(DeleteBehavior.Cascade);

                // Indexes
                entity.HasIndex(e => e.ItemId)
                      .HasDatabaseName("IX_ItemCompositions_Item");

                entity.HasIndex(e => e.CompositionId)
                      .HasDatabaseName("IX_ItemCompositions_Composition");

                entity.HasIndex(e => e.CreatedAt)
                      .HasDatabaseName("IX_ItemCompositions_CreatedAt");
            });

            // Add indexes for performance
            modelBuilder.Entity<Composition>()
                .HasIndex(c => c.CompanyId)
                .HasDatabaseName("IX_Composition_Company");


            // Configure SalesReturn
            modelBuilder.Entity<SalesReturn>(entity =>
            {
                entity.ToTable("sales_returns");

                // Composite unique index
                entity.HasIndex(e => new { e.BillNumber, e.CompanyId, e.FiscalYearId })
                    .IsUnique()
                    .HasDatabaseName("IX_SalesReturn_BillNumber_Company_FiscalYear");

                // Relationships
                entity.HasOne(e => e.Company)
                    .WithMany()
                    .HasForeignKey(e => e.CompanyId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.OriginalSalesBill)
                    .WithMany()
                    .HasForeignKey(e => e.OriginalSalesBillId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(e => e.User)
                    .WithMany()
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.Account)
                    .WithMany()
                    .HasForeignKey(e => e.AccountId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(e => e.Unit)
                    .WithMany()
                    .HasForeignKey(e => e.UnitId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(e => e.Settings)
                    .WithMany()
                    .HasForeignKey(e => e.SettingsId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(e => e.FiscalYear)
                    .WithMany()
                    .HasForeignKey(e => e.FiscalYearId)
                    .OnDelete(DeleteBehavior.Restrict);

                // Default values
                entity.Property(e => e.FirstPrinted).HasDefaultValue(false);
                entity.Property(e => e.PrintCount).HasDefaultValue(0);
                entity.Property(e => e.OriginalCopies).HasDefaultValue(1);
                entity.Property(e => e.VatPercentage).HasDefaultValue(13);
                entity.Property(e => e.IsVatExempt).HasDefaultValue(false);
                entity.Property(e => e.Date).HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.TransactionDate).HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            });

            // Configure SalesReturnItem
            modelBuilder.Entity<SalesReturnItem>(entity =>
            {
                entity.ToTable("sales_return_items");

                // Relationships
                entity.HasOne(e => e.SalesReturn)
                    .WithMany(e => e.Items)
                    .HasForeignKey(e => e.SalesReturnId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.Item)
                    .WithMany()
                    .HasForeignKey(e => e.ItemId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.Unit)
                    .WithMany()
                    .HasForeignKey(e => e.UnitId)
                    .OnDelete(DeleteBehavior.Restrict);

                // Check constraint for vat_status
                entity.HasCheckConstraint("CK_SalesReturnItem_VatStatus",
                    "vat_status IN ('vatable', 'vatExempt')");

                // Default values
                entity.Property(e => e.DiscountPercentagePerItem).HasDefaultValue(0);
                entity.Property(e => e.DiscountAmountPerItem).HasDefaultValue(0);
                entity.Property(e => e.NetPuPrice).HasDefaultValue(0);
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            });

            // Add indexes for performance
            modelBuilder.Entity<SalesReturn>()
                .HasIndex(sr => sr.CompanyId)
                .HasDatabaseName("IX_SalesReturn_Company");

            modelBuilder.Entity<SalesReturn>()
                .HasIndex(sr => sr.UserId)
                .HasDatabaseName("IX_SalesReturn_User");

            modelBuilder.Entity<SalesReturn>()
                .HasIndex(sr => sr.FiscalYearId)
                .HasDatabaseName("IX_SalesReturn_FiscalYear");

            modelBuilder.Entity<SalesReturn>()
                .HasIndex(sr => sr.Date)
                .HasDatabaseName("IX_SalesReturn_Date");

            modelBuilder.Entity<SalesReturn>()
                .HasIndex(sr => sr.OriginalSalesBillId)
                .HasDatabaseName("IX_SalesReturn_OriginalSalesBill");

            modelBuilder.Entity<SalesReturnItem>()
                .HasIndex(sri => sri.SalesReturnId)
                .HasDatabaseName("IX_SalesReturnItem_SalesReturn");

            modelBuilder.Entity<SalesReturnItem>()
                .HasIndex(sri => sri.ItemId)
                .HasDatabaseName("IX_SalesReturnItem_Item");

            modelBuilder.Entity<SalesReturnItem>()
                .HasIndex(sri => sri.BatchNumber)
                .HasDatabaseName("IX_SalesReturnItem_BatchNumber");

            // Configure PurchaseReturn
            modelBuilder.Entity<PurchaseReturn>(entity =>
            {
                entity.ToTable("purchase_returns");

                // Composite unique index
                entity.HasIndex(e => new { e.BillNumber, e.CompanyId, e.FiscalYearId })
                    .IsUnique()
                    .HasDatabaseName("IX_PurchaseReturn_BillNumber_Company_FiscalYear");

                // Relationships
                entity.HasOne(e => e.Company)
                    .WithMany()
                    .HasForeignKey(e => e.CompanyId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.User)
                    .WithMany()
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.Account)
                    .WithMany()
                    .HasForeignKey(e => e.AccountId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(e => e.Settings)
                    .WithMany()
                    .HasForeignKey(e => e.SettingsId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(e => e.FiscalYear)
                    .WithMany()
                    .HasForeignKey(e => e.FiscalYearId)
                    .OnDelete(DeleteBehavior.Restrict);

                // Default values
                entity.Property(e => e.FirstPrinted).HasDefaultValue(false);
                entity.Property(e => e.PrintCount).HasDefaultValue(0);
                entity.Property(e => e.OriginalCopies).HasDefaultValue(1);
                entity.Property(e => e.VatPercentage).HasDefaultValue(13);
                entity.Property(e => e.IsVatExempt).HasDefaultValue(false);
                entity.Property(e => e.Date).HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.TransactionDate).HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            });

            // StockAdjustment configurations
            modelBuilder.Entity<StockAdjustment>(entity =>
            {
                entity.HasIndex(sa => new { sa.BillNumber, sa.CompanyId, sa.FiscalYearId })
                      .IsUnique()
                      .HasDatabaseName("IX_stock_adjustments_billnumber_company_fiscalyear");

                entity.Property(sa => sa.AdjustmentType)
                      .HasMaxLength(10)
                      .IsRequired();

                entity.Property(sa => sa.Status)
                      .HasMaxLength(20)
                      .HasDefaultValue("active");

                entity.Property(sa => sa.IsActive)
                      .HasDefaultValue(true);

                entity.Property(sa => sa.VatPercentage)
                      .HasDefaultValue(13);

                entity.HasOne(sa => sa.Company)
                      .WithMany()
                      .HasForeignKey(sa => sa.CompanyId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(sa => sa.User)
                      .WithMany()
                      .HasForeignKey(sa => sa.UserId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(sa => sa.FiscalYear)
                      .WithMany()
                      .HasForeignKey(sa => sa.FiscalYearId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasMany(sa => sa.Items)
                      .WithOne(sai => sai.StockAdjustment)
                      .HasForeignKey(sai => sai.StockAdjustmentId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // StockAdjustmentItem configurations
            modelBuilder.Entity<StockAdjustmentItem>(entity =>
            {
                entity.Property(sai => sai.VatStatus)
                      .HasMaxLength(20)
                      .IsRequired();

                // Configure array property for PostgreSQL
                entity.Property(sai => sai.Reason)
                      .HasColumnType("text[]");

                entity.HasOne(sai => sai.Item)
                      .WithMany()
                      .HasForeignKey(sai => sai.ItemId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(sai => sai.Unit)
                      .WithMany()
                      .HasForeignKey(sai => sai.UnitId)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            // Configure PurchaseReturnItem
            modelBuilder.Entity<PurchaseReturnItem>(entity =>
            {
                entity.ToTable("purchase_return_items");

                // Relationships
                entity.HasOne(e => e.PurchaseReturn)
                    .WithMany(e => e.Items)
                    .HasForeignKey(e => e.PurchaseReturnId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.Item)
                    .WithMany()
                    .HasForeignKey(e => e.ItemId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.Unit)
                    .WithMany()
                    .HasForeignKey(e => e.UnitId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.PurchaseBill)
                    .WithMany()
                    .HasForeignKey(e => e.PurchaseBillId)
                    .OnDelete(DeleteBehavior.SetNull);

                // Check constraint for vat_status
                entity.HasCheckConstraint("CK_PurchaseReturnItem_VatStatus",
                    "vat_status IN ('vatable', 'vatExempt')");

                // Default values
                entity.Property(e => e.Mrp).HasDefaultValue(0);
                entity.Property(e => e.MarginPercentage).HasDefaultValue(0);
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

                // Computed columns for calculated values (PostgreSQL specific)
                //entity.Property(e => e.AltQuantity)
                //    .HasComputedColumnSql("CASE WHEN ws_unit IS NOT NULL AND ws_unit > 0 THEN ws_unit * quantity ELSE quantity END", stored: true);

                //entity.Property(e => e.AltPrice)
                //    .HasComputedColumnSql("CASE WHEN ws_unit IS NOT NULL AND ws_unit > 0 THEN price / ws_unit ELSE price END", stored: true);

                //entity.Property(e => e.AltPuPrice)
                //    .HasComputedColumnSql("CASE WHEN ws_unit IS NOT NULL AND ws_unit > 0 THEN pu_price / ws_unit ELSE pu_price END", stored: true);
            });

            // Add indexes for performance
            modelBuilder.Entity<PurchaseReturn>()
                .HasIndex(pr => pr.CompanyId)
                .HasDatabaseName("IX_PurchaseReturn_Company");

            modelBuilder.Entity<PurchaseReturn>()
                .HasIndex(pr => pr.UserId)
                .HasDatabaseName("IX_PurchaseReturn_User");

            modelBuilder.Entity<PurchaseReturn>()
                .HasIndex(pr => pr.FiscalYearId)
                .HasDatabaseName("IX_PurchaseReturn_FiscalYear");

            modelBuilder.Entity<PurchaseReturn>()
                .HasIndex(pr => pr.Date)
                .HasDatabaseName("IX_PurchaseReturn_Date");

            modelBuilder.Entity<PurchaseReturnItem>()
                .HasIndex(pri => pri.PurchaseReturnId)
                .HasDatabaseName("IX_PurchaseReturnItem_PurchaseReturn");

            modelBuilder.Entity<PurchaseReturnItem>()
                .HasIndex(pri => pri.ItemId)
                .HasDatabaseName("IX_PurchaseReturnItem_Item");

            modelBuilder.Entity<PurchaseReturnItem>()
                .HasIndex(pri => pri.BatchNumber)
                .HasDatabaseName("IX_PurchaseReturnItem_BatchNumber");

            modelBuilder.Entity<PurchaseReturnItem>()
                .HasIndex(pri => pri.PurchaseBillId)
                .HasDatabaseName("IX_PurchaseReturnItem_PurchaseBill");
        }

        public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            var entries = ChangeTracker
                .Entries()
                .Where(e => e.Entity is SalesBill || e.Entity is SalesBillItem);

            foreach (var entityEntry in entries)
            {
                if (entityEntry.State == EntityState.Modified)
                {
                    ((dynamic)entityEntry.Entity).UpdatedAt = DateTime.UtcNow;
                }
            }

            return base.SaveChangesAsync(cancellationToken);
        }

    }
}