using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SkyForge.Migrations
{
    /// <inheritdoc />
    public partial class updatestockenttable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "CompanyId",
                table: "stock_entries",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateIndex(
                name: "IX_stock_entries_CompanyId",
                table: "stock_entries",
                column: "CompanyId");

            migrationBuilder.AddForeignKey(
                name: "FK_stock_entries_Companies_CompanyId",
                table: "stock_entries",
                column: "CompanyId",
                principalTable: "Companies",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_stock_entries_Companies_CompanyId",
                table: "stock_entries");

            migrationBuilder.DropIndex(
                name: "IX_stock_entries_CompanyId",
                table: "stock_entries");

            migrationBuilder.DropColumn(
                name: "CompanyId",
                table: "stock_entries");
        }
    }
}
