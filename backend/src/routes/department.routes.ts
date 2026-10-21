import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';
import { logActivity } from '../middleware/audit.js';

const router = Router();

// Barcha bo'limlar ro'yxati (barcha tizimga kirganlar uchun ochiq)
router.get('/', authenticate, async (req, res, next) => {
  try {
    const departments = await prisma.department.findMany({
      include: {
        _count: {
          select: { users: true, documents: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return sendSuccess(res, departments, 'Bo‘limlar ro‘yxati');
  } catch (error) {
    next(error);
  }
});

// Yangi bo'lim yaratish (faqat Super Admin)
router.post('/', authenticate, authorize(['SUPER_ADMIN']), async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(2, 'Bo‘lim nomi talab qilinadi'),
      code: z.string().min(2, 'Bo‘lim kodi talab qilinadi'),
      type: z.string().default('DEPARTMENT'),
    });

    const data = schema.parse(req.body);

    const existing = await prisma.department.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      return sendError(res, 'Bunday kodli bo‘lim allaqachon mavjud', 400);
    }

    const department = await prisma.department.create({ data });

    await logActivity({
      userId: req.user!.userId,
      action: 'CREATE_DEPARTMENT',
      entity: 'DEPARTMENT',
      entityId: department.id,
      details: `Yangi bo‘lim yaratildi: ${department.name} (${department.code})`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return sendSuccess(res, department, 'Bo‘lim muvaffaqiyatli yaratildi', 201);
  } catch (error) {
    next(error);
  }
});

// Bo'limni tahrirlash (faqat Super Admin)
router.put('/:id', authenticate, authorize(['SUPER_ADMIN']), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const schema = z.object({
      name: z.string().min(2).optional(),
      code: z.string().min(2).optional(),
      type: z.string().optional(),
    });

    const data = schema.parse(req.body);

    const department = await prisma.department.update({
      where: { id },
      data,
    });

    await logActivity({
      userId: req.user!.userId,
      action: 'UPDATE_DEPARTMENT',
      entity: 'DEPARTMENT',
      entityId: department.id,
      details: `Bo‘lim tahrirlandi: ${department.name}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return sendSuccess(res, department, 'Bo‘lim ma’lumotlari yangilandi');
  } catch (error) {
    next(error);
  }
});

export default router;
