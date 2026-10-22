'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useRealtime } from '@/context/RealtimeContext';
import { fetchApi, getApiBaseUrl } from '@/lib/api';
import { Document, DocumentApproval, DocumentFile, Task } from '@/types';
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Building,
  FileCheck2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Paperclip,
  Upload,
  Download,
  MessageSquare,
  History,
  ShieldCheck,
  Send,
} from 'lucide-react';
import { downloadDocumentDocx } from '@/lib/downloadDocx';

export default function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { decrementPendingSignatures, refreshCounts } = useRealtime();

  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);

  const handleDownloadFile = async (fileId: string, originalName: string) => {
    try {
      setDownloadingFileId(fileId);
      const baseUrl = getApiBaseUrl();
      const token = typeof window !== 'undefined' ? localStorage.getItem('shortdoc_token') : null;
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${baseUrl}/document-files/${fileId}/download`, { headers });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Faylni yuklab olishda xatolik yuz berdi');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = originalName;
      window.document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Faylni yuklab olishda xatolik yuz berdi');
    } finally {
      setDownloadingFileId(null);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'IN_APPROVAL': return 'Imzolanmoqda';
      case 'IN_EXECUTION': return 'Ijroda';
      case 'COMPLETED': return 'Bajarildi';
      case 'REJECTED': return 'Qaytarildi';
      case 'DRAFT': return 'Qoralama';
      case 'ARCHIVED': return 'Arxivlangan';
      default: return status;
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'IN_APPROVAL':
        return 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'IN_EXECUTION':
        return 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'COMPLETED':
        return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'REJECTED':
        return 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  // Approval action modal/form
  const [approvalComment, setApprovalComment] = useState('');
  const [approving, setApproving] = useState(false);

  // File upload state
  const [uploadingFile, setUploadingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  // Status change state
  const [newStatus, setNewStatus] = useState<string>('');
  const [statusReason, setStatusReason] = useState<string>('');
  const [changingStatus, setChangingStatus] = useState(false);

  // Complete action state
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [completeComment, setCompleteComment] = useState('');
  const [completing, setCompleting] = useState(false);

  const isLeadership = user?.role === 'LEADERSHIP' || user?.role === 'SUPER_ADMIN';
  const isChancellery = user?.role === 'CHANCELLERY';
  const isDeptHead = user?.role === 'DEPARTMENT_HEAD';
  const isCreatorOrAssignee = user?.id === document?.creatorId || user?.id === document?.assigneeId;
  const canCompleteDocument = isLeadership || isChancellery || isDeptHead || isCreatorOrAssignee;

  const handleMarkAsCompleted = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setCompleting(true);
    const res = await fetchApi(`/documents/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'COMPLETED',
        reason: completeComment.trim() || 'Hujjat ijrosi to‘liq ta’minlandi va bajarildi deb belgilandi.',
      }),
    });
    setCompleting(false);

    if (res.success) {
      setCompleteModalOpen(false);
      setCompleteComment('');
      refreshCounts();
      loadDocument(false);
    } else {
      alert(res.message || 'Xatolik yuz berdi');
    }
  };

  useEffect(() => {
    loadDocument();
  }, [id]);

  const loadDocument = async (showFullLoading = false) => {
    if (showFullLoading || !document) {
      setLoading(true);
    }
    const res = await fetchApi<Document>(`/documents/${id}`);
    if (res.success && res.data) {
      setDocument(res.data);
      setNewStatus(res.data.status);
    }
    setLoading(false);
  };

  const handleApprovalAction = async (status: 'APPROVED' | 'REJECTED') => {
    setApproving(true);
    // Real-time badge'ni shu zahoti 1 taga kamaytirish (Zero-latency instant UI update)
    decrementPendingSignatures();

    const res = await fetchApi(`/documents/${id}/approvals`, {
      method: 'POST',
      body: JSON.stringify({
        status,
        comments: approvalComment,
      }),
    });
    setApproving(false);

    if (res.success) {
      setApprovalComment('');
      refreshCounts();
      loadDocument(false);
    } else {
      refreshCounts();
      alert(res.message || 'Xatolik yuz berdi');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    setFileError(null);

    const formData = new FormData();
    formData.append('documentId', id);
    formData.append('file', file);

    const res = await fetchApi('/document-files/upload', {
      method: 'POST',
      body: formData,
    });

    setUploadingFile(false);

    if (res.success) {
      loadDocument(false);
    } else {
      setFileError(res.message || 'Fayl yuklashda xatolik');
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setSubmittingComment(true);
    const res = await fetchApi(`/documents/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ comment: commentText }),
    });
    setSubmittingComment(false);

    if (res.success) {
      setCommentText('');
      loadDocument(false);
    }
  };

  const handleStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangingStatus(true);

    const res = await fetchApi(`/documents/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: newStatus,
        reason: statusReason,
      }),
    });

    setChangingStatus(false);

    if (res.success) {
      setStatusReason('');
      loadDocument(false);
    } else {
      alert(res.message || 'Holatni yangilab bo‘lmadi');
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400 dark:text-slate-500">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-2" />
        <p className="text-xs">Hujjat ma’lumotlari yuklanmoqda...</p>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="py-24 text-center">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Hujjat topilmadi</p>
        <Link href="/documents" className="text-xs text-primary-600 dark:text-primary-400 underline mt-2 inline-block">
          Hujjatlar ro‘yxatiga qaytish
        </Link>
      </div>
    );
  }

  // Check if current user is an approver with PENDING status
  const currentPendingApproval = document.approvals?.find(
    (a) => a.approverId === user?.id && a.status === 'PENDING'
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          href="/documents"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Hujjatlar ro‘yxatiga qaytish</span>
        </Link>

        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          {canCompleteDocument && document.status !== 'COMPLETED' && document.status !== 'REJECTED' && (
            <button
              type="button"
              onClick={() => setCompleteModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Bajarildi deb belgilash</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => downloadDocumentDocx(document.id, document.regNumber, document.category)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-semibold text-xs shadow-sm transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Word (.docx) shaklida yuklab olish</span>
          </button>
        </div>
      </div>

      {/* Imzo (Approval) Voting Action Box - Prominently at TOP for instant review */}
      {currentPendingApproval && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700/70 rounded-2xl p-6 shadow-sm transition-colors">
          <div className="flex items-center gap-2 mb-2 text-amber-900 dark:text-amber-200 font-bold text-base">
            <FileCheck2 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <span>Sizning tasdig‘ingiz (Imzo) talab qilinadi</span>
          </div>
          <p className="text-xs text-amber-800 dark:text-amber-300 mb-4">
            Siz ushbu hujjat bo‘yicha kelishuvchi mas’ul etib belgilangansiz. Hujjatni ko‘rib chiqib, o‘z qaroringizni tasdiqlang:
          </p>

          <div className="space-y-3">
            <input
              type="text"
              placeholder="Qaror yuzasidan izoh yoki xulosa (ixtiyoriy)..."
              value={approvalComment}
              onChange={(e) => setApprovalComment(e.target.value)}
              className="w-full p-2.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-lg border border-amber-300 dark:border-amber-700/70 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-slate-400"
            />

            <div className="flex flex-wrap gap-3">
              <button
                disabled={approving}
                onClick={() => handleApprovalAction('APPROVED')}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-5 py-2.5 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{approving ? 'Bajarilmoqda...' : 'Tasdiqlash (Imzo qo‘yish)'}</span>
              </button>

              <button
                disabled={approving}
                onClick={() => handleApprovalAction('REJECTED')}
                className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs px-5 py-2.5 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                <span>{approving ? 'Bajarilmoqda...' : 'Qaytarish (E’tiroz bilan)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Document Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 lg:p-8 transition-colors duration-200">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-sm font-bold bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 px-3 py-1 rounded">
                {document.regNumber}
              </span>
              <span className="text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded">
                {document.category}
              </span>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded border ${getStatusStyle(document.status)}`}>
                {getStatusLabel(document.status)}
              </span>
            </div>
            <h1 className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{document.title}</h1>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1 sm:text-right shrink-0">
            <div>
              Yaratilgan: <span className="font-semibold text-slate-800 dark:text-slate-200">{new Date(document.createdAt).toLocaleDateString('uz-UZ')}</span>
            </div>
            {document.deadline && (
              <div className="text-rose-600 dark:text-rose-400 font-semibold flex sm:justify-end items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Dedlayn: {new Date(document.deadline).toLocaleDateString('uz-UZ')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Visual Pipeline Bar */}
        <div className="py-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Hujjat harakati bosqichlari
            </div>
            {document.status === 'COMPLETED' ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Ijro to‘liq yakunlandi</span>
              </span>
            ) : canCompleteDocument && (
              <button
                type="button"
                onClick={() => setCompleteModalOpen(true)}
                className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Bajarildi deb belgilash →</span>
              </button>
            )}
          </div>
          <div className="flex items-center overflow-x-auto pb-1 no-scrollbar gap-1">
            {/* Step 1: Created */}
            <div className="flex items-center shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                  ✓
                </div>
                <div className="text-left">
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">Yaratildi</div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500">{document.creator?.fullName?.split(' ')[0] || 'Tashabbuskor'}</div>
                </div>
              </div>
              <div className="w-6 sm:w-10 h-0.5 bg-emerald-500 mx-2" />
            </div>

            {/* Steps: Approvals */}
            {document.approvals?.map((app) => {
              const isApproved = app.status === 'APPROVED';
              const isRejected = app.status === 'REJECTED';

              return (
                <div key={app.id} className="flex items-center shrink-0">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shadow-sm ${
                        isApproved
                          ? 'bg-emerald-600 text-white'
                          : isRejected
                          ? 'bg-rose-600 text-white'
                          : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                      }`}
                    >
                      {isApproved ? '✓' : isRejected ? '✕' : '⏳'}
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-semibold text-slate-900 dark:text-white truncate max-w-[120px]">
                        {app.approver.position || app.approver.fullName}
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500">
                        {isApproved ? 'Kelishildi' : isRejected ? 'Rad etildi' : 'Kutilmoqda'}
                      </div>
                    </div>
                  </div>
                  <div
                    className={`w-6 sm:w-10 h-0.5 mx-2 ${
                      isApproved ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
                    }`}
                  />
                </div>
              );
            })}

            {/* Step Final: Completed */}
            <div className="flex items-center shrink-0">
              <div className="flex items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shadow-sm ${
                    document.status === 'COMPLETED'
                      ? 'bg-emerald-600 text-white'
                      : document.status === 'REJECTED'
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-300 dark:border-slate-700'
                  }`}
                >
                  {document.status === 'COMPLETED' ? '✓' : document.status === 'REJECTED' ? '✕' : '○'}
                </div>
                <div className="text-left">
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">Bajarildi</div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500">
                    {document.status === 'COMPLETED' ? 'Yakunlangan' : document.status === 'REJECTED' ? 'Qaytarilgan' : 'Ijro'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-5 border-b border-slate-100 dark:border-slate-800 text-xs">
          <div>
            <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Yaratuvchi (Tashabbuskor)</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{document.creator?.fullName || '—'}</span>
            <span className="text-slate-400 dark:text-slate-500 block text-[11px]">{document.creator?.position}</span>
          </div>

          <div>
            <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Tegishli bo‘lim</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{document.department?.name || '—'}</span>
          </div>

          <div>
            <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Jo‘natuvchi / Qabul qiluvchi</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{document.sender || '—'}</span>
            <span className="text-slate-400 dark:text-slate-500 block text-[11px]">→ {document.receiver || '—'}</span>
          </div>
        </div>

        {/* Summary */}
        <div className="pt-5 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-1.5 uppercase text-[11px] tracking-wider">Hujjat mazmuni</h3>
          <p className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-100 dark:border-slate-800 whitespace-pre-wrap">
            {document.summary || 'Izoh yoki mazmun kiritilmagan.'}
          </p>
        </div>
      </div>

      {/* Imzo Zanjiri (Approval Chain Timeline) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 transition-colors duration-200">
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          <span>Imzo Yig‘ish Zanjiri (Kelishuv holati)</span>
        </h2>

        {!document.approvals || document.approvals.length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-slate-500">Ushbu hujjat uchun imzo zanjiri belgilanmagan.</p>
        ) : (
          <div className="space-y-3">
            {document.approvals.map((app) => (
              <div
                key={app.id}
                className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between text-xs transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-[10px]">
                    {app.stepOrder}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">{app.approver.fullName}</div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500">{app.approver.position}</div>
                    {app.comments && (
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 italic">
                        «{app.comments}»
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  {app.status === 'APPROVED' && (
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-full text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Kelishildi
                    </span>
                  )}
                  {app.status === 'REJECTED' && (
                    <span className="inline-flex items-center gap-1 font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 px-2.5 py-1 rounded-full text-[11px]">
                      <XCircle className="w-3.5 h-3.5" />
                      Rad etildi
                    </span>
                  )}
                  {app.status === 'PENDING' && (
                    <span className="inline-flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2.5 py-1 rounded-full text-[11px]">
                      <Clock className="w-3.5 h-3.5" />
                      Kutilmoqda
                    </span>
                  )}
                  {app.signedAt && (
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                      {new Date(app.signedAt).toLocaleString('uz-UZ')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Attached Files Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 transition-colors duration-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Paperclip className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            <span>Biriktirilgan Fayllar ({document.files?.length || 0})</span>
          </h2>

          <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-900/60 text-xs font-semibold transition-colors">
            <Upload className="w-3.5 h-3.5" />
            <span>{uploadingFile ? 'Yuklanmoqda...' : 'Fayl qo‘shish'}</span>
            <input type="file" onChange={handleFileUpload} disabled={uploadingFile} className="hidden" />
          </label>
        </div>

        {fileError && (
          <div className="p-3 mb-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-lg text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{fileError}</span>
          </div>
        )}

        {!document.files || document.files.length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-slate-500 py-3">Hozircha hech qanday fayl biriktirilmagan.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {document.files.map((file) => (
              <div key={file.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">{file.originalName}</div>
                  <div className="text-[11px] text-slate-400 dark:text-slate-500">
                    {(file.fileSize / 1024).toFixed(1)} KB • Yukladi: {file.uploadedBy?.fullName || 'Xodim'}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDownloadFile(file.id, file.originalName)}
                  disabled={downloadingFileId === file.id}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
                  <span>{downloadingFileId === file.id ? 'Yuklanmoqda...' : 'Yuklab olish'}</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Internal Discussion & Comments */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 transition-colors duration-200">
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          <span>Ichki Munozara va Izohlar ({document.comments?.length || 0})</span>
        </h2>

        <div className="space-y-3 mb-4">
          {!document.comments || document.comments.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500 py-2">Hozircha izohlar mavjud emas.</p>
          ) : (
            document.comments.map((comm) => (
              <div key={comm.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{comm.user.fullName}</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">{new Date(comm.createdAt).toLocaleString('uz-UZ')}</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{comm.comment}</p>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleAddComment} className="flex gap-2">
          <input
            type="text"
            placeholder="Xodimlar uchun izoh yoki xabar yozing..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            className="flex-1 p-2.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
          />
          <button
            type="submit"
            disabled={submittingComment}
            className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer transition-colors shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Yuborish</span>
          </button>
        </form>
      </div>

      {/* Status History / Audit Trail */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 transition-colors duration-200">
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <History className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          <span>Holatlar O‘zgarishi Tarixi</span>
        </h2>

        <div className="space-y-2">
          {!document.statusHistory || document.statusHistory.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500">Tarix yozuvlari mavjud emas.</p>
          ) : (
            document.statusHistory.map((hist) => (
              <div key={hist.id} className="text-xs flex items-start gap-3 py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
                <div className="w-2 h-2 rounded-full bg-primary-600 mt-1.5 shrink-0" />
                <div className="flex-1">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{hist.changedBy.fullName}</span>{' '}
                  <span className="text-slate-500 dark:text-slate-400">holatni</span>{' '}
                  <span className="font-bold text-slate-700 dark:text-slate-300">{hist.oldStatus}</span>{' '}
                  <span className="text-slate-500 dark:text-slate-400">dan</span>{' '}
                  <span className="font-bold text-primary-700 dark:text-primary-400">{hist.newStatus}</span>{' '}
                  <span className="text-slate-500 dark:text-slate-400">ga o‘zgartirdi.</span>
                  {hist.reason && <div className="text-[11px] text-slate-400 dark:text-slate-500 italic mt-0.5">Sabab: {hist.reason}</div>}
                </div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">{new Date(hist.createdAt).toLocaleString('uz-UZ')}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Complete Document Confirmation Modal */}
      {completeModalOpen && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Ijroni yakunlash (Bajarildi)
                </h3>
                <p className="text-xs text-slate-500">Hujjat yuzasidan barcha vazifalar bajarildimi?</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Ushbu amal orqali <strong>{document.regNumber}</strong> raqamli hujjat rasmiy ravishda
              <strong> "Bajarildi"</strong> holatiga o‘tkaziladi va harakat zanjirida yakuniy galichka (✓) qo‘yiladi.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Ijro xulosasi yoki natijasi (ixtiyoriy):
              </label>
              <textarea
                rows={3}
                value={completeComment}
                onChange={(e) => setCompleteComment(e.target.value)}
                placeholder="Masalan: Xat yuzasidan barcha tegishli choralar ko‘rildi va ijrosi to‘liq ta’minlandi."
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={completing}
                onClick={() => setCompleteModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold text-xs transition-colors cursor-pointer"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                disabled={completing}
                onClick={() => handleMarkAsCompleted()}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{completing ? 'Yakunlanmoqda...' : 'Tasdiqlash (Bajarildi)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
