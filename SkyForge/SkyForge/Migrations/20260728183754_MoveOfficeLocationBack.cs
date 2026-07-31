using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SkyForge.Migrations
{
    /// <inheritdoc />
    public partial class MoveOfficeLocationBack : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "OfficeLocations",
                table: "Companies");

            migrationBuilder.CreateTable(
                name: "OfficeLocation",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CompanyAttendanceSettingsCompanyId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Coordinates_Lat = table.Column<double>(type: "double precision", nullable: true),
                    Coordinates_Lng = table.Column<double>(type: "double precision", nullable: true),
                    Radius = table.Column<int>(type: "integer", nullable: false),
                    Address = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OfficeLocation", x => new { x.CompanyAttendanceSettingsCompanyId, x.Id });
                    table.ForeignKey(
                        name: "FK_OfficeLocation_Companies_CompanyAttendanceSettingsCompanyId",
                        column: x => x.CompanyAttendanceSettingsCompanyId,
                        principalTable: "Companies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "OfficeLocation");

            migrationBuilder.AddColumn<string>(
                name: "OfficeLocations",
                table: "Companies",
                type: "jsonb",
                nullable: false,
                defaultValueSql: "'[]'::jsonb");
        }
    }
}
