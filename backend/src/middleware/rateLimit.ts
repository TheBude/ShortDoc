import rateLimit from 'express-rate-limit';

// Global API rate limiter: 500 requests per 15 minutes per IP
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'So‘rovlar soni cheklovidan oshib ketdi. Iltimos, 15 daqiqadan so‘ng qayta urinib ko‘ring.',
    data: null,
  },
});

// Login rate limiter: 5 attempts per 15 minutes per IP + email
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = req.body?.email ? String(req.body.email).trim().toLowerCase() : '';
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return `${ip}_${email}`;
  },
  message: {
    success: false,
    message: 'Tizimga kirish uchun urinishlar soni oshib ketdi. Iltimos, 15 daqiqadan so‘ng qayta urinib ko‘ring.',
    data: null,
  },
});

// Register rate limiter: 5 registrations per hour per IP
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Ro‘yxatdan o‘tish so‘rovlari cheklovidan oshib ketdi. Iltimos, 1 soatdan so‘ng qayta urinib ko‘ring.',
    data: null,
  },
});

// Check-email rate limiter: 20 requests per 15 minutes per IP
export const checkEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Email tekshirish so‘rovlari soni cheklovidan oshib ketdi.',
    data: null,
  },
});
