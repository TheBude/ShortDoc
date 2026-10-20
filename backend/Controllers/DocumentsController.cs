using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShortDoc.Api.Data;
using ShortDoc.Api.DTOs;
using ShortDoc.Api.Models;
using ShortDoc.Api.Services;

namespace ShortDoc.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class DocumentsController : ControllerBase
{
    private readonly ShortDocDbContext _context;
    private readonly AuditService _auditService;

    public DocumentsController(ShortDocDbContext context, AuditService auditService)
    {
        _context = context;
        _auditService = auditService;
    }

    [HttpGet]
    public async Task<IActionResult> GetDocuments(
        [FromQuery] string? search,
        [FromQuery] string? documentType,
        [FromQuery] string? status,
        [FromQuery] string? priority,
        [FromQuery] string? departmentId,
        [FromQuery] int page = 1,
        [FromQuery] int limit = 10)
    {
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var currentRole = User.FindFirstValue(ClaimTypes.Role)!;
        var currentDeptId = User.FindFirstValue("departmentId");

        var query = _context.Documents
            .AsNoTracking()
            .AsQueryable();

        // Role-based scoping
        if (currentRole == "STAFF")
        {
            query = query.Where(d =>
                d.CreatorId == currentUserId ||
                d.AssigneeId == currentUserId ||
                d.Approvals.Any(a => a.ApproverId == currentUserId) ||
                d.Tasks.Any(t => t.AssignedToId == currentUserId));
        }
        else if (currentRole == "DEPARTMENT_HEAD" && !string.IsNullOrEmpty(currentDeptId))
        {
            query = query.Where(d =>
                d.DepartmentId == currentDeptId ||
                d.CreatorId == currentUserId ||
                d.AssigneeId == currentUserId ||
                d.Approvals.Any(a => a.ApproverId == currentUserId));
        }

        // Filters
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.ToLower();
            query = query.Where(d =>
                d.RegNumber.ToLower().Contains(s) ||
                d.Title.ToLower().Contains(s) ||
                (d.Summary != null && d.Summary.ToLower().Contains(s)) ||
                (d.Sender != null && d.Sender.ToLower().Contains(s)) ||
                (d.Receiver != null && d.Receiver.ToLower().Contains(s)));
        }

