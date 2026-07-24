using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SkyForge.Migrations
{
    public partial class AddCompanyIdToStockTables_Fixed : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // =============================================
            // 1. ADD COMPANY_ID TO item_closing_stock_by_fiscal_year
            // =============================================
            migrationBuilder.Sql(@"
                DO $$ 
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'item_closing_stock_by_fiscal_year' 
                        AND column_name = 'company_id'
                    ) THEN
                        ALTER TABLE ""item_closing_stock_by_fiscal_year"" 
                        ADD COLUMN ""company_id"" uuid;

                        -- Update existing rows with company_id from items table
                        UPDATE ""item_closing_stock_by_fiscal_year"" 
                        SET ""company_id"" = (
                            SELECT ""company_id"" 
                            FROM ""items"" 
                            WHERE ""items"".""id"" = ""item_closing_stock_by_fiscal_year"".""item_id""
                            LIMIT 1
                        );

                        -- Make column NOT NULL after data is populated
                        ALTER TABLE ""item_closing_stock_by_fiscal_year"" 
                        ALTER COLUMN ""company_id"" SET NOT NULL;

                        -- Create foreign key constraint (using ""Id"" with capital I)
                        ALTER TABLE ""item_closing_stock_by_fiscal_year"" 
                        ADD CONSTRAINT ""FK_item_closing_stock_by_fiscal_year_Companies_company_id"" 
                        FOREIGN KEY (""company_id"") 
                        REFERENCES ""Companies"" (""Id"") 
                        ON DELETE RESTRICT;

                        -- Create index
                        CREATE INDEX ""IX_item_closing_stock_by_fiscal_year_company_id"" 
                        ON ""item_closing_stock_by_fiscal_year"" (""company_id"");
                    END IF;
                END $$;
            ");

            // =============================================
            // 2. ADD COMPANY_ID TO item_initial_opening_stocks
            // =============================================
            migrationBuilder.Sql(@"
                DO $$ 
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'item_initial_opening_stocks' 
                        AND column_name = 'company_id'
                    ) THEN
                        ALTER TABLE ""item_initial_opening_stocks"" 
                        ADD COLUMN ""company_id"" uuid;

                        -- Update existing rows with company_id from items table
                        UPDATE ""item_initial_opening_stocks"" 
                        SET ""company_id"" = (
                            SELECT ""company_id"" 
                            FROM ""items"" 
                            WHERE ""items"".""id"" = ""item_initial_opening_stocks"".""item_id""
                            LIMIT 1
                        );

                        -- Make column NOT NULL after data is populated
                        ALTER TABLE ""item_initial_opening_stocks"" 
                        ALTER COLUMN ""company_id"" SET NOT NULL;

                        -- Create foreign key constraint (using ""Id"" with capital I)
                        ALTER TABLE ""item_initial_opening_stocks"" 
                        ADD CONSTRAINT ""FK_item_initial_opening_stocks_Companies_company_id"" 
                        FOREIGN KEY (""company_id"") 
                        REFERENCES ""Companies"" (""Id"") 
                        ON DELETE RESTRICT;

                        -- Create index
                        CREATE INDEX ""IX_item_initial_opening_stocks_company_id"" 
                        ON ""item_initial_opening_stocks"" (""company_id"");
                    END IF;
                END $$;
            ");

            // =============================================
            // 3. ADD COMPANY_ID TO item_opening_stock_by_fiscal_year
            // =============================================
            migrationBuilder.Sql(@"
                DO $$ 
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'item_opening_stock_by_fiscal_year' 
                        AND column_name = 'company_id'
                    ) THEN
                        ALTER TABLE ""item_opening_stock_by_fiscal_year"" 
                        ADD COLUMN ""company_id"" uuid;

                        -- Update existing rows with company_id from items table
                        UPDATE ""item_opening_stock_by_fiscal_year"" 
                        SET ""company_id"" = (
                            SELECT ""company_id"" 
                            FROM ""items"" 
                            WHERE ""items"".""id"" = ""item_opening_stock_by_fiscal_year"".""item_id""
                            LIMIT 1
                        );

                        -- Make column NOT NULL after data is populated
                        ALTER TABLE ""item_opening_stock_by_fiscal_year"" 
                        ALTER COLUMN ""company_id"" SET NOT NULL;

                        -- Create foreign key constraint (using ""Id"" with capital I)
                        ALTER TABLE ""item_opening_stock_by_fiscal_year"" 
                        ADD CONSTRAINT ""FK_item_opening_stock_by_fiscal_year_Companies_company_id"" 
                        FOREIGN KEY (""company_id"") 
                        REFERENCES ""Companies"" (""Id"") 
                        ON DELETE RESTRICT;

                        -- Create index
                        CREATE INDEX ""IX_item_opening_stock_by_fiscal_year_company_id"" 
                        ON ""item_opening_stock_by_fiscal_year"" (""company_id"");
                    END IF;
                END $$;
            ");

            // =============================================
            // 4. ADD ANY MISSING COLUMNS TO items TABLE
            // =============================================
            migrationBuilder.Sql(@"
                DO $$ 
                BEGIN
                    -- Add original_fiscal_year_id if missing
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'items' 
                        AND column_name = 'original_fiscal_year_id'
                    ) THEN
                        ALTER TABLE ""items"" 
                        ADD COLUMN ""original_fiscal_year_id"" uuid;
                        
                        ALTER TABLE ""items"" 
                        ADD CONSTRAINT ""FK_items_FiscalYears_original_fiscal_year_id"" 
                        FOREIGN KEY (""original_fiscal_year_id"") 
                        REFERENCES ""FiscalYears"" (""Id"") 
                        ON DELETE SET NULL;
                    END IF;

                    -- Add NepaliDate if missing
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'items' 
                        AND column_name = 'NepaliDate'
                    ) THEN
                        ALTER TABLE ""items"" 
                        ADD COLUMN ""NepaliDate"" text;
                    END IF;

                    -- Add date column if missing
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'items' 
                        AND column_name = 'date'
                    ) THEN
                        ALTER TABLE ""items"" 
                        ADD COLUMN ""date"" timestamp without time zone DEFAULT CURRENT_TIMESTAMP;
                    END IF;
                END $$;
            ");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                DO $$ 
                BEGIN
                    -- Drop foreign key constraints
                    ALTER TABLE ""item_closing_stock_by_fiscal_year"" 
                    DROP CONSTRAINT IF EXISTS ""FK_item_closing_stock_by_fiscal_year_Companies_company_id"";
                    
                    ALTER TABLE ""item_initial_opening_stocks"" 
                    DROP CONSTRAINT IF EXISTS ""FK_item_initial_opening_stocks_Companies_company_id"";
                    
                    ALTER TABLE ""item_opening_stock_by_fiscal_year"" 
                    DROP CONSTRAINT IF EXISTS ""FK_item_opening_stock_by_fiscal_year_Companies_company_id"";
                    
                    ALTER TABLE ""items"" 
                    DROP CONSTRAINT IF EXISTS ""FK_items_FiscalYears_original_fiscal_year_id"";

                    -- Drop indexes
                    DROP INDEX IF EXISTS ""IX_item_closing_stock_by_fiscal_year_company_id"";
                    DROP INDEX IF EXISTS ""IX_item_initial_opening_stocks_company_id"";
                    DROP INDEX IF EXISTS ""IX_item_opening_stock_by_fiscal_year_company_id"";

                    -- Drop columns
                    ALTER TABLE ""item_closing_stock_by_fiscal_year"" 
                    DROP COLUMN IF EXISTS ""company_id"";
                    
                    ALTER TABLE ""item_initial_opening_stocks"" 
                    DROP COLUMN IF EXISTS ""company_id"";
                    
                    ALTER TABLE ""item_opening_stock_by_fiscal_year"" 
                    DROP COLUMN IF EXISTS ""company_id"";

                    ALTER TABLE ""items"" 
                    DROP COLUMN IF EXISTS ""original_fiscal_year_id"";
                    
                    ALTER TABLE ""items"" 
                    DROP COLUMN IF EXISTS ""NepaliDate"";
                END $$;
            ");
        }
    }
}