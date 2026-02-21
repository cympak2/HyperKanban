using HyperKanban.API.Models;
using HyperKanban.API.Models.Requests;
using HyperKanban.API.Repositories;

namespace HyperKanban.API.Services;

public interface IWorkItemService
{
    Task<WorkItem> CreateWorkItemAsync(string boardId, CreateWorkItemRequest request, string creatorEmail);
    Task<WorkItem?> GetWorkItemByIdAsync(string id, string boardId);
    Task<List<WorkItem>> GetWorkItemsByBoardAsync(string boardId);
    Task<List<WorkItem>> GetWorkItemsByColumnAsync(string boardId, string columnId);
    Task<WorkItem> MoveWorkItemAsync(string workItemId, string boardId, MoveWorkItemRequest request, string actorEmail);
    Task<WorkItem> ApproveAndAdvanceAsync(string workItemId, string boardId, string approverEmail, ApproveWorkItemRequest? request);
    Task<WorkItem> EditAndAdvanceAsync(string workItemId, string boardId, EditWorkItemRequest request, string editorEmail);
    Task<WorkItem> TransferToBoardAsync(string workItemId, string sourceBoardId, string targetBoardId, string actorEmail, string? resolution = null);
    Task ProcessAiColumnAsync(WorkItem workItem, Column column);
    
    // Parent-child workflow methods
    Task<WorkItem> CreateChildWorkflowAsync(string parentWorkItemId, string parentBoardId, string targetBoardId, string targetColumnId, string actorEmail);
    Task<WorkItem> CreateChildTicketAsync(string parentWorkItemId, string parentBoardId, CreateWorkItemRequest request, string creatorEmail);
    Task<List<Swimlane>> GetSwimlanesForBoardAsync(string boardId);
    Task<List<WorkItem>> GetChildTicketsAsync(string parentWorkItemId, string parentBoardId);
    Task<(int total, int completed, bool allComplete)> CheckChildCompletionStatusAsync(string parentWorkItemId, string parentBoardId);
    
    // Update and comment methods
    Task<Comment> AddCommentAsync(string workItemId, string boardId, string text, string author);
    Task<WorkItem> UpdateWorkItemAsync(string workItemId, string boardId, UpdateWorkItemRequest request, string actorEmail);
}

public class WorkItemService : IWorkItemService
{
    private readonly IWorkItemRepository _workItemRepository;
    private readonly IBoardRepository _boardRepository;
    private readonly IContainerExecutionService _containerExecutionService;
    private readonly ILogger<WorkItemService> _logger;

    public WorkItemService(
        IWorkItemRepository workItemRepository,
        IBoardRepository boardRepository,
        IContainerExecutionService containerExecutionService,
        ILogger<WorkItemService> logger)
    {
        _workItemRepository = workItemRepository;
        _boardRepository = boardRepository;
        _containerExecutionService = containerExecutionService;
        _logger = logger;
    }

    public async Task<WorkItem> CreateWorkItemAsync(string boardId, CreateWorkItemRequest request, string creatorEmail)
    {
        var board = await _boardRepository.GetByIdAsync(boardId)
            ?? throw new InvalidOperationException($"Board {boardId} not found");

        if (board.State != BoardState.Active)
        {
            throw new InvalidOperationException("Cannot create work items on inactive boards");
        }

        var workItem = new WorkItem
        {
            BoardId = boardId,
            Title = request.Title,
            Description = request.Description,
            Priority = request.Priority,
            Tags = request.Tags,
            Creator = creatorEmail,
            CurrentColumn = board.Columns.First().Id, // Start in first column
            State = WorkItemState.Waiting
        };

        workItem.AuditTrail.Add(new AuditEntry
        {
            Action = "created",
            Actor = creatorEmail,
            Notes = "Work item created"
        });

        return await _workItemRepository.CreateAsync(workItem);
    }

