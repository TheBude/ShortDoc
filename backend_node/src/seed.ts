import bcrypt from 'bcryptjs';
import { prisma } from './prisma.js';

async function main() {
  console.log('--- ShortDoc Ma’lumotlar bazasini dastlabki ma’lumotlar bilan to‘ldirish (Seed) ---');

  // 1. Bo'limlarni yaratish
  const depRectorate = await prisma.department.upsert({
    where: { code: 'RECTOR' },
    update: {},
    create: {
      name: 'Rektorat',
      code: 'RECTOR',
      type: 'RECTORATE',
    },
  });

  const depChancellery = await prisma.department.upsert({
    where: { code: 'CHANC' },
    update: {},
    create: {
      name: 'Devonxona va umumiy bo‘lim',
      code: 'CHANC',
      type: 'CHANCELLERY',
    },
  });

  const depITFaculty = await prisma.department.upsert({
    where: { code: 'IT-FAC' },
    update: {},
    create: {
      name: 'Axborot texnologiyalari fakulteti',
      code: 'IT-FAC',
      type: 'FACULTY',
    },
  });

  const depSoftware = await prisma.department.upsert({
    where: { code: 'SOFT-ENG' },
    update: {},
    create: {
      name: 'Dasturiy injiniring kafedrasi',
      code: 'SOFT-ENG',
      type: 'DEPARTMENT',
    },
  });

  const depFinance = await prisma.department.upsert({
    where: { code: 'FINANCE' },
    update: {},
    create: {
      name: 'Buxgalteriya va moliya-reja boshqarmasi',
      code: 'FINANCE',
      type: 'ADMIN_UNIT',
    },
  });

  console.log('✓ Bo‘limlar yaratildi.');

  // 2. Foydalanuvchilarni yaratish (Parol: tegishli rollar bo'yicha)
  const defaultPasswordHash = await bcrypt.hash('Admin123!', 10);
  const rektorPasswordHash = await bcrypt.hash('Rektor123!', 10);
  const devonPasswordHash = await bcrypt.hash('Devon123!', 10);
  const dekanPasswordHash = await bcrypt.hash('Dekan123!', 10);
  const xodimPasswordHash = await bcrypt.hash('Xodim123!', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@shortdoc.uz' },
    update: {},
    create: {
      email: 'admin@shortdoc.uz',
      passwordHash: defaultPasswordHash,
      fullName: 'Super Administrator',
      role: 'SUPER_ADMIN',
      position: 'Bosh tizim ma’muri',
      phone: '+998901234567',
      departmentId: depRectorate.id,
    },
  });

  const rektor = await prisma.user.upsert({
    where: { email: 'rektor@shortdoc.uz' },
    update: {},
    create: {
      email: 'rektor@shortdoc.uz',
      passwordHash: rektorPasswordHash,
      fullName: 'Prof. Abdullayev Shavkat Olimovich',
      role: 'LEADERSHIP',
      position: 'Universitet Rektori',
      phone: '+998901112233',
      departmentId: depRectorate.id,
    },
  });

  const devonxona = await prisma.user.upsert({
    where: { email: 'devonxona@shortdoc.uz' },
    update: {},
    create: {
      email: 'devonxona@shortdoc.uz',
      passwordHash: devonPasswordHash,
      fullName: 'Karimova Nargiza Rustamovna',
      role: 'CHANCELLERY',
      position: 'Devonxona mudiri',
      phone: '+998903334455',
      departmentId: depChancellery.id,
    },
  });

  const dekan = await prisma.user.upsert({
    where: { email: 'dekan@shortdoc.uz' },
    update: {},
    create: {
      email: 'dekan@shortdoc.uz',
      passwordHash: dekanPasswordHash,
      fullName: 'Dots. Rahmonov Bekzod Alisherovich',
      role: 'DEPARTMENT_HEAD',
      position: 'IT Fakulteti Dekani',
      phone: '+998905556677',
      departmentId: depITFaculty.id,
    },
  });

  const xodim = await prisma.user.upsert({
    where: { email: 'xodim@shortdoc.uz' },
    update: {},
    create: {
      email: 'xodim@shortdoc.uz',
      passwordHash: xodimPasswordHash,
      fullName: 'Ergashev Jamshid Farxodovich',
      role: 'STAFF',
      position: 'Katta o‘qituvchi',
      phone: '+998907778899',
      departmentId: depSoftware.id,
    },
  });

  console.log('✓ Foydalanuvchilar (5 ta rol) yaratildi.');

  // 3. Dastlabki hujjatlar va viza zanjiri
  const year = new Date().getFullYear();
  const deadline1 = new Date();
  deadline1.setDate(deadline1.getDate() + 5);

  const deadline2 = new Date();
  deadline2.setDate(deadline2.getDate() - 2); // Muddati o'tgan

  const doc1 = await prisma.document.upsert({
    where: { regNumber: `${year}/ICH-0001` },
    update: {},
    create: {
      regNumber: `${year}/ICH-0001`,
      title: 'Yangi kompyuter sinfini jihozlash bo‘yicha bildirgi',
      documentType: 'INTERNAL',
      category: 'Bildirgi',
      sender: 'Dasturiy injiniring kafedrasi',
      receiver: 'Universitet Rektoriga',
      departmentId: depITFaculty.id,
      creatorId: xodim.id,
      assigneeId: dekan.id,
      priority: 'HIGH',
      deadline: deadline1,
      status: 'IN_APPROVAL',
      summary: '2026/2027 o‘quv yilida sun’iy intellekt laboratoriyasini tashkil qilish uchun 25 ta kompyuter jamlanmasini xarid qilish ruxsatini so‘raymiz.',
    },
  });

  // Viza zanjiri qo'shish
  await prisma.documentApproval.createMany({
    data: [
      {
        documentId: doc1.id,
        approverId: dekan.id,
        stepOrder: 1,
        status: 'APPROVED',
        comments: 'Fakultet kengashida ma’qullangan, e’tiroz yo‘q.',
        signedAt: new Date(),
      },
      {
        documentId: doc1.id,
        approverId: rektor.id,
        stepOrder: 2,
        status: 'PENDING',
        comments: null,
      },
    ],
    skipDuplicates: true,
  });

  const doc2 = await prisma.document.upsert({
    where: { regNumber: `${year}/KIR-0001` },
    update: {},
    create: {
      regNumber: `${year}/KIR-0001`,
      title: 'Oliy ta’lim, fan va innovatsiyalar vazirligidan xat: Xalqaro konferensiya haqida',
      documentType: 'INCOMING',
      category: 'Vazirlik xati',
      sender: 'Oliy ta’lim, fan va innovatsiyalar vazirligi',
      receiver: 'Universitet Rektoriga',
      departmentId: depRectorate.id,
      creatorId: devonxona.id,
      assigneeId: rektor.id,
      priority: 'URGENT',
      deadline: deadline2,
      status: 'IN_EXECUTION',
      summary: 'Toshkent shahrida o‘tkaziladigan xalqaro ilmiy-amaliy konferensiyaga universitet professor-o‘qituvchilari maqolalarini taqdim etish.',
    },
  });

  // Topshiriq qo'shish (doc2 bo'yicha)
  await prisma.task.upsert({
    where: { id: 'task-sample-1' },
    update: {},
    create: {
      id: 'task-sample-1',
      documentId: doc2.id,
      title: 'Konferensiyaga 5 ta ilg‘or ilmiy maqolani saralab olish va topshirish',
      description: 'Axborot texnologiyalari fakulteti kafedralaridan ilmiy maqolalar yig‘ilsin va ilmiy bo‘limga topshirilsin.',
      assignedToId: dekan.id,
      createdById: rektor.id,
      deadline: deadline1,
      status: 'IN_PROGRESS',
    },
  });

  // Audit log yozish
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'SYSTEM_SEED',
      entity: 'DATABASE',
      details: 'Tizim dastlabki ma’lumotlar bilan muvaffaqiyatli to‘ldirildi',
    },
  });

  console.log('✓ Dastlabki namunaviy hujjatlar va topshiriqlar yaratildi.');
  console.log('--- Ma’lumotlar bazasi tayyor! ---');
}

main()
  .catch((e) => {
    console.error('Seed xatoligi:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
