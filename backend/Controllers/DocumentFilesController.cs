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
[Route("api/document-files")]
public class DocumentFilesController : ControllerBase
{
    private readonly ShortDocDbContext _context;
    private readonly IWebHostEnvironment _env;
    private readonly AuditService _auditService;

    public DocumentFilesController(ShortDocDbContext context, IWebHostEnvironment env, AuditService auditService)
    {
        _context = context;
        _env = env;
        _auditService = auditService;
    }

    [HttpPost("upload")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadFile([FromForm] UploadDocumentFileDto dto)
    {
        var file = dto.File;
        var documentId = dto.DocumentId;

        if (file == null || file.Length == 0)
        {
            return BadRequest(ApiResponse<object>.Fail("Fayl tanlanmagan"));
        }

        if (string.IsNullOrWhiteSpace(documentId))
        {
            return BadRequest(ApiResponse<object>.Fail("Hujjat ID ko‘rsatilmagan"));
        }

        var doc = await _context.Documents.FindAsync(documentId);
        if (doc == null)
        {
            return NotFound(ApiResponse<object>.Fail("Hujjat topilmadi"));
        }

        var uploadDir = Path.Combine(Directory.GetCurrentDirectory(), "uploads");
        if (!Directory.Exists(uploadDir)) Directory.CreateDirectory(uploadDir);

        var ext = Path.GetExtension(file.FileName);
        var uniqueName = $"doc-{Guid.NewGuid()}{ext}";
        var filePath = Path.Combine(uploadDir, uniqueName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var docFile = new DocumentFile
        {
            DocumentId = documentId,
            OriginalName = file.FileName,
            FileName = uniqueName,
            FilePath = filePath,
            FileSize = (int)file.Length,
            MimeType = file.ContentType,
            UploadedById = userId
        };

        _context.DocumentFiles.Add(docFile);
        await _context.SaveChangesAsync();

        await _auditService.LogAsync(userId, "UPLOAD_FILE", "DOCUMENT_FILE", docFile.Id, $"Fayl yuklandi: {docFile.OriginalName}");

        var user = await _context.Users.FindAsync(userId);
        var result = new
        {
            id = docFile.Id,
            originalName = docFile.OriginalName,
            fileName = docFile.FileName,
            fileSize = docFile.FileSize,
            mimeType = docFile.MimeType,
            uploadedBy = new { id = userId, fullName = user?.FullName ?? "Xodim" },
            createdAt = docFile.CreatedAt
        };

        return Ok(ApiResponse<object>.Ok(result, "Fayl muvaffaqiyatli yuklandi"));
    }

    [HttpGet("{id}/download")]
    public async Task<IActionResult> DownloadFile(string id)
    {
        var docFile = await _context.DocumentFiles.FindAsync(id);
        if (docFile == null || !System.IO.File.Exists(docFile.FilePath))
        {
            return NotFound(ApiResponse<object>.Fail("Fayl topilmadi"));
        }

        var bytes = await System.IO.File.ReadAllBytesAsync(docFile.FilePath);
        return File(bytes, docFile.MimeType, docFile.OriginalName);
    }
}
