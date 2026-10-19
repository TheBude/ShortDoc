import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { logActivity } from '../middleware/audit.js';

const router = Router();

// Hujjatlar ro'yxati (filtrlash, qidiruv, sahifalash)
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const {
      search,
      documentType,
      status,
      priority,
      departmentId,
      assigneeId,
      isArchived,
      page = '1',
      limit = '10',
    } = req.query;

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    // Foydalanuvchi roli bo'yicha cheklov (Oddiy xodim faqat o'ziga tegishli yoki o'zi yaratgan hujjatlarni ko'radi)
    if (req.user!.role === 'STAFF') {
      where.OR = [
        { creatorId: req.user!.userId },
        { assigneeId: req.user!.userId },
        { approvals: { some: { approverId: req.user!.userId } } },
        { tasks: { some: { assignedToId: req.user!.userId } } },
      ];
    } else if (req.user!.role === 'DEPARTMENT_HEAD' && req.user!.departmentId) {
      where.OR = [
        { departmentId: req.user!.departmentId },
        { creatorId: req.user!.userId },
        { assigneeId: req.user!.userId },
        { approvals: { some: { approverId: req.user!.userId } } },
      ];
    }

    if (search) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { regNumber: { contains: search as string, mode: 'insensitive' } },
            { title: { contains: search as string, mode: 'insensitive' } },
            { summary: { contains: search as string, mode: 'insensitive' } },
            { sender: { contains: search as string, mode: 'insensitive' } },
            { receiver: { contains: search as string, mode: 'insensitive' } },
          ],
        },
      ];
    }

    if (documentType) where.documentType = documentType as any;
    if (status) where.status = status as any;
    if (priority) where.priority = priority as any;
    if (departmentId) where.departmentId = departmentId as string;
    if (assigneeId) where.assigneeId = assigneeId as string;
    if (isArchived !== undefined) where.isArchived = isArchived === 'true';

    const [total, documents] = await Promise.all([
      prisma.document.count({ where }),
      prisma.document.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          department: { select: { id: true, name: true, code: true } },
          creator: { select: { id: true, fullName: true, position: true } },
          assignee: { select: { id: true, fullName: true, position: true } },
          _count: {
            select: { files: true, tasks: true, comments: true, approvals: true },
          },
        },
      }),
    ]);

    return sendSuccess(res, documents, 'Hujjatlar ro‘yxati', 200, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
});

