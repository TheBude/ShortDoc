using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShortDoc.Api.Data;
using ShortDoc.Api.DTOs;
using ShortDoc.Api.Models;
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

        if (user.RegistrationStatus == "PENDING")
        {
            return StatusCode(403, ApiResponse<object>.Fail("Arizangiz SuperAdmin tomonidan tasdiqlanishi kutilmoqda. 1 soat ichida javob ma'lum bo'ladi yoki admin bilan bog'laning: +998500728270"));
        }

        if (user.RegistrationStatus == "REJECTED")
        {
            return StatusCode(403, ApiResponse<object>.Fail("Ro‘yxatdan o‘tish arizangiz rad etilgan. Ma’lumot uchun admin bilan bog‘laning: +998500728270"));
        }

        if (!user.IsActive)
        {
            return StatusCode(403, ApiResponse<object>.Fail("Hisobingiz faol emas yoki bloklangan. Administratorga murojaat qiling."));
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
                registrationStatus = user.RegistrationStatus,
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

    [HttpGet("check-email")]
    public async Task<IActionResult> CheckEmail([FromQuery] string email)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            return BadRequest(ApiResponse<object>.Fail("Email ko‘rsatilmadi"));
        }

        var exists = await _context.Users.AnyAsync(u => u.Email.ToLower() == email.Trim().ToLower());
        return Ok(ApiResponse<object>.Ok(new { available = !exists, exists }));
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Password) || string.IsNullOrWhiteSpace(dto.FullName))
        {
            return BadRequest(ApiResponse<object>.Fail("Email, parol va to‘liq ism kiritilishi shart"));
        }

        var trimmedEmail = dto.Email.Trim().ToLower();
        var exists = await _context.Users.AnyAsync(u => u.Email.ToLower() == trimmedEmail);
        if (exists)
        {
            return BadRequest(ApiResponse<object>.Fail("Bu email bilan allaqachon ro‘yxatdan o‘tilgan"));
        }

        // Parol murakkabligi: Kamida 8 belgi, katta harf, kichik harf va raqam
        var pwd = dto.Password;
        var hasUpper = pwd.Any(char.IsUpper);
        var hasLower = pwd.Any(char.IsLower);
        var hasDigit = pwd.Any(char.IsDigit);

        if (pwd.Length < 8 || !hasUpper || !hasLower || !hasDigit)
        {
            return BadRequest(ApiResponse<object>.Fail("Parol talabga javob bermaydi: kamida 8 ta belgi, katta harf, kichik harf va son qatnashishi majburiy"));
        }

        // Bo'limni aniqlash
        string? departmentId = null;
        if (!string.IsNullOrWhiteSpace(dto.CustomDepartment))
        {
            var customDeptName = dto.CustomDepartment.Trim();
            var existingDept = await _context.Departments.FirstOrDefaultAsync(d => d.Name.ToLower() == customDeptName.ToLower());
            if (existingDept == null)
            {
                var deptCode = "DEP-" + Guid.NewGuid().ToString("N")[..6].ToUpper();
                existingDept = new Department
                {
                    Name = customDeptName,
                    Code = deptCode,
                    Type = "CUSTOM"
                };
                _context.Departments.Add(existingDept);
                await _context.SaveChangesAsync();
            }
            departmentId = existingDept.Id;
        }
        else if (!string.IsNullOrWhiteSpace(dto.DepartmentId))
        {
            departmentId = dto.DepartmentId;
        }

        // Lavozimni aniqlash
        string position = "Xodim";
        if (!string.IsNullOrWhiteSpace(dto.CustomPosition))
        {
            position = dto.CustomPosition.Trim();
        }
        else if (!string.IsNullOrWhiteSpace(dto.Position))
        {
            position = dto.Position.Trim();
        }

        // Bo'lim va lavozimga qarab rolni avtomatik aniqlash
        string deptNameToCompare = dto.CustomDepartment ?? "";
        if (string.IsNullOrEmpty(deptNameToCompare) && departmentId != null)
        {
            var d = await _context.Departments.FindAsync(departmentId);
            deptNameToCompare = d?.Name ?? "";
        }

        var dLower = deptNameToCompare.ToLower();
        var pLower = position.ToLower();
        Role resolvedRole = Role.STAFF;
        if (dLower.Contains("rektor") || pLower.Contains("rektor") || pLower.Contains("prorektor"))
        {
            resolvedRole = Role.LEADERSHIP;
        }
        else if (dLower.Contains("devon") || pLower.Contains("devonxona"))
        {
            resolvedRole = Role.CHANCELLERY;
        }
        else if (pLower.Contains("boshlig") || pLower.Contains("mudir") || pLower.Contains("dekan") || pLower.Contains("rahbar"))
        {
            resolvedRole = Role.DEPARTMENT_HEAD;
        }

        var newUser = new User
        {
            Email = trimmedEmail,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            FullName = dto.FullName.Trim(),
            Role = resolvedRole,
            Position = position,
            Phone = dto.Phone?.Trim(),
            DepartmentId = departmentId,
            IsActive = false,
            RegistrationStatus = "PENDING",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Users.Add(newUser);
        await _context.SaveChangesAsync();

        await _auditService.LogAsync(
            newUser.Id,
            "REGISTER",
            "AUTH",
            newUser.Id,
            $"{newUser.FullName} ({newUser.Email}) yangi ro‘yxatdan o‘tish arizasini topshirdi",
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            Request.Headers.UserAgent.ToString()
        );

        return Ok(ApiResponse<object>.Ok(new
        {
            id = newUser.Id,
            email = newUser.Email,
            fullName = newUser.FullName,
            registrationStatus = newUser.RegistrationStatus,
            supportPhone = "+998500728270",
            message = "Adminga barcha ma'lumotlar yuborildi. 1 soat ichida javob ma'lum bo'ladi yoki admin bilan bog'lanish: +998500728270"
        }, "Arizangiz muvaffaqiyatli qabul qilindi"));
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
