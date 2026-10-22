import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/jwt.js';
import { sendError } from '../utils/response.js';
import { prisma } from '../prisma.js';
import { consumeStreamTicket } from '../services/ticket.service.js';

export interface AuthRequest extends Request {
  user?: JwtPayload & {
    fullName?: string;
    position?: string;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return sendError(res, 'Autentifikatsiya talab qilinadi. Token topilmadi.', 401);
    }
    const payload = verifyToken(token);

    // Verify user is still active in DB and tokenVersion matches
    const dbUser = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        role: true,
        departmentId: true,
        fullName: true,
        position: true,
        isActive: true,
        tokenVersion: true,
      },
    });

    if (!dbUser || !dbUser.isActive) {
      return sendError(res, 'Foydalanuvchi hisobi faol emas yoki mavjud emas.', 403);
    }

    // Parol o'zgartirilgandan so'ng eski tokenlarni bekor qilish
    if (typeof payload.tokenVersion === 'number' && payload.tokenVersion !== dbUser.tokenVersion) {
      return sendError(res, 'Sessiya muddati tugagan yoki parol o‘zgartirilgan. Qaytadan kiring.', 401);
    }

    req.user = {
      userId: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
      departmentId: dbUser.departmentId,
      fullName: dbUser.fullName,
      position: dbUser.position,
      tokenVersion: dbUser.tokenVersion,
    };

    next();
  } catch (error) {
    return sendError(res, 'Yaroqsiz yoki muddati o‘tgan token.', 401);
  }
};

/**
 * Stream authentication middleware for SSE (/notifications/stream).
 * Supports standard Bearer token or short-lived, single-use ticket via query param (?ticket=...)
 * Never accepts permanent JWT token in query parameter!
 */
export const authenticateStream = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    let userId: string | null = null;
    let tokenPayload: JwtPayload | null = null;

    // 1. Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      tokenPayload = verifyToken(token);
      userId = tokenPayload.userId;
    }

    // 2. Check one-time short-lived ticket
    if (!userId && req.query?.ticket && typeof req.query.ticket === 'string') {
      userId = consumeStreamTicket(req.query.ticket);
    }

    if (!userId) {
      return sendError(res, 'SSE ulanishi uchun ruxsat berilmadi. Yaroqli ticket yoki token taqdim etilmadi.', 401);
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        departmentId: true,
        fullName: true,
        position: true,
        isActive: true,
        tokenVersion: true,
      },
    });

    if (!dbUser || !dbUser.isActive) {
      return sendError(res, 'Foydalanuvchi hisobi faol emas yoki mavjud emas.', 403);
    }

    if (tokenPayload && typeof tokenPayload.tokenVersion === 'number' && tokenPayload.tokenVersion !== dbUser.tokenVersion) {
      return sendError(res, 'Sessiya muddati tugagan yoki parol o‘zgartirilgan. Qaytadan kiring.', 401);
    }

    req.user = {
      userId: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
      departmentId: dbUser.departmentId,
      fullName: dbUser.fullName,
      position: dbUser.position,
      tokenVersion: dbUser.tokenVersion,
    };

    next();
  } catch (error) {
    return sendError(res, 'Yaroqsiz yoki muddati o‘tgan ulanish.', 401);
  }
};

export const authorize = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 'Avval tizimga kiring.', 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(res, 'Ushbu amalni bajarish uchun sizda yetarli ruxsat yo‘q.', 403);
    }

    next();
  };
};
