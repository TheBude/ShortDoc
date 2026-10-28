export type Role = 'SUPER_ADMIN' | 'LEADERSHIP' | 'CHANCELLERY' | 'DEPARTMENT_HEAD' | 'STAFF';

export type DocumentType = 'INCOMING' | 'OUTGOING' | 'INTERNAL';

export type DocumentStatus =
  | 'NEW'
  | 'REGISTERED'
  | 'IN_REVIEW'
  | 'IN_APPROVAL'
  | 'IN_EXECUTION'
  | 'COMPLETED'
  | 'REJECTED'
  | 'ARCHIVED';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  position: string;
  phone?: string;
  avatar?: string | null;
  isActive: boolean;
  registrationStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  departmentId?: string | null;
  department?: Department;
  createdAt?: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  type: string;
  createdAt?: string;
  _count?: {
    users?: number;
    documents?: number;
  };
}

export interface DocumentFile {
  id: string;
  documentId: string;
  originalName: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedById: string;
  uploadedBy?: { id: string; fullName: string };
  createdAt: string;
}

export interface DocumentApproval {
  id: string;
  documentId: string;
  approverId: string;
  approver: { id: string; fullName: string; position: string };
  stepOrder: number;
  role?: 'REVIEWER' | 'SIGNER';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  comments?: string;
  signedAt?: string;
  createdAt: string;
}

export interface Task {
  id: string;
  documentId: string;
  document?: { id: string; regNumber: string; title: string };
  title: string;
  description?: string;
  assignedToId: string;
  assignedTo?: { id: string; fullName: string; position: string };
  createdById: string;
  createdBy?: { id: string; fullName: string };
  deadline?: string;
  status: TaskStatus;
  resultComment?: string;
  resultFileUrl?: string;
  completedAt?: string;
  createdAt: string;
}

export interface DocumentComment {
  id: string;
  documentId: string;
  userId: string;
  user: { id: string; fullName: string; position: string };
  comment: string;
  createdAt: string;
}

export interface DocumentStatusHistory {
  id: string;
  documentId: string;
  changedById: string;
  changedBy: { id: string; fullName: string };
  oldStatus: DocumentStatus;
  newStatus: DocumentStatus;
  reason?: string;
  createdAt: string;
}

export interface Document {
  id: string;
  regNumber: string;
  title: string;
  documentType: DocumentType;
  category: string;
  registeredDate: string;
  sender?: string;
  receiver?: string;
  departmentId?: string;
  department?: Department;
  assigneeId?: string;
  assignee?: User;
  creatorId: string;
  creator?: User;
  priority: Priority;
  deadline?: string;
  status: DocumentStatus;
  summary?: string;
  isArchived: boolean;
  hashtags?: string[];
  withoutQr?: boolean;
  showApprovalList?: boolean;
  createdAt: string;
  updatedAt: string;
  files?: DocumentFile[];
  approvals?: DocumentApproval[];
  tasks?: Task[];
  comments?: DocumentComment[];
  statusHistory?: DocumentStatusHistory[];
  _count?: {
    files: number;
    tasks: number;
    comments: number;
    approvals: number;
  };
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface RealtimeCounts {
  inApproval?: number;
  pendingSignatures?: number;
  pendingTasks?: number;
  registered?: number;
  overdue?: number;
  total?: number;
  pendingUsers?: number;
}
