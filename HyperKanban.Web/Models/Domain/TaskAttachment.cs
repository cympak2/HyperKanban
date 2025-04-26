using System;

namespace HyperKanban.Web.Models.Domain
{
    public class TaskAttachment
    {
        public int Id { get; set; }
        public int TaskId { get; set; }
        public string FileName { get; set; }
        public string FilePath { get; set; }
        public string ContentType { get; set; }
        public long FileSize { get; set; }
        public DateTime UploadedDate { get; set; }
        
        public KanbanTask Task { get; set; }
    }
}