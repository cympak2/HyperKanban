using HyperKanban.API.Models;

namespace HyperKanban.API.Repositories;

public interface IBoardRepository
{
    Task<Board> CreateAsync(Board board);
    Task<Board?> GetByIdAsync(string id);
    Task<List<Board>> GetAllAsync();
    Task<Board> UpdateAsync(Board board);
    Task DeleteAsync(string id);
}