    public async Task<WorkItem?> GetWorkItemByIdAsync(string id, string boardId)
    {
        var workItem = await _workItemRepository.GetByIdAsync(id, boardId);
        _logger.LogInformation("GetWorkItemByIdAsync: Retrieved work item {Id} - Comments count: {Count}", id, workItem?.Comments?.Count ?? 0);
        if (workItem?.Comments != null && workItem.Comments.Count > 0)
        {
            _logger.LogInformation("GetWorkItemByIdAsync: Comments: {Comments}", 
                string.Join(", ", workItem.Comments.Select(c => $"{c.Id}: {c.Text}")));
        }
        return workItem;
    }

    public async Task<List<WorkItem>> GetWorkItemsByBoardAsync(string boardId)
    {
        return await _workItemRepository.GetByBoardIdAsync(boardId);
    }

    public async Task<List<WorkItem>> GetWorkItemsByColumnAsync(string boardId, string columnId)
    {
        return await _workItemRepository.GetByColumnAsync(boardId, columnId);
    }

    public async Task<WorkItem> MoveWorkItemAsync(
        string workItemId,
        string boardId,
        MoveWorkItemRequest request,
        string actorEmail)
    {
        var workItem = await _workItemRepository.GetByIdAsync(workItemId, boardId)
            ?? throw new InvalidOperationException($"Work item {workItemId} not found");

        var board = await _boardRepository.GetByIdAsync(boardId)
            ?? throw new InvalidOperationException($"Board {boardId} not found");

        var fromColumn = board.Columns.FirstOrDefault(c => c.Id == workItem.CurrentColumn);
        var toColumn = board.Columns.FirstOrDefault(c => c.Id == request.TargetColumnId)
            ?? throw new InvalidOperationException($"Column {request.TargetColumnId} not found");

        // Check if moving to a column that triggers cross-board transfer
        if (toColumn.IsDoneState)
        {
            _logger.LogInformation(
                "Work item {WorkItemId} moved to done state column {ColumnName}, checking for cross-board transition",
                workItemId, toColumn.Name);

            // Check for specific column transition mapping first
            if (board.ColumnTransitionMap.TryGetValue(toColumn.Id, out var transitionTarget) && 
                !string.IsNullOrEmpty(transitionTarget))
            {
                // Parse "boardId:columnId" format
                var parts = transitionTarget.Split(':');
                if (parts.Length == 2)
                {
                    var targetBoardId = parts[0];
                    _logger.LogInformation(
                        "Column transition map found: creating child workflow for work item {WorkItemId} on board {TargetBoardId}",
                        workItemId, targetBoardId);
                    
                    // Create child workflow (parent moves to target column, child appears on target board in swimlane)
                    return await CreateChildWorkflowAsync(workItemId, boardId, targetBoardId, request.TargetColumnId, actorEmail);
                }
            }
            // Fall back to default NextBoardId if configured
            else if (!string.IsNullOrEmpty(board.NextBoardId))
            {
                _logger.LogInformation(
                    "Using NextBoardId: creating child workflow for work item {WorkItemId} on board {NextBoardId}",
                    workItemId, board.NextBoardId);
                
                // Create child workflow on next board
                return await CreateChildWorkflowAsync(workItemId, boardId, board.NextBoardId, request.TargetColumnId, actorEmail);
            }
        }

        // Normal column move (no cross-board transfer)
        workItem.CurrentColumn = request.TargetColumnId;
        workItem.State = WorkItemState.Waiting;

        // Add audit entry
        workItem.AuditTrail.Add(new AuditEntry
        {
            Action = "moved",
            Actor = actorEmail,
            FromColumn = fromColumn?.Name,
            ToColumn = toColumn.Name,
            Notes = request.Notes
        });

        workItem = await _workItemRepository.UpdateAsync(workItem);

        // If moved to AI Agent column, trigger container execution
        if (toColumn.ColumnType == ColumnType.AIAgent)
        {
            _ = Task.Run(async () => await ProcessAiColumnAsync(workItem, toColumn));
        }

        return workItem;
    }

