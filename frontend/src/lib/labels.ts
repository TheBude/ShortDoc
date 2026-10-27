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

const AUDIT_ACTION_LABELS: Record<string, string> = {
  ADD_COMMENT: 'Izoh qo‘shildi',
  APPROVE_DOCUMENT: 'Hujjat tasdiqlandi',
  APPROVE_USER: 'Ariza tasdiqlandi',
  CHANGE_LOGIN: 'Login o‘zgartirildi',
  CHANGE_PASSWORD: 'Parol o‘zgartirildi',
  CHANGE_ROLE: 'Rol o‘zgartirildi',
  CHANGE_STATUS: 'Holat o‘zgartirildi',
  COMPLETE_TASK: 'Topshiriq bajarildi',
  CREATE_DEPARTMENT: 'Bo‘lim yaratildi',
  CREATE_DOCUMENT: 'Hujjat yaratildi',
  CREATE_TASK: 'Topshiriq yaratildi',
  CREATE_USER: 'Foydalanuvchi yaratildi',
  DELETE_FILE: 'Fayl o‘chirildi',
  DELETE_USER: 'Foydalanuvchi o‘chirildi',
  DOWNLOAD_FILE: 'Fayl yuklab olindi',
  LOGIN: 'Tizimga kirish',
  LOGIN_FAILED: 'Kirish muvaffaqiyatsiz',
  PURGE_DOCUMENTS: 'Ma’lumotlar tozalandi',
  REGISTER: 'Ro‘yxatdan o‘tish',
  REGISTER_INCOMING: 'Kiruvchi hujjat ro‘yxatga olindi',
  REJECT_USER: 'Ariza rad etildi',
  SIGN_DOCUMENT: 'Hujjat imzolandi',
  SYSTEM_INITIALIZATION: 'Tizim ishga tushirildi',
  UPDATE_DEPARTMENT: 'Bo‘lim yangilandi',
  UPDATE_TASK_STATUS: 'Topshiriq holati yangilandi',
  UPDATE_USER: 'Foydalanuvchi yangilandi',
  UPLOAD_FILE: 'Fayl yuklandi',
};

const AUDIT_ENTITY_LABELS: Record<string, string> = {
  AUTH: 'Autentifikatsiya',
  DEPARTMENT: 'Bo‘lim',
  DOCUMENT: 'Hujjat',
  DOCUMENT_FILE: 'Hujjat fayli',
  SYSTEM: 'Tizim',
  TASK: 'Topshiriq',
  USER: 'Foydalanuvchi',
};

export const getAuditActionLabel = (action: string) => AUDIT_ACTION_LABELS[action] ?? action;
export const getAuditEntityLabel = (entity: string) => AUDIT_ENTITY_LABELS[entity] ?? entity;
