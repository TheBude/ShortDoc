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
public class UsersController : ControllerBase
{
    private readonly ShortDocDbContext _context;
    private readonly AuditService _auditService;

    public UsersController(ShortDocDbContext context, AuditService auditService)
    {
        _context = context;
        _auditService = auditService;
    }

    [HttpGet]
    public async Task<IActionResult> GetUsers([FromQuery] string? role, [FromQuery] string? departmentId, [FromQuery] string? search)
    {
        var query = _context.Users.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(role) && Enum.TryParse<Role>(role, true, out var r))
        {
            query = query.Where(u => u.Role == r);
        }

        if (!string.IsNullOrWhiteSpace(departmentId))
        {
            query = query.Where(u => u.DepartmentId == departmentId);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.ToLower();
            query = query.Where(u => u.FullName.ToLower().Contains(s) || u.Email.ToLower().Contains(s) || u.Position.ToLower().Contains(s));
        }

        var users = await query
            .OrderBy(u => u.FullName)
            .Select(u => new
            {
                id = u.Id,
                email = u.Email,
                fullName = u.FullName,
                role = u.Role.ToString(),
                position = u.Position,
                phone = u.Phone,
                isActive = u.IsActive,
                departmentId = u.DepartmentId,
                department = u.Department != null ? new { id = u.Department.Id, name = u.Department.Name, code = u.Department.Code } : null,
                createdAt = u.CreatedAt
            })
            .ToListAsync();

        return Ok(ApiResponse<object>.Ok(users, "Foydalanuvchilar ro‘yxati"));
    }

    [HttpPost]
    [Authorize(Roles = "SUPER_ADMIN")]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Password) || string.IsNullOrWhiteSpace(dto.FullName))
        {
            return BadRequest(ApiResponse<object>.Fail("Email, parol va to‘liq ism kiritilishi shart"));
        }

        var exists = await _context.Users.AnyAsync(u => u.Email.ToLower() == dto.Email.ToLower());
        if (exists)
        {
            return BadRequest(ApiResponse<object>.Fail("Bu email bilan foydalanuvchi allaqachon mavjud"));
        }

        Enum.TryParse<Role>(dto.Role, true, out var role);

        var user = new User
        {
            Email = dto.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            FullName = dto.FullName,
            Role = role,
            Position = dto.Position,
            Phone = dto.Phone,
            DepartmentId = dto.DepartmentId
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return Ok(ApiResponse<object>.Ok(user, "Foydalanuvchi muvaffaqiyatli yaratildi"));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "SUPER_ADMIN")]
    public async Task<IActionResult> UpdateUser(string id, [FromBody] UpdateUserDto dto)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null) return NotFound(ApiResponse<object>.Fail("Foydalanuvchi topilmadi"));

        if (!string.IsNullOrWhiteSpace(dto.FullName)) user.FullName = dto.FullName;
        if (!string.IsNullOrWhiteSpace(dto.Position)) user.Position = dto.Position;
        if (!string.IsNullOrWhiteSpace(dto.Phone)) user.Phone = dto.Phone;
        if (!string.IsNullOrWhiteSpace(dto.Role) && Enum.TryParse<Role>(dto.Role, true, out var role)) user.Role = role;
        if (dto.DepartmentId != null) user.DepartmentId = dto.DepartmentId;
        if (dto.IsActive.HasValue) user.IsActive = dto.IsActive.Value;
        if (!string.IsNullOrWhiteSpace(dto.Password)) user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);

        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(ApiResponse<object>.Ok(user, "Foydalanuvchi muvaffaqiyatli yangilandi"));
    }
}
