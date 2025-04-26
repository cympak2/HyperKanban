using System;
using System.Collections.Generic;

namespace HyperKanban.Web.Models.Domain
{
    public class KanbanTask // Using KanbanTask to avoid conflict with System.Threading.Tasks.Task
    {
        public int Id { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public int BoardId { get; set; }
        public int ColumnId { get; set; }
        public int RowId { get; set; }
        public string AssignedTo { get; set; }
        public DateTime CreatedDate { get; set; }
        public DateTime? DueDate { get; set; }
        public int Priority { get; set; }
        
        public Board Board { get; set; }
        public Column Column { get; set; }
        public Row Row { get; set; }
        public List<TaskComment> Comments { get; set; } = new List<TaskComment>();
        public List<TaskAttachment> Attachments { get; set; } = new List<TaskAttachment>();
    }
}