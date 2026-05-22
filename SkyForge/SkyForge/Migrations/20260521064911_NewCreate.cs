using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SkyForge.Migrations
{
    /// <inheritdoc />
    public partial class NewCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_stock_entries_stock_entries_parent_stock_entry_id",
                table: "stock_entries");

            migrationBuilder.AddForeignKey(
                name: "FK_stock_entries_stock_entries_parent_stock_entry_id",
                table: "stock_entries",
                column: "parent_stock_entry_id",
                principalTable: "stock_entries",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_stock_entries_stock_entries_parent_stock_entry_id",
                table: "stock_entries");

            migrationBuilder.AddForeignKey(
                name: "FK_stock_entries_stock_entries_parent_stock_entry_id",
                table: "stock_entries",
                column: "parent_stock_entry_id",
                principalTable: "stock_entries",
                principalColumn: "id");
        }
    }
}
