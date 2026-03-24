using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SkyForge.Migrations
{
    /// <inheritdoc />
    public partial class UpdatePaymentTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Payments_BillDate",
                table: "Payments");

            migrationBuilder.RenameColumn(
                name: "Date",
                table: "Payments",
                newName: "date");

            migrationBuilder.RenameColumn(
                name: "BillDate",
                table: "Payments",
                newName: "transaction_date_nepali");

            migrationBuilder.RenameIndex(
                name: "IX_Payments_Date",
                table: "Payments",
                newName: "IX_Payments_date");

            migrationBuilder.RenameIndex(
                name: "IX_Payments_CompanyId_FiscalYearId_Date",
                table: "Payments",
                newName: "IX_Payments_CompanyId_FiscalYearId_date");

            migrationBuilder.AddColumn<DateTime>(
                name: "nepali_date",
                table: "Payments",
                type: "timestamp without time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<DateTime>(
                name: "transaction_date",
                table: "Payments",
                type: "timestamp without time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.CreateIndex(
                name: "IX_Payments_nepali_date",
                table: "Payments",
                column: "nepali_date");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Payments_nepali_date",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "nepali_date",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "transaction_date",
                table: "Payments");

            migrationBuilder.RenameColumn(
                name: "date",
                table: "Payments",
                newName: "Date");

            migrationBuilder.RenameColumn(
                name: "transaction_date_nepali",
                table: "Payments",
                newName: "BillDate");

            migrationBuilder.RenameIndex(
                name: "IX_Payments_date",
                table: "Payments",
                newName: "IX_Payments_Date");

            migrationBuilder.RenameIndex(
                name: "IX_Payments_CompanyId_FiscalYearId_date",
                table: "Payments",
                newName: "IX_Payments_CompanyId_FiscalYearId_Date");

            migrationBuilder.CreateIndex(
                name: "IX_Payments_BillDate",
                table: "Payments",
                column: "BillDate");
        }
    }
}
