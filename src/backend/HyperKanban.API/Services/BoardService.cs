using HyperKanban.API.Models;
using HyperKanban.API.Models.Requests;
using HyperKanban.API.Repositories;

namespace HyperKanban.API.Services;

public interface IBoardService
{
    Task<Board> CreateBoardAsync(CreateBoardRequest request, string creatorEmail);
    Task<Board?> GetBoardByIdAsync(string id);
    Task<List<Board>> GetAllBoardsAsync();
    Task<Board> ActivateBoardAsync(string id);
    Task<Board> DeactivateBoardAsync(string id);
    Task<Board> AddColumnAsync(string boardId, AddColumnRequest request);
    Task<Board> UpdateBoardAsync(string boardId, UpdateBoardRequest request);
    Task<Board> UpdateColumnAsync(string boardId, string columnId, UpdateColumnRequest request);
    Task<Board> UpdateColumnTypeAsync(string boardId, string columnId, UpdateColumnTypeRequest request);
    Task<Board> DeleteColumnAsync(string boardId, string columnId);
    Task ValidateBoardConfigurationAsync(string boardId);
}

public class BoardService : IBoardService
{
    private readonly IBoardRepository _boardRepository;
    private readonly ILogger<BoardService> _logger;

    public BoardService(IBoardRepository boardRepository, ILogger<BoardService> logger)
    {
        _boardRepository = boardRepository;
        _logger = logger;
    }

    public async Task<Board> CreateBoardAsync(CreateBoardRequest request, string creatorEmail)
    {
        var board = new Board
        {
            Name = request.Name,
            Description = request.Description,
            Creator = creatorEmail,
            State = BoardState.Draft,
            Permissions = new BoardPermissions
            {
                BoardAdmins = new List<string> { creatorEmail }
            }
        };

        // Process columns if provided
        if (request.Columns != null && request.Columns.Any())
        {
            var orderedColumns = request.Columns.OrderBy(c => c.Position).ToList();
            
            // Validate first column must be HumanAction
            if (orderedColumns.First().ColumnType == ColumnType.AIAgent)
            {
                throw new InvalidOperationException("First column must be Human type");
            }
            
            // Validate last column must be HumanAction
            if (orderedColumns.Count > 1 && orderedColumns.Last().ColumnType == ColumnType.AIAgent)
            {
                throw new InvalidOperationException("Last column must be Human type");
            }
            
            // Note: AI columns can optionally have container config
            // Validation is done at board activation time
            
            // Create columns
            foreach (var colRequest in orderedColumns)
            {
                board.Columns.Add(new Column
                {
                    Name = colRequest.Name,
                    ColumnType = colRequest.ColumnType,
                    Position = colRequest.Position,
                    ContainerConfig = colRequest.ColumnType == ColumnType.AIAgent && !string.IsNullOrEmpty(colRequest.ContainerConfigId)
                        ? new ContainerConfig { ConfigId = colRequest.ContainerConfigId }
                        : null
                });
            }
        }

        return await _boardRepository.CreateAsync(board);
    }

    public async Task<Board?> GetBoardByIdAsync(string id)
    {
        return await _boardRepository.GetByIdAsync(id);
    }

    public async Task<List<Board>> GetAllBoardsAsync()
    {
        return await _boardRepository.GetAllAsync();
    }

    public async Task<Board> ActivateBoardAsync(string id)
    {
        var board = await _boardRepository.GetByIdAsync(id)
            ?? throw new InvalidOperationException($"Board {id} not found");

        // Validate configuration before activating
        await ValidateBoardConfigurationAsync(id);

        board.State = BoardState.Active;
        return await _boardRepository.UpdateAsync(board);
    }

    public async Task<Board> DeactivateBoardAsync(string id)
    {
        var board = await _boardRepository.GetByIdAsync(id)
            ?? throw new InvalidOperationException($"Board {id} not found");

        board.State = BoardState.Inactive;
        return await _boardRepository.UpdateAsync(board);
    }

