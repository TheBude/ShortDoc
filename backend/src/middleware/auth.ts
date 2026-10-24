import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/jwt.js';
import { sendError } from '../utils/response.js';
import { prisma } from '../prisma.js';
import { config } from '../config.js';
import { consumeStreamTicket } from '../services/ticket.service.js';

export interface AuthRequest extends Request {
  user?: JwtPayload & {
    fullName?: string;
    position?: string;
  };
}

const authUserSelect = {
  id: true,
  email: true,
  role: true,
  departmentId: true,
  fullName: true,
  position: true,
  isActive: true,
  tokenVersion: true,
} as const;

type AuthUserRecord = {
  id: string;
  email: string;
  role: string;
  departmentId: string | null;
  fullName: string;
  position: string;
  isActive: boolean;
  tokenVersion: number;
};

// Har bir so'rovda bazaga murojaat qilmaslik uchun foydalanuvchi holati qisqa muddatga keshlanadi.
// Rol/faollik/parol o'zgarganda `invalidateUserCache` chaqiriladi, shuning uchun eskirish muddati kichik.
const USER_CACHE_TTL_MS = 5_000;
const USER_CACHE_MAX_SIZE = 2_000;
const userCache = new Map<string, { user: AuthUserRecord; expiresAt: number }>();

export const invalidateUserCache = (userId?: string) => {
  if (userId) userCache.delete(userId);
  else userCache.clear();
};

async function loadAuthUser(userId: string): Promise<AuthUserRecord | null> {
  // Testlar bazani to'g'ridan-to'g'ri o'zgartiradi, shuning uchun test muhitida kesh o'chirilgan
  const useCache = !config.isTest;

  if (useCache) {
    const hit = userCache.get(userId);
    if (hit && hit.expiresAt > Date.now()) return hit.user;
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: authUserSelect });

  if (user && useCache) {
    if (userCache.size >= USER_CACHE_MAX_SIZE) userCache.clear();
    userCache.set(userId, { user, expiresAt: Date.now() + USER_CACHE_TTL_MS });
  }

  return user;
}

const toRequestUser = (dbUser: AuthUserRecord): NonNullable<AuthRequest['user']> => ({
  userId: dbUser.id,
  email: dbUser.email,
  role: dbUser.role,
  departmentId: dbUser.departmentId,
  fullName: dbUser.fullName,
  position: dbUser.position,
  tokenVersion: dbUser.tokenVersion,
});

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

    let payload: JwtPayload;
    try {
      payload = verifyToken(token);
    } catch {
      return sendError(res, 'Yaroqsiz yoki muddati o‘tgan token.', 401);
    }

    // Foydalanuvchi hali faol ekanini va tokenVersion mosligini tekshirish
    const dbUser = await loadAuthUser(payload.userId);

    if (!dbUser || !dbUser.isActive) {
      return sendError(res, 'Foydalanuvchi hisobi faol emas yoki mavjud emas.', 403);
    }

    // Parol o'zgartirilgandan so'ng eski tokenlarni bekor qilish
    if (typeof payload.tokenVersion === 'number' && payload.tokenVersion !== dbUser.tokenVersion) {
      return sendError(res, 'Sessiya muddati tugagan yoki parol o‘zgartirilgan. Qaytadan kiring.', 401);
    }

    req.user = toRequestUser(dbUser);
    next();
  } catch (error) {
    // Baza xatosi kabi ichki muammolar 401 emas, 500 bo'lishi kerak (aks holda frontend foydalanuvchini tizimdan chiqarib yuboradi)
    next(error);
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
      try {
        tokenPayload = verifyToken(token);
      } catch {
        return sendError(res, 'Yaroqsiz yoki muddati o‘tgan ulanish.', 401);
      }
      userId = tokenPayload.userId;
    }

    // 2. Check one-time short-lived ticket
    if (!userId && req.query?.ticket && typeof req.query.ticket === 'string') {
      userId = consumeStreamTicket(req.query.ticket);
    }

    if (!userId) {
      return sendError(res, 'SSE ulanishi uchun ruxsat berilmadi. Yaroqli ticket yoki token taqdim etilmadi.', 401);
    }

    const dbUser = await loadAuthUser(userId);

    if (!dbUser || !dbUser.isActive) {
      return sendError(res, 'Foydalanuvchi hisobi faol emas yoki mavjud emas.', 403);
    }

    if (tokenPayload && typeof tokenPayload.tokenVersion === 'number' && tokenPayload.tokenVersion !== dbUser.tokenVersion) {
      return sendError(res, 'Sessiya muddati tugagan yoki parol o‘zgartirilgan. Qaytadan kiring.', 401);
    }

    req.user = toRequestUser(dbUser);
    next();
  } catch (error) {
    next(error);
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
