using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SkyForge.Migrations
{
    /// <inheritdoc />
    public partial class UpdateReceiptTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Receipts_BillDate",
                table: "Receipts");

            migrationBuilder.RenameColumn(
                name: "BillDate",
                table: "Receipts",
                newName: "nepali_date");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "nepali_date",
                table: "Receipts",
                newName: "BillDate");

            migrationBuilder.CreateIndex(
                name: "IX_Receipts_BillDate",
                table: "Receipts",
                column: "BillDate");
        }
    }
}
