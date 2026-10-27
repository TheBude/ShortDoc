// Bazadagi enum qiymatlarini foydalanuvchiga ko‘rsatiladigan o‘zbekcha yorliqlarga o‘giradi.

const DOCUMENT_STATUS_LABELS: Record<string, string> = {
  NEW: 'Yangi',
  REGISTERED: 'Ro‘yxatga olindi',
  IN_REVIEW: 'Kelishuvda',
  IN_APPROVAL: 'Imzolanmoqda',
  IN_EXECUTION: 'Ijroda',
  COMPLETED: 'Bajarildi',
  REJECTED: 'Qaytarildi',
  DRAFT: 'Qoralama',
  ARCHIVED: 'Arxivlangan',
};

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Administrator',
  LEADERSHIP: 'Rahbariyat',
  CHANCELLERY: 'Devonxona',
  DEPARTMENT_HEAD: 'Bo‘lim / Kafedra rahbari',
  STAFF: 'Xodim',
};

export const getDocumentStatusLabel = (status: string) => DOCUMENT_STATUS_LABELS[status] ?? status;
export const getRoleLabel = (role: string) => ROLE_LABELS[role] ?? role;
