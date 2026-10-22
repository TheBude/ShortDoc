export interface UserAuth {
  userId: string;
  role: string;
  departmentId?: string | null;
}

export interface DocumentAccessData {
  id?: string;
  creatorId: string;
  assigneeId?: string | null;
  departmentId?: string | null;
  category?: string | null;
  documentType: string;
  status?: string;
  isArchived?: boolean;
  approvals?: Array<{ approverId: string }>;
  tasks?: Array<{ assignedToId: string }>;
}

export interface TaskAccessData {
  id?: string;
  documentId: string;
  assignedToId: string;
  createdById: string;
  status?: string;
}

export interface FileAccessData {
  id?: string;
  documentId: string;
  uploadedById: string;
  document?: DocumentAccessData | null;
}

export type DocumentStatusType =
  | 'NEW'
  | 'REGISTERED'
  | 'IN_REVIEW'
  | 'IN_APPROVAL'
  | 'IN_EXECUTION'
  | 'COMPLETED'
  | 'REJECTED'
  | 'ARCHIVED';

/**
 * Hujjat holatlari o'tishi (State Machine) qat'iy jadvali
 */
export const ALLOWED_STATUS_TRANSITIONS: Record<DocumentStatusType, DocumentStatusType[]> = {
  NEW: ['REGISTERED'],
  REGISTERED: ['IN_REVIEW', 'IN_APPROVAL', 'IN_EXECUTION', 'REJECTED', 'ARCHIVED'],
  IN_REVIEW: ['IN_APPROVAL', 'IN_EXECUTION', 'REJECTED', 'ARCHIVED'],
  IN_APPROVAL: ['IN_EXECUTION', 'REJECTED'],
  IN_EXECUTION: ['COMPLETED', 'REJECTED', 'ARCHIVED'],
  COMPLETED: ['ARCHIVED'],
  REJECTED: ['REGISTERED', 'ARCHIVED'],
  ARCHIVED: [],
};

/**
 * Holat o'tishi ruxsat etilganligini tekshirish
 */