    public async Task<WorkItem> ApproveAndAdvanceAsync(
        string workItemId,
        string boardId,
        string approverEmail,
        ApproveWorkItemRequest? request = null)
    {
        var workItem = await _workItemRepository.GetByIdAsync(workItemId, boardId)
            ?? throw new InvalidOperationException($"Work item {workItemId} not found");

        var board = await _boardRepository.GetByIdAsync(boardId)
            ?? throw new InvalidOperationException($"Board {boardId} not found");

        // Find next column
        var currentColumnIndex = board.Columns.FindIndex(c => c.Id == workItem.CurrentColumn);
        if (currentColumnIndex == -1 || currentColumnIndex >= board.Columns.Count - 1)
        {
            throw new InvalidOperationException("Work item is already at the last column");
        }

        var nextColumn = board.Columns[currentColumnIndex + 1];

        // Add audit entry for approval
        workItem.AuditTrail.Add(new AuditEntry
        {
            Action = "approved",
            Actor = approverEmail,
            FromColumn = board.Columns[currentColumnIndex].Name,
            ToColumn = nextColumn.Name,
            Notes = request?.Notes
        });

        // Move to next column
        workItem.CurrentColumn = nextColumn.Id;
        workItem.State = WorkItemState.Waiting;

        workItem = await _workItemRepository.UpdateAsync(workItem);

        // If next column is AI Agent, trigger execution
        if (nextColumn.ColumnType == ColumnType.AIAgent)
        {
            _ = Task.Run(async () => await ProcessAiColumnAsync(workItem, nextColumn));
        }

        return workItem;
    }

    public async Task<WorkItem> EditAndAdvanceAsync(
        string workItemId,
        string boardId,
        EditWorkItemRequest request,
        string editorEmail)
    {
        var workItem = await _workItemRepository.GetByIdAsync(workItemId, boardId)
            ?? throw new InvalidOperationException($"Work item {workItemId} not found");

        if (workItem.AiProcessingHistory.Any())
        {
            var latestResult = workItem.AiProcessingHistory.Last();
            latestResult.Output = request.EditedOutput; // Update with edited content
        }

        workItem.AuditTrail.Add(new AuditEntry
        {
            Action = "edited",
            Actor = editorEmail,
            Notes = request.Notes,
            Metadata = new Dictionary<string, object>
            {
                { "edited_output", request.EditedOutput }
            }
        });

        return await ApproveAndAdvanceAsync(workItemId, boardId, editorEmail, new ApproveWorkItemRequest { Notes = "Edited and approved" });
    }

