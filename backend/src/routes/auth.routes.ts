import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { generateToken } from '../utils/jwt.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { authenticate, invalidateUserCache, AuthRequest } from '../middleware/auth.js';
import { logActivity } from '../middleware/audit.js';
import { realtime } from '../services/realtime.js';
import { createStreamTicket } from '../services/ticket.service.js';
import { loginLimiter, registerLimiter, checkEmailLimiter } from '../middleware/rateLimit.js';

const router = Router();

// Mavjud bo'lmagan email uchun ham bcrypt solishtiriladi: javob vaqti orqali foydalanuvchi mavjudligi bilinmasligi uchun
const DUMMY_PASSWORD_HASH = '$2a$10$lpu9yDGfKS0yxqEO0XvOFuWDBqzfKueT9G3sxmSbdn0wipra1HKwG';

// Stream ticket endpoint: authenticated client requests a one-time, 30s ticket for SSE
router.post('/stream-ticket', authenticate, (req: AuthRequest, res) => {
  const ticket = createStreamTicket(req.user!.userId);
  return sendSuccess(res, { ticket }, 'SSE oqim chiptasi muvaffaqiyatli berildi');
});

const loginSchema = z.object({
  email: z.string().trim().email('Noto‘g‘ri email formati'),
  password: z.string().min(1, 'Parol kiritilishi shart'),
});

const registerSchema = z.object({
  fullName: z.string().min(2, 'F.I.Sh kamida 2 ta belgidan iborat bo‘lishi kerak'),
  email: z.string().trim().email('Noto‘g‘ri email formati'),
  password: z.string().min(8, 'Parol kamida 8 ta belgidan iborat bo‘lishi shart'),
  departmentId: z.string().optional().nullable(),
  customDepartment: z.string().optional().nullable(),
  position: z.string().min(2, 'Lavozim kiritilishi shart'),
  customPosition: z.string().optional().nullable(),
  phone: z.string().optional(),
});

// Email bandligini tekshirish (Real-time validator, minimal javob va rate-limit bilan)
router.get('/check-email', checkEmailLimiter, async (req, res, next) => {
  try {
    const rawEmail = req.query.email as string;
    if (!rawEmail) {
      return sendError(res, 'Email ko‘rsatilmadi', 400);
    }

    const email = rawEmail.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    return sendSuccess(res, {
      available: !user,
    });
  } catch (error) {
    next(error);
  }
});

// Yangi foydalanuvchi ariza / ro'yxatdan o'tishi
router.post('/register', registerLimiter, async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const normalizedEmail = data.email.trim().toLowerCase();

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return sendError(res, 'Bu email manzili bilan allaqachon ro‘yxatdan o‘tilgan', 400);
    }

    // Bo'lim ID sini xavfsiz va moslashuvchan aniqlash (Foreign Key xatoligini oldini olish)
    let finalDepartmentId: string | null = null;

    if (data.departmentId && data.departmentId !== 'Boshqa') {
      // 1. Agar haqiqiy UUID bo'lsa
      const depById = await prisma.department.findUnique({
        where: { id: data.departmentId },
      }).catch(() => null);

      if (depById) {
        finalDepartmentId = depById.id;
      } else {
        // 2. Agar bo'lim nomi uzatilgan bo'lsa (masalan "Axborot texnologiyalari fakulteti")
        const depByName = await prisma.department.findFirst({
          where: { name: { equals: data.departmentId, mode: 'insensitive' } },
        });

        if (depByName) {
          finalDepartmentId = depByName.id;
        } else if (!data.customDepartment) {
          return sendError(res, 'Tanlangan bo‘lim tizimda topilmadi', 400);
        }
      }
    }

    // 3. Agar bo'lim topilmagan bo'lsa va customDepartment kiritilgan bo'lsa
    if (!finalDepartmentId && data.customDepartment && data.customDepartment.trim()) {
      const depName = data.customDepartment.trim();
      const depByName = await prisma.department.findFirst({
        where: { name: { equals: depName, mode: 'insensitive' } },
      });

      if (depByName) {
        finalDepartmentId = depByName.id;
      } else {
        // Yangi bo'lim sifatida bazaga kiritish (kod to'qnashuvi bo'lsa qayta urinadi)
        for (let attempt = 0; attempt < 5 && !finalDepartmentId; attempt++) {
          const generatedCode = 'DEP-' + Math.floor(1000 + Math.random() * 9000);
          const newDep = await prisma.department.create({
            data: {
              name: depName,
              code: generatedCode,
              type: 'DEPARTMENT',
            },
          }).catch(() => null);

          if (newDep) {
            finalDepartmentId = newDep.id;
          }
        }
      }
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        fullName: data.fullName,
        email: normalizedEmail,
        passwordHash,
        position: data.position,
        phone: data.phone || null,
        departmentId: finalDepartmentId, // Kafolatlangan haqiqiy UUID yoki null
        role: 'STAFF',
        isActive: false, // SuperAdmin tasdiqlashi talab etiladi
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        position: true,
        isActive: true,
      },
    });

    // Barcha SuperAdminlarga zudlik bilan bildirishnoma yaratish va Real-time yuborish
    const superAdmins = await prisma.user.findMany({
      where: { role: 'SUPER_ADMIN' },
      select: { id: true },
    });

    const notifTitle = 'Yangi xodimdan ro‘yxatdan o‘tish arizasi';
    const notifMessage = `${user.fullName} (${user.position}) tizimga kirish uchun ariza yubordi. Tasdiqlash talab etiladi.`;
    const notifLink = '/admin/users';

    if (superAdmins.length > 0) {
      await prisma.notification.createMany({
        data: superAdmins.map((admin) => ({
          userId: admin.id,
          title: notifTitle,
          message: notifMessage,
          link: notifLink,
        })),
      });
    }

    for (const admin of superAdmins) {
      realtime.sendToUser(admin.id, 'NOTIFICATION', {
        title: notifTitle,
        message: notifMessage,
        link: notifLink,
      });

      realtime.sendToUser(admin.id, 'COUNTS_UPDATE', {});
    }

    await logActivity({
      userId: user.id,
      action: 'REGISTER',
      entity: 'USER',
      entityId: user.id,
      details: `${user.fullName} tizimda yangi xodim sifatida ro‘yxatdan o‘tish uchun ariza topshirdi`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return sendSuccess(res, user, 'Arizangiz muvaffaqiyatli qabul qilindi. SuperAdmin tasdiqlagach tizimdan foydalanasiz!', 201);
  } catch (error) {
    next(error);
  }
});

