import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { sendError } from '../utils/response.js';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('[Error Details]:', err);

  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return sendError(res, 'Kiritilgan ma’lumotlar noto‘g‘ri', 422, formattedErrors);
  }

  if (err.code === 'P2002') {
    return sendError(res, 'Bu ma’lumot allaqachon mavjud (takroriy yozuv)', 409, err.meta);
  }

  if (err.name === 'UnauthorizedError') {
    return sendError(res, 'Ruxsat etilmagan so‘rov', 401);
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Serverda ichki xatolik yuz berdi';

  return sendError(res, message, statusCode);
};
