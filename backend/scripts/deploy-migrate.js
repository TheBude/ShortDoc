const { execSync } = require('child_process');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const schemaPath = path.resolve(__dirname, '../prisma/schema.prisma');
const schemaArg = `--schema="${schemaPath}"`;

async function deploy() {
  const prisma = new PrismaClient();
  console.log('[Migrate] Production ma\'lumotlar bazasi holati tekshirilmoqda...');

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

    // 2. _prisma_migrations jadvalini tekshirish
    const migrationsTableRes = await prisma.$queryRawUnsafe(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = '_prisma_migrations'
      );
    `);

    const tableExists = migrationsTableRes[0]?.exists;
    if (tableExists) {
      // Failed (chala qolgan) migratsiyalarni aniqlash
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
      // Agar _prisma_migrations jadvali bo'lmasa, boshlang'ich migratsiyani baseline qilish
      console.log('[Migrate] _prisma_migrations jadvali mavjud emas. Boshlang‘ich 20261022000001_init baseline qilinmoqda...');
      try {
        execSync(`npx prisma migrate resolve --applied 20261022000001_init ${schemaArg}`, { stdio: 'inherit' });
      } catch (baseErr) {
        console.warn('[Migrate] Init baseline ogohlantirish:', baseErr.message);
      }
    }
  } catch (err) {
    console.warn('[Migrate] Oldindan tekshirish ogohlantirish:', err.message);
  } finally {
    await prisma.$disconnect();
  }

  // 3. Qolgan migratsiyalarni tatbiq etish
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
