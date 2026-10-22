import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import multer from 'multer';
import { config } from '../config.js';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const reqId = (req as any).id || (req.headers['x-request-id'] as string) || 'unknown';
  console.error(`[Error] [RequestId: ${reqId}] [${req.method} ${req.originalUrl}]:`, err);

  // 1. Zod validatsiya xatoligi
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return res.status(422).json({
      success: false,
      message: 'Kiritilgan ma’lumotlar noto‘g‘ri',
      errors: formattedErrors,
      requestId: reqId,
    });
  }

  // 2. Multer fayl yuklash xatoliklari (hajm chegarasi va h.k.)
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        message: `Fayl hajmi ruxsat etilgan maksimal miqdordan (${config.MAX_FILE_SIZE_MB} MB) oshib ketdi`,
        requestId: reqId,
      });
    }
    return res.status(400).json({
      success: false,
      message: `Fayl yuklashda xatolik: ${err.message}`,
      requestId: reqId,
    });
  }

  // 3. Fayl filtri yoki MIME xatoliklari
  if (err.name === 'MulterError' || (typeof err.message === 'string' && err.message.toLowerCase().includes('fayl'))) {
    return res.status(400).json({
      success: false,
      message: err.message,
      requestId: reqId,
    });
  }

  // 4. Prisma ma'lumotlar bazasi xatoliklari
  // P2025: Record not found
  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      message: 'So‘ralgan ma’lumot bazadan topilmadi',
      requestId: reqId,
    });
  }

  // P2003: Foreign key constraint failed
  if (err.code === 'P2003') {
    return res.status(409).json({
      success: false,
      message: 'Bog‘liq ma’lumotlar mavjudligi sababli ushbu amalni bajarib bo‘lmaydi',
      requestId: reqId,
    });
  }

  // P2002: Unique constraint failed
  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      message: 'Bu ma’lumot allaqachon mavjud (takroriy yozuv)',
      requestId: reqId,
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      message: 'Ruxsat etilmagan so‘rov',
      requestId: reqId,
    });
  }

  const statusCode = typeof err.statusCode === 'number' ? err.statusCode : 500;

  // 5. Production xavfsizligi: 500 xatolarda ichki xabar va stack trace chiqmasin
  let message = err.message || 'Serverda ichki xatolik yuz berdi';
  if (statusCode === 500 && config.NODE_ENV === 'production') {
    message = 'Serverda ichki xatolik yuz berdi';
  }

  return res.status(statusCode).json({
    success: false,
    message,
    requestId: reqId,
  });
};