    public async Task ProcessAiColumnAsync(WorkItem workItem, Column column)
    {
        try
        {
            _logger.LogInformation("Processing work item {WorkItemId} in AI column {ColumnName}",
                workItem.Id, column.Name);

            // Update state to Processing
            workItem.State = WorkItemState.Processing;
            workItem.AuditTrail.Add(new AuditEntry
            {
                Action = "ai_processing_started",
                Actor = "system",
                Notes = $"Starting AI processing in column '{column.Name}'"
            });
            await _workItemRepository.UpdateAsync(workItem);

            // Prepare input payload for container
            var inputPayload = new
            {
                workItemId = workItem.Id,
                title = workItem.Title,
                description = workItem.Description,
                priority = workItem.Priority.ToString(),
                tags = workItem.Tags,
                previousResults = workItem.AiProcessingHistory.Select(h => h.Output).ToList(),
                boardContext = new
                {
                    columnName = column.Name
                }
            };

            // Execute container
            var result = await _containerExecutionService.ExecuteContainerAsync(
                workItem.Id,
                column.ContainerConfig!.Image,
                inputPayload,
                column.ContainerConfig.TimeoutSeconds
            );

            // Record AI processing result
            var processingRecord = new AiProcessingRecord
            {
                StepName = column.Name,
                ColumnId = column.Id,
                ContainerId = column.ContainerConfig.ConfigId,
                ContainerImage = column.ContainerConfig.Image,
                StartedAt = DateTime.UtcNow.AddSeconds(-result.ExecutionTimeSeconds),
                CompletedAt = DateTime.UtcNow,
                ExecutionTimeSeconds = result.ExecutionTimeSeconds,
                Status = result.Success ? "success" : "error",
                Input = inputPayload,
                Output = result.Output,
                ErrorMessage = result.ErrorMessage
            };

            workItem.AiProcessingHistory.Add(processingRecord);

            if (result.Success)
            {
                // Move to next column automatically (assuming next is Human checkpoint)
                var board = await _boardRepository.GetByIdAsync(workItem.BoardId);
                var currentColumnIndex = board!.Columns.FindIndex(c => c.Id == column.Id);
                if (currentColumnIndex < board.Columns.Count - 1)
                {
                    var nextColumn = board.Columns[currentColumnIndex + 1];
                    workItem.CurrentColumn = nextColumn.Id;
                    workItem.State = WorkItemState.ReadyForReview;

                    workItem.AuditTrail.Add(new AuditEntry
                    {
                        Action = "ai_processed_success",
                        Actor = "system",
                        FromColumn = column.Name,
                        ToColumn = nextColumn.Name,
                        Notes = "AI processing completed successfully, advanced to checkpoint"
                    });
                }
            }
            else
            {
                workItem.State = WorkItemState.Error;
                workItem.AuditTrail.Add(new AuditEntry
                {
                    Action = "ai_processing_failed",
                    Actor = "system",
                    Notes = $"AI processing failed: {result.ErrorMessage}"
                });
            }

            await _workItemRepository.UpdateAsync(workItem);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing work item {WorkItemId} in AI column", workItem.Id);
            
            workItem.State = WorkItemState.Error;
            workItem.AuditTrail.Add(new AuditEntry
            {
                Action = "ai_processing_error",
                Actor = "system",
                Notes = $"Unexpected error: {ex.Message}"
            });
            await _workItemRepository.UpdateAsync(workItem);
        }
    }

    public async Task<WorkItem> TransferToBoardAsync(
        string workItemId,
        string sourceBoardId,
        string targetBoardId,
        string actorEmail,
        string? resolution = null)
    {
        var workItem = await _workItemRepository.GetByIdAsync(workItemId, sourceBoardId)
            ?? throw new InvalidOperationException($"Work item {workItemId} not found on board {sourceBoardId}");

        var sourceBoard = await _boardRepository.GetByIdAsync(sourceBoardId)
            ?? throw new InvalidOperationException($"Source board {sourceBoardId} not found");

        var targetBoard = await _boardRepository.GetByIdAsync(targetBoardId)
            ?? throw new InvalidOperationException($"Target board {targetBoardId} not found");

        var currentColumn = sourceBoard.Columns.FirstOrDefault(c => c.Id == workItem.CurrentColumn);
        
        // Validate transition is configured
        string? targetColumnInfo = null;
        if (currentColumn != null && sourceBoard.ColumnTransitionMap.TryGetValue(currentColumn.Id, out targetColumnInfo))
        {
            // Parse "boardId:columnId" format
            var parts = targetColumnInfo.Split(':');
            if (parts.Length == 2 && parts[0] != targetBoardId)
            {
                throw new InvalidOperationException(
                    $"Column {currentColumn.Name} is configured to transition to a different board");
            }
        }

        // Determine target column
        Column targetColumn;
        if (!string.IsNullOrEmpty(targetColumnInfo))
        {
            var columnId = targetColumnInfo.Split(':')[1];
            targetColumn = targetBoard.Columns.FirstOrDefault(c => c.Id == columnId)
                ?? targetBoard.Columns.First(); // Fallback to first column
        }
        else
        {
            targetColumn = targetBoard.Columns.First(); // Default to first column
        }

        // Record board transition history
        var currentBoardTransition = workItem.BoardHistory.FirstOrDefault(h => h.BoardId == sourceBoardId && !h.ExitedAt.HasValue);
        if (currentBoardTransition != null)
        {
            currentBoardTransition.ExitedAt = DateTime.UtcNow;
            currentBoardTransition.ExitColumn = currentColumn?.Name;
        }

        workItem.BoardHistory.Add(new BoardTransition
        {
            BoardId = targetBoardId,
            BoardName = targetBoard.Name,
            EnteredAt = DateTime.UtcNow,
            EntryColumn = targetColumn.Name
        });

        // Update work item
        workItem.PreviousBoardId = sourceBoardId;
        workItem.BoardId = targetBoardId;
        workItem.CurrentColumn = targetColumn.Id;
        workItem.State = WorkItemState.Waiting;
        
        if (!string.IsNullOrEmpty(resolution))
        {
            workItem.Resolution = resolution;
        }

        // Add audit entry
        workItem.AuditTrail.Add(new AuditEntry
        {
            Action = "transferred",
            Actor = actorEmail,
            FromBoard = sourceBoard.Name,
            ToBoard = targetBoard.Name,
            FromColumn = currentColumn?.Name,
            ToColumn = targetColumn.Name,
            Notes = $"Transferred from {sourceBoard.Name} to {targetBoard.Name}",
            Metadata = new Dictionary<string, object>
            {
                ["sourceBoardId"] = sourceBoardId,
                ["targetBoardId"] = targetBoardId,
                ["resolution"] = resolution ?? ""
            }
        });

        _logger.LogInformation(
            "Transferring work item {WorkItemId} from board {SourceBoard} to {TargetBoard}",
            workItemId, sourceBoard.Name, targetBoard.Name);

        return await _workItemRepository.UpdateAsync(workItem);
    }

