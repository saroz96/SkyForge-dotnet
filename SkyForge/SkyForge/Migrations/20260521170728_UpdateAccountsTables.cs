using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SkyForge.Migrations
{
    /// <inheritdoc />
    public partial class UpdateAccountsTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AccountGroups_FiscalYears_fiscal_year_id",
                table: "AccountGroups");

            migrationBuilder.DropForeignKey(
                name: "FK_stock_entries_items_ParentItemId",
                table: "stock_entries");

            migrationBuilder.DropIndex(
                name: "IX_stock_entries_ParentItemId",
                table: "stock_entries");

            migrationBuilder.DropIndex(
                name: "IX_AccountGroups_fiscal_year_id",
                table: "AccountGroups");

            migrationBuilder.DropColumn(
                name: "ParentItemId",
                table: "stock_entries");

            migrationBuilder.DropColumn(
                name: "fiscal_year_id",
                table: "AccountGroups");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ParentItemId",
                table: "stock_entries",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "fiscal_year_id",
                table: "AccountGroups",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateIndex(
                name: "IX_stock_entries_ParentItemId",
                table: "stock_entries",
                column: "ParentItemId");

            migrationBuilder.CreateIndex(
                name: "IX_AccountGroups_fiscal_year_id",
                table: "AccountGroups",
                column: "fiscal_year_id");

            migrationBuilder.AddForeignKey(
                name: "FK_AccountGroups_FiscalYears_fiscal_year_id",
                table: "AccountGroups",
                column: "fiscal_year_id",
                principalTable: "FiscalYears",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_stock_entries_items_ParentItemId",
                table: "stock_entries",
                column: "ParentItemId",
                principalTable: "items",
                principalColumn: "id");
        }
    }
}
