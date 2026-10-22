import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileTypeFromFile } from 'file-type';
import { z } from 'zod';
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

// Vaqtinchalik xavfsiz yuklash katalogi
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `tmp-upload-${uniqueSuffix}`);
  },
});

const ALLOWED_MIME_MAP: Record<string, string[]> = {
  'application/pdf': ['pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
  'application/msword': ['doc', 'cfb'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],
  'application/vnd.ms-excel': ['xls', 'cfb'],
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'application/zip': ['zip'],
};

const upload = multer({
  storage,
  limits: { fileSize: config.MAX_FILE_SIZE_MB * 1024 * 1024 },
});

// Fayl yuklash (Magic-byte tekshiruvi va hujjatga kirish huquqi bilan)
router.post('/upload', authenticate, upload.single('file'), async (req: AuthRequest, res: Response, next) => {
  const file = req.file;
  try {
    const { documentId } = req.body;

    if (!file) {
      return sendError(res, 'Fayl tanlanmagan', 400);
    }

    if (!documentId) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return sendError(res, 'Hujjat ID ko‘rsatilmagan', 400);
    }

    const uuidCheck = z.string().uuid().safeParse(documentId);
    if (!uuidCheck.success) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return sendError(res, 'Noto‘g‘ri hujjat identifikatori (UUID)', 400);
    }

    // 1. Magic bytes orqali faylning haqiqiy turini aniqlash (MIME tekshiruvi)
    const detectedType = await fileTypeFromFile(file.path);
    if (!detectedType || !ALLOWED_MIME_MAP[detectedType.mime]) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return sendError(
        res,
        'Fayl formati noto‘g‘ri yoki ruxsat etilmagan. Faqat PDF, Word, Excel, rasm va ZIP arxivlari qabul qilinadi.',
        400
      );
    }

    // 2. Kengaytmaning haqiqiy fayl turiga mosligini tekshirish
    const originalExt = path.extname(file.originalname).toLowerCase().replace('.', '');
    const allowedExts = ALLOWED_MIME_MAP[detectedType.mime];
    if (originalExt && !allowedExts.includes(originalExt)) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return sendError(
        res,
        `Fayl kengaytmasi (.${originalExt}) haqiqiy fayl turiga (.${detectedType.ext}) mos kelmadi`,
        400
      );
    }

    // 3. Kengaytmani faqat aniqlangan turdan olgan holda yakuniy fayl nomini belgilash
    const finalFilename = `doc-${Date.now()}-${Math.round(Math.random() * 1e9)}.${detectedType.ext}`;
    const finalFilePath = path.join(UPLOAD_DIR, finalFilename);
    fs.renameSync(file.path, finalFilePath);

    // 4. Hujjat mavjudligi va ruxsat tekshiruvi
    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      include: { approvals: true, tasks: true },
    });

    if (!doc) {
      if (fs.existsSync(finalFilePath)) fs.unlinkSync(finalFilePath);
      return sendError(res, 'Hujjat topilmadi', 404);
    }

    if (!canViewDocument(req.user!, doc)) {
      if (fs.existsSync(finalFilePath)) fs.unlinkSync(finalFilePath);
      return sendError(res, 'Ushbu hujjatga fayl biriktirish uchun sizda ruxsat yo‘q', 403);
    }

    const docFile = await prisma.documentFile.create({
      data: {
        documentId,
        originalName: Buffer.from(file.originalname, 'latin1').toString('utf8'),
        fileName: finalFilename,
        filePath: finalFilePath,
        fileSize: file.size,
        mimeType: detectedType.mime,
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
      details: `Fayl biriktirildi: ${docFile.originalName} (${(docFile.fileSize / 1024).toFixed(1)} KB, MIME: ${docFile.mimeType})`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      requestId: (req as any).id,
    });

    return sendSuccess(res, docFile, 'Fayl muvaffaqiyatli yuklandi', 201);
  } catch (error) {
    if (file && fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path);
      } catch {}
    }
    next(error);
  }
});

// Faylni xavfsiz yuklab olish (Ruxsat tekshiruvi, RFC 5987 va nosniff bilan)
router.get('/:id/download', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { id } = req.params;

    const uuidCheck = z.string().uuid().safeParse(id);
    if (!uuidCheck.success) {
      return sendError(res, 'Noto‘g‘ri fayl identifikatori', 400);
    }

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
      requestId: (req as any).id,
    });

    // X-Content-Type-Options: nosniff
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Type', docFile.mimeType || 'application/octet-stream');

    // RFC 5987 Content-Disposition
    const safeAsciiName = docFile.originalName.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_');
    const rfc5987Encoded = encodeURIComponent(docFile.originalName).replace(/['()]/g, escape).replace(/\*/g, '%2A');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeAsciiName}"; filename*=UTF-8''${rfc5987Encoded}`
    );

    return fs.createReadStream(docFile.filePath).pipe(res);
  } catch (error) {
    next(error);
  }
});

// Faylni o'chirish (Faqat yuklagan, hujjat egasi yoki SUPER_ADMIN; diskdan ham o'chirish va audit log)
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { id } = req.params;

    const uuidCheck = z.string().uuid().safeParse(id);
    if (!uuidCheck.success) {
      return sendError(res, 'Noto‘g‘ri fayl identifikatori', 400);
    }

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

    // Diskdan o'chirish
    if (fs.existsSync(docFile.filePath)) {
      try {
        fs.unlinkSync(docFile.filePath);
      } catch (err) {
        console.error(`[File Delete Error] Could not remove file on disk: ${docFile.filePath}`, err);
      }
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
      requestId: (req as any).id,
    });

    return sendSuccess(res, null, 'Fayl muvaffaqiyatli o‘chirildi');
  } catch (error) {
    next(error);
  }
});

export default router;
