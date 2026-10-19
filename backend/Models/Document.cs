using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ShortDoc.Api.Models;

[Table("documents")]
public class Document
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    [MaxLength(100)]
    public string RegNumber { get; set; } = string.Empty;

    [Required]
    [MaxLength(500)]
    public string Title { get; set; } = string.Empty;

    public DocumentType DocumentType { get; set; } = DocumentType.INTERNAL;

    [MaxLength(100)]
    public string Category { get; set; } = "Bildirgi";

    public DateTime RegisteredDate { get; set; } = DateTime.UtcNow;

    [MaxLength(255)]
    public string? Sender { get; set; }

    [MaxLength(255)]
    public string? Receiver { get; set; }

    public string? DepartmentId { get; set; }

    [ForeignKey("DepartmentId")]
    public Department? Department { get; set; }

    public string? AssigneeId { get; set; }

    [ForeignKey("AssigneeId")]
    public User? Assignee { get; set; }

    [Required]
    public string CreatorId { get; set; } = string.Empty;

    [ForeignKey("CreatorId")]
    public User? Creator { get; set; }

    public Priority Priority { get; set; } = Priority.MEDIUM;

    public DateTime? Deadline { get; set; }

    public DocumentStatus Status { get; set; } = DocumentStatus.NEW;

    public string? Summary { get; set; }

    public bool IsArchived { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<DocumentFile> Files { get; set; } = new List<DocumentFile>();
    public ICollection<DocumentApproval> Approvals { get; set; } = new List<DocumentApproval>();
    public ICollection<TaskItem> Tasks { get; set; } = new List<TaskItem>();
    public ICollection<DocumentComment> Comments { get; set; } = new List<DocumentComment>();
    public ICollection<DocumentStatusHistory> StatusHistory { get; set; } = new List<DocumentStatusHistory>();
}
