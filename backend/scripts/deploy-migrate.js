const { execSync } = require('child_process');
const path = require('path');

const schemaPath = path.resolve(__dirname, '../prisma/schema.prisma');
const schemaArg = `--schema="${schemaPath}"`;

console.log('[Migrate] Tekshirilmoqda va Prisma migratsiyalari qo‘llanilmoqda...');

try {
  // 1-urinish: standart deploy
  execSync(`npx prisma migrate deploy ${schemaArg}`, { stdio: 'inherit' });
  console.log('[Migrate] Barcha migratsiyalar muvaffaqiyatli tatbiq etildi.');
} catch (error) {
  console.warn('[Migrate] Standart migrate deploy to‘xtadi. Mavjud baza uchun baseline (P3005) tekshirilmoqda...');
  try {
    // Agar baza bo‘sh bo‘lmasa (P3005), boshlang‘ich 20261022000001_init migratsiyasini "applied" (bajarilgan) deb belgilaymiz:
    console.log('[Migrate] Boshlang‘ich migratsiya belgilanmoqda: 20261022000001_init...');
    execSync(`npx prisma migrate resolve --applied 20261022000001_init ${schemaArg}`, { stdio: 'inherit' });
    console.log('[Migrate] Boshlang‘ich migratsiya yozildi. Qolgan yangi migratsiyalar qo‘llanilmoqda...');
    
    // Qolgan yangi migratsiyalarni (phase2_counters, phase3_enums_and_token_version) qo‘llaymiz:
    execSync(`npx prisma migrate deploy ${schemaArg}`, { stdio: 'inherit' });
    console.log('[Migrate] Yangi migratsiyalar bazaga to‘liq va muvaffaqiyatli qo‘llanildi!');
  } catch (baselineError) {
    console.error('[Migrate] Migratsiyada xatolik yuz berdi:', baselineError.message);
    process.exit(1);
  }
}
