using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ShortDoc.Api.Models;

[Table("document_approvals")]
public class DocumentApproval
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    public string DocumentId { get; set; } = string.Empty;

    [ForeignKey("DocumentId")]
    public Document? Document { get; set; }

    [Required]
    public string ApproverId { get; set; } = string.Empty;

    [ForeignKey("ApproverId")]
    public User? Approver { get; set; }

    public int StepOrder { get; set; } = 1;

    public ApprovalStatus Status { get; set; } = ApprovalStatus.PENDING;

    public string? Comments { get; set; }

    public DateTime? SignedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
