import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { logActivity } from '../middleware/audit.js';
import { generateDocumentDocx } from '../utils/docxGenerator.js';
import { realtime } from '../services/realtime.js';
import { config } from '../config.js';
import { publicVerifyLimiter } from '../middleware/rateLimit.js';
import { parseDocumentCategory } from '../utils/categories.js';
import { optionalDate, optionalId } from '../utils/validation.js';
import {
  buildDocumentVisibilityWhere,
  canViewDocument,
  canCreateRestrictedDocument,
  getApproverDocumentIds,
  isDocumentFullySigned,
  canChangeStatus,
  isValidStatusTransition,
  DocumentStatusType,
} from '../services/access.js';

const router = Router();

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

// Konflikt (poyga) holatlari uchun 409 xatosi: errorHandler statusCode bo'yicha javob qaytaradi
const conflictError = (message: string) => Object.assign(new Error(message), { statusCode: 409 });

// Hujjatni Word (.docx) formatida javob sifatida yuborish (ochiq va autentifikatsiyali yo'nalishlar uchun umumiy)
const sendDocumentDocx = async (res: Response, document: Parameters<typeof generateDocumentDocx>[0]) => {
  const docxBuffer = await generateDocumentDocx(document, config.APP_URL);

  const safeRegNumber = document.regNumber.replace(/[\/\\:*"<>|]/g, '_');
  const filename = `${safeRegNumber}_${document.category || 'bildirishnoma'}.docx`;

  res.setHeader('Content-Type', DOCX_MIME);
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`
  );
  res.setHeader('Content-Length', docxBuffer.length);

  return res.end(docxBuffer);
};

const listDocumentsQuerySchema = z.object({
  search: z.string().optional(),
  documentType: z.enum(['INCOMING', 'OUTGOING', 'INTERNAL']).optional(),
  status: z.enum([
    'NEW',
    'REGISTERED',
    'IN_REVIEW',
    'IN_APPROVAL',
    'IN_EXECUTION',
    'COMPLETED',
    'REJECTED',
    'ARCHIVED',
  ]).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  category: z.string().optional(),
  pendingMySignature: z.string().optional(),
  departmentId: z.string().uuid('Noto‘g‘ri bo‘lim identifikatori').optional(),
  assigneeId: z.string().uuid('Noto‘g‘ri mas’ul xodim identifikatori').optional(),
  isArchived: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

// Hujjatlar ro'yxati (filtrlash, qidiruv, sahifalash va yagona RBAC ko'rinish filtri)
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const query = listDocumentsQuerySchema.parse(req.query);
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
      page,
      limit,
    } = query;

    const skip = (page - 1) * limit;

    const andConditions: any[] = [];

    // Markaziy ruxsat moduli orqali foydalanuvchiga ko'rinadigan hujjatlar filtri
    const visibilityWhere = await buildDocumentVisibilityWhere(req.user!);
    if (visibilityWhere.OR) {
      andConditions.push(visibilityWhere);
    }

    if (search) {
      andConditions.push({
        OR: [
          { regNumber: { contains: search, mode: 'insensitive' } },
          { title: { contains: search, mode: 'insensitive' } },
          { summary: { contains: search, mode: 'insensitive' } },
          { sender: { contains: search, mode: 'insensitive' } },
          { receiver: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    if (documentType) {
      andConditions.push({ documentType });
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
        andConditions.push({ status });
      }
    }

    if (category) {
      const catLower = category.toLowerCase();
      if (catLower.includes('buyru') || catLower.includes('qaror')) {
        andConditions.push({ category: { in: ['ORDER', 'DECISION'] } });
      } else {
        const parsedCat = parseDocumentCategory(category);
        andConditions.push({ category: parsedCat });
      }
    }

    if (priority) {
      andConditions.push({ priority });
    }

    if (departmentId) {
      andConditions.push({ departmentId });
    }

    if (assigneeId) {
      andConditions.push({ assigneeId });
    }

    if (isArchived !== undefined) {
      andConditions.push({ isArchived: isArchived === 'true' });
    }

    if (pendingMySignature === 'true') {
      // Ketma-ket imzo: faqat navbati aynan shu foydalanuvchiga yetgan hujjatlar
      const { myTurn } = await getApproverDocumentIds(req.user!.userId);
      andConditions.push({ id: { in: myTurn } });
    }

    const where: any = andConditions.length > 0 ? { AND: andConditions } : {};

    const [total, documents] = await Promise.all([
      prisma.document.count({ where }),
      prisma.document.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          department: { select: { id: true, name: true, code: true } },
          creator: { select: { id: true, fullName: true, position: true } },
          assignee: { select: { id: true, fullName: true, position: true } },
          approvals: {
            include: { approver: { select: { id: true, fullName: true, position: true } } },
            orderBy: { stepOrder: 'asc' },
          },
          _count: {
            select: { files: true, tasks: true, comments: true, approvals: true },
          },
        },
      }),
    ]);

    return sendSuccess(res, documents, 'Hujjatlar ro‘yxati', 200, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
});

// Hujjat tafsilotlari (IDOR himoyasi bilan: ruxsat bo'lmasa 404 qaytariladi)
router.get('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const uuidCheck = z.string().uuid('Noto‘g‘ri hujjat identifikatori').safeParse(id);
    if (!uuidCheck.success) {
      return sendError(res, 'Noto‘g‘ri hujjat identifikatori (UUID)', 400);
    }

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

    if (!canViewDocument(req.user!, document)) {
      // Mavjudligini yashirish uchun 404 qaytariladi
      return sendError(res, 'Hujjat topilmadi', 404);
    }

    return sendSuccess(res, document, 'Hujjat ma’lumotlari');
  } catch (error) {
    next(error);
  }
});

// Hujjat haqiqiyligini ommaviy tekshirish (QR-kod orqali autentifikatsiyasiz ochiq ishlaydi, mo'tadil rate limit bilan)
router.get('/:id/public-verify', publicVerifyLimiter, async (req, res, next) => {
  try {
    const { id } = req.params;
    const uuidCheck = z.string().uuid('Noto‘g‘ri hujjat identifikatori').safeParse(id);
    if (!uuidCheck.success) {
      return sendError(res, 'Noto‘g‘ri hujjat identifikatori (UUID)', 400);
    }

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        department: { select: { name: true, code: true } },
        approvals: {
          include: { approver: { select: { fullName: true, position: true } } },
          orderBy: { stepOrder: 'asc' },
        },
      },
    });

    if (!document) {
      return sendError(res, 'Hujjat tizimda topilmadi yoki haqiqiy emas', 404);
    }

    // Ommaviy tekshiruv uchun xavfsiz maydonlar qaytariladi
    return sendSuccess(
      res,
      {
        id: document.id,
        regNumber: document.regNumber,
        title: document.title,
        category: document.category,
        documentType: document.documentType,
        status: document.status,
        createdAt: document.createdAt,
        department: document.department ? { name: document.department.name, code: document.department.code } : null,
        approvals: document.approvals.map((a) => ({
          approver: {
            fullName: a.approver.fullName,
            position: a.approver.position,
          },
          status: a.status,
          signedAt: a.signedAt,
        })),
        isAuthentic: true,
        verifiedAt: new Date().toISOString(),
      },
      'Hujjat haqiqiyligi tasdiqlandi'
    );
  } catch (error) {
    next(error);
  }
});

// Tasdiqlangan hujjatni Word (.docx) formatida ommaviy yuklab olish (QR-kod tekshiruvchilar uchun)
router.get('/:id/public-docx', publicVerifyLimiter, async (req, res, next) => {
  try {
    const { id } = req.params;
    const uuidCheck = z.string().uuid('Noto‘g‘ri hujjat identifikatori').safeParse(id);
    if (!uuidCheck.success) {
      return sendError(res, 'Noto‘g‘ri hujjat identifikatori (UUID)', 400);
    }

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        department: true,
        creator: { select: { id: true, fullName: true, position: true } },
        approvals: {
          include: { approver: { select: { fullName: true, position: true } } },
          orderBy: { stepOrder: 'asc' },
        },
        tasks: true,
      },
    });

    if (!document) {
      return sendError(res, 'Hujjat topilmadi yoki mavjud emas', 404);
    }

    if (!isDocumentFullySigned(document.approvals)) {
      return sendError(res, 'Hujjat hali to‘liq imzolanmagan', 403);
    }

    return await sendDocumentDocx(res, document);
  } catch (error) {
    next(error);
  }
});

// Hujjatni rasmiy Word (.docx) formatida yuklab olish (Ruxsat tekshiruvi bilan)
router.get('/:id/docx', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const uuidCheck = z.string().uuid('Noto‘g‘ri hujjat identifikatori').safeParse(id);
    if (!uuidCheck.success) {
      return sendError(res, 'Noto‘g‘ri hujjat identifikatori (UUID)', 400);
    }

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        department: true,
        creator: { select: { id: true, fullName: true, position: true } },
        approvals: {
          include: { approver: { select: { fullName: true, position: true } } },
          orderBy: { stepOrder: 'asc' },
        },
        tasks: true,
      },
    });

    if (!document) {
      return sendError(res, 'Hujjat topilmadi', 404);
    }

    if (!canViewDocument(req.user!, document)) {
      return sendError(res, 'Hujjat topilmadi', 404);
    }

    if (!isDocumentFullySigned(document.approvals)) {
      return sendError(res, 'Word hujjatni yuklab olish uchun barcha kelishuvchilar imzolashi kerak', 403);
    }

    return await sendDocumentDocx(res, document);
  } catch (error) {
    next(error);
  }
});

// Yangi hujjat ro'yxatdan o'tkazish / yaratish (Atomik hisoblagich va xavfsiz viza zanjiri bilan)
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      title: z.string().trim().min(3, 'Hujjat nomi kamida 3 ta belgidan iborat bo‘lishi shart'),
      documentType: z.enum(['INCOMING', 'OUTGOING', 'INTERNAL']).default('INTERNAL'),
      category: z.string().default('Bildirgi'),
      sender: z.string().optional().nullable(),
      receiver: z.string().optional().nullable(),
      departmentId: optionalId,
      assigneeId: optionalId,
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
      deadline: optionalDate,
      summary: z.string().optional().nullable(),
      approverIds: z.array(z.string().min(1)).optional().default([]),
    });

    const data = schema.parse(req.body);
    const parsedCategory = parseDocumentCategory(data.category);

    // Buyruq, qaror, farmoyish va kiruvchi xatlarni faqat vakolatli rollar rasmiylashtiradi
    if (!canCreateRestrictedDocument(req.user!.role, parsedCategory, data.documentType)) {
      return sendError(res, 'Ushbu turdagi hujjatni yaratish uchun sizda vakolat yo‘q (faqat Rahbariyat, Kantselyariya va Super Admin)', 403);
    }

    // Takrorlanmagan kelishuvchilar ro'yxati
    const uniqueApproverIds = data.approverIds ? [...new Set(data.approverIds)] : [];

    // Bog'langan bo'lim va mas'ul xodim mavjudligini oldindan tekshirish (aks holda tushunarsiz FK xatosi chiqadi)
    if (data.departmentId) {
      const department = await prisma.department.findUnique({ where: { id: data.departmentId }, select: { id: true } });
      if (!department) {
        return sendError(res, 'Tanlangan bo‘lim tizimda topilmadi', 400);
      }
    }

    if (data.assigneeId) {
      const assignee = await prisma.user.findUnique({ where: { id: data.assigneeId }, select: { isActive: true } });
      if (!assignee || !assignee.isActive) {
        return sendError(res, 'Mas’ul xodim tizimda topilmadi yoki faol emas', 400);
      }
    }

    // Kelishuvchilar faol va mavjud foydalanuvchilar ekanligini tekshirish
    if (uniqueApproverIds.length > 0) {
      const activeApprovers = await prisma.user.findMany({
        where: {
          id: { in: uniqueApproverIds },
          isActive: true,
        },
        select: { id: true },
      });

      if (activeApprovers.length !== uniqueApproverIds.length) {
        return sendError(res, 'Kelishuvchilar ro‘yxatida mavjud bo‘lmagan yoki nofaol foydalanuvchilar tanlangan', 400);
      }
    }

    // Kelishuvchilar bo'lsa boshlang'ich holat IN_APPROVAL, bo'lmasa REGISTERED
    const initialStatus: DocumentStatusType = uniqueApproverIds.length > 0 ? 'IN_APPROVAL' : 'REGISTERED';

    const year = new Date().getFullYear();
    const typePrefix = data.documentType === 'INCOMING' ? 'KIR' : data.documentType === 'OUTGOING' ? 'CHIQ' : 'ICH';

    // Atomik tranzaksiya: hisoblagichni oshirish va hujjatni yaratish (Race conditiondan himoyalangan)
    const document = await prisma.$transaction(async (tx) => {
      let counter = await tx.documentCounter.upsert({
        where: {
          year_type: {
            year,
            type: data.documentType,
          },
        },
        update: {
          lastNumber: { increment: 1 },
        },
        create: {
          year,
          type: data.documentType,
          lastNumber: 1,
        },
      });

      let nextNumber = counter.lastNumber.toString().padStart(4, '0');
      let regNumber = `${year}/${typePrefix}-${nextNumber}`;

      // Boshlang'ich yoki seed ma'lumotlari bilan to'qnashuvni oldini olish
      let existing = await tx.document.findUnique({ where: { regNumber } });
      if (existing) {
        const latestDoc = await tx.document.findFirst({
          where: { regNumber: { startsWith: `${year}/${typePrefix}-` } },
          orderBy: { regNumber: 'desc' },
        });
        const match = latestDoc?.regNumber.match(/-(\d+)$/);
        const maxNum = match ? parseInt(match[1], 10) : counter.lastNumber;
        const safeNum = Math.max(maxNum + 1, counter.lastNumber + 1);

        counter = await tx.documentCounter.update({
          where: { id: counter.id },
          data: { lastNumber: safeNum },
        });
        nextNumber = counter.lastNumber.toString().padStart(4, '0');
        regNumber = `${year}/${typePrefix}-${nextNumber}`;
      }

      const doc = await tx.document.create({
        data: {
          regNumber,
          title: data.title,
          documentType: data.documentType,
          category: parsedCategory,
          sender: data.sender,
          receiver: data.receiver,
          departmentId: data.departmentId || req.user!.departmentId || null,
          assigneeId: data.assigneeId || null,
          creatorId: req.user!.userId,
          priority: data.priority,
          deadline: data.deadline ? new Date(data.deadline) : null,
          summary: data.summary,
          status: initialStatus,
        },
      });

      // Boshlang'ich holat tarixini saqlash
      await tx.documentStatusHistory.create({
        data: {
          documentId: doc.id,
          changedById: req.user!.userId,
          oldStatus: 'NEW',
          newStatus: initialStatus,
          reason: initialStatus === 'IN_APPROVAL'
            ? 'Hujjat yaratildi va kelishuv (imzo) zanjiriga yuborildi'
            : 'Hujjat tizimda ro‘yxatga olindi',
        },
      });

      // Agar kelishuvchilar (viza zanjiri) mavjud bo'lsa
      if (uniqueApproverIds.length > 0) {
        await tx.documentApproval.createMany({
          data: uniqueApproverIds.map((approverId, i) => ({
            documentId: doc.id,
            approverId,
            stepOrder: i + 1,
            status: 'PENDING' as const,
          })),
        });

        // Ketma-ket imzo: faqat birinchi kelishuvchiga xabar boradi, qolganlarga navbati kelganda yuboriladi
        await tx.notification.create({
          data: {
            userId: uniqueApproverIds[0],
            title: 'Imzolash uchun yangi hujjat',
            message: `${req.user!.fullName || 'Xodim'} sizga imzolash uchun hujjat yubordi: "${doc.title}" (${doc.regNumber})`,
            link: `/documents/${doc.id}`,
          },
        });
      }

      // Qabul qiluvchi (mas'ul) imzolovchi bo'lmasa, unga alohida xabar yuboriladi
      if (data.assigneeId && data.assigneeId !== req.user!.userId && !uniqueApproverIds.includes(data.assigneeId)) {
        await tx.notification.create({
          data: {
            userId: data.assigneeId,
            title: 'Sizga yangi hujjat biriktirildi',
            message: `${req.user!.fullName || 'Xodim'} hujjatni sizga yubordi: "${doc.title}" (${doc.regNumber})`,
            link: `/documents/${doc.id}`,
          },
        });
      }

      return doc;
    });

    if (data.assigneeId && data.assigneeId !== req.user!.userId && !uniqueApproverIds.includes(data.assigneeId)) {
      realtime.sendToUser(data.assigneeId, 'NOTIFICATION', {
        title: 'Sizga yangi hujjat biriktirildi',
        message: `${req.user!.fullName || 'Xodim'} hujjatni sizga yubordi: "${document.title}" (${document.regNumber})`,
        link: `/documents/${document.id}`,
      });
    }

    // Real-time bildirishnoma va hisoblagichlarni approverlarga jo'natish
    if (uniqueApproverIds.length > 0) {
      for (const approverId of uniqueApproverIds.slice(0, 1)) {
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
      requestId: (req as any).id,
    });

    return sendSuccess(res, document, 'Hujjat muvaffaqiyatli ro‘yxatga olindi', 201);
  } catch (error) {
    next(error);
  }
});

// Hujjat holatini yangilash (State Machine va Ruxsatlar qat'iy nazorati bilan)
router.patch('/:id/status', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const uuidCheck = z.string().uuid('Noto‘g‘ri hujjat identifikatori').safeParse(id);
    if (!uuidCheck.success) {
      return sendError(res, 'Noto‘g‘ri hujjat identifikatori (UUID)', 400);
    }

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

    const doc = await prisma.document.findUnique({
      where: { id },
      include: { approvals: true, tasks: true },
    });

    if (!doc) {
      return sendError(res, 'Hujjat topilmadi', 404);
    }

    if (!canChangeStatus(req.user!, doc)) {
      return sendError(res, 'Ushbu hujjat holatini o‘zgartirish huquqiga ega emassiz', 403);
    }

    // State machine qoidasi bo'yicha ruxsat etilgan o'tish tekshiruvi
    if (!isValidStatusTransition(doc.status as DocumentStatusType, status as DocumentStatusType)) {
      return sendError(
        res,
        `Hujjat holatini '${doc.status}' dan '${status}' ga o‘tkazishga ruxsat berilmagan`,
        409
      );
    }

    // Holat o'zgarmasa tarixga ortiqcha yozuv qo'shilmaydi
    if (doc.status === status) {
      return sendSuccess(res, doc, 'Hujjat holati o‘zgarmadi');
    }

    // Viza zanjirini aylanib o'tishni taqiqlash: imzolar faqat /approvals orqali qo'yiladi
    const hasPendingApprovals = doc.approvals.some((a) => a.status === 'PENDING');

    if (status === 'IN_APPROVAL' && !hasPendingApprovals) {
      return sendError(res, 'Kelishuvchilar belgilanmagan hujjatni imzolash bosqichiga o‘tkazib bo‘lmaydi', 409);
    }

    if (doc.status === 'IN_APPROVAL' && status === 'IN_EXECUTION' && hasPendingApprovals && req.user!.role !== 'SUPER_ADMIN') {
      return sendError(res, 'Barcha kelishuvchilar imzosisiz hujjatni ijroga o‘tkazib bo‘lmaydi', 409);
    }

    const updatedDoc = await prisma.$transaction(async (tx) => {
      // Holat o'qilgandan beri o'zgargan bo'lsa (parallel so'rov) yangilanmaydi
      const changed = await tx.document.updateMany({
        where: { id, status: doc.status },
        data: {
          status,
          isArchived: status === 'ARCHIVED' ? true : doc.isArchived,
        },
      });

      if (changed.count === 0) {
        throw conflictError('Hujjat holati boshqa foydalanuvchi tomonidan o‘zgartirilgan. Sahifani yangilang.');
      }

      await tx.documentStatusHistory.create({
        data: {
          documentId: id,
          changedById: req.user!.userId,
          oldStatus: doc.status,
          newStatus: status,
          reason: reason || `Holat ${status} ga o‘zgartirildi`,
        },
      });

      return tx.document.findUniqueOrThrow({ where: { id } });
    });

    await logActivity({
      userId: req.user!.userId,
      action: 'CHANGE_STATUS',
      entity: 'DOCUMENT',
      entityId: doc.id,
      details: `${doc.regNumber} holati ${doc.status} dan ${status} ga o‘zgardi`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      requestId: (req as any).id,
    });

    if (status === 'COMPLETED' && doc.creatorId) {
      if (doc.creatorId !== req.user!.userId) {
        await prisma.notification.create({
          data: {
            userId: doc.creatorId,
            title: 'Hujjat bajarildi',
            message: `${req.user!.fullName || 'Mas’ul'} sizning "${doc.title}" (${doc.regNumber}) hujjatingizni "Bajarildi" deb belgiladi.`,
            link: `/documents/${id}`,
          },
        });

        realtime.sendToUser(doc.creatorId, 'NOTIFICATION', {
          title: 'Hujjat bajarildi',
          message: `${req.user!.fullName || 'Mas’ul'} sizning "${doc.title}" (${doc.regNumber}) hujjatingizni "Bajarildi" deb belgiladi.`,
          link: `/documents/${id}`,
        });
        realtime.sendToUser(doc.creatorId, 'COUNTS_UPDATE', {});
      }
      realtime.sendToUser(req.user!.userId, 'COUNTS_UPDATE', {});
    }

    return sendSuccess(res, updatedDoc, 'Hujjat holati muvaffaqiyatli yangilandi');
  } catch (error) {
    next(error);
  }
});

// Viza (Kelishuv) qarorini qabul qilish (Qat'iy navbat, qayta qaror qabul qilishni taqiqlash, atomik tranzaksiya)
router.post('/:id/approvals', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const uuidCheck = z.string().uuid('Noto‘g‘ri hujjat identifikatori').safeParse(id);
    if (!uuidCheck.success) {
      return sendError(res, 'Noto‘g‘ri hujjat identifikatori (UUID)', 400);
    }

    const schema = z.object({
      status: z.enum(['APPROVED', 'REJECTED']),
      comments: z.string().optional(),
    });

    const { status, comments } = schema.parse(req.body);

    const doc = await prisma.document.findUnique({
      where: { id },
      include: {
        approvals: {
          orderBy: { stepOrder: 'asc' },
        },
      },
    });

    if (!doc) {
      return sendError(res, 'Hujjat topilmadi', 404);
    }

    if (doc.status !== 'IN_APPROVAL') {
      return sendError(res, 'Ushbu hujjat hozir imzolash/kelishuv holatida emas', 400);
    }

    // Navbatdagi eng kichik stepOrder ga ega bo'lgan PENDING viza topiladi
    const nextPendingApproval = doc.approvals.find((a) => a.status === 'PENDING');

    if (!nextPendingApproval) {
      return sendError(res, 'Ushbu hujjat bo‘yicha barcha vizalar allaqachon qabul qilingan', 400);
    }

    // Faqat navbatdagi kelishuvchi imzolay oladi
    if (nextPendingApproval.approverId !== req.user!.userId) {
      const isLaterApprover = doc.approvals.some(
        (a) => a.approverId === req.user!.userId && a.stepOrder > nextPendingApproval.stepOrder
      );
      if (isLaterApprover) {
        return sendError(res, 'Hozir sizning navbatingiz emas. Avvalgi bosqichdagi kelishuvchining imzosi kutilmoqda.', 403);
      }
      return sendError(res, 'Siz ushbu bosqichdagi navbatdagi kelishuvchi emassiz', 403);
    }

    // Qaror qabul qilish va hujjat holatini atomik yangilash
    const result = await prisma.$transaction(async (tx) => {
      // Imzo faqat hali PENDING bo'lsa qabul qilinadi: ikki marta bosish yoki parallel so'rovlar ikkinchi marta imzolay olmaydi
      const claimed = await tx.documentApproval.updateMany({
        where: { id: nextPendingApproval.id, status: 'PENDING' },
        data: {
          status,
          comments: comments || null,
          signedAt: new Date(),
        },
      });

      if (claimed.count === 0) {
        throw conflictError('Ushbu viza qarori allaqachon qabul qilingan');
      }

      const updatedApproval = await tx.documentApproval.findUniqueOrThrow({
        where: { id: nextPendingApproval.id },
      });

      const remainingPending = doc.approvals.filter(
        (a) => a.id !== nextPendingApproval.id && a.status === 'PENDING'
      );

      let newDocStatus: DocumentStatusType = doc.status as DocumentStatusType;
      let statusReason = '';

      if (status === 'REJECTED') {
        newDocStatus = 'REJECTED';
        statusReason = comments
          ? `Kelishuvchi tomonidan rad etildi: ${comments}`
          : 'Kelishuvchi tomonidan rad etildi';

        const docUpdate = await tx.document.updateMany({
          where: { id, status: 'IN_APPROVAL' },
          data: { status: 'REJECTED' },
        });
        if (docUpdate.count === 0) {
          throw conflictError('Hujjat holati o‘zgargan. Sahifani yangilang.');
        }

        await tx.documentStatusHistory.create({
          data: {
            documentId: id,
            changedById: req.user!.userId,
            oldStatus: doc.status,
            newStatus: 'REJECTED',
            reason: statusReason,
          },
        });
      } else if (remainingPending.length === 0 && status === 'APPROVED') {
        // Barcha vizalar tasdiqlanganda hujjat IN_EXECUTION (ijro bosqichi)ga o'tadi
        newDocStatus = 'IN_EXECUTION';
        statusReason = 'Barcha kelishuvchilar tomonidan tasdiqlandi va ijro bosqichiga o‘tkazildi';

        const docUpdate = await tx.document.updateMany({
          where: { id, status: 'IN_APPROVAL' },
          data: { status: 'IN_EXECUTION' },
        });
        if (docUpdate.count === 0) {
          throw conflictError('Hujjat holati o‘zgargan. Sahifani yangilang.');
        }

        await tx.documentStatusHistory.create({
          data: {
            documentId: id,
            changedById: req.user!.userId,
            oldStatus: doc.status,
            newStatus: 'IN_EXECUTION',
            reason: statusReason,
          },
        });
      }

      return { updatedApproval, newDocStatus, statusReason, remainingPending };
    });

    // Real-time bildirishnomalar
    if (doc.creatorId && doc.creatorId !== req.user!.userId) {
      const isApproved = status === 'APPROVED';
      const notificationTitle = isApproved ? 'Hujjat imzolandi' : 'Hujjat rad etildi';
      const notificationMessage = isApproved
        ? `${req.user!.fullName || 'Kelishuvchi'} sizning "${doc.title}" (${doc.regNumber}) hujjatingizni tasdiqladi.`
        : `${req.user!.fullName || 'Kelishuvchi'} sizning "${doc.title}" (${doc.regNumber}) hujjatingizni rad etdi: ${comments || 'Izohsiz'}`;

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

    // Keyingi navbatdagi kelishuvchiga bildirishnoma jo'natish
    if (status === 'APPROVED' && result.remainingPending.length > 0) {
      const nextInQueue = result.remainingPending[0];
      await prisma.notification.create({
        data: {
          userId: nextInQueue.approverId,
          title: 'Imzolash navbatingiz keldi',
          message: `"${doc.title}" (${doc.regNumber}) hujjati bo‘yicha navbatdagi imzolash sizga yetib keldi.`,
          link: `/documents/${doc.id}`,
        },
      });
      realtime.sendToUser(nextInQueue.approverId, 'APPROVAL_NEEDED', {
        documentId: doc.id,
        regNumber: doc.regNumber,
        title: doc.title,
        creatorName: req.user!.fullName || 'Xodim',
      });
      realtime.sendToUser(nextInQueue.approverId, 'NOTIFICATION', {
        title: 'Imzolash navbatingiz keldi',
        message: `"${doc.title}" (${doc.regNumber}) hujjati bo‘yicha navbatdagi imzolash sizga yetib keldi.`,
        link: `/documents/${doc.id}`,
      });
      realtime.sendToUser(nextInQueue.approverId, 'COUNTS_UPDATE', {});
    }

    realtime.sendToUser(req.user!.userId, 'APPROVAL_SUBMITTED', { documentId: id });
    realtime.sendToUser(req.user!.userId, 'COUNTS_UPDATE', {});

    await logActivity({
      userId: req.user!.userId,
      action: 'APPROVE_DOCUMENT',
      entity: 'DOCUMENT',
      entityId: doc.id,
      details: `Viza berildi: ${status} (${comments || 'Izohsiz'})`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      requestId: (req as any).id,
    });

    return sendSuccess(res, result.updatedApproval, 'Viza qarori muvaffaqiyatli qabul qilindi');
  } catch (error) {
    next(error);
  }
});

// Hujjatga izoh qo'shish (Hujjatga kirish huquqi tekshiruvi va audit logi bilan)
router.post('/:id/comments', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const uuidCheck = z.string().uuid('Noto‘g‘ri hujjat identifikatori').safeParse(id);
    if (!uuidCheck.success) {
      return sendError(res, 'Noto‘g‘ri hujjat identifikatori (UUID)', 400);
    }

    const schema = z.object({
      comment: z.string().min(1, 'Izoh matni talab qilinadi'),
    });

    const { comment } = schema.parse(req.body);

    const doc = await prisma.document.findUnique({
      where: { id },
      include: { approvals: true, tasks: true },
    });

    if (!doc) {
      return sendError(res, 'Hujjat topilmadi', 404);
    }

    if (!canViewDocument(req.user!, doc)) {
      return sendError(res, 'Ushbu hujjatga izoh qoldirish uchun sizda ruxsat yo‘q', 403);
    }

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

    await logActivity({
      userId: req.user!.userId,
      action: 'ADD_COMMENT',
      entity: 'DOCUMENT',
      entityId: doc.id,
      details: `${doc.regNumber} hujjatiga yangi izoh qo‘shildi`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      requestId: (req as any).id,
    });

    return sendSuccess(res, newComment, 'Izoh muvaffaqiyatli qo‘shildi', 201);
  } catch (error) {
    next(error);
  }
});

export default router;