        if (!string.IsNullOrWhiteSpace(documentType) && Enum.TryParse<DocumentType>(documentType, true, out var dt))
        {
            query = query.Where(d => d.DocumentType == dt);
        }

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<DocumentStatus>(status, true, out var st))
        {
            query = query.Where(d => d.Status == st);
        }

        if (!string.IsNullOrWhiteSpace(priority) && Enum.TryParse<Priority>(priority, true, out var pr))
        {
            query = query.Where(d => d.Priority == pr);
        }

        if (!string.IsNullOrWhiteSpace(departmentId))
        {
            query = query.Where(d => d.DepartmentId == departmentId);
        }

        var total = await query.CountAsync();
        var skip = (page - 1) * limit;

        var items = await query
            .OrderByDescending(d => d.CreatedAt)
            .Skip(skip)
            .Take(limit)
            .Select(d => new
            {
                id = d.Id,
                regNumber = d.RegNumber,
                title = d.Title,
                documentType = d.DocumentType.ToString(),
                category = d.Category,
                priority = d.Priority.ToString(),
                status = d.Status.ToString(),
                registeredDate = d.RegisteredDate,
                deadline = d.Deadline,
                summary = d.Summary,
                department = d.Department != null ? new { id = d.Department.Id, name = d.Department.Name, code = d.Department.Code } : null,
                creator = d.Creator != null ? new { id = d.Creator.Id, fullName = d.Creator.FullName, position = d.Creator.Position } : null,
                assignee = d.Assignee != null ? new { id = d.Assignee.Id, fullName = d.Assignee.FullName, position = d.Assignee.Position } : null,
                createdAt = d.CreatedAt
            })
            .ToListAsync();

        var meta = new PaginationMeta
        {
            Page = page,
            Limit = limit,
            Total = total,
            TotalPages = (int)Math.Ceiling(total / (double)limit)
        };

        return Ok(ApiResponse<object>.Ok(items, "Hujjatlar ro‘yxati", meta));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetDocumentById(string id)
    {
        var doc = await _context.Documents
            .AsNoTracking()
            .Include(d => d.Department)
            .Include(d => d.Creator)
            .Include(d => d.Assignee)
            .Include(d => d.Files).ThenInclude(f => f.UploadedBy)
            .Include(d => d.Approvals).ThenInclude(a => a.Approver)
            .Include(d => d.Tasks).ThenInclude(t => t.AssignedTo)
            .Include(d => d.Comments).ThenInclude(c => c.User)
            .Include(d => d.StatusHistory).ThenInclude(h => h.ChangedBy)
            .FirstOrDefaultAsync(d => d.Id == id);

        if (doc == null)
        {
            return NotFound(ApiResponse<object>.Fail("Hujjat topilmadi"));
        }

        var detail = new
        {
            id = doc.Id,
            regNumber = doc.RegNumber,
            title = doc.Title,
            documentType = doc.DocumentType.ToString(),
            category = doc.Category,
            sender = doc.Sender,
            receiver = doc.Receiver,
            registeredDate = doc.RegisteredDate,
            deadline = doc.Deadline,
            priority = doc.Priority.ToString(),
            status = doc.Status.ToString(),
            summary = doc.Summary,
            isArchived = doc.IsArchived,
            createdAt = doc.CreatedAt,
            department = doc.Department != null ? new { id = doc.Department.Id, name = doc.Department.Name, code = doc.Department.Code } : null,
            creator = doc.Creator != null ? new { id = doc.Creator.Id, fullName = doc.Creator.FullName, position = doc.Creator.Position, email = doc.Creator.Email } : null,
            assignee = doc.Assignee != null ? new { id = doc.Assignee.Id, fullName = doc.Assignee.FullName, position = doc.Assignee.Position, email = doc.Assignee.Email } : null,
            files = doc.Files.Select(f => new
            {
                id = f.Id,
                originalName = f.OriginalName,
                fileName = f.FileName,
                fileSize = f.FileSize,
                mimeType = f.MimeType,
                uploadedBy = f.UploadedBy != null ? new { id = f.UploadedBy.Id, fullName = f.UploadedBy.FullName } : null,
                createdAt = f.CreatedAt
            }),
            approvals = doc.Approvals.OrderBy(a => a.StepOrder).Select(a => new
            {
                id = a.Id,
                approverId = a.ApproverId,
                stepOrder = a.StepOrder,
                status = a.Status.ToString(),
                comments = a.Comments,
                signedAt = a.SignedAt,
                approver = a.Approver != null ? new { id = a.Approver.Id, fullName = a.Approver.FullName, position = a.Approver.Position } : null
            }),
            tasks = doc.Tasks.Select(t => new
            {
                id = t.Id,
                title = t.Title,
                description = t.Description,
                status = t.Status.ToString(),
                deadline = t.Deadline,
                assignedTo = t.AssignedTo != null ? new { id = t.AssignedTo.Id, fullName = t.AssignedTo.FullName, position = t.AssignedTo.Position } : null
            }),
            comments = doc.Comments.OrderBy(c => c.CreatedAt).Select(c => new
            {
                id = c.Id,
                comment = c.Comment,
                createdAt = c.CreatedAt,
                user = c.User != null ? new { id = c.User.Id, fullName = c.User.FullName, position = c.User.Position } : null
            }),
            statusHistory = doc.StatusHistory.OrderByDescending(h => h.CreatedAt).Select(h => new
            {
                id = h.Id,
                oldStatus = h.OldStatus.ToString(),
                newStatus = h.NewStatus.ToString(),
                reason = h.Reason,
                createdAt = h.CreatedAt,
                changedBy = h.ChangedBy != null ? new { id = h.ChangedBy.Id, fullName = h.ChangedBy.FullName } : null
            })
        };

        return Ok(ApiResponse<object>.Ok(detail, "Hujjat ma’lumotlari"));
    }

    [HttpPost]
    public async Task<IActionResult> CreateDocument([FromBody] CreateDocumentDto dto)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(dto.Title))
            {
                return BadRequest(ApiResponse<object>.Fail("Hujjat nomi kiritilishi shart"));
            }

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var user = await _context.Users.FindAsync(userId);

            Enum.TryParse<DocumentType>(dto.DocumentType, true, out var docType);
            Enum.TryParse<Priority>(dto.Priority, true, out var priority);

            // Generate Unique Reg Number
            var year = DateTime.UtcNow.Year;
            var prefix = docType == DocumentType.INCOMING ? "KIR" : docType == DocumentType.OUTGOING ? "CHIQ" : "ICH";
            var count = await _context.Documents.CountAsync(d => d.DocumentType == docType && d.CreatedAt.Year == year);
            var regNumber = $"{year}/{prefix}-{(count + 1):D4}";

            var doc = new Document
            {
                RegNumber = regNumber,
                Title = dto.Title,
                DocumentType = docType,
                Category = string.IsNullOrWhiteSpace(dto.Category) ? "Bildirgi" : dto.Category,
                Sender = dto.Sender,
                Receiver = dto.Receiver,
                DepartmentId = !string.IsNullOrEmpty(dto.DepartmentId) ? dto.DepartmentId : user?.DepartmentId,
                AssigneeId = dto.AssigneeId,
                CreatorId = userId,
                Priority = priority,
                Deadline = !string.IsNullOrEmpty(dto.Deadline) ? DateTime.SpecifyKind(DateTime.Parse(dto.Deadline), DateTimeKind.Utc) : null,
                Summary = dto.Summary,
                Status = DocumentStatus.REGISTERED
            };

            _context.Documents.Add(doc);

            // Status history
            _context.DocumentStatusHistories.Add(new DocumentStatusHistory
            {
                DocumentId = doc.Id,
                ChangedById = userId,
                OldStatus = DocumentStatus.NEW,
                NewStatus = DocumentStatus.REGISTERED,
                Reason = "C# API orqali ro‘yxatga olindi"
            });

            // Add Approver chain if provided
            if (dto.ApproverIds != null && dto.ApproverIds.Any())
            {
                int order = 1;
                foreach (var approverId in dto.ApproverIds)
                {
                    _context.DocumentApprovals.Add(new DocumentApproval
                    {
                        DocumentId = doc.Id,
                        ApproverId = approverId,
                        StepOrder = order++,
                        Status = ApprovalStatus.PENDING
                    });
                }
            }

            await _context.SaveChangesAsync();

            await _auditService.LogAsync(userId, "CREATE_DOCUMENT", "DOCUMENT", doc.Id, $"Yangi hujjat ro‘yxatga olindi: {doc.RegNumber} - {doc.Title}");

            return CreatedAtAction(nameof(GetDocumentById), new { id = doc.Id }, ApiResponse<object>.Ok(new { id = doc.Id, regNumber = doc.RegNumber, title = doc.Title }, "Hujjat muvaffaqiyatli ro‘yxatga olindi"));
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ERROR] CreateDocument: {ex}");
            return StatusCode(500, ApiResponse<object>.Fail($"Server xatosi: {ex.Message} {(ex.InnerException != null ? "--> " + ex.InnerException.Message : "")}"));
        }
    }

    [HttpPatch("{id}/status")]
    public async Task<IActionResult> UpdateStatus(string id, [FromBody] UpdateStatusDto dto)
    {
        var doc = await _context.Documents.FindAsync(id);
        if (doc == null) return NotFound(ApiResponse<object>.Fail("Hujjat topilmadi"));

        if (!Enum.TryParse<DocumentStatus>(dto.Status, true, out var newStatus))
        {
            return BadRequest(ApiResponse<object>.Fail("Noto‘g‘ri holat (status) ko‘rsatildi"));
        }

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var oldStatus = doc.Status;

        doc.Status = newStatus;
        if (newStatus == DocumentStatus.ARCHIVED) doc.IsArchived = true;
        doc.UpdatedAt = DateTime.UtcNow;

        _context.DocumentStatusHistories.Add(new DocumentStatusHistory
        {
            DocumentId = doc.Id,
            ChangedById = userId,
            OldStatus = oldStatus,
            NewStatus = newStatus,
            Reason = dto.Reason ?? $"Holat {newStatus} ga o‘zgartirildi"
        });

        await _context.SaveChangesAsync();
        await _auditService.LogAsync(userId, "CHANGE_STATUS", "DOCUMENT", doc.Id, $"{doc.RegNumber} holati {oldStatus} dan {newStatus} ga o‘zgardi");

        return Ok(ApiResponse<object>.Ok(doc, "Hujjat holati muvaffaqiyatli yangilandi"));
    }

    [HttpPost("{id}/approvals")]
    public async Task<IActionResult> SubmitApproval(string id, [FromBody] SubmitApprovalDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var approval = await _context.DocumentApprovals
            .FirstOrDefaultAsync(a => a.DocumentId == id && a.ApproverId == userId);

        if (approval == null)
        {
            return StatusCode(403, ApiResponse<object>.Fail("Siz ushbu hujjatning kelishuvchilar ro‘yxatida emassiz"));
        }

        if (!Enum.TryParse<ApprovalStatus>(dto.Status, true, out var status))
        {
            return BadRequest(ApiResponse<object>.Fail("Noto‘g‘ri kelishuv qarori"));
        }

        approval.Status = status;
        approval.Comments = dto.Comments;
        approval.SignedAt = DateTime.UtcNow;

        var doc = await _context.Documents.FindAsync(id);
        if (doc != null)
        {
            var remainingPending = await _context.DocumentApprovals.CountAsync(a => a.DocumentId == id && a.Status == ApprovalStatus.PENDING && a.Id != approval.Id);
            if (remainingPending == 0 && status == ApprovalStatus.APPROVED)
            {
                doc.Status = DocumentStatus.IN_EXECUTION;
            }
            else if (status == ApprovalStatus.REJECTED)
            {
                doc.Status = DocumentStatus.REJECTED;
            }
        }

        await _context.SaveChangesAsync();
        await _auditService.LogAsync(userId, "DOCUMENT_APPROVAL", "DOCUMENT", id, $"Viza berildi: {status} ({dto.Comments ?? "Izohsiz"})");

        return Ok(ApiResponse<object>.Ok(approval, "Kelishuv muvaffaqiyatli qayd etildi"));
    }

    [HttpPost("{id}/comments")]
    public async Task<IActionResult> AddComment(string id, [FromBody] AddCommentDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Comment))
        {
            return BadRequest(ApiResponse<object>.Fail("Izoh matni talab qilinadi"));
        }

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var comment = new DocumentComment
        {
            DocumentId = id,
            UserId = userId,
            Comment = dto.Comment
        };

        _context.DocumentComments.Add(comment);
        await _context.SaveChangesAsync();

        return Ok(ApiResponse<object>.Ok(comment, "Izoh muvaffaqiyatli qo‘shildi"));
    }
}
