import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { logActivity } from '../middleware/audit.js';
import { generateDocumentDocx } from '../utils/docxGenerator.js';
import { realtime } from '../services/realtime.js';

const router = Router();

// Hujjatlar ro'yxati (filtrlash, qidiruv, sahifalash)
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const {
      search,
      documentType,
      status,
      priority,
      category,
      pendingMySignature,
      departmentId,
      assigneeId,
      isArchived,
      page = '1',
      limit = '10',
    } = req.query;

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const andConditions: any[] = [];

    // Foydalanuvchi roli bo'yicha cheklov
    if (req.user!.role === 'STAFF') {
      const staffOr: any[] = [
        { creatorId: req.user!.userId },
        { assigneeId: req.user!.userId },
        { approvals: { some: { approverId: req.user!.userId } } },
        { tasks: { some: { assignedToId: req.user!.userId } } },
        // Umumiy universitet buyruqlari, e'lonlar va rasmiy xatlar barcha xodimlar uchun ochiq
        { category: { contains: 'Buyru', mode: 'insensitive' } },
        { category: { contains: 'Qaror', mode: 'insensitive' } },
        { documentType: 'INCOMING' },
        { isArchived: true },
      ];
      if (req.user!.departmentId) {
        staffOr.push({ departmentId: req.user!.departmentId });
      }
      andConditions.push({ OR: staffOr });
    } else if (req.user!.role === 'DEPARTMENT_HEAD') {
      const headOr: any[] = [
        { creatorId: req.user!.userId },
        { assigneeId: req.user!.userId },
        { approvals: { some: { approverId: req.user!.userId } } },
        { category: { contains: 'Buyru', mode: 'insensitive' } },
        { category: { contains: 'Qaror', mode: 'insensitive' } },
        { documentType: 'INCOMING' },
        { isArchived: true },
      ];
      if (req.user!.departmentId) {
        headOr.push({ departmentId: req.user!.departmentId });
      }
      andConditions.push({ OR: headOr });
    }

    if (search) {
      andConditions.push({
        OR: [
          { regNumber: { contains: search as string, mode: 'insensitive' } },
          { title: { contains: search as string, mode: 'insensitive' } },
          { summary: { contains: search as string, mode: 'insensitive' } },
          { sender: { contains: search as string, mode: 'insensitive' } },
          { receiver: { contains: search as string, mode: 'insensitive' } },
          { category: { contains: search as string, mode: 'insensitive' } },
        ],
      });
    }

    if (documentType) {
      andConditions.push({ documentType: documentType as any });
    }

    if (status) {
      if (status === 'ARCHIVED') {
        andConditions.push({
          OR: [
            { status: 'ARCHIVED' },
            { isArchived: true },
          ],
        });
      } else {
        andConditions.push({ status: status as any });
      }
    }

    if (category) {
      const catLower = (category as string).toLowerCase();
      if (catLower.includes('buyru')) {
        andConditions.push({
          OR: [
            { category: { contains: 'Buyru', mode: 'insensitive' } },
            { category: { contains: 'Qaror', mode: 'insensitive' } },
          ],
        });
      } else if (catLower.includes('murojaat')) {
        andConditions.push({
          OR: [
            { category: { contains: 'Murojaat', mode: 'insensitive' } },
            { category: { contains: 'Ariza', mode: 'insensitive' } },
          ],
        });
      } else {
        andConditions.push({ category: { contains: category as string, mode: 'insensitive' } });
      }
    }

    if (pendingMySignature === 'true') {
      andConditions.push({
        approvals: {
          some: {
            approverId: req.user!.userId,
            status: 'PENDING',
          },
        },
      });
    }

    if (priority) andConditions.push({ priority: priority as any });
    if (departmentId) andConditions.push({ departmentId: departmentId as string });
    if (assigneeId) andConditions.push({ assigneeId: assigneeId as string });
    if (isArchived !== undefined) andConditions.push({ isArchived: isArchived === 'true' });

    const where = andConditions.length > 0 ? { AND: andConditions } : {};

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

// Hujjat haqiqiyligini ommaviy tekshirish (QR-kod orqali autentifikatsiyasiz ochiq ishlaydi)
router.get('/:id/public-verify', async (req, res, next) => {
  try {
    const { id } = req.params;

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        department: true,
        creator: { select: { id: true, fullName: true, position: true } },
        approvals: {
          include: { approver: { select: { fullName: true, position: true } } },
          orderBy: { stepOrder: 'asc' },
        },
      },
    });

    if (!document) {
      return sendError(res, 'Hujjat tizimda topilmadi yoki haqiqiy emas', 404);
    }

    return sendSuccess(
      res,
      {
        id: document.id,
        regNumber: document.regNumber,
        title: document.title,
        category: document.category,
        documentType: document.documentType,
        status: document.status,
        sender: document.sender,
        receiver: document.receiver,
        summary: document.summary,
        createdAt: document.createdAt,
        deadline: document.deadline,
        creator: document.creator,
        department: document.department,
        approvals: document.approvals,
        isAuthentic: true,
        verifiedAt: new Date().toISOString(),
      },
      'Hujjat haqiqiyligi tasdiqlandi'
    );
  } catch (error) {
    next(error);
  }
});

