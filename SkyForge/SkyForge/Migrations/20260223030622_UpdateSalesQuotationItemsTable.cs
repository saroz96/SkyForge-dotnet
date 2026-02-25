using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SkyForge.Migrations
{
    /// <inheritdoc />
    public partial class UpdateSalesQuotationItemsTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "nepali_date",
                table: "sales_quotations",
                type: "timestamp without time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<DateTime>(
                name: "transaction_date_nepali",
                table: "sales_quotations",
                type: "timestamp without time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<decimal>(
                name: "PuPrice",
                table: "sales_quotation_items",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "discount_amount_per_item",
                table: "sales_quotation_items",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "discount_percentage_per_item",
                table: "sales_quotation_items",
                type: "numeric(5,2)",
                precision: 5,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "ws_unit",
                table: "sales_quotation_items",
                type: "numeric(10,3)",
                precision: 10,
                scale: 3,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "nepali_date",
                table: "sales_quotations");

            migrationBuilder.DropColumn(
                name: "transaction_date_nepali",
                table: "sales_quotations");

            migrationBuilder.DropColumn(
                name: "PuPrice",
                table: "sales_quotation_items");

            migrationBuilder.DropColumn(
                name: "discount_amount_per_item",
                table: "sales_quotation_items");

            migrationBuilder.DropColumn(
                name: "discount_percentage_per_item",
                table: "sales_quotation_items");

            migrationBuilder.DropColumn(
                name: "ws_unit",
                table: "sales_quotation_items");
        }
    }
}
