import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { authenticate, authorize, invalidateUserCache, AuthRequest } from '../middleware/auth.js';
import { logActivity } from '../middleware/audit.js';
import { realtime } from '../services/realtime.js';

const router = Router();

const listUsersQuerySchema = z.object({
  role: z.enum(['SUPER_ADMIN', 'LEADERSHIP', 'CHANCELLERY', 'DEPARTMENT_HEAD', 'STAFF']).optional(),
  departmentId: z.string().uuid('Noto‘g‘ri bo‘lim identifikatori').optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

// Foydalanuvchilar ro'yxati (filtrlash, sahifalash va xavfsiz ma'lumot cheklovi)
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const query = listUsersQuerySchema.parse(req.query);
    const { role, departmentId, search, page, limit } = query;

    const isPrivileged = ['SUPER_ADMIN', 'LEADERSHIP', 'CHANCELLERY', 'DEPARTMENT_HEAD'].includes(req.user?.role || '');

    const where: any = {};
    // Oddiy xodimlarga tasdiqlanmagan (ariza bosqichidagi) foydalanuvchilar ko'rsatilmaydi
    if (!isPrivileged) where.isActive = true;
    if (role) where.role = role;
    if (departmentId) where.departmentId = departmentId;
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { position: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
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
        skip,
        take: limit,
      }),
    ]);

    const mappedUsers = users.map((u) => {
      const baseUser: any = {
        id: u.id,
        fullName: u.fullName,
        role: u.role,
        position: u.position,
        departmentId: u.departmentId,
        department: u.department,
        // Holat (faol/nofaol) hammaga ko'rinadi: oddiy xodimga faqat faol foydalanuvchilar qaytadi
        isActive: u.isActive,
        registrationStatus: u.isActive ? 'APPROVED' : 'PENDING',
      };

      // STAFF uchun email va telefon maydonlari yashiriladi (IDOR / Ma'lumotlar sizib chiqishini oldini olish)
      if (isPrivileged) {
        baseUser.email = u.email;
        baseUser.phone = u.phone;
        baseUser.createdAt = u.createdAt;
      }

      return baseUser;
    });

    return sendSuccess(res, mappedUsers, 'Foydalanuvchilar ro‘yxati', 200, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
});

