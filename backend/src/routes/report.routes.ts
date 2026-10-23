import { Router, Response } from 'express';
import { prisma } from '../prisma.js';
import { sendSuccess } from '../utils/response.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { buildDocumentVisibilityWhere } from '../services/access.js';
import { generateReportsExcel } from '../utils/excelGenerator.js';

const router = Router();

// Asosiy dashboard statistikasi
router.get('/dashboard', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const isLeadershipOrAdmin = ['SUPER_ADMIN', 'LEADERSHIP', 'CHANCELLERY'].includes(req.user!.role);

    const whereDoc = buildDocumentVisibilityWhere(req.user!);
    const whereTask: any = {};

    if (!isLeadershipOrAdmin) {
      whereTask.OR = [
        { assignedToId: req.user!.userId },
        { createdById: req.user!.userId },
      ];
    }

    const now = new Date();
    const threeDaysLater = new Date();
    threeDaysLater.setDate(now.getDate() + 3);

    const [
      totalDocuments,
      incomingCount,
      outgoingCount,
      internalCount,
      inExecutionCount,
      completedCount,
      rejectedCount,
      inApprovalCount,
      registeredCount,
      archivedCount,
      pendingSignaturesCount,
      pendingTasksCount,
      overdueTasksCount,
      approachingDeadlineCount,
      recentActivities,
      departmentsStat,
      pendingMySignaturesDocs,
      myPendingTasksList,
      mySubmittedDocs,
      pendingUsersCount,
    ] = await Promise.all([
      prisma.document.count({ where: whereDoc }),
      prisma.document.count({ where: { ...whereDoc, documentType: 'INCOMING' } }),
      prisma.document.count({ where: { ...whereDoc, documentType: 'OUTGOING' } }),
      prisma.document.count({ where: { ...whereDoc, documentType: 'INTERNAL' } }),
      prisma.document.count({ where: { ...whereDoc, status: 'IN_EXECUTION' } }),
      prisma.document.count({ where: { ...whereDoc, status: 'COMPLETED' } }),
      prisma.document.count({ where: { ...whereDoc, status: 'REJECTED' } }),
      prisma.document.count({ where: { ...whereDoc, status: 'IN_APPROVAL' } }),
      prisma.document.count({ where: { ...whereDoc, status: 'REGISTERED' } }),
      prisma.document.count({
        where: whereDoc.OR
          ? { AND: [{ OR: whereDoc.OR }, { OR: [{ status: 'ARCHIVED' }, { isArchived: true }] }] }
          : { OR: [{ status: 'ARCHIVED' }, { isArchived: true }] },
      }),
      prisma.documentApproval.count({
        where: {
          approverId: req.user!.userId,
          status: 'PENDING',
        },
      }),
      prisma.task.count({
        where: {
          ...whereTask,
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
      }),
      prisma.task.count({
        where: {
          ...whereTask,
          status: { in: ['PENDING', 'IN_PROGRESS'] },
          deadline: { lt: now },
        },
      }),
      prisma.task.count({
        where: {
          ...whereTask,
          status: { in: ['PENDING', 'IN_PROGRESS'] },
          deadline: { gte: now, lte: threeDaysLater },
        },
      }),
      prisma.auditLog.findMany({
        where: !isLeadershipOrAdmin ? { userId: req.user!.userId } : {},
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { fullName: true, role: true } } },
      }),
      prisma.department.findMany({
        take: 8,
        select: {
          id: true,
          name: true,
          code: true,
          _count: { select: { documents: true, users: true } },
        },
      }),
      // Foydalanuvchining shaxsan o'zi imzolashi kerak bo'lgan hujjatlar (Top 5)
      prisma.document.findMany({
        where: {
          approvals: {
            some: {
              approverId: req.user!.userId,
              status: 'PENDING',
            },
          },
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          creator: { select: { fullName: true, position: true } },
          department: { select: { name: true } },
          approvals: {
            orderBy: { stepOrder: 'asc' },
            include: { approver: { select: { fullName: true, role: true } } },
          },
        },
      }),
      // Foydalanuvchining shaxsiy topshiriqlari (Top 5)
      prisma.task.findMany({
        where: {
          assignedToId: req.user!.userId,
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
        take: 5,
        orderBy: [{ deadline: 'asc' }, { createdAt: 'desc' }],
        include: {
          document: { select: { id: true, regNumber: true, title: true } },
          createdBy: { select: { fullName: true } },
        },
      }),
      // Foydalanuvchi yuborgan so'nggi hujjatlar va ularning hozirgi bosqichi (Top 5)
      prisma.document.findMany({
        where: { creatorId: req.user!.userId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          approvals: {
            orderBy: { stepOrder: 'asc' },
            include: { approver: { select: { fullName: true, position: true, role: true } } },
          },
        },
      }),
      // SuperAdmin uchun tasdiqlash kutilayotgan foydalanuvchilar soni
      isLeadershipOrAdmin ? prisma.user.count({ where: { isActive: false } }) : 0,
    ]);

    const pendingDocs = (pendingMySignaturesDocs || []) as any[];
    const myTasks = (myPendingTasksList || []) as any[];
    const mySubmitted = (mySubmittedDocs || []) as any[];

    return sendSuccess(
      res,
      {
        counts: {
          total: totalDocuments,
          incoming: incomingCount,
          outgoing: outgoingCount,
          internal: internalCount,
          inApproval: pendingSignaturesCount, // Foydalanuvchining shaxsiy imzosi kutilayotganlar soni
          registered: registeredCount,
          archived: archivedCount,
          pendingSignatures: pendingSignaturesCount,
          pendingTasks: pendingTasksCount,
          inExecution: inExecutionCount,
          completed: completedCount,
          rejected: rejectedCount,
          overdue: overdueTasksCount,
          approachingDeadline: approachingDeadlineCount,
          pendingUsers: pendingUsersCount,
        },
        recentActivities,
        departmentsStat,
        actionItems: {
          pendingSignatures: pendingDocs,
          myTasks: myTasks,
          mySubmitted: mySubmitted,
        },
      },
      'Dashboard ko‘rsatkichlari'
    );
  } catch (error) {
    next(error);
  }
});

