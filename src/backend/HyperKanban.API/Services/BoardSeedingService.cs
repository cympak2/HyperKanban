using HyperKanban.API.Models;
using HyperKanban.API.Repositories;

namespace HyperKanban.API.Services;

public interface IBoardSeedingService
{
    Task<List<Board>> SeedWorkflowBoardsAsync(string creatorEmail = "system");
    Task<Dictionary<BoardType, string>> GetWorkflowBoardIdsAsync();
    Task<bool> WorkflowBoardsExistAsync();
}

public class BoardSeedingService : IBoardSeedingService
{
    private readonly IBoardRepository _boardRepository;
    private readonly ILogger<BoardSeedingService> _logger;

    public BoardSeedingService(
        IBoardRepository boardRepository,
        ILogger<BoardSeedingService> logger)
    {
        _boardRepository = boardRepository;
        _logger = logger;
    }

    public async Task<bool> WorkflowBoardsExistAsync()
    {
        var allBoards = await _boardRepository.GetAllAsync();
        var workflowTypes = new[] 
        { 
            BoardType.ProductOwner, 
            BoardType.BusinessAnalytics, 
            BoardType.Development, 
            BoardType.QA, 
            BoardType.DevOps 
        };
        
        return workflowTypes.All(type => allBoards.Any(b => b.Type == type));
    }

    public async Task<List<Board>> SeedWorkflowBoardsAsync(string creatorEmail = "system")
    {
        _logger.LogInformation("Starting workflow boards seeding...");

        // Check if boards already exist
        if (await WorkflowBoardsExistAsync())
        {
            _logger.LogInformation("Workflow boards already exist, skipping seed");
            return new List<Board>();
        }

        var templates = BoardTemplates.GetAllTemplates();
        var createdBoards = new Dictionary<BoardType, Board>();

        // First pass: Create all boards
        foreach (var template in templates)
        {
            var board = new Board
            {
                Name = template.Name,
                Description = template.Description,
                Type = template.Type,
                Creator = creatorEmail,
                State = BoardState.Active, // Workflow boards start active
                Permissions = new BoardPermissions
                {
                    BoardAdmins = new List<string> { creatorEmail }
                }
            };

            // Create columns
            foreach (var colTemplate in template.Columns)
            {
                board.Columns.Add(new Column
                {
                    Name = colTemplate.Name,
                    Position = colTemplate.Position,
                    ColumnType = colTemplate.Type,
                    IsDoneState = colTemplate.IsDoneState,
                    AllowedResolutions = colTemplate.AllowedResolutions,
                    ContainerConfig = !string.IsNullOrEmpty(colTemplate.ContainerConfigId)
                        ? new ContainerConfig { ConfigId = colTemplate.ContainerConfigId }
                        : null
                });
            }

            var created = await _boardRepository.CreateAsync(board);
            createdBoards[template.Type] = created;
            _logger.LogInformation("Created board: {BoardName} ({BoardType})", created.Name, created.Type);
        }

        // Second pass: Set up cross-board relationships
        foreach (var template in templates)
        {
            var board = createdBoards[template.Type];
            
            if (template.MultipleTransitions != null)
            {
                // Handle multiple transitions (like Development board)
                foreach (var (sourceColumnName, (targetBoardType, targetColumnName)) in template.MultipleTransitions)
                {
                    var sourceColumn = board.Columns.First(c => c.Name == sourceColumnName);
                    var targetBoard = createdBoards[targetBoardType];
                    var targetColumn = targetBoard.Columns.First(c => c.Name == targetColumnName);
                    
                    board.ColumnTransitionMap[sourceColumn.Id] = $"{targetBoard.Id}:{targetColumn.Id}";
                }
            }
            else if (template.NextBoardType.HasValue && !string.IsNullOrEmpty(template.TransitionColumnName))
            {
                // Handle single transition
                var sourceColumn = board.Columns.First(c => c.Name == template.TransitionColumnName);
                var targetBoard = createdBoards[template.NextBoardType.Value];
                var targetColumn = targetBoard.Columns.First(c => c.Name == template.TargetColumnName);
                
                board.ColumnTransitionMap[sourceColumn.Id] = $"{targetBoard.Id}:{targetColumn.Id}";
                board.NextBoardId = targetBoard.Id;
            }

            await _boardRepository.UpdateAsync(board);
            _logger.LogInformation("Configured transitions for board: {BoardName}", board.Name);
        }

        _logger.LogInformation("Workflow boards seeding completed. Created {Count} boards", createdBoards.Count);
        return createdBoards.Values.ToList();
    }

    public async Task<Dictionary<BoardType, string>> GetWorkflowBoardIdsAsync()
    {
        var allBoards = await _boardRepository.GetAllAsync();
        return allBoards
            .Where(b => b.Type != BoardType.Custom)
            .ToDictionary(b => b.Type, b => b.Id);
    }
}
