import { Router } from 'express';
import { prisma } from '../prisma.js';
import { sendSuccess } from '../utils/response.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// Tizim faoliyat jurnali (faqat Super Admin va Rahbariyat ko'rishi mumkin)
router.get('/', authenticate, authorize(['SUPER_ADMIN', 'LEADERSHIP']), async (req, res, next) => {
  try {
    const { action, entity, page = '1', limit = '20' } = req.query;

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (action) where.action = action as string;
    if (entity) where.entity = entity as string;

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, fullName: true, email: true, role: true },
          },
        },
      }),
    ]);

    return sendSuccess(res, logs, 'Audit jurnali', 200, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
