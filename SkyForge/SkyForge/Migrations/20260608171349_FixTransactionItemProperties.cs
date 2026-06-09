using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SkyForge.Migrations
{
    /// <inheritdoc />
    public partial class FixTransactionItemProperties : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Quantity",
                table: "transaction_items",
                newName: "quantity");

            migrationBuilder.RenameColumn(
                name: "Price",
                table: "transaction_items",
                newName: "price");

            migrationBuilder.RenameColumn(
                name: "Debit",
                table: "transaction_items",
                newName: "debit");

            migrationBuilder.RenameColumn(
                name: "Credit",
                table: "transaction_items",
                newName: "credit");

            migrationBuilder.RenameColumn(
                name: "Bonus",
                table: "transaction_items",
                newName: "bonus");

            migrationBuilder.RenameColumn(
                name: "WSUnit",
                table: "transaction_items",
                newName: "ws_unit");

            migrationBuilder.RenameColumn(
                name: "VatPercentage",
                table: "transaction_items",
                newName: "vat_percentage");

            migrationBuilder.RenameColumn(
                name: "VatAmount",
                table: "transaction_items",
                newName: "vat_amount");

            migrationBuilder.RenameColumn(
                name: "UpdatedAt",
                table: "transaction_items",
                newName: "updated_at");

            migrationBuilder.RenameColumn(
                name: "PuPrice",
                table: "transaction_items",
                newName: "pu_price");

            migrationBuilder.RenameColumn(
                name: "NetPuPrice",
                table: "transaction_items",
                newName: "net_pu_price");

            migrationBuilder.RenameColumn(
                name: "DiscountPercentagePerItem",
                table: "transaction_items",
                newName: "discount_percentage_per_item");

            migrationBuilder.RenameColumn(
                name: "DiscountAmountPerItem",
                table: "transaction_items",
                newName: "discount_amount_per_item");

            migrationBuilder.RenameColumn(
                name: "CreatedAt",
                table: "transaction_items",
                newName: "created_at");

            migrationBuilder.RenameIndex(
                name: "IX_transaction_items_CreatedAt",
                table: "transaction_items",
                newName: "IX_transaction_items_created_at");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "quantity",
                table: "transaction_items",
                newName: "Quantity");

            migrationBuilder.RenameColumn(
                name: "price",
                table: "transaction_items",
                newName: "Price");

            migrationBuilder.RenameColumn(
                name: "debit",
                table: "transaction_items",
                newName: "Debit");

            migrationBuilder.RenameColumn(
                name: "credit",
                table: "transaction_items",
                newName: "Credit");

            migrationBuilder.RenameColumn(
                name: "bonus",
                table: "transaction_items",
                newName: "Bonus");

            migrationBuilder.RenameColumn(
                name: "ws_unit",
                table: "transaction_items",
                newName: "WSUnit");

            migrationBuilder.RenameColumn(
                name: "vat_percentage",
                table: "transaction_items",
                newName: "VatPercentage");

            migrationBuilder.RenameColumn(
                name: "vat_amount",
                table: "transaction_items",
                newName: "VatAmount");

            migrationBuilder.RenameColumn(
                name: "updated_at",
                table: "transaction_items",
                newName: "UpdatedAt");

            migrationBuilder.RenameColumn(
                name: "pu_price",
                table: "transaction_items",
                newName: "PuPrice");

            migrationBuilder.RenameColumn(
                name: "net_pu_price",
                table: "transaction_items",
                newName: "NetPuPrice");

            migrationBuilder.RenameColumn(
                name: "discount_percentage_per_item",
                table: "transaction_items",
                newName: "DiscountPercentagePerItem");

            migrationBuilder.RenameColumn(
                name: "discount_amount_per_item",
                table: "transaction_items",
                newName: "DiscountAmountPerItem");

            migrationBuilder.RenameColumn(
                name: "created_at",
                table: "transaction_items",
                newName: "CreatedAt");

            migrationBuilder.RenameIndex(
                name: "IX_transaction_items_created_at",
                table: "transaction_items",
                newName: "IX_transaction_items_CreatedAt");
        }
    }
}
