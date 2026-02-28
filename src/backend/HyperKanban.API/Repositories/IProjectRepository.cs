using HyperKanban.API.Models;

namespace HyperKanban.API.Repositories;

public interface IProjectRepository
{
    Task<Project> CreateAsync(Project project);
    Task<Project?> GetByIdAsync(string id);
    Task<Project?> GetByCodeAsync(string code);
    Task<List<Project>> GetAllAsync();
    Task<Project> UpdateAsync(Project project);
    Task DeleteAsync(string id);
}
