import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { logActivity } from '../middleware/audit.js';
import { realtime } from '../services/realtime.js';

const router = Router();

// Topshiriqlar ro'yxati
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { documentId, status, assignedToId } = req.query;

    const where: any = {};

    // Oddiy xodim yoki shaxsiy topshiriqlarini so'raganlar faqat o'ziga tegishlisini ko'radi
    if (req.user!.role === 'STAFF' || req.query.myTasks === 'true') {
      where.OR = [
        { assignedToId: req.user!.userId },
        { createdById: req.user!.userId },
      ];
    } else if (req.user!.role === 'DEPARTMENT_HEAD' && !req.query.all) {
      where.OR = [
        { assignedToId: req.user!.userId },
        { createdById: req.user!.userId },
        ...(req.user!.departmentId ? [{ assignedTo: { departmentId: req.user!.departmentId } }] : []),
      ];
    }

    if (documentId) where.documentId = documentId as string;
    if (status) where.status = status as any;
    if (assignedToId) where.assignedToId = assignedToId as string;

    const tasks = await prisma.task.findMany({
      where,
      include: {
        document: { select: { id: true, regNumber: true, title: true } },
        assignedTo: { select: { id: true, fullName: true, position: true } },
        createdBy: { select: { id: true, fullName: true } },
      },
      orderBy: { deadline: 'asc' },
    });

    return sendSuccess(res, tasks, 'Topshiriqlar ro‘yxati');
  } catch (error) {
    next(error);
  }
});

// Yangi topshiriq yaratish
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      documentId: z.string().uuid('Hujjat ID talab qilinadi'),
      title: z.string().min(2, 'Topshiriq sarlavhasi talab qilinadi'),
      description: z.string().optional(),
      assignedToId: z.string().uuid('Mas’ul xodim tanlanishi shart'),
      deadline: z.string().optional().nullable(),
    });

    const data = schema.parse(req.body);

    const task = await prisma.task.create({
      data: {
        documentId: data.documentId,
        title: data.title,
        description: data.description,
        assignedToId: data.assignedToId,
        createdById: req.user!.userId,
        deadline: data.deadline ? new Date(data.deadline) : null,
        status: 'PENDING',
      },
      include: {
        assignedTo: { select: { id: true, fullName: true } },
        document: { select: { id: true, regNumber: true } },
      },
    });

    // Mas'ul xodimga notifikatsiya yaratish
    await prisma.notification.create({
      data: {
        userId: data.assignedToId,
        title: 'Yangi topshiriq biriktirildi',
        message: `${task.document.regNumber} hujjati bo‘yicha topshiriq: "${task.title}"`,
        link: `/tasks`,
      },
    });

    realtime.sendToUser(data.assignedToId, 'NOTIFICATION', {
      title: 'Yangi topshiriq biriktirildi',
      message: `${task.document.regNumber} hujjati bo‘yicha topshiriq: "${task.title}"`,
      link: `/tasks`,
    });
    realtime.sendToUser(data.assignedToId, 'COUNTS_UPDATE', {});

    await logActivity({
      userId: req.user!.userId,
      action: 'CREATE_TASK',
      entity: 'TASK',
      entityId: task.id,
      details: `Topshiriq yaratildi: ${task.title} (Ijrochi: ${task.assignedTo.fullName})`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return sendSuccess(res, task, 'Topshiriq muvaffaqiyatli yaratildi', 201);
  } catch (error) {
    next(error);
  }
});

// Topshiriq holatini yangilash
router.patch('/:id/status', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const schema = z.object({
      status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'CANCELLED']),
    });

    const { status } = schema.parse(req.body);

    const task = await prisma.task.update({
      where: { id },
      data: {
        status,
        completedAt: status === 'COMPLETED' ? new Date() : null,
      },
    });

    return sendSuccess(res, task, 'Topshiriq holati yangilandi');
  } catch (error) {
    next(error);
  }
});

// Topshiriq natijasini topshirish (javob qaytarish)
router.post('/:id/submit-result', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const schema = z.object({
      resultComment: z.string().min(1, 'Natija izohi talab qilinadi'),
      resultFileUrl: z.string().optional(),
    });

    const { resultComment, resultFileUrl } = schema.parse(req.body);

    const task = await prisma.task.update({
      where: { id },
      data: {
        resultComment,
        resultFileUrl,
        status: 'COMPLETED',
        completedAt: new Date(),
      },
      include: {
        document: { select: { id: true, regNumber: true } },
      },
    });

    if (task.createdById && task.createdById !== req.user!.userId) {
      await prisma.notification.create({
        data: {
          userId: task.createdById,
          title: 'Topshiriq bajarildi',
          message: `"${task.title}" topshirig‘i bajarildi. Izoh: ${resultComment}`,
          link: `/tasks`,
        },
      });
      realtime.sendToUser(task.createdById, 'NOTIFICATION', {
        title: 'Topshiriq bajarildi',
        message: `"${task.title}" topshirig‘i bajarildi. Izoh: ${resultComment}`,
        link: `/tasks`,
      });
      realtime.sendToUser(task.createdById, 'COUNTS_UPDATE', {});
    }
    realtime.sendToUser(req.user!.userId, 'COUNTS_UPDATE', {});

    await logActivity({
      userId: req.user!.userId,
      action: 'COMPLETE_TASK',
      entity: 'TASK',
      entityId: task.id,
      details: `Topshiriq yakunlandi: ${task.title}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return sendSuccess(res, task, 'Topshiriq natijasi qabul qilindi');
  } catch (error) {
    next(error);
  }
});

export default router;