    /// <summary>
    /// Creates a child workflow - parent stays on current board, child created on target board in swimlane
    /// </summary>
    public async Task<WorkItem> CreateChildWorkflowAsync(
        string parentWorkItemId,
        string parentBoardId,
        string targetBoardId,
        string targetColumnId,
        string actorEmail)
    {
        var parent = await _workItemRepository.GetByIdAsync(parentWorkItemId, parentBoardId)
            ?? throw new InvalidOperationException($"Parent work item {parentWorkItemId} not found");

        var parentBoard = await _boardRepository.GetByIdAsync(parentBoardId)
            ?? throw new InvalidOperationException($"Parent board {parentBoardId} not found");

        var targetBoard = await _boardRepository.GetByIdAsync(targetBoardId)
            ?? throw new InvalidOperationException($"Target board {targetBoardId} not found");

        var fromColumn = parentBoard.Columns.FirstOrDefault(c => c.Id == parent.CurrentColumn);
        var toColumn = parentBoard.Columns.FirstOrDefault(c => c.Id == targetColumnId);

        // Check if child workflow already exists on target board
        if (parent.SwimlaneBoardId == targetBoardId && parent.ChildWorkItemIds.Any())
        {
            _logger.LogInformation(
                "Child workflow already exists for {ParentId} on board {TargetBoard}, skipping creation",
                parentWorkItemId, targetBoard.Name);

            // Just move parent to target column
            parent.CurrentColumn = targetColumnId;
            parent.AuditTrail.Add(new AuditEntry
            {
                Action = "moved",
                Actor = actorEmail,
                FromColumn = fromColumn?.Name,
                ToColumn = toColumn?.Name,
                Notes = "Moved to column (child workflow already exists)"
            });

            await _workItemRepository.UpdateAsync(parent);
            return parent;
        }

        // Create first child work item on target board
        var child = new WorkItem
        {
            BoardId = targetBoardId,
            Title = $"[Child] {parent.Title}",
            Description = parent.Description,
            Priority = parent.Priority,
            Tags = parent.Tags.Concat(new[] { "child-ticket" }).ToList(),
            Creator = actorEmail,
            CurrentColumn = targetBoard.Columns.First().Id,
            State = WorkItemState.Waiting,
            ParentWorkItemId = parentWorkItemId
        };

        child.AuditTrail.Add(new AuditEntry
        {
            Action = "created_as_child",
            Actor = actorEmail,
            Notes = $"Created as child of {parentWorkItemId} from board {parentBoard.Name}",
            Metadata = new Dictionary<string, object>
            {
                ["parentWorkItemId"] = parentWorkItemId,
                ["parentBoardId"] = parentBoardId
            }
        });

        child = await _workItemRepository.CreateAsync(child);

        // Update parent: move to target column, reference child and swimlane board
        parent.CurrentColumn = targetColumnId;
        parent.ChildWorkItemIds.Add(child.Id);
        parent.SwimlaneBoardId = targetBoardId;

        parent.AuditTrail.Add(new AuditEntry
        {
            Action = "child_workflow_created",
            Actor = actorEmail,
            FromColumn = fromColumn?.Name,
            ToColumn = toColumn?.Name,
            Notes = $"Child workflow created on board {targetBoard.Name}",
            Metadata = new Dictionary<string, object>
            {
                ["childWorkItemId"] = child.Id,
                ["swimlaneBoardId"] = targetBoardId
            }
        });

        await _workItemRepository.UpdateAsync(parent);

        _logger.LogInformation(
            "Created child workflow: Parent {ParentId} on board {ParentBoard}, Child {ChildId} on board {TargetBoard}",
            parentWorkItemId, parentBoard.Name, child.Id, targetBoard.Name);

        return parent;
    }

