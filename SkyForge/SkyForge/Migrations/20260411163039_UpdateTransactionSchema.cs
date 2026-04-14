using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SkyForge.Migrations
{
    /// <inheritdoc />
    public partial class UpdateTransactionSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "VatAmount",
                table: "Transactions",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "VatPercentage",
                table: "Transactions",
                type: "numeric",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "VatAmount",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "VatPercentage",
                table: "Transactions");
        }
    }
}
