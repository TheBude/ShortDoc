'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Department, Document, User } from '@/types';
import { downloadDocumentDocx } from '@/lib/downloadDocx';
import { getCategoryLabel } from '@/lib/categories';
import { getDepartmentGroupIndex, getDepartmentGroupLabel, groupDepartments } from '@/lib/departments';
import { Modal } from '@/components/ui/Modal';
import { composeReceiver, UNIVERSITY_NAME } from '@/lib/names';
import {
  CheckCircle2,
  Download,
  Eye,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  X,
  Search,
  Paperclip,
} from 'lucide-react';

interface CreateDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  createdDocSuccess: Document | null;
  resetForm: () => void;
  formError: string | null;
  formData: {
    title: string;
    documentType: string;
    category: string;
    sender: string;
    receiver: string;
    assigneeId: string;
    isPublic: boolean;
    priority: string;
    deadline: string;
    summary: string;
    hashtags: string[];
    withoutQr: boolean;
    showApprovalList: boolean;
    reviewerIds: string[];
    signerId: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  handleCreateDocument: (e: React.FormEvent) => void;
  submitting: boolean;
  usersList: User[];
  departmentsList: Department[];
  attachedFiles: File[];
  setAttachedFiles: React.Dispatch<React.SetStateAction<File[]>>;
  uploadWarnings: string[];
  user: User | null;
}

// Hujjat turlari yagona manba sifatida: qabul qiluvchi namunasi va cheklov shu yerda
const DOC_TYPES: { label: string; restricted?: boolean }[] = [
  { label: 'Bildirgi' },
  { label: 'Xizmat xati' },
  { label: 'Ariza' },
  { label: 'Murojaat' },
  { label: 'Hisobot' },
  { label: 'Rasmiy xat' },
  { label: 'Shartnoma' },
  { label: 'Buyruq', restricted: true },
  { label: 'Qaror', restricted: true },
  { label: 'Farmoyish', restricted: true },
  { label: 'Arxiv hujjati' },
  { label: 'Boshqa' },
];

const MAX_FILES = 10;
const MAX_FILE_MB = 25;
const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'zip'];

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

const PRIVILEGED_ROLES = ['SUPER_ADMIN', 'LEADERSHIP', 'CHANCELLERY'];

const inputCls =
  'w-full p-2.5 sm:p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500';
const labelCls = 'block font-semibold text-slate-700 dark:text-slate-300 mb-1';

