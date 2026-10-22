import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';
import { logActivity } from '../middleware/audit.js';
import { realtime } from '../services/realtime.js';

const router = Router();

// Foydalanuvchilar ro'yxati (barcha autentifikatsiyadan o'tganlar uchun, yoki role bo'yicha)
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { role, departmentId, search } = req.query;

    const where: any = {};
    if (role) where.role = role as any;
    if (departmentId) where.departmentId = departmentId as string;
    if (search) {
      where.OR = [
        { fullName: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { position: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        position: true,
        phone: true,
        isActive: true,
        departmentId: true,
        department: { select: { id: true, name: true, code: true } },
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const mappedUsers = users.map((u) => ({
      ...u,
      registrationStatus: u.isActive ? 'APPROVED' : 'PENDING',
    }));

    return sendSuccess(res, mappedUsers, 'Foydalanuvchilar ro‘yxati');
  } catch (error) {
    next(error);
  }
});

// Yangi foydalanuvchi qo'shish (Super Admin)
router.post('/', authenticate, authorize(['SUPER_ADMIN']), async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      email: z.string().email('Noto‘g‘ri email formati'),
      password: z.string().min(6, 'Parol kamida 6 ta belgi bo‘lishi kerak'),
      fullName: z.string().min(2, 'F.I.Sh talab qilinadi'),
      role: z.enum(['SUPER_ADMIN', 'LEADERSHIP', 'CHANCELLERY', 'DEPARTMENT_HEAD', 'STAFF']),
      position: z.string().min(2, 'Lavozim talab qilinadi'),
      phone: z.string().optional(),
      departmentId: z.string().optional().nullable(),
    });

    const data = schema.parse(req.body);
    const normalizedEmail = data.email.trim().toLowerCase();

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return sendError(res, 'Bu email bilan foydalanuvchi allaqachon mavjud', 400);
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        fullName: data.fullName,
        role: data.role,
        position: data.position,
        phone: data.phone,
        departmentId: data.departmentId || null,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        position: true,
        phone: true,
        isActive: true,
        departmentId: true,
        createdAt: true,
      },
    });

    await logActivity({
      userId: req.user!.userId,
      action: 'CREATE_USER',
      entity: 'USER',
      entityId: user.id,
      details: `Yangi xodim qo‘shildi: ${user.fullName} (${user.role})`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return sendSuccess(res, user, 'Foydalanuvchi muvaffaqiyatli yaratildi', 201);
  } catch (error) {
    next(error);
  }
});

// Foydalanuvchini tahrirlash (Super Admin)
router.put('/:id', authenticate, authorize(['SUPER_ADMIN']), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const schema = z.object({
      fullName: z.string().min(2).optional(),
      position: z.string().min(2).optional(),
      phone: z.string().optional(),
      role: z.enum(['SUPER_ADMIN', 'LEADERSHIP', 'CHANCELLERY', 'DEPARTMENT_HEAD', 'STAFF']).optional(),
      departmentId: z.string().optional().nullable(),
      isActive: z.boolean().optional(),
      password: z.string().min(6).optional(),
    });

    const data = schema.parse(req.body);

    const updateData: any = { ...data };
    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
      delete updateData.password;
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        position: true,
        phone: true,
        isActive: true,
        departmentId: true,
      },
    });

    await logActivity({
      userId: req.user!.userId,
      action: 'UPDATE_USER',
      entity: 'USER',
      entityId: user.id,
      details: `Foydalanuvchi ma’lumotlari tahrirlandi: ${user.fullName}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return sendSuccess(res, user, 'Foydalanuvchi muvaffaqiyatli yangilandi');
  } catch (error) {
    next(error);
  }
});

// Foydalanuvchini tasdiqlash (Super Admin)
router.post('/:id/approve', authenticate, authorize(['SUPER_ADMIN']), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.update({
      where: { id },
      data: { isActive: true },
    });

    await prisma.notification.create({
      data: {
        userId: user.id,
        title: 'Arizangiz tasdiqlandi',
        message: 'Arizangiz SuperAdmin tomonidan tasdiqlandi. Endi SamDU ShortDoc tizimidan to‘liq foydalanishingiz mumkin.',
        link: '/',
      },
    }).catch(() => null);

    realtime.sendToUser(user.id, 'NOTIFICATION', {
      title: 'Arizangiz tasdiqlandi',
      message: 'Arizangiz SuperAdmin tomonidan tasdiqlandi. Endi SamDU ShortDoc tizimidan to‘liq foydalanishingiz mumkin.',
      link: '/',
    });

    await logActivity({
      userId: req.user!.userId,
      action: 'APPROVE_USER',
      entity: 'USER',
      entityId: user.id,
      details: `${user.fullName} foydalanuvchisi arizasi tasdiqlandi va faollashtirildi`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return sendSuccess(res, user, 'Foydalanuvchi arizasi muvaffaqiyatli tasdiqlandi');
  } catch (error) {
    next(error);
  }
});

// Foydalanuvchini rad etish / nofaol qilish (Super Admin)
router.post('/:id/reject', authenticate, authorize(['SUPER_ADMIN']), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    await prisma.notification.create({
      data: {
        userId: user.id,
        title: 'Arizangiz rad etildi',
        message: 'Arizangiz SuperAdmin tomonidan rad etildi.',
        link: '/login',
      },
    }).catch(() => null);

    realtime.sendToUser(user.id, 'NOTIFICATION', {
      title: 'Arizangiz rad etildi',
      message: 'Arizangiz SuperAdmin tomonidan rad etildi.',
      link: '/login',
    });

    await logActivity({
      userId: req.user!.userId,
      action: 'REJECT_USER',
      entity: 'USER',
      entityId: user.id,
      details: `${user.fullName} foydalanuvchisi rad etildi`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return sendSuccess(res, user, 'Foydalanuvchi muvaffaqiyatli rad etildi');
  } catch (error) {
    next(error);
  }
});

export default router;