// Yangi foydalanuvchi qo'shish (Super Admin)
router.post('/', authenticate, authorize(['SUPER_ADMIN']), async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      email: z.string().email('Noto‘g‘ri email formati'),
      password: z.string().min(8, 'Parol kamida 8 ta belgidan iborat bo‘lishi shart'),
      fullName: z.string().min(2, 'F.I.Sh talab qilinadi'),
      role: z.enum(['SUPER_ADMIN', 'LEADERSHIP', 'CHANCELLERY', 'DEPARTMENT_HEAD', 'STAFF']),
      position: z.string().min(2, 'Lavozim talab qilinadi'),
      phone: z.string().optional(),
      departmentId: z.string().uuid('Noto‘g‘ri bo‘lim identifikatori').optional().nullable(),
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
        tokenVersion: 1,
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
      requestId: (req as any).id,
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
    const uuidCheck = z.string().uuid('Noto‘g‘ri foydalanuvchi identifikatori').safeParse(id);
    if (!uuidCheck.success) {
      return sendError(res, 'Noto‘g‘ri foydalanuvchi identifikatori (UUID)', 400);
    }

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return sendError(res, 'Foydalanuvchi topilmadi', 404);
    }

    const schema = z.object({
      fullName: z.string().min(2).optional(),
      position: z.string().min(2).optional(),
      phone: z.string().optional(),
      role: z.enum(['SUPER_ADMIN', 'LEADERSHIP', 'CHANCELLERY', 'DEPARTMENT_HEAD', 'STAFF']).optional(),
      departmentId: z.string().uuid().optional().nullable(),
      isActive: z.boolean().optional(),
      password: z.string().min(8, 'Parol kamida 8 ta belgidan iborat bo‘lishi shart').optional(),
      email: z.string().trim().email('Noto‘g‘ri email formati').optional(),
    });

    const data = schema.parse(req.body);

    // Administrator o'z rolini pasaytirib yoki o'zini nofaol qilib tizimdan chiqib ketmasligi uchun
    if (id === req.user!.userId && ((data.role && data.role !== existingUser.role) || data.isActive === false)) {
      return sendError(res, 'O‘z rolingizni o‘zgartirish yoki o‘zingizni nofaol qilish mumkin emas', 400);
    }

    const updateData: any = { ...data };
    let passwordChanged = false;
    let roleChanged = false;
    let loginChanged = false;

    // Login (email) o'zgartirilsa: yagonaligi tekshiriladi va eski sessiyalar bekor qilinadi
    if (data.email) {
      const normalizedEmail = data.email.toLowerCase();
      if (normalizedEmail !== existingUser.email) {
        const taken = await prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true } });
        if (taken) {
          return sendError(res, 'Bu email bilan boshqa foydalanuvchi allaqachon mavjud', 400);
        }
        updateData.email = normalizedEmail;
        updateData.tokenVersion = { increment: 1 };
        loginChanged = true;
      } else {
        delete updateData.email;
      }
    }

    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
      updateData.tokenVersion = { increment: 1 };
      delete updateData.password;
      passwordChanged = true;
    }

    if (data.role && data.role !== existingUser.role) {
      roleChanged = true;
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
    invalidateUserCache(id);

    // Audit logs
    if (passwordChanged) {
      await logActivity({
        userId: req.user!.userId,
        action: 'CHANGE_PASSWORD',
        entity: 'USER',
        entityId: user.id,
        details: `${user.fullName} paroli administrator tomonidan yangilandi (eski sessiyalar bekor qilindi)`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        requestId: (req as any).id,
      });
    }

    if (loginChanged) {
      await logActivity({
        userId: req.user!.userId,
        action: 'CHANGE_LOGIN',
        entity: 'USER',
        entityId: user.id,
        details: `${user.fullName} logini (email) ${existingUser.email} dan ${user.email} ga o‘zgartirildi`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        requestId: (req as any).id,
      });
    }

    if (roleChanged) {
      await logActivity({
        userId: req.user!.userId,
        action: 'CHANGE_ROLE',
        entity: 'USER',
        entityId: user.id,
        details: `${user.fullName} roli ${existingUser.role} dan ${data.role} ga o‘zgartirildi`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        requestId: (req as any).id,
      });
    }

    await logActivity({
      userId: req.user!.userId,
      action: 'UPDATE_USER',
      entity: 'USER',
      entityId: user.id,
      details: `Foydalanuvchi ma’lumotlari tahrirlandi: ${user.fullName}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      requestId: (req as any).id,
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
    const uuidCheck = z.string().uuid('Noto‘g‘ri foydalanuvchi identifikatori').safeParse(id);
    if (!uuidCheck.success) {
      return sendError(res, 'Noto‘g‘ri foydalanuvchi identifikatori (UUID)', 400);
    }

    const user = await prisma.user.update({
      where: { id },
      data: { isActive: true },
    });
    invalidateUserCache(id);

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
      requestId: (req as any).id,
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
    const uuidCheck = z.string().uuid('Noto‘g‘ri foydalanuvchi identifikatori').safeParse(id);
    if (!uuidCheck.success) {
      return sendError(res, 'Noto‘g‘ri foydalanuvchi identifikatori (UUID)', 400);
    }

    if (id === req.user!.userId) {
      return sendError(res, 'O‘zingizni rad etish (nofaol qilish) mumkin emas', 400);
    }

    const user = await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
    invalidateUserCache(id);

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
      requestId: (req as any).id,
    });

    return sendSuccess(res, user, 'Foydalanuvchi muvaffaqiyatli rad etildi');
  } catch (error) {
    next(error);
  }
});

// Foydalanuvchi hisobini butunlay o'chirish (faqat Super Admin).
// Hujjat, imzo, vazifa, izoh yoki holat tarixi bilan bog'langan hisob o'chirilmaydi: tarix butunligi buzilmasligi uchun bloklash tavsiya etiladi.
router.delete('/:id', authenticate, authorize(['SUPER_ADMIN']), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const uuidCheck = z.string().uuid('Noto‘g‘ri foydalanuvchi identifikatori').safeParse(id);
    if (!uuidCheck.success) {
      return sendError(res, 'Noto‘g‘ri foydalanuvchi identifikatori (UUID)', 400);
    }

    if (id === req.user!.userId) {
      return sendError(res, 'O‘z hisobingizni o‘chirib bo‘lmaydi', 400);
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      return sendError(res, 'Foydalanuvchi topilmadi', 404);
    }

    if (target.role === 'SUPER_ADMIN') {
      const otherAdmins = await prisma.user.count({ where: { role: 'SUPER_ADMIN', isActive: true, id: { not: id } } });
      if (otherAdmins === 0) {
        return sendError(res, 'Tizimdagi oxirgi Super Adminni o‘chirib bo‘lmaydi', 400);
      }
    }

    const [documents, files, approvals, tasks, comments, history] = await Promise.all([
      prisma.document.count({ where: { creatorId: id } }),
      prisma.documentFile.count({ where: { uploadedById: id } }),
      prisma.documentApproval.count({ where: { approverId: id } }),
      prisma.task.count({ where: { OR: [{ assignedToId: id }, { createdById: id }] } }),
      prisma.documentComment.count({ where: { userId: id } }),
      prisma.documentStatusHistory.count({ where: { changedById: id } }),
    ]);

    const links: string[] = [];
    if (documents) links.push(`${documents} ta hujjat`);
    if (files) links.push(`${files} ta fayl`);
    if (approvals) links.push(`${approvals} ta imzo/viza`);
    if (tasks) links.push(`${tasks} ta vazifa`);
    if (comments) links.push(`${comments} ta izoh`);
    if (history) links.push(`${history} ta holat o‘zgarishi`);

    if (links.length > 0) {
      return sendError(
        res,
        `Bu hisobni o‘chirib bo‘lmaydi: unga ${links.join(', ')} bog‘langan. Tarix saqlanishi uchun hisobni bloklang.`,
        409
      );
    }

    // Bildirishnomalar cascade, audit yozuvlari va biriktirilgan hujjatlar esa bo'shatiladi (SetNull)
    await prisma.user.delete({ where: { id } });
    invalidateUserCache(id);

    await logActivity({
      userId: req.user!.userId,
      action: 'DELETE_USER',
      entity: 'USER',
      entityId: id,
      details: `Foydalanuvchi hisobi butunlay o‘chirildi: ${target.fullName} (${target.email})`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      requestId: (req as any).id,
    });

    return sendSuccess(res, null, 'Foydalanuvchi hisobi butunlay o‘chirildi');
  } catch (error) {
    next(error);
  }
});

export default router;
