import { Router, Response } from 'express';
import { prisma } from '../prisma.js';
import { sendSuccess } from '../utils/response.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Asosiy dashboard statistikasi
router.get('/dashboard', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const whereDoc: any = {};
    const whereTask: any = {};

    if (req.user!.role === 'STAFF') {
      whereDoc.OR = [
        { creatorId: req.user!.userId },
        { assigneeId: req.user!.userId },
      ];
      whereTask.assignedToId = req.user!.userId;
    } else if (req.user!.role === 'DEPARTMENT_HEAD' && req.user!.departmentId) {
      whereDoc.departmentId = req.user!.departmentId;
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
      prisma.document.count({ where: { ...whereDoc, OR: [{ status: 'ARCHIVED' }, { isArchived: true }] } }),
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
    ]);

    return sendSuccess(
      res,
      {
        counts: {
          total: totalDocuments,
          incoming: incomingCount,
          outgoing: outgoingCount,
          internal: internalCount,
          inApproval: inApprovalCount,
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