export function isValidStatusTransition(from: DocumentStatusType, to: DocumentStatusType): boolean {
  if (from === to) return true;
  const allowed = ALLOWED_STATUS_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

/**
 * Prisma uchun yagona hujjat ko'rinish filtri (RBAC/IDOR himoyasi)
 * GET /documents, dashboard hisoblagichlari, excel eksport hammasi ushbu qoidaga bo'ysunadi.
 * Eslatma: isArchived: true hujjatlar xodimlar uchun ochiq qolmaydi, faqat tegishli qoida asosida ko'rinadi.
 */
export function buildDocumentVisibilityWhere(user: UserAuth) {
  // SUPER_ADMIN, LEADERSHIP, CHANCELLERY barcha hujjatlarni ko'radi
  if (['SUPER_ADMIN', 'LEADERSHIP', 'CHANCELLERY'].includes(user.role)) {
    return {};
  }

  // Umumiy qoida: o'zi yaratgan, biriktirilgan, vizachi bo'lgan, topshiriq berilgan,
  // va umumiy universitet "Buyruq/Qaror" (ORDER, DECISION enumlari) hamda "INCOMING" hujjatlar
  const conditions: any[] = [
    { creatorId: user.userId },
    { assigneeId: user.userId },
    { approvals: { some: { approverId: user.userId } } },
    { tasks: { some: { assignedToId: user.userId } } },
    { category: { in: ['ORDER', 'DECISION'] } },
    { documentType: 'INCOMING' },
  ];

  // DEPARTMENT_HEAD uchun o'z bo'limi hujjatlari ham ko'rinadi
  if (user.role === 'DEPARTMENT_HEAD' && user.departmentId) {
    conditions.push({ departmentId: user.departmentId });
  }

  return { OR: conditions };
}

/**
 * Hujjatni ko'rish ruxsatini tekshirish
 */
export function canViewDocument(user: UserAuth, doc: DocumentAccessData): boolean {
  if (['SUPER_ADMIN', 'LEADERSHIP', 'CHANCELLERY'].includes(user.role)) {
    return true;
  }

  if (doc.creatorId === user.userId) return true;
  if (doc.assigneeId === user.userId) return true;

  // Umumiy ochiq hujjat toifalari (Buyruq va Qarorlar: ORDER, DECISION enum)
  if (doc.category === 'ORDER' || doc.category === 'DECISION' || (doc.category && (/buyru/i.test(doc.category) || /qaror/i.test(doc.category)))) {
    return true;
  }
  if (doc.documentType === 'INCOMING') {
    return true;
  }

  // Viza beruvchi
  if (doc.approvals?.some((a) => a.approverId === user.userId)) {
    return true;
  }

  // Topshiriq ijrochisi
  if (doc.tasks?.some((t) => t.assignedToId === user.userId)) {
    return true;
  }

  // Bo'lim mudiri o'z bo'limi hujjatlarini ko'radi
  if (user.role === 'DEPARTMENT_HEAD' && user.departmentId && doc.departmentId === user.departmentId) {
    return true;
  }

  return false;
}

/**
 * Hujjatni tahrirlash huquqi
 */
export function canEditDocument(user: UserAuth, doc: DocumentAccessData): boolean {
  if (user.role === 'SUPER_ADMIN') return true;
  if (['LEADERSHIP', 'CHANCELLERY'].includes(user.role) && !doc.isArchived) return true;

  // Yaratuvchi faqat qoralama yoki dastlabki bosqichlarda tahrirlashi mumkin
  if (doc.creatorId === user.userId && !doc.isArchived) {
    const editableStatuses = ['NEW', 'REGISTERED', 'IN_REVIEW', 'REJECTED'];
    return editableStatuses.includes(doc.status || '');
  }

  return false;
}

/**
 * Hujjat holatini o'zgartirish huquqi
 */
export function canChangeStatus(user: UserAuth, doc: DocumentAccessData): boolean {
  if (['SUPER_ADMIN', 'LEADERSHIP', 'CHANCELLERY'].includes(user.role)) {
    return true;
  }

  if (doc.creatorId === user.userId || doc.assigneeId === user.userId) {
    return true;
  }

  if (user.role === 'DEPARTMENT_HEAD' && user.departmentId && doc.departmentId === user.departmentId) {
    return true;
  }

  return false;
}

/**
 * Topshiriqni boshqarish huquqi (holat o'zgartirish yoki ijro topshirish)
 */
export function canManageTask(user: UserAuth, task: TaskAccessData, forSubmitResult: boolean = false): boolean {
  // submit-result faqat ijrochi uchun
  if (forSubmitResult) {
    return task.assignedToId === user.userId;
  }

  // Holatni o'zgartirish: ijrochi, yaratuvchi yoki rahbariyat
  if (['SUPER_ADMIN', 'LEADERSHIP'].includes(user.role)) {
    return true;
  }

  return task.assignedToId === user.userId || task.createdById === user.userId;
}

/**
 * Topshiriq yaratish huquqi
 */
export function canCreateTask(user: UserAuth, doc: DocumentAccessData): boolean {
  if (!canViewDocument(user, doc)) {
    return false;
  }

  // LEADERSHIP, CHANCELLERY, DEPARTMENT_HEAD yoki hujjat egasi / mas'uli
  if (['SUPER_ADMIN', 'LEADERSHIP', 'CHANCELLERY', 'DEPARTMENT_HEAD'].includes(user.role)) {
    return true;
  }

  return doc.creatorId === user.userId || doc.assigneeId === user.userId;
}

/**
 * Hujjat faylini ko'rish/yuklab olish huquqi
 */
export function canAccessFile(user: UserAuth, file: FileAccessData, doc?: DocumentAccessData | null): boolean {
  if (user.role === 'SUPER_ADMIN') return true;
  if (file.uploadedById === user.userId) return true;

  const targetDoc = doc || file.document;
  if (targetDoc) {
    return canViewDocument(user, targetDoc);
  }

  return false;
}
