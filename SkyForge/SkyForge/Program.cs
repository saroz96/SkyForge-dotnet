using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SkyForge.Data;
using SkyForge.Models;
using SkyForge.Models.CompanyModel;
using SkyForge.Models.UserModel;
using SkyForge.Services.AccountGroupServices;
using SkyForge.Services.AccountServices;
using SkyForge.Services.CategoryServices;
using SkyForge.Services.ItemCompanyServices;
using SkyForge.Services.MainUnitServices;
using SkyForge.Services.Retailer;
using SkyForge.Services.Retailer.ItemServices;
using SkyForge.Services.Retailer.RetailerDashboardServices;
using SkyForge.Services.Retailer.SettingsServices;
using SkyForge.Services.StoreServices;
using SkyForge.Services.UnitServices;
using SkyForge.Services.UserServices;
using SkyForge.Services.Retailer.CompositionServices;
using SkyForge.Services.Retailer.PurchaseServices;
using System.Text;
using System.Text.Json.Serialization;
using SkyForge.Services.BillNumberServices;
using SkyForge.Middleware;
using SkyForge.Services.Retailer.PurchaseReturnServices;
using SkyForge.Services.Retailer.SalesQuotationServices;
using SkyForge.Services.Retailer.SalesBillServices;
using SkyForge.Services.Retailer.SalesReturnServices;
using SkyForge.Services.Retailer.StockAdjustmentServices;
using SkyForge.Services.Retailer.PaymentServices;
using SkyForge.Services.Retailer.ReceiptServices;
using SkyForge.Services.Retailer.JournalVoucherServices;
using SkyForge.Services.Retailer.DebitNoteServices;
using SkyForge.Services.Retailer.CreditNoteServices;
using SkyForge.Services.Retailer.StatementServices;
using SkyForge.Services.Retailer.AgeingReportServices;
using SkyForge.Services.Retailer.MonthlyVatSummaryServices;
using SkyForge.Services.Retailer.PartySummaryServices;
using SkyForge.Controllers.Retailer;
using SkyForge.Services.Retailer.ProfitLossServices;
using SkyForge.Services.Retailer.StockStatusServices;
using SkyForge.Services.Retailer.TransactionServices;
using SkyForge.Models.RoleModel;
using SkyForge.Services;

var builder = WebApplication.CreateBuilder(args);

// Add authentication with JWT
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]))
    };

    options.Events = new JwtBearerEvents
    {
        OnAuthenticationFailed = context =>
        {
            Console.WriteLine($"Authentication failed: {context.Exception.Message}");
            return Task.CompletedTask;
        },
        OnTokenValidated = context =>
        {
            Console.WriteLine($"Token validated for user: {context.Principal.Identity.Name}");
            return Task.CompletedTask;
        }
    };
});

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("ReactApp",
        policy =>
        {
            policy.WithOrigins("http://localhost:3000",
                               "https://localhost:3000",
                                "http://localhost:5142",
                                "https://localhost:7101",
                                "http://localhost:5000")
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials()
                  .SetIsOriginAllowed((host) => true);
        });
});

// Add services to the container.
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

if (string.IsNullOrEmpty(connectionString))
{
    throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");
}

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(connectionString));

// Add authorization services with trade type policies
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("Retailer", policy =>
        policy.Requirements.Add(new TradeTypeRequirement(TradeType.Retailer)));

    options.AddPolicy("Pharmacy", policy =>
        policy.Requirements.Add(new TradeTypeRequirement(TradeType.Pharmacy)));

    options.AddPolicy("RetailerOrPharmacy", policy =>
        policy.RequireAssertion(context =>
        {
            var httpContext = context.Resource as HttpContext;
            if (httpContext == null) return false;

            var tradeType = httpContext.Items["TradeType"] as TradeType?;
            return tradeType.HasValue &&
                  (tradeType.Value == TradeType.Retailer || tradeType.Value == TradeType.Pharmacy);
        }));
});

// Configure JSON serialization
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
        options.JsonSerializerOptions.WriteIndented = true;
    });

// Register your services
builder.Services.AddScoped<IJwtService, JwtService>();
builder.Services.AddScoped<IPasswordService, PasswordService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<ICompanyService, CompanyService>();
builder.Services.AddScoped<IFiscalYearService, FiscalYearService>();
builder.Services.AddScoped<ISettingsService, SettingsService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IAccountGroupService, AccountGroupService>();
builder.Services.AddScoped<IAccountService, AccountService>();
builder.Services.AddScoped<IItemCompanyService, ItemCompanyService>();
builder.Services.AddScoped<IUnitService, UnitService>();
builder.Services.AddScoped<IMainUnitService, MainUnitService>();
builder.Services.AddScoped<IStoreService, StoreService>();
builder.Services.AddScoped<ICategoryService, CategoryService>();
builder.Services.AddScoped<IRetailerDashboardService, RetailerDashboardService>();
builder.Services.AddScoped<IItemService, ItemService>();
builder.Services.AddScoped<ICompositionService, CompositionService>();
builder.Services.AddScoped<IPurchaseService, PurchaseService>();
builder.Services.AddScoped<IBillPrefixService, BillPrefixService>();
builder.Services.AddScoped<IBillNumberService, BillNumberService>();
builder.Services.AddScoped<IAccountBalanceService, AccountBalanceService>();
builder.Services.AddScoped<IPurchaseReturnService, PurchaseReturnService>();
builder.Services.AddScoped<ISalesQuotationService, SalesQuotationService>();
builder.Services.AddScoped<ISalesBillService, SalesBillService>();
builder.Services.AddScoped<ISalesReturnService, SalesReturnService>();
builder.Services.AddScoped<IStockAdjustmentService, StockAdjustmentService>();
builder.Services.AddScoped<IPaymentService, PaymentService>();
builder.Services.AddScoped<IReceiptService, ReceiptService>();
builder.Services.AddScoped<IJournalVoucherService, JournalVoucherService>();
builder.Services.AddScoped<IDebitNoteService, DebitNoteService>();
builder.Services.AddScoped<ICreditNoteService, CreditNoteService>();

