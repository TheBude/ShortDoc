import { describe, it, expect, beforeAll } from 'vitest';
import { app, request, setupTestUsers, testUsers, prisma } from './helpers.js';

describe('FAZA 5.1: Fayllar Xavfsizligi va Magic-Bytes Validatsiyasi', () => {
  let docId: string;
  let uploadedFileId: string;

  beforeAll(async () => {
    await setupTestUsers();

    const docRes = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${testUsers.staff1.token}`)
      .send({
        title: 'Fayl biriktirish uchun hujjat',
        documentType: 'INTERNAL',
        category: 'BILDIRGI',
      });

    docId = docRes.body.data.id;
  });

  it('1. Soxta MIME xavfsizlik filtri: Kengaytmasi .pdf lekin ichi HTML/matn bo‘lgan fayl rad etiladi (400)', async () => {
    const fakePdfContent = Buffer.from('<html><script>alert("hack")</script></html>');

    const res = await request(app)
      .post('/api/document-files/upload')
      .set('Authorization', `Bearer ${testUsers.staff1.token}`)
      .field('documentId', docId)
      .attach('file', fakePdfContent, 'contract_fake.pdf');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/noto‘g‘ri|ruxsat etilmagan|mos kelmadi/i);
  });

  it('2. Haqiqiy PDF fayl (%PDF magic bytes) muvaffaqiyatli qabul qilinadi (201)', async () => {
    // Haqiqiy PDF sarlavhasi bilan buffer
    const validPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');

    const res = await request(app)
      .post('/api/document-files/upload')
      .set('Authorization', `Bearer ${testUsers.staff1.token}`)
      .field('documentId', docId)
      .attach('file', validPdfBuffer, 'official_document.pdf');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    uploadedFileId = res.body.data.id;
  });

  it('3. Ruxsatsiz yuklab olishdan himoya: Begona xodim (Staff2) faylni yuklab ololmaydi (403/404)', async () => {
    const res = await request(app)
      .get(`/api/document-files/${uploadedFileId}/download`)
      .set('Authorization', `Bearer ${testUsers.staff2.token}`);

    expect([403, 404]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  it('4. Ruxsatsiz o‘chirishdan himoya: Begona xodim (Staff2) faylni o‘chira olmaydi (403)', async () => {
    const res = await request(app)
      .delete(`/api/document-files/${uploadedFileId}`)
      .set('Authorization', `Bearer ${testUsers.staff2.token}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('5. Fayl egasi yoki Super Admin faylni xavfsiz o‘chira oladi (200)', async () => {
    const res = await request(app)
      .delete(`/api/document-files/${uploadedFileId}`)
      .set('Authorization', `Bearer ${testUsers.staff1.token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
