namespace HyperKanban.Web.Models.Domain
{
    public class Column
    {
        public int Id { get; set; }
        public int BoardId { get; set; }
        public string Name { get; set; }
        public int Order { get; set; }
        public string ColorCode { get; set; }
        public int WipLimit { get; set; } // Work-in-progress limit
        
        public Board Board { get; set; }
    }
}