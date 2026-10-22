import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../prisma.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { logActivity } from '../middleware/audit.js';
import { config } from '../config.js';
import { canViewDocument, canAccessFile } from '../services/access.js';

const router = Router();

const UPLOAD_DIR = path.resolve(process.cwd(), config.UPLOAD_DIR);
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
  limits: { fileSize: config.MAX_FILE_SIZE_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Faqat PDF, Word, Excel yoki rasm formatidagi fayllar qabul qilinadi.'));
    }
  },
});

// Fayl yuklash (Hujjatga kirish huquqi tekshiruvi bilan)
router.post('/upload', authenticate, upload.single('file'), async (req: AuthRequest, res: Response, next) => {
  try {
    const { documentId } = req.body;
    const file = req.file;

    if (!file) {
      return sendError(res, 'Fayl tanlanmagan', 400);
    }

    if (!documentId) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return sendError(res, 'Hujjat ID ko‘rsatilmagan', 400);
    }

    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      include: { approvals: true, tasks: true },
    });

    if (!doc) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return sendError(res, 'Hujjat topilmadi', 404);
    }

    if (!canViewDocument(req.user!, doc)) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return sendError(res, 'Ushbu hujjatga fayl biriktirish uchun sizda ruxsat yo‘q', 403);
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
      include: {
        document: {
          include: { approvals: true, tasks: true },
        },
      },
    });

    if (!docFile) {
      return sendError(res, 'Fayl topilmadi', 404);
    }

    if (!canAccessFile(req.user!, docFile, docFile.document)) {
      return sendError(res, 'Ushbu faylni ko‘rish va yuklab olish uchun sizda ruxsat yo‘q', 403);
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

// Faylni o'chirish (Ruxsat va audit log bilan)
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { id } = req.params;

    const docFile = await prisma.documentFile.findUnique({
      where: { id },
      include: { document: true },
    });

    if (!docFile) {
      return sendError(res, 'Fayl topilmadi', 404);
    }

    const canDelete =
      req.user!.role === 'SUPER_ADMIN' ||
      docFile.uploadedById === req.user!.userId ||
      docFile.document.creatorId === req.user!.userId;

    if (!canDelete) {
      return sendError(res, 'Ushbu faylni o‘chirish uchun sizda ruxsat yo‘q', 403);
    }

    if (fs.existsSync(docFile.filePath)) {
      try {
        fs.unlinkSync(docFile.filePath);
      } catch {}
    }

    await prisma.documentFile.delete({ where: { id } });

    await logActivity({
      userId: req.user!.userId,
      action: 'DELETE_FILE',
      entity: 'DOCUMENT_FILE',
      entityId: docFile.id,
      details: `Fayl o‘chirildi: ${docFile.originalName}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return sendSuccess(res, null, 'Fayl muvaffaqiyatli o‘chirildi');
  } catch (error) {
    next(error);
  }
});

export default router;
