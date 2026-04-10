using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SkyForge.Migrations
{
    /// <inheritdoc />
    public partial class UpdateDateFieldofModels : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Date",
                table: "Receipts",
                newName: "date");

            migrationBuilder.RenameIndex(
                name: "IX_Receipts_Date",
                table: "Receipts",
                newName: "IX_Receipts_date");

            migrationBuilder.RenameIndex(
                name: "IX_Receipts_CompanyId_FiscalYearId_Date",
                table: "Receipts",
                newName: "IX_Receipts_CompanyId_FiscalYearId_date");

            migrationBuilder.RenameColumn(
                name: "Date",
                table: "Payments",
                newName: "date");

            migrationBuilder.RenameIndex(
                name: "IX_Payments_Date",
                table: "Payments",
                newName: "IX_Payments_date");

            migrationBuilder.RenameIndex(
                name: "IX_Payments_CompanyId_FiscalYearId_Date",
                table: "Payments",
                newName: "IX_Payments_CompanyId_FiscalYearId_date");

            migrationBuilder.RenameColumn(
                name: "Date",
                table: "JournalVouchers",
                newName: "date");

            migrationBuilder.RenameColumn(
                name: "Date",
                table: "DebitNotes",
                newName: "date");

            migrationBuilder.RenameIndex(
                name: "IX_DebitNotes_Date",
                table: "DebitNotes",
                newName: "IX_DebitNotes_date");

            migrationBuilder.RenameIndex(
                name: "IX_DebitNotes_CompanyId_FiscalYearId_Date",
                table: "DebitNotes",
                newName: "IX_DebitNotes_CompanyId_FiscalYearId_date");

            migrationBuilder.RenameColumn(
                name: "Date",
                table: "CreditNotes",
                newName: "date");

            migrationBuilder.RenameIndex(
                name: "IX_CreditNotes_Date",
                table: "CreditNotes",
                newName: "IX_CreditNotes_date");

            migrationBuilder.RenameIndex(
                name: "IX_CreditNotes_CompanyId_FiscalYearId_Date",
                table: "CreditNotes",
                newName: "IX_CreditNotes_CompanyId_FiscalYearId_date");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "date",
                table: "Receipts",
                newName: "Date");

            migrationBuilder.RenameIndex(
                name: "IX_Receipts_date",
                table: "Receipts",
                newName: "IX_Receipts_Date");

            migrationBuilder.RenameIndex(
                name: "IX_Receipts_CompanyId_FiscalYearId_date",
                table: "Receipts",
                newName: "IX_Receipts_CompanyId_FiscalYearId_Date");

            migrationBuilder.RenameColumn(
                name: "date",
                table: "Payments",
                newName: "Date");

            migrationBuilder.RenameIndex(
                name: "IX_Payments_date",
                table: "Payments",
                newName: "IX_Payments_Date");

            migrationBuilder.RenameIndex(
                name: "IX_Payments_CompanyId_FiscalYearId_date",
                table: "Payments",
                newName: "IX_Payments_CompanyId_FiscalYearId_Date");

            migrationBuilder.RenameColumn(
                name: "date",
                table: "JournalVouchers",
                newName: "Date");

            migrationBuilder.RenameColumn(
                name: "date",
                table: "DebitNotes",
                newName: "Date");

            migrationBuilder.RenameIndex(
                name: "IX_DebitNotes_date",
                table: "DebitNotes",
                newName: "IX_DebitNotes_Date");

            migrationBuilder.RenameIndex(
                name: "IX_DebitNotes_CompanyId_FiscalYearId_date",
                table: "DebitNotes",
                newName: "IX_DebitNotes_CompanyId_FiscalYearId_Date");

            migrationBuilder.RenameColumn(
                name: "date",
                table: "CreditNotes",
                newName: "Date");

            migrationBuilder.RenameIndex(
                name: "IX_CreditNotes_date",
                table: "CreditNotes",
                newName: "IX_CreditNotes_Date");

            migrationBuilder.RenameIndex(
                name: "IX_CreditNotes_CompanyId_FiscalYearId_date",
                table: "CreditNotes",
                newName: "IX_CreditNotes_CompanyId_FiscalYearId_Date");
        }
    }
}
