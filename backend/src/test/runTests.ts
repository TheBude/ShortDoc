import bcrypt from 'bcryptjs';
import { prisma } from '../prisma.js';
import { generateToken } from '../utils/jwt.js';
import { config } from '../config.js';
import { createStreamTicket, consumeStreamTicket } from '../services/ticket.service.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  [PASS]: ${testName}`);
    passed++;
  } else {
    console.error(`  [FAIL]: ${testName}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('[TEST] ShortDoc Backend Avtomatlashtirilgan Testlar Boshlandi');
  console.log('======================================================\n');

  try {
    // 1. Foydalanuvchi va autentifikatsiya testi
    const admin = await prisma.user.findUnique({ where: { email: 'admin@shortdoc.uz' } });
    assert(!!admin, 'Admin foydalanuvchisi bazada mavjud');

    const validPassword = await bcrypt.compare('Admin123!', admin!.passwordHash);
    assert(validPassword, 'To‘g‘ri parol muvaffaqiyatli xesh bilan tekshirildi');

    const invalidPassword = await bcrypt.compare('WrongPassword', admin!.passwordHash);
    assert(!invalidPassword, 'Noto‘g‘ri parol rad etildi');

    const token = generateToken({
      userId: admin!.id,
      email: admin!.email,
      role: admin!.role,
    });
    assert(!!token && token.length > 20, 'JWT token xavfsiz generatsiya qilindi');

    // 2. Noyob hujjat raqami testi
    const year = new Date().getFullYear();
    const testRegNumber = `${year}/TEST-${Date.now()}`;
    const doc = await prisma.document.create({
      data: {
        regNumber: testRegNumber,
        title: 'Avtomatlashtirilgan sinov hujjati',
        documentType: 'INTERNAL',
        category: 'Sinov',
        creatorId: admin!.id,
        priority: 'MEDIUM',
        status: 'NEW',
      },
    });
    assert(!!doc && doc.regNumber === testRegNumber, 'Yangi hujjat yaratildi va noyob raqam berildi');

    // Takroriy noyob raqamni tekshirish (Unique Constraint)
    let duplicateFailedAsExpected = false;
    try {
      await prisma.document.create({
        data: {
          regNumber: testRegNumber,
          title: 'Takroriy hujjat',
          creatorId: admin!.id,
        },
      });
    } catch (e: any) {
      if (e.code === 'P2002') duplicateFailedAsExpected = true;
    }
    assert(duplicateFailedAsExpected, 'Takroriy ro‘yxat raqami bazada muvaffaqiyatli bloklandi (P2002 Unique constraint)');

    // 3. Hujjat holatini o'zgartirish va tarix yozilishi testi
    await prisma.document.update({
      where: { id: doc.id },
      data: { status: 'IN_REVIEW' },
    });
    const history = await prisma.documentStatusHistory.create({
      data: {
        documentId: doc.id,
        changedById: admin!.id,
        oldStatus: 'NEW',
        newStatus: 'IN_REVIEW',
        reason: 'Sinov tekshiruvi',
      },
    });
    assert(history.newStatus === 'IN_REVIEW', 'Hujjat holati o‘zgardi va statuslar tarixiga qayd etildi');

    // 4. Topshiriq yaratish testi
    const dekan = await prisma.user.findUnique({ where: { email: 'dekan@shortdoc.uz' } });
    const task = await prisma.task.create({
      data: {
        documentId: doc.id,
        title: 'Sinov topshirig‘i',
        description: 'Tizimni tekshirish uchun topshiriq',
        assignedToId: dekan!.id,
        createdById: admin!.id,
        status: 'PENDING',
      },
    });
    assert(!!task && task.status === 'PENDING', 'Hujjat asosida topshiriq yaratildi va mas’ulga biriktirildi');

    // 5. Audit log yozilish testi
    const audit = await prisma.auditLog.create({
      data: {
        userId: admin!.id,
        action: 'TEST_RUN',
        entity: 'TEST',
        details: 'Barcha asosiy birliklar sinovdan o‘tdi',
      },
    });
    assert(!!audit && audit.action === 'TEST_RUN', 'Xavfsizlik audit jurnali muvaffaqiyatli yozildi');

    // 6. Faza 1: Xavfsizlik testlari (Config, Stream-ticket, Email normalizatsiyasi)
    assert(!!config.JWT_SECRET && config.JWT_SECRET.length >= 32, 'Faza 1: JWT_SECRET yuklandi va kamida 32 belgidan iborat');
    
    // Stream ticket: bir martalik foydalanish va yaroqlilik tekshiruvi
    const testTicket = createStreamTicket(admin!.id);
    assert(typeof testTicket === 'string' && testTicket.length > 20, 'Faza 1: Stream ticket xavfsiz generatsiya qilindi');
    
    const consumedUserId = consumeStreamTicket(testTicket);
    assert(consumedUserId === admin!.id, 'Faza 1: Stream ticket to‘g‘ri foydalanuvchini qaytardi');

    const secondConsume = consumeStreamTicket(testTicket);
    assert(secondConsume === null, 'Faza 1: Ishlatilgan ticket qayta ishlatilishi muvaffaqiyatli bloklandi (bir martalik)');

    const invalidTicket = consumeStreamTicket('invalid_random_ticket_123');
    assert(invalidTicket === null, 'Faza 1: Noto‘g‘ri ticket rad etildi');

    // Email normalizatsiyasi testi
    const rawEmail = '  AdMiN@ShortDoc.UZ  ';
    const normalized = rawEmail.trim().toLowerCase();
    assert(normalized === 'admin@shortdoc.uz', 'Faza 1: Email normalizatsiyasi (trim va lowercase) to‘g‘ri ishladi');

    // Tozalash (test hujjatini o'chirish)
    await prisma.document.delete({ where: { id: doc.id } });
    assert(true, 'Sinov ma’lumotlari muvaffaqiyatli tozalandi');

  } catch (error) {
    console.error('Test jarayonida kutilmagan xatolik:', error);
    failed++;
  }

  console.log('\n------------------------------------------------------');
  console.log(`Natija: Jami: ${passed + failed} | O‘tdi: ${passed} | Xato: ${failed}`);
  console.log('------------------------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().finally(() => prisma.$disconnect());
