namespace HyperKanban.API.Models;

/// <summary>
/// Represents a parent work item displayed as a swimlane on a linked board
/// </summary>
public class Swimlane
{
    public string Id { get; set; } = string.Empty; // Same as ParentWorkItemId
    public string ParentWorkItemId { get; set; } = string.Empty;
    public string ParentTitle { get; set; } = string.Empty;
    public string ParentBoardId { get; set; } = string.Empty;
    public string ParentBoardName { get; set; } = string.Empty;
    public string ParentCurrentColumn { get; set; } = string.Empty;
    public int ChildCount { get; set; }
    public int CompletedChildCount { get; set; }
    public bool IsAllChildrenComplete { get; set; }
    public DateTime CreatedAt { get; set; }
    public WorkItemPriority Priority { get; set; }
    public List<string> Tags { get; set; } = new();
}
