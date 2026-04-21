using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SkyForge.Migrations
{
    /// <inheritdoc />
    public partial class UpdateStockEntrySchemaTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "total_cc_amount",
                table: "purchase_returns",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "cc_percentage",
                table: "purchase_return_items",
                type: "numeric(5,2)",
                precision: 5,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "item_cc_amount",
                table: "purchase_return_items",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "main_unit_pu_price",
                table: "purchase_return_items",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AlterColumn<decimal>(
                name: "net_pu_price",
                table: "stock_entries",
                type: "numeric(18,4)",
                precision: 18,
                scale: 4,
                nullable: false,
                computedColumnSql: "CASE WHEN ws_unit IS NOT NULL AND ws_unit > 0 THEN net_price / ws_unit ELSE net_price END",
                stored: true,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,2)",
                oldPrecision: 18,
                oldScale: 2,
                oldComputedColumnSql: "CASE WHEN ws_unit IS NOT NULL AND ws_unit > 0 THEN net_price / ws_unit ELSE net_price END",
                oldStored: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "total_cc_amount",
                table: "purchase_returns");

            migrationBuilder.DropColumn(
                name: "cc_percentage",
                table: "purchase_return_items");

            migrationBuilder.DropColumn(
                name: "item_cc_amount",
                table: "purchase_return_items");

            migrationBuilder.DropColumn(
                name: "main_unit_pu_price",
                table: "purchase_return_items");

            migrationBuilder.AlterColumn<decimal>(
                name: "net_pu_price",
                table: "stock_entries",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                computedColumnSql: "CASE WHEN ws_unit IS NOT NULL AND ws_unit > 0 THEN net_price / ws_unit ELSE net_price END",
                stored: true,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,4)",
                oldPrecision: 18,
                oldScale: 4,
                oldComputedColumnSql: "CASE WHEN ws_unit IS NOT NULL AND ws_unit > 0 THEN net_price / ws_unit ELSE net_price END",
                oldStored: true);
        }
    }
}
