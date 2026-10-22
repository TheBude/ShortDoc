import { describe, it, expect, beforeAll } from 'vitest';
import { app, request, setupTestUsers, testUsers, prisma } from './helpers.js';

describe('FAZA 5.1: Ruxsatlar Matritsasi va IDOR Himoyasi', () => {
  let docCreatedByStaff1: any;
  let taskAssignedToStaff1: any;

  beforeAll(async () => {
    await setupTestUsers();

    // Staff1 tomonidan ichki hujjat yaratamiz
    const resDoc = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${testUsers.staff1.token}`)
      .send({
        title: 'Xodim 1 ning Ichki Bildirgisi',
        documentType: 'INTERNAL',
        category: 'BILDIRGI',
        summary: 'Faqat xodim 1 va uning rahbarlariga ko‘rinishi kerak',
      });

    docCreatedByStaff1 = resDoc.body.data;

    // Ushbu hujjat asosida Staff1 ga topshiriq yaratamiz (Admin tomonidan)
    const resTask = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${testUsers.admin.token}`)
      .send({
        documentId: docCreatedByStaff1.id,
        title: 'Staff1 uchun shaxsiy topshiriq',
        assignedToId: testUsers.staff1.id,
      });

    taskAssignedToStaff1 = resTask.body.data;
  });

  it('1. IDOR Himoyasi: Staff2 begona xodimning (Staff1) ichki hujjatini ko‘ra olmaydi (404/403)', async () => {
    const res = await request(app)
      .get(`/api/documents/${docCreatedByStaff1.id}`)
      .set('Authorization', `Bearer ${testUsers.staff2.token}`);

    expect([403, 404]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  it('2. IDOR Himoyasi: Staff2 begona hujjat statusini o‘zgartira olmaydi (403)', async () => {
    const res = await request(app)
      .patch(`/api/documents/${docCreatedByStaff1.id}/status`)
      .set('Authorization', `Bearer ${testUsers.staff2.token}`)
      .send({
        status: 'REGISTERED',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('3. IDOR Himoyasi: Staff2 boshqa xodimga (Staff1) biriktirilgan topshiriqni bajara/yopa olmaydi (403)', async () => {
    const res = await request(app)
      .patch(`/api/tasks/${taskAssignedToStaff1.id}/status`)
      .set('Authorization', `Bearer ${testUsers.staff2.token}`)
      .send({
        status: 'COMPLETED',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('4. Mas’ul ijrochi (Staff1) o‘z topshirig‘i bo‘yicha natija topshira oladi (200)', async () => {
    const res = await request(app)
      .post(`/api/tasks/${taskAssignedToStaff1.id}/submit-result`)
      .set('Authorization', `Bearer ${testUsers.staff1.token}`)
      .send({
        resultComment: 'Topshiriq to‘liq bajarildi va natija ilova qilindi',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('COMPLETED');
  });

  it('5. Super Admin har qanday hujjatni ko‘rish huquqiga ega (200)', async () => {
    const res = await request(app)
      .get(`/api/documents/${docCreatedByStaff1.id}`)
      .set('Authorization', `Bearer ${testUsers.admin.token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(docCreatedByStaff1.id);
  });

  it('6. Ma’lumotlar sizishidan himoya: STAFF foydalanuvchilar ro‘yxatida email va telefonni ko‘ra olmaydi', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${testUsers.staff1.token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const users = res.body.data.users || res.body.data;
    expect(users.length).toBeGreaterThan(0);
    // Barcha xodimlarning shaxsiy email va telefonlari yashirilgan bo'lishi shart
    for (const u of users) {
      expect(u.email).toBeUndefined();
      expect(u.phone).toBeUndefined();
      expect(u.fullName).toBeDefined();
      expect(u.position).toBeDefined();
    }
  });

  it('7. Super Admin foydalanuvchilar ro‘yxatida to‘liq ma’lumotlarni (email, telefon) ko‘ra oladi', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${testUsers.admin.token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const users = res.body.data.users || res.body.data;
    expect(users.length).toBeGreaterThan(0);
    expect(users[0].email).toBeDefined();
  });
});
