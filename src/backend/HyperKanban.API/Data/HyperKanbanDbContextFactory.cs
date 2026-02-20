using HyperKanban.API.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace HyperKanban.API;

/// <summary>
/// Design-time factory for creating DbContext during migrations
/// Reads connection string from appsettings.Development.json
/// </summary>
public class HyperKanbanDbContextFactory : IDesignTimeDbContextFactory<HyperKanbanDbContext>
{
    public HyperKanbanDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<HyperKanbanDbContext>();
        
        // Load configuration from appsettings.Development.json
        var configuration = new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddJsonFile("appsettings.Development.json", optional: false)
            .Build();
        
        var connectionString = configuration.GetConnectionString("MySQL")
            ?? "server=localhost;port=3306;database=hyperkanban;user=hyperkanban_user;password=HyperKanban_Dev_2024!";
        
        optionsBuilder.UseMySql(
            connectionString,
            new MySqlServerVersion(new Version(8, 0, 21)),
            options => options.EnableRetryOnFailure()
        );

        return new HyperKanbanDbContext(optionsBuilder.Options);
    }
}
