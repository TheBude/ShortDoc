import { describe, it, expect, beforeAll } from 'vitest';
import { app, request, setupTestUsers, testUsers, prisma } from './helpers.js';

describe('FAZA 5.1: Ro‘yxat Raqami Noyobligi va Atomik Tranzaksiyalar (Race Condition Himoyasi)', () => {
  beforeAll(async () => {
    await setupTestUsers();
  });

  it('1. 20 ta bir vaqtda parallel yuborilgan hujjat so‘rovi mutlaqo noyob ro‘yxat raqamlarini oladi', async () => {
    const parallelRequests = 20;

    const promises = Array.from({ length: parallelRequests }).map((_, i) =>
      request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${testUsers.staff1.token}`)
        .send({
          title: `Parallel Hujjat #${i + 1}`,
          documentType: 'INTERNAL',
          category: 'BILDIRGI',
        })
    );

    const responses = await Promise.all(promises);

    const regNumbers: string[] = [];
    for (const res of responses) {
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.regNumber).toBeDefined();
      regNumbers.push(res.body.data.regNumber);
    }

    // Barcha raqamlar takrorlanmas (unique) ekanligini Set orqali tekshiramiz
    const uniqueNumbers = new Set(regNumbers);
    expect(uniqueNumbers.size).toBe(parallelRequests);
  });

  it('2. Baza darajasida takroriy ro‘yxat raqami qo‘shish urinishi P2002 xatosi bilan qat’iy to‘xtatiladi', async () => {
    const existingDoc = await prisma.document.findFirst({
      select: { regNumber: true, creatorId: true },
    });

    expect(existingDoc).toBeDefined();

    let threwError = false;
    try {
      await prisma.document.create({
        data: {
          regNumber: existingDoc!.regNumber,
          title: 'Takroriy raqamli test hujjati',
          documentType: 'INTERNAL',
          category: 'BILDIRGI',
          creatorId: existingDoc!.creatorId,
        },
      });
    } catch (err: any) {
      threwError = true;
      expect(err.code).toBe('P2002');
    }

    expect(threwError).toBe(true);
  });
});
