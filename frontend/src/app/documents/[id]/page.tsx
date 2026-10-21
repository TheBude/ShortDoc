'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { fetchApi } from '@/lib/api';
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

export default function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();

  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

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
      loadDocument(false);
    } else {
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
      {/* Back button */}
      <div>
        <Link
          href="/documents"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Hujjatlar ro‘yxatiga qaytish</span>
        </Link>
      </div>

      {/* Main Document Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 lg:p-8 transition-colors duration-200">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-sm font-bold bg-primary-50 dark:bg-primary-950/70 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800 px-3 py-1 rounded-md">
                {document.regNumber}
              </span>
              <span className="text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-0.5 rounded-full">
                {document.category}
              </span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                {document.status}
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

      {/* Imzo (Approval) Voting Action Box - If Current User has Pending Vote */}
      {currentPendingApproval && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700/70 rounded-2xl p-6 shadow-md transition-colors">
          <div className="flex items-center gap-2 mb-2 text-amber-900 dark:text-amber-200 font-bold text-base">
            <FileCheck2 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <span>Sizning tasdig‘ingiz (Imzo) talab qilinadi</span>
          </div>
          <p className="text-xs text-amber-800 dark:text-amber-300 mb-4">
            Siz ushbu hujjat bo‘yicha kelishuvchi mas’ul etib belgilangansiz. Hujjatni o‘rganib, o‘z qaroringizni qoldiring:
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
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-5 py-2.5 rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Tasdiqlandi (Imzo qo‘yish)</span>
              </button>

              <button
                disabled={approving}
                onClick={() => handleApprovalAction('REJECTED')}
                className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs px-5 py-2.5 rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
                <span>E’tiroz bilan rad etish</span>
              </button>
            </div>
          </div>
        </div>
      )}

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

                <a
                  href={`/api/document-files/${file.id}/download`}
                  download
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
                  <span>Yuklab olish</span>
                </a>
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
    </div>
  );
}
