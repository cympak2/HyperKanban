using HyperKanban.API.Models;
using HyperKanban.API.Models.Requests;
using HyperKanban.API.Models.DTOs;
using HyperKanban.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HyperKanban.API.Controllers;

[ApiController]
[Route("api/boards/{boardId}/workitems")]
// [Authorize] // Authentication disabled for MVP
public class WorkItemsController : ControllerBase
{
    private readonly IWorkItemService _workItemService;
    private readonly ILogger<WorkItemsController> _logger;

    public WorkItemsController(IWorkItemService workItemService, ILogger<WorkItemsController> logger)
    {
        _workItemService = workItemService;
        _logger = logger;
    }

    [HttpPost]
    public async Task<ActionResult<WorkItemDto>> CreateWorkItem(
        string boardId,
        [FromBody] CreateWorkItemRequest request)
    {
        try
        {
            var userEmail = User.Identity?.Name ?? "unknown@hyperkanban.com";
            var workItem = await _workItemService.CreateWorkItemAsync(boardId, request, userEmail);
            return CreatedAtAction(nameof(GetWorkItem), new { boardId, id = workItem.Id }, WorkItemDto.FromWorkItem(workItem));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating work item on board {BoardId}", boardId);
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<WorkItemDto>> GetWorkItem(string boardId, string id)
    {
        var workItem = await _workItemService.GetWorkItemByIdAsync(id, boardId);
        if (workItem == null)
        {
            return NotFound();
        }
        return WorkItemDto.FromWorkItem(workItem);
    }

    [HttpGet]
    public async Task<ActionResult<List<WorkItemDto>>> GetWorkItems(string boardId, [FromQuery] string? columnId = null)
    {
        _logger.LogInformation("GetWorkItems: Starting for boardId={BoardId}, columnId={ColumnId}", boardId, columnId);
        
        if (!string.IsNullOrEmpty(columnId))
        {
            _logger.LogInformation("GetWorkItems: Fetching by column");
            var workItems = await _workItemService.GetWorkItemsByColumnAsync(boardId, columnId);
            _logger.LogInformation("GetWorkItems: Fetched {Count} items by column, starting DTO mapping", workItems.Count);
            var dtos = workItems.Select(WorkItemDto.FromWorkItem).ToList();
            _logger.LogInformation("GetWorkItems: DTO mapping complete, returning {Count} items", dtos.Count);
            return dtos;
        }
        else
        {
            _logger.LogInformation("GetWorkItems: Fetching by board");
            var workItems = await _workItemService.GetWorkItemsByBoardAsync(boardId);
            _logger.LogInformation("GetWorkItems: Fetched {Count} items by board, starting DTO mapping", workItems.Count);
            var dtos = workItems.Select(WorkItemDto.FromWorkItem).ToList();
            _logger.LogInformation("GetWorkItems: DTO mapping complete, returning {Count} items", dtos.Count);
            return dtos;
        }
    }

    [HttpPatch("{id}/move")]
    public async Task<ActionResult<WorkItemDto>> MoveWorkItem(
        string boardId,
        string id,
        [FromBody] MoveWorkItemRequest request)
    {
        try
        {
            var userEmail = User.Identity?.Name ?? "unknown@hyperkanban.com";
            var workItem = await _workItemService.MoveWorkItemAsync(id, boardId, request, userEmail);
            return WorkItemDto.FromWorkItem(workItem);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error moving work item {WorkItemId}", id);
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPatch("{id}/approve")]
    public async Task<ActionResult<WorkItem>> ApproveWorkItem(
        string boardId,
        string id,
        [FromBody] ApproveWorkItemRequest? request = null)
    {
        try
        {
            var userEmail = User.Identity?.Name ?? "unknown@hyperkanban.com";
            var workItem = await _workItemService.ApproveAndAdvanceAsync(id, boardId, userEmail, request);
            return workItem;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error approving work item {WorkItemId}", id);
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPatch("{id}/edit")]
    public async Task<ActionResult<WorkItem>> EditAndApproveWorkItem(
        string boardId,
        string id,
        [FromBody] EditWorkItemRequest request)
    {
        try
        {
            var userEmail = User.Identity?.Name ?? "unknown@hyperkanban.com";
            var workItem = await _workItemService.EditAndAdvanceAsync(id, boardId, request, userEmail);
            return workItem;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error editing work item {WorkItemId}", id);
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("{id}/transfer")]
    public async Task<ActionResult<WorkItem>> TransferWorkItem(
        string boardId,
        string id,
        [FromBody] TransferWorkItemRequest request)
    {
        try
        {
            var userEmail = User.Identity?.Name ?? "unknown@hyperkanban.com";
            var workItem = await _workItemService.TransferToBoardAsync(
                id, 
                boardId, 
                request.TargetBoardId, 
                userEmail, 
                request.Resolution);
            return workItem;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error transferring work item {WorkItemId} from board {BoardId}", id, boardId);
            return BadRequest(new { error = ex.Message });
        }
    }

    // Parent-child workflow endpoints

    [HttpPost("{id}/children")]
    public async Task<ActionResult<WorkItem>> CreateChildTicket(
        string boardId,
        string id,
        [FromBody] CreateWorkItemRequest request)
    {
        try
        {
            var userEmail = User.Identity?.Name ?? "unknown@hyperkanban.com";
            var child = await _workItemService.CreateChildTicketAsync(id, boardId, request, userEmail);
            return CreatedAtAction(nameof(GetWorkItem), new { boardId = child.BoardId, id = child.Id }, child);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating child ticket for parent {ParentId}", id);
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("{id}/children")]
    public async Task<ActionResult<List<WorkItem>>> GetChildTickets(string boardId, string id)
    {
        try
        {
            var children = await _workItemService.GetChildTicketsAsync(id, boardId);
            return children;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting child tickets for parent {ParentId}", id);
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("{id}/completion-status")]
    public async Task<ActionResult<object>> GetCompletionStatus(string boardId, string id)
    {
        try
        {
            var (total, completed, allComplete) = await _workItemService.CheckChildCompletionStatusAsync(id, boardId);
            return new
            {
                totalChildren = total,
                completedChildren = completed,
                allChildrenComplete = allComplete,
                completionPercentage = total > 0 ? (completed * 100.0 / total) : 0
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting completion status for parent {ParentId}", id);
            return BadRequest(new { error = ex.Message });
        }
    }

    // Comment endpoints

    [HttpPost("{id}/comments")]
    public async Task<ActionResult<Comment>> AddComment(
        string boardId,
        string id,
        [FromBody] AddCommentRequest request)
    {
        try
        {
            var userEmail = User.Identity?.Name ?? "unknown@hyperkanban.com";
            var comment = await _workItemService.AddCommentAsync(id, boardId, request.Text, userEmail);
            return comment;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding comment to work item {WorkItemId}", id);
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<WorkItemDto>> UpdateWorkItem(
        string boardId,
        string id,
        [FromBody] UpdateWorkItemRequest request)
    {
        try
        {
            var userEmail = User.Identity?.Name ?? "unknown@hyperkanban.com";
            var workItem = await _workItemService.UpdateWorkItemAsync(id, boardId, request, userEmail);
            return WorkItemDto.FromWorkItem(workItem);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating work item {WorkItemId}", id);
            return BadRequest(new { error = ex.Message });
        }
    }
}
