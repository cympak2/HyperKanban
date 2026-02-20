using System.Text.Json.Serialization;

namespace HyperKanban.API.Models;

public class WorkItem
{
    public string Id { get; set; } = $"WI-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString().Substring(0, 6)}";
    public string BoardId { get; set; } = string.Empty; // Partition key
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string CurrentColumn { get; set; } = string.Empty;
    public WorkItemState State { get; set; } = WorkItemState.Waiting;
    public WorkItemPriority Priority { get; set; } = WorkItemPriority.Medium;
    public List<string> Tags { get; set; } = new();
    public string Creator { get; set; } = string.Empty;
    public DateTime Created { get; set; } = DateTime.UtcNow;
    public DateTime? LastModified { get; set; }
    public List<AiProcessingRecord> AiProcessingHistory { get; set; } = new();
    public List<AuditEntry> AuditTrail { get; set; } = new();
    public List<Comment> Comments { get; set; } = new();
    
    // Cross-board workflow support
    public string? PreviousBoardId { get; set; } // Last board before current
    public List<BoardTransition> BoardHistory { get; set; } = new(); // Complete board journey
    public string? Resolution { get; set; } // Final outcome: "In Prod", "Declined", etc.
    
    // Parent-child workflow support (swimlanes)
    public string? ParentWorkItemId { get; set; } // Parent ticket ID if this is a child
    public List<string> ChildWorkItemIds { get; set; } = new(); // Child ticket IDs if this is a parent
    public string? SwimlaneBoardId { get; set; } // Board where this parent appears as a swimlane
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum WorkItemState
{
    Waiting,
    Processing,
    ReadyForReview,
    Error,
    Completed
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum WorkItemPriority
{
    Low,
    Medium,
    High,
    Critical
}

public class AiProcessingRecord
{
    public string StepName { get; set; } = string.Empty;
    public string ColumnId { get; set; } = string.Empty;
    public string ContainerId { get; set; } = string.Empty;
    public string ContainerImage { get; set; } = string.Empty;
    public DateTime StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public int ExecutionTimeSeconds { get; set; }
    public string Status { get; set; } = string.Empty; // success, error, timeout
    public object? Input { get; set; }
    public object? Output { get; set; }
    public string? ErrorMessage { get; set; }
}

public class AuditEntry
{
    public string Action { get; set; } = string.Empty; // created, moved, ai_processed, approved, edited, transferred, etc.
    public string Actor { get; set; } = string.Empty; // user email or "system"
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public string? FromColumn { get; set; }
    public string? ToColumn { get; set; }
    public string? FromBoard { get; set; } // For cross-board transitions
    public string? ToBoard { get; set; } // For cross-board transitions
    public string? Notes { get; set; }
    public Dictionary<string, object> Metadata { get; set; } = new();
}

public class BoardTransition
{
    public string BoardId { get; set; } = string.Empty;
    public string BoardName { get; set; } = string.Empty;
    public DateTime EnteredAt { get; set; } = DateTime.UtcNow;
    public DateTime? ExitedAt { get; set; }
    public string EntryColumn { get; set; } = string.Empty;
    public string? ExitColumn { get; set; }
}

public class Comment
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Author { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ModifiedAt { get; set; }
}
