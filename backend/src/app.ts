import './config.js';
import { config } from './config.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import swaggerUi from 'swagger-ui-express';
import crypto from 'crypto';

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

export const app = express();

// Reverse proxy (Nginx, Render, Docker) ortida IP larni to'g'ri olish uchun
app.set('trust proxy', 1);

// Har bir so'rovga noyob RequestId berish va X-Request-Id sarlavhasini o'rnatish
app.use((req, res, next) => {
  const incomingId = req.headers['x-request-id'];
  const reqId = typeof incomingId === 'string' && incomingId.trim() ? incomingId.trim() : crypto.randomUUID();
  (req as any).id = reqId;
  res.setHeader('X-Request-Id', reqId);
  next();
});

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
      // Server-to-server so'rovlar, mobile ilovalar yoki Vercel / Render domenlari uchun avtomatik ruxsat
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        allowedOrigins.includes('*') ||
        origin.endsWith('.vercel.app') ||
        origin.endsWith('.onrender.com') ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1')
      ) {
        callback(null, true);
      } else {
        const corsErr = new Error(`CORS xatoligi: '${origin}' manzili uchun kirish taqiqlangan`);
        (corsErr as any).statusCode = 403;
        callback(corsErr);
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

export default app;
