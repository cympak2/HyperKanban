using HyperKanban.API.Data;
using HyperKanban.API.Models;
using HyperKanban.API.Repositories;
using Microsoft.EntityFrameworkCore;

namespace HyperKanban.API.Repositories.MySql;

public class MySqlProjectRepository : IProjectRepository
{
    private readonly HyperKanbanDbContext _context;

    public MySqlProjectRepository(HyperKanbanDbContext context)
    {
        _context = context;
    }

    public async Task<Project> CreateAsync(Project project)
    {
        project.Created = DateTime.UtcNow;
        _context.Projects.Add(project);
        await _context.SaveChangesAsync();
        return project;
    }

    public async Task<Project?> GetByIdAsync(string id)
    {
        return await _context.Projects.FindAsync(id);
    }

    public async Task<Project?> GetByCodeAsync(string code)
    {
        return await _context.Projects
            .FirstOrDefaultAsync(p => p.Code == code);
    }

    public async Task<List<Project>> GetAllAsync()
    {
        return await _context.Projects
            .OrderBy(p => p.Name)
            .ToListAsync();
    }

    public async Task<Project> UpdateAsync(Project project)
    {
        var existing = await _context.Projects.FindAsync(project.Id)
            ?? throw new InvalidOperationException($"Project with id {project.Id} not found");

        existing.Name = project.Name;
        existing.Code = project.Code;
        existing.Description = project.Description;
        existing.CicServerUrls = project.CicServerUrls;
        existing.LastModified = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return existing;
    }

    public async Task DeleteAsync(string id)
    {
        var project = await _context.Projects.FindAsync(id)
            ?? throw new InvalidOperationException($"Project with id {id} not found");

        _context.Projects.Remove(project);
        await _context.SaveChangesAsync();
    }
}
