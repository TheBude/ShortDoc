-- Tez-tez ishlatiladigan filtr, JOIN va saralash ustunlari uchun indekslar.
-- IF NOT EXISTS: deploy-migrate.js bilan qayta ishga tushirilganda xavfsiz (idempotent).

-- documents.regNumber allaqachon UNIQUE indeksga ega, alohida indeks ortiqcha
DROP INDEX IF EXISTS "documents_regNumber_idx";

CREATE INDEX IF NOT EXISTS "users_departmentId_idx" ON "users"("departmentId");

CREATE INDEX IF NOT EXISTS "documents_departmentId_idx" ON "documents"("departmentId");
CREATE INDEX IF NOT EXISTS "documents_assigneeId_idx" ON "documents"("assigneeId");
CREATE INDEX IF NOT EXISTS "documents_creatorId_idx" ON "documents"("creatorId");
CREATE INDEX IF NOT EXISTS "documents_category_idx" ON "documents"("category");
CREATE INDEX IF NOT EXISTS "documents_createdAt_idx" ON "documents"("createdAt");

CREATE INDEX IF NOT EXISTS "document_files_documentId_idx" ON "document_files"("documentId");
CREATE INDEX IF NOT EXISTS "document_approvals_approverId_status_idx" ON "document_approvals"("approverId", "status");

CREATE INDEX IF NOT EXISTS "tasks_createdById_idx" ON "tasks"("createdById");
CREATE INDEX IF NOT EXISTS "tasks_status_deadline_idx" ON "tasks"("status", "deadline");

CREATE INDEX IF NOT EXISTS "document_comments_documentId_idx" ON "document_comments"("documentId");
CREATE INDEX IF NOT EXISTS "document_status_histories_documentId_idx" ON "document_status_histories"("documentId");

CREATE INDEX IF NOT EXISTS "audit_logs_userId_idx" ON "audit_logs"("userId");
CREATE INDEX IF NOT EXISTS "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

CREATE INDEX IF NOT EXISTS "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");