// Hujjat tafsilotlari
router.get('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        department: true,
        creator: { select: { id: true, fullName: true, position: true, email: true } },
        assignee: { select: { id: true, fullName: true, position: true, email: true } },
        files: {
          include: { uploadedBy: { select: { id: true, fullName: true } } },
        },
        approvals: {
          include: { approver: { select: { id: true, fullName: true, position: true } } },
          orderBy: { stepOrder: 'asc' },
        },
        tasks: {
          include: {
            assignedTo: { select: { id: true, fullName: true, position: true } },
            createdBy: { select: { id: true, fullName: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        comments: {
          include: { user: { select: { id: true, fullName: true, position: true } } },
          orderBy: { createdAt: 'asc' },
        },
        statusHistory: {
          include: { changedBy: { select: { id: true, fullName: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!document) {
      return sendError(res, 'Hujjat topilmadi', 404);
    }

    return sendSuccess(res, document, 'Hujjat ma’lumotlari');
  } catch (error) {
    next(error);
  }
});

// Yangi hujjat ro'yxatdan o'tkazish / yaratish
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      title: z.string().min(3, 'Hujjat nomi talab qilinadi'),
      documentType: z.enum(['INCOMING', 'OUTGOING', 'INTERNAL']),
      category: z.string().default('Bildirgi'),
      sender: z.string().optional(),
      receiver: z.string().optional(),
      departmentId: z.string().optional().nullable(),
      assigneeId: z.string().optional().nullable(),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
      deadline: z.string().optional().nullable(),
      summary: z.string().optional(),
      approverIds: z.array(z.string()).optional(), // Viza zanjiri (kelishuvchilar)
    });

    const data = schema.parse(req.body);

    // Noyob ro'yxat raqami generatsiyasi (masalan: 2026/KIR-0012 yoki 2026/ICH-0045)
    const year = new Date().getFullYear();
    const typePrefix = data.documentType === 'INCOMING' ? 'KIR' : data.documentType === 'OUTGOING' ? 'CHIQ' : 'ICH';
    const countThisYear = await prisma.document.count({
      where: {
        documentType: data.documentType,
        createdAt: {
          gte: new Date(`${year}-01-01`),
        },
      },
    });

    const nextNumber = (countThisYear + 1).toString().padStart(4, '0');
    const regNumber = `${year}/${typePrefix}-${nextNumber}`;

    const document = await prisma.$transaction(async (tx) => {
      const doc = await tx.document.create({
        data: {
          regNumber,
          title: data.title,
          documentType: data.documentType,
          category: data.category,
          sender: data.sender,
          receiver: data.receiver,
          departmentId: data.departmentId || req.user!.departmentId || null,
          assigneeId: data.assigneeId || null,
          creatorId: req.user!.userId,
          priority: data.priority,
          deadline: data.deadline ? new Date(data.deadline) : null,
          summary: data.summary,
          status: 'REGISTERED',
        },
      });

      // Boshlang'ich holat tarixini saqlash
      await tx.documentStatusHistory.create({
        data: {
          documentId: doc.id,
          changedById: req.user!.userId,
          oldStatus: 'NEW',
          newStatus: 'REGISTERED',
          reason: 'Hujjat tizimda ro‘yxatga olindi',
        },
      });

      // Agar kelishuvchilar (viza zanjiri) tanlangan bo'lsa
      if (data.approverIds && data.approverIds.length > 0) {
        for (let i = 0; i < data.approverIds.length; i++) {
          await tx.documentApproval.create({
            data: {
              documentId: doc.id,
              approverId: data.approverIds[i],
              stepOrder: i + 1,
              status: 'PENDING',
            },
          });
        }
      }

      return doc;
    });

    await logActivity({
      userId: req.user!.userId,
      action: 'CREATE_DOCUMENT',
      entity: 'DOCUMENT',
      entityId: document.id,
      details: `Yangi hujjat yaratildi: ${document.regNumber} - ${document.title}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return sendSuccess(res, document, 'Hujjat muvaffaqiyatli ro‘yxatga olindi', 201);
  } catch (error) {
    next(error);
  }
});

// Hujjat holatini o'zgartirish (Status transition)
router.patch('/:id/status', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const schema = z.object({
      status: z.enum([
        'NEW',
        'REGISTERED',
        'IN_REVIEW',
        'IN_APPROVAL',
        'IN_EXECUTION',
        'COMPLETED',
        'REJECTED',
        'ARCHIVED',
      ]),
      reason: z.string().optional(),
    });

    const { status, reason } = schema.parse(req.body);

    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) {
      return sendError(res, 'Hujjat topilmadi', 404);
    }

    const updatedDoc = await prisma.$transaction(async (tx) => {
      const updated = await tx.document.update({
        where: { id },
        data: {
          status,
          isArchived: status === 'ARCHIVED' ? true : doc.isArchived,
        },
      });

      await tx.documentStatusHistory.create({
        data: {
          documentId: id,
          changedById: req.user!.userId,
          oldStatus: doc.status,
          newStatus: status,
          reason: reason || `Holat ${status} ga o‘zgartirildi`,
        },
      });

      return updated;
    });

    await logActivity({
      userId: req.user!.userId,
      action: 'CHANGE_STATUS',
      entity: 'DOCUMENT',
      entityId: doc.id,
      details: `${doc.regNumber} holati ${doc.status} dan ${status} ga o‘zgardi`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return sendSuccess(res, updatedDoc, 'Hujjat holati muvaffaqiyatli yangilandi');
  } catch (error) {
    next(error);
  }
});

// Viza (Kelishuv) qarorini qabul qilish
router.post('/:id/approvals', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const schema = z.object({
      status: z.enum(['APPROVED', 'REJECTED']),
      comments: z.string().optional(),
    });

    const { status, comments } = schema.parse(req.body);

    const approval = await prisma.documentApproval.findFirst({
      where: {
        documentId: id,
        approverId: req.user!.userId,
      },
    });

    if (!approval) {
      return sendError(res, 'Siz ushbu hujjatning kelishuvchilar ro‘yxatida emassiz', 403);
    }

    const updatedApproval = await prisma.documentApproval.update({
      where: { id: approval.id },
      data: {
        status,
        comments,
        signedAt: new Date(),
      },
    });

    // Barcha vizalar tasdiqlanganini tekshirish
    const pendingCount = await prisma.documentApproval.count({
      where: {
        documentId: id,
        status: 'PENDING',
      },
    });

    if (pendingCount === 0 && status === 'APPROVED') {
      await prisma.document.update({
        where: { id },
        data: { status: 'IN_EXECUTION' },
      });
    } else if (status === 'REJECTED') {
      await prisma.document.update({
        where: { id },
        data: { status: 'REJECTED' },
      });
    }

    await logActivity({
      userId: req.user!.userId,
      action: 'DOCUMENT_APPROVAL',
      entity: 'DOCUMENT',
      entityId: id,
      details: `Viza berildi: ${status} (${comments || 'Izohsiz'})`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return sendSuccess(res, updatedApproval, 'Kelishuv muvaffaqiyatli qayd etildi');
  } catch (error) {
    next(error);
  }
});

// Hujjatga izoh qo'shish
router.post('/:id/comments', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const schema = z.object({
      comment: z.string().min(1, 'Izoh matni talab qilinadi'),
    });

    const { comment } = schema.parse(req.body);

    const newComment = await prisma.documentComment.create({
      data: {
        documentId: id,
        userId: req.user!.userId,
        comment,
      },
      include: {
        user: { select: { id: true, fullName: true, position: true } },
      },
    });

    return sendSuccess(res, newComment, 'Izoh qo‘shildi', 201);
  } catch (error) {
    next(error);
  }
});

export default router;
