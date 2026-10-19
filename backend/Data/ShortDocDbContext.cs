using Microsoft.EntityFrameworkCore;
using ShortDoc.Api.Models;

namespace ShortDoc.Api.Data;

public class ShortDocDbContext : DbContext
{
    public ShortDocDbContext(DbContextOptions<ShortDocDbContext> options) : base(options)
    {
    }

    public DbSet<Department> Departments => Set<Department>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Document> Documents => Set<Document>();
    public DbSet<DocumentFile> DocumentFiles => Set<DocumentFile>();
    public DbSet<DocumentApproval> DocumentApprovals => Set<DocumentApproval>();
    public DbSet<TaskItem> Tasks => Set<TaskItem>();
    public DbSet<DocumentComment> DocumentComments => Set<DocumentComment>();
    public DbSet<DocumentStatusHistory> DocumentStatusHistories => Set<DocumentStatusHistory>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<Notification> Notifications => Set<Notification>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Map all properties to camelCase column names to match PostgreSQL schema
        foreach (var entity in modelBuilder.Model.GetEntityTypes())
        {
            foreach (var property in entity.GetProperties())
            {
                var name = property.Name;
                if (!string.IsNullOrEmpty(name))
                {
                    property.SetColumnName(char.ToLowerInvariant(name[0]) + name.Substring(1));
                }
            }
        }

        // Department unique code
        modelBuilder.Entity<Department>()
            .HasIndex(d => d.Code)
            .IsUnique();

        // User unique email
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();

        // User role conversion to string
        modelBuilder.Entity<User>()
            .Property(u => u.Role)
            .HasConversion<string>();

        // Document unique regNumber and indexes
        modelBuilder.Entity<Document>()
            .HasIndex(d => d.RegNumber)
            .IsUnique();

        modelBuilder.Entity<Document>()
            .Property(d => d.DocumentType)
            .HasConversion<string>();

        modelBuilder.Entity<Document>()
            .Property(d => d.Status)
            .HasConversion<string>();

        modelBuilder.Entity<Document>()
            .Property(d => d.Priority)
            .HasConversion<string>();

        modelBuilder.Entity<Document>()
            .HasOne(d => d.Creator)
            .WithMany(u => u.CreatedDocuments)
            .HasForeignKey(d => d.CreatorId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Document>()
            .HasOne(d => d.Assignee)
            .WithMany(u => u.AssignedDocuments)
            .HasForeignKey(d => d.AssigneeId)
            .OnDelete(DeleteBehavior.SetNull);

        // DocumentApproval
        modelBuilder.Entity<DocumentApproval>()
            .Property(a => a.Status)
            .HasConversion<string>();

        // TaskItem
        modelBuilder.Entity<TaskItem>()
            .Property(t => t.Status)
            .HasConversion<string>();

        modelBuilder.Entity<TaskItem>()
            .HasOne(t => t.AssignedTo)
            .WithMany(u => u.AssignedTasks)
            .HasForeignKey(t => t.AssignedToId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<TaskItem>()
            .HasOne(t => t.CreatedBy)
            .WithMany(u => u.CreatedTasks)
            .HasForeignKey(t => t.CreatedById)
            .OnDelete(DeleteBehavior.Restrict);

        // Status history enums
        modelBuilder.Entity<DocumentStatusHistory>()
            .Property(h => h.OldStatus)
            .HasConversion<string>();

        modelBuilder.Entity<DocumentStatusHistory>()
            .Property(h => h.NewStatus)
            .HasConversion<string>();
    }
}
