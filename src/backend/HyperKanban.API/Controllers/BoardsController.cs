using HyperKanban.API.Models;
using HyperKanban.API.Models.Requests;
using HyperKanban.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HyperKanban.API.Controllers;

[ApiController]
[Route("api/[controller]")]
// [Authorize] // Uncomment when Azure AD authentication is configured
public class BoardsController : ControllerBase
{
    private readonly IBoardService _boardService;
    private readonly IBoardSeedingService _boardSeedingService;
    private readonly IWorkItemService _workItemService;
    private readonly ILogger<BoardsController> _logger;

    public BoardsController(
        IBoardService boardService,
        IBoardSeedingService boardSeedingService,
        IWorkItemService workItemService,
        ILogger<BoardsController> logger)
    {
        _boardService = boardService;
        _boardSeedingService = boardSeedingService;
        _workItemService = workItemService;
        _logger = logger;
    }

    [HttpPost]
    public async Task<ActionResult<Board>> CreateBoard([FromBody] CreateBoardRequest request)
    {
        try
        {
            var userEmail = User.Identity?.Name ?? "unknown@hyperkanban.com";
            var board = await _boardService.CreateBoardAsync(request, userEmail);
            return CreatedAtAction(nameof(GetBoard), new { id = board.Id }, board);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating board");
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Board>> GetBoard(string id)
    {
        var board = await _boardService.GetBoardByIdAsync(id);
        if (board == null)
        {
            return NotFound();
        }
        return board;
    }

    [HttpGet]
    public async Task<ActionResult<List<Board>>> GetAllBoards()
    {
        var boards = await _boardService.GetAllBoardsAsync();
        return boards;
    }

    [HttpPost("{id}/activate")]
    public async Task<ActionResult<Board>> ActivateBoard(string id)
    {
        try
        {
            var board = await _boardService.ActivateBoardAsync(id);
            return board;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error activating board {BoardId}", id);
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("{id}/deactivate")]
    public async Task<ActionResult<Board>> DeactivateBoard(string id)
    {
        var board = await _boardService.DeactivateBoardAsync(id);
        return board;
    }

    [HttpPost("{id}/columns")]
    public async Task<ActionResult<Board>> AddColumn(string id, [FromBody] AddColumnRequest request)
    {
        try
        {
            var board = await _boardService.AddColumnAsync(id, request);
            return board;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding column to board {BoardId}", id);
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("{id}/validate")]
    public async Task<IActionResult> ValidateBoardConfiguration(string id)
    {
        try
        {
            await _boardService.ValidateBoardConfigurationAsync(id);
            return Ok(new { message = "Board configuration is valid" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("seed-templates")]
    public async Task<ActionResult<List<Board>>> SeedWorkflowBoards()
    {
        try
        {
            var userEmail = User.Identity?.Name ?? "system";
            
            if (await _boardSeedingService.WorkflowBoardsExistAsync())
            {
                return BadRequest(new { error = "Workflow boards already exist" });
            }

            var boards = await _boardSeedingService.SeedWorkflowBoardsAsync(userEmail);
            _logger.LogInformation("Seeded {Count} workflow boards", boards.Count);
            
            return Ok(new 
            { 
                message = $"Successfully created {boards.Count} workflow boards",
                boards = boards.Select(b => new { b.Id, b.Name, b.Type }).ToList()
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error seeding workflow boards");
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("workflow-boards")]
    public async Task<ActionResult<Dictionary<BoardType, string>>> GetWorkflowBoardIds()
    {
        var boardIds = await _boardSeedingService.GetWorkflowBoardIdsAsync();
        return Ok(boardIds);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<Board>> UpdateBoard(string id, [FromBody] UpdateBoardRequest request)
    {
        try
        {
            var board = await _boardService.UpdateBoardAsync(id, request);
            return board;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating board {BoardId}", id);
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPatch("{boardId}/columns/{columnId}")]
    public async Task<ActionResult<Board>> UpdateColumn(
        string boardId, 
        string columnId, 
        [FromBody] UpdateColumnRequest request)
    {
        try
        {
            var board = await _boardService.UpdateColumnAsync(boardId, columnId, request);
            return board;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating column {ColumnId} in board {BoardId}", columnId, boardId);
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPut("{boardId}/columns/{columnId}/type")]
    public async Task<ActionResult<Board>> UpdateColumnType(
        string boardId,
        string columnId,
        [FromBody] UpdateColumnTypeRequest request)
    {
        try
        {
            var board = await _boardService.UpdateColumnTypeAsync(boardId, columnId, request);
            return board;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating column type for {ColumnId} in board {BoardId}", columnId, boardId);
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpDelete("{boardId}/columns/{columnId}")]
    public async Task<ActionResult<Board>> DeleteColumn(string boardId, string columnId)
    {
        try
        {
            var board = await _boardService.DeleteColumnAsync(boardId, columnId);
            return board;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting column {ColumnId} from board {BoardId}", columnId, boardId);
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("{id}/swimlanes")]
    public async Task<ActionResult<List<Swimlane>>> GetSwimlanes(string id)
    {
        try
        {
            var swimlanes = await _workItemService.GetSwimlanesForBoardAsync(id);
            return swimlanes;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting swimlanes for board {BoardId}", id);
            return BadRequest(new { error = ex.Message });
        }
    }
}
