using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SkyForge.Migrations
{
    /// <inheritdoc />
    public partial class UpdateiTEMtables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_SalesReturnItem_VatStatus",
                table: "sales_return_items");

            migrationBuilder.DropCheckConstraint(
                name: "CK_PurchaseReturnItem_VatStatus",
                table: "purchase_return_items");

            migrationBuilder.DropCheckConstraint(
                name: "CK_PurchaseBillItem_VatStatus",
                table: "purchase_bill_items");

            migrationBuilder.AddCheckConstraint(
                name: "CK_SalesReturnItem_VatStatus",
                table: "sales_return_items",
                sql: "vat_status IN ('vatable', 'vatExempt')");

            migrationBuilder.AddCheckConstraint(
                name: "CK_PurchaseReturnItem_VatStatus",
                table: "purchase_return_items",
                sql: "vat_status IN ('vatable', 'vatExempt')");

            migrationBuilder.AddCheckConstraint(
                name: "CK_PurchaseBillItem_VatStatus",
                table: "purchase_bill_items",
                sql: "vat_status IN ('vatable', 'vatExempt')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_SalesReturnItem_VatStatus",
                table: "sales_return_items");

            migrationBuilder.DropCheckConstraint(
                name: "CK_PurchaseReturnItem_VatStatus",
                table: "purchase_return_items");

            migrationBuilder.DropCheckConstraint(
                name: "CK_PurchaseBillItem_VatStatus",
                table: "purchase_bill_items");

            migrationBuilder.AddCheckConstraint(
                name: "CK_SalesReturnItem_VatStatus",
                table: "sales_return_items",
                sql: "vat_status IN ('13', 'vatExempt')");

            migrationBuilder.AddCheckConstraint(
                name: "CK_PurchaseReturnItem_VatStatus",
                table: "purchase_return_items",
                sql: "vat_status IN ('13', 'vatExempt')");

            migrationBuilder.AddCheckConstraint(
                name: "CK_PurchaseBillItem_VatStatus",
                table: "purchase_bill_items",
                sql: "vat_status IN ('13', 'vatExempt')");
        }
    }
}
