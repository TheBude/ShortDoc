import './config.js';
import { config } from './config.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import swaggerUi from 'swagger-ui-express';

import { swaggerDocument } from './swagger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { globalLimiter } from './middleware/rateLimit.js';

import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import departmentRoutes from './routes/department.routes.js';
import documentRoutes from './routes/document.routes.js';
import taskRoutes from './routes/task.routes.js';
import fileRoutes from './routes/file.routes.js';
import reportRoutes from './routes/report.routes.js';
import auditRoutes from './routes/audit.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import { startCronJobs, stopCronJobs } from './services/cron.service.js';

const app = express();
const PORT = config.PORT;

// Reverse proxy (Nginx, Render, Docker) ortida IP larni to'g'ri olish uchun
app.set('trust proxy', 1);

// Global xavfsizlik: Helmet orqali qat'iy Content Security Policy (CSP)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// CORS sozlamasi: CORS_ORIGIN whitelist bo'yicha ruxsat berish
const allowedOrigins = config.CORS_ORIGIN.split(',').map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Server-to-server so'rovlar yoki mobile ilovalar uchun origin undefined bo'lishi mumkin
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(new Error(`CORS xatoligi: '${origin}' manzili uchun kirish taqiqlangan`));
      }
    },
    credentials: true,
  })
);

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global so'rovlar tezligini cheklovchi (Rate Limiting)
app.use('/api', globalLimiter);

// Swagger / OpenAPI hujjatlari (Swagger UI ishlashi uchun zarur inline resurslar istisnosi bilan)
app.use(
  '/api/docs',
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  }),
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument)
);

// Tizim holati tekshiruvi (Healthcheck)
app.get(['/health', '/api/health'], (req, res) => {
  res.json({
    status: 'ok',
    service: 'ShortDoc University API',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Asosiy sahifa: frontend ilovaga avtomatik yo‘naltiradi
app.get('/', (req, res) => {
  const frontendUrl = config.APP_URL || config.CORS_ORIGIN;
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

// Xatoliklarni markazlashgan boshqarish
app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`[ShortDoc API] Server muvaffaqiyatli ishga tushdi.`);
  console.log(`[ShortDoc API] Muhit: ${config.NODE_ENV}`);
  console.log(`[ShortDoc API] URL: http://localhost:${PORT}`);
  console.log(`[ShortDoc API] Swagger Docs: http://localhost:${PORT}/api/docs`);
  console.log(`=========================================`);

  startCronJobs();
});

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  console.log(`\n[ShortDoc] ${signal} qabul qilindi. Server xavfsiz to‘xtatilmoqda...`);
  stopCronJobs();
  server.close(() => {
    console.log('[ShortDoc] Barcha ulanishlar yopildi.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;
