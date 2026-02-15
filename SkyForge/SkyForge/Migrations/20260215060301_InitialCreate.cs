using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace SkyForge.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Roles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Description = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    PermissionLevel = table.Column<int>(type: "integer", nullable: false),
                    DefaultPermissions = table.Column<string>(type: "jsonb", nullable: false),
                    IsSystemRole = table.Column<bool>(type: "boolean", nullable: false),
                    IsAssignable = table.Column<bool>(type: "boolean", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Roles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AccountGroups",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    UniqueNumber = table.Column<int>(type: "integer", nullable: true),
                    PrimaryGroup = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    Type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    CompanyId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AccountGroups", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Accounts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Address = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Ward = table.Column<int>(type: "integer", nullable: true),
                    Phone = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    Pan = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    ContactPerson = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Email = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    UniqueNumber = table.Column<int>(type: "integer", nullable: true),
                    CreditLimit = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    OpeningBalanceType = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: false),
                    OpeningBalanceDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    OpeningBalanceDateNepali = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    AccountGroupsId = table.Column<Guid>(type: "uuid", nullable: false),
                    CompanyId = table.Column<Guid>(type: "uuid", nullable: false),
                    OriginalFiscalYearId = table.Column<Guid>(type: "uuid", nullable: true),
                    DefaultCashAccount = table.Column<bool>(type: "boolean", nullable: false),
                    DefaultVatAccount = table.Column<bool>(type: "boolean", nullable: false),
                    IsDefaultAccount = table.Column<bool>(type: "boolean", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Accounts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Accounts_AccountGroups_AccountGroupsId",
                        column: x => x.AccountGroupsId,
                        principalTable: "AccountGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "barcode_preferences",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    label_width = table.Column<int>(type: "integer", nullable: false),
                    label_height = table.Column<int>(type: "integer", nullable: false),
                    labels_per_row = table.Column<int>(type: "integer", nullable: false),
                    barcode_type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    default_quantity = table.Column<int>(type: "integer", nullable: false),
                    save_settings = table.Column<bool>(type: "boolean", nullable: false),
                    include_item_name = table.Column<bool>(type: "boolean", nullable: false),
                    include_price = table.Column<bool>(type: "boolean", nullable: false),
                    include_batch = table.Column<bool>(type: "boolean", nullable: false),
                    include_expiry = table.Column<bool>(type: "boolean", nullable: false),
                    font_size = table.Column<int>(type: "integer", nullable: false),
                    border = table.Column<bool>(type: "boolean", nullable: false),
                    paper_size = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    orientation = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    margin = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_barcode_preferences", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "BillCounters",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CompanyId = table.Column<Guid>(type: "uuid", nullable: false),
                    FiscalYearId = table.Column<Guid>(type: "uuid", nullable: false),
                    TransactionType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    CurrentBillNumber = table.Column<long>(type: "bigint", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BillCounters", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Categories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    UniqueNumber = table.Column<int>(type: "integer", nullable: true),
                    CompanyId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "timezone('utc', now())"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Categories", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ClosingBalanceByFiscalYear",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Date = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    Type = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: false),
                    FiscalYearId = table.Column<Guid>(type: "uuid", nullable: false),
                    AccountId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClosingBalanceByFiscalYear", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ClosingBalanceByFiscalYear_Accounts_AccountId",
                        column: x => x.AccountId,
                        principalTable: "Accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Companies",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Address = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Country = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    State = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    City = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Pan = table.Column<string>(type: "character varying(9)", maxLength: 9, nullable: false),
                    Phone = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Ward = table.Column<int>(type: "integer", nullable: true),
                    Email = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    TradeType = table.Column<string>(type: "varchar(50)", nullable: false),
                    OwnerId = table.Column<Guid>(type: "uuid", nullable: false),
                    DateFormat = table.Column<string>(type: "varchar(20)", nullable: true),
                    RenewalDate = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    FiscalYearStartDate = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    VatEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    StoreManagement = table.Column<bool>(type: "boolean", nullable: false),
                    NotificationEmails = table.Column<string>(type: "jsonb", nullable: false, defaultValueSql: "'[]'::jsonb"),
                    AttendanceSettings_GeoFencingEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    AttendanceSettings_WorkingHours_StartTime = table.Column<string>(type: "text", nullable: false),
                    AttendanceSettings_WorkingHours_EndTime = table.Column<string>(type: "text", nullable: false),
                    AttendanceSettings_WorkingHours_GracePeriod = table.Column<int>(type: "integer", nullable: false),
                    AttendanceSettings_AutoClockOut_Enabled = table.Column<bool>(type: "boolean", nullable: false),
                    AttendanceSettings_AutoClockOut_Time = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Companies", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "compositions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    unique_number = table.Column<int>(type: "integer", nullable: false),
                    company_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_compositions", x => x.id);
                    table.ForeignKey(
                        name: "FK_compositions_Companies_company_id",
                        column: x => x.company_id,
                        principalTable: "Companies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "FiscalYears",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    StartDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    EndDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    StartDateNepali = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    EndDateNepali = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    DateFormat = table.Column<string>(type: "varchar(20)", nullable: false),
                    CompanyId = table.Column<Guid>(type: "uuid", nullable: false),
                    BillPrefixes_Sales = table.Column<string>(type: "character varying(4)", maxLength: 4, nullable: true),
                    BillPrefixes_SalesQuotation = table.Column<string>(type: "character varying(4)", maxLength: 4, nullable: true),
                    BillPrefixes_SalesReturn = table.Column<string>(type: "character varying(4)", maxLength: 4, nullable: true),
                    BillPrefixes_Purchase = table.Column<string>(type: "character varying(4)", maxLength: 4, nullable: true),
                    BillPrefixes_PurchaseReturn = table.Column<string>(type: "character varying(4)", maxLength: 4, nullable: true),
                    BillPrefixes_Payment = table.Column<string>(type: "character varying(4)", maxLength: 4, nullable: true),
                    BillPrefixes_Receipt = table.Column<string>(type: "character varying(4)", maxLength: 4, nullable: true),
                    BillPrefixes_StockAdjustment = table.Column<string>(type: "character varying(4)", maxLength: 4, nullable: true),
                    BillPrefixes_DebitNote = table.Column<string>(type: "character varying(4)", maxLength: 4, nullable: true),
                    BillPrefixes_CreditNote = table.Column<string>(type: "character varying(4)", maxLength: 4, nullable: true),
                    BillPrefixes_JournalVoucher = table.Column<string>(type: "character varying(4)", maxLength: 4, nullable: true),
                    AccountId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FiscalYears", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FiscalYears_Accounts_AccountId",
                        column: x => x.AccountId,
                        principalTable: "Accounts",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_FiscalYears_Companies_CompanyId",
                        column: x => x.CompanyId,
                        principalTable: "Companies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ItemCompanies",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    UniqueNumber = table.Column<int>(type: "integer", nullable: true),
                    CompanyId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "timezone('utc', now())"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ItemCompanies", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ItemCompanies_Companies_CompanyId",
                        column: x => x.CompanyId,
                        principalTable: "Companies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "MainUnits",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    UniqueNumber = table.Column<int>(type: "integer", nullable: true),
                    CompanyId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "timezone('utc', now())"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MainUnits", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MainUnits_Companies_CompanyId",
                        column: x => x.CompanyId,
                        principalTable: "Companies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "OfficeLocation",
                columns: table => new
                {
                    CompanyAttendanceSettingsCompanyId = table.Column<Guid>(type: "uuid", nullable: false),
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
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

            migrationBuilder.CreateTable(
                name: "Stores",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CompanyId = table.Column<Guid>(type: "uuid", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "timezone('utc', now())"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Stores", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Stores_Companies_CompanyId",
                        column: x => x.CompanyId,
                        principalTable: "Companies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Units",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    UniqueNumber = table.Column<int>(type: "integer", nullable: true),
                    CompanyId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "timezone('utc', now())"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Units", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Units_Companies_CompanyId",
                        column: x => x.CompanyId,
                        principalTable: "Companies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "InitialOpeningBalances",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    InitialFiscalYearId = table.Column<Guid>(type: "uuid", nullable: true),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    Type = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: false),
                    Date = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    AccountId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InitialOpeningBalances", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InitialOpeningBalances_Accounts_AccountId",
                        column: x => x.AccountId,
                        principalTable: "Accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_InitialOpeningBalances_FiscalYears_InitialFiscalYearId",
                        column: x => x.InitialFiscalYearId,
                        principalTable: "FiscalYears",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "OpeningBalanceByFiscalYear",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Date = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    Type = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: false),
                    FiscalYearId = table.Column<Guid>(type: "uuid", nullable: false),
                    AccountId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OpeningBalanceByFiscalYear", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OpeningBalanceByFiscalYear_Accounts_AccountId",
                        column: x => x.AccountId,
                        principalTable: "Accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_OpeningBalanceByFiscalYear_FiscalYears_FiscalYearId",
                        column: x => x.FiscalYearId,
                        principalTable: "FiscalYears",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "OpeningBalances",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FiscalYearId = table.Column<Guid>(type: "uuid", nullable: true),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    Type = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: false),
                    Date = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    DateNepali = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    AccountId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OpeningBalances", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OpeningBalances_Accounts_AccountId",
                        column: x => x.AccountId,
                        principalTable: "Accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_OpeningBalances_FiscalYears_FiscalYearId",
                        column: x => x.FiscalYearId,
                        principalTable: "FiscalYears",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Email = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    PasswordHash = table.Column<string>(type: "text", nullable: false),
                    FiscalYearId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    IsAdmin = table.Column<bool>(type: "boolean", nullable: false),
                    IsEmailVerified = table.Column<bool>(type: "boolean", nullable: false),
                    EmailVerificationToken = table.Column<string>(type: "text", nullable: true),
                    EmailVerificationExpires = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    ResetPasswordToken = table.Column<string>(type: "text", nullable: true),
                    ResetPasswordExpires = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    MenuPermissions = table.Column<string>(type: "jsonb", nullable: false, defaultValueSql: "'{}'::jsonb"),
                    GrantedById = table.Column<Guid>(type: "uuid", nullable: true),
                    LastPermissionUpdate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    Preferences_Theme = table.Column<string>(type: "varchar(10)", nullable: false),
                    AttendanceSettings_AutoAttendance = table.Column<bool>(type: "boolean", nullable: false),
                    AttendanceSettings_LastKnownLocation_Lat = table.Column<double>(type: "double precision", nullable: true),
                    AttendanceSettings_LastKnownLocation_Lng = table.Column<double>(type: "double precision", nullable: true),
                    AttendanceSettings_LastKnownLocation_Timestamp = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    AttendanceSettings_LastAttendanceDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Users_FiscalYears_FiscalYearId",
                        column: x => x.FiscalYearId,
                        principalTable: "FiscalYears",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Users_Users_GrantedById",
                        column: x => x.GrantedById,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Racks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    StoreId = table.Column<Guid>(type: "uuid", nullable: false),
                    CompanyId = table.Column<Guid>(type: "uuid", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "timezone('utc', now())"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Racks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Racks_Companies_CompanyId",
                        column: x => x.CompanyId,
                        principalTable: "Companies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Racks_Stores_StoreId",
                        column: x => x.StoreId,
                        principalTable: "Stores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "items",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    hscode = table.Column<string>(type: "text", nullable: true),
                    category_id = table.Column<Guid>(type: "uuid", nullable: false),
                    items_company_id = table.Column<Guid>(type: "uuid", nullable: false),
                    price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    pu_price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    main_unit_pu_price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false, defaultValue: 0m),
                    main_unit_id = table.Column<Guid>(type: "uuid", nullable: true),
                    ws_unit = table.Column<decimal>(type: "numeric(10,3)", precision: 10, scale: 3, nullable: false, defaultValue: 0m),
                    unit_id = table.Column<Guid>(type: "uuid", nullable: false),
                    vat_status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    opening_stock = table.Column<decimal>(type: "numeric(10,3)", precision: 10, scale: 3, nullable: false, defaultValue: 0m),
                    min_stock = table.Column<decimal>(type: "numeric(10,3)", precision: 10, scale: 3, nullable: false, defaultValue: 0m),
                    max_stock = table.Column<decimal>(type: "numeric(10,3)", precision: 10, scale: 3, nullable: false, defaultValue: 100m),
                    reorder_level = table.Column<decimal>(type: "numeric(10,3)", precision: 10, scale: 3, nullable: false, defaultValue: 0m),
                    unique_number = table.Column<int>(type: "integer", nullable: false),
                    barcode_number = table.Column<long>(type: "bigint", nullable: false),
                    company_id = table.Column<Guid>(type: "uuid", nullable: false),
                    fiscal_year_id = table.Column<Guid>(type: "uuid", nullable: false),
                    original_fiscal_year_id = table.Column<Guid>(type: "uuid", nullable: true),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "active"),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    date = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    updated_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_items", x => x.id);
                    table.ForeignKey(
                        name: "FK_items_Categories_category_id",
                        column: x => x.category_id,
                        principalTable: "Categories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_items_Companies_company_id",
                        column: x => x.company_id,
                        principalTable: "Companies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_items_FiscalYears_fiscal_year_id",
                        column: x => x.fiscal_year_id,
                        principalTable: "FiscalYears",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_items_FiscalYears_original_fiscal_year_id",
                        column: x => x.original_fiscal_year_id,
                        principalTable: "FiscalYears",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_items_ItemCompanies_items_company_id",
                        column: x => x.items_company_id,
                        principalTable: "ItemCompanies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_items_MainUnits_main_unit_id",
                        column: x => x.main_unit_id,
                        principalTable: "MainUnits",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_items_Units_unit_id",
                        column: x => x.unit_id,
                        principalTable: "Units",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "CompanyUsers",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CompanyId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CompanyUsers", x => new { x.UserId, x.CompanyId });
                    table.ForeignKey(
                        name: "FK_CompanyUsers_Companies_CompanyId",
                        column: x => x.CompanyId,
                        principalTable: "Companies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CompanyUsers_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CreditNotes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BillNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Date = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    FiscalYearId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CompanyId = table.Column<Guid>(type: "uuid", nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Status = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CreditNotes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CreditNotes_Companies_CompanyId",
                        column: x => x.CompanyId,
                        principalTable: "Companies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CreditNotes_FiscalYears_FiscalYearId",
                        column: x => x.FiscalYearId,
                        principalTable: "FiscalYears",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CreditNotes_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "DebitNotes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BillNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Date = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    FiscalYearId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CompanyId = table.Column<Guid>(type: "uuid", nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Status = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DebitNotes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DebitNotes_Companies_CompanyId",
                        column: x => x.CompanyId,
                        principalTable: "Companies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_DebitNotes_FiscalYears_FiscalYearId",
                        column: x => x.FiscalYearId,
                        principalTable: "FiscalYears",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_DebitNotes_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "JournalVouchers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BillNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Date = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CompanyId = table.Column<Guid>(type: "uuid", nullable: false),
                    FiscalYearId = table.Column<Guid>(type: "uuid", nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JournalVouchers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_JournalVouchers_Companies_CompanyId",
                        column: x => x.CompanyId,
                        principalTable: "Companies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_JournalVouchers_FiscalYears_FiscalYearId",
                        column: x => x.FiscalYearId,
                        principalTable: "FiscalYears",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_JournalVouchers_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Payments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FiscalYearId = table.Column<Guid>(type: "uuid", nullable: false),
                    BillNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Date = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    BillDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    AccountId = table.Column<Guid>(type: "uuid", nullable: true),
                    Debit = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Credit = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    PaymentAccountId = table.Column<Guid>(type: "uuid", nullable: true),
                    InstType = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false),
                    InstNo = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    AccountGroupId = table.Column<Guid>(type: "uuid", nullable: true),
                    CompanyId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Payments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Payments_AccountGroups_AccountGroupId",
                        column: x => x.AccountGroupId,
                        principalTable: "AccountGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Payments_Accounts_AccountId",
                        column: x => x.AccountId,
                        principalTable: "Accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Payments_Accounts_PaymentAccountId",
                        column: x => x.PaymentAccountId,
                        principalTable: "Accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Payments_Companies_CompanyId",
                        column: x => x.CompanyId,
                        principalTable: "Companies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Payments_FiscalYears_FiscalYearId",
                        column: x => x.FiscalYearId,
                        principalTable: "FiscalYears",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Payments_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Receipts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BillNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    AccountId = table.Column<Guid>(type: "uuid", nullable: true),
                    Debit = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Credit = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    ReceiptAccountId = table.Column<Guid>(type: "uuid", nullable: true),
                    InstType = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false),
                    BankAcc = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    InstNo = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    AccountGroupId = table.Column<Guid>(type: "uuid", nullable: true),
                    CompanyId = table.Column<Guid>(type: "uuid", nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Status = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    FiscalYearId = table.Column<Guid>(type: "uuid", nullable: false),
                    Date = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    BillDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Receipts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Receipts_AccountGroups_AccountGroupId",
                        column: x => x.AccountGroupId,
                        principalTable: "AccountGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Receipts_Accounts_AccountId",
                        column: x => x.AccountId,
                        principalTable: "Accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Receipts_Accounts_ReceiptAccountId",
                        column: x => x.ReceiptAccountId,
                        principalTable: "Accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Receipts_Companies_CompanyId",
                        column: x => x.CompanyId,
                        principalTable: "Companies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Receipts_FiscalYears_FiscalYearId",
                        column: x => x.FiscalYearId,
                        principalTable: "FiscalYears",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Receipts_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Settings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CompanyId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    RoundOffSales = table.Column<bool>(type: "boolean", nullable: false),
                    RoundOffPurchase = table.Column<bool>(type: "boolean", nullable: false),
                    RoundOffSalesReturn = table.Column<bool>(type: "boolean", nullable: false),
                    RoundOffPurchaseReturn = table.Column<bool>(type: "boolean", nullable: false),
                    DisplayTransactions = table.Column<bool>(type: "boolean", nullable: false),
                    DisplayTransactionsForPurchase = table.Column<bool>(type: "boolean", nullable: false),
                    DisplayTransactionsForSalesReturn = table.Column<bool>(type: "boolean", nullable: false),
                    DisplayTransactionsForPurchaseReturn = table.Column<bool>(type: "boolean", nullable: false),
                    StoreManagement = table.Column<bool>(type: "boolean", nullable: false),
                    Value = table.Column<string>(type: "jsonb", nullable: false),
                    FiscalYearId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Settings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Settings_Companies_CompanyId",
                        column: x => x.CompanyId,
                        principalTable: "Companies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Settings_FiscalYears_FiscalYearId",
                        column: x => x.FiscalYearId,
                        principalTable: "FiscalYears",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Settings_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "stock_adjustments",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    bill_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    date = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    note = table.Column<string>(type: "text", nullable: true),
                    adjustment_type = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    sub_total = table.Column<decimal>(type: "numeric", nullable: false),
                    non_vat_adjustment = table.Column<decimal>(type: "numeric", nullable: false),
                    taxable_amount = table.Column<decimal>(type: "numeric", nullable: false),
                    discount_percentage = table.Column<decimal>(type: "numeric", nullable: false),
                    discount_amount = table.Column<decimal>(type: "numeric", nullable: false),
                    vat_percentage = table.Column<decimal>(type: "numeric", nullable: false, defaultValue: 13m),
                    vat_amount = table.Column<decimal>(type: "numeric", nullable: false),
                    total_amount = table.Column<decimal>(type: "numeric", nullable: false),
                    is_vat_exempt = table.Column<bool>(type: "boolean", nullable: false),
                    is_vat_all = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    round_off_amount = table.Column<decimal>(type: "numeric", nullable: false),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "active"),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    company_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    fiscal_year_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_stock_adjustments", x => x.id);
                    table.ForeignKey(
                        name: "FK_stock_adjustments_Companies_company_id",
                        column: x => x.company_id,
                        principalTable: "Companies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_stock_adjustments_FiscalYears_fiscal_year_id",
                        column: x => x.fiscal_year_id,
                        principalTable: "FiscalYears",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_stock_adjustments_Users_user_id",
                        column: x => x.user_id,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "UserRoles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    RoleId = table.Column<Guid>(type: "uuid", nullable: false),
                    AssignedById = table.Column<Guid>(type: "uuid", nullable: true),
                    AssignedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    IsPrimary = table.Column<bool>(type: "boolean", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CustomPermissions = table.Column<string>(type: "jsonb", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserRoles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserRoles_Roles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "Roles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_UserRoles_Users_AssignedById",
                        column: x => x.AssignedById,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_UserRoles_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "item_closing_stock_by_fiscal_year",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    fiscal_year_id = table.Column<Guid>(type: "uuid", nullable: false),
                    closing_stock = table.Column<decimal>(type: "numeric(10,3)", precision: 10, scale: 3, nullable: false, defaultValue: 0m),
                    closing_stock_value = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false, defaultValue: 0m),
                    purchase_price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false, defaultValue: 0m),
                    sales_price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false, defaultValue: 0m),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    updated_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_item_closing_stock_by_fiscal_year", x => x.id);
                    table.ForeignKey(
                        name: "FK_item_closing_stock_by_fiscal_year_FiscalYears_fiscal_year_id",
                        column: x => x.fiscal_year_id,
                        principalTable: "FiscalYears",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_item_closing_stock_by_fiscal_year_items_item_id",
                        column: x => x.item_id,
                        principalTable: "items",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "item_compositions",
                columns: table => new
                {
                    item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    composition_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_item_compositions", x => new { x.item_id, x.composition_id });
                    table.ForeignKey(
                        name: "FK_item_compositions_compositions_composition_id",
                        column: x => x.composition_id,
                        principalTable: "compositions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_item_compositions_items_item_id",
                        column: x => x.item_id,
                        principalTable: "items",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "item_initial_opening_stocks",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    initial_fiscal_year_id = table.Column<Guid>(type: "uuid", nullable: true),
                    opening_stock = table.Column<decimal>(type: "numeric(10,3)", precision: 10, scale: 3, nullable: false, defaultValue: 0m),
                    opening_stock_value = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false, defaultValue: 0m),
                    purchase_price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false, defaultValue: 0m),
                    sales_price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false, defaultValue: 0m),
                    date = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    updated_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_item_initial_opening_stocks", x => x.id);
                    table.ForeignKey(
                        name: "FK_item_initial_opening_stocks_FiscalYears_initial_fiscal_year~",
                        column: x => x.initial_fiscal_year_id,
                        principalTable: "FiscalYears",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_item_initial_opening_stocks_items_item_id",
                        column: x => x.item_id,
                        principalTable: "items",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "item_opening_stock_by_fiscal_year",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    fiscal_year_id = table.Column<Guid>(type: "uuid", nullable: false),
                    opening_stock = table.Column<decimal>(type: "numeric(10,3)", precision: 10, scale: 3, nullable: false, defaultValue: 0m),
                    opening_stock_value = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false, defaultValue: 0m),
                    purchase_price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false, defaultValue: 0m),
                    sales_price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false, defaultValue: 0m),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    updated_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_item_opening_stock_by_fiscal_year", x => x.id);
                    table.ForeignKey(
                        name: "FK_item_opening_stock_by_fiscal_year_FiscalYears_fiscal_year_id",
                        column: x => x.fiscal_year_id,
                        principalTable: "FiscalYears",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_item_opening_stock_by_fiscal_year_items_item_id",
                        column: x => x.item_id,
                        principalTable: "items",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CreditNoteCreditEntries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CreditNoteId = table.Column<Guid>(type: "uuid", nullable: false),
                    AccountId = table.Column<Guid>(type: "uuid", nullable: false),
                    Credit = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
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
                    CreditNoteId = table.Column<Guid>(type: "uuid", nullable: false),
                    AccountId = table.Column<Guid>(type: "uuid", nullable: false),
                    Debit = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
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

            migrationBuilder.CreateTable(
                name: "DebitNoteCreditEntries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DebitNoteId = table.Column<Guid>(type: "uuid", nullable: false),
                    AccountId = table.Column<Guid>(type: "uuid", nullable: false),
                    Credit = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DebitNoteCreditEntries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DebitNoteCreditEntries_Accounts_AccountId",
                        column: x => x.AccountId,
                        principalTable: "Accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_DebitNoteCreditEntries_DebitNotes_DebitNoteId",
                        column: x => x.DebitNoteId,
                        principalTable: "DebitNotes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "DebitNoteDebitEntries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DebitNoteId = table.Column<Guid>(type: "uuid", nullable: false),
                    AccountId = table.Column<Guid>(type: "uuid", nullable: false),
                    Debit = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DebitNoteDebitEntries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DebitNoteDebitEntries_Accounts_AccountId",
                        column: x => x.AccountId,
                        principalTable: "Accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_DebitNoteDebitEntries_DebitNotes_DebitNoteId",
                        column: x => x.DebitNoteId,
                        principalTable: "DebitNotes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CreditEntry",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    JournalVoucherId = table.Column<Guid>(type: "uuid", nullable: false),
                    AccountId = table.Column<Guid>(type: "uuid", nullable: false),
                    Credit = table.Column<decimal>(type: "numeric(18,2)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CreditEntry", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CreditEntry_Accounts_AccountId",
                        column: x => x.AccountId,
                        principalTable: "Accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CreditEntry_JournalVouchers_JournalVoucherId",
                        column: x => x.JournalVoucherId,
                        principalTable: "JournalVouchers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "DebitEntry",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    JournalVoucherId = table.Column<Guid>(type: "uuid", nullable: false),
                    AccountId = table.Column<Guid>(type: "uuid", nullable: false),
                    Debit = table.Column<decimal>(type: "numeric(18,2)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DebitEntry", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DebitEntry_Accounts_AccountId",
                        column: x => x.AccountId,
                        principalTable: "Accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DebitEntry_JournalVouchers_JournalVoucherId",
                        column: x => x.JournalVoucherId,
                        principalTable: "JournalVouchers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "purchase_bills",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    company_id = table.Column<Guid>(type: "uuid", nullable: false),
                    first_printed = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    print_count = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    purchase_sales_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    original_copies = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    bill_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    party_bill_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    account_id = table.Column<Guid>(type: "uuid", nullable: true),
                    vat_account_id = table.Column<Guid>(type: "uuid", nullable: true),
                    purchase_account_id = table.Column<Guid>(type: "uuid", nullable: true),
                    round_off_account_id = table.Column<Guid>(type: "uuid", nullable: true),
                    unit_id = table.Column<Guid>(type: "uuid", nullable: true),
                    settings_id = table.Column<Guid>(type: "uuid", nullable: true),
                    fiscal_year_id = table.Column<Guid>(type: "uuid", nullable: false),
                    sub_total = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    non_vat_purchase = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    taxable_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    total_cc_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    discount_percentage = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: true),
                    discount_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    vat_percentage = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false, defaultValue: 13m),
                    vat_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    total_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    is_vat_exempt = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    is_vat_all = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    round_off_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    payment_mode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    nepali_date = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    date = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    transaction_date_nepali = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    transaction_date = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    updated_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    ItemId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_purchase_bills", x => x.id);
                    table.ForeignKey(
                        name: "FK_purchase_bills_Accounts_account_id",
                        column: x => x.account_id,
                        principalTable: "Accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_purchase_bills_Accounts_purchase_account_id",
                        column: x => x.purchase_account_id,
                        principalTable: "Accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_purchase_bills_Accounts_round_off_account_id",
                        column: x => x.round_off_account_id,
                        principalTable: "Accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_purchase_bills_Accounts_vat_account_id",
                        column: x => x.vat_account_id,
                        principalTable: "Accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_purchase_bills_Companies_company_id",
                        column: x => x.company_id,
                        principalTable: "Companies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_purchase_bills_FiscalYears_fiscal_year_id",
                        column: x => x.fiscal_year_id,
                        principalTable: "FiscalYears",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_purchase_bills_Settings_settings_id",
                        column: x => x.settings_id,
                        principalTable: "Settings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_purchase_bills_Units_unit_id",
                        column: x => x.unit_id,
                        principalTable: "Units",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_purchase_bills_Users_user_id",
                        column: x => x.user_id,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_purchase_bills_items_ItemId",
                        column: x => x.ItemId,
                        principalTable: "items",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "purchase_returns",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    company_id = table.Column<Guid>(type: "uuid", nullable: false),
                    first_printed = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    print_count = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    purchase_sales_return_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    original_copies = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    bill_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    party_bill_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    account_id = table.Column<Guid>(type: "uuid", nullable: true),
                    settings_id = table.Column<Guid>(type: "uuid", nullable: true),
                    fiscal_year_id = table.Column<Guid>(type: "uuid", nullable: false),
                    sub_total = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    non_vat_purchase_return = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    taxable_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    discount_percentage = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: true),
                    discount_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    vat_percentage = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false, defaultValue: 13m),
                    vat_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    total_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    is_vat_exempt = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    is_vat_all = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    round_off_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    payment_mode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    date = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    transaction_date = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    updated_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    ItemId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_purchase_returns", x => x.id);
                    table.ForeignKey(
                        name: "FK_purchase_returns_Accounts_account_id",
                        column: x => x.account_id,
                        principalTable: "Accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_purchase_returns_Companies_company_id",
                        column: x => x.company_id,
                        principalTable: "Companies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_purchase_returns_FiscalYears_fiscal_year_id",
                        column: x => x.fiscal_year_id,
                        principalTable: "FiscalYears",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_purchase_returns_Settings_settings_id",
                        column: x => x.settings_id,
                        principalTable: "Settings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_purchase_returns_Users_user_id",
                        column: x => x.user_id,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_purchase_returns_items_ItemId",
                        column: x => x.ItemId,
                        principalTable: "items",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "sales_bills",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    company_id = table.Column<Guid>(type: "uuid", nullable: false),
                    first_printed = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    print_count = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    purchase_sales_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    original_copies = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    bill_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    account_id = table.Column<Guid>(type: "uuid", nullable: true),
                    cash_account = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    cash_account_address = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    cash_account_pan = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    cash_account_email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    cash_account_phone = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    settings_id = table.Column<Guid>(type: "uuid", nullable: true),
                    fiscal_year_id = table.Column<Guid>(type: "uuid", nullable: false),
                    sub_total = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    non_vat_sales = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    taxable_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    discount_percentage = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    discount_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    vat_percentage = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false, defaultValue: 13m),
                    vat_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    total_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    is_vat_exempt = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    is_vat_all = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    round_off_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    payment_mode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    date = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    transaction_date = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    updated_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    ItemId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sales_bills", x => x.id);
                    table.ForeignKey(
                        name: "FK_sales_bills_Accounts_account_id",
                        column: x => x.account_id,
                        principalTable: "Accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_sales_bills_Companies_company_id",
                        column: x => x.company_id,
                        principalTable: "Companies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_sales_bills_FiscalYears_fiscal_year_id",
                        column: x => x.fiscal_year_id,
                        principalTable: "FiscalYears",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_sales_bills_Settings_settings_id",
                        column: x => x.settings_id,
                        principalTable: "Settings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_sales_bills_Users_user_id",
                        column: x => x.user_id,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_sales_bills_items_ItemId",
                        column: x => x.ItemId,
                        principalTable: "items",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "stock_adjustment_items",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    stock_adjustment_id = table.Column<Guid>(type: "uuid", nullable: false),
                    item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    unit_id = table.Column<Guid>(type: "uuid", nullable: false),
                    quantity = table.Column<decimal>(type: "numeric", nullable: false),
                    batch_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    expiry_date = table.Column<DateOnly>(type: "date", nullable: true),
                    pu_price = table.Column<decimal>(type: "numeric", nullable: false),
                    reason = table.Column<string[]>(type: "text[]", nullable: false),
                    vat_status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_stock_adjustment_items", x => x.id);
                    table.ForeignKey(
                        name: "FK_stock_adjustment_items_Units_unit_id",
                        column: x => x.unit_id,
                        principalTable: "Units",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_stock_adjustment_items_items_item_id",
                        column: x => x.item_id,
                        principalTable: "items",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_stock_adjustment_items_stock_adjustments_stock_adjustment_id",
                        column: x => x.stock_adjustment_id,
                        principalTable: "stock_adjustments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "purchase_bill_items",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    purchase_bill_id = table.Column<Guid>(type: "uuid", nullable: false),
                    item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    unit_id = table.Column<Guid>(type: "uuid", nullable: false),
                    ws_unit = table.Column<decimal>(type: "numeric(10,3)", precision: 10, scale: 3, nullable: true),
                    quantity = table.Column<decimal>(type: "numeric(10,3)", precision: 10, scale: 3, nullable: false),
                    bonus = table.Column<decimal>(type: "numeric(10,3)", precision: 10, scale: 3, nullable: true),
                    alt_bonus = table.Column<decimal>(type: "numeric(10,3)", precision: 10, scale: 3, nullable: true),
                    price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    pu_price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    discount_percentage_per_item = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false, defaultValue: 0m),
                    discount_amount_per_item = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false, defaultValue: 0m),
                    net_pu_price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    cc_percentage = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false, defaultValue: 0m),
                    item_cc_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false, defaultValue: 0m),
                    mrp = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false, defaultValue: 0m),
                    margin_percentage = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false, defaultValue: 0m),
                    currency = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    alt_quantity = table.Column<decimal>(type: "numeric(10,3)", precision: 10, scale: 3, nullable: true),
                    alt_price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    alt_pu_price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    batch_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    expiry_date = table.Column<DateOnly>(type: "date", nullable: true),
                    vat_status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    unique_uuid = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    updated_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_purchase_bill_items", x => x.id);
                    table.CheckConstraint("CK_PurchaseBillItem_VatStatus", "vat_status IN ('vatable', 'vatExempt')");
                    table.ForeignKey(
                        name: "FK_purchase_bill_items_Units_unit_id",
                        column: x => x.unit_id,
                        principalTable: "Units",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_purchase_bill_items_items_item_id",
                        column: x => x.item_id,
                        principalTable: "items",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_purchase_bill_items_purchase_bills_purchase_bill_id",
                        column: x => x.purchase_bill_id,
                        principalTable: "purchase_bills",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "stock_entries",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    date = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    ws_unit = table.Column<decimal>(type: "numeric(10,3)", precision: 10, scale: 3, nullable: true),
                    quantity = table.Column<decimal>(type: "numeric(10,3)", precision: 10, scale: 3, nullable: false),
                    bonus = table.Column<decimal>(type: "numeric(10,3)", precision: 10, scale: 3, nullable: true),
                    batch_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false, defaultValue: "XXX"),
                    expiry_date = table.Column<DateOnly>(type: "date", nullable: false),
                    price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false, defaultValue: 0m),
                    net_price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false, defaultValue: 0m),
                    pu_price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false, defaultValue: 0m),
                    item_cc_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false, defaultValue: 0m),
                    discount_percentage_per_item = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false, defaultValue: 0m),
                    discount_amount_per_item = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false, defaultValue: 0m),
                    net_pu_price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false, computedColumnSql: "CASE WHEN ws_unit IS NOT NULL AND ws_unit > 0 THEN net_price / ws_unit ELSE net_price END", stored: true),
                    main_unit_pu_price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false, defaultValue: 0m),
                    mrp = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false, defaultValue: 0m),
                    margin_percentage = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false, defaultValue: 0m),
                    currency = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    fiscal_year_id = table.Column<Guid>(type: "uuid", nullable: true),
                    unique_uuid = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    purchase_bill_id = table.Column<Guid>(type: "uuid", nullable: true),
                    expiry_status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "safe"),
                    days_until_expiry = table.Column<int>(type: "integer", nullable: false, defaultValue: 730),
                    store_id = table.Column<Guid>(type: "uuid", nullable: true),
                    rack_id = table.Column<Guid>(type: "uuid", nullable: true),
                    source_transfer_from_store_id = table.Column<Guid>(type: "uuid", nullable: true),
                    source_transfer_original_entry_id = table.Column<Guid>(type: "uuid", nullable: true),
                    source_transfer_date = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    updated_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    ParentItemId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_stock_entries", x => x.id);
                    table.CheckConstraint("CK_StockEntry_ExpiryStatus", "expiry_status IN ('safe', 'warning', 'danger', 'expired')");
                    table.ForeignKey(
                        name: "FK_stock_entries_FiscalYears_fiscal_year_id",
                        column: x => x.fiscal_year_id,
                        principalTable: "FiscalYears",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_stock_entries_Racks_rack_id",
                        column: x => x.rack_id,
                        principalTable: "Racks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_stock_entries_Stores_store_id",
                        column: x => x.store_id,
                        principalTable: "Stores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_stock_entries_items_ParentItemId",
                        column: x => x.ParentItemId,
                        principalTable: "items",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_stock_entries_items_item_id",
                        column: x => x.item_id,
                        principalTable: "items",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_stock_entries_purchase_bills_purchase_bill_id",
                        column: x => x.purchase_bill_id,
                        principalTable: "purchase_bills",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "purchase_return_items",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    purchase_return_id = table.Column<Guid>(type: "uuid", nullable: false),
                    item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    unit_id = table.Column<Guid>(type: "uuid", nullable: false),
                    ws_unit = table.Column<decimal>(type: "numeric(10,3)", precision: 10, scale: 3, nullable: true),
                    quantity = table.Column<decimal>(type: "numeric(10,3)", precision: 10, scale: 3, nullable: true),
                    price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    pu_price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    mrp = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false, defaultValue: 0m),
                    margin_percentage = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false, defaultValue: 0m),
                    currency = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    alt_quantity = table.Column<decimal>(type: "numeric(10,3)", precision: 10, scale: 3, nullable: true),
                    alt_price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    alt_pu_price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    batch_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    expiry_date = table.Column<DateOnly>(type: "date", nullable: true),
                    vat_status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    unique_uuid = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    purchase_bill_id = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    updated_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_purchase_return_items", x => x.id);
                    table.CheckConstraint("CK_PurchaseReturnItem_VatStatus", "vat_status IN ('vatable', 'vatExempt')");
                    table.ForeignKey(
                        name: "FK_purchase_return_items_Units_unit_id",
                        column: x => x.unit_id,
                        principalTable: "Units",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_purchase_return_items_items_item_id",
                        column: x => x.item_id,
                        principalTable: "items",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_purchase_return_items_purchase_bills_purchase_bill_id",
                        column: x => x.purchase_bill_id,
                        principalTable: "purchase_bills",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_purchase_return_items_purchase_returns_purchase_return_id",
                        column: x => x.purchase_return_id,
                        principalTable: "purchase_returns",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "sales_bill_items",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    sales_bill_id = table.Column<Guid>(type: "uuid", nullable: false),
                    item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    unit_id = table.Column<Guid>(type: "uuid", nullable: false),
                    quantity = table.Column<decimal>(type: "numeric(10,3)", precision: 10, scale: 3, nullable: false),
                    price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    pu_price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    net_pu_price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    discount_percentage_per_item = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    discount_amount_per_item = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    net_price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    batch_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    expiry_date = table.Column<DateOnly>(type: "date", nullable: true),
                    vat_status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    unique_uuid = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    purchase_bill_id = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    updated_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sales_bill_items", x => x.id);
                    table.ForeignKey(
                        name: "FK_sales_bill_items_Units_unit_id",
                        column: x => x.unit_id,
                        principalTable: "Units",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_sales_bill_items_items_item_id",
                        column: x => x.item_id,
                        principalTable: "items",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_sales_bill_items_sales_bills_sales_bill_id",
                        column: x => x.sales_bill_id,
                        principalTable: "sales_bills",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "sales_returns",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    company_id = table.Column<Guid>(type: "uuid", nullable: false),
                    first_printed = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    print_count = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    original_sales_bill_id = table.Column<Guid>(type: "uuid", nullable: true),
                    original_sales_bill_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    purchase_sales_return_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    original_copies = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    bill_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    account_id = table.Column<Guid>(type: "uuid", nullable: true),
                    cash_account = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    cash_account_address = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    cash_account_pan = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    cash_account_email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    cash_account_phone = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    unit_id = table.Column<Guid>(type: "uuid", nullable: true),
                    settings_id = table.Column<Guid>(type: "uuid", nullable: true),
                    fiscal_year_id = table.Column<Guid>(type: "uuid", nullable: false),
                    sub_total = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    non_vat_sales_return = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    taxable_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    discount_percentage = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: true),
                    discount_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    vat_percentage = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false, defaultValue: 13m),
                    vat_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    total_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    is_vat_exempt = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    is_vat_all = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    round_off_amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    payment_mode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    quantity = table.Column<decimal>(type: "numeric(10,3)", precision: 10, scale: 3, nullable: true),
                    price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    date = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    transaction_date = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    updated_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    ItemId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sales_returns", x => x.id);
                    table.ForeignKey(
                        name: "FK_sales_returns_Accounts_account_id",
                        column: x => x.account_id,
                        principalTable: "Accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_sales_returns_Companies_company_id",
                        column: x => x.company_id,
                        principalTable: "Companies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_sales_returns_FiscalYears_fiscal_year_id",
                        column: x => x.fiscal_year_id,
                        principalTable: "FiscalYears",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_sales_returns_Settings_settings_id",
                        column: x => x.settings_id,
                        principalTable: "Settings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_sales_returns_Units_unit_id",
                        column: x => x.unit_id,
                        principalTable: "Units",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_sales_returns_Users_user_id",
                        column: x => x.user_id,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_sales_returns_items_ItemId",
                        column: x => x.ItemId,
                        principalTable: "items",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_sales_returns_sales_bills_original_sales_bill_id",
                        column: x => x.original_sales_bill_id,
                        principalTable: "sales_bills",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "sales_return_items",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    sales_return_id = table.Column<Guid>(type: "uuid", nullable: false),
                    item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    unit_id = table.Column<Guid>(type: "uuid", nullable: false),
                    quantity = table.Column<decimal>(type: "numeric(10,3)", precision: 10, scale: 3, nullable: false),
                    price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    net_price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    pu_price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    discount_percentage_per_item = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false, defaultValue: 0m),
                    discount_amount_per_item = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false, defaultValue: 0m),
                    net_pu_price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false, defaultValue: 0m),
                    batch_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    expiry_date = table.Column<DateOnly>(type: "date", nullable: true),
                    vat_status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    unique_uuid = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    updated_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sales_return_items", x => x.id);
                    table.CheckConstraint("CK_SalesReturnItem_VatStatus", "vat_status IN ('vatable', 'vatExempt')");
                    table.ForeignKey(
                        name: "FK_sales_return_items_Units_unit_id",
                        column: x => x.unit_id,
                        principalTable: "Units",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_sales_return_items_items_item_id",
                        column: x => x.item_id,
                        principalTable: "items",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_sales_return_items_sales_returns_sales_return_id",
                        column: x => x.sales_return_id,
                        principalTable: "sales_returns",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Transactions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CompanyId = table.Column<Guid>(type: "uuid", nullable: false),
                    ItemId = table.Column<Guid>(type: "uuid", nullable: true),
                    UnitId = table.Column<Guid>(type: "uuid", nullable: true),
                    MainUnitId = table.Column<Guid>(type: "uuid", nullable: true),
                    AccountId = table.Column<Guid>(type: "uuid", nullable: true),
                    BillId = table.Column<Guid>(type: "uuid", nullable: true),
                    PurchaseBillId = table.Column<Guid>(type: "uuid", nullable: true),
                    PurchaseReturnBillId = table.Column<Guid>(type: "uuid", nullable: true),
                    JournalBillId = table.Column<Guid>(type: "uuid", nullable: true),
                    DebitNoteId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreditNoteId = table.Column<Guid>(type: "uuid", nullable: true),
                    SalesReturnBillId = table.Column<Guid>(type: "uuid", nullable: true),
                    PaymentAccountId = table.Column<Guid>(type: "uuid", nullable: true),
                    ReceiptAccountId = table.Column<Guid>(type: "uuid", nullable: true),
                    WSUnit = table.Column<int>(type: "integer", nullable: true),
                    Quantity = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: true),
                    Bonus = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: true),
                    Price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    NetPrice = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    PuPrice = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    DiscountPercentagePerItem = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    DiscountAmountPerItem = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    NetPuPrice = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Type = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false),
                    IsType = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: true),
                    BillNumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    PartyBillNumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    SalesBillNumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    AccountTypeId = table.Column<Guid>(type: "uuid", nullable: true),
                    PurchaseSalesType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    PurchaseSalesReturnType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    JournalAccountType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    JournalAccountDrCrType = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    DrCrNoteAccountType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    DrCrNoteAccountTypes = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Debit = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Credit = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Balance = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    PaymentMode = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false),
                    PaymentAccountId2 = table.Column<Guid>(type: "uuid", nullable: true),
                    ReceiptAccountId2 = table.Column<Guid>(type: "uuid", nullable: true),
                    DebitAccountId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreditAccountId = table.Column<Guid>(type: "uuid", nullable: true),
                    InstType = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false),
                    BankAcc = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    InstNo = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    FiscalYearId = table.Column<Guid>(type: "uuid", nullable: false),
                    Date = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    BillDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    nepali_date = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    transaction_date_nepali = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    Status = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Transactions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Transactions_Accounts_AccountId",
                        column: x => x.AccountId,
                        principalTable: "Accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Transactions_Accounts_AccountTypeId",
                        column: x => x.AccountTypeId,
                        principalTable: "Accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Transactions_Accounts_CreditAccountId",
                        column: x => x.CreditAccountId,
                        principalTable: "Accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Transactions_Accounts_DebitAccountId",
                        column: x => x.DebitAccountId,
                        principalTable: "Accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Transactions_Accounts_PaymentAccountId2",
                        column: x => x.PaymentAccountId2,
                        principalTable: "Accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Transactions_Accounts_ReceiptAccountId2",
                        column: x => x.ReceiptAccountId2,
                        principalTable: "Accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Transactions_Companies_CompanyId",
                        column: x => x.CompanyId,
                        principalTable: "Companies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Transactions_CreditNotes_CreditNoteId",
                        column: x => x.CreditNoteId,
                        principalTable: "CreditNotes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Transactions_DebitNotes_DebitNoteId",
                        column: x => x.DebitNoteId,
                        principalTable: "DebitNotes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Transactions_FiscalYears_FiscalYearId",
                        column: x => x.FiscalYearId,
                        principalTable: "FiscalYears",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Transactions_JournalVouchers_JournalBillId",
                        column: x => x.JournalBillId,
                        principalTable: "JournalVouchers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Transactions_MainUnits_MainUnitId",
                        column: x => x.MainUnitId,
                        principalTable: "MainUnits",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Transactions_Payments_PaymentAccountId",
                        column: x => x.PaymentAccountId,
                        principalTable: "Payments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Transactions_Receipts_ReceiptAccountId",
                        column: x => x.ReceiptAccountId,
                        principalTable: "Receipts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Transactions_Units_UnitId",
                        column: x => x.UnitId,
                        principalTable: "Units",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Transactions_items_ItemId",
                        column: x => x.ItemId,
                        principalTable: "items",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Transactions_purchase_bills_PurchaseBillId",
                        column: x => x.PurchaseBillId,
                        principalTable: "purchase_bills",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Transactions_purchase_returns_PurchaseReturnBillId",
                        column: x => x.PurchaseReturnBillId,
                        principalTable: "purchase_returns",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Transactions_sales_bills_BillId",
                        column: x => x.BillId,
                        principalTable: "sales_bills",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Transactions_sales_returns_SalesReturnBillId",
                        column: x => x.SalesReturnBillId,
                        principalTable: "sales_returns",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AccountGroups_CompanyId",
                table: "AccountGroups",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_AccountGroups_Name_CompanyId",
                table: "AccountGroups",
                columns: new[] { "Name", "CompanyId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Accounts_AccountGroupsId",
                table: "Accounts",
                column: "AccountGroupsId");

            migrationBuilder.CreateIndex(
                name: "IX_Accounts_CompanyId",
                table: "Accounts",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_Accounts_Name_CompanyId",
                table: "Accounts",
                columns: new[] { "Name", "CompanyId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Accounts_OriginalFiscalYearId",
                table: "Accounts",
                column: "OriginalFiscalYearId");

            migrationBuilder.CreateIndex(
                name: "IX_Accounts_UniqueNumber",
                table: "Accounts",
                column: "UniqueNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_barcode_preferences_user_id",
                table: "barcode_preferences",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_BillCounters_CompanyId_FiscalYearId_TransactionType",
                table: "BillCounters",
                columns: new[] { "CompanyId", "FiscalYearId", "TransactionType" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_BillCounters_FiscalYearId",
                table: "BillCounters",
                column: "FiscalYearId");

            migrationBuilder.CreateIndex(
                name: "IX_Categories_CompanyId",
                table: "Categories",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_Categories_Name_CompanyId",
                table: "Categories",
                columns: new[] { "Name", "CompanyId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ClosingBalanceByFiscalYear_AccountId",
                table: "ClosingBalanceByFiscalYear",
                column: "AccountId");

            migrationBuilder.CreateIndex(
                name: "IX_ClosingBalanceByFiscalYear_FiscalYearId",
                table: "ClosingBalanceByFiscalYear",
                column: "FiscalYearId");

            migrationBuilder.CreateIndex(
                name: "IX_Companies_Name",
                table: "Companies",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Companies_OwnerId",
                table: "Companies",
                column: "OwnerId");

            migrationBuilder.CreateIndex(
                name: "IX_CompanyUsers_CompanyId",
                table: "CompanyUsers",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_Composition_Company",
                table: "compositions",
                column: "company_id");

            migrationBuilder.CreateIndex(
                name: "IX_CreditEntry_AccountId",
                table: "CreditEntry",
                column: "AccountId");

            migrationBuilder.CreateIndex(
                name: "IX_CreditEntry_JournalVoucherId",
                table: "CreditEntry",
                column: "JournalVoucherId");

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

            migrationBuilder.CreateIndex(
                name: "IX_CreditNotes_BillNumber_CompanyId_FiscalYearId",
                table: "CreditNotes",
                columns: new[] { "BillNumber", "CompanyId", "FiscalYearId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CreditNotes_CompanyId_FiscalYearId_Date",
                table: "CreditNotes",
                columns: new[] { "CompanyId", "FiscalYearId", "Date" });

            migrationBuilder.CreateIndex(
                name: "IX_CreditNotes_Date",
                table: "CreditNotes",
                column: "Date");

            migrationBuilder.CreateIndex(
                name: "IX_CreditNotes_FiscalYearId",
                table: "CreditNotes",
                column: "FiscalYearId");

            migrationBuilder.CreateIndex(
                name: "IX_CreditNotes_IsActive",
                table: "CreditNotes",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_CreditNotes_Status",
                table: "CreditNotes",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_CreditNotes_UserId",
                table: "CreditNotes",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_DebitEntry_AccountId",
                table: "DebitEntry",
                column: "AccountId");

            migrationBuilder.CreateIndex(
                name: "IX_DebitEntry_JournalVoucherId",
                table: "DebitEntry",
                column: "JournalVoucherId");

            migrationBuilder.CreateIndex(
                name: "IX_DebitNoteCreditEntries_AccountId",
                table: "DebitNoteCreditEntries",
                column: "AccountId");

            migrationBuilder.CreateIndex(
                name: "IX_DebitNoteCreditEntries_DebitNoteId",
                table: "DebitNoteCreditEntries",
                column: "DebitNoteId");

            migrationBuilder.CreateIndex(
                name: "IX_DebitNoteDebitEntries_AccountId",
                table: "DebitNoteDebitEntries",
                column: "AccountId");

            migrationBuilder.CreateIndex(
                name: "IX_DebitNoteDebitEntries_DebitNoteId",
                table: "DebitNoteDebitEntries",
                column: "DebitNoteId");

            migrationBuilder.CreateIndex(
                name: "IX_DebitNotes_BillNumber_CompanyId_FiscalYearId",
                table: "DebitNotes",
                columns: new[] { "BillNumber", "CompanyId", "FiscalYearId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DebitNotes_CompanyId_FiscalYearId_Date",
                table: "DebitNotes",
                columns: new[] { "CompanyId", "FiscalYearId", "Date" });

            migrationBuilder.CreateIndex(
                name: "IX_DebitNotes_Date",
                table: "DebitNotes",
                column: "Date");

            migrationBuilder.CreateIndex(
                name: "IX_DebitNotes_FiscalYearId",
                table: "DebitNotes",
                column: "FiscalYearId");

            migrationBuilder.CreateIndex(
                name: "IX_DebitNotes_IsActive",
                table: "DebitNotes",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_DebitNotes_Status",
                table: "DebitNotes",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_DebitNotes_UserId",
                table: "DebitNotes",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_FiscalYears_AccountId",
                table: "FiscalYears",
                column: "AccountId");

            migrationBuilder.CreateIndex(
                name: "IX_FiscalYears_CompanyId",
                table: "FiscalYears",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_FiscalYears_IsActive",
                table: "FiscalYears",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_FiscalYears_Name_CompanyId",
                table: "FiscalYears",
                columns: new[] { "Name", "CompanyId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_InitialOpeningBalances_AccountId",
                table: "InitialOpeningBalances",
                column: "AccountId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_InitialOpeningBalances_InitialFiscalYearId",
                table: "InitialOpeningBalances",
                column: "InitialFiscalYearId");

            migrationBuilder.CreateIndex(
                name: "IX_item_closing_stock_by_fiscal_year_fiscal_year_id",
                table: "item_closing_stock_by_fiscal_year",
                column: "fiscal_year_id");

            migrationBuilder.CreateIndex(
                name: "IX_ItemClosingStockByFiscalYear_ItemId_FiscalYearId",
                table: "item_closing_stock_by_fiscal_year",
                columns: new[] { "item_id", "fiscal_year_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ItemCompositions_Composition",
                table: "item_compositions",
                column: "composition_id");

            migrationBuilder.CreateIndex(
                name: "IX_ItemCompositions_CreatedAt",
                table: "item_compositions",
                column: "created_at");

            migrationBuilder.CreateIndex(
                name: "IX_ItemCompositions_Item",
                table: "item_compositions",
                column: "item_id");

            migrationBuilder.CreateIndex(
                name: "IX_item_initial_opening_stocks_initial_fiscal_year_id",
                table: "item_initial_opening_stocks",
                column: "initial_fiscal_year_id");

            migrationBuilder.CreateIndex(
                name: "IX_ItemInitialOpeningStock_ItemId",
                table: "item_initial_opening_stocks",
                column: "item_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_item_opening_stock_by_fiscal_year_fiscal_year_id",
                table: "item_opening_stock_by_fiscal_year",
                column: "fiscal_year_id");

            migrationBuilder.CreateIndex(
                name: "IX_ItemOpeningStockByFiscalYear_ItemId_FiscalYearId",
                table: "item_opening_stock_by_fiscal_year",
                columns: new[] { "item_id", "fiscal_year_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ItemCompanies_CompanyId",
                table: "ItemCompanies",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_ItemCompanies_Name_CompanyId",
                table: "ItemCompanies",
                columns: new[] { "Name", "CompanyId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Item_BarcodeNumber",
                table: "items",
                column: "barcode_number",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Item_Company_Category",
                table: "items",
                columns: new[] { "company_id", "category_id" });

            migrationBuilder.CreateIndex(
                name: "IX_Item_Company_Hscode",
                table: "items",
                columns: new[] { "company_id", "hscode" });

            migrationBuilder.CreateIndex(
                name: "IX_Item_Company_Name",
                table: "items",
                columns: new[] { "company_id", "name" });

            migrationBuilder.CreateIndex(
                name: "IX_Item_Company_UniqueNumber",
                table: "items",
                columns: new[] { "company_id", "unique_number" });

            migrationBuilder.CreateIndex(
                name: "IX_Item_Company_VatStatus",
                table: "items",
                columns: new[] { "company_id", "vat_status" });

            migrationBuilder.CreateIndex(
                name: "IX_Item_Name",
                table: "items",
                column: "name");

            migrationBuilder.CreateIndex(
                name: "IX_Item_Name_Company_FiscalYear",
                table: "items",
                columns: new[] { "name", "company_id", "fiscal_year_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Item_UniqueNumber",
                table: "items",
                column: "unique_number",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_items_category_id",
                table: "items",
                column: "category_id");

            migrationBuilder.CreateIndex(
                name: "IX_items_fiscal_year_id",
                table: "items",
                column: "fiscal_year_id");

            migrationBuilder.CreateIndex(
                name: "IX_items_items_company_id",
                table: "items",
                column: "items_company_id");

            migrationBuilder.CreateIndex(
                name: "IX_items_main_unit_id",
                table: "items",
                column: "main_unit_id");

            migrationBuilder.CreateIndex(
                name: "IX_items_original_fiscal_year_id",
                table: "items",
                column: "original_fiscal_year_id");

            migrationBuilder.CreateIndex(
                name: "IX_items_unit_id",
                table: "items",
                column: "unit_id");

            migrationBuilder.CreateIndex(
                name: "IX_JournalVouchers_BillNumber_CompanyId_FiscalYearId",
                table: "JournalVouchers",
                columns: new[] { "BillNumber", "CompanyId", "FiscalYearId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_JournalVouchers_CompanyId",
                table: "JournalVouchers",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_JournalVouchers_FiscalYearId",
                table: "JournalVouchers",
                column: "FiscalYearId");

            migrationBuilder.CreateIndex(
                name: "IX_JournalVouchers_UserId",
                table: "JournalVouchers",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_MainUnits_CompanyId",
                table: "MainUnits",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_MainUnits_Name_CompanyId",
                table: "MainUnits",
                columns: new[] { "Name", "CompanyId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_OpeningBalanceByFiscalYear_AccountId",
                table: "OpeningBalanceByFiscalYear",
                column: "AccountId");

            migrationBuilder.CreateIndex(
                name: "IX_OpeningBalanceByFiscalYear_FiscalYearId",
                table: "OpeningBalanceByFiscalYear",
                column: "FiscalYearId");

            migrationBuilder.CreateIndex(
                name: "IX_OpeningBalances_AccountId",
                table: "OpeningBalances",
                column: "AccountId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_OpeningBalances_FiscalYearId",
                table: "OpeningBalances",
                column: "FiscalYearId");

            migrationBuilder.CreateIndex(
                name: "IX_Payments_AccountGroupId",
                table: "Payments",
                column: "AccountGroupId");

            migrationBuilder.CreateIndex(
                name: "IX_Payments_AccountId",
                table: "Payments",
                column: "AccountId");

            migrationBuilder.CreateIndex(
                name: "IX_Payments_BillDate",
                table: "Payments",
                column: "BillDate");

            migrationBuilder.CreateIndex(
                name: "IX_Payments_BillNumber_CompanyId_FiscalYearId",
                table: "Payments",
                columns: new[] { "BillNumber", "CompanyId", "FiscalYearId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Payments_CompanyId_FiscalYearId_Date",
                table: "Payments",
                columns: new[] { "CompanyId", "FiscalYearId", "Date" });

            migrationBuilder.CreateIndex(
                name: "IX_Payments_CompanyId_Status_IsActive",
                table: "Payments",
                columns: new[] { "CompanyId", "Status", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_Payments_Date",
                table: "Payments",
                column: "Date");

            migrationBuilder.CreateIndex(
                name: "IX_Payments_FiscalYearId",
                table: "Payments",
                column: "FiscalYearId");

            migrationBuilder.CreateIndex(
                name: "IX_Payments_InstType",
                table: "Payments",
                column: "InstType");

            migrationBuilder.CreateIndex(
                name: "IX_Payments_IsActive",
                table: "Payments",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_Payments_PaymentAccountId",
                table: "Payments",
                column: "PaymentAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_Payments_Status",
                table: "Payments",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_Payments_UserId",
                table: "Payments",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_bill_items_unit_id",
                table: "purchase_bill_items",
                column: "unit_id");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseBillItem_Item",
                table: "purchase_bill_items",
                column: "item_id");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseBillItem_PurchaseBill",
                table: "purchase_bill_items",
                column: "purchase_bill_id");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_bills_account_id",
                table: "purchase_bills",
                column: "account_id");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_bills_ItemId",
                table: "purchase_bills",
                column: "ItemId");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_bills_purchase_account_id",
                table: "purchase_bills",
                column: "purchase_account_id");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_bills_round_off_account_id",
                table: "purchase_bills",
                column: "round_off_account_id");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_bills_settings_id",
                table: "purchase_bills",
                column: "settings_id");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_bills_unit_id",
                table: "purchase_bills",
                column: "unit_id");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_bills_vat_account_id",
                table: "purchase_bills",
                column: "vat_account_id");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseBill_BillNumber_Company_FiscalYear",
                table: "purchase_bills",
                columns: new[] { "bill_number", "company_id", "fiscal_year_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseBill_Company",
                table: "purchase_bills",
                column: "company_id");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseBill_Date",
                table: "purchase_bills",
                column: "date");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseBill_FiscalYear",
                table: "purchase_bills",
                column: "fiscal_year_id");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseBill_User",
                table: "purchase_bills",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_return_items_unit_id",
                table: "purchase_return_items",
                column: "unit_id");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseReturnItem_BatchNumber",
                table: "purchase_return_items",
                column: "batch_number");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseReturnItem_Item",
                table: "purchase_return_items",
                column: "item_id");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseReturnItem_PurchaseBill",
                table: "purchase_return_items",
                column: "purchase_bill_id");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseReturnItem_PurchaseReturn",
                table: "purchase_return_items",
                column: "purchase_return_id");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_returns_account_id",
                table: "purchase_returns",
                column: "account_id");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_returns_ItemId",
                table: "purchase_returns",
                column: "ItemId");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_returns_settings_id",
                table: "purchase_returns",
                column: "settings_id");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseReturn_BillNumber_Company_FiscalYear",
                table: "purchase_returns",
                columns: new[] { "bill_number", "company_id", "fiscal_year_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseReturn_Company",
                table: "purchase_returns",
                column: "company_id");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseReturn_Date",
                table: "purchase_returns",
                column: "date");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseReturn_FiscalYear",
                table: "purchase_returns",
                column: "fiscal_year_id");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseReturn_User",
                table: "purchase_returns",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_Racks_CompanyId",
                table: "Racks",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_Racks_Name_CompanyId",
                table: "Racks",
                columns: new[] { "Name", "CompanyId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Racks_StoreId",
                table: "Racks",
                column: "StoreId");

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
                name: "IX_Receipts_BillDate",
                table: "Receipts",
                column: "BillDate");

            migrationBuilder.CreateIndex(
                name: "IX_Receipts_BillNumber_CompanyId_FiscalYearId",
                table: "Receipts",
                columns: new[] { "BillNumber", "CompanyId", "FiscalYearId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Receipts_CompanyId_FiscalYearId_Date",
                table: "Receipts",
                columns: new[] { "CompanyId", "FiscalYearId", "Date" });

            migrationBuilder.CreateIndex(
                name: "IX_Receipts_CompanyId_Status_IsActive",
                table: "Receipts",
                columns: new[] { "CompanyId", "Status", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_Receipts_Date",
                table: "Receipts",
                column: "Date");

            migrationBuilder.CreateIndex(
                name: "IX_Receipts_FiscalYearId",
                table: "Receipts",
                column: "FiscalYearId");

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
                name: "IX_Receipts_IsActive",
                table: "Receipts",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_Receipts_ReceiptAccountId",
                table: "Receipts",
                column: "ReceiptAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_Receipts_Status",
                table: "Receipts",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_Receipts_UserId",
                table: "Receipts",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Roles_Name",
                table: "Roles",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sales_bill_items_item_id",
                table: "sales_bill_items",
                column: "item_id");

            migrationBuilder.CreateIndex(
                name: "IX_sales_bill_items_sales_bill_id",
                table: "sales_bill_items",
                column: "sales_bill_id");

            migrationBuilder.CreateIndex(
                name: "IX_sales_bill_items_unit_id",
                table: "sales_bill_items",
                column: "unit_id");

            migrationBuilder.CreateIndex(
                name: "IX_sales_bills_account_id",
                table: "sales_bills",
                column: "account_id");

            migrationBuilder.CreateIndex(
                name: "IX_sales_bills_company_id",
                table: "sales_bills",
                column: "company_id");

            migrationBuilder.CreateIndex(
                name: "IX_sales_bills_fiscal_year_id",
                table: "sales_bills",
                column: "fiscal_year_id");

            migrationBuilder.CreateIndex(
                name: "IX_sales_bills_ItemId",
                table: "sales_bills",
                column: "ItemId");

            migrationBuilder.CreateIndex(
                name: "IX_sales_bills_settings_id",
                table: "sales_bills",
                column: "settings_id");

            migrationBuilder.CreateIndex(
                name: "IX_sales_bills_user_id",
                table: "sales_bills",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_SalesBill_BillNumber_Company_FiscalYear",
                table: "sales_bills",
                columns: new[] { "bill_number", "company_id", "fiscal_year_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sales_return_items_unit_id",
                table: "sales_return_items",
                column: "unit_id");

            migrationBuilder.CreateIndex(
                name: "IX_SalesReturnItem_BatchNumber",
                table: "sales_return_items",
                column: "batch_number");

            migrationBuilder.CreateIndex(
                name: "IX_SalesReturnItem_Item",
                table: "sales_return_items",
                column: "item_id");

            migrationBuilder.CreateIndex(
                name: "IX_SalesReturnItem_SalesReturn",
                table: "sales_return_items",
                column: "sales_return_id");

            migrationBuilder.CreateIndex(
                name: "IX_sales_returns_account_id",
                table: "sales_returns",
                column: "account_id");

            migrationBuilder.CreateIndex(
                name: "IX_sales_returns_ItemId",
                table: "sales_returns",
                column: "ItemId");

            migrationBuilder.CreateIndex(
                name: "IX_sales_returns_settings_id",
                table: "sales_returns",
                column: "settings_id");

            migrationBuilder.CreateIndex(
                name: "IX_sales_returns_unit_id",
                table: "sales_returns",
                column: "unit_id");

            migrationBuilder.CreateIndex(
                name: "IX_SalesReturn_BillNumber_Company_FiscalYear",
                table: "sales_returns",
                columns: new[] { "bill_number", "company_id", "fiscal_year_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SalesReturn_Company",
                table: "sales_returns",
                column: "company_id");

            migrationBuilder.CreateIndex(
                name: "IX_SalesReturn_Date",
                table: "sales_returns",
                column: "date");

            migrationBuilder.CreateIndex(
                name: "IX_SalesReturn_FiscalYear",
                table: "sales_returns",
                column: "fiscal_year_id");

            migrationBuilder.CreateIndex(
                name: "IX_SalesReturn_OriginalSalesBill",
                table: "sales_returns",
                column: "original_sales_bill_id");

            migrationBuilder.CreateIndex(
                name: "IX_SalesReturn_User",
                table: "sales_returns",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_Settings_CompanyId",
                table: "Settings",
                column: "CompanyId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Settings_CompanyId_UserId_FiscalYearId",
                table: "Settings",
                columns: new[] { "CompanyId", "UserId", "FiscalYearId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Settings_FiscalYearId",
                table: "Settings",
                column: "FiscalYearId");

            migrationBuilder.CreateIndex(
                name: "IX_Settings_UserId",
                table: "Settings",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_stock_adjustment_items_item_id",
                table: "stock_adjustment_items",
                column: "item_id");

            migrationBuilder.CreateIndex(
                name: "IX_stock_adjustment_items_stock_adjustment_id",
                table: "stock_adjustment_items",
                column: "stock_adjustment_id");

            migrationBuilder.CreateIndex(
                name: "IX_stock_adjustment_items_unit_id",
                table: "stock_adjustment_items",
                column: "unit_id");

            migrationBuilder.CreateIndex(
                name: "IX_stock_adjustments_billnumber_company_fiscalyear",
                table: "stock_adjustments",
                columns: new[] { "bill_number", "company_id", "fiscal_year_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_stock_adjustments_company_id",
                table: "stock_adjustments",
                column: "company_id");

            migrationBuilder.CreateIndex(
                name: "IX_stock_adjustments_fiscal_year_id",
                table: "stock_adjustments",
                column: "fiscal_year_id");

            migrationBuilder.CreateIndex(
                name: "IX_stock_adjustments_user_id",
                table: "stock_adjustments",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_stock_entries_fiscal_year_id",
                table: "stock_entries",
                column: "fiscal_year_id");

            migrationBuilder.CreateIndex(
                name: "IX_stock_entries_ParentItemId",
                table: "stock_entries",
                column: "ParentItemId");

            migrationBuilder.CreateIndex(
                name: "IX_stock_entries_purchase_bill_id",
                table: "stock_entries",
                column: "purchase_bill_id");

            migrationBuilder.CreateIndex(
                name: "IX_stock_entries_rack_id",
                table: "stock_entries",
                column: "rack_id");

            migrationBuilder.CreateIndex(
                name: "IX_stock_entries_store_id",
                table: "stock_entries",
                column: "store_id");

            migrationBuilder.CreateIndex(
                name: "IX_StockEntry_BatchNumber",
                table: "stock_entries",
                column: "batch_number");

            migrationBuilder.CreateIndex(
                name: "IX_StockEntry_ExpiryDate",
                table: "stock_entries",
                column: "expiry_date");

            migrationBuilder.CreateIndex(
                name: "IX_StockEntry_Item_ExpiryDate",
                table: "stock_entries",
                columns: new[] { "item_id", "expiry_date" });

            migrationBuilder.CreateIndex(
                name: "IX_StockEntry_ItemId",
                table: "stock_entries",
                column: "item_id");

            migrationBuilder.CreateIndex(
                name: "IX_Stores_CompanyId",
                table: "Stores",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_Stores_Name_CompanyId",
                table: "Stores",
                columns: new[] { "Name", "CompanyId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_AccountId",
                table: "Transactions",
                column: "AccountId");

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_AccountTypeId",
                table: "Transactions",
                column: "AccountTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_BillId",
                table: "Transactions",
                column: "BillId");

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_BillNumber",
                table: "Transactions",
                column: "BillNumber");

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_CompanyId_FiscalYearId_Date",
                table: "Transactions",
                columns: new[] { "CompanyId", "FiscalYearId", "Date" });

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_CreditAccountId",
                table: "Transactions",
                column: "CreditAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_CreditNoteId",
                table: "Transactions",
                column: "CreditNoteId");

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_DebitAccountId",
                table: "Transactions",
                column: "DebitAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_DebitNoteId",
                table: "Transactions",
                column: "DebitNoteId");

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_FiscalYearId",
                table: "Transactions",
                column: "FiscalYearId");

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_IsActive",
                table: "Transactions",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_ItemId",
                table: "Transactions",
                column: "ItemId");

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_JournalBillId",
                table: "Transactions",
                column: "JournalBillId");

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_MainUnitId",
                table: "Transactions",
                column: "MainUnitId");

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_PaymentAccountId",
                table: "Transactions",
                column: "PaymentAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_PaymentAccountId2",
                table: "Transactions",
                column: "PaymentAccountId2");

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_PurchaseBillId",
                table: "Transactions",
                column: "PurchaseBillId");

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_PurchaseReturnBillId",
                table: "Transactions",
                column: "PurchaseReturnBillId");

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_ReceiptAccountId",
                table: "Transactions",
                column: "ReceiptAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_ReceiptAccountId2",
                table: "Transactions",
                column: "ReceiptAccountId2");

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_SalesReturnBillId",
                table: "Transactions",
                column: "SalesReturnBillId");

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_Status",
                table: "Transactions",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_Type",
                table: "Transactions",
                column: "Type");

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_UnitId",
                table: "Transactions",
                column: "UnitId");

            migrationBuilder.CreateIndex(
                name: "IX_Units_CompanyId",
                table: "Units",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_Units_Name_CompanyId",
                table: "Units",
                columns: new[] { "Name", "CompanyId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserRoles_AssignedById",
                table: "UserRoles",
                column: "AssignedById");

            migrationBuilder.CreateIndex(
                name: "IX_UserRoles_RoleId",
                table: "UserRoles",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "IX_UserRoles_UserId_IsPrimary",
                table: "UserRoles",
                columns: new[] { "UserId", "IsPrimary" },
                unique: true,
                filter: "\"IsPrimary\" = true");

            migrationBuilder.CreateIndex(
                name: "IX_Users_Email",
                table: "Users",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_FiscalYearId",
                table: "Users",
                column: "FiscalYearId");

            migrationBuilder.CreateIndex(
                name: "IX_Users_GrantedById",
                table: "Users",
                column: "GrantedById");

            migrationBuilder.AddForeignKey(
                name: "FK_AccountGroups_Companies_CompanyId",
                table: "AccountGroups",
                column: "CompanyId",
                principalTable: "Companies",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Accounts_Companies_CompanyId",
                table: "Accounts",
                column: "CompanyId",
                principalTable: "Companies",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Accounts_FiscalYears_OriginalFiscalYearId",
                table: "Accounts",
                column: "OriginalFiscalYearId",
                principalTable: "FiscalYears",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_barcode_preferences_Users_user_id",
                table: "barcode_preferences",
                column: "user_id",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_BillCounters_Companies_CompanyId",
                table: "BillCounters",
                column: "CompanyId",
                principalTable: "Companies",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_BillCounters_FiscalYears_FiscalYearId",
                table: "BillCounters",
                column: "FiscalYearId",
                principalTable: "FiscalYears",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Categories_Companies_CompanyId",
                table: "Categories",
                column: "CompanyId",
                principalTable: "Companies",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ClosingBalanceByFiscalYear_FiscalYears_FiscalYearId",
                table: "ClosingBalanceByFiscalYear",
                column: "FiscalYearId",
                principalTable: "FiscalYears",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Companies_Users_OwnerId",
                table: "Companies",
                column: "OwnerId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AccountGroups_Companies_CompanyId",
                table: "AccountGroups");

            migrationBuilder.DropForeignKey(
                name: "FK_Accounts_Companies_CompanyId",
                table: "Accounts");

            migrationBuilder.DropForeignKey(
                name: "FK_FiscalYears_Companies_CompanyId",
                table: "FiscalYears");

            migrationBuilder.DropForeignKey(
                name: "FK_Accounts_AccountGroups_AccountGroupsId",
                table: "Accounts");

            migrationBuilder.DropForeignKey(
                name: "FK_Accounts_FiscalYears_OriginalFiscalYearId",
                table: "Accounts");

            migrationBuilder.DropTable(
                name: "barcode_preferences");

            migrationBuilder.DropTable(
                name: "BillCounters");

            migrationBuilder.DropTable(
                name: "ClosingBalanceByFiscalYear");

            migrationBuilder.DropTable(
                name: "CompanyUsers");

            migrationBuilder.DropTable(
                name: "CreditEntry");

            migrationBuilder.DropTable(
                name: "CreditNoteCreditEntries");

            migrationBuilder.DropTable(
                name: "CreditNoteDebitEntries");

            migrationBuilder.DropTable(
                name: "DebitEntry");

            migrationBuilder.DropTable(
                name: "DebitNoteCreditEntries");

            migrationBuilder.DropTable(
                name: "DebitNoteDebitEntries");

            migrationBuilder.DropTable(
                name: "InitialOpeningBalances");

            migrationBuilder.DropTable(
                name: "item_closing_stock_by_fiscal_year");

            migrationBuilder.DropTable(
                name: "item_compositions");

            migrationBuilder.DropTable(
                name: "item_initial_opening_stocks");

            migrationBuilder.DropTable(
                name: "item_opening_stock_by_fiscal_year");

            migrationBuilder.DropTable(
                name: "OfficeLocation");

            migrationBuilder.DropTable(
                name: "OpeningBalanceByFiscalYear");

            migrationBuilder.DropTable(
                name: "OpeningBalances");

            migrationBuilder.DropTable(
                name: "purchase_bill_items");

            migrationBuilder.DropTable(
                name: "purchase_return_items");

            migrationBuilder.DropTable(
                name: "sales_bill_items");

            migrationBuilder.DropTable(
                name: "sales_return_items");

            migrationBuilder.DropTable(
                name: "stock_adjustment_items");

            migrationBuilder.DropTable(
                name: "stock_entries");

            migrationBuilder.DropTable(
                name: "Transactions");

            migrationBuilder.DropTable(
                name: "UserRoles");

            migrationBuilder.DropTable(
                name: "compositions");

            migrationBuilder.DropTable(
                name: "stock_adjustments");

            migrationBuilder.DropTable(
                name: "Racks");

            migrationBuilder.DropTable(
                name: "CreditNotes");

            migrationBuilder.DropTable(
                name: "DebitNotes");

            migrationBuilder.DropTable(
                name: "JournalVouchers");

            migrationBuilder.DropTable(
                name: "Payments");

            migrationBuilder.DropTable(
                name: "Receipts");

            migrationBuilder.DropTable(
                name: "purchase_bills");

            migrationBuilder.DropTable(
                name: "purchase_returns");

            migrationBuilder.DropTable(
                name: "sales_returns");

            migrationBuilder.DropTable(
                name: "Roles");

            migrationBuilder.DropTable(
                name: "Stores");

            migrationBuilder.DropTable(
                name: "sales_bills");

            migrationBuilder.DropTable(
                name: "Settings");

            migrationBuilder.DropTable(
                name: "items");

            migrationBuilder.DropTable(
                name: "Categories");

            migrationBuilder.DropTable(
                name: "ItemCompanies");

            migrationBuilder.DropTable(
                name: "MainUnits");

            migrationBuilder.DropTable(
                name: "Units");

            migrationBuilder.DropTable(
                name: "Companies");

            migrationBuilder.DropTable(
                name: "Users");

            migrationBuilder.DropTable(
                name: "AccountGroups");

            migrationBuilder.DropTable(
                name: "FiscalYears");

            migrationBuilder.DropTable(
                name: "Accounts");
        }
    }
}
