using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SkyForge.Migrations
{
    /// <inheritdoc />
    public partial class updateInitialOpeningBalanceTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Nepali_Date",
                table: "InitialOpeningBalances",
                newName: "nepali_date");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "nepali_date",
                table: "InitialOpeningBalances",
                newName: "Nepali_Date");
        }
    }
}
