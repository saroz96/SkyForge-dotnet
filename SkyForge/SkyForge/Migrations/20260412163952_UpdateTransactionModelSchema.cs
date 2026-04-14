using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SkyForge.Migrations
{
    /// <inheritdoc />
    public partial class UpdateTransactionModelSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Transactions_Accounts_AccountTypeId",
                table: "Transactions");

            migrationBuilder.DropForeignKey(
                name: "FK_Transactions_MainUnits_MainUnitId",
                table: "Transactions");

            migrationBuilder.DropForeignKey(
                name: "FK_Transactions_Units_UnitId",
                table: "Transactions");

            migrationBuilder.DropForeignKey(
                name: "FK_Transactions_items_ItemId",
                table: "Transactions");

            migrationBuilder.DropIndex(
                name: "IX_Transactions_AccountTypeId",
                table: "Transactions");

            migrationBuilder.DropIndex(
                name: "IX_Transactions_ItemId",
                table: "Transactions");

            migrationBuilder.DropIndex(
                name: "IX_Transactions_MainUnitId",
                table: "Transactions");

            migrationBuilder.DropIndex(
                name: "IX_Transactions_UnitId",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "AccountTypeId",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "Balance",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "Bonus",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "Credit",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "Debit",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "DiscountAmountPerItem",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "DiscountPercentagePerItem",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "ItemId",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "MainUnitId",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "NetPrice",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "PuPrice",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "Quantity",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "SalesBillNumber",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "UnitId",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "WSUnit",
                table: "Transactions");

            migrationBuilder.RenameColumn(
                name: "Price",
                table: "Transactions",
                newName: "TotalDebit");

            migrationBuilder.RenameColumn(
                name: "NetPuPrice",
                table: "Transactions",
                newName: "TotalCredit");

            migrationBuilder.AlterColumn<decimal>(
                name: "VatPercentage",
                table: "Transactions",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric",
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "VatAmount",
                table: "Transactions",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "DrCrNoteAccountTypes",
                table: "Transactions",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(500)",
                oldMaxLength: 500,
                oldNullable: true);

            migrationBuilder.CreateTable(
                name: "transaction_items",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TransactionId = table.Column<Guid>(type: "uuid", nullable: false),
                    ItemId = table.Column<Guid>(type: "uuid", nullable: true),
                    UnitId = table.Column<Guid>(type: "uuid", nullable: true),
                    WSUnit = table.Column<int>(type: "integer", nullable: true),
                    Quantity = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: true),
                    Bonus = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: true),
                    Price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    PuPrice = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    DiscountPercentagePerItem = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    DiscountAmountPerItem = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    NetPuPrice = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    taxable_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    VatPercentage = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    VatAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    Debit = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Credit = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_transaction_items", x => x.Id);
                    table.ForeignKey(
                        name: "FK_transaction_items_Transactions_TransactionId",
                        column: x => x.TransactionId,
                        principalTable: "Transactions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_transaction_items_Units_UnitId",
                        column: x => x.UnitId,
                        principalTable: "Units",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_transaction_items_items_ItemId",
                        column: x => x.ItemId,
                        principalTable: "items",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_transaction_items_CreatedAt",
                table: "transaction_items",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_transaction_items_ItemId",
                table: "transaction_items",
                column: "ItemId");

            migrationBuilder.CreateIndex(
                name: "IX_transaction_items_TransactionId",
                table: "transaction_items",
                column: "TransactionId");

            migrationBuilder.CreateIndex(
                name: "IX_transaction_items_TransactionId_ItemId",
                table: "transaction_items",
                columns: new[] { "TransactionId", "ItemId" });

            migrationBuilder.CreateIndex(
                name: "IX_transaction_items_UnitId",
                table: "transaction_items",
                column: "UnitId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "transaction_items");

            migrationBuilder.RenameColumn(
                name: "TotalDebit",
                table: "Transactions",
                newName: "Price");

            migrationBuilder.RenameColumn(
                name: "TotalCredit",
                table: "Transactions",
                newName: "NetPuPrice");

            migrationBuilder.AlterColumn<decimal>(
                name: "VatPercentage",
                table: "Transactions",
                type: "numeric",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,2)",
                oldPrecision: 18,
                oldScale: 2,
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "VatAmount",
                table: "Transactions",
                type: "numeric",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,2)",
                oldPrecision: 18,
                oldScale: 2,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "DrCrNoteAccountTypes",
                table: "Transactions",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(2000)",
                oldMaxLength: 2000,
                oldNullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "AccountTypeId",
                table: "Transactions",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Balance",
                table: "Transactions",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Bonus",
                table: "Transactions",
                type: "numeric(18,4)",
                precision: 18,
                scale: 4,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Credit",
                table: "Transactions",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "Debit",
                table: "Transactions",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "DiscountAmountPerItem",
                table: "Transactions",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "DiscountPercentagePerItem",
                table: "Transactions",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<Guid>(
                name: "ItemId",
                table: "Transactions",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "MainUnitId",
                table: "Transactions",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "NetPrice",
                table: "Transactions",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "PuPrice",
                table: "Transactions",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Quantity",
                table: "Transactions",
                type: "numeric(18,4)",
                precision: 18,
                scale: 4,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SalesBillNumber",
                table: "Transactions",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "UnitId",
                table: "Transactions",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "WSUnit",
                table: "Transactions",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_AccountTypeId",
                table: "Transactions",
                column: "AccountTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_ItemId",
                table: "Transactions",
                column: "ItemId");

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_MainUnitId",
                table: "Transactions",
                column: "MainUnitId");

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_UnitId",
                table: "Transactions",
                column: "UnitId");

            migrationBuilder.AddForeignKey(
                name: "FK_Transactions_Accounts_AccountTypeId",
                table: "Transactions",
                column: "AccountTypeId",
                principalTable: "Accounts",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Transactions_MainUnits_MainUnitId",
                table: "Transactions",
                column: "MainUnitId",
                principalTable: "MainUnits",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Transactions_Units_UnitId",
                table: "Transactions",
                column: "UnitId",
                principalTable: "Units",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Transactions_items_ItemId",
                table: "Transactions",
                column: "ItemId",
                principalTable: "items",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
