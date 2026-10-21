import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/jwt.js';
import { sendError } from '../utils/response.js';
import { prisma } from '../prisma.js';

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
    } else if (req.query?.token && typeof req.query.token === 'string') {
      token = req.query.token;
    }

    if (!token) {
      return sendError(res, 'Autentifikatsiya talab qilinadi. Token topilmadi.', 401);
    }
    const payload = verifyToken(token);

    // Verify user is still active in DB
    const dbUser = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, role: true, departmentId: true, fullName: true, position: true, isActive: true },
    });

    if (!dbUser || !dbUser.isActive) {
      return sendError(res, 'Foydalanuvchi hisobi faol emas yoki mavjud emas.', 403);
    }

    req.user = {
      userId: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
      departmentId: dbUser.departmentId,
      fullName: dbUser.fullName,
      position: dbUser.position,
    };

    next();
  } catch (error) {
    return sendError(res, 'Yaroqsiz yoki muddati o‘tgan token.', 401);
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
