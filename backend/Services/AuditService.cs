using ShortDoc.Api.Data;
using ShortDoc.Api.Models;

namespace ShortDoc.Api.Services;

public class AuditService
{
    private readonly ShortDocDbContext _context;

    public AuditService(ShortDocDbContext context)
    {
        _context = context;
    }

    public async Task LogAsync(string? userId, string action, string entity, string? entityId = null, string? details = null, string? ipAddress = null, string? userAgent = null)
    {
        try
        {
            var log = new AuditLog
            {
                UserId = userId,
                Action = action,
                Entity = entity,
                EntityId = entityId,
                Details = details,
                IpAddress = ipAddress,
                UserAgent = userAgent
            };
            _context.AuditLogs.Add(log);
            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Audit log error: {ex.Message}");
        }
    }
}
