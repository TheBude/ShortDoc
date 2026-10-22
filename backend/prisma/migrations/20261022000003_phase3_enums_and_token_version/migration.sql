-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "tokenVersion" INTEGER NOT NULL DEFAULT 1;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "DepartmentType" AS ENUM ('RECTORATE', 'FACULTY', 'CHANCELLERY', 'DEPARTMENT', 'DIVISION');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable
DO $$ BEGIN
  ALTER TABLE "departments" ALTER COLUMN "type" DROP DEFAULT;
  ALTER TABLE "departments" ALTER COLUMN "type" TYPE "DepartmentType" USING (
    CASE "type"::text
      WHEN 'RECTORATE' THEN 'RECTORATE'::"DepartmentType"
      WHEN 'FACULTY' THEN 'FACULTY'::"DepartmentType"
      WHEN 'CHANCELLERY' THEN 'CHANCELLERY'::"DepartmentType"
      WHEN 'DIVISION' THEN 'DIVISION'::"DepartmentType"
      ELSE 'DEPARTMENT'::"DepartmentType"
    END
  );
  ALTER TABLE "departments" ALTER COLUMN "type" SET DEFAULT 'DEPARTMENT'::"DepartmentType";
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "DocumentCategory" AS ENUM ('ORDER', 'DECISION', 'DIRECTIVE', 'BILDIRGI', 'OFFICIAL_NOTE', 'APPLICATION', 'APPEAL', 'LETTER', 'CONTRACT', 'REPORT', 'ARCHIVE', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable
DO $$ BEGIN
  ALTER TABLE "documents" ALTER COLUMN "category" TYPE "DocumentCategory" USING (
    CASE
      WHEN "category"::text ILIKE '%buyru%' THEN 'ORDER'::"DocumentCategory"
      WHEN "category"::text ILIKE '%qaror%' THEN 'DECISION'::"DocumentCategory"
      WHEN "category"::text ILIKE '%farmoyish%' THEN 'DIRECTIVE'::"DocumentCategory"
      WHEN "category"::text ILIKE '%bildirgi%' THEN 'BILDIRGI'::"DocumentCategory"
      WHEN "category"::text ILIKE '%xizmat%' THEN 'OFFICIAL_NOTE'::"DocumentCategory"
      WHEN "category"::text ILIKE '%ariza%' THEN 'APPLICATION'::"DocumentCategory"
      WHEN "category"::text ILIKE '%murojaat%' THEN 'APPEAL'::"DocumentCategory"
      WHEN "category"::text ILIKE '%xat%' THEN 'LETTER'::"DocumentCategory"
      WHEN "category"::text ILIKE '%shartnoma%' THEN 'CONTRACT'::"DocumentCategory"
      WHEN "category"::text ILIKE '%hisobot%' THEN 'REPORT'::"DocumentCategory"
      WHEN "category"::text ILIKE '%arxiv%' THEN 'ARCHIVE'::"DocumentCategory"
      WHEN "category" IS NULL THEN 'BILDIRGI'::"DocumentCategory"
      ELSE 'OTHER'::"DocumentCategory"
    END
  );
  ALTER TABLE "documents" ALTER COLUMN "category" SET NOT NULL;
  ALTER TABLE "documents" ALTER COLUMN "category" SET DEFAULT 'BILDIRGI'::"DocumentCategory";
EXCEPTION
  WHEN OTHERS THEN null;
END $$;
