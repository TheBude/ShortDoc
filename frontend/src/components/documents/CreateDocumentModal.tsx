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
    approverIds: string[];
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
const DOC_TYPES: { label: string; defaultReceiver: string; restricted?: boolean }[] = [
  { label: 'Bildirgi', defaultReceiver: 'Universitet rektoriga' },
  { label: 'Xizmat xati', defaultReceiver: 'O‘quv boshqarmasiga' },
  { label: 'Ariza', defaultReceiver: 'Fakultet dekanatiga' },
  { label: 'Murojaat', defaultReceiver: 'Rahbariyatga' },
  { label: 'Hisobot', defaultReceiver: 'Kafedra mudiriga' },
  { label: 'Rasmiy xat', defaultReceiver: 'Tashkilot rahbariga' },
  { label: 'Shartnoma', defaultReceiver: 'Hamkor tashkilotga' },
  { label: 'Buyruq', defaultReceiver: 'Universitet bo‘yicha', restricted: true },
  { label: 'Qaror', defaultReceiver: 'Kengash a’zolariga', restricted: true },
  { label: 'Farmoyish', defaultReceiver: 'Universitet bo‘yicha', restricted: true },
  { label: 'Arxiv hujjati', defaultReceiver: 'Arxivga' },
  { label: 'Boshqa', defaultReceiver: '' },
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
  // 'custom' | 'u:<userId>' | 'd:<departmentId>'
  const [recipient, setRecipient] = useState('custom');
  const [approverSearch, setApproverSearch] = useState('');
  const [fileError, setFileError] = useState<string | null>(null);

  const canUseRestricted = PRIVILEGED_ROLES.includes(user?.role || '');
  const today = new Date().toISOString().slice(0, 10);

  const activeUsers = useMemo(() => usersList.filter((u) => u.isActive !== false && u.id !== user?.id), [usersList, user]);

  // Imzolovchi bo'la oladiganlar: o'zi va Super Admin chiqarib tashlanadi, bo'lim bo'yicha guruhlanadi
  const approverGroups = useMemo(() => {
    const q = approverSearch.trim().toLowerCase();
    const groups = new Map<string, { order: number; members: User[] }>();
    activeUsers
      .filter((u) => u.role !== 'SUPER_ADMIN' && !formData.approverIds.includes(u.id))
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
  }, [activeUsers, approverSearch, formData.approverIds]);

  const selectedApprovers = formData.approverIds
    .map((id) => usersList.find((u) => u.id === id))
    .filter((u): u is User => !!u);

  if (!isOpen) return null;

  const selectType = (label: string) => {
    const def = DOC_TYPES.find((t) => t.label === label);
    setFormData((prev: any) => ({
      ...prev,
      category: label,
      // Buyruq/Qaror/Farmoyish odatda hammaga ochiq (faqat vakolatli rollar uchun)
      isPublic: canUseRestricted ? !!def?.restricted : false,
      // Qabul qiluvchi qo'lda yozilayotgan bo'lsa, namuna yangilanadi; tanlangan xodim/bo'lim saqlanadi
      receiver: recipient === 'custom' ? def?.defaultReceiver || '' : prev.receiver,
    }));
  };

  const selectRecipient = (value: string) => {
    setRecipient(value);
    if (value === 'custom') {
      setFormData((prev: any) => ({ ...prev, assigneeId: '' }));
      return;
    }
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
        receiver: head ? composeReceiver(head) : dept ? `${UNIVERSITY_NAME} ${dept.name}` : prev.receiver,
      }));
    }
  };

  const moveApprover = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= formData.approverIds.length) return;
    const next = [...formData.approverIds];
    [next[index], next[target]] = [next[target], next[index]];
    setFormData({ ...formData, approverIds: next });
  };

  const headMissing =
    recipient.startsWith('d:') &&
    !activeUsers.some((u) => u.role === 'DEPARTMENT_HEAD' && u.departmentId === recipient.slice(2));

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
    setRecipient('custom');
    setApproverSearch('');
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
            {formData.approverIds.length === 0 ? (
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
                Word fayl barcha kelishuvchilar ketma-ket imzolagandan so‘ng yuklab olinadi.
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
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Yangi hujjat yaratish</h2>
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
            {/* 1. Hujjat turi */}
            <div>
              <label className={labelCls}>1. Hujjat turini tanlang</label>
              <div className="grid grid-cols-3 gap-2">
                {DOC_TYPES.filter((t) => !t.restricted || canUseRestricted).map((t) => (
                  <button
                    type="button"
                    key={t.label}
                    onClick={() => selectType(t.label)}
                    className={`py-2.5 px-2 sm:p-2 rounded-lg border text-xs font-semibold text-center transition-all cursor-pointer ${
                      formData.category === t.label
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-600 text-blue-700 dark:text-blue-300'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Sarlavha */}
            <div>
              <label className={labelCls}>2. Hujjat mavzusi (qisqa nomi) *</label>
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
                <label className={labelCls}>Kimga (qabul qiluvchi)</label>
                <select value={recipient} onChange={(e) => selectRecipient(e.target.value)} className={inputCls}>
                  <option value="custom">Qo‘lda yozish</option>
                  {groupDepartments(departmentsList).map((g) => (
                    <optgroup key={g.key} label={`${g.label} (mudiriga yuboriladi)`}>
                      {g.items.map((d) => (
                        <option key={d.id} value={`d:${d.id}`}>
                          {d.name}
                        </option>
                      ))}
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

            {recipient === 'custom' && (
              <input
                type="text"
                value={formData.receiver}
                onChange={(e) => setFormData({ ...formData, receiver: e.target.value })}
                placeholder="Qabul qiluvchi nomi..."
                className={inputCls}
              />
            )}
            {headMissing && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400">
                Tanlangan bo‘limda mudir biriktirilmagan: hujjat faqat matn sifatida yoziladi, hech kimga biriktirilmaydi.
              </p>
            )}
            {recipient !== 'custom' && !headMissing && (
              <p className="text-[11px] text-slate-500">
                Hujjat tanlangan qabul qiluvchiga mas’ul sifatida biriktiriladi va uning ro‘yxatida ko‘rinadi.
              </p>
            )}

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

            <div>
              <label className={labelCls}>Hujjat matni (mazmuni) *</label>
              <textarea
                rows={6}
                required
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                placeholder="Sizga, ... ma’lum qilaman. (Word hujjatning asosiy matni shu yerdan olinadi)"
                className={inputCls}
              />
            </div>

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

            {/* Fayl biriktirish */}
            <div>
              <label className={labelCls}>Fayl biriktirish</label>
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

            {/* 3. Imzolovchilar (ketma-ket) */}
            <div>
              <label className={labelCls}>3. Kimlar tasdiqlashi (imzolashi) kerak?</label>
              <p className="text-[11px] text-slate-500 mb-1.5">
                Imzo tartib bilan olinadi: avval 1-imzolovchi, u imzolagach keyingisiga o‘tadi. Tartibni o‘q tugmalari bilan o‘zgartiring.
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
                          setFormData({ ...formData, approverIds: formData.approverIds.filter((id) => id !== u.id) })
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

              <div className="relative mb-1.5">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={approverSearch}
                  onChange={(e) => setApproverSearch(e.target.value)}
                  placeholder="Ism, lavozim yoki bo‘lim bo‘yicha qidirish..."
                  className={`${inputCls} pl-8`}
                />
              </div>

              <div className="max-h-56 sm:max-h-40 overflow-y-auto overscroll-contain border border-slate-200 dark:border-slate-700 rounded-lg p-2 space-y-1 bg-slate-50 dark:bg-slate-800/60">
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
                          onClick={() => setFormData({ ...formData, approverIds: [...formData.approverIds, u.id] })}
                          className="w-full text-left flex flex-wrap items-center gap-x-2 p-2.5 sm:p-1.5 rounded hover:bg-white dark:hover:bg-slate-700/60 cursor-pointer"
                        >
                          <span className="font-semibold text-slate-900 dark:text-slate-100">{u.fullName}</span>
                          <span className="text-slate-500 text-[11px]">({u.position})</span>
                        </button>
                      ))}
                    </div>
                  ))
                )}
              </div>
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
