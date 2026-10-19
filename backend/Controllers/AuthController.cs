using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShortDoc.Api.Data;
using ShortDoc.Api.DTOs;
using ShortDoc.Api.Services;

namespace ShortDoc.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly ShortDocDbContext _context;
    private readonly JwtService _jwtService;
    private readonly AuditService _auditService;

    public AuthController(ShortDocDbContext context, JwtService jwtService, AuditService auditService)
    {
        _context = context;
        _jwtService = jwtService;
        _auditService = auditService;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Password))
        {
            return BadRequest(ApiResponse<object>.Fail("Email va parol kiritilishi shart"));
        }

        var user = await _context.Users
            .Include(u => u.Department)
            .FirstOrDefaultAsync(u => u.Email.ToLower() == dto.Email.ToLower());

        if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
        {
            return Unauthorized(ApiResponse<object>.Fail("Email yoki parol noto‘g‘ri"));
        }

        if (!user.IsActive)
        {
            return StatusCode(403, ApiResponse<object>.Fail("Hisobingiz bloklangan. Administratorga murojaat qiling."));
        }

        var token = _jwtService.GenerateToken(user);

        await _auditService.LogAsync(user.Id, "LOGIN", "AUTH", user.Id, $"{user.FullName} tizimga kirdi (C# API)", HttpContext.Connection.RemoteIpAddress?.ToString(), Request.Headers.UserAgent.ToString());

        var responseData = new
        {
            token,
            user = new
            {
                id = user.Id,
                email = user.Email,
                fullName = user.FullName,
                role = user.Role.ToString(),
                position = user.Position,
                phone = user.Phone,
                department = user.Department != null ? new
                {
                    id = user.Department.Id,
                    name = user.Department.Name,
                    code = user.Department.Code
                } : null
            }
        };

        return Ok(ApiResponse<object>.Ok(responseData, "Tizimga muvaffaqiyatli kirildi"));
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> GetCurrentUser()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(ApiResponse<object>.Fail("Avtorizatsiyadan o‘tilmagan"));
        }

        var user = await _context.Users
            .Include(u => u.Department)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null)
        {
            return NotFound(ApiResponse<object>.Fail("Foydalanuvchi topilmadi"));
        }

        var safeUser = new
        {
            id = user.Id,
            email = user.Email,
            fullName = user.FullName,
            role = user.Role.ToString(),
            position = user.Position,
            phone = user.Phone,
            department = user.Department != null ? new
            {
                id = user.Department.Id,
                name = user.Department.Name,
                code = user.Department.Code
            } : null
        };

        return Ok(ApiResponse<object>.Ok(safeUser, "Foydalanuvchi profili"));
    }

    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return NotFound(ApiResponse<object>.Fail("Foydalanuvchi topilmadi"));

        if (!BCrypt.Net.BCrypt.Verify(dto.OldPassword, user.PasswordHash))
        {
            return BadRequest(ApiResponse<object>.Fail("Eski parol noto‘g‘ri"));
        }

        if (string.IsNullOrWhiteSpace(dto.NewPassword) || dto.NewPassword.Length < 6)
        {
            return BadRequest(ApiResponse<object>.Fail("Yangi parol kamida 6 belgidan iborat bo‘lishi kerak"));
        }

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        await _auditService.LogAsync(user.Id, "CHANGE_PASSWORD", "USER", user.Id, "Parol yangilandi");
        return Ok(ApiResponse<object>.Ok(null, "Parol muvaffaqiyatli yangilandi"));
    }
}
