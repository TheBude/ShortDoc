using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ShortDoc.Api.Models;

[Table("tasks")]
public class TaskItem
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    public string DocumentId { get; set; } = string.Empty;

    [ForeignKey("DocumentId")]
    public Document? Document { get; set; }

    [Required]
    [MaxLength(255)]
    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    [Required]
    public string AssignedToId { get; set; } = string.Empty;

    [ForeignKey("AssignedToId")]
    public User? AssignedTo { get; set; }

    [Required]
    public string CreatedById { get; set; } = string.Empty;

    [ForeignKey("CreatedById")]
    public User? CreatedBy { get; set; }

    public DateTime? Deadline { get; set; }

    public DocTaskStatus Status { get; set; } = DocTaskStatus.PENDING;

    public string? ResultComment { get; set; }

    public string? ResultFileUrl { get; set; }

    public DateTime? CompletedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
