namespace ShortDoc.Api.Models;

public enum Role
{
    SUPER_ADMIN,
    LEADERSHIP,
    CHANCELLERY,
    DEPARTMENT_HEAD,
    STAFF
}

public enum DocumentType
{
    INCOMING,
    OUTGOING,
    INTERNAL
}

public enum DocumentStatus
{
    NEW,
    REGISTERED,
    IN_REVIEW,
    IN_APPROVAL,
    IN_EXECUTION,
    COMPLETED,
    REJECTED,
    ARCHIVED
}

public enum Priority
{
    LOW,
    MEDIUM,
    HIGH,
    URGENT
}

public enum ApprovalStatus
{
    PENDING,
    APPROVED,
    REJECTED
}

public enum DocTaskStatus
{
    PENDING,
    IN_PROGRESS,
    COMPLETED,
    OVERDUE,
    CANCELLED
}
