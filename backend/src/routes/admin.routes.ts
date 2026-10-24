import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { config } from '../config.js';
import { sendSuccess } from '../utils/response.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';
import { logActivity } from '../middleware/audit.js';

const router = Router();

const UPLOAD_DIR = path.resolve(process.cwd(), config.UPLOAD_DIR);

export const PURGE_CONFIRM_PHRASE = 'TOZALASH';

const purgeSchema = z.object({
  confirm: z.literal(PURGE_CONFIRM_PHRASE),
});

// Tozalanadigan ma'lumotlar soni (tasdiqlash oynasida ko'rsatish uchun)
router.get('/purge-documents/preview', authenticate, authorize(['SUPER_ADMIN']), async (_req, res, next) => {
  try {
    const [documents, files, tasks, approvals, comments, notifications] = await Promise.all([
      prisma.document.count(),
      prisma.documentFile.count(),
      prisma.task.count(),
      prisma.documentApproval.count(),
      prisma.documentComment.count(),
      prisma.notification.count(),
    ]);
    return sendSuccess(res, { documents, files, tasks, approvals, comments, notifications }, 'Tozalash ko‘rinishi');
  } catch (error) {
    next(error);
  }
});

// Barcha hujjat, fayl, vazifa va hisobot ma'lumotlarini o'chirish (faqat Super Admin).
// Foydalanuvchilar, bo'limlar va audit jurnali saqlanadi; hujjat raqamlash 1 dan boshlanadi.
router.post('/purge-documents', authenticate, authorize(['SUPER_ADMIN']), async (req: AuthRequest, res, next) => {
  try {
    const parsed = purgeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: `Tasdiqlash uchun "${PURGE_CONFIRM_PHRASE}" so‘zini kiriting`,
      });
    }

    const counts = await prisma.$transaction(async (tx) => {
      const result = {
        documents: await tx.document.count(),
        files: await tx.documentFile.count(),
        tasks: await tx.task.count(),
      };
      // Bog'liq yozuvlar (fayl, tasdiq, vazifa, izoh, tarix) Document orqali cascade o'chadi
      await tx.document.deleteMany();
      await tx.notification.deleteMany();
      await tx.documentCounter.deleteMany();
      return result;
    });

    // Bazadan keyin diskdagi yuklangan fayllar (to'g'ridan-to'g'ri, ichma-ich papkalarsiz)
    let removedFiles = 0;
    try {
      const entries = await fs.promises.readdir(UPLOAD_DIR, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile()) continue;
        try {
          await fs.promises.unlink(path.join(UPLOAD_DIR, entry.name));
          removedFiles++;
        } catch (err) {
          console.error('Faylni o‘chirib bo‘lmadi:', entry.name, err);
        }
      }
    } catch (err) {
      console.error('Yuklash papkasini o‘qib bo‘lmadi:', err);
    }

    await logActivity({
      userId: req.user!.userId,
      action: 'PURGE_DOCUMENTS',
      entity: 'SYSTEM',
      details: `Barcha hujjatlar tozalandi: ${counts.documents} hujjat, ${counts.files} fayl yozuvi, ${counts.tasks} vazifa, diskdan ${removedFiles} fayl`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      requestId: (req as any).id,
    });

    return sendSuccess(res, { ...counts, removedFiles }, 'Barcha hujjatlar va hisobotlar tozalandi');
  } catch (error) {
    next(error);
  }
});

export default router;
