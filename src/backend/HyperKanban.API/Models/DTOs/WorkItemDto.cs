namespace HyperKanban.API.Models.DTOs;

public class WorkItemDto
{
    public string Id { get; set; } = string.Empty;
    public string BoardId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string CurrentColumn { get; set; } = string.Empty;
    public WorkItemState State { get; set; }
    public WorkItemPriority Priority { get; set; }
    public List<string> Tags { get; set; } = new();
    public string Creator { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? ModifiedAt { get; set; }
    public string? PreviousBoardId { get; set; }
    public string? Resolution { get; set; }
    public string? ParentWorkItemId { get; set; }
    public string? SwimlaneBoardId { get; set; }
    
    // Full data arrays (not empty for detail view)
    public List<AuditEntry> AuditTrail { get; set; } = new();
    public List<AiProcessingRecord> AiProcessingHistory { get; set; } = new();
    public List<BoardTransition> BoardHistory { get; set; } = new();
    public List<string> ChildWorkItemIds { get; set; } = new();
    public List<Comment> Comments { get; set; } = new();

    public static WorkItemDto FromWorkItem(WorkItem workItem)
    {
        return new WorkItemDto
        {
            Id = workItem.Id,
            BoardId = workItem.BoardId,
            Title = workItem.Title,
            Description = workItem.Description,
            CurrentColumn = workItem.CurrentColumn,
            State = workItem.State,
            Priority = workItem.Priority,
            Tags = workItem.Tags ?? new(),
            Creator = workItem.Creator,
            CreatedAt = workItem.Created,
            ModifiedAt = workItem.LastModified,
            PreviousBoardId = workItem.PreviousBoardId,
            Resolution = workItem.Resolution,
            ParentWorkItemId = workItem.ParentWorkItemId,
            SwimlaneBoardId = workItem.SwimlaneBoardId,
            // Include full data for detail views
            AuditTrail = workItem.AuditTrail ?? new(),
            AiProcessingHistory = workItem.AiProcessingHistory ?? new(),
            BoardHistory = workItem.BoardHistory ?? new(),
            ChildWorkItemIds = workItem.ChildWorkItemIds ?? new(),
            Comments = workItem.Comments ?? new()
        };
    }
}
