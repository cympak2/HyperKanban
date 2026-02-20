using HyperKanban.API.Data;
using HyperKanban.API.Models;
using HyperKanban.API.Repositories;
using Microsoft.EntityFrameworkCore;

namespace HyperKanban.API.Repositories.MySql;

public class MySqlContainerConfigRepository : IContainerConfigRepository
{
    private readonly HyperKanbanDbContext _context;

    public MySqlContainerConfigRepository(HyperKanbanDbContext context)
    {
        _context = context;
    }

    public async Task<List<ContainerConfigEntry>> GetAllActiveContainersAsync()
    {
        return await _context.ContainerConfigs
            .Where(c => c.Status == ContainerStatus.Active)
            .OrderBy(c => c.Name)
            .ToListAsync();
    }

    public async Task<ContainerConfigEntry?> GetByIdAsync(string id)
    {
        return await _context.ContainerConfigs.FindAsync(id);
    }

    public async Task<ContainerConfigEntry> CreateAsync(ContainerConfigEntry config)
    {
        config.Created = DateTime.UtcNow;
        _context.ContainerConfigs.Add(config);
        await _context.SaveChangesAsync();
        return config;
    }

    public async Task<ContainerConfigEntry> UpdateAsync(ContainerConfigEntry config)
    {
        var existing = await _context.ContainerConfigs.FindAsync(config.Id);
        if (existing == null)
            throw new InvalidOperationException($"ContainerConfig with id {config.Id} not found");

        _context.Entry(existing).CurrentValues.SetValues(config);
        
        // Update complex properties
        existing.Capabilities = config.Capabilities;
        existing.Metrics = config.Metrics;
        
        await _context.SaveChangesAsync();
        return existing;
    }

    public async Task UpdateMetricsAsync(string id, ContainerMetrics metrics)
    {
        var config = await _context.ContainerConfigs.FindAsync(id);
        if (config != null)
        {
            config.Metrics = metrics;
            config.LastTested = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }
    }
}
