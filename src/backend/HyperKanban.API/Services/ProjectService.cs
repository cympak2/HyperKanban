using HyperKanban.API.Models;
using HyperKanban.API.Repositories;

namespace HyperKanban.API.Services;

public interface IProjectService
{
    Task<List<Project>> GetAllAsync();
    Task<Project?> GetByIdAsync(string id);
    Task<Project> CreateAsync(string name, string code, string description);
    Task<Project> UpdateAsync(string id, string? name, string? code, string? description);
    Task DeleteAsync(string id);
    Task SeedDemoProjectAsync();
}

public class ProjectService : IProjectService
{
    private readonly IProjectRepository _projectRepository;
    private readonly IBoardRepository _boardRepository;

    public ProjectService(IProjectRepository projectRepository, IBoardRepository boardRepository)
    {
        _projectRepository = projectRepository;
        _boardRepository = boardRepository;
    }

    public Task<List<Project>> GetAllAsync() => _projectRepository.GetAllAsync();

    public Task<Project?> GetByIdAsync(string id) => _projectRepository.GetByIdAsync(id);

    public async Task<Project> CreateAsync(string name, string code, string description)
    {
        var existing = await _projectRepository.GetByCodeAsync(code.ToUpperInvariant());
        if (existing != null)
            throw new InvalidOperationException($"A project with code '{code}' already exists");

        var project = new Project
        {
            Name = name,
            Code = code.ToUpperInvariant(),
            Description = description
        };

        return await _projectRepository.CreateAsync(project);
    }

    public async Task<Project> UpdateAsync(string id, string? name, string? code, string? description)
    {
        var project = await _projectRepository.GetByIdAsync(id)
            ?? throw new InvalidOperationException($"Project with id {id} not found");

        if (code != null)
        {
            var upperCode = code.ToUpperInvariant();
            var codeConflict = await _projectRepository.GetByCodeAsync(upperCode);
            if (codeConflict != null && codeConflict.Id != id)
                throw new InvalidOperationException($"A project with code '{code}' already exists");
            project.Code = upperCode;
        }

        if (name != null) project.Name = name;
        if (description != null) project.Description = description;

        return await _projectRepository.UpdateAsync(project);
    }

    public async Task DeleteAsync(string id)
    {
        var boards = await _boardRepository.GetAllAsync();
        if (boards.Any(b => b.ProjectId == id))
            throw new InvalidOperationException("Cannot delete a project that has boards assigned to it. Reassign or delete the boards first.");

        await _projectRepository.DeleteAsync(id);
    }

    public async Task SeedDemoProjectAsync()
    {
        var projects = await _projectRepository.GetAllAsync();
        if (projects.Count > 0)
            return; // Already seeded

        var demo = new Project
        {
            Name = "Demo Project",
            Code = "DEMO",
            Description = "Default demo project containing all initial boards."
        };

        demo = await _projectRepository.CreateAsync(demo);

        // Assign all boards without a project to the demo project
        var boards = await _boardRepository.GetAllAsync();
        foreach (var board in boards.Where(b => b.ProjectId == null))
        {
            board.ProjectId = demo.Id;
            await _boardRepository.UpdateAsync(board);
        }
    }
}