    public async Task<Board> AddColumnAsync(string boardId, AddColumnRequest request)
    {
        var board = await _boardRepository.GetByIdAsync(boardId)
            ?? throw new InvalidOperationException($"Board {boardId} not found");

        // Validate AI Agent columns have container config
        if (request.ColumnType == ColumnType.AIAgent && string.IsNullOrEmpty(request.ContainerConfigId))
        {
            throw new InvalidOperationException("AI Agent columns must have a container configuration");
        }

        var column = new Column
        {
            Name = request.Name,
            ColumnType = request.ColumnType,
            Position = request.Position,
            ContainerConfig = request.ColumnType == ColumnType.AIAgent && !string.IsNullOrEmpty(request.ContainerConfigId)
                ? new ContainerConfig { ConfigId = request.ContainerConfigId }
                : null
        };

        board.Columns.Add(column);
        board.Columns = board.Columns.OrderBy(c => c.Position).ToList();

        return await _boardRepository.UpdateAsync(board);
    }

    public async Task<Board> UpdateBoardAsync(string boardId, UpdateBoardRequest request)
    {
        var board = await _boardRepository.GetByIdAsync(boardId)
            ?? throw new InvalidOperationException($"Board {boardId} not found");

        // Update board properties if provided
        if (!string.IsNullOrEmpty(request.Name))
            board.Name = request.Name;
        
        if (request.Description != null)
            board.Description = request.Description;
        
        if (request.Type.HasValue)
            board.Type = request.Type.Value;
        
        if (request.NextBoardId != null)
        {
            // Validate NextBoardId references a valid board
            if (!string.IsNullOrEmpty(request.NextBoardId))
            {
                var targetBoard = await _boardRepository.GetByIdAsync(request.NextBoardId);
                if (targetBoard == null)
                    throw new InvalidOperationException($"Target board {request.NextBoardId} not found");
                if (targetBoard.State != BoardState.Active)
                    throw new InvalidOperationException($"Target board {targetBoard.Name} is not active");
            }
            board.NextBoardId = request.NextBoardId;
        }
        
        if (request.ColumnTransitionMap != null)
        {
            // Validate ColumnTransitionMap references
            foreach (var (columnId, transition) in request.ColumnTransitionMap)
            {
                if (!board.Columns.Any(c => c.Id == columnId))
                    throw new InvalidOperationException($"Column {columnId} not found in board");
                
                if (!string.IsNullOrEmpty(transition))
                {
                    var parts = transition.Split(':');
                    if (parts.Length != 2)
                        throw new InvalidOperationException($"Invalid transition format: {transition}. Expected 'boardId:columnId'");
                    
                    var targetBoardId = parts[0];
                    var targetBoard = await _boardRepository.GetByIdAsync(targetBoardId);
                    if (targetBoard == null)
                        throw new InvalidOperationException($"Target board {targetBoardId} not found");
                }
            }
            board.ColumnTransitionMap = request.ColumnTransitionMap;
        }

        board.LastModified = DateTime.UtcNow;
        return await _boardRepository.UpdateAsync(board);
    }

    public async Task<Board> UpdateColumnAsync(string boardId, string columnId, UpdateColumnRequest request)
    {
        var board = await _boardRepository.GetByIdAsync(boardId)
            ?? throw new InvalidOperationException($"Board {boardId} not found");

        var column = board.Columns.FirstOrDefault(c => c.Id == columnId)
            ?? throw new InvalidOperationException($"Column {columnId} not found in board {boardId}");

        // Update column properties if provided
        if (!string.IsNullOrEmpty(request.Name))
            column.Name = request.Name;
        
        if (request.IsDoneState.HasValue)
            column.IsDoneState = request.IsDoneState.Value;
        
        if (request.AllowedResolutions != null)
            column.AllowedResolutions = request.AllowedResolutions;
        
        if (request.ContainerConfig != null)
        {
            if (column.ColumnType != ColumnType.AIAgent)
                throw new InvalidOperationException("Container configuration can only be set on AI Agent columns");
            column.ContainerConfig = request.ContainerConfig;
        }

        board.LastModified = DateTime.UtcNow;
        return await _boardRepository.UpdateAsync(board);
    }

