import { z } from 'zod';

/**
 * Bo'sh qator -> null, aks holda to'g'ri sana formatidagi string.
 * Noto'g'ri sana `new Date()` orqali Prisma xatosiga (500) aylanib ketmasligi uchun.
 */
export const optionalDate = z.preprocess(
  (val) => (typeof val === 'string' && val.trim() === '' ? null : val),
  z
    .string()
    .refine((s) => !Number.isNaN(Date.parse(s)), 'Sana noto‘g‘ri formatda kiritilgan')
    .optional()
    .nullable()
);

/** Bo'sh qator -> null (ixtiyoriy ID maydonlari uchun) */
export const optionalId = z.preprocess(
  (val) => (typeof val === 'string' && val.trim() === '' ? null : val),
  z.string().optional().nullable()
);