builder.Services.AddScoped<IStatementService, StatementService>();
builder.Services.AddScoped<IAgeingReportService, AgeingReportService>();
builder.Services.AddScoped<IMonthlyVatSummaryService, MonthlyVatSummaryService>();
builder.Services.AddScoped<IPartySummaryService, PartySummaryService>();
builder.Services.AddScoped<ProfitAnalysisController>();
builder.Services.AddScoped<IProfitLossService, ProfitLossService>();
builder.Services.AddScoped<IStockStatusService, StockStatusService>();
builder.Services.AddScoped<ITransactionService, TransactionService>();

builder.Services.AddScoped<IFiscalYearTransferService, FiscalYearTransferService>();

builder.Services.AddSingleton<IAuthorizationHandler, TradeTypeAuthorizationHandler>();
builder.Services.AddHttpContextAccessor();

// Learn more about configuring Swagger/OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "Please enter JWT token in the format: Bearer {token}",
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            new string[] {}
        }
    });
});

AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    // This ensures the database and all tables are created based on your models
    dbContext.Database.EnsureCreated();
    Console.WriteLine("Database ensured created with all tables");
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("ReactApp");

// IMPORTANT: Authentication MUST come before Authorization and your custom middlewares
app.UseAuthentication();  // This populates the User claims
app.UseAuthorization();   // This checks authorization policies

// Your custom middlewares that depend on User claims should come AFTER Authentication
app.UseAuthMiddleware();  // This might be redundant now
app.UseCheckDemoPeriodMiddleware();  // This needs User claims to be populated
app.UseEnsureFiscalYearMiddleware();
app.UseCheckFiscalYearDateRangeMiddleware();

app.MapControllers();

// Database seeding
await SeedInitialDataAsync(app.Services);

app.Run();



async Task SeedInitialDataAsync(IServiceProvider serviceProvider)
{
    using var scope = serviceProvider.CreateScope();
    var userService = scope.ServiceProvider.GetRequiredService<IUserService>();
    var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

    // First, check if the Administrator role exists, if not create it
    var adminRole = await context.Roles.FirstOrDefaultAsync(r => r.Name == "Administrator");

    if (adminRole == null)
    {
        // Create the Administrator role
        adminRole = new Role
        {
            Id = Guid.NewGuid(),
            Name = "Administrator",
            Description = "Full system access with all permissions",
            Type = RoleType.System,
            PermissionLevel = 100,
            IsSystemRole = true,
            IsAssignable = true,
            IsActive = true,
            DefaultPermissions = new Dictionary<string, bool>
            {
                { "AllPermissions", true }  // Admin gets all permissions
            },
            CreatedAt = DateTime.UtcNow
        };

        await context.Roles.AddAsync(adminRole);
        await context.SaveChangesAsync();
        Console.WriteLine("Administrator role created");
    }

    // Check if admin user exists
    var adminUser = await userService.GetUserByEmailAsync("admin@example.com");

    if (adminUser == null)
    {
        // Create the admin user
        var admin = new User
        {
            Id = Guid.NewGuid(),
            Name = "Administrator",
            Email = "admin@example.com",
            IsAdmin = true,
            IsEmailVerified = true,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await userService.CreateUserAsync(admin, "Admin@123");
        adminUser = admin; // Get the created user object

        Console.WriteLine("Default admin user created");
    }

    // Check if the admin user already has the Administrator role assigned
    var existingUserRole = await context.UserRoles
        .FirstOrDefaultAsync(ur => ur.UserId == adminUser.Id && ur.RoleId == adminRole.Id);

    if (existingUserRole == null)
    {
        // Assign the Administrator role to the admin user
        var userRole = new UserRole
        {
            Id = Guid.NewGuid(),
            UserId = adminUser.Id,
            RoleId = adminRole.Id,
            IsPrimary = true,  // Set as primary role
            AssignedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            CustomPermissions = new Dictionary<string, bool>
            {
                { "AllPermissions", true }
            }
        };

        await context.UserRoles.AddAsync(userRole);
        await context.SaveChangesAsync();

        Console.WriteLine("Administrator role assigned to admin user");
    }
}

