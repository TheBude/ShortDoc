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
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'ShortDoc API', timestamp: new Date().toISOString() });
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

// Xatoliklarni boshqarish
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`🚀 ShortDoc Backend API muvaffaqiyatli ishga tushdi!`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`📚 Swagger Docs: http://localhost:${PORT}/api/docs`);
  console.log(`=========================================`);
});

export default app;