// Professional Native Microsoft Excel (.xlsx) formatida hisobot eksport qilish
router.get(['/export-excel', '/export-xlsx'], authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const where = buildDocumentVisibilityWhere(req.user!);

    const [documents, departments] = await Promise.all([
      prisma.document.findMany({
        where,
        include: {
          department: true,
          creator: true,
          assignee: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.department.findMany({
        select: {
          name: true,
          code: true,
          _count: { select: { documents: true, users: true } },
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    const formattedDocs = documents.map((d) => ({
      regNumber: d.regNumber || '—',
      title: String(d.title || d.regNumber || 'Hujjat').replace(/[‘’`ʼʻ]/g, "'"),
      documentType: d.documentType || 'INTERNAL',
      category: String(d.category || 'Xizmat hujjati').replace(/[‘’`ʼʻ]/g, "'"),
      status: d.status || 'NEW',
      priority: d.priority || 'MEDIUM',
      departmentName: String(d.department?.name || 'Noma’lum').replace(/[‘’`ʼʻ]/g, "'"),
      responsiblePerson: String(d.assignee?.fullName || d.creator?.fullName || '—').replace(/[‘’`ʼʻ]/g, "'"),
      createdAt: d.createdAt,
      deadline: d.deadline,
    }));

    const formattedDeps = departments.map((dp) => ({
      name: String(dp.name || 'Bo‘lim').replace(/[‘’`ʼʻ]/g, "'"),
      code: dp.code || 'DEP',
      usersCount: dp._count?.users || 0,
      documentsCount: dp._count?.documents || 0,
    }));

    const excelBuffer = await generateReportsExcel(
      formattedDocs,
      formattedDeps,
      String(req.user?.fullName || 'Foydalanuvchi').replace(/[‘’`ʼʻ]/g, "'")
    );

    const safeDate = new Date().toISOString().split('T')[0];
    const filename = `SamDU_ShortDoc_Hisobot_${safeDate}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`
    );
    res.setHeader('Content-Length', excelBuffer.length);

    return res.end(excelBuffer);
  } catch (error: any) {
    console.error('❌ [EXPORT-EXCEL XATOLIK]:', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Excel hisobotini yaratishda xatolik yuz berdi',
    });
  }
});

// CSV formatida hisobot eksport qilish (Tozalangan apostroflar va universal UTF-8 BOM bilan)
router.get('/export-csv', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const where: any = {};
    if (req.user!.role === 'STAFF') {
      where.OR = [
        { creatorId: req.user!.userId },
        { assigneeId: req.user!.userId },
      ];
    } else if (req.user!.role === 'DEPARTMENT_HEAD' && req.user!.departmentId) {
      where.departmentId = req.user!.departmentId;
    }

    const documents = await prisma.document.findMany({
      where,
      include: {
        department: true,
        creator: true,
        assignee: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatType = (type: string) => {
      switch (type) {
        case 'INCOMING': return 'Kiruvchi xat';
        case 'OUTGOING': return 'Chiquvchi xat';
        case 'INTERNAL': return 'Ichki hujjat';
        default: return type;
      }
    };

    const formatStatus = (st: string) => {
      switch (st) {
        case 'REGISTERED': return "Ro'yxatga olingan";
        case 'IN_APPROVAL': return 'Imzolanmoqda';
        case 'IN_EXECUTION': return 'Ijroda';
        case 'COMPLETED': return 'Bajarildi';
        case 'REJECTED': return 'Qaytarildi';
        case 'ARCHIVED': return 'Arxivda';
        default: return st;
      }
    };

    const formatPriority = (p: string) => {
      switch (p) {
        case 'URGENT': return 'Shoshilinch';
        case 'HIGH': return 'Yuqori';
        case 'MEDIUM': return "O'rta";
        case 'LOW': return 'Past';
        default: return p;
      }
    };

    const formatCategory = (cat?: string | null) => {
      if (!cat) return 'Hujjat';
      const upper = cat.toUpperCase().trim();
      switch (upper) {
        case 'ORDER': return 'Buyruq';
        case 'DECISION': return 'Qaror';
        case 'DIRECTIVE': return 'Farmoyish';
        case 'BILDIRGI': return 'Bildirgi';
        case 'OFFICIAL_NOTE': return 'Xizmat xati';
        case 'APPLICATION': return 'Ariza';
        case 'APPEAL': return 'Murojaat';
        case 'LETTER': return 'Xat';
        case 'CONTRACT': return 'Shartnoma';
        case 'REPORT': return 'Hisobot';
        case 'ARCHIVE': return 'Arxiv';
        case 'OTHER': return 'Boshqa';
        default: return cat;
      }
    };

    const clean = (str: string = '') => str.replace(/[‘’`ʼʻ]/g, "'");

    const headers = [
      "Ro'yxat raqami",
      'Hujjat nomi',
      'Turi',
      'Kategoriya',
      'Holati',
      'Muhimlik darajasi',
      "Bo'lim / Fakultet",
      "Mas'ul shaxs / Muallif",
      'Yaratilgan sana',
      'Ijro muddati',
    ];

    const rows = documents.map((d) => [
      `"${clean(d.regNumber)}"`,
      `"${clean(d.title).replace(/"/g, '""')}"`,
      `"${formatType(d.documentType)}"`,
      `"${clean(formatCategory(d.category))}"`,
      `"${formatStatus(d.status)}"`,
      `"${formatPriority(d.priority)}"`,
      `"${clean(d.department?.name || 'Noma’lum')}"`,
      `"${clean(d.assignee?.fullName || d.creator?.fullName || '')}"`,
      d.createdAt ? new Date(d.createdAt).toLocaleDateString('uz-UZ') : '',
      d.deadline ? new Date(d.deadline).toLocaleDateString('uz-UZ') : 'Belgilanmagan',
    ]);

    const csvContent = ['sep=,', headers.join(','), ...rows.map((e) => e.join(','))].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="SamDU_ShortDoc_Hisobot.csv"');
    return res.send('\uFEFF' + csvContent);
  } catch (error) {
    next(error);
  }
});

export default router;
