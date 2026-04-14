using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SkyForge.Migrations
{
    /// <inheritdoc />
    public partial class updateInitialOpeningBalanceTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DateNepali",
                table: "OpeningBalances");

            migrationBuilder.AddColumn<DateTime>(
                name: "Nepali_Date",
                table: "OpeningBalances",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "Nepali_Date",
                table: "InitialOpeningBalances",
                type: "timestamp without time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Nepali_Date",
                table: "OpeningBalances");

            migrationBuilder.DropColumn(
                name: "Nepali_Date",
                table: "InitialOpeningBalances");

            migrationBuilder.AddColumn<string>(
                name: "DateNepali",
                table: "OpeningBalances",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);
        }
    }
}
