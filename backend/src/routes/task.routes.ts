import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { logActivity } from '../middleware/audit.js';
import { realtime } from '../services/realtime.js';
import { canCreateTask, canManageTask } from '../services/access.js';
import { optionalDate } from '../utils/validation.js';

const router = Router();

/**
 * Hujjatdagi barcha (bekor qilinmagan) topshiriqlar bajarilgan bo'lsa, IN_EXECUTION holatidagi hujjatni COMPLETED qiladi.
 * Bekor qilingan topshiriqlar hisobga olinmaydi, aks holda ular hujjat yakunlanishini abadiy to'sib qo'yardi.
 */
async function completeDocumentIfAllTasksDone(documentId: string, actorId: string) {
  const tasks = await prisma.task.findMany({
    where: { documentId, status: { not: 'CANCELLED' } },
    select: { status: true },
  });

  if (tasks.length === 0 || !tasks.every((t) => t.status === 'COMPLETED')) return;

  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: { id: true, status: true, creatorId: true, regNumber: true },
  });

  if (!doc || doc.status !== 'IN_EXECUTION') return;

  const title = 'Hujjat ijrosi to‘liq yakunlandi';
  const message = `${doc.regNumber} hujjati bo‘yicha barcha topshiriqlar bajarildi.`;
  const link = `/documents/${documentId}`;
  const notifyCreator = !!doc.creatorId && doc.creatorId !== actorId;

  const completed = await prisma.$transaction(async (tx) => {
    const changed = await tx.document.updateMany({
      where: { id: documentId, status: 'IN_EXECUTION' },
      data: { status: 'COMPLETED' },
    });
    if (changed.count === 0) return false;

    await tx.documentStatusHistory.create({
      data: {
        documentId,
        changedById: actorId,
        oldStatus: 'IN_EXECUTION',
        newStatus: 'COMPLETED',
        reason: 'Barcha ijro topshiriqlari muvaffaqiyatli yakunlandi',
      },
    });

    if (notifyCreator) {
      await tx.notification.create({ data: { userId: doc.creatorId, title, message, link } });
    }

    return true;
  });

  if (completed && notifyCreator) {
    realtime.sendToUser(doc.creatorId, 'NOTIFICATION', { title, message, link });
    realtime.sendToUser(doc.creatorId, 'COUNTS_UPDATE', {});
  }
}

const listTasksQuerySchema = z.object({
  documentId: z.string().uuid('Noto‘g‘ri hujjat identifikatori').optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'CANCELLED']).optional(),
  assignedToId: z.string().uuid('Noto‘g‘ri mas’ul xodim identifikatori').optional(),
  myTasks: z.string().optional(),
  all: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Topshiriqlar ro'yxati (filtrlash va sahifalash bilan)
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const query = listTasksQuerySchema.parse(req.query);
    const { documentId, status, assignedToId, myTasks, all, page, limit } = query;

    const where: any = {};

    // Oddiy xodim yoki shaxsiy topshiriqlarini so'raganlar faqat o'ziga tegishlisini ko'radi
    if (req.user!.role === 'STAFF' || myTasks === 'true') {
      where.OR = [
        { assignedToId: req.user!.userId },
        { createdById: req.user!.userId },
      ];
    } else if (req.user!.role === 'DEPARTMENT_HEAD' && !all) {
      where.OR = [
        { assignedToId: req.user!.userId },
        { createdById: req.user!.userId },
        ...(req.user!.departmentId ? [{ assignedTo: { departmentId: req.user!.departmentId } }] : []),
      ];
    }

    if (documentId) where.documentId = documentId;
    if (status) where.status = status;
    if (assignedToId) where.assignedToId = assignedToId;

    const skip = (page - 1) * limit;

    const [total, tasks] = await Promise.all([
      prisma.task.count({ where }),
      prisma.task.findMany({
        where,
        include: {
          document: { select: { id: true, regNumber: true, title: true } },
          assignedTo: { select: { id: true, fullName: true, position: true } },
          createdBy: { select: { id: true, fullName: true } },
        },
        orderBy: { deadline: 'asc' },
        skip,
        take: limit,
      }),
    ]);

    return sendSuccess(res, tasks, 'Topshiriqlar ro‘yxati', 200, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
});

