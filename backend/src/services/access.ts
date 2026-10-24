import { prisma } from '../prisma.js';

export interface UserAuth {
  userId: string;
  role: string;
  departmentId?: string | null;
}

export interface ApprovalAccessData {
  approverId: string;
  stepOrder?: number;
  status?: string;
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
  approvals?: ApprovalAccessData[];
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
 * Ketma-ket imzo qoidasi: kelishuvchi hujjatni faqat o'z navbati kelganda yoki allaqachon qaror qabul qilgan bo'lsa ko'radi.
 * Oldingi bosqichlardan biri hali tasdiqlanmagan (kutilmoqda yoki rad etilgan) bo'lsa, hujjat unga ko'rinmaydi.
 */
export function hasApproverAccess(userId: string, approvals?: ApprovalAccessData[]): boolean {
  if (!approvals) return false;
  return approvals.some((a) => {
    if (a.approverId !== userId) return false;
    if (a.status === undefined || a.stepOrder === undefined) return true;
    if (a.status !== 'PENDING') return true;
    return !approvals.some((b) => b.stepOrder !== undefined && b.stepOrder < a.stepOrder! && b.status !== 'APPROVED');
  });
}

/**
 * Foydalanuvchining kelishuvchi sifatida ko'ra oladigan hujjatlari (navbati kelgan yoki qaror qabul qilgan)
 * hamda aynan hozir imzosi kutilayotgan hujjatlari. Bitta so'rovda olinadi.
 */
export async function getApproverDocumentIds(userId: string): Promise<{ visible: string[]; myTurn: string[] }> {
  const rows = await prisma.$queryRaw<{ documentId: string; status: string; docStatus: string }[]>`
    SELECT a."documentId" AS "documentId", a."status"::text AS "status", d."status"::text AS "docStatus"
    FROM document_approvals a
    JOIN documents d ON d."id" = a."documentId"
    WHERE a."approverId" = ${userId}
      AND (
        a."status"::text <> 'PENDING'
        OR NOT EXISTS (
          SELECT 1 FROM document_approvals b
          WHERE b."documentId" = a."documentId"
            AND b."stepOrder" < a."stepOrder"
            AND b."status"::text <> 'APPROVED'
        )
      )
  `;
  return {
    visible: [...new Set(rows.map((r) => r.documentId))],
    myTurn: [...new Set(rows.filter((r) => r.status === 'PENDING' && r.docStatus === 'IN_APPROVAL').map((r) => r.documentId))],
  };
}

/**
 * Prisma uchun yagona hujjat ko'rinish filtri (RBAC/IDOR himoyasi)
 * GET /documents, dashboard hisoblagichlari, excel eksport hammasi ushbu qoidaga bo'ysunadi.
 * Eslatma: isArchived: true hujjatlar xodimlar uchun ochiq qolmaydi, faqat tegishli qoida asosida ko'rinadi.
 */
export async function buildDocumentVisibilityWhere(user: UserAuth) {
  // SUPER_ADMIN, LEADERSHIP, CHANCELLERY barcha hujjatlarni ko'radi
  if (['SUPER_ADMIN', 'LEADERSHIP', 'CHANCELLERY'].includes(user.role)) {
    return {};
  }

  const { visible } = await getApproverDocumentIds(user.userId);

  // Umumiy qoida: faqat o'ziga bog'liq hujjatlar: o'zi yaratgan, biriktirilgan, navbati kelgan vizachi yoki topshiriq berilgan
  const conditions: any[] = [
    { creatorId: user.userId },
    { assigneeId: user.userId },
    { id: { in: visible } },
    { tasks: { some: { assignedToId: user.userId } } },
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

  // Viza beruvchi (faqat navbati kelgan yoki qaror qabul qilgan)
  if (hasApproverAccess(user.userId, doc.approvals)) {
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
 * Hujjatga fayl biriktirish huquqi.
 * Ko'rish huquqi yetarli emas: fayl biriktirish faqat hujjat ishtirokchilari va rahbariyat uchun ruxsat etiladi.
 */
export function canUploadFile(user: UserAuth, doc: DocumentAccessData): boolean {
  if (!canViewDocument(user, doc)) return false;

  if (['SUPER_ADMIN', 'LEADERSHIP', 'CHANCELLERY'].includes(user.role)) return true;
  if (doc.creatorId === user.userId || doc.assigneeId === user.userId) return true;
  if (user.role === 'DEPARTMENT_HEAD' && user.departmentId && doc.departmentId === user.departmentId) return true;

  return !!(
    hasApproverAccess(user.userId, doc.approvals) ||
    doc.tasks?.some((t) => t.assignedToId === user.userId)
  );
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

const RESTRICTED_CATEGORIES = ['ORDER', 'DECISION', 'DIRECTIVE'];
const RESTRICTED_CREATOR_ROLES = ['SUPER_ADMIN', 'LEADERSHIP', 'CHANCELLERY'];

/**
 * Buyruq/Qaror/Farmoyish va kiruvchi hujjatlarni faqat Rahbariyat, Kantselyariya va Super Admin yaratadi.
 */
export function canCreateRestrictedDocument(role: string, category: string, documentType: string): boolean {
  const restricted = RESTRICTED_CATEGORIES.includes(category) || documentType === 'INCOMING';
  return !restricted || RESTRICTED_CREATOR_ROLES.includes(role);
}

/**
 * Hujjat Word (.docx) formatida yuklab olinishi mumkinmi: viza zanjiri bor bo'lsa, barcha kelishuvchilar tasdiqlagan bo'lishi shart.
 */
export function isDocumentFullySigned(approvals?: Array<{ status: string }> | null): boolean {
  return !approvals || approvals.length === 0 || approvals.every((a) => a.status === 'APPROVED');
}
