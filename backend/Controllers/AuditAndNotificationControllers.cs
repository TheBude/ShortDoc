using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShortDoc.Api.Data;
using ShortDoc.Api.DTOs;

namespace ShortDoc.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/audit-logs")]
public class AuditLogsController : ControllerBase
{
    private readonly ShortDocDbContext _context;

    public AuditLogsController(ShortDocDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    [Authorize(Roles = "SUPER_ADMIN,LEADERSHIP")]
    public async Task<IActionResult> GetAuditLogs([FromQuery] string? action, [FromQuery] string? entity, [FromQuery] int page = 1, [FromQuery] int limit = 20)
    {
        var query = _context.AuditLogs.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(action)) query = query.Where(a => a.Action == action);
        if (!string.IsNullOrWhiteSpace(entity)) query = query.Where(a => a.Entity == entity);

        var total = await query.CountAsync();
        var skip = (page - 1) * limit;

        var logs = await query
            .OrderByDescending(a => a.CreatedAt)
            .Skip(skip)
            .Take(limit)
            .Select(a => new
            {
                id = a.Id,
                action = a.Action,
                entity = a.Entity,
                entityId = a.EntityId,
                details = a.Details,
                ipAddress = a.IpAddress,
                createdAt = a.CreatedAt,
                user = a.User != null ? new { id = a.User.Id, fullName = a.User.FullName, role = a.User.Role.ToString() } : null
            })
            .ToListAsync();

        var meta = new PaginationMeta
        {
            Page = page,
            Limit = limit,
            Total = total,
            TotalPages = (int)Math.Ceiling(total / (double)limit)
        };

        return Ok(ApiResponse<object>.Ok(logs, "Audit jurnali", meta));
    }
}

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class NotificationsController : ControllerBase
{
    private readonly ShortDocDbContext _context;

    public NotificationsController(ShortDocDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetNotifications()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var notifications = await _context.Notifications
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .Take(20)
            .ToListAsync();

        var unreadCount = await _context.Notifications.CountAsync(n => n.UserId == userId && !n.IsRead);

        return Ok(ApiResponse<object>.Ok(new { notifications, unreadCount }, "Bildirishnomalar"));
    }

    [HttpPatch("{id}/read")]
    public async Task<IActionResult> MarkAsRead(string id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var notif = await _context.Notifications.FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId);
        if (notif == null) return NotFound(ApiResponse<object>.Fail("Topilmadi"));

        notif.IsRead = true;
        await _context.SaveChangesAsync();

        return Ok(ApiResponse<object>.Ok(notif, "O‘qildi deb belgilandi"));
    }
}