    public async Task<Board> UpdateColumnTypeAsync(string boardId, string columnId, UpdateColumnTypeRequest request)
    {
        var board = await _boardRepository.GetByIdAsync(boardId)
            ?? throw new InvalidOperationException($"Board {boardId} not found");

        var column = board.Columns.FirstOrDefault(c => c.Id == columnId)
            ?? throw new InvalidOperationException($"Column {columnId} not found in board {boardId}");

        var columnIndex = board.Columns.IndexOf(column);
        var isFirstColumn = columnIndex == 0;
        var isLastColumn = columnIndex == board.Columns.Count - 1;

        // Validate first and last columns must remain HumanAction
        if (request.Type == ColumnType.AIAgent && (isFirstColumn || isLastColumn))
        {
            throw new InvalidOperationException(
                isFirstColumn 
                    ? "First column cannot be changed to AI type" 
                    : "Last column cannot be changed to AI type");
        }

        // Update column type
        column.ColumnType = request.Type;

        // Update container config based on new type
        if (request.Type == ColumnType.AIAgent)
        {
            // Set container config if provided, otherwise leave as null
            column.ContainerConfig = !string.IsNullOrEmpty(request.ContainerConfigId)
                ? new ContainerConfig { ConfigId = request.ContainerConfigId }
                : null;
        }
        else
        {
            // Clear container config when changing to HumanAction
            column.ContainerConfig = null;
        }

        board.LastModified = DateTime.UtcNow;
        return await _boardRepository.UpdateAsync(board);
    }

    public async Task<Board> DeleteColumnAsync(string boardId, string columnId)
    {
        var board = await _boardRepository.GetByIdAsync(boardId)
            ?? throw new InvalidOperationException($"Board {boardId} not found");

        var column = board.Columns.FirstOrDefault(c => c.Id == columnId)
            ?? throw new InvalidOperationException($"Column {columnId} not found in board {boardId}");

        if (board.Columns.Count <= 1)
            throw new InvalidOperationException("Cannot delete the last column. A board must have at least one column.");

        board.Columns.Remove(column);

        // Re-number positions to keep them sequential
        for (int i = 0; i < board.Columns.Count; i++)
            board.Columns[i].Position = i;

        // Remove any ColumnTransitionMap entries that used this column as a source
        board.ColumnTransitionMap.Remove(columnId);

        board.LastModified = DateTime.UtcNow;
        return await _boardRepository.UpdateAsync(board);
    }

    public async Task ValidateBoardConfigurationAsync(string boardId)
    {
        var board = await _boardRepository.GetByIdAsync(boardId)
            ?? throw new InvalidOperationException($"Board {boardId} not found");

        // BR-02: AI Agent columns must always be followed by Human Action columns
        for (int i = 0; i < board.Columns.Count - 1; i++)
        {
            if (board.Columns[i].ColumnType == ColumnType.AIAgent && 
                board.Columns[i + 1].ColumnType == ColumnType.AIAgent)
            {
                throw new InvalidOperationException(
                    $"Invalid configuration: AI Agent column '{board.Columns[i].Name}' cannot be directly followed by another AI Agent column '{board.Columns[i + 1].Name}'. Insert a Human Action column between them.");
            }
        }

        // BR-03: AI Agent columns must have container assignment
        var aiColumnsWithoutContainer = board.Columns
            .Where(c => c.ColumnType == ColumnType.AIAgent && c.ContainerConfig == null)
            .ToList();

        if (aiColumnsWithoutContainer.Any())
        {
            throw new InvalidOperationException(
                $"AI Agent columns [{string.Join(", ", aiColumnsWithoutContainer.Select(c => c.Name))}] must have container configurations assigned");
        }

        _logger.LogInformation("Board {BoardId} configuration validated successfully", boardId);
    }
}
