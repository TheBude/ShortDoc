import { describe, it, expect, beforeAll } from 'vitest';
import { app, request, setupTestUsers, testUsers, prisma } from './helpers.js';

const auth = (key: keyof typeof testUsers) => ({ Authorization: `Bearer ${testUsers[key].token}` });

const createDoc = async (key: keyof typeof testUsers, body: Record<string, unknown>) => {
  const res = await request(app)
    .post('/api/documents')
    .set(auth(key))
    .send({ documentType: 'INTERNAL', category: 'BILDIRGI', ...body });
  expect(res.status).toBe(201);
  return res.body.data;
};

describe('Mantiqiy tuzatishlar: viza poygasi, holat o‘tishlari, topshiriqlar, hisoblagichlar', () => {
  beforeAll(async () => {
    await setupTestUsers();
  });

  it('1. Poyga: bir vaqtda yuborilgan ikkita imzo so‘rovidan faqat bittasi qabul qilinadi', async () => {
    const doc = await createDoc('staff1', { title: 'Poyga sinovi hujjati', approverIds: [testUsers.head.id] });

    const [a, b] = await Promise.all([
      request(app).post(`/api/documents/${doc.id}/approvals`).set(auth('head')).send({ status: 'APPROVED' }),
      request(app).post(`/api/documents/${doc.id}/approvals`).set(auth('head')).send({ status: 'APPROVED' }),
    ]);

    expect([a.status, b.status].filter((s) => s === 200)).toHaveLength(1);
    expect([a.status, b.status].filter((s) => s !== 200)[0]).toBeGreaterThanOrEqual(400);

    const approvals = await prisma.documentApproval.findMany({ where: { documentId: doc.id } });
    expect(approvals.filter((x) => x.status === 'APPROVED')).toHaveLength(1);
  });

  it('2. Viza zanjirini chetlab o‘tib bo‘lmaydi: yaratuvchi IN_APPROVAL hujjatni ijroga o‘tkaza olmaydi (409), SuperAdmin oladi', async () => {
    const doc = await createDoc('staff1', {
      title: 'Imzosiz ijroga o‘tkazish sinovi',
      approverIds: [testUsers.head.id, testUsers.rector.id],
    });

    const byCreator = await request(app)
      .patch(`/api/documents/${doc.id}/status`)
      .set(auth('staff1'))
      .send({ status: 'IN_EXECUTION' });
    expect(byCreator.status).toBe(409);

    const byAdmin = await request(app)
      .patch(`/api/documents/${doc.id}/status`)
      .set(auth('admin'))
      .send({ status: 'IN_EXECUTION', reason: 'Favqulodda ijro' });
    expect(byAdmin.status).toBe(200);
    expect(byAdmin.body.data.status).toBe('IN_EXECUTION');
  });

  it('3. Kelishuvchisiz hujjatni IN_APPROVAL ga o‘tkazib bo‘lmaydi (409)', async () => {
    const doc = await createDoc('staff1', { title: 'Kelishuvchisiz hujjat' });

    const res = await request(app)
      .patch(`/api/documents/${doc.id}/status`)
      .set(auth('staff1'))
      .send({ status: 'IN_APPROVAL' });
    expect(res.status).toBe(409);
  });

  it('4. Bir xil holatga o‘tkazish tarixga ortiqcha yozuv qo‘shmaydi', async () => {
    const doc = await createDoc('staff1', { title: 'Bir xil holat sinovi' });
    const before = await prisma.documentStatusHistory.count({ where: { documentId: doc.id } });

    const res = await request(app)
      .patch(`/api/documents/${doc.id}/status`)
      .set(auth('staff1'))
      .send({ status: 'REGISTERED' });
    expect(res.status).toBe(200);

    const after = await prisma.documentStatusHistory.count({ where: { documentId: doc.id } });
    expect(after).toBe(before);
  });

  it('5. Bekor qilingan topshiriq hujjat yakunlanishiga to‘sqinlik qilmaydi', async () => {
    const doc = await createDoc('staff1', { title: 'Topshiriqli hujjat' });

    await request(app).patch(`/api/documents/${doc.id}/status`).set(auth('admin')).send({ status: 'IN_EXECUTION' });

    const t1 = await request(app)
      .post('/api/tasks')
      .set(auth('admin'))
      .send({ documentId: doc.id, title: 'Asosiy topshiriq', assignedToId: testUsers.staff1.id });
    const t2 = await request(app)
      .post('/api/tasks')
      .set(auth('admin'))
      .send({ documentId: doc.id, title: 'Bekor qilinadigan topshiriq', assignedToId: testUsers.staff2.id });
    expect(t1.status).toBe(201);
    expect(t2.status).toBe(201);

    const cancel = await request(app)
      .patch(`/api/tasks/${t2.body.data.id}/status`)
      .set(auth('admin'))
      .send({ status: 'CANCELLED' });
    expect(cancel.status).toBe(200);

    const submit = await request(app)
      .post(`/api/tasks/${t1.body.data.id}/submit-result`)
      .set(auth('staff1'))
      .send({ resultComment: 'Bajarildi' });
    expect(submit.status).toBe(200);

    const updated = await prisma.document.findUnique({ where: { id: doc.id }, select: { status: true } });
    expect(updated!.status).toBe('COMPLETED');

    // Bekor qilingan topshiriq bo'yicha natija topshirib bo'lmaydi
    const late = await request(app)
      .post(`/api/tasks/${t2.body.data.id}/submit-result`)
      .set(auth('staff2'))
      .send({ resultComment: 'Kech' });
    expect(late.status).toBe(409);
  });

  it('6. Rad etilgan hujjatdagi qolgan vizalar "kutilayotgan imzo" hisoblanmaydi', async () => {
    const doc = await createDoc('staff1', {
      title: 'Rad etiladigan hujjat',
      approverIds: [testUsers.head.id, testUsers.rector.id],
    });

    const reject = await request(app)
      .post(`/api/documents/${doc.id}/approvals`)
      .set(auth('head'))
      .send({ status: 'REJECTED', comments: 'Rad' });
    expect(reject.status).toBe(200);

    const expected = await prisma.documentApproval.count({
      where: { approverId: testUsers.rector.id, status: 'PENDING', document: { status: 'IN_APPROVAL' } },
    });

    const counts = await request(app).get('/api/reports/counts').set(auth('rector'));
    expect(counts.status).toBe(200);
    expect(counts.body.data.counts.pendingSignatures).toBe(expected);

    const dashboard = await request(app).get('/api/reports/dashboard').set(auth('rector'));
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.data.counts.pendingSignatures).toBe(expected);
    const listed = dashboard.body.data.actionItems.pendingSignatures.map((d: any) => d.id);
    expect(listed).not.toContain(doc.id);
  });

  it('7. Kiruvchi hujjatni begona xodim ko‘ra olmaydi va unga fayl biriktira olmaydi (403)', async () => {
    const doc = await createDoc('chancellery', { title: 'Kiruvchi xat', documentType: 'INCOMING' });
    const pdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');

    const view = await request(app).get(`/api/documents/${doc.id}`).set(auth('staff2'));
    expect(view.status).toBe(404);

    const list = await request(app).get('/api/documents?limit=100').set(auth('staff2'));
    expect(list.body.data.map((d: any) => d.id)).not.toContain(doc.id);

    const res = await request(app)
      .post('/api/document-files/upload')
      .set(auth('staff2'))
      .field('documentId', doc.id)
      .attach('file', pdf, 'x.pdf');
    expect(res.status).toBe(403);

    const own = await request(app)
      .post('/api/document-files/upload')
      .set(auth('chancellery'))
      .field('documentId', doc.id)
      .attach('file', pdf, 'x.pdf');
    expect(own.status).toBe(201);
  });

  it('7b. Oddiy xodim buyruq yoki kiruvchi hujjat yarata olmaydi (403), rahbariyat esa yaratadi', async () => {
    for (const body of [{ category: 'ORDER' }, { category: 'Qaror' }, { documentType: 'INCOMING' }]) {
      const denied = await request(app)
        .post('/api/documents')
        .set(auth('staff1'))
        .send({ title: 'Cheklangan hujjat', ...body });
      expect(denied.status).toBe(403);
    }
    const allowed = await request(app)
      .post('/api/documents')
      .set(auth('rector'))
      .send({ title: 'Rektor buyrug‘i', category: 'ORDER' });
    expect(allowed.status).toBe(201);
  });

  it('8. Login: faol bo‘lmagan hisob noto‘g‘ri parol bilan 401 qaytaradi (hisob holati oshkor bo‘lmaydi)', async () => {
    const wrong = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test_inactive@shortdoc.uz', password: 'NotThePassword1!' });
    expect(wrong.status).toBe(401);

    const unknown = await request(app)
      .post('/api/auth/login')
      .send({ email: 'no_such_user@shortdoc.uz', password: 'NotThePassword1!' });
    expect(unknown.status).toBe(401);
    expect(unknown.body.message).toBe(wrong.body.message);
  });

  it('9. Noto‘g‘ri sana formati 500 emas, 422 validatsiya xatosini qaytaradi', async () => {
    const res = await request(app)
      .post('/api/documents')
      .set(auth('staff1'))
      .send({ title: 'Noto‘g‘ri muddat', deadline: 'bu-sana-emas' });
    expect(res.status).toBe(422);
  });

  it('10. Mavjud bo‘lmagan bo‘lim yoki mas’ul xodim aniq 400 xatosini beradi', async () => {
    const missingId = '00000000-0000-4000-8000-000000000000';

    const dep = await request(app)
      .post('/api/documents')
      .set(auth('staff1'))
      .send({ title: 'Bo‘limi yo‘q hujjat', departmentId: missingId });
    expect(dep.status).toBe(400);

    const assignee = await request(app)
      .post('/api/documents')
      .set(auth('staff1'))
      .send({ title: 'Mas’uli yo‘q hujjat', assigneeId: missingId });
    expect(assignee.status).toBe(400);
  });

  it('11. SuperAdmin o‘z rolini pasaytira olmaydi va o‘zini nofaol qila olmaydi (400)', async () => {
    const demote = await request(app)
      .put(`/api/users/${testUsers.admin.id}`)
      .set(auth('admin'))
      .send({ role: 'STAFF' });
    expect(demote.status).toBe(400);

    const reject = await request(app).post(`/api/users/${testUsers.admin.id}/reject`).set(auth('admin'));
    expect(reject.status).toBe(400);
  });

  it('12. Oddiy xodimlar tasdiqlanmagan foydalanuvchilarni ro‘yxatda ko‘rmaydi', async () => {
    const res = await request(app).get('/api/users?limit=100').set(auth('staff1'));
    expect(res.status).toBe(200);
    const ids = (res.body.data as any[]).map((u) => u.id);
    expect(ids).not.toContain(testUsers.inactiveStaff.id);

    const adminView = await request(app).get('/api/users?limit=100').set(auth('admin'));
    expect((adminView.body.data as any[]).map((u) => u.id)).toContain(testUsers.inactiveStaff.id);
  });

  it('13. CSV eksportida formula in‘ektsiyasi (=, +, -, @) zararsizlantiriladi', async () => {
    await createDoc('staff1', { title: '=HYPERLINK("http://evil.example","x")' });

    const res = await request(app).get('/api/reports/export-csv').set(auth('admin'));
    expect(res.status).toBe(200);
    expect(res.text).toContain(`"'=HYPERLINK(`);
    expect(res.text).not.toMatch(/,"=HYPERLINK/);
  });

  it('14. Noma’lum API manzili JSON 404 qaytaradi; begona Origin CORS orqali rad etiladi', async () => {
    const notFound = await request(app).get('/api/bunday-manzil-yoq');
    expect(notFound.status).toBe(404);
    expect(notFound.body.success).toBe(false);

    const evil = await request(app).get('/health').set('Origin', 'https://evil-localhost.com');
    expect(evil.status).toBe(403);

    const ok = await request(app).get('/health').set('Origin', 'http://localhost:3000');
    expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:3000');
  });

  it('15. Super Admin foydalanuvchi login (email) va parolini almashtira oladi, oddiy xodim esa ololmaydi', async () => {
    const target = testUsers.staff2;
    const targetUser = await prisma.user.findUniqueOrThrow({ where: { id: target.id } });
    const oldEmail = targetUser.email;
    const newEmail = 'test_staff2_renamed@shortdoc.uz';

    const denied = await request(app)
      .put(`/api/users/${target.id}`)
      .set(auth('staff1'))
      .send({ password: 'NewPass12345!' });
    expect(denied.status).toBe(403);

    const changed = await request(app)
      .put(`/api/users/${target.id}`)
      .set(auth('admin'))
      .send({ email: newEmail, password: 'NewPass12345!' });
    expect(changed.status).toBe(200);
    expect(changed.body.data.email).toBe(newEmail);

    // Eski sessiya bekor qilinadi, yangi login/parol bilan kirish mumkin
    const stale = await request(app).get('/api/auth/me').set(auth('staff2'));
    expect(stale.status).toBe(401);

    const oldLogin = await request(app).post('/api/auth/login').send({ email: oldEmail, password: 'NewPass12345!' });
    expect(oldLogin.status).toBe(401);
    const newLogin = await request(app).post('/api/auth/login').send({ email: newEmail, password: 'NewPass12345!' });
    expect(newLogin.status).toBe(200);

    // Band emailga o'tkazish rad etiladi
    const dup = await request(app).put(`/api/users/${target.id}`).set(auth('admin')).send({ email: testUsers.staff1.email });
    expect(dup.status).toBe(400);

    // Boshqa testlar uchun holatni tiklash
    await request(app).put(`/api/users/${target.id}`).set(auth('admin')).send({ email: oldEmail, password: 'TestPass123!' });
    const relogin = await request(app).post('/api/auth/login').send({ email: oldEmail, password: 'TestPass123!' });
    testUsers.staff2.token = relogin.body.data.token;
  });

  it('16. Super Admin izsiz hisobni ochira oladi; hujjati bor hisob, ozi va oddiy xodim uchun rad etiladi', async () => {
    const bcrypt = (await import('bcryptjs')).default;
    const temp = await prisma.user.create({
      data: {
        email: 'test_delete_me@shortdoc.uz',
        passwordHash: await bcrypt.hash('TestPass123!', 4),
        fullName: 'Ochiriladigan Xodim',
        position: 'Sinov',
        role: 'STAFF',
      },
    });

    const denied = await request(app).delete(`/api/users/${temp.id}`).set(auth('staff1'));
    expect(denied.status).toBe(403);

    const self = await request(app).delete(`/api/users/${testUsers.admin.id}`).set(auth('admin'));
    expect(self.status).toBe(400);

    const doc = await createDoc('staff1', { title: 'Boglangan hujjat' });
    expect(doc.id).toBeDefined();
    const linked = await request(app).delete(`/api/users/${testUsers.staff1.id}`).set(auth('admin'));
    expect(linked.status).toBe(409);
    expect(linked.body.message).toContain('hujjat');

    const ok = await request(app).delete(`/api/users/${temp.id}`).set(auth('admin'));
    expect(ok.status).toBe(200);
    expect(await prisma.user.findUnique({ where: { id: temp.id } })).toBeNull();
  });

  it('17. Ketma-ket imzo: keyingi kelishuvchi navbati kelguncha ko‘rmaydi va xabar olmaydi; DOCX faqat to‘liq imzodan keyin', async () => {
    const doc = await createDoc('staff1', { title: 'Ketma-ket imzo', approverIds: [testUsers.head.id, testUsers.staff2.id] });
    const notifCount = (key: keyof typeof testUsers) =>
      prisma.notification.count({ where: { userId: testUsers[key].id, link: `/documents/${doc.id}` } });

    // 1-bosqich: faqat birinchi kelishuvchiga xabar boradi, ikkinchiga ko'rinmaydi
    expect(await notifCount('head')).toBe(1);
    expect(await notifCount('staff2')).toBe(0);
    const hidden = await request(app).get(`/api/documents/${doc.id}`).set(auth('staff2'));
    expect(hidden.status).toBe(404);
    const hiddenList = await request(app).get('/api/documents?limit=100').set(auth('staff2'));
    expect(hiddenList.body.data.map((d: any) => d.id)).not.toContain(doc.id);
    const pendingBefore = await request(app).get('/api/reports/counts').set(auth('staff2'));
    const before = pendingBefore.body.data.counts.pendingSignatures;

    // DOCX hali yuklab olinmaydi
    const early = await request(app).get(`/api/documents/${doc.id}/docx`).set(auth('staff1'));
    expect(early.status).toBe(403);
    const earlyPublic = await request(app).get(`/api/documents/${doc.id}/public-docx`);
    expect(earlyPublic.status).toBe(403);

    // 1-kelishuvchi imzolaydi: 2-kelishuvchiga navbat keladi
    const first = await request(app).post(`/api/documents/${doc.id}/approvals`).set(auth('head')).send({ status: 'APPROVED' });
    expect(first.status).toBe(200);
    expect(await notifCount('staff2')).toBe(1);
    const visible = await request(app).get(`/api/documents/${doc.id}`).set(auth('staff2'));
    expect(visible.status).toBe(200);
    const pendingAfter = await request(app).get('/api/reports/counts').set(auth('staff2'));
    expect(pendingAfter.body.data.counts.pendingSignatures).toBe(before + 1);

    const mid = await request(app).get(`/api/documents/${doc.id}/docx`).set(auth('staff1'));
    expect(mid.status).toBe(403);

    // 2-kelishuvchi imzolagach DOCX yuklab olinadi va imzolaganlar ro'yxati bor
    const second = await request(app).post(`/api/documents/${doc.id}/approvals`).set(auth('staff2')).send({ status: 'APPROVED' });
    expect(second.status).toBe(200);
    const done = await request(app)
      .get(`/api/documents/${doc.id}/docx`)
      .set(auth('staff1'))
      .buffer(true)
      .parse((res, cb) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => cb(null, Buffer.concat(chunks)));
      });
    expect(done.status).toBe(200);
    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(done.body as Buffer);
    const xml = await zip.file('word/document.xml')!.async('string');
    expect(xml).toContain('Kelishildi');
    expect(xml).toContain(`${testUsers.head.fullName} imzoladi`);
    expect(xml).toContain(`${testUsers.staff2.fullName} imzoladi`);
  });

  it('18. Faqat Super Admin hamma hujjatni ko‘radi; Rahbariyat/Kantselyariya faqat o‘ziga tegishli va umumiy hujjatlarni', async () => {
    const priv = await createDoc('staff1', { title: 'Shaxsiy hujjat' });
    const pub = await createDoc('rector', { title: 'Umumiy buyruq', category: 'ORDER', isPublic: true });
    const fakePublic = await createDoc('staff1', { title: 'Soxta umumiy', isPublic: true });

    const ids = async (key: keyof typeof testUsers) => {
      const res = await request(app).get('/api/documents?limit=100').set(auth(key));
      return res.body.data.map((d: any) => d.id) as string[];
    };

    // Super Admin hammasini ko'radi
    const adminIds = await ids('admin');
    expect(adminIds).toEqual(expect.arrayContaining([priv.id, pub.id, fakePublic.id]));

    // Rahbariyat va Kantselyariya begona shaxsiy hujjatni ko'rmaydi, umumiyni ko'radi
    for (const key of ['rector', 'chancellery'] as const) {
      const list = await ids(key);
      expect(list).not.toContain(priv.id);
      expect(list).toContain(pub.id);
      const view = await request(app).get(`/api/documents/${priv.id}`).set(auth(key));
      expect(view.status).toBe(404);
      const docx = await request(app).get(`/api/documents/${priv.id}/docx`).set(auth(key));
      expect(docx.status).toBe(404);
    }

    // Oddiy xodim ham umumiy hujjatni ko'radi, lekin o'zi umumiy belgisini qo'ya olmaydi
    expect(await ids('staff2')).toContain(pub.id);
    expect(await ids('staff2')).not.toContain(priv.id);
    expect(fakePublic.isPublic).toBe(false);
    expect(await ids('staff2')).not.toContain(fakePublic.id);

    // Rahbariyat begona hujjat holatini o'zgartira olmaydi
    const status = await request(app)
      .patch(`/api/documents/${priv.id}/status`)
      .set(auth('rector'))
      .send({ status: 'ARCHIVED' });
    expect([403, 404]).toContain(status.status);
  });

  it('19. Oddiy xodim foydalanuvchilar ro‘yxatini oladi (imzolovchi tanlash uchun): faqat faol, email/telefonsiz', async () => {
    const res = await request(app).get('/api/users?limit=100').set(auth('staff1'));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(1);
    for (const u of res.body.data) {
      expect(u.isActive).toBe(true);
      expect(u.email).toBeUndefined();
      expect(u.phone).toBeUndefined();
    }
    const ids = res.body.data.map((u: any) => u.id);
    expect(ids).toContain(testUsers.head.id);
    expect(ids).not.toContain(testUsers.inactiveStaff.id);
  });
});
