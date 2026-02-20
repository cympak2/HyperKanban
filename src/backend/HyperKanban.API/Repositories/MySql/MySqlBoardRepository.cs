using HyperKanban.API.Data;
using HyperKanban.API.Models;
using HyperKanban.API.Repositories;
using Microsoft.EntityFrameworkCore;

namespace HyperKanban.API.Repositories.MySql;

public class MySqlBoardRepository : IBoardRepository
{
    private readonly HyperKanbanDbContext _context;

    public MySqlBoardRepository(HyperKanbanDbContext context)
    {
        _context = context;
    }

    public async Task<Board> CreateAsync(Board board)
    {
        board.Created = DateTime.UtcNow;
        _context.Boards.Add(board);
        await _context.SaveChangesAsync();
        return board;
    }

    public async Task<Board?> GetByIdAsync(string id)
    {
        return await _context.Boards.FindAsync(id);
    }

    public async Task<List<Board>> GetAllAsync()
    {
        return await _context.Boards
            .OrderByDescending(b => b.Created)
            .ToListAsync();
    }

    public async Task<Board> UpdateAsync(Board board)
    {
        var existing = await _context.Boards.FindAsync(board.Id);
        if (existing == null)
            throw new InvalidOperationException($"Board with id {board.Id} not found");

        board.LastModified = DateTime.UtcNow;
        
        // Update simple properties
        existing.Name = board.Name;
        existing.Description = board.Description;
        existing.State = board.State;
        existing.Type = board.Type;
        existing.Creator = board.Creator;
        existing.Created = board.Created;
        existing.LastModified = board.LastModified;
        existing.NextBoardId = board.NextBoardId;
        
        // Update complex properties
        existing.Columns = board.Columns;
        existing.Permissions = board.Permissions;
        existing.ColumnTransitionMap = board.ColumnTransitionMap;

        // EF Core cannot detect changes in JSON-serialized collections via value converters,
        // so we must explicitly mark them as modified.
        _context.Entry(existing).Property(e => e.Columns).IsModified = true;
        _context.Entry(existing).Property(e => e.Permissions).IsModified = true;
        _context.Entry(existing).Property(e => e.ColumnTransitionMap).IsModified = true;

        await _context.SaveChangesAsync();
        return existing;
    }

    public async Task DeleteAsync(string id)
    {
        var board = await _context.Boards.FindAsync(id);
        if (board == null)
            throw new InvalidOperationException($"Board with id {id} not found");

        _context.Boards.Remove(board);
        await _context.SaveChangesAsync();
    }
}
