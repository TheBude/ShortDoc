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
public class TasksController : ControllerBase
{
    private readonly ShortDocDbContext _context;
    private readonly AuditService _auditService;

    public TasksController(ShortDocDbContext context, AuditService auditService)
    {
        _context = context;
        _auditService = auditService;
    }

    [HttpGet]
    public async Task<IActionResult> GetTasks([FromQuery] string? status, [FromQuery] string? documentId)
    {
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var currentRole = User.FindFirstValue(ClaimTypes.Role)!;

        var query = _context.Tasks
            .AsNoTracking()
            .AsQueryable();

        if (currentRole == "STAFF")
        {
            query = query.Where(t => t.AssignedToId == currentUserId || t.CreatedById == currentUserId);
        }

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<DocTaskStatus>(status, true, out var st))
        {
            query = query.Where(t => t.Status == st);
        }

        if (!string.IsNullOrWhiteSpace(documentId))
        {
            query = query.Where(t => t.DocumentId == documentId);
        }

        var tasks = await query
            .OrderBy(t => t.Deadline)
            .Select(t => new
            {
                id = t.Id,
                documentId = t.DocumentId,
                title = t.Title,
                description = t.Description,
                status = t.Status.ToString(),
                deadline = t.Deadline,
                resultComment = t.ResultComment,
                resultFileUrl = t.ResultFileUrl,
                completedAt = t.CompletedAt,
                createdAt = t.CreatedAt,
                document = t.Document != null ? new { id = t.Document.Id, regNumber = t.Document.RegNumber, title = t.Document.Title } : null,
                assignedTo = t.AssignedTo != null ? new { id = t.AssignedTo.Id, fullName = t.AssignedTo.FullName, position = t.AssignedTo.Position } : null,
                createdBy = t.CreatedBy != null ? new { id = t.CreatedBy.Id, fullName = t.CreatedBy.FullName } : null
            })
            .ToListAsync();

        return Ok(ApiResponse<object>.Ok(tasks, "Topshiriqlar ro‘yxati"));
    }

    [HttpPost]
    public async Task<IActionResult> CreateTask([FromBody] CreateTaskDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Title) || string.IsNullOrWhiteSpace(dto.DocumentId) || string.IsNullOrWhiteSpace(dto.AssignedToId))
        {
            return BadRequest(ApiResponse<object>.Fail("Hujjat, sarlavha va mas’ul ijrochi ko‘rsatilishi shart"));
        }

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var task = new TaskItem
        {
            DocumentId = dto.DocumentId,
            Title = dto.Title,
            Description = dto.Description,
            AssignedToId = dto.AssignedToId,
            CreatedById = userId,
            Deadline = !string.IsNullOrEmpty(dto.Deadline) ? DateTime.SpecifyKind(DateTime.Parse(dto.Deadline), DateTimeKind.Utc) : null,
            Status = DocTaskStatus.PENDING
        };

        _context.Tasks.Add(task);

        // Add Notification
        var doc = await _context.Documents.FindAsync(dto.DocumentId);
        _context.Notifications.Add(new Notification
        {
            UserId = dto.AssignedToId,
            Title = "Yangi topshiriq biriktirildi",
            Message = $"{doc?.RegNumber ?? "Hujjat"} bo‘yicha topshiriq: \"{task.Title}\"",
            Link = "/tasks"
        });

        await _context.SaveChangesAsync();
        await _auditService.LogAsync(userId, "CREATE_TASK", "TASK", task.Id, $"Topshiriq yaratildi: {task.Title}");

        return Ok(ApiResponse<object>.Ok(task, "Topshiriq muvaffaqiyatli yaratildi"));
    }

    [HttpPatch("{id}/status")]
    public async Task<IActionResult> UpdateStatus(string id, [FromBody] UpdateTaskStatusDto dto)
    {
        var task = await _context.Tasks.FindAsync(id);
        if (task == null) return NotFound(ApiResponse<object>.Fail("Topshiriq topilmadi"));

        if (!Enum.TryParse<DocTaskStatus>(dto.Status, true, out var st))
        {
            return BadRequest(ApiResponse<object>.Fail("Noto‘g‘ri holat (status)"));
        }

        task.Status = st;
        if (st == DocTaskStatus.COMPLETED) task.CompletedAt = DateTime.UtcNow;
        task.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(ApiResponse<object>.Ok(task, "Topshiriq holati yangilandi"));
    }

    [HttpPost("{id}/submit-result")]
    public async Task<IActionResult> SubmitResult(string id, [FromBody] SubmitTaskResultDto dto)
    {
        var task = await _context.Tasks.FindAsync(id);
        if (task == null) return NotFound(ApiResponse<object>.Fail("Topshiriq topilmadi"));

        if (string.IsNullOrWhiteSpace(dto.ResultComment))
        {
            return BadRequest(ApiResponse<object>.Fail("Natija izohi kiritilishi shart"));
        }

        task.ResultComment = dto.ResultComment;
        task.ResultFileUrl = dto.ResultFileUrl;
        task.Status = DocTaskStatus.COMPLETED;
        task.CompletedAt = DateTime.UtcNow;
        task.UpdatedAt = DateTime.UtcNow;

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        await _context.SaveChangesAsync();
        await _auditService.LogAsync(userId, "COMPLETE_TASK", "TASK", task.Id, $"Topshiriq yakunlandi: {task.Title}");

        return Ok(ApiResponse<object>.Ok(task, "Topshiriq natijasi qabul qilindi"));
    }
}
