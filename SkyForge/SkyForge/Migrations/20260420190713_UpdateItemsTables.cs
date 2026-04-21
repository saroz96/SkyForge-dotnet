using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SkyForge.Migrations
{
    /// <inheritdoc />
    public partial class UpdateItemsTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "Nepali_Date",
                table: "stock_entries",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "Nepali_Date",
                table: "items",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "Nepali_Date",
                table: "item_closing_stock_by_fiscal_year",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "date",
                table: "item_closing_stock_by_fiscal_year",
                type: "timestamp without time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Nepali_Date",
                table: "stock_entries");

            migrationBuilder.DropColumn(
                name: "Nepali_Date",
                table: "items");

            migrationBuilder.DropColumn(
                name: "Nepali_Date",
                table: "item_closing_stock_by_fiscal_year");

            migrationBuilder.DropColumn(
                name: "date",
                table: "item_closing_stock_by_fiscal_year");
        }
    }
}
