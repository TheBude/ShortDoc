import { describe, it, expect, beforeAll } from 'vitest';
import { app, request, setupTestUsers, testUsers } from './helpers.js';

describe('FAZA 5.1: Ommaviy Tekshirish (Public Verify) va Ma’lumotlar Xavfsizligi', () => {
  let docId: string;

  beforeAll(async () => {
    await setupTestUsers();

    const docRes = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${testUsers.rector.token}`)
      .send({
        title: 'Universitet Bo‘yicha Rasmiy Buyruq',
        documentType: 'INTERNAL',
        category: 'ORDER',
        summary: 'Ushbu xulosa ichki maxfiy hisoblanadi',
      });

    docId = docRes.body.data.id;
  });

  it('1. Public verify: Token talab qilinmaydi va hujjat haqiqiyligi tasdiqlanadi (200)', async () => {
    const res = await request(app).get(`/api/documents/${docId}/public-verify`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isAuthentic).toBe(true);
    expect(res.body.data.regNumber).toBeDefined();
    expect(res.body.data.title).toBeDefined();
  });

  it('2. Maxfiylik tekshiruvi: Maxfiy ichki maydonlar (passwordHash, tokenVersion, summary, ichki ID lar) chiqmaydi', async () => {
    const res = await request(app).get(`/api/documents/${docId}/public-verify`);

    const data = res.body.data;
    expect(data.passwordHash).toBeUndefined();
    expect(data.tokenVersion).toBeUndefined();
    expect(data.summary).toBeUndefined();
    expect(data.creatorId).toBeUndefined();
    expect(data.assigneeId).toBeUndefined();
  });

  it('3. Noto‘g‘ri formatdagi ID (non-UUID) uchun 400 qaytadi', async () => {
    const res = await request(app).get('/api/documents/invalid-id-format/public-verify');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('4. Mavjud bo‘lmagan UUID uchun 404 qaytadi', async () => {
    const nonExistentUuid = '00000000-0000-0000-0000-000000000000';
    const res = await request(app).get(`/api/documents/${nonExistentUuid}/public-verify`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
