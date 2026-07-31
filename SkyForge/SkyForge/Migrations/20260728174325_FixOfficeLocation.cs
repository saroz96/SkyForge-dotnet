using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SkyForge.Migrations
{
    /// <inheritdoc />
    public partial class FixOfficeLocation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Only create the OfficeLocation table if it doesn't exist
            migrationBuilder.Sql(@"
                DO $$ 
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'OfficeLocation') THEN
                        CREATE TABLE ""OfficeLocation"" (
                            ""Id"" uuid NOT NULL,
                            ""CompanyAttendanceSettingsCompanyId"" uuid NOT NULL,
                            ""Name"" character varying(100) NOT NULL,
                            ""Coordinates_Lat"" double precision NULL,
                            ""Coordinates_Lng"" double precision NULL,
                            ""Radius"" integer NOT NULL,
                            ""Address"" character varying(500) NOT NULL,
                            ""IsActive"" boolean NOT NULL,
                            CONSTRAINT ""PK_OfficeLocation"" PRIMARY KEY (""CompanyAttendanceSettingsCompanyId"", ""Id""),
                            CONSTRAINT ""FK_OfficeLocation_Companies_CompanyAttendanceSettingsCompanyId"" 
                                FOREIGN KEY (""CompanyAttendanceSettingsCompanyId"") 
                                REFERENCES ""Companies"" (""Id"") ON DELETE CASCADE
                        );
                    END IF;
                END $$;
            ");

            // Add index for OfficeLocation
            migrationBuilder.Sql(@"
                DO $$ 
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IX_OfficeLocation_CompanyAttendanceSettingsCompanyId') THEN
                        CREATE INDEX ""IX_OfficeLocation_CompanyAttendanceSettingsCompanyId"" 
                        ON ""OfficeLocation"" (""CompanyAttendanceSettingsCompanyId"");
                    END IF;
                END $$;
            ");

            // Add OfficeLocation column to Companies if it doesn't exist
            // Note: EF Core handles this automatically through the complex type
            // No need to manually add columns - they are already in the Companies table
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "OfficeLocation");
        }
    }
}