import { Router, Response } from 'express';
import { prisma } from '../prisma.js';
import { sendSuccess } from '../utils/response.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Asosiy dashboard statistikasi
router.get('/dashboard', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const isLeadershipOrAdmin = ['SUPER_ADMIN', 'LEADERSHIP', 'CHANCELLERY'].includes(req.user!.role);

    const whereDoc: any = {};
    const whereTask: any = {};

    if (!isLeadershipOrAdmin) {
      const staffOr: any[] = [
        { creatorId: req.user!.userId },
        { assigneeId: req.user!.userId },
        { documentType: 'INCOMING' },
        { category: { contains: 'Buyru', mode: 'insensitive' } },
        { category: { contains: 'Qaror', mode: 'insensitive' } },
      ];
      if (req.user!.departmentId) {
        staffOr.push({ departmentId: req.user!.departmentId });
      }
      whereDoc.OR = staffOr;

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
    ] = await Promise.all([
      prisma.document.count({ where: whereDoc }),
      prisma.document.count({ where: { ...whereDoc, documentType: 'INCOMING' } }),
      prisma.document.count({ where: { ...whereDoc, documentType: 'OUTGOING' } }),
      prisma.document.count({ where: { ...whereDoc, documentType: 'INTERNAL' } }),
      prisma.document.count({ where: { ...whereDoc, status: 'IN_EXECUTION' } }),
      prisma.document.count({ where: { ...whereDoc, status: 'COMPLETED' } }),
      prisma.document.count({ where: { ...whereDoc, status: 'REJECTED' } }),
      prisma.document.count({ where: { status: 'IN_APPROVAL' } }),
      prisma.document.count({ where: { status: 'REGISTERED' } }),
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

// CSV formatida hisobot eksport qilish
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

    const headers = [
      'Ro‘yxat raqami',
      'Hujjat nomi',
      'Turi',
      'Kategoriya',
      'Holati',
      'Muhimlik',
      'Bo‘lim',
      'Mas’ul shaxs',
      'Yaratilgan sana',
      'Ijro muddati',
    ];

    const rows = documents.map((d) => [
      `"${d.regNumber}"`,
      `"${d.title.replace(/"/g, '""')}"`,
      d.documentType,
      d.category,
      d.status,
      d.priority,
      `"${d.department?.name || 'Noma’lum'}"`,
      `"${d.assignee?.fullName || d.creator?.fullName || ''}"`,
      d.createdAt.toISOString().split('T')[0],
      d.deadline ? d.deadline.toISOString().split('T')[0] : 'Belgilanmagan',
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="shortdoc-hisobot.csv"');
    return res.send('\uFEFF' + csvContent); // UTF-8 BOM for Excel compatibility
  } catch (error) {
    next(error);
  }
});

export default router;
