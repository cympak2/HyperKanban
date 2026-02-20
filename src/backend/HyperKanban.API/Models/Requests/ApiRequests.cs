namespace HyperKanban.API.Models.Requests;

public class CreateBoardRequest
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public List<CreateColumnRequest>? Columns { get; set; }
}

public class CreateColumnRequest
{
    public string Name { get; set; } = string.Empty;
    public ColumnType ColumnType { get; set; } = ColumnType.HumanAction;
    public int Position { get; set; }
    public string? ContainerConfigId { get; set; }
}

public class CreateWorkItemRequest
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public WorkItemPriority Priority { get; set; } = WorkItemPriority.Medium;
    public List<string> Tags { get; set; } = new();
}

public class MoveWorkItemRequest
{
    public string TargetColumnId { get; set; } = string.Empty;
    public string? Notes { get; set; }
}

public class ApproveWorkItemRequest
{
    public string? Notes { get; set; }
}

public class EditWorkItemRequest
{
    public object EditedOutput { get; set; } = new();
    public string? Notes { get; set; }
}

public class AddColumnRequest
{
    public string Name { get; set; } = string.Empty;
    public ColumnType ColumnType { get; set; } = ColumnType.HumanAction;
    public int Position { get; set; }
    public string? ContainerConfigId { get; set; } // Required for AIAgent type
}

public class TransferWorkItemRequest
{
    public string TargetBoardId { get; set; } = string.Empty;
    public string? Resolution { get; set; } // For final boards (e.g., "In Prod", "Declined")
}

public class UpdateBoardRequest
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public BoardType? Type { get; set; }
    public string? NextBoardId { get; set; } // Default target board for completed work items
    public Dictionary<string, string>? ColumnTransitionMap { get; set; } // columnId -> "boardId:columnId"
}

public class UpdateColumnRequest
{
    public string? Name { get; set; }
    public bool? IsDoneState { get; set; } // Marks column as triggering cross-board transitions
    public List<string>? AllowedResolutions { get; set; } // For terminal columns
    public ContainerConfig? ContainerConfig { get; set; } // For AI Agent columns
}
public class UpdateColumnTypeRequest
{
    public ColumnType Type { get; set; }
    public string? ContainerConfigId { get; set; } // Required when changing to AIAgent
}

public class AddCommentRequest
{
    public string Text { get; set; } = string.Empty;
}

public class UpdateWorkItemRequest
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public WorkItemPriority? Priority { get; set; }
    public List<string>? Tags { get; set; }
}