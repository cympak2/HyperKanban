using HyperKanban.Web.Models.Domain;
using HyperKanban.Web.Data;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Linq;

namespace HyperKanban.Web.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class BoardController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public BoardController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public ActionResult<IEnumerable<Board>> GetBoards()
        {
            return _context.Boards.ToList();
        }

        [HttpGet("{id}")]
        public ActionResult<Board> GetBoard(int id)
        {
            var board = _context.Boards.Find(id);
            if (board == null) return NotFound();
            return board;
        }

        [HttpPost]
        public ActionResult<Board> CreateBoard([FromBody] Board board)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            board.CreatedDate = DateTime.UtcNow;
            _context.Boards.Add(board);
            _context.SaveChanges();
            return CreatedAtAction(nameof(GetBoard), new { id = board.Id }, board);
        }

        [HttpPut("{id}")]
        public IActionResult UpdateBoard(int id, [FromBody] Board board)
        {
            if (id != board.Id)
            {
                return BadRequest("Board ID mismatch.");
            }

            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            _context.Entry(board).State = Microsoft.EntityFrameworkCore.EntityState.Modified;
            _context.SaveChanges();
            return NoContent();
        }

        [HttpDelete("{id}")]
        public IActionResult DeleteBoard(int id)
        {
            var board = _context.Boards.Find(id);
            if (board == null) return NotFound();
            _context.Boards.Remove(board);
            _context.SaveChanges();
            return NoContent();
        }
    }
}