    /// <summary>
    /// Create additional child ticket for an existing parent (manual creation in swimlane)
    /// </summary>
    public async Task<WorkItem> CreateChildTicketAsync(
        string parentWorkItemId,
        string parentBoardId,
        CreateWorkItemRequest request,
        string creatorEmail)
    {
        var parent = await _workItemRepository.GetByIdAsync(parentWorkItemId, parentBoardId)
            ?? throw new InvalidOperationException($"Parent work item {parentWorkItemId} not found");

        if (string.IsNullOrEmpty(parent.SwimlaneBoardId))
        {
            throw new InvalidOperationException("Parent work item does not have an active swimlane");
        }

        var targetBoard = await _boardRepository.GetByIdAsync(parent.SwimlaneBoardId)
            ?? throw new InvalidOperationException($"Target board {parent.SwimlaneBoardId} not found");

        var child = new WorkItem
        {
            BoardId = parent.SwimlaneBoardId,
            Title = request.Title,
            Description = request.Description,
            Priority = request.Priority,
            Tags = request.Tags.Concat(new[] { "child-ticket" }).ToList(),
            Creator = creatorEmail,
            CurrentColumn = targetBoard.Columns.First().Id,
            State = WorkItemState.Waiting,
            ParentWorkItemId = parentWorkItemId
        };

        child.AuditTrail.Add(new AuditEntry
        {
            Action = "created_as_child",
            Actor = creatorEmail,
            Notes = $"Created as additional child of {parentWorkItemId}",
            Metadata = new Dictionary<string, object>
            {
                ["parentWorkItemId"] = parentWorkItemId,
                ["parentBoardId"] = parentBoardId
            }
        });

        child = await _workItemRepository.CreateAsync(child);

        // Update parent to reference new child
        parent.ChildWorkItemIds.Add(child.Id);
        parent.AuditTrail.Add(new AuditEntry
        {
            Action = "child_ticket_added",
            Actor = creatorEmail,
            Notes = $"Additional child ticket {child.Id} created",
            Metadata = new Dictionary<string, object>
            {
                ["childWorkItemId"] = child.Id
            }
        });

        await _workItemRepository.UpdateAsync(parent);

        _logger.LogInformation(
            "Created additional child ticket {ChildId} for parent {ParentId}",
            child.Id, parentWorkItemId);

        return child;
    }

