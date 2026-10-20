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
public class DepartmentsController : ControllerBase
{
    private readonly ShortDocDbContext _context;

    public DepartmentsController(ShortDocDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetDepartments()
    {
        var departments = await _context.Departments
            .AsNoTracking()
            .OrderBy(d => d.Name)
            .Select(d => new
            {
                id = d.Id,
                name = d.Name,
                code = d.Code,
                type = d.Type,
                _count = new
                {
                    users = d.Users.Count,
                    documents = d.Documents.Count
                }
            })
            .ToListAsync();

        return Ok(ApiResponse<object>.Ok(departments, "Bo‘limlar ro‘yxati"));
    }

    [HttpPost]
    [Authorize(Roles = "SUPER_ADMIN")]
    public async Task<IActionResult> CreateDepartment([FromBody] CreateDepartmentDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name) || string.IsNullOrWhiteSpace(dto.Code))
        {
            return BadRequest(ApiResponse<object>.Fail("Bo‘lim nomi va kodi talab qilinadi"));
        }

        var exists = await _context.Departments.AnyAsync(d => d.Code.ToLower() == dto.Code.ToLower());
        if (exists)
        {
            return BadRequest(ApiResponse<object>.Fail("Bunday kodli bo‘lim allaqachon mavjud"));
        }

        var dept = new Department
        {
            Name = dto.Name,
            Code = dto.Code,
            Type = dto.Type
        };

        _context.Departments.Add(dept);
        await _context.SaveChangesAsync();

        return Ok(ApiResponse<object>.Ok(dept, "Bo‘lim muvaffaqiyatli yaratildi"));
    }
}
