import { describe, it, expect, beforeAll } from 'vitest';
import { app, request, setupTestUsers, testUsers, prisma } from './helpers.js';

describe('FAZA 5.1: Viza Zanjiri va Hujjat Holatlari State Machine', () => {
  let docWithApprovals: any;

  beforeAll(async () => {
    await setupTestUsers();

    // 2 bosqichli kelishuv zanjiriga ega hujjat yaratamiz:
    // 1-bosqich: head (Bo'lim boshlig'i)
    // 2-bosqich: rector (Rektor)
    const docRes = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${testUsers.staff1.token}`)
      .send({
        title: 'Moliya masalasida bildirishnoma (Vizalash uchun)',
        documentType: 'INTERNAL',
        category: 'BILDIRGI',
        approverIds: [testUsers.head.id, testUsers.rector.id],
      });

    docWithApprovals = docRes.body.data;
  });

  it('1. Vizalash uchun yuborilgan hujjat statusi IN_APPROVAL bo‘ladi', async () => {
    const res = await request(app)
      .get(`/api/documents/${docWithApprovals.id}`)
      .set('Authorization', `Bearer ${testUsers.admin.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('IN_APPROVAL');
  });

  it('2. Navbat buzilishi taqiqlanadi: 1-bosqich tasdiqlanmasdan 2-bosqich (Rektor) imzolay olmaydi (403)', async () => {
    const res = await request(app)
      .post(`/api/documents/${docWithApprovals.id}/approvals`)
      .set('Authorization', `Bearer ${testUsers.rector.token}`)
      .send({
        status: 'APPROVED',
        comments: 'Rektor imzosi',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/navbat/i);
  });

  it('3. 1-bosqich kelishuvchi (Bo‘lim boshlig‘i) o‘z navbatida imzolaydi (200)', async () => {
    const res = await request(app)
      .post(`/api/documents/${docWithApprovals.id}/approvals`)
      .set('Authorization', `Bearer ${testUsers.head.token}`)
      .send({
        status: 'APPROVED',
        comments: 'Bo‘lim boshlig‘i kelishdi',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('APPROVED');
  });

  it('4. Qayta imzolash taqiqlanadi: 1-bosqich yana qayta imzolay olmaydi (403)', async () => {
    const res = await request(app)
      .post(`/api/documents/${docWithApprovals.id}/approvals`)
      .set('Authorization', `Bearer ${testUsers.head.token}`)
      .send({
        status: 'APPROVED',
        comments: 'Takroriy imzo',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/navbatdagi kelishuvchi emassiz|allaqachon/i);
  });

  it('5. 2-bosqich (oxirgi) imzolangach, hujjat avtomatik IN_EXECUTION holatiga o‘tadi', async () => {
    const res = await request(app)
      .post(`/api/documents/${docWithApprovals.id}/approvals`)
      .set('Authorization', `Bearer ${testUsers.rector.token}`)
      .send({
        status: 'APPROVED',
        comments: 'Rektor tasdiqladi',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Hujjat holatini tekshiramiz: barcha vizalar qo'yilgach IN_EXECUTION bo'ladi
    const updatedDoc = await prisma.document.findUnique({
      where: { id: docWithApprovals.id },
      select: { status: true },
    });
    expect(updatedDoc!.status).toBe('IN_EXECUTION');
  });

  it('6. State Machine: Ruxsat etilmagan status o‘tishlari qat’iy 409 Conflict qaytaradi', async () => {
    // IN_EXECUTION dan to'g'ridan-to'g'ri NEW ga o'tish taqiqlangan
    const conflictRes1 = await request(app)
      .patch(`/api/documents/${docWithApprovals.id}/status`)
      .set('Authorization', `Bearer ${testUsers.admin.token}`)
      .send({
        status: 'NEW',
      });

    expect(conflictRes1.status).toBe(409);
    expect(conflictRes1.body.success).toBe(false);
  });

  it('7. Rad etish (REJECTED): Viza beruvchi rad etsa, hujjat REJECTED holatiga o‘tadi', async () => {
    // Yangi viza hujjati
    const docRes = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${testUsers.staff1.token}`)
      .send({
        title: 'Rad etilishi lozim bo‘lgan ariza',
        documentType: 'INTERNAL',
        category: 'APPLICATION',
        approverIds: [testUsers.head.id],
      });

    const docId = docRes.body.data.id;

    const rejectRes = await request(app)
      .post(`/api/documents/${docId}/approvals`)
      .set('Authorization', `Bearer ${testUsers.head.token}`)
      .send({
        status: 'REJECTED',
        comments: 'Talablar bajarilmaganligi sababli rad etildi',
      });

    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.success).toBe(true);

    const doc = await prisma.document.findUnique({
      where: { id: docId },
      select: { status: true },
    });
    expect(doc!.status).toBe('REJECTED');
  });
});

describe('Kelishuvchi -> imzolovchi oqimi', () => {
  let doc: any;

  beforeAll(async () => {
    await setupTestUsers();
    const res = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${testUsers.staff1.token}`)
      .send({
        title: 'Kelishuvchi va imzolovchi sinovi',
        documentType: 'INTERNAL',
        category: 'BILDIRGI',
        reviewerIds: [testUsers.head.id],
        signerId: testUsers.rector.id,
      });
    doc = res.body.data;
  });

  it('Kelishuvchi bo‘lsa, imzolovchi ko‘rsatilishi shart (400)', async () => {
    const res = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${testUsers.staff1.token}`)
      .send({ title: 'Imzolovchisiz zanjir', reviewerIds: [testUsers.head.id] });
    expect(res.status).toBe(400);
  });

  it('Imzolovchi kelishuvchilar orasida bo‘la olmaydi (400)', async () => {
    const res = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${testUsers.staff1.token}`)
      .send({ title: 'Takroriy shaxs', reviewerIds: [testUsers.head.id], signerId: testUsers.head.id });
    expect(res.status).toBe(400);
  });

  it('Zanjir rollari saqlanadi: kelishuvchi 1-bosqich, imzolovchi oxirgi', async () => {
    const rows = await prisma.documentApproval.findMany({ where: { documentId: doc.id }, orderBy: { stepOrder: 'asc' } });
    expect(rows.map((r) => r.role)).toEqual(['REVIEWER', 'SIGNER']);
  });

  it('Imzolovchiga xabar faqat kelishuvchi tasdiqlagach boradi', async () => {
    const before = await prisma.notification.count({ where: { userId: testUsers.rector.id, link: `/documents/${doc.id}` } });
    expect(before).toBe(0);

    const ok = await request(app)
      .post(`/api/documents/${doc.id}/approvals`)
      .set('Authorization', `Bearer ${testUsers.head.token}`)
      .send({ status: 'APPROVED' });
    expect(ok.status).toBe(200);

    const after = await prisma.notification.count({ where: { userId: testUsers.rector.id, link: `/documents/${doc.id}` } });
    expect(after).toBe(1);
  });
});
