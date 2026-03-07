using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SkyForge.Migrations
{
    /// <inheritdoc />
    public partial class AddAccountUniqueNumberToSalesBill : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "account_unique_number",
                table: "sales_bills",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "account_unique_number",
                table: "sales_bills");
        }
    }
}
