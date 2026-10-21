import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../prisma.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { logActivity } from '../middleware/audit.js';

const router = Router();

const UPLOAD_DIR = path.resolve(process.cwd(), process.env.UPLOAD_DIR || './uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Xavfsiz saqlash sozlamasi
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `doc-${uniqueSuffix}${ext}`);
  },
});

const allowedMimes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
];

const upload = multer({
  storage,
  limits: { fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB || '25', 10)) * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Faqat PDF, Word, Excel yoki rasm formatidagi fayllar qabul qilinadi.'));
    }
  },
});

// Fayl yuklash (Hujjatga biriktirish)
router.post('/upload', authenticate, upload.single('file'), async (req: AuthRequest, res: Response, next) => {
  try {
    const { documentId } = req.body;
    const file = req.file;

    if (!file) {
      return sendError(res, 'Fayl tanlanmagan', 400);
    }

    if (!documentId) {
      // Yuklangan faylni o'chirib tashlash
      fs.unlinkSync(file.path);
      return sendError(res, 'Hujjat ID ko‘rsatilmagan', 400);
    }

    const doc = await prisma.document.findUnique({ where: { id: documentId } });
    if (!doc) {
      fs.unlinkSync(file.path);
      return sendError(res, 'Hujjat topilmadi', 404);
    }

    const docFile = await prisma.documentFile.create({
      data: {
        documentId,
        originalName: Buffer.from(file.originalname, 'latin1').toString('utf8'),
        fileName: file.filename,
        filePath: file.path,
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadedById: req.user!.userId,
      },
      include: {
        uploadedBy: { select: { id: true, fullName: true } },
      },
    });

    await logActivity({
      userId: req.user!.userId,
      action: 'UPLOAD_FILE',
      entity: 'DOCUMENT_FILE',
      entityId: docFile.id,
      details: `Fayl biriktirildi: ${docFile.originalName} (${(docFile.fileSize / 1024).toFixed(1)} KB)`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return sendSuccess(res, docFile, 'Fayl muvaffaqiyatli yuklandi', 201);
  } catch (error) {
    next(error);
  }
});

// Faylni xavfsiz yuklab olish (Ruxsat tekshiruvi bilan)
router.get('/:id/download', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { id } = req.params;

    const docFile = await prisma.documentFile.findUnique({
      where: { id },
      include: { document: true },
    });

    if (!docFile) {
      return sendError(res, 'Fayl topilmadi', 404);
    }

    // Ruxsat tekshiruvi: Oddiy xodim bo'lsa, o'ziga tegishlimi?
    if (req.user!.role === 'STAFF') {
      const hasAccess =
        docFile.document.creatorId === req.user!.userId ||
        docFile.document.assigneeId === req.user!.userId ||
        docFile.uploadedById === req.user!.userId;

      if (!hasAccess) {
        return sendError(res, 'Ushbu faylni ko‘rish uchun sizda ruxsat yo‘q', 403);
      }
    }

    if (!fs.existsSync(docFile.filePath)) {
      return sendError(res, 'Fayl server diskida topilmadi', 404);
    }

    await logActivity({
      userId: req.user!.userId,
      action: 'DOWNLOAD_FILE',
      entity: 'DOCUMENT_FILE',
      entityId: docFile.id,
      details: `Fayl yuklab olindi: ${docFile.originalName}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.setHeader('Content-Type', docFile.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(docFile.originalName)}"`);
    return fs.createReadStream(docFile.filePath).pipe(res);
  } catch (error) {
    next(error);
  }
});

export default router;
