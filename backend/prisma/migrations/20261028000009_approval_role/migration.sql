-- Kelishuvchi (REVIEWER) va imzolovchi (SIGNER) rollari: imzolovchi zanjirning oxirgi bosqichi
CREATE TYPE "ApprovalRole" AS ENUM ('REVIEWER', 'SIGNER');
ALTER TABLE "document_approvals" ADD COLUMN "role" "ApprovalRole" NOT NULL DEFAULT 'REVIEWER';

-- Mavjud hujjatlarda har bir zanjirning oxirgi bosqichi imzolovchi hisoblanadi
UPDATE "document_approvals" a
SET "role" = 'SIGNER'
WHERE a."stepOrder" = (
  SELECT MAX(b."stepOrder") FROM "document_approvals" b WHERE b."documentId" = a."documentId"
);
