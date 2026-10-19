import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { generateToken } from '../utils/jwt.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { logActivity } from '../middleware/audit.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email('Noto‘g‘ri email formati'),
  password: z.string().min(6, 'Parol kamida 6 belgidan iborat bo‘lishi kerak'),
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
      include: { department: true },
    });

    if (!user) {
      return sendError(res, 'Email yoki parol noto‘g‘ri', 401);
    }

    if (!user.isActive) {
      return sendError(res, 'Sizning hisobingiz bloklangan. Administratorga murojaat qiling.', 403);
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return sendError(res, 'Email yoki parol noto‘g‘ri', 401);
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId,
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

    const { passwordHash, ...safeUser } = user;
    return sendSuccess(res, safeUser, 'Foydalanuvchi ma’lumotlari');
  } catch (error) {
    next(error);
  }
});

router.post('/change-password', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      oldPassword: z.string().min(1, 'Eski parol talab qilinadi'),
      newPassword: z.string().min(6, 'Yangi parol kamida 6 belgidan iborat bo‘lishi kerak'),
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
      data: { passwordHash: newHash },
    });

    await logActivity({
      userId: user.id,
      action: 'CHANGE_PASSWORD',
      entity: 'USER',
      entityId: user.id,
      details: `${user.fullName} parolini yangiladi`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return sendSuccess(res, null, 'Parol muvaffaqiyatli yangilandi');
  } catch (error) {
    next(error);
  }
});

export default router;