router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { department: true },
    });

    // Parol avval tekshiriladi: hisob holati (faol emas) faqat to'g'ri parol egasiga ma'lum qilinadi
    const isMatch = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);

    if (!user || !isMatch) {
      await logActivity({
        userId: user?.id ?? null,
        action: 'LOGIN_FAILED',
        entity: 'AUTH',
        entityId: user?.id,
        details: user
          ? `Muvaffaqiyatsiz kirish urinishi: noto‘g‘ri parol (${normalizedEmail})`
          : `Muvaffaqiyatsiz kirish urinishi: '${normalizedEmail}' tizimda topilmadi`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        requestId: (req as any).id,
      });
      return sendError(res, 'Email yoki parol noto‘g‘ri', 401);
    }

    if (!user.isActive) {
      await logActivity({
        userId: user.id,
        action: 'LOGIN_FAILED',
        entity: 'AUTH',
        entityId: user.id,
        details: `Faol bo‘lmagan hisob orqali kirishga urinish: ${normalizedEmail}`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        requestId: (req as any).id,
      });
      return sendError(res, 'Sizning hisobingiz tasdiqlanmagan. Iltimos, administrator tasdiqlashini kuting.', 403);
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId,
      tokenVersion: user.tokenVersion || 1,
    });

    await logActivity({
      userId: user.id,
      action: 'LOGIN',
      entity: 'AUTH',
      entityId: user.id,
      details: `${user.fullName} tizimga kirdi`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return sendSuccess(
      res,
      {
        token,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          position: user.position,
          department: user.department,
        },
      },
      'Tizimga muvaffaqiyatli kirildi'
    );
  } catch (error) {
    next(error);
  }
});

router.get('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: { department: true },
    });

    if (!user) {
      return sendError(res, 'Foydalanuvchi topilmadi', 404);
    }

    const { passwordHash, tokenVersion, ...safeUser } = user;
    return sendSuccess(res, safeUser, 'Foydalanuvchi ma’lumotlari');
  } catch (error) {
    next(error);
  }
});

router.post('/change-password', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      oldPassword: z.string().min(1, 'Eski parol talab qilinadi'),
      newPassword: z.string().min(8, 'Yangi parol kamida 8 ta belgidan iborat bo‘lishi shart'),
    });

    const { oldPassword, newPassword } = schema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
    });

    if (!user) {
      return sendError(res, 'Foydalanuvchi topilmadi', 404);
    }

    const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isMatch) {
      return sendError(res, 'Eski parol noto‘g‘ri', 400);
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
        tokenVersion: { increment: 1 },
      },
    });
    invalidateUserCache(user.id);

    await logActivity({
      userId: user.id,
      action: 'CHANGE_PASSWORD',
      entity: 'USER',
      entityId: user.id,
      details: `${user.fullName} parolini yangiladi (barcha eski sessiyalar bekor qilindi)`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      requestId: (req as any).id,
    });

    return sendSuccess(res, null, 'Parol muvaffaqiyatli yangilandi');
  } catch (error) {
    next(error);
  }
});

export default router;
