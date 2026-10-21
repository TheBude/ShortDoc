import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';

import { swaggerDocument } from './swagger.js';
import { errorHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import departmentRoutes from './routes/department.routes.js';
import documentRoutes from './routes/document.routes.js';
import taskRoutes from './routes/task.routes.js';
import fileRoutes from './routes/file.routes.js';
import reportRoutes from './routes/report.routes.js';
import auditRoutes from './routes/audit.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import { prisma } from './prisma.js';
import { runSeed } from './seed.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Xavfsizlik va yordamchi middlewarelar
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Swagger / OpenAPI hujjatlari
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Tizim holati tekshiruvi (Healthcheck)
app.get(['/health', '/api/health'], (req, res) => {
  res.json({
    status: 'ok',
    service: 'ShortDoc University API',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Asosiy sahifa (Bude Delivery kabi frontend ilovaga avtomatik yo‘naltiradi)
app.get('/', (req, res) => {
  const frontendUrl = process.env.APP_URL || process.env.CORS_ORIGIN;
  if (frontendUrl && frontendUrl !== '*' && !frontendUrl.includes('localhost')) {
    return res.redirect(frontendUrl);
  }
  res.json({
    service: 'SamDU ShortDoc University API',
    status: 'running',
    docs: '/api/docs',
    health: '/health',
  });
});

// REST API yo'nalishlari
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/document-files', fileRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/notifications', notificationRoutes);

// Boshlang'ich ma'lumotlarni browser orqali ham seed qilish imkoniyati (Render Free tier uchun)
app.get('/api/seed', async (req, res) => {
  try {
    console.log('[Seed] HTTP orqali boshlang‘ich ma’lumotlarni kiritish so‘rovi qabul qilindi.');
    await runSeed();
    res.json({
      success: true,
      message: 'SamDU boshlang‘ich ma’lumotlari (seed) muvaffaqiyatli bazaga yozildi.',
      users: [
        { role: 'SUPER_ADMIN', email: 'admin@shortdoc.uz', pass: 'Admin123!' },
        { role: 'LEADERSHIP', email: 'rektor@shortdoc.uz', pass: 'Rektor123!' },
        { role: 'CHANCELLERY', email: 'devonxona@shortdoc.uz', pass: 'Devon123!' },
        { role: 'DEPARTMENT_HEAD', email: 'dekan@shortdoc.uz', pass: 'Dekan123!' },
        { role: 'STAFF', email: 'xodim@shortdoc.uz', pass: 'Xodim123!' }
      ]
    });
  } catch (err: any) {
    console.error('[Seed Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Xatoliklarni boshqarish
app.use(errorHandler);

const server = app.listen(PORT, async () => {
  console.log(`=========================================`);
  console.log(`[ShortDoc API] Server muvaffaqiyatli ishga tushdi.`);
  console.log(`[ShortDoc API] URL: http://localhost:${PORT}`);
  console.log(`[ShortDoc API] Swagger Docs: http://localhost:${PORT}/api/docs`);
  console.log(`=========================================`);

  // Baza bo'sh bo'lsa avtomatik seed qilish
  try {
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      console.log('[ShortDoc DB] Baza bo‘sh ekanligi aniqlandi. Boshlang‘ich foydalanuvchilar yuklanmoqda...');
      await runSeed();
      console.log('[ShortDoc DB] Boshlang‘ich ma’lumotlar yuklandi.');
    }
  } catch (err) {
    console.warn('[ShortDoc DB Warning] Auto-seed tekshiruvida ogohlantirish:', err);
  }
});

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  console.log(`\n[ShortDoc] ${signal} qabul qilindi. Server xavfsiz to‘xtatilmoqda...`);
  server.close(() => {
    console.log('[ShortDoc] Barcha ulanishlar yopildi.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;
