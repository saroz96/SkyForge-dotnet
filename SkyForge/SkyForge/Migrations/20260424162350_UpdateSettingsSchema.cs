using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SkyForge.Migrations
{
    /// <inheritdoc />
    public partial class UpdateSettingsSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "UseVoucherLastDateForPurchase",
                table: "Settings",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "UseVoucherLastDateForPurchaseReturn",
                table: "Settings",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "UseVoucherLastDateForSales",
                table: "Settings",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "UseVoucherLastDateForSalesReturn",
                table: "Settings",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "UseVoucherLastDateForPurchase",
                table: "Settings");

            migrationBuilder.DropColumn(
                name: "UseVoucherLastDateForPurchaseReturn",
                table: "Settings");

            migrationBuilder.DropColumn(
                name: "UseVoucherLastDateForSales",
                table: "Settings");

            migrationBuilder.DropColumn(
                name: "UseVoucherLastDateForSalesReturn",
                table: "Settings");
        }
    }
}