export const CreateDocumentModal: React.FC<CreateDocumentModalProps> = ({
  isOpen,
  onClose,
  createdDocSuccess,
  resetForm,
  formError,
  formData,
  setFormData,
  handleCreateDocument,
  submitting,
  usersList,
  departmentsList,
  attachedFiles,
  setAttachedFiles,
  uploadWarnings,
  user,
}) => {
  // '' (tanlanmagan) | 'u:<userId>' | 'd:<departmentId>'
  const [recipient, setRecipient] = useState('');
  const [approverSearch, setApproverSearch] = useState('');
  const [approverOpen, setApproverOpen] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');

  const canUseRestricted = PRIVILEGED_ROLES.includes(user?.role || '');
  const today = new Date().toISOString().slice(0, 10);

  const activeUsers = useMemo(() => usersList.filter((u) => u.isActive !== false && u.id !== user?.id), [usersList, user]);

  // Imzolovchi bo'la oladiganlar: o'zi va Super Admin chiqarib tashlanadi, bo'lim bo'yicha guruhlanadi
  const approverGroups = useMemo(() => {
    const q = approverSearch.trim().toLowerCase();
    const groups = new Map<string, { order: number; members: User[] }>();
    activeUsers
      .filter((u) => u.role !== 'SUPER_ADMIN' && !formData.reviewerIds.includes(u.id) && u.id !== formData.signerId)
      .filter((u) => !q || `${u.fullName} ${u.position} ${u.department?.name || ''}`.toLowerCase().includes(q))
      .sort((a, b) => a.fullName.localeCompare(b.fullName))
      .forEach((u) => {
        const type = u.department?.type;
        const key = u.department
          ? `${getDepartmentGroupLabel(type)} / ${u.department.name}`
          : 'Bo‘limsiz';
        const entry = groups.get(key) || { order: u.department ? getDepartmentGroupIndex(type) : 99, members: [] };
        entry.members.push(u);
        groups.set(key, entry);
      });
    return [...groups.entries()]
      .sort((a, b) => a[1].order - b[1].order || a[0].localeCompare(b[0]))
      .map(([label, v]) => [label, v.members] as [string, User[]]);
  }, [activeUsers, approverSearch, formData.reviewerIds, formData.signerId]);

  const selectedApprovers = formData.reviewerIds
    .map((id) => usersList.find((u) => u.id === id))
    .filter((u): u is User => !!u);

  // Imzolovchi sifatida tanlash mumkin bo'lganlar: kelishuvchilar va Super Admin chiqarib tashlanadi
  const signerOptions = useMemo(
    () =>
      activeUsers
        .filter((u) => u.role !== 'SUPER_ADMIN' && !formData.reviewerIds.includes(u.id))
        .sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [activeUsers, formData.reviewerIds]
  );

  const addReviewer = (userId: string) => {
    if (!userId || formData.reviewerIds.includes(userId)) return;
    setFormData({
      ...formData,
      reviewerIds: [...formData.reviewerIds, userId],
      signerId: formData.signerId === userId ? '' : formData.signerId,
    });
  };

  if (!isOpen) return null;

  const selectType = (label: string) => {
    const def = DOC_TYPES.find((t) => t.label === label);
    setFormData((prev: any) => ({
      ...prev,
      category: label,
      // Buyruq/Qaror/Farmoyish odatda hammaga ochiq (faqat vakolatli rollar uchun)
      isPublic: canUseRestricted ? !!def?.restricted : false,
    }));
  };

  const selectRecipient = (value: string) => {
    setRecipient(value);
    const [kind, id] = [value.slice(0, 1), value.slice(2)];
    if (kind === 'u') {
      const target = activeUsers.find((u) => u.id === id);
      setFormData((prev: any) => ({
        ...prev,
        assigneeId: id,
        receiver: target ? composeReceiver(target) : prev.receiver,
      }));
    } else {
      // Bo'limga yuborilsa, hujjat shu bo'lim mudiriga mas'ul sifatida biriktiriladi
      const dept = departmentsList.find((d) => d.id === id);
      const head = activeUsers.find((u) => u.role === 'DEPARTMENT_HEAD' && u.departmentId === id);
      setFormData((prev: any) => ({
        ...prev,
        assigneeId: head?.id || '',
        receiver: head ? composeReceiver(head) : prev.receiver,
      }));
    }
  };

  const addTag = () => {
    const tag = tagInput.replace(/^#+/, '').trim().toLowerCase();
    setTagInput('');
    if (!tag || formData.hashtags.includes(tag) || formData.hashtags.length >= 10) return;
    setFormData({ ...formData, hashtags: [...formData.hashtags, tag] });
  };

  const moveApprover = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= formData.reviewerIds.length) return;
    const next = [...formData.reviewerIds];
    [next[index], next[target]] = [next[target], next[index]];
    setFormData({ ...formData, reviewerIds: next });
  };

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const errors: string[] = [];
    const next = [...attachedFiles];
    for (const file of Array.from(list)) {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        errors.push(`${file.name}: format ruxsat etilmagan`);
      } else if (file.size > MAX_FILE_MB * 1024 * 1024) {
        errors.push(`${file.name}: hajmi ${MAX_FILE_MB} MB dan oshmasligi kerak`);
      } else if (next.some((f) => f.name === file.name && f.size === file.size)) {
        continue;
      } else if (next.length >= MAX_FILES) {
        errors.push(`Ko‘pi bilan ${MAX_FILES} ta fayl biriktirish mumkin`);
        break;
      } else {
        next.push(file);
      }
    }
    setAttachedFiles(next);
    setFileError(errors.length ? errors.join('; ') : null);
  };

  const close = () => {
    setFileError(null);
    setRecipient('');
    setApproverSearch('');
    setApproverOpen(false);
    setTagInput('');
    onClose();
  };

  return (
    <Modal size="xl">
      {createdDocSuccess ? (
        <div className="text-center py-4 space-y-4">
          <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-7 h-7" />
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Hujjat muvaffaqiyatli ro‘yxatga olindi!
            </h3>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="font-mono text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded">
                {createdDocSuccess.regNumber}
              </span>
              <span className="text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-0.5 rounded">
                {getCategoryLabel(createdDocSuccess.category)}
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-2 max-w-md mx-auto">
              «{createdDocSuccess.title}»
            </p>
            {uploadWarnings.length > 0 && (
              <div className="mt-3 p-2.5 text-left bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 rounded-lg text-[11px]">
                <p className="font-semibold mb-1">Hujjat yaratildi, lekin ayrim fayllar biriktirilmadi:</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  {uploadWarnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
                <p className="mt-1">Ularni hujjat sahifasidan qayta yuklashingiz mumkin.</p>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
            {formData.reviewerIds.length === 0 && !formData.signerId ? (
            <button
              type="button"
              onClick={() =>
                downloadDocumentDocx(
                  createdDocSuccess.id,
                  createdDocSuccess.regNumber,
                  createdDocSuccess.category
                )
              }
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 rounded-lg bg-blue-700 hover:bg-blue-600 text-white font-semibold text-xs shadow-sm transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Word (.docx) yuklab olish</span>
            </button>
            ) : (
              <p className="text-[11px] text-slate-500 max-w-xs">
                Word fayl kelishuvchilar kelishib, imzolovchi imzolagandan so‘ng yuklab olinadi.
              </p>
            )}

            <Link
              href={`/documents/${createdDocSuccess.id}`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-semibold text-xs border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              <span>Ko‘rish</span>
            </Link>

            <button
              type="button"
              onClick={() => {
                close();
                resetForm();
              }}
              className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Yopish
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Ichki hujjat yaratish</h2>
              <p className="text-xs text-slate-500">Quyidagi ma’lumotlarni to‘ldiring va imzo qo‘yuvchilarni tanlang</p>
            </div>
            <button type="button" onClick={close} aria-label="Yopish" className="text-slate-400 hover:text-slate-600 p-2 -m-2 rounded-lg">
              ✕
            </button>
          </div>

          {formError && (
            <div className="mb-3 p-2.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleCreateDocument} className="space-y-3.5 text-xs">
            {/* Hujjat turi */}
            <div>
              <label className={labelCls}>Hujjat turi *</label>
              <select
                value={formData.category}
                onChange={(e) => selectType(e.target.value)}
                className={inputCls}
              >
                {DOC_TYPES.filter((t) => !t.restricted || canUseRestricted).map((t) => (
                  <option key={t.label} value={t.label}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sarlavha */}
            <div>
              <label className={labelCls}>Hujjat mavzusi (qisqa nomi) *</label>
              <input
                type="text"
                required
                minLength={3}
                placeholder="Masalan: AI laboratoriyasini tashkil qilish to‘g‘risida"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className={inputCls}
              />
            </div>

            {/* Kimdan / Kimga */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Kimdan (avtomatik)</label>
                <input
                  type="text"
                  value={formData.sender}
                  readOnly
                  className={`${inputCls} bg-slate-50 dark:bg-slate-800/60 cursor-not-allowed`}
                />
              </div>

              <div>
                <label className={labelCls}>Kimga (qabul qiluvchi) *</label>
                <select
                  value={recipient}
                  required
                  onChange={(e) => selectRecipient(e.target.value)}
                  className={inputCls}
                >
                  <option value="" disabled>
                    Qabul qiluvchini tanlang
                  </option>
                  {groupDepartments(departmentsList).map((g) => (
                    <optgroup key={g.key} label={`${g.label} (mudiriga yuboriladi)`}>
                      {g.items.map((d) => {
                        const hasHead = activeUsers.some((u) => u.role === 'DEPARTMENT_HEAD' && u.departmentId === d.id);
                        return (
                          <option key={d.id} value={`d:${d.id}`} disabled={!hasHead}>
                            {d.name}
                            {hasHead ? '' : ' — mudir biriktirilmagan'}
                          </option>
                        );
                      })}
                    </optgroup>
                  ))}
                  <optgroup label="Xodimlar">
                    {[...activeUsers]
                      .sort((a, b) => a.fullName.localeCompare(b.fullName))
                      .map((u) => (
                        <option key={u.id} value={`u:${u.id}`}>
                          {u.fullName} — {u.position}
                        </option>
                      ))}
                  </optgroup>
                </select>
              </div>
            </div>

            {/* Hujjat shapkasi: Word'dagi yuqori o'ng blok shu ko'rinishda chiqadi */}
            {formData.receiver && (
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-[11px] leading-relaxed">
                <p className="text-slate-500 mb-1">Hujjat shapkasi:</p>
                <p className="font-bold text-slate-900 dark:text-slate-100">{formData.receiver}</p>
                <p className="font-bold text-slate-900 dark:text-slate-100 mt-1.5">{formData.sender} tomonidan</p>
              </div>
            )}

            <div>
              <label className={labelCls}>Qisqacha mazmuni *</label>
              <textarea
                rows={6}
                required
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                placeholder="Sizga, ... ma’lum qilaman."
                className={inputCls}
              />
              <p className="text-[11px] text-slate-500 mt-1">Word hujjatning asosiy matni shu yerdan olinadi.</p>
            </div>

            {/* Fayl biriktirish */}
            <div>
              <label className={labelCls}>Fayl biriktirish / ilovalar</label>
              <label className="flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors">
                <Paperclip className="w-4 h-4" />
                <span>Fayllarni tanlang (PDF, Word, Excel, rasm, ZIP)</span>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.zip"
                  className="hidden"
                  onChange={(e) => {
                    addFiles(e.target.files);
                    e.target.value = '';
                  }}
                />
              </label>
              <p className="text-[11px] text-slate-500 mt-1">
                Ko‘pi bilan {MAX_FILES} ta fayl, har biri {MAX_FILE_MB} MB gacha. Fayllar hujjat yaratilgach biriktiriladi.
              </p>
              {fileError && <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">{fileError}</p>}
              {attachedFiles.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {attachedFiles.map((f, i) => (
                    <li
                      key={`${f.name}-${f.size}`}
                      className="flex items-center gap-2 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60"
                    >
                      <Paperclip className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      <span className="flex-1 min-w-0 truncate text-slate-800 dark:text-slate-200">{f.name}</span>
                      <span className="text-[11px] text-slate-500 shrink-0">{formatSize(f.size)}</span>
                      <button
                        type="button"
                        onClick={() => setAttachedFiles(attachedFiles.filter((_, idx) => idx !== i))}
                        className="p-2 sm:p-1 text-rose-500 hover:text-rose-700 cursor-pointer"
                        aria-label="Olib tashlash"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Muhimlik va muddat */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Muhimlik darajasi</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className={inputCls}
                >
                  <option value="LOW">Past</option>
                  <option value="MEDIUM">Oddiy</option>
                  <option value="HIGH">Yuqori</option>
                  <option value="URGENT">Shoshilinch</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Ijro muddati</label>
                <input
                  type="date"
                  min={today}
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  className={inputCls}
                />
              </div>
            </div>

            {/* Heshteglar */}
            <div>
              <label className={labelCls}>Hujjat heshteglari</label>
              {formData.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-1.5">
                  {formData.hashtags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300 text-[11px] font-medium"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, hashtags: formData.hashtags.filter((t) => t !== tag) })}
                        aria-label={`#${tag} ni olib tashlash`}
                        className="p-1 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    addTag();
                  } else if (e.key === 'Backspace' && !tagInput && formData.hashtags.length > 0) {
                    setFormData({ ...formData, hashtags: formData.hashtags.slice(0, -1) });
                  }
                }}
                onBlur={addTag}
                placeholder="Heshteg yozing va Enter bosing"
                className={inputCls}
              />
            </div>

            <p className="pt-1 text-[11px] font-bold uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-1">Kelishuv va imzo</p>

            {/* Kelishuvchilar (ketma-ket) */}
            <div>
              <label className={labelCls}>Kelishuvchilar</label>
              <p className="text-[11px] text-slate-500 mb-1.5">
                Maydonni bosib xodimlarni tanlang, bir nechta qo‘shish mumkin. Hujjat ketma-ket boradi: 1-kelishuvchi tasdiqlagach keyingisiga o‘tadi, hammasi kelishgach imzolovchiga yuboriladi. Tartibni o‘q tugmalari bilan o‘zgartiring.
              </p>

              {selectedApprovers.length > 0 && (
                <ol className="mb-2 space-y-1">
                  {selectedApprovers.map((u, i) => (
                    <li
                      key={u.id}
                      className="flex items-center gap-2 p-1.5 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/30"
                    >
                      <span className="w-5 h-5 shrink-0 rounded-full bg-blue-700 text-white text-[11px] font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      <span className="flex-1 min-w-0 truncate">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{u.fullName}</span>{' '}
                        <span className="text-slate-500 text-[11px]">
                          ({u.position}
                          {u.department?.name ? `, ${u.department.name}` : ''})
                        </span>
                      </span>
                      <button
                        type="button"
                        disabled={i === 0}
                        onClick={() => moveApprover(i, -1)}
                        className="p-2 sm:p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                        aria-label="Yuqoriga"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={i === selectedApprovers.length - 1}
                        onClick={() => moveApprover(i, 1)}
                        className="p-2 sm:p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                        aria-label="Pastga"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, reviewerIds: formData.reviewerIds.filter((id) => id !== u.id) })
                        }
                        className="p-2 sm:p-1 text-rose-500 hover:text-rose-700 cursor-pointer"
                        aria-label="Olib tashlash"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ol>
              )}

              {/* Kelishuvchi qo‘shish: bosilganda xodimlar ro‘yxati ochiladi */}
              <div
                className="relative"
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setApproverOpen(false);
                }}
              >
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={approverSearch}
                  onFocus={() => setApproverOpen(true)}
                  onClick={() => setApproverOpen(true)}
                  onChange={(e) => {
                    setApproverSearch(e.target.value);
                    setApproverOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setApproverOpen(false);
                  }}
                  placeholder={selectedApprovers.length > 0 ? 'Yana kelishuvchi qo‘shish...' : 'Kelishuvchi tanlang...'}
                  className={`${inputCls} pl-8`}
                />

                {approverOpen && (
                  <div
                    tabIndex={-1}
                    className="absolute z-20 left-0 right-0 mt-1 max-h-56 overflow-y-auto overscroll-contain border border-slate-200 dark:border-slate-700 rounded-lg p-2 space-y-1 bg-white dark:bg-slate-900 shadow-lg"
                  >
                    {approverGroups.length === 0 ? (
                      <p className="text-center text-slate-400 py-2">Mos xodim topilmadi</p>
                    ) : (
                      approverGroups.map(([dept, members]) => (
                        <div key={dept}>
                          <div className="px-1.5 pt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            {dept}
                          </div>
                          {members.map((u) => (
                            <button
                              type="button"
                              key={u.id}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                addReviewer(u.id);
                                setApproverSearch('');
                              }}
                              className="w-full text-left flex flex-wrap items-center gap-x-2 p-2.5 sm:p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700/60 cursor-pointer"
                            >
                              <span className="font-semibold text-slate-900 dark:text-slate-100">{u.fullName}</span>
                              <span className="text-slate-500 text-[11px]">({u.position})</span>
                            </button>
                          ))}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Imzolovchi: kelishuvchilar tugagach xabar oladi */}
            <div>
              <label className={labelCls}>
                Imzolovchi shaxs{formData.reviewerIds.length > 0 ? ' *' : ''}
              </label>
              <p className="text-[11px] text-slate-500 mb-1.5">
                {formData.reviewerIds.length > 0
                  ? 'Barcha kelishuvchilar tasdiqlagandan so‘ng hujjat imzolash uchun shu shaxsga yuboriladi.'
                  : 'Kelishuvchilar bo‘lmasa, hujjat to‘g‘ridan-to‘g‘ri shu shaxsga imzolash uchun yuboriladi.'}
              </p>
              <select
                value={formData.signerId}
                required={formData.reviewerIds.length > 0}
                onChange={(e) => setFormData({ ...formData, signerId: e.target.value })}
                className={inputCls}
              >
                <option value="">{formData.reviewerIds.length > 0 ? 'Imzolovchini tanlang' : 'Imzolovchi yo‘q'}</option>
                {signerOptions.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} — {u.position}
                    {u.department?.name ? `, ${u.department.name}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Qo‘shimcha sozlamalar */}
            <p className="pt-1 text-[11px] font-bold uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-1">Qo‘shimcha sozlamalar</p>
            {canUseRestricted && (
              <label className="flex items-start gap-2 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isPublic}
                  onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                />
                <span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Hammaga ochiq (umumiy hujjat)</span>
                  <span className="block text-[11px] text-slate-500">
                    Belgilansa, tizimdagi barcha xodimlar bu hujjatni ko‘ra oladi. Belgilanmasa, faqat unga bog‘liq shaxslar ko‘radi.
                  </span>
                </span>
              </label>
            )}

            {/* Word hujjat sozlamalari */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className="flex items-start gap-2 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.withoutQr}
                  onChange={(e) => setFormData({ ...formData, withoutQr: e.target.checked })}
                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="font-semibold text-slate-800 dark:text-slate-200">QR-kodsiz yaratish</span>
              </label>
              <label className="flex items-start gap-2 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.showApprovalList}
                  onChange={(e) => setFormData({ ...formData, showApprovalList: e.target.checked })}
                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Imzodan so‘ng kelishuvchilar ro‘yxatini shakllantirish
                </span>
              </label>
            </div>

            {/* Uzun shaklda ham yuborish tugmasi doim ko‘rinib turishi uchun pastda yopishib turadi */}
            <div className="sticky bottom-0 -mx-5 -mb-5 sm:-mx-6 sm:-mb-6 px-5 sm:px-6 py-3 flex gap-2 sm:justify-end bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={close}
                className="px-4 py-2.5 sm:py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold cursor-pointer"
              >
                Bekor qilish
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 sm:flex-none px-5 py-2.5 sm:py-2 rounded-lg bg-blue-700 hover:bg-blue-600 text-white font-semibold shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (attachedFiles.length > 0 ? 'Yaratilmoqda va fayllar yuklanmoqda...' : 'Yaratilmoqda...') : 'Hujjatni yuborish'}
              </button>
            </div>
          </form>
        </>
      )}
    </Modal>
  );
};
