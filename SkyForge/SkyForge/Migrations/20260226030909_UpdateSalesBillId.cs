using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SkyForge.Migrations
{
    /// <inheritdoc />
    public partial class UpdateSalesBillId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Transactions_sales_bills_BillId",
                table: "Transactions");

            migrationBuilder.RenameColumn(
                name: "BillId",
                table: "Transactions",
                newName: "SalesBillId");

            migrationBuilder.RenameIndex(
                name: "IX_Transactions_BillId",
                table: "Transactions",
                newName: "IX_Transactions_SalesBillId");

            migrationBuilder.AddForeignKey(
                name: "FK_Transactions_sales_bills_SalesBillId",
                table: "Transactions",
                column: "SalesBillId",
                principalTable: "sales_bills",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Transactions_sales_bills_SalesBillId",
                table: "Transactions");

            migrationBuilder.RenameColumn(
                name: "SalesBillId",
                table: "Transactions",
                newName: "BillId");

            migrationBuilder.RenameIndex(
                name: "IX_Transactions_SalesBillId",
                table: "Transactions",
                newName: "IX_Transactions_BillId");

            migrationBuilder.AddForeignKey(
                name: "FK_Transactions_sales_bills_BillId",
                table: "Transactions",
                column: "BillId",
                principalTable: "sales_bills",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
