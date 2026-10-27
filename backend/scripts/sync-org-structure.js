const fs = require('fs');
const path = require('path');

// Eski demo bo'limlar: faqat hech kim va hech qanday hujjat bog'lanmagan bo'lsa o'chiriladi
const OBSOLETE_DEMO_CODES = ['FINANCE', 'HR-DEPT', 'IT-FAC', 'PHYS-FAC', 'PHIL-FAC'];

// Inglizcha kodlar o'zbekchaga almashtirildi: mavjud bo'limlar kodi o'zgartiriladi (foydalanuvchi va hujjatlar bog'lanishi saqlanadi)
const RENAMED_CODES = {
  'RECTOR': 'RAH-01',
  'MATH-FAC': 'FAK-01',
  'FAC-02': 'FAK-02',
  'HIST-FAC': 'FAK-03',
  'FAC-04': 'FAK-04',
  'FAC-05': 'FAK-05',
  'INT-REL': 'BOL-04',
  'CHANC': 'BOL-15',
  'DIGITAL': 'MRK-05',
};

/**
 * SamDU tuzilmasini (Rahbariyat, Institutlar, Fakultetlar, Kafedralar, Boshqarma va bo'limlar, Markazlar)
 * bazaga qo'shadi yoki yangilaydi. Takror ishga tushirish xavfsiz.
 */
async function syncOrgStructure(prisma) {
  const file = path.join(__dirname, '..', 'prisma', 'org-structure.json');
  const units = JSON.parse(fs.readFileSync(file, 'utf8'));

  for (const [oldCode, newCode] of Object.entries(RENAMED_CODES)) {
    const [oldDep, newDep] = await Promise.all([
      prisma.department.findUnique({ where: { code: oldCode } }),
      prisma.department.findUnique({ where: { code: newCode } }),
    ]);
    if (oldDep && !newDep) {
      await prisma.department.update({ where: { id: oldDep.id }, data: { code: newCode } });
    }
  }

  for (const unit of units) {
    await prisma.department.upsert({
      where: { code: unit.code },
      update: { name: unit.name, type: unit.type },
      create: { code: unit.code, name: unit.name, type: unit.type },
    });
  }

  let removed = 0;
  for (const code of OBSOLETE_DEMO_CODES) {
    const dep = await prisma.department.findUnique({
      where: { code },
      include: { _count: { select: { users: true, documents: true } } },
    });
    if (dep && dep._count.users === 0 && dep._count.documents === 0) {
      await prisma.department.delete({ where: { id: dep.id } });
      removed++;
    }
  }

  console.log(`[Migrate OK] Universitet tuzilmasi sinxronlandi: ${units.length} ta birlik, ${removed} ta eski demo bo‘lim o‘chirildi.`);
}

module.exports = { syncOrgStructure };