// Yangi topshiriq yaratish (Hujjatga kirish huquqi va faol foydalanuvchi tekshiruvi bilan)
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      documentId: z.string().uuid('Hujjat ID talab qilinadi (UUID)'),
      title: z.string().min(2, 'Topshiriq sarlavhasi talab qilinadi'),
      description: z.string().optional(),
      assignedToId: z.string().uuid('Mas’ul xodim tanlanishi shart (UUID)'),
      deadline: optionalDate,
    });

    const data = schema.parse(req.body);

    // 1. Hujjat mavjudligi va unga topshiriq biriktirish ruxsatini tekshirish
    const doc = await prisma.document.findUnique({
      where: { id: data.documentId },
      include: { approvals: true, tasks: true },
    });

    if (!doc) {
      return sendError(res, 'Hujjat topilmadi', 404);
    }

    if (!canCreateTask(req.user!, doc)) {
      return sendError(res, 'Ushbu hujjat bo‘yicha topshiriq yaratish huquqiga ega emassiz', 403);
    }

    // 2. Biriktirilayotgan xodim mavjud va faol ekanligini tekshirish
    const assignedUser = await prisma.user.findUnique({
      where: { id: data.assignedToId },
      select: { id: true, fullName: true, isActive: true },
    });

    if (!assignedUser || !assignedUser.isActive) {
      return sendError(res, 'Topshiriq biriktirilayotgan xodim tizimda topilmadi yoki faol emas', 400);
    }

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
      requestId: (req as any).id,
    });

    return sendSuccess(res, task, 'Topshiriq muvaffaqiyatli yaratildi', 201);
  } catch (error) {
    next(error);
  }
});

// Topshiriq holatini yangilash (Ruxsat va barcha topshiriqlar yakunlanganda hujjatni COMPLETED qilish bilan)
router.patch('/:id/status', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const uuidCheck = z.string().uuid('Noto‘g‘ri topshiriq identifikatori').safeParse(id);
    if (!uuidCheck.success) {
      return sendError(res, 'Noto‘g‘ri topshiriq identifikatori (UUID)', 400);
    }

    const schema = z.object({
      status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'CANCELLED']),
    });

    const { status } = schema.parse(req.body);

    const existingTask = await prisma.task.findUnique({
      where: { id },
      include: { document: true },
    });

    if (!existingTask) {
      return sendError(res, 'Topshiriq topilmadi', 404);
    }

    if (!canManageTask(req.user!, existingTask, false)) {
      return sendError(res, 'Ushbu topshiriq holatini o‘zgartirish huquqiga ega emassiz', 403);
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        status,
        completedAt: status === 'COMPLETED' ? new Date() : null,
      },
    });

    if (status === 'COMPLETED') {
      await completeDocumentIfAllTasksDone(existingTask.documentId, req.user!.userId);
    }

    await logActivity({
      userId: req.user!.userId,
      action: 'UPDATE_TASK_STATUS',
      entity: 'TASK',
      entityId: task.id,
      details: `Topshiriq holati ${existingTask.status} dan ${status} ga o‘zgartirildi`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      requestId: (req as any).id,
    });

    return sendSuccess(res, task, 'Topshiriq holati yangilandi');
  } catch (error) {
    next(error);
  }
});

// Topshiriq natijasini topshirish (faqat ijrochi uchun)
router.post('/:id/submit-result', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const uuidCheck = z.string().uuid('Noto‘g‘ri topshiriq identifikatori').safeParse(id);
    if (!uuidCheck.success) {
      return sendError(res, 'Noto‘g‘ri topshiriq identifikatori (UUID)', 400);
    }

    const schema = z.object({
      resultComment: z.string().min(1, 'Natija izohi talab qilinadi'),
      resultFileUrl: z.string().optional(),
    });

    const { resultComment, resultFileUrl } = schema.parse(req.body);

    const existingTask = await prisma.task.findUnique({
      where: { id },
      include: { document: true },
    });

    if (!existingTask) {
      return sendError(res, 'Topshiriq topilmadi', 404);
    }

    // Faqat biriktirilgan ijrochi natija topshira oladi
    if (!canManageTask(req.user!, existingTask, true)) {
      return sendError(res, 'Topshiriq natijasini faqat tayinlangan mas’ul ijrochi topshirishi mumkin', 403);
    }

    if (existingTask.status === 'CANCELLED') {
      return sendError(res, 'Bekor qilingan topshiriq bo‘yicha natija topshirib bo‘lmaydi', 409);
    }

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

    await completeDocumentIfAllTasksDone(existingTask.documentId, req.user!.userId);

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
      details: `Topshiriq yakunlandi: ${task.title}. Natija izohi: ${resultComment}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      requestId: (req as any).id,
    });

    return sendSuccess(res, task, 'Topshiriq natijasi qabul qilindi');
  } catch (error) {
    next(error);
  }
});

export default router;
