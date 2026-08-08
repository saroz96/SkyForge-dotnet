using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SkyForge.Migrations
{
    /// <inheritdoc />
    public partial class AddCashSettlementToTransactions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Add cash settlement columns to Transactions table
            migrationBuilder.AddColumn<string>(
                name: "cash_settlement_status",
                table: "Transactions",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "cash_settlement_date",
                table: "Transactions",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "cash_settlement_user_id",
                table: "Transactions",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "cash_settlement_remarks",
                table: "Transactions",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            // Add foreign key to Users table
            migrationBuilder.CreateIndex(
                name: "IX_Transactions_cash_settlement_user_id",
                table: "Transactions",
                column: "cash_settlement_user_id");

            migrationBuilder.AddForeignKey(
                name: "FK_Transactions_Users_cash_settlement_user_id",
                table: "Transactions",
                column: "cash_settlement_user_id",
                principalTable: "Users",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Drop foreign key first
            migrationBuilder.DropForeignKey(
                name: "FK_Transactions_Users_cash_settlement_user_id",
                table: "Transactions");

            // Drop index
            migrationBuilder.DropIndex(
                name: "IX_Transactions_cash_settlement_user_id",
                table: "Transactions");

            // Drop columns
            migrationBuilder.DropColumn(
                name: "cash_settlement_status",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "cash_settlement_date",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "cash_settlement_user_id",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "cash_settlement_remarks",
                table: "Transactions");
        }
    }
}