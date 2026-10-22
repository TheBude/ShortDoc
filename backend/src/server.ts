import './config.js';
import { config } from './config.js';
import { app } from './app.js';
import { prisma } from './prisma.js';
import { realtime } from './services/realtime.js';
import { startCronJobs, stopCronJobs } from './services/cron.service.js';

const PORT = Number(process.env.PORT) || config.PORT || 10000;
const HOST = '0.0.0.0';

export const server = app.listen(PORT, HOST, () => {
  console.log('=========================================');
  console.log('[ShortDoc API] Server muvaffaqiyatli ishga tushdi.');
  console.log(`[ShortDoc API] Muhit: ${config.NODE_ENV}`);
  console.log(`[ShortDoc API] Tinglanayotgan manzil: http://${HOST}:${PORT}`);
  console.log(`[ShortDoc API] Swagger Docs: http://${HOST}:${PORT}/api/docs`);
  console.log('=========================================');

  startCronJobs();
});

let isShuttingDown = false;

// Graceful shutdown
export const gracefulShutdown = async (signal: string) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n[ShortDoc] ${signal} qabul qilindi. Server xavfsiz to‘xtatilmoqda...`);

  // 1. Yangi cron vazifalarni to'xtatish
  try {
    stopCronJobs();
    console.log('[ShortDoc] Cron rejalashtiruvchi to‘xtatildi.');
  } catch (err) {
    console.error('[ShortDoc] Cron to‘xtatishda xatolik:', err);
  }

  // 2. Barcha faol SSE ulanishlarini xabardor qilib yopish
  try {
    realtime.closeAll();
    console.log('[ShortDoc] SSE ulanishlari yopildi.');
  } catch (err) {
    console.error('[ShortDoc] SSE ulanishlarini yopishda xatolik:', err);
  }

  // 3. HTTP serverni yangi so'rovlar qabul qilishdan to'xtatish
  server.close(async () => {
    console.log('[ShortDoc] HTTP server yopildi.');

    // 4. Prisma ma'lumotlar bazasi ulanishini uzish
    try {
      await prisma.$disconnect();
      console.log('[ShortDoc] Ma‘lumotlar bazasi aloqasi muvaffaqiyatli uzildi.');
    } catch (err) {
      console.error('[ShortDoc] Prisma uzilishida xatolik:', err);
    }

    console.log('[ShortDoc] Barcha resurslar tozalandi. Xavfsiz chiqildi.');
    process.exit(0);
  });

  // Agar 10 soniyada ulanishlar yopilmasa, majburiy to'xtatish
  setTimeout(() => {
    console.error('[ShortDoc] Serverni yopish muddati tugadi (timeout), majburiy to‘xtatilmoqda.');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  console.error('❌ [ShortDoc Server Uncaught Exception]:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ [ShortDoc Server Unhandled Rejection]:', reason);
});

export default server;