// Hujjatni rasmiy Word (.docx) formatida yuklab olish (SamDU standarti)
router.get('/:id/docx', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        department: true,
        creator: { select: { id: true, fullName: true, position: true } },
        approvals: {
          include: { approver: { select: { fullName: true, position: true } } },
          orderBy: { stepOrder: 'asc' },
        },
      },
    });

    if (!document) {
      return sendError(res, 'Hujjat topilmadi', 404);
    }

    const origin = req.headers.origin as string | undefined;
    let verifyBaseUrl = process.env.APP_URL;
    if (!verifyBaseUrl) {
      if (origin && !origin.includes('localhost')) {
        verifyBaseUrl = origin;
      } else {
        verifyBaseUrl = 'http://172.16.1.4:3000';
      }
    }

    const docxBuffer = await generateDocumentDocx(document, verifyBaseUrl);

    const safeRegNumber = document.regNumber.replace(/[\/\\:*"<>|]/g, '_');
    const filename = `${safeRegNumber}_${document.category || 'bildirishnoma'}.docx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`
    );
    res.setHeader('Content-Length', docxBuffer.length);

    return res.end(docxBuffer);
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

          await tx.notification.create({
            data: {
              userId: data.approverIds[i],
              title: 'Imzolash uchun yangi hujjat',
              message: `${req.user!.fullName || 'Xodim'} sizga imzolash uchun hujjat yubordi: "${doc.title}" (${doc.regNumber})`,
              link: `/documents/${doc.id}`,
            },
          });
        }
      }

      return doc;
    });

    // Real-time bildirishnoma va hisoblagichlarni zudlik bilan approverlarga jo'natish
    if (data.approverIds && data.approverIds.length > 0) {
      for (const approverId of data.approverIds) {
        realtime.sendToUser(approverId, 'APPROVAL_NEEDED', {
          documentId: document.id,
          regNumber: document.regNumber,
          title: document.title,
          creatorName: req.user!.fullName || 'Xodim',
          countDelta: 1,
        });
        realtime.sendToUser(approverId, 'NOTIFICATION', {
          title: 'Imzolash uchun yangi hujjat',
          message: `${req.user!.fullName || 'Xodim'} sizga imzolash uchun hujjat yubordi: "${document.title}" (${document.regNumber})`,
          link: `/documents/${document.id}`,
        });
        realtime.sendToUser(approverId, 'COUNTS_UPDATE', {});
      }
    }

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

    const doc = await prisma.document.findUnique({
      where: { id },
      select: { id: true, title: true, regNumber: true, creatorId: true },
    });

    // 1. Imzo qo'ygan foydalanuvchining hisoblagichini (badge) shu soniyaning o'zida 1 taga kamaytirish
    realtime.sendToUser(req.user!.userId, 'APPROVAL_SUBMITTED', {
      documentId: id,
      countDelta: -1,
    });
    realtime.sendToUser(req.user!.userId, 'COUNTS_UPDATE', {});

    // 2. Hujjat muallifiga zudlik bilan bildirishnoma yetkazish
    if (doc && doc.creatorId !== req.user!.userId) {
      const isApproved = status === 'APPROVED';
      const notificationTitle = isApproved ? 'Hujjat imzolandi' : 'Hujjat qaytarildi';
      const notificationMessage = isApproved
        ? `${req.user!.fullName || 'Mas’ul'} sizning "${doc.title}" (${doc.regNumber}) hujjatingizni imzoladi.`
        : `${req.user!.fullName || 'Mas’ul'} sizning "${doc.title}" (${doc.regNumber}) hujjatingizga e’tiroz bildirdi: ${comments || 'Izohsiz'}`;

      await prisma.notification.create({
        data: {
          userId: doc.creatorId,
          title: notificationTitle,
          message: notificationMessage,
          link: `/documents/${id}`,
        },
      });

      realtime.sendToUser(doc.creatorId, 'NOTIFICATION', {
        title: notificationTitle,
        message: notificationMessage,
        link: `/documents/${id}`,
      });
      realtime.sendToUser(doc.creatorId, 'COUNTS_UPDATE', {});
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
