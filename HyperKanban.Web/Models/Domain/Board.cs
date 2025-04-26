using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace HyperKanban.Web.Models.Domain
{
    public class Board
    {
        public int Id { get; set; }

        [Required]
        [StringLength(100)]
        public string Name { get; set; }

        [StringLength(500)]
        public string Description { get; set; }

        public List<Column> Columns { get; set; } = new List<Column>();
        public List<Row> Rows { get; set; } = new List<Row>();
        public DateTime CreatedDate { get; set; }
        public string CreatedBy { get; set; }
        public string OwnerId { get; set; }
    }
}