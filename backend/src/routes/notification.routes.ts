import { Router } from 'express';
import { prisma } from '../prisma.js';
import { sendSuccess } from '../utils/response.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Foydalanuvchining bildirishnomalari
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: req.user!.userId, isRead: false },
    });

    return sendSuccess(res, { notifications, unreadCount }, 'Bildirishnomalar');
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

    return sendSuccess(res, notification, 'O‘qilgan deb belgilandi');
  } catch (error) {
    next(error);
  }
});

export default router;
