using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SkyForge.Migrations
{
    /// <inheritdoc />
    public partial class AddSalesQuotationTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "sales_quotations",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    company_id = table.Column<Guid>(type: "uuid", nullable: false),
                    purchase_sales_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    bill_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    account_id = table.Column<Guid>(type: "uuid", nullable: true),
                    settings_id = table.Column<Guid>(type: "uuid", nullable: true),
                    fiscal_year_id = table.Column<Guid>(type: "uuid", nullable: false),
                    sub_total = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    non_vat_sales = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    taxable_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    discount_percentage = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    discount_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    vat_percentage = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    vat_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    total_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    is_vat_exempt = table.Column<bool>(type: "boolean", nullable: false),
                    is_vat_all = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    round_off_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    payment_mode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    date = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    transaction_date = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sales_quotations", x => x.id);
                    table.ForeignKey(
                        name: "FK_sales_quotations_Accounts_account_id",
                        column: x => x.account_id,
                        principalTable: "Accounts",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_sales_quotations_Companies_company_id",
                        column: x => x.company_id,
                        principalTable: "Companies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_sales_quotations_FiscalYears_fiscal_year_id",
                        column: x => x.fiscal_year_id,
                        principalTable: "FiscalYears",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_sales_quotations_Settings_settings_id",
                        column: x => x.settings_id,
                        principalTable: "Settings",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_sales_quotations_Users_user_id",
                        column: x => x.user_id,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "sales_quotation_items",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    sales_quotation_id = table.Column<Guid>(type: "uuid", nullable: false),
                    item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    unit_id = table.Column<Guid>(type: "uuid", nullable: false),
                    quantity = table.Column<decimal>(type: "numeric(10,3)", precision: 10, scale: 3, nullable: false),
                    price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    vat_status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sales_quotation_items", x => x.id);
                    table.ForeignKey(
                        name: "FK_sales_quotation_items_Units_unit_id",
                        column: x => x.unit_id,
                        principalTable: "Units",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_sales_quotation_items_items_item_id",
                        column: x => x.item_id,
                        principalTable: "items",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_sales_quotation_items_sales_quotations_sales_quotation_id",
                        column: x => x.sales_quotation_id,
                        principalTable: "sales_quotations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_sales_quotation_items_item_id",
                table: "sales_quotation_items",
                column: "item_id");

            migrationBuilder.CreateIndex(
                name: "IX_sales_quotation_items_sales_quotation_id",
                table: "sales_quotation_items",
                column: "sales_quotation_id");

            migrationBuilder.CreateIndex(
                name: "IX_sales_quotation_items_unit_id",
                table: "sales_quotation_items",
                column: "unit_id");

            migrationBuilder.CreateIndex(
                name: "IX_sales_quotations_account_id",
                table: "sales_quotations",
                column: "account_id");

            migrationBuilder.CreateIndex(
                name: "IX_sales_quotations_company_id",
                table: "sales_quotations",
                column: "company_id");

            migrationBuilder.CreateIndex(
                name: "IX_sales_quotations_fiscal_year_id",
                table: "sales_quotations",
                column: "fiscal_year_id");

            migrationBuilder.CreateIndex(
                name: "IX_sales_quotations_settings_id",
                table: "sales_quotations",
                column: "settings_id");

            migrationBuilder.CreateIndex(
                name: "IX_sales_quotations_user_id",
                table: "sales_quotations",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_SalesQuotation_Date_BillNumber_Company_FiscalYear",
                table: "sales_quotations",
                columns: new[] { "date", "bill_number", "company_id", "fiscal_year_id" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "sales_quotation_items");

            migrationBuilder.DropTable(
                name: "sales_quotations");
        }
    }
}
