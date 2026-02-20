using System.Text.Json.Serialization;

namespace HyperKanban.API.Models;

public class Board
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public BoardState State { get; set; } = BoardState.Draft;
    public BoardType Type { get; set; } = BoardType.Custom;
    public string Creator { get; set; } = string.Empty;
    public DateTime Created { get; set; } = DateTime.UtcNow;
    public DateTime? LastModified { get; set; }
    public List<Column> Columns { get; set; } = new();
    public BoardPermissions Permissions { get; set; } = new();
    
    // Cross-board workflow configuration
    public string? NextBoardId { get; set; } // Target board when work completes
    public Dictionary<string, string> ColumnTransitionMap { get; set; } = new(); // sourceColumnId -> targetBoardColumnId
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum BoardState
{
    Draft,
    Active,
    Inactive,
    Archived
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum BoardType
{
    ProductOwner,
    BusinessAnalytics,
    Development,
    QA,
    DevOps,
    Custom
}

public class Column
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Name { get; set; } = string.Empty;
    public ColumnType ColumnType { get; set; }
    public int Position { get; set; }
    public bool IsDoneState { get; set; } = false; // Marks completion columns that trigger cross-board transitions
    public List<string> AllowedResolutions { get; set; } = new(); // For terminal columns (e.g., "In Prod", "Declined")
    public ContainerConfig? ContainerConfig { get; set; } // Only for AI Agent columns
    public bool AutoAdvanceParentOnChildCompletion { get; set; } = false; // Auto-advance parent when all children complete
}

[JsonConverter(typeof(ColumnTypeJsonConverter))]
public enum ColumnType
{
    HumanAction,
    AIAgent
}

public class ContainerConfig
{
    public string ConfigId { get; set; } = string.Empty;
    public string Image { get; set; } = string.Empty;
    public int TimeoutSeconds { get; set; } = 300; // 5 minutes default
    public Dictionary<string, string> EnvironmentVariables { get; set; } = new();
}

public class BoardPermissions
{
    public List<string> BoardAdmins { get; set; } = new();
    public Dictionary<string, List<string>> Reviewers { get; set; } = new(); // columnId -> reviewers
}
