using HyperKanban.Web.Models.Domain;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace HyperKanban.Web.Data
{
    public class ApplicationDbContext : IdentityDbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }
        
        public DbSet<Board> Boards { get; set; }
        public DbSet<Column> Columns { get; set; }
        public DbSet<Row> Rows { get; set; }
        public DbSet<KanbanTask> Tasks { get; set; }
        public DbSet<TaskComment> TaskComments { get; set; }
        public DbSet<TaskAttachment> TaskAttachments { get; set; }
        
        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);
            
            // Configure relationships and constraints
            builder.Entity<Column>()
                .HasOne(c => c.Board)
                .WithMany(b => b.Columns)
                .HasForeignKey(c => c.BoardId);
                
            builder.Entity<Row>()
                .HasOne(r => r.Board)
                .WithMany(b => b.Rows)
                .HasForeignKey(r => r.BoardId);
                
            builder.Entity<Row>()
                .HasOne(r => r.ChildBoard)
                .WithMany()
                .HasForeignKey(r => r.ChildBoardId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.SetNull);
                
            builder.Entity<KanbanTask>()
                .HasOne(t => t.Board)
                .WithMany()
                .HasForeignKey(t => t.BoardId);
                
            builder.Entity<KanbanTask>()
                .HasOne(t => t.Column)
                .WithMany()
                .HasForeignKey(t => t.ColumnId);
                
            builder.Entity<KanbanTask>()
                .HasOne(t => t.Row)
                .WithMany()
                .HasForeignKey(t => t.RowId);
                
            builder.Entity<TaskComment>()
                .HasOne(tc => tc.Task)
                .WithMany(t => t.Comments)
                .HasForeignKey(tc => tc.TaskId);
                
            builder.Entity<TaskAttachment>()
                .HasOne(ta => ta.Task)
                .WithMany(t => t.Attachments)
                .HasForeignKey(ta => ta.TaskId);
        }
    }
}
