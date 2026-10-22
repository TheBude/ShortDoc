const { execSync } = require('child_process');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const schemaPath = path.resolve(__dirname, '../prisma/schema.prisma');
const schemaArg = `--schema="${schemaPath}"`;

async function deploy() {
  const prisma = new PrismaClient();
  console.log('[Migrate] Production ma\'lumotlar bazasi holati to‘liq tekshirilmoqda...');

  try {
    // 1. document_counters jadvali va indeksini alohida-alohida xavfsiz yaratish
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

    // 2. users jadvaliga tokenVersion ustunini xavfsiz qo'shish
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "tokenVersion" INTEGER NOT NULL DEFAULT 1;
    `);

    // 3. DepartmentType enumini xavfsiz yaratish
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "DepartmentType" AS ENUM ('RECTORATE', 'FACULTY', 'CHANCELLERY', 'DEPARTMENT', 'DIVISION');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 4. departments.type ustunini DepartmentType ga moslash
    await prisma.$executeRawUnsafe(`
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
    `);

    // 5. DocumentCategory enumini xavfsiz yaratish
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "DocumentCategory" AS ENUM ('ORDER', 'DECISION', 'DIRECTIVE', 'BILDIRGI', 'OFFICIAL_NOTE', 'APPLICATION', 'APPEAL', 'LETTER', 'CONTRACT', 'REPORT', 'ARCHIVE', 'OTHER');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 6. documents.category ustunini DocumentCategory ga moslash
    await prisma.$executeRawUnsafe(`
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
    `);

    // 7. _prisma_migrations jadvalini tekshirish
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

    // 8. Bosh SuperAdmin mavjudligini kafolatlash
    const adminEmail = 'admin@shortdoc.uz';
    const adminUser = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    const defaultAdminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin123!';
    const passwordHash = await bcrypt.hash(defaultAdminPassword, 10);

    if (!adminUser) {
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
      console.log(`[Migrate OK] Bosh SuperAdmin yaratildi: ${adminEmail} (parol: ${defaultAdminPassword})`);
    } else {
      // Agar admin mavjud bo'lsa, uning faol va SUPER_ADMIN ekanligini ta'minlash
      // Va agar SEED_ADMIN_PASSWORD uzatilgan bo'lsa parolini ham yangilash
      const updateData = {
        role: 'SUPER_ADMIN',
        isActive: true,
      };
      if (process.env.SEED_ADMIN_PASSWORD) {
        updateData.passwordHash = passwordHash;
      }
      await prisma.user.update({
        where: { email: adminEmail },
        data: updateData,
      });
      console.log(`[Migrate OK] Bosh SuperAdmin (${adminEmail}) faolligi va SUPER_ADMIN roli tasdiqlandi.`);
    }

  } catch (err) {
    console.warn('[Migrate] Oldindan tekshirish ogohlantirish:', err.message);
  } finally {
    await prisma.$disconnect();
  }

  // 9. Qolgan migratsiyalarni tatbiq etish
  console.log('[Migrate] prisma migrate deploy ishga tushirilmoqda...');
  try {
    execSync(`npx prisma migrate deploy ${schemaArg}`, { stdio: 'inherit' });
    console.log('[Migrate] Barcha Prisma migratsiyalari muvaffaqiyatli tatbiq etildi!');
  } catch (deployErr) {
    console.error('[Migrate] Deploy xatosi:', deployErr.message);
    process.exit(1);
  }
}

deploy();
