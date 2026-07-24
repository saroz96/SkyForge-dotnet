using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SkyForge.Migrations
{
    public partial class AddItemNumberSequenceFunctions : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                CREATE OR REPLACE FUNCTION get_next_item_number(p_company_id UUID)
                RETURNS INTEGER AS $$
                DECLARE
                    seq_name TEXT;
                    next_val INTEGER;
                BEGIN
                    seq_name := 'item_seq_' || REPLACE(p_company_id::TEXT, '-', '_');
                    EXECUTE format('CREATE SEQUENCE IF NOT EXISTS %I START 1000 INCREMENT 1 MINVALUE 1000 MAXVALUE 999999 CYCLE', seq_name);
                    EXECUTE format('SELECT nextval(%L)', seq_name) INTO next_val;
                    RETURN next_val;
                END;
                $$ LANGUAGE plpgsql;

                CREATE OR REPLACE FUNCTION get_next_barcode_number(p_company_id UUID)
                RETURNS BIGINT AS $$
                DECLARE
                    seq_name TEXT;
                    next_val BIGINT;
                BEGIN
                    seq_name := 'barcode_seq_' || REPLACE(p_company_id::TEXT, '-', '_');
                    EXECUTE format('CREATE SEQUENCE IF NOT EXISTS %I START 1000000000 INCREMENT 1 MINVALUE 1000000000 MAXVALUE 9999999999 CYCLE', seq_name);
                    EXECUTE format('SELECT nextval(%L)', seq_name) INTO next_val;
                    RETURN next_val;
                END;
                $$ LANGUAGE plpgsql;

                CREATE OR REPLACE FUNCTION set_item_unique_number()
                RETURNS TRIGGER AS $$
                BEGIN
                    IF NEW.unique_number IS NULL OR NEW.unique_number = 0 THEN
                        NEW.unique_number := get_next_item_number(NEW.company_id);
                    END IF;
                    
                    IF NEW.barcode_number IS NULL OR NEW.barcode_number = 0 THEN
                        NEW.barcode_number := get_next_barcode_number(NEW.company_id);
                    END IF;
                    
                    RETURN NEW;
                END;
                $$ LANGUAGE plpgsql;

                DROP TRIGGER IF EXISTS trigger_set_item_unique_number ON items;
                
                CREATE TRIGGER trigger_set_item_unique_number
                BEFORE INSERT ON items
                FOR EACH ROW
                EXECUTE FUNCTION set_item_unique_number();
            ");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                DROP TRIGGER IF EXISTS trigger_set_item_unique_number ON items;
                DROP FUNCTION IF EXISTS set_item_unique_number();
                DROP FUNCTION IF EXISTS get_next_item_number(UUID);
                DROP FUNCTION IF EXISTS get_next_barcode_number(UUID);
            ");
        }
    }
}