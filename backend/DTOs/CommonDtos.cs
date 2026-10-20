namespace ShortDoc.Api.DTOs;

public class ApiResponse<T>
{
    public bool Success { get; set; } = true;
    public string? Message { get; set; }
    public T? Data { get; set; }
    public object? Errors { get; set; }
    public PaginationMeta? Meta { get; set; }

    public static ApiResponse<T> Ok(T? data, string message = "Muvaffaqiyatli bajarildi", PaginationMeta? meta = null)
    {
        return new ApiResponse<T>
        {
            Success = true,
            Message = message,
            Data = data,
            Meta = meta
        };
    }

    public static ApiResponse<T> Fail(string message, object? errors = null)
    {
        return new ApiResponse<T>
        {
            Success = false,
            Message = message,
            Errors = errors
        };
    }
}

public class PaginationMeta
{
    public int Page { get; set; }
    public int Limit { get; set; }
    public int Total { get; set; }
    public int TotalPages { get; set; }
}

public class LoginDto
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class RegisterDto
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? DepartmentId { get; set; }
    public string? CustomDepartment { get; set; }
    public string Position { get; set; } = string.Empty;
    public string? CustomPosition { get; set; }
}

public class ApproveUserDto
{
    public string? Role { get; set; }
}

public class ChangePasswordDto
{
    public string OldPassword { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}

public class CreateDocumentDto
{
    public string Title { get; set; } = string.Empty;
    public string DocumentType { get; set; } = "INTERNAL";
    public string Category { get; set; } = "Bildirgi";
    public string? Sender { get; set; }
    public string? Receiver { get; set; }
    public string? DepartmentId { get; set; }
    public string? AssigneeId { get; set; }
    public string Priority { get; set; } = "MEDIUM";
    public string? Deadline { get; set; }
    public string? Summary { get; set; }
    public List<string>? ApproverIds { get; set; }
}

public class UpdateStatusDto
{
    public string Status { get; set; } = string.Empty;
    public string? Reason { get; set; }
}

public class SubmitApprovalDto
{
    public string Status { get; set; } = string.Empty; // APPROVED or REJECTED
    public string? Comments { get; set; }
}

public class AddCommentDto
{
    public string Comment { get; set; } = string.Empty;
}

public class CreateTaskDto
{
    public string DocumentId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string AssignedToId { get; set; } = string.Empty;
    public string? Deadline { get; set; }
}

public class UpdateTaskStatusDto
{
    public string Status { get; set; } = string.Empty;
}

public class SubmitTaskResultDto
{
    public string ResultComment { get; set; } = string.Empty;
    public string? ResultFileUrl { get; set; }
}

public class CreateUserDto
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Role { get; set; } = "STAFF";
    public string Position { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? DepartmentId { get; set; }
}

public class UpdateUserDto
{
    public string? FullName { get; set; }
    public string? Position { get; set; }
    public string? Phone { get; set; }
    public string? Role { get; set; }
    public string? DepartmentId { get; set; }
    public bool? IsActive { get; set; }
    public string? Password { get; set; }
}

public class CreateDepartmentDto
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Type { get; set; } = "DEPARTMENT";
}

public class UploadDocumentFileDto
{
    public string DocumentId { get; set; } = string.Empty;
    public Microsoft.AspNetCore.Http.IFormFile? File { get; set; }
}

