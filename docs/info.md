# HyperKanban Technical Description

I'll help you create a technical description for HyperKanban, your nested Kanban board system. This sounds like an interesting extension of the traditional Kanban board concept, adding a hierarchical dimension.

## Concept Overview

HyperKanban is a hierarchical Kanban board system where:
- Each row in a Kanban board can have an associated child board
- When a task reaches the last column of a child board, it automatically advances to the next column in the parent board
- A single board can be linked as a child to multiple parent board rows
- This creates a cube/hypercube-like structure of interconnected workflows

## Technical Stack

- **RunOn**: Azure WebApp
- **Backend**: C# with ASP.NET Core
- **Frontend**: Bootstrap, HTML, CSS, JavaScript (no nodejs)
- **Database**: MySQL Server/Entity Framework Core
- **Authentication**: ASP.NET Identity

## Core Data Structures

```csharp
public class Board
{
    public int Id { get; set; }
    public string Name { get; set; }
    public string Description { get; set; }
    public List<Column> Columns { get; set; }
    public List<Row> Rows { get; set; }
    public DateTime CreatedDate { get; set; }
    public string CreatedBy { get; set; }
}

public class Column
{
    public int Id { get; set; }
    public int BoardId { get; set; }
    public string Name { get; set; }
    public int Order { get; set; }
    public string ColorCode { get; set; }
    public int WipLimit { get; set; } // Work-in-progress limit
}

public class Row
{
    public int Id { get; set; }
    public int BoardId { get; set; }
    public string Name { get; set; }
    public int Order { get; set; }
    public int? ChildBoardId { get; set; } // Reference to child board
    public int? NextColumnId { get; set; } // Where tasks go after completing child board
}

public class Task
{
    public int Id { get; set; }
    public string Title { get; set; }
    public string Description { get; set; }
    public int BoardId { get; set; }
    public int ColumnId { get; set; }
    public int RowId { get; set; }
    public string AssignedTo { get; set; }
    public DateTime CreatedDate { get; set; }
    public DateTime? DueDate { get; set; }
    public int Priority { get; set; }
    public List<TaskComment> Comments { get; set; }
    public List<TaskAttachment> Attachments { get; set; }
}
```

## Key Features & Implementation Details

### 1. Board Management
- Create/Edit/Delete boards
- Configure columns, rows, and WIP limits
- Custom color schemes and labels

### 2. Hierarchical Structure
- UI to link child boards to rows
- Visual indication of rows with child boards
- Navigation between parent and child boards

### 3. Task Progression Logic
```csharp
// Pseudo-code for task completion in child board
public void CompleteTaskInChildBoard(Task task, Board childBoard)
{
    // Find all parent rows that have this board as a child
    var parentRows = _context.Rows.Where(r => r.ChildBoardId == childBoard.Id).ToList();
    
    foreach (var parentRow in parentRows)
    {
        // Create a copy or move the task to the next column in parent board
        var parentTask = new Task
        {
            Title = task.Title,
            Description = task.Description,
            BoardId = parentRow.BoardId,
            RowId = parentRow.Id,
            ColumnId = parentRow.NextColumnId.Value,
            AssignedTo = task.AssignedTo,
            // Other properties
        };
        
        _context.Tasks.Add(parentTask);
    }
    
    // Archive or mark as completed the task in child board
    task.IsCompleted = true;
    
    _context.SaveChanges();
}
```

### 4. Task Management
- Drag and drop interface
- Task details modal with comments and attachments
- Task filtering and search

### 5. User Interface
- Responsive design using Bootstrap
- Collapsible rows to show/hide child boards
- Visual indicators for connections between boards
- Breadcrumb navigation for board hierarchy

### 6. Technical Challenges & Solutions

#### Nested Board Visualization
- Use a hierarchical tab system to navigate between parent/child boards
- Mini-preview of child board status in parent row

#### Task Propagation
- Event-driven architecture for task state changes
- SignalR for real-time updates across connected boards

#### Circular References
- Validation to prevent circular board references (A → B → C → A)
- Graph traversal algorithm to detect cycles

## Database Schema

The database schema will need to handle the hierarchical relationships, with careful indexing for performance:

- Tables: Boards, Columns, Rows, Tasks, Users, TaskComments, TaskAttachments
- Foreign key relationships between Rows and Boards (for child board references)
- Indexing on frequently queried fields (BoardId, ColumnId, RowId)

## API Endpoints

The system will expose RESTful APIs for:

1. Board management (CRUD operations)
2. Task management (Create, move, update, delete)
3. Hierarchical operations (link/unlink child boards)
4. User management and authentication

## Implementation Phases

1. **Phase 1**: Core Kanban functionality
   - Basic board, columns, rows, tasks
   - Drag-and-drop interface

2. **Phase 2**: Hierarchical functionality
   - Child board linking
   - Task propagation between boards

3. **Phase 3**: Advanced features
   - Analytics and reporting
   - User permissions and sharing
   - Integrations with other tools

## Visual Mockup Suggestion

A visual mockup could represent the interface with a main board layout and expandable rows that reveal child boards when clicked, with clear visual cues for the connections between boards and rows.

Would you like me to elaborate on any specific aspect of this technical description, or should we move on to creating a more detailed implementation plan?