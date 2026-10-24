import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import { DepartmentType } from '@prisma/client';
import { prisma } from './prisma.js';
import { config } from './config.js';

function getOrGeneratePassword(envVar?: string): string {
  if (envVar && envVar.trim().length >= 8) {
    return envVar.trim();
  }
  // Tasodifiy xavfsiz parol generatsiya qilish (kamida 8 belgi)
  return crypto.randomBytes(9).toString('base64').replace(/[^a-zA-Z0-9]/g, 'A') + '!1a';
}

export async function runSeed() {
  if (config.isProduction && config.SEED_ALLOW !== 'true') {
    console.error('[XATO] Production muhitida seed faqat SEED_ALLOW=true bo‘lganda bajarilishi mumkin.');
    process.exit(1);
  }

  console.log('================================================================');
  console.log('[Seed] Sharof Rashidov nomidagi SamDU - Tizim Ma’lumotlarini Yangilash');
  console.log('================================================================');

  // 1. SamDU tuzilmasi (Rahbariyat, Institutlar, Fakultetlar, Kafedralar, Boshqarma va bo'limlar, Markazlar)
  const departmentsData: Array<{ code: string; name: string; type: DepartmentType }> = JSON.parse(
    readFileSync(join(process.cwd(), 'prisma', 'org-structure.json'), 'utf8')
  );

  const depMap = new Map<string, string>();
  for (const dep of departmentsData) {
    const created = await prisma.department.upsert({
      where: { code: dep.code },
      update: { name: dep.name, type: dep.type },
      create: { code: dep.code, name: dep.name, type: dep.type },
    });
    depMap.set(dep.code, created.id);
  }
  console.log(`[Seed OK] SamDU bo‘lim va fakultetlari (${depMap.size} ta) yaratildi/yangilandi.`);

  // 2. Foydalanuvchilar (Rollari va parollari bilan)
  const adminPass = getOrGeneratePassword(config.SEED_ADMIN_PASSWORD);
  const rektorPass = getOrGeneratePassword(config.SEED_REKTOR_PASSWORD);
  const devonPass = getOrGeneratePassword(config.SEED_DEVON_PASSWORD);
  const dekanPass = getOrGeneratePassword(config.SEED_DEKAN_PASSWORD);
  const xodimPass = getOrGeneratePassword(config.SEED_XODIM_PASSWORD);

  const pAdmin = await bcrypt.hash(adminPass, 10);
  const pRektor = await bcrypt.hash(rektorPass, 10);
  const pDevon = await bcrypt.hash(devonPass, 10);
  const pDekan = await bcrypt.hash(dekanPass, 10);
  const pXodim = await bcrypt.hash(xodimPass, 10);

  const usersData = [
    {
      email: 'admin@shortdoc.uz',
      passwordHash: pAdmin,
      fullName: 'Super Administrator',
      role: 'SUPER_ADMIN' as const,
      position: 'Bosh tizim administratori',
      phone: '+998662391000',
      depCode: 'RECTOR',
    },
    {
      email: 'rektor@shortdoc.uz',
      passwordHash: pRektor,
      fullName: 'Prof. Xalmuradov Rustam Ibragimovich',
      role: 'LEADERSHIP' as const,
      position: 'SamDU Rektori',
      phone: '+998662391111',
      depCode: 'RECTOR',
    },
    {
      email: 'devonxona@shortdoc.uz',
      passwordHash: pDevon,
      fullName: 'Karimova Nargiza Rustamovna',
      role: 'CHANCELLERY' as const,
      position: 'Devonxona mudiri',
      phone: '+998662391222',
      depCode: 'CHANC',
    },
    {
      email: 'dekan@shortdoc.uz',
      passwordHash: pDekan,
      fullName: 'Dots. Rahmonov Bekzod Alisherovich',
      role: 'DEPARTMENT_HEAD' as const,
      position: 'IT Fakulteti Dekani',
      phone: '+998905556677',
      depCode: 'MATH-FAC',
    },
    {
      email: 'matematika_dekan@shortdoc.uz',
      passwordHash: pDekan,
      fullName: 'Prof. Yusupov Otabek Shokirovich',
      role: 'DEPARTMENT_HEAD' as const,
      position: 'Matematika fakulteti dekani',
      phone: '+998901239988',
      depCode: 'MATH-FAC',
    },
    {
      email: 'xodim@shortdoc.uz',
      passwordHash: pXodim,
      fullName: 'Ergashev Jamshid Farxodovich',
      role: 'STAFF' as const,
      position: 'Dasturiy injiniring kafedrasi dotsenti',
      phone: '+998907778899',
      depCode: 'MATH-FAC',
    },
    {
      email: 'talaba_murojaat@shortdoc.uz',
      passwordHash: pXodim,
      fullName: 'Toshmatova Zilola Akbarovna',
      role: 'STAFF' as const,
      position: 'Fuqarolar murojaatlari bosh mutaxassisi',
      phone: '+998903332211',
      depCode: 'CHANC',
    },
  ];

  const userMap = new Map<string, string>();
  for (const u of usersData) {
    const created = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        fullName: u.fullName,
        position: u.position,
        phone: u.phone,
        departmentId: depMap.get(u.depCode) || null,
        isActive: true,
      },
      create: {
        email: u.email,
        passwordHash: u.passwordHash,
        fullName: u.fullName,
        role: u.role,
        position: u.position,
        phone: u.phone,
        departmentId: depMap.get(u.depCode) || null,
        isActive: true,
      },
    });
    userMap.set(u.email, created.id);
  }
  console.log(`[Seed OK] SamDU xodimlari (${userMap.size} ta) tizimga kiritildi.`);

  const adminId = userMap.get('admin@shortdoc.uz')!;
  const rektorId = userMap.get('rektor@shortdoc.uz')!;
  const devonxonaId = userMap.get('devonxona@shortdoc.uz')!;
  const dekanId = userMap.get('dekan@shortdoc.uz')!;
  const mathDekanId = userMap.get('matematika_dekan@shortdoc.uz')!;
  const xodimId = userMap.get('xodim@shortdoc.uz')!;
  const murojaatId = userMap.get('talaba_murojaat@shortdoc.uz')!;

  // 3. Namunaviy Hujjatlar (Har bir menyu bo'limi uchun)
  const year = new Date().getFullYear();
  const future5 = new Date();
  future5.setDate(future5.getDate() + 5);
  const future2 = new Date();
  future2.setDate(future2.getDate() + 2);
  const past3 = new Date();
  past3.setDate(past3.getDate() - 3);

  // A. ICHKI BILDIRGILAR VA XIZMAT XATLARI (INTERNAL)
  const docInt1 = await prisma.document.upsert({
    where: { regNumber: `${year}/ICH-0001` },
    update: { status: 'IN_APPROVAL' },
    create: {
      regNumber: `${year}/ICH-0001`,
      title: 'Sun’iy intellekt va data science laboratoriyasini jihozlash bo‘yicha bildirgi',
      documentType: 'INTERNAL',
      category: 'BILDIRGI',
      sender: 'Axborot texnologiyalari fakulteti',
      receiver: 'Universitet Rektoriga',
      departmentId: depMap.get('IT-FAC'),
      creatorId: xodimId,
      assigneeId: dekanId,
      priority: 'HIGH',
      deadline: future5,
      status: 'IN_APPROVAL',
      summary: '2026/2027 o‘quv yilida xalqaro standartdagi sun’iy intellekt laboratoriyasini tashkil qilish uchun 25 ta kompyuter jamlanmasini xarid qilish ruxsatini so‘raymiz.',
    },
  });

  const docInt2 = await prisma.document.upsert({
    where: { regNumber: `${year}/ICH-0002` },
    update: { status: 'IN_EXECUTION' },
    create: {
      regNumber: `${year}/ICH-0002`,
      title: 'Talabalar respublika fan olimpiadasida g‘olib bo‘lganlarni rag‘batlantirish haqida',
      documentType: 'INTERNAL',
      category: 'OFFICIAL_NOTE',
      sender: 'Matematika fakulteti dekanati',
      receiver: 'Universitet Rektoriga',
      departmentId: depMap.get('MATH-FAC'),
      creatorId: mathDekanId,
      assigneeId: rektorId,
      priority: 'MEDIUM',
      deadline: future5,
      status: 'IN_EXECUTION',
      summary: 'Respublika matematika olimpiadasida 1-o‘rinni qo‘lga kiritgan talabalarni bir oylik maxsus rag‘batlantirish to‘g‘risida tavsiyanoma.',
    },
  });

  const docInt3 = await prisma.document.upsert({
    where: { regNumber: `${year}/ICH-0003` },
    update: { status: 'COMPLETED' },
    create: {
      regNumber: `${year}/ICH-0003`,
      title: 'Raqamli ta’lim markazi server uskunalarini profilaktik nazoratdan o‘tkazish',
      documentType: 'INTERNAL',
      category: 'BILDIRGI',
      sender: 'Raqamli ta’lim texnologiyalari markazi',
      receiver: 'Devonxona va umumiy bo‘limga',
      departmentId: depMap.get('DIGITAL'),
      creatorId: adminId,
      assigneeId: devonxonaId,
      priority: 'LOW',
      status: 'COMPLETED',
      summary: 'Universitet HEMIS va masofaviy ta’lim tizimi serverlarida xavfsizlik audit ishlari to‘liq yakunlandi.',
    },
  });

  const docInt4 = await prisma.document.upsert({
    where: { regNumber: `${year}/ICH-0004` },
    update: { status: 'REGISTERED' },
    create: {
      regNumber: `${year}/ICH-0004`,
      title: '2026-yilgi bahorgi semestr fan dasturlari va sillabuslarni yangilash bo‘yicha xizmat xati',
      documentType: 'INTERNAL',
      category: 'OFFICIAL_NOTE',
      sender: 'Dasturiy injiniring kafedrasi',
      receiver: 'O‘quv-uslubiy boshqarmaga',
      departmentId: depMap.get('IT-FAC'),
      creatorId: xodimId,
      assigneeId: dekanId,
      priority: 'MEDIUM',
      status: 'REGISTERED',
      summary: 'Kafedra professor-o‘qituvchilari tomonidan ishlab chiqilgan yangi fan dasturlarini ekspertizadan o‘tkazish uchun taqdim etilmoqda.',
    },
  });

  // B. KIRUVCHI RASMIY XATLAR (INCOMING)
  const docInc1 = await prisma.document.upsert({
    where: { regNumber: `${year}/KIR-0001` },
    update: {},
    create: {
      regNumber: `${year}/KIR-0001`,
      title: 'Oliy ta’lim, fan va innovatsiyalar vazirligidan: 2026/2027 o‘quv yili davlat grantlari kvotasi to‘g‘risida',
      documentType: 'INCOMING',
      category: 'LETTER',
      sender: 'Oliy ta’lim, fan va innovatsiyalar vazirligi',
      receiver: 'SamDU Rektoriga',
      departmentId: depMap.get('RECTOR'),
      creatorId: devonxonaId,
      assigneeId: rektorId,
      priority: 'URGENT',
      deadline: future2,
      status: 'IN_EXECUTION',
      summary: 'Yangi o‘quv yili uchun muhandislik, IT va fundamental fanlar yo‘nalishlarida ehtiyoj yuqori bo‘lgan mutaxassisliklar kvotalarini shakllantirish topshirig‘i.',
    },
  });

  const docInc2 = await prisma.document.upsert({
    where: { regNumber: `${year}/KIR-0002` },
    update: {},
    create: {
      regNumber: `${year}/KIR-0002`,
      title: 'Samarqand viloyati hokimligidan: Xalqaro yoshlar forumini o‘tkazish haqida',
      documentType: 'INCOMING',
      category: 'LETTER',
      sender: 'Samarqand viloyati hokimligi',
      receiver: 'Universitet Rektoriga',
      departmentId: depMap.get('RECTOR'),
      creatorId: devonxonaId,
      assigneeId: rektorId,
      priority: 'HIGH',
      deadline: past3, // Muddati o'tgan ijro
      status: 'IN_EXECUTION',
      summary: 'Samarqand shahrida bo‘lib o‘tadigan turkiy xalqlar yoshlari forumi doirasida volontyorlar va ilmiy ma’ruzachilar tayyorlash.',
    },
  });

  const docInc3 = await prisma.document.upsert({
    where: { regNumber: `${year}/KIR-0003` },
    update: { status: 'IN_APPROVAL' },
    create: {
      regNumber: `${year}/KIR-0003`,
      title: 'Yevropa Ittifoqining Erasmus+ dasturi: Yangi grant loyihasi shartnomasi',
      documentType: 'INCOMING',
      category: 'CONTRACT',
      sender: 'Erasmus+ National Office Uzbekistan',
      receiver: 'Xalqaro hamkorlik boshqarmasiga',
      departmentId: depMap.get('INT-REL'),
      creatorId: devonxonaId,
      assigneeId: rektorId,
      priority: 'MEDIUM',
      status: 'IN_APPROVAL',
      summary: 'Universitet professor-o‘qituvchilari uchun Germaniya va Polsha universitetlarida stajirovka o‘tash loyihasining moliyaviy kelishuvi.',
    },
  });

  const docInc4 = await prisma.document.upsert({
    where: { regNumber: `${year}/KIR-0004` },
    update: { status: 'REGISTERED' },
    create: {
      regNumber: `${year}/KIR-0004`,
      title: 'Mirzo Ulug‘bek nomidagi O‘zMU dan: Talabalar akademik mobilligi to‘g‘risida rasmiy xat',
      documentType: 'INCOMING',
      category: 'LETTER',
      sender: 'O‘zbekiston Milliy Universiteti Rektorati',
      receiver: 'Devonxona va umumiy bo‘limga',
      departmentId: depMap.get('CHANC'),
      creatorId: devonxonaId,
      assigneeId: devonxonaId,
      priority: 'MEDIUM',
      status: 'REGISTERED',
      summary: '2026-yilgi bahorgi semestr uchun 10 nafar iqtidorli talabalarni almashinuv asosida o‘qitish bo‘yicha taklifnoma.',
    },
  });

  // C. CHIQUVCHI XATLAR (OUTGOING)
  const docOut1 = await prisma.document.upsert({
    where: { regNumber: `${year}/CHIQ-0001` },
    update: { status: 'IN_APPROVAL' },
    create: {
      regNumber: `${year}/CHIQ-0001`,
      title: 'Malayziya Texnologiya Universiteti (UTM) rektoratiga ikki tomonlama memorandum yuborish',
      documentType: 'OUTGOING',
      category: 'LETTER',
      sender: 'SamDU Xalqaro hamkorlik boshqarmasi',
      receiver: 'Universiti Teknologi Malaysia (UTM)',
      departmentId: depMap.get('INT-REL'),
      creatorId: dekanId,
      assigneeId: rektorId,
      priority: 'HIGH',
      deadline: future5,
      status: 'IN_APPROVAL',
      summary: 'Dasturiy injiniring va kibertaxdidlar xavfsizligi sohasida 2+2 qo‘shma diplom dasturini tashkil etish to‘g‘risida rasmiy taklifnoma.',
    },
  });

  const docOut2 = await prisma.document.upsert({
    where: { regNumber: `${year}/CHIQ-0002` },
    update: {},
    create: {
      regNumber: `${year}/CHIQ-0002`,
      title: 'Oliy ta’lim vazirligiga: SamDU 2025-yilgi ilmiy nashrlar va Scopus maqolalari reytingi hisoboti',
      documentType: 'OUTGOING',
      category: 'REPORT',
      sender: 'SamDU Ilmiy bo‘limi',
      receiver: 'Oliy ta’lim, fan va innovatsiyalar vazirligiga',
      departmentId: depMap.get('RECTOR'),
      creatorId: devonxonaId,
      assigneeId: rektorId,
      priority: 'MEDIUM',
      status: 'COMPLETED',
      summary: 'Universitet xodimlarining nufuzli xalqaro jurnallarda chop etilgan 140 dan ortiq ilmiy ishlari to‘g‘risidagi statistik ma’lumotnoma.',
    },
  });

  // D. REKTOR BUYRUQLARI VA QARORLARI (category: "Buyruq")
  const docBuy1 = await prisma.document.upsert({
    where: { regNumber: `${year}/BUY-0001` },
    update: {},
    create: {
      regNumber: `${year}/BUY-0001`,
      title: 'SamDU iqtidorli talabalariga Sharof Rashidov nomidagi maxsus stipendiyani tayinlash to‘g‘risida',
      documentType: 'INTERNAL',
      category: 'ORDER',
      sender: 'Universitet Rektorati',
      receiver: 'Barcha fakultetlar va bo‘limlarga',
      departmentId: depMap.get('RECTOR'),
      creatorId: devonxonaId,
      assigneeId: rektorId,
      priority: 'HIGH',
      status: 'IN_EXECUTION',
      summary: 'Universitet Ilmiy Kengashi xulosasiga asosan a’lo baholarga o‘qiyotgan va xalqaro olimpiada g‘olibi bo‘lgan 15 nafar talabaga maxsus stipendiya tayinlansin.',
    },
  });

  const docBuy2 = await prisma.document.upsert({
    where: { regNumber: `${year}/BUY-0002` },
    update: {},
    create: {
      regNumber: `${year}/BUY-0002`,
      title: 'SamDU Ilmiy Kengashining 2026-yil 1-sonli majlisi Qarori ijrosini ta’minlash haqida',
      documentType: 'INTERNAL',
      category: 'DECISION',
      sender: 'Universitet Ilmiy Kotibiyati',
      receiver: 'Dekanatlar va Kafedralarga',
      departmentId: depMap.get('RECTOR'),
      creatorId: devonxonaId,
      assigneeId: rektorId,
      priority: 'MEDIUM',
      status: 'COMPLETED',
      summary: 'O‘quv laboratoriyalarini modernizatsiya qilish va professor-o‘qituvchilarning xorijiy tillarni bilish darajasini oshirish chora-tadbirlari.',
    },
  });

  const docBuy3 = await prisma.document.upsert({
    where: { regNumber: `${year}/BUY-0003` },
    update: { status: 'IN_APPROVAL' },
    create: {
      regNumber: `${year}/BUY-0003`,
      title: 'Universitetda Startap loyihalar inkubatsiya markazini tashkil etish to‘g‘risida buyruq loyihasi',
      documentType: 'INTERNAL',
      category: 'ORDER',
      sender: 'Axborot texnologiyalari fakulteti',
      receiver: 'Universitet Rektoriga',
      departmentId: depMap.get('IT-FAC'),
      creatorId: dekanId,
      assigneeId: rektorId,
      priority: 'HIGH',
      status: 'IN_APPROVAL',
      summary: 'Yoshlarning innovatsion biznes g‘oyalarini qo‘llab-quvvatlash uchun 200 kv.m maydonda kovorking va startap markazi ochilishi belgilansin.',
    },
  });

  // E. FUQAROLAR VA TALABALAR MUROJAATLARI (category: "Murojaat")
  const docMur1 = await prisma.document.upsert({
    where: { regNumber: `${year}/MUR-0001` },
    update: { status: 'IN_EXECUTION' },
    create: {
      regNumber: `${year}/MUR-0001`,
      title: '3-bosqich talabasi Mirzayev D.ning talabalar turar joyiga joylashish bo‘yicha arizasi',
      documentType: 'INCOMING',
      category: 'APPEAL',
      sender: 'Mirzayev Dilshod (Talaba, IT fakulteti)',
      receiver: 'Talabalar turar joylari komissiyasiga',
      departmentId: depMap.get('CHANC'),
      creatorId: murojaatId,
      assigneeId: dekanId,
      priority: 'MEDIUM',
      deadline: future5,
      status: 'IN_EXECUTION',
      summary: 'Ijtimoiy daftarga kiritilgan oila farzandi sifatida 4-sonli talabalar turar joyidan o‘rin ajratilishini so‘rab yo‘llangan ariza.',
    },
  });

  const docMur2 = await prisma.document.upsert({
    where: { regNumber: `${year}/MUR-0002` },
    update: { status: 'IN_APPROVAL' },
    create: {
      regNumber: `${year}/MUR-0002`,
      title: 'Magistratura talabasi Karimova S.ning chet el konferensiyasida ma’ruza qilish ruxsatini so‘rab arizasi',
      documentType: 'INCOMING',
      category: 'APPEAL',
      sender: 'Karimova Shahlo (Magistrant, Fizika fakulteti)',
      receiver: 'Ilmiy ishlar bo‘yicha prorektorga',
      departmentId: depMap.get('CHANC'),
      creatorId: murojaatId,
      assigneeId: rektorId,
      priority: 'HIGH',
      status: 'IN_APPROVAL',
      summary: 'Dubay shahrida o‘tkaziladigan "Kvant fizikasi yutuqlari" anjumanida ma’ruza bilan qatnashish uchun universitetdan rasmiy ruxsatnoma va qo‘llab-quvvatlash xati.',
    },
  });

  const docMur3 = await prisma.document.upsert({
    where: { regNumber: `${year}/MUR-0003` },
    update: {},
    create: {
      regNumber: `${year}/MUR-0003`,
      title: 'Samarqand shahri fuqarosi Aliyev B.ning ilmiy kutubxonadan foydalanish arizasi',
      documentType: 'INCOMING',
      category: 'APPEAL',
      sender: 'Aliyev Baxtiyor (Mustaqil tadqiqotchi)',
      receiver: 'SamDU Axborot-resurs markaziga',
      departmentId: depMap.get('CHANC'),
      creatorId: murojaatId,
      assigneeId: devonxonaId,
      priority: 'LOW',
      status: 'COMPLETED',
      summary: 'SamDU nodir qo‘lyozmalar bo‘limida saqlanayotgan arxiv manbalarini o‘rganish uchun o‘quv zaliga kirish ruxsatnomasi to‘liq berildi.',
    },
  });

  // F. ELEKTRON ARXIV (isArchived: true, status: "ARCHIVED")
  const docArx1 = await prisma.document.upsert({
    where: { regNumber: `${year - 1}/ARX-0001` },
    update: {},
    create: {
      regNumber: `${year - 1}/ARX-0001`,
      title: '2024/2025 o‘quv yili kadrlar malaka attestatsiyasi yakunlari to‘g‘risidagi yig‘ma hisobot',
      documentType: 'INTERNAL',
      category: 'ARCHIVE',
      sender: 'Inson resurslari boshqarmasi',
      receiver: 'Devonxona arxivi',
      departmentId: depMap.get('HR-DEPT'),
      creatorId: adminId,
      assigneeId: devonxonaId,
      priority: 'LOW',
      status: 'ARCHIVED',
      isArchived: true,
      summary: 'Barcha kafedralar bo‘yicha attestatsiya komissiyasi qarorlari va o‘qituvchilar reyting daftarlari arxiv fondiga topshirildi.',
    },
  });

  const docArx2 = await prisma.document.upsert({
    where: { regNumber: `${year - 1}/ARX-0002` },
    update: {},
    create: {
      regNumber: `${year - 1}/ARX-0002`,
      title: 'Sharof Rashidov nomidagi SamDU 600 yillik faoliyatiga doir xalqaro simpozium materiallari to‘plami',
      documentType: 'INTERNAL',
      category: 'ARCHIVE',
      sender: 'Tarix fakulteti',
      receiver: 'Universitet muzeyi va arxivi',
      departmentId: depMap.get('HIST-FAC'),
      creatorId: adminId,
      assigneeId: devonxonaId,
      priority: 'LOW',
      status: 'ARCHIVED',
      isArchived: true,
      summary: 'Universitetning Ulug‘bek madrasasi an’analari davomchisi sifatidagi tarixiy tadqiqotlari hisoboti arxivga saqlovga olindi.',
    },
  });

  console.log('[Seed OK] Barcha kategoriyalar bo‘yicha SamDU namunaviy hujjatlari yaratildi.');

  // 4. Imzo zanjirlari (DocumentApprovals) - Idempotent yaratish (deleteMany ishlatilmaydi)
  const approvalsData = [
    {
      documentId: docInt1.id,
      approverId: dekanId,
      stepOrder: 1,
      status: 'APPROVED' as const,
      comments: 'Laboratoriya xonasi (304-auditoriya) tayyor, e’tiroz yo‘q.',
      signedAt: new Date(),
    },
    {
      documentId: docInt1.id,
      approverId: rektorId,
      stepOrder: 2,
      status: 'PENDING' as const,
      comments: null,
    },
    // docOut1 (Xalqaro UTM memorandumi: Devonxona -> Rektor)
    {
      documentId: docOut1.id,
      approverId: devonxonaId,
      stepOrder: 1,
      status: 'APPROVED' as const,
      comments: 'Ro‘yxatdan o‘tkazildi, rektoratga ma’qullash uchun yuborildi.',
      signedAt: new Date(),
    },
    {
      documentId: docOut1.id,
      approverId: rektorId,
      stepOrder: 2,
      status: 'PENDING' as const,
      comments: null,
    },
    // docBuy3 (Startap inkubatsiya markazi buyrug'i: Dekan -> Rektor)
    {
      documentId: docBuy3.id,
      approverId: dekanId,
      stepOrder: 1,
      status: 'PENDING' as const,
      comments: null,
    },
    {
      documentId: docBuy3.id,
      approverId: rektorId,
      stepOrder: 2,
      status: 'PENDING' as const,
      comments: null,
    },
    // docMur2 (Talaba xalqaro anjuman arizasi: Devonxona -> Dekan)
    {
      documentId: docMur2.id,
      approverId: devonxonaId,
      stepOrder: 1,
      status: 'APPROVED' as const,
      comments: 'Qabul qilindi va mutaxassis xulosasi uchun yo‘naltirildi.',
      signedAt: new Date(),
    },
    {
      documentId: docMur2.id,
      approverId: dekanId,
      stepOrder: 2,
      status: 'PENDING' as const,
      comments: null,
    },
    // docInt4 (Oddiy xodim uchun imzoga kelgan hujjat)
    {
      documentId: docInt4.id,
      approverId: xodimId,
      stepOrder: 1,
      status: 'PENDING' as const,
      comments: null,
    },
  ];

  for (const app of approvalsData) {
    const existing = await prisma.documentApproval.findFirst({
      where: {
        documentId: app.documentId,
        approverId: app.approverId,
        stepOrder: app.stepOrder,
      },
    });
    if (!existing) {
      await prisma.documentApproval.create({ data: app });
    }
  }
  console.log('[Seed OK] Imzo zanjirlari muvaffaqiyatli tekshirildi/yaratildi.');

  // 5. Ijro Topshiriqlari (Tasks)
  await prisma.task.upsert({
    where: { id: 'task-samdu-1' },
    update: { status: 'IN_PROGRESS' },
    create: {
      id: 'task-samdu-1',
      documentId: docInc1.id,
      title: '2026/2027 o‘quv yili uchun fakultetlar kesimida davlat grantlari ehtiyojini shakllantirish',
      description: 'Axborot texnologiyalari va Matematika fakultetlari 3 kun ichida takliflarni umumlashtirib rektoratga taqdim etsin.',
      assignedToId: dekanId,
      createdById: rektorId,
      deadline: future2,
      status: 'IN_PROGRESS',
    },
  });

  await prisma.task.upsert({
    where: { id: 'task-samdu-2' },
    update: { status: 'IN_PROGRESS' },
    create: {
      id: 'task-samdu-2',
      documentId: docInc2.id,
      title: 'Xalqaro yoshlar forumi uchun 50 nafar iqtidorli talabalar ro‘yxatini tayyorlash',
      description: 'Chet tillarini mukammal biluvchi talabalar saralab olinsin va viloyat hokimligi komissiyasiga topshirilsin.',
      assignedToId: dekanId,
      createdById: rektorId,
      deadline: past3, // Muddati o'tgan (OVERDUE)
      status: 'IN_PROGRESS',
    },
  });

  await prisma.task.upsert({
    where: { id: 'task-samdu-3' },
    update: { status: 'IN_PROGRESS' },
    create: {
      id: 'task-samdu-3',
      documentId: docMur1.id,
      title: 'Talabalar turar joyiga joylashish arizasini moddiy komissiyada ko‘rib chiqish',
      description: 'Talabaning ijtimoiy toifasini tasdiqlovchi hujjatlarni o‘rganish va yotoqxonadan xona ajratish.',
      assignedToId: murojaatId,
      createdById: devonxonaId,
      deadline: future5,
      status: 'IN_PROGRESS',
    },
  });

  await prisma.task.upsert({
    where: { id: 'task-samdu-4' },
    update: { status: 'PENDING' },
    create: {
      id: 'task-samdu-4',
      documentId: docBuy1.id,
      title: 'Sharof Rashidov stipendiyasi g‘oliblariga diplom va guvohnomalarni chop ettirish',
      description: 'Guvohnomalar rektorat tomonidan imzolanishi uchun tayyorlansin.',
      assignedToId: adminId,
      createdById: rektorId,
      deadline: future5,
      status: 'PENDING',
    },
  });

  await prisma.task.upsert({
    where: { id: 'task-samdu-5' },
    update: { status: 'IN_PROGRESS' },
    create: {
      id: 'task-samdu-5',
      documentId: docInt1.id,
      title: 'Sun’iy intellekt laboratoriyasi uskunalarining texnik tavsiflarini ishlab chiqish',
      description: 'GPU serverlar va dasturiy ta’minot litsenziyalari bo‘yicha talablarni tayyorlash.',
      assignedToId: xodimId,
      createdById: dekanId,
      deadline: future5,
      status: 'IN_PROGRESS',
    },
  });

  await prisma.task.upsert({
    where: { id: 'task-samdu-6' },
    update: { status: 'IN_PROGRESS' },
    create: {
      id: 'task-samdu-6',
      documentId: docInt4.id,
      title: 'Yangi semestr fan sillabuslarini kafedra yig‘ilishida muhokama qilish',
      description: 'Bakalavriat va magistratura o‘quv rejalari bo‘yicha taqrizlarni tayyorlash.',
      assignedToId: xodimId,
      createdById: dekanId,
      deadline: past3, // Muddati o'tgan (OVERDUE) topshiriq
      status: 'IN_PROGRESS',
    },
  });

  console.log('[Seed OK] Ijro topshiriqlari (Jarayonda, Muddati o‘tgan va Yangi) yaratildi.');

  // 6. Audit Loglar (Faqat bo'sh bo'lsa yoziladi)
  const existingAudit = await prisma.auditLog.findFirst({
    where: { action: 'SYSTEM_INITIALIZATION' },
  });

  if (!existingAudit) {
    await prisma.auditLog.createMany({
      data: [
        {
          userId: adminId,
          action: 'SYSTEM_INITIALIZATION',
          entity: 'SYSTEM',
          details: 'SamDU elektron hujjatlar aylanishi va ijro nazorati tizimi ishga tushirildi',
        },
        {
          userId: rektorId,
          action: 'SIGN_DOCUMENT',
          entity: 'DOCUMENT',
          entityId: docBuy1.id,
          details: 'Rektor tomonidan 2026/BUY-0001 sonli stipendiya buyrug‘i imzolandi',
        },
        {
          userId: dekanId,
          action: 'APPROVE_DOCUMENT',
          entity: 'DOCUMENT',
          entityId: docInt1.id,
          details: 'IT fakulteti dekani AI laboratoriyasi bo‘yicha bildirgini ma’qulladi va imzoladi',
        },
        {
          userId: devonxonaId,
          action: 'REGISTER_INCOMING',
          entity: 'DOCUMENT',
          entityId: docInc1.id,
          details: 'Vazirlikdan kelgan 2026/KIR-0001 sonli rasmiy xat ro‘yxatga olindi',
        },
      ],
    });
    console.log('[Seed OK] Dastlabki tizim audit loglari yozildi.');
  }

  console.log('================================================================');
  console.log('[Seed Tugallandi] SamDU ShortDoc ma’lumotlar bazasi tayyor.');
  console.log('Foydalanuvchi hisoblari (parollar faqat ushbu konsolga bir marta chiqariladi):');
  console.log(` 1. Super Admin: admin@shortdoc.uz / ${adminPass}`);
  console.log(` 2. Rektor:      rektor@shortdoc.uz / ${rektorPass}`);
  console.log(` 3. Devonxona:   devonxona@shortdoc.uz / ${devonPass}`);
  console.log(` 4. Dekan (IT):  dekan@shortdoc.uz / ${dekanPass}`);
  console.log(` 5. Xodim:       xodim@shortdoc.uz / ${xodimPass}`);
  console.log('================================================================');
}

// Standalone run if executed directly
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  runSeed()
    .catch((e) => {
      console.error('Seed xatoligi:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
