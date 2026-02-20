using HyperKanban.API.Models;

namespace HyperKanban.API.Repositories;

public interface IWorkItemRepository
{
    Task<WorkItem> CreateAsync(WorkItem workItem);
    Task<WorkItem?> GetByIdAsync(string id, string boardId);
    Task<List<WorkItem>> GetByBoardIdAsync(string boardId);
    Task<List<WorkItem>> GetByColumnAsync(string boardId, string columnId);
    Task<List<WorkItem>> GetBySwimlaneBoardIdAsync(string swimlaneBoardId);
    Task<WorkItem> UpdateAsync(WorkItem workItem);
    Task DeleteAsync(string id, string boardId);
    Task<List<WorkItem>> GetWaitingItemsAsync();
}
