using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SkyForge.Migrations
{
    /// <inheritdoc />
    public partial class RemoveNetPuPriceComputedColumn : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<decimal>(
                name: "net_pu_price",
                table: "stock_entries",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,4)",
                oldPrecision: 18,
                oldScale: 4,
                oldComputedColumnSql: "CASE WHEN ws_unit IS NOT NULL AND ws_unit > 0 THEN net_price / ws_unit ELSE net_price END");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
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
                oldScale: 2);
        }
    }
}
