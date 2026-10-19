using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShortDoc.Api.Data;
using ShortDoc.Api.DTOs;
using ShortDoc.Api.Models;

namespace ShortDoc.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ReportsController : ControllerBase
{
    private readonly ShortDocDbContext _context;

    public ReportsController(ShortDocDbContext context)
    {
        _context = context;
    }

    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard()
    {
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var currentRole = User.FindFirstValue(ClaimTypes.Role)!;
        var currentDeptId = User.FindFirstValue("departmentId");

        var docQuery = _context.Documents.AsQueryable();
        var taskQuery = _context.Tasks.AsQueryable();

        if (currentRole == "STAFF")
        {
            docQuery = docQuery.Where(d => d.CreatorId == currentUserId || d.AssigneeId == currentUserId);
            taskQuery = taskQuery.Where(t => t.AssignedToId == currentUserId);
        }
        else if (currentRole == "DEPARTMENT_HEAD" && !string.IsNullOrEmpty(currentDeptId))
        {
            docQuery = docQuery.Where(d => d.DepartmentId == currentDeptId);
        }

        var now = DateTime.UtcNow;
        var threeDaysLater = now.AddDays(3);

        var docStats = await docQuery
            .AsNoTracking()
            .GroupBy(_ => 1)
            .Select(g => new
            {
                Total = g.Count(),
                Incoming = g.Count(d => d.DocumentType == DocumentType.INCOMING),
                Outgoing = g.Count(d => d.DocumentType == DocumentType.OUTGOING),
                Internal = g.Count(d => d.DocumentType == DocumentType.INTERNAL),
                InExecution = g.Count(d => d.Status == DocumentStatus.IN_EXECUTION),
                Completed = g.Count(d => d.Status == DocumentStatus.COMPLETED),
                Rejected = g.Count(d => d.Status == DocumentStatus.REJECTED),
            })
            .FirstOrDefaultAsync();

        var taskStats = await taskQuery
            .AsNoTracking()
            .GroupBy(_ => 1)
            .Select(g => new
            {
                Overdue = g.Count(t => t.Status != DocTaskStatus.COMPLETED && t.Deadline < now),
                Approaching = g.Count(t => t.Status != DocTaskStatus.COMPLETED && t.Deadline >= now && t.Deadline <= threeDaysLater)
            })
            .FirstOrDefaultAsync();

        var recentActivities = await _context.AuditLogs
            .AsNoTracking()
            .OrderByDescending(a => a.CreatedAt)
            .Take(8)
            .Select(a => new
            {
                id = a.Id,
                action = a.Action,
                entity = a.Entity,
                details = a.Details,
                createdAt = a.CreatedAt,
                user = a.User != null ? new { fullName = a.User.FullName, role = a.User.Role.ToString() } : null
            })
            .ToListAsync();

        var departmentsStat = await _context.Departments
            .AsNoTracking()
            .OrderBy(d => d.Name)
            .Take(6)
            .Select(d => new
            {
                id = d.Id,
                name = d.Name,
                code = d.Code,
                _count = new
                {
                    documents = d.Documents.Count,
                    users = d.Users.Count
                }
            })
            .ToListAsync();

        var data = new
        {
            counts = new
            {
                total = docStats?.Total ?? 0,
                incoming = docStats?.Incoming ?? 0,
                outgoing = docStats?.Outgoing ?? 0,
                @internal = docStats?.Internal ?? 0,
                inExecution = docStats?.InExecution ?? 0,
                completed = docStats?.Completed ?? 0,
                rejected = docStats?.Rejected ?? 0,
                overdue = taskStats?.Overdue ?? 0,
                approachingDeadline = taskStats?.Approaching ?? 0
            },
            recentActivities,
            departmentsStat
        };

        return Ok(ApiResponse<object>.Ok(data, "Dashboard ko‘rsatkichlari"));
    }

    [HttpGet("export-csv")]
    public async Task<IActionResult> ExportCsv()
    {
        var documents = await _context.Documents
            .Include(d => d.Department)
            .Include(d => d.Creator)
            .Include(d => d.Assignee)
            .OrderByDescending(d => d.CreatedAt)
            .ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine("Ro‘yxat raqami,Hujjat nomi,Turi,Kategoriya,Holati,Muhimlik,Bo‘lim,Mas’ul shaxs,Yaratilgan sana,Ijro muddati");

        foreach (var d in documents)
        {
            var title = $"\"{d.Title.Replace("\"", "\"\"")}\"";
            var dept = $"\"{d.Department?.Name ?? "Noma’lum"}\"";
            var assignee = $"\"{d.Assignee?.FullName ?? d.Creator?.FullName ?? ""}\"";
            var date = d.CreatedAt.ToString("yyyy-MM-dd");
            var deadline = d.Deadline.HasValue ? d.Deadline.Value.ToString("yyyy-MM-dd") : "Belgilanmagan";

            sb.AppendLine($"\"{d.RegNumber}\",{title},{d.DocumentType},{d.Category},{d.Status},{d.Priority},{dept},{assignee},{date},{deadline}");
        }

        var bytes = Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(sb.ToString())).ToArray();
        return File(bytes, "text/csv; charset=utf-8", "shortdoc-hisobot-csharp.csv");
    }
}
