using HyperKanban.API.Data;
using HyperKanban.API.Models;
using HyperKanban.API.Repositories;
using HyperKanban.API.Repositories.MySql;
using HyperKanban.API.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Identity.Web;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// Configure Serilog
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .WriteTo.Console()
    .WriteTo.ApplicationInsights(builder.Configuration["ApplicationInsights:ConnectionString"], TelemetryConverter.Traces)
    .CreateLogger();

builder.Host.UseSerilog();

// Add services to the container
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "HyperKanban API", Version = "v1" });
});

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(
            builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? new[] { "http://localhost:3000" }
        )
        .AllowAnyMethod()
        .AllowAnyHeader()
        .AllowCredentials();
    });
});

// Configure Azure AD authentication (optional for MVP - can be enabled later)
// builder.Services.AddMicrosoftIdentityWebApiAuthentication(builder.Configuration, "AzureAd");

// Add HTTP client for Azure REST API calls
builder.Services.AddHttpClient();

// Configure database and repositories
var connectionString = builder.Configuration.GetConnectionString("MySQL")
    ?? throw new InvalidOperationException("MySQL connection string not configured");

builder.Services.AddDbContext<HyperKanbanDbContext>(options =>
    options.UseMySql(connectionString, new MySqlServerVersion(new Version(8, 0, 21))));

builder.Services.AddScoped<IBoardRepository, MySqlBoardRepository>();
builder.Services.AddScoped<IWorkItemRepository, MySqlWorkItemRepository>();
builder.Services.AddScoped<IContainerConfigRepository, MySqlContainerConfigRepository>();

Log.Information("Using MySQL database");

// Register services
builder.Services.AddScoped<IBoardService, BoardService>();
builder.Services.AddScoped<IBoardSeedingService, BoardSeedingService>();
builder.Services.AddScoped<IWorkItemService, WorkItemService>();
builder.Services.AddScoped<IContainerExecutionService, AciExecutionService>();

var app = builder.Build();

// Initialize database
try
{
    using var scope = app.Services.CreateScope();
    var context = scope.ServiceProvider.GetRequiredService<HyperKanbanDbContext>();
    await context.Database.EnsureCreatedAsync();
    Log.Information("MySQL database initialized successfully");

    if (!await context.ContainerConfigs.AnyAsync())
    {
        await SeedMySqlContainerConfigsAsync(context);
        Log.Information("Container configs seeded successfully");
    }
}
catch (Exception ex)
{
    Log.Error(ex, "Failed to initialize database");
    throw;
}

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors();

// app.UseAuthentication(); // Enable when Azure AD is configured
app.UseAuthorization();

app.MapControllers();

Log.Information("HyperKanban API starting...");
app.Run();

// Helper method to seed container configs in MySQL
static async Task SeedMySqlContainerConfigsAsync(HyperKanbanDbContext context)
{
    var configs = new[]
    {
        new ContainerConfigEntry
        {
            Id = "idea-analyzer-v1",
            Name = "Idea Analyzer",
            Description = "AI agent that analyzes ideas and provides structured feedback",
            Version = "1.0",
            Image = "hyperkanban.azurecr.io/idea-analyzer:v1.0",
            DefaultTimeoutSeconds = 300,
            Status = ContainerStatus.Active,
            Capabilities = new ContainerCapabilities
            {
                Category = "analysis",
                SupportedInputTypes = new List<string> { "text/plain", "application/json" },
                SupportedOutputTypes = new List<string> { "application/json" }
            }
        },
        new ContainerConfigEntry
        {
            Id = "requirements-generator-v1",
            Name = "Requirements Generator",
            Description = "AI agent that generates detailed requirements from high-level descriptions",
            Version = "1.0",
            Image = "hyperkanban.azurecr.io/requirements-generator:v1.0",
            DefaultTimeoutSeconds = 300,
            Status = ContainerStatus.Active,
            Capabilities = new ContainerCapabilities
            {
                Category = "requirements",
                SupportedInputTypes = new List<string> { "text/plain", "application/json" },
                SupportedOutputTypes = new List<string> { "application/json" }
            }
        }
    };

    context.ContainerConfigs.AddRange(configs);
    await context.SaveChangesAsync();
}
