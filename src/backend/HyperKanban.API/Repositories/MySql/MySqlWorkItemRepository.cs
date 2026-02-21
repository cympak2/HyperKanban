using HyperKanban.API.Data;
using HyperKanban.API.Models;
using HyperKanban.API.Repositories;
using Microsoft.EntityFrameworkCore;

namespace HyperKanban.API.Repositories.MySql;

public class MySqlWorkItemRepository : IWorkItemRepository
{
    private readonly HyperKanbanDbContext _context;
    private readonly ILogger<MySqlWorkItemRepository> _logger;

    public MySqlWorkItemRepository(HyperKanbanDbContext context, ILogger<MySqlWorkItemRepository> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<WorkItem> CreateAsync(WorkItem workItem)
    {
        workItem.Created = DateTime.UtcNow;
        _context.WorkItems.Add(workItem);
        await _context.SaveChangesAsync();
        return workItem;
    }

    public async Task<WorkItem?> GetByIdAsync(string id, string boardId)
    {
        return await _context.WorkItems
            .AsNoTracking()
            .FirstOrDefaultAsync(w => w.Id == id && w.BoardId == boardId);
    }

    public async Task<List<WorkItem>> GetByBoardIdAsync(string boardId)
    {
        _logger.LogInformation("Repository.GetByBoardIdAsync: Starting for boardId={BoardId}", boardId);
        
        // Use FromSqlRaw to bypass JSON deserialization issues for complex list columns;
        // heavy collections (AuditTrail, AiProcessingHistory, BoardHistory) are excluded for
        // performance — they are not needed for the board view. ChildWorkItemIds IS needed
        // for completion-status calculations so we read its real value here.
        var result = await _context.WorkItems
            .FromSqlRaw(@"
                SELECT Id, BoardId, Title, Description, CurrentColumn, State, Priority, 
                       COALESCE(NULLIF(Tags, ''), '[]') as Tags,
                       Creator, Created, LastModified, PreviousBoardId, Resolution,
                       ParentWorkItemId, SwimlaneBoardId,
                       '[]' as AuditTrail, '[]' as AiProcessingHistory, 
                       '[]' as BoardHistory,
                       COALESCE(NULLIF(ChildWorkItemIds, ''), '[]') as ChildWorkItemIds,
                       COALESCE(NULLIF(Comments, ''), '[]') as Comments
                FROM WorkItems 
                WHERE BoardId = {0}
                ORDER BY Created DESC", boardId)
            .AsNoTracking()
            .ToListAsync();
        
        _logger.LogInformation("Repository.GetByBoardIdAsync: Query completed, returning {Count} items", result.Count);
        return result;
    }

    public async Task<List<WorkItem>> GetByColumnAsync(string boardId, string columnId)
    {
        return await _context.WorkItems
            .AsNoTracking()
            .Where(w => w.BoardId == boardId && w.CurrentColumn == columnId)
            .OrderByDescending(w => w.Created)
            .ToListAsync();
    }

    public async Task<List<WorkItem>> GetBySwimlaneBoardIdAsync(string swimlaneBoardId)
    {
        return await _context.WorkItems
            .AsNoTracking()
            .Where(w => w.SwimlaneBoardId == swimlaneBoardId)
            .OrderByDescending(w => w.Created)
            .ToListAsync();
    }

    public async Task<WorkItem> UpdateAsync(WorkItem workItem)
    {
        var existing = await _context.WorkItems.FindAsync(workItem.Id);
        if (existing == null)
            throw new InvalidOperationException($"WorkItem with id {workItem.Id} not found");

        // Update simple properties
        existing.BoardId = workItem.BoardId;
        existing.Title = workItem.Title;
        existing.Description = workItem.Description;
        existing.CurrentColumn = workItem.CurrentColumn;
        existing.State = workItem.State;
        existing.Priority = workItem.Priority;
        existing.Creator = workItem.Creator;
        existing.Created = workItem.Created;
        existing.LastModified = DateTime.UtcNow;
        existing.PreviousBoardId = workItem.PreviousBoardId;
        existing.Resolution = workItem.Resolution;
        existing.ParentWorkItemId = workItem.ParentWorkItemId;
        existing.SwimlaneBoardId = workItem.SwimlaneBoardId;
        
        // Update complex properties
        existing.Tags = workItem.Tags;
        existing.ChildWorkItemIds = workItem.ChildWorkItemIds;
        existing.AiProcessingHistory = workItem.AiProcessingHistory;
        existing.AuditTrail = workItem.AuditTrail;
        existing.BoardHistory = workItem.BoardHistory;
        existing.Comments = workItem.Comments;
        
        await _context.SaveChangesAsync();
        return existing;
    }

    public async Task DeleteAsync(string id, string boardId)
    {
        var workItem = await _context.WorkItems
            .FirstOrDefaultAsync(w => w.Id == id && w.BoardId == boardId);
        if (workItem == null)
            throw new InvalidOperationException($"WorkItem with id {id} and boardId {boardId} not found");

        _context.WorkItems.Remove(workItem);
        await _context.SaveChangesAsync();
    }

    public async Task<List<WorkItem>> GetWaitingItemsAsync()
    {
        return await _context.WorkItems
            .Where(w => w.State == WorkItemState.Waiting)
            .OrderBy(w => w.Priority)
            .ThenBy(w => w.Created)
            .ToListAsync();
    }
}
