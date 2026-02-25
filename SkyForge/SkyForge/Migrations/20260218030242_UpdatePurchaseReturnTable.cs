using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SkyForge.Migrations
{
    /// <inheritdoc />
    public partial class UpdatePurchaseReturnTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "nepali_date",
                table: "purchase_returns",
                type: "timestamp without time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<DateTime>(
                name: "transaction_date_nepali",
                table: "purchase_returns",
                type: "timestamp without time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<decimal>(
                name: "discount_amount_per_item",
                table: "purchase_return_items",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "discount_percentage_per_item",
                table: "purchase_return_items",
                type: "numeric(5,2)",
                precision: 5,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "net_pu_price",
                table: "purchase_return_items",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "nepali_date",
                table: "purchase_returns");

            migrationBuilder.DropColumn(
                name: "transaction_date_nepali",
                table: "purchase_returns");

            migrationBuilder.DropColumn(
                name: "discount_amount_per_item",
                table: "purchase_return_items");

            migrationBuilder.DropColumn(
                name: "discount_percentage_per_item",
                table: "purchase_return_items");

            migrationBuilder.DropColumn(
                name: "net_pu_price",
                table: "purchase_return_items");
        }
    }
}