    /// <summary>
    /// Get all swimlanes (parent work items) for a board
    /// </summary>
    public async Task<List<Swimlane>> GetSwimlanesForBoardAsync(string boardId)
    {
        // Find all work items that have this board as their swimlane board
        var parentsWithSwimlanes = await _workItemRepository.GetBySwimlaneBoardIdAsync(boardId);

        var swimlanes = new List<Swimlane>();
        var boardCache = new Dictionary<string, Board>();

        foreach (var parent in parentsWithSwimlanes)
        {
            // Cache board lookups to avoid repeated queries
            if (!boardCache.ContainsKey(parent.BoardId))
            {
                var board = await _boardRepository.GetByIdAsync(parent.BoardId);
                if (board != null)
                {
                    boardCache[parent.BoardId] = board;
                }
            }

            var parentBoard = boardCache.GetValueOrDefault(parent.BoardId);
            if (parentBoard == null) continue;

            var (total, completed, allComplete) = await CheckChildCompletionStatusAsync(parent.Id, parent.BoardId);

            swimlanes.Add(new Swimlane
            {
                Id = parent.Id,
                ParentWorkItemId = parent.Id,
                ParentTitle = parent.Title,
                ParentBoardId = parent.BoardId,
                ParentBoardName = parentBoard.Name,
                ParentCurrentColumn = parent.CurrentColumn,
                ChildCount = total,
                CompletedChildCount = completed,
                IsAllChildrenComplete = allComplete,
                CreatedAt = parent.Created,
                Priority = parent.Priority,
                Tags = parent.Tags
            });
        }

        return swimlanes;
    }

    /// <summary>
    /// Get all child tickets for a parent work item.
    /// Returns an empty list if the parent is not found (e.g. orphaned references after board transfers).
    /// </summary>
    public async Task<List<WorkItem>> GetChildTicketsAsync(string parentWorkItemId, string parentBoardId)
    {
        var parent = await _workItemRepository.GetByIdAsync(parentWorkItemId, parentBoardId);

        // Parent not found — could be orphaned data after a board transfer; return empty gracefully
        if (parent == null)
        {
            _logger.LogWarning(
                "GetChildTicketsAsync: parent work item {ParentId} not found on board {BoardId} — returning empty list",
                parentWorkItemId, parentBoardId);
            return new List<WorkItem>();
        }

        if (string.IsNullOrEmpty(parent.SwimlaneBoardId))
        {
            return new List<WorkItem>();
        }

        var childrenOnTargetBoard = await _workItemRepository.GetByBoardIdAsync(parent.SwimlaneBoardId);
        return childrenOnTargetBoard.Where(wi => wi.ParentWorkItemId == parentWorkItemId).ToList();
    }

    /// <summary>
    /// Check completion status of all child tickets for a parent.
    /// A child is considered complete when it is either:
    ///   (a) in the last column of its board, OR
    ///   (b) has its own sub-workflow and that sub-workflow is fully complete.
    /// This allows completion to bubble up through multi-level board hierarchies.
    /// </summary>
    public async Task<(int total, int completed, bool allComplete)> CheckChildCompletionStatusAsync(
        string parentWorkItemId,
        string parentBoardId)
    {
        var children = await GetChildTicketsAsync(parentWorkItemId, parentBoardId);
        var total = children.Count;

        if (total == 0)
        {
            return (0, 0, false);
        }

        var parent = await _workItemRepository.GetByIdAsync(parentWorkItemId, parentBoardId);
        var targetBoard = await _boardRepository.GetByIdAsync(parent!.SwimlaneBoardId!);

        // Completion is defined as being in the last column (highest Position) on the child board.
        // IsDoneState is intentionally NOT used here — it marks cross-board transfer triggers,
        // not necessarily the final "Done" column.
        var lastColumn = targetBoard!.Columns.OrderByDescending(c => c.Position).FirstOrDefault();
        var lastColumnId = lastColumn?.Id;

        int completed = 0;
        foreach (var child in children)
        {
            if (lastColumnId != null && child.CurrentColumn == lastColumnId)
            {
                // (a) child is in the last column — directly complete
                completed++;
            }
            else if (!string.IsNullOrEmpty(child.SwimlaneBoardId) && child.ChildWorkItemIds.Any())
            {
                // (b) child has its own sub-workflow — check if it is fully complete
                var (_, _, subAllComplete) = await CheckChildCompletionStatusAsync(child.Id, targetBoard.Id);
                if (subAllComplete)
                    completed++;
            }
        }

        var allComplete = completed == total;

        // Check if we should auto-advance the parent
        if (allComplete)
        {
            var parentBoard = await _boardRepository.GetByIdAsync(parentBoardId);
            var currentColumn = parentBoard!.Columns.FirstOrDefault(c => c.Id == parent.CurrentColumn);

            if (currentColumn?.AutoAdvanceParentOnChildCompletion == true)
            {
                _logger.LogInformation(
                    "All children complete for parent {ParentId}, auto-advancing parent",
                    parentWorkItemId);

                // Find next column
                var currentColumnIndex = parentBoard.Columns.FindIndex(c => c.Id == parent.CurrentColumn);
                if (currentColumnIndex >= 0 && currentColumnIndex < parentBoard.Columns.Count - 1)
                {
                    var nextColumn = parentBoard.Columns[currentColumnIndex + 1];
                    parent.CurrentColumn = nextColumn.Id;

                    parent.AuditTrail.Add(new AuditEntry
                    {
                        Action = "auto_advanced",
                        Actor = "system",
                        FromColumn = currentColumn.Name,
                        ToColumn = nextColumn.Name,
                        Notes = "Auto-advanced after all child tickets completed"
                    });

                    await _workItemRepository.UpdateAsync(parent);
                }
            }
        }

        return (total, completed, allComplete);
    }

