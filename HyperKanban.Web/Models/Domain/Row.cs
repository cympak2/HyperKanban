namespace HyperKanban.Web.Models.Domain
{
    public class Row
    {
        public int Id { get; set; }
        public int BoardId { get; set; }
        public string Name { get; set; }
        public int Order { get; set; }
        public int? ChildBoardId { get; set; } // Reference to child board
        public int? NextColumnId { get; set; } // Where tasks go after completing child board
        
        public Board Board { get; set; }
        public Board ChildBoard { get; set; }
        public Column NextColumn { get; set; }
    }
}