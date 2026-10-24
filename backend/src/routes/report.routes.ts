import { Router, Response } from 'express';
import { prisma } from '../prisma.js';
import { sendSuccess } from '../utils/response.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { buildDocumentVisibilityWhere, getApproverDocumentIds } from '../services/access.js';
import { generateReportsExcel } from '../utils/excelGenerator.js';

const router = Router();

type ReportUser = NonNullable<AuthRequest['user']>;

// Tugallanmagan topshiriq holatlari (muddati o'tib OVERDUE ga o'tganlari ham hali bajarilmagan hisoblanadi)
const OPEN_TASK_STATUSES = ['PENDING', 'IN_PROGRESS', 'OVERDUE'] as any[];

// Eksport uchun hujjatlar soni chegarasi (xotira to'lib ketmasligi uchun)
const EXPORT_MAX_ROWS = 5000;

const exportDocumentSelect = {
  regNumber: true,
  title: true,
  documentType: true,
  category: true,
  status: true,
  priority: true,
  createdAt: true,
  deadline: true,
  department: { select: { name: true } },
  creator: { select: { fullName: true } },
  assignee: { select: { fullName: true } },
} as const;

// CSV formula injection'dan himoya: "=", "+", "-", "@" bilan boshlanuvchi matn oldiga apostrof qo'yiladi
const CSV_DANGEROUS_PREFIX = /^[=+\-@\t\r]/;

const csvCell = (value: string = '') => {
  const safe = CSV_DANGEROUS_PREFIX.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
};

/**
 * Foydalanuvchiga ko'rinadigan hisoblagichlar. Dashboard va yengil /counts endpointi uchun umumiy.
 * Hujjat turi va holati bo'yicha sonlar groupBy bilan olinadi (avval har biri uchun alohida COUNT so'rovi edi).
 */
async function buildCounts(user: ReportUser) {
  const isLeadershipOrAdmin = ['SUPER_ADMIN', 'LEADERSHIP', 'CHANCELLERY'].includes(user.role);

  const whereDoc: any = await buildDocumentVisibilityWhere(user);
  const whereTask: any = user.role === 'SUPER_ADMIN'
    ? {}
    : { OR: [{ assignedToId: user.userId }, { createdById: user.userId }] };

  const now = new Date();
  const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const [
    byStatus,
    byType,
    archivedCount,
    pendingSignaturesCount,
    pendingTasksCount,
    overdueTasksCount,
    approachingDeadlineCount,
    pendingUsersCount,
  ] = await Promise.all([
    prisma.document.groupBy({ by: ['status'], where: whereDoc, _count: { _all: true } }),
    prisma.document.groupBy({ by: ['documentType'], where: whereDoc, _count: { _all: true } }),
    prisma.document.count({
      where: whereDoc.OR
        ? { AND: [{ OR: whereDoc.OR }, { OR: [{ status: 'ARCHIVED' }, { isArchived: true }] }] }
        : { OR: [{ status: 'ARCHIVED' }, { isArchived: true }] },
    }),
    // Faqat imzolash bosqichidagi hujjatlar: rad etilgan hujjatda qolgan vizalar "kutilayotgan" hisoblanmaydi
    // Ketma-ket imzo: faqat navbati kelgan hujjatlar hisoblanadi
    getApproverDocumentIds(user.userId).then((ids) => ids.myTurn.length),
    prisma.task.count({ where: { ...whereTask, status: { in: OPEN_TASK_STATUSES } } }),
    prisma.task.count({
      where: { ...whereTask, status: { in: OPEN_TASK_STATUSES }, deadline: { lt: now } },
    }),
    prisma.task.count({
      where: {
        ...whereTask,
        status: { in: ['PENDING', 'IN_PROGRESS'] as any[] },
        deadline: { gte: now, lte: threeDaysLater },
      },
    }),
    // SuperAdmin uchun tasdiqlash kutilayotgan foydalanuvchilar soni
    isLeadershipOrAdmin ? prisma.user.count({ where: { isActive: false } }) : Promise.resolve(0),
  ]);

  const statusCount = (status: string) => byStatus.find((r) => r.status === status)?._count._all ?? 0;
  const typeCount = (type: string) => byType.find((r) => r.documentType === type)?._count._all ?? 0;

  return {
    total: byStatus.reduce((sum, r) => sum + r._count._all, 0),
    incoming: typeCount('INCOMING'),
    outgoing: typeCount('OUTGOING'),
    internal: typeCount('INTERNAL'),
    inApproval: pendingSignaturesCount, // Foydalanuvchining shaxsiy imzosi kutilayotganlar soni
    registered: statusCount('REGISTERED'),
    archived: archivedCount,
    pendingSignatures: pendingSignaturesCount,
    pendingTasks: pendingTasksCount,
    inExecution: statusCount('IN_EXECUTION'),
    completed: statusCount('COMPLETED'),
    rejected: statusCount('REJECTED'),
    overdue: overdueTasksCount,
    approachingDeadline: approachingDeadlineCount,
    pendingUsers: pendingUsersCount,
  };
}