    public async Task<Comment> AddCommentAsync(string workItemId, string boardId, string text, string author)
    {
        var workItem = await _workItemRepository.GetByIdAsync(workItemId, boardId)
            ?? throw new InvalidOperationException($"Work item {workItemId} not found");

        _logger.LogInformation("AddCommentAsync: Work item before adding comment - Comments count: {Count}", workItem.Comments?.Count ?? 0);

        var comment = new Comment
        {
            Author = author,
            Text = text,
            CreatedAt = DateTime.UtcNow
        };

        if (workItem.Comments == null)
        {
            workItem.Comments = new List<Comment>();
        }
        workItem.Comments.Add(comment);
        workItem.LastModified = DateTime.UtcNow;

        _logger.LogInformation("AddCommentAsync: Work item after adding comment - Comments count: {Count}", workItem.Comments.Count);

        workItem.AuditTrail.Add(new AuditEntry
        {
            Action = "comment_added",
            Actor = author,
            Notes = $"Added comment: {text.Substring(0, Math.Min(50, text.Length))}{(text.Length > 50 ? "..." : "")}"
        });

        var updatedWorkItem = await _workItemRepository.UpdateAsync(workItem);
        _logger.LogInformation("AddCommentAsync: After UpdateAsync - Comments count: {Count}", updatedWorkItem.Comments?.Count ?? 0);

        return comment;
    }

    public async Task<WorkItem> UpdateWorkItemAsync(string workItemId, string boardId, UpdateWorkItemRequest request, string actorEmail)
    {
        var workItem = await _workItemRepository.GetByIdAsync(workItemId, boardId)
            ?? throw new InvalidOperationException($"Work item {workItemId} not found");

        var changes = new List<string>();

        if (request.Title != null && request.Title != workItem.Title)
        {
            changes.Add($"Title: '{workItem.Title}' → '{request.Title}'");
            workItem.Title = request.Title;
        }

        if (request.Description != null && request.Description != workItem.Description)
        {
            changes.Add($"Description updated");
            workItem.Description = request.Description;
        }

        if (request.Priority.HasValue && request.Priority.Value != workItem.Priority)
        {
            changes.Add($"Priority: {workItem.Priority} → {request.Priority.Value}");
            workItem.Priority = request.Priority.Value;
        }

        if (request.Tags != null)
        {
            changes.Add($"Tags updated");
            workItem.Tags = request.Tags;
        }

        if (changes.Any())
        {
            workItem.LastModified = DateTime.UtcNow;

            workItem.AuditTrail.Add(new AuditEntry
            {
                Action = "updated",
                Actor = actorEmail,
                Notes = string.Join(", ", changes)
            });

            await _workItemRepository.UpdateAsync(workItem);
        }

        return workItem;
    }
}
