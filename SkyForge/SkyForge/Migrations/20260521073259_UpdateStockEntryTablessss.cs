using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SkyForge.Migrations
{
    /// <inheritdoc />
    public partial class UpdateStockEntryTablessss : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_stock_entries_Companies_CompanyId",
                table: "stock_entries");

            migrationBuilder.DropForeignKey(
                name: "FK_stock_entries_sales_bills_sales_bill_id",
                table: "stock_entries");

            migrationBuilder.DropForeignKey(
                name: "FK_stock_entries_stock_adjustments_stock_adjustment_id",
                table: "stock_entries");

            migrationBuilder.DropForeignKey(
                name: "FK_stock_entries_stock_entries_parent_stock_entry_id",
                table: "stock_entries");

            migrationBuilder.DropIndex(
                name: "IX_stock_entries_CompanyId",
                table: "stock_entries");

            migrationBuilder.DropIndex(
                name: "IX_stock_entries_parent_stock_entry_id",
                table: "stock_entries");

            migrationBuilder.DropIndex(
                name: "IX_stock_entries_sales_bill_id",
                table: "stock_entries");

            migrationBuilder.DropColumn(
                name: "CompanyId",
                table: "stock_entries");

            migrationBuilder.DropColumn(
                name: "is_active",
                table: "stock_entries");

            migrationBuilder.DropColumn(
                name: "is_reduction_entry",
                table: "stock_entries");

            migrationBuilder.DropColumn(
                name: "is_sale_entry",
                table: "stock_entries");

            migrationBuilder.DropColumn(
                name: "parent_stock_entry_id",
                table: "stock_entries");

            migrationBuilder.DropColumn(
                name: "sales_bill_id",
                table: "stock_entries");

            migrationBuilder.RenameColumn(
                name: "stock_adjustment_id",
                table: "stock_entries",
                newName: "ParentItemId");

            migrationBuilder.RenameIndex(
                name: "IX_stock_entries_stock_adjustment_id",
                table: "stock_entries",
                newName: "IX_stock_entries_ParentItemId");

            migrationBuilder.AddForeignKey(
                name: "FK_stock_entries_items_ParentItemId",
                table: "stock_entries",
                column: "ParentItemId",
                principalTable: "items",
                principalColumn: "id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_stock_entries_items_ParentItemId",
                table: "stock_entries");

            migrationBuilder.RenameColumn(
                name: "ParentItemId",
                table: "stock_entries",
                newName: "stock_adjustment_id");

            migrationBuilder.RenameIndex(
                name: "IX_stock_entries_ParentItemId",
                table: "stock_entries",
                newName: "IX_stock_entries_stock_adjustment_id");

            migrationBuilder.AddColumn<Guid>(
                name: "CompanyId",
                table: "stock_entries",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<bool>(
                name: "is_active",
                table: "stock_entries",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "is_reduction_entry",
                table: "stock_entries",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "is_sale_entry",
                table: "stock_entries",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<Guid>(
                name: "parent_stock_entry_id",
                table: "stock_entries",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "sales_bill_id",
                table: "stock_entries",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_stock_entries_CompanyId",
                table: "stock_entries",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_stock_entries_parent_stock_entry_id",
                table: "stock_entries",
                column: "parent_stock_entry_id");

            migrationBuilder.CreateIndex(
                name: "IX_stock_entries_sales_bill_id",
                table: "stock_entries",
                column: "sales_bill_id");

            migrationBuilder.AddForeignKey(
                name: "FK_stock_entries_Companies_CompanyId",
                table: "stock_entries",
                column: "CompanyId",
                principalTable: "Companies",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_stock_entries_sales_bills_sales_bill_id",
                table: "stock_entries",
                column: "sales_bill_id",
                principalTable: "sales_bills",
                principalColumn: "id");

            migrationBuilder.AddForeignKey(
                name: "FK_stock_entries_stock_adjustments_stock_adjustment_id",
                table: "stock_entries",
                column: "stock_adjustment_id",
                principalTable: "stock_adjustments",
                principalColumn: "id");

            migrationBuilder.AddForeignKey(
                name: "FK_stock_entries_stock_entries_parent_stock_entry_id",
                table: "stock_entries",
                column: "parent_stock_entry_id",
                principalTable: "stock_entries",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
