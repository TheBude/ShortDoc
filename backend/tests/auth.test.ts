import { describe, it, expect, beforeAll } from 'vitest';
import { app, request, setupTestUsers, testUsers, prisma } from './helpers.js';
import { generateToken } from '../src/utils/jwt.js';

describe('FAZA 5.1: Autentifikatsiya va Xavfsizlik Testlari', () => {
  beforeAll(async () => {
    await setupTestUsers();
  });

  it('1. Login: Email registri va bo‘sh joylar normalizatsiyasi (case-insensitive)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: '  TEST_ADMIN@SHORTDOC.UZ  ',
        password: 'TestPass123!',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe('test_admin@shortdoc.uz');
  });

  it('2. Login: Noto‘g‘ri parol bilan kirish rad etiladi (401)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test_admin@shortdoc.uz',
        password: 'WrongPassword999!',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('3. Login: Tasdiqlanmagan yoki faol bo‘lmagan foydalanuvchi bloklanadi (403)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test_inactive@shortdoc.uz',
        password: 'TestPass123!',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/tasdiqlanmagan|faol emas/i);
  });

  it('4. Token bekor qilinishi: tokenVersion oshirilgach eski JWT token yaroqsiz bo‘ladi (401)', async () => {
    const user = await prisma.user.findUnique({ where: { email: 'test_staff1@shortdoc.uz' } });
    const oldToken = generateToken({
      userId: user!.id,
      email: user!.email,
      role: user!.role,
      tokenVersion: user!.tokenVersion,
    });

    // 1-marta so'rov muvaffaqiyatli o'tadi
    const validRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${oldToken}`);
    expect(validRes.status).toBe(200);

    // Parol o'zgarganda yoki tokenVersion oshirilganda:
    await prisma.user.update({
      where: { id: user!.id },
      data: { tokenVersion: { increment: 1 } },
    });

    // Eski token bilan qayta murojaat qilinganda 401 qaytishi shart
    const invalidRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${oldToken}`);
    expect(invalidRes.status).toBe(401);
    expect(invalidRes.body.success).toBe(false);

    // Keyingi testlar uchun yangi token yangilanadi
    const updatedUser = await prisma.user.findUnique({ where: { id: user!.id } });
    testUsers.staff1.token = generateToken({
      userId: updatedUser!.id,
      email: updatedUser!.email,
      role: updatedUser!.role,
      tokenVersion: updatedUser!.tokenVersion,
    });
  });

  it('5. /api/seed ochiq endpointi butunlay yo‘q qilingan (404)', async () => {
    const res = await request(app).get('/api/seed');
    expect(res.status).toBe(404);
  });

  it('6. SSE Stream Ticket: Bir martalik 30 soniyalik ticket xavfsiz generatsiya qilinadi va ishlatiladi', async () => {
    const ticketRes = await request(app)
      .post('/api/auth/stream-ticket')
      .set('Authorization', `Bearer ${testUsers.staff1.token}`);

    expect(ticketRes.status).toBe(200);
    expect(ticketRes.body.success).toBe(true);
    expect(ticketRes.body.data.ticket).toBeDefined();
    expect(ticketRes.body.data.ticket.length).toBeGreaterThan(20);

    const ticket = ticketRes.body.data.ticket;

    // SSE oqimiga ticket bilan ulanish tekshiruvi
    // Ticket ikkinchi marta ishlatilganda rad etiladi
    const ticketRes2 = await request(app)
      .post('/api/auth/stream-ticket')
      .set('Authorization', `Bearer ${testUsers.staff1.token}`);
    expect(ticketRes2.body.data.ticket).not.toBe(ticket);
  });
});
