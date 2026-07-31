using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SkyForge.Migrations
{
    /// <inheritdoc />
    public partial class MoveOfficeLocationsToJsonNew : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Check if OfficeLocation table exists before dropping
            migrationBuilder.Sql(@"
                DO $$ 
                BEGIN
                    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'OfficeLocation') THEN
                        DROP TABLE ""OfficeLocation"" CASCADE;
                    END IF;
                END $$;
            ");

            // Add OfficeLocations column to Companies table if it doesn't exist
            migrationBuilder.Sql(@"
                DO $$ 
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'Companies' AND column_name = 'OfficeLocations'
                    ) THEN
                        ALTER TABLE ""Companies"" ADD COLUMN ""OfficeLocations"" jsonb DEFAULT '[]'::jsonb;
                    END IF;
                END $$;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Remove the OfficeLocations column
            migrationBuilder.Sql(@"
                DO $$ 
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'Companies' AND column_name = 'OfficeLocations'
                    ) THEN
                        ALTER TABLE ""Companies"" DROP COLUMN ""OfficeLocations"";
                    END IF;
                END $$;
            ");
        }
    }
}