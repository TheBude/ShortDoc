const { execSync } = require('child_process');
const crypto = require('crypto');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { syncOrgStructure } = require('./sync-org-structure');

const schemaPath = path.resolve(__dirname, '../prisma/schema.prisma');
const schemaArg = `--schema="${schemaPath}"`;

async function deploy() {
  const prisma = new PrismaClient();
  console.log('[Migrate] Production ma\'lumotlar bazasi holati to‘liq tekshirilmoqda...');

  try {
    // 1. document_counters jadvali va indeksini yaratish
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "document_counters" (
          "id" TEXT NOT NULL,
          "year" INTEGER NOT NULL,
          "type" TEXT NOT NULL,
          "lastNumber" INTEGER NOT NULL DEFAULT 0,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "document_counters_pkey" PRIMARY KEY ("id")
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "document_counters_year_type_key" ON "document_counters"("year", "type");
    `);

    // 2. users jadvaliga tokenVersion ustunini qo'shish
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "tokenVersion" INTEGER NOT NULL DEFAULT 1;
    `);

    // 3. DocumentCategory enumini yaratish
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "DocumentCategory" AS ENUM ('ORDER', 'DECISION', 'DIRECTIVE', 'BILDIRGI', 'OFFICIAL_NOTE', 'APPLICATION', 'APPEAL', 'LETTER', 'CONTRACT', 'REPORT', 'ARCHIVE', 'OTHER');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 4. documents.category ustunining turini tekshirish va uni DocumentCategory enumiga o'tkazish
    const catCol = await prisma.$queryRawUnsafe(`
      SELECT udt_name FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'category';
    `);

    if (catCol.length > 0 && catCol[0].udt_name !== 'DocumentCategory') {
      console.log(`[Migrate] documents.category (${catCol[0].udt_name}) ustunini DocumentCategory enumiga o‘tkazish boshlandi...`);
      // a) Eski default qiymatni o'chirish (aks holda type cast qilib bo'lmaydi)
      await prisma.$executeRawUnsafe(`ALTER TABLE "documents" ALTER COLUMN "category" DROP DEFAULT;`);
      
      // b) Ustun turini o'zgartirish
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "documents" ALTER COLUMN "category" TYPE "DocumentCategory" USING (
          CASE
            WHEN "category"::text ILIKE '%buyru%' OR "category"::text = 'ORDER' THEN 'ORDER'::"DocumentCategory"
            WHEN "category"::text ILIKE '%qaror%' OR "category"::text = 'DECISION' THEN 'DECISION'::"DocumentCategory"
            WHEN "category"::text ILIKE '%farmoyish%' OR "category"::text = 'DIRECTIVE' THEN 'DIRECTIVE'::"DocumentCategory"
            WHEN "category"::text ILIKE '%bildirgi%' OR "category"::text = 'BILDIRGI' THEN 'BILDIRGI'::"DocumentCategory"
            WHEN "category"::text ILIKE '%xizmat%' OR "category"::text = 'OFFICIAL_NOTE' THEN 'OFFICIAL_NOTE'::"DocumentCategory"
            WHEN "category"::text ILIKE '%ariza%' OR "category"::text = 'APPLICATION' THEN 'APPLICATION'::"DocumentCategory"
            WHEN "category"::text ILIKE '%murojaat%' OR "category"::text = 'APPEAL' THEN 'APPEAL'::"DocumentCategory"
            WHEN "category"::text ILIKE '%xat%' OR "category"::text = 'LETTER' THEN 'LETTER'::"DocumentCategory"
            WHEN "category"::text ILIKE '%shartnoma%' OR "category"::text = 'CONTRACT' THEN 'CONTRACT'::"DocumentCategory"
            WHEN "category"::text ILIKE '%hisobot%' OR "category"::text = 'REPORT' THEN 'REPORT'::"DocumentCategory"
            WHEN "category"::text ILIKE '%arxiv%' OR "category"::text = 'ARCHIVE' THEN 'ARCHIVE'::"DocumentCategory"
            ELSE 'BILDIRGI'::"DocumentCategory"
          END
        );
      `);

      // c) Yangi default qiymatni o'rnatish
      await prisma.$executeRawUnsafe(`ALTER TABLE "documents" ALTER COLUMN "category" SET DEFAULT 'BILDIRGI'::"DocumentCategory";`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "documents" ALTER COLUMN "category" SET NOT NULL;`);
      console.log(`[Migrate OK] documents.category muvaffaqiyatli DocumentCategory ga o‘tkazildi!`);
    }

    // 5. DepartmentType enumini yaratish
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "DepartmentType" AS ENUM ('RECTORATE', 'FACULTY', 'CHANCELLERY', 'DEPARTMENT', 'DIVISION', 'INSTITUTE', 'CHAIR', 'CENTER');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 6. departments.type ustunining turini tekshirish va uni DepartmentType enumiga o'tkazish
    const typeCol = await prisma.$queryRawUnsafe(`
      SELECT udt_name FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'departments' AND column_name = 'type';
    `);

    if (typeCol.length > 0 && typeCol[0].udt_name !== 'DepartmentType') {
      console.log(`[Migrate] departments.type (${typeCol[0].udt_name}) ustunini DepartmentType enumiga o‘tkazish boshlandi...`);
      // a) Eski default qiymatni o'chirish
      await prisma.$executeRawUnsafe(`ALTER TABLE "departments" ALTER COLUMN "type" DROP DEFAULT;`);

      // b) Ustun turini o'zgartirish
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "departments" ALTER COLUMN "type" TYPE "DepartmentType" USING (
          CASE "type"::text
            WHEN 'RECTORATE' THEN 'RECTORATE'::"DepartmentType"
            WHEN 'FACULTY' THEN 'FACULTY'::"DepartmentType"
            WHEN 'CHANCELLERY' THEN 'CHANCELLERY'::"DepartmentType"
            WHEN 'DIVISION' THEN 'DIVISION'::"DepartmentType"
            ELSE 'DEPARTMENT'::"DepartmentType"
          END
        );
      `);

      // c) Yangi default qiymatni o'rnatish
      await prisma.$executeRawUnsafe(`ALTER TABLE "departments" ALTER COLUMN "type" SET DEFAULT 'DEPARTMENT'::"DepartmentType";`);
      console.log(`[Migrate OK] departments.type muvaffaqiyatli DepartmentType ga o‘tkazildi!`);
    }

    // 7. PostgreSQL da text <-> DocumentCategory solishtirishida xatolik chiqmasligi uchun Implicit Cast yaratish
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION text_to_doc_cat(text) RETURNS "DocumentCategory" AS $$
        SELECT CASE
          WHEN $1 ILIKE '%buyru%' OR $1 = 'ORDER' THEN 'ORDER'::"DocumentCategory"
          WHEN $1 ILIKE '%qaror%' OR $1 = 'DECISION' THEN 'DECISION'::"DocumentCategory"
          WHEN $1 ILIKE '%farmoyish%' OR $1 = 'DIRECTIVE' THEN 'DIRECTIVE'::"DocumentCategory"
          WHEN $1 ILIKE '%bildirgi%' OR $1 = 'BILDIRGI' THEN 'BILDIRGI'::"DocumentCategory"
          WHEN $1 ILIKE '%xizmat%' OR $1 = 'OFFICIAL_NOTE' THEN 'OFFICIAL_NOTE'::"DocumentCategory"
          WHEN $1 ILIKE '%ariza%' OR $1 = 'APPLICATION' THEN 'APPLICATION'::"DocumentCategory"
          WHEN $1 ILIKE '%murojaat%' OR $1 = 'APPEAL' THEN 'APPEAL'::"DocumentCategory"
          WHEN $1 ILIKE '%xat%' OR $1 = 'LETTER' THEN 'LETTER'::"DocumentCategory"
          WHEN $1 ILIKE '%shartnoma%' OR $1 = 'CONTRACT' THEN 'CONTRACT'::"DocumentCategory"
          WHEN $1 ILIKE '%hisobot%' OR $1 = 'REPORT' THEN 'REPORT'::"DocumentCategory"
          WHEN $1 ILIKE '%arxiv%' OR $1 = 'ARCHIVE' THEN 'ARCHIVE'::"DocumentCategory"
          ELSE 'OTHER'::"DocumentCategory"
        END;
      $$ LANGUAGE SQL IMMUTABLE;
    `);

    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE CAST (text AS "DocumentCategory") WITH FUNCTION text_to_doc_cat(text) AS IMPLICIT;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 8. _prisma_migrations jadvalini tekshirish
    const migrationsTableRes = await prisma.$queryRawUnsafe(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = '_prisma_migrations'
      );
    `);

    const tableExists = migrationsTableRes[0]?.exists;
    if (tableExists) {
      const failed = await prisma.$queryRawUnsafe(`
        SELECT migration_name FROM "_prisma_migrations" 
        WHERE finished_at IS NULL;
      `);

      for (const row of failed) {
        console.log(`[Migrate] Chala qolgan migratsiya aniqlandi (${row.migration_name}). Muvaffaqiyatli deb qayd qilinmoqda...`);
        try {
          execSync(`npx prisma migrate resolve --applied ${row.migration_name} ${schemaArg}`, { stdio: 'inherit' });
        } catch (resolveErr) {
          console.warn(`[Migrate] Resolve ogohlantirish (${row.migration_name}):`, resolveErr.message);
        }
      }
    } else {
      console.log('[Migrate] _prisma_migrations jadvali mavjud emas. Boshlang‘ich 20261022000001_init baseline qilinmoqda...');
      try {
        execSync(`npx prisma migrate resolve --applied 20261022000001_init ${schemaArg}`, { stdio: 'inherit' });
      } catch (baseErr) {
        console.warn('[Migrate] Init baseline ogohlantirish:', baseErr.message);
      }
    }

    // 9. Bosh SuperAdmin mavjudligini kafolatlash
    const adminEmail = 'admin@shortdoc.uz';
    const adminUser = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (!adminUser) {
      // Ma'lum (kodda yozilgan) standart parol ishlatilmaydi: SEED_ADMIN_PASSWORD berilmasa tasodifiy parol yaratiladi
      const hasSeedPassword = Boolean(process.env.SEED_ADMIN_PASSWORD);
      const initialPassword = process.env.SEED_ADMIN_PASSWORD || crypto.randomBytes(12).toString('base64url');
      const passwordHash = await bcrypt.hash(initialPassword, 10);

      console.log(`[Migrate] SuperAdmin mavjud emas. ${adminEmail} yaratilmoqda...`);
      await prisma.user.create({
        data: {
          email: adminEmail,
          passwordHash,
          fullName: 'Bosh Administrator',
          role: 'SUPER_ADMIN',
          position: 'Tizim administratori',
          isActive: true,
          tokenVersion: 1,
        },
      });

      if (hasSeedPassword) {
        console.log(`[Migrate OK] Bosh SuperAdmin yaratildi: ${adminEmail} (parol SEED_ADMIN_PASSWORD dan olindi)`);
      } else {
        console.log(`[Migrate OK] Bosh SuperAdmin yaratildi: ${adminEmail}`);
        console.log(`[Migrate] Boshlang'ich parol (faqat bir marta ko'rsatiladi, kirgach darhol almashtiring): ${initialPassword}`);
      }
    } else {
      const updateData = {
        role: 'SUPER_ADMIN',
        isActive: true,
      };
      if (process.env.SEED_ADMIN_PASSWORD) {
        updateData.passwordHash = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD, 10);
        // Parol qayta tiklanganda eski sessiyalar ham bekor qilinadi
        updateData.tokenVersion = { increment: 1 };
      }
      await prisma.user.update({
        where: { email: adminEmail },
        data: updateData,
      });
      console.log(`[Migrate OK] Bosh SuperAdmin (${adminEmail}) faolligi va SUPER_ADMIN roli tasdiqlandi.`);
    }

  } catch (err) {
    console.error('❌ [Migrate XATOLIK]:', err.message);
  } finally {
    await prisma.$disconnect();
  }

  // 10. Qolgan migratsiyalarni tatbiq etish
  console.log('[Migrate] prisma migrate deploy ishga tushirilmoqda...');
  try {
    execSync(`npx prisma migrate deploy ${schemaArg}`, { stdio: 'inherit' });
    console.log('[Migrate] Barcha Prisma migratsiyalari muvaffaqiyatli tatbiq etildi!');
  } catch (deployErr) {
    console.error('[Migrate] Deploy xatosi:', deployErr.message);
    process.exit(1);
  }

  // 11. Universitet tuzilmasini (bo'lim guruhlari) sinxronlash
  const orgPrisma = new PrismaClient();
  try {
    await syncOrgStructure(orgPrisma);
  } catch (orgErr) {
    console.error('[Migrate] Tuzilmani sinxronlashda xato:', orgErr.message);
  } finally {
    await orgPrisma.$disconnect();
  }
}

deploy();
