using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ShortDoc.Api.Models;

[Table("document_comments")]
public class DocumentComment
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    public string DocumentId { get; set; } = string.Empty;

    [ForeignKey("DocumentId")]
    public Document? Document { get; set; }

    [Required]
    public string UserId { get; set; } = string.Empty;

    [ForeignKey("UserId")]
    public User? User { get; set; }

    [Required]
    public string Comment { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

[Table("document_status_histories")]
public class DocumentStatusHistory
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    public string DocumentId { get; set; } = string.Empty;

    [ForeignKey("DocumentId")]
    public Document? Document { get; set; }

    [Required]
    public string ChangedById { get; set; } = string.Empty;

    [ForeignKey("ChangedById")]
    public User? ChangedBy { get; set; }

    public DocumentStatus OldStatus { get; set; }
    public DocumentStatus NewStatus { get; set; }

    public string? Reason { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

[Table("audit_logs")]
public class AuditLog
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    public string? UserId { get; set; }

    [ForeignKey("UserId")]
    public User? User { get; set; }

    [Required]
    [MaxLength(100)]
    public string Action { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string Entity { get; set; } = string.Empty;

    public string? EntityId { get; set; }

    public string? Details { get; set; }

    [MaxLength(50)]
    public string? IpAddress { get; set; }

    [MaxLength(255)]
    public string? UserAgent { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

[Table("notifications")]
public class Notification
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    public string UserId { get; set; } = string.Empty;

    [ForeignKey("UserId")]
    public User? User { get; set; }

    [Required]
    [MaxLength(255)]
    public string Title { get; set; } = string.Empty;

    [Required]
    public string Message { get; set; } = string.Empty;

    [MaxLength(255)]
    public string? Link { get; set; }

    public bool IsRead { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
