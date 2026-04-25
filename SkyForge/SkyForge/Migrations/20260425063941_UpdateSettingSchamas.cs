using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SkyForge.Migrations
{
    /// <inheritdoc />
    public partial class UpdateSettingSchamas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "UseVoucherLastDateForCreditNote",
                table: "Settings",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "UseVoucherLastDateForDebitNote",
                table: "Settings",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "UseVoucherLastDateForJournal",
                table: "Settings",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "UseVoucherLastDateForPayment",
                table: "Settings",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "UseVoucherLastDateForReceipt",
                table: "Settings",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "UseVoucherLastDateForCreditNote",
                table: "Settings");

            migrationBuilder.DropColumn(
                name: "UseVoucherLastDateForDebitNote",
                table: "Settings");

            migrationBuilder.DropColumn(
                name: "UseVoucherLastDateForJournal",
                table: "Settings");

            migrationBuilder.DropColumn(
                name: "UseVoucherLastDateForPayment",
                table: "Settings");

            migrationBuilder.DropColumn(
                name: "UseVoucherLastDateForReceipt",
                table: "Settings");
        }
    }
}
