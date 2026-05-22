using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SkyForge.Migrations
{
    /// <inheritdoc />
    public partial class UpdateStockEntryTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_stock_entries_items_ParentItemId",
                table: "stock_entries");

            migrationBuilder.DropIndex(
                name: "IX_stock_entries_ParentItemId",
                table: "stock_entries");

            migrationBuilder.DropColumn(
                name: "ParentItemId",
                table: "stock_entries");

            migrationBuilder.DropColumn(
                name: "is_return_entry",
                table: "stock_entries");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ParentItemId",
                table: "stock_entries",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_return_entry",
                table: "stock_entries",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_stock_entries_ParentItemId",
                table: "stock_entries",
                column: "ParentItemId");

            migrationBuilder.AddForeignKey(
                name: "FK_stock_entries_items_ParentItemId",
                table: "stock_entries",
                column: "ParentItemId",
                principalTable: "items",
                principalColumn: "id");
        }
    }
}
