using System;

namespace HyperKanban.Web.Models.Domain
{
    public class TaskComment
    {
        public int Id { get; set; }
        public int TaskId { get; set; }
        public string Content { get; set; }
        public string CreatedBy { get; set; }
        public DateTime CreatedDate { get; set; }
        
        public KanbanTask Task { get; set; }
    }
}