import { Router } from 'express';
import { prisma } from '../prisma.js';
import { sendSuccess } from '../utils/response.js';
import { authenticate, authenticateStream, AuthRequest } from '../middleware/auth.js';
import { realtime } from '../services/realtime.js';

const router = Router();

// Real-time Server-Sent Events (SSE) oqimi (One-time Ticket yoki Bearer token orqali)
router.get('/stream', authenticateStream, (req: AuthRequest, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const userId = req.user!.userId;
  realtime.addClient(userId, res);
});

// Foydalanuvchining bildirishnomalari
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: req.user!.userId, isRead: false },
    });

    return sendSuccess(res, { notifications, unreadCount }, 'Bildirishnomalar');
  } catch (error) {
    next(error);
  }
});

// Barcha bildirishnomalarni o'qilgan deb belgilash
router.patch('/read-all', authenticate, async (req: AuthRequest, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.userId, isRead: false },
      data: { isRead: true },
    });

    realtime.sendToUser(req.user!.userId, 'NOTIFICATIONS_READ_ALL', {});

    return sendSuccess(res, { success: true }, 'Barcha bildirishnomalar o‘qildi');
  } catch (error) {
    next(error);
  }
});

// Bildirishnomani o'qilgan deb belgilash
router.patch('/:id/read', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.update({
      where: { id, userId: req.user!.userId },
      data: { isRead: true },
    });

    realtime.sendToUser(req.user!.userId, 'NOTIFICATION_READ', { id });

    return sendSuccess(res, notification, 'O‘qilgan deb belgilandi');
  } catch (error) {
    next(error);
  }
});

export default router;
