using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SkyForge.Migrations
{
    /// <inheritdoc />
    public partial class UpdateReceiptTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Receipts_AccountGroups_AccountGroupId",
                table: "Receipts");

            migrationBuilder.DropForeignKey(
                name: "FK_Receipts_Accounts_AccountId",
                table: "Receipts");

            migrationBuilder.DropForeignKey(
                name: "FK_Receipts_Accounts_ReceiptAccountId",
                table: "Receipts");

            migrationBuilder.DropIndex(
                name: "IX_Receipts_AccountGroupId",
                table: "Receipts");

            migrationBuilder.DropIndex(
                name: "IX_Receipts_AccountId",
                table: "Receipts");

            migrationBuilder.DropIndex(
                name: "IX_Receipts_BankAcc",
                table: "Receipts");

            migrationBuilder.DropIndex(
                name: "IX_Receipts_InstNo",
                table: "Receipts");

            migrationBuilder.DropIndex(
                name: "IX_Receipts_InstType",
                table: "Receipts");

            migrationBuilder.DropIndex(
                name: "IX_Receipts_InstType_Status",
                table: "Receipts");

            migrationBuilder.DropIndex(
                name: "IX_Receipts_ReceiptAccountId",
                table: "Receipts");

            migrationBuilder.DropColumn(
                name: "AccountGroupId",
                table: "Receipts");

            migrationBuilder.DropColumn(
                name: "AccountId",
                table: "Receipts");

            migrationBuilder.DropColumn(
                name: "BankAcc",
                table: "Receipts");

            migrationBuilder.DropColumn(
                name: "Credit",
                table: "Receipts");

            migrationBuilder.DropColumn(
                name: "InstNo",
                table: "Receipts");

            migrationBuilder.DropColumn(
                name: "InstType",
                table: "Receipts");

            migrationBuilder.DropColumn(
                name: "ReceiptAccountId",
                table: "Receipts");

            migrationBuilder.RenameColumn(
                name: "Debit",
                table: "Receipts",
                newName: "TotalAmount");

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                table: "Receipts",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(500)",
                oldMaxLength: 500);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                table: "Receipts",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ReceiptEntries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ReceiptId = table.Column<Guid>(type: "uuid", nullable: false),
                    AccountId = table.Column<Guid>(type: "uuid", nullable: false),
                    EntryType = table.Column<string>(type: "varchar(10)", maxLength: 10, nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    InstType = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: true),
                    BankAcc = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    InstNo = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ReferenceNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReceiptEntries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ReceiptEntries_Accounts_AccountId",
                        column: x => x.AccountId,
                        principalTable: "Accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ReceiptEntries_Receipts_ReceiptId",
                        column: x => x.ReceiptId,
                        principalTable: "Receipts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Receipts_BillNumber",
                table: "Receipts",
                column: "BillNumber");

            migrationBuilder.CreateIndex(
                name: "IX_Receipts_CompanyId_FiscalYearId_BillNumber",
                table: "Receipts",
                columns: new[] { "CompanyId", "FiscalYearId", "BillNumber" });

            migrationBuilder.CreateIndex(
                name: "IX_ReceiptEntries_AccountId",
                table: "ReceiptEntries",
                column: "AccountId");

            migrationBuilder.CreateIndex(
                name: "IX_ReceiptEntries_AccountId_EntryType",
                table: "ReceiptEntries",
                columns: new[] { "AccountId", "EntryType" });

            migrationBuilder.CreateIndex(
                name: "IX_ReceiptEntries_CreatedAt",
                table: "ReceiptEntries",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_ReceiptEntries_EntryType",
                table: "ReceiptEntries",
                column: "EntryType");

            migrationBuilder.CreateIndex(
                name: "IX_ReceiptEntries_EntryType_Amount",
                table: "ReceiptEntries",
                columns: new[] { "EntryType", "Amount" });

            migrationBuilder.CreateIndex(
                name: "IX_ReceiptEntries_InstType",
                table: "ReceiptEntries",
                column: "InstType");

            migrationBuilder.CreateIndex(
                name: "IX_ReceiptEntries_InstType_BankAcc",
                table: "ReceiptEntries",
                columns: new[] { "InstType", "BankAcc" });

            migrationBuilder.CreateIndex(
                name: "IX_ReceiptEntries_ReceiptId",
                table: "ReceiptEntries",
                column: "ReceiptId");

            migrationBuilder.CreateIndex(
                name: "IX_ReceiptEntries_ReceiptId_AccountId_EntryType",
                table: "ReceiptEntries",
                columns: new[] { "ReceiptId", "AccountId", "EntryType" });

            migrationBuilder.CreateIndex(
                name: "IX_ReceiptEntries_ReceiptId_EntryType",
                table: "ReceiptEntries",
                columns: new[] { "ReceiptId", "EntryType" });

            migrationBuilder.CreateIndex(
                name: "IX_ReceiptEntries_ReferenceNumber",
                table: "ReceiptEntries",
                column: "ReferenceNumber");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ReceiptEntries");

            migrationBuilder.DropIndex(
                name: "IX_Receipts_BillNumber",
                table: "Receipts");

            migrationBuilder.DropIndex(
                name: "IX_Receipts_CompanyId_FiscalYearId_BillNumber",
                table: "Receipts");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                table: "Receipts");

            migrationBuilder.RenameColumn(
                name: "TotalAmount",
                table: "Receipts",
                newName: "Debit");

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                table: "Receipts",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "character varying(500)",
                oldMaxLength: 500,
                oldNullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "AccountGroupId",
                table: "Receipts",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "AccountId",
                table: "Receipts",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BankAcc",
                table: "Receipts",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "Credit",
                table: "Receipts",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "InstNo",
                table: "Receipts",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "InstType",
                table: "Receipts",
                type: "varchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<Guid>(
                name: "ReceiptAccountId",
                table: "Receipts",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Receipts_AccountGroupId",
                table: "Receipts",
                column: "AccountGroupId");

            migrationBuilder.CreateIndex(
                name: "IX_Receipts_AccountId",
                table: "Receipts",
                column: "AccountId");

            migrationBuilder.CreateIndex(
                name: "IX_Receipts_BankAcc",
                table: "Receipts",
                column: "BankAcc");

            migrationBuilder.CreateIndex(
                name: "IX_Receipts_InstNo",
                table: "Receipts",
                column: "InstNo");

            migrationBuilder.CreateIndex(
                name: "IX_Receipts_InstType",
                table: "Receipts",
                column: "InstType");

            migrationBuilder.CreateIndex(
                name: "IX_Receipts_InstType_Status",
                table: "Receipts",
                columns: new[] { "InstType", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_Receipts_ReceiptAccountId",
                table: "Receipts",
                column: "ReceiptAccountId");

            migrationBuilder.AddForeignKey(
                name: "FK_Receipts_AccountGroups_AccountGroupId",
                table: "Receipts",
                column: "AccountGroupId",
                principalTable: "AccountGroups",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Receipts_Accounts_AccountId",
                table: "Receipts",
                column: "AccountId",
                principalTable: "Accounts",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Receipts_Accounts_ReceiptAccountId",
                table: "Receipts",
                column: "ReceiptAccountId",
                principalTable: "Accounts",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