// Yengil hisoblagichlar (navbar nishonlari va real-time yangilanish uchun; dashboard ro'yxatlarini yuklamaydi)
router.get('/counts', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const counts = await buildCounts(req.user!);
    return sendSuccess(res, { counts }, 'Hisoblagichlar');
  } catch (error) {
    next(error);
  }
});

// Asosiy dashboard statistikasi
router.get('/dashboard', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const isSuperAdmin = req.user!.role === 'SUPER_ADMIN';

    const { myTurn: myTurnIds } = await getApproverDocumentIds(req.user!.userId);

    const [counts, recentActivities, departmentsStat, pendingDocs, myTasks, mySubmitted] = await Promise.all([
      buildCounts(req.user!),
      prisma.auditLog.findMany({
        where: !isSuperAdmin ? { userId: req.user!.userId } : {},
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { fullName: true, role: true } } },
      }),
      // Hujjatlari eng ko'p bo'lgan 8 ta bo'lim (butun tizim statistikasi faqat Super Admin uchun)
      prisma.department.findMany({
        take: isSuperAdmin ? 8 : 0,
        orderBy: { documents: { _count: 'desc' } },
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
          status: 'IN_APPROVAL',
          id: { in: myTurnIds },
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
          status: { in: OPEN_TASK_STATUSES },
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
    ]);

    return sendSuccess(
      res,
      {
        counts,
        recentActivities,
        departmentsStat,
        actionItems: {
          pendingSignatures: pendingDocs,
          myTasks,
          mySubmitted,
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
    const where = await buildDocumentVisibilityWhere(req.user!);

    const [documents, departments] = await Promise.all([
      prisma.document.findMany({
        where,
        select: exportDocumentSelect,
        orderBy: { createdAt: 'desc' },
        take: EXPORT_MAX_ROWS,
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
  } catch (error) {
    next(error);
  }
});

// CSV formatida hisobot eksport qilish (Tozalangan apostroflar va universal UTF-8 BOM bilan)
router.get('/export-csv', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    // Hujjatlar ro'yxati va Excel eksporti bilan bir xil ko'rinish qoidasi
    const documents = await prisma.document.findMany({
      where: await buildDocumentVisibilityWhere(req.user!),
      select: exportDocumentSelect,
      orderBy: { createdAt: 'desc' },
      take: EXPORT_MAX_ROWS,
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
      csvCell(clean(d.regNumber)),
      csvCell(clean(d.title)),
      csvCell(formatType(d.documentType)),
      csvCell(clean(formatCategory(d.category))),
      csvCell(formatStatus(d.status)),
      csvCell(formatPriority(d.priority)),
      csvCell(clean(d.department?.name || 'Noma’lum')),
      csvCell(clean(d.assignee?.fullName || d.creator?.fullName || '')),
      d.createdAt ? new Date(d.createdAt).toLocaleDateString('uz-UZ') : '',
      d.deadline ? new Date(d.deadline).toLocaleDateString('uz-UZ') : 'Belgilanmagan',
    ]);

    const csvContent = ['sep=,', headers.join(','), ...rows.map((e) => e.join(','))].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="SamDU_ShortDoc_Hisobot.csv"');
    return res.send('﻿' + csvContent);
  } catch (error) {
    next(error);
  }
});

export default router;
