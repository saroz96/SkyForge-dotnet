using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SkyForge.Migrations
{
    /// <inheritdoc />
    public partial class UpdateCreditNoteToUnifiedEntries : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CreditNoteCreditEntries");

            migrationBuilder.DropTable(
                name: "CreditNoteDebitEntries");

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                table: "CreditNotes",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(500)",
                oldMaxLength: 500);

            migrationBuilder.AlterColumn<string>(
                name: "BillNumber",
                table: "CreditNotes",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50);

            migrationBuilder.AddColumn<decimal>(
                name: "TotalAmount",
                table: "CreditNotes",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<DateTime>(
                name: "nepali_date",
                table: "CreditNotes",
                type: "timestamp without time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.CreateTable(
                name: "CreditNoteEntries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CreditNoteId = table.Column<Guid>(type: "uuid", nullable: false),
                    AccountId = table.Column<Guid>(type: "uuid", nullable: false),
                    EntryType = table.Column<string>(type: "varchar(10)", maxLength: 10, nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    LineNumber = table.Column<int>(type: "integer", nullable: false),
                    ReferenceNumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CreditNoteEntries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CreditNoteEntries_Accounts_AccountId",
                        column: x => x.AccountId,
                        principalTable: "Accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CreditNoteEntries_CreditNotes_CreditNoteId",
                        column: x => x.CreditNoteId,
                        principalTable: "CreditNotes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CreditNotes_BillNumber",
                table: "CreditNotes",
                column: "BillNumber");

            migrationBuilder.CreateIndex(
                name: "IX_CreditNotes_CompanyId_FiscalYearId_BillNumber",
                table: "CreditNotes",
                columns: new[] { "CompanyId", "FiscalYearId", "BillNumber" });

            migrationBuilder.CreateIndex(
                name: "IX_CreditNotes_CompanyId_Status_IsActive",
                table: "CreditNotes",
                columns: new[] { "CompanyId", "Status", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_CreditNotes_nepali_date",
                table: "CreditNotes",
                column: "nepali_date");

            migrationBuilder.CreateIndex(
                name: "IX_CreditNoteEntries_AccountId",
                table: "CreditNoteEntries",
                column: "AccountId");

            migrationBuilder.CreateIndex(
                name: "IX_CreditNoteEntries_CreatedAt",
                table: "CreditNoteEntries",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_CreditNoteEntries_CreditNoteId_AccountId_EntryType",
                table: "CreditNoteEntries",
                columns: new[] { "CreditNoteId", "AccountId", "EntryType" });

            migrationBuilder.CreateIndex(
                name: "IX_CreditNoteEntries_EntryType_Amount",
                table: "CreditNoteEntries",
                columns: new[] { "EntryType", "Amount" });

            migrationBuilder.CreateIndex(
                name: "IX_CreditNoteEntries_LineNumber",
                table: "CreditNoteEntries",
                column: "LineNumber");

            migrationBuilder.CreateIndex(
                name: "IX_CreditNoteEntries_Note_Type",
                table: "CreditNoteEntries",
                columns: new[] { "CreditNoteId", "EntryType" });

            migrationBuilder.CreateIndex(
                name: "IX_CreditNoteEntries_UpdatedAt",
                table: "CreditNoteEntries",
                column: "UpdatedAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CreditNoteEntries");

            migrationBuilder.DropIndex(
                name: "IX_CreditNotes_BillNumber",
                table: "CreditNotes");

            migrationBuilder.DropIndex(
                name: "IX_CreditNotes_CompanyId_FiscalYearId_BillNumber",
                table: "CreditNotes");

            migrationBuilder.DropIndex(
                name: "IX_CreditNotes_CompanyId_Status_IsActive",
                table: "CreditNotes");

            migrationBuilder.DropIndex(
                name: "IX_CreditNotes_nepali_date",
                table: "CreditNotes");

            migrationBuilder.DropColumn(
                name: "TotalAmount",
                table: "CreditNotes");

            migrationBuilder.DropColumn(
                name: "nepali_date",
                table: "CreditNotes");

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                table: "CreditNotes",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "character varying(1000)",
                oldMaxLength: 1000,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "BillNumber",
                table: "CreditNotes",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100);

            migrationBuilder.CreateTable(
                name: "CreditNoteCreditEntries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AccountId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreditNoteId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    Credit = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CreditNoteCreditEntries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CreditNoteCreditEntries_Accounts_AccountId",
                        column: x => x.AccountId,
                        principalTable: "Accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CreditNoteCreditEntries_CreditNotes_CreditNoteId",
                        column: x => x.CreditNoteId,
                        principalTable: "CreditNotes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CreditNoteDebitEntries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AccountId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreditNoteId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    Debit = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CreditNoteDebitEntries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CreditNoteDebitEntries_Accounts_AccountId",
                        column: x => x.AccountId,
                        principalTable: "Accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CreditNoteDebitEntries_CreditNotes_CreditNoteId",
                        column: x => x.CreditNoteId,
                        principalTable: "CreditNotes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CreditNoteCreditEntries_AccountId",
                table: "CreditNoteCreditEntries",
                column: "AccountId");

            migrationBuilder.CreateIndex(
                name: "IX_CreditNoteCreditEntries_CreditNoteId",
                table: "CreditNoteCreditEntries",
                column: "CreditNoteId");

            migrationBuilder.CreateIndex(
                name: "IX_CreditNoteDebitEntries_AccountId",
                table: "CreditNoteDebitEntries",
                column: "AccountId");

            migrationBuilder.CreateIndex(
                name: "IX_CreditNoteDebitEntries_CreditNoteId",
                table: "CreditNoteDebitEntries",
                column: "CreditNoteId");
        }
    }
}
