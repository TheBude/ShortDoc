-- AlterTable
ALTER TABLE "users" ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 1;

-- CreateEnum
CREATE TYPE "DepartmentType" AS ENUM ('RECTORATE', 'FACULTY', 'CHANCELLERY', 'DEPARTMENT', 'DIVISION');

-- AlterTable
ALTER TABLE "departments" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "departments" ALTER COLUMN "type" TYPE "DepartmentType" USING (
  CASE "type"
    WHEN 'RECTORATE' THEN 'RECTORATE'::"DepartmentType"
    WHEN 'FACULTY' THEN 'FACULTY'::"DepartmentType"
    WHEN 'CHANCELLERY' THEN 'CHANCELLERY'::"DepartmentType"
    WHEN 'DIVISION' THEN 'DIVISION'::"DepartmentType"
    ELSE 'DEPARTMENT'::"DepartmentType"
  END
);
ALTER TABLE "departments" ALTER COLUMN "type" SET DEFAULT 'DEPARTMENT'::"DepartmentType";

-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('ORDER', 'DECISION', 'DIRECTIVE', 'BILDIRGI', 'OFFICIAL_NOTE', 'APPLICATION', 'APPEAL', 'LETTER', 'CONTRACT', 'REPORT', 'ARCHIVE', 'OTHER');

-- AlterTable
ALTER TABLE "documents" ALTER COLUMN "category" TYPE "DocumentCategory" USING (
  CASE
    WHEN "category" ILIKE '%buyru%' THEN 'ORDER'::"DocumentCategory"
    WHEN "category" ILIKE '%qaror%' THEN 'DECISION'::"DocumentCategory"
    WHEN "category" ILIKE '%farmoyish%' THEN 'DIRECTIVE'::"DocumentCategory"
    WHEN "category" ILIKE '%bildirgi%' THEN 'BILDIRGI'::"DocumentCategory"
    WHEN "category" ILIKE '%xizmat%' THEN 'OFFICIAL_NOTE'::"DocumentCategory"
    WHEN "category" ILIKE '%ariza%' THEN 'APPLICATION'::"DocumentCategory"
    WHEN "category" ILIKE '%murojaat%' THEN 'APPEAL'::"DocumentCategory"
    WHEN "category" ILIKE '%xat%' THEN 'LETTER'::"DocumentCategory"
    WHEN "category" ILIKE '%shartnoma%' THEN 'CONTRACT'::"DocumentCategory"
    WHEN "category" ILIKE '%hisobot%' THEN 'REPORT'::"DocumentCategory"
    WHEN "category" ILIKE '%arxiv%' THEN 'ARCHIVE'::"DocumentCategory"
    WHEN "category" IS NULL THEN 'BILDIRGI'::"DocumentCategory"
    ELSE 'OTHER'::"DocumentCategory"
  END
);
ALTER TABLE "documents" ALTER COLUMN "category" SET NOT NULL;
ALTER TABLE "documents" ALTER COLUMN "category" SET DEFAULT 'BILDIRGI'::"DocumentCategory";